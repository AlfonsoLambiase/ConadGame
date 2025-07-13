/* eslint-disable @typescript-eslint/no-unused-vars */

import Phaser from "phaser";

import { AudioManager } from "../components/audioManager";
import { BottleSortPuzzleAssetConf } from "../shared/config/asset-conf.const";

import { Game } from "./game";

interface GameObject {
  type: number; // 0, 1, 2, 3
  sprite: Phaser.GameObjects.Image;
}

interface Bottle {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Image;
  objects: GameObject[];
  maxCapacity: number;
  position: { x: number; y: number };
  index: number;
  glowEffect?: Phaser.GameObjects.Graphics; // aggiunto per sostituire any
}

export class BottleSortPuzzleManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;

  private bottles: Bottle[] = [];
  private selectedBottle: Bottle | null = null;
  private isAnimating: boolean = false;

  // Configurazione gioco
  private readonly BOTTLE_COUNT = 6; //! 6 bottiglie
  //private readonly BOTTLE_COUNT = 5; //! 5 bottiglie
  private readonly OBJECTS_PER_BOTTLE = 4;
  private readonly OBJECT_TYPES = 4; //! ⚠️ Attenzione: serve aumentare anche BOTTLE_COUNT proporzionalmente (di solito almeno OBJECT_TYPES + 2).

  private scaleBottle = 1.0;

  constructor() {
    super({ key: BottleSortPuzzleAssetConf.scene.bottleSortManager });
  }

  init(data: { gameScene?: Game }) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    console.log("Start game bottle sort puzzle YESSSSS");

    this.computeLayoutDimensions();
    this.createBottles();
    this.fillBottlesWithObjects();
    this.setupInteraction();
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as { width: number; height: number };

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);
  }

  private createBottles(): void {
    const bottleWidth = 354 * this.scaleBottle;
    const bottleHeight = 632 * this.scaleBottle;
    const spacingX = bottleWidth + 40;
    const spacingY = bottleHeight + 40;

    const maxCols = 3;
    const topRowCount = Math.min(this.BOTTLE_COUNT, maxCols);
    const remainingCount = this.BOTTLE_COUNT - topRowCount;
    const fullRows = Math.ceil(remainingCount / maxCols);
    const totalRows = (remainingCount > 0 ? 1 : 0) + 1;

    const startY = this.gameHeight / 2 - ((totalRows - 1) * spacingY) / 2;

    for (let i = 0; i < this.BOTTLE_COUNT; i++) {
      let row = 0;
      let col = i;

      if (i < topRowCount) {
        row = 0;
        col = i;
      } else {
        const j = i - topRowCount;

        row = 1 + Math.floor(j / maxCols);
        col = j % maxCols;
      }

      const bottlesInThisRow =
        row === 0
          ? topRowCount
          : row === totalRows - 1 && remainingCount % maxCols !== 0
          ? remainingCount % maxCols || maxCols
          : maxCols;

      const startX = this.gameWidth / 2 - ((bottlesInThisRow - 1) * spacingX) / 2;

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const bottle = this.createBottle(x, y, i);

      this.bottles.push(bottle);
    }
  }

  private createBottle(x: number, y: number, index: number): Bottle {
    const container = this.add.container(x, y);
    const background = this.add.image(0, 0, BottleSortPuzzleAssetConf.image.bottleGlass);

    background.setScale(this.scaleBottle);

    background.setInteractive();

    container.add(background);

    const bottle: Bottle = {
      container: container,
      background: background,
      objects: [],
      maxCapacity: this.OBJECTS_PER_BOTTLE,
      position: { x, y },
      index: index,
    };

    return bottle;
  }

  private fillBottlesWithObjects(): void {
    const allObjects: number[] = [];

    for (let type = 0; type < this.OBJECT_TYPES; type++) {
      for (let count = 0; count < this.OBJECTS_PER_BOTTLE; count++) {
        allObjects.push(type);
      }
    }

    this.shuffleArray(allObjects);

    const bottlesToFill = this.OBJECT_TYPES;
    let objectIndex = 0;

    for (let bottleIndex = 0; bottleIndex < bottlesToFill; bottleIndex++) {
      const bottle = this.bottles[bottleIndex];

      for (let i = 0; i < this.OBJECTS_PER_BOTTLE; i++) {
        const objectType = allObjects[objectIndex++];

        this.addObjectToBottle(bottle, objectType, false);
      }
    }
  }

  private addObjectToBottle(bottle: Bottle, objectType: number, animate: boolean = true): void {
    const objectSprite = this.add.image(0, 0, `product${objectType}`);

    const scaleX = this.scaleBottle;
    const scaleY = this.scaleBottle;

    objectSprite.setScale(scaleX, scaleY);

    const objectY = this.getObjectPositionInBottle(bottle.objects.length);

    if (animate) {
      objectSprite.setPosition(0, -200);
      objectSprite.setAlpha(0);

      this.tweens.add({
        targets: objectSprite,
        y: objectY,
        alpha: 1,
        duration: 400,
        ease: "Bounce.easeOut",
      });
    } else {
      objectSprite.setPosition(0, objectY);
    }

    bottle.container.add(objectSprite);

    const gameObject: GameObject = {
      type: objectType,
      sprite: objectSprite,
    };

    bottle.objects.push(gameObject);
  }

  private getObjectPositionInBottle(index: number): number {
    const bottleBottom = 300;
    const objectHeight = 130 * this.scaleBottle;
    const objectSpacing = 5;

    return bottleBottom - index * (objectHeight + objectSpacing) - objectHeight / 2;
  }

  private setupInteraction(): void {
    this.bottles.forEach((bottle) => {
      bottle.background.on("pointerdown", () => {
        if (this.isAnimating) return;

        this.handleBottleClick(bottle);
      });

      bottle.background.on("pointerover", () => {
        if (!this.isAnimating) {
          bottle.background.setTint(0xdddddd);
        }
      });

      bottle.background.on("pointerout", () => {
        if (bottle !== this.selectedBottle) {
          bottle.background.clearTint();
        }
      });
    });
  }

  private handleBottleClick(bottle: Bottle): void {
    if (this.selectedBottle === null) {
      if (bottle.objects.length > 0) {
        this.selectBottle(bottle);
      }
    } else if (this.selectedBottle === bottle) {
      this.deselectBottle();
    } else {
      this.attemptMove(this.selectedBottle, bottle);
    }
  }

  private selectBottle(bottle: Bottle): void {
    this.selectedBottle = bottle;

    bottle.background.setTint(0x90ee90);

    const glowEffect = this.add.graphics();

    glowEffect.lineStyle(4, 0x00ff00, 1);
    glowEffect.strokeRect(
      (-bottle.background.width * this.scaleBottle) / 2,
      (-bottle.background.height * this.scaleBottle) / 2,
      bottle.background.width * this.scaleBottle,
      bottle.background.height * this.scaleBottle,
    );

    bottle.container.add(glowEffect);

    bottle.glowEffect = glowEffect;

    this.tweens.add({
      targets: bottle.container,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      ease: "Power2.easeOut",
    });
  }

  private deselectBottle(): void {
    if (this.selectedBottle) {
      this.selectedBottle.background.clearTint();

      const glowEffect = this.selectedBottle.glowEffect;

      if (glowEffect) {
        glowEffect.destroy();
        delete this.selectedBottle.glowEffect;
      }

      this.tweens.add({
        targets: this.selectedBottle.container,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: "Power2.easeOut",
      });

      this.selectedBottle = null;
    }
  }

  private attemptMove(fromBottle: Bottle, toBottle: Bottle): void {
    const moveCount = this.getValidMoveCount(fromBottle, toBottle);

    if (moveCount === 0) {
      this.deselectBottle();
      return;
    }

    this.isAnimating = true;

    for (let i = 0; i < moveCount; i++) {
      this.moveObject(fromBottle, toBottle);
    }

    this.time.delayedCall(500, () => {
      this.isAnimating = false;
      this.deselectBottle();

      this.checkGameOver();
    });
  }

  private getValidMoveCount(fromBottle: Bottle, toBottle: Bottle): number {
    if (toBottle.objects.length >= toBottle.maxCapacity) return 0;
    if (fromBottle.objects.length === 0) return 0;

    const fromTop = fromBottle.objects[fromBottle.objects.length - 1];
    const toTop = toBottle.objects[toBottle.objects.length - 1];

    if (toBottle.objects.length === 0) return 1;

    if (fromTop.type !== toTop.type) return 0;

    let count = 0;
    let fromIndex = fromBottle.objects.length - 1;
    const toIndex = toBottle.objects.length - 1;

    const targetType = fromTop.type;

    while (
      fromIndex >= 0 &&
      fromBottle.objects[fromIndex].type === targetType &&
      toBottle.objects.length + count < toBottle.maxCapacity
    ) {
      count++;
      fromIndex--;
    }

    return count;
  }

  private moveObject(fromBottle: Bottle, toBottle: Bottle): void {
    const objectToMove = fromBottle.objects.pop();

    if (!objectToMove) return;

    const sprite = objectToMove.sprite;

    this.tweens.add({
      targets: sprite,
      x: toBottle.position.x - fromBottle.position.x,
      y: this.getObjectPositionInBottle(toBottle.objects.length),
      duration: 400,
      ease: "Power2.easeInOut",
      onComplete: () => {
        toBottle.objects.push(objectToMove);
        fromBottle.container.remove(sprite);
        toBottle.container.add(sprite);
        sprite.x = 0;
        sprite.y = this.getObjectPositionInBottle(toBottle.objects.length - 1);
      },
    });
  }

  private checkGameOver(): void {
    const allSorted = this.bottles.every((bottle) => {
      if (bottle.objects.length === 0) return true;

      const firstType = bottle.objects[0].type;

      return bottle.objects.every((obj) => obj.type === firstType);
    });

    if (allSorted) {
      this.isGameOver = true;

      console.log("Game Over! Hai vinto!");
      // Puoi qui aggiungere animazioni o chiamare un evento di vittoria
    }
  }

  private shuffleArray(array: number[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
