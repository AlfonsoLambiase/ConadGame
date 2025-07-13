 
import {BasketAssetConf} from "../shared/config/asset-conf.const";

// import {PhaserEvents} from "@/lib/phaser-events";
// import {EventBus} from "@/phaser/EventBus";
import router from "next/router";

export class Outro extends Phaser.Scene {
  imageKey: string = "endFailed"; // di default è endFailed

  constructor() {
    super({key: BasketAssetConf.scene.outro});
  }

  init({resultStatus}: {resultStatus: "Failed" | "Win"}) {
    if (resultStatus !== "Failed") {
      this.imageKey = `end${resultStatus}`;
    }

    this.time.delayedCall(
      3000,
      () => {
         
      router.push("/");
      },
      [],
      this,
    );
  }

  create() {
    const {width, height} = this.scale; // Ottieni le dimensioni del canvas

    const image = this.add.image(width / 2, height / 2, this.imageKey).setOrigin(0.5, 0.5);

    image.setDisplaySize(this.scale.width, this.scale.height); //* Questo deforma

    //! Metodo alternativo vedere quale si adatta di piu.
    // Calcola il fattore di scala mantenendo il rapporto d'aspetto //* Questo non dovrebbe deformare ma puo ritagliare
    // const scaleX = width / image.width;
    // const scaleY = height / image.height;
    // const scale = Math.max(scaleX, scaleY); // Usa il più grande per coprire tutto il canvas
    //image.setScale(scale);

    console.log("registry.score: ", this.registry.get(BasketAssetConf.registry.score));
  }
}
