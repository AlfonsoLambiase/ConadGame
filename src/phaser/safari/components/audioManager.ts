import * as Phaser from "phaser";

import {SafariAssetConf} from "../shared/config/asset-conf.const";

const assetConf = SafariAssetConf; //* Generalizzazione

type AudioKey = keyof typeof assetConf.audio;

export class AudioManager {
  private scene: Phaser.Scene;
  audios: Partial<Record<AudioKey, Phaser.Sound.BaseSound>> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  loadAudios(): void {
    for (const key in assetConf.audio) {
      this.audios[key as AudioKey] = this.scene.sound.add(key);
    }
  }

  playAudio(key: AudioKey, config?: Phaser.Types.Sound.SoundConfig): void {
    const sound = this.audios[key];

    if (!sound) {
      return;
    }

    if (sound.isPlaying) {
      sound.stop();
    }

    sound.play(config);
  }

  playLoop(key: AudioKey, volume = 0.7): void {
    this.playAudio(key, {loop: true, volume});
  }

  stopAudio(key: AudioKey): void {
    this.audios[key]?.stop();
  }

  /** Riproduce `key` quando `waitForKey` è terminato, poi un piccolo delay opzionale */
  playAudioAfterSoundEnds(
    waitForKey: AudioKey,
    key: AudioKey,
    delayMs = 0,
    onPlay?: () => void,
  ): void {
    const waitSound = this.audios[waitForKey];

    const playNext = () => {
      this.scene.time.delayedCall(delayMs, () => {
        this.playAudio(key);
        onPlay?.();
      });
    };

    if (waitSound?.isPlaying) {
      waitSound.once(Phaser.Sound.Events.COMPLETE, playNext);

      return;
    }

    playNext();
  }

  playBackgroundMusic(): void {
    this.playLoop("music", 0.7);
  }
}

//* Metodo per richiamarlo
//  this.gameScene.audioManager.playAudio("success");
