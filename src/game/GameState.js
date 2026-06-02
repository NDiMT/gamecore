import { idx, bfs, reconstruct, key, isAdjacent, chebyshev, isWalkable } from './grid.js';
import { rollMovement, resolveAttack } from './rules.js';
import { runMonsterTurn } from './MonsterAI.js';
import { HERO_CLASSES } from '../data/heroes.js';
import { MONSTERS } from '../data/monsters.js';
import { CORRIDOR_SIGHT } from '../config.js';

// Authoritative game model. The host owns the only mutating instance; clients
// hold a render-only copy fed by snapshots. All randomness lives here behind
// `rng`, so only the host ever rolls dice.
export class GameState {
  constructor(map, rng) {
    this.map = map;
    this.rng = rng;
    this.state = null;
  }

  // ---- Host construction ---------------------------------------------------
  start(players, startTiles, monsterSpawns) {
    const heroes = players.map((p, i) => {
      const cls = HERO_CLASSES[p.cls];
      const tile = startTiles[i % startTiles.length];
      return {
        id: 'h' + i,
        owner: p.peerId,
        cls: p.cls,
        name: p.name || cls.name,
        color: cls.color,
        x: tile.x,
        y: tile.y,
        body: cls.body,
        maxBody: cls.body,
        mind: cls.mind,
        attack: cls.attack,
        defend: cls.defend,
        alive: true,
      };
    });
    const monsters = monsterSpawns.map((s, i) => {
      const def = MONSTERS[s.type];
      return {
        id: 'm' + i,
        type: s.type,
        name: def.name,
        color: def.color,
        boss: !!def.boss,
        x: s.x,
        y: s.y,
        body: def.body,
        maxBody: def.body,
        attack: def.attack,
        defend: def.defend,
        move: def.move,
        alive: true,
      };
    });

    this.state = {
      phase: 'playing',
      heroes,
      monsters,
      turn: { order: heroes.map((h) => h.id), idx: 0, movePoints: 0, attacked: false, phase: 'hero' },
      revealedRooms: [],
      revealedCorridor: [],
      log: [],
    };

    this.revealAround();
    this.beginHeroTurn(0);
    return this.state;
  }

  // ---- Lookups -------------------------------------------------------------
  heroById(id) {
    return this.state.heroes.find((h) => h.id === id);
  }
  monsterById(id) {
    return this.state.monsters.find((m) => m.id === id);
  }
  aliveHeroes() {
    return this.state.heroes.filter((h) => h.alive);
  }
  activeHero() {
    return this.heroById(this.state.turn.order[this.state.turn.idx]);
  }
  roomAt(x, y) {
    return this.map.room[idx(this.map, x, y)];
  }
  isRevealed(x, y) {
    const r = this.roomAt(x, y);
    if (r >= 0) return this.state.revealedRooms.includes(r);
    return this.state.revealedCorridor.includes(key(x, y));
  }

  // Tiles occupied by living tokens (so movement can't pass through them).
  occupancy(exceptId) {
    const set = new Set();
    for (const h of this.state.heroes) if (h.alive && h.id !== exceptId) set.add(key(h.x, h.y));
    for (const m of this.state.monsters) if (m.alive && m.id !== exceptId) set.add(key(m.x, m.y));
    return set;
  }

  // ---- Fog of war ----------------------------------------------------------
  revealAround() {
    const s = this.state;
    for (const h of this.aliveHeroes()) {
      const r = this.roomAt(h.x, h.y);
      if (r >= 0 && !s.revealedRooms.includes(r)) s.revealedRooms.push(r);
      for (let dy = -CORRIDOR_SIGHT; dy <= CORRIDOR_SIGHT; dy++) {
        for (let dx = -CORRIDOR_SIGHT; dx <= CORRIDOR_SIGHT; dx++) {
          const x = h.x + dx;
          const y = h.y + dy;
          if (chebyshev(h.x, h.y, x, y) > CORRIDOR_SIGHT) continue;
          if (!isWalkable(this.map, x, y)) continue;
          if (this.roomAt(x, y) === -1) {
            const k = key(x, y);
            if (!s.revealedCorridor.includes(k)) s.revealedCorridor.push(k);
          }
        }
      }
    }
  }

