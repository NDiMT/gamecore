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
