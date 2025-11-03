
import * as Phaser from "phaser";

import MainGame from "../scenes/main-game";

import Track from "./track";

import {GameEvents, GlobalEvents} from "@/lib/game-events";

type SnowmanSize = "Small" | "Big";

//* nemico
export default class Snowman extends Phaser.Physics.Arcade.Sprite {
  private time: Phaser.Time.Clock;
  private sound: Phaser.Sound.BaseSoundManager;

  public isAlive: boolean;
  private isThrowing: boolean;
  private size: SnowmanSize;
  private speed: number;
  private previousAction: number;
  private currentTrack: Track;
  private chooseEvent?: Phaser.Time.TimerEvent;
  private currentHitpoints?: number;
  private maxHitpoints?: number;

  private isPaused: boolean = false;
  private pausedAnimKey: string = "";
  private pausedVelocityX: number = 0;
  private activeTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, track: Track, size: SnowmanSize) {
    const frame = size === "Small" ? "snowman-small-idle0" : "snowman-big-idle0";
    const x =
      size === "Small" ? scene.scale.width - Phaser.Math.Between(80, 150) : scene.scale.width + 100;

    super(scene, x, track.y, frame);

    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.time = scene.time;
    this.sound = scene.sound;

    this.isAlive = true;
    this.isThrowing = false;

    this.previousAction = 0;
    this.currentTrack = track;

    this.size = size;
    this.speed = this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(65, 300);

    if (size === "Small") {
      // this.setFlipX(true); //! Inverte la direzione in x dello sprite
      this.body!.setSize(100, 150);
      this.body!.setOffset(90, 100);
      this.setScale(this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(0.65, 2.0));
    } else {
      //this.setFlipX(true); //! Inverte la direzione in x dello sprite
      this.body!.setSize(100, 150);
      this.body!.setOffset(90, 100);
      this.setScale(this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(0.65, 2.0));
    }

    this.play("snowmanIdle" + this.size);

    // Ascolta gli eventi globali di pausa e ripresa
    GlobalEvents.on(GameEvents.PAUSE_GAME, () => {
      console.log(`Track riceve evento PAUSE_GAME`);
      this.stopMovement();
    });

    GlobalEvents.on(GameEvents.RESUME_GAME, () => {
      console.log(`Track riceve evento RESUME_GAME`);
      this.resumeMovement();
    });
  }

  start(): void {
    this.isAlive = true;
    this.isThrowing = false;
    this.previousAction = 0;
    this.currentHitpoints = this.maxHitpoints;

    this.y = this.currentTrack.y;

    this.on("animationcomplete-snowmanThrowStart" + this.size, this.releaseSnowball, this);
    this.on("animationcomplete-snowmanThrowEnd" + this.size, this.throwComplete, this);

    this.setActive(true);
    this.setVisible(true);

    this.play("snowmanWalk" + this.size);
    this.setVelocityX(-this.speed);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(2000, 5000), // Phaser.Math.Between(3000, 6000),
      this.chooseAction,
      [],
      this,
    );
  }

  //! Metodo per lanciare bolle nemico. Ibrido true lancia, false non lancia
  private chooseAction(allowThrow: boolean = true): void {
    // Assicuriamoci che lo Snowman sia attivo
    this.isAlive = true;
    this.body!.enable = true;
    this.setVelocityX(0);

    const t = Phaser.Math.Between(0, 100);

    if (allowThrow) {
      //* probabilità di lanciare.
      if (t < 30) {
        // Se ha lanciato l’ultima volta, cammina invece di lanciare
        if (this.previousAction === 2) {
          this.walk();
        } else {
          this.throw();
        }
        //* probabilità di camminare.
      } else if (t > 50) {
        this.walk();
      } else {
        //* probabilità di idle.
        if (this.previousAction === 1) {
          if (t > 40) {
            this.walk();
          } else {
            this.throw();
          }
        } else {
          this.goIdle();
        }
      }
    } else {
      // comportamento senza lancio
      if (t < 50) {
        // Se era in idle l’ultima volta, cammina
        if (this.previousAction === 1) {
          this.walk();
        } else {
          this.goIdle();
        }
      } else {
        this.walk();
      }
    }
  }

  //* Tempo di camminata:
  private walk(): void {
    this.previousAction = 0;
    this.play("snowmanWalk" + this.size, true);
    this.setVelocityX(-this.speed);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(5000, 7000), // Phaser.Math.Between(3000, 6000),
      this.chooseAction,
      [],
      this,
    );
  }

  //* Tempo di idle:
  private goIdle(): void {
    this.previousAction = 1;
    this.play("snowmanIdle" + this.size, true);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(1000, 2000), // Phaser.Math.Between(2000, 4000),
      this.chooseAction,
      [],
      this,
    );
  }

  private throw(): void {
    this.previousAction = 2;
    this.isThrowing = true;
    this.play("snowmanThrowStart" + this.size);
  }

  private releaseSnowball(): void {
    if (!this.isAlive || !this.active) return;
    this.play("snowmanThrowEnd" + this.size);

    //* metodo per attivare lo sparo delle bolle di neve
    this.currentTrack.throwEnemySnowball(this.x, this.size);
  }

  //* Tempo di attesa dopo un lancio:
  private throwComplete(): void {
    if (!this.isAlive) return;
    this.isThrowing = false;
    this.play("snowmanIdle" + this.size);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(1000, 2000), // Phaser.Math.Between(2000, 4000),
      this.chooseAction,
      [],
      this,
    );
  }

  //! Metodo dove si disattiva il nemico e dopo x tempo si riattiva ma non si distrugge.
  // hit(): void {
  //   this.chooseEvent?.remove();

  //   this.isAlive = false;
  //   this.previousAction = -1;

  //   this.play("snowmanDie" + this.size);
  //   this.sound.play("hitSnowman");

  //   this.body!.stop();
  //   this.body!.enable = false;

  //   const knockback = "-=" + Phaser.Math.Between(100, 200).toString();

  //   this.scene.tweens.add({
  //     targets: this,
  //     x: knockback,
  //     ease: "sine.out",
  //     duration: 1000,
  //     onComplete: () => {
  //       if (this.x < -100) this.x = -100;
  //     },
  //   });

  //   this.chooseEvent = this.time.delayedCall(
  //     Phaser.Math.Between(1000, 3000),
  //     this.chooseAction,
  //     [],
  //     this,
  //   );

  //   (this.scene as MainGame).addScore(1);
  // }

  //! Metodo dove si genera un nuovo nemico
  hit(): void {
    this.chooseEvent?.remove();
    this.isAlive = false;
    this.previousAction = -1;

    this.play("snowmanDie" + this.size);
    this.sound.play("hitSnowman");

    this.body!.stop();
    this.body!.enable = false;

    const knockback = "+=" + Phaser.Math.Between(100, 200).toString();

    // Salva il riferimento al tween
    const knockbackTween = this.scene.tweens.add({
      targets: this,
      x: knockback,
      ease: "sine.out",
      duration: 500,
      onComplete: () => {
        const blinkTimes = 6;
        let blinkCount = 0;
        const blinkInterval = this.scene.time.addEvent({
          delay: 100,
          repeat: blinkTimes - 1,
          callback: () => {
            this.setVisible(!this.visible);
            blinkCount++;
            if (blinkCount >= blinkTimes) {
              this.setActive(false);
              this.setVisible(false);
              blinkInterval.remove();

              const newEnemy = new Snowman(this.scene, this.currentTrack, this.size);

              (this.scene as MainGame).enemies.add(newEnemy);
              this.currentTrack.enemiesGroup.add(newEnemy);

              newEnemy.x = this.scene.scale.width + 100;
              newEnemy.start();

              // 👇 Rimuovi il tween dalla lista
              const index = this.activeTweens.indexOf(knockbackTween);

              if (index > -1) this.activeTweens.splice(index, 1);
            }
          },
        });
      },
    });

    this.activeTweens.push(knockbackTween);

    (this.scene as MainGame).addScore(1);
  }

  stopMovement(): void {
    if (this.isPaused) return;

    this.isPaused = true;

    if (this.isAlive) {
      this.pausedAnimKey = this.anims.currentAnim?.key || "";
      this.pausedVelocityX = this.body!.velocity.x;
    } else {
      this.pausedAnimKey = "";
      this.pausedVelocityX = 0;
    }

    this.chooseEvent?.remove();
    this.chooseEvent = undefined;

    this.setVelocity(0, 0);
    this.body?.stop();
    this.body!.velocity.x = 0;
    this.body!.velocity.y = 0;

    this.anims.pause();

    // PAUSA TUTTI I TWEEN ATTIVI
    this.activeTweens.forEach((tween) => {
      if (tween && tween.isPlaying()) {
        tween.pause();
      }
    });

    console.log(
      `stopMovement - isAlive: ${this.isAlive}, tweens attivi: ${this.activeTweens.length}`,
    );
  }

  public resumeMovement(): void {
    if (!this.isAlive || !this.isPaused) return;

    this.isPaused = false;

    if (this.isAlive) {
      this.body!.enable = true;

      if (this.pausedAnimKey) {
        this.anims.resume();
      }

      this.setVelocityX(this.pausedVelocityX);

      // 👇 RIPRENDI TUTTI I TWEEN
      this.activeTweens.forEach((tween) => {
        if (tween && tween.isPaused()) {
          tween.resume();
        }
      });

      this.chooseEvent = this.time.delayedCall(
        Phaser.Math.Between(3000, 6000),
        this.chooseAction,
        [],
        this,
      );
    }

    console.log("resumeMovement");
  }

  preUpdate(time: number, delta: number): void {
    if (this.isPaused) return; // 🚫 blocca tutto durante la pausa

    super.preUpdate(time, delta);

    if (!this.currentTrack) return;

    // Controllo game over lato sinistro
    if (this.currentTrack && this.x <= this.currentTrack.NEST_WIDTH) {
      this.stopMovement();
      (this.scene as MainGame).gameOver("enemy");
    }
  }
}
