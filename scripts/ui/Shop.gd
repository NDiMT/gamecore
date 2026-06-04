extends Control
## Between-quests armoury. Shows the local hero's gold and gear, a catalogue to
## buy from, and (for the host) a button to begin the next quest.

signal buy_requested(item_id: String)
signal continue_requested

var _is_host := false
var _box: VBoxContainer

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	visible = false
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(460, 0)
	center.add_child(panel)
	var margin := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + s, 22)
	panel.add_child(margin)
	_box = VBoxContainer.new()
	_box.add_theme_constant_override("separation", 8)
	margin.add_child(_box)

func show_shop(shop: Dictionary, my_id: int, is_host: bool) -> void:
	_is_host = is_host
	visible = true
	for c in _box.get_children():
		c.queue_free()

	var me = null
	for p in shop.players:
		if p.id == my_id:
			me = p
			break

	var done: bool = shop.get("done", false)
	_title("🏆 Campaign Complete!" if done else "Quest cleared!", 26, Color("e6b450"))
	if done:
		_label("Your party has conquered the dungeon. Well done!", Color("e8e2d4"))
		return

	_label("Spend your gold, then the host begins: %s" % shop.get("next_title", "the next quest"), Color("9b93b0"))
	if me != null:
		_label("%s — gold: %d" % [me.name, me.gold], Color("e6b450"))
		_label("Carried: " + _gear_names(me.equipment), Color("9b93b0"))

	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	_box.add_child(grid)
	for item in Data.EQUIPMENT:
		if item.cost <= 0:
			continue
		var b := Button.new()
		var bonus: String = ("+%d Atk" % item.atk) if item.atk > 0 else (("+%d Def" % item["def"]) if item["def"] > 0 else String(item.name))
		b.text = "%s — %dg (%s)" % [item.name, item.cost, bonus]
		b.custom_minimum_size = Vector2(210, 44)
		b.disabled = me == null or me.gold < item.cost
		var iid: String = item.id
		b.pressed.connect(func(): buy_requested.emit(iid))
		grid.add_child(b)

	if is_host:
		var cont := Button.new()
		cont.text = "Begin: %s" % shop.get("next_title", "Next Quest")
		cont.custom_minimum_size = Vector2(0, 50)
		cont.pressed.connect(func(): continue_requested.emit())
		_box.add_child(cont)
	else:
		_label("Waiting for the host to start the next quest…", Color("9b93b0"))

func _gear_names(ids: Array) -> String:
	var names: Array = []
	for id in ids:
		for item in Data.EQUIPMENT:
			if item.id == id:
				names.append(item.name)
	return ", ".join(names) if names.size() > 0 else "—"

func _title(text: String, size: int, col: Color) -> void:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	_box.add_child(l)

func _label(text: String, col: Color) -> void:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_color_override("font_color", col)
	_box.add_child(l)
