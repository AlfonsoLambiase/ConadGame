
import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import MainGame from "../scenes/main-game";

import Track from "./track";

type SnowmanSize = "Small" | "Big";

//* ball lanciata dall'enemy
export default class EnemySnowball extends Phaser.Physics.Arcade.Sprite {
  private currentTrack?: Track;
  public ownerSize?: SnowmanSize; // aggiunta: chi ha lanciato (Big o Small)
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

    scene.physics.add.existing(this);
    scene.add.existing(this);

    gameScene = this.scene.registry.get("gameSnowmanInstance") as Game;
    if (gameScene) {
      this.gameScene = gameScene;
      this.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
    } else {
      this.setScale(0.5);
    }
  }

  fire(x: number, y: number, track: Track, ownerSize: SnowmanSize): void {
    this.currentTrack = track;
    this.ownerSize = ownerSize; // 👈 salva chi ha lanciato
    //console.log("Palla lanciata da: ", this.ownerSize);
    const offsetY =
      this.ownerSize === "Big"
        ? this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(80, 160)
        : this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(80, 160);

    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    (this.body as Phaser.Physics.Arcade.Body).reset(x - 10, y - offsetY);

    const mainGame = this.scene as MainGame;

    if (!mainGame.isGameOver) {
      this.setActive(true);
      this.setVisible(true);

      this.setVelocityX(
        this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(-200, -700),
      );
    } else {
      this.setActive(false);
      this.setVisible(false);

      this.setVelocityX(0);
    }
  }

  stopMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    body.enable = false;
    body.setVelocity(0, 0);
    body.stop(); // forza lo stop immediato

    this.setActive(false);
    this.setVisible(false);
  }

  resume(): void {
    if (!this.currentTrack || !this.ownerSize) return;

    const mainGame = this.scene as MainGame;

    if (mainGame.isGameOver) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    body.enable = true;

    this.setActive(true);
    this.setVisible(true);

    // Ripristina la velocità e accelerazione originali
    this.setVelocityX(this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(-200, -700));
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    // Controlla se il gioco è finito
    const mainGame = this.scene as MainGame;

    if (!this.currentTrack || mainGame.isGameOver) return;

    if (this.x <= this.currentTrack!.NEST_WIDTH) {
      this.stopMovement();
      mainGame.gameOver("enemy snowball");
    }
  }
}
