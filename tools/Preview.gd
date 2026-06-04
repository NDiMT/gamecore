extends Node3D
## Offscreen preview: builds a sample dungeon (no networking), reveals it, and
## saves a screenshot to res://preview.png so we can actually see how the game
## looks. Run under a virtual display:
##   xvfb-run -a godot --rendering-method gl_compatibility \
##     --rendering-driver opengl3 --path . res://tools/Preview.tscn

const BoardScript := preload("res://scripts/render/Board3D.gd")
const TokensScript := preload("res://scripts/render/Tokens.gd")

func _ready() -> void:
	# Environment + lights (mirror Main's look).
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("0b0913")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("5a5478")
	env.ambient_light_energy = 0.85
	env.glow_enabled = true
	env.glow_intensity = 0.9
	env.glow_bloom = 0.2
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var key := DirectionalLight3D.new()
	key.light_color = Color("ffe9c0")
	key.light_energy = 1.4
	key.rotation_degrees = Vector3(-58, -42, 0)
	key.shadow_enabled = true
	add_child(key)
	var fill := OmniLight3D.new()
	fill.light_color = Color("8aa0ff")
	fill.light_energy = 1.2
	fill.omni_range = 60
	fill.position = Vector3(12, 16, 9)
	add_child(fill)

	# Sample game.
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var gen := MapGen.generate(rng, {"pool": ["goblin", "orc", "skeleton"], "boss": "gargoyle", "density": [2, 3]})
	var gs := GameState.new(gen.map, rng)
	gs.start([
		{"id": 1, "name": "Barb", "cls": "barbarian"},
		{"id": 2, "name": "Dwarf", "cls": "dwarf"},
		{"id": 3, "name": "Elf", "cls": "elf"},
		{"id": 4, "name": "Wiz", "cls": "wizard"},
	], gen)
	# Reveal everything for the screenshot.
	var rooms := {}
	for i in gen.map.room.size():
		if gen.map.room[i] >= 0:
			rooms[gen.map.room[i]] = true
	gs.state.revealedRooms = rooms.keys()
	for y in gen.map.h:
		for x in gen.map.w:
			if Grid.is_walkable(gen.map, x, y) and gen.map.room[Grid.idx(gen.map, x, y)] == -1:
				gs.state.revealedCorridor[Vector2i(x, y)] = true
	for tr in gs.state.traps:
		tr.found = true

	var board := BoardScript.new()
	add_child(board)
	board.build(gen.map)
	var tokens := TokensScript.new()
	add_child(tokens)
	tokens.setup(gen.map)
	board.update_fog(gs.state)
	board.update_traps(gs.state)
	tokens.sync(gs.state)

	# Angled, mostly top-down orthographic camera framing the whole board.
	var cx: float = gen.map.w * 0.5
	var cz: float = gen.map.h * 0.5
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = float(gen.map.w) * 0.62 + 2.0
	cam.position = Vector3(cx, 24, cz + 13)
	cam.rotation_degrees = Vector3(-60, 0, 0)
	cam.current = true
	add_child(cam)

	await _shoot()

func _shoot() -> void:
	for i in 8:
		await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var path := ProjectSettings.globalize_path("res://preview.png")
	img.save_png(path)
	print("PREVIEW_SAVED ", path, " ", img.get_width(), "x", img.get_height())
	get_tree().quit()
