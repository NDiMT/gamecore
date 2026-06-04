class_name MapGen
## Generates a HeroQuest-style board: the whole interior is corridor floor, with
## rectangular rooms outlined by walls and entered through visible doors. Runs
## only on the host. Returns { map, start_tiles, monster_spawns, traps,
## secret_doors }. Layouts are verified connected (with retries), so a fixed
## seed always yields the same playable board.

## `spec` may carry: pool (monster id Array), boss (id or ""), density ([min,max]).
static func generate(rng: RandomNumberGenerator, spec: Dictionary = {}) -> Dictionary:
	for attempt in 60:
		var r := _try_build(rng, spec)
		if not r.is_empty():
			return r
	return _fallback(spec)

static func _try_build(rng: RandomNumberGenerator, spec: Dictionary) -> Dictionary:
	var pool: Array = spec.get("pool", Data.FODDER)
	var boss: String = spec.get("boss", "gargoyle")
	var density: Array = spec.get("density", [1, 2])
	var w := Data.MAP_W
	var h := Data.MAP_H
	var type := PackedInt32Array()
	type.resize(w * h)
	type.fill(Data.FLOOR)          # the whole interior starts as corridor
	var room := PackedInt32Array()
	room.resize(w * h)
	room.fill(-1)
	var map := {"w": w, "h": h, "type": type, "room": room, "rooms": [], "start": Vector2i.ZERO, "exit": Vector2i.ZERO}

	# Outer wall.
	for x in w:
		type[Grid.idx(map, x, 0)] = Data.WALL
		type[Grid.idx(map, x, h - 1)] = Data.WALL
	for y in h:
		type[Grid.idx(map, 0, y)] = Data.WALL
		type[Grid.idx(map, w - 1, y)] = Data.WALL

	# Place rooms with a margin so corridor lanes run between them.
	var rooms: Array = []
	var tries := 0
	while tries < 70 and rooms.size() < 7:
		tries += 1
		var rw := rng.randi_range(4, 6)
		var rh := rng.randi_range(3, 5)
		var rx := rng.randi_range(2, w - rw - 3)
		var ry := rng.randi_range(2, h - rh - 3)
		var bad := false
		for r in rooms:
			if rx < r.x + r.w + 2 and r.x < rx + rw + 2 and ry < r.y + r.h + 2 and r.y < ry + rh + 2:
				bad = true
				break
		if bad:
			continue
		var id := rooms.size()
		rooms.append({"id": id, "x": rx, "y": ry, "w": rw, "h": rh, "cx": int(rx + rw / 2.0), "cy": int(ry + rh / 2.0)})
		for yy in range(ry, ry + rh):
			for xx in range(rx, rx + rw):
				type[Grid.idx(map, xx, yy)] = Data.FLOOR
				room[Grid.idx(map, xx, yy)] = id
	map.rooms = rooms
	if rooms.size() < 3:
		return {}

	# Outline each room with walls (only over corridor, never another room).
	for r in rooms:
		for xx in range(r.x - 1, r.x + r.w + 1):
			_wallify(map, xx, r.y - 1)
			_wallify(map, xx, r.y + r.h)
		for yy in range(r.y - 1, r.y + r.h + 1):
			_wallify(map, r.x - 1, yy)
			_wallify(map, r.x + r.w, yy)

	# Carve 1-2 doors per room from its wall into the corridor.
	for r in rooms:
		var cands := _door_candidates(map, r)
		_shuffle(cands, rng)
		if cands.is_empty():
			return {}   # sealed room -> reject layout
		var n: int = min(rng.randi_range(1, 2), cands.size())
		for i in n:
			type[Grid.idx(map, cands[i].x, cands[i].y)] = Data.DOOR

	# Start: a corridor tile near the top-left; party fans out around it.
	var start := Vector2i(-1, -1)
	for y in range(1, h - 1):
		for x in range(1, w - 1):
			if type[Grid.idx(map, x, y)] == Data.FLOOR and room[Grid.idx(map, x, y)] == -1:
				start = Vector2i(x, y)
				break
		if start.x != -1:
			break
	if start.x == -1:
		return {}
	map.start = start

	# Exit: centre of the room farthest from the start.
	var exit_room = rooms[0]
	var best := -1
	for r in rooms:
		var d: int = abs(r.cx - start.x) + abs(r.cy - start.y)
		if d > best:
			best = d
			exit_room = r
	map.exit = Vector2i(exit_room.cx, exit_room.cy)

	# Verify everything is reachable on foot before committing.
	var seen := Grid.bfs(map, start, Grid.HUGE, {})
	if not seen.has(map.exit):
		return {}
	for r in rooms:
		var reached := false
		for yy in range(r.y, r.y + r.h):
			for xx in range(r.x, r.x + r.w):
				if seen.has(Vector2i(xx, yy)):
					reached = true
					break
			if reached:
				break
		if not reached:
			return {}

	# Party start tiles (corridor squares around the start).
	var start_tiles: Array = [start]
	for d in Grid.DIRS + [Vector2i(1, 1), Vector2i(-1, 1)]:
		var n: Vector2i = start + d
		if Grid.is_walkable(map, n.x, n.y) and not start_tiles.has(n):
			start_tiles.append(n)
		if start_tiles.size() >= 4:
			break

	# Monsters: fodder in rooms, boss in the exit room. Reachability already checked.
	var monster_spawns: Array = []
	for r in rooms:
		var tiles := _room_floor_tiles(map, r).filter(func(t): return t != map.exit and seen.has(t))
		_shuffle(tiles, rng)
		var i := 0
		if r.id == exit_room.id and boss != "" and tiles.size() > 0:
			monster_spawns.append({"type": boss, "x": tiles[0].x, "y": tiles[0].y})
			i = 1
		var count := rng.randi_range(density[0], density[1])
		var placed := 0
		while placed < count and i < tiles.size():
			monster_spawns.append({"type": pool[rng.randi_range(0, pool.size() - 1)], "x": tiles[i].x, "y": tiles[i].y})
			placed += 1
			i += 1

	# Hidden traps on corridor tiles away from the start.
	var occupied := {}
	for s in monster_spawns:
		occupied[Vector2i(s.x, s.y)] = true
	for st in start_tiles:
		occupied[st] = true
	var corridor: Array = []
	for y in range(1, h - 1):
		for x in range(1, w - 1):
			var p := Vector2i(x, y)
			if type[Grid.idx(map, x, y)] == Data.FLOOR and room[Grid.idx(map, x, y)] == -1 \
				and not occupied.has(p) and Grid.manhattan(p, start) > 3:
				corridor.append(p)
	_shuffle(corridor, rng)
	var traps: Array = []
	for i in range(min(clampi(rooms.size(), 2, 5), corridor.size())):
		var t: Vector2i = corridor[i]
		traps.append({"x": t.x, "y": t.y, "kind": ("pit" if rng.randf() < 0.5 else "spear"), "found": false, "sprung": false})

	# Secret doors: a wall tile that could be a hidden room entrance.
	var secret_candidates: Array = []
	for r in rooms:
		for c in _door_candidates(map, r):
			if type[Grid.idx(map, c.x, c.y)] == Data.WALL:
				secret_candidates.append(c)
	_shuffle(secret_candidates, rng)
	var secret_doors: Array = []
	for i in range(min(2, secret_candidates.size())):
		secret_doors.append({"x": secret_candidates[i].x, "y": secret_candidates[i].y, "found": false})

	return {"map": map, "start_tiles": start_tiles, "monster_spawns": monster_spawns, "traps": traps, "secret_doors": secret_doors}

