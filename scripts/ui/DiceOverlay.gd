extends Control
## Animated combat-dice overlay. When a new roll arrives in the snapshot it
## shows who attacks whom, tumbles the attack and defend dice, then settles on
## the real faces and prints the damage. Pure 2D so the dice are always big and
## readable on a phone. Combat die faces: skull (hit), white shield (hero
## block), black shield (monster block).

const ROLL_TIME := 0.55
const HOLD_TIME := 1.6

var _panel: PanelContainer
var _title: Label
var _atk_row: HBoxContainer
var _def_row: HBoxContainer
var _result: Label

var _atk_dice: Array = []
var _def_dice: Array = []
var _final_atk: Array = []
var _final_def: Array = []
var _rolling := false
var _t := 0.0
var _gen := 0
var _pending_damage := 0

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_TOP_WIDE)
	center.offset_top = 64
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	_panel = PanelContainer.new()
	center.add_child(_panel)
	var margin := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + s, 16)
	_panel.add_child(margin)
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 8)
	margin.add_child(v)

	_title = _mk_label(v, 20, Color("e8e2d4"))
	_atk_row = _mk_dice_row(v, "Attack")
	_def_row = _mk_dice_row(v, "Defend")
	_result = _mk_label(v, 26, Color("e6b450"))

func _mk_label(parent: Control, size: int, col: Color) -> Label:
	var l := Label.new()
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	parent.add_child(l)
	return l

func _mk_dice_row(parent: Control, label: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 6)
	var tag := Label.new()
	tag.text = label
	tag.custom_minimum_size = Vector2(86, 0)
	tag.add_theme_color_override("font_color", Color("9b93b0"))
	row.add_child(tag)
	parent.add_child(row)
	return row

func _make_die() -> Label:
	var d := Label.new()
	d.custom_minimum_size = Vector2(46, 46)
	d.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	d.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	d.add_theme_font_size_override("font_size", 26)
	return d

func _rebuild(row: HBoxContainer, count: int) -> Array:
	# Clear previous dice (keep the leading tag label).
	for i in range(row.get_child_count() - 1, 0, -1):
		row.get_child(i).queue_free()
	var dice: Array = []
	for i in count:
		var d := _make_die()
		row.add_child(d)
		dice.append(d)
	return dice

func _face_glyph(face: String) -> String:
	match face:
		"skull": return "☠"   # ☠
		"white": return "◇"   # ◇
		_: return "◆"          # ◆ black shield

func _set_face(die: Label, face: String) -> void:
	die.text = _face_glyph(face)
	var bg := StyleBoxFlat.new()
	bg.corner_radius_top_left = 8
	bg.corner_radius_top_right = 8
	bg.corner_radius_bottom_left = 8
	bg.corner_radius_bottom_right = 8
	match face:
		"skull":
			bg.bg_color = Color("3a1414")
			die.add_theme_color_override("font_color", Color("ff7676"))
		"white":
			bg.bg_color = Color("e8e2d4")
			die.add_theme_color_override("font_color", Color("1a1326"))
		_:
			bg.bg_color = Color("15102a")
			die.add_theme_color_override("font_color", Color("9b93b0"))
	die.add_theme_stylebox_override("normal", bg)

func play(roll: Dictionary) -> void:
	_gen += 1
	_final_atk = roll.get("atk", [])
	_final_def = roll.get("def", [])
	_pending_damage = roll.get("damage", 0)
	_title.text = "%s  ⚔  %s" % [roll.get("attacker", "?"), roll.get("target", "?")]
	_result.text = ""
	_atk_dice = _rebuild(_atk_row, _final_atk.size())
	_def_dice = _rebuild(_def_row, _final_def.size())
	_rolling = true
	_t = 0.0
	visible = true

func _process(delta: float) -> void:
	if not _rolling:
		return
	_t += delta
	if _t < ROLL_TIME:
		var faces := ["skull", "white", "black"]
		for d in _atk_dice:
			_set_face(d, faces[randi() % 3])
		for d in _def_dice:
			_set_face(d, faces[randi() % 3])
	else:
		for i in _atk_dice.size():
			_set_face(_atk_dice[i], _final_atk[i])
		for i in _def_dice.size():
			_set_face(_def_dice[i], _final_def[i])
		if _pending_damage > 0:
			_result.text = "%d damage!" % _pending_damage
			_result.add_theme_color_override("font_color", Color("e06464"))
		else:
			_result.text = "Blocked!"
			_result.add_theme_color_override("font_color", Color("6fcf6f"))
		_rolling = false
		var my_gen := _gen
		get_tree().create_timer(HOLD_TIME).timeout.connect(func():
			if my_gen == _gen:
				visible = false)
