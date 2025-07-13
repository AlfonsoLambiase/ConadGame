import {BottleSortPuzzleAssetConf} from "../shared/config/asset-conf.const";
import {PhaserEvents} from "@/lib/phaser-events";
import {EventBus} from "@/phaser/EventBus";

export class Outro extends Phaser.Scene {
  imageKey: string = "endFailed";

  constructor() {
    super({key: BottleSortPuzzleAssetConf.scene.outro});
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
    const {width, height} = this.scale;
    const image = this.add.image(width / 2, height / 2, this.imageKey).setOrigin(0.5, 0.5);
    image.setDisplaySize(this.scale.width, this.scale.height);
  }
}
