/* eslint-disable no-console */
import * as Phaser from "phaser";

import {loadAudios, loadFonts, loadImages, loadSpritesheets} from "../shared/utils/load-assets";
import {BubbleShooterAssetConf} from "../shared/config/asset-conf.const";

// TODO: We can enhance the readability exporting the load progress status.
export class Boot extends Phaser.Scene {
  #loadBar!: Phaser.GameObjects.Graphics;
  #progressBar!: Phaser.GameObjects.Graphics;

  logo?: string;
  bg1?: string;
  bg2?: string;
  typeImage?: number;
  isTesting: boolean = false;
  logoPhaser?: string; //! Solo per test

  isInit: boolean = false;

  constructor() {
    super({key: BubbleShooterAssetConf.scene.boot});
  }

  init(data: {
    bg1: string;
    bg2: string;
    typeImage: number;
    isTesting: boolean;
    logoPhaser: string;
  }) {
    if (!this.isInit) {
      //! Se serve prendere qualche dato dal file game.tsx
      // this.bg1 = data.bg1;
      // this.bg2 = data.bg2;
      // this.typeImage = data.typeImage;
      // this.isTesting = data.isTesting;
      this.logoPhaser = data.logoPhaser; //! Solo per test

      this.isInit = true;
    }
  }

  preload() {
    console.log("Load boot.ts");
    this.#createBars();

    // Set up progress bar update
    this.load.on(
      "progress",
      (value: any) => {
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
      this.startGame();
    });

    this.#loadAssets();

    // Initialize game data
    this.registry.set(BubbleShooterAssetConf.registry.score, 0);
    this.registry.set(BubbleShooterAssetConf.registry.coins, 0);

    //! Da qui si assegnano le immagini da next dentro il gioco creato in phaser
    // this.load.image("bg1", this.bg1);
    // this.load.image("bg2", this.bg2);
    this.load.image("logoPhaser", this.logoPhaser); //! Solo per test

    console.log("Load Images boot.ts");
  }

  startGame() {
    //this.scene.start(BubbleShooterAssetConf.scene.game, {typeImage: this.typeImage});
    console.log("Start Tutorial");
    this.scene.start(BubbleShooterAssetConf.scene.tutorial);
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
}
