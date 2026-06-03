class_name MapGen
## Procedurally generates a connected dungeon of rectangular rooms joined by
## width-1 corridors, with doors where a corridor meets a room edge. Runs only
## on the host. Returns { map, start_tiles:Array[Vector2i], monster_spawns:Array }.

static func generate(rng: RandomNumberGenerator) -> Dictionary:
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
		if r.id == exit_room.id and tiles.size() > 0:
			monster_spawns.append({"type": "gargoyle", "x": tiles[0].x, "y": tiles[0].y})
			i = 1
		var count := rng.randi_range(1, 2)
		var placed := 0
		while placed < count and i < tiles.size():
			monster_spawns.append({"type": Data.FODDER[rng.randi_range(0, Data.FODDER.size() - 1)], "x": tiles[i].x, "y": tiles[i].y})
			placed += 1
			i += 1

	return {"map": map, "start_tiles": start_tiles, "monster_spawns": monster_spawns}

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
