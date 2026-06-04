extends Node
func _ready() -> void:
	for trial in 25:
		var rng := RandomNumberGenerator.new()
		rng.seed = 1000 + trial
		var t0 := Time.get_ticks_msec()
		var gen := MapGen.generate(rng)
		var dt := Time.get_ticks_msec() - t0
		print("trial %d: %d ms, rooms=%d spawns=%d" % [trial, dt, gen.map.rooms.size(), gen.monster_spawns.size()])
	print("GEN DONE")
	get_tree().quit()
