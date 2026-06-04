class_name MapGen
## Procedurally generates a connected dungeon of rectangular rooms joined by
## width-1 corridors, with doors where a corridor meets a room edge. Runs only
## on the host. Returns { map, start_tiles:Array[Vector2i], monster_spawns:Array }.

## `spec` may carry: pool (monster id Array), boss (id or ""), density ([min,max]).
static func generate(rng: RandomNumberGenerator, spec: Dictionary = {}) -> Dictionary:
	var pool: Array = spec.get("pool", Data.FODDER)
	var boss: String = spec.get("boss", "gargoyle")
	var density: Array = spec.get("density", [1, 2])
	var w := Data.MAP_W
	var h := Data.MAP_H
	var type := PackedInt32Array()
	type.resize(w * h)            # defaults to 0 == WALL
	var room := PackedInt32Array()
	room.resize(w * h)
	room.fill(-1)                 # -1 == corridor / none
	var map := {"w": w, "h": h, "type": type, "room": room, "rooms": [], "start": Vector2i.ZERO, "exit": Vector2i.ZERO}

	# --- Place non-overlapping rooms (with a 1-tile margin). ---
	var rooms: Array = []
	var max_rooms := 8
	var attempt := 0
	while attempt < 80 and rooms.size() < max_rooms:
		attempt += 1
		var rw := rng.randi_range(4, 6)
		var rh := rng.randi_range(4, 6)
		var rx := rng.randi_range(1, w - rw - 2)
		var ry := rng.randi_range(1, h - rh - 2)
		var overlaps := false
		for r in rooms:
			if rx <= r.x + r.w and rx + rw >= r.x - 1 and ry <= r.y + r.h and ry + rh >= r.y - 1:
				overlaps = true
				break
		if overlaps:
			continue
		var id := rooms.size()
		var rm := {"id": id, "x": rx, "y": ry, "w": rw, "h": rh, "cx": int(rx + rw / 2.0), "cy": int(ry + rh / 2.0)}
		rooms.append(rm)
		for y in range(ry, ry + rh):
			for x in range(rx, rx + rw):
				type[Grid.idx(map, x, y)] = Data.FLOOR
				room[Grid.idx(map, x, y)] = id
	map.rooms = rooms

	# --- Carve corridors: chain the rooms (guarantees connectivity) + loops.
	for i in range(1, rooms.size()):
		_tunnel(map, rng, rooms[i - 1], rooms[i])
	var extra := clampi(rooms.size() - 2, 0, 2)
	for i in extra:
		var a = rooms[rng.randi_range(0, rooms.size() - 1)]
		var b = rooms[rng.randi_range(0, rooms.size() - 1)]
		if a != b:
			_tunnel(map, rng, a, b)

	# --- Doors: room-edge floor tiles that touch a corridor become doors.
	for y in h:
		for x in w:
			var rid := room[Grid.idx(map, x, y)]
			if rid < 0 or type[Grid.idx(map, x, y)] != Data.FLOOR:
				continue
			for d in Grid.DIRS:
				var nx: int = x + d.x
				var ny: int = y + d.y
				if not Grid.in_bounds(map, nx, ny):
					continue
				if type[Grid.idx(map, nx, ny)] != Data.WALL and room[Grid.idx(map, nx, ny)] == -1:
					type[Grid.idx(map, x, y)] = Data.DOOR
					break

	# --- Start room = first; exit = centre of the farthest room.
	var start_room = rooms[0]
	var exit_room = rooms[rooms.size() - 1]
	var best := -1
	for r in rooms:
		var dd: int = abs(r.cx - start_room.cx) + abs(r.cy - start_room.cy)
		if dd > best:
			best = dd
			exit_room = r
	map.start = Vector2i(start_room.cx, start_room.cy)
	map.exit = Vector2i(exit_room.cx, exit_room.cy)

	var start_tiles := _room_floor_tiles(map, start_room).filter(
		func(t): return type[Grid.idx(map, t.x, t.y)] == Data.FLOOR)

	# --- Monster spawns: fodder in ordinary rooms, a boss guarding the exit.
	var monster_spawns: Array = []
	for r in rooms:
		if r.id == start_room.id:
			continue
		var tiles := _room_floor_tiles(map, r).filter(
			func(t): return type[Grid.idx(map, t.x, t.y)] == Data.FLOOR and t != map.exit)
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

	# --- Hidden traps on corridor tiles (avoid start/exit/monster tiles). ---
	var occupied := {}
	for s in monster_spawns:
		occupied[Vector2i(s.x, s.y)] = true
	occupied[map.start] = true
	occupied[map.exit] = true
	var corridor_tiles: Array = []
	for y in h:
		for x in w:
			if type[Grid.idx(map, x, y)] == Data.FLOOR and room[Grid.idx(map, x, y)] == -1:
				if not occupied.has(Vector2i(x, y)):
					corridor_tiles.append(Vector2i(x, y))
	_shuffle(corridor_tiles, rng)
	var traps: Array = []
	var trap_count: int = clampi(rooms.size(), 2, 5)
	for i in range(min(trap_count, corridor_tiles.size())):
		var t: Vector2i = corridor_tiles[i]
		var kind := "pit" if rng.randf() < 0.5 else "spear"
		traps.append({"x": t.x, "y": t.y, "kind": kind, "found": false, "sprung": false})

	# --- Secret doors: wall tiles separating two different rooms. Optional
	# shortcuts, so they never block the main path. Stored as type WALL until
	# found; movement/render consult the secret list.
	var secret_candidates: Array = []
	for y in range(1, h - 1):
		for x in range(1, w - 1):
			if type[Grid.idx(map, x, y)] != Data.WALL:
				continue
			var rl := room[Grid.idx(map, x - 1, y)]
			var rr := room[Grid.idx(map, x + 1, y)]
			var ru := room[Grid.idx(map, x, y - 1)]
			var rd := room[Grid.idx(map, x, y + 1)]
			var horiz := type[Grid.idx(map, x - 1, y)] != Data.WALL and type[Grid.idx(map, x + 1, y)] != Data.WALL and rl >= 0 and rr >= 0 and rl != rr
			var vert := type[Grid.idx(map, x, y - 1)] != Data.WALL and type[Grid.idx(map, x, y + 1)] != Data.WALL and ru >= 0 and rd >= 0 and ru != rd
			if horiz or vert:
				secret_candidates.append(Vector2i(x, y))
	_shuffle(secret_candidates, rng)
	var secret_doors: Array = []
	for i in range(min(2, secret_candidates.size())):
		var s: Vector2i = secret_candidates[i]
		secret_doors.append({"x": s.x, "y": s.y, "found": false})

	return {
		"map": map, "start_tiles": start_tiles, "monster_spawns": monster_spawns,
		"traps": traps, "secret_doors": secret_doors,
	}

static func _tunnel(map: Dictionary, rng: RandomNumberGenerator, a: Dictionary, b: Dictionary) -> void:
	var x: int = a.cx
	var y: int = a.cy
	var horiz_first := rng.randf() < 0.5
	_carve(map, x, y)
	if horiz_first:
		while x != b.cx:
			x += 1 if x < b.cx else -1
			_carve(map, x, y)
		while y != b.cy:
			y += 1 if y < b.cy else -1
			_carve(map, x, y)
	else:
		while y != b.cy:
			y += 1 if y < b.cy else -1
			_carve(map, x, y)
		while x != b.cx:
			x += 1 if x < b.cx else -1
			_carve(map, x, y)

static func _carve(map: Dictionary, x: int, y: int) -> void:
	if map.type[Grid.idx(map, x, y)] == Data.WALL:
		map.type[Grid.idx(map, x, y)] = Data.FLOOR  # corridor; room stays -1

static func _room_floor_tiles(map: Dictionary, r: Dictionary) -> Array:
	var out: Array[Vector2i] = []
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
