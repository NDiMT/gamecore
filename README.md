# GameCore — Co-op HeroQuest

A browser-based, 3D, co-operative dungeon crawler inspired by **HeroQuest**.
Up to **4 heroes** play together over **WebRTC** — one player hosts a room and
the others join with a 4-character code. There is no game server: the host runs
the authoritative game logic (including the AI "Zargon" that controls the
monsters) and streams state to the other players peer-to-peer.

## Play

1. One player clicks **Create a room** and shares the 4-letter code.
2. Up to three others enter the code and join.
3. Everyone picks a hero (Barbarian, Dwarf, Elf, Wizard) and the host begins.
4. On your turn: click a **glowing tile** to move (you roll 2d6 each turn) and
   click an adjacent **monster** to attack. You get **one main action** per
   turn (attack, cast a spell, or search). End your turn when done.
5. Explore the fog-shrouded dungeon, defeat the monsters, and get a hero to the
   glowing **stairs** to win. If the whole party falls, it's defeat.

### Spells, treasure & potions

- **Spells** — the **Wizard** and **Elf** have spellbooks (limited charges for
  the quest). Click a spell to arm it, then click a target: damage spells hit a
  visible monster (no defence roll), the heal spell restores an ally's body.
- **Search** — in a room you haven't searched, spend your action to find gold
  and sometimes a **healing potion**. The noise has a chance of drawing a
  *wandering monster*, so search with care.
- **Potions** — drinking a potion is a **free action** (it doesn't cost your
  main action) and restores body.
- Looted gold is tallied on the victory screen.

### Combat

HeroQuest combat dice: 3 skulls, 2 white shields, 1 black shield per die.
Attackers count skulls; defending **heroes block with white shields**, defending
**monsters block with black shields**. Damage = skulls − shields.

## Tech

- **Three.js** — 3D rendering (angled top-down, orbit to look around)
- **PeerJS** — WebRTC data channels via the public PeerJS signaling broker
- **Vite** — dev server and build

Architecture (`src/`):

| Area | Files |
| --- | --- |
| Networking | `net/Net.js`, `net/protocol.js` |
| Game logic (host-authoritative) | `game/GameState.js`, `game/MonsterAI.js`, `game/MapGen.js`, `game/rules.js`, `game/grid.js`, `game/visibility.js`, `game/rng.js` |
| Rendering | `render/Renderer.js`, `render/Board3D.js`, `render/Tokens.js` |
| Input | `input/Picker.js` |
| UI | `ui/Lobby.js`, `ui/HUD.js`, `ui/Log.js` |
| Data | `data/heroes.js`, `data/monsters.js` |
| Glue | `App.js`, `main.js`, `config.js` |

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

To test multiplayer locally, open the dev URL in several browser tabs/windows:
create a room in one, join with the code in the others.

## Deploy

Pushing to the default branch publishes to **GitHub Pages** via
`.github/workflows/pages.yml`. The Vite `base` is relative, so it works from the
project subpath (`https://<user>.github.io/gamecore/`).

> Note: the public PeerJS broker is used for signaling only (free, no account).
> For production traffic you would point PeerJS at your own PeerServer.
