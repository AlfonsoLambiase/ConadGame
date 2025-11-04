
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {RaccogliNoteAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = RaccogliNoteAssetConf;

// Tipo di nota
enum NoteType {
  DO_ALTA = "DO_ALTA",
  DO_BASSA = "DO_BASSA",
  RE_ALTA = "RE_ALTA",
  RE = "RE",
  MI = "MI",
  FA = "FA",
  SOL = "SOL",
  LA_BASSA = "LA_BASSA",
  LA = "LA",
  SI_ALTA = "SI_ALTA",
  SI_BASSA = "SI_BASSA",
}

// Interfaccia per le note
interface Note {
  sprite: Phaser.Physics.Arcade.Sprite;
  type: NoteType;
  isGood: boolean;
}

export class RaccogliNoteManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;
  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  // Player
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerSpeed: number = 500;

  // Note che cadono
  private notes: Note[] = [];
  private notesGroup!: Phaser.Physics.Arcade.Group;

  // Velocità caduta note
  private noteFallSpeed: number = 200;
  private noteFallSpeedBad: number = 250;
  private noteSprite!: Phaser.Physics.Arcade.Sprite;

  // Sequenza di uscita delle note buone (questa è l'unica sequenza usata)
  //* Ode an die Freude - Inno alla Gioia
  private exitOrderSequence: NoteType[] = [
    NoteType.FA,
    NoteType.MI,
    NoteType.FA,
    NoteType.RE,
    NoteType.FA,
    NoteType.MI,
    NoteType.FA,
    NoteType.RE,
    NoteType.LA,
    NoteType.SOL,
    NoteType.LA,
    NoteType.FA,
    NoteType.LA,
    NoteType.SOL,
    NoteType.LA,
    NoteType.FA,
    NoteType.RE_ALTA,
    NoteType.RE_ALTA,
    NoteType.RE_ALTA,
    NoteType.DO_ALTA,
    NoteType.SI_ALTA,
    NoteType.LA,
    NoteType.LA,
    NoteType.LA,
    NoteType.SOL,
    NoteType.FA,
    NoteType.SOL,
    NoteType.SOL,
    NoteType.SOL,
    NoteType.LA,
    NoteType.SOL,
    NoteType.RE,
    NoteType.RE,
    NoteType.RE,
    NoteType.LA_BASSA,
    NoteType.SI_BASSA,
    NoteType.DO_BASSA,
    NoteType.MI,
    NoteType.FA,
    NoteType.SOL,
    NoteType.LA,
    NoteType.SOL,
    NoteType.FA,
    NoteType.LA_BASSA,
    NoteType.SI_BASSA,
    NoteType.DO_BASSA,
    NoteType.MI,
    NoteType.FA,
    NoteType.SOL,
    NoteType.LA,
    NoteType.SOL,
    NoteType.FA,
  ];

  // Tempi di uscita per ogni nota (in millisecondi)
  private exitTimingSequence: number[] = [
    625, // FA
    625, // MI
    625, // FA
    625, // RE
    1250, // FA (nota più lunga)
    625, // MI
    625, // FA
    625, // RE
    625, // LA
    625, // SOL
    625, // LA
    625, // FA
    1250, // LA
    625, // SOL
    625, // LA
    625, // FA
    625, // RE_ALTA
    625, // RE_ALTA
    1250, // RE_ALTA (nota lunga)
    625, // DO_ALTA
    625, // SI_ALTA
    625, // LA
    625, // LA
    625, // LA
    625, // SOL
    625, // FA
    625, // SOL
    625, // SOL
    1250, // SOL (nota lunga)
    625, // LA
    625, // SOL
    625, // RE
    625, // RE
    1250, // RE (nota lunga)
    625, // LA_BASSA
    625, // SI_BASSA
    625, // DO_BASSA
    625, // MI
    625, // FA
    625, // SOL
    625, // LA
    625, // SOL
    625, // FA
    625, // LA_BASSA
    625, // SI_BASSA
    625, // DO_BASSA
    625, // MI
    625, // FA
    625, // SOL
    625, // LA
    625, // SOL
    1250, // FA (nota lunga finale)
  ];

  // Moltiplicatore per i tempi (1.0 = normale, 1.2 = +20% più lento, 0.8 = -20% più veloce)
  private timingMultiplier: number = 1.5; //! Serve per aumentare il tempo tra le note se troppo veloce. invece di aumentare il tempo individualmente.

  // Booleano per usare il timing sequenziale o random
  private useSequentialTiming: boolean = true;

  // Indice corrente nella sequenza di uscita (per lo spawn)
  private currentExitIndex: number = 0;

  // Indice corrente nella sequenza che il giocatore deve seguire
  private currentSequenceIndex: number = 0;

  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private btnLeft!: Phaser.GameObjects.Image;
  private btnRight!: Phaser.GameObjects.Image;

  // Spawn delle note
  private noteSpawnTimer!: Phaser.Time.TimerEvent;
  private noteSpawnInterval: number = 1500; // millisecondi

  // Score e UI
  private score: number = 0;

  private scoreBarBg!: Phaser.GameObjects.Image;
  private scoreBarFg!: Phaser.GameObjects.Image;
  private consecutiveGoodNotes: number = 0; // Contatore note buone consecutive totali

  // Aggiungi queste variabili private nella classe
  private isPaused: boolean = false;
  private keyPause?: Phaser.Input.Keyboard.Key;
  private keyResume?: Phaser.Input.Keyboard.Key;

  constructor() {
    super({key: assetConf.scene.raccogliNoteManager});
  }

  //* Scopo: Inizializza i dati della scena ricevuti da altre scene
  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  //* Scopo: Crea tutti gli elementi della scena all'avvio
  create() {
    //! CANCELLARE
    // Ottieni le dimensioni del gioco
    const {width} = this.scale;

    // Crea il testo
    const testo = this.add.text(width / 2, 350, "Versione di test 01", {
      fontSize: "40px",
      color: "#ffffffff",
      fontFamily: "Arial",
    });

    // Centra il testo orizzontalmente
    testo.setOrigin(0.5, 0.5);
    //! Fino qui

    console.log("Start Game Raccogli Note");
    this.computeLayoutDimensions();

    //* backgroundGame: copre l'intera area di gioco.
    const backgroundGame = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      assetConf.image.backgroundGame,
    );

    backgroundGame
      .setDepth(-3)
      .setScrollFactor(0)
      .setDisplaySize(this.scale.width, this.scale.height);

    this.noteFallSpeedBad = this.gameScene.setDynamicValueBasedOnScale(250, 450); // Nota cattiva più veloce
    this.noteFallSpeed = this.gameScene.setDynamicValueBasedOnScale(200, 400);
    this.playerSpeed = this.gameScene.setDynamicValueBasedOnScale(500, 800);

    // ---- backgroundGame_Bottom ----
    const backgroundGame_Bottom = this.add.image(
      this.scale.width / 2,
      this.scale.height, // posizionato in basso
      assetConf.image.backgroundGame_Bottom,
    );

    backgroundGame_Bottom
      .setOrigin(0.5, 1) // pivot al centro in basso
      .setScrollFactor(0)
      .setDepth(110);

    // Aggiungi corpo fisico statico prima della scala
    this.physics.add.existing(backgroundGame_Bottom, true); // true = static body
    const body = backgroundGame_Bottom.body as Phaser.Physics.Arcade.Body;

    // Imposta dimensioni del collider
    // Qui diminuirai l'altezza "verso l'alto" per renderlo più sottile
    const colliderWidth = backgroundGame_Bottom.width; // usa larghezza originale
    const colliderHeight = this.gameScene.setDynamicValueBasedOnScale(130, 250); // altezza desiderata, più piccola del sprite

    body.setSize(colliderWidth, colliderHeight);

    // Posiziona il corpo più in basso (il pivot dell'immagine è già in basso)
    body.setOffset(0, backgroundGame_Bottom.height - colliderHeight);

    // Ora puoi scalare lo sprite senza influenzare il corpo
    const scale = backgroundGame.displayWidth / backgroundGame_Bottom.width;

    backgroundGame_Bottom.setScale(scale);

    // Salva il riferimento per usarlo dopo l'inizializzazione del gruppo
    const bottomCollider = backgroundGame_Bottom;

    // Inizializza il gruppo delle note
    this.notesGroup = this.physics.add.group();

    // Sistema per gestire la collisione tra note e base terreno.
    this.physics.add.collider(this.notesGroup, bottomCollider, (noteObj) => {
      const noteSprite = noteObj as Phaser.Physics.Arcade.Sprite;

      // Controlla che abbia un corpo Arcade valido
      if (!noteSprite.body || !(noteSprite.body instanceof Phaser.Physics.Arcade.Body)) return;

      // Evita di processare più volte la stessa nota
      if (noteSprite.getData("hasCollided")) return;
      noteSprite.setData("hasCollided", true);

      const body = noteSprite.body as Phaser.Physics.Arcade.Body;

      // ✅ Ferma solo la velocità, NON impostare immovable
      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);
    });

    // Inizializza il player
    this.createPlayer();

    // Setup input tastiera (solo se disponibile, per desktop)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyPause = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      this.keyResume = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }

    // Setup pulsanti touch
    this.createTouchButtons();

    // Setup collisioni
    this.physics.add.overlap(this.player, this.notesGroup, this.collectNote, undefined, this);

    // UI
    this.createUI();

    // Avvia lo spawn delle note
    this.startNoteSpawning();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });
  }

  //* Scopo: Aggiorna la logica del gioco ad ogni frame
  update() {
    if (this.isGameOver) return;

    // Controllo tasti pausa/resume (solo se tastiera disponibile)
    if (this.input.keyboard && this.keyPause && this.keyResume) {
      if (Phaser.Input.Keyboard.JustDown(this.keyPause)) {
        this.pauseNotes();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyResume)) {
        this.resumeNotes();
      }
    }

    // Movimento del player solo se non in pausa
    if (!this.isPaused) {
      this.handlePlayerMovement();
      this.cleanupNotes();
    } else {
      this.player.setVelocityX(0); // blocca il player durante pausa
    }
  }

  public pauseNotes(): void {
    if (this.isPaused) return; // già in pausa
    this.isPaused = true;

    // Ferma tutte le note attive
    this.notes.forEach((note) => {
      if (note.sprite && note.sprite.body) {
        note.sprite.setVelocityY(0);
      }
    });

    // Ferma lo spawn delle note
    if (this.noteSpawnTimer) {
      this.noteSpawnTimer.paused = true;
    }
  }

  public resumeNotes(): void {
    if (!this.scene.isActive() || !this.notesGroup) return; // sicurezza

    if (!this.isPaused) return; // già in esecuzione
    this.isPaused = false;

    // Ripristina velocità delle note attive
    this.notes.forEach((note) => {
      if (note.sprite && note.sprite.body) {
        const velocity = note.isGood ? this.noteFallSpeed : this.noteFallSpeedBad;

        note.sprite.setVelocityY(velocity);
      }
    });

    // Riprendi lo spawn delle note
    if (this.useSequentialTiming) {
      // spawn sequenziale: proteggi con controllo indice
      if (this.currentExitIndex < this.exitOrderSequence.length) {
        this.spawnSequentialNote();
      }
    } else {
      // spawn random
      if (this.noteSpawnTimer) {
        this.noteSpawnTimer.paused = false;
      } else {
        this.noteSpawnTimer = this.time.addEvent({
          delay: this.noteSpawnInterval,
          callback: this.spawnNote,
          callbackScope: this,
          loop: true,
        });
      }
    }
  }

  //* Scopo: Calcola le dimensioni del gioco in base alla configurazione
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
    console.log("marginTop: ", this.marginTop);
  }

  //* Scopo: Crea il player (personaggio controllabile) nella posizione iniziale
  private createPlayer(): void {
    // Posiziona il player a 1/10 dell'altezza dello schermo dal basso
    const playerX = this.gameWidth / 2;
    const playerY = (this.gameHeight - this.gameHeight / 10) * 0.85;

    // Crea sprite
    this.player = this.physics.add.sprite(playerX, playerY, "player");
    this.player.setCollideWorldBounds(true);

    // Dimensioni del collider (basate sullo sprite originale a scala 1)
    const bodyWidth = 80;
    const bodyHeight = 10;
    const offsetY = -60; // Offset verticale verso l'alto

    this.player.body!.setSize(bodyWidth, bodyHeight);
    this.player.body!.setOffset(
      (this.player.width - bodyWidth) / 2, // centra X
      (this.player.height - bodyHeight) / 2 + offsetY, // centra Y e sposta in alto
    );

    // Applica scala (dopo aver impostato collider e offset)
    const scale = this.gameScene.setDynamicValueBasedOnScale(0.6, 1.4);

    this.player.setScale(scale).setDepth(50);
  }

  //* Scopo: Crea i pulsanti touch per il movimento su dispositivi mobili
  private createTouchButtons(): void {
    // Pulsante sinistro
    this.btnLeft = this.add.image(100, this.gameHeight - 100, "btnLeft");
    this.btnLeft.setInteractive();
    this.btnLeft.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.2));
    this.btnLeft.setAlpha(0.7);
    this.btnLeft.setData("isPressed", false);
    this.btnLeft.setDepth(300);

    // Pulsante destro
    this.btnRight = this.add.image(this.gameWidth - 100, this.gameHeight - 100, "btnRight");
    this.btnRight.setInteractive();
    this.btnRight.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.2));
    this.btnRight.setAlpha(0.7);
    this.btnRight.setData("isPressed", false);
    this.btnRight.setDepth(300);

    // Eventi touch
    this.btnLeft.on("pointerdown", () => this.btnLeft.setData("isPressed", true));
    this.btnLeft.on("pointerup", () => this.btnLeft.setData("isPressed", false));
    this.btnLeft.on("pointerout", () => this.btnLeft.setData("isPressed", false));

    this.btnRight.on("pointerdown", () => this.btnRight.setData("isPressed", true));
    this.btnRight.on("pointerup", () => this.btnRight.setData("isPressed", false));
    this.btnRight.on("pointerout", () => this.btnRight.setData("isPressed", false));
  }

  //* Scopo: Gestisce il movimento del player tramite tastiera e touch
  private handlePlayerMovement(): void {
    if (!this.player) return;

    const leftPressed =
      (this.cursors && this.cursors.left.isDown) || this.btnLeft.getData("isPressed");
    const rightPressed =
      (this.cursors && this.cursors.right.isDown) || this.btnRight.getData("isPressed");

    // Movimento con tastiera o touch
    if (leftPressed) {
      this.player.setVelocityX(-this.playerSpeed);
    } else if (rightPressed) {
      this.player.setVelocityX(this.playerSpeed);
    } else {
      this.player.setVelocityX(0);
    }
  }

  //* Scopo: Crea gli elementi UI (testi di score, combo, sequenza)
  private createUI(): void {
    // bg e fg laterali
    // Score bar
    const barX = 70; // Posizione X a sinistra
    const barY = (this.gameHeight * 1) / 3 + 150; // Centro verticale
    const barScale = this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0);

    this.scoreBarBg = this.add.image(barX, barY, "scoreBar_bg");
    this.scoreBarBg.setOrigin(0.5, 0.5).setScale(barScale).setDepth(100);

    this.scoreBarFg = this.add.image(barX, barY, "scoreBar_fg");
    this.scoreBarFg.setOrigin(0.5, 1).setScale(barScale).setDepth(200); // Origin in basso per crescere verso l'alto

    // Posiziona fg in basso al bg usando displayHeight (altezza scalata)
    this.scoreBarFg.y = this.scoreBarBg.y + this.scoreBarBg.displayHeight / 2;
    this.scoreBarFg.setCrop(
      0,
      this.scoreBarFg.height, // usa height originale per crop
      this.scoreBarFg.width,
      0,
    );
  }

  //* Scopo: Aggiorna barra punteggio (suddivisa in 30 note)
  private updateScoreBar(): void {
    const maxNotes = 30;
    const fillPercentage = Math.min(this.consecutiveGoodNotes / maxNotes, 1.0); // Limita a 1.0
    const fillHeight = fillPercentage * this.scoreBarFg.height;

    this.scoreBarFg.setCrop(
      0,
      this.scoreBarFg.height - fillHeight,
      this.scoreBarFg.width,
      fillHeight,
    );
  }

  //* Scopo: Avvia il sistema di spawn delle note (random o sequenziale)
  private startNoteSpawning(): void {
    // Avvia spawn sequenziale dopo breve delay per sicurezza
    this.time.delayedCall(50, () => {
      if (this.useSequentialTiming) {
        this.isPaused = false; // assicura che non sia in pausa
        this.spawnSequentialNote();
      } else {
        this.noteSpawnTimer = this.time.addEvent({
          delay: this.noteSpawnInterval,
          callback: this.spawnNote,
          callbackScope: this,
          loop: true,
        });
      }
    });
  }

  //* Scopo: Spawna una nota seguendo la sequenza e i tempi definiti
  private spawnSequentialNote(): void {
    // sicurezza: scena attiva e non in pausa
    if (!this.scene.isActive() || this.isPaused) return;
    if (!this.exitOrderSequence || this.exitOrderSequence.length === 0) return;

    // reset indice se oltre la sequenza
    if (this.currentExitIndex >= this.exitOrderSequence.length) {
      this.currentExitIndex = 0;
    }

    const noteType = this.exitOrderSequence[this.currentExitIndex];

    if (!noteType) return;

    const xGood = Phaser.Math.Between(100, this.gameWidth - 100);

    this.spawnSpecificNote(noteType, true, xGood);

    // nota cattiva random
    if (Math.random() > 0.6) {
      this.time.delayedCall(500, () => {
        if (this.isPaused || !this.scene.isActive()) return;
        const xBad = Phaser.Math.Between(100, this.gameWidth - 100);

        this.spawnSpecificNote(this.getRandomNoteType(), false, xBad);
      });
    }

    const baseDelay = this.exitTimingSequence[this.currentExitIndex] || this.noteSpawnInterval;
    const nextDelay = baseDelay * this.timingMultiplier;

    this.currentExitIndex++;

    // chiama ricorsivamente lo spawn
    this.time.delayedCall(nextDelay, () => {
      if (!this.isPaused && this.scene.isActive()) {
        this.spawnSequentialNote();
      }
    });
  }

  //* Scopo: Spawna una nota casuale (modalità random)
  private spawnNote(): void {
    // Spawna nota buona dalla sequenza
    if (Math.random() > 0.3) {
      const noteType =
        this.exitOrderSequence[Phaser.Math.Between(0, this.exitOrderSequence.length - 1)];
      const xGood = Phaser.Math.Between(100, this.gameWidth - 100);

      this.spawnSpecificNote(noteType, true, xGood);
    }

    // Spawna nota cattiva separata per evitare sovrapposizioni
    if (Math.random() > 0.7) {
      this.time.delayedCall(300, () => {
        const xBad = Phaser.Math.Between(100, this.gameWidth - 100);

        this.spawnSpecificNote(this.getRandomNoteType(), false, xBad);
      });
    }
  }

  //* Scopo: Spawna una nota specifica di un certo tipo in una posizione
  private spawnSpecificNote(noteType: NoteType, isGood: boolean, x?: number, y?: number): void {
    // Posizione X e Y
    const posX = x !== undefined ? x : Phaser.Math.Between(100, this.gameWidth - 100);
    const posY = y !== undefined ? y : -100;

    // Nota: Ora usa solo 2 sprite: "note_good" e "note_bad"
    const spriteKey = isGood ? "note_good" : "note_bad";

    this.noteSprite = this.physics.add.sprite(posX, posY, spriteKey);

    this.noteSprite.setScale(this.gameScene.setDynamicValueBasedOnScale(0.6, 1.4));

    // Salva il tipo di nota come dato custom
    this.noteSprite.setData("noteType", noteType);
    this.noteSprite.setData("isGood", isGood);

    // Aggiungi al gruppo
    this.notesGroup.add(this.noteSprite);

    // Aggiungi velocità
    const velocity = isGood ? this.noteFallSpeed : this.noteFallSpeedBad;

    this.noteSprite.setVelocityY(velocity).setDepth(60);

    // Salva i dati della nota
    const note: Note = {
      sprite: this.noteSprite,
      type: noteType,
      isGood: isGood,
    };

    this.notes.push(note);
  }

  //* Scopo: Restituisce un tipo di nota casuale
  private getRandomNoteType(): NoteType {
    const allNotes = Object.values(NoteType);

    return allNotes[Phaser.Math.Between(0, allNotes.length - 1)];
  }

  //* Scopo: Gestisce la collisione tra player e nota
 private collectNote: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
  (object1, object2) => {
    // object2 può essere Body | StaticBody | GameObjectWithBody | Tile
    const noteSpriteObj = object2 as Phaser.Physics.Arcade.Sprite;

    // se vuoi essere più sicuro, verifica prima:
    if (!('x' in noteSpriteObj && 'y' in noteSpriteObj)) return;

    const noteIndex = this.notes.findIndex((n) => n.sprite === noteSpriteObj);
    if (noteIndex === -1) return;

    const note = this.notes[noteIndex];
    const noteX = noteSpriteObj.x;
    const noteY = noteSpriteObj.y;

    note.sprite.destroy();
    this.notesGroup.remove(note.sprite, true);
    this.notes.splice(noteIndex, 1);

    if (note.isGood) {
      this.consecutiveGoodNotes++;
      this.gameScene.uiManager.updateScore(1);
      this.score += 10;
      this.playNoteSound(note.type);
      this.showFeedback(noteX, noteY, "+10", 0x00ff00);
      this.updateScoreBar();
      if (this.consecutiveGoodNotes >= 30) {
        this.isGameOver = true;
        this.checkGameOver();
        return;
      }
    } else {
      this.consecutiveGoodNotes = Math.max(0, this.consecutiveGoodNotes - 1);
      this.gameScene.uiManager.updateScore(-1);
      this.score = Math.max(0, this.score - 10);
      this.showFeedback(noteX, noteY, "-10", 0xff0000);
      this.playErrorSound();
      this.updateScoreBar();
    }
  };


  //* Scopo: Rimuove le note che sono uscite dallo schermo
  private cleanupNotes(): void {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];

      // ✅ Controlla se la velocità Y è 0 (nota ha toccato il terreno)
      if (
        note.sprite.body &&
        note.sprite.body.velocity.y === 0 &&
        !note.sprite.getData("isSinking")
      ) {
        note.sprite.setData("isSinking", true);

        // Velocità originale della nota
        const originalVelocity = note.isGood ? this.noteFallSpeed : this.noteFallSpeedBad;

        // Applica velocità ridotta (1/10 della originale)
        note.sprite.setVelocityY(originalVelocity / 10);

        // Dopo 2 secondi lampeggia e sparisce
        this.time.delayedCall(2000, () => {
          if (!note.sprite || !note.sprite.active) return;

          note.sprite.setVelocityY(0); // Ferma completamente

          this.tweens.add({
            targets: note.sprite,
            alpha: 0.2,
            duration: 200,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
              if (note.sprite && note.sprite.active) {
                const idx = this.notes.findIndex((n) => n.sprite === note.sprite);

                if (idx !== -1) this.notes.splice(idx, 1);
                this.notesGroup.remove(note.sprite, true);
                note.sprite.destroy();
              }
            },
          });
        });

        continue;
      }

      // Nota è completamente fuori schermo
      if (note.sprite.y > this.gameHeight + 50) {
        if (note.isGood && note.type === this.exitOrderSequence[this.currentSequenceIndex]) {
          this.currentSequenceIndex = 0;
        }

        note.sprite.destroy();
        this.notesGroup.remove(note.sprite, true);
        this.notes.splice(i, 1);
      }
    }
  }

  //* Scopo: Mostra un feedback testuale animato sullo schermo
  private showFeedback(x: number, y: number, text: string, color: number): void {
    const feedback = this.add.text(x, y, text, {
      fontSize: "64px", // Aumentato da 32px a 64px per maggiore visibilità
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6,
    });

    feedback.setOrigin(0.5).setScale(this.gameScene.setDynamicValueBasedOnScale(0.8, 1.6));

    this.tweens.add({
      targets: feedback,
      y: y - 100,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        feedback.destroy();
      },
    });
  }

  //* Scopo: Riproduce il suono della nota musicale
  private playNoteSound(noteType: NoteType): void {
    this.gameScene.audioManager.playAudio(`note_${noteType}`);
  }

  //* Scopo: Riproduce il suono di errore
  private playErrorSound(): void {
    this.gameScene.audioManager.playAudio(`note_ERROR`);
  }

  //* Scopo: Controlla se il gioco è terminato e gestisce il game over
  checkGameOver() {
    if (this.isGameOver) {
      this.canShoot = false;

      // Ferma lo spawn delle note
      if (this.noteSpawnTimer) {
        this.noteSpawnTimer.remove();
      }

      // Distruggi tutte le note rimaste
      this.notes.forEach((note) => note.sprite.destroy());
      this.notes = [];

      this.scene.pause();
    }
  }
}
