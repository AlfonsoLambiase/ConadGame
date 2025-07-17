
import * as Phaser from "phaser";

import {Game} from "../scenes/game";

import {BubbleShooterAssetConf} from "@/phaser/bubble-shooter/shared/config/asset-conf.const";

export class UIManager {
  private scene: Phaser.Scene;
  gameScene!: Game;

  public score = 0;
  public maxScore = 10;
  private displayedScore: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;

  ofssetY: number = 200;
  ofssetX: number = 0;

  helpUsed: number = 0;
  differenceTryLimit: number = 1; // limite massimo tasto aiuto

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(): void {
    //* backgroundGame: copre l'intera area di gioco.
    const backgroundGame = this.scene.add.image(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      BubbleShooterAssetConf.image.backgroundGame,
    );

    backgroundGame
      .setDepth(-3)
      .setScrollFactor(0)
      .setDisplaySize(this.scene.scale.width, this.scene.scale.height);

    //* backgroundLogo
    const bgLogo = this.scene.add.image(
      this.scene.scale.width / 2,
      0,
      BubbleShooterAssetConf.image.backgroundLogo,
    );

    bgLogo
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(-2)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0));

    //* logo
    const logo = this.scene.add.image(
      this.scene.scale.width / 2,
      0,
      BubbleShooterAssetConf.image.logo,
    );

    logo
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(-1)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0));

    //* scoreText
    this.scoreText = this.scene.add.text(
      this.gameScene.setDynamicValueBasedOnScale(140, 230) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(-80, 115) + this.ofssetY,
      `${this.score} / ${this.maxScore}`,
      {
        fontFamily: "Paytone One",
        fontSize: "48px",
        color: "#000000",
      },
    );
    this.scoreText
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.7, 1.2));

    this.originalScale = this.scoreText.scale;

    //* iconScore
    const iconScore = this.scene.add.image(
      this.gameScene.setDynamicValueBasedOnScale(50, 80) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(-75, 110) + this.ofssetY,
      BubbleShooterAssetConf.image.iconScore,
    );

    iconScore
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));

    //! nuovo
    //* backgroundScore
    const backgroundScore = this.scene.add.image(
      this.gameScene.setDynamicValueBasedOnScale(125, 175) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(-75, 110) + this.ofssetY,
      BubbleShooterAssetConf.image.backgroundScore,
    );

    backgroundScore
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(0)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.8, 1.4));

    //* iconHelp
    const iconHelp = this.scene.add.image(
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.width - 20,
        this.scene.scale.width - 50,
      ) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(-75, 110) + this.ofssetY,
      BubbleShooterAssetConf.image.iconHelp,
    );

    iconHelp.setOrigin(1, 0.5);
    iconHelp.setDepth(0);
    iconHelp.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
    iconHelp.setInteractive();

    this.helpUsed = 0; // Inizializza contatore usi aiuto (può essere globale nella scena)

    iconHelp.on("pointerdown", () => {
      if (this.helpUsed >= this.differenceTryLimit) return;

      if (
        !this.gameScene.bottleSortPuzzleManager.isAnimating &&
        !this.gameScene.bottleSortPuzzleManager.isActiveBottle
      ) {
        console.log("iconHelp clicked");

        this.helpUsed++;

        if (this.helpUsed === this.differenceTryLimit) {
          iconHelp.disableInteractive();
          iconHelp.setAlpha(0.7); // rende il bottone trasparente
          iconHelp.setTint(0x999999); // aggiunge un effetto "grigio spento"
        }

        this.gameScene.bottleSortPuzzleManager.setAddExtraBottle();
      }
    });
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
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
        this.scoreText.setScale(this.originalScale);

        this.scene.tweens.add({
          targets: this.scoreText,
          scale: {from: this.originalScale, to: this.originalScale * 1.3},
          duration: timeDelay * 2,
          ease: "Quad.easeOut",
          yoyo: true,
        });

        steps++;
        if (steps >= repeatCount) {
          // Aggiorna il registry con il punteggio finale
          this.scene.registry.set(BubbleShooterAssetConf.registry.score, finalScore);

          // Assicura la scala originale alla fine
          this.scoreText.setScale(this.originalScale);

          // Controllo fine partita
          if (this.score >= this.maxScore) {
            this.gameScene.gameOver();
            console.log("Hai vinto!");
          }

          //console.log("egistry.score: ", this.scene.registry.get(GameDemo02AssetConf.registry.score));
        }
      },
    });
  }
}
