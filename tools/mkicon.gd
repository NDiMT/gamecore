extends SceneTree
## One-off: rasterise icon.svg into a PNG for the boot splash and launcher icon.
## Run: godot --headless --script res://tools/mkicon.gd

func _init() -> void:
	var tex := load("res://icon.svg") as Texture2D
	var img := tex.get_image()
	img.resize(512, 512, Image.INTERPOLATE_LANCZOS)
	img.save_png("res://icon.png")
	print("wrote res://icon.png (%dx%d)" % [img.get_width(), img.get_height()])
	quit()
