class_name GameState
extends RefCounted
## Authoritative game model. The host owns the only mutating instance; clients
## hold a render-only snapshot. All randomness lives here behind `rng`, so only
## the host ever rolls dice. Heroes and monsters are plain Dictionaries with
## integer `x`/`y`; the whole `state` Dictionary is what gets sent to clients.

var map: Dictionary
var rng: RandomNumberGenerator
var state: Dictionary

func _init(_map: Dictionary, _rng: RandomNumberGenerator) -> void:
	map = _map
	rng = _rng

# ---- Host construction ------------------------------------------------------
## `players` = [{ id, name, cls, groups:Array, equipment:Array }]
## `gen` = { start_tiles, monster_spawns, traps, secret_doors }
func start(players: Array, gen: Dictionary) -> Dictionary:
	var start_tiles: Array = gen.start_tiles
	var monster_spawns: Array = gen.monster_spawns
	var heroes: Array = []
	for i in players.size():
		var p = players[i]
		var cls: Dictionary = Data.HERO_CLASSES[p.cls]
		var tile: Vector2i = start_tiles[i % start_tiles.size()]
		var groups: Array = p.get("groups", _default_groups(p.cls))
		var equip: Array = p.get("equipment", ["shortsword"])
		var hero := {
			"id": "h%d" % i, "owner": p.id, "cls": p.cls,
			"name": p.name if p.name != "" else cls.name, "color": cls.color,
			"x": tile.x, "y": tile.y,
			"body": cls.body, "maxBody": cls.body, "mind": cls.mind,
			"base_attack": cls.attack, "base_defend": cls.defend,
			"attack": cls.attack, "defend": cls.defend, "alive": true,
			"gold": p.get("gold", 0), "potions": 0, "equipment": equip.duplicate(),
			"spells": Data.spells_from_groups(groups), "shield": 0, "rage_pending": 0,
		}
		_recompute_stats(hero)
		heroes.append(hero)
	var monsters: Array = []
	for i in monster_spawns.size():
		var s = monster_spawns[i]
		var def: Dictionary = Data.MONSTERS[s.type]
		monsters.append({
			"id": "m%d" % i, "type": s.type, "name": def.name, "color": def.color,
			"boss": def.boss, "x": s.x, "y": s.y,
			"body": def.body, "maxBody": def.body, "mind": def.mind,
			"attack": def.attack, "defend": def.defend, "move": def.move, "alive": true,
		})

	var order: Array = []
	for hh in heroes:
		order.append(hh.id)
	state = {
		"phase": "playing", "heroes": heroes, "monsters": monsters,
		"turn": {"order": order, "idx": 0, "movePoints": 0, "acted": false, "phase": "hero", "rage": 0},
		"revealedRooms": [], "revealedCorridor": {}, "roomSearched": [],
		"nextMonsterId": monsters.size(), "log": [],
		"rollSeq": 0, "rolls": [],
		"traps": gen.get("traps", []), "secret": gen.get("secret_doors", []),
	}
	reveal_around()
	begin_hero_turn(0)
	return state

func _default_groups(cls: String) -> Array:
	match cls:
		"wizard": return ["fire", "water", "earth"]
		"elf": return ["air"]
		_: return []

# Effective combat dice = base class dice + equipment bonuses.
func _recompute_stats(hero: Dictionary) -> void:
	var atk: int = hero.base_attack
	var df: int = hero.base_defend
	for id in hero.equipment:
		for item in Data.EQUIPMENT:
			if item.id == id:
				atk += item["atk"]
				df += item["def"]
	hero.attack = atk
	hero.defend = df

# ---- Lookups ----------------------------------------------------------------
func hero_by_id(id: String):
	for h in state.heroes:
		if h.id == id:
			return h
	return null

func monster_by_id(id: String):
	for m in state.monsters:
		if m.id == id:
			return m
	return null

func alive_heroes() -> Array:
	return state.heroes.filter(func(h): return h.alive)

func active_hero():
	return hero_by_id(state.turn.order[state.turn.idx])

func room_at(x: int, y: int) -> int:
	return map.room[Grid.idx(map, x, y)]

func is_revealed(x: int, y: int) -> bool:
	var r := room_at(x, y)
	if r >= 0:
		return state.revealedRooms.has(r)
	return state.revealedCorridor.has(Vector2i(x, y))

## Tiles occupied by living tokens (Dictionary used as a set). `except_id` ""
## means none excluded.
func occupancy(except_id: String) -> Dictionary:
	var set := {}
	for h in state.heroes:
		if h.alive and h.id != except_id:
			set[Vector2i(h.x, h.y)] = true
	for m in state.monsters:
		if m.alive and m.id != except_id:
			set[Vector2i(m.x, m.y)] = true
	return set

