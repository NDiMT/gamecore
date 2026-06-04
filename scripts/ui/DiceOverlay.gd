extends Control
## Tabletop dice roller. Combat rolls are queued and played one at a time so
## every attack is visible. Each roll tumbles real 3D dice in a small viewport,
## then they settle and the result is spelled out. Slower, board-game pacing.
##
## Die colours: red = skull (a hit), white = white shield, dark = black shield.
## Heroes block with white shields, monsters with black shields.

const ROLL_TIME := 1.1   # tumbling
const SETTLE_TIME := 0.3 # easing flat
const HOLD_TIME := 1.5   # showing the result

var _vp: SubViewport
var _dice_root: Node3D
var _title: Label
var _result: Label
var _legend: Label

var _skull_tex: ImageTexture
var _shield_tex: ImageTexture
var _queue: Array = []
var _phase := 0          # 0 idle, 1 rolling, 2 settling, 3 holding
var _t := 0.0
var _dice: Array = []    # [{ node, spin:Vector3 }]
var _cur: Dictionary = {}

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_TOP_WIDE)
	center.offset_top = 56
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	var panel := PanelContainer.new()
	center.add_child(panel)
	var margin := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + s, 12)
	panel.add_child(margin)
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 4)
	margin.add_child(v)

	_title = Label.new()
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title.add_theme_font_size_override("font_size", 22)
	_title.add_theme_color_override("font_color", Color("e8e2d4"))
	v.add_child(_title)

	var vpc := SubViewportContainer.new()
	vpc.stretch = true
	vpc.custom_minimum_size = Vector2(520, 190)
	vpc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(vpc)
	_vp = SubViewport.new()
	_vp.transparent_bg = true
	_vp.size = Vector2i(520, 190)
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vpc.add_child(_vp)

	var cam := Camera3D.new()
	cam.fov = 38
	cam.look_at_from_position(Vector3(0, 2.6, 3.1), Vector3.ZERO, Vector3.UP)
	_vp.add_child(cam)
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-55, -25, 0)
	key.light_energy = 1.3
	_vp.add_child(key)
	_vp.add_child(_mk_ambient())
	_dice_root = Node3D.new()
	_vp.add_child(_dice_root)

	_result = Label.new()
	_result.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result.add_theme_font_size_override("font_size", 24)
	_result.add_theme_color_override("font_color", Color("e6b450"))
	v.add_child(_result)

	var legend := Label.new()
	legend.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	legend.text = "red = skull (hit)   ·   white/black = shield (block)"
	legend.add_theme_font_size_override("font_size", 12)
	legend.add_theme_color_override("font_color", Color("9b93b0"))
	v.add_child(legend)
	_legend = legend

func _mk_ambient() -> WorldEnvironment:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("6a6480")
	e.ambient_light_energy = 0.9
	env.environment = e
	return env

func enqueue(roll: Dictionary) -> void:
	_queue.append(roll)
	if _phase == 0:
		_advance()

func _advance() -> void:
	if _queue.is_empty():
		_phase = 0
		var t := get_tree().create_timer(0.2)
		t.timeout.connect(func(): if _phase == 0: visible = false)
		return
	_cur = _queue.pop_front()
	_start_roll(_cur)

func _start_roll(roll: Dictionary) -> void:
	visible = true
	_result.text = ""
	for c in _dice_root.get_children():
		c.queue_free()
	_dice.clear()

	var is_move: bool = roll.get("kind", "combat") == "move"
	_legend.visible = not is_move
	if is_move:
		_title.text = "%s rolls to move" % roll.get("attacker", "?")
		var dvals: Array = roll.get("dice", [1, 1])
		var spacing := 0.7
		var x := -(dvals.size() - 1) * spacing * 0.5
		for v in dvals:
			_add_move_die(int(v), x)
			x += spacing
	else:
		_title.text = "%s  vs  %s" % [roll.get("attacker", "?"), roll.get("target", "?")]
		var atk: Array = roll.get("atk", [])
		var dfn: Array = roll.get("def", [])
		var total := atk.size() + dfn.size()
		var spacing := 0.66
		var gap := 0.5 if dfn.size() > 0 else 0.0
		var width := (total - 1) * spacing + gap
		var x := -width * 0.5
		for i in atk.size():
			_add_die(atk[i], x, true)
			x += spacing
		x += gap
		for i in dfn.size():
			_add_die(dfn[i], x, false)
			x += spacing

	_phase = 1
	_t = 0.0

func _add_die(face: String, x: float, _is_attack: bool) -> void:
	var node := Node3D.new()
	var cube := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.5, 0.5, 0.5)
	cube.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.roughness = 0.4
	match face:
		"skull":
			mat.albedo_color = Color("c0392b")
			mat.emission_enabled = true
			mat.emission = Color("ff5a3c")
			mat.emission_energy_multiplier = 0.25
		"white":
			mat.albedo_color = Color("e8e2d4")
		_:
			mat.albedo_color = Color("2a2438")
	cube.material_override = mat
	node.add_child(cube)
	# Billboard symbol (skull / shield), revealed once the die settles.
	var spr := Sprite3D.new()
	spr.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	spr.pixel_size = 0.011
	spr.no_depth_test = true
	if face == "skull":
		spr.texture = _skull()
		spr.modulate = Color("f2ece0")
	elif face == "white":
		spr.texture = _shield()
		spr.modulate = Color("f2ece0")
	else:
		spr.texture = _shield()
		spr.modulate = Color("9a93a8")
	spr.position = Vector3(0, 0.5, 0)   # float above the die, not inside it
	spr.visible = false
	node.add_child(spr)
	node.position = Vector3(x, 0, 0)
	node.rotation = Vector3(randf() * TAU, randf() * TAU, randf() * TAU)
	_dice_root.add_child(node)
	var spin := Vector3(randf_range(6, 12), randf_range(6, 12), randf_range(6, 12))
	_dice.append({"node": node, "spin": spin, "label": spr})

