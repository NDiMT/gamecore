import { ERA_PAST, ERA_FUTURE, SEEDS } from "../constants.js";

export class HUD {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.build();
    this.refresh();
  }

  build() {
    const sc = this.scene;
    const W = sc.scale.width;

    const topBg = sc.add.rectangle(W/2, 36, W, 72, 0x000000, 0.55);
    topBg.setStrokeStyle(0);

    this.eraText = sc.add.text(28, 36, "", {
      fontFamily: "Georgia, serif",
      fontSize: 18,
      fontStyle: "italic",
      color: "#f0d9a8",
    }).setOrigin(0, 0.5);

    this.subText = sc.add.text(28, 56, "", {
      fontFamily: "Georgia, serif",
      fontSize: 12,
      color: "#8a7a5a",
    }).setOrigin(0, 0.5);

    this.toggleBtn = sc.add.text(W - 28, 36, "1·2 εποχή  R reset", {
      fontFamily: "Arial",
      fontSize: 11,
      color: "#8a7a5a",
    }).setOrigin(1, 0.5);
    this.toggleBtn.setInteractive();
    this.toggleBtn.on("pointerdown", () => this.state.toggleEra());

    this.selBg = sc.add.rectangle(W/2, sc.scale.height - 38, W, 64, 0x000000, 0.6);
    this.selText = sc.add.text(W/2, sc.scale.height - 38, "", {
      fontFamily: "Georgia, serif",
      fontSize: 14,
      color: "#f0d9a8",
      fontStyle: "italic",
      align: "center",
    }).setOrigin(0.5);

    this.winLabel = sc.add.text(W/2, 110, "", {
      fontFamily: "Georgia, serif",
      fontSize: 22,
      color: "#ffd76a",
      fontStyle: "italic",
      align: "center",
    }).setOrigin(0.5);
    this.winLabel.setAlpha(0);

    this.unsub = this.state.on(() => this.refresh());
  }

  refresh() {
    if (this.state.era === ERA_PAST) {
      this.eraText.setText("⌛ 1872 · παρελθόν");
      this.subText.setText("φύτεψε τους σπόρους στις γλάστρες");
    } else {
      this.eraText.setText("✦ 2287 · μέλλον");
      this.subText.setText("δες τι ξεπρόβαλε από το χώμα");
    }
    if (this.state.selectedSeed) {
      const def = SEEDS[this.state.selectedSeed];
      this.selText.setText(`κρατάς: σπόρος ${def.label.toLowerCase()} · άγγιξε γλάστρα`);
    } else {
      this.selText.setText("κανένας σπόρος επιλεγμένος");
    }
    if (this.state.solved) {
      this.winLabel.setText("Το δωμάτιο θυμήθηκε σωστά.");
      this.scene.tweens.add({
        targets: this.winLabel,
        alpha: 1,
        duration: 600,
      });
    } else {
      this.winLabel.setAlpha(0);
    }
  }

  destroy() {
    if (this.unsub) this.unsub();
  }
}
