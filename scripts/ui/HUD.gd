extends Control
## In-game HUD: a turn bar (top-left) with all hero actions, and a party panel
## (top-right) of hero health chips. The parent ignores the mouse so 3D clicks
## pass through; only the panels capture input.

signal end_pressed(hero_id: String)
signal search_pressed(hero_id: String)
signal drink_pressed(hero_id: String)
signal spell_pressed(hero_id: String, spell_id: String)

var map: Dictionary
var _phase_label: Label
var _active_label: Label
var _move_label: Label
var _hint_label: Label
var _actions: HBoxContainer
var _party_box: VBoxContainer

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false

	var turn_panel := PanelContainer.new()
	turn_panel.position = Vector2(12, 12)
	turn_panel.custom_minimum_size = Vector2(280, 0)
	add_child(turn_panel)
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 12)
	turn_panel.add_child(margin)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	margin.add_child(v)

	_phase_label = _mk_label(v, Color("9b93b0"), 12)
	_active_label = _mk_label(v, Color("e6b450"), 20)
	_move_label = _mk_label(v, Color("e8e2d4"), 13)
	_actions = HBoxContainer.new()
	_actions.add_theme_constant_override("separation", 6)
	v.add_child(_actions)
	_hint_label = _mk_label(v, Color("9b93b0"), 12)
	_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint_label.custom_minimum_size = Vector2(256, 0)

	var party_panel := PanelContainer.new()
	party_panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	party_panel.position = Vector2(-252, 12)
	party_panel.custom_minimum_size = Vector2(240, 0)
	add_child(party_panel)
	_party_box = VBoxContainer.new()
	_party_box.add_theme_constant_override("separation", 6)
	party_panel.add_child(_party_box)

func _mk_label(parent: Control, col: Color, size: int) -> Label:
	var l := Label.new()
	l.add_theme_color_override("font_color", col)
	l.add_theme_font_size_override("font_size", size)
	parent.add_child(l)
	return l

func update_view(snap: Dictionary, my_id: int, ui: Dictionary) -> void:
	var t: Dictionary = snap.turn
	var active = null
	for h in snap.heroes:
		if h.id == t.order[t.idx]:
			active = h
			break
	var my_turn: bool = snap.phase == "playing" and active != null and active.owner == my_id

	var phase_label := "Hero phase"
	if snap.phase == "won":
		phase_label = "Victory"
	elif snap.phase == "lost":
		phase_label = "Defeat"
	_phase_label.text = phase_label
	_active_label.text = active.name if active != null else "—"
	_move_label.text = ("Movement left: %d%s" % [t.movePoints, "  · acted" if t.acted else ""]) if snap.phase == "playing" else ""

	var pending = ui.get("pending_spell")
	if pending != null:
		var tgt := "hero" if pending.kind == "heal" else "monster"
		_hint_label.text = "Casting %s — click a %s (End turn to cancel)" % [pending.name, tgt]
	elif my_turn:
		_hint_label.text = "Click a glowing tile to move · click a monster to attack"
	elif active != null:
		_hint_label.text = "Waiting for %s…" % active.name
	else:
		_hint_label.text = ""

	_rebuild_actions(snap, active, my_turn, pending)
	_rebuild_party(snap, my_id, t)

func _rebuild_actions(snap: Dictionary, active, my_turn: bool, pending) -> void:
	for c in _actions.get_children():
		c.queue_free()
	var end := Button.new()
	end.text = "End turn"
	end.disabled = not my_turn
	if active != null:
		end.pressed.connect(func(): end_pressed.emit(active.id))
	_actions.add_child(end)
	if not my_turn or active == null:
		return

	var acted: bool = snap.turn.acted
	if not map.is_empty():
		var room: int = map.room[Grid.idx(map, active.x, active.y)]
		var searchable: bool = room >= 0 and not snap.roomSearched.has(room)
		var sb := Button.new()
		sb.text = "Search"
		sb.disabled = acted or not searchable
		sb.pressed.connect(func(): search_pressed.emit(active.id))
		_actions.add_child(sb)

	if active.potions > 0:
		var db := Button.new()
		db.text = "Drink (%d)" % active.potions
		db.disabled = active.body >= active.maxBody
		db.pressed.connect(func(): drink_pressed.emit(active.id))
		_actions.add_child(db)

	for s in active.spells:
		var b := Button.new()
		b.text = "%s (%d)" % [s.name, s.charges]
		b.disabled = acted or s.charges <= 0
		b.toggle_mode = true
		b.button_pressed = pending != null and pending.id == s.id
		var sid: String = s.id
		b.pressed.connect(func(): spell_pressed.emit(active.id, sid))
		_actions.add_child(b)

func _rebuild_party(snap: Dictionary, my_id: int, t: Dictionary) -> void:
	for c in _party_box.get_children():
		c.queue_free()
	for h in snap.heroes:
		var row := VBoxContainer.new()
		var name_l := Label.new()
		var you := "  [you]" if h.owner == my_id else ""
		var active_mark := "▸ " if h.id == t.order[t.idx] else ""
		name_l.text = "%s%s%s" % [active_mark, h.name, you]
		name_l.add_theme_color_override("font_color", Color("e6b450") if h.alive else Color("6b6478"))
		row.add_child(name_l)
		var bar := ProgressBar.new()
		bar.max_value = h.maxBody
		bar.value = h.body
		bar.custom_minimum_size = Vector2(220, 8)
		bar.show_percentage = false
		row.add_child(bar)
		var stat := Label.new()
		var extras := ""
		if h.gold > 0:
			extras += "  ◆%d" % h.gold
		if h.potions > 0:
			extras += "  ⚗%d" % h.potions
		stat.text = "Body %d/%d · Atk %d · Def %d%s" % [h.body, h.maxBody, h.attack, h.defend, extras]
		stat.add_theme_color_override("font_color", Color("9b93b0"))
		stat.add_theme_font_size_override("font_size", 11)
		row.add_child(stat)
		_party_box.add_child(row)
