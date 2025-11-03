
import * as Phaser from "phaser";

import MainGame from "../scenes/main-game";

import Snowman from "./enemy";
import PlayerSnowball from "./playerSnowball";
import EnemySnowball from "./enemySnowball";
import Player from "./player";

import {GameEvents, GlobalEvents} from "@/lib/game-events";

export default class Track {
  private scene: Phaser.Scene;
  public id: number;
  public y: number;

  public nest: Phaser.Physics.Arcade.Image;
  public enemyBig: Snowman;
  public enemySmall: Snowman;
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
      .setScale(this.mainGame.gameScene.setDynamicValueBasedOnScale(0.65, 2.0));

    this.NEST_WIDTH = this.nest.displayWidth;

    this.enemiesGroup = this.scene.physics.add.group();

    this.enemyBig = new Snowman(scene, this, "Big");
    this.enemySmall = new Snowman(scene, this, "Small");

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
        const enemy = enemyObj as Snowman;
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

    // Ascolta gli eventi globali di pausa e ripresa
    GlobalEvents.on(GameEvents.PAUSE_GAME, () => {
      console.log(`Track riceve evento PAUSE_GAME`);
      this.pause();
    });

    GlobalEvents.on(GameEvents.RESUME_GAME, () => {
      console.log(`Track riceve evento RESUME_GAME`);
      this.resume();
    });
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
    //console.log("hitSnowball");
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
    //console.log("hitEnemy");
    const snowmanObj = object1 as Snowman;
    const ballObj = object2 as PlayerSnowball;

    if (snowmanObj.isAlive && snowmanObj.x > 0) {
      ballObj.stopMovement();
      snowmanObj.hit();
    }
  }

  public throwPlayerSnowball(x: number, player: Player): boolean {
    const snowball = this.playerSnowballs.getFirstDead(false) as PlayerSnowball | null;

    if (snowball) {
      snowball.fire(x, this.y, player);

      return true; // Lancio riuscito
    }

    return false; // Nessuna snowball disponibile
  }

  public throwEnemySnowball(x: number, ownerSize: "Small" | "Big"): void {
    const snowball = this.enemySnowballs.getFirstDead(false) as EnemySnowball | null;

    if (snowball) {
      snowball.fire(x, this.y, this, ownerSize);
    }
  }

  public pause(): void {
    console.log("🔴 Track.pause() chiamato");

    // Ferma TUTTI i nemici nel gruppo
    this.enemiesGroup.getChildren().forEach((enemy) => {
      const snowman = enemy as Snowman;

      snowman.stopMovement();

      // Forza anche il body a velocità 0
      if (snowman.body) {
        snowman.body.velocity.x = 0;
        snowman.body.velocity.y = 0;
      }
    });

    // Chiama pause() su ogni palla
    this.playerSnowballs.getChildren().forEach((ball) => {
      (ball as PlayerSnowball).pause();
    });

    this.enemySnowballs.getChildren().forEach((ball) => {
      const snowball = ball as EnemySnowball;

      snowball.setVelocity(0, 0);
      snowball.body?.stop();
      snowball.anims?.pause();
    });

    if (this.releaseTimerSmall) this.releaseTimerSmall.paused = true;
    if (this.releaseTimerBig) this.releaseTimerBig.paused = true;
  }

  public resume(): void {
    console.log("🟢 Track.resume() chiamato");

    if (this.releaseTimerSmall) this.releaseTimerSmall.paused = false;
    if (this.releaseTimerBig) this.releaseTimerBig.paused = false;

    this.enemySmall.resumeMovement();
    this.enemyBig.resumeMovement();

    this.enemiesGroup.getChildren().forEach((enemy) => {
      (enemy as Snowman).resumeMovement();
    });

    this.playerSnowballs.getChildren().forEach((ball) => {
      (ball as PlayerSnowball).resume();
    });

    this.enemySnowballs.getChildren().forEach((ball) => {
      (ball as EnemySnowball).resume();
    });
  }
}
