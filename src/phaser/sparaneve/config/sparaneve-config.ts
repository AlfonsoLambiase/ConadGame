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


// //! 
// // Riconoscimento mobile
// const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// // Calcolo dimensioni dinamiche per desktop/mobile
// function calculateGameDimensions(orientation: "landscape" | "portrait") {
//   if (isMobile) {
//     // Su mobile usiamo le dimensioni reali del device
//     const width = window.innerWidth * window.devicePixelRatio;
//     const height = window.innerHeight * window.devicePixelRatio;

//     console.log('Mobile config:', { 
//       screenWidth: window.innerWidth,
//       screenHeight: window.innerHeight,
//       devicePixelRatio: window.devicePixelRatio,
//       gameWidth: width,
//       gameHeight: height,
//       orientation
//     });

//     return { width, height };
//   } else {
//     // Su desktop forziamo l'orientamento ma manteniamo la tua logica adattiva
//     const screenWidth = window.innerWidth;
//     const screenHeight = window.innerHeight;

//     let width, height;

//     if (orientation === "landscape") {
//       height = 1080;
//       width = Math.round((1080 * screenWidth) / screenHeight);
//     } else {
//       width = 1080;
//       height = Math.round((1080 * screenHeight) / screenWidth);
//     }

//     console.log('Desktop config:', {
//       screenWidth,
//       screenHeight,
//       gameWidth: width,
//       gameHeight: height,
//       orientation,
//     });

//     return { width, height };
//   }
// }

// // FUNZIONE GENERALE CHE UNIFICA TUTTO
// export const createGameConfig = (
//   orientation: "landscape" | "portrait",
//   scenes: (typeof Phaser.Scene)[]
// ): Phaser.Types.Core.GameConfig => {
  
//   const { width, height } = calculateGameDimensions(orientation);

//   return {
//     type: Phaser.AUTO,
//     parent: "game-container",
//     transparent: true,

//     width,
//     height,

//     scale: {
//       mode: Phaser.Scale.FIT,
//       autoCenter: Phaser.Scale.CENTER_BOTH,
//       expandParent: !isMobile,
//     },

//     physics: {
//       default: "arcade",
//       arcade: {
//         gravity: { y: 0, x: 0 },
//         debug: false,
//       },
//     },

//     input: { activePointers: 3 },
//     scene: scenes,
//   };
// };




// export const createGameConfig = (
//   orientation: "landscape" | "portrait",
//   scenes: (typeof Phaser.Scene)[]
// ): Phaser.Types.Core.GameConfig => {
  
//   // se siamo in portrait e il gioco deve essere landscape → inverti dimensioni
//   const isPortrait = window.innerHeight > window.innerWidth;

//   let width = window.innerWidth;
//   let height = window.innerHeight;

//   if (orientation === "landscape" && isPortrait) {
//     width = window.innerHeight;  // inverti
//     height = window.innerWidth;
//   }

//   return {
//     type: Phaser.AUTO,
//     width,
//     height,

//     parent: "game-container",
//     transparent: true,

//     scale: {
//       mode: Phaser.Scale.FIT,
//       autoCenter: Phaser.Scale.CENTER_BOTH,
//       expandParent: true,
//     },

//     physics: {
//       default: "arcade",
//       arcade: { gravity: { y: 0, x: 0 }, debug: false },
//     },

//     input: { activePointers: 3 },
//     scene: scenes,
//   };
// };

// sparaneve-config.ts
import * as Phaser from "phaser";

export const createGameConfig = (
  orientation: "landscape" | "portrait",
  scenes: (typeof Phaser.Scene)[],
  opts?: { forcePortraitRotation?: boolean }
): Phaser.Types.Core.GameConfig => {
  const isPortrait = window.innerHeight > window.innerWidth;
  let width = window.innerWidth;
  let height = window.innerHeight;

  // se voglio landscape ma sono in portrait e uso fallback rotation -> inverti
  if (orientation === "landscape" && opts?.forcePortraitRotation && isPortrait) {
    width = window.innerHeight;
    height = window.innerWidth;
  } else {
    // logica base: tieni proporzioni standard (puoi affinare)
    if (orientation === "landscape") {
      // base landscape design 1920x1080, scala in base al viewport
      const targetHeight = 1080;
      width = Math.round((targetHeight * window.innerWidth) / window.innerHeight);
      height = targetHeight;
    } else {
      const targetWidth = 1080;
      width = targetWidth;
      height = Math.round((targetWidth * window.innerHeight) / window.innerWidth);
    }
  }

  return {
    type: Phaser.AUTO,
    width,
    height,
    parent: "game-container",
    transparent: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false,
      },
    },
    input: { activePointers: 3 },
    scene: scenes,
  };
};


// Config per gioco landscape
export const GameSparaNeveConfig = createGameConfig("landscape", []);

// Config per gioco portrait
export const AltroGiocoConfig = createGameConfig("portrait", []);
