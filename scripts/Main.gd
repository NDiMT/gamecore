extends Node3D
## Top-level coordinator (the Godot counterpart of the old App.js). The host
## runs the authoritative GameState and broadcasts snapshots; every peer (host
## included) renders from the latest snapshot and sends intents for its own
## hero. Builds the camera, lights, 3D board and UI in code.

const BoardScript := preload("res://scripts/render/Board3D.gd")
const TokensScript := preload("res://scripts/render/Tokens.gd")
const LobbyScript := preload("res://scripts/ui/Lobby.gd")
const HUDScript := preload("res://scripts/ui/HUD.gd")
const LogScript := preload("res://scripts/ui/Log.gd")
const DiceScript := preload("res://scripts/ui/DiceOverlay.gd")
const ShopScript := preload("res://scripts/ui/Shop.gd")

var is_host := false
var my_id := 1
var my_name := "Adventurer"
var players: Array = []          # host roster: [{ id, name, cls }]
var gs: GameState = null         # host only
var map: Dictionary = {}
var snap: Dictionary = {}
var pending_spell = null

var _camera: Camera3D
# Fixed, mostly top-down angle (no orbit) — clearest for a board-game grid.
const CAM_PITCH := 1.15      # radians (~66° above horizontal)
var _dist := 14.0
var _follow := Vector3.ZERO  # smoothed camera focus (tracks the active hero)
var _pan := Vector3.ZERO     # temporary user pan offset (decays back to hero)

# Pointer state. Single-finger gestures arrive as emulated mouse events (so GUI
# controls keep working on touch); two-finger pinch is read from raw touches.
var _dragging := false
var _drag_moved := 0.0
var _touch_points := {}   # active touch index -> position
var _pinch_dist := 0.0

# Untyped on purpose: these hold script instances whose methods aren't declared
# on the Node3D/Control base types, so static typing would reject the calls.
var board
var tokens
var lobby
var hud
var log_ui
var dice_overlay
var shop_ui
var _last_roll_seq := 0
var _applied_secrets := {}
var _quest_index := 0
var _in_shop := false
var _toast: Label
var _toast_root: Control

func _ready() -> void:
	_setup_world()
	_setup_ui()
	_connect_net()
	# Center the window on desktop (no-op on mobile / headless).
	if DisplayServer.get_name() != "headless":
		get_window().move_to_center.call_deferred()

# ---- Scene construction -----------------------------------------------------
func _setup_world() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("0b0913")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("5a5478")
	env.ambient_light_energy = 0.85
	env.glow_enabled = true
	env.glow_intensity = 0.9
	env.glow_bloom = 0.2
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var key := DirectionalLight3D.new()
	key.light_color = Color("ffe9c0")
	key.light_energy = 1.4
	key.rotation_degrees = Vector3(-58, -42, 0)
	key.shadow_enabled = true
	add_child(key)
	var fill := OmniLight3D.new()
	fill.light_color = Color("8aa0ff")
	fill.light_energy = 1.0
	fill.omni_range = 60
	fill.position = Vector3(12, 16, 9)
	add_child(fill)

	_camera = Camera3D.new()
	_camera.current = true
	add_child(_camera)
	_update_camera()

func _setup_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	# A shared theme bumps font/control sizes for comfortable touch targets.
	var theme := Theme.new()
	theme.default_font_size = 22

	lobby = LobbyScript.new()
	lobby.theme = theme
	layer.add_child(lobby)
	lobby.host_requested.connect(_on_host_requested)
	lobby.join_requested.connect(_on_join_requested)
	lobby.pick_requested.connect(_on_pick_requested)
	lobby.start_requested.connect(_on_start_requested)

	hud = HUDScript.new()
	hud.theme = theme
	layer.add_child(hud)
	hud.end_pressed.connect(_on_end_pressed)
	hud.search_pressed.connect(func(id): _send_intent({"t": "search", "heroId": id}))
	hud.disarm_pressed.connect(func(id): _send_intent({"t": "disarm", "heroId": id}))
	hud.drink_pressed.connect(func(id): _send_intent({"t": "drink", "heroId": id}))
	hud.spell_pressed.connect(_on_spell_pressed)

	log_ui = LogScript.new()
	log_ui.theme = theme
	layer.add_child(log_ui)

	dice_overlay = DiceScript.new()
	dice_overlay.theme = theme
	layer.add_child(dice_overlay)

	shop_ui = ShopScript.new()
	shop_ui.theme = theme
	layer.add_child(shop_ui)
	shop_ui.buy_requested.connect(func(item): _send_intent({"t": "buy", "item": item}))
	shop_ui.continue_requested.connect(_begin_next_quest)

	# Centred win/lose toast.
	_toast_root = Control.new()
	_toast_root.theme = theme
	_toast_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_toast_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_toast_root)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_toast_root.add_child(center)
	var panel := PanelContainer.new()
	center.add_child(panel)
	_toast = Label.new()
	_toast.add_theme_font_size_override("font_size", 30)
	_toast.add_theme_color_override("font_color", Color("e6b450"))
	panel.add_child(_toast)
	_toast_root.visible = false

