export const GameSparaNeveConfig: Phaser.Types.Core.GameConfig = {
  //type: Phaser.CANVAS,
  type: Phaser.AUTO, // modificato per lo shader "snow" perche non funziona in canvas, creare un immagine fissa
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



// // Funzione helper per creare config con orientamento
// const createGameConfig = (
//   orientation: 'landscape' | 'portrait',
//   scenes: (typeof Phaser.Scene)[]
// ): Phaser.Types.Core.GameConfig => {
//   const landscape = { width: 1920, height: 1080 };
//   const portrait = { width: 1080, height: 1920 };
  
//   const dimensions = orientation === 'landscape' ? landscape : portrait;

//   return {
//     type: Phaser.AUTO,
//     width: dimensions.width,
//     height: dimensions.height,
//     parent: "game-container",
//     autoRound: false,
//     scale: {
//       mode: Phaser.Scale.FIT,
//       autoCenter: Phaser.Scale.CENTER_BOTH,
//     },
//     physics: {
//       default: "arcade",
//       arcade: {
//         gravity: { y: 0, x: 0 },
//         debug: false,
//       },
//     },
//     transparent: true,
//     input: {
//       activePointers: 3,
//     },
//     scene: scenes,
//   };
// };

// // Config per gioco landscape
// export const GameSparaNeveConfig = createGameConfig('landscape', []);

// // Config per gioco portrait (esempio)
// export const AltroGiocoConfig = createGameConfig('portrait', []);




/*
// Quando inizializzi il gioco landscape
document.getElementById('game-container')?.classList.add('landscape');

// Oppure per portrait
document.getElementById('game-container')?.classList.add('portrait');
*/