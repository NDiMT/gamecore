extends Node
## Autoloaded transport singleton. Wraps Godot's high-level multiplayer
## (ENet over IP) in a host-authoritative star: clients send intents to the
## host (peer id 1); the host validates them against the GameState and
## broadcasts snapshots back. RPC methods live here because the autoload has a
## stable scene path (/root/Net) on every peer. Game logic lives in Main, which
## reacts to the signals below.

# Transport / lobby lifecycle
signal connected_to_host
signal connection_failed
signal server_disconnected
signal peer_left(id: int)

# Host receives (carry the sender's peer id)
signal hello_received(id: int, name: String)
signal pick_received(id: int, cls: String, name: String)
signal intent_received(id: int, action: Dictionary)

# Client receives
signal lobby_received(players: Array)
signal init_received(map: Dictionary)
signal state_received(snapshot: Dictionary)

var is_host := false

func _ready() -> void:
	multiplayer.peer_disconnected.connect(func(id): peer_left.emit(id))
	multiplayer.connected_to_server.connect(func(): connected_to_host.emit())
	multiplayer.connection_failed.connect(func(): connection_failed.emit())
	multiplayer.server_disconnected.connect(func(): server_disconnected.emit())

func host_game(port: int = Data.PORT) -> bool:
	var peer := ENetMultiplayerPeer.new()
	if peer.create_server(port, Data.MAX_PLAYERS) != OK:
		return false
	multiplayer.multiplayer_peer = peer
	is_host = true
	return true

func join_game(ip: String, port: int = Data.PORT) -> bool:
	var peer := ENetMultiplayerPeer.new()
	if peer.create_client(ip, port) != OK:
		return false
	multiplayer.multiplayer_peer = peer
	is_host = false
	return true

func my_id() -> int:
	return multiplayer.get_unique_id()

func reset() -> void:
	multiplayer.multiplayer_peer = null
	is_host = false

# ---- Client -> host ---------------------------------------------------------
func say_hello(name: String) -> void:
	_hello.rpc_id(1, name)

func send_pick(cls: String, name: String) -> void:
	_pick.rpc_id(1, cls, name)

func send_intent(action: Dictionary) -> void:
	_intent.rpc_id(1, action)

@rpc("any_peer", "call_remote", "reliable")
func _hello(name: String) -> void:
	hello_received.emit(multiplayer.get_remote_sender_id(), name)

@rpc("any_peer", "call_remote", "reliable")
func _pick(cls: String, name: String) -> void:
	pick_received.emit(multiplayer.get_remote_sender_id(), cls, name)

@rpc("any_peer", "call_remote", "reliable")
func _intent(action: Dictionary) -> void:
	intent_received.emit(multiplayer.get_remote_sender_id(), action)

# ---- Host -> clients (host updates its own view directly, not via RPC) ------
func broadcast_lobby(players: Array) -> void:
	_lobby.rpc(players)

func broadcast_init(map: Dictionary) -> void:
	_recv_init.rpc(map)

func broadcast_state(snapshot: Dictionary) -> void:
	_state.rpc(snapshot)

@rpc("authority", "call_remote", "reliable")
func _lobby(players: Array) -> void:
	lobby_received.emit(players)

@rpc("authority", "call_remote", "reliable")
func _recv_init(map: Dictionary) -> void:
	init_received.emit(map)

@rpc("authority", "call_remote", "reliable")
func _state(snapshot: Dictionary) -> void:
	state_received.emit(snapshot)