func _connect_net() -> void:
	Net.connected_to_host.connect(_on_connected_to_host)
	Net.connection_failed.connect(func(): lobby.set_status("Connection failed.", true))
	Net.server_disconnected.connect(func(): lobby.set_status("Lost connection to host.", true))
	Net.peer_left.connect(_on_peer_left)
	Net.hello_received.connect(_on_hello)
	Net.pick_received.connect(_on_pick_remote)
	Net.intent_received.connect(_apply_intent)
	Net.lobby_received.connect(func(p): lobby.set_players(p, my_id))
	Net.init_received.connect(_build_game)
	Net.state_received.connect(_apply_snapshot)
	Net.shop_received.connect(_on_shop_received)

# ---- Camera -----------------------------------------------------------------
func _update_camera() -> void:
	_dist = clampf(_dist, 7.0, 30.0)
	var target := _follow + _pan
	var off := Vector3(0.0, _dist * sin(CAM_PITCH), _dist * cos(CAM_PITCH))
	_camera.position = target + off
	_camera.look_at(target, Vector3.UP)

func _process(delta: float) -> void:
	# Smoothly track the active hero; let any user pan drift back to centre.
	_follow = _follow.lerp(_desired_follow(), clampf(delta * 4.0, 0.0, 1.0))
	if not _dragging:
		_pan = _pan.lerp(Vector3.ZERO, clampf(delta * 1.5, 0.0, 1.0))
	_update_camera()

func _desired_follow() -> Vector3:
	var hero = null
	if not snap.is_empty():
		for h in snap.heroes:
			if h.id == snap.turn.order[snap.turn.idx]:
				hero = h
				break
	if hero != null and board != null:
		return board.world_from_tile(hero.x, hero.y)
	return _follow

func _unhandled_input(event: InputEvent) -> void:
	# Track raw touches so we can detect a two-finger pinch. Single-finger
	# input is handled below via the emulated mouse events.
	if event is InputEventScreenTouch:
		if event.pressed:
			_touch_points[event.index] = event.position
		else:
			_touch_points.erase(event.index)
		if _touch_points.size() < 2:
			_pinch_dist = 0.0
		return
	if event is InputEventScreenDrag:
		_touch_points[event.index] = event.position
		if _touch_points.size() >= 2:
			var d := _two_touch_distance()
			if _pinch_dist > 0.0:
				_dist *= _pinch_dist / maxf(d, 1.0)
				_update_camera()
			_pinch_dist = d
		return

	# Don't orbit/pick with the emulated mouse while a pinch is in progress.
	if _touch_points.size() >= 2:
		return

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT or event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				_dragging = true
				_drag_moved = 0.0
			else:
				_dragging = false
				# A near-stationary left release is a tap → pick.
				if event.button_index == MOUSE_BUTTON_LEFT and _drag_moved < 10.0:
					_try_pick(event.position)
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_dist *= 0.9
			_update_camera()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_dist *= 1.1
			_update_camera()
	elif event is InputEventMouseMotion and _dragging:
		_drag_moved += event.relative.length()
		# Drag to pan the view across the board.
		var k := _dist * 0.0018
		_pan.x -= event.relative.x * k
		_pan.z -= event.relative.y * k

func _two_touch_distance() -> float:
	var pts := _touch_points.values()
	if pts.size() < 2:
		return 0.0
	return pts[0].distance_to(pts[1])

# ---- Lobby: hosting / joining ----------------------------------------------
func _on_host_requested(name: String) -> void:
	my_name = name
	if not Net.host_game():
		lobby.set_status("Could not open port %d." % Data.PORT, true)
		return
	is_host = true
	my_id = Net.my_id()
	players = [{"id": my_id, "name": name, "cls": null}]
	lobby.show_room(true, "Players join your IP on port %d (same machine: 127.0.0.1)." % Data.PORT)
	_push_lobby()