# ---- Fog of war -------------------------------------------------------------
func reveal_around() -> void:
	for h in alive_heroes():
		var r := room_at(h.x, h.y)
		if r >= 0 and not state.revealedRooms.has(r):
			state.revealedRooms.append(r)
		for dy in range(-Data.CORRIDOR_SIGHT, Data.CORRIDOR_SIGHT + 1):
			for dx in range(-Data.CORRIDOR_SIGHT, Data.CORRIDOR_SIGHT + 1):
				var x: int = h.x + dx
				var y: int = h.y + dy
				if Grid.chebyshev(Vector2i(h.x, h.y), Vector2i(x, y)) > Data.CORRIDOR_SIGHT:
					continue
				if not Grid.is_walkable(map, x, y):
					continue
				if room_at(x, y) == -1:
					state.revealedCorridor[Vector2i(x, y)] = true

# ---- Logging ----------------------------------------------------------------
func log_line(text: String, kind: String = "") -> void:
	state.log.append({"text": text, "kind": kind})
	if state.log.size() > 60:
		state.log.pop_front()

func log_dice(text: String, r: Dictionary) -> void:
	state.log.append({"text": text, "kind": "dice", "atk": r.atk, "def": r.def})
	if state.log.size() > 60:
		state.log.pop_front()

# ---- Turn flow --------------------------------------------------------------
func begin_hero_turn(i: int) -> void:
	var t: Dictionary = state.turn
	t.idx = i
	t.phase = "hero"
	t.acted = false
	t.movePoints = Rules.roll_movement(rng)
	var hero = active_hero()
	t.rage = hero.get("rage_pending", 0)   # attack buff cast last turn
	hero.rage_pending = 0
	hero.shield = 0                          # defence buff lasted through the GM turn
	log_line("%s's turn — moves %d" % [hero.name, t.movePoints], "sys")

func advance_turn() -> void:
	var order: Array = state.turn.order
	for i in range(state.turn.idx + 1, order.size()):
		var h = hero_by_id(order[i])
		if h and h.alive:
			begin_hero_turn(i)
			return
	# Round complete: the GM acts, then a fresh round begins.
	run_gm_turn()
	if state.phase != "playing":
		return
	for i in order.size():
		var h = hero_by_id(order[i])
		if h and h.alive:
			begin_hero_turn(i)
			return
	state.phase = "lost"

func run_gm_turn() -> void:
	state.turn.phase = "gm"
	log_line("— Zargon commands the monsters —", "sys")
	MonsterAI.run(self)
	if alive_heroes().is_empty():
		state.phase = "lost"
		log_line("The whole party has perished. Defeat.", "hit")

# ---- Intent handlers (validated). Return true if state changed. -------------
func can_control(peer_id: int, hero_id: String) -> bool:
	var hero = active_hero()
	return state.phase == "playing" and state.turn.phase == "hero" \
		and hero != null and hero.alive and hero.id == hero_id and hero.owner == peer_id

func move_hero(peer_id: int, hero_id: String, x: int, y: int) -> bool:
	if not can_control(peer_id, hero_id):
		return false
	var hero = active_hero()
	var blocked := _blocked_set(hero.id)
	var target := Vector2i(x, y)
	if not Grid.is_walkable(map, x, y) or blocked.has(target):
		return false
	var seen := Grid.bfs(map, Vector2i(hero.x, hero.y), state.turn.movePoints, blocked)
	if not seen.has(target) or seen[target].dist == 0:
		return false
	# Walk the path; an undiscovered trap stops the hero where it springs.
	var path := Grid.reconstruct(seen, target)
	var steps := 0
	var sprung := false
	for tile in path:
		hero.x = tile.x
		hero.y = tile.y
		steps += 1
		var tr = _trap_at(tile.x, tile.y)
		if tr != null and not tr.found:
			_spring_trap(tr, hero)
			sprung = true
			break
	state.turn.movePoints -= steps
	if sprung:
		state.turn.movePoints = 0
	reveal_around()
	if hero.alive and not sprung and Vector2i(hero.x, hero.y) == map.exit:
		state.phase = "won"
		log_line("%s reaches the stairs. Victory!" % hero.name, "good")
	return true

