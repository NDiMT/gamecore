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
var _last_roll_seq := 0
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
	env.background_color = Color("07060d")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("4a4668")
	env.ambient_light_energy = 0.7
	env.fog_enabled = true
	env.fog_light_color = Color("07060d")
	env.fog_density = 0.015
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var key := DirectionalLight3D.new()
	key.light_color = Color("ffe9c0")
	key.light_energy = 1.1
	key.rotation_degrees = Vector3(-55, -35, 0)
	key.shadow_enabled = true
	add_child(key)

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
	hud.drink_pressed.connect(func(id): _send_intent({"t": "drink", "heroId": id}))
	hud.spell_pressed.connect(_on_spell_pressed)

	log_ui = LogScript.new()
	log_ui.theme = theme
	layer.add_child(log_ui)

	dice_overlay = DiceScript.new()
	dice_overlay.theme = theme
	layer.add_child(dice_overlay)

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

func _on_pick_requested(cls: String) -> void:
	if is_host:
		var taken := _class_taken_by_other(cls, my_id)
		for p in players:
			if p.id == my_id and not taken:
				p.cls = cls
		_push_lobby()
	else:
		Net.send_pick(cls, my_name)

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

func _on_pick_remote(id: int, cls: String, name: String) -> void:
	for p in players:
		if p.id == id:
			if name != "":
				p.name = name
			if not _class_taken_by_other(cls, id):
				p.cls = cls
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
	var ready := players.filter(func(p): return p.cls != null and p.cls != "")
	if ready.is_empty():
		return
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var gen := MapGen.generate(rng)
	gs = GameState.new(gen.map, rng)
	gs.start(ready, gen.start_tiles, gen.monster_spawns)
	Net.broadcast_init(gen.map)
	_build_game(gen.map)
	_broadcast_state()

func _broadcast_state() -> void:
	var s := gs.snapshot()
	Net.broadcast_state(s)
	_apply_snapshot(s)

# ---- Build the 3D view (host and client) ------------------------------------
func _build_game(_map: Dictionary) -> void:
	map = _map
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
	hud.map = map
	hud.visible = true
	log_ui.visible = true

# ---- Snapshot application (render) ------------------------------------------
func _apply_snapshot(s: Dictionary) -> void:
	snap = s
	if pending_spell != null and not _can_cast_pending():
		pending_spell = null
	board.update_fog(snap)
	tokens.sync(snap)
	hud.update_view(snap, my_id, {"pending_spell": pending_spell})
	log_ui.update_view(snap)
	# Play the dice animation whenever a fresh combat roll appears.
	if snap.lastRoll.has("seq") and snap.lastRoll.seq != _last_roll_seq:
		_last_roll_seq = snap.lastRoll.seq
		dice_overlay.play(snap.lastRoll)
	_update_reachable()
	_check_end(snap)

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
		"drink":
			changed = gs.drink_potion(from, action.heroId)
		"end":
			changed = gs.end_turn(from, action.heroId)
	if changed:
		_broadcast_state()

# ---- End states -------------------------------------------------------------
func _check_end(s: Dictionary) -> void:
	if s.phase == "won":
		var gold := 0
		for h in s.heroes:
			gold += h.gold
		_show_toast("🏆 Victory!  %d gold looted" % gold)
	elif s.phase == "lost":
		_show_toast("💀 Defeat")
	else:
		_toast_root.visible = false

func _show_toast(text: String) -> void:
	_toast.text = text
	_toast_root.visible = true
