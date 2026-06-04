extends Control
## Lobby screen: create or join a room (host IP + port), pick a hero, and see
## the connected party. Emits intent signals that Main turns into actions.

signal host_requested(name: String)
signal join_requested(ip: String, name: String)
signal pick_requested(cls: String, groups: Array)
signal start_requested

var _is_host := false
var _my_cls := ""
var _my_groups: Array = []
var _group_buttons := {}
var _group_hint: Label
var _players_label: Label
var _status_label: Label
var _class_buttons := {}
var _start_button: Button
var _name_edit: LineEdit

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_home()

func _clear() -> void:
	for c in get_children():
		c.queue_free()

func _panel() -> VBoxContainer:
	# Centered panel returning the VBox to fill with widgets.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(420, 0)
	center.add_child(panel)
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	panel.add_child(margin)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	margin.add_child(vbox)
	return vbox

func _title(vbox: VBoxContainer, text: String, size := 28) -> void:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color("e6b450"))
	vbox.add_child(l)

func _build_home() -> void:
	_clear()
	var v := _panel()
	_title(v, "GameCore")
	var sub := Label.new()
	sub.text = "Co-op HeroQuest · up to 4 heroes over ENet"
	sub.add_theme_color_override("font_color", Color("9b93b0"))
	v.add_child(sub)

	_name_edit = LineEdit.new()
	_name_edit.placeholder_text = "Your name"
	_name_edit.max_length = 14
	v.add_child(_name_edit)

	var host_btn := Button.new()
	host_btn.text = "Host a game"
	host_btn.pressed.connect(func(): host_requested.emit(_name()))
	v.add_child(host_btn)

	var sep := HSeparator.new()
	v.add_child(sep)

	var ip_edit := LineEdit.new()
	ip_edit.placeholder_text = "Host IP (e.g. 127.0.0.1)"
	ip_edit.text = "127.0.0.1"
	v.add_child(ip_edit)

	var join_btn := Button.new()
	join_btn.text = "Join game"
	join_btn.pressed.connect(func(): join_requested.emit(ip_edit.text.strip_edges(), _name()))
	v.add_child(join_btn)

	_status_label = Label.new()
	_status_label.add_theme_color_override("font_color", Color("9b93b0"))
	v.add_child(_status_label)

func _name() -> String:
	var n := _name_edit.text.strip_edges()
	return n if n != "" else "Adventurer"

func show_room(is_host: bool, info: String) -> void:
	_is_host = is_host
	_clear()
	var v := _panel()
	_title(v, "Lobby", 24)
	var sub := Label.new()
	sub.text = info
	sub.add_theme_color_override("font_color", Color("9b93b0"))
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(sub)

	_title(v, "Choose your hero", 16)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	v.add_child(grid)
	_class_buttons.clear()
	for id in Data.HERO_ORDER:
		var c: Dictionary = Data.HERO_CLASSES[id]
		var b := Button.new()
		b.text = "%s\n%s" % [c.name, c.blurb]
		b.toggle_mode = true
		b.custom_minimum_size = Vector2(180, 48)
		b.pressed.connect(func(): _on_pick(id))
		grid.add_child(b)
		_class_buttons[id] = b

	# Spell groups (only for casters; Wizard picks 3, Elf picks 1).
	_group_hint = Label.new()
	_group_hint.add_theme_color_override("font_color", Color("9b93b0"))
	v.add_child(_group_hint)
	var ggrid := GridContainer.new()
	ggrid.columns = 2
	ggrid.add_theme_constant_override("h_separation", 8)
	ggrid.add_theme_constant_override("v_separation", 8)
	v.add_child(ggrid)
	_group_buttons.clear()
	for gid in Data.SPELL_GROUP_ORDER:
		var gb := Button.new()
		gb.text = Data.SPELL_GROUPS[gid].name
		gb.toggle_mode = true
		gb.custom_minimum_size = Vector2(180, 40)
		gb.pressed.connect(func(): _on_group_toggle(gid))
		ggrid.add_child(gb)
		_group_buttons[gid] = gb
	_refresh_group_ui()

	_title(v, "Party", 16)
	_players_label = Label.new()
	_players_label.add_theme_color_override("font_color", Color("e8e2d4"))
	v.add_child(_players_label)

	if is_host:
		_start_button = Button.new()
		_start_button.text = "Begin the quest"
		_start_button.disabled = true
		_start_button.pressed.connect(func(): start_requested.emit())
		v.add_child(_start_button)

	_status_label = Label.new()
	_status_label.add_theme_color_override("font_color", Color("9b93b0"))
	_status_label.text = "Waiting…"
	v.add_child(_status_label)

func _on_pick(cls: String) -> void:
	_my_cls = cls
	_my_groups = _default_groups(cls)
	_refresh_group_ui()
	_emit_pick()

func _default_groups(cls: String) -> Array:
	match cls:
		"wizard": return ["fire", "water", "earth"]
		"elf": return ["air"]
		_: return []

func _group_cap() -> int:
	match _my_cls:
		"wizard": return 3
		"elf": return 1
		_: return 0

func _on_group_toggle(gid: String) -> void:
	var cap := _group_cap()
	if cap > 0:
		if _my_groups.has(gid):
			_my_groups.erase(gid)
		elif _my_groups.size() < cap:
			_my_groups.append(gid)
	_refresh_group_ui()
	_emit_pick()

func _refresh_group_ui() -> void:
	var cap := _group_cap()
	if _group_hint != null:
		_group_hint.text = "Spell groups: Wizard/Elf only" if cap == 0 else "Spell groups — choose %d (%d selected)" % [cap, _my_groups.size()]
	for gid in _group_buttons:
		var b: Button = _group_buttons[gid]
		b.disabled = cap == 0
		b.button_pressed = _my_groups.has(gid)

func _emit_pick() -> void:
	if _my_cls != "":
		pick_requested.emit(_my_cls, _my_groups)

func set_players(players: Array, my_id: int) -> void:
	if _players_label == null:
		return
	var lines := []
	var taken := {}
	for p in players:
		var cls_name: String = Data.HERO_CLASSES[p.cls].name if p.cls != null and p.cls != "" else "—"
		var you := " (you)" if p.id == my_id else ""
		lines.append("%s — %s%s" % [p.name, cls_name, you])
		if p.id != my_id and p.cls != null and p.cls != "":
			taken[p.cls] = true
	_players_label.text = "\n".join(lines)

	for id in _class_buttons:
		var b: Button = _class_buttons[id]
		b.disabled = taken.has(id)
		b.button_pressed = (id == _my_cls)

	if _start_button != null:
		var everyone_picked := players.size() >= 1
		for p in players:
			if p.cls == null or p.cls == "":
				everyone_picked = false
		_start_button.disabled = not everyone_picked

func set_status(text: String, _err := false) -> void:
	if _status_label != null:
		_status_label.text = text
