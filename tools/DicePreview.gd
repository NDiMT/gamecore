extends Node
const DiceScript := preload("res://scripts/ui/DiceOverlay.gd")
var _ov
func _ready() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var bg := ColorRect.new()
	bg.color = Color("0b0913")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(bg)
	_ov = DiceScript.new()
	layer.add_child(_ov)
	await get_tree().process_frame
	_ov.enqueue({"kind": "move", "attacker": "Barbarian", "dice": [4, 3], "total": 7})
	await get_tree().create_timer(1.5).timeout
	await _shoot("res://dice_move_preview.png")
	_ov.enqueue({"attacker": "Barbarian", "target": "Orc", "atk": ["skull", "skull", "white"], "def": ["black"], "damage": 2})
	await get_tree().create_timer(1.5).timeout
	await _shoot("res://dice_combat_preview.png")
	get_tree().quit()
func _shoot(path: String) -> void:
	for i in 4:
		await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(ProjectSettings.globalize_path(path))
	print("SAVED ", path)
