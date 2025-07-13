/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {BubbleShooterAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

export class BubbleShooterManager extends Phaser.Scene {
  private arrow!: Phaser.GameObjects.Image;
  private bubblesGroup!: Phaser.Physics.Arcade.Group;
  private initialBubble!: Phaser.GameObjects.Image;
  private nextBubble!: Phaser.GameObjects.Image;
  private leftWall!: Phaser.GameObjects.Rectangle;
  private rightWall!: Phaser.GameObjects.Rectangle;
  private topWall!: Phaser.GameObjects.Rectangle;

  private grid: any[][] = [];

  private bubbleSizeDefault = 128; //! 36
  private bubbleSize = 42;
  private scaleBubble = 1;
  private displayGameWidth = 599;
  private displayGameHeight = 992;
  private colors = ["ballRed", "ballBlue", "ballGreen", "ballYellow", "ballPurple"];
  private rows = 10; // fine gioco al raggiungimento di...rows
  private columns = 8; // 10 //* per modificare la dimensione delle ball basta cambiare semplicemente questo valore, e fa tutto in automatico
  private filledRows = 1; // quantita di file iniziali

  private currentBubbleColor!: string;
  private nextBubbleColor!: string;

  private currentTopRowIndex = 0;

  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200; //* reso dinamico. regola l'altezza di tutto il gioco
  private horizontalMargin = 30;

  // Variabili calcolate
  private bgPnlGameWidth!: number;
  private bgPnlGameHeight!: number;
  private bgPnlGameWidthCenter!: number;
  private bgPnlGameHeightCenter!: number;

  // Nuove variabili per posizionamento elementi di gioco
  private shooterY!: number; //* reso dinamico.
  private gridStartX!: number;
  private gridStartY!: number;

  private aimLine!: Phaser.GameObjects.Graphics; // linea tratteggiata puntatore

  private verticalSpacingBubble = 0; //! Errore se metto un valore - 10 dalla sesta fila non passa si sovrappongono
  private horzintalSpacingBubble = 6;
  private sizeCircleCollider = 0.9;
  private offsetDimensionCircleCollisionWall = 0.7;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  // variabili per aimLine
  private aimLineRadius = 6; // Raggio dei cerchi della linea (modificabile)
  private aimLineSpacing = 25; // Distanza tra i cerchi
  private aimLineAlpha = 0.8; // Trasparenza della linea
  private aimLineColor = 0xff0000; // Colore della linea (rosso)
  private aimLineHitPointRadius = 12; // Raggio del punto di impatto (più grande)
  private aimLineHitPointColor = 0xff4444; // Colore del punto di impatto
  private aimLineHitPointAlpha = 1.0; // Trasparenza del punto di impatto

  constructor() {
    super({key: BubbleShooterAssetConf.scene.bubbleShooterManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    this.computeLayoutDimensions();

    this.time.delayedCall(50, () => {
      console.log(
        `Il gioco andrà in Game Over quando le bolle raggiungeranno la riga ${this.rows}`,
      );

      this.grid = [];

      this.currentBubbleColor = Phaser.Utils.Array.GetRandom(this.colors);
      this.nextBubbleColor = Phaser.Utils.Array.GetRandom(this.colors);

      this.currentTopRowIndex = 0;
      this.canShoot = true;
      this.isGameOver = false;

      this.createBackground();
      this.createWalls();
      this.createBubbleElements();
      this.setupInputHandlers();

      this.time.addEvent({
        delay: this.timeAddNewRow,
        callback: this.addNewRow,
        callbackScope: this,
        loop: true,
      });

      this.speedBall = this.gameScene.setDynamicValueBasedOnScale(1500, 2000);

      // 2. Particle system
      this.createTrailParticleSystem();
    });
  }

  // 3. Particle system
  //* Scopo: Crea sistema di particelle
  private createTrailParticleSystem() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xffffff); // bianco
    graphics.fillCircle(4, 4, 4); // cerchio di 4px di raggio
    graphics.generateTexture(BubbleShooterAssetConf.image.bubbleTrail, 8, 8);
    graphics.destroy();
  }

  //* Scopo: Aggiunge una nuova linea sopra e sposta tutte le altre 1 piu in giu. Con delay
  addNewRow() {
    if (!this.canShoot) {
      console.log("Rinviata l'aggiunta della riga...");
      // Riprova più tardi
      this.time.delayedCall(1200, () => this.addNewRow(), [], this);

      return;
    }

    const totalVerticalSpacing = this.bubbleSize + this.verticalSpacingBubble;
    const tweens: Phaser.Tweens.Tween[] = [];

    const durationAnim = 150;

    for (let row = this.rows - 2; row >= 0; row--) {
      for (let col = 0; col < this.columns; col++) {
        const cell = this.grid[row][col];
        const below = this.grid[row + 1][col];

        if (cell.bubble) {
          // Crea tween per spostare la bolla in basso
          const tween = this.tweens.add({
            targets: cell.bubble,
            y: cell.bubble.y + totalVerticalSpacing,
            duration: durationAnim,
            ease: "Linear",
          });

          tweens.push(tween);

          below.bubble = cell.bubble;
          below.color = cell.color;
          below.centerX = cell.bubble.x;
          below.centerY = cell.bubble.y;

          cell.bubble = null;
          cell.color = "blank";
        }
      }
    }

    // Aspetta che tutti i tween finiscano prima di aggiungere la nuova riga
    this.time.delayedCall(durationAnim + 10, () => {
      this.currentTopRowIndex++;

      const isEvenRow = this.currentTopRowIndex % 2 === 0;
    const newRow: unknown[] = [];


      for (let col = 0; col < this.columns; col++) {
        const x = this.getColumnX(col, isEvenRow);
        const y = this.getRowY(0);
        const color = Phaser.Utils.Array.GetRandom(this.colors);
        const bubble = this.createBubble(x, y, color);

        this.bubblesGroup.add(bubble);

        newRow.push({
          centerX: x,
          centerY: y,
          color,
          bubble,
        });
      }

      this.grid[0] = newRow;
      this.recalculateGridPositions();
      this.updateBubblePhysicalPositions();
      this.checkGameOver();
    });
  }

  //* Scopo: Metodo helper per sincronizzare le posizioni fisiche delle bolle
  // con i dati della griglia
  private updateBubblePhysicalPositions() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const cell = this.grid[row][col];

        if (cell.bubble) {
          cell.bubble.setPosition(cell.centerX, cell.centerY);
        }
      }
    }
  }

  //* Scopo: Funzione helper per calcolare la X di una colonna
  private getColumnX(col: number, isEvenRow: boolean): number {
    const offset = isEvenRow ? 0 : this.bubbleSize / 2;

    return this.gridStartX + col * this.bubbleSize + offset;
  }

  //* Scopo: Funzione helper per calcolare la Y di una riga
  private getRowY(row: number): number {
    const totalVerticalSpacing = this.bubbleSize + this.verticalSpacingBubble;

    return this.gridStartY + row * totalVerticalSpacing;
  }

  //* Scopo: aggiusta l'offset in x al momento della creazione della griglia completa a sinistra
  private calculateGridStartX() {
    const totalGridWidth = this.columns * this.bubbleSize;

    this.gridStartX = (this.gameWidth - totalGridWidth) / 2 + 20;
  }

  //* Scopo: Verifica se c'è un gruppo di almeno 3 bolle adiacenti dello stesso colore a partire da una cella.
  checkAndPopGroup(row: number, col: number) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.columns) return;
    if (this.grid[row][col].color === "blank") return;

    const color = this.grid[row][col].color;
    const visited = new Set<string>();
    const cluster = this.floodFill(row, col, color, visited);

    if (cluster.length >= 3) {
      this.time.delayedCall(100, () => {
        this.gameScene.uiManager.updateScore(cluster.length);

        let animationsRemaining = cluster.length;

        cluster.forEach(({r, c}, index) => {
          const bubble = this.grid[r][c].bubble;

          if (bubble) {
            this.time.delayedCall(index * 80, () => {
              this.gameScene.audioManager.playAudio(BubbleShooterAssetConf.audio.bubblepop);

              this.gameScene.starsEffectManager.starsEffectAnimation(bubble);

              this.tweens.add({
                targets: bubble,
                scaleX: 0,
                scaleY: 0,
                duration: 150,
                ease: "Power1",
                onComplete: () => {
                  bubble.destroy();
                  this.grid[r][c] = {
                    ...this.grid[r][c],
                    bubble: null,
                    color: "blank",
                  };

                  animationsRemaining--;
                  if (animationsRemaining === 0) {
                    this.dropFloatingBubbles();
                  }
                },
              });
            });
          } else {
            animationsRemaining--;
          }
        });
      });
    }
  }

  //* Scopo: Dopo che un gruppo di bolle è esploso, verifica quali altre bolle sono rimaste non collegate alla parte superiore e le fa cadere.
  dropFloatingBubbles() {
    const visited: Set<string> = new Set();

    for (let col = 0; col < this.columns; col++) {
      if (this.grid[0][col].color !== "blank") {
        this.markConnected(0, col, visited);
      }
    }

    const floatingBubbles: {bubble: Phaser.Physics.Arcade.Image; row: number; col: number}[] = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const key = `${row},${col}`;

        if (this.grid[row][col].color !== "blank" && !visited.has(key)) {
          const bubble = this.grid[row][col].bubble;

          if (bubble) {
            floatingBubbles.push({bubble, row, col});
            this.grid[row][col] = {
              ...this.grid[row][col],
              color: "blank",
              bubble: null,
            };
          }
        }
      }
    }

    if (floatingBubbles.length > 0) {
      floatingBubbles.forEach(({bubble}, index) => {
        // Attiva la fisica per farle cadere
        this.physics.world.enable(bubble);
        const body = bubble.body as Phaser.Physics.Arcade.Body;

        body.allowGravity = true;
        body.setGravityY(300);

        // Ripristina la scala
        bubble.setScale(this.scaleBubble);

        // Dopo un delay esegui l'esplosione in sequenza
        this.time.delayedCall(500 + index * 150, () => {
          this.gameScene.audioManager.playAudio(BubbleShooterAssetConf.audio.bubblepop);

          this.gameScene.starsEffectManager.starsEffectAnimation(bubble);

          // Animazione di esplosione (scala a 0)
          this.tweens.add({
            targets: bubble,
            scaleX: 0,
            scaleY: 0,
            duration: 150,
            ease: "Power1",
            onComplete: () => {
              bubble.destroy();

              // Aggiorna punteggio per ogni bolla
              this.gameScene.uiManager.updateScore(1);
            },
          });
        });
      });
    }
  }

  //* Scopo: Algoritmo ricorsivo per trovare tutte le bolle connesse (stesso colore) partendo da una cella.
  // Serve a costruire il "cluster" da esplodere.
  floodFill(
    row: number,
    col: number,
    color: string,
    visited: Set<string>,
  ): {r: number; c: number}[] {
    const result: {r: number; c: number}[] = [];
    const stack = [{r: row, c: col}];

    while (stack.length > 0) {
      const {r, c} = stack.pop()!;
      const key = `${r},${c}`;

      if (r < 0 || r >= this.rows || c < 0 || c >= this.columns) continue;
      if (visited.has(key)) continue;
      if (this.grid[r][c].color !== color) continue;

      visited.add(key);
      result.push({r, c});

      const neighbors = this.getHexNeighbors(r, c);

      for (const neighbor of neighbors) {
        stack.push(neighbor);
      }
    }

    return result;
  }

  //* Scopo: Restituisce le coordinate dei 6 vicini esagonali di una cella nella griglia esagonale.
  // Tiene conto se la riga è pari o dispari per gestire correttamente l’indentazione esagonale.
  getHexNeighbors(row: number, col: number): {r: number; c: number}[] {
    const actualRowIndex = this.currentTopRowIndex + row;
    const isEvenRow = actualRowIndex % 2 === 0;

    if (isEvenRow) {
      return [
        {r: row - 1, c: col - 1},
        {r: row - 1, c: col},
        {r: row, c: col - 1},
        {r: row, c: col + 1},
        {r: row + 1, c: col - 1},
        {r: row + 1, c: col},
      ];
    } else {
      return [
        {r: row - 1, c: col},
        {r: row - 1, c: col + 1},
        {r: row, c: col - 1},
        {r: row, c: col + 1},
        {r: row + 1, c: col},
        {r: row + 1, c: col + 1},
      ];
    }
  }

  //* Scopo: Marca tutte le bolle collegate direttamente o indirettamente alla parte superiore.
  // Usa DFS (con stack) per riempire il set visited con tutte le bolle connesse.
  // Utile per determinare quali bolle devono restare sospese e quali devono cadere.
  markConnected(row: number, col: number, visited: Set<string>) {
    const stack = [{r: row, c: col}];

    while (stack.length > 0) {
      const {r, c} = stack.pop()!;
      const key = `${r},${c}`;

      if (r < 0 || r >= this.rows || c < 0 || c >= this.columns) continue;
      if (visited.has(key)) continue;
      if (this.grid[r][c].color === "blank") continue;

      visited.add(key);

      const neighbors = this.getHexNeighbors(r, c);

      for (const neighbor of neighbors) {
        stack.push(neighbor);
      }
    }
  }

  //* Scopo: Calcola le dimensioni e la posizione centrale dell’area di gioco (background),
  // tenendo conto dei margini orizzontali (left/right) e top.
  // Questi valori vengono poi usati da tutti gli altri elementi (walls, freccia, sfondo, bolle, ecc.)
  // per garantire allineamento e adattamento allo schermo.
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
    console.log("marginTop: ", this.marginTop);

    this.bgPnlGameWidth = this.gameWidth - this.horizontalMargin * 2;
    console.log("this.bgWidth: " + this.bgPnlGameWidth);
    this.bgPnlGameHeight = this.displayGameHeight;
    this.bgPnlGameWidthCenter = this.gameWidth / 2;
    this.bgPnlGameHeightCenter = this.marginTop + this.bgPnlGameHeight / 2;

    this.bubbleSize = this.computeBubbleSize();

    // Calcola le coordinate di inizio griglia (centro della griglia)
    this.gridStartX =
      this.bgPnlGameWidthCenter - (this.columns * this.bubbleSize) / 2 + this.bubbleSize / 2;
    this.gridStartY = this.bgPnlGameHeightCenter - this.bgPnlGameHeight / 2 + this.bubbleSize / 2;

    // Posizione shooter: 100px sotto la fine della griglia
    this.shooterY = this.gameHeight - this.gameScene.setDynamicValueBasedOnScale(100, 300);
  }

  private computeBubbleSize(): number {
    const sizeBubble = this.bgPnlGameWidth / this.columns;

    this.scaleBubble = (sizeBubble + 0) / this.bubbleSizeDefault; //! regolare con queste variabili numeriche 0

    return sizeBubble - this.horzintalSpacingBubble;
  }

  //* Scopo: Aggiunge un’immagine di sfondo nella scena.
  createBackground() {
    // const sectionBackground = this.add.image(
    //   this.bgPnlGameWidthCenter,
    //   this.bgPnlGameHeightCenter,
    //   BubbleShooterAssetConf.image.backgroundImage,
    // );
    // sectionBackground.setOrigin(0.5).setDisplaySize(this.bgPnlGameWidth, this.bgPnlGameHeight);
  }

  //* Scopo: Crea i muri sinistro, destro e superiore per gestire le collisioni fisiche delle bolle.
  // Usa rettangoli invisibili con fisica statica (true).
  // Serve per far rimbalzare le bolle o farle fermare al soffitto.
  createWalls() {
    const leftPosX = this.bgPnlGameWidthCenter - this.bgPnlGameWidth / 2 - 5;
    const rightPosX = this.bgPnlGameWidthCenter + this.bgPnlGameWidth / 2 + 5;
    const verticalWallHeight = this.gameHeight;
    const thicknessX = 10;

    const topY = this.marginTop - 5;

    const createWall = (
      x: number,
      y: number,
      width: number,
      height: number,
    ): Phaser.GameObjects.Rectangle => {
      const wall = this.add.rectangle(x, y, width, height, 0x800080, 0.0); //! mettere 0.5 se si vuole un alpha piu visibile

      this.physics.add.existing(wall, true);

      return wall;
    };

    this.leftWall = createWall(leftPosX, this.gameHeight / 2, thicknessX, verticalWallHeight);
    this.rightWall = createWall(rightPosX, this.gameHeight / 2, thicknessX, verticalWallHeight);
    this.topWall = createWall(this.bgPnlGameWidthCenter, topY, this.bgPnlGameWidth, 10);
  }

  //* Scopo: Inizializza gli elementi principali per il tiro delle bolle:
  createBubbleElements() {
    // crea il gruppo fisico delle bolle
    this.bubblesGroup = this.physics.add.group();

    this.calculateGridStartX();

    // popola la griglia iniziale di bolle
    this.createBubbles();

    // aggiunge background margherita bolla
    const margherita = this.add
      .image(this.bgPnlGameWidthCenter, this.shooterY, BubbleShooterAssetConf.image.margherita)
      .setOrigin(0.5, 0.5)
      .setScale(this.scaleBubble)
      .setAlpha(1)
      .setDepth(0);

    // aggiunge la freccia
    this.arrow = this.add
      .image(this.bgPnlGameWidthCenter, this.shooterY, "arrow")
      .setOrigin(0.5, 1)
      .setScale(0.3);

    // aggiunge la bolla attuale da lanciare
    this.initialBubble = this.add
      .image(
        this.bgPnlGameWidthCenter,
        this.shooterY - this.bubbleSize / 2,
        this.currentBubbleColor,
      )
      .setOrigin(0.5, 0)
      .setScale(this.scaleBubble)
      .setAlpha(1);

    // aggiunge la bolla sucessiva da lanciare
    this.nextBubble = this.add
      .image(100, this.shooterY - this.bubbleSize / 2, this.nextBubbleColor)
      .setOrigin(0.5, 0)
      .setScale(this.scaleBubble)
      .setAlpha(1);

    // aggiunge linea tratteggiata
    this.aimLine = this.add.graphics();
  }

  //* Scopo: Registra gli eventi di input del mouse/touch:
  // pointermove: ruota la freccia verso il puntatore.
  // pointerdown: abilita il tiro.
  // pointerup: se le condizioni sono valide, chiama shootBubble() per lanciare una bolla.
  // Gestisce l'interazione del giocatore.
  setupInputHandlers() {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (
        !this.canShoot ||
        this.isGameOver ||
        pointer.y < this.marginTop ||
        pointer.y > this.shooterY - 50
      )
        return;

      shootPressed = true;

      const angle =
        Phaser.Math.Angle.Between(this.arrow.x, this.arrow.y, pointer.x, pointer.y) + Math.PI / 2;

      this.arrow.setRotation(angle);
      this.updateAimLine();
    });

    let shootPressed = false;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (
        this.canShoot &&
        !this.isGameOver &&
        pointer.y >= this.marginTop &&
        pointer.y <= this.shooterY - 50
      ) {
        shootPressed = true;
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      // Permetti il tiro fino a 50px sopra lo shooter e sotto il marginTop
      if (
        shootPressed &&
        this.canShoot &&
        !this.isGameOver &&
        pointer.y >= this.marginTop &&
        pointer.y <= this.shooterY - 50
      ) {
        this.shootBubble();
        console.log("SHOOT");
        console.log("isGameOver: " + this.isGameOver);
      } else {
        this.aimLine.clear();
      }
      shootPressed = false;
    });
  }

  //* Scopo: Crea linea tratteggiata dal puntatore con rilevamento collisioni bolle
  private updateAimLine() {
    this.aimLine.clear();

    // Usa la stessa posizione di partenza di createMovingBubble
    const startX = this.arrow.x;
    const startY = this.arrow.y;

    const maxBounces = 1;
    const maxDistance = 5000;

    const points: Phaser.Math.Vector2[] = [];

    let currentPoint = new Phaser.Math.Vector2(startX, startY);
    let currentAngle = this.arrow.rotation - Math.PI / 2;
    let hitBubble = false;
    let hitPoint: Phaser.Math.Vector2 | null = null;

    points.push(currentPoint.clone());

    // Calcola il raggio della bolla per le collisioni
    const bubbleRadius = (this.bubbleSize * this.scaleBubble) / 2;
    const wallOffset = bubbleRadius * this.offsetDimensionCircleCollisionWall;

    for (let bounce = 0; bounce <= maxBounces && !hitBubble; bounce++) {
      const dx = Math.cos(currentAngle);
      const dy = Math.sin(currentAngle);

      let rayEnd = new Phaser.Math.Vector2(
        currentPoint.x + dx * maxDistance,
        currentPoint.y + dy * maxDistance,
      );

      // Verifica collisione con le bolle esistenti prima dei muri
      const bubbleHit = this.checkAimLineCollisionWithBubbles(currentPoint, rayEnd, bubbleRadius);

      if (bubbleHit) {
        rayEnd = bubbleHit;
        hitBubble = true;
        hitPoint = bubbleHit.clone();
      }

      // Se non ha colpito una bolla, verifica i muri
      if (!hitBubble) {
        // Check collision with left wall
        if (rayEnd.x <= this.leftWall.getBounds().right + wallOffset) {
          const hitX = this.leftWall.getBounds().right + wallOffset;
          const distanceToHit = Math.abs(hitX - currentPoint.x) / Math.abs(dx);

          rayEnd.x = hitX;
          rayEnd.y = currentPoint.y + dy * distanceToHit;
          currentAngle = Math.PI - currentAngle;
        }

        // Check collision with right wall
        if (rayEnd.x >= this.rightWall.getBounds().left - wallOffset) {
          const hitX = this.rightWall.getBounds().left - wallOffset;
          const distanceToHit = Math.abs(hitX - currentPoint.x) / Math.abs(dx);

          rayEnd.x = hitX;
          rayEnd.y = currentPoint.y + dy * distanceToHit;
          currentAngle = Math.PI - currentAngle;
        }

        // Check collision with top wall
        if (rayEnd.y <= this.topWall.getBounds().bottom + wallOffset) {
          const hitY = this.topWall.getBounds().bottom + wallOffset;
          const distanceToHit = Math.abs(hitY - currentPoint.y) / Math.abs(dy);

          rayEnd.y = hitY;
          rayEnd.x = currentPoint.x + dx * distanceToHit;
          hitBubble = true;
          hitPoint = rayEnd.clone();
        }
      }

      points.push(rayEnd.clone());
      currentPoint = rayEnd.clone();
    }

    // Disegna i cerchi della linea di mira
    this.drawAimLineCircles(points, hitPoint);
  }

  //* Scopo: Verifica se la linea di mira collide con le bolle esistenti nella griglia
  private checkAimLineCollisionWithBubbles(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    bubbleRadius: number,
  ): Phaser.Math.Vector2 | null {
    const lineLength = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const stepSize = 5; // Passo per il controllo delle collisioni
    const steps = Math.ceil(lineLength / stepSize);

    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const checkX = from.x + (to.x - from.x) * t;
      const checkY = from.y + (to.y - from.y) * t;

      // Controlla collisione con tutte le bolle nella griglia
      for (let row = 0; row < this.grid.length; row++) {
        for (let col = 0; col < this.grid[row].length; col++) {
          const cell = this.grid[row][col];

          if (cell.bubble && cell.color !== "blank") {
            const distance = Phaser.Math.Distance.Between(
              checkX,
              checkY,
              cell.centerX,
              cell.centerY,
            );

            // Se la distanza è minore del raggio delle bolle, c'è collisione
            if (distance <= bubbleRadius * 1.1) {
              // 1.1 per un po' di tolleranza
              return new Phaser.Math.Vector2(checkX, checkY);
            }
          }
        }
      }
    }

    return null;
  }

  //* Scopo: Disegna i cerchi della linea di mira con punto di impatto evidenziato
  private drawAimLineCircles(points: Phaser.Math.Vector2[], hitPoint: Phaser.Math.Vector2 | null) {
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];

      const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);

      if (distance > 0) {
        const stepX = (to.x - from.x) / distance;
        const stepY = (to.y - from.y) / distance;

        let drawn = 0;

        while (drawn < distance) {
          const x = from.x + stepX * drawn;
          const y = from.y + stepY * drawn;

          // Se c'è un punto di impatto e siamo vicini ad esso, fermati
          if (
            hitPoint &&
            Phaser.Math.Distance.Between(x, y, hitPoint.x, hitPoint.y) < this.aimLineSpacing
          ) {
            break;
          }

          // Disegna cerchio normale della linea
          this.aimLine.fillStyle(this.aimLineColor, this.aimLineAlpha);
          this.aimLine.fillCircle(x, y, this.aimLineRadius);

          drawn += this.aimLineSpacing;
        }
      }
    }

    // Disegna il punto di impatto se esiste
    if (hitPoint) {
      this.aimLine.fillStyle(this.aimLineHitPointColor, this.aimLineHitPointAlpha);
      this.aimLine.fillCircle(hitPoint.x, hitPoint.y, this.aimLineHitPointRadius);

      // Aggiungi un effetto pulsante al punto di impatto
      this.aimLine.lineStyle(2, this.aimLineHitPointColor, 0.6);
      this.aimLine.strokeCircle(hitPoint.x, hitPoint.y, this.aimLineHitPointRadius + 4);
    }
  }

 
  createBubbles() {
    for (let row = 0; row < this.rows; row++) {
      const rowArray = [];
      const actualRowIndex = this.currentTopRowIndex + row;
      const isEvenRow = actualRowIndex % 2 === 0;

      for (let col = 0; col < this.columns; col++) {
        const x = this.getColumnX(col, isEvenRow);
        const y = this.getRowY(row);

        if (row < this.filledRows) {
          const color = Phaser.Utils.Array.GetRandom(this.colors);
          const bubble = this.createBubble(x, y, color);

          this.bubblesGroup.add(bubble);

          rowArray.push({centerX: x, centerY: y, color, bubble});
        } else {
          rowArray.push({centerX: x, centerY: y, color: "blank", bubble: null}); //! Originale

          
        }
      }
      this.grid.push(rowArray);

      // Aggiunge la linea divisoria centrata orizzontalmente - oltrepassandola si va in gameover
      // Calcola la Y della riga dopo l'ultima
      const dividerY = this.getRowY(this.rows - 1);

      const dividerImage = this.add.image(
        this.scale.width / 2,
        dividerY,
        BubbleShooterAssetConf.image.lineLimitEndGame,
      );

      // Applica la scala verticale delle bolle
      dividerImage.setScale(1, this.scaleBubble); // X = 1 (niente stiramento), Y = come le bolle

      // Allunga la larghezza per coprire tutto lo schermo
      dividerImage.displayWidth = this.scale.width;

      // (Facoltativo) Imposta profondità se vuoi che sia visibile sopra o sotto altri elementi
      dividerImage.setDepth(1);
    }
  }

  //* Scopo: metodo per creare la singola bolla
  private createBubble(
    x: number,
    y: number,
    color: string,
    isStatic: boolean = true,
  ): Phaser.Physics.Arcade.Image {
    const bubble = this.physics.add.image(x, y, color);

    bubble.setOrigin(0.5);

    if (isStatic) bubble.setImmovable(true);

    const radius = (bubble.displayWidth / 2) * this.sizeCircleCollider;

    const offset = bubble.displayWidth / 2 - radius;

    bubble.body?.setCircle(radius, offset, offset);
    bubble.setScale(this.scaleBubble);

    return bubble;
  }

  //* Scopo: Lancia la bolla corrente:
  // Riproduce il suono di sparo.
  // Calcola l’angolo e chiama createMovingBubble.
  // Aggiorna la "next bubble" (updateNextBubbleTextures).
  // Aggiunge collisioni con pareti, altre bolle e il soffitto.
  // Controlla se il gioco è finito (checkGameOver()).
  shootBubble() {
    if (!this.canShoot) return; // Controlla se si può sparare
    if (this.isGameOver) return;

    this.canShoot = false; // Disabilita il tiro
    this.gameScene.audioManager.playAudio(BubbleShooterAssetConf.audio.bubbleshoot);

    const angle = this.arrow.rotation;

    // 4. Particle system
    //const bubble = this.createMovingBubble(angle); //! Originale
    const bubble = this.createMovingBubble(angle) as BubbleWithTrail; //! Particle system

    bubble.setScale(this.scaleBubble);
    this.updateNextBubbleTextures();

    // 4. Particle system
    this.createAdvancedBubbleTrail(bubble);

    this.physics.add.collider(bubble, this.leftWall);
    this.physics.add.collider(bubble, this.rightWall);

    this.physics.add.overlap(bubble, this.bubblesGroup, (moving, stationary) => {
      this.handleBubbleCollision(
        moving as Phaser.Physics.Arcade.Image,
        stationary as Phaser.GameObjects.GameObject,
      );
    });

    this.physics.add.overlap(
      bubble,
      this.topWall as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody,
      (moving, stationary) => {
        this.handleBubbleCollision(
          moving as Phaser.Physics.Arcade.Image,
          stationary as Phaser.GameObjects.GameObject,
        );
      },
    );

    this.aimLine.clear();
  }

  // 5. Particle system
  //* Scopo: Cre la scia
  private createAdvancedBubbleTrail(bubble: BubbleWithTrail) {
    const bubbleColor = this.getBubbleColor(bubble.texture.key);

    // Crea multiple emettitori per un effetto più ricco
    const mainTrail = this.add.particles(0, 0, BubbleShooterAssetConf.image.bubbleTrail, {
      speed: {min: 30, max: 70},
      lifespan: {min: 300, max: 500},
      scale: {
        start: 0.4,
        end: 0,
        ease: "Cubic.easeOut",
      },
      alpha: {
        start: 0.9,
        end: 0,
        ease: "Power3",
      },
      frequency: 25,
      follow: bubble,
      tint: bubbleColor,
      blendMode: "ADD",

      // Particelle che si muovono nella direzione opposta
      angle: {
        onEmit: () => {
          const body = bubble.body as Phaser.Physics.Arcade.Body;
          const velocity = new Phaser.Math.Vector2(body.velocity.x, body.velocity.y);

          return Phaser.Math.RadToDeg(velocity.angle()) + 180 + Phaser.Math.Between(-30, 30);
        },
      },
    });

    // Effetto sparkle aggiuntivo
    const sparkles = this.add.particles(0, 0, BubbleShooterAssetConf.image.bubbleTrail, {
      speed: {min: 10, max: 30},
      lifespan: {min: 150, max: 250},
      scale: {
        start: 0.1,
        end: 0,
        ease: "Power2",
      },
      alpha: {
        start: 1,
        end: 0,
      },
      frequency: 50,
      follow: bubble,
      tint: 0xffffff, // Bianco per effetto sparkle
      blendMode: "ADD",

      // Simula l'emitZone con offset casuali
      x: {min: -8, max: 8},
      y: {min: -8, max: 8},
    });

    // Salva entrambi gli emettitori
    bubble.trailEmitter = mainTrail;
    bubble.setDepth(-10);
    (bubble as any).sparkleEmitter = sparkles;
  }

  // 6. Particle system
  //* Scopo: Metodo helper per ottenere i colori - Non funziona correttamente
  private getBubbleColor(textureKey: string): number {
    const colorMap: {[key: string]: number} = {
      ballRed: 0xff4444,
      ballBlue: 0x4444ff,
      ballGreen: 0x44ff44,
      ballYellow: 0xffff44,
      ballPurple: 0xff44ff,
    };

    return colorMap[textureKey] || 0xffffff;
  }

  //* Scopo: Crea e lancia una nuova bolla in base all’angolo di tiro (calcolato dalla direzione della freccia).
  // Imposta posizione, velocità e fisica iniziale della bolla.
  createMovingBubble(angle: number): Phaser.Physics.Arcade.Image {
    const bubble = this.createBubble(this.arrow.x, this.arrow.y, this.currentBubbleColor, false);

    // Cast esplicito a Phaser.Physics.Arcade.Body
    const body = bubble.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(
      Math.cos(angle - Math.PI / 2) * this.speedBall,
      Math.sin(angle - Math.PI / 2) * this.speedBall,
    );
    body.setBounce(1);

    return bubble;
  }

  //* Scopo: Gestisce il ciclo delle bolle in arrivo:
  // Aggiorna la bolla corrente con quella "next".
  // Seleziona casualmente la nuova "next bubble" e aggiorna le texture corrispondenti.
  updateNextBubbleTextures() {
    this.currentBubbleColor = this.nextBubbleColor;
    this.initialBubble.setTexture(this.currentBubbleColor);
    this.nextBubbleColor = Phaser.Utils.Array.GetRandom(this.colors);
    this.nextBubble.setTexture(this.nextBubbleColor);
  }

  //* Scopo:  Quando una bolla in movimento collide con un'altra o col soffitto:
  handleBubbleCollision(
    movingBubble: Phaser.Physics.Arcade.Image,
    stationaryObject: Phaser.GameObjects.GameObject,
  ) {
    // 7. Particle system
    const bubbleWithTrail = movingBubble as BubbleWithTrail;

    if (bubbleWithTrail.trailEmitter) {
      bubbleWithTrail.trailEmitter.stop();

      const sparkleEmitter = (bubbleWithTrail as any).sparkleEmitter;

      if (sparkleEmitter) {
        sparkleEmitter.stop();
      }

      this.time.delayedCall(500, () => {
        if (bubbleWithTrail.trailEmitter) {
          bubbleWithTrail.trailEmitter.destroy();
        }
        if (sparkleEmitter) {
          sparkleEmitter.destroy();
        }
      });
    } // Particle system - Fino qui

    if (!movingBubble.body) return;

    
    const dx = movingBubble.x - (stationaryObject as any).x;
    const dy = movingBubble.y - (stationaryObject as any).y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.bubbleSize && stationaryObject !== this.topWall) return;

    movingBubble.body.stop();
    const closestSquare = this.findClosestEmptySquare(movingBubble.x, movingBubble.y);

    if (!closestSquare) {
      this.canShoot = true; // Riabilita il tiro se non trova una posizione

      return;
    }

    movingBubble.destroy();

    const snappedBubble = this.createBubble(
      closestSquare.centerX,
      closestSquare.centerY,
      movingBubble.texture.key,
      false,
    );

    this.bubblesGroup.add(snappedBubble);

    const gridPosition = this.getGridPosition(closestSquare.centerX, closestSquare.centerY);

    this.updateGridWithBubble(
      closestSquare.centerX,
      closestSquare.centerY,
      movingBubble.texture.key,
      snappedBubble,
    );

    // Riabilita il tiro dopo che la bolla si è posizionata
    if (!this.isGameOver) {
      this.canShoot = true;
    }

    this.checkGameOver();

    if (!this.isGameOver) {
      this.checkAndPopGroup(gridPosition.row, gridPosition.col);
    }

    // effetto rimbalzo bolle
    this.applyBounceToNearbyBubbles(gridPosition.row, gridPosition.col);
  }

  //* Scopo: Crea effetto rimbalzo bolle, quando sono collise con la bolla lanciata
  applyBounceToNearbyBubbles(row: number, col: number) {
    const maxRadius = 3; // raggio massimo dove applicare l’effetto. Estende la zona di effetto fino a 3 celle di distanza.

    for (let r = row - maxRadius; r <= row + maxRadius; r++) {
      for (let c = col - maxRadius; c <= col + maxRadius; c++) {
        if (r < 0 || c < 0 || r >= this.rows || c >= this.columns) continue;

        const bubbleData = this.grid[r]?.[c];

        if (!bubbleData || !bubbleData.bubble) continue;

        const bubble = bubbleData.bubble;

        const originalX = bubble.x;
        const originalY = bubble.y;

        // Calcolo distanza (Manhattan o Euclidea) dalla bolla agganciata
        const distRow = Math.abs(row - r);
        const distCol = Math.abs(col - c);
        const dist = Math.sqrt(distRow * distRow + distCol * distCol);

        // Calcolo intensità spostamento decrescente con la distanza
        const maxOffset = 6; // forza spostamento bolle
        const intensity = Math.max(0, (maxRadius - dist) / maxRadius); // va da 1 (vicinissimo) a 0 (alla distanza massima).

        const offsetX = (Math.random() - 0.5) * 2 * maxOffset * intensity;
        const offsetY = (Math.random() - 0.5) * 2 * maxOffset * intensity;

        this.tweens.add({
          targets: bubble,
          x: originalX + offsetX,
          y: originalY + offsetY,
          ease: "Sine.easeInOut",
          duration: 60, // 180
          yoyo: true,
        });
      }
    }
  }

  //* Scopo: Aggiorna le coordinate (X,Y) delle celle nella griglia, utile quando cambia la posizione della riga superiore (scroll verticale o aggiunta di righe).
  // Tiene conto della riga pari/dispari per l’allineamento a nido d’ape.
  recalculateGridPositions() {
    for (let row = 0; row < this.rows; row++) {
      const actualRowIndex = this.currentTopRowIndex + row;
      const isEvenRow = actualRowIndex % 2 === 0;

      for (let col = 0; col < this.columns; col++) {
        const cell = this.grid[row][col];

        cell.centerX = this.getColumnX(col, isEvenRow);
        cell.centerY = this.getRowY(row); // Questo ora userà la spaziatura corretta
      }
    }
  }

  //* Scopo: Converte coordinate (x,y) dello spazio di gioco nella posizione logica (riga, colonna) nella griglia.
  // Tiene conto di margini e offset delle righe dispari.
  getGridPosition(x: number, y: number) {
    const row = Math.round((y - this.gridStartY) / this.bubbleSize);

    if (row < 0 || row >= this.rows) {
      return {row: Math.max(0, Math.min(row, this.rows - 1)), col: 0};
    }

    const actualRowIndex = this.currentTopRowIndex + row;
    const isEvenRow = actualRowIndex % 2 === 0;
    const offset = isEvenRow ? 0 : this.bubbleSize / 2;
    const col = Math.round((x - this.gridStartX - offset) / this.bubbleSize);

    return {
      row: Math.max(0, Math.min(row, this.rows - 1)),
      col: Math.max(0, Math.min(col, this.columns - 1)),
    };
  }

  //* Scopo: rova la cella vuota più vicina alle coordinate date.
  // Serve a "snappare" la bolla al punto più adatto dopo la collisione.
  findClosestEmptySquare(x: number, y: number) {
    let closestSquare = null;
    let closestDistance = Infinity;

    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[row].length; col++) {
        const square = this.grid[row][col];

        if (square.color === "blank") {
          const distance = Math.sqrt(
            Math.pow(square.centerX - x, 2) + Math.pow(square.centerY - y, 2),
          );

          if (distance < closestDistance) {
            closestDistance = distance;
            closestSquare = square;
          }
        }
      }
    }

    return closestSquare;
  }

  //* Scopo: Aggiorna i dati della griglia con una nuova bolla posizionata in (x, y) e assegna colore e riferimento all’oggetto Phaser.
  // Controlla anche che la posizione sia valida (entro i limiti della griglia).
  updateGridWithBubble(x: number, y: number, color: string, bubble: Phaser.Physics.Arcade.Image) {
    const gridPos = this.getGridPosition(x, y);
    const row = gridPos.row;
    const col = gridPos.col;

    if (row >= 0 && row < this.rows && col >= 0 && col < this.columns) {
      const cell = this.grid[row][col];

      cell.color = color;
      cell.bubble = bubble;

      bubble.setScale(this.scaleBubble);
      bubble.setPosition(cell.centerX, cell.centerY);
    } else {
      console.warn("Bubble is outside the grid bounds!", {row, col});
    }
  }

  //* Scopo: Controlla se non ci sono piu file disponibile e attiva il gameOver
  checkGameOver() {
    for (let col = 0; col < this.columns; col++) {
      if (this.grid[this.rows - 1][col].color !== "blank") {
        console.log(`GAME OVER: Le bolle hanno raggiunto la riga finale (${this.rows})`);
        console.log(`Aggiungere outro e creare le animazioni rispettive, dipendedno dal risultato`);

        this.canShoot = false;
        //this.isGameOver = true;

        this.scene.pause();
        this.gameScene.gameOver(); // toglierlo da qui e metterlo in outro, una volta creato.

        return;
      }
    }
  }
}

// 1. Particle system
type BubbleWithTrail = Phaser.Physics.Arcade.Image & {
  trailEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
};
