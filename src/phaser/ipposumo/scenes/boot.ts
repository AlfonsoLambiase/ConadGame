import * as Phaser from "phaser";

import {loadAudios, loadFonts, loadImages, loadSpritesheets} from "../shared/utils/load-assets";
import {IpposumoAssetConf} from "../shared/config/asset-conf.const";

const assetConf = IpposumoAssetConf; //* Generalizzazione

// TODO: We can enhance the readability exporting the load progress status.
export class Boot extends Phaser.Scene {
  #loadBar!: Phaser.GameObjects.Graphics;
  #progressBar!: Phaser.GameObjects.Graphics;

  sponsorLogo?: string;
  isTesting: boolean = false;
  safeTop: number = 0; //! notch Area

  isInit: boolean = false;

  constructor() {
    super({key: assetConf.scene.boot});
  }

  init(data: {
    sponsorLogo: string;
    isTesting: boolean;
    safeTop?: number; //! notch Area
  }) {
    if (!this.isInit) {
      this.sponsorLogo = data.sponsorLogo;
      this.isTesting = data.isTesting;
      this.safeTop = data.safeTop || 0; //! notch Area

      this.registry.set("safeTop", this.safeTop); //! notch Area

      this.isInit = true;
    }
  }

  preload() {
    console.log("Safe area top:", this.safeTop); //! notch Area
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
    this.registry.set("sponsorLogo", this.sponsorLogo);
    this.registry.set("test", this.isTesting);

    if (this.sponsorLogo !== "empty") {
      this.load.image("logo", this.sponsorLogo);
    }
  }

  startGame() {
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
}
