import {BubbleShooterAssetConf} from "../config/asset-conf.const";

export const tileSize: number = 64;

export const loadAudios = (scene: Phaser.Scene) => {
  for (const key in BubbleShooterAssetConf.audio) {
    scene.load.audio(key, `/games/bubble-shooter/sounds/${key}.mp3`);
  }
};

export const loadSpritesheets = (scene: Phaser.Scene) => {
  for (const [key, value] of Object.entries(BubbleShooterAssetConf.spritesheet)) {
    scene.load.spritesheet(key, `/games/bubble-shooter/images/${key}.png`, {
      frameWidth: value.frameWidth,
      frameHeight: value.frameHeight,
    });
  }
};

export const loadImages = (scene: Phaser.Scene) => {
  for (const key in BubbleShooterAssetConf.image) {
    scene.load.image(key, `/games/bubble-shooter/images/${key}.png`);
  }
};

export const loadFonts = (scene: Phaser.Scene) => {
  for (const key in BubbleShooterAssetConf.font) {
    scene.load.font("Paytone One", `/games/bubble-shooter/fonts/${key}.ttf`, "truetype");
  }
};
