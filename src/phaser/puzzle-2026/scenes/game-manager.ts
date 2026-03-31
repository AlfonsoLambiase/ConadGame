import * as Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {Puzzle2026AssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = Puzzle2026AssetConf; //* Generalizzazione

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    console.log("Start Scene GameManager Puzzle 2026");
    this.computeLayoutDimensions();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });
  }

  //* Scopo: Calcola le dimensioni e la posizione centrale dell’area di gioco (background),
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
    //console.log("marginTop: ", this.marginTop);
  }

  //* Scopo: Controlla se non ci sono piu file disponibile e attiva il gameOver
  checkGameOver() {
    if (this.isGameOver) {
      console.log(`GAME OVER:`);

      this.canShoot = false;

      this.scene.pause();
      this.gameScene.gameOver(); // toglierlo da qui e metterlo in outro, una volta creato.
    }
  }
}
