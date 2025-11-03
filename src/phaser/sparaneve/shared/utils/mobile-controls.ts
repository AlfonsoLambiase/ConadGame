
import * as Phaser from "phaser";

import {Game} from "../../scenes/game";
import {SparaNeveAssetConf} from "../config/asset-conf.const";

const assetConf = SparaNeveAssetConf;

export default class MobileControlsScene extends Phaser.Scene {
  private gameScene!: Game;

  constructor() {
    super({key: assetConf.scene.mobileControlsScene});
  }

  init(data: {gameScene: Game}) {
    this.gameScene = data.gameScene;
  }

  create(): void {
    const width = Number(this.sys.game.config.width);
    const height = Number(this.sys.game.config.height);

    const buttonLeftXPosition = 64 * 2 - this.gameScene.setDynamicValueBasedOnScale(0, -500);
    const buttonRightXPosition = 64 * 7 - this.gameScene.setDynamicValueBasedOnScale(64 * 2, -600);
    const buttonJumpXPosition = width - 64 * 4 + this.gameScene.setDynamicValueBasedOnScale(64, 0);
    const buttonHeightPosition =
      height - 64 * 3 + this.gameScene.setDynamicValueBasedOnScale(64, -150);

    this.createButton(buttonLeftXPosition, buttonHeightPosition, assetConf.image.arrowDown);
    this.createButton(buttonRightXPosition, buttonHeightPosition, assetConf.image.arrowUp);
    this.createButton(buttonJumpXPosition, buttonHeightPosition, assetConf.image.arrowBurst);

    // LEFT ZONE
    const leftZoneWidth = 64 * 5.5 - this.gameScene.setDynamicValueBasedOnScale(80, -600);
    const leftZone = this.add.zone(0, 0, leftZoneWidth, height);

    leftZone.setOrigin(0).setInteractive();
    //drawZoneOverlay(this.gameScene, 0, 0, leftZoneWidth, height, 0xff0000, 0.2); // Rosso semi-trasparente // * Indica la zona cliccabile

    // RIGHT ZONE
    const rightZoneX = 64 * 5.5 - this.gameScene.setDynamicValueBasedOnScale(80, -600);
    const rightZoneWidth = width / 2 - leftZoneWidth;
    const rightZone = this.add.zone(rightZoneX, 0, rightZoneWidth, height);

    rightZone.setOrigin(0).setInteractive();
    //drawZoneOverlay(this.gameScene, rightZoneX, 0, rightZoneWidth, height, 0x00ff00, 0.2); // Verde semi-trasparente // * Indica la zona cliccabile

    // JUMP ZONE (solo metà inferiore dello schermo)
    const jumpZoneHeight = height / 2;
    const jumpZoneY = height / 2;
    const jumpZoneX = width / 2;
    const jumpZone = this.add.zone(jumpZoneX, jumpZoneY, width / 2, jumpZoneHeight);

    jumpZone.setOrigin(0).setInteractive();
    //drawZoneOverlay(this.gameScene, jumpZoneX, jumpZoneY, width / 2, jumpZoneHeight, 0x0000ff, 0.2); // Blu semi-trasparente // * Indica la zona cliccabile

    // Interazioni
    leftZone
      .on("pointerdown", () => {
        if (this.gameScene.isGameOver) return;
        this.gameScene.isDownPressed = true;
        console.log("pressed isDownPressed");
      })
      .on("pointerup", () => (this.gameScene.isDownPressed = false))
      .on("pointerout", () => (this.gameScene.isDownPressed = false));

    rightZone
      .on("pointerdown", () => {
        if (this.gameScene.isGameOver) return;
        this.gameScene.isUpPressed = true;
        console.log("pressed isUpPressed");
      })
      .on("pointerup", () => (this.gameScene.isUpPressed = false))
      .on("pointerout", () => (this.gameScene.isUpPressed = false));

    jumpZone
      .on("pointerdown", () => {
        if (this.gameScene.isGameOver) return;
        this.gameScene.isShootPressed = true;
        console.log("pressed isShootPressed");
      })
      .on("pointerup", () => (this.gameScene.isShootPressed = false))
      .on("pointerout", () => (this.gameScene.isShootPressed = false));
  }

  private createButton(x: number, y: number, texture: string): void {
    this.add
      .image(x, y, texture)
      .setInteractive()
      .setOrigin(0)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.58, 1.7))
      .setAlpha(0.5);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const drawZoneOverlay = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
) => {
  const graphics = scene.add.graphics();

  graphics.fillStyle(color, alpha);
  graphics.fillRect(x, y, width, height);
  graphics.setScrollFactor(0);
  graphics.setDepth(20); // sotto i bottoni ma sopra lo sfondo
};
