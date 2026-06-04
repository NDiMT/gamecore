class_name MonsterAI
## The scripted "Zargon". On the GM phase every revealed, living monster
## advances toward the nearest hero and attacks if it reaches melee range.
## Mutates the GameState in place and appends to its log.

static func run(gs: GameState) -> void:
	for m in gs.state.monsters:
		if not m.alive:
			continue
		if not gs.is_revealed(m.x, m.y):
			continue  # unseen monsters stay dormant

		var heroes := gs.alive_heroes()
		if heroes.is_empty():
			return

		var target = _adjacent_hero(gs, m)
		if target == null:
			var blocked := gs._blocked_set(m.id)
			var seen := Grid.bfs(gs.map, Vector2i(m.x, m.y), Grid.HUGE, blocked)
			var best_tile := Vector2i(-1, -1)
			var best_dist := Grid.HUGE
			for hero in heroes:
				for d in Grid.DIRS:
					var n := Vector2i(hero.x + d.x, hero.y + d.y)
					if seen.has(n) and seen[n].dist < best_dist:
						best_dist = seen[n].dist
						best_tile = n
			if best_tile != Vector2i(-1, -1):
				var path := Grid.reconstruct(seen, best_tile)
				var steps: int = min(m.move, path.size())
				if steps > 0:
					var dest: Vector2i = path[steps - 1]
					m.x = dest.x
					m.y = dest.y
			target = _adjacent_hero(gs, m)

		if target != null:
			var def_dice: int = target.defend + target.get("shield", 0)
			var r := Rules.resolve_attack(gs.rng, m.attack, def_dice, false)
			gs.record_roll(m.name, target.name, r)
			gs.log_dice("%s attacks %s" % [m.name, target.name], r)
			if r.damage > 0:
				target.body -= r.damage
				gs.log_line("%s takes %d damage" % [target.name, r.damage], "hit")
				if target.body <= 0:
					target.body = 0
					target.alive = false
					gs.log_line("%s has fallen!" % target.name, "hit")
			else:
				gs.log_line("%s blocks the blow" % target.name, "good")

static func _adjacent_hero(gs: GameState, m: Dictionary):
	for h in gs.alive_heroes():
		if Grid.is_adjacent(h.x, h.y, m.x, m.y):
			return h
	return null
