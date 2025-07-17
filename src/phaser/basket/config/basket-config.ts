export const GameDemo02Config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 1920,
  height: 1080,
  parent: "game-container",
  autoRound: false,
  scale: {
    mode: Phaser.Scale.ENVELOP, // Fit the game to the screen
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game on the screen
    height: window.innerHeight * window.devicePixelRatio,
    width: window.innerWidth * window.devicePixelRatio,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: {y: 1200, x: 0},
      debug: true,
    },
  },
  transparent: true,
  input: {
    activePointers: 3, // Enable multitouch
  },
  scene: [],
};
