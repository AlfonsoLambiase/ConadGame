import * as Phaser from "phaser";

import {BasketAssetConf} from "../shared/config/asset-conf.const";

export class AudioManager {
  private scene: Phaser.Scene;
  audios: {[key: string]: Phaser.Sound.BaseSound} = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  loadAudios(): void {
    for (const key in BasketAssetConf.audio) {
      this.audios[key] = this.scene.sound.add(key);
    }
  }

  playAudio(key: keyof typeof BasketAssetConf.audio): void {
    if (this.audios[key]) {
      this.audios[key].play();
    }
  }

  playBackgroundMusic(): void {
    const theme = this.scene.sound.add(BasketAssetConf.audio.music);

    theme.play({
      loop: true,
      volume: 0.7,
    });
  }
}

//* Metodo per richiamarlo
//  this.gameScene.audioManager.playAudio(GameDemo02AssetConf.audio.bubblepop);
