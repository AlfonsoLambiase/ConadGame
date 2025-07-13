
import {BubbleShooterAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

export class TimerManager extends Phaser.Scene {
  timer: number = 0;
  timerGame: number = 120;
  timerTemp: number = 0;
  countdown: Phaser.Time.TimerEvent | null = null;
  timerText: Phaser.GameObjects.Text | null = null;

  ofssetY: number = 200;
  ofssetX: number = 0;

  private gameScene!: Game;

  constructor() {
    super({key: BubbleShooterAssetConf.scene.timerManager});
  }

  create(): void {
    this.addTimer();
    this.registry.set(BubbleShooterAssetConf.registry.timer, this.timerGame);
  }

  init(): void {
    this.timer = this.timerGame;
  }

  setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  addTimer(): void {
    const config = this.sys.game.config as {width: number; height: number};

    // timerText
    this.timerText = this.add.text(
      config.width - this.gameScene.setDynamicValueBasedOnScale(110, 180) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(-80, 115) + this.ofssetY,
      this.timer.toString(), // Text to display
      {
        fontFamily: "Paytone One",
        fontSize: "48px", // Font size and font family
        color: "#000000", // Text color
      },
    );

    this.timerText
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.7, 1.2));

    // iconTtimer
    const iconTimer = this.add.sprite(
      config.width - this.gameScene.setDynamicValueBasedOnScale(50, 80) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(-75, 110) + this.ofssetY,
      BubbleShooterAssetConf.image.iconSandClock,
    );

    iconTimer
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
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

    const leftTime = +this.registry.get(BubbleShooterAssetConf.registry.timer) + 1;

    this.registry.set(BubbleShooterAssetConf.registry.timer, leftTime);
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
  }

  resetTimer(): void {
    this.timer = this.timerGame;
    this.timerTemp = 0;
    this.registry.set(BubbleShooterAssetConf.registry.timer, this.timer);

    this.time.delayedCall(2000, () => {
      this.timerTemp = this.timer;
    });
  }
}
