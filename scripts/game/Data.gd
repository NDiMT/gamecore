extends Node
## Autoloaded singleton holding game-wide constants and the static data tables
## (hero classes, monsters, spellbooks). Accessed globally as `Data`.

# ---- Grid / world tuning ----------------------------------------------------
const TILE := 1.0          # world units per grid square
const WALL_H := 1.1        # wall height in world units
const MAP_W := 24
const MAP_H := 18
const MAX_PLAYERS := 4
const CORRIDOR_SIGHT := 3  # corridor reveal radius around a hero
const PORT := 8910

# Tile types stored in map.type.
const WALL := 0
const FLOOR := 1
const DOOR := 2

# ---- Heroes -----------------------------------------------------------------
# attack/defend = number of combat dice; body = hit points; mind = willpower.
# Colours make these runtime vars (Color(hex) isn't a const expression).
var HERO_CLASSES := {
	"barbarian": {"name": "Barbarian", "color": Color("d14b3a"), "attack": 3, "defend": 2, "body": 8, "mind": 2, "blurb": "Body 8 · Atk 3"},
	"dwarf": {"name": "Dwarf", "color": Color("c9962f"), "attack": 2, "defend": 2, "body": 7, "mind": 3, "blurb": "Body 7 · Atk 2"},
	"elf": {"name": "Elf", "color": Color("4caf6f"), "attack": 2, "defend": 2, "body": 6, "mind": 4, "blurb": "Body 6 · Atk 2"},
	"wizard": {"name": "Wizard", "color": Color("6a7bd6"), "attack": 1, "defend": 2, "body": 4, "mind": 6, "blurb": "Body 4 · Atk 1"},
}
const HERO_ORDER := ["barbarian", "dwarf", "elf", "wizard"]

# ---- Monsters ---------------------------------------------------------------
# Canonical HeroQuest-style stat lines (Move / Attack dice / Defend dice / Body
# / Mind). Heroes block with white shields, monsters with black shields.
var MONSTERS := {
	"goblin": {"name": "Goblin", "color": Color("5b7d3a"), "attack": 2, "defend": 1, "body": 1, "mind": 1, "move": 10, "boss": false},
	"orc": {"name": "Orc", "color": Color("7a5a30"), "attack": 3, "defend": 2, "body": 1, "mind": 2, "move": 8, "boss": false},
	"fimir": {"name": "Fimir", "color": Color("4f6b66"), "attack": 3, "defend": 3, "body": 2, "mind": 3, "move": 6, "boss": false},
	"skeleton": {"name": "Skeleton", "color": Color("cdc9bd"), "attack": 2, "defend": 2, "body": 1, "mind": 0, "move": 6, "boss": false},
	"zombie": {"name": "Zombie", "color": Color("6b7a4f"), "attack": 2, "defend": 3, "body": 1, "mind": 0, "move": 4, "boss": false},
	"mummy": {"name": "Mummy", "color": Color("b3a98a"), "attack": 3, "defend": 4, "body": 2, "mind": 0, "move": 4, "boss": false},
	"chaos_warrior": {"name": "Chaos Warrior", "color": Color("6a2f3a"), "attack": 4, "defend": 4, "body": 3, "mind": 3, "move": 6, "boss": true},
	"gargoyle": {"name": "Gargoyle", "color": Color("4a4458"), "attack": 4, "defend": 5, "body": 3, "mind": 4, "move": 6, "boss": true},
}
const FODDER := ["goblin", "goblin", "orc", "skeleton", "zombie"]

# ---- Treasure deck ----------------------------------------------------------
# Weighted outcomes when a hero searches a room for treasure. Original content.
const TREASURE := [
	{"kind": "gold", "min": 10, "max": 35, "weight": 5},
	{"kind": "gold", "min": 40, "max": 90, "weight": 2},
	{"kind": "potion", "weight": 3},
	{"kind": "nothing", "weight": 3},
	{"kind": "hazard", "damage": 1, "weight": 2},
	{"kind": "wander", "weight": 2},
]

