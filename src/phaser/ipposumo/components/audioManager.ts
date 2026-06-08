import * as Phaser from "phaser";

import {IpposumoAssetConf} from "../shared/config/asset-conf.const";

const assetConf = IpposumoAssetConf; //* Generalizzazione

export class AudioManager {
  private scene: Phaser.Scene;
  audios: {[key: string]: Phaser.Sound.BaseSound} = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  loadAudios(): void {
    for (const key in assetConf.audio) {
      this.audios[key] = this.scene.sound.add(key);
    }
  }

  playAudio(key: keyof typeof assetConf.audio): void {
    if (this.audios[key]) {
      this.audios[key].play();
    }
  }

  playBackgroundMusic(): void {
    const theme = this.scene.sound.add(assetConf.audio.music);

    theme.play({
      loop: true,
      volume: 0.7,
    });
  }
}

//* Metodo per richiamarlo
//  this.gameScene.audioManager.playAudio(assetConf.audio.bubblepop);
