class_name Board3D
extends Node3D
## Builds the dungeon geometry from a map and drives its fog-of-war visibility
## and the move-range highlight.

# Color(hex) isn't a const expression, so these are runtime vars.
var FLOOR_A := Color("2c2940")
var FLOOR_B := Color("33304a")
var DOOR_COLOR := Color("7c5326")
var WALL_BODY := Color("3f3b4d")
var WALL_CAP := Color("57536b")
var BACKDROP := Color("09070f")
var REACH_COLOR := Color("3a6bff")

var map: Dictionary
var tile_meshes := {}   # Vector2i -> MeshInstance3D (floor/door)
var wall_meshes := {}   # Vector2i -> Node3D (body + cap)
var _highlighted: Array[Vector2i] = []
var exit_portal: MeshInstance3D
var trap_markers := {}   # Vector2i -> MeshInstance3D

static func world_from_tile(x: int, y: int) -> Vector3:
	return Vector3(x * Data.TILE + Data.TILE * 0.5, 0.0, y * Data.TILE + Data.TILE * 0.5)

func build(_map: Dictionary) -> void:
	map = _map
	var wall_h := 1.35
	var tile_geo := BoxMesh.new()
	tile_geo.size = Vector3(Data.TILE * 0.98, 0.14, Data.TILE * 0.98)
	var wall_body_geo := BoxMesh.new()
	wall_body_geo.size = Vector3(Data.TILE, wall_h, Data.TILE)
	var wall_cap_geo := BoxMesh.new()
	wall_cap_geo.size = Vector3(Data.TILE, 0.16, Data.TILE)
	var body_mat := StandardMaterial3D.new()
	body_mat.albedo_color = WALL_BODY
	body_mat.roughness = 1.0
	var cap_mat := StandardMaterial3D.new()
	cap_mat.albedo_color = WALL_CAP
	cap_mat.roughness = 0.85

	# Dark backdrop slab so the dungeon doesn't float in the void (catches shadow).
	var back := MeshInstance3D.new()
	var back_mesh := BoxMesh.new()
	back_mesh.size = Vector3(map.w * Data.TILE + 6, 0.2, map.h * Data.TILE + 6)
	back.mesh = back_mesh
	var back_mat := StandardMaterial3D.new()
	back_mat.albedo_color = BACKDROP
	back_mat.roughness = 1.0
	back.material_override = back_mat
	back.position = Vector3(map.w * Data.TILE * 0.5, -0.12, map.h * Data.TILE * 0.5)
	add_child(back)

	for y in map.h:
		for x in map.w:
			var t: int = map.type[Grid.idx(map, x, y)]
			var pos := world_from_tile(x, y)
			if t == Data.FLOOR or t == Data.DOOR:
				var mat := StandardMaterial3D.new()
				if t == Data.DOOR:
					mat.albedo_color = DOOR_COLOR
				else:
					mat.albedo_color = FLOOR_A if (x + y) % 2 == 0 else FLOOR_B
				mat.roughness = 0.95
				var mi := MeshInstance3D.new()
				mi.mesh = tile_geo
				mi.material_override = mat
				mi.position = pos
				mi.visible = false
				add_child(mi)
				tile_meshes[Vector2i(x, y)] = mi
			elif _wall_borders_floor(x, y):
				var g := Node3D.new()
				var body := MeshInstance3D.new()
				body.mesh = wall_body_geo
				body.material_override = body_mat
				body.position = Vector3(0, wall_h * 0.5, 0)
				body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
				g.add_child(body)
				var cap := MeshInstance3D.new()
				cap.mesh = wall_cap_geo
				cap.material_override = cap_mat
				cap.position = Vector3(0, wall_h + 0.08, 0)
				g.add_child(cap)
				g.position = Vector3(pos.x, 0, pos.z)
				g.visible = false
				add_child(g)
				wall_meshes[Vector2i(x, y)] = g

	# Glowing exit portal.
	var portal_mesh := CylinderMesh.new()
	portal_mesh.top_radius = Data.TILE * 0.34
	portal_mesh.bottom_radius = Data.TILE * 0.42
	portal_mesh.height = 0.08
	var portal_mat := StandardMaterial3D.new()
	portal_mat.albedo_color = Color("2fe0c0")
	portal_mat.emission_enabled = true
	portal_mat.emission = Color("2fe0c0")
	portal_mat.emission_energy_multiplier = 2.0
	exit_portal = MeshInstance3D.new()
	exit_portal.mesh = portal_mesh
	exit_portal.material_override = portal_mat
	exit_portal.position = world_from_tile(map.exit.x, map.exit.y) + Vector3(0, 0.14, 0)
	exit_portal.visible = false
	add_child(exit_portal)

