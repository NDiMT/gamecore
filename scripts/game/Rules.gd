class_name Rules
## HeroQuest dice. The combat die has six faces: 3 skull, 2 white shield,
## 1 black shield. Only the host rolls, via a RandomNumberGenerator.

const FACES := ["skull", "skull", "skull", "white", "white", "black"]

static func roll_combat_die(rng: RandomNumberGenerator) -> String:
	return FACES[rng.randi_range(0, 5)]

static func roll_movement(rng: RandomNumberGenerator) -> int:
	return rng.randi_range(1, 6) + rng.randi_range(1, 6)

## Resolve one attack. The defender blocks with white shields if the attacker
## is a hero (a monster defending), or black shields otherwise.
## Returns { atk:Array, def:Array, skulls:int, shields:int, damage:int }.
static func resolve_attack(rng: RandomNumberGenerator, attack_dice: int, defend_dice: int, attacker_is_hero: bool) -> Dictionary:
	var atk: Array[String] = []
	for i in attack_dice:
		atk.append(roll_combat_die(rng))
	var def: Array[String] = []
	for i in defend_dice:
		def.append(roll_combat_die(rng))

	var skulls := 0
	for f in atk:
		if f == "skull":
			skulls += 1
	var block_face := "black" if attacker_is_hero else "white"
	var shields := 0
	for f in def:
		if f == block_face:
			shields += 1

	return {"atk": atk, "def": def, "skulls": skulls, "shields": shields, "damage": max(0, skulls - shields)}
