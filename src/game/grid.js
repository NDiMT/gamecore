// Grid helpers shared by map generation, pathfinding and the renderer.
// Tile types: 0 = wall, 1 = floor, 2 = door (walkable).
export const WALL = 0;
export const FLOOR = 1;
export const DOOR = 2;

export const idx = (map, x, y) => y * map.w + x;
export const inBounds = (map, x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h;

export function tileType(map, x, y) {
  if (!inBounds(map, x, y)) return WALL;
  return map.type[idx(map, x, y)];
}

export const isWalkable = (map, x, y) => tileType(map, x, y) !== WALL;

export const key = (x, y) => `${x},${y}`;

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Breadth-first flood from `start` over walkable tiles, never entering a tile
// in `blocked`. Returns a Map of "x,y" -> { dist, px, py } for every tile
// reachable within `maxSteps` (Infinity for unlimited). The start tile is
// always included at distance 0.
export function bfs(map, start, maxSteps = Infinity, blocked = new Set()) {
  const seen = new Map();
  seen.set(key(start.x, start.y), { dist: 0, px: -1, py: -1 });
  let frontier = [start];
  let dist = 0;
  while (frontier.length && dist < maxSteps) {
    const next = [];
    dist++;
    for (const cur of frontier) {
      for (const [dx, dy] of DIRS) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        if (!isWalkable(map, nx, ny)) continue;
        if (blocked.has(k)) continue;
        seen.set(k, { dist, px: cur.x, py: cur.y });
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }
  return seen;
}

// Reconstruct the step-by-step path to (tx,ty) from a bfs() result.
export function reconstruct(seen, tx, ty) {
  const path = [];
  let k = key(tx, ty);
  if (!seen.has(k)) return null;
  let node = seen.get(k);
  let x = tx;
  let y = ty;
  while (node && node.px !== -1) {
    path.unshift({ x, y });
    x = node.px;
    y = node.py;
    node = seen.get(key(x, y));
  }
  return path; // excludes the start tile
}

export const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
export const manhattan = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
export const isAdjacent = (ax, ay, bx, by) => manhattan(ax, ay, bx, by) === 1;
