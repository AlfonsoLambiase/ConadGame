
import Phaser from "phaser";

import {UIManager} from "../components/UIManager";
import {AudioManager} from "../components/audioManager";
import {PrendiOggettiAssetConf} from "../shared/config/asset-conf.const";
import {StarsEffectManager} from "../components/starsEffectManager";

import {TimerManager} from "./timer-manager";
import {ExitManager} from "./exit-manager";
import {GameManager} from "./game-manager";

const assetConf = PrendiOggettiAssetConf;

export class Game extends Phaser.Scene {
  gameManager!: GameManager;
  audioManager!: AudioManager;
  timerManager!: TimerManager;
  uiManager!: UIManager;

  theme!: Phaser.Sound.BaseSound;

  valueScale!: number;

  private globalScale: number = 1;
  private isGameOver: boolean = false;

  starsEffectManager!: StarsEffectManager;

  constructor() {
    super({key: assetConf.scene.game});
  }

  init() {
    //console.log("Start Scene Game");
  }

  create() {
    this.setGlobalScale();

    // Inizializza il GameManager
    this.initializeGameManager();

    this.starsEffectManager = new StarsEffectManager(this);

    // Inizializza UIManager come Scene
    this.initializeUIManager();

    this.audioManager = new AudioManager(this);
    this.audioManager.loadAudios();

    // Inizializza ExitManager
    this.initializeExitManager();

    // Imposta l'ordine di rendering delle scene (dal basso verso l'alto)
    this.scene.bringToTop(assetConf.scene.gameManager); // In fondo
    this.scene.bringToTop(assetConf.scene.uiManager); // Sopra GameManager
    this.scene.bringToTop(assetConf.scene.exitManager); // Sopra tutto (con exit button)

    this.addLogoPhaser();
  }

  private initializeGameManager() {
    if (!this.scene.manager.getScene(assetConf.scene.gameManager)) {
      this.scene.manager.add(assetConf.scene.gameManager, GameManager, false);
    }

    this.scene.launch(assetConf.scene.gameManager, {
      gameScene: this,
    });

    this.gameManager = this.scene.get(assetConf.scene.gameManager) as GameManager;
  }

  private initializeUIManager() {
    // Aggiungi la scena UIManager al scene manager se non è già presente
    if (!this.scene.manager.getScene(assetConf.scene.uiManager)) {
      this.scene.manager.add(assetConf.scene.uiManager, UIManager, false);
    }

    // Avvia la scena UIManager
    this.scene.launch(assetConf.scene.uiManager, {
      gameScene: this,
    });

    // Ottieni riferimento al manager
    this.uiManager = this.scene.get(assetConf.scene.uiManager) as UIManager;
  }

  private initializeExitManager() {
    // Aggiungi la scena ExitManager se non è già presente
    if (!this.scene.manager.getScene(assetConf.scene.exitManager)) {
      this.scene.manager.add(assetConf.scene.exitManager, ExitManager, false);
    }

    // Avvia la scena ExitManager
    this.scene.launch(assetConf.scene.exitManager);

    // Imposta il riferimento alla scena di gioco
    const exitManager = this.scene.get(assetConf.scene.exitManager) as ExitManager;

    exitManager.setGameScene(this);
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

    const scaleX = config.width / refW;
    const scaleY = config.height / refH;

    const calculatedScale = Math.min(scaleX, scaleY);

    const minScale = 0.59;
    const maxScale = 1.2;

    let globalScale = Math.min(maxScale, Math.max(minScale, calculatedScale));

    const isBigScreen = realWidth >= 2500 || realHeight >= 1400;

    if (!isBigScreen && cssWidth < 750 && cssHeight < 450) {
      globalScale *= 0.7;
    }

    this.globalScale = globalScale;
  }

  setDynamicValueBasedOnScale(minValue: number, maxValue: number): number {
    if (this.globalScale >= 1) return maxValue;
    if (this.globalScale <= 0.5) return minValue;
    const minScale = 0.5,
      maxScale = 1;
    const t = (this.globalScale - minScale) / (maxScale - minScale);

    return minValue + t * (maxValue - minValue);
  }

  gameOver(): void {
    if (!this.isGameOver) {
      this.isGameOver = true;
      this.gameManager.isGameOver = true;
      this.gameManager.canShoot = false;

      this.gameManager.pauseGame();

      let delay = 1000;

      if (this.uiManager.score >= this.uiManager.maxScore) {
        console.log("HAI VINTO LA PARTITA COMPLIMENTI!!!");
        this.gameManager.startAnimConfetti();
        delay = 3000;
        this.audioManager.playAudio(assetConf.audio.endWin);
      } else {
        console.log("HAI PERSO LA PARTITA!!!");
        delay = 1000;
        this.audioManager.playAudio(assetConf.audio.endFailed);
      }

      this.time.delayedCall(delay, () => {
        if (this.theme) this.theme.stop();
        this.scene.start(assetConf.scene.outro, {
          resultStatus: this.uiManager.score >= this.uiManager.maxScore ? "Win" : "Failed",
        });
      });
    }
  }
}
