import * as Phaser from "phaser";

import {Game} from "../scenes/game";

import Track from "./track";

interface MainGameScene extends Phaser.Scene {
  tracks: Track[];
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private isAlive!: boolean;
  private isThrowing!: boolean;
  private sound!: Phaser.Sound.BaseSoundManager;
  public currentTrack!: Track;

  private spacebar!: Phaser.Input.Keyboard.Key;
  private up!: Phaser.Input.Keyboard.Key;
  private down!: Phaser.Input.Keyboard.Key;

  gameScene!: Game;
  private offsetYPlayer: number = 10;

  constructor(scene: Phaser.Scene, track: Track) {
    // posizione iniziale del player
    //super(scene, 150, track.y, "player", "idle");
    // ✅ Ottieni riferimento alla scena principale PRIMA di super()
    const mainGame = track.mainGame;
    const gameScene = mainGame.gameScene;

    // ✅ Calcola la X dinamica
    const playerX = gameScene.setDynamicValueBasedOnScale(200, 500);

    // posizione iniziale del player
    super(scene, playerX, track.y, "player", "idle");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.sound = scene.sound;
    this.currentTrack = track;

    this.gameScene = track.mainGame.gameScene;
  }

  start(): void {
    this.spacebar = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.up = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.down = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    this.setOrigin(0.5, 1);
    //this.setFlipX(true); //* Inverte la direzione in x dello sprite, se necessario

    const colliderWidth = this.displayWidth / 2;
    const colliderHeight = this.displayHeight * (2 / 3);

    // Calcola l’offset per centrare il collider in X
    const offsetX = (this.displayWidth - colliderWidth) / 2;

    // Calcola l’offset in Y in modo che il collider parta dal basso
    const offsetY = this.displayHeight - colliderHeight;

    //* Applica collider in x la meta della dimensione X e in y 2/3 del collider in y ma con pivot giu.
    this.body!.setSize(colliderWidth, colliderHeight);
    this.body!.setOffset(offsetX, offsetY);

    this.setScale(this.gameScene.setDynamicValueBasedOnScale(0.65, 2.0));

    this.isAlive = true;
    this.isThrowing = false;

    this.currentTrack = (this.scene as MainGameScene).tracks[0];
    this.y = this.currentTrack.y - this.offsetYPlayer;

    this.on("animationcomplete-throwStart", this.releaseSnowball, this);
    this.on("animationcomplete-throwEnd", this.throwComplete, this);

    this.play("idle", true);
  }

  moveUp(): void {
    const tracks = (this.scene as MainGameScene).tracks as Track[];

    if (this.currentTrack.id === 0) {
      this.currentTrack = tracks[3];
    } else {
      this.currentTrack = tracks[this.currentTrack.id - 1];
    }

    this.y = this.currentTrack.y - this.offsetYPlayer;
    this.sound.play("move");
  }

  moveDown(): void {
    const tracks = (this.scene as MainGameScene).tracks as Track[];

    if (this.currentTrack.id === 3) {
      this.currentTrack = tracks[0];
    } else {
      this.currentTrack = tracks[this.currentTrack.id + 1];
    }

    this.y = this.currentTrack.y - this.offsetYPlayer;
    this.sound.play("move");
  }

  throw(): void {
    this.isThrowing = true;
    this.play("throwStart");
    this.sound.play("throw");
  }

  releaseSnowball(): void {
    this.play("throwEnd");
    this.currentTrack.throwPlayerSnowball(this.x, this);
  }

  throwComplete(): void {
    this.isThrowing = false;
    this.play("idle");
  }

  stopMovement(): void {
    this.isAlive = false;

    this.body!.stop();
    this.play("die");
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.isAlive) return;

    if (Phaser.Input.Keyboard.JustDown(this.up)) {
      this.moveUp();
    } else if (Phaser.Input.Keyboard.JustDown(this.down)) {
      this.moveDown();
    } else if (Phaser.Input.Keyboard.JustDown(this.spacebar) && !this.isThrowing) {
      this.throw();
    }
  }
}
