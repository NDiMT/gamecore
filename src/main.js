import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, TESTING_BG_COLOR, PRODUCTION_BG_COLOR, TESTING_GREEN_BG } from "./constants.js";
import { GameScene } from "./scenes/GameScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: TESTING_GREEN_BG ? TESTING_BG_COLOR : PRODUCTION_BG_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
};

new Phaser.Game(config);
