/* eslint-disable no-console */
import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import {Puzzle2026AssetConf} from "../shared/config/asset-conf.const";

const assetConf = Puzzle2026AssetConf; //* Generalizzazione

export class UIManager {
  private scene: Phaser.Scene;
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
  differenceTryLimit: number = 1; // limite massimo tasto aiuto
  public iconHelp!: Phaser.GameObjects.Image;

  //private imgLive!: Phaser.GameObjects.Image;
  private livesImages: Phaser.GameObjects.Image[] = [];
  private lives: number = 3;
  private livesImageSpacing: number = 110; // Spazio tra le icone delle vite

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(): void {
    this.#createBackgroundGame();
    this.#createBackgroundLogoAndLogo();
    this.#createContainerScore();
    this.#createIconHelp();
    this.#createLives();
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  #createBackgroundGame() {
    const backgroundGame = this.scene.add.image(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      assetConf.image.backgroundGame,
    );

    backgroundGame
      .setDepth(-3)
      .setScrollFactor(0)
      .setDisplaySize(this.scene.scale.width, this.scene.scale.height);
  }

  #createBackgroundLogoAndLogo() {
    // Leggi il valore dal registry - for backgrounLogo and logo
    const sponsorLogo = this.scene.registry.get("sponsorLogo");

    if (sponsorLogo !== "empty") {
      const safeTop = this.scene.registry.get("safeTop") || 0; //! notch Area
      const dynamicScale = this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0);

      // AGGIUNTA:
      // Se c'è notch, crea un bgLogo extra per riempire lo spazio sopra
      if (safeTop > 0) {
        const bgLogoTopFill = this.scene.add.image(
          this.scene.scale.width / 2,
          0,
          assetConf.image.backgroundLogo,
        );

        bgLogoTopFill.setOrigin(0.5, 0);
        bgLogoTopFill.setScale(dynamicScale);
        bgLogoTopFill.setDepth(-3); // dietro al container principale
        bgLogoTopFill.setScrollFactor(0);
      }

      // backgroundLogo principale
      const bgLogo = this.scene.add.image(0, 0, assetConf.image.backgroundLogo);

      bgLogo.setOrigin(0.5, 0); // centro in alto

      // logo
      const logo = this.scene.add.image(0, 0, "logo");

      logo.setOrigin(0.5, 0.5).setScale(1.0); // centro pieno

      // Posiziona il logo al centro del bgLogo
      logo.y = bgLogo.height / 2;

      // Crea il container con bgLogo e logo
      const logoContainer = this.scene.add.container(this.scene.scale.width / 2, 0, [bgLogo, logo]);

      // Imposta origine del container (pivot) al centro in alto
      logoContainer.setSize(bgLogo.width, bgLogo.height);
      logoContainer.setDepth(-2); // oppure quello che ti serve
      logoContainer.setScale(dynamicScale);
      logoContainer.setScrollFactor(0);

