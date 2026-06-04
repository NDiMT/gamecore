extends Node3D
## Manages hero and monster figures: creates/updates/removes them from
## snapshots, hides monsters still behind fog, and marks the active hero.

var map: Dictionary
var _tokens := {}   # id -> { node:Node3D, target:Vector3 }
var _active_ring: MeshInstance3D

func setup(_map: Dictionary) -> void:
	map = _map
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.36
	ring_mesh.outer_radius = 0.46
	var ring_mat := StandardMaterial3D.new()
	ring_mat.albedo_color = Color("e6b450")
	ring_mat.emission_enabled = true
	ring_mat.emission = Color("e6b450")
	ring_mat.emission_energy_multiplier = 0.9
	_active_ring = MeshInstance3D.new()
	_active_ring.mesh = ring_mesh
	_active_ring.material_override = ring_mat
	_active_ring.visible = false
	add_child(_active_ring)

func _process(delta: float) -> void:
	var k := clampf(delta * 12.0, 0.0, 1.0)
	for entry in _tokens.values():
		entry.node.position = entry.node.position.lerp(entry.target, k)
	if _active_ring.visible:
		_active_ring.rotate_y(delta * 1.5)

func sync(snap: Dictionary) -> void:
	var seen := {}

	for hero in snap.heroes:
		if not hero.alive:
			continue
		seen[hero.id] = true
		_ensure(hero.id, func(): return _build_hero(hero))
		_tokens[hero.id].target = Board3D.world_from_tile(hero.x, hero.y)

	for m in snap.monsters:
		if not m.alive or not Vis.tile_revealed(map, snap, m.x, m.y):
			continue
		seen[m.id] = true
		_ensure(m.id, func(): return _build_monster(m))
		_tokens[m.id].target = Board3D.world_from_tile(m.x, m.y)

	for id in _tokens.keys():
		if not seen.has(id):
			_tokens[id].node.queue_free()
			_tokens.erase(id)

	# Active-hero marker.
	var t: Dictionary = snap.turn
	var active = null
	for h in snap.heroes:
		if h.id == t.order[t.idx]:
			active = h
			break
	if active != null and active.alive and snap.phase == "playing":
		_active_ring.position = Board3D.world_from_tile(active.x, active.y) + Vector3(0, 0.16, 0)
		_active_ring.visible = true
	else:
		_active_ring.visible = false

func _ensure(id: String, builder: Callable) -> void:
	if _tokens.has(id):
		return
	var node: Node3D = builder.call()
	add_child(node)
	node.position = node.position  # keep wherever placed; lerp handles motion
	_tokens[id] = {"node": node, "target": node.position}

func _build_hero(hero: Dictionary) -> Node3D:
	var g := Node3D.new()
	g.add_child(_disk(Color("12101c")))
	# Glowing base ring in the class colour — instantly identifies each hero.
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.33
	tm.outer_radius = 0.46
	ring.mesh = tm
	ring.material_override = _mat(hero.color, hero.color, 1.4)
	ring.position = Vector3(0, 0.06, 0)
	g.add_child(ring)
	var body := MeshInstance3D.new()
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.25
	capsule.height = 0.86
	body.mesh = capsule
	body.material_override = _mat(hero.color.lightened(0.12))
	body.material_override.metallic = 0.2
	body.position = Vector3(0, 0.62, 0)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	g.add_child(body)
	var head := MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = 0.18
	sph.height = 0.36
	head.mesh = sph
	head.material_override = _mat(Color("e8c9a0"))
	head.position = Vector3(0, 1.08, 0)
	g.add_child(head)
	g.position = Board3D.world_from_tile(hero.x, hero.y)
	return g

func _build_monster(m: Dictionary) -> Node3D:
	var g := Node3D.new()
	var scale: float = 1.5 if m.boss else 1.0
	g.add_child(_disk(Color("0e0a16")))
	var body := MeshInstance3D.new()
	if m.boss:
		var sph := SphereMesh.new()
		sph.radius = 0.44
		sph.height = 0.9
		body.mesh = sph
		body.position = Vector3(0, 0.66, 0)
		body.material_override = _mat(m.color, Color("ff3a22"), 0.7)
	else:
		var cone := CylinderMesh.new()
		cone.top_radius = 0.0
		cone.bottom_radius = 0.32
		cone.height = 0.82
		body.mesh = cone
		body.position = Vector3(0, 0.54, 0)
		body.material_override = _mat(m.color, m.color, 0.12)
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	g.add_child(body)
	# Glowing eyes give monsters a readable, menacing front.
	var eye_col := Color("ff5a3c") if m.boss else Color("ffd24a")
	var eye_y: float = 0.74 if m.boss else 0.64
	for sx in [-0.1, 0.1]:
		var e := MeshInstance3D.new()
		var es := SphereMesh.new()
		es.radius = 0.055
		es.height = 0.11
		e.mesh = es
		e.material_override = _mat(eye_col, eye_col, 4.0)
		e.position = Vector3(sx, eye_y, 0.2)
		g.add_child(e)
	g.scale = Vector3(scale, scale, scale)
	g.position = Board3D.world_from_tile(m.x, m.y)
	return g

func _disk(col: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.36
	cyl.bottom_radius = 0.4
	cyl.height = 0.08
	mi.mesh = cyl
	mi.material_override = _mat(col)
	mi.position = Vector3(0, 0.1, 0)
	return mi

func _mat(col: Color, emissive_col := Color.BLACK, energy := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.55
	if energy > 0.0:
		m.emission_enabled = true
		m.emission = emissive_col
		m.emission_energy_multiplier = energy
	return m
