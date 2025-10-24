import * as Phaser from "phaser";

import MainGame from "../scenes/main-game";

import Track from "./track";

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

    this.size = size;
    this.speed = 50;

    this.previousAction = 0;
    this.currentTrack = track;

    if (size === "Small") {
      // this.setFlipX(true); //! Inverte la direzione in x dello sprite
      // this.body!.setSize(100, 100);
      // this.body!.setOffset(20, 20);
      // this.setScale(this.currentTrack.mainGame.gameScene.setDynamicValueBasedOnScale(1.0, 2.5));
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
      Phaser.Math.Between(3000, 6000),
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
      // comportamento originale con lancio
      if (t < 50) {
        // Se ha lanciato l’ultima volta, cammina invece di lanciare
        if (this.previousAction === 2) {
          this.walk();
        } else {
          this.throw();
        }
      } else if (t > 60) {
        this.walk();
      } else {
        // t tra 50 e 60 -> idle
        if (this.previousAction === 1) {
          if (t > 55) {
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

  private walk(): void {
    this.previousAction = 0;
    this.play("snowmanWalk" + this.size, true);
    this.setVelocityX(-this.speed);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(3000, 6000),
      this.chooseAction,
      [],
      this,
    );
  }

  private goIdle(): void {
    this.previousAction = 1;
    this.play("snowmanIdle" + this.size, true);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(2000, 4000),
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
    if (!this.isAlive || !this.active) return; // 👈 aggiungi questa guardia
    this.play("snowmanThrowEnd" + this.size);

    //* metodo per attivare lo sparo delle bolle di neve
    this.currentTrack.throwEnemySnowball(this.x, this.size);
  }

  private throwComplete(): void {
    if (!this.isAlive) return;
    this.isThrowing = false;
    this.play("snowmanIdle" + this.size);

    this.chooseEvent = this.time.delayedCall(
      Phaser.Math.Between(2000, 4000),
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

    // Ferma movimento e disabilita il body subito
    this.body!.stop();
    this.body!.enable = false; // <-- disabilita collider

    const knockback = "+=" + Phaser.Math.Between(100, 200).toString();

    // Tween di knockback
    this.scene.tweens.add({
      targets: this,
      x: knockback,
      ease: "sine.out",
      duration: 500,
      onComplete: () => {
        // Effetto lampeggio prima di disattivare
        const blinkTimes = 6;
        let blinkCount = 0;
        const blinkInterval = this.scene.time.addEvent({
          delay: 100,
          repeat: blinkTimes - 1,
          callback: () => {
            this.setVisible(!this.visible);
            blinkCount++;
            if (blinkCount >= blinkTimes) {
              // Dopo il lampeggio, disattiva completamente il nemico
              this.setActive(false);
              this.setVisible(false);
              // Collider già disabilitato, non serve riabilitare
              blinkInterval.remove();

              // Crea un nuovo nemico
              const newEnemy = new Snowman(this.scene, this.currentTrack, this.size);

              this.currentTrack.enemiesGroup.add(newEnemy);
              newEnemy.x = this.scene.scale.width + 100;
              newEnemy.start();
            }
          },
        });
      },
    });

    // Aggiorna punteggio
    (this.scene as MainGame).addScore(1);
  }

  stopMovement(): void {
    // Ferma qualsiasi evento pianificato
    this.chooseEvent?.remove();

    // Ferma IA e logica
    this.isAlive = false;
    this.isThrowing = false;

    // Ferma fisica
    this.setVelocity(0);
    this.body?.stop();

    // Ferma animazioni in corso
    this.anims.stop();

    // Imposta l’animazione idle coerente
    this.play("snowmanIdle" + this.size, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.currentTrack) return;

    // Controllo game over lato sinistro
    if (this.currentTrack && this.x <= this.currentTrack.NEST_WIDTH) {
      this.stopMovement();
      (this.scene as MainGame).gameOver("enemy");
    }
  }
}
