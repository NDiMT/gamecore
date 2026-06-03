class_name Board3D
extends Node3D
## Builds the dungeon geometry from a map and drives its fog-of-war visibility
## and the move-range highlight.

# Color(hex) isn't a const expression, so these are runtime vars.
var FLOOR_COLOR := Color("2b2840")
var DOOR_COLOR := Color("6e4a26")
var WALL_COLOR := Color("4a4560")
var REACH_COLOR := Color("2a4cff")

var map: Dictionary
var tile_meshes := {}   # Vector2i -> MeshInstance3D (floor/door)
var wall_meshes := {}   # Vector2i -> MeshInstance3D
var _highlighted: Array[Vector2i] = []
var exit_portal: MeshInstance3D

static func world_from_tile(x: int, y: int) -> Vector3:
	return Vector3(x * Data.TILE + Data.TILE * 0.5, 0.0, y * Data.TILE + Data.TILE * 0.5)

func build(_map: Dictionary) -> void:
	map = _map
	var tile_mesh := BoxMesh.new()
	tile_mesh.size = Vector3(Data.TILE * 0.97, 0.12, Data.TILE * 0.97)
	var wall_mesh := BoxMesh.new()
	wall_mesh.size = Vector3(Data.TILE, Data.WALL_H, Data.TILE)
	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = WALL_COLOR
	wall_mat.roughness = 0.95

	for y in map.h:
		for x in map.w:
			var t: int = map.type[Grid.idx(map, x, y)]
			var pos := world_from_tile(x, y)
			if t == Data.FLOOR or t == Data.DOOR:
				var mat := StandardMaterial3D.new()
				mat.albedo_color = DOOR_COLOR if t == Data.DOOR else FLOOR_COLOR
				mat.roughness = 0.9
				var mi := MeshInstance3D.new()
				mi.mesh = tile_mesh
				mi.material_override = mat
				mi.position = pos
				mi.visible = false
				add_child(mi)
				tile_meshes[Vector2i(x, y)] = mi
			elif _wall_borders_floor(x, y):
				var mi := MeshInstance3D.new()
				mi.mesh = wall_mesh
				mi.material_override = wall_mat
				mi.position = Vector3(pos.x, Data.WALL_H * 0.5, pos.z)
				mi.visible = false
				add_child(mi)
				wall_meshes[Vector2i(x, y)] = mi

	# Glowing exit portal.
	var portal_mesh := CylinderMesh.new()
	portal_mesh.top_radius = Data.TILE * 0.32
	portal_mesh.bottom_radius = Data.TILE * 0.4
	portal_mesh.height = 0.06
	var portal_mat := StandardMaterial3D.new()
	portal_mat.albedo_color = Color("2fe0c0")
	portal_mat.emission_enabled = true
	portal_mat.emission = Color("1fb89a")
	portal_mat.emission_energy_multiplier = 1.4
	exit_portal = MeshInstance3D.new()
	exit_portal.mesh = portal_mesh
	exit_portal.material_override = portal_mat
	exit_portal.position = world_from_tile(map.exit.x, map.exit.y) + Vector3(0, 0.12, 0)
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
