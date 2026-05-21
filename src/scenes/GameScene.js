import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT,
  TESTING_GREEN_BG, TESTING_BG_COLOR, PRODUCTION_BG_COLOR,
  POTS, SEED_SHELF, SEEDS,
  HINT_NOTE_TEXT, DIARY_TEXT,
  ERA_PAST, ERA_FUTURE,
} from "../constants.js";
import { roomState } from "../state/RoomState.js";
import { Seed } from "../entities/Seed.js";
import { Pot } from "../entities/Pot.js";
import { HintNote } from "../entities/HintNote.js";
import { Door } from "../entities/Door.js";
import { HUD } from "../ui/HUD.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {}

  create() {
    try {
      this.state = roomState;
      this.state.reset();
      this.buildBackground();
      this.buildPots();
      this.buildSeeds();
      this.buildNotes();
      this.buildDoor();
      this.buildBowl();
      this.buildWindow();
      this.hud = new HUD(this, this.state);
    } catch (e) {
      const W = GAME_WIDTH, H = GAME_HEIGHT;
      this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.8);
      this.add.text(W/2, H/2, "RUNTIME ERROR:\n\n" + (e.stack || e.message || e), {
        fontFamily: "monospace", fontSize: 14, color: "#ff8080", align: "center", wordWrap: { width: W - 40 }
      }).setOrigin(0.5);
      return;
    }

    this.toastText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT - 120, "", {
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontSize: 16,
      color: "#ffd76a",
      backgroundColor: "rgba(10,6,18,0.85)",
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(900);

    this.input.keyboard.on("keydown-ONE", () => this.state.setEra(ERA_PAST));
    this.input.keyboard.on("keydown-TWO", () => this.state.setEra(ERA_FUTURE));
    this.input.keyboard.on("keydown-R", () => this.handleReset());
    this.input.keyboard.on("keydown-G", () => this.toggleGreenBg());

    this.unsub = this.state.on((ev) => this.handleStateEvent(ev));

    this.events.on("door-locked", () => this.toast("Η πόρτα δεν θυμάται ακόμη."));
    this.events.on("door-opened", () => this.toast("Η πύλη ξυπνά."));

    this.applyEraDisplay();
  }

  buildBackground() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.bgColor = TESTING_GREEN_BG ? TESTING_BG_COLOR : PRODUCTION_BG_COLOR;
    this.cameras.main.setBackgroundColor(this.bgColor);

    this.bgLayer = this.add.container(0, 0);

    const floor = this.add.graphics();
    floor.fillStyle(0x3a2818, 1);
    floor.fillRect(0, H * 0.55, W, H * 0.45);
    floor.fillStyle(0x2a1a10, 0.5);
    for (let i = 0; i < 14; i++) {
      const y = H * 0.55 + i * (H * 0.45 / 14);
      floor.fillRect(0, y, W, 2);
    }

    const wallBack = this.add.graphics();
    wallBack.fillStyle(0x4a3a2a, 1);
    wallBack.fillRect(0, 0, W, H * 0.55);
    wallBack.fillStyle(0x3a2a1a, 0.3);
    for (let i = 0; i < 20; i++) {
      wallBack.fillRect(Math.random() * W, Math.random() * H * 0.55, 4, 2);
    }

    const table = this.add.graphics();
    table.fillStyle(0x3a2010, 1);
    table.fillRect(40, 690, W - 80, 36);
    table.fillStyle(0x2a1808, 1);
    table.fillRect(40, 720, W - 80, 8);
    table.lineStyle(2, 0x1a0e08, 1);
    table.strokeRect(40, 690, W - 80, 36);

    this.bgLayer.add([floor, wallBack, table]);
  }

  buildWindow() {
    const w = this.add.container(540, 280);
    const frame = this.add.graphics();
    frame.fillStyle(0x1a0e08, 1);
    frame.fillRoundedRect(-90, -130, 180, 260, 90);
    frame.fillStyle(0x6a4828, 1);
    frame.fillRoundedRect(-78, -118, 156, 236, 78);
    frame.lineStyle(3, 0x3a2010, 1);
    frame.strokeRoundedRect(-78, -118, 156, 236, 78);

    const sky = this.add.graphics();
    sky.fillStyle(0x4a6080, 1);
    sky.fillRoundedRect(-70, -110, 140, 220, 70);

    const moon = this.add.circle(20, -50, 22, 0xd0d8e8);

    const sash = this.add.graphics();
    sash.lineStyle(3, 0x3a2010, 1);
    sash.lineBetween(0, -118, 0, 118);
    sash.lineBetween(-78, 0, 78, 0);

    const vine = this.add.graphics();
    vine.lineStyle(3, 0x3a5a20, 1);
    vine.beginPath();
    vine.moveTo(-70, -100);
    vine.lineTo(-60, -60);
    vine.lineTo(-50, -20);
    vine.lineTo(-40, 30);
    vine.strokePath();
    vine.fillStyle(0x3a5a20, 1);
    vine.fillCircle(-58, -62, 5);
    vine.fillCircle(-46, -22, 5);
    vine.fillCircle(-38, 28, 5);

    w.add([frame, sky, moon, sash, vine]);
  }

  buildBowl() {
    const b = this.add.container(620, 1050);
    const shadow = this.add.ellipse(0, 14, 100, 14, 0x000000, 0.5);
    const bowlOuter = this.add.graphics();
    bowlOuter.fillStyle(0x4a3a2a, 1);
    bowlOuter.fillEllipse(0, -2, 90, 30);
    bowlOuter.lineStyle(2, 0x2a1808, 1);
    bowlOuter.strokeEllipse(0, -2, 90, 30);
    const water = this.add.graphics();
    water.fillStyle(0x3a6a8a, 0.85);
    water.fillEllipse(0, -8, 78, 16);
    const shine = this.add.graphics();
    shine.fillStyle(0xffffff, 0.4);
    shine.fillEllipse(-20, -11, 26, 4);
    b.add([shadow, bowlOuter, water, shine]);

    const label = this.add.text(620, 1100, "μπολ με νερό", {
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontSize: 12,
      color: "#8a7a5a",
    }).setOrigin(0.5);
  }

  buildPots() {
    this.pots = POTS.map((def) => new Pot(this, def, this.state));
  }

  buildSeeds() {
    this.seeds = SEED_SHELF.map(({ type, x, y }) => new Seed(this, type, x, y, this.state));
  }

  buildNotes() {
    this.pastNote = new HintNote(this, 80, 710, {
      title: "σημείωμα στο τραπέζι",
      body: HINT_NOTE_TEXT,
      icon: "✒",
      kind: "note",
    });

    this.futureDiary = new HintNote(this, 80, 710, {
      title: "παλιό ημερολόγιο",
      body: DIARY_TEXT,
      icon: "📜",
      kind: "diary",
    });
  }

  buildDoor() {
    this.door = new Door(this, 360, 380, this.state);
  }

  handleStateEvent(ev) {
    if (ev.type === "era") {
      this.applyEraDisplay();
    }
    if (ev.type === "select") {
      this.seeds.forEach((s) => s.setSelected(s.type === ev.seedType));
    }
    if (ev.type === "plant" || ev.type === "uproot" || ev.type === "reset" || ev.type === "era") {
      this.pots.forEach((p) => p.refresh());
      this.updateSeedAvailability();
    }
    if (ev.type === "solved") {
      this.door.setOpen(true);
      this.toast("Το δωμάτιο θυμήθηκε σωστά.", 2400);
    }
    if (ev.type === "unsolved") {
      this.toast("Κάτι ξεθώριασε ξανά.");
    }
    if (ev.type === "reset") {
      this.toast("Από την αρχή.");
    }
  }

  applyEraDisplay() {
    const isPast = this.state.era === ERA_PAST;
    this.seeds.forEach((s) => s.root.setVisible(isPast));
    this.pastNote.root.setVisible(isPast);
    this.futureDiary.root.setVisible(!isPast);
    this.door.root.setVisible(!isPast);
    this.pots.forEach((p) => p.refresh());
  }

  updateSeedAvailability() {
    this.seeds.forEach((s) => {
      const used = this.state.potOfSeed(s.type) !== null;
      s.setDisabled(used);
      if (used && this.state.selectedSeed === s.type) this.state.clearSelection();
    });
  }

  handleReset() {
    this.state.reset();
  }

  toggleGreenBg() {
    this.bgColor = (this.bgColor === TESTING_BG_COLOR) ? PRODUCTION_BG_COLOR : TESTING_BG_COLOR;
    this.cameras.main.setBackgroundColor(this.bgColor);
  }

  toast(msg, duration = 1500) {
    this.toastText.setText(msg);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0);
    this.tweens.add({
      targets: this.toastText,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: duration,
      onComplete: () => this.toastText.setAlpha(0),
    });
  }
}
