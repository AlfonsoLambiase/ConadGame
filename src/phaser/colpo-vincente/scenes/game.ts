/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import * as Phaser from "phaser";

import {UIManager} from "../components/UIManager";
import {AudioManager} from "../components/audioManager";
import {ColpoVincenteGameplayConfig} from "../config/colpo-vincente-gameplay.config";
import {ColpoVincenteAssetConf} from "../shared/config/asset-conf.const";
import {StarsEffectManager} from "../components/starsEffectManager";

import {TimerManager} from "./timer-manager";
import {ExitManager} from "./exit-manager";
import {GameManager, type ColpoVincenteMatchOutcome} from "./game-manager";

const assetConf = ColpoVincenteAssetConf; //* Generalizzazione
const colpoGameplayCfg = ColpoVincenteGameplayConfig;

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

  /** Min/max px font overlay fine partita (setDynamicValueBasedOnScale): pareggio / sconfitta. */
  private colpoEndOverlayFontMin!: number;
  private colpoEndOverlayFontMax!: number;
  /** Min/max px font per "Hai vinto!" (più grande). */
  private colpoEndOverlayWinFontMin!: number;
  private colpoEndOverlayWinFontMax!: number;
  /** Min/max px drift verticale durante la dissolvenza del titolo. */
  private colpoEndOverlayDriftMin!: number;
  private colpoEndOverlayDriftMax!: number;
  /** ms dopo la fine del tween testo prima di confetti + audio vittoria. */
  private colpoEndConfettiDelayAfterTitleMs!: number;

  constructor() {
    super({key: assetConf.scene.game});
  }

  init() {
    console.log("Start Scene Game");

    this.colpoEndOverlayFontMin = 56;
    this.colpoEndOverlayFontMax = 108;
    this.colpoEndOverlayWinFontMin = 82;
    this.colpoEndOverlayWinFontMax = 158;
    this.colpoEndOverlayDriftMin = 100;
    this.colpoEndOverlayDriftMax = 188;
    this.colpoEndConfettiDelayAfterTitleMs = 1000;
  }

  create() {
    this.setGlobalScale();

    // Avvia il gameplay sotto
    this.initializeGameManager();

    this.starsEffectManager = new StarsEffectManager(this.gameManager);

    // UI nella scene Game (overlay fisso, non zooma)
    this.uiManager = new UIManager(this);
    this.uiManager.setGameScene(this);
    this.uiManager.createUI();

    this.audioManager = new AudioManager(this); //* è una semplice classe helper. Si inizializza in questo modo.
    this.audioManager.loadAudios();
    //this.audioManager.playBackgroundMusic(); // ! Attivare musica

    const exitManager = this.scene.get(assetConf.scene.exitManager) as ExitManager;

    exitManager.setGameScene(this);

    // IMPORTANTE:
    // il bottone exit deve essere creato nella scene Game, non in GameManager
    this.exitButton = exitManager.createExitButton(this, this.theme);

    // this.scene.launch(assetConf.scene.timerManager); //* è una estensione della classe Phaser.Scene. Si inizializza in questo modo.
    // this.timerManager = this.scene.get(assetConf.scene.timerManager) as TimerManager;
    // this.timerManager.setGameScene(this);
    // this.timerManager.startTimer();

    //this.addLogoPhaser();

    // Mantieni Game sopra GameManager così HUD e overlay restano visibili
    this.scene.bringToTop();
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

    // La camera della scene Game deve restare visibile:
    // ospita HUD e overlay che non devono zoomare.
    this.cameras.main.setVisible(true);
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    // Ottieni riferimento al manager
    this.gameManager = this.scene.get(assetConf.scene.gameManager) as GameManager;
  }

  // //! Solo per test
  addLogoPhaser() {
    this.add
      .image(this.scale.width - 50, this.scale.height - 50, "logoPhaser")
      .setOrigin(0.5)
      .setDepth(90)
      .setScrollFactor(0)
      .setScale(this.setDynamicValueBasedOnScale(0.7, 1.0));
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

    // Confetti nella scene Game, così non zoomano insieme al gameplay
    const spriteLeft = this.add
      .sprite(0, config.height / 2, assetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(95)
      .setScale(5)
      .setScrollFactor(0);

    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    const spriteRight = this.add
      .sprite(config.width, config.height / 2, assetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(95)
      .setScale(5)
      .setScrollFactor(0);

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
    if (!this.isGameOver) {
      this.isGameOver = true;
      this.gameManager.isGameOver = true;
      this.gameManager.canShoot = false;

      const outcome = this.gameManager.colpoVincenteMatchOutcome;
      const playerWon = this.gameManager.playerWonColpoVincente;
      const launchAt = this.gameManager.getColpoMatchEndEnemyLaunchAtMs();
      const minAfterLaunch = colpoGameplayCfg.colpoEndOverlayMinMsAfterLastEnemyLaunch;
      const waitMs = launchAt > 0 ? Math.max(0, minAfterLaunch - (this.time.now - launchAt)) : 0;

      this.time.delayedCall(waitMs, () => {
        this.playColpoMatchEndResultOverlay(outcome, playerWon);
      });
    }
  }

  /** Testo centrale → dissolvenza verso il basso → confetti (solo vittoria) → outro. */
  private playColpoMatchEndResultOverlay(
    outcome: ColpoVincenteMatchOutcome,
    playerWon: boolean,
  ): void {
    const cx = this.scale.width * 0.5;
    const cy = this.scale.height * 0.42;
    const label = outcome === "win" ? "Hai vinto!" : outcome === "draw" ? "Parità!" : "Hai Perso!";
    const fontPx = Math.round(
      outcome === "win"
        ? this.setDynamicValueBasedOnScale(
            this.colpoEndOverlayWinFontMin,
            this.colpoEndOverlayWinFontMax,
          )
        : this.setDynamicValueBasedOnScale(
            this.colpoEndOverlayFontMin,
            this.colpoEndOverlayFontMax,
          ),
    );

    const txt = this.add
      .text(cx, cy, label, {
        fontFamily: "Paytone One",
        fontSize: `${fontPx}px`,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: Math.max(6, Math.round(fontPx * 0.09)),
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(96)
      .setScrollFactor(0);

    const fadeMs = colpoGameplayCfg.colpoEndOverlayTextFadeDurationMs;
    const yDrift = this.setDynamicValueBasedOnScale(
      this.colpoEndOverlayDriftMin,
      this.colpoEndOverlayDriftMax,
    );

    this.tweens.add({
      targets: txt,
      y: cy + yDrift,
      alpha: 0,
      duration: fadeMs,
      ease: "Sine.easeIn",
      onComplete: () => {
        txt.destroy();

        const goOutro = (delayMs: number) => {
          this.time.delayedCall(delayMs, () => {
            if (this.theme) this.theme.stop();
            this.scene.start(assetConf.scene.outro, {
              resultStatus: playerWon ? "Win" : "Failed",
            });
          });
        };

        if (outcome === "win") {
          this.time.delayedCall(this.colpoEndConfettiDelayAfterTitleMs, () => {
            this.startAnimConfetti();
            this.audioManager.playAudio(assetConf.audio.endWin);
            goOutro(3000);
          });
        } else if (outcome === "draw") {
          this.audioManager.playAudio(assetConf.audio.endFailed);
          goOutro(2000);
        } else {
          this.audioManager.playAudio(assetConf.audio.endFailed);
          goOutro(1000);
        }
      },
    });
  }
}