func _wall_borders_floor(x: int, y: int) -> bool:
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			var nx := x + dx
			var ny := y + dy
			if not Grid.in_bounds(map, nx, ny):
				continue
			if map.type[Grid.idx(map, nx, ny)] != Data.WALL:
				return true
	return false

func update_fog(snap: Dictionary) -> void:
	for k in tile_meshes:
		tile_meshes[k].visible = Vis.tile_revealed(map, snap, k.x, k.y)
	for k in wall_meshes:
		wall_meshes[k].visible = Vis.wall_visible(map, snap, k.x, k.y)
	exit_portal.visible = Vis.tile_revealed(map, snap, map.exit.x, map.exit.y)

## Highlight the tiles the active hero can reach this turn.
func set_reachable(tiles: Array) -> void:
	for k in _highlighted:
		if tile_meshes.has(k):
			tile_meshes[k].material_override.emission_enabled = false
	_highlighted.clear()
	for t in tiles:
		if tile_meshes.has(t):
			var mat: StandardMaterial3D = tile_meshes[t].material_override
			mat.emission_enabled = true
			mat.emission = REACH_COLOR
			mat.emission_energy_multiplier = 0.5
			_highlighted.append(t)

# Show discovered/sprung traps that sit on a revealed tile.
func update_traps(snap: Dictionary) -> void:
	for tr in snap.get("traps", []):
		var key := Vector2i(tr.x, tr.y)
		var shown: bool = (tr.found or tr.sprung) and Vis.tile_revealed(map, snap, tr.x, tr.y)
		if not shown:
			if trap_markers.has(key):
				trap_markers[key].visible = false
			continue
		if not trap_markers.has(key):
			var disc := CylinderMesh.new()
			disc.top_radius = 0.3
			disc.bottom_radius = 0.3
			disc.height = 0.05
			var mi := MeshInstance3D.new()
			mi.mesh = disc
			mi.material_override = StandardMaterial3D.new()
			mi.position = world_from_tile(tr.x, tr.y) + Vector3(0, 0.14, 0)
			add_child(mi)
			trap_markers[key] = mi
		var m: MeshInstance3D = trap_markers[key]
		var mat: StandardMaterial3D = m.material_override
		if tr.get("disarmed", false):
			mat.albedo_color = Color("4caf6f")
			mat.emission_enabled = false
		else:
			mat.albedo_color = Color("e0552f") if tr.kind == "spear" else Color("201a2c")
			mat.emission_enabled = true
			mat.emission = Color("ff5a3c")
			mat.emission_energy_multiplier = 0.0 if tr.sprung else 0.8
		m.visible = true

# Convert a discovered secret-door wall tile into a passable door tile.
func reveal_secret(x: int, y: int) -> void:
	var key := Vector2i(x, y)
	if wall_meshes.has(key):
		wall_meshes[key].visible = false
	if tile_meshes.has(key):
		return
	var tile_mesh := BoxMesh.new()
	tile_mesh.size = Vector3(Data.TILE * 0.97, 0.12, Data.TILE * 0.97)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = DOOR_COLOR
	mat.roughness = 0.9
	var mi := MeshInstance3D.new()
	mi.mesh = tile_mesh
	mi.material_override = mat
	mi.position = world_from_tile(x, y)
	mi.visible = true
	add_child(mi)
	tile_meshes[key] = mi
