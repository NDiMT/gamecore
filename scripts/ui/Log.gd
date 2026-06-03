extends Control
## Scrolling event log (bottom-left), rendering combat rolls as coloured dice.

var _label: RichTextLabel

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	panel.position = Vector2(12, -200)
	panel.custom_minimum_size = Vector2(380, 188)
	add_child(panel)
	_label = RichTextLabel.new()
	_label.bbcode_enabled = true
	_label.scroll_following = true
	_label.fit_content = false
	_label.custom_minimum_size = Vector2(360, 172)
	panel.add_child(_label)

func update_view(snap: Dictionary) -> void:
	var lines := []
	var entries: Array = snap.log
	var start: int = max(0, entries.size() - 16)
	for i in range(start, entries.size()):
		var e: Dictionary = entries[i]
		if e.kind == "dice":
			lines.append("%s  %s [color=#9b93b0]vs[/color] %s" % [_escape(e.text), _dice(e.atk), _dice(e.def)])
		else:
			lines.append("[color=%s]%s[/color]" % [_color_for(e.kind), _escape(e.text)])
	_label.text = "\n".join(lines)

func _color_for(kind: String) -> String:
	match kind:
		"hit": return "#e06464"
		"good": return "#6fcf6f"
		"sys": return "#e6b450"
		_: return "#9b93b0"

func _dice(faces) -> String:
	var out := ""
	for f in faces:
		match f:
			"skull": out += "[color=#ff7676]☠[/color]"
			"white": out += "[color=#e8e2d4]◇[/color]"
			_: out += "[color=#7a7490]◆[/color]"
	return out

func _escape(s: String) -> String:
	return s.replace("[", "(").replace("]", ")")
