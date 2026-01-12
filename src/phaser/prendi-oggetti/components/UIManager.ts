
import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import {PrendiOggettiAssetConf} from "../shared/config/asset-conf.const";

const assetConf = PrendiOggettiAssetConf;

export class UIManager extends Phaser.Scene {
  gameScene!: Game;

  public score = 0;
  public maxScore = 30;
  private displayedScore: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;
  ofssetY: number = 0;
  ofssetX: number = 0;
  scoreContainer!: Phaser.GameObjects.Container;

  helpUsed: number = 0;
  differenceTryLimit: number = 1;
  public iconHelp!: Phaser.GameObjects.Image;

  private livesImages: Phaser.GameObjects.Sprite[] = [];
  private lives: number = 3;
  private livesImageSpacing: number = 110; // Spazio tra le icone delle vite

  constructor() {
    super({key: assetConf.scene.uiManager});
  }

  init(data: {gameScene: Game}) {
    this.gameScene = data.gameScene;
  }

  create() {
    // IMPORTANTE: Chiama createUI qui!
    this.createUI();
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  createUI(): void {
    this.#createBackgroundLogoAndLogo();
    this.#createContainerScore();
    //this.#createIconHelp();
    this.#createLives();
  }

  #createBackgroundLogoAndLogo() {
    // Leggi il valore dal registry - for backgrounLogo and logo
    const sponsorLogo = this.registry.get("sponsorLogo");

    if (sponsorLogo !== "empty") {
      // backgroundLogo
      const bgLogo = this.add.image(0, 0, assetConf.image.backgroundLogo);

      bgLogo.setOrigin(0.5, 0); // centro in alto

      // logo
      const logo = this.add.image(0, 0, "logo");

      logo.setOrigin(0.5, 0.5).setScale(1.0); // centro pieno

      // Posiziona il logo al centro del bgLogo
      logo.y = bgLogo.height / 2;

      // Crea il container con bgLogo e logo
      const logoContainer = this.add.container(this.scale.width / 2, 0, [bgLogo, logo]);

      // Imposta origine del container (pivot) al centro in alto
      logoContainer.setSize(bgLogo.width, bgLogo.height);
      logoContainer.setDepth(-2); // oppure quello che ti serve
      logoContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0));
      logoContainer.setScrollFactor(0);

      // IMPORTANTE: regola origine con setOrigin-like comportamento
      const safeTop = this.registry.get("safeTop") || 0; //! notch Area

