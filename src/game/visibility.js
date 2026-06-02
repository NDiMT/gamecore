import { idx, key, WALL, inBounds } from './grid.js';

// Pure fog-of-war query usable on both host and clients (clients have no
// GameState, only the map + the latest snapshot). A room tile is visible once
// its room id is revealed; a corridor tile is visible once it's in the
// revealed-corridor set.
export function tileRevealed(map, snap, x, y) {
  if (!inBounds(map, x, y)) return false;
  const r = map.room[idx(map, x, y)];
  if (r >= 0) return snap.revealedRooms.includes(r);
  return snap.revealedCorridor.includes(key(x, y));
}

// A wall is shown if it borders any revealed walkable tile, so room outlines
// appear as the party explores.
export function wallVisible(map, snap, x, y) {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(map, nx, ny)) continue;
    if (map.type[idx(map, nx, ny)] === WALL) continue;
    if (tileRevealed(map, snap, nx, ny)) return true;
  }
  return false;
}