      // IMPORTANTE: regola origine con setOrigin-like comportamento
      logoContainer.setPosition(this.scene.scale.width / 2, safeTop); //! notch Area
    }
  }

  #createContainerScore() {
    const safeTop = this.scene.registry.get("safeTop") || 0; //! notch Area

    // 1. Calcolo posizione schermo
    //* Modificare pos X (1-3)
    const width = 0;
    const centerX = width + this.gameScene.setDynamicValueBasedOnScale(80, 200); //* Modificare solo questo

    //* Modificare pos Y (2-3)
    const height = 0;
    const centerY = height + this.gameScene.setDynamicValueBasedOnScale(170, 330) + safeTop; //* notch Area

    // 2. Creazione container centrato nello schermo
    this.scoreContainer = this.scene.add.container(centerX, centerY);
    this.scoreContainer.setScrollFactor(0).setDepth(10);

    // 3. Creazione background centrato (0,0 perché è il centro del container)
    const backgroundScore = this.scene.add
      .image(0, 0, assetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);

    // 4. Icona punteggio (a sinistra rispetto al centro)
    const iconScore = this.scene.add
      .image(-90, 0, assetConf.image.iconScore)
      .setOrigin(0.5)
      .setScale(0.8);

    // 5. Testo punteggio (a destra rispetto al centro)
    this.scoreText = this.scene.add
      .text(60, 0, `${this.score} / ${this.maxScore}`, {
        fontFamily: "Paytone One",
        fontSize: "48px",
        color: "#000000",
      })
      .setOrigin(0.5)
      .setScale(1.3);

    // 6. Aggiungo tutti gli elementi al container
    this.scoreContainer.add([backgroundScore, iconScore, this.scoreText]);

    // 7. Scala del container
    this.scoreContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 0.8)); //* Modificare valori scala (3-3)
  }

  #createIconHelp() {
    //* iconHelp
    const iconHelp = this.scene.add.image(
      this.gameScene.setDynamicValueBasedOnScale(20, 50) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.height - 75,
        this.scene.scale.height - 170,
      ) + this.ofssetY,
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

  //* Scopo: Aggiunge punti al punteggio totale senza superare maxScore
  updateScore(points: number) {
    const increment = 1;
    const timeDelay = 50;

    const previousScore = this.score;

    // CLAMP del punteggio finale
    const finalScore = Math.min(this.score + points, this.maxScore);

    // Punti reali da animare
    const delta = finalScore - previousScore;

    // Se non ci sono punti da aggiungere, esci
    if (delta <= 0) return;

    this.score = finalScore;

    let steps = 0;

    this.scene.time.addEvent({
      delay: timeDelay,
      repeat: delta - 1,
      callback: () => {
        this.displayedScore += increment;

        // Sicurezza extra lato UI
        if (this.displayedScore > this.maxScore) {
          this.displayedScore = this.maxScore;
        }

        this.scoreText.setText(`${this.displayedScore} / ${this.maxScore}`);

        // Reset scala prima del tween
        this.scoreText.setScale(1.3);

        this.scene.tweens.add({
          targets: this.scoreText,
          scale: {from: 1.3, to: 1.6},
          duration: timeDelay * 2,
          ease: "Quad.easeOut",
          yoyo: true,
        });

        steps++;

        if (steps >= delta) {
          // Registry sempre coerente
          this.scene.registry.set(assetConf.registry.score, this.score);

          this.scoreText.setScale(1.3);

          // Fine partita
          if (this.score >= this.maxScore) {
            this.score = this.maxScore;
            this.gameScene.gameOver();
          }
        }
      },
    });
  }

  // Inizializza le immagini delle vite
  #createLives(): void {
    const safeTop = this.scene.registry.get("safeTop") || 0; //! notch Area

    this.scene.anims.create({
      key: "animLiveDestroy",
      frames: this.scene.anims.generateFrameNumbers("animLive", {start: 0, end: 26}),
      frameRate: 30,
      repeat: 0,
    });

    const width = this.scene.scale.width;
    const offsetX = this.gameScene.setDynamicValueBasedOnScale(150, 350);
    const baseX = width - offsetX;

    const height = 0;
    const offsetY = this.gameScene.setDynamicValueBasedOnScale(150, 350) + 70;
    const baseY = height + offsetY + safeTop; //! notch Area

    const spacingScale = this.gameScene.setDynamicValueBasedOnScale(0.5, 1);

    // Svuota immagini precedenti
    this.livesImages.forEach((img) => img.destroy());
    this.livesImages = [];

    for (let i = 0; i < this.lives; i++) {
      const lifeSprite = this.scene.add
        .sprite(baseX + i * this.livesImageSpacing * spacingScale, baseY, "animLive", 0)
        .setScale(this.gameScene.setDynamicValueBasedOnScale(0.6, 1.2))
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.livesImages.push(lifeSprite);
    }
  }

  // Aggiorna la visualizzazione delle vite
  #updateLives(decrement: number = 1): number {
    this.lives -= decrement;

    const total = this.livesImages.length;

    for (let i = 0; i < total; i++) {
      const leftIndex = total - 1 - i;

      if (i < this.lives) {
        this.livesImages[leftIndex].setVisible(true);
      } else {
        this.livesImages[leftIndex].setVisible(false);
      }
    }

    return this.lives;
  }

  updateLives(): void {
    const newLives = this.#updateLives();

    this.lives = newLives;
    if (this.lives <= 0) {
      this.gameScene.gameOver();
    }
    //this.gameScene.audioManager.playAudio(assetConf.audio.bomb);
  }
}
