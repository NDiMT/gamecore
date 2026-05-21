import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, TEX_PLANTS, TEX_ROOM, FRAMES } from "../constants.js";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    this.cameras.main.setBackgroundColor("#06040c");
    const bar = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, 320, 6, 0x3a2818);
    const fill = this.add.rectangle(GAME_WIDTH/2 - 160, GAME_HEIGHT/2, 0, 6, 0xc9a25c).setOrigin(0, 0.5);
    this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 32, "CHRONOS", {
      fontFamily: "Georgia, serif", fontSize: 36, color: "#c9a25c", letterSpacing: 4,
    }).setOrigin(0.5);

    this.load.on("progress", (p) => { fill.width = 320 * p; });
    this.load.image(TEX_ROOM, "sprites/room_v3.png");
    this.load.image(TEX_PLANTS, "sprites/plants_v3.png");
  }

  create() {
    const tex = this.textures.get(TEX_PLANTS);
    Object.entries(FRAMES).forEach(([name, f]) => {
      tex.add(name, 0, f.x, f.y, f.w, f.h);
    });
    this.scene.start("GameScene");
  }
}