func attack(peer_id: int, hero_id: String, target_id: String) -> bool:
	if not can_control(peer_id, hero_id) or state.turn.acted:
		return false
	var hero = active_hero()
	var target = monster_by_id(target_id)
	if target == null or not target.alive:
		return false
	if not Grid.is_adjacent(hero.x, hero.y, target.x, target.y):
		return false
	var bonus: int = state.turn.get("rage", 0)
	var r := Rules.resolve_attack(rng, hero.attack + bonus, target.defend, true)
	state.turn.rage = 0
	state.turn.acted = true
	state.turn.movePoints = 0  # beginning the action phase forfeits movement
	record_roll(hero.name, target.name, r)
	log_dice("%s attacks %s" % [hero.name, target.name], r)
	_damage_monster(target, r.damage, "%s shrugs it off" % target.name if r.damage == 0 else "")
	return true

# Stash the latest combat roll so every client can animate the dice.
func record_roll(attacker_name: String, target_name: String, r: Dictionary) -> void:
	state.rollSeq += 1
	state.rolls.append({
		"seq": state.rollSeq, "attacker": attacker_name, "target": target_name,
		"atk": r.atk, "def": r.def, "damage": r.damage,
	})
	while state.rolls.size() > 16:
		state.rolls.pop_front()

func cast_spell(peer_id: int, hero_id: String, spell_id: String, target_id: String) -> bool:
	if not can_control(peer_id, hero_id) or state.turn.acted:
		return false
	var hero = active_hero()
	var spell = null
	for s in hero.spells:
		if s.id == spell_id:
			spell = s
			break
	if spell == null or spell.charges <= 0:
		return false

	if spell.kind == "damage":
		var target = monster_by_id(target_id)
		if target == null or not target.alive or not is_revealed(target.x, target.y):
			return false
		spell.charges -= 1
		state.turn.acted = true
		state.turn.movePoints = 0
		log_line("%s casts %s at %s for %d" % [hero.name, spell.name, target.name, spell.power], "good")
		_damage_monster(target, spell.power, "")
		return true

	if spell.kind == "heal":
		var target = hero_by_id(target_id)
		if target == null or not target.alive:
			return false
		spell.charges -= 1
		state.turn.acted = true
		state.turn.movePoints = 0
		var healed: int = min(spell.power, target.maxBody - target.body)
		target.body += healed
		log_line("%s casts %s on %s (+%d body)" % [hero.name, spell.name, target.name, healed], "good")
		return true

	if spell.kind == "shield":
		spell.charges -= 1
		state.turn.acted = true
		state.turn.movePoints = 0
		hero.shield += spell.power
		log_line("%s casts %s (+%d defend until next turn)" % [hero.name, spell.name, spell.power], "good")
		return true

	if spell.kind == "rage":
		spell.charges -= 1
		state.turn.acted = true
		state.turn.movePoints = 0
		hero.rage_pending += spell.power
		log_line("%s casts %s (+%d attack next turn)" % [hero.name, spell.name, spell.power], "good")
		return true
	return false

func search(peer_id: int, hero_id: String) -> bool:
	if not can_control(peer_id, hero_id) or state.turn.acted:
		return false
	var hero = active_hero()
	var room := room_at(hero.x, hero.y)
	if room < 0 or state.roomSearched.has(room):
		return false
	# You may not search while a monster shares the room (line of sight).
	for m in state.monsters:
		if m.alive and room_at(m.x, m.y) == room:
			log_line("%s cannot search — a monster is watching." % hero.name, "hit")
			return false
	state.roomSearched.append(room)
	state.turn.acted = true
	state.turn.movePoints = 0

	# Reveal nearby hidden traps.
	for tr in state.traps:
		if not tr.found and Grid.chebyshev(Vector2i(hero.x, hero.y), Vector2i(tr.x, tr.y)) <= 5:
			tr.found = true
			log_line("%s spots a %s!" % [hero.name, Data.TRAPS[tr.kind].name], "sys")
	# Reveal secret doors bordering this room (host opens them in its map copy).
	for sd in state.secret:
		if sd.found:
			continue
		for d in Grid.DIRS:
			if room_at(sd.x + d.x, sd.y + d.y) == room:
				sd.found = true
				map.type[Grid.idx(map, sd.x, sd.y)] = Data.DOOR
				log_line("%s discovers a secret door!" % hero.name, "sys")
				break
	# Draw treasure.
	_draw_treasure(hero)
	return true

