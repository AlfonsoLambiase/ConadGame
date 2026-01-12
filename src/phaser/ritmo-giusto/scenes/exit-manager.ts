
/* eslint-disable @typescript-eslint/no-unused-vars */
import {RitmoGiustoAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

import {EventBus} from "@/phaser/EventBus";
import {PhaserEvents} from "@/lib/phaser-events";

const assetConf = RitmoGiustoAssetConf; //* Generalizzazione

export class ExitManager extends Phaser.Scene {
  private width!: number;
  private height!: number;

  private backgroundOverlay!: Phaser.GameObjects.Graphics;
  private popupContainer!: Phaser.GameObjects.Container;

  gameScene!: Game;

  constructor(scene: Phaser.Scene) {
    super({key: assetConf.scene.exitManager});
    this.gameScene = scene as Game;
  }

  create() {
    const config = this.sys.game.config as {width: number; height: number};

    this.height = config.height;
    this.width = config.width;

    if (this.scene.isActive(assetConf.scene.game)) {
      this.scene.pause(assetConf.scene.game);
      this.sound.pauseAll();
    }

    this.#addBackgroundOverlay();
    this.#addPopup();
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  #addBackgroundOverlay() {
    this.backgroundOverlay = this.add.graphics();
    this.backgroundOverlay.fillStyle(0x000000, 0.5);
    this.backgroundOverlay.fillRect(0, 0, this.width, this.height);
    this.backgroundOverlay.setDepth(100);
  }

  #addPopup() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.popupContainer = this.add
      .container(centerX, centerY)
      .setDepth(101)
      .setScrollFactor(0)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 0.95));

    // Load popup background image
    const popupExitGame = this.add
      .image(0, 0, assetConf.image.popupExitGame)
      .setOrigin(0.5)
      .setDepth(101);

    // Cancel button
    const btnCancel = this.add
      .image(-277, 250, assetConf.image.btnCancel) // horizontal
      //.image(-509, 194, assetConf.image.btnCancel) // vertical
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({useHandCursor: true});

    btnCancel.on("pointerdown", () => {
      console.log("Premuto Cancel: chiusura popup");
      this.gameScene.gameManager.resumeGame();
      this.backgroundOverlay.setVisible(false);
      this.popupContainer.setVisible(false);

      if (!this.scene.isActive(assetConf.scene.game)) {
        this.scene.resume(assetConf.scene.game);
        this.sound.resumeAll();
      }
    });

    // Confirm button
    const btnConfirm = this.add
      .image(267.5, 250, assetConf.image.btnConfirm) // horizontal
      //.image(498, 194, assetConf.image.btnConfirm) // vertical
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({useHandCursor: true});

    btnConfirm.on("pointerdown", () => {
      const game = this.scene.get(assetConf.scene.game) as Game;

      if (game.theme) game.theme.stop();
      EventBus.emit(PhaserEvents.EXIT_GAME);
    });

    // Add elements to the popup container
    this.popupContainer.add([popupExitGame, btnCancel, btnConfirm]);
  }

  public createExitButton(scene: Phaser.Scene, theme?: Phaser.Sound.BaseSound) {
    const config = scene.sys.game.config as {width: number; height: number};
    const width = config.width;

    const isTesting: boolean = scene.registry.get("test"); // prende variabile dall'esterno

    const exitButton = scene.add
      .image(
        width - this.gameScene.setDynamicValueBasedOnScale(50, 120),
        this.gameScene.setDynamicValueBasedOnScale(50, 120),
        assetConf.image.btnExitGame,
      )
      .setOrigin(0.5)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(100)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.35, 1.0));

    exitButton.on("pointerdown", () => {
      if (isTesting) {
        if (theme) theme.stop();
        EventBus.emit(PhaserEvents.EXIT_GAME);
      } else {
        console.log("Premuto Exit Button: apertura popup");
        this.gameScene.gameManager.pauseGame();
        scene.scene.launch(assetConf.scene.exitManager);
        const exitManager = scene.scene.get(assetConf.scene.exitManager) as ExitManager;
      }
    });

    return exitButton;
  }
}
