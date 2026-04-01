export const ColpoVincenteConfig: Phaser.Types.Core.GameConfig = {
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
  // Solo Matter: con scene registrate via `game.scene.add(key, Class)` Phaser
  // avvia un solo sistema fisico = `physics.default`. Arcade lasciava `this.matter` undefined.
  physics: {
    default: "matter",
    matter: {
      gravity: {y: 0, x: 0},
      debug: false,
    },
  },
  transparent: true,
  input: {
    activePointers: 3, // Enable multitouch
  },
  scene: [],
};
