import { bfs, reconstruct, key, isAdjacent } from './grid.js';
import { resolveAttack } from './rules.js';

// The scripted "Zargon". Runs on the host during the GM phase: every revealed,
// living monster advances toward the nearest hero and attacks if it can reach
// melee range. Mutates the GameState in place and appends to its log.
export function runMonsterTurn(gs) {
  const { map } = gs;
  for (const m of gs.state.monsters) {
    if (!m.alive) continue;
    if (!gs.isRevealed(m.x, m.y)) continue; // unseen monsters stay dormant

    const heroes = gs.aliveHeroes();
    if (!heroes.length) return;

    let target = adjacentHero(gs, m);
    if (!target) {
      const blocked = gs.occupancy(m.id);
      const seen = bfs(map, { x: m.x, y: m.y }, Infinity, blocked);
      let bestTile = null;
      let bestDist = Infinity;
      for (const hero of heroes) {
        for (const [nx, ny] of neighbours(hero)) {
          const node = seen.get(key(nx, ny));
          if (node && node.dist < bestDist) {
            bestDist = node.dist;
            bestTile = { x: nx, y: ny };
          }
        }
      }
      if (bestTile) {
        const path = reconstruct(seen, bestTile.x, bestTile.y) || [];
        const steps = Math.min(m.move, path.length);
        if (steps > 0) {
          const dest = path[steps - 1];
          m.x = dest.x;
          m.y = dest.y;
        }
      }
      target = adjacentHero(gs, m);
    }

    if (target) {
      const r = resolveAttack(gs.rng, m.attack, target.defend, false);
      gs.logDice(`${m.name} attacks ${target.name}`, r);
      if (r.damage > 0) {
        target.body -= r.damage;
        gs.log(`${target.name} takes ${r.damage} damage`, 'hit');
        if (target.body <= 0) {
          target.body = 0;
          target.alive = false;
          gs.log(`${target.name} has fallen!`, 'hit');
        }
      } else {
        gs.log(`${target.name} blocks the blow`, 'good');
      }
    }
  }
}

function adjacentHero(gs, m) {
  return gs.aliveHeroes().find((h) => isAdjacent(h.x, h.y, m.x, m.y)) || null;
}

function neighbours(t) {
  return [
    [t.x + 1, t.y],
    [t.x - 1, t.y],
    [t.x, t.y + 1],
    [t.x, t.y - 1],
  ];
}
