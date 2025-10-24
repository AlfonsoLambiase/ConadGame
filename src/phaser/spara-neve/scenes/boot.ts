import * as Phaser from "phaser";

import {loadAudios, loadFonts, loadImages, loadSpritesheets} from "../shared/utils/load-assets";
import {GameSparaNeveAssetConf} from "../shared/config/asset-conf.const";

const assetConf = GameSparaNeveAssetConf; //* Generalizzazione

// TODO: We can enhance the readability exporting the load progress status.
export class Boot extends Phaser.Scene {
  #loadBar!: Phaser.GameObjects.Graphics;
  #progressBar!: Phaser.GameObjects.Graphics;

  sponsorLogo?: string;
  isTesting: boolean = false;

  isInit: boolean = false;

  constructor() {
    super({key: assetConf.scene.boot});
  }

  init(data: {sponsorLogo: string; isTesting: boolean}) {
    if (!this.isInit) {
      this.sponsorLogo = data.sponsorLogo;
      this.isTesting = data.isTesting;

      this.isInit = true;
    }
  }

  preload() {
    console.log("Load boot.ts");
    this.#createBars();

    const loadStartTime = Date.now();

    // Set up progress bar update
    this.load.on(
      "progress",
      (value: number) => {
        this.#progressBar.clear();
        this.#progressBar.fillStyle(0xbf5505, 1);
        this.#progressBar.fillRoundedRect(
          this.cameras.main.width / 4,
          this.cameras.main.height - 96,
          (this.cameras.main.width / 2) * value,
          16,
          8,
        );
      },
      this,
    );

    // Set up loading complete callback
    this.load.on("complete", () => {
      const elapsed = Date.now() - loadStartTime;
      const minDuration = 1000; // 1 secondo

      if (elapsed < minDuration) {
        setTimeout(() => {
          this.startGame();
        }, minDuration - elapsed);
      } else {
        this.startGame();
      }
    });

    this.#loadAssets();

    // Initialize game data
    this.registry.set(assetConf.registry.score, 0);
    this.registry.set(assetConf.registry.coins, 0);

    this.load.image("logo", this.sponsorLogo);
    this.registry.set("sponsorLogo", this.sponsorLogo);
    this.registry.set("highscore", 0); //! Temporale cancellare

    this.preloadGame();
  }

  create() {
    this.createAnimGame();
  }

  startGame() {
    //this.scene.start(BubbleShooterAssetConf.scene.game, {typeImage: this.typeImage});
    console.log("Start Tutorial");
    this.scene.start(assetConf.scene.tutorial);
  }

  #createBars() {
    this.#loadBar = this.add.graphics();
    this.#loadBar.fillStyle(0xef6c00, 1);
    this.#loadBar.fillRoundedRect(
      this.cameras.main.width / 4 - 2,
      this.cameras.main.height - 100,
      this.cameras.main.width / 2 + 4,
      24,
      12,
    );
    this.#progressBar = this.add.graphics();
  }

  #loadAssets(): void {
    loadAudios(this);
    loadSpritesheets(this);
    loadImages(this);
    loadFonts(this);
  }

  //! Added New Scripts
  preloadGame(): void {
    // Caricamento shaders
    this.load.setPath("/games/spara-neve/shaders/");
    this.load.glsl("snowEffect", "snow.glsl");
  }

  createAnimGame(): void {
    // Creazione animazioni globali
    const anims = this.anims;

    anims.create({
      key: "die",
      frames: anims.generateFrameNumbers("player", {start: 0, end: 0}),
    });

    anims.create({
      key: "idle",
      frames: anims.generateFrameNumbers("player", {start: 1, end: 2}),
      yoyo: true,
      frameRate: 3,
      repeat: -1,
    });

    anims.create({
      key: "throwStart",
      frames: anims.generateFrameNumbers("player", {start: 3, end: 11}),
      frameRate: 30,
      repeat: 0,
    });

    anims.create({
      key: "throwEnd",
      frames: anims.generateFrameNumbers("player", {start: 12, end: 14}),
      frameRate: 30,
      repeat: 0,
    });

    anims.create({
      key: "snowmanIdleBig",
      frames: anims.generateFrameNumbers("snowmanBig", {start: 5, end: 8}),
      yoyo: true,
      frameRate: 8,
      repeat: -1,
    });

    anims.create({
      key: "snowmanWalkBig",
      frames: anims.generateFrameNumbers("snowmanBig", {start: 18, end: 25}),
      frameRate: 8,
      repeat: -1,
    });

    anims.create({
      key: "snowmanThrowStartBig",
      frames: anims.generateFrameNumbers("snowmanBig", {start: 9, end: 14}),
      frameRate: 20,
    });

    anims.create({
      key: "snowmanThrowEndBig",
      frames: anims.generateFrameNumbers("snowmanBig", {start: 15, end: 17}),
      frameRate: 20,
    });

    anims.create({
      key: "snowmanDieBig",
      frames: anims.generateFrameNumbers("snowmanBig", {start: 0, end: 4}),
      frameRate: 14,
    });

    anims.create({
      key: "snowmanIdleSmall",
      frames: anims.generateFrameNumbers("snowmanSmall", {start: 5, end: 8}),
      yoyo: true,
      frameRate: 8,
      repeat: -1,
    });

    anims.create({
      key: "snowmanWalkSmall",
      frames: anims.generateFrameNumbers("snowmanSmall", {start: 18, end: 25}),
      frameRate: 8,
      repeat: -1,
    });

    anims.create({
      key: "snowmanThrowStartSmall",
      frames: anims.generateFrameNumbers("snowmanSmall", {start: 9, end: 14}),
      frameRate: 20,
    });

    anims.create({
      key: "snowmanThrowEndSmall",
      frames: anims.generateFrameNumbers("snowmanSmall", {start: 15, end: 17}),
      frameRate: 20,
    });

    anims.create({
      key: "snowmanDieSmall",
      frames: anims.generateFrameNumbers("snowmanSmall", {start: 0, end: 4}),
      frameRate: 14,
    });
  }
}
