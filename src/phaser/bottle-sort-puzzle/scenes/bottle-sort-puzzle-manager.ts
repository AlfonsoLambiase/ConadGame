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
  isCompleted: boolean;
  label?: Phaser.GameObjects.Image;
  cap?: Phaser.GameObjects.Image;
}

export class BottleSortPuzzleManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;

  // Container principale che conterrà tutti gli elementi del gioco
  private mainContainer!: Phaser.GameObjects.Container;
  private bookcaseContainer!: Phaser.GameObjects.Container;

  private bottles: Bottle[] = [];
  private selectedBottle: Bottle | null = null;
  public isAnimating: boolean = false;

  private readonly BOTTLE_COUNT = 5;
  private readonly OBJECTS_PER_BOTTLE = 4;
  private readonly OBJECT_TYPES = 4; //! ⚠️ Attenzione: per assicurare completamento BOTTLE_COUNT = OBJECT_TYPES + 2.

  // Scala generale del gioco (ora applicata solo al container principale)
  private gameScale = 1.0;

  // Parametri per la scala responsiva
  private minScale = 0.5; // Scala minima
  private maxScale = 1.5; // Scala massima

  // Costanti per il calcolo dell'altezza di uscita/entrata
  private readonly BOTTLE_TOP_BASE = -316; // Posizione del bordo superiore della bottiglia alla scala 1.0
  private readonly EXIT_OFFSET = -50; // Offset extra sopra il bordo della bottiglia

  public isActiveBottle: boolean = false;

  public isTouchBottle: boolean = false;

  constructor() {
    super({key: BottleSortPuzzleAssetConf.scene.bottleSortManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    console.log("Start game bottle sort puzzle");

    this.computeLayoutDimensions();
    this.createContainers();
    this.createBottles();
    this.fillBottlesWithObjects();
    this.setupInteraction();
    this.applyResponsiveScaling();
  }

  //* Scopo: Calcola le dimensioni e la posizione centrale dell'area di gioco
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);
  }

  //* Scopo: Crea il container principale che conterrà tutti gli elementi del gioco
  private createContainers(): void {
    this.bookcaseContainer = this.add.container(this.gameWidth / 2, this.gameHeight / 2);
    this.mainContainer = this.add.container(this.gameWidth / 2, this.gameHeight / 2);
  }

  //* Scopo: Applica la scala responsiva al container principale
  private applyResponsiveScaling(): void {
    // Calcola la scala basata sulle dimensioni dello schermo
    const baseWidth = 1080; // Larghezza di riferimento
    const baseHeight = 1920; // Altezza di riferimento

    const scaleX = this.gameWidth / baseWidth;
    const scaleY = this.gameHeight / baseHeight;

    // Tolleranza modificabile 5% piu piccolo del valore ottenuto
    let scaleTolerance = 0.05;

    // Usa la scala minore per mantenere le proporzioni (stesso valore per X e Y)
    let calculatedScale = Math.min(scaleX, scaleY);

    // Applica la tolleranza (riduce il valore di una certa percentuale)
    calculatedScale *= 1 - scaleTolerance;

    // Applica i limiti min/max
    calculatedScale = Math.max(this.minScale, Math.min(this.maxScale, calculatedScale));

    // Arrotonda a 2 decimali
    calculatedScale = Math.round(calculatedScale * 100) / 100;

    this.gameScale = calculatedScale;

    this.bookcaseContainer.setScale(this.gameScale);
    this.mainContainer.setScale(this.gameScale);
  }

  //* Scopo: Crea le bottiglie nella disposizione 3 sopra il resto sotto
  private createBottles(): void {
    const bottleWidth = 354;
    const bottleHeight = 632;
    const spacingX = bottleWidth + 40; // tolleranza larghezza tra colonne
    const spacingY = bottleHeight + 150; // tolleranza altezza tra file

    const maxCols = 3;
    const topRowCount = Math.min(this.BOTTLE_COUNT, maxCols);
    const remainingCount = this.BOTTLE_COUNT - topRowCount;
    const fullRows = Math.ceil(remainingCount / maxCols); // non usato ma lo lascio se serve debug
    const totalRows = (remainingCount > 0 ? 1 : 0) + 1; // riga top + eventuali righe sotto

    const startY = -((totalRows - 1) * spacingY) / 2;

    for (let row = 0; row < totalRows; row++) {
      // Quante bottiglie in questa riga
      const bottlesInThisRow =
        row === 0
          ? topRowCount
          : row === totalRows - 1 && remainingCount % maxCols !== 0
            ? remainingCount % maxCols || maxCols
            : maxCols;

      const startX = -((bottlesInThisRow - 1) * spacingX) / 2;

      const shelfX = 0;
      const shelfY = startY + row * spacingY + bottleHeight / 2;

      const shelf = this.add.image(shelfX, shelfY, BottleSortPuzzleAssetConf.image.bookcase);

      shelf.setOrigin(0.5, 0); // bordo superiore centrato
      this.bookcaseContainer.add(shelf);

      for (let col = 0; col < bottlesInThisRow; col++) {
        const index = row === 0 ? col : topRowCount + (row - 1) * maxCols + col;

        if (index >= this.BOTTLE_COUNT) break;

        const x = startX + col * spacingX;
        const y = startY + row * spacingY;

        const bottle = this.createBottle(x, y, index);

        this.bottles.push(bottle);
      }
    }
  }

  //* Scopo: Crea una singola bottiglia
  private createBottle(x: number, y: number, index: number): Bottle {
    const container = this.add.container(x, y);

    container.setDepth(0);
    const background = this.add.image(0, 0, BottleSortPuzzleAssetConf.image.bottleGlass);

    // Rendi la bottiglia interattiva
    background.setInteractive();
    background.setDepth(0);

    container.add(background);

    // Aggiunge il container della bottiglia al container principale
    this.mainContainer.add(container);

    const bottle: Bottle = {
      container: container,
      background: background,
      objects: [],
      maxCapacity: this.OBJECTS_PER_BOTTLE,
      position: {x, y}, // Posizione relativa al container principale
      index: index,
      isCompleted: false,
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

    objectSprite.setDepth(2);

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
    // La bottiglia è y 632
    const bottleBottom = 300;
    // Dimensioni y dell'oggetto: 130 (senza scala)
    const objectHeight = 130;
    const objectSpacing = 5; // Piccolo spazio tra gli oggetti

    // Posizione dal basso verso l'alto
    return bottleBottom - index * (objectHeight + objectSpacing) - objectHeight / 2;
  }

  //* Scopo: Gestisce il click su una bottiglia
  private handleBottleClick(bottle: Bottle): void {
    if (this.selectedBottle === null) {
      // Seleziona la bottiglia se ha oggetti
      if (bottle.objects.length > 0) {
        this.selectBottle(bottle);
        this.isActiveBottle = true;
      }
    } else if (this.selectedBottle === bottle) {
      // Deseleziona se si clicca sulla stessa bottiglia
      this.deselectBottle();
      this.isActiveBottle = false;
    } else {
      // Tenta di spostare l'oggetto
      this.attemptMove(this.selectedBottle, bottle);
      this.isActiveBottle = false;
    }
  }

  //* Scopo: Crea un bordo luminoso attorno alla bottiglia
  private selectBottle(bottle: Bottle): void {
    this.selectedBottle = bottle;

    // RIMUOVI la bottiglia dal mainContainer e aggiungila direttamente alla scena
    this.mainContainer.remove(bottle.container);
    this.add.existing(bottle.container);

    // Converti le coordinate relative in coordinate assolute
    bottle.container.x = this.mainContainer.x + bottle.position.x * this.gameScale;
    bottle.container.y = this.mainContainer.y + bottle.position.y * this.gameScale;

    // Applica la scala del gioco al container
    bottle.container.setScale(this.gameScale);

    const selectedImage = this.add.image(0, 0, BottleSortPuzzleAssetConf.image.bottleGlassSelected);

    selectedImage.setDepth(1);
    bottle.container.add(selectedImage);
    (bottle as any).selectedImage = selectedImage;

    // Animazione con offset già calcolato
    const bottleHeight = 632;
    const scaleIncrease = 0.15;
    const offsetY = -(bottleHeight * scaleIncrease) / 2;

    this.tweens.add({
      targets: bottle.container,
      scaleX: this.gameScale * 1.15,
      scaleY: this.gameScale * 1.15,
      y: bottle.container.y + offsetY * this.gameScale,
      duration: 300,
      ease: "Power2.easeOut",
    });
  }

  //* Scopo: Deseleziona la bottiglia corrente
  private deselectBottle(): void {
    if (this.selectedBottle) {
      const selectedImage = (this.selectedBottle as any).selectedImage;

      if (selectedImage) {
        selectedImage.destroy();
        delete (this.selectedBottle as any).selectedImage;
      }

      // Riporta la bottiglia nel mainContainer
      this.tweens.add({
        targets: this.selectedBottle.container,
        scaleX: this.gameScale,
        scaleY: this.gameScale,
        x: this.mainContainer.x + this.selectedBottle.position.x * this.gameScale,
        y: this.mainContainer.y + this.selectedBottle.position.y * this.gameScale,
        duration: 200,
        ease: "Power2.easeOut",
        onComplete: () => {
          // Rimuovi dalla scena e rimetti nel mainContainer
          this.selectedBottle!.container.x = this.selectedBottle!.position.x;
          this.selectedBottle!.container.y = this.selectedBottle!.position.y;
          this.selectedBottle!.container.setScale(1);
          this.mainContainer.add(this.selectedBottle!.container);
          this.selectedBottle = null;
        },
      });
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

    // Ottieni gli oggetti da spostare - inizia dall'alto della sequenza
    const startIndex = fromBottle.objects.length - moveCount;
    const objectsToMove: {obj: GameObject; index: number}[] = [];

    // Copia gli oggetti da spostare mantenendo l'ordine inverso (dall'alto verso il basso)
    for (let i = fromBottle.objects.length - 1; i >= startIndex; i--) {
      objectsToMove.push({obj: fromBottle.objects[i], index: i});
    }

    // Anima ogni oggetto in sequenza, ma NON rimuovere ancora gli oggetti
    this.animateObjectsSequentially(objectsToMove, fromBottle, toBottle, 0, () => {
      fromBottle.objects.splice(startIndex, moveCount);
      this.deselectBottle();
      this.checkWinCondition();
    });
  }

  //* Scopo: Calcola l'altezza di uscita/entrata dalla bottiglia (sempre uguale per ogni bottiglia)
  private getExitHeight(bottle: Bottle): number {
    // Ottieni la scala corrente della bottiglia
    const currentScale = bottle.container.scaleY; // o scaleX, dovrebbero essere uguali

    // Calcola la posizione del bordo superiore considerando la scala
    const scaledBottleTop = this.BOTTLE_TOP_BASE * currentScale;

    // Punto di uscita fisso sopra il bordo della bottiglia
    return scaledBottleTop + this.EXIT_OFFSET;
  }

  //* Scopo: Animazione oggetti in sequenza
  private animateObjectsSequentially(
    objects: {obj: GameObject; index: number}[],
    fromBottle: Bottle,
    toBottle: Bottle,
    index: number,
    onComplete: () => void,
  ): void {
    if (index >= objects.length) {
      onComplete();
      this.isActiveBottle = false;
      this.isAnimating = false;
      console.log("completata animazione");

      return;
    }

    const {obj, index: originalIndex} = objects[index];
    const sprite = obj.sprite;

    // Coordinate relative al container principale
    const startX = fromBottle.position.x;
    const startY = fromBottle.position.y + this.getObjectPositionInBottle(originalIndex);

    const endX = toBottle.position.x;
    // Posizione finale all'interno della bottiglia di destinazione
    const finalEndY =
      toBottle.position.y + this.getObjectPositionInBottle(toBottle.objects.length + index);

    // PUNTI FISSI per uscita ed entrata - considerando la scala di ogni bottiglia
    const exitY = fromBottle.position.y + this.getExitHeight(fromBottle);
    const entryY = toBottle.position.y + this.getExitHeight(toBottle);

    // Ottieni la posizione mondiale corrente dell'oggetto PRIMA di rimuoverlo
    const worldPosition = fromBottle.container
      .getWorldTransformMatrix()
      .transformPoint(0, this.getObjectPositionInBottle(originalIndex));

    // Rimuovi dal container della bottiglia e aggiunge DIRETTAMENTE alla scena
    fromBottle.container.remove(sprite);
    this.add.existing(sprite);

    // Converti le coordinate relative del mainContainer in coordinate assolute
    const absoluteEndX = this.mainContainer.x + endX * this.gameScale;
    const absoluteExitY = this.mainContainer.y + exitY * this.gameScale;
    const absoluteEntryY = this.mainContainer.y + entryY * this.gameScale;
    const absoluteFinalEndY = this.mainContainer.y + finalEndY * this.gameScale;

    // Usa la posizione mondiale per il punto di partenza
    sprite.setPosition(worldPosition.x, worldPosition.y);
    sprite.setScale(this.gameScale); // Applica la scala del gioco
    sprite.setDepth(100);

    // Prima fase: uscita dalla bottiglia di partenza
    this.tweens.add({
      targets: sprite,
      y: absoluteExitY,
      duration: 300,
      ease: "Power2.easeOut",
      onComplete: () => {
        // Seconda fase: movimento ad arco
        this.createArcMovement(
          sprite,
          worldPosition.x,
          absoluteExitY,
          absoluteEndX,
          absoluteEntryY,
          () => {
            // Terza fase: discesa all'interno della bottiglia di destinazione
            const fallDistance = Math.abs(absoluteFinalEndY - absoluteEntryY);
            const baseDuration = 300;
            const fallDuration = Math.max(200, Math.min(500, baseDuration + fallDistance * 0.5));

            this.tweens.add({
              targets: sprite,
              y: absoluteFinalEndY,
              duration: fallDuration,
              ease: "Power2.easeIn",
              onComplete: () => {
                sprite.destroy();
                this.addObjectToBottle(toBottle, obj.type, false);

                const nextObjectDelay = Math.max(100, fallDuration * 0.2);

                this.time.delayedCall(nextObjectDelay, () => {
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
          },
        );
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

        // Aggiunge una leggera rotazione per rendere il movimento più naturale
        sprite.setRotation(t * 0.5 - 0.25);
      },
      onComplete: () => {
        sprite.setRotation(0); // Ripristina la rotazione
        onComplete();
      },
    });
  }

  //* Scopo: Aggiunge tappo e etichetta alla bottiglia completata
  private completeBottle(bottle: Bottle): void {
    bottle.isCompleted = true;

    // Disabilita l'interazione
    bottle.background.disableInteractive();

    // Effetto di riempimento con particelle
    this.createCompletionEffect(bottle);

    // Aggiunge etichetta
    const label = this.add.image(0, 0, BottleSortPuzzleAssetConf.image.bottleLabel);

    label.setAlpha(0);
    label.setDepth(150);
    bottle.container.add(label);
    bottle.label = label;

    // Aggiunge tappo
    const cap = this.add.image(0, 0, BottleSortPuzzleAssetConf.image.bottleCap);

    cap.setAlpha(0);
    cap.setDepth(150);
    bottle.container.add(cap);
    bottle.cap = cap;

    // Fade-in etichetta
    this.tweens.add({
      targets: label,
      alpha: 1,
      duration: 800,
      ease: "Power2",
    });

    // Fade-in tappo
    this.tweens.add({
      targets: cap,
      alpha: 1,
      duration: 800,
      delay: 200,
      ease: "Power2",
    });

    // --- Effetto di celebrazione: pop con base ancorata ---

    const container = bottle.container;

    // Scala corrente (può già includere gameScale o altro)
    const startScaleX = container.scaleX;
    const startScaleY = container.scaleY;

    // Fattore di crescita (es. +10%)
    const factor = 1.1;

    // Altezza sprite di riferimento (pixel sorgente della bottiglia intera)
    const BOTTLE_HEIGHT = 632; // aggiorna se necessario

    // Quanto cresce in altezza (in world space): altezza visibile * (factor - 1)
    const growthY = BOTTLE_HEIGHT * startScaleY * (factor - 1);

    // Sposta il centro verso l’alto di metà della crescita per tenere ferma la base
    const offsetY = -growthY / 2;

    this.tweens.add({
      targets: container,
      scaleX: startScaleX * factor,
      scaleY: startScaleY * factor,
      y: container.y + offsetY,
      duration: 600,
      ease: "Back.easeOut",
      yoyo: true, // torna ai valori start -> base torna al punto originale
    });
  }

  //* Scopo: Crea un effetto di particelle per la bottiglia completata
  private createCompletionEffect(bottle: Bottle): void {
    // Usa coordinate relative al container principale
    const relativeX = bottle.position.x;
    const relativeY = bottle.position.y;

    const particles = this.add.particles(relativeX, relativeY, "product0", {
      speed: {min: 50, max: 150},
      scale: {start: 0.3, end: 0},
      lifespan: 1000,
      quantity: 2,
      frequency: 50,
      emitZone: {
        type: "edge",
        source: new Phaser.Geom.Rectangle(-100, -200, 200, 400),
        quantity: 20,
      },
    });

    // Aggiunge le particelle al container principale
    this.mainContainer.add(particles);

    // Ferma le particelle dopo 2 secondi
    this.time.delayedCall(2000, () => {
      particles.destroy();
    });
  }

  //* Scopo: Controlla se il gioco è completato
  private checkWinCondition(): void {
    let completedBottles = 0;

    console.log("checkWinCondition: 1");

    this.bottles.forEach((bottle) => {
      if (bottle.objects.length === 0) {
        // Bottiglia vuota - OK
        return;
      }

      console.log("checkWinCondition: 2");

      if (bottle.objects.length === this.OBJECTS_PER_BOTTLE) {
        // Controlla se tutti gli oggetti sono dello stesso tipo
        const firstType = bottle.objects[0].type;
        const allSameType = bottle.objects.every((obj) => obj.type === firstType);

        if (allSameType && !bottle.isCompleted) {
          this.completeBottle(bottle);
          completedBottles++;
        } else if (allSameType) {
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

    // Delay per dare tempo alla bottiglia selezionata di tornare alla dimensione originale
    this.time.delayedCall(2000, () => {
      // Animazione di vittoria
      this.bottles.forEach((bottle, index) => {
        // Calcola l'offset per simulare il pivot in basso (come quando si seleziona)
        const bottleHeight = 632;
        const scaleIncrease = 0.1; // Aumento di scala per l'animazione finale
        const offsetY = -(bottleHeight * scaleIncrease) / 2;

        this.tweens.add({
          targets: bottle.container,
          scaleX: 1 + scaleIncrease,
          scaleY: 1 + scaleIncrease,
          y: bottle.position.y + offsetY, // Sposta verso il basso per simulare pivot in basso
          duration: 300,
          delay: index * 100,
          ease: "Power2",
          yoyo: true,
          onComplete: () => {
            // Riporta la posizione Y originale dopo l'animazione
            bottle.container.y = bottle.position.y;
          },
        });
      });

      // Qui puoi aggiungere logica per la schermata di vittoria
      this.time.delayedCall(2000, () => {
        this.gameScene.gameOver(); // Assumendo che esista un metodo gameWin
      });
    });
  }

  //* Scopo: Utility per mescolare un array
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  //* Scopo: Metodo pubblico per cambiare la scala del gioco
  public setGameScale(scale: number): void {
    // Applica i limiti min/max
    this.gameScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    this.bookcaseContainer.setScale(this.gameScale);
    this.mainContainer.setScale(this.gameScale);
  }

  //* Scopo: Metodo pubblico per ottenere la scala corrente
  public getGameScale(): number {
    return this.gameScale;
  }

  //* Scopo: Metodo pubblico per impostare i limiti di scala
  public setScaleLimits(minScale: number, maxScale: number): void {
    this.minScale = minScale;
    this.maxScale = maxScale;

    // Riapplica la scala corrente con i nuovi limiti
    this.setGameScale(this.gameScale);
  }

  //* Scopo: Metodo pubblico per ottenere i limiti di scala
  public getScaleLimits(): {min: number; max: number} {
    return {min: this.minScale, max: this.maxScale};
  }

  //* Nuovi metodi per aggiungere una bottiglia vuota
  //* Scopo: Metodo per aggiungere una bottiglia
  public addExtraBottle(): void {
    if (this.bottles.length >= 6) {
      console.log("Numero massimo di bottiglie raggiunto");

      return;
    }

    // Crea la nuova bottiglia in posizione di partenza (sopra a destra)
    const startX = 400; // Posizione di partenza a destra, relativa al container
    const startY = -800; // Posizione di partenza in alto, relativa al container

    const newBottle = this.createBottle(startX, startY, this.bottles.length);

    // Imposta la scala iniziale a 0 per la nuova bottiglia
    newBottle.container.setScale(0);

    this.bottles.push(newBottle);

    // Configura l'interazione per la nuova bottiglia
    this.setupBottleInteraction(newBottle);

    // Riorganizza tutte le bottiglie
    this.reorganizeBottles();
  }

  //* Scopo: Metodo per configurare l'interazione
  private setupBottleInteraction(bottle: Bottle): void {
    bottle.background.on("pointerdown", () => {
      if (this.isAnimating || bottle.isCompleted || this.isTouchBottle) return;
      this.handleBottleClick(bottle);
      console.log("Touch");
      this.isTouchBottle = true;
      this.time.delayedCall(250, () => {
        // tempo sicurezza 250 ms per non fare doppio click su una bottiglia e far finire prima l 'animazione della bottiglia e non causare bugs
        this.isTouchBottle = false;
      });
    });

    // Effetto hover
    bottle.background.on("pointerover", () => {
      if (!this.isAnimating && !bottle.isCompleted) {
        bottle.background.setTint(0xdddddd);
      }
    });

    bottle.background.on("pointerout", () => {
      if (bottle !== this.selectedBottle) {
        bottle.background.clearTint();
      }
    });
  }

  //* Scopo: Metodo per riorganizzare le bottiglie
  private reorganizeBottles(): void {
    const bottleWidth = 354;
    const bottleHeight = 632;
    const spacingX = bottleWidth + 40; // tolleranza larghezza tra colonne di bottiglie
    const spacingY = bottleHeight + 150; // tolleranza altezza tra file di bottiglie

    const maxCols = 3;
    const topRowCount = Math.min(this.bottles.length, maxCols);
    const remainingCount = this.bottles.length - topRowCount;
    const totalRows = (remainingCount > 0 ? 1 : 0) + 1;

    const startY = -((totalRows - 1) * spacingY) / 2;

    // Rimuove le mensole esistenti
    this.clearShelves();

    let bottleIndex = 0;

    for (let row = 0; row < totalRows; row++) {
      const bottlesInThisRow =
        row === 0
          ? topRowCount
          : row === totalRows - 1 && remainingCount % maxCols !== 0
            ? remainingCount % maxCols || maxCols
            : maxCols;

      const startX = -((bottlesInThisRow - 1) * spacingX) / 2;

      // Aggiunge mensola per questa riga
      const shelfX = 0;
      const shelfY = startY + row * spacingY + bottleHeight / 2;
      const shelf = this.add.image(shelfX, shelfY, BottleSortPuzzleAssetConf.image.bookcase);

      shelf.setOrigin(0.5, 0);
      this.bookcaseContainer.add(shelf);

      // Salva riferimento alla mensola per poterla rimuovere dopo
      (shelf as any).isShelf = true;

      // Riposiziona le bottiglie di questa riga
      for (let col = 0; col < bottlesInThisRow; col++) {
        if (bottleIndex >= this.bottles.length) break;

        const bottle = this.bottles[bottleIndex];
        const newX = startX + col * spacingX;
        const newY = startY + row * spacingY;

        // Controlla se è la bottiglia appena aggiunta (ultima nell'array)
        const isNewBottle = bottleIndex === this.bottles.length - 1;

        if (isNewBottle) {
          // Per la nuova bottiglia: anima posizione E scala contemporaneamente
          this.tweens.add({
            targets: bottle.container,
            x: newX,
            y: newY,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: "Power2.easeOut",
          });
        } else {
          // Per le bottiglie esistenti: anima solo la posizione
          this.tweens.add({
            targets: bottle.container,
            x: newX,
            y: newY,
            duration: 500,
            ease: "Power2.easeOut",
          });
        }

        // Aggiorna la posizione memorizzata
        bottle.position.x = newX;
        bottle.position.y = newY;
        bottle.index = bottleIndex;

        bottleIndex++;
      }
    }
  }

  //* Scopo: Metodo per rimuovere le mensole esistenti
  private clearShelves(): void {
    this.bookcaseContainer.list.forEach((child: any) => {
      if (child.isShelf) {
        child.destroy();
      }
    });
  }

  //* Scopo: Configura l'interazione con le bottiglie e usa il metodo helper
  private setupInteraction(): void {
    this.bottles.forEach((bottle) => {
      this.setupBottleInteraction(bottle);
    });
  }

  public setAddExtraBottle(): void {
    if (!this.isAnimating && !this.isActiveBottle) {
      this.addExtraBottle();
    }
  }

  //* Scopo: Aggiunti confetti in questo script per problemi di depth e priorita scene
  startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    // Create spriteLeft
    const spriteLeft = this.add
      .sprite(0, config.height / 2, BottleSortPuzzleAssetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(200)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationLeft
    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(
        BottleSortPuzzleAssetConf.spritesheet.confetti_left.key,
        {
          start: 0,
          end: 54,
        },
      ),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    // Create spriteRight
    const spriteRight = this.add
      .sprite(
        config.width,
        config.height / 2,
        BottleSortPuzzleAssetConf.spritesheet.confetti_right.key,
      )
      .setOrigin(1, 0.5)
      .setDepth(200)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationRight
    this.anims.create({
      key: "animConfettiRight",
      frames: this.anims.generateFrameNumbers(
        BottleSortPuzzleAssetConf.spritesheet.confetti_right.key,
        {
          start: 0,
          end: 54,
        },
      ),
      frameRate: 20,
    });

    spriteRight.play("animConfettiRight");
  }
}
