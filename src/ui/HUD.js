import Phaser from "phaser";
import { ERA_PAST, ERA_FUTURE, SEEDS, GAME_WIDTH, GAME_HEIGHT } from "../constants.js";

export class HUD {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.build();
    this.refresh();
  }

  build() {
    const sc = this.scene;
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    this.topBg = sc.add.rectangle(W/2, 36, W, 72, 0x000000, 0.55);

    this.eraText = sc.add.text(28, 28, "", {
      fontFamily: "Georgia, serif", fontSize: 18, fontStyle: "italic", color: "#f0d9a8",
    }).setOrigin(0, 0.5);

    this.subText = sc.add.text(28, 52, "", {
      fontFamily: "Georgia, serif", fontSize: 12, color: "#8a7a5a",
    }).setOrigin(0, 0.5);

    this.peerText = sc.add.text(W - 28, 36, "● live", {
      fontFamily: "Arial", fontSize: 11, color: "#8df0a8",
    }).setOrigin(1, 0.5);

    this.selBg = sc.add.rectangle(W/2, H - 40, W, 70, 0x000000, 0.65);
    this.selText = sc.add.text(W/2, H - 40, "", {
      fontFamily: "Georgia, serif", fontSize: 14, color: "#f0d9a8", fontStyle: "italic", align: "center",
      wordWrap: { width: W - 40 },
    }).setOrigin(0.5);

    this.winLabel = sc.add.text(W/2, 96, "", {
      fontFamily: "Georgia, serif", fontSize: 24, color: "#ffd76a", fontStyle: "italic", align: "center",
      shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 4, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.unsub = this.state.on(() => this.refresh());
  }

  setPeerStatus(online) {
    this.peerText.setText(online ? "● live" : "○ off");
    this.peerText.setColor(online ? "#8df0a8" : "#ff9b95");
  }

  refresh() {
    if (this.state.era === ERA_PAST) {
      this.eraText.setText("⌛ 1872 · παρελθόν");
      this.subText.setText("φύτεψε και πότισε");
    } else {
      this.eraText.setText("✦ 2287 · μέλλον");
      this.subText.setText("κοίτα τι μεγάλωσε");
    }
    if (this.state.selectedSeed) {
      const def = SEEDS[this.state.selectedSeed];
      this.selText.setText(`κρατάς σπόρο ${def.label.toLowerCase()} · άγγιξε γλάστρα`);
    } else if (this.state.role === "past") {
      this.selText.setText("άγγιξε ένα σακουλάκι για να διαλέξεις");
    } else {
      this.selText.setText("μόνο ο σύντροφος στο 1872 μπορεί να φυτέψει");
    }
    if (this.state.solved) {
      this.winLabel.setText("Το δωμάτιο θυμήθηκε σωστά.");
      this.scene.tweens.add({ targets: this.winLabel, alpha: 1, duration: 600 });
    } else {
      this.winLabel.setAlpha(0);
    }
  }
}
