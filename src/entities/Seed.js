import { SEEDS, COLORS } from "../constants.js";

export class Seed {
  constructor(scene, type, x, y, state) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    this.state = state;
    this.def = SEEDS[type];
    this.disabled = false;
    this.build();
  }

  build() {
    const c = this.scene.add.container(this.x, this.y);
    c.setSize(96, 110);

    const shadow = this.scene.add.ellipse(0, 50, 70, 12, 0x000000, 0.4);

    const bag = this.scene.add.graphics();
    bag.fillStyle(0xb89060, 1);
    bag.fillRoundedRect(-32, -40, 64, 78, 6);
    bag.lineStyle(2, 0x6a4828, 1);
    bag.strokeRoundedRect(-32, -40, 64, 78, 6);
    bag.fillStyle(0x8a6840, 1);
    bag.fillRect(-32, -40, 64, 14);

    const glyphCircle = this.scene.add.circle(0, -2, 18, 0xefe6cf);
    glyphCircle.setStrokeStyle(2, 0x3a2818);

    const glyph = this.scene.add.text(0, -2, this.def.glyph, {
      fontFamily: "Georgia, serif",
      fontSize: 26,
      color: rgbToHex(this.def.color),
    }).setOrigin(0.5);

    const label = this.scene.add.text(0, 32, this.def.label, {
      fontFamily: "Georgia, serif",
      fontSize: 13,
      color: "#3a2818",
      fontStyle: "italic",
    }).setOrigin(0.5);

    const ring = this.scene.add.circle(0, 0, 50, 0xffd76a, 0);
    ring.setStrokeStyle(3, 0xffd76a, 0.9);
    ring.setVisible(false);

    c.add([shadow, bag, glyphCircle, glyph, label, ring]);
    c.setInteractive(new Phaser.Geom.Rectangle(-32, -40, 64, 90), Phaser.Geom.Rectangle.Contains);

    c.on("pointerdown", () => this.handleSelect());
    c.on("pointerover", () => this.scene.input.manager.canvas.style.cursor = "pointer");
    c.on("pointerout", () => this.scene.input.manager.canvas.style.cursor = "default");

    this.root = c;
    this.ringEl = ring;
  }

  handleSelect() {
    if (this.disabled) return;
    this.state.selectSeed(this.type);
  }

  setSelected(yes) {
    this.ringEl.setVisible(yes);
    this.scene.tweens.add({
      targets: this.root,
      y: yes ? this.y - 14 : this.y,
      duration: 220,
      ease: "Cubic.easeOut",
    });
  }

  setDisabled(yes) {
    this.disabled = yes;
    this.root.setAlpha(yes ? 0.35 : 1);
  }

  destroy() {
    this.root.destroy();
  }
}

function rgbToHex(n) {
  return "#" + n.toString(16).padStart(6, "0");
}