# Turn a corridor tile into a wall (never overwrite room floor or perimeter).
static func _wallify(map: Dictionary, x: int, y: int) -> void:
	if not Grid.in_bounds(map, x, y):
		return
	if map.type[Grid.idx(map, x, y)] == Data.FLOOR and map.room[Grid.idx(map, x, y)] == -1:
		map.type[Grid.idx(map, x, y)] = Data.WALL

# Wall tiles on a room's edge with room-floor inside and corridor outside.
static func _door_candidates(map: Dictionary, r: Dictionary) -> Array:
	var out: Array = []
	var edges: Array = []
	for x in range(r.x, r.x + r.w):
		edges.append(Vector2i(x, r.y - 1))
		edges.append(Vector2i(x, r.y + r.h))
	for y in range(r.y, r.y + r.h):
		edges.append(Vector2i(r.x - 1, y))
		edges.append(Vector2i(r.x + r.w, y))
	for p in edges:
		if not Grid.in_bounds(map, p.x, p.y) or map.type[Grid.idx(map, p.x, p.y)] != Data.WALL:
			continue
		for d in Grid.DIRS:
			var inside: Vector2i = p - d
			var outside: Vector2i = p + d
			if not Grid.in_bounds(map, outside.x, outside.y):
				continue
			var inside_room: bool = Grid.in_bounds(map, inside.x, inside.y) and map.room[Grid.idx(map, inside.x, inside.y)] == r.id
			var outside_corridor: bool = map.type[Grid.idx(map, outside.x, outside.y)] == Data.FLOOR and map.room[Grid.idx(map, outside.x, outside.y)] == -1
			if inside_room and outside_corridor:
				out.append(p)
				break
	return out

static func _room_floor_tiles(map: Dictionary, r: Dictionary) -> Array:
	var out: Array = []
	for y in range(r.y, r.y + r.h):
		for x in range(r.x, r.x + r.w):
			if map.type[Grid.idx(map, x, y)] != Data.WALL:
				out.append(Vector2i(x, y))
	return out

static func _shuffle(arr: Array, rng: RandomNumberGenerator) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp

# Trivial guaranteed-connected board, only used if every attempt failed.
static func _fallback(spec: Dictionary) -> Dictionary:
	var w := Data.MAP_W
	var h := Data.MAP_H
	var type := PackedInt32Array()
	type.resize(w * h)
	type.fill(Data.FLOOR)
	var room := PackedInt32Array()
	room.resize(w * h)
	room.fill(-1)
	var map := {"w": w, "h": h, "type": type, "room": room, "rooms": [], "start": Vector2i(1, 1), "exit": Vector2i(w - 2, h - 2)}
	for x in w:
		type[Grid.idx(map, x, 0)] = Data.WALL
		type[Grid.idx(map, x, h - 1)] = Data.WALL
	for y in h:
		type[Grid.idx(map, 0, y)] = Data.WALL
		type[Grid.idx(map, w - 1, y)] = Data.WALL
	var boss: String = spec.get("boss", "gargoyle")
	var spawns: Array = []
	if boss != "":
		spawns.append({"type": boss, "x": w - 3, "y": h - 3})
	return {"map": map, "start_tiles": [Vector2i(1, 1), Vector2i(2, 1), Vector2i(1, 2), Vector2i(2, 2)], "monster_spawns": spawns, "traps": [], "secret_doors": []}
