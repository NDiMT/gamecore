class_name Quests
## A short authored campaign. Each quest uses a fixed seed (so its layout is
## stable and "designed" rather than random) plus a theme spec that drives the
## generator's monster roster, boss and density. Original content.

const CAMPAIGN := [
	{
		"title": "The Goblin Warren",
		"intro": "Goblins infest these tunnels. Cut a path to the stairs.",
		"seed": 101,
		"spec": {"pool": ["goblin", "goblin", "orc"], "boss": "orc", "density": [1, 2]},
	},
	{
		"title": "Crypt of Bones",
		"intro": "The restless dead rise. Escape the crypt alive.",
		"seed": 202,
		"spec": {"pool": ["skeleton", "zombie", "skeleton"], "boss": "mummy", "density": [1, 3]},
	},
	{
		"title": "Halls of Chaos",
		"intro": "Orcs and fimir serve a darker master here.",
		"seed": 303,
		"spec": {"pool": ["orc", "fimir", "skeleton"], "boss": "chaos_warrior", "density": [2, 3]},
	},
	{
		"title": "The Gargoyle's Lair",
		"intro": "Slay the gargoyle guardian and claim victory.",
		"seed": 404,
		"spec": {"pool": ["fimir", "mummy", "chaos_warrior"], "boss": "gargoyle", "density": [2, 3]},
	},
]

static func count() -> int:
	return CAMPAIGN.size()

static func get_quest(i: int) -> Dictionary:
	return CAMPAIGN[clampi(i, 0, CAMPAIGN.size() - 1)]
