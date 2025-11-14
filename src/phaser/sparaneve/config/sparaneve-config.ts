// export const GameSparaNeveConfig: Phaser.Types.Core.GameConfig = {
//   //type: Phaser.CANVAS,
//   type: Phaser.AUTO, // modificato per lo shader "snow" perche non funziona in canvas, creare un immagine fissa
//   width: 1920,
//   height: 1080,
//   parent: "game-container",
//   autoRound: false,
//   scale: {
//     mode: Phaser.Scale.ENVELOP, // Fit the game to the screen
//     autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game on the screen
//     height: window.innerHeight * window.devicePixelRatio,
//     width: window.innerWidth * window.devicePixelRatio,
//   },
//   physics: {
//     default: "arcade",
//     arcade: {
//       gravity: {y: 0, x: 0},
//       debug: false,
//     },
//   },
//   transparent: true,
//   input: {
//     activePointers: 3, // Enable multitouch
//   },
//   scene: [],
// };

const w = Math.max(window.innerWidth, window.innerHeight) * window.devicePixelRatio;
const h = Math.min(window.innerWidth, window.innerHeight) * window.devicePixelRatio;

export const GameSparaNeveConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: w,
  height: h,
  parent: "game-container",
  autoRound: false,
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: w,
    height: h,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false,
    },
  },
  transparent: true,
  input: {
    activePointers: 3,
  },
  scene: [],
};
