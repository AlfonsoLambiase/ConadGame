import * as Phaser from "phaser";

import {Game} from "../scenes/game";

import Player from "./player";

export default class PlayerSnowball extends Phaser.Physics.Arcade.Sprite {
  private gameScene!: Game;

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

    this.setVelocityX(
      player.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(600, 1200),
    );
    this.setAccelerationX(
      player.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(1400, 2800),
    );
  }

  stopMovement(): void {
    //const body = this.body as Phaser.Physics.Arcade.Body;

    // Disabilita subito il corpo, così smette di aggiornarsi fisicamente
    this.body!.enable = false;
    this.setVelocity(0, 0);
    this.stop(); // forza lo stop immediato

    this.setActive(false);
    this.setVisible(false);
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
