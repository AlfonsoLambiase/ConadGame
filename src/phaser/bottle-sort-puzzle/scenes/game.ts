import Phaser from "phaser";

import {UIManager} from "../components/UIManager";
import {AudioManager} from "../components/audioManager";
import {BottleSortPuzzleAssetConf} from "../shared/config/asset-conf.const";
import {StarsEffectManager} from "../components/starsEffectManager";

import {TimerManager} from "./timer-manager";
import {ExitManager} from "./exit-manager";
import {BottleSortPuzzleManager} from "./bottle-sort-puzzle-manager";

export class Game extends Phaser.Scene {
  bottleSortPuzzleManager!: BottleSortPuzzleManager;
  audioManager!: AudioManager;
  timerManager!: TimerManager;
  uiManager!: UIManager;

  exitButton!: Phaser.GameObjects.GameObject;
  theme?: Phaser.Sound.BaseSound;

  valueScale!: number;

  private globalScale: number = 1;

  private typeImage!: number;

  private isGameOver: boolean = false; // controllo aggiuntivo per evitare che possa andare 2 volte in gameOver

  starsEffectManager!: StarsEffectManager;

  constructor() {
    super({key: BottleSortPuzzleAssetConf.scene.game});
  }

  init(data: {typeImage: number} = {typeImage: 0}) {
    this.typeImage = data.typeImage ?? 0;
    console.log("GameScene Bottle sort puzzle: ", this.typeImage);
  }

  create() {
    this.setGlobalScale();

    this.initializeBottleSortPuzzleManager();

    console.log(" Start game bottle sort puzzle");

    this.starsEffectManager = new StarsEffectManager(this);

    this.uiManager = new UIManager(this);
    this.uiManager.setGameScene(this);
    this.uiManager.createUI();

    this.audioManager = new AudioManager(this);
    this.audioManager.loadAudios();
    // this.audioManager.playBackgroundMusic();

    const exitManager = this.scene.get(BottleSortPuzzleAssetConf.scene.exitManager) as ExitManager;

    exitManager.setGameScene(this);
    this.exitButton = exitManager.createExitButton(this, this.theme);
    this.scene.bringToTop(BottleSortPuzzleAssetConf.scene.exitManager);

    this.scene.launch(BottleSortPuzzleAssetConf.scene.timerManager);
    this.timerManager = this.scene.get(
      BottleSortPuzzleAssetConf.scene.timerManager,
    ) as TimerManager;
    this.timerManager.setGameScene(this);
    this.timerManager.startTimer();

    this.addLogoPhaser();
  }

  private initializeBottleSortPuzzleManager() {
    if (!this.scene.manager.getScene(BottleSortPuzzleAssetConf.scene.bottleSortManager)) {
      this.scene.manager.add(
        BottleSortPuzzleAssetConf.scene.bottleSortManager,
        BottleSortPuzzleManager,
        false,
      );
    }

    this.scene.launch(BottleSortPuzzleAssetConf.scene.bottleSortManager, {
      gameScene: this,
    });

    this.bottleSortPuzzleManager = this.scene.get(
      BottleSortPuzzleAssetConf.scene.bottleSortManager,
    ) as BottleSortPuzzleManager;
  }

  addLogoPhaser() {
    const logoPhaser = this.add.image(this.scale.width - 50, this.scale.height - 50, "logoPhaser");
    logoPhaser.setOrigin(0.5).setDepth(-1).setScale(this.setDynamicValueBasedOnScale(0.7, 1.0));
  }

  getGlobalScale(): number {
    return this.globalScale;
  }

  setGlobalScale() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const realWidth = cssWidth * pixelRatio;
    const realHeight = cssHeight * pixelRatio;

    const config = this.sys.game.config as {width: number; height: number};

    const refW = 1080;
    const refH = 1920;

    const scaleX = config.width as number / refW;
    const scaleY = config.height as number / refH;

    const calculatedScale = Math.min(scaleX, scaleY);

    const minScale = 0.59;
    const maxScale = 1.2;

    let globalScale = Math.min(maxScale, Math.max(minScale, calculatedScale));

    const isBigScreen = realWidth >= 2500 || realHeight >= 1400;

    if (!isBigScreen && cssWidth < 750 && cssHeight < 450) {
      globalScale *= 0.7;
    }

    this.globalScale = Math.round(globalScale * 100) / 100;

    console.log("Scala applicata tutorial:", this.globalScale);
    console.log("Dimensioni scena width height:", config.width, config.height);
  }

  setDynamicValueBasedOnScale(minValue: number, maxValue: number): number {
    if (this.globalScale >= 1) return maxValue;
    if (this.globalScale <= 0.5) return minValue;
    const minScale = 0.5,
      maxScale = 1;
    const t = (this.globalScale - minScale) / (maxScale - minScale);

    return minValue + t * (maxValue - minValue);
  }

  startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    const spriteLeft = this.add
      .sprite(0, config.height / 2, BottleSortPuzzleAssetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(
        BottleSortPuzzleAssetConf.spritesheet.confetti_left.key,
        {
          start: 0,
          end: 54,
        },
      ),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    const spriteRight = this.add
      .sprite(
        config.width,
        config.height / 2,
        BottleSortPuzzleAssetConf.spritesheet.confetti_right.key,
      )
      .setOrigin(1, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    this.anims.create({
      key: "animConfettiRight",
      frames: this.anims.generateFrameNumbers(
        BottleSortPuzzleAssetConf.spritesheet.confetti_right.key,
        {
          start: 0,
          end: 54,
        },
      ),
      frameRate: 20,
    });

    spriteRight.play("animConfettiRight");
  }

  gameOver(): void {
    if (!this.isGameOver) {
      this.isGameOver = true;
      this.bottleSortPuzzleManager.isGameOver = true;
      this.bottleSortPuzzleManager.canShoot = false;

      let delay = 1000;

      if (this.uiManager.score >= this.uiManager.maxScore) {
        console.log("HAI VINTO LA PARTITA COMPLIMENTI!!!");
        this.startAnimConfetti();
        delay = 3000;
        this.audioManager.playAudio(BottleSortPuzzleAssetConf.audio.endWin);
      } else {
        console.log("HAI PERSO LA PARTITA!!!");
        delay = 1000;
        this.audioManager.playAudio(BottleSortPuzzleAssetConf.audio.endFailed);
      }

      this.time.delayedCall(delay, () => {
        if (this.theme) this.theme.stop();
        this.scene.start(BottleSortPuzzleAssetConf.scene.outro, {
          resultStatus: this.uiManager.score >= this.uiManager.maxScore ? "Win" : "Failed",
        });
      });

      console.log("Gioco finito!");
    }
  }
}