      logoContainer.setPosition(this.scale.width / 2, 0 + safeTop); //! notch Area
    }
  }

  #createContainerScore() {
    // 1. Calcolo posizione schermo
    //* Modificare pos X (1-3)
    const width = 0;
    const centerX = width + this.gameScene.setDynamicValueBasedOnScale(80, 200); //* Modificare solo questo

    //* Modificare pos Y (2-3)
    const height = 0;
    const centerY = height + this.gameScene.setDynamicValueBasedOnScale(170, 330); //* Modificare solo questo

    // 2. Creazione container centrato nello schermo
    this.scoreContainer = this.add.container(centerX, centerY);
    this.scoreContainer.setScrollFactor(0).setDepth(10);

    // 3. Creazione background centrato (0,0 perché è il centro del container)
    const backgroundScore = this.add
      .image(0, 0, assetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);

    // 4. Icona punteggio (a sinistra rispetto al centro)
    const iconScore = this.add
      .image(-90, 0, assetConf.image.iconScore)
      .setOrigin(0.5)
      .setScale(0.8);

    // 5. Testo punteggio (a destra rispetto al centro)
    this.scoreText = this.add
      .text(
        60, // offset a destra
        0,
        `${this.score} / ${this.maxScore}`,
        {
          fontFamily: "Paytone One",
          fontSize: "48px",
          color: "#000000",
        },
      )
      .setOrigin(0.5)
      .setScale(1.3);

    // 6. Aggiungo tutti gli elementi al container
    this.scoreContainer.add([backgroundScore, iconScore, this.scoreText]);

    // 7. Scala del container (così tutto si ridimensiona proporzionalmente)
    this.scoreContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 0.8)); //* Modificare valori scala (3-3)
  }

  #createIconHelp() {
    //* iconHelp
    const iconHelp = this.add.image(
      this.gameScene.setDynamicValueBasedOnScale(20, 50) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(this.scale.height - 75, this.scale.height - 170) +
        this.ofssetY,
      assetConf.image.iconHelp,
    );

    iconHelp.setOrigin(0, 0.5);
    iconHelp.setDepth(0);
    iconHelp.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
    iconHelp.setInteractive();
    this.iconHelp = iconHelp;
    this.iconHelp.setPosition(iconHelp.x, iconHelp.y);

    this.helpUsed = 0;

    iconHelp.on("pointerdown", () => {
      if (this.helpUsed >= this.differenceTryLimit) return;

      console.log("iconHelp clicked, aggiungere: audio e metodo di cosa deve fare");

      this.helpUsed++;

      if (this.helpUsed === this.differenceTryLimit) {
        iconHelp.disableInteractive();
        iconHelp.setAlpha(0.59);
        iconHelp.setTint(0x999999);
      }
    });
  }

  //* Scopo: Aggiunge punti al punteggio totale in base al numero di bolle scoppiate.
  updateScore(points: number) {
    const increment = 1;
    const repeatCount = points;
    const finalScore = this.score + points;

    this.score = finalScore;

    let steps = 0;
    const timeDelay = 50;

    this.time.addEvent({
      delay: timeDelay,
      repeat: repeatCount - 1,
      callback: () => {
        this.displayedScore += increment;
        this.scoreText.setText(`${this.displayedScore.toString()} / ${this.maxScore}`);

        // Reset scala prima del tween per evitare accumulo
        this.scoreText.setScale(1.3);

        this.tweens.add({
          targets: this.scoreText,
          scale: {from: 1.3, to: 1.6},
          duration: timeDelay * 2,
          ease: "Quad.easeOut",
          yoyo: true,
        });

        steps++;
        if (steps >= repeatCount) {
          // Aggiorna il registry con il punteggio finale
          this.registry.set(assetConf.registry.score, finalScore);

          // Assicura la scala originale alla fine
          this.scoreText.setScale(1.3);

          // Controllo fine partita
          if (this.score >= this.maxScore) {
            this.score = this.maxScore;
            this.gameScene.gameManager.disableGameInput();
            this.gameScene.gameOver();
          }
          //console.log("egistry.score: ", this.scene.registry.get(assetConf.registry.score));
        }
      },
    });
  }

  // Inizializza le immagini delle vite
  #createLives(): void {
    this.anims.create({
      key: "animLiveDestroy",
      frames: this.anims.generateFrameNumbers("animLive", {start: 0, end: 26}),
      frameRate: 30,
      repeat: 0,
    });

    const width = this.scale.width;
    const offsetX = this.gameScene.setDynamicValueBasedOnScale(150, 350);
    const baseX = width - offsetX;

    const height = 0;
    const offsetY = this.gameScene.setDynamicValueBasedOnScale(150, 350) + 70;
    const baseY = height + offsetY;

    const spacingScale = this.gameScene.setDynamicValueBasedOnScale(0.5, 1);

    // Svuota immagini precedenti
    this.livesImages.forEach((img) => img.destroy());
    this.livesImages = [];

    for (let i = 0; i < this.lives; i++) {
      const lifeSprite = this.add
        .sprite(
          baseX + i * this.livesImageSpacing * spacingScale,
          baseY,
          "animLive",
          0, // frame iniziale
        )
        .setScale(this.gameScene.setDynamicValueBasedOnScale(0.6, 1.2))
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.livesImages.push(lifeSprite);
    }
  }

  #updateLives(decrement: number = 1): number {
    this.lives -= decrement;

    for (let i = 0; i < decrement; i++) {
      const lifeSprite = this.livesImages[i];

      if (lifeSprite) {
        lifeSprite.anims.play("animLiveDestroy");

        lifeSprite.once("animationcomplete", () => {
          lifeSprite.destroy();
        });
      }
    }

    // Rimuove le vite eliminate dall’inizio dell’array
    this.livesImages = this.livesImages.slice(decrement);

    return this.lives;
  }

  updateLives(): void {
    const newLives = this.#updateLives();

    this.lives = newLives;
    if (this.lives <= 0) {
      this.gameScene.gameOver();
    }
  }
}
