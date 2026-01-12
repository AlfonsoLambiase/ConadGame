/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {RitmoGiustoAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = RitmoGiustoAssetConf;

interface Note {
  sprite: Phaser.GameObjects.Image; // immagine della nota
  shadow?: Phaser.GameObjects.Image; // immagine ombra
  lane: number;
  startY: number;
}

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  timeAddNewRow: number = 20000;

  // Properties
  private lanes: number = 3;
  private laneWidth: number = 120;
  private notes: Note[] = [];
  private targetZone!: Phaser.GameObjects.Graphics;
  private targetY: number = 0;
  private noteSpeed: number = 300;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    center: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private laneIndicators: Phaser.GameObjects.Graphics[] = [];
  private score: number = 0;
  private combo: number = 0;

  // Parametri prospettiva personalizzabili
  private scaleStart: number = 0.2; // Scala iniziale delle note (partenza dall'alto)
  private scaleEnd: number = 1.0; // Scala finale delle note (arrivo in basso)
  private laneOffsetStart: number = -100; // Apertura iniziale corsie laterali (negativo = più vicino al centro, 0 = larghezza normale)
  private laneOffsetEnd: number = 170; // Apertura finale corsie laterali
  private noteStartY: number = 0; //! Y iniziale note (verrà impostato in create con marginTop)
  private noteEndY: number = 0; //! Y finale note (verrà impostato in create)
  private alphaStart: number = 0; // Alpha iniziale note (0 = invisibile)
  private alphaEnd: number = 1; // Alpha finale note (1 = completamente visibile)
  private alphaTransitionProgress: number = 0.2; // A che % del percorso l'alpha raggiunge il valore finale (0-1)
  private noteDestroyOffset: number = 50; // Pixel oltre la fine dello schermo prima di distruggere le note

  // VARIABILI CENTRALIZZATE
  private targetZoneWidthMultiplier: number = 5; //! Larghezza laterale per il touch.
  private targetZoneHeight: number = 100;
  private noteWidth: number = 80;
  private offsetYBaseButtons: number = 30;

  private get targetZoneOffsetY(): number {
    return this.targetZoneHeight / 2;
  }

  private get flashOffsetX(): number {
    return this.noteWidth / 2;
  }

  private get flashOffsetY(): number {
    return this.targetZoneHeight / 2;
  }

  // PARAMETRI PER I TASTI
  private keyScale: number = 1;
  private keyOffsetX: number = 150; // distanza laterale regolabile
  private keySprites: Phaser.GameObjects.Sprite[] = [];

  // per le note
  private noteTextures = ["obj0", "obj1", "obj2", "obj3"]; // Array di immagini
  private shadowOffsetY = 70; // quanto sotto appare l'ombra

  private showHitZone: boolean = false; //! Attivare per rendere visibile la zona di collisione.
  private hitZoneGraphics!: Phaser.GameObjects.Graphics;
  private hitWindow: number = 150; //! distanza effettiva per esplodere le note verticale (hit). Dinamica. Parametro importante

  private hitImages: Phaser.GameObjects.Image[] = []; // array per le immagini hit

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    this.computeLayoutDimensions();

    this.setupParameters();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });

    // Spawn notes periodically
    this.time.addEvent({
      delay: 1000,
      callback: this.spawnNote,
      callbackScope: this,
      loop: true,
    });

    this.createKeyButtons();

    this.createAnimations();

    //!Solo visivo collider collisione tra note e tasti
    if (this.showHitZone) {
      this.hitZoneGraphics = this.add.graphics();
      this.hitZoneGraphics.lineStyle(2, 0xff0000, 1); // rosso per debug
      const centerX = this.gameWidth / 2;

      // Zona verticale di hit (hitWindow) e orizzontale (larghezza corsie)
      this.hitZoneGraphics.strokeRect(
        centerX - (this.laneWidth * this.targetZoneWidthMultiplier) / 2,
        this.targetY - this.hitWindow,
        this.laneWidth * this.targetZoneWidthMultiplier,
        this.hitWindow * 2,
      );
    }
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);
    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
  }

  private setupParameters(): void {
    this.noteSpeed = this.gameScene.setDynamicValueBasedOnScale(200, 400);
    this.noteStartY = this.gameScene.setDynamicValueBasedOnScale(120 + 20, 790 + 20);
    this.laneOffsetStart = this.gameScene.setDynamicValueBasedOnScale(-110, -90);
    this.laneOffsetEnd = this.gameScene.setDynamicValueBasedOnScale(60, 400);
    this.alphaTransitionProgress = this.gameScene.setDynamicValueBasedOnScale(0.3, 0.2);
    this.scaleStart = this.gameScene.setDynamicValueBasedOnScale(0.1, 0.2);
    this.scaleEnd = this.gameScene.setDynamicValueBasedOnScale(0.7, 1.5);
    this.noteEndY = this.gameHeight - this.gameScene.setDynamicValueBasedOnScale(150, 250);
    this.targetY = this.noteEndY;

    this.keyScale = this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0);
    this.keyOffsetX = this.gameScene.setDynamicValueBasedOnScale(80, 150);
    this.offsetYBaseButtons = this.gameScene.setDynamicValueBasedOnScale(30, 60);

    this.shadowOffsetY = this.gameScene.setDynamicValueBasedOnScale(70, 100);

    //! distanza effettiva per esplodere le note verticale (hit). Dinamica. Parametro importante
    this.hitWindow = this.gameScene.setDynamicValueBasedOnScale(150, 350);

    // Setup keyboard inputs
    if (this.input.keyboard) {
      this.keys = {
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        center: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      // Add key press handlers
      this.keys.left.on("down", () => {
        this.pressKeyVisual(0);
        this.checkHit(0);
      });
      this.keys.center.on("down", () => {
        this.pressKeyVisual(1);
        this.checkHit(1);
      });
      this.keys.right.on("down", () => {
        this.pressKeyVisual(2);
        this.checkHit(2);
      });
    }

    // Create lane indicators with perspective
    for (let i = 0; i < this.lanes; i++) {
      const indicator = this.add.graphics();

      this.laneIndicators.push(indicator);
      this.drawLaneIndicator(indicator, i);
    }

    // Create target zone
    this.targetZone = this.add.graphics();
    this.targetZone.lineStyle(3, 0x00ff00, 0.0); //! alpha
    const centerX = this.gameWidth / 2;

    this.targetZone.strokeRect(
      centerX - (this.laneWidth * this.targetZoneWidthMultiplier) / 2,
      this.targetY - this.targetZoneOffsetY,
      this.laneWidth * this.targetZoneWidthMultiplier,
      this.targetZoneHeight,
    );
  }

  private createKeyButtons(): void {
    const centerX = this.gameWidth / 2;

    const positions = [
      0 + this.keyOffsetX, // sinistra
      centerX, // centro
      this.gameWidth - this.keyOffsetX, // destra
    ];

    // --- CREA I TRE TASTI ---
    for (let i = 0; i < 3; i++) {
      const sprite = this.add.sprite(positions[i], this.targetY, "btn");

      sprite.setScale(this.keyScale);
      sprite.setOrigin(0.5);
      sprite.setDepth(10); // superiore alla base

      this.keySprites.push(sprite);

      // --- CREA L'IMMAGINE HIT SOTTO IL TASTO ---
      const hitImg = this.add
        .image(positions[i], this.targetY, "hit")
        .setOrigin(0.5)
        .setScale(this.keyScale)
        .setAlpha(0) // invisibile all’inizio
        .setDepth(9); // inferiore ai tasti

      this.hitImages.push(hitImg);
    }

    // --- CREA LA BASE SOTTO TUTTO ---
    const baseButtons = this.add.image(
      centerX,
      this.targetY + this.offsetYBaseButtons,
      "baseButtons",
    );

    baseButtons.setOrigin(0.5);

    // scala automatica in modo che la larghezza = larghezza schermo
    const scaleX = this.gameWidth / baseButtons.width;

    baseButtons.setScale(scaleX);

    baseButtons.setDepth(8); // sotto ai tasti e alle hit

    this.createTouchZones();
  }

  // --- CREA LE ZONE CLICCABILI ---
  private createTouchZones(): void {
    const zoneHeight = this.gameHeight / 2; // altezza = metà inferiore dello schermo
    const zoneWidth = this.gameWidth / 3; // 3 colonne

    const startY = this.gameHeight - zoneHeight / 2;

    for (let i = 0; i < 3; i++) {
      const zoneX = i * zoneWidth + zoneWidth / 2;

      const zone = this.add.rectangle(
        zoneX,
        startY,
        zoneWidth,
        zoneHeight,
        i === 0 ? 0xff0000 : i === 1 ? 0x00ff00 : 0x0000ff,
        0.0, //! Parametro alpha. Zone cliccabili per il touch che attiva il bottone.
      );

      zone.setDepth(50);
      zone.setInteractive();

      zone.on("pointerdown", () => {
        //console.log(`TOUCH ZONA: lane ${i}`);
        this.pressKeyVisual(i);
        this.checkHit(i);
      });
    }
  }

  private showHitEffect(lane: number): void {
    const hitImg = this.hitImages[lane];

    hitImg.setAlpha(1);

    this.tweens.add({
      targets: hitImg,
      alpha: 0,
      duration: 150,
      ease: "Linear",
    });
  }

  private pressKeyVisual(lane: number): void {
    const sprite = this.keySprites[lane];

    sprite.setTexture("btnClicked");

    this.time.delayedCall(100, () => {
      sprite.setTexture("btn");
    });

    this.gameScene.audioManager.playAudio(assetConf.audio.clickButton);
  }

  private drawLaneIndicator(graphics: Phaser.GameObjects.Graphics, laneIndex: number): void {
    graphics.clear();
    graphics.lineStyle(2, 0x444444, 0.0); //! Log visivo, indica la linea percorsa delle corsie destra, centrale e sinistra. Mettere a 1.0 per test l'alpha

    // Disegna linea della corsia
    const startX = this.getLaneXPosition(laneIndex, this.noteStartY);
    const endX = this.getLaneXPosition(laneIndex, this.noteEndY);

    graphics.beginPath();
    graphics.moveTo(startX, this.noteStartY);
    graphics.lineTo(endX, this.noteEndY);
    graphics.strokePath();
  }

  private getLaneXPosition(laneIndex: number, y: number): number {
    const centerX = this.gameWidth / 2;
    const progress = (y - this.noteStartY) / (this.noteEndY - this.noteStartY);

    // Calcola offset laterale basato sulla progressione (invertito)
    const lateralOffset = Phaser.Math.Linear(this.laneOffsetStart, this.laneOffsetEnd, progress);

    // Posizione base della corsia
    let baseOffset = (laneIndex - 1) * this.laneWidth;

    // Applica effetto prospettiva laterale per corsie laterali
    if (laneIndex === 0) {
      // Corsia sinistra: parte dal centro, finisce a sinistra
      baseOffset -= lateralOffset;
    } else if (laneIndex === 2) {
      // Corsia destra: parte dal centro, finisce a destra
      baseOffset += lateralOffset;
    }

    return centerX + baseOffset;
  }

  private spawnNote(): void {
    if (this.isGameOver) return;

    this.gameScene.audioManager.playAudio(assetConf.audio.throwObject);

    // ---- Prima nota ----
    const lane1 = Phaser.Math.Between(0, this.lanes - 1);
    const startX1 = this.getLaneXPosition(lane1, this.noteStartY);
    const texture1 = Phaser.Utils.Array.GetRandom(this.noteTextures);

    // ---- Ombra ----
    const shadow1 = this.add
      .image(startX1, this.noteStartY + this.shadowOffsetY, "objShadow")
      .setAlpha(0.9)
      .setScale(this.scaleStart)
      .setDepth(8); // sotto i tasti

    // ---- Nota principale ----
    const note1 = this.add
      .image(startX1, this.noteStartY, texture1)
      .setDepth(11) // sopra i tasti
      .setScale(this.scaleStart)
      .setAlpha(this.alphaStart);

    this.notes.push({
      sprite: note1,
      shadow: shadow1,
      lane: lane1,
      startY: this.noteStartY,
    });

    // ---- Possibile seconda nota (30%) ----
    const spawnSecondNote = Phaser.Math.Between(1, 100) <= 30;

    if (spawnSecondNote && this.lanes > 1) {
      let lane2;

      do {
        lane2 = Phaser.Math.Between(0, this.lanes - 1);
      } while (lane2 === lane1);

      const startX2 = this.getLaneXPosition(lane2, this.noteStartY);
      const texture2 = Phaser.Utils.Array.GetRandom(this.noteTextures);

      const shadow2 = this.add
        .image(startX2, this.noteStartY + this.shadowOffsetY, "objShadow")
        .setAlpha(0.9)
        .setScale(this.scaleStart)
        .setDepth(8);

      const note2 = this.add
        .image(startX2, this.noteStartY, texture2)
        .setDepth(11)
        .setScale(this.scaleStart)
        .setAlpha(this.alphaStart);

      this.notes.push({
        sprite: note2,
        shadow: shadow2,
        lane: lane2,
        startY: this.noteStartY,
      });
    }
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // Update notes
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];

      const progressSpeed = (note.sprite.y - this.noteStartY) / (this.noteEndY - this.noteStartY);
      const speedMultiplier = Phaser.Math.Linear(1, 1.5, progressSpeed); // velocità fino al target
      const newY = note.sprite.y + (this.noteSpeed * speedMultiplier * delta) / 1000;

      // Aggiorna posizione nota principale
      note.sprite.y = newY;
      const newX = this.getLaneXPosition(note.lane, newY);

      note.sprite.x = newX;

      // Aggiorna l'ombra se esiste
      if (note.shadow) {
        // Moltiplichiamo shadowOffsetY per la scala corrente
        const progress = (newY - this.noteStartY) / (this.noteEndY - this.noteStartY);
        const scale = Phaser.Math.Linear(this.scaleStart, this.scaleEnd, progress);

        note.shadow.y = newY + this.shadowOffsetY * scale;
        note.shadow.x = newX;

        note.shadow.setScale(scale);
      }

      // Calcola progress (0 all'inizio, 1 alla fine)
      const progress = (newY - this.noteStartY) / (this.noteEndY - this.noteStartY);

      // Scala basata sulla profondità
      const scale = Phaser.Math.Linear(this.scaleStart, this.scaleEnd, progress);

      note.sprite.setScale(scale);

      // Alpha con transizione più veloce
      let alpha: number;

      if (progress <= this.alphaTransitionProgress) {
        const alphaProgress = progress / this.alphaTransitionProgress;

        alpha = Phaser.Math.Linear(this.alphaStart, this.alphaEnd, alphaProgress);
      } else {
        alpha = this.alphaEnd;
      }

      note.sprite.setAlpha(alpha);
      if (note.shadow) note.shadow.setAlpha(alpha * 0.9); // ombra leggermente più trasparente

      // Rimuovi note che hanno superato il target + offset
      if (newY > this.gameHeight + this.noteDestroyOffset) {
        if (note.shadow) note.shadow.destroy();
        note.sprite.destroy();
        this.notes.splice(i, 1);
        this.resetCombo();
        //console.log("Miss: ", note.lane);
        this.playMissAnimation(note.lane);
        this.gameScene.audioManager.playAudio(assetConf.audio.animMiss);
        this.gameScene.uiManager.updateLives();
      }
    }
  }

  private checkHit(lane: number): void {
    const hitWindow = this.hitWindow;

    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];

      if (note.lane === lane) {
        const distance = Math.abs(note.sprite.y - this.targetY);

        if (distance < hitWindow) {
          //console.log("Hit");
          this.starsEffectAnimation(note.sprite);
          this.showHitEffect(lane);
          this.gameScene.audioManager.playAudio(assetConf.audio.hit);
          this.gameScene.uiManager.updateScore(1);

          // Aggiungi punti e combo PRIMA di distruggere
          const points = this.calculatePoints(distance, hitWindow);

          this.score += points;
          this.combo++;

          //this.flashLane(lane);

          // Distruggi ombra e nota DOPO il calcolo
          if (note.shadow) note.shadow.destroy();
          note.sprite.destroy();

          this.notes.splice(i, 1);

          // Log combo 5
          if (this.combo % 5 === 0) {
            this.playComboAnimation();
            this.gameScene.audioManager.playAudio(assetConf.audio.animCombo);
            //console.log("FANTASTICO!!! 5 hit consecutivi!");
            this.resetCombo();
          }

          return;
        }
      }
    }

    // Miss
    this.resetCombo();
    //console.log("Colpo sbagliato");
  }

  private calculatePoints(distance: number, hitWindow: number): number {
    const accuracy = 1 - distance / hitWindow;
    const basePoints = 100;
    const comboMultiplier = 1 + this.combo * 0.1;

    return Math.floor(basePoints * accuracy * comboMultiplier);
  }

  private resetCombo(): void {
    this.combo = 0;
  }

  private flashLane(lane: number): void {
    const flash = this.add.graphics();

    flash.fillStyle(0xffffff, 0.5);

    const x = this.getLaneXPosition(lane, this.targetY);

    flash.fillRect(
      x - this.flashOffsetX,
      this.targetY - this.flashOffsetY,
      this.noteWidth,
      this.targetZoneHeight,
    );

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  createAnimations() {
    // Animazione COMBO
    this.anims.create({
      key: "comboAnim",
      frames: this.anims.generateFrameNumbers("animCombo", {start: 0, end: 21}),
      frameRate: 30,
      repeat: 0, // NON ripete
    });

    // Animazione MISS
    this.anims.create({
      key: "missAnim",
      frames: this.anims.generateFrameNumbers("animMiss", {start: 0, end: 21}),
      frameRate: 30,
      repeat: 0,
    });
  }

  playComboAnimation() {
    const sprite = this.add.sprite(this.scale.width / 2, this.scale.height / 2, "animCombo");

    sprite.setScale(this.gameScene.setDynamicValueBasedOnScale(0.6, 1.8));
    sprite.setDepth(9999);

    sprite.play("comboAnim");

    // quando finisce → distrugge
    sprite.on("animationcomplete", () => {
      sprite.destroy();
    });
  }

  playMissAnimation(lane: number) {
    let x = this.scale.width / 2;
    const xDistance = this.gameScene.setDynamicValueBasedOnScale(120, 300);

    if (lane <= 0)
      x -= xDistance; // lato sinistro
    else if (lane === 1)
      x += 0; // centro
    else if (lane >= 2) x += xDistance; // lato destro

    const sprite = this.add.sprite(x, this.scale.height / 2, "animMiss");

    sprite.setScale(this.gameScene.setDynamicValueBasedOnScale(0.6, 1.8));
    sprite.setDepth(9999);

    sprite.play("missAnim");

    sprite.on("animationcomplete", () => {
      sprite.destroy();
    });
  }

  // effects
  // Avvia l'animazione delle stelle nella posizione del frutto
  starsEffectAnimation(object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const {x, y} = object; // Prendi le coordinate del frutto
    const frameRate = 30;

    const newAnimation = this.#createAnimation(
      assetConf.keyAnim.animStars,
      assetConf.spritesheet.starsEffect.key,
      19,
      x,
      y,
    );

    newAnimation.setVisible(true);
    newAnimation.setScale(1);
    newAnimation.play(assetConf.keyAnim.animStars);

    // Distrugge l'animazione dopo la durata dell'animazione stessa
    this.time.delayedCall((19 / frameRate) * 1000, () => {
      newAnimation.destroy();
    });

    // metodo per creare testo +1 a caduta
    this.time.delayedCall(500, () => {
      const text = this.add.text(x, y, "+1", {
        fontFamily: "Paytone One",
        fontSize: "60px",
        color: "#ffffff",
        stroke: "#000", // imposta colore contorno
        strokeThickness: 2, // imposta spessore contorno
      });

      text.setOrigin(0.5);
      text.setScale(this.gameScene.setDynamicValueBasedOnScale(1.0, 1.7));
      text.setDepth(999); // Depth maggiore per sovrapporlo

      // Effetto "caduta" leggera
      this.tweens.add({
        targets: text,
        y: y + 40,
        alpha: 0,
        duration: 1000,
        ease: "Sine.easeIn",
        onComplete: () => {
          text.destroy();
        },
      });
    });
  }

  // Crea una nuova animazione nella scena alle coordinate date
  #createAnimation(animKey: string, spriteKey: string, frameEnd: number, x: number, y: number) {
    // Controlla se l'animazione esiste già, altrimenti la crea
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(spriteKey, {start: 0, end: frameEnd}),
        frameRate: 30,
        repeat: 0,
      });
    }

    // Crea una nuova istanza dell'animazione
    return this.add
      .sprite(x, y, spriteKey)
      .setOrigin(0.5)
      .setVisible(false)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(1.0, 2.5))
      .setDepth(999);
  }

  public pauseGame(): void {
    // Blocca la scena corrente
    this.scene.pause();
  }

  public resumeGame(): void {
    // Riattiva la scena corrente
    this.scene.resume();
  }

  checkGameOver() {
    if (this.isGameOver) {
      console.log(`GAME OVER: Score ${this.score}`);
      this.canShoot = false;
      this.scene.pause();
      this.gameScene.gameOver();
    }
  }
}
