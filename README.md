# Chronos · Greenhouse

Phaser 3 + Vite. Πρώτη πίστα για ένα coop time-loop escape παιχνίδι.

## Run locally

```bash
npm install
npm run dev
```

- Chronos: http://localhost:5173/
- **NOCLIP** (Backrooms horror vertical slice): http://localhost:5173/horror.html

## NOCLIP — Level 0

First-person Backrooms-style horror prototype σε Three.js. Vertical slice (~3-5 min).

- **WASD** κίνηση, **Mouse** look, **Shift** τρέξιμο, **ESC** release cursor
- Procedural maze 22×22 cells με yellow wallpaper, damp carpet, fluorescent ceiling lights
- Atmospheric audio synth (WebAudio) — hum, drone, footsteps, scare sting
- VHS post-fx: grain, chromatic aberration, scanlines, vignette
- Mid-game scripted scare: blackout → entity teleports behind you → flash
- Win: φτάσε στην κίτρινη φωτεινή έξοδο

Source σε `src/horror/`. Entry: `horror.html`.

## Ship to Steam (Electron)

Το παιχνίδι τυλίγεται σε **Electron** → native executable που δέχεται το Steam.

```bash
npm install

# Δοκιμή σε παράθυρο (dev server) — άνοιξε άλλο terminal με `npm run dev` πρώτα
npm run electron:dev

# Native build + τρέξιμο τοπικά (fullscreen)
npm run electron:start

# Steam-ready unpacked builds (ανέβα τον φάκελο μέσω SteamPipe)
npm run steam:win      # -> release/win-unpacked/
npm run steam:linux    # -> release/linux-unpacked/
npm run steam:mac      # -> release/mac/

# Installers (.exe / .dmg / .AppImage) αντί για Steam
npm run dist
```

Electron config: `electron/main.cjs` (fullscreen window, φορτώνει `dist/horror.html`),
`electron/preload.cjs` (context-isolated bridge).

### Βήματα δημοσίευσης στο Steam

1. **Steamworks account** + $100 Steam Direct fee → παίρνεις το δικό σου App ID
2. Βάλε το πραγματικό App ID στο `steam_appid.txt` (τώρα έχει `480` = Spacewar test app)
3. (Προαιρετικό) Achievements/overlay: πρόσθεσε `steamworks.js`, αρχικοποίησέ το στο
   `electron/preload.cjs` (υπάρχει σχόλιο-hook), χρειάζεται το Steamworks SDK
4. `npm run steam:win` → ανέβασε το `release/win-unpacked/` ως depot μέσω **SteamPipe** (`steamcmd`)
5. Set up store page, age gate (horror), capsule art → submit for review → release

## Controls

- `1` — Δωμάτιο Παρελθόντος
- `2` — Δωμάτιο Μέλλοντος
- `R` — Reset
- `G` — Toggle green background (sprite testing)
- Click σακουλάκι → επιλογή σπόρου
- Click γλάστρα → φύτευση (ή ξεφύτεμα αν δεν έχεις σπόρο επιλεγμένο)

## Project structure

```
src/
├─ main.js                  Phaser bootstrap
├─ constants.js             positions, palette, solution, hints
├─ scenes/GameScene.js      κύρια σκηνή
├─ state/RoomState.js       reactive shared state
├─ entities/
│  ├─ Seed.js               σακουλάκι σπόρου
│  ├─ Pot.js                γλάστρα με stage-aware rendering
│  ├─ HintNote.js           σημείωμα/ημερολόγιο modal
│  └─ Door.js               πύλη του χρόνου
└─ ui/HUD.js                era badge + selected seed bar
```

## Solution

Φτερό → παράθυρο, Σταγόνα → μπολ με νερό, Κύκλος → κέντρο.
Μάτι/Δόντι είναι decoys.

Hint:
- Παρελθόν: «Ό,τι σπάρθηκε πριν, ακόμα θυμάται το φως.»
- Μέλλον: «Εκείνο που ήθελε αέρα μεγάλωσε προς το σπασμένο παράθυρο…»

## Swap to real sprites later

Όλα τα placeholder visuals είναι Phaser Graphics primitives σε `src/entities/*.js`.
Όταν έχεις atlas:
1. `public/sprites/plants.png` + `plants.json`
2. στο `GameScene.preload()` φόρτωσε με `this.load.atlas(...)`
3. στα entities αντικατάστησε τα `add.graphics()` με `add.sprite(x, y, "plants", "ftero_mature")`
