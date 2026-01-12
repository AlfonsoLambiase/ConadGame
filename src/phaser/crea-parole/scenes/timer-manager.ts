
import {CreaParoleAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = CreaParoleAssetConf; //* Generalizzazione

export class TimerManager extends Phaser.Scene {
  timer: number = 0;
  timerGame: number = 60;
  timerTemp: number = 0;
  countdown: Phaser.Time.TimerEvent | null = null;
  timerText: Phaser.GameObjects.Text | null = null;

  ofssetY: number = 0;
  ofssetX: number = 0;

  private gameScene!: Game;

  constructor() {
    super({key: assetConf.scene.timerManager});
  }

  create(): void {
    this.addTimer();
    this.registry.set(assetConf.registry.timer, this.timerGame);
  }

  init(): void {
    this.timer = this.timerGame;
  }

  setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  addTimer(): void {
    const config = this.sys.game.config as {width: number; height: number};
    const safeTop = this.registry.get("safeTop") || 0; //! notch Area

    // 1. Calcolo posizione container - ALTO DESTRA (opposto allo ScoreContainer)
    const centerX =
      config.width - this.gameScene.setDynamicValueBasedOnScale(100, 220) + this.ofssetX;
    const centerY = this.gameScene.setDynamicValueBasedOnScale(180, 380) + this.ofssetY + safeTop;

    // 2. Creazione container
    const timerContainer = this.add.container(centerX, centerY);
    timerContainer.setScrollFactor(0).setDepth(10);

    // 3. Background bianco (stesso dello score)
    const backgroundTimer = this.add
      .image(0, 0, assetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);

    // 4. Icona clessidra (a destra rispetto al centro)
    const iconTimer = this.add
      .sprite(90, 0, assetConf.image.iconSandClock)
      .setOrigin(0.5)
      .setScale(0.8);

    // 5. Testo timer (a sinistra rispetto al centro)
    this.timerText = this.add.text(-40, 0, this.timer.toString(), {
      fontFamily: "Paytone One",
      fontSize: "48px",
      color: "#000000",
    });
    this.timerText.setOrigin(0.5).setScale(1.3);

    // 6. Aggiungo tutti gli elementi al container
    timerContainer.add([backgroundTimer, iconTimer, this.timerText]);

    // 7. Scala del container
    timerContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
  }

  startTimer() {
    this.time.addEvent({
      delay: 1000, // 1 second
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  updateTimer(): void {
    this.timer--;
    this.timerTemp = this.timer;

    const leftTime = +this.registry.get(assetConf.registry.timer) + 1;

    this.registry.set(assetConf.registry.timer, leftTime);
    if (this.timerText) {
      this.timerText.setText(this.timer.toString());
    }

    if (this.timer <= 0) {
      this.stopTimer();
    }
  }

  stopTimer(): void {
    if (this.countdown) {
      this.countdown.remove();
      this.countdown = null;
    }

    this.time.removeAllEvents();

    this.timerTemp = this.timer;
    if (this.timer <= 0 && this.gameScene) {
      this.gameScene.gameOver();
    }
  }

  resetTimer(): void {
    this.timer = this.timerGame;
    this.timerTemp = 0;
    this.registry.set(assetConf.registry.timer, this.timer);

    this.time.delayedCall(2000, () => {
      this.timerTemp = this.timer;
    });
  }
}
