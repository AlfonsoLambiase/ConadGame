/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {CreaParoleAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = CreaParoleAssetConf; //* Generalizzazione

// DEFINIZIONE DEI SET DI GIOCO
const GAME_SETS = [
  {
    // SET 1 - Lettere: A, C, E, L, M, O, R, S
    letters: ["A", "C", "E", "L", "M", "O", "R", "S"],
    validWords: [
      "reclamo",
      "calmero",
      "mescola",
      "scolare",
      "morale",
      "calore",
      "calmo",
      "clero",
      "morsa",
      "corsa",
      "scale",
      "sacro",
      "oscar",
      "losca",
      "merlo",
      "arco",
      "acre",
      "core",
      "cero",
      "cera",
      "orma",
      "ramo",
      "rame",
      "elmo",
      "mela",
      "male",
      "sole",
      "sale",
      "sera",
      "rosa",
      "mora",
      "cola",
      "coma",
      "alce",
      "lame",
      "mare",
      "care",
      "amo",
      "ora",
      "eco",
      "acero",
      "more",
      "ore",
      "roma",
      "melo",
      "morse",
      "rose",
      "resa",
      "reso",
      "era",
      "amore",
      "calo",
      "mole",
      "caro",
      "remo",
      "malore",
      "clamore",
      "scemo",
      "scema",
      "calme",
    ],
  },
  {
    // SET 2 - Lettere: B, I, A, N, C, O, R, E
    letters: ["B", "I", "N", "O", "E", "A", "R", "C"],
    validWords: [
      "ancora",
      "ancore",
      "banco",
      "banca",
      "bianco",
      "biancore",
      "coreani",
      "erba",
      "baroni",
      "barone",
      "barca",
      "brani",
      "brano",
      "reni",
      "nera",
      "nero",
      "neri",
      "cabine",
      "canore",
      "canoe",
      "carino",
      "carine",
      "carne",
      "caro",
      "cobra",
      "rancio",
      "bacino",
      "bacio",
      "baci",
      "brace",
      "corna",
      "corni",
      "arco",
      "orca",
      "cane",
      "cani",
      "cena",
      "roba",
      "beni",
      "boia",
      "inca",
      "boa",
      "neo",
      "era",
      "ore",
      "ora",
      "nei",
      "coni",
      "acino",
      "ciano",
    ],
  },
  {
    // SET 3 - Lettere: P, A, R, O, L, E, S, I
    letters: ["P", "A", "O", "S", "L", "R", "E", "I"],
    validWords: [
      "esplora",
      "isola",
      "parlesi",
      "parolie",
      "pelosi",
      "polari",
      "lesi",
      "leso",
      "pile",
      "pila",
      "separo",
      "solari",
      "spoiler",
      "spirale",
      "lepori",
      "lepri",
      "perla",
      "priola",
      "rosalie",
      "parole",
      "perso",
      "leprosa",
      "sparo",
      "aspro",
      "lepra",
      "spola",
      "presa",
      "spera",
      "pari",
      "riso",
      "sola",
      "sole",
      "pera",
      "sera",
      "lira",
      "reso",
      "pose",
      "posa",
      "rosa",
      "arso",
      "ape",
      "ora",
      "pia",
    ],
  },
  {
    // SET 4 - Lettere: G, I, O, C, A, R, E, T
    letters: ["G", "O", "C", "A", "T", "I", "R", "E"],
    validWords: [
      "erotica",
      "giace",
      "tragico",
      "giro",
      "georgica",
      "reti",
      "torcia",
      "giocare",
      "regina",
      "girato",
      "recita",
      "gita",
      "gira",
      "carte",
      "riga",
      "orge",
      "arto",
      "rate",
      "ego",
      "oca",
      "era",
      "ira",
      "tre",
      "teoria",
      "gare",
      "tergi",
      "arti",
      "ora",
      "ore",
      "gioca",
      "eroi",
    ],
  },
  {
    // SET 5 - Lettere: F, I, O, R, E, N, T, A
    letters: ["F", "I", "O", "N", "T", "E", "A", "R"],
    validWords: [
      "fortina",
      "inferta",
      "rafonte",
      "fortine",
      "fiorate",
      "tanfo",
      "rate",
      "fronte",
      "fonte",
      "fante",
      "finta",
      "rita",
      "finto",
      "forate",
      "franti",
      "infero",
      "ferita",
      "forati",
      "tonare",
      "frena",
      "fiato",
      "fiore",
      "forte",
      "fiona",
      "frate",
      "fiera",
      "torna",
      "torni",
      "ratio",
      "treno",
      "treni",
      "nero",
      "nera",
      "neri",
      "fine",
      "tira",
      "reti",
      "nota",
      "arte",
      "arto",
      "rane",
      "fate",
      "fifa",
      "ora",
      "era",
      "tre",
      "neo",
      "freno",
      "freni",
      "frane",
      "retina",
    ],
  },
  {
    // SET 6 - Lettere: V, E, N, D, I, T, A, O
    letters: ["V", "N", "D", "T", "I", "E", "A", "O"],
    validWords: [
      "deviato",
      "doni",
      "doti",
      "nativo",
      "nati",
      "vendita",
      "invade",
      "divano",
      "devota",
      "toni",
      "donavi",
      "devoti",
      "novita",
      "dativo",
      "vanto",
      "vento",
      "vendo",
      "vinta",
      "dote",
      "dito",
      "dita",
      "dente",
      "tendo",
      "tenda",
      "venti",
      "dato",
      "diva",
      "vado",
      "vino",
      "nave",
      "vita",
      "vite",
      "nota",
      "nido",
      "onda",
      "date",
      "ante",
      "dea",
      "dio",
      "divo",
      "vena",
      "neo",
      "via",
      "dona",
      "tane",
    ],
  },
  {
    // SET 7 - Lettere: S, P, E, R, A, N, Z, O
    letters: ["S", "E", "R", "N", "A", "Z", "O", "P"],
    validWords: [
      "persona",
      "sperano",
      "pero",
      "pera",
      "perno",
      "nero",
      "nera",
      "pare",
      "spero",
      "sprone",
      "posare",
      "senza",
      "zeno",
      "sarno",
      "seno",
      "sopra",
      "sano",
      "praseno",
      "spera",
      "presa",
      "sparo",
      "prona",
      "prone",
      "aspro",
      "sera",
      "zona",
      "zone",
      "naso",
      "rane",
      "pane",
      "pena",
      "rosa",
      "pose",
      "posa",
      "sono",
      "rape",
      "spa",
      "era",
      "neo",
      "pranzo",
      "reo",
    ],
  },
  {
    // SET 8 - Lettere: M, U, S, I, C, A, L, E
    letters: ["M", "C", "E", "S", "I", "A", "L", "U"],
    validWords: [
      "calmesi",
      "missile",
      "emulsica",
      "mesali",
      "muli",
      "salumi",
      "clausme",
      "malice",
      "mica",
      "simula",
      "musica",
      "calmi",
      "clima",
      "usami",
      "salmo",
      "scale",
      "scuola",
      "muse",
      "musa",
      "scia",
      "mais",
      "sale",
      "male",
      "mela",
      "alce",
      "lume",
      "luca",
      "mali",
      "sali",
      "musi",
      "ali",
      "cui",
      "sua",
      "mai",
      "usa",
      "calme",
      "lesi",
      "emula",
    ],
  },
];

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;
  private letterBlocks: Array<{
    block: Phaser.GameObjects.Image;
    letter: Phaser.GameObjects.Text;
    originalX: number;
    originalY: number;
    letterValue: string;
    isPlaced: boolean;
  }> = [];

  private placedLetters: Array<{
    block: Phaser.GameObjects.Image;
    letter: Phaser.GameObjects.Text;
    index: number;
  }> = [];

  private grid!: Phaser.GameObjects.Image;
  private mainContainer!: Phaser.GameObjects.Container;

  // Set di gioco corrente
  private currentGameSet!: {letters: string[]; validWords: string[]};

  // ARRAY DELLE PAROLE VALIDE
  private validWords: string[] = [];

  // CONTA PAROLE TROVATE
  private wordsFound: string[] = [];

  private computeLayoutDimensions() {
    this.gameWidth = this.sys.game.config.width as number;
    this.gameHeight = this.sys.game.config.height as number;
  }

  public canShoot: boolean = true;
  public isGameOver: boolean = false;
  private isCelebrating: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }

    // SELEZIONA UN SET CASUALE ALL'INIZIO DELLA PARTITA
    const randomIndex = Phaser.Math.Between(0, GAME_SETS.length - 1);

    this.currentGameSet = GAME_SETS[randomIndex];
    this.validWords = this.currentGameSet.validWords;

    console.log(`Set di gioco selezionato: ${randomIndex + 1}`);
    console.log(`Lettere disponibili: ${this.currentGameSet.letters.join(", ")}`);
  }

  create() {
    console.log("StartGame");
    this.computeLayoutDimensions();

    this.canShoot = true;
    this.isGameOver = false;
    this.wordsFound = []; // Reset delle parole trovate

    // CREA UN CONTENITORE INVISIBILE
    this.mainContainer = this.add.container(0, 0);

    // CREA GRID AL CENTRO DEL CONTAINER (usa coordinate 0,0 relative al container!)
    this.grid = this.add.image(0, 0, "grid");
    this.grid.setOrigin(0.5);

    const gridOffsetY = -50;

    this.grid.setPosition(0, gridOffsetY); // COORDINATE RELATIVE AL CONTAINER
    this.mainContainer.add(this.grid);

    // CREA GOMMA DA CANCELLARE IN BASSO A DESTRA DELLA GRID
    const deleteBtn = this.add.image(0, 0, "delete");

    deleteBtn.setOrigin(1, 1);
    deleteBtn.setScale(0.8);
    deleteBtn.setPosition(
      this.grid.x + this.grid.displayWidth / 2 - 50,
      this.grid.y + this.grid.displayHeight / 2 - 50,
    );
    deleteBtn.setInteractive({useHandCursor: true});
    deleteBtn.on("pointerdown", () => this.resetAllLetters());
    this.mainContainer.add(deleteBtn);

    // CREA 8 BLOCCHI SOTTO GRID CON LETTERE
    const blockSpacingX = 45;
    const blockSpacingY = 35;
    const blocksPerRiga = 4;
    const paddingGridBlocks = 150;

    const blocksStartY = this.grid.y + this.grid.displayHeight / 2 + paddingGridBlocks;

    // USA LE LETTERE DEL SET CORRENTE (invece di array fisso)
    const letters = this.currentGameSet.letters;

    this.letterBlocks = [];

    for (let i = 0; i < 8; i++) {
      const block = this.add.image(0, 0, "block");

      block.setOrigin(0.5);
      block.setScale(1.1); // BLOCCHI ESTERNI PIÙ GRANDI

      const row = Math.floor(i / blocksPerRiga);
      const col = i % blocksPerRiga;

      const totalWidth = blocksPerRiga * block.width + (blocksPerRiga - 1) * blockSpacingX;

      // CENTRA I BLOCCHI ORIZZONTALMENTE
      const blockX = -totalWidth / 2 + block.width / 2 + col * (block.width + blockSpacingX);
      const blockY = blocksStartY + row * (block.height + blockSpacingY);

      block.setPosition(blockX, blockY);
      this.mainContainer.add(block);

      // AGGIUNGI LA LETTERA BIANCA SOPRA IL BLOCCO
      const letter = this.add.text(blockX, blockY, letters[i], {
        fontFamily: "Arial",
        fontSize: "85px",
        color: "#ffffff",
        fontStyle: "bold",
      });

      letter.setOrigin(0.5);
      this.mainContainer.add(letter);

      // SALVA IN ARRAY INFORMAZIONI SUL BLOCCO E LETTERA
      this.letterBlocks.push({
        block,
        letter,
        originalX: blockX,
        originalY: blockY,
        letterValue: letters[i],
        isPlaced: false,
      });

      // RENDE IL BLOCCO TRASCINABILE
      this.setupDraggable(block, letter, i);
    }

    // SCALA MANUALMENTE IN BASE ALLE DIMENSIONI DELLO SCHERMO
    let scale = 1;

    // ABBASSA le dimensioni di riferimento per aumentare lo scale sui cellulari
    const scaleByWidth = this.gameWidth / 1200;
    const scaleByHeight = this.gameHeight / 800;

    // Usa il valore minore per assicurarti che tutto rimanga visibile
    scale = Math.min(scaleByWidth, scaleByHeight);

    // AUMENTA i limiti per permettere dimensioni maggiori
    scale = Math.max(0.7, Math.min(scale, 1.5)); // min 0.7, max 1.5

    // Aggiungi un moltiplicatore fisso per aumentare tutto
    scale = scale * 1; // aumenta del 10% tutte le dimensioni

    this.mainContainer.setScale(scale);

    // CENTRA IL CONTAINER NELLO SCHERMO
    this.mainContainer.x = this.gameWidth / 2;
    this.mainContainer.y = this.gameHeight / 2;
  }

  private setupDraggable(
    block: Phaser.GameObjects.Image,
    letter: Phaser.GameObjects.Text,
    index: number,
  ) {
    block.setInteractive({useHandCursor: true});
    this.input.setDraggable(block);

    let dragStartX = 0;
    let dragStartY = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 10;

    block.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      dragStartX = pointer.x;
      dragStartY = pointer.y;
      isDragging = false;
    });

    block.on("drag", (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const distance = Phaser.Math.Distance.Between(dragStartX, dragStartY, pointer.x, pointer.y);

      if (!isDragging && distance > DRAG_THRESHOLD) {
        isDragging = true;

        // Porta in primo piano
        this.mainContainer.bringToTop(block);
        this.mainContainer.bringToTop(letter);
        block.setTint(0xaaaaaa);

        // Rimuovi dalla grid se era piazzata
        const blockData = this.letterBlocks[index];

        if (blockData.isPlaced) {
          this.placedLetters = this.placedLetters.filter((p) => p.index !== index);
          blockData.isPlaced = false;
        }
      }

      // Muovi il blocco solo se il drag è attivo
      if (isDragging) {
        block.setPosition(dragX, dragY);
        letter.setPosition(dragX, dragY);
      }
    });

    block.on("dragend", () => {
      const blockData = this.letterBlocks[index];

      // Se non abbiamo superato la soglia = è stato un CLICK, non un drag
      if (!isDragging) {
        // GESTIONE CLICK:
        if (!blockData.isPlaced) {
          // Se non è piazzato, sposta il blocco alla grid
          this.placeLetterOnGrid(blockData, index);
        } else {
          // Se è già piazzato, torna alla posizione originale
          this.returnToOriginalPosition(blockData);
          // Rimuovi dalla lista delle lettere piazzate
          this.placedLetters = this.placedLetters.filter((p) => p.index !== index);
          // Riposiziona le lettere rimanenti nella grid
          this.repositionGridLetters();
        }

        return;
      }

      // GESTIONE DRAG: è stato un vero trascinamento
      block.clearTint();

      // Verifica se il blocco è stato rilasciato sulla grid
      if (this.isOverGrid(block)) {
        this.placeLetterOnGrid(blockData, index);
      } else {
        // Torna alla posizione originale
        this.returnToOriginalPosition(blockData);
      }
    });
  }

  private isOverGrid(block: Phaser.GameObjects.Image): boolean {
    const blockBounds = block.getBounds();
    const gridBounds = this.grid.getBounds();

    return Phaser.Geom.Intersects.RectangleToRectangle(blockBounds, gridBounds);
  }

  private placeLetterOnGrid(
    blockData: {
      block: Phaser.GameObjects.Image;
      letter: Phaser.GameObjects.Text;
      originalX: number;
      originalY: number;
      letterValue: string;
      isPlaced: boolean;
    },
    index: number,
  ) {
    // Blocca durante la celebrazione
    if (this.isCelebrating) {
      this.returnToOriginalPosition(blockData);
      return;
    }

    // Rimuovi dalla posizione precedente se era già piazzata
    if (blockData.isPlaced) {
      this.placedLetters = this.placedLetters.filter((p) => p.index !== index);
    }

    // Aggiungi alla lista delle lettere piazzate
    this.placedLetters.push({
      block: blockData.block,
      letter: blockData.letter,
      index,
    });

    blockData.isPlaced = true;

    // Suono quando si piazza una lettera
    this.gameScene.audioManager.playAudio(assetConf.audio.error);

    // Riposiziona tutte le lettere nella grid
    this.repositionGridLetters();

    // Controlla se si è formata una parola valida
    this.checkForValidWord();
  }

  private repositionGridLetters() {
    const count = this.placedLetters.length;

    // Scala dinamica: più lettere più piccole
    const baseScale = 1.2;
    const minScale = 0.6;
    const scaleFactor = Math.max(minScale, baseScale - (count - 1) * 0.08);

    // Spaziatura dinamica in base alla scala
    const baseSpacing = 180;
    const letterSpacing = baseSpacing * scaleFactor;

    const totalWidth = (count - 1) * letterSpacing;
    const startX = -totalWidth / 2;

    this.placedLetters.forEach((placed, i) => {
      const targetX = startX + i * letterSpacing;
      const targetY = this.grid.y;

      this.tweens.add({
        targets: placed.block,
        x: targetX,
        y: targetY,
        scale: scaleFactor,
        duration: 200,
        ease: "Power2",
      });

      // Scala anche il font della lettera
      const fontSize = Math.round(85 * scaleFactor);

      this.tweens.add({
        targets: placed.letter,
        x: targetX,
        y: targetY,
        duration: 200,
        ease: "Power2",
        onUpdate: () => {
          placed.letter.setFontSize(fontSize);
        },
      });
    });
  }

  private returnToOriginalPosition(blockData: {
    block: Phaser.GameObjects.Image;
    letter: Phaser.GameObjects.Text;
    originalX: number;
    originalY: number;
    letterValue: string;
    isPlaced: boolean;
  }) {
    // Ferma eventuali tween in corso
    this.tweens.killTweensOf(blockData.block);
    this.tweens.killTweensOf(blockData.letter);

    // Ripristina immediatamente scala e font originali
    blockData.block.setScale(1.1);
    blockData.letter.setScale(1); // Reset scale del Text
    blockData.letter.setFontSize(85);

    this.tweens.add({
      targets: [blockData.block, blockData.letter],
      x: blockData.originalX,
      y: blockData.originalY,
      duration: 200,
      ease: "Power2",
    });

    blockData.isPlaced = false;
  }

  private resetAllLetters() {
    console.log("Reset tutte le lettere");

    // Suono quando si usa il deleteBtn
    //this.gameScene.audioManager.playAudio(assetConf.audio.error);

    // Resetta tutte le lettere alle posizioni originali
    this.letterBlocks.forEach((blockData) => {
      if (blockData.isPlaced) {
        this.returnToOriginalPosition(blockData);
      }
    });

    // Svuota l'array delle lettere piazzate
    this.placedLetters = [];
  }

  // Nuovo metodo per controllare se si è formata una parola valida
  private checkForValidWord() {
    // Costruisci la parola dalle lettere piazzate
    const currentWord = this.placedLetters
      .map((placed) => this.letterBlocks[placed.index].letterValue)
      .join("")
      .toLowerCase();

    // Controlla se la parola è nell'array delle parole valide
    if (this.validWords.includes(currentWord) && !this.wordsFound.includes(currentWord)) {
      // Parola trovata!
      this.wordsFound.push(currentWord);
      const wordNumber = this.wordsFound.length;

      console.log(`PAROLA ${wordNumber} TROVATA: ${currentWord.toUpperCase()}`);
      this.gameScene.uiManager.updateScore(1); // Aggiorna il punteggio di 1 punti

      // Qui puoi aggiungere effetti visivi o audio per celebrare la parola trovata
      this.celebrateWord(currentWord);

      // Controlla se sono state trovate 3 parole
      if (this.wordsFound.length >= 3) {
        console.log("3 PAROLE TROVATE! ATTIVAZIONE GAME OVER");
        this.isGameOver = true;
        this.checkGameOver();
      }
    }
  }

  // Metodo opzionale per celebrare la parola trovata
  private celebrateWord(word: string) {
    // Blocca l'aggiunta di nuove lettere durante la celebrazione
    this.isCelebrating = true;

    // Suono di successo quando si trova una parola
    this.gameScene.audioManager.playAudio(assetConf.audio.success);

    // IMPORTANTE: Salva una copia snapshot dell'array PRIMA di animare
    const lettersToAnimate = [...this.placedLetters];
    const totalLetters = lettersToAnimate.length;

    // IMPORTANTE: Ferma tutti i tween in corso sui blocchi (es. repositionGridLetters)
    // e posiziona subito le lettere nella posizione corretta della grid
    const baseScale = 1.2;
    const minScale = 0.6;
    const scaleFactor = Math.max(minScale, baseScale - (totalLetters - 1) * 0.065);
    const baseSpacing = 180;
    const letterSpacing = baseSpacing * scaleFactor;
    const totalWidth = (totalLetters - 1) * letterSpacing;
    const startX = -totalWidth / 2;

    lettersToAnimate.forEach((placed, i) => {
      this.tweens.killTweensOf(placed.block);
      this.tweens.killTweensOf(placed.letter);

      // Forza lo scale corretto per TUTTI i blocchi (l'ultimo potrebbe non aver finito il tween)
      placed.block.setScale(scaleFactor);
      const fontSize = Math.round(85 * scaleFactor);
      placed.letter.setFontSize(fontSize);

      // Posiziona immediatamente nella posizione corretta della grid
      const targetX = startX + i * letterSpacing;
      const targetY = this.grid.y;
      placed.block.setPosition(targetX, targetY);
      placed.letter.setPosition(targetX, targetY);
    });

    // Salva le posizioni e scale (ora tutti hanno lo stesso scaleFactor)
    const originalData = lettersToAnimate.map((placed) => ({
      block: placed.block,
      letter: placed.letter,
      originalX: placed.block.x,
      originalY: placed.block.y,
      originalScale: scaleFactor, // Usa scaleFactor, non block.scaleX
      originalDepth: placed.block.depth,
    }));

    const staggerDelay = 100; // Delay tra ogni lettera
    const zoomDuration = 300; // Durata zoom
    const returnDuration = 200; // Durata ritorno

    // Calcola tempo totale: ultimo delay + zoom + ritorno
    const totalAnimationTime = (totalLetters - 1) * staggerDelay + zoomDuration + returnDuration;

    // Anima le lettere in sequenza con effetto elegante
    lettersToAnimate.forEach((placed, i) => {
      const delay = i * staggerDelay;
      const block = placed.block;
      const letter = placed.letter;

      // Porta in primo piano durante l'animazione
      this.mainContainer.bringToTop(block);
      this.mainContainer.bringToTop(letter);
      block.setDepth(1000 + i);
      letter.setDepth(1001 + i);

      // Posizione nella grid
      const posX = originalData[i].originalX;
      const posY = originalData[i].originalY;
      const blockScale = originalData[i].originalScale;

      // Animazione blocco: zoom up poi ritorno
      this.tweens.add({
        targets: block,
        scale: blockScale * 1.5,
        y: posY - 50,
        duration: zoomDuration,
        ease: "Back.easeOut",
        delay: delay,
        onStart: () => {
          block.setTint(0xffff00);
        },
        onComplete: () => {
          this.tweens.add({
            targets: block,
            scale: blockScale,
            y: posY,
            duration: returnDuration,
            ease: "Power2.easeIn",
            onComplete: () => {
              block.clearTint();
              block.setDepth(originalData[i].originalDepth);
            },
          });
        },
      });

      // Animazione lettera: segue il blocco (solo movimento Y)
      this.tweens.add({
        targets: letter,
        y: posY - 50,
        duration: zoomDuration,
        ease: "Back.easeOut",
        delay: delay,
        onComplete: () => {
          this.tweens.add({
            targets: letter,
            y: posY,
            duration: returnDuration,
            ease: "Power2.easeIn",
            onComplete: () => {
              letter.setDepth(originalData[i].originalDepth);
            },
          });
        },
      });
    });

    // Aspetta che TUTTE le animazioni finiscano + 1 secondo, poi resetta
    this.time.delayedCall(totalAnimationTime + 1000, () => {
      // Reset DIRETTO dei blocchi salvati (non usare resetAllLetters che potrebbe avere stato diverso)
      lettersToAnimate.forEach((placed) => {
        const blockData = this.letterBlocks[placed.index];

        // Ferma tutti i tween
        this.tweens.killTweensOf(blockData.block);
        this.tweens.killTweensOf(blockData.letter);

        // Forza dimensioni originali
        blockData.block.setScale(1.1);
        blockData.letter.setScale(1);
        blockData.letter.setFontSize(85);

        // Anima ritorno alla posizione originale
        this.tweens.add({
          targets: [blockData.block, blockData.letter],
          x: blockData.originalX,
          y: blockData.originalY,
          duration: 200,
          ease: "Power2",
        });

        blockData.isPlaced = false;
      });

      this.placedLetters = [];

      // Riabilita l'aggiunta di lettere dopo la celebrazione
      this.isCelebrating = false;
    });
  }

  startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    const spriteLeft = this.add
      .sprite(0, config.height / 2, assetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    const spriteRight = this.add
      .sprite(config.width, config.height / 2, assetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

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

  checkGameOver() {
    if (this.isGameOver) {
      console.log(`GAME OVER:`);
      this.canShoot = false;
      this.gameScene.gameOver();
    }
  }
}

//! BACKGROUND AL TIMEMANAGER E CLESSIDRA RIDOTTA, PIU' SCENARI DI PAROLE E LETTERE, ICONSCORE A SINISTRA IN ALTO
