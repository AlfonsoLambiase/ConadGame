/* eslint-disable @typescript-eslint/no-unused-vars */
import {PrendiOggettiAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

import {EventBus} from "@/phaser/EventBus";
import {PhaserEvents} from "@/lib/phaser-events";

const assetConf = PrendiOggettiAssetConf;

export class ExitManager extends Phaser.Scene {
  private width!: number;
  private height!: number;

  private backgroundOverlay!: Phaser.GameObjects.Graphics;
  private popupContainer!: Phaser.GameObjects.Container;
  private exitButton!: Phaser.GameObjects.Image;

  gameScene!: Game;
  private isTesting: boolean = false;

  constructor(scene: Phaser.Scene) {
    super({key: assetConf.scene.exitManager});
    this.gameScene = scene as Game;
  }

  create() {
    const config = this.sys.game.config as {width: number; height: number};

    this.height = config.height;
    this.width = config.width;

    this.isTesting = this.registry.get("test") || false;

    // Crea il pulsante exit sempre visibile
    this.#createExitButton();

    // Nascondi popup inizialmente
    this.#addBackgroundOverlay();
    this.#addPopup();

    this.backgroundOverlay.setVisible(false);
    this.popupContainer.setVisible(false);
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  #createExitButton() {
    this.exitButton = this.add
      .image(
        this.width - this.gameScene.setDynamicValueBasedOnScale(50, 120),
        this.gameScene.setDynamicValueBasedOnScale(50, 120),
        assetConf.image.btnExitGame,
      )
      .setOrigin(0.5)
      .setInteractive({useHandCursor: true})
      .setScrollFactor(0)
      .setDepth(100)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.35, 1.0));

    this.exitButton.on("pointerdown", () => {
      if (this.isTesting) {
        // Modalità testing: esci direttamente
        const game = this.scene.get(assetConf.scene.game) as Game;

        if (game.theme) game.theme.stop();
        EventBus.emit(PhaserEvents.EXIT_GAME);
      } else {
        // Modalità normale: mostra popup di conferma
        this.gameScene.gameManager.pauseGame();
        this.showPopup();
      }
    });
  }

  #addBackgroundOverlay() {
    this.backgroundOverlay = this.add.graphics();
    this.backgroundOverlay.fillStyle(0x000000, 0.5);
    this.backgroundOverlay.fillRect(0, 0, this.width, this.height);
    this.backgroundOverlay.setDepth(101);
  }

  #addPopup() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.popupContainer = this.add
      .container(centerX, centerY)
      .setDepth(102)
      .setScrollFactor(0)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 0.95));

    // Load popup background image
    const popupExitGame = this.add.image(0, 0, assetConf.image.popupExitGame).setOrigin(0.5);

    // Cancel button
    const btnCancel = this.add
      .image(-277, 250, assetConf.image.btnCancel)
      .setOrigin(0.5)
      .setInteractive({useHandCursor: true});

    btnCancel.on("pointerdown", () => {
      this.gameScene.gameManager.resumeGame();
      this.hidePopup();
    });

    // Confirm button
    const btnConfirm = this.add
      .image(267.5, 250, assetConf.image.btnConfirm)
      .setOrigin(0.5)
      .setInteractive({useHandCursor: true});

    btnConfirm.on("pointerdown", () => {
      const game = this.scene.get(assetConf.scene.game) as Game;

      if (game.theme) game.theme.stop();
      EventBus.emit(PhaserEvents.EXIT_GAME);
    });

    // Add elements to the popup container
    this.popupContainer.add([popupExitGame, btnCancel, btnConfirm]);
  }

  private showPopup() {
    // Pausa il gioco
    if (this.scene.isActive(assetConf.scene.game)) {
      this.scene.pause(assetConf.scene.game);
      this.sound.pauseAll();
    }

    // Mostra overlay e popup
    this.backgroundOverlay.setVisible(true);
    this.popupContainer.setVisible(true);
  }

  private hidePopup() {
    // Nascondi overlay e popup
    this.backgroundOverlay.setVisible(false);
    this.popupContainer.setVisible(false);

    // Riprendi il gioco
    if (!this.scene.isActive(assetConf.scene.game)) {
      this.scene.resume(assetConf.scene.game);
      this.sound.resumeAll();
    }
  }
}
