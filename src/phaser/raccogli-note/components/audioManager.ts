import * as Phaser from "phaser";

import {RaccogliNoteAssetConf} from "../shared/config/asset-conf.const";

const assetConf = RaccogliNoteAssetConf; //* Generalizzazione

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

  playAudio(key: keyof typeof assetConf.audio | string): void {
    if (this.audios[key]) {
      this.audios[key].play();
    }
  }

  /** 🎵 Metodo per riprodurre una nota dinamica (es. "note_do", "note_re", ecc.) */
  playAudioNote(noteType: string): void {
    const key = `note_${noteType}`;

    this.playAudio(key);
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
