
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {TrovaParoleAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = TrovaParoleAssetConf;

// Sostituisci la vecchia definizione di direction con questa (in alto nel file)
type Direction =
  | "horizontal-right"
  | "horizontal-left"
  | "vertical-down"
  | "vertical-up"
  | "diagonal-down-right"
  | "diagonal-down-left"
  | "diagonal-up-right"
  | "diagonal-up-left";

interface WordConfig {
  word: string;
  startRow: number;
  startCol: number;
  direction: Direction; // ← ora supporta 8 direzioni
  color: number;
}

// Configurazione dei colori per evidenziare le parole trovate
const WORD_COLORS = [
  0xa2f573, // Verde chiaro
  0xb4f7af, // Verde menta
  0xedbcf4, // Rosa lilla
  0xb07bf0, // Viola
  0x97f8c5, // Verde acqua
  0xc9e3e2, // Azzurro molto chiaro
];

// Costante per l'opacità degli highlight
const HIGHLIGHT_ALPHA = 0.8; // 1 = pieno, 0.5 = semi-trasparente

interface WordSearchCell {
  row: number;
  col: number;
  // top-left corner of the cell (px)
  x: number;
  y: number;
  letter: string;
  text: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Rectangle;
  highlight?: Phaser.GameObjects.Container | Phaser.GameObjects.Graphics;
}

// Interfaccia per oggetti con proprietà x e y posizionabili
interface PositionableGameObject extends Phaser.GameObjects.GameObject {
  x?: number;
  y?: number;
}

// PhaserUtils.ts
export function centerContainer(
  container: Phaser.GameObjects.Container,
  targetX: number,
  targetY: number,
): void {
  const bounds = container.getBounds();
  const offsetX = targetX - bounds.centerX;
  const offsetY = targetY - bounds.centerY;

  container.getAll().forEach((child) => {
    const obj = child as PositionableGameObject;

    if (typeof obj.x === "number") obj.x += offsetX;
    if (typeof obj.y === "number") obj.y += offsetY;
  });
}

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  // Configurazione layout
  private readonly PADDING_LEFT = 50;
  private readonly PADDING_RIGHT = 50;
  private readonly GRID_SIZE = 9;

  private marginTop = 200;
  private cellSize!: number;
  private gridStartX!: number;
  private gridStartY!: number;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  // Elementi del gioco
  private grid: WordSearchCell[][] = [];
  private wordsToFind: WordConfig[] = [];
  private foundWords: Set<string> = new Set();

  // Selezione parole
  private isSelecting: boolean = false;
  private selectedCells: WordSearchCell[] = [];
  private selectionGraphics!: Phaser.GameObjects.Graphics;

  // Hint system
  //private hintButton!: Phaser.GameObjects.Text;
  private hintsRemaining: number = 6;

  // Lista parole disponibili per il generatore
  private readonly WORD_BANK = [
    "CASA",
    "SOLE",
    "MARE",
    "LUNA",
    "CIELO",
    "TERRA",
    "FIORE",
    "VENTO",
    "ACQUA",
    "FUOCO",
    "VERDE",
    "ROSSO",
    "ALBERO",
    "NUVOLA",
    "STELLA",
    "LIBRO",
    "MUSICA",
    "CUORE",
    "AMICO",
    "GIOCO",
    "PIANO",
    "PONTE",
    "MONDO",
    "TEMPO",
  ];

  // indica la cella da cui è partita la selezione (prima cella)
  private selectionStartCell: WordSearchCell | null = null;

  // Definisci variabile
  private SELECTION_LINE_COLOR!: number;

  private SELECTION_LINE_ALPHA = 0.8;

  private FOUND_TEXT_COLOR = "#da5d29"; //* lettere trovate e marcate come check

  private labelsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  // Scopo: Inizializza la scena con i dati passati
  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  // Scopo: Crea e inizializza tutti gli elementi del gioco
  create() {
    this.computeLayoutDimensions();

    // Inizializza grafica per selezione
    this.selectionGraphics = this.add.graphics();

    // Genera il puzzle
    this.generatePuzzle();

    // Crea lo sfondo
    this.createBackground();

    // Crea la griglia
    this.createGrid();

    // Crea le etichette delle parole da trovare
    this.createWordLabels();

    // Setup input
    this.setupInput();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });

    this.SELECTION_LINE_COLOR = Phaser.Display.Color.HexStringToColor("#da5d29").color; //* liena lettere selezionate nella griglia da trovare
  }

  // Scopo: Calcola le dimensioni e posizioni del layout della griglia
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene?.setDynamicValueBasedOnScale(150, 400) || 150;

    // Calcola dimensione cella basata sulla larghezza disponibile
    const availableWidth = this.gameWidth - this.PADDING_LEFT - this.PADDING_RIGHT;

    this.cellSize = availableWidth / this.GRID_SIZE;

    // Calcola posizione iniziale della griglia
    this.gridStartX = this.PADDING_LEFT;
    this.gridStartY = this.marginTop;

    console.log("Layout - Width:", this.gameWidth, "Cell Size:", this.cellSize);
  }

  // Scopo: Genera il puzzle con parole casuali e griglia
  private generatePuzzle(): void {
    // Seleziona 6 parole casuali dalla word bank
    const selectedWords = this.selectRandomWords(6);

    // Crea griglia vuota
    const grid: string[][] = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(""));

    this.wordsToFind = [];
    const maxAttempts = 100;

    // Prova a posizionare ogni parola
    selectedWords.forEach((word, index) => {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < maxAttempts) {
        const direction = this.getRandomDirection();
        const position = this.getRandomPosition(word.length, direction);

        if (this.canPlaceWord(grid, word, position.row, position.col, direction)) {
          this.placeWord(grid, word, position.row, position.col, direction);

          const color = WORD_COLORS[index % WORD_COLORS.length];

          this.wordsToFind.push({
            word,
            startRow: position.row,
            startCol: position.col,
            direction,
            color,
          });

          placed = true;
        }

        attempts++;
      }

      if (!placed) {
        console.warn(`Impossibile posizionare la parola: ${word}`);
      }
    });

    // Riempi celle vuote con lettere casuali
    const alphabet = "ABCDEFGHILMNOPQRSTUVZ";

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (grid[row][col] === "") {
          grid[row][col] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    // Salva la griglia generata come lettere (poi in createGrid creeremo i WordSearchCell)
    this.grid = grid.map((row, rowIndex) =>
      row.map((letter, colIndex) => {
        // placeholder: verrà popolato correttamente in createGrid con text/bg/x/y
        return {
          row: rowIndex,
          col: colIndex,
          x: 0,
          y: 0,
          letter,
          text: null as unknown,
          bg: null as unknown,
        } as unknown as WordSearchCell;
      }),
    );
  }

  // Scopo: Seleziona parole casuali dalla word bank
  private selectRandomWords(count: number): string[] {
    const shuffled = [...this.WORD_BANK].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, count);
  }

  // Scopo: Restituisce una direzione casuale tra le 8 disponibili
  private getRandomDirection(): Direction {
    const directions: Direction[] = [
      "horizontal-right",
      "horizontal-left",
      "vertical-down",
      "vertical-up",
      "diagonal-down-right",
      "diagonal-down-left",
      "diagonal-up-right",
      "diagonal-up-left",
    ];

    return directions[Math.floor(Math.random() * directions.length)];
  }

  // Scopo: Calcola le coordinate della cella ad uno step dalla posizione iniziale
  private getCellAtStep(
    startRow: number,
    startCol: number,
    direction: Direction,
    step: number,
  ): {row: number; col: number} {
    switch (direction) {
      case "horizontal-right":
        return {row: startRow, col: startCol + step};
      case "horizontal-left":
        return {row: startRow, col: startCol - step};
      case "vertical-down":
        return {row: startRow + step, col: startCol};
      case "vertical-up":
        return {row: startRow - step, col: startCol};
      case "diagonal-down-right":
        return {row: startRow + step, col: startCol + step};
      case "diagonal-down-left":
        return {row: startRow + step, col: startCol - step};
      case "diagonal-up-right":
        return {row: startRow - step, col: startCol + step};
      case "diagonal-up-left":
        return {row: startRow - step, col: startCol - step};
      default:
        return {row: startRow, col: startCol};
    }
  }

  // Scopo: Genera una posizione casuale valida per una parola
  private getRandomPosition(wordLength: number, direction: Direction): {row: number; col: number} {
    // Per ogni direzione, calcoliamo il range valido di partenza
    // in modo che la parola stia completamente dentro la griglia 9x9

    let maxRow = this.GRID_SIZE - 1; // default: può partire da 0 a 8
    let maxCol = this.GRID_SIZE - 1;

    switch (direction) {
      // ORIZZONTALI (entrambe le direzioni condividono lo stesso spazio)
      case "horizontal-right":
      case "horizontal-left":
        maxCol = this.GRID_SIZE - wordLength; // es. parola di 5 lettere → col da 0 a 4
        break;

      // VERTICALI
      case "vertical-down":
        maxRow = this.GRID_SIZE - wordLength;
        break;
      case "vertical-up":
        maxRow = wordLength - 1; // deve partire abbastanza in basso per salire
        break;

      // DIAGONALI ↓→ e ↓← (scendono)
      case "diagonal-down-right":
      case "diagonal-down-left":
        maxRow = this.GRID_SIZE - wordLength;
        maxCol = this.GRID_SIZE - wordLength;
        break;

      // DIAGONALI ↑→ e ↑← (salgono)
      case "diagonal-up-right":
      case "diagonal-up-left":
        maxRow = wordLength - 1; // deve partire dal basso
        maxCol = this.GRID_SIZE - wordLength; // deve avere spazio a destra/sinistra
        break;
    }

    return {
      row: Math.floor(Math.random() * (maxRow + 1)),
      col: Math.floor(Math.random() * (maxCol + 1)),
    };
  }

  // Scopo: Verifica se una parola può essere posizionata nella griglia
  private canPlaceWord(
    grid: string[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction,
  ): boolean {
    for (let i = 0; i < word.length; i++) {
      const {row, col} = this.getCellAtStep(startRow, startCol, direction, i);

      if (row < 0 || row >= this.GRID_SIZE || col < 0 || col >= this.GRID_SIZE) return false;
      if (grid[row][col] !== "" && grid[row][col] !== word[i]) return false;
    }

    return true;
  }

  // Scopo: Posiziona una parola nella griglia
  private placeWord(
    grid: string[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction,
  ): void {
    for (let i = 0; i < word.length; i++) {
      const {row, col} = this.getCellAtStep(startRow, startCol, direction, i);

      grid[row][col] = word[i];
    }
  }

  // Scopo: Crea lo sfondo della griglia
  private createBackground(): void {
    // Calcola dimensioni e posizione dello sfondo
    const bgWidth = this.cellSize * this.GRID_SIZE;
    const bgHeight = bgWidth; // Mantiene proporzioni quadrate


    // Crea un rettangolo come placeholder per lo sfondo
    // In un gioco reale, sostituire con: this.add.image(bgX, bgY, 'background_key')
    const bg = this.add.graphics();

    // Sfondo griglia bianco, arrotondato
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(this.gridStartX, this.gridStartY, bgWidth, bgHeight, 20);

    // Bordo esterno celeste, arrotondato
    bg.lineStyle(this.gameScene.setDynamicValueBasedOnScale(4, 8), 0x4a90e2, 1);
    bg.strokeRoundedRect(this.gridStartX, this.gridStartY, bgWidth, bgHeight, 20);

    bg.setDepth(-1);
  }

  // Scopo: Crea la griglia di celle con lettere
  private createGrid(): void {
    const fontSize = Math.floor(this.cellSize * 0.5);

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const topLeftX = this.gridStartX + col * this.cellSize;
        const topLeftY = this.gridStartY + row * this.cellSize;
        const centerX = topLeftX + this.cellSize / 2;
        const centerY = topLeftY + this.cellSize / 2;

        // Crea bg rect (trasparente, usata per layering e per eventuali click)
        const bgRect = this.add.rectangle(
          centerX,
          centerY,
          this.cellSize - 8,
          this.cellSize - 8,
          0xffffff,
          0,
        );

        bgRect.setOrigin(0.5);
        bgRect.setInteractive(
          new Phaser.Geom.Rectangle(topLeftX, topLeftY, this.cellSize, this.cellSize),
          Phaser.Geom.Rectangle.Contains,
        );

        // Crea bordo cella (linea)
        const cellBorder = this.add.graphics();

        cellBorder.lineStyle(1, 0xcccccc, 0.5);
        cellBorder.strokeRect(topLeftX, topLeftY, this.cellSize, this.cellSize);

        // Crea testo lettera
        const text = this.add.text(centerX, centerY, this.grid[row][col].letter, {
          fontSize: `${fontSize}px`,
          color: "#333333",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        text.setOrigin(0.5);
        text.setInteractive();

        // Popola la cella WordSearchCell correttamente
        const cell: WordSearchCell = {
          row,
          col,
          x: topLeftX,
          y: topLeftY,
          letter: this.grid[row][col].letter,
          text,
          bg: bgRect,
        };

        // sostituisce il placeholder
        this.grid[row][col] = cell;
      }
    }
  }

  // Scopo: Crea le etichette delle parole da trovare
  private createWordLabels(): void {
    const labelStartY = this.gridStartY + this.GRID_SIZE * this.cellSize + 40;

    const columns = 3;
    const rowsPerColumn = 2;
    const horizontalSpacing = 15;
    const verticalSpacing = 10;
    const fontSize = 32;

    const maxLetters = 8;
    const bgWidth = maxLetters * fontSize * 0.6 + 40;
    const bgHeight = fontSize + 20;

    // Calcola dimensioni totali del gruppo
    const containerWidth = columns * bgWidth + (columns - 1) * horizontalSpacing;
    const containerHeight = rowsPerColumn * bgHeight + (rowsPerColumn - 1) * verticalSpacing;

    // Crea container vuoto a 0,0
    this.labelsContainer = this.add.container(0, 0);

    // Aggiungi elementi all’interno del container, offsettandoli in modo che il centro del container sia (0,0)
    const offsetX = containerWidth / 2;
    const offsetY = containerHeight / 2;

    this.wordsToFind.forEach((wordConfig, index) => {
      const col = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;

      const x = col * (bgWidth + horizontalSpacing) - offsetX + bgWidth / 2;
      const y = row * (bgHeight + verticalSpacing) - offsetY + bgHeight / 2;

      const bg = this.add.graphics();

      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 7);
      bg.lineStyle(2, 0xcccccc, 0.5);
      bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 7);

      const label = this.add.text(0, 0, wordConfig.word, {
        fontSize: `${fontSize}px`,
        color: "#5b5959ff",
        fontFamily: "Arial",
        fontStyle: "bold",
      });

      label.setOrigin(0.5);

      const miniContainer = this.add.container(x, y, [bg, label]);

      miniContainer.setData("word", wordConfig.word);
      miniContainer.setData("label", label);
      miniContainer.setData("bg", bg);

      this.labelsContainer.add(miniContainer);
    });

    // Applica scala
    const scale = this.gameScene.setDynamicValueBasedOnScale(0.6, 1.6);

    this.labelsContainer.setScale(scale);

    // Posiziona il container centrato sotto la griglia
    this.labelsContainer.x = this.gridStartX + (this.cellSize * this.GRID_SIZE) / 2;
    this.labelsContainer.y = labelStartY + this.gameScene.setDynamicValueBasedOnScale(30, 100);

    //* Serve solo per Debug: cerchio rosso al centro del container
    //* Indica il centro del container con un cerchio rosso
    // const debugCenter = this.add.graphics();

    // debugCenter.fillStyle(0xff0000, 1);
    // debugCenter.fillCircle(0, 0, 5);
    // this.labelsContainer.add(debugCenter);
  }

  // Scopo: Utilizza un aiuto per evidenziare una parola
  public useHint(): void {
    if (this.hintsRemaining <= 0) {
      return;
    }

    const unfoundWords = this.wordsToFind.filter((w) => !this.foundWords.has(w.word));

    if (unfoundWords.length === 0) {
      return;
    }

    // Sceglie una parola casuale tra quelle non trovate

    this.completeFirstAvailableWord();
    this.hintsRemaining--;
  }

  // Metodo per completare automaticamente la prima parola disponibile
  private completeFirstAvailableWord(): void {
    this.gameScene.uiManager.updateScore(1);

    const unfoundWords = this.wordsToFind.filter((w) => !this.foundWords.has(w.word));

    if (unfoundWords.length === 0) {
      return;
    }

    const wordToComplete = unfoundWords[0];

    // Raccogli celle della parola
    const cells: WordSearchCell[] = [];

    for (let i = 0; i < wordToComplete.word.length; i++) {
      const pos = this.getCellAtStep(
        wordToComplete.startRow,
        wordToComplete.startCol,
        wordToComplete.direction,
        i,
      );

      cells.push(this.grid[pos.row][pos.col]);
    }

    // Evidenzia sulla griglia
    this.highlightFoundWordCells(cells, wordToComplete.color);
    this.foundWords.add(wordToComplete.word);

    // Dimensioni sfondo per label
    const fontSize = 32;
    const maxLetters = 8;
    const bgWidth = maxLetters * fontSize * 0.6 + 40;
    const bgHeight = fontSize + 20;

    // Aggiorna il container della parola
    this.labelsContainer.iterate((child: Phaser.GameObjects.Container) => {
      if (child.getData("word") === wordToComplete.word) {
        const label = child.getData("label");
        const bg = child.getData("bg");

        label.setColor(this.FOUND_TEXT_COLOR);
        label.setText("✓ " + wordToComplete.word);

        bg.clear();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 5);
        bg.lineStyle(2, 0xcccccc, 0.5);
        bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 5);
      }
    });

    // Controlla vittoria
    if (this.foundWords.size === this.wordsToFind.length) {
      this.onAllWordsFound();
    }
  }

  // Scopo: Configura gli eventi di input per la selezione
  private setupInput(): void {
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
  }

  // Scopo: Gestisce l'inizio della selezione delle celle
  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const cell = this.getCellAtPosition(pointer.x, pointer.y);

    if (!cell) return;

    this.isSelecting = true;
    this.selectionStartCell = cell;
    this.selectedCells = [cell];

    this.selectionGraphics.clear();
    this.drawSelection();
  }

  // Scopo: Gestisce il movimento durante la selezione
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isSelecting || !this.selectionStartCell) return;

    const cell = this.getCellAtPosition(pointer.x, pointer.y);

    if (!cell) return;

    // Evita rifare la selezione se stiamo ancora nella stessa cella
    const lastCell = this.selectedCells[this.selectedCells.length - 1];

    if (cell === lastCell) return;

    // Calcola delta dalla cella iniziale
    const deltaRow = cell.row - this.selectionStartCell.row;
    const deltaCol = cell.col - this.selectionStartCell.col;

    // Normalizza direzione (-1, 0, +1)
    const normRow = deltaRow === 0 ? 0 : deltaRow / Math.abs(deltaRow);
    const normCol = deltaCol === 0 ? 0 : deltaCol / Math.abs(deltaCol);

    // Controlla direzioni valide (orizzontale, verticale, diagonale)
    if (normRow === 0 && normCol === 0) return;

    // Riempi tutte le celle dalla start fino a quella corrente
    this.selectedCells = [];
    let r = this.selectionStartCell.row;
    let c = this.selectionStartCell.col;

    while (
      r >= 0 &&
      r < this.GRID_SIZE &&
      c >= 0 &&
      c < this.GRID_SIZE &&
      (normRow !== 0
        ? normRow > 0
          ? r <= cell.row
          : r >= cell.row
        : r === this.selectionStartCell.row) &&
      (normCol !== 0
        ? normCol > 0
          ? c <= cell.col
          : c >= cell.col
        : c === this.selectionStartCell.col)
    ) {
      this.selectedCells.push(this.grid[r][c]);
      r += normRow;
      c += normCol;
    }

    this.drawSelection();
  }

  // Scopo: Gestisce il rilascio del pointer e verifica la parola
  private onPointerUp(): void {
    if (this.isSelecting && this.selectedCells.length > 0) {
      this.checkSelectedWord();
    }

    // Reset variabili
    this.isSelecting = false;
    this.selectedCells = [];
    this.selectionStartCell = null;
    this.selectionGraphics.clear();
  }

  // Scopo: Restituisce la cella alle coordinate specificate
  private getCellAtPosition(x: number, y: number): WordSearchCell | null {
    const col = Math.floor((x - this.gridStartX) / this.cellSize);
    const row = Math.floor((y - this.gridStartY) / this.cellSize);

    if (row >= 0 && row < this.GRID_SIZE && col >= 0 && col < this.GRID_SIZE) {
      return this.grid[row][col];
    }

    return null;
  }

  // Scopo: Disegna la selezione corrente sulla griglia
  private drawSelection(): void {
    this.selectionGraphics.clear();

    if (this.selectedCells.length < 2) return;

    // SOLO LA LINEA, NESSUN RIEMPIMENTO CASELLE
    this.selectionGraphics.lineStyle(
      8, // più spessa per migliore visibilità
      this.SELECTION_LINE_COLOR,
      this.SELECTION_LINE_ALPHA,
    );

    this.selectionGraphics.beginPath();

    this.selectedCells.forEach((cell, i) => {
      const centerX = this.gridStartX + cell.col * this.cellSize + this.cellSize / 2;
      const centerY = this.gridStartY + cell.row * this.cellSize + this.cellSize / 2;

      if (i === 0) {
        this.selectionGraphics.moveTo(centerX, centerY);
      } else {
        this.selectionGraphics.lineTo(centerX, centerY);
      }
    });

    this.selectionGraphics.strokePath();
  }

  // Scopo: Verifica se la parola selezionata è corretta
  private checkSelectedWord(): void {
    if (this.selectedCells.length < 2) return;

    const selectedWord = this.selectedCells.map((c) => c.letter).join("");
    const reversedWord = selectedWord.split("").reverse().join("");

    // Cerca tra le parole da trovare (sia normale che invertita)
    const foundConfig = this.wordsToFind.find(
      (w) => (w.word === selectedWord || w.word === reversedWord) && !this.foundWords.has(w.word),
    );

    if (!foundConfig) {
      // Parola non trovata
      console.log("Audio Parola sbagliata");
      this.selectionGraphics.clear();

      return;
    }

    // Raccogli tutte le celle della parola
    const cells: WordSearchCell[] = [];

    for (let i = 0; i < foundConfig.word.length; i++) {
      const pos = this.getCellAtStep(
        foundConfig.startRow,
        foundConfig.startCol,
        foundConfig.direction,
        i,
      );

      cells.push(this.grid[pos.row][pos.col]);
    }

    // Evidenzia la parola trovata sulla griglia
    this.highlightFoundWordCells(cells, foundConfig.color);
    this.foundWords.add(foundConfig.word);
    console.log("Audio Parola indovinata");

    // --- Aggiornamento etichetta nel container ---

    // Definiamo dimensioni sfondo stabili (8 lettere max)
    const fontSize = 32; // stessa dimensione che usi per le label
    const maxLetters = 8;
    const bgWidth = maxLetters * fontSize * 0.6 + 40; // 40px padding
    const bgHeight = fontSize + 20; // 20px padding verticale

    this.labelsContainer.iterate((child: Phaser.GameObjects.Container) => {
      if (child.getData("word") === foundConfig.word) {
        const label = child.getData("label");
        const bg = child.getData("bg");

        // Aggiorna colore testo
        label.setColor(this.FOUND_TEXT_COLOR);
        label.setText("✓ " + foundConfig.word);

        // Aggiorna sfondo
        bg.clear();
        bg.fillStyle(0xffffff, 1);
        bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 5);
        bg.lineStyle(2, 0xcccccc, 0.5);
        bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 5);
      }
    });

    // Controlla vittoria
    if (this.foundWords.size === this.wordsToFind.length) {
      this.onAllWordsFound();
    }

    // Resetta selezione grafica
    this.selectionGraphics.clear();

    // Aggiorna punteggio
    this.gameScene.uiManager.updateScore(1);
  }

  // Scopo: Evidenzia una parola trovata con un evidenziatore continuo (capsule)
  private highlightFoundWordCells(cells: WordSearchCell[], color: number): void {
    if (!cells.length) return;

    const first = cells[0];
    const last = cells[cells.length - 1];

    const x1 = first.x + this.cellSize / 2;
    const y1 = first.y + this.cellSize / 2;

    const x2 = last.x + this.cellSize / 2;
    const y2 = last.y + this.cellSize / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;

    // Allunga di mezza cella all'inizio e alla fine
    const length = Math.sqrt(dx * dx + dy * dy) + this.cellSize;

    const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

    const thickness = this.cellSize * 0.8;
    const radius = thickness / 2;

    const container = this.add.container(x1, y1);
    const graphics = this.add.graphics();

    graphics.fillStyle(color, HIGHLIGHT_ALPHA);
    // parte da -mezza cella per coprire la prima lettera
    graphics.fillRoundedRect(-this.cellSize / 2, -radius, length, thickness, radius);

    container.add(graphics);
    container.setAngle(angle);

    // Imposta il depth sul container, non sul graphics
    container.setDepth(first.text.depth - 1);

    cells.forEach((c) => {
      c.highlight = container;
      c.text.setColor("#292929ff"); // lettere indovinate
    });
  }

  // Scopo: Gestisce il completamento di tutte le parole
  private onAllWordsFound(): void {
    this.checkGameOver();

    console.log("Congratulazioni! Tutte le parole sono state trovate!");
  }

  startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    // Create spriteLeft
    const spriteLeft = this.add
      .sprite(0, config.height / 2, assetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(1000)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationLeft
    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    // Create spriteRight
    const spriteRight = this.add
      .sprite(config.width, config.height / 2, assetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(1000)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationRight
    this.anims.create({
      key: "animConfettiRight",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_right.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteRight.play("animConfettiRight");
  }

  // Scopo: Controlla se il gioco è finito
  checkGameOver(): void {
    if (this.isGameOver) {
      this.canShoot = false;
      this.scene.pause();
      this.gameScene?.gameOver();
    }
  }
}
