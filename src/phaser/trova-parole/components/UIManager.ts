/* eslint-disable no-console */
import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import {TrovaParoleAssetConf} from "../shared/config/asset-conf.const";

const assetConf = TrovaParoleAssetConf; //* Generalizzazione

export class UIManager {
  private scene: Phaser.Scene;
  gameScene!: Game;

  public score = 0;
  public maxScore = 6;
  private displayedScore: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;
  ofssetY: number = 0;
  ofssetX: number = 0;
  scoreContainer!: Phaser.GameObjects.Container;

  helpUsed: number = 0;
  differenceTryLimit: number = 1; // limite massimo tasto aiuto
  public iconHelp!: Phaser.GameObjects.Image;
  private isHelpCoolingDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(): void {
    this.#createBackgroundGame();
    this.#createBackgroundLogoAndLogo();
    this.#createContainerScore();
    this.#createIconHelp();
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
      // backgroundLogo
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
      logoContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0));
      logoContainer.setScrollFactor(0);

      // IMPORTANTE: regola origine con setOrigin-like comportamento
      const safeTop = this.scene.registry.get("safeTop") || 0; //! notch Area

      logoContainer.setPosition(this.scene.scale.width / 2, 0 + safeTop); //! notch Area
    }
  }

  #createContainerScore() {
    // 1. Calcolo posizione schermo
    //* Modificare pos X (1-3)
    const centerX =
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.width - 100,
        this.scene.scale.width - 220,
      ) + this.ofssetX; //* Modificare solo questo

    //* Modificare pos Y (2-3)
    const centerY =
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.height - 75,
        this.scene.scale.height - 170,
      ) + this.ofssetY; //* Modificare solo questo

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
    this.scoreContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0)); //* Modificare valori scala (3-3)
  }

  #createIconHelp() {
    const x = this.gameScene.setDynamicValueBasedOnScale(70, 140) + this.ofssetX;

    const y =
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.height - 75,
        this.scene.scale.height - 170,
      ) + this.ofssetY;

    const scale = this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0);

    this.helpUsed = 0; // Inizializza qui
    this.isHelpCoolingDown = false; // Inizializza qui

    // === ICON BG (COOLDOWN) ===
    const iconHelpBG = this.scene.add.image(x, y, assetConf.image.iconHelpBG);

    iconHelpBG.setOrigin(0.5, 0.5).setScale(scale).setDepth(-1).setVisible(false);

    // === GRAPHICS PER MASK ===
    const maskGraphics = this.scene.add.graphics();

    maskGraphics.setVisible(false);

    const mask = maskGraphics.createGeometryMask();

    iconHelpBG.setMask(mask);

    // === ICON HELP ===
    const iconHelp = this.scene.add.image(x, y, assetConf.image.iconHelp);

    iconHelp.setOrigin(0.5, 0.5).setScale(scale).setDepth(0).setInteractive({useHandCursor: true});

    this.iconHelp = iconHelp;

    // Centro reale per la mask
    const getCenter = () => ({
      cx: iconHelp.x,
      cy: iconHelp.y,
      r: Math.min(iconHelp.displayWidth, iconHelp.displayHeight) * 0.5,
    });

    iconHelp.on("pointerdown", () => {
      if (this.isHelpCoolingDown) return;
      if (this.helpUsed >= 6) return;

      console.log("Clicked Icon Help: ", this.helpUsed);

      this.helpUsed++;

      this.gameScene.audioManager.playAudio(assetConf.audio.help);
      this.gameScene.gameManager.useHint();

      this.isHelpCoolingDown = true;

      iconHelp.disableInteractive();
      iconHelp.setAlpha(0.6);
      iconHelp.setTint(0x999999);

      if (this.helpUsed > 5) return;

      iconHelpBG.setVisible(true);
      maskGraphics.clear();

      const cooldownDuration = 20000;
      const progress = {angle: 0};

      const {cx, cy, r} = getCenter();

      this.scene.tweens.add({
        targets: progress,
        angle: 360,
        duration: cooldownDuration,
        ease: "Linear",
        onUpdate: () => {
          maskGraphics.clear();
          maskGraphics.fillStyle(0xffffff, 1);

          maskGraphics.beginPath();
          maskGraphics.moveTo(cx, cy);
          maskGraphics.arc(
            cx,
            cy,
            r,
            Phaser.Math.DegToRad(-90),
            Phaser.Math.DegToRad(progress.angle - 90),
            false,
          );
          maskGraphics.closePath();
          maskGraphics.fillPath();
        },
        onComplete: () => {
          maskGraphics.clear();
          iconHelpBG.setVisible(false);

          this.isHelpCoolingDown = false;

          iconHelp.clearTint();
          iconHelp.setAlpha(1);
          iconHelp.setInteractive({useHandCursor: true});
        },
      });
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

    this.scene.time.addEvent({
      delay: timeDelay,
      repeat: repeatCount - 1,
      callback: () => {
        this.displayedScore += increment;
        this.scoreText.setText(`${this.displayedScore.toString()} / ${this.maxScore}`);

        // Reset scala prima del tween per evitare accumulo
        this.scoreText.setScale(1.3);

        this.scene.tweens.add({
          targets: this.scoreText,
          scale: {from: 1.3, to: 1.6},
          duration: timeDelay * 2,
          ease: "Quad.easeOut",
          yoyo: true,
        });

        steps++;
        if (steps >= repeatCount) {
          // Aggiorna il registry con il punteggio finale
          this.scene.registry.set(assetConf.registry.score, finalScore);

          // Assicura la scala originale alla fine
          this.scoreText.setScale(1.3);

          // Controllo fine partita
          if (this.score >= this.maxScore) {
            this.gameScene.gameOver();
            console.log("Hai vinto!");
          }
          //console.log("egistry.score: ", this.scene.registry.get(assetConf.registry.score));
        }
      },
    });
  }
}
