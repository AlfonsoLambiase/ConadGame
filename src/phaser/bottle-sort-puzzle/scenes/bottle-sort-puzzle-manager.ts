/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {BottleSortPuzzleAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

interface GameObject {
  type: number; // 0, 1, 2, 3
  sprite: Phaser.GameObjects.Image;
}

interface Bottle {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Image;
  objects: GameObject[];
  maxCapacity: number;
  position: {x: number; y: number};
  index: number;
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
    super({key: BottleSortPuzzleAssetConf.scene.bottleSortManager});
  }

  init(data: {gameScene?: Game}) {
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

  //* Scopo: Calcola le dimensioni e la posizione centrale dell'area di gioco
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);
  }

  //* Scopo: Crea le 5 bottiglie nella disposizione 3 sopra il resto sotto
  private createBottles(): void {
    const bottleWidth = 354 * this.scaleBottle;
    const bottleHeight = 632 * this.scaleBottle;
    const spacingX = bottleWidth + 40;
    const spacingY = bottleHeight + 40;

    const maxCols = 3; // massimo 3 bottiglie per riga
    const topRowCount = Math.min(this.BOTTLE_COUNT, maxCols);
    const remainingCount = this.BOTTLE_COUNT - topRowCount;
    const fullRows = Math.ceil(remainingCount / maxCols);
    const totalRows = (remainingCount > 0 ? 1 : 0) + 1; // almeno una riga (sopra), più eventuale sotto

    const startY = this.gameHeight / 2 - ((totalRows - 1) * spacingY) / 2;

    for (let i = 0; i < this.BOTTLE_COUNT; i++) {
      let row = 0;
      let col = i;

      if (i < topRowCount) {
        // prima riga (max 3 bottiglie)
        row = 0;
        col = i;
      } else {
        // bottiglie successive (sotto)
        const j = i - topRowCount;

        row = 1 + Math.floor(j / maxCols); // riga 1, 2, ...
        col = j % maxCols;
      }

      // Bottiglie in questa riga (serve per centrare)
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

  //* Scopo: Crea una singola bottiglia
  private createBottle(x: number, y: number, index: number): Bottle {
    const container = this.add.container(x, y);
    const background = this.add.image(0, 0, BottleSortPuzzleAssetConf.image.bottleGlass);

    background.setScale(this.scaleBottle);

    // Rendi la bottiglia interattiva
    background.setInteractive();

    container.add(background);

    const bottle: Bottle = {
      container: container,
      background: background,
      objects: [],
      maxCapacity: this.OBJECTS_PER_BOTTLE,
      position: {x, y},
      index: index,
    };

    return bottle;
  }

  //* Scopo: Riempie le bottiglie con oggetti casuali
  private fillBottlesWithObjects(): void {
    const allObjects: number[] = [];

    for (let type = 0; type < this.OBJECT_TYPES; type++) {
      for (let count = 0; count < this.OBJECTS_PER_BOTTLE; count++) {
        allObjects.push(type);
      }
    }

    this.shuffleArray(allObjects);

    // Numero di bottiglie da riempire (tutte meno quelle vuote)
    const bottlesToFill = this.OBJECT_TYPES; // 1 bottiglia per tipo
    let objectIndex = 0;

    for (let bottleIndex = 0; bottleIndex < bottlesToFill; bottleIndex++) {
      const bottle = this.bottles[bottleIndex];

      for (let i = 0; i < this.OBJECTS_PER_BOTTLE; i++) {
        const objectType = allObjects[objectIndex++];

        this.addObjectToBottle(bottle, objectType, false);
      }
    }
  }

  //* Scopo: Aggiunge un oggetto a una bottiglia
  private addObjectToBottle(bottle: Bottle, objectType: number, animate: boolean = true): void {
    const objectSprite = this.add.image(0, 0, `product${objectType}`);

    // Scala l'oggetto basandosi sulle dimensioni reali (120*130)
    const scaleX = this.scaleBottle;
    const scaleY = this.scaleBottle;

    objectSprite.setScale(scaleX, scaleY);

    // Calcola la posizione dell'oggetto nella bottiglia
    const objectY = this.getObjectPositionInBottle(bottle.objects.length);

    if (animate) {
      objectSprite.setPosition(0, -200); // Inizia dall'alto
      objectSprite.setAlpha(0);

      // Animazione di caduta
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

  //* Scopo: Calcola la posizione Y dell'oggetto nella bottiglia
  private getObjectPositionInBottle(index: number): number {
    // Posizione relativa al centro della bottiglia
    // La bottiglia è in y 632
    // Il fondo della bottiglia è circa a y=300 dal centro
    const bottleBottom = 300;
    // Dimensioni y dell'oggetto: 130
    const objectHeight = 130 * this.scaleBottle;
    const objectSpacing = 5; // Piccolo spazio tra gli oggetti

    // Posizione dal basso verso l'alto
    return bottleBottom - index * (objectHeight + objectSpacing) - objectHeight / 2;
  }

  //* Scopo: Configura l'interazione con le bottiglie
  private setupInteraction(): void {
    this.bottles.forEach((bottle) => {
      bottle.background.on("pointerdown", () => {
        if (this.isAnimating) return;

        this.handleBottleClick(bottle);
      });

      // Effetto hover
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

  //* Scopo: Gestisce il click su una bottiglia
  private handleBottleClick(bottle: Bottle): void {
    if (this.selectedBottle === null) {
      // Seleziona la bottiglia se ha oggetti
      if (bottle.objects.length > 0) {
        this.selectBottle(bottle);
      }
    } else if (this.selectedBottle === bottle) {
      // Deseleziona se si clicca sulla stessa bottiglia
      this.deselectBottle();
    } else {
      // Tenta di spostare l'oggetto
      this.attemptMove(this.selectedBottle, bottle);
    }
  }

  //* Scopo: Seleziona una bottiglia
  private selectBottle(bottle: Bottle): void {
    this.selectedBottle = bottle;
    // Evidenzia la bottiglia selezionata con un colore verde visibile
    bottle.background.setTint(0x90ee90);

    // Crea un bordo luminoso attorno alla bottiglia
    const glowEffect = this.add.graphics();

    glowEffect.lineStyle(4, 0x00ff00, 1);
    glowEffect.strokeRect(
      (-bottle.background.width * this.scaleBottle) / 2,
      (-bottle.background.height * this.scaleBottle) / 2,
      bottle.background.width * this.scaleBottle,
      bottle.background.height * this.scaleBottle,
    );

    bottle.container.add(glowEffect);

    // Salva il riferimento per poterlo rimuovere dopo
    (bottle as any).glowEffect = glowEffect;

    // Animazione di selezione più pronunciata
    this.tweens.add({
      targets: bottle.container,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      ease: "Power2.easeOut",
    });
  }

  //* Scopo: Deseleziona la bottiglia corrente
  private deselectBottle(): void {
    if (this.selectedBottle) {
      this.selectedBottle.background.clearTint();

      // Rimuovi l'effetto glow
      const glowEffect = (this.selectedBottle as any).glowEffect;

      if (glowEffect) {
        glowEffect.destroy();
        delete (this.selectedBottle as any).glowEffect;
      }

      // Riporta la scala normale
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

  //* Scopo: Tenta di spostare un oggetto da una bottiglia all'altra
  private attemptMove(fromBottle: Bottle, toBottle: Bottle): void {
    // Controlla se il movimento è valido e quanti oggetti possono essere spostati
    const moveCount = this.getValidMoveCount(fromBottle, toBottle);

    if (moveCount === 0) {
      this.deselectBottle();

      return;
    }

    // Esegui il movimento
    this.moveObjects(fromBottle, toBottle, moveCount);
  }

  //* Scopo: Controlla se un movimento è valido e quanti oggetti possono essere spostati
  private getValidMoveCount(fromBottle: Bottle, toBottle: Bottle): number {
    // La bottiglia di origine deve avere oggetti
    if (fromBottle.objects.length === 0) return 0;

    // Se la bottiglia di destinazione è vuota, sposta tutti gli oggetti consecutivi dello stesso tipo dall'alto
    if (toBottle.objects.length === 0) {
      return this.getConsecutiveObjectsFromTop(fromBottle);
    }

    // Altrimenti, controlla la compatibilità
    const topObjectFrom = fromBottle.objects[fromBottle.objects.length - 1];
    const topObjectTo = toBottle.objects[toBottle.objects.length - 1];

    if (topObjectFrom.type !== topObjectTo.type) return 0;

    // Calcola quanti oggetti possono essere spostati
    const consecutiveCount = this.getConsecutiveObjectsFromTop(fromBottle);
    const availableSpace = toBottle.maxCapacity - toBottle.objects.length;

    return Math.min(consecutiveCount, availableSpace);
  }

  //* Scopo: Ottiene il numero di oggetti consecutivi dello stesso tipo dall'alto
  private getConsecutiveObjectsFromTop(bottle: Bottle): number {
    if (bottle.objects.length === 0) return 0;

    const topType = bottle.objects[bottle.objects.length - 1].type;
    let count = 0;

    for (let i = bottle.objects.length - 1; i >= 0; i--) {
      if (bottle.objects[i].type === topType) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  //* Scopo: Sposta più oggetti da una bottiglia all'altra con animazione
  private moveObjects(fromBottle: Bottle, toBottle: Bottle, moveCount: number): void {
    this.isAnimating = true;

    // Ottieni gli oggetti da spostare
    const objectsToMove: GameObject[] = [];

    for (let i = 0; i < moveCount; i++) {
      const obj = fromBottle.objects.pop()!;

      objectsToMove.unshift(obj); // Inserisci all'inizio per mantenere l'ordine corretto
    }

    // Anima ogni oggetto in sequenza
    this.animateObjectsSequentially(objectsToMove, fromBottle, toBottle, 0, () => {
      // Callback quando tutti gli oggetti sono stati spostati
      this.isAnimating = false;
      this.deselectBottle();
      this.checkWinCondition();
    });
  }

  //! Continuare da qui dalle animazioni corrette
  //* Scopo: Anima gli oggetti in sequenza
  private animateObjectsSequentially(
    objects: GameObject[],
    fromBottle: Bottle,
    toBottle: Bottle,
    index: number,
    onComplete: () => void,
  ): void {
    if (index >= objects.length) {
      onComplete();

      return;
    }

    const obj = objects[index];
    const sprite = obj.sprite;

    // Posizioni di partenza e arrivo
    const startX = fromBottle.position.x;
    const startY =
      fromBottle.position.y + this.getObjectPositionInBottle(fromBottle.objects.length);
    //const startY = fromBottle.position.y + this.getObjectPositionInBottle(index); //! NO

    const endX = toBottle.position.x;
    const endY =
      toBottle.position.y + this.getObjectPositionInBottle(toBottle.objects.length + index);

    // Rimuovi l'oggetto dal container della bottiglia di origine
    fromBottle.container.remove(sprite);

    // Aggiungi l'oggetto alla scena per l'animazione
    this.add.existing(sprite);
    sprite.setPosition(startX, startY);
    sprite.setDepth(1000); // Porta in primo piano durante l'animazione

    const arcHeight = 180;

    // Fase 1: Movimento verso l'alto
    this.tweens.add({
      targets: sprite,
      y: startY - arcHeight,
      duration: 250,
      ease: "Power2.easeOut",
      onComplete: () => {
        // Fase 2: Movimento ad arco verso la destinazione
        this.createArcMovement(sprite, startX, startY - arcHeight, endX, endY, () => {
          // Fase 3: Movimento verso il basso nella bottiglia di destinazione
          this.tweens.add({
            targets: sprite,
            y: endY,
            duration: 250,
            ease: "Power2.easeIn",
            onComplete: () => {
              // Rimuovi l'oggetto dalla scena e aggiungilo alla bottiglia di destinazione
              sprite.destroy();

              // Crea un nuovo oggetto nella bottiglia di destinazione
              this.addObjectToBottle(toBottle, obj.type, false);

              // Continua con il prossimo oggetto
              this.time.delayedCall(100, () => {
                this.animateObjectsSequentially(
                  objects,
                  fromBottle,
                  toBottle,
                  index + 1,
                  onComplete,
                );
              });
            },
          });
        });
      },
    });
  }

  //* Scopo: Crea un movimento ad arco corretto
  private createArcMovement(
    sprite: Phaser.GameObjects.Image,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    onComplete: () => void,
  ): void {
    // Calcola il punto di controllo per l'arco (più alto per una curva più pronunciata)
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 150; // Arco più alto

    let progress = 0;
    const duration = 600;

    const arcTween = this.tweens.add({
      targets: {t: 0},
      t: 1,
      duration: duration,
      ease: "Power2.easeInOut",
      onUpdate: (tween) => {
        const t = tween.getValue();

        // Calcola la posizione lungo la curva di Bézier quadratica
        const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
        const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;

        sprite.setPosition(x, y);

        // Aggiungi una leggera rotazione per rendere il movimento più naturale
        sprite.setRotation(t * 0.5 - 0.25);
      },
      onComplete: () => {
        sprite.setRotation(0); // Ripristina la rotazione
        onComplete();
      },
    });
  }

  //* Scopo: Controlla se il gioco è completato
  private checkWinCondition(): void {
    let completedBottles = 0;

    this.bottles.forEach((bottle) => {
      if (bottle.objects.length === 0) {
        // Bottiglia vuota - OK
        return;
      }

      if (bottle.objects.length === this.OBJECTS_PER_BOTTLE) {
        // Controlla se tutti gli oggetti sono dello stesso tipo
        const firstType = bottle.objects[0].type;
        const allSameType = bottle.objects.every((obj) => obj.type === firstType);

        if (allSameType) {
          completedBottles++;
        }
      }
    });

    // Vittoria se ci sono 4 bottiglie completate (una per ogni tipo di oggetto)
    if (completedBottles === this.OBJECT_TYPES) {
      this.handleGameWin();
    }
  }

  //* Scopo: Gestisce la vittoria del gioco
  private handleGameWin(): void {
    console.log("Gioco completato!");

    // Animazione di vittoria
    this.bottles.forEach((bottle, index) => {
      this.tweens.add({
        targets: bottle.container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 300,
        delay: index * 100,
        yoyo: true,
        ease: "Power2",
      });
    });

    // Qui puoi aggiungere logica per la schermata di vittoria
    this.time.delayedCall(1500, () => {
      this.gameScene.gameOver(); // Assumendo che esista un metodo gameWin
    });
  }

  //* Scopo: Utility per mescolare un array
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
