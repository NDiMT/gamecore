class_name Vis
## Pure visibility queries usable on both host and clients (clients have only
## the map plus the latest snapshot). HeroQuest model: the whole board structure
## (walls, corridors, doors) is always visible; a room's contents are hidden
## until one of its doors has been opened.

static func tile_revealed(map: Dictionary, snap: Dictionary, x: int, y: int) -> bool:
	if not Grid.in_bounds(map, x, y):
		return false
	var r := map.room[Grid.idx(map, x, y)] as int
	if r >= 0:
		return snap.get("openedRooms", []).has(r)
	return true   # corridors and doors are always on the board

static func door_open(snap: Dictionary, x: int, y: int) -> bool:
	return snap.get("openDoors", {}).has(Vector2i(x, y))
