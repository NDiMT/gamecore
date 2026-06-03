class_name Vis
## Pure fog-of-war queries usable on both host and clients (clients have only
## the map plus the latest snapshot). A room tile is visible once its room id is
## revealed; a corridor tile is visible once it's in the revealed-corridor set.

static func tile_revealed(map: Dictionary, snap: Dictionary, x: int, y: int) -> bool:
	if not Grid.in_bounds(map, x, y):
		return false
	var r := map.room[Grid.idx(map, x, y)] as int
	if r >= 0:
		return snap.revealedRooms.has(r)
	return snap.revealedCorridor.has(Vector2i(x, y))

## A wall is shown if it borders any revealed walkable tile.
static func wall_visible(map: Dictionary, snap: Dictionary, x: int, y: int) -> bool:
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			var nx := x + dx
			var ny := y + dy
			if not Grid.in_bounds(map, nx, ny):
				continue
			if map.type[Grid.idx(map, nx, ny)] == Data.WALL:
				continue
			if tile_revealed(map, snap, nx, ny):
				return true
	return false
