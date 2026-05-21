import { SEEDS, ERA_PAST } from "../constants.js";

export class Pot {
  constructor(scene, def, state) {
    this.scene = scene;
    this.def = def;
    this.state = state;
    this.build();
    this.refresh();
  }

  build() {
    const c = this.scene.add.container(this.def.x, this.def.y);
    c.setSize(140, 170);

    const shadow = this.scene.add.ellipse(0, 70, 110, 16, 0x000000, 0.5);

    const potBack = this.scene.add.graphics();
    potBack.fillStyle(0x3a2010, 1);
    potBack.fillTriangle(-46, 0, 46, 0, 38, 60);
    potBack.fillTriangle(-46, 0, -38, 60, 38, 60);
    potBack.lineStyle(2, 0x1a0e08, 1);
    potBack.strokeTriangle(-46, 0, 46, 0, 38, 60);
    potBack.strokeTriangle(-46, 0, -38, 60, 38, 60);

    const rim = this.scene.add.graphics();
    rim.fillStyle(0x5a3a20, 1);
    rim.fillRect(-50, -8, 100, 14);
    rim.lineStyle(2, 0x1a0e08, 1);
    rim.strokeRect(-50, -8, 100, 14);

    const placementLabel = this.scene.add.text(0, -70, this.def.labelGr, {
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontSize: 14,
      color: "#f0d9a8",
    }).setOrigin(0.5);
    const labelBg = this.scene.add.rectangle(0, -70, placementLabel.width + 16, 22, 0x000000, 0.4);
    labelBg.setStrokeStyle(1, 0x8a6f3a, 0.6);

    const plantHolder = this.scene.add.container(0, 0);
    const emptyMark = this.scene.add.text(0, -30, "·", {
      fontFamily: "Georgia, serif",
      fontSize: 28,
      color: "#5a4030",
    }).setOrigin(0.5);
    plantHolder.add(emptyMark);

    const ring = this.scene.add.circle(0, 0, 60, 0xffd76a, 0);
    ring.setStrokeStyle(3, 0xffd76a, 0);

    c.add([shadow, potBack, rim, labelBg, placementLabel, plantHolder, ring]);
    c.setInteractive(new Phaser.Geom.Rectangle(-60, -40, 120, 110), Phaser.Geom.Rectangle.Contains);

    c.on("pointerdown", () => this.handleClick());
    c.on("pointerover", () => {
      this.scene.input.manager.canvas.style.cursor = "pointer";
      ring.setStrokeStyle(3, 0xffd76a, 0.7);
    });
    c.on("pointerout", () => {
      this.scene.input.manager.canvas.style.cursor = "default";
      ring.setStrokeStyle(3, 0xffd76a, 0);
    });

    this.root = c;
    this.plantHolder = plantHolder;
    this.ring = ring;
  }

  handleClick() {
    if (this.state.era !== ERA_PAST) return;
    const planted = this.state.plantedAt(this.def.id);
    if (this.state.selectedSeed) {
      this.state.plant(this.def.id, this.state.selectedSeed);
      this.state.clearSelection();
    } else if (planted) {
      this.state.removeFromPot(this.def.id);
    }
  }

  refresh() {
    this.plantHolder.removeAll(true);
    const planted = this.state.plantedAt(this.def.id);
    if (!planted) {
      this.drawEmpty();
      return;
    }
    if (this.state.era === ERA_PAST) this.drawSprout(planted);
    else this.drawMature(planted);
  }

  drawEmpty() {
    if (this.state.era === ERA_FUTURE) {
      const wilted = this.scene.add.graphics();
      wilted.lineStyle(2, 0x3a2010, 0.7);
      wilted.beginPath();
      wilted.moveTo(0, -10);
      wilted.lineTo(-6, -30);
      wilted.lineTo(8, -38);
      wilted.strokePath();
      const txt = this.scene.add.text(0, -54, "—", { fontFamily: "Georgia", fontSize: 18, color: "#5a4030" }).setOrigin(0.5);
      this.plantHolder.add([wilted, txt]);
    } else {
      const dot = this.scene.add.text(0, -22, "·", { fontFamily: "Georgia", fontSize: 30, color: "#5a4030" }).setOrigin(0.5);
      this.plantHolder.add(dot);
    }
  }