  // ---- Logging -------------------------------------------------------------
  log(text, kind = '') {
    this.state.log.push({ text, kind });
    if (this.state.log.length > 60) this.state.log.shift();
  }
  logDice(text, r) {
    this.state.log.push({ text, kind: 'dice', atk: r.atk, def: r.def });
    if (this.state.log.length > 60) this.state.log.shift();
  }

  // ---- Turn flow -----------------------------------------------------------
  beginHeroTurn(i) {
    const t = this.state.turn;
    t.idx = i;
    t.phase = 'hero';
    t.attacked = false;
    t.movePoints = rollMovement(this.rng);
    const hero = this.activeHero();
    this.log(`${hero.name}'s turn — moves ${t.movePoints}`, 'sys');
  }

  advanceTurn() {
    const order = this.state.turn.order;
    for (let i = this.state.turn.idx + 1; i < order.length; i++) {
      if (this.heroById(order[i])?.alive) {
        this.beginHeroTurn(i);
        return;
      }
    }
    // Round complete: the GM acts, then a fresh round begins.
    this.runGmTurn();
    if (this.state.phase !== 'playing') return;
    for (let i = 0; i < order.length; i++) {
      if (this.heroById(order[i])?.alive) {
        this.beginHeroTurn(i);
        return;
      }
    }
    this.state.phase = 'lost';
  }

  runGmTurn() {
    this.state.turn.phase = 'gm';
    this.log('— Zargon commands the monsters —', 'sys');
    runMonsterTurn(this);
    if (!this.aliveHeroes().length) {
      this.state.phase = 'lost';
      this.log('The whole party has perished. Defeat.', 'hit');
    }
  }

  // ---- Intent handlers (host-side, validated) ------------------------------
  // Each returns true if it changed state and a snapshot should be broadcast.
  canControl(peerId, heroId) {
    const hero = this.activeHero();
    return (
      this.state.phase === 'playing' &&
      this.state.turn.phase === 'hero' &&
      hero &&
      hero.alive &&
      hero.id === heroId &&
      hero.owner === peerId
    );
  }

  moveHero(peerId, heroId, x, y) {
    if (!this.canControl(peerId, heroId)) return false;
    const hero = this.activeHero();
    const blocked = this.occupancy(hero.id);
    if (!isWalkable(this.map, x, y) || blocked.has(key(x, y))) return false;
    const seen = bfs(this.map, { x: hero.x, y: hero.y }, this.state.turn.movePoints, blocked);
    const node = seen.get(key(x, y));
    if (!node || node.dist === 0) return false;
    const path = reconstruct(seen, x, y);
    if (!path) return false;
    hero.x = x;
    hero.y = y;
    this.state.turn.movePoints -= node.dist;
    this.revealAround();
    if (x === this.map.exit.x && y === this.map.exit.y) {
      this.state.phase = 'won';
      this.log(`${hero.name} reaches the stairs. Victory!`, 'good');
    }
    return true;
  }

  attack(peerId, heroId, targetId) {
    if (!this.canControl(peerId, heroId)) return false;
    if (this.state.turn.attacked) return false;
    const hero = this.activeHero();
    const target = this.monsterById(targetId);
    if (!target || !target.alive) return false;
    if (!isAdjacent(hero.x, hero.y, target.x, target.y)) return false;

    const r = resolveAttack(this.rng, hero.attack, target.defend, true);
    this.state.turn.attacked = true;
    this.logDice(`${hero.name} attacks ${target.name}`, r);
    if (r.damage > 0) {
      target.body -= r.damage;
      this.log(`${target.name} takes ${r.damage} damage`, 'good');
      if (target.body <= 0) {
        target.alive = false;
        this.log(`${target.name} is slain!`, 'good');
      }
    } else {
      this.log(`${target.name} shrugs it off`, 'hit');
    }
    return true;
  }

  endTurn(peerId, heroId) {
    if (!this.canControl(peerId, heroId)) return false;
    this.advanceTurn();
    return true;
  }

  // ---- Serialization -------------------------------------------------------
  init() {
    return { map: this.map };
  }
  snapshot() {
    return this.state;
  }
}
