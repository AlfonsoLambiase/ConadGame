import * as Phaser from "phaser";

import MainGame from "../scenes/main-game";

import Enemy from "./enemy";
import PlayerSnowball from "./playerSnowball";
import EnemySnowball from "./enemySnowball";
import Player from "./player";

export default class Track {
  private scene: Phaser.Scene;
  public id: number;
  public y: number;

  public nest: Phaser.Physics.Arcade.Image;
  public enemyBig: Enemy;
  public enemySmall: Enemy;
  public playerSnowballs: Phaser.Physics.Arcade.Group;
  public enemySnowballs: Phaser.Physics.Arcade.Group;

  private releaseTimerSmall: Phaser.Time.TimerEvent | undefined;
  private releaseTimerBig: Phaser.Time.TimerEvent | undefined;

  public TRACK_OFFSET_Y = 150; // regola questo valore a piacere, valore modificato dinamicamente nella scena gameScene

  public NEST_WIDTH: number = 0; // variabile usata esternamente

  public enemiesGroup: Phaser.Physics.Arcade.Group;

  public mainGame!: MainGame;

  constructor(scene: Phaser.Scene, id: number, trackY: number) {
    this.scene = scene;
    this.mainGame = scene as MainGame;
    this.id = id;
    this.y = trackY + this.TRACK_OFFSET_Y; // offset applicato a tutte le entità di questa corsia

    //* posizione iniziale a sinistra dei nest (oggetti da proteggere)
    this.nest = scene.physics.add
      .image(
        this.mainGame.gameScene.setDynamicValueBasedOnScale(50, 150),
        trackY + this.TRACK_OFFSET_Y - this.mainGame.gameScene.setDynamicValueBasedOnScale(20, 20),
        "nest",
      )
      .setOrigin(0, 1)
      .setScale(this.mainGame.gameScene.setDynamicValueBasedOnScale(0.65, 2.0)); // 0.7

    this.NEST_WIDTH = this.nest.displayWidth;

    this.enemiesGroup = this.scene.physics.add.group();

    this.enemyBig = new Enemy(scene, this, "Big");
    this.enemySmall = new Enemy(scene, this, "Small");

    // aggiungiamo i nemici al gruppo della scena
    (scene as MainGame).enemies.add(this.enemyBig);
    (scene as MainGame).enemies.add(this.enemySmall);

    // aggiungi al gruppo
    this.enemiesGroup.add(this.enemyBig);
    this.enemiesGroup.add(this.enemySmall);

    this.playerSnowballs = scene.physics.add.group({
      frameQuantity: 8,
      key: "snowball2",
      active: false,
      visible: false,
      classType: PlayerSnowball,
    });

    this.enemySnowballs = scene.physics.add.group({
      frameQuantity: 8,
      key: "snowball3",
      active: false,
      visible: false,
      classType: EnemySnowball,
    });

    // snowBallCollider
    scene.physics.add.overlap(
      this.playerSnowballs,
      this.enemySnowballs,
      this.hitSnowball,
      (obj1, obj2) => {
        const ball1 = obj1 as PlayerSnowball | EnemySnowball;
        const ball2 = obj2 as PlayerSnowball | EnemySnowball;

        return ball1.active && ball2.active;
      },
      this,
    );

    this.scene.physics.add.overlap(
      this.enemiesGroup,
      this.playerSnowballs,
      (enemyObj, ballObj) => {
        const enemy = enemyObj as Enemy;
        const ball = ballObj as PlayerSnowball;

        const screenWidth = this.scene.scale.width;

        // Collide solo se il nemico è almeno a 20px dal bordo destro
        if (enemy.isAlive && enemy.x < screenWidth - 20) {
          enemy.hit();
          ball.stopMovement();
        }
      },
      undefined,
      this,
    );
  }

  public start(minDelay: number, maxDelay: number): void {
    const delay = Phaser.Math.Between(minDelay, maxDelay);

    this.releaseTimerSmall = this.scene.time.addEvent({
      delay: delay,
      callback: () => {
        this.enemySmall.start();
      },
    });

    this.releaseTimerBig = this.scene.time.addEvent({
      delay: delay * 3,
      callback: () => {
        this.enemyBig.start();
      },
    });
  }

  public stop(): void {
    this.enemySmall.stopMovement();
    this.enemyBig.stopMovement();

    for (const snowball of this.playerSnowballs.getChildren() as PlayerSnowball[]) {
      snowball.stopMovement();
    }

    for (const snowball of this.enemySnowballs.getChildren() as EnemySnowball[]) {
      snowball.stopMovement();
    }

    if (this.releaseTimerSmall) {
      this.releaseTimerSmall.remove();
    }

    if (this.releaseTimerBig) {
      this.releaseTimerBig.remove();
    }
  }

  private hitSnowball(
    object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody,
  ): void {
    console.log("hitSnowball");
    (object1 as PlayerSnowball | EnemySnowball).stopMovement();
    (object2 as PlayerSnowball | EnemySnowball).stopMovement();
  }

  private hitEnemy(
    object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody,
  ): void {
    console.log("hitEnemy");
    const snowmanObj = object1 as Enemy;
    const ballObj = object2 as PlayerSnowball;

    if (snowmanObj.isAlive && snowmanObj.x > 0) {
      ballObj.stopMovement();
      snowmanObj.hit();
    }
  }

  public throwPlayerSnowball(x: number, player: Player): void {
    const snowball = this.playerSnowballs.getFirstDead(false) as PlayerSnowball | null;

    if (snowball) {
      snowball.fire(x, this.y, player);
    }
  }

  public throwEnemySnowball(x: number, ownerSize: "Small" | "Big"): void {
    const snowball = this.enemySnowballs.getFirstDead(false) as EnemySnowball | null;

    if (snowball) {
      snowball.fire(x, this.y, this, ownerSize);
    }
  }
}
