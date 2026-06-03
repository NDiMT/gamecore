extends Node
## Headless logic smoke test. Run with:
##   godot --headless --path . res://tests/Test.tscn
## Generates dungeons, drives full games and exercises spells/search, then quits.

func _ready() -> void:
	_test_mapgen()
	_test_full_game()
	_test_spells_and_search()
	print("ALL TESTS PASSED")
	get_tree().quit()

func _test_mapgen() -> void:
	for trial in 25:
		var rng := RandomNumberGenerator.new()
		rng.seed = 1000 + trial
		var gen := MapGen.generate(rng)
		assert(gen.start_tiles.size() > 0, "no start tiles, trial %d" % trial)
		var seen := Grid.bfs(gen.map, gen.map.start, Grid.HUGE, {})
		for s in gen.monster_spawns:
			assert(seen.has(Vector2i(s.x, s.y)), "monster unreachable, trial %d" % trial)
		assert(seen.has(gen.map.exit), "exit unreachable, trial %d" % trial)
	print("MapGen: 25 trials connected OK")

func _test_full_game() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var gen := MapGen.generate(rng)
	var gs := GameState.new(gen.map, rng)
	gs.start([
		{"id": 1, "name": "Conan", "cls": "barbarian"},
		{"id": 2, "name": "Gimli", "cls": "dwarf"},
	], gen.start_tiles, gen.monster_spawns)
	print("Started: heroes=%d monsters=%d" % [gs.state.heroes.size(), gs.state.monsters.size()])

	var guard := 0
	while gs.state.phase == "playing" and guard < 400:
		guard += 1
		var hero = gs.active_hero()
		var peer: int = hero.owner
		var blocked := gs.occupancy(hero.id)
		var reach := Grid.bfs(gen.map, Vector2i(hero.x, hero.y), gs.state.turn.movePoints, blocked)
		var best := Vector2i(-1, -1)
		var best_d := -1
		for k in reach:
			if reach[k].dist > best_d:
				best_d = reach[k].dist
				best = k
		if best != Vector2i(-1, -1):
			gs.move_hero(peer, hero.id, best.x, best.y)
		for m in gs.state.monsters:
			if m.alive and abs(m.x - hero.x) + abs(m.y - hero.y) == 1:
				gs.attack(peer, hero.id, m.id)
				break
		gs.end_turn(peer, hero.id)
	print("Full game ended: phase=%s after %d hero-turns, log=%d" % [gs.state.phase, guard, gs.state.log.size()])
	assert(gs.state.phase in ["won", "lost"], "game did not terminate")

func _test_spells_and_search() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 3
	var gen := MapGen.generate(rng)
	var gs := GameState.new(gen.map, rng)
	gs.start([{"id": 1, "name": "Merlin", "cls": "wizard"}], gen.start_tiles, gen.monster_spawns)
	var wiz = gs.state.heroes[0]

	assert(gs.search(1, wiz.id), "search should succeed in start room")
	assert(wiz.gold > 0, "search should grant gold")
	assert(not gs.search(1, wiz.id), "second search same room should fail")

	# Heal: damage then cast heal on self.
	wiz.body = 1
	gs.state.turn.acted = false
	assert(gs.cast_spell(1, wiz.id, "heal", wiz.id), "heal should succeed")
	assert(wiz.body == wiz.maxBody, "heal should cap at maxBody")

	# Fireball a revealed monster.
	var mon = gs.state.monsters[0]
	if not gs.state.revealedRooms.has(gs.room_at(mon.x, mon.y)):
		gs.state.revealedRooms.append(gs.room_at(mon.x, mon.y))
	gs.state.turn.acted = false
	assert(gs.cast_spell(1, wiz.id, "fireball", mon.id), "fireball should succeed")

	# Ownership guard: a different peer can't act.
	assert(not gs.search(2, wiz.id), "wrong owner must be rejected")
	print("Spells/search/ownership OK")