func _add_move_die(value: int, x: float) -> void:
	var node := Node3D.new()
	var cube := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.55, 0.55, 0.55)
	cube.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("efe9dc")
	mat.roughness = 0.5
	cube.material_override = mat
	node.add_child(cube)
	# Billboarded number so the rolled value is always readable.
	var lbl := Label3D.new()
	lbl.text = str(value)
	lbl.font_size = 140
	lbl.pixel_size = 0.004
	lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lbl.modulate = Color("1a1326")
	lbl.outline_modulate = Color("efe9dc")
	lbl.outline_size = 16
	lbl.position = Vector3(0, 0.55, 0)
	lbl.visible = false
	node.add_child(lbl)
	node.position = Vector3(x, 0, 0)
	node.rotation = Vector3(randf() * TAU, randf() * TAU, randf() * TAU)
	_dice_root.add_child(node)
	_dice.append({"node": node, "spin": Vector3(randf_range(6, 12), randf_range(6, 12), randf_range(6, 12)), "label": lbl})

func _process(delta: float) -> void:
	if _phase == 0:
		return
	_t += delta
	if _phase == 1:
		var bob := sin(_t * 18.0) * 0.12
		for d in _dice:
			d.node.rotation += d.spin * delta
			d.node.position.y = absf(bob)
		if _t >= ROLL_TIME:
			_phase = 2
			_t = 0.0
			_show_result()
	elif _phase == 2:
		var k := clampf(_t / SETTLE_TIME, 0.0, 1.0)
		for d in _dice:
			d.node.rotation = d.node.rotation.lerp(Vector3.ZERO, k)
			d.node.position.y = lerpf(d.node.position.y, 0.0, k)
		if _t >= SETTLE_TIME:
			_phase = 3
			_t = 0.0
	elif _phase == 3:
		if _t >= HOLD_TIME:
			_advance()

func _show_result() -> void:
	# Reveal any numeric labels (movement dice) now that they've settled.
	for d in _dice:
		if d.has("label"):
			d.label.visible = true
	if _cur.get("kind", "combat") == "move":
		var dvals: Array = _cur.get("dice", [])
		var parts: Array = []
		for v in dvals:
			parts.append(str(v))
		_result.text = "Move %d  (%s)" % [_cur.get("total", 0), " + ".join(parts)]
		_result.add_theme_color_override("font_color", Color("e6b450"))
		return
	var skulls := 0
	for f in _cur.get("atk", []):
		if f == "skull":
			skulls += 1
	var dmg: int = _cur.get("damage", 0)
	if dmg > 0:
		_result.text = "%d skulls → %d damage!" % [skulls, dmg]
		_result.add_theme_color_override("font_color", Color("e06464"))
	else:
		_result.text = "Blocked!"
		_result.add_theme_color_override("font_color", Color("6fcf6f"))

# ---- Procedurally drawn dice symbols ----------------------------------------
func _skull() -> ImageTexture:
	if _skull_tex == null:
		_skull_tex = _make_skull()
	return _skull_tex

func _shield() -> ImageTexture:
	if _shield_tex == null:
		_shield_tex = _make_shield()
	return _shield_tex

func _make_skull() -> ImageTexture:
	var n := 48
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var white := Color("ffffff")
	var dark := Color("17121f")
	_disc(img, n * 0.5, n * 0.40, n * 0.30, white)            # cranium
	_rect(img, int(n * 0.34), int(n * 0.55), int(n * 0.32), int(n * 0.22), white)  # jaw
	_disc(img, n * 0.39, n * 0.42, n * 0.085, dark)           # eye
	_disc(img, n * 0.61, n * 0.42, n * 0.085, dark)           # eye
	_disc(img, n * 0.5, n * 0.53, n * 0.045, dark)            # nose
	for tx in [0.42, 0.5, 0.58]:                               # teeth gaps
		_rect(img, int(n * tx), int(n * 0.6), 1, int(n * 0.16), dark)
	return ImageTexture.create_from_image(img)

func _make_shield() -> ImageTexture:
	var n := 48
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var col := Color("ffffff")
	var cx := n * 0.5
	var top := n * 0.13
	var span := n * 0.80
	for y in range(int(top), int(top + span)):
		var ty := (y - top) / span               # 0..1 down the shield
		var half := n * 0.33
		if ty > 0.5:
			half = n * 0.33 * (1.0 - (ty - 0.5) / 0.5)  # taper to a point
		for x in range(int(cx - half), int(cx + half) + 1):
			if x >= 0 and x < n:
				img.set_pixel(x, y, col)
	return ImageTexture.create_from_image(img)

func _disc(img: Image, cx: float, cy: float, r: float, col: Color) -> void:
	var r2 := r * r
	for y in range(int(cy - r), int(cy + r) + 1):
		for x in range(int(cx - r), int(cx + r) + 1):
			if x >= 0 and x < img.get_width() and y >= 0 and y < img.get_height():
				var dx := x - cx
				var dy := y - cy
				if dx * dx + dy * dy <= r2:
					img.set_pixel(x, y, col)

func _rect(img: Image, x: int, y: int, w: int, h: int, col: Color) -> void:
	for yy in range(y, y + h):
		for xx in range(x, x + w):
			if xx >= 0 and xx < img.get_width() and yy >= 0 and yy < img.get_height():
				img.set_pixel(xx, yy, col)
