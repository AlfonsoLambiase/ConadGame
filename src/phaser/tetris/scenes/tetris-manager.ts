
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {TetrisAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = TetrisAssetConf;

// Definizione dei pezzi Tetris
interface TetrisPiece {
  shape: number[][];
  texture: string;
  type: string;
}

// Configurazione velocità
interface SpeedConfig {
  enableSpeedIncrease: boolean;
  speedIncreaseRate: number;
  initialDropSpeed: number;
}

export class TetrisManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;
  private marginSide = 100;
  private marginBottom = 100;

  private isGameOver: boolean = false;

  gameScene!: Game;

  private speedConfig: SpeedConfig = {
    enableSpeedIncrease: true,
    speedIncreaseRate: 50,
    initialDropSpeed: 1000,
  };

  // Griglia di gioco
  private readonly GRID_WIDTH = 8; // 10
  private readonly GRID_HEIGHT = 11; // 14
  private MULTIPLY_DIMENSION_GRID = 1.2;
  private CELL_SIZE = 30;

  // *** VARIABILI CONFIGURABILI PER I BACKGROUND ***
  private readonly BG_TOLERANCE_PERCENTAGE = 5; // Percentuale di tolleranza per il background block (modificabile)
  private NEXT_PIECE_SCALE = 0.3; // Scala del prossimo pezzo (modificabile - attualmente pezzo/2)
  private readonly GRID_BG_TEXTURE = assetConf.image.tetris_BG; // Texture per i blocchi della griglia (modificabile)
  private readonly BG_BLOCK_TEXTURE = assetConf.image.tetris_bgBlock; // Texture per il background block (modificabile)
  private readonly NEXT_PIECE_BG_TEXTURE = assetConf.image.backgroundPiece; // Texture per il background del next piece (modificabile)

  private grid: string[][] = [];
  private currentPiece: TetrisPiece | null = null;
  private nextPiece: TetrisPiece | null = null;
  private currentX = 0;
  private currentY = 0;

  // Grafica con sprites
  private gameArea!: Phaser.GameObjects.Rectangle;
  private previewArea!: Phaser.GameObjects.Rectangle;
  private gridGraphics!: Phaser.GameObjects.Graphics; // Solo per le linee della griglia
  private bgBlockSprite!: Phaser.GameObjects.Sprite; // Nuovo sprite per il background block
  private nextPieceBgSprite!: Phaser.GameObjects.Sprite; // Nuovo sprite per il background del next piece

  // Sprites per i pezzi
  private gridSprites: Phaser.GameObjects.Sprite[][] = [];
  private pieceSprites: Phaser.GameObjects.Sprite[] = [];
  private shadowSprites: Phaser.GameObjects.Sprite[] = [];
  private nextPieceSprites: Phaser.GameObjects.Sprite[] = [];
  private trailSprites: Phaser.GameObjects.Sprite[] = [];

  // Controlli
  private lastPointer = {x: 0, y: 0};
  private isDragging = false;
  private dragStartY = 0;

  // Timer
  private dropTimer!: Phaser.Time.TimerEvent;
  private currentDropSpeed!: number;
  private level = 1;

  // variabili per velocita di discesa
  private fastDropSpeed: number = 50;
  private isDropping: boolean = false;
  private fastDropTimer!: Phaser.Time.TimerEvent;

  // variabili per effetto scia
  private trailPositions: Array<{x: number; y: number; alpha: number}> = [];
  private maxTrailLength: number = 5;

  // Variabili di controllo input
  private inputCooldownTimer: Phaser.Time.TimerEvent | null = null;
  private readonly inputDelayTime: number = 300;

  // Variabili per il fastDrop
  private isScrollingDown: boolean = false;
  private scrollStartY: number = 0;

  // Definizione pezzi Tetris
  private readonly PIECES: TetrisPiece[] = [
    // I - Celeste
    {
      shape: [[1, 1, 1, 1]],
      texture: assetConf.image.tetris_I,
      type: "I",
    },
    // O - Giallo
    {
      shape: [
        [1, 1],
        [1, 1],
      ],
      texture: assetConf.image.tetris_O,
      type: "O",
    },
    // T - Viola
    {
      shape: [
        [0, 1, 0],
        [1, 1, 1],
      ],
      texture: assetConf.image.tetris_T,
      type: "T",
    },
    // S - Verde
    {
      shape: [
        [0, 1, 1],
        [1, 1, 0],
      ],
      texture: assetConf.image.tetris_S,
      type: "S",
    },
    // Z - Rosso
    {
      shape: [
        [1, 1, 0],
        [0, 1, 1],
      ],
      texture: assetConf.image.tetris_Z,
      type: "Z",
    },
    // J - Blu
    {
      shape: [
        [1, 0, 0],
        [1, 1, 1],
      ],
      texture: assetConf.image.tetris_J,
      type: "J",
    },
    // L - Arancione
    {
      shape: [
        [0, 0, 1],
        [1, 1, 1],
      ],
      texture: assetConf.image.tetris_L,
      type: "L",
    },
  ];

  private isAnimatingLines: boolean = false;
  private readonly MIN_SCROLL_DISTANCE_TO_DROP = 50;

  private previewContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({key: assetConf.scene.tetrisManager});
  }

  //* Scopo: Inizializza la scena con dati dal gioco principale
  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  //* Scopo: Crea tutti gli elementi del gioco (grafica, UI, controlli)
  create() {
    this.NEXT_PIECE_SCALE = this.gameScene.setDynamicValueBasedOnScale(0.7, 0.25);

    console.log("StartGameTetris");
    this.computeLayoutDimensions();
    this.calculateResponsiveDimensions();
    this.initializeGrid();
    this.createGameArea();
    this.setupControls();
    this.startGame();

    this.time.delayedCall(50, () => {
      this.isGameOver = false;
    });
  }

  //* Scopo: Calcola dimensioni responsive del layout
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
    this.marginSide = this.gameScene.setDynamicValueBasedOnScale(40, 80);
    this.marginBottom = this.gameScene.setDynamicValueBasedOnScale(80, 150);

    console.log("Screen dimensions:", this.gameWidth, "x", this.gameHeight);
    console.log(
      "Margins - Top:",
      this.marginTop,
      "Side:",
      this.marginSide,
      "Bottom:",
      this.marginBottom,
    );

    this.MULTIPLY_DIMENSION_GRID = this.gameScene.setDynamicValueBasedOnScale(1.05, 1.2);
    console.log("MULTIPLY_DIMENSION_GRID: ", this.MULTIPLY_DIMENSION_GRID);
  }

  //* Scopo: Calcola automaticamente le dimensioni delle celle per adattarsi allo schermo
  private calculateResponsiveDimensions(): void {
    const availableWidth = this.gameWidth - this.marginSide * 2;
    const availableHeight = this.gameHeight - this.marginTop - this.marginBottom;

    const gameAreaWidth = availableWidth * 0.85 * this.MULTIPLY_DIMENSION_GRID;
    const cellSizeByWidth = Math.floor(gameAreaWidth / this.GRID_WIDTH);

    const gameAreaHeight = availableHeight * 0.9 * this.MULTIPLY_DIMENSION_GRID;
    const cellSizeByHeight = Math.floor(gameAreaHeight / this.GRID_HEIGHT);

    this.CELL_SIZE = Math.min(cellSizeByWidth, cellSizeByHeight);
  }

  //* Scopo: Inizializza la griglia vuota e velocità iniziale
  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.GRID_HEIGHT; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.GRID_WIDTH; x++) {
        this.grid[y][x] = "";
      }
    }
    this.currentDropSpeed = this.speedConfig.initialDropSpeed;
  }

  //* Scopo: Crea area di gioco, anteprima e oggetti grafici
  private createGameArea(): void {
    const gameAreaWidth = this.GRID_WIDTH * this.CELL_SIZE;
    const gameAreaHeight = this.GRID_HEIGHT * this.CELL_SIZE;
    const gameAreaX = this.gameWidth / 2;
    const gameAreaY = this.marginTop + gameAreaHeight / 2;

    // Crea il background block con tolleranza
    this.createBackgroundBlock(gameAreaX, gameAreaY, gameAreaWidth, gameAreaHeight);

    // background nero, reso invisibile
    this.gameArea = this.add
      .rectangle(gameAreaX, gameAreaY, gameAreaWidth, gameAreaHeight, 0x222222)
      .setStrokeStyle(2, 0xffffff)
      .setAlpha(0);

    this.gridGraphics = this.add.graphics(); // Solo per le linee della griglia

    // Inizializza gli sprites
    this.initializeSprites();

    // Crea container anteprima
    this.createPreviewContainer();
  }

  //* Scopo: Crea il background block con tolleranza configurabile
  private createBackgroundBlock(
    gameAreaX: number,
    gameAreaY: number,
    gameAreaWidth: number,
    gameAreaHeight: number,
  ): void {
    const tolerance = this.BG_TOLERANCE_PERCENTAGE / 100;
    const bgWidth = gameAreaWidth * (1 + tolerance);
    const bgHeight = gameAreaHeight * (1 + tolerance);

    this.bgBlockSprite = this.add.sprite(gameAreaX, gameAreaY, this.BG_BLOCK_TEXTURE);
    this.bgBlockSprite.setDisplaySize(bgWidth, bgHeight);
    this.bgBlockSprite.setDepth(-2); // Posiziona dietro tutto
  }

  //* Scopo: Inizializza tutti gli sprites
  private initializeSprites(): void {
    // Inizializza sprites per la griglia con texture BG
    for (let y = 0; y < this.GRID_HEIGHT; y++) {
      this.gridSprites[y] = [];
      for (let x = 0; x < this.GRID_WIDTH; x++) {
        // Crea sprite con texture BG di default per le celle vuote
        this.gridSprites[y][x] = this.add.sprite(0, 0, this.GRID_BG_TEXTURE).setVisible(true);
      }
    }

    // Pre-crea sprites per pezzi, ombra, trail e anteprima
    // Crea abbastanza sprites per coprire il pezzo più grande (4x4)
    for (let i = 0; i < 16; i++) {
      this.pieceSprites.push(this.add.sprite(0, 0, "").setVisible(false));
      this.shadowSprites.push(this.add.sprite(0, 0, "").setVisible(false));
      this.nextPieceSprites.push(this.add.sprite(0, 0, "").setVisible(false));
    }

    // Crea sprites per la scia
    for (let i = 0; i < this.maxTrailLength * 16; i++) {
      this.trailSprites.push(this.add.sprite(0, 0, "").setVisible(false));
    }
  }

  //* Scopo: Crea il container per l'area anteprima con background
  private createPreviewContainer(): void {
    const previewSize = this.CELL_SIZE;

    // Calcolo della scala relativa a CELL_SIZE (256 = base)
    const baseCellSize = 256;
    const scaleFactor = previewSize / baseCellSize;

    // Container principale (che scaleremo alla fine)
    this.previewContainer = this.add.container(0, 0);

    // Container locale per allineare BG + contenuti
    const localContainer = this.add.container(0, 0);

    // Background (senza scala diretta)
    this.nextPieceBgSprite = this.add.sprite(0, 0, this.NEXT_PIECE_BG_TEXTURE);
    this.nextPieceBgSprite.setOrigin(0.5); // centrato
    localContainer.add(this.nextPieceBgSprite);

    // Offset regolabile per il pezzo
    const pieceOffsetX = this.gameScene.setDynamicValueBasedOnScale(-55, -40);

    // Area di anteprima (ancora in coordinate locali)
    this.previewArea = this.add
      .rectangle(
        pieceOffsetX,
        0,
        this.nextPieceBgSprite.width * 0.8,
        this.nextPieceBgSprite.height * 0.8,
        0x000000,
        0,
      )
      .setOrigin(0.5);
    localContainer.add(this.previewArea);

    // Contenitore del pezzo (dove verrà aggiunto il tetramino)
    const nextPieceContainer = this.add.container(pieceOffsetX, 0);

    localContainer.add(nextPieceContainer);

    // Aggiungiamo il localContainer al principale
    this.previewContainer.add(localContainer);

    // Applichiamo la scala UNA SOLA VOLTA all’intero blocco
    this.previewContainer.setScale(scaleFactor * 3.0);

    // Posizionamento finale sullo schermo (in basso a sinistra in questo esempio)
    const posY = this.gameScene.setDynamicValueBasedOnScale(
      this.scale.height - 75,
      this.scale.height - 170,
    );

    this.previewContainer.setPosition(this.nextPieceBgSprite.width * 0.5, posY);
  }

  //* Scopo: Configura controlli touch, mouse e tastiera
  private setupControls(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = {x: pointer.x, y: pointer.y};
      this.isDragging = false;
      this.dragStartY = pointer.y;
      this.scrollStartY = pointer.y;
      this.isScrollingDown = false;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.isInputReady()) {
        const deltaX = pointer.x - this.lastPointer.x;
        const deltaY = pointer.y - this.lastPointer.y;
        const totalScrollY = pointer.y - this.scrollStartY;

        if (totalScrollY > this.MIN_SCROLL_DISTANCE_TO_DROP && !this.isAnimatingLines) {
          this.isScrollingDown = true;
          this.handleFastDrop();
          this.lastPointer = {x: pointer.x, y: pointer.y};

          return;
        }

        if (
          Math.abs(deltaX) > this.gameScene.setDynamicValueBasedOnScale(50, 80) &&
          Math.abs(deltaX) > Math.abs(deltaY) &&
          !this.isDropping &&
          !this.isAnimatingLines
        ) {
          this.isDragging = true;
          if (deltaX > 0) {
            this.movePiece(1, 0);
          } else {
            this.movePiece(-1, 0);
          }
          this.lastPointer.x = pointer.x;
        }
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.isScrollingDown) {
        this.stopFastDrop();
      }

      const totalMovement =
        Math.abs(pointer.y - this.dragStartY) + Math.abs(pointer.x - this.lastPointer.x);
      const isMinimalMovement = totalMovement < 30;

      if (!this.isDragging && !this.isScrollingDown && isMinimalMovement && this.isInputReady()) {
        this.rotatePiece();
      }

      this.isDragging = false;
      this.isScrollingDown = false;
    });

    const cursors = this.input.keyboard?.createCursorKeys();

    if (cursors) {
      cursors.left?.on("down", () => {
        if (!this.isDropping && !this.isAnimatingLines && this.isInputReady()) {
          this.movePiece(-1, 0);
        }
      });
      cursors.right?.on("down", () => {
        if (!this.isDropping && !this.isAnimatingLines && this.isInputReady()) {
          this.movePiece(1, 0);
        }
      });
      cursors.down?.on("down", () => {
        if (!this.isAnimatingLines && this.isInputReady()) {
          this.handleFastDrop();
        }
      });
      cursors.up?.on("down", () => {
        if (!this.isDropping && !this.isAnimatingLines && this.isInputReady()) {
          this.rotatePiece();
        }
      });
    }
  }

  //* Scopo: Verifica se l'input è pronto (cooldown terminato)
  private isInputReady(): boolean {
    return (
      this.inputCooldownTimer === null || this.inputCooldownTimer.elapsed > this.inputDelayTime
    );
  }

  private startGame(): void {
    this.spawnNewPiece();
    this.createDropTimer();
  }

  //* Scopo: Crea/ricrea il timer per la caduta automatica
  private createDropTimer(): void {
    if (this.dropTimer) {
      this.dropTimer.destroy();
    }

    this.dropTimer = this.time.addEvent({
      delay: this.currentDropSpeed,
      callback: this.dropPiece,
      callbackScope: this,
      loop: true,
    });
  }

  //* Scopo: Genera un pezzo casuale dal set di pezzi
  private getRandomPiece(): TetrisPiece {
    const randomIndex = Phaser.Math.Between(0, this.PIECES.length - 1);

    return JSON.parse(JSON.stringify(this.PIECES[randomIndex]));
  }

  //* Scopo: Fa cadere il pezzo di una posizione o lo piazza
  private dropPiece(): void {
    if (!this.currentPiece || this.isGameOver || this.isAnimatingLines) return;

    if (this.isValidPosition(this.currentX, this.currentY + 1, this.currentPiece.shape)) {
      // * caduta normale
      this.currentY++;

      //console.log("PieceDropStep");
      this.gameScene.audioManager.playAudio(assetConf.audio.PieceDropStep);

      // Controlla se il pezzo può muoversi
      const canMoveDown = this.isValidPosition(
        this.currentX,
        this.currentY + 1,
        this.currentPiece.shape,
      );

      if (!canMoveDown) {
        //console.log("lockDown");
        this.gameScene.audioManager.playAudio(assetConf.audio.lockDown);
      }
    } else {
      //console.log("PieceDropStep");
      this.gameScene.audioManager.playAudio(assetConf.audio.PieceDropStep);

      this.placePiece();
      this.clearLines();
      console.log("else");
    }

    this.drawGame();
  }

  //* Scopo: Gestisce la caduta veloce quando si scorre giù
  private handleFastDrop(): void {
    if (!this.currentPiece || this.isGameOver || this.isDropping) {
      return;
    }

    this.isDropping = true;
    this.stopRegularDropTimer();
    this.startFastDrop();
  }

  //* Scopo: Avvia il timer per la caduta veloce
  private startFastDrop(): void {
    if (this.fastDropTimer) {
      this.fastDropTimer.destroy();
    }

    this.fastDropTimer = this.time.addEvent({
      delay: this.fastDropSpeed,
      callback: this.fastDropStep,
      callbackScope: this,
      loop: true,
    });
  }

  //* Scopo: Esegue un passo della caduta veloce
  private fastDropStep(): void {
    if (!this.currentPiece || this.isGameOver || this.isAnimatingLines) {
      this.stopFastDrop();

      return;
    }

    if (this.isValidPosition(this.currentX, this.currentY + 1, this.currentPiece.shape)) {
      //* caduta veloce movimento verso il basso
      this.currentY++;

      console.log("caduta veloce if");
      this.gameScene.audioManager.playAudio(assetConf.audio.lateralMovement);

      this.updateTrail();
      this.drawGame();
    } else {
      //* caduta veloce blocco al finale
      console.log("caduta veloce else");
      this.gameScene.audioManager.playAudio(assetConf.audio.lockDown);
      this.stopFastDrop();
      this.placePiece();
      this.clearLines();
    }
  }

  //* Scopo: Ferma la caduta veloce e ripristina quella normale
  private stopFastDrop(): void {
    this.isDropping = false;
    this.isScrollingDown = false;
    this.clearTrail();

    if (this.fastDropTimer) {
      this.fastDropTimer.destroy();
    }
    this.startRegularDropTimer();
    this.drawGame();
  }

  //* Scopo: Mette in pausa il timer di caduta normale
  private stopRegularDropTimer(): void {
    if (this.dropTimer) {
      this.dropTimer.paused = true;
    }
  }

  //* Scopo: Riprende il timer di caduta normale
  private startRegularDropTimer(): void {
    if (this.dropTimer) {
      this.dropTimer.paused = false;
    }
  }

  //* Scopo: Cancella l'effetto scia del pezzo
  private clearTrail(): void {
    this.trailPositions = [];
    // Nascondi tutti gli sprites della scia
    this.trailSprites.forEach((sprite) => sprite.setVisible(false));
  }

  //* Scopo: Sposta il pezzo corrente nelle direzioni specificate
  private movePiece(deltaX: number, deltaY: number): void {
    if (!this.currentPiece || this.isGameOver || this.isAnimatingLines) return;

    const newX = this.currentX + deltaX;
    const newY = this.currentY + deltaY;

    if (this.isValidPosition(newX, newY, this.currentPiece.shape)) {
      this.currentX = newX;
      this.currentY = newY;

      // AGGIUNGI QUESTO - solo per movimento laterale
      if (deltaX !== 0) {
        //console.log("lateralMovement");
        this.gameScene.audioManager.playAudio(assetConf.audio.lateralMovement);
      }

      this.drawGame();
    }
  }

  //* Scopo: Ruota il pezzo corrente di 90 gradi
  private rotatePiece(): void {
    if (!this.currentPiece || this.isGameOver) return;

    //console.log("rotate");
    this.gameScene.audioManager.playAudio(assetConf.audio.rotate);

    const rotatedShape = this.rotateMatrix(this.currentPiece.shape);

    if (this.isValidPosition(this.currentX, this.currentY, rotatedShape)) {
      this.currentPiece.shape = rotatedShape;
      this.drawGame();
    }
  }

  //* Scopo: Ruota una matrice di 90 gradi in senso orario
  private rotateMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = [];

    for (let i = 0; i < cols; i++) {
      rotated[i] = [];
      for (let j = 0; j < rows; j++) {
        rotated[i][j] = matrix[rows - 1 - j][i];
      }
    }

    return rotated;
  }

  //* Scopo: Verifica se una posizione è valida per un pezzo
  private isValidPosition(x: number, y: number, shape: number[][]): boolean {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 1) {
          const newX = x + col;
          const newY = y + row;

          if (newX < 0 || newX >= this.GRID_WIDTH || newY >= this.GRID_HEIGHT) {
            return false;
          }

          if (newY >= 0 && this.grid[newY][newX] !== "") {
            return false;
          }
        }
      }
    }

    return true;
  }

  //* Scopo: Piazza definitivamente il pezzo nella griglia
  private placePiece(): void {
    if (!this.currentPiece) return;

    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col] === 1) {
          const x = this.currentX + col;
          const y = this.currentY + row;

          if (x >= 0 && x < this.GRID_WIDTH && y >= 0 && y < this.GRID_HEIGHT) {
            this.grid[y][x] = this.currentPiece.texture; // Memorizza il nome della texture
          }
        }
      }
    }

    //* non cancellare crea un log di tutta la griglia, serve per controllare se non ci sono bug.
    //console.table(this.grid);
  }

  //* Scopo: per texture
  private clearLines(): void {
    const linesToClear: number[] = [];

    for (let y = this.GRID_HEIGHT - 1; y >= 0; y--) {
      if (this.grid[y].every((cell) => cell !== "")) {
        linesToClear.push(y);
      }
    }

    if (linesToClear.length > 0) {
      //console.log("lineClear");
      this.gameScene.audioManager.playAudio(assetConf.audio.lineClear);

      this.isAnimatingLines = true;
      this.stopRegularDropTimer();

      this.animateLinesClearEffect(linesToClear, () => {
        const sortedLines = [...linesToClear].sort((a, b) => b - a);

        sortedLines.forEach((lineY) => {
          this.grid.splice(lineY, 1);
        });

        for (let i = 0; i < sortedLines.length; i++) {
          this.grid.unshift(new Array(this.GRID_WIDTH).fill(""));
        }

        this.updateScore(linesToClear.length);
        this.drawGame();

        this.time.delayedCall(200, () => {
          this.isAnimatingLines = false;
          this.startRegularDropTimer();
          this.spawnNewPiece();
        });
      });
    } else {
      this.spawnNewPiece();
    }
  }

  //* Scopo: Anima l'effetto visivo di cancellazione righe
  private animateLinesClearEffect(linesToAnimate: number[], onComplete: () => void): void {
    const startX = this.gameArea.x - (this.GRID_WIDTH * this.CELL_SIZE) / 2;
    const startY = this.gameArea.y - (this.GRID_HEIGHT * this.CELL_SIZE) / 2;

    const flashGraphics = this.add.graphics();
    let flashCount = 0;
    const maxFlashes = 4;
    const flashDelay = 80;

    const flashTimer = this.time.addEvent({
      delay: flashDelay,
      callback: () => {
        flashGraphics.clear();

        if (flashCount % 2 === 0) {
          flashGraphics.fillStyle(0xffffff, 0.6);
          linesToAnimate.forEach((lineY) => {
            const y = startY + lineY * this.CELL_SIZE;

            flashGraphics.fillRect(startX, y, this.GRID_WIDTH * this.CELL_SIZE, this.CELL_SIZE - 1);
          });
        }

        flashCount++;

        if (flashCount >= maxFlashes) {
          flashTimer.destroy();

          this.tweens.add({
            targets: flashGraphics,
            alpha: 0,
            duration: 150,
            ease: "Power2",
            onComplete: () => {
              flashGraphics.destroy();
              onComplete();
            },
          });
        }
      },
      loop: true,
    });
  }

  //* Scopo: Genera un nuovo pezzo e verifica game over
  private spawnNewPiece(): void {
    if (this.isAnimatingLines) {
      return;
    }

    if (!this.nextPiece) {
      this.nextPiece = this.getRandomPiece();
    }

    this.currentPiece = this.nextPiece;
    this.nextPiece = this.getRandomPiece();

    this.currentX =
      Math.floor(this.GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
    this.currentY = 0;

    if (!this.isValidPosition(this.currentX, this.currentY, this.currentPiece.shape)) {
      this.checkGameOver();

      return;
    }

    this.trailPositions = [];
    this.inputCooldownTimer = this.time.addEvent({
      delay: this.inputDelayTime,
      callback: () => {
        this.inputCooldownTimer = null;
      },
    });

    this.drawGame();
  }

  //* Scopo: Aggiorna punteggio basato su righe cancellate
  private updateScore(lines: number): void {
    this.gameScene.uiManager.updateScore(lines);
  }

  //* Scopo: Calcola la posizione dell'ombra del pezzo
  private getShadowPosition(): number {
    if (!this.currentPiece) return this.currentY;

    let shadowY = this.currentY;

    while (this.isValidPosition(this.currentX, shadowY + 1, this.currentPiece.shape)) {
      shadowY++;
    }

    return shadowY;
  }

  //* Scopo: Ridisegna tutti gli elementi grafici del gioco
  private drawGame(): void {
    if (this.isAnimatingLines) {
      return;
    }

    // Nasconde tutti gli sprites prima di ridisegnare
    this.hideAllSprites();

    this.drawGrid();
    this.drawShadow();
    this.drawTrail();
    this.drawCurrentPiece();
    this.drawNextPiece();
  }

  //* Scopo: Nasconde tutti gli sprites
  private hideAllSprites(): void {
    this.pieceSprites.forEach((sprite) => sprite.setVisible(false));
    this.shadowSprites.forEach((sprite) => sprite.setVisible(false));
    this.nextPieceSprites.forEach((sprite) => sprite.setVisible(false));
    this.trailSprites.forEach((sprite) => sprite.setVisible(false));
  }

  //* Scopo: Aggiorna le posizioni della scia del pezzo
  private updateTrail(): void {
    if (!this.currentPiece) return;

    this.trailPositions.unshift({
      x: this.currentX,
      y: this.currentY,
      alpha: 1.0,
    });

    if (this.trailPositions.length > this.maxTrailLength) {
      this.trailPositions.pop();
    }

    this.trailPositions.forEach((pos, index) => {
      pos.alpha = 1.0 - index / this.maxTrailLength;
    });
  }

  //* Scopo: Disegna l'effetto scia durante caduta veloce
  private drawTrail(): void {
    if (!this.currentPiece || this.trailPositions.length === 0) return;

    const startX = this.gameArea.x - (this.GRID_WIDTH * this.CELL_SIZE) / 2;
    const startY = this.gameArea.y - (this.GRID_HEIGHT * this.CELL_SIZE) / 2;

    let spriteIndex = 0;

    for (let i = 1; i < this.trailPositions.length; i++) {
      const pos = this.trailPositions[i];

      for (let row = 0; row < this.currentPiece.shape.length; row++) {
        for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
          if (this.currentPiece.shape[row][col] === 1 && spriteIndex < this.trailSprites.length) {
            const sprite = this.trailSprites[spriteIndex];
            const cellX = startX + (pos.x + col) * this.CELL_SIZE + this.CELL_SIZE / 2;
            const cellY = startY + (pos.y + row) * this.CELL_SIZE + this.CELL_SIZE / 2;

            sprite.setTexture(this.currentPiece.texture);
            sprite.setPosition(cellX, cellY);
            sprite.setDisplaySize(this.CELL_SIZE - 1, this.CELL_SIZE - 1);
            sprite.setAlpha(pos.alpha * 0.6);
            sprite.setVisible(true);

            spriteIndex++;
          }
        }
      }
    }
  }

  //* Scopo: Disegna la griglia con texture BG per celle vuote e pezzi piazzati
  private drawGrid(): void {
    const startX = this.gameArea.x - (this.GRID_WIDTH * this.CELL_SIZE) / 2;
    const startY = this.gameArea.y - (this.GRID_HEIGHT * this.CELL_SIZE) / 2;

    // Disegna la griglia con sprites
    for (let y = 0; y < this.GRID_HEIGHT; y++) {
      for (let x = 0; x < this.GRID_WIDTH; x++) {
        const sprite = this.gridSprites[y][x];
        const cellX = startX + x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const cellY = startY + y * this.CELL_SIZE + this.CELL_SIZE / 2;

        // Se la cella è vuota, usa la texture BG, altrimenti usa la texture del pezzo
        if (this.grid[y][x] !== "") {
          sprite.setTexture(this.grid[y][x]);
        } else {
          sprite.setTexture(this.GRID_BG_TEXTURE);
        }

        sprite.setPosition(cellX, cellY);
        sprite.setDisplaySize(this.CELL_SIZE - 1, this.CELL_SIZE - 1);
        sprite.setVisible(true);
      }
    }

    // Disegna le linee della griglia
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x444444);
    for (let x = 0; x <= this.GRID_WIDTH; x++) {
      const lineX = startX + x * this.CELL_SIZE;

      this.gridGraphics.lineBetween(
        lineX,
        startY,
        lineX,
        startY + this.GRID_HEIGHT * this.CELL_SIZE,
      );
    }

    for (let y = 0; y <= this.GRID_HEIGHT; y++) {
      const lineY = startY + y * this.CELL_SIZE;

      this.gridGraphics.lineBetween(
        startX,
        lineY,
        startX + this.GRID_WIDTH * this.CELL_SIZE,
        lineY,
      );
    }
  }

  //* Scopo: Disegna l'ombra del pezzo corrente
  private drawShadow(): void {
    if (!this.currentPiece) return;

    const shadowY = this.getShadowPosition();
    const startX = this.gameArea.x - (this.GRID_WIDTH * this.CELL_SIZE) / 2;
    const startY = this.gameArea.y - (this.GRID_HEIGHT * this.CELL_SIZE) / 2;

    let spriteIndex = 0;

    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col] === 1 && spriteIndex < this.shadowSprites.length) {
          const sprite = this.shadowSprites[spriteIndex];
          const cellX = startX + (this.currentX + col) * this.CELL_SIZE + this.CELL_SIZE / 2;
          const cellY = startY + (shadowY + row) * this.CELL_SIZE + this.CELL_SIZE / 2;

          sprite.setTexture(this.currentPiece.texture);
          sprite.setPosition(cellX, cellY);
          sprite.setDisplaySize(this.CELL_SIZE - 1, this.CELL_SIZE - 1);
          sprite.setAlpha(0.3);
          sprite.setVisible(true);

          spriteIndex++;
        }
      }
    }
  }

  //* Scopo: Disegna il pezzo corrente in movimento
  private drawCurrentPiece(): void {
    if (!this.currentPiece) return;

    const startX = this.gameArea.x - (this.GRID_WIDTH * this.CELL_SIZE) / 2;
    const startY = this.gameArea.y - (this.GRID_HEIGHT * this.CELL_SIZE) / 2;

    let spriteIndex = 0;

    for (let row = 0; row < this.currentPiece.shape.length; row++) {
      for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
        if (this.currentPiece.shape[row][col] === 1 && spriteIndex < this.pieceSprites.length) {
          const sprite = this.pieceSprites[spriteIndex];
          const cellX = startX + (this.currentX + col) * this.CELL_SIZE + this.CELL_SIZE / 2;
          const cellY = startY + (this.currentY + row) * this.CELL_SIZE + this.CELL_SIZE / 2;

          sprite.setTexture(this.currentPiece.texture);
          sprite.setPosition(cellX, cellY);
          sprite.setDisplaySize(this.CELL_SIZE - 1, this.CELL_SIZE - 1);
          sprite.setAlpha(1.0);
          sprite.setVisible(true);

          spriteIndex++;
        }
      }
    }
  }

  //* Scopo: Disegna il prossimo pezzo nell'area anteprima con scala configurabile
  private drawNextPiece(): void {
    if (!this.nextPiece) return;

    const scaledCellSize = this.CELL_SIZE * this.NEXT_PIECE_SCALE;
    const previewCenterX = this.previewArea.x;
    const previewCenterY = this.previewArea.y;
    const pieceWidth = this.nextPiece.shape[0].length * scaledCellSize;
    const pieceHeight = this.nextPiece.shape.length * scaledCellSize;

    const startX = previewCenterX - pieceWidth / 2;
    const startY = previewCenterY - pieceHeight / 2;

    let spriteIndex = 0;

    for (let row = 0; row < this.nextPiece.shape.length; row++) {
      for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
        if (this.nextPiece.shape[row][col] === 1 && spriteIndex < this.nextPieceSprites.length) {
          const sprite = this.nextPieceSprites[spriteIndex];
          const cellX = startX + col * scaledCellSize + scaledCellSize / 2;
          const cellY = startY + row * scaledCellSize + scaledCellSize / 2;

          sprite.setTexture(this.nextPiece.texture);
          sprite.setPosition(cellX, cellY);
          sprite.setDisplaySize(scaledCellSize - 1, scaledCellSize - 1);
          sprite.setAlpha(1.0);
          sprite.setVisible(true);

          // Aggiunge gli sprites dell'anteprima al container
          if (!this.previewContainer.list.includes(sprite)) {
            this.previewContainer.add(sprite);
          }

          spriteIndex++;
        }
      }
    }
  }

  //* Scopo: Ferma completamente il movimento del pezzo corrente
  public stopPieceMovement(): void {
    console.log("STOP movimento pezzo");
    // Ferma tutti i timer
    if (this.dropTimer) {
      this.dropTimer.destroy();
    }
    if (this.fastDropTimer) {
      this.fastDropTimer.destroy();
    }
    if (this.inputCooldownTimer) {
      this.inputCooldownTimer.destroy();
      this.inputCooldownTimer = null;
    }

    // Reset stati di movimento
    this.isDropping = false;
    this.isScrollingDown = false;
    this.isDragging = false;

    // Pulisce effetti visivi
    this.clearTrail();
  }

  //* Scopo: Verifica se il gioco è terminato
  private checkGameOver(): void {
    this.isGameOver = true;
    this.stopPieceMovement(); // Usa il nuovo metodo

    this.scene.pause();
    this.gameScene.gameOver();
  }
}