# ---- Equipment (bought between quests with gold) ----------------------------
# `atk`/`def` are bonus combat dice; `slot` allows one weapon + one armour.
const EQUIPMENT := [
	{"id": "shortsword", "name": "Shortsword", "cost": 0, "atk": 1, "def": 0, "slot": "weapon"},
	{"id": "broadsword", "name": "Broadsword", "cost": 250, "atk": 2, "def": 0, "slot": "weapon"},
	{"id": "battleaxe", "name": "Battle Axe", "cost": 450, "atk": 3, "def": 0, "slot": "weapon"},
	{"id": "crossbow", "name": "Crossbow", "cost": 350, "atk": 2, "def": 0, "slot": "weapon"},
	{"id": "shield", "name": "Shield", "cost": 150, "atk": 0, "def": 1, "slot": "armour"},
	{"id": "helmet", "name": "Helmet", "cost": 125, "atk": 0, "def": 1, "slot": "armour"},
	{"id": "chainmail", "name": "Chain Mail", "cost": 500, "atk": 0, "def": 2, "slot": "armour"},
	{"id": "toolkit", "name": "Tool Kit", "cost": 250, "atk": 0, "def": 0, "slot": "tool"},
]

# ---- Spell groups -----------------------------------------------------------
# Four elemental groups, three spells each. Casters pick groups at the start.
# kind: damage (no defence roll) / heal / shield (bonus defend dice next turn) /
# rage (bonus attack dice this turn). Original spell names.
var SPELL_GROUPS := {
	"fire": {
		"name": "Fire",
		"spells": [
			{"id": "fire_bolt", "name": "Fire Bolt", "kind": "damage", "power": 3},
			{"id": "flame_wall", "name": "Wall of Flame", "kind": "damage", "power": 2},
			{"id": "inner_fire", "name": "Inner Fire", "kind": "rage", "power": 2},
		],
	},
	"water": {
		"name": "Water",
		"spells": [
			{"id": "mend", "name": "Mending Tide", "kind": "heal", "power": 4},
			{"id": "frost", "name": "Frost Spear", "kind": "damage", "power": 2},
			{"id": "calm", "name": "Calm", "kind": "heal", "power": 2},
		],
	},
	"earth": {
		"name": "Earth",
		"spells": [
			{"id": "stone_skin", "name": "Stone Skin", "kind": "shield", "power": 2},
			{"id": "rock_fall", "name": "Rockfall", "kind": "damage", "power": 2},
			{"id": "heal_earth", "name": "Earthmend", "kind": "heal", "power": 3},
		],
	},
	"air": {
		"name": "Air",
		"spells": [
			{"id": "gust", "name": "Gust", "kind": "damage", "power": 2},
			{"id": "swift", "name": "Swiftness", "kind": "rage", "power": 1},
			{"id": "ward", "name": "Wind Ward", "kind": "shield", "power": 2},
		],
	},
}
const SPELL_GROUP_ORDER := ["fire", "water", "earth", "air"]

# Build a hero's spell list from chosen group ids, each spell gets 1 charge.
func spells_from_groups(group_ids: Array) -> Array:
	var out: Array = []
	for gid in group_ids:
		if not SPELL_GROUPS.has(gid):
			continue
		for s in SPELL_GROUPS[gid].spells:
			var spell: Dictionary = s.duplicate(true)
			spell["charges"] = 1
			out.append(spell)
	return out

# Trap kinds and their damage.
const TRAPS := {
	"pit": {"name": "Pit Trap", "damage": 1},
	"spear": {"name": "Spear Trap", "damage": 1},
}

# ---- Spellbooks -------------------------------------------------------------
# Returns a fresh, independent copy so each hero owns its own charges.
func spellbook_for(cls: String) -> Array:
	var books := {
		"wizard": [
			{"id": "fireball", "name": "Ball of Flame", "kind": "damage", "power": 3, "charges": 2},
			{"id": "frost", "name": "Frost Shard", "kind": "damage", "power": 2, "charges": 1},
			{"id": "heal", "name": "Heal Body", "kind": "heal", "power": 4, "charges": 2},
		],
		"elf": [
			{"id": "gust", "name": "Gust of Wind", "kind": "damage", "power": 2, "charges": 1},
			{"id": "heal", "name": "Heal Body", "kind": "heal", "power": 2, "charges": 1},
		],
	}
	if books.has(cls):
		return books[cls].duplicate(true)
	return []
