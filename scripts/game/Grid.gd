class_name Grid
## Static grid helpers: walkability tests, breadth-first flood fill and path
## reconstruction. Maps are plain Dictionaries:
##   { w, h, type:PackedInt32Array, room:PackedInt32Array, rooms:Array,
##     start:Vector2i, exit:Vector2i }
## Tile types live in Data (WALL/FLOOR/DOOR).

const DIRS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]
const HUGE := 1 << 30

static func idx(map: Dictionary, x: int, y: int) -> int:
	return y * map.w + x

static func in_bounds(map: Dictionary, x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < map.w and y < map.h

static func tile_type(map: Dictionary, x: int, y: int) -> int:
	if not in_bounds(map, x, y):
		return Data.WALL
	return map.type[idx(map, x, y)]

static func is_walkable(map: Dictionary, x: int, y: int) -> bool:
	return tile_type(map, x, y) != Data.WALL

## Flood from `start` over walkable tiles, never entering a tile in `blocked`
## (a Dictionary used as a set: Vector2i -> true). Returns
## Vector2i -> { dist:int, prev:Vector2i } for every reachable tile within
## `max_steps`. The start tile is always present at distance 0.
static func bfs(map: Dictionary, start: Vector2i, max_steps: int, blocked: Dictionary) -> Dictionary:
	var seen := {}
	seen[start] = {"dist": 0, "prev": Vector2i(-1, -1)}
	var frontier: Array[Vector2i] = [start]
	var dist := 0
	while frontier.size() > 0 and dist < max_steps:
		var nxt: Array[Vector2i] = []
		dist += 1
		for cur in frontier:
			for d in DIRS:
				var n: Vector2i = cur + d
				if seen.has(n):
					continue
				if not is_walkable(map, n.x, n.y):
					continue
				if blocked.has(n):
					continue
				seen[n] = {"dist": dist, "prev": cur}
				nxt.append(n)
		frontier = nxt
	return seen

## Reconstruct the step-by-step path to `target` (excludes the start tile).
static func reconstruct(seen: Dictionary, target: Vector2i) -> Array:
	if not seen.has(target):
		return []
	var path: Array[Vector2i] = []
	var cur: Vector2i = target
	while seen.has(cur) and seen[cur].prev != Vector2i(-1, -1):
		path.push_front(cur)
		cur = seen[cur].prev
	return path

static func manhattan(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)

static func chebyshev(a: Vector2i, b: Vector2i) -> int:
	return max(abs(a.x - b.x), abs(a.y - b.y))

static func is_adjacent(ax: int, ay: int, bx: int, by: int) -> bool:
	return abs(ax - bx) + abs(ay - by) == 1
