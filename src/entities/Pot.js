import Phaser from "phaser";
import { SEEDS, TEX_PLANTS, ERA_PAST, ERA_FUTURE } from "../constants.js";

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
    const halo = this.scene.add.ellipse(0, 60, 130, 18, 0x000000, 0.5);
    this.spriteSlot = this.scene.add.container(0, 0);

    const labelBg = this.scene.add.rectangle(0, -88, 1, 22, 0x000000, 0.45);
    labelBg.setStrokeStyle(1, 0x8a6f3a, 0.5);
    const label = this.scene.add.text(0, -88, this.def.labelGr, {
      fontFamily: "Georgia, serif", fontSize: 12, color: "#f0d9a8", fontStyle: "italic",
    }).setOrigin(0.5);
    labelBg.width = label.width + 16;

    const ring = this.scene.add.circle(0, 0, 80, 0xffd76a, 0);
    ring.setStrokeStyle(3, 0xffd76a, 0);

    c.add([halo, this.spriteSlot, labelBg, label, ring]);
    c.setSize(140, 200);
    c.setInteractive(new Phaser.Geom.Rectangle(-70, -100, 140, 200), Phaser.Geom.Rectangle.Contains);
    c.on("pointerdown", () => this.handleClick());
    c.on("pointerover", () => ring.setStrokeStyle(3, 0xffd76a, 0.7));
    c.on("pointerout", () => ring.setStrokeStyle(3, 0xffd76a, 0));

    this.root = c;
    this.ring = ring;
  }

  handleClick() {
    if (this.state.era !== ERA_PAST) return;
    const planted = this.state.plantedAt(this.def.id);
    if (this.state.selectedSeed) {
      this.state.plant(this.def.id, this.state.selectedSeed);
      this.state.clearSelection();
    } else if (planted && !this.state.isWatered(this.def.id)) {
      this.state.uproot(this.def.id);
    }
  }

  refresh() {
    this.spriteSlot.removeAll(true);
    const planted = this.state.plantedAt(this.def.id);
    if (!planted) {
      const empty = this.scene.add.image(0, 0, TEX_PLANTS, "pot_empty");
      empty.setDisplaySize(140, 175);
      this.spriteSlot.add(empty);
      return;
    }
    const def = SEEDS[planted];
    let stage;
    if (this.state.era === ERA_PAST) {
      stage = this.state.isWatered(this.def.id) ? 1 : 0;
    } else {
      stage = this.state.isWatered(this.def.id) ? 3 : 2;
    }
    const frame = def.plantFrames[stage];
    const sp = this.scene.add.image(0, 0, TEX_PLANTS, frame);
    sp.setDisplaySize(150, 190);
    this.spriteSlot.add(sp);
  }

  setVisible(v) { this.root.setVisible(v); }
}
