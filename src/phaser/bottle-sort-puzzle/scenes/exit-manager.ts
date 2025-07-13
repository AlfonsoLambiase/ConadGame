import {BottleSortPuzzleAssetConf} from "../shared/config/asset-conf.const";
import {Game} from "./game";


export class ExitManager extends Phaser.Scene {
  private width!: number;
  private height!: number;

  private backgroundOverlay!: Phaser.GameObjects.Graphics;
  private popupContainer!: Phaser.GameObjects.Container;

  gameScene!: Game;

  constructor(scene: Phaser.Scene) {
    super({key: BottleSortPuzzleAssetConf.scene.exitManager});
    this.gameScene = scene as Game;
  }

  create() {
    const config = this.sys.game.config as {width: number; height: number};
    this.height = config.height;
    this.width = config.width;

    if (this.scene.isActive(BottleSortPuzzleAssetConf.scene.game)) {
      this.scene.pause(BottleSortPuzzleAssetConf.scene.game);
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
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 1.1));

    const popupExitGame = this.add
      .image(0, 0, BottleSortPuzzleAssetConf.image.popupExitGame)
      .setOrigin(0.5)
      .setDepth(101);

    const btnCancel = this.add
      .image(-277, 250, BottleSortPuzzleAssetConf.image.btnCancel)
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({useHandCursor: true});

    btnCancel.on("pointerdown", () => {
      this.backgroundOverlay.setVisible(false);
      this.popupContainer.setVisible(false);

      if (!this.scene.isActive(BottleSortPuzzleAssetConf.scene.game)) {
        this.scene.resume(BottleSortPuzzleAssetConf.scene.game);
        this.sound.resumeAll();
      }
    });

    const btnConfirm = this.add
      .image(267.5, 250, BottleSortPuzzleAssetConf.image.btnConfirm)
      .setOrigin(0.5)
      .setDepth(102)
      .setInteractive({useHandCursor: true});

    btnConfirm.on("pointerdown", () => {
      // Al posto di emettere l'evento EXIT_GAME, fai il redirect a root
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    });

    this.popupContainer.add([popupExitGame, btnCancel, btnConfirm]);
  }

  public createExitButton(scene: Phaser.Scene, theme?: Phaser.Sound.BaseSound) {
    const config = scene.sys.game.config as {width: number; height: number};
    const width = config.width;

    const isTesting: boolean = scene.registry.get("test");

    const exitButton = scene.add
      .image(
        width - this.gameScene.setDynamicValueBasedOnScale(50, 120),
        this.gameScene.setDynamicValueBasedOnScale(50, 120),
        BottleSortPuzzleAssetConf.image.btnExitGame,
      )
      .setOrigin(0.5)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(100)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.35, 1.0));

    exitButton.on("pointerdown", () => {
      if (isTesting) {
        if (theme) theme.stop();
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      } else {
        scene.scene.launch(BottleSortPuzzleAssetConf.scene.exitManager);
        // const exitManager = scene.scene.get(BottleSortPuzzleAssetConf.scene.exitManager) as ExitManager;
      }
    });

    return exitButton;
  }
}