func _on_join_requested(ip: String, name: String) -> void:
	my_name = name
	is_host = false
	if not Net.join_game(ip):
		lobby.set_status("Invalid address.", true)
		return
	lobby.set_status("Connecting to %s…" % ip)

func _on_connected_to_host() -> void:
	my_id = Net.my_id()
	lobby.show_room(false, "Connected. Pick your hero.")
	Net.say_hello(my_name)

func _on_pick_requested(cls: String, groups: Array) -> void:
	if is_host:
		var taken := _class_taken_by_other(cls, my_id)
		for p in players:
			if p.id == my_id and not taken:
				p.cls = cls
				p.groups = groups
		_push_lobby()
	else:
		Net.send_pick(cls, my_name, groups)

func _on_hello(id: int, name: String) -> void:
	if gs != null:
		return  # game running; ignore late joiners
	if players.size() >= Data.MAX_PLAYERS:
		return
	for p in players:
		if p.id == id:
			return
	players.append({"id": id, "name": name, "cls": null})
	_push_lobby()

func _on_pick_remote(id: int, cls: String, name: String, groups: Array) -> void:
	for p in players:
		if p.id == id:
			if name != "":
				p.name = name
			if not _class_taken_by_other(cls, id):
				p.cls = cls
				p.groups = groups
	_push_lobby()

func _class_taken_by_other(cls: String, owner_id: int) -> bool:
	for p in players:
		if p.id != owner_id and p.cls == cls:
			return true
	return false

func _push_lobby() -> void:
	Net.broadcast_lobby(players)
	lobby.set_players(players, my_id)

func _on_peer_left(id: int) -> void:
	if gs == null:
		players = players.filter(func(p): return p.id != id)
		_push_lobby()
		return
	# Mid-game: hand the orphaned hero to the host so turns don't stall.
	for h in snap.heroes:
		if h.owner == id:
			h.owner = my_id
	gs.log_line("A hero was abandoned — the host takes command.", "sys")
	_broadcast_state()

# ---- Start ------------------------------------------------------------------
func _on_start_requested() -> void:
	if not is_host:
		return
	if players.filter(func(p): return p.cls != null and p.cls != "").is_empty():
		return
	# Seed persistent carry-over fields used across the campaign.
	for p in players:
		if not p.has("gold"):
			p["gold"] = 0
		if not p.has("equipment"):
			p["equipment"] = ["shortsword"]
	_quest_index = 0
	_in_shop = false
	_start_quest(_quest_index)

func _start_quest(index: int) -> void:
	var q := Quests.get_quest(index)
	var rng := RandomNumberGenerator.new()
	rng.seed = q.seed
	var gen := MapGen.generate(rng, q.spec)
	gs = GameState.new(gen.map, rng)
	gs.start(_ready_carry(), gen)
	gs.log_line("Quest %d — %s" % [index + 1, q.title], "sys")
	gs.log_line(q.intro, "sys")
	Net.broadcast_init(gen.map)
	_build_game(gen.map)
	_broadcast_state()

func _ready_carry() -> Array:
	var out: Array = []
	for p in players:
		if p.cls == null or p.cls == "":
			continue
		out.append({
			"id": p.id, "name": p.name, "cls": p.cls, "groups": p.get("groups", []),
			"gold": p.get("gold", 0), "equipment": p.get("equipment", ["shortsword"]),
		})
	return out

func _begin_next_quest() -> void:
	if not is_host or not _in_shop or _quest_index >= Quests.count() - 1:
		return
	_quest_index += 1
	_in_shop = false
	shop_ui.visible = false
	_start_quest(_quest_index)

func _on_quest_won() -> void:
	_in_shop = true
	for h in snap.heroes:
		for p in players:
			if p.id == h.owner:
				p["gold"] = h.gold
				p["equipment"] = h.equipment.duplicate()
	var shop := _make_shop()
	Net.broadcast_shop(shop)
	_on_shop_received(shop)

func _make_shop() -> Dictionary:
	var done := _quest_index >= Quests.count() - 1
	var pl: Array = []
	for p in players:
		if p.cls == null or p.cls == "":
			continue
		pl.append({"id": p.id, "name": p.name, "cls": p.cls, "gold": p.get("gold", 0), "equipment": p.get("equipment", [])})
	var next_title := "" if done else String(Quests.get_quest(_quest_index + 1).title)
	return {"players": pl, "next_title": next_title, "done": done}