# Weighted draw from the treasure table.
func _draw_treasure(hero: Dictionary) -> void:
	var total := 0
	for o in Data.TREASURE:
		total += o.weight
	var roll := rng.randf() * total
	var pick = Data.TREASURE[0]
	for o in Data.TREASURE:
		roll -= o.weight
		if roll <= 0:
			pick = o
			break
	match pick.kind:
		"gold":
			var g := rng.randi_range(pick.min, pick.max)
			hero.gold += g
			log_line("%s finds %d gold!" % [hero.name, g], "good")
		"potion":
			hero.potions += 1
			log_line("%s finds a healing potion!" % hero.name, "good")
		"hazard":
			hero.body -= pick.damage
			log_line("%s triggers a hidden hazard (-%d body)!" % [hero.name, pick.damage], "hit")
			_check_hero_death(hero)
		"wander":
			var spot := _free_adjacent(hero.x, hero.y)
			if spot != Vector2i(-1, -1):
				_spawn_monster("goblin", spot.x, spot.y)
				log_line("A wandering Goblin appears!", "hit")
			else:
				log_line("%s finds nothing." % hero.name, "")
		_:
			log_line("%s finds nothing of value." % hero.name, "")

func _check_hero_death(hero: Dictionary) -> void:
	if hero.body <= 0:
		hero.body = 0
		hero.alive = false
		log_line("%s has fallen!" % hero.name, "hit")
		if alive_heroes().is_empty():
			state.phase = "lost"
			log_line("The whole party has perished. Defeat.", "hit")

# Disarm an adjacent, discovered trap (costs the action).
func disarm(peer_id: int, hero_id: String) -> bool:
	if not can_control(peer_id, hero_id) or state.turn.acted:
		return false
	var hero = active_hero()
	for tr in state.traps:
		if tr.found and not tr.sprung and not tr.get("disarmed", false) and Grid.is_adjacent(hero.x, hero.y, tr.x, tr.y):
			tr["disarmed"] = true
			state.turn.acted = true
			state.turn.movePoints = 0
			log_line("%s disarms the %s." % [hero.name, Data.TRAPS[tr.kind].name], "good")
			return true
	return false

func _trap_at(x: int, y: int):
	for tr in state.traps:
		if tr.x == x and tr.y == y and not tr.sprung and not tr.get("disarmed", false):
			return tr
	return null

func _spring_trap(tr: Dictionary, hero: Dictionary) -> void:
	tr.sprung = true
	tr.found = true
	var dmg: int = Data.TRAPS[tr.kind].damage
	hero.body -= dmg
	log_line("%s springs a %s (-%d body)!" % [hero.name, Data.TRAPS[tr.kind].name, dmg], "hit")
	_check_hero_death(hero)

# Occupancy plus discovered (still-armed) traps, which block pathing.
func _blocked_set(except_id: String) -> Dictionary:
	var s := occupancy(except_id)
	for tr in state.traps:
		if tr.found and not tr.sprung and not tr.get("disarmed", false):
			s[Vector2i(tr.x, tr.y)] = true
	return s

func drink_potion(peer_id: int, hero_id: String) -> bool:
	# A free action — does not consume the turn's main action.
	if not can_control(peer_id, hero_id):
		return false
	var hero = active_hero()
	if hero.potions <= 0 or hero.body >= hero.maxBody:
		return false
	hero.potions -= 1
	var healed: int = min(4, hero.maxBody - hero.body)
	hero.body += healed
	log_line("%s drinks a potion (+%d body)" % [hero.name, healed], "good")
	return true

func end_turn(peer_id: int, hero_id: String) -> bool:
	if not can_control(peer_id, hero_id):
		return false
	advance_turn()
	return true

# ---- Shared helpers ---------------------------------------------------------
func _damage_monster(target: Dictionary, damage: int, miss_msg: String) -> void:
	if damage > 0:
		target.body -= damage
		log_line("%s takes %d damage" % [target.name, damage], "good")
		if target.body <= 0:
			target.alive = false
			log_line("%s is slain!" % target.name, "good")
	elif miss_msg != "":
		log_line(miss_msg, "hit")

func _spawn_monster(type: String, x: int, y: int) -> String:
	var def: Dictionary = Data.MONSTERS[type]
	var id := "m%d" % state.nextMonsterId
	state.nextMonsterId += 1
	state.monsters.append({
		"id": id, "type": type, "name": def.name, "color": def.color, "boss": def.boss,
		"x": x, "y": y, "body": def.body, "maxBody": def.body, "mind": def.mind,
		"attack": def.attack, "defend": def.defend, "move": def.move, "alive": true,
	})
	return id

func _free_adjacent(x: int, y: int) -> Vector2i:
	var occ := occupancy("")
	for d in Grid.DIRS:
		var n := Vector2i(x + d.x, y + d.y)
		if Grid.is_walkable(map, n.x, n.y) and not occ.has(n):
			return n
	return Vector2i(-1, -1)

# ---- Serialization ----------------------------------------------------------
func snapshot() -> Dictionary:
	return state
