import {RitmoGiustoAssetConf} from "../config/asset-conf.const";

const assetConf = RitmoGiustoAssetConf; //* Generalizzazione
const gameName = "ritmo-giusto"; //* Generalizzazione

export const tileSize: number = 64;

export const loadAudios = (scene: Phaser.Scene) => {
  for (const key in assetConf.audio) {
    scene.load.audio(key, `/games/${gameName}/sounds/${key}.mp3`);
  }
};

export const loadSpritesheets = (scene: Phaser.Scene) => {
  for (const [key, value] of Object.entries(assetConf.spritesheet)) {
    scene.load.spritesheet(key, `/games/${gameName}/images/${key}.png`, {
      frameWidth: value.frameWidth,
      frameHeight: value.frameHeight,
    });
  }
};

export const loadImages = (scene: Phaser.Scene) => {
  for (const key in assetConf.image) {
    scene.load.image(key, `/games/${gameName}/images/${key}.png`);
  }
};

export const loadFonts = (scene: Phaser.Scene) => {
  for (const key in assetConf.font) {
    scene.load.font("Paytone One", `/games/${gameName}/fonts/${key}.ttf`, "truetype");
  }
};
