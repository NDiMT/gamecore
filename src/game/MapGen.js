import { WALL, FLOOR, DOOR, idx } from './grid.js';
import { MAP_W, MAP_H } from '../config.js';
import { FODDER } from '../data/monsters.js';

// Procedurally generate a connected dungeon of rectangular rooms joined by
// width-1 corridors. Doors are placed where a corridor meets a room edge.
// Generation happens only on the host; the resulting plain-object map is sent
// to clients verbatim.
export function generateDungeon(rng, opts = {}) {
  const w = opts.w || MAP_W;
  const h = opts.h || MAP_H;
  const type = new Array(w * h).fill(WALL);
  const room = new Array(w * h).fill(-1); // -1 = corridor/none
  const map = { seed: rng.seed, w, h, type, room, rooms: [], start: null, exit: null };

  // --- Place non-overlapping rooms (with a 1-tile margin between them). ---
  const rooms = [];
  const maxRooms = 8;
  for (let attempt = 0; attempt < 80 && rooms.length < maxRooms; attempt++) {
    const rw = rng.int(4, 6);
    const rh = rng.int(4, 6);
    const rx = rng.int(1, w - rw - 2);
    const ry = rng.int(1, h - rh - 2);
    const overlaps = rooms.some(
      (r) => rx <= r.x + r.w && rx + rw >= r.x - 1 && ry <= r.y + r.h && ry + rh >= r.y - 1
    );
    if (overlaps) continue;
    const id = rooms.length;
    const r = { id, x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) };
    rooms.push(r);
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        type[idx(map, x, y)] = FLOOR;
        room[idx(map, x, y)] = id;
      }
    }
  }
  map.rooms = rooms;

  // --- Carve corridors. Chain rooms (guarantees connectivity) + a few loops.
  const carve = (x, y) => {
    if (type[idx(map, x, y)] === WALL) {
      type[idx(map, x, y)] = FLOOR; // corridor, room stays -1
    }
  };
  const tunnel = (a, b) => {
    let { cx: x, cy: y } = a;
    const horizFirst = rng() < 0.5;
    const stepX = () => {
      while (x !== b.cx) {
        x += x < b.cx ? 1 : -1;
        carve(x, y);
      }
    };
    const stepY = () => {
      while (y !== b.cy) {
        y += y < b.cy ? 1 : -1;
        carve(x, y);
      }
    };
    carve(x, y);
    if (horizFirst) {
      stepX();
      stepY();
    } else {
      stepY();
      stepX();
    }
  };
  for (let i = 1; i < rooms.length; i++) tunnel(rooms[i - 1], rooms[i]);
  const extra = Math.min(2, Math.max(0, rooms.length - 2));
  for (let i = 0; i < extra; i++) {
    const a = rng.pick(rooms);
    const b = rng.pick(rooms);
    if (a !== b) tunnel(a, b);
  }

  // --- Place doors: room-edge floor tiles that touch a corridor become doors.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rid = room[idx(map, x, y)];
      if (rid < 0 || type[idx(map, x, y)] !== FLOOR) continue;
      const neighbours = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      const touchesCorridor = neighbours.some(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
        return type[idx(map, nx, ny)] !== WALL && room[idx(map, nx, ny)] === -1;
      });
      if (touchesCorridor) type[idx(map, x, y)] = DOOR;
    }
  }

  // --- Start room = first room; exit = centre of the room farthest from it.
  const startRoom = rooms[0];
  let exitRoom = rooms[rooms.length - 1];
  let best = -1;
  for (const r of rooms) {
    const d = Math.abs(r.cx - startRoom.cx) + Math.abs(r.cy - startRoom.cy);
    if (d > best) {
      best = d;
      exitRoom = r;
    }
  }
  map.start = { x: startRoom.cx, y: startRoom.cy };
  map.exit = { x: exitRoom.cx, y: exitRoom.cy };

  // Hero start tiles: floor tiles inside the start room (no doors).
  const startTiles = roomFloorTiles(map, startRoom).filter(
    (t) => type[idx(map, t.x, t.y)] === FLOOR
  );

  // --- Monster spawns. Ordinary rooms get fodder; the exit room gets a boss.
  const monsterSpawns = [];
  for (const r of rooms) {
    if (r.id === startRoom.id) continue;
    const tiles = roomFloorTiles(map, r).filter(
      (t) => type[idx(map, t.x, t.y)] === FLOOR && !(t.x === map.exit.x && t.y === map.exit.y)
    );
    shuffle(tiles, rng);
    let i = 0;
    if (r.id === exitRoom.id && tiles.length) {
      // The boss guards the stairs but doesn't stand on them, so a brave party
      // can still slip past or cut it down to escape.
      monsterSpawns.push({ type: 'gargoyle', x: tiles[0].x, y: tiles[0].y });
      i = 1;
    }
    const count = rng.int(1, 2);
    for (let n = 0; n < count && i < tiles.length; n++, i++) {
      monsterSpawns.push({ type: rng.pick(FODDER), x: tiles[i].x, y: tiles[i].y });
    }
  }

  return { map, startTiles, monsterSpawns };
}

function roomFloorTiles(map, r) {
  const out = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (map.type[idx(map, x, y)] !== WALL) out.push({ x, y });
    }
  }
  return out;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
