import * as Phaser from "phaser";

import {Game} from "../scenes/game";

import Player from "./player";

export default class PlayerSnowball extends Phaser.Physics.Arcade.Sprite {
  private gameScene!: Game;
  private savedVelocityX: number = 0;
  private savedAccelerationX: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    key: string,
    frame?: string | number,
    gameScene?: Game,
  ) {
    super(scene, x, y, key, frame);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    gameScene = this.scene.registry.get("gameSnowmanInstance") as Game;
    if (gameScene) {
      this.gameScene = gameScene;
      this.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
    } else {
      this.setScale(0.5);
    }
  }

  fire(x: number, y: number, player: Player): void {
    const yOffset = player.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(80, 160);

    this.body!.enable = true;
    this.body!.reset(x + 10, y - yOffset);

    this.setActive(true);
    this.setVisible(true);

    const velocityX = player.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(600, 1200);
    const accelerationX = player.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(
      1400,
      2800,
    );

    this.setVelocityX(velocityX);
    this.setAccelerationX(accelerationX);
  }

  pause(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 👇 Salva la velocità ATTUALE prima di fermare
    this.savedVelocityX = body.velocity.x;
    this.savedAccelerationX = body.acceleration.x;

    this.setVelocity(0, 0);
    body.stop();
    this.anims?.pause();
  }

  stopMovement(): void {
    this.body!.enable = false;
    this.setVelocity(0, 0);
    this.stop();

    this.setActive(false);
    this.setVisible(false);

    // Reset dei valori salvati
    this.savedVelocityX = 0;
    this.savedAccelerationX = 0;
  }

  resume(): void {
    if (this.savedVelocityX === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mainGame = this.scene as any;

    if (mainGame.isGameOver) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    body.enable = true;
    this.setActive(true);
    this.setVisible(true);

    // Ripristina i valori salvati
    this.setVelocityX(this.savedVelocityX);
    this.setAccelerationX(this.savedAccelerationX);

    this.anims?.resume();
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    const screenWidth = this.scene.scale.width;

    // Se la palla esce a sinistra o a destra, la disattiviamo
    if (this.x < -this.displayWidth || this.x > screenWidth + this.displayWidth) {
      this.stopMovement();
    }
  }
}
