import { Net } from './net/Net.js';
import { MSG, ACT } from './net/protocol.js';
import { Renderer } from './render/Renderer.js';
import { Board3D } from './render/Board3D.js';
import { Tokens } from './render/Tokens.js';
import { Picker } from './input/Picker.js';
import { Lobby } from './ui/Lobby.js';
import { HUD } from './ui/HUD.js';
import { Log } from './ui/Log.js';
import { GameState } from './game/GameState.js';
import { generateDungeon } from './game/MapGen.js';
import { makeRng } from './game/rng.js';
import { bfs, key, isWalkable } from './game/grid.js';
import { MAX_PLAYERS } from './config.js';

// Top-level coordinator. The host runs the authoritative GameState and
// broadcasts snapshots; every peer (host included) renders from the latest
// snapshot and sends intents for its own hero.
export class App {
  constructor() {
    this.net = new Net();
    this.isHost = false;
    this.players = []; // host-side roster: [{ peerId, name, cls }]
    this.gs = null; //    host only
    this.map = null;
    this.snap = null;

    this.renderer = new Renderer(document.getElementById('scene'));
    this.renderer.onFrame((dt) => this.tokens?.update(dt));

    this.lobby = new Lobby(document.getElementById('lobby'), {
      onHost: (name) => this._host(name),
      onJoin: (code, name) => this._join(code, name),
      onPick: (cls) => this._pick(cls),
      onStart: () => this._startGame(),
    });
    this.pendingSpell = null; // armed heal/damage spell awaiting a target
    this.hud = new HUD(document.getElementById('hud'), document.getElementById('party'), {
      onEndTurn: (heroId) => {
        this.pendingSpell = null;
        this._intent({ t: ACT.END, heroId });
      },
      onSearch: (heroId) => this._intent({ t: ACT.SEARCH, heroId }),
      onDrink: (heroId) => this._intent({ t: ACT.DRINK, heroId }),
      onSelectSpell: (heroId, spellId) => this._selectSpell(heroId, spellId),
    });
    this.log = new Log(document.getElementById('log'));
    this.toastEl = document.getElementById('toast');

    this.net.on('error', (err) => this._onNetError(err));
  }

  get myId() {
    return this.net.id;
  }

  // ---- Lobby: hosting -------------------------------------------------------
  _host(name) {
    this.isHost = true;
    this.net.on('open', (code) => {
      this.players = [{ peerId: this.myId, name, cls: null }];
      this.lobby.showRoom({ isHost: true, code });
      this._pushLobby();
    });
    this.net.on('connect', () => {}); // wait for HELLO
    this.net.on('disconnect', (peerId) => this._onPeerLeave(peerId));
    this.net.on('data', ({ from, msg }) => this._hostRecv(from, msg));
    this.net.host();
  }

  _hostRecv(from, msg) {
    switch (msg.t) {
      case MSG.HELLO: {
        if (this.gs) return; // game already running; ignore late joiners
        if (this.players.length >= MAX_PLAYERS) {
          this.net.to(from, { t: MSG.REJECT, reason: 'Room is full' });
          return;
        }
        if (!this.players.find((p) => p.peerId === from))
          this.players.push({ peerId: from, name: msg.name || 'Hero', cls: null });
        this._pushLobby();
        break;
      }
      case MSG.PICK: {
        const p = this.players.find((pl) => pl.peerId === from);
        if (p) {
          if (msg.name) p.name = msg.name;
          // Reject a class another player already holds.
          const taken = this.players.some((pl) => pl.peerId !== from && pl.cls === msg.cls);
          if (!taken) p.cls = msg.cls;
        }
        this._pushLobby();
        break;
      }
      case MSG.INTENT:
        this._applyIntent(from, msg.action);
        break;
    }
  }

  _pushLobby() {
    const payload = { t: MSG.LOBBY, players: this.players };
    this.net.broadcast(payload);
    this.lobby.setPlayers(this.players, this.myId);
  }

