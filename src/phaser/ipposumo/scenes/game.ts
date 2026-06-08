/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import * as Phaser from "phaser";

import {UIManager} from "../components/UIManager";
import {AudioManager} from "../components/audioManager";
import {IpposumoAssetConf} from "../shared/config/asset-conf.const";
import {StarsEffectManager} from "../components/starsEffectManager";

import {TimerManager} from "./timer-manager";
import {ExitManager} from "./exit-manager";
import {GameManager} from "./game-manager";

const assetConf = IpposumoAssetConf; //* Generalizzazione

export class Game extends Phaser.Scene {
  gameManager!: GameManager;
  audioManager!: AudioManager;
  timerManager!: TimerManager;
  uiManager!: UIManager;

  exitButton!: Phaser.GameObjects.Image;
  theme!: Phaser.Sound.BaseSound;

  valueScale!: number;

  private globalScale: number = 1;

  private isGameOver: boolean = false; // controllo aggiuntivo per eveitare che possa andare 2 volte in gameOver

  starsEffectManager!: StarsEffectManager;

  constructor() {
    super({key: assetConf.scene.game});
  }

  init() {
    console.log("Start Scene Game");
  }

  create() {
    this.setGlobalScale();

    // Inizializza il GameManager
    this.initializeGameManager();

    this.starsEffectManager = new StarsEffectManager(this);

    this.uiManager = new UIManager(this);
    this.uiManager.setGameScene(this);
    this.uiManager.createUI();

    this.audioManager = new AudioManager(this); //* è una semplice classe helper. Si inizializza in questo modo.
    this.audioManager.loadAudios();
    //this.audioManager.playBackgroundMusic(); // ! Attivare musica

    const exitManager = this.scene.get(assetConf.scene.exitManager) as ExitManager;

    exitManager.setGameScene(this);
    this.exitButton = exitManager.createExitButton(this, this.theme);
    this.scene.bringToTop(assetConf.scene.exitManager);

    // this.scene.launch(assetConf.scene.timerManager); //* è una estensione della classe Phaser.Scene. Si inizializza in questo modo.
    // this.timerManager = this.scene.get(assetConf.scene.timerManager) as TimerManager;
    // this.timerManager.setGameScene(this);
    // this.timerManager.startTimer();

    //this.addLogoPhaser();
  }

  private initializeGameManager() {
    // Aggiungi la scena GameManager al scene manager se non è già presente
    if (!this.scene.manager.getScene(assetConf.scene.gameManager)) {
      this.scene.manager.add(assetConf.scene.gameManager, GameManager, false);
    }

    // Avvia la scena GameManager
    this.scene.launch(assetConf.scene.gameManager, {
      gameScene: this,
    });

    // Ottieni riferimento al manager
    this.gameManager = this.scene.get(assetConf.scene.gameManager) as GameManager;
  }

  // //! Solo per test
  addLogoPhaser() {
    // logoPhaser
    const logoPhaser = this.add.image(this.scale.width - 50, this.scale.height - 50, "logoPhaser"); // metodo per riprendere le variabili dalla page.tsx del game.

    logoPhaser.setOrigin(0.5).setDepth(-1).setScale(this.setDynamicValueBasedOnScale(0.7, 1.0));
  }

  getGlobalScale(): number {
    return this.globalScale;
  }

  // Metodo per ridimensionare gli oggetti in scena dipendendo dal tipo di dispositivo e della sua dimensione schermo.
  //! Metodo nuovo piu robusto copiare questo in tutti gli altri
  setGlobalScale() {
    // Otteniamo dimensioni reali del display
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const realWidth = cssWidth * pixelRatio;
    const realHeight = cssHeight * pixelRatio;

    // Recuperiamo le dimensioni configurate nel gioco (non influenzate da scale di Phaser)
    const config = this.sys.game.config as {width: number; height: number};

    // Definizione della risoluzione di riferimento
    //! NB: Attualmente settato a verticale (1080x1920) per mobile
    const refW = 1080;
    const refH = 1920;

    const scaleX = config.width / refW;
    const scaleY = config.height / refH;

    const calculatedScale = Math.min(scaleX, scaleY);

    // Impostiamo limiti massimi e minimi
    const minScale = 0.59;
    const maxScale = 1.2;

    // Clamp dello scale in range [minScale, maxScale]
    let globalScale = Math.min(maxScale, Math.max(minScale, calculatedScale));

    // Penalità extra se dimensioni CSS sono piccole (es. dispositivi vecchi o SE)
    const isBigScreen = realWidth >= 2500 || realHeight >= 1400;

    if (!isBigScreen && cssWidth < 750 && cssHeight < 450) {
      globalScale *= 0.7;
    }

    this.globalScale = globalScale;

    //console.log("Scala applicata tutorial:", this.globalScale);
    //console.log("Dimensioni scena width height:", config.width, config.height);
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

    // Create spriteLeft
    const spriteLeft = this.add
      .sprite(0, config.height / 2, assetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationLeft
    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    // Create spriteRight
    const spriteRight = this.add
      .sprite(config.width, config.height / 2, assetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationRight
    this.anims.create({
      key: "animConfettiRight",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_right.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteRight.play("animConfettiRight");
  }

  gameOver(): void {
    const resultStatus = this.uiManager.score >= this.uiManager.maxScore ? "Win" : "Failed";
    this.endGame(resultStatus);
  }

  endGame(resultStatus: "Win" | "Failed"): void {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.gameManager.isGameOver = true;
    this.gameManager.canShoot = false;

    let delay = 1000;

    if (resultStatus === "Win") {
      console.log("HAI VINTO LA PARTITA COMPLIMENTI!!!");
      this.uiManager.freezeIppoSpritesOnWin();
      this.startAnimConfetti();
      delay = 3000;
      this.audioManager.playAudio(assetConf.audio.endWin);
    } else {
      console.log("HAI PERSO LA PARTITA!!!");
      this.audioManager.playAudio(assetConf.audio.endFailed);
    }

    this.time.delayedCall(delay, () => {
      if (this.theme) this.theme.stop();
      this.scene.start(assetConf.scene.outro, {resultStatus});
    });
  }
}