func _on_shop_received(shop: Dictionary) -> void:
	hud.visible = false
	log_ui.visible = false
	dice_overlay.visible = false
	shop_ui.show_shop(shop, my_id, is_host)

func _shop_buy(from: int, item_id: String) -> void:
	if not is_host or not _in_shop:
		return
	var item = _find_item(item_id)
	if item == null:
		return
	for p in players:
		if p.id == from and p.get("gold", 0) >= item.cost:
			p["gold"] = p.get("gold", 0) - item.cost
			var eq: Array = p.get("equipment", []).duplicate()
			if item.slot != "tool":
				eq = eq.filter(func(e): return _slot_of(e) != item.slot)
			if not eq.has(item.id):
				eq.append(item.id)
			p["equipment"] = eq
			var shop := _make_shop()
			Net.broadcast_shop(shop)
			_on_shop_received(shop)
			return

func _find_item(id: String):
	for item in Data.EQUIPMENT:
		if item.id == id:
			return item
	return null

func _slot_of(id: String) -> String:
	var item = _find_item(id)
	return item.slot if item != null else ""

func _broadcast_state() -> void:
	var s := gs.snapshot()
	Net.broadcast_state(s)
	_apply_snapshot(s)

# ---- Build the 3D view (host and client) ------------------------------------
func _build_game(_map: Dictionary) -> void:
	map = _map
	# Tear down any previous quest's board before building the new one.
	if board != null:
		board.queue_free()
	if tokens != null:
		tokens.queue_free()
	_applied_secrets = {}
	_last_roll_seq = 0
	board = BoardScript.new()
	add_child(board)
	board.build(map)
	tokens = TokensScript.new()
	add_child(tokens)
	tokens.setup(map)

	_follow = BoardScript.world_from_tile(int(map.w / 2.0), int(map.h / 2.0))
	_pan = Vector3.ZERO
	_dist = 14.0
	_update_camera()

	lobby.visible = false
	shop_ui.visible = false
	hud.map = map
	hud.visible = true
	log_ui.visible = true

# ---- Snapshot application (render) ------------------------------------------
func _apply_snapshot(s: Dictionary) -> void:
	snap = s
	if pending_spell != null and not _can_cast_pending():
		pending_spell = null
	board.update_fog(snap)
	# Reconcile newly-discovered secret doors into the local map + view.
	for sd in snap.get("secret", []):
		var key := Vector2i(sd.x, sd.y)
		if sd.found and not _applied_secrets.has(key):
			_applied_secrets[key] = true
			map.type[Grid.idx(map, sd.x, sd.y)] = Data.DOOR
			board.reveal_secret(sd.x, sd.y)
	board.update_traps(snap)
	tokens.sync(snap)
	hud.update_view(snap, my_id, {"pending_spell": pending_spell})
	log_ui.update_view(snap)
	# Play the dice animation whenever a fresh combat roll appears.
	if snap.lastRoll.has("seq") and snap.lastRoll.seq != _last_roll_seq:
		_last_roll_seq = snap.lastRoll.seq
		dice_overlay.play(snap.lastRoll)
	_update_reachable()
	_check_end(snap)
	# Host drives the between-quest shop when a quest is cleared.
	if is_host and snap.phase == "won" and not _in_shop:
		_on_quest_won()

func _active_hero_for_me():
	if snap.is_empty() or snap.phase != "playing":
		return null
	var t: Dictionary = snap.turn
	if t.phase != "hero":
		return null
	for h in snap.heroes:
		if h.id == t.order[t.idx]:
			return h if h.alive and h.owner == my_id else null
	return null

func _occupancy(except_id: String) -> Dictionary:
	var set := {}
	for h in snap.heroes:
		if h.alive and h.id != except_id:
			set[Vector2i(h.x, h.y)] = true
	for m in snap.monsters:
		if m.alive and m.id != except_id:
			set[Vector2i(m.x, m.y)] = true
	return set

func _update_reachable() -> void:
	var hero = _active_hero_for_me()
	if hero == null:
		board.set_reachable([])
		return
	var blocked := _occupancy(hero.id)
	var seen := Grid.bfs(map, Vector2i(hero.x, hero.y), snap.turn.movePoints, blocked)
	var tiles: Array[Vector2i] = []
	for k in seen:
		if seen[k].dist > 0:
			tiles.append(k)
	board.set_reachable(tiles)

