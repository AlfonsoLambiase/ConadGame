/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import * as Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {IndovinaNumeroAssetConf} from "../shared/config/asset-conf.const";

import {getDefaultStage, IndovinaNumeroStage} from "./stage";
import {Game} from "./game";

const assetConf = IndovinaNumeroAssetConf; //* Generalizzazione

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private static readonly GAME_DEPTH_BACKGROUND = -3;
  private static readonly GAME_DEPTH_FOREGROUND = -2;
  private static readonly GAME_BACKGROUND_DELAY_MS = 100;

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
    console.log("Start Scene Indovina numero");
    this.computeLayoutDimensions();

    this.time.delayedCall(GameManager.GAME_BACKGROUND_DELAY_MS, () => {
      this.#createGameBackground();
    });

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });
  }

  #getCurrentStage(): IndovinaNumeroStage {
    return this.gameScene.registry.get(assetConf.registry.currentStage) ?? getDefaultStage();
  }

  /** Sfondo stage sulla scena Game, dopo l'overlay UI in UIManager. */
  #createGameBackground(): void {
    const stage = this.#getCurrentStage();
    const scene = this.gameScene;
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;

    scene.add
      .image(centerX, centerY, stage.backgroundStage)
      .setDepth(GameManager.GAME_DEPTH_BACKGROUND)
      .setScrollFactor(0)
      .setDisplaySize(scene.scale.width, scene.scale.height);

    scene.add
      .image(centerX, centerY, stage.foregroundStage)
      .setOrigin(0.5)
      .setScale(scene.setDynamicValueBasedOnScale(0.5, 1.0))
      .setDepth(GameManager.GAME_DEPTH_FOREGROUND)
      .setScrollFactor(0);
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
