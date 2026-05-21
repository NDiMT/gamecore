import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, TEX_ROOM, TEX_PLANTS,
  POTS, SEED_SHELF, SEEDS, FRAMES,
  HINT_NOTE_TEXT, DIARY_TEXT, ERA_PAST, ERA_FUTURE,
  TESTING_GREEN_BG, TESTING_BG_COLOR,
} from "../constants.js";
import { roomState } from "../state/RoomState.js";
import { network } from "../network/Network.js";
import { Seed } from "../entities/Seed.js";
import { Pot } from "../entities/Pot.js";
import { HintNote } from "../entities/HintNote.js";
import { Door } from "../entities/Door.js";
import { HUD } from "../ui/HUD.js";

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: "GameScene" }); }

  create() {
    try {
      this.state = roomState;
      this.state.attachNetwork();

      this.bgImage = this.add.image(GAME_WIDTH/2, GAME_HEIGHT/2, TEX_ROOM);
      const s = Math.max(GAME_WIDTH / this.bgImage.width, GAME_HEIGHT / this.bgImage.height);
      this.bgImage.setScale(s);

      if (TESTING_GREEN_BG) this.cameras.main.setBackgroundColor(TESTING_BG_COLOR);

      this.pots = POTS.map((def) => new Pot(this, def, this.state));
      this.seeds = SEED_SHELF.map(({ type, x, y }) => new Seed(this, type, x, y, this.state));

      this.pastNote = new HintNote(this, 90, 670, {
        title: "σημείωμα στο τραπέζι",
        body: HINT_NOTE_TEXT, icon: "✒", kind: "note",
      });
      this.futureDiary = new HintNote(this, 90, 670, {
        title: "παλιό ημερολόγιο",
        body: DIARY_TEXT, icon: "📜", kind: "diary",
      });
      this.door = new Door(this, 365, 350, this.state);

      this.wateringCan = this.add.image(95, 1010, TEX_PLANTS, "can_0");
      this.wateringCan.setOrigin(0.5, 0.5);
      this.wateringCan.displayHeight = 110;
      this.wateringCan.scaleX = this.wateringCan.scaleY;

      this.hud = new HUD(this, this.state);
      this.hud.setPeerStatus(network.connected);

      this.toastText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT - 130, "", {
        fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 16,
        color: "#ffd76a", backgroundColor: "rgba(10,6,18,0.85)", padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setAlpha(0).setDepth(900);

      this.setupActions();
      this.setupKeys();
      this.subscribeState();
      this.subscribeNetwork();
      this.applyEraDisplay();
    } catch (e) {
      const W = GAME_WIDTH, H = GAME_HEIGHT;
      this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.85);
      this.add.text(W/2, H/2, "RUNTIME ERROR:\n\n" + (e.stack || e.message || e), {
        fontFamily: "monospace", fontSize: 12, color: "#ff8080", align: "center",
        wordWrap: { width: W - 30 },
      }).setOrigin(0.5);
    }
  }

  setupActions() {
    const W = GAME_WIDTH;
    this.waterBtn = this.add.container(W - 80, GAME_HEIGHT - 200);
    const bg = this.add.rectangle(0, 0, 110, 50, 0x1a0e08, 0.85);
    bg.setStrokeStyle(2, 0xc9a25c);
    const txt = this.add.text(0, 0, "💧 πότισε", {
      fontFamily: "Georgia, serif", fontSize: 14, color: "#f0d9a8", fontStyle: "italic",
    }).setOrigin(0.5);
    this.waterBtn.add([bg, txt]);
    this.waterBtn.setSize(110, 50);
    this.waterBtn.setInteractive(new Phaser.Geom.Rectangle(-55, -25, 110, 50), Phaser.Geom.Rectangle.Contains);
    this.waterBtn.on("pointerdown", () => this.handleWaterAll());
    this.waterBtn.setVisible(false);

    this.resetBtn = this.add.container(80, GAME_HEIGHT - 200);
    const rbg = this.add.rectangle(0, 0, 100, 40, 0x1a0e08, 0.7);
    rbg.setStrokeStyle(1, 0x8a6f3a);
    const rtxt = this.add.text(0, 0, "↺ reset", {
      fontFamily: "Georgia, serif", fontSize: 13, color: "#8a7a5a",
    }).setOrigin(0.5);
    this.resetBtn.add([rbg, rtxt]);
    this.resetBtn.setSize(100, 40);
    this.resetBtn.setInteractive(new Phaser.Geom.Rectangle(-50, -20, 100, 40), Phaser.Geom.Rectangle.Contains);
    this.resetBtn.on("pointerdown", () => this.state.reset());
  }

  setupKeys() {
    this.input.keyboard.on("keydown-ONE", () => this.state.setEra(ERA_PAST));
    this.input.keyboard.on("keydown-TWO", () => this.state.setEra(ERA_FUTURE));
    this.input.keyboard.on("keydown-R", () => this.state.reset());
  }

  subscribeState() {
    this.unsub = this.state.on((ev) => {
      if (ev.type === "era") this.applyEraDisplay();
      if (ev.type === "select") this.seeds.forEach((s) => s.setSelected(s.type === ev.seedType));
      if (ev.type === "plant" || ev.type === "uproot" || ev.type === "water" || ev.type === "reset" || ev.type === "sync" || ev.type === "era") {
        this.pots.forEach((p) => p.refresh());
        this.updateSeedAvailability();
        this.updateActions();
      }
      if (ev.type === "solved") { this.door.setOpen(true); this.toast("Το δωμάτιο θυμήθηκε σωστά.", 2600); }
      if (ev.type === "unsolved") { this.door.setOpen(false); }
      if (ev.type === "reset") this.toast("Από την αρχή.");
    });
    this.events.on("door-locked", () => this.toast("Η πόρτα δεν θυμάται ακόμη."));
    this.events.on("door-opened", () => this.toast("Η πύλη ξυπνά."));
  }

  subscribeNetwork() {
    network.on((ev) => {
      if (ev.type === "open") { this.hud.setPeerStatus(true); this.toast("Συνεργάτης συνδέθηκε."); }
      if (ev.type === "close") { this.hud.setPeerStatus(false); this.toast("Συνεργάτης αποσυνδέθηκε."); }
    });
  }

  applyEraDisplay() {
    const isPast = this.state.era === ERA_PAST;
    this.seeds.forEach((s) => s.setVisible(isPast));
    this.pastNote.setVisible(isPast);
    this.futureDiary.setVisible(!isPast);
    this.door.setVisible(!isPast);
    this.wateringCan.setVisible(isPast);
    this.pots.forEach((p) => p.refresh());
    this.updateActions();
    this.bgImage.setTint(isPast ? 0xffffff : 0x88aacc);
  }

  updateActions() {
    const isPast = this.state.era === ERA_PAST;
    const anyUnwatered = POTS.some((p) => this.state.plantedAt(p.id) && !this.state.isWatered(p.id));
    this.waterBtn.setVisible(isPast && anyUnwatered);
    this.resetBtn.setVisible(isPast);
  }

  updateSeedAvailability() {
    this.seeds.forEach((s) => {
      const potId = this.state.potOfSeed(s.type);
      const used = potId !== null;
      const lockedIn = used && this.state.isWatered(potId);
      s.setDisabled(lockedIn);
      if (lockedIn && this.state.selectedSeed === s.type) this.state.clearSelection();
    });
  }

  handleWaterAll() {
    POTS.forEach((p) => {
      if (this.state.plantedAt(p.id) && !this.state.isWatered(p.id)) this.state.water(p.id);
    });
    this.toast("Ο χρόνος ρέει σαν νερό…");
  }

  toast(msg, duration = 1500) {
    this.toastText.setText(msg);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0);
    this.tweens.add({
      targets: this.toastText, alpha: 1, duration: 200, yoyo: true, hold: duration,
      onComplete: () => this.toastText.setAlpha(0),
    });
  }
}