func _can_cast_pending() -> bool:
	var hero = _active_hero_for_me()
	if hero == null or snap.turn.acted:
		return false
	for s in hero.spells:
		if s.id == pending_spell.id:
			return s.charges > 0
	return false

# ---- Input picking ----------------------------------------------------------
func _try_pick(mouse_pos: Vector2) -> void:
	if snap.is_empty() or board == null:
		return
	var from := _camera.project_ray_origin(mouse_pos)
	var dir := _camera.project_ray_normal(mouse_pos)
	if absf(dir.y) < 0.0001:
		return
	var t := -from.y / dir.y
	if t <= 0.0:
		return
	var hit := from + dir * t
	var gx := int(floor(hit.x / Data.TILE))
	var gy := int(floor(hit.z / Data.TILE))
	_on_pick(gx, gy)

func _on_pick(gx: int, gy: int) -> void:
	var hero = _active_hero_for_me()
	if hero == null:
		return
	var mon = _monster_at(gx, gy)
	var ally = _hero_at(gx, gy)

	if pending_spell != null:
		if pending_spell.kind == "damage" and mon != null:
			_send_intent({"t": "cast", "heroId": hero.id, "spellId": pending_spell.id, "targetId": mon.id})
			pending_spell = null
		elif pending_spell.kind == "heal" and ally != null:
			_send_intent({"t": "cast", "heroId": hero.id, "spellId": pending_spell.id, "targetId": ally.id})
			pending_spell = null
		hud.update_view(snap, my_id, {"pending_spell": pending_spell})
		return

	if mon != null:
		_send_intent({"t": "attack", "heroId": hero.id, "targetId": mon.id})
	elif ally == null:
		_send_intent({"t": "move", "heroId": hero.id, "x": gx, "y": gy})

func _monster_at(x: int, y: int):
	for m in snap.monsters:
		if m.alive and m.x == x and m.y == y and Vis.tile_revealed(map, snap, x, y):
			return m
	return null

func _hero_at(x: int, y: int):
	for h in snap.heroes:
		if h.alive and h.x == x and h.y == y:
			return h
	return null

func _on_spell_pressed(hero_id: String, spell_id: String) -> void:
	var hero = _active_hero_for_me()
	if hero == null or hero.id != hero_id or snap.turn.acted:
		return
	var spell = null
	for s in hero.spells:
		if s.id == spell_id:
			spell = s
			break
	if spell == null or spell.charges <= 0:
		return
	# Self-buff spells need no target — cast immediately.
	if spell.kind == "shield" or spell.kind == "rage":
		pending_spell = null
		_send_intent({"t": "cast", "heroId": hero.id, "spellId": spell.id, "targetId": hero.id})
		return
	pending_spell = null if (pending_spell != null and pending_spell.id == spell_id) else spell
	hud.update_view(snap, my_id, {"pending_spell": pending_spell})

# ---- Intent routing ---------------------------------------------------------
func _on_end_pressed(hero_id: String) -> void:
	pending_spell = null
	_send_intent({"t": "end", "heroId": hero_id})

func _send_intent(action: Dictionary) -> void:
	if is_host:
		_apply_intent(my_id, action)
	else:
		Net.send_intent(action)

func _apply_intent(from: int, action: Dictionary) -> void:
	if action.t == "buy":
		_shop_buy(from, action.item)
		return
	if gs == null:
		return
	var changed := false
	match action.t:
		"move":
			changed = gs.move_hero(from, action.heroId, action.x, action.y)
		"attack":
			changed = gs.attack(from, action.heroId, action.targetId)
		"cast":
			changed = gs.cast_spell(from, action.heroId, action.spellId, action.targetId)
		"search":
			changed = gs.search(from, action.heroId)
		"disarm":
			changed = gs.disarm(from, action.heroId)
		"drink":
			changed = gs.drink_potion(from, action.heroId)
		"end":
			changed = gs.end_turn(from, action.heroId)
	if changed:
		_broadcast_state()

# ---- End states -------------------------------------------------------------
func _check_end(s: Dictionary) -> void:
	# Victory is handled by the between-quest shop flow (see _on_quest_won).
	if s.phase == "lost":
		_show_toast("💀 Defeat")
	else:
		_toast_root.visible = false

func _show_toast(text: String) -> void:
	_toast.text = text
	_toast_root.visible = true
