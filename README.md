# GameCore — Co-op HeroQuest (Godot 4)

A co-operative, turn-based, 3D dungeon crawler inspired by **HeroQuest**, built
in **Godot 4.3**. Up to **4 heroes** play together over **ENet** (Godot's
high-level multiplayer): one player hosts, the others join by IP. The host runs
the authoritative game logic — including the scripted AI game master
("Zargon") that controls the monsters — and streams state snapshots to the
other players; clients send only their intents.

## Run it

1. Install [Godot 4.3+](https://godotengine.org/download) (standard build).
2. Open the project (`project.godot`) in the Godot editor and press **Play**,
   or from the command line:
   ```bash
   godot --path .
   ```
3. One player clicks **Host a game**. Others enter the host's IP and click
   **Join** (use `127.0.0.1` for several instances on one machine; default port
   is `8910`).
4. Everyone picks a hero (Barbarian, Dwarf, Elf, Wizard); the host begins.

> **Networking note:** ENet connects directly over IP. On a LAN this works
> out of the box. Over the internet the host needs a reachable address (port
> `8910` forwarded), or you can run everyone through a VPN/tunnel. Unlike a
> browser/WebRTC build there is no public broker — this keeps the project fully
> self-contained with no backend.

## How to play

- On your turn, click a **glowing tile** to move (you roll 2d6 each turn) and
  click an adjacent **monster** to attack. You get **one main action** per turn
  (attack, cast a spell, or search).
- **Camera:** right-drag to orbit, mouse wheel to zoom.
- Explore the fog-shrouded dungeon, defeat the monsters, and get a hero onto
  the glowing **stairs** to win. If the whole party falls, it's defeat.

### Combat

HeroQuest combat dice: 3 skulls, 2 white shields, 1 black shield per die.
Attackers count skulls; defending **heroes block with white shields**, defending
**monsters block with black shields**. Damage = skulls − shields.

### Spells, treasure & potions

- **Spells** — Wizard and Elf have spellbooks with limited charges. Click a
  spell to arm it, then click a target: damage spells hit a visible monster (no
  defence roll); the heal spell restores an ally's body.
- **Search** — in an unsearched room, spend your action to find gold and
  sometimes a **healing potion**, with a chance of drawing a wandering monster.
- **Potions** — drinking is a free action that restores body. Gold is tallied
  on the victory screen.

## Architecture

Host-authoritative star topology. Only the host mutates the `GameState` and
rolls dice; clients render snapshots and submit intents via RPC.

| Area | Files |
| --- | --- |
| Entry / orchestration | `scenes/Main.tscn`, `scripts/Main.gd` |
| Networking (autoload) | `scripts/net/Net.gd` |
| Game data (autoload) | `scripts/game/Data.gd` |
| Game logic | `scripts/game/GameState.gd`, `MonsterAI.gd`, `MapGen.gd`, `Rules.gd`, `Grid.gd`, `Vis.gd` |
| Rendering | `scripts/render/Board3D.gd`, `scripts/render/Tokens.gd` |
| UI | `scripts/ui/Lobby.gd`, `scripts/ui/HUD.gd`, `scripts/ui/Log.gd` |

`Main.gd` builds the camera, lights, 3D board and UI entirely in code, so the
scene files stay trivial.

## Tests

A headless logic smoke test lives in `tests/`. It checks dungeon connectivity
across many seeds, runs full games to a win/lose state, and exercises
spells/search/ownership:

```bash
godot --headless --path . res://tests/Test.tscn
```

Expected final line: `ALL TESTS PASSED`.
