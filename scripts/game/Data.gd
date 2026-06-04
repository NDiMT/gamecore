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