  drawSprout(seedType) {
    const def = SEEDS[seedType];
    const stem = this.scene.add.rectangle(0, -16, 3, 18, 0x4a8a3a);
    const leaf = this.scene.add.ellipse(0, -28, 14, 8, 0x6abf4a);
    const mark = this.scene.add.text(0, -42, def.glyph, {
      fontFamily: "Georgia, serif",
      fontSize: 16,
      color: rgb(def.color),
    }).setOrigin(0.5);
    this.plantHolder.add([stem, leaf, mark]);
  }

  drawMature(seedType) {
    const g = this.scene.add.graphics();
    if (seedType === "mati") {
      g.lineStyle(3, 0x3a2818, 1);
      g.beginPath();
      g.moveTo(0, -14);
      g.lineTo(-4, -28);
      g.lineTo(6, -42);
      g.lineTo(-3, -58);
      g.lineTo(4, -74);
      g.strokePath();
      g.fillStyle(0xf0e0c0, 1);
      g.fillCircle(8, -50, 7);
      g.fillCircle(-10, -38, 6);
      g.fillCircle(2, -72, 8);
      g.fillStyle(0xa83030, 1);
      g.fillCircle(8, -50, 3);
      g.fillCircle(-10, -38, 2.5);
      g.fillCircle(2, -72, 3.5);
      this.plantHolder.add(g);
    } else if (seedType === "donti") {
      g.lineStyle(3, 0x2a1808, 1);
      g.beginPath();
      g.moveTo(0, -14);
      g.lineTo(-8, -34);
      g.lineTo(6, -52);
      g.lineTo(-4, -72);
      g.strokePath();
      g.fillStyle(0xe8d8b0, 1);
      g.fillTriangle(-14, -28, -8, -38, -2, -28);
      g.fillTriangle(0, -46, 6, -56, 12, -46);
      g.fillTriangle(-8, -62, -2, -72, 4, -62);
      g.fillTriangle(8, -66, 14, -76, 20, -66);
      this.plantHolder.add(g);
    } else if (seedType === "stagona") {
      g.lineStyle(3, 0x4a3818, 1);
      g.beginPath();
      g.moveTo(0, -14);
      g.lineTo(0, -50);
      g.strokePath();
      g.beginPath();
      g.moveTo(0, -50);
      g.lineTo(-22, -30);
      g.moveTo(0, -50);
      g.lineTo(-12, -25);
      g.moveTo(0, -50);
      g.lineTo(10, -28);
      g.moveTo(0, -50);
      g.lineTo(20, -34);
      g.strokePath();
      g.fillStyle(0xe6c97a, 0.9);
      g.fillCircle(-22, -22, 4);
      g.fillCircle(-12, -16, 3);
      g.fillCircle(10, -20, 4);
      g.fillCircle(20, -26, 3);
      this.plantHolder.add(g);
    } else if (seedType === "ftero") {
      g.lineStyle(3, 0x2a3818, 1);
      g.beginPath();
      g.moveTo(0, -14);
      g.lineTo(0, -68);
      g.strokePath();
      g.fillStyle(0xb8d090, 1);
      g.fillEllipse(-12, -36, 14, 28);
      g.fillEllipse(12, -42, 14, 30);
      g.fillEllipse(-8, -58, 12, 24);
      g.fillEllipse(10, -62, 12, 22);
      g.lineStyle(1.5, 0x3a5a20, 1);
      g.strokeEllipse(-12, -36, 14, 28);
      g.strokeEllipse(12, -42, 14, 30);
      g.strokeEllipse(-8, -58, 12, 24);
      g.strokeEllipse(10, -62, 12, 22);
      this.plantHolder.add(g);
    } else if (seedType === "kyklos") {
      g.lineStyle(4, 0x4a3018, 1);
      g.strokeCircle(0, -48, 26);
      g.lineStyle(2, 0x6a4828, 1);
      g.strokeCircle(0, -48, 26);
      g.fillStyle(0x6a4828, 1);
      g.fillCircle(-22, -48, 3);
      g.fillCircle(22, -48, 3);
      g.fillCircle(0, -72, 3);
      g.fillCircle(0, -22, 3);
      g.lineStyle(2, 0x4a3018, 1);
      g.beginPath();
      g.moveTo(0, -16);
      g.lineTo(0, -22);
      g.strokePath();
      this.plantHolder.add(g);
    }
  }

  destroy() {
    this.root.destroy();
  }
}

function rgb(n) {
  return "#" + n.toString(16).padStart(6, "0");
}
