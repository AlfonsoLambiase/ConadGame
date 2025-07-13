import {BasketAssetConf} from "../config/asset-conf.const";

export const tileSize: number = 64;

export const loadAudios = (scene: Phaser.Scene) => {
  for (const key in BasketAssetConf.audio) {
    scene.load.audio(key, `/games/basket/sounds/${key}.mp3`);
  }
};

export const loadSpritesheets = (scene: Phaser.Scene) => {
  for (const [key, value] of Object.entries(BasketAssetConf.spritesheet)) {
    scene.load.spritesheet(key, `/games/basket/images/${key}.png`, {
      frameWidth: value.frameWidth,
      frameHeight: value.frameHeight,
    });
  }
};

export const loadImages = (scene: Phaser.Scene) => {
  for (const key in BasketAssetConf.image) {
    scene.load.image(key, `/games/basket/images/${key}.png`);
  }
};

export const loadFonts = (scene: Phaser.Scene) => {
  for (const key in BasketAssetConf.font) {
    scene.load.font("Paytone One", `/games/basket/fonts/${key}.ttf`, "truetype");
  }
};
