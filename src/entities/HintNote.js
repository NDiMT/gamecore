export class HintNote {
  constructor(scene, x, y, opts) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.title = opts.title || "";
    this.body = opts.body || "";
    this.iconText = opts.icon || "✒";
    this.kind = opts.kind || "note";
    this.modalOpen = false;
    this.build();
  }

  build() {
    const c = this.scene.add.container(this.x, this.y);
    c.setSize(72, 72);

    const bg = this.scene.add.graphics();
    if (this.kind === "note") {
      bg.fillStyle(0xd9c89a, 1);
      bg.fillRoundedRect(-30, -38, 60, 76, 4);
      bg.lineStyle(2, 0x6a4828, 1);
      bg.strokeRoundedRect(-30, -38, 60, 76, 4);
      bg.lineStyle(1, 0x8a6f3a, 0.6);
      for (let i = -22; i < 30; i += 8) {
        bg.lineBetween(-22, i, 22, i);
      }
    } else {
      bg.fillStyle(0x6a4828, 1);
      bg.fillRoundedRect(-32, -40, 64, 80, 6);
      bg.lineStyle(2, 0x3a2010, 1);
      bg.strokeRoundedRect(-32, -40, 64, 80, 6);
      bg.fillStyle(0x3a2010, 1);
      bg.fillRect(-32, -10, 64, 6);
      bg.fillStyle(0xc9a25c, 1);
      bg.fillCircle(0, -6, 4);
    }

    const icon = this.scene.add.text(0, 0, this.iconText, {
      fontFamily: "Georgia, serif",
      fontSize: this.kind === "note" ? 24 : 28,
      color: this.kind === "note" ? "#3a2818" : "#c9a25c",
    }).setOrigin(0.5);

    const ring = this.scene.add.circle(0, 0, 44, 0xffd76a, 0);
    ring.setStrokeStyle(2, 0xffd76a, 0.5);

    c.add([bg, icon, ring]);
    c.setInteractive(new Phaser.Geom.Rectangle(-32, -40, 64, 80), Phaser.Geom.Rectangle.Contains);

    c.on("pointerdown", () => this.open());
    c.on("pointerover", () => { this.scene.input.manager.canvas.style.cursor = "pointer"; ring.setStrokeStyle(2, 0xffd76a, 0.9); });
    c.on("pointerout", () => { this.scene.input.manager.canvas.style.cursor = "default"; ring.setStrokeStyle(2, 0xffd76a, 0.5); });

    this.root = c;
  }

  open() {
    if (this.modalOpen) return;
    this.modalOpen = true;
    const sc = this.scene;
    const W = sc.scale.width;
    const H = sc.scale.height;

    const layer = sc.add.container(0, 0).setDepth(1000);
    const bg = sc.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78);
    bg.setInteractive();

    const cardW = Math.min(560, W - 60);
    const cardH = 380;
    const card = sc.add.graphics();
    if (this.kind === "note") {
      card.fillStyle(0xd9c89a, 1);
      card.fillRoundedRect(W/2 - cardW/2, H/2 - cardH/2, cardW, cardH, 14);
      card.lineStyle(3, 0x6a4828, 1);
      card.strokeRoundedRect(W/2 - cardW/2, H/2 - cardH/2, cardW, cardH, 14);
    } else {
      card.fillStyle(0xa0a8b0, 1);
      card.fillRoundedRect(W/2 - cardW/2, H/2 - cardH/2, cardW, cardH, 14);
      card.lineStyle(3, 0x3a4048, 1);
      card.strokeRoundedRect(W/2 - cardW/2, H/2 - cardH/2, cardW, cardH, 14);
    }

    const titleText = sc.add.text(W/2, H/2 - cardH/2 + 36, this.title, {
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontSize: 18,
      color: this.kind === "note" ? "#3a2818" : "#1a1820",
    }).setOrigin(0.5);

    const bodyText = sc.add.text(W/2, H/2 + 14, this.body, {
      fontFamily: "Georgia, serif",
      fontSize: 20,
      color: this.kind === "note" ? "#3a2818" : "#1a1820",
      align: "center",
      lineSpacing: 6,
      wordWrap: { width: cardW - 60 },
    }).setOrigin(0.5);

    const closeBtn = sc.add.text(W/2 + cardW/2 - 26, H/2 - cardH/2 + 22, "✕", {
      fontFamily: "Arial",
      fontSize: 24,
      color: this.kind === "note" ? "#3a2818" : "#1a1820",
    }).setOrigin(0.5).setInteractive();

    layer.add([bg, card, titleText, bodyText, closeBtn]);

    const close = () => {
      layer.destroy();
      this.modalOpen = false;
    };

    bg.on("pointerdown", close);
    closeBtn.on("pointerdown", close);
  }

  destroy() {
    this.root.destroy();
  }
}
