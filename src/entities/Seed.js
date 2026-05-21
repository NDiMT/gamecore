import Phaser from "phaser";
import { SEEDS, TEX_PLANTS } from "../constants.js";

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

    const halo = this.scene.add.ellipse(0, 60, 110, 18, 0x000000, 0.35);

    const sprite = this.scene.add.image(0, 0, TEX_PLANTS, this.def.bagFrame);
    sprite.setOrigin(0.5, 0.5);
    sprite.displayHeight = 130;
    sprite.scaleX = sprite.scaleY;

    const label = this.scene.add.text(0, 86, this.def.label, {
      fontFamily: "Georgia, serif", fontSize: 14, color: "#f0d9a8", fontStyle: "italic",
      shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 2, fill: true },
    }).setOrigin(0.5);

    const ring = this.scene.add.circle(0, 0, 76, 0xffd76a, 0);
    ring.setStrokeStyle(4, 0xffd76a, 0);

    c.add([halo, sprite, label, ring]);
    c.setSize(120, 180);
    c.setInteractive(new Phaser.Geom.Rectangle(-60, -90, 120, 180), Phaser.Geom.Rectangle.Contains);
    c.on("pointerdown", () => this.handleSelect());

    this.root = c;
    this.ring = ring;
    this.sprite = sprite;
  }

  handleSelect() {
    if (this.disabled) return;
    this.state.selectSeed(this.type);
  }

  setSelected(yes) {
    this.ring.setStrokeStyle(4, 0xffd76a, yes ? 0.9 : 0);
    this.scene.tweens.add({
      targets: this.root,
      y: yes ? this.y - 16 : this.y,
      duration: 220,
      ease: "Cubic.easeOut",
    });
  }

  setDisabled(yes) {
    this.disabled = yes;
    this.sprite.setAlpha(yes ? 0.25 : 1);
  }

  setVisible(v) { this.root.setVisible(v); }
}
