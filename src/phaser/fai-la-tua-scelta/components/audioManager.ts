import * as Phaser from "phaser";

import {FaiLaTuaSceltaAssetConf} from "../shared/config/asset-conf.const";

const assetConf = FaiLaTuaSceltaAssetConf; //* Generalizzazione

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
    const theme = this.audios[assetConf.audio.music];
    if (!theme) return;
    if (theme.isPlaying) return;

    theme.play({
      loop: true,
      volume: 0.7,
    });
  }

  stopBackgroundMusic(): void {
    const theme = this.audios[assetConf.audio.music];
    if (theme?.isPlaying) theme.stop();
  }
}

//* Metodo per richiamarlo
//  this.gameScene.audioManager.playAudio(assetConf.audio.bubblepop);