  _onPeerLeave(peerId) {
    if (!this.gs) {
      this.players = this.players.filter((p) => p.peerId !== peerId);
      this._pushLobby();
      return;
    }
    // Mid-game: hand the orphaned hero to the host so turns don't stall.
    for (const h of this.snap.heroes) {
      if (h.owner === peerId) h.owner = this.myId;
    }
    this.gs.log('A hero was abandoned — the host takes command.', 'sys');
    this._broadcastState();
  }

  // ---- Lobby: joining -------------------------------------------------------
  _join(code, name) {
    this.isHost = false;
    this.myName = name;
    this.net.on('open', () => {
      this.lobby.showRoom({ isHost: false, code });
      this.net.toHost({ t: MSG.HELLO, name });
    });
    this.net.on('disconnect', () => this.lobby.setStatus('Lost connection to host.', true));
    this.net.on('data', ({ msg }) => this._clientRecv(msg));
    this.net.join(code);
  }

  _clientRecv(msg) {
    switch (msg.t) {
      case MSG.LOBBY:
        this.lobby.setPlayers(msg.players, this.myId);
        break;
      case MSG.INIT:
        this._buildGame(msg.map);
        break;
      case MSG.STATE:
        this._applySnapshot(msg.snapshot);
        break;
      case MSG.REJECT:
        this.lobby.setStatus(msg.reason || 'Rejected by host.', true);
        break;
    }
  }

  _pick(cls) {
    if (this.isHost) {
      const me = this.players.find((p) => p.peerId === this.myId);
      const taken = this.players.some((p) => p.peerId !== this.myId && p.cls === cls);
      if (me && !taken) me.cls = cls;
      this._pushLobby();
    } else {
      this.net.toHost({ t: MSG.PICK, cls, name: this.myName });
    }
  }

  // ---- Start ---------------------------------------------------------------
  _startGame() {
    if (!this.isHost) return;
    const ready = this.players.filter((p) => p.cls);
    if (!ready.length) return;
    const rng = makeRng();
    const { map, startTiles, monsterSpawns } = generateDungeon(rng);
    this.gs = new GameState(map, rng);
    this.gs.start(ready, startTiles, monsterSpawns);

    this.net.broadcast({ t: MSG.INIT, map });
    this._buildGame(map);
    this._broadcastState();
  }

  _broadcastState() {
    const snap = this.gs.snapshot();
    this.net.broadcast({ t: MSG.STATE, snapshot: snap });
    this._applySnapshot(snap);
  }

  // ---- Build the 3D view (host and client) ---------------------------------
  _buildGame(map) {
    this.map = map;
    this.renderer.focusMap(map);
    this.board = new Board3D(this.renderer.scene, map);
    this.tokens = new Tokens(this.renderer.scene, this.board, map);
    this.picker = new Picker(this.renderer, this.board, this.tokens, (pick) => this._onPick(pick));
    this.hud.map = map;

    this.lobby.hide();
    this.hud.show();
    this.log.show();
  }

  // ---- Snapshot application (render) ---------------------------------------
  _applySnapshot(snap) {
    this.snap = snap;
    // A new snapshot means the turn state advanced; drop any armed spell that
    // is no longer castable (acted, not my turn, charges spent).
    if (this.pendingSpell && !this._canCastPending()) this.pendingSpell = null;
    this.board.updateFog(snap);
    this.tokens.sync(snap);
    this._refreshHud();
    this.log.update(snap);
    this._updateReachable();
    this._checkEnd(snap);
  }

  _refreshHud() {
    this.hud.update(this.snap, this.myId, { pendingSpell: this.pendingSpell });
  }

  _canCastPending() {
    const hero = this._activeHeroForMe();
    if (!hero || this.snap.turn.acted) return false;
    const s = hero.spells?.find((sp) => sp.id === this.pendingSpell.id);
    return !!s && s.charges > 0;
  }

  _selectSpell(heroId, spellId) {
    const hero = this._activeHeroForMe();
    if (!hero || hero.id !== heroId) return;
    const spell = hero.spells?.find((s) => s.id === spellId);
    if (!spell || spell.charges <= 0 || this.snap.turn.acted) return;
    // Toggle: clicking the armed spell again cancels targeting.
    this.pendingSpell = this.pendingSpell?.id === spellId ? null : spell;
    this._refreshHud();
  }

