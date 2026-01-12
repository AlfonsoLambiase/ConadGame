/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import {CreaParoleAssetConf} from "../shared/config/asset-conf.const";

import {PhaserEvents} from "@/lib/phaser-events";
import {EventBus} from "@/phaser/EventBus";

const assetConf = CreaParoleAssetConf; //* Generalizzazione

export class Outro extends Phaser.Scene {
  imageKey: string = "endFailed"; // di default è endFailed

  constructor() {
    super({key: assetConf.scene.outro});
  }

  init({resultStatus}: {resultStatus: "Failed" | "Win"}) {
    if (resultStatus !== "Failed") {
      this.imageKey = `end${resultStatus}`;
    }

  this.time.delayedCall(
      3000,
      () => {
        // redirect a root della app
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      },
      [],
      this,
    );
  }

  create() {
    //this.imageKey = `endFailed`; //* solo per test
    //this.imageKey = `endWin`; //* solo per test

    const {width, height} = this.scale;

    // Sfondo centrato e deformato per coprire tutto
    const background = this.add
      .image(width / 2, height / 2, assetConf.image.endBackground)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(width, height);

    // Immagine principale con origine in basso al centro
    const foreground = this.add.image(width / 2, height, this.imageKey).setOrigin(0.5, 1); // Origine in basso al centro

    // Calcola scala proporzionale in base alla larghezza dello schermo
    const scale = width / foreground.width;

    foreground.setScale(scale);

    console.log("registry.score: ", this.registry.get(assetConf.registry.score));
  }
}
