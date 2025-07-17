/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import Phaser from "phaser";

import {UIManager} from "../components/UIManager";
import {AudioManager} from "../components/audioManager";
import {BasketAssetConf} from "../shared/config/asset-conf.const";
import {StarsEffectManager} from "../components/starsEffectManager";

import {TimerManager} from "./timer-manager";
import {ExitManager} from "./exit-manager";
import {BasketManager} from "./basket-manager";

export class Game extends Phaser.Scene {
  basketManager!: BasketManager;
  audioManager!: AudioManager;
  timerManager!: TimerManager;
  uiManager!: UIManager;

  exitButton: any;
  theme!: Phaser.Sound.BaseSound;

  valueScale!: number;

  private globalScale: number = 1;

  private typeImage!: number;

  private isGameOver: boolean = false; // controllo aggiuntivo per eveitare che possa andare 2 volte in gameOver

  starsEffectManager!: StarsEffectManager;

  constructor() {
    super({key: BasketAssetConf.scene.game});
  }

  init(data: {typeImage: number}) {
    //! Se serve prendere qualche dato dal file game.tsx
    // Comunque bisogna fare il collegamento anche da boot
    this.typeImage = data.typeImage;
    console.log("GameScene Bubble Shooter: ", this.typeImage);
  }

  create() {
    this.setGlobalScale();

    // Inizializza il BasketManager
    this.initializeBasketManager();

    console.log("Start Game Demo 02");

    this.starsEffectManager = new StarsEffectManager(this);

    this.uiManager = new UIManager(this);
    this.uiManager.setGameScene(this);
    this.uiManager.createUI();

    this.audioManager = new AudioManager(this); //* è una semplice classe helper. Si inizializza in questo modo.
    this.audioManager.loadAudios();
    //this.audioManager.playBackgroundMusic(); // ! Attivare musica

    const exitManager = this.scene.get(BasketAssetConf.scene.exitManager) as ExitManager;

    exitManager.setGameScene(this);
    this.exitButton = exitManager.createExitButton(this, this.theme);
    this.scene.bringToTop(BasketAssetConf.scene.exitManager);

    // this.scene.launch(GameDemo02AssetConf.scene.timerManager); //* è una estensione della classe Phaser.Scene. Si inizializza in questo modo.
    // this.timerManager = this.scene.get(GameDemo02AssetConf.scene.timerManager) as TimerManager;
    // this.timerManager.setGameScene(this);
    // this.timerManager.startTimer();

    this.addLogoPhaser();
  }

  private initializeBasketManager() {
    // Aggiungi la scena al scene manager se non è già presente
    if (!this.scene.manager.getScene(BasketAssetConf.scene.basketManager)) {
      this.scene.manager.add(BasketAssetConf.scene.basketManager, BasketManager, false);
    }

    // Avvia la scena
    this.scene.launch(BasketAssetConf.scene.basketManager, {
      gameScene: this,
    });

    // Ottieni riferimento al manager
    this.basketManager = this.scene.get(BasketAssetConf.scene.basketManager) as BasketManager;

    this.basketManager.setGameScene(this);
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

    let calculatedScale = Math.min(scaleX, scaleY);

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

    // Arrotondiamo a 2 decimali
    this.globalScale = Math.round(globalScale * 100) / 100;

    console.log("SetglobalScale: ", this.globalScale);
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
      .sprite(0, config.height / 2, BasketAssetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationLeft
    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(BasketAssetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    // Create spriteRight
    const spriteRight = this.add
      .sprite(config.width, config.height / 2, BasketAssetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationRight
    this.anims.create({
      key: "animConfettiRight",
      frames: this.anims.generateFrameNumbers(BasketAssetConf.spritesheet.confetti_right.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteRight.play("animConfettiRight");
  }

  gameOver(): void {
    if (!this.isGameOver) {
      this.isGameOver = true;
      this.basketManager.isGameOver = true;
      this.basketManager.canShoot = false;

      let delay = 1000;

      if (this.uiManager.score >= this.uiManager.maxScore) {
        console.log("HAI VINTO LA PARTITA COMPLIMENTI!!!");
        this.startAnimConfetti();
        delay = 3000;
        this.audioManager.playAudio(BasketAssetConf.audio.endWin);
      } else {
        console.log("HAI PERSO LA PARTITA!!!");
        delay = 1000;
        this.audioManager.playAudio(BasketAssetConf.audio.endFailed);
      }

      this.time.delayedCall(delay, () => {
        if (this.theme) this.theme.stop();
        this.basketManager.gameOver();
        this.scene.start(BasketAssetConf.scene.outro, {
          resultStatus: this.uiManager.score >= this.uiManager.maxScore ? "Win" : "Failed",
        });
      });

      console.log("Gioco finito!");
    }
  }
}
