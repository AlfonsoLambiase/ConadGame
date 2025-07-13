import {BottleSortPuzzleAssetConf} from "../config/asset-conf.const";

export const tileSize: number = 64;

export const loadAudios = (scene: Phaser.Scene) => {
  for (const key in BottleSortPuzzleAssetConf.audio) {
    scene.load.audio(key, `/games/bottle-sort-puzzle/sounds/${key}.mp3`);
  }
};

export const loadSpritesheets = (scene: Phaser.Scene) => {
  for (const [key, value] of Object.entries(BottleSortPuzzleAssetConf.spritesheet)) {
    scene.load.spritesheet(key, `/games/bottle-sort-puzzle/images/${key}.png`, {
      frameWidth: value.frameWidth,
      frameHeight: value.frameHeight,
    });
  }
};

export const loadImages = (scene: Phaser.Scene) => {
  for (const key in BottleSortPuzzleAssetConf.image) {
    scene.load.image(key, `/games/bottle-sort-puzzle/images/${key}.png`);
  }
};

export const loadFonts = (scene: Phaser.Scene) => {
  for (const key in BottleSortPuzzleAssetConf.font) {
    scene.load.font("Paytone One", `/games/bottle-sort-puzzle/fonts/${key}.ttf`, "truetype");
  }
};
