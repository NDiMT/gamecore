export class Door {
  constructor(scene, x, y, state) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.state = state;
    this.build();
  }

  build() {
    const c = this.scene.add.container(this.x, this.y);

    const frame = this.scene.add.graphics();
    frame.fillStyle(0x1a0e08, 1);
    frame.fillRoundedRect(-60, -110, 120, 220, 8);
    frame.lineStyle(3, 0x3a2010, 1);
    frame.strokeRoundedRect(-60, -110, 120, 220, 8);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x2a1808, 1);
    panel.fillRoundedRect(-50, -100, 100, 200, 6);
    panel.lineStyle(2, 0x6a4828, 1);
    panel.strokeRoundedRect(-50, -100, 100, 200, 6);

    panel.fillStyle(0x3a2010, 1);
    panel.fillRoundedRect(-40, -90, 80, 80, 4);
    panel.fillRoundedRect(-40, 10, 80, 80, 4);
    panel.lineStyle(1, 0x6a4828, 1);
    panel.strokeRoundedRect(-40, -90, 80, 80, 4);
    panel.strokeRoundedRect(-40, 10, 80, 80, 4);

    const handle = this.scene.add.circle(36, 0, 5, 0xc9a25c);
    handle.setStrokeStyle(1, 0x3a2818);

    const glow = this.scene.add.circle(0, 0, 90, 0xffd76a, 0);
    glow.setBlendMode(Phaser.BlendModes.ADD);

    const lockGlyph = this.scene.add.text(0, 0, "🔒", {
      fontFamily: "Arial",
      fontSize: 30,
    }).setOrigin(0.5);

    const labelBg = this.scene.add.rectangle(0, -140, 130, 26, 0x000000, 0.5);
    labelBg.setStrokeStyle(1, 0x8a6f3a, 0.6);
    const labelTxt = this.scene.add.text(0, -140, "πύλη του χρόνου", {
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontSize: 13,
      color: "#f0d9a8",
    }).setOrigin(0.5);

    c.add([glow, frame, panel, handle, lockGlyph, labelBg, labelTxt]);
    c.setInteractive(new Phaser.Geom.Rectangle(-60, -110, 120, 220), Phaser.Geom.Rectangle.Contains);
    c.on("pointerdown", () => this.tryOpen());
    c.on("pointerover", () => this.scene.input.manager.canvas.style.cursor = "pointer");
    c.on("pointerout", () => this.scene.input.manager.canvas.style.cursor = "default");

    this.root = c;
    this.glow = glow;
    this.lockGlyph = lockGlyph;
    this.handle = handle;
    this.panel = panel;
  }

  tryOpen() {
    if (this.state.solved) {
      this.scene.events.emit("door-opened");
    } else {
      this.scene.tweens.add({
        targets: this.root,
        x: { from: this.x - 4, to: this.x },
        duration: 60,
        repeat: 3,
        yoyo: true,
      });
      this.scene.events.emit("door-locked");
    }
  }

  setOpen(open) {
    if (open) {
      this.lockGlyph.setText("✦");
      this.scene.tweens.add({
        targets: this.glow,
        fillAlpha: 0.35,
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
      this.handle.setFillStyle(0xffd76a);
    }
  }

  destroy() {
    this.root.destroy();
  }
}