  _activeHeroForMe() {
    if (!this.snap || this.snap.phase !== 'playing') return null;
    const t = this.snap.turn;
    if (t.phase !== 'hero') return null;
    const active = this.snap.heroes.find((h) => h.id === t.order[t.idx]);
    return active && active.alive && active.owner === this.myId ? active : null;
  }

  _occupancy(exceptId) {
    const set = new Set();
    for (const h of this.snap.heroes) if (h.alive && h.id !== exceptId) set.add(key(h.x, h.y));
    for (const m of this.snap.monsters) if (m.alive && m.id !== exceptId) set.add(key(m.x, m.y));
    return set;
  }

  _updateReachable() {
    const hero = this._activeHeroForMe();
    if (!hero) {
      this.board.setReachable([]);
      return;
    }
    const blocked = this._occupancy(hero.id);
    const seen = bfs(this.map, { x: hero.x, y: hero.y }, this.snap.turn.movePoints, blocked);
    const tiles = [];
    for (const [k, node] of seen) {
      if (node.dist === 0) continue;
      const [x, y] = k.split(',').map(Number);
      if (isWalkable(this.map, x, y)) tiles.push({ x, y });
    }
    this.board.setReachable(tiles);
  }

  // ---- Input ---------------------------------------------------------------
  _onPick(pick) {
    const hero = this._activeHeroForMe();
    if (!hero) return;

    // Spell targeting takes priority while a spell is armed.
    if (this.pendingSpell) {
      const spell = this.pendingSpell;
      if (spell.kind === 'damage' && pick.type === 'monster') {
        this._intent({ t: ACT.CAST, heroId: hero.id, spellId: spell.id, targetId: pick.id });
        this.pendingSpell = null;
      } else if (spell.kind === 'heal' && pick.type === 'hero') {
        this._intent({ t: ACT.CAST, heroId: hero.id, spellId: spell.id, targetId: pick.id });
        this.pendingSpell = null;
      }
      this._refreshHud();
      return;
    }

    if (pick.type === 'tile') {
      this._intent({ t: ACT.MOVE, heroId: hero.id, x: pick.x, y: pick.y });
    } else if (pick.type === 'monster') {
      this._intent({ t: ACT.ATTACK, heroId: hero.id, targetId: pick.id });
    }
  }

  _intent(action) {
    if (this.isHost) {
      this._applyIntent(this.myId, action);
    } else {
      this.net.toHost({ t: MSG.INTENT, action });
    }
  }

  // Host-only: validate + apply an intent, then broadcast if it changed state.
  _applyIntent(from, action) {
    if (!this.gs) return;
    let changed = false;
    switch (action.t) {
      case ACT.MOVE:
        changed = this.gs.moveHero(from, action.heroId, action.x, action.y);
        break;
      case ACT.ATTACK:
        changed = this.gs.attack(from, action.heroId, action.targetId);
        break;
      case ACT.CAST:
        changed = this.gs.castSpell(from, action.heroId, action.spellId, action.targetId);
        break;
      case ACT.SEARCH:
        changed = this.gs.search(from, action.heroId);
        break;
      case ACT.DRINK:
        changed = this.gs.drinkPotion(from, action.heroId);
        break;
      case ACT.END:
        changed = this.gs.endTurn(from, action.heroId);
        break;
    }
    if (changed) this._broadcastState();
  }

  // ---- End states ----------------------------------------------------------
  _checkEnd(snap) {
    if (snap.phase === 'won') {
      const gold = snap.heroes.reduce((sum, h) => sum + (h.gold || 0), 0);
      this._toast(`🏆 Victory!${gold ? ` · ${gold} gold looted` : ''}`);
    } else if (snap.phase === 'lost') {
      this._toast('💀 Defeat');
    } else {
      this.toastEl.style.display = 'none';
    }
  }

  _toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.style.display = 'block';
  }

  _onNetError(err) {
    const msg =
      err?.type === 'peer-unavailable'
        ? 'No room with that code.'
        : err?.type === 'unavailable-id'
          ? 'Room code clash — try creating again.'
          : 'Network error: ' + (err?.type || err?.message || 'unknown');
    this.lobby.setStatus(msg, true);
  }
}
