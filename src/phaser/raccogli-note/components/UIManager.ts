
import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import {RaccogliNoteAssetConf} from "../shared/config/asset-conf.const";

const assetConf = RaccogliNoteAssetConf; //* Generalizzazione

export class UIManager {
  private scene: Phaser.Scene;
  gameScene!: Game;

  public score = 0;
  public maxScore = 30;
  private displayedScore: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;

  ofssetY: number = 120;
  ofssetX: number = -30;

  scoreContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(): void {
    //* Spostato nella scena raccogli note manager.
    //* backgroundGame: copre l'intera area di gioco.
    // const backgroundGame = this.scene.add.image(
    //   this.scene.scale.width / 2,
    //   this.scene.scale.height / 2,
    //   assetConf.image.backgroundGame,
    // );

    // backgroundGame
    //   .setDepth(-3)
    //   .setScrollFactor(0)
    //   .setDisplaySize(this.scene.scale.width, this.scene.scale.height);

    // Leggi il valore dal registry - for backgrounLogo and logo
    const sponsorLogo = this.scene.registry.get("sponsorLogo");

    if (sponsorLogo !== "empty") {
      // backgroundLogo
      const bgLogo = this.scene.add.image(0, 0, assetConf.image.backgroundLogo);

      bgLogo.setOrigin(0.5, 0); // centro in alto

      // logo
      const logo = this.scene.add.image(0, 0, "logo");

      logo.setOrigin(0.5, 0.5).setScale(1.25); // centro pieno

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
      logoContainer.setPosition(this.scene.scale.width / 2, 0);
    }

    //* Container Score
    // 1. Calcolo posizione schermo
    //* Modificare pos X (1-3)
    const centerX = this.gameScene.setDynamicValueBasedOnScale(100, 220) + this.ofssetX; //* Modificare solo questo

    //* Modificare pos Y (2-3)
    const centerY = this.gameScene.setDynamicValueBasedOnScale(75, 170) + this.ofssetY; //* Modificare solo questo

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
      .image(-100, 0, assetConf.image.iconScore)
      .setOrigin(0.5)
      .setScale(0.8); //! modificato valore manualmente, troppo grande

    // 5. Testo punteggio (a destra rispetto al centro)
    this.scoreText = this.scene.add
      .text(
        50, // offset a destra
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

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  //* Scopo: Aggiunge punti al punteggio totale in base al numero di bolle scoppiate.
  // updateScore(points: number) {
  //   const increment = 1;
  //   const repeatCount = points;
  //   const finalScore = this.score + points;

  //   this.score = finalScore;

  //   let steps = 0;
  //   const timeDelay = 50;

  //   this.scene.time.addEvent({
  //     delay: timeDelay,
  //     repeat: repeatCount - 1,
  //     callback: () => {
  //       this.displayedScore += increment;
  //       this.scoreText.setText(`${this.displayedScore.toString()} / ${this.maxScore}`);

  //       // Reset scala prima del tween per evitare accumulo
  //       this.scoreText.setScale(1.3);

  //       this.scene.tweens.add({
  //         targets: this.scoreText,
  //         scale: {from: 1.3, to: 1.6},
  //         duration: timeDelay * 2,
  //         ease: "Quad.easeOut",
  //         yoyo: true,
  //       });

  //       steps++;
  //       if (steps >= repeatCount) {
  //         // Aggiorna il registry con il punteggio finale
  //         this.scene.registry.set(assetConf.registry.score, finalScore);

  //         // Assicura la scala originale alla fine
  //         this.scoreText.setScale(1.3);

  //         // Controllo fine partita
  //         if (this.score >= this.maxScore) {
  //           this.gameScene.gameOver();
  //           console.log("Hai vinto!");
  //         }

  //         //console.log("egistry.score: ", this.scene.registry.get(GameDemo02AssetConf.registry.score));
  //       }
  //     },
  //   });
  // }
  updateScore(points: number) {
    const increment = points > 0 ? 1 : -1; // direzione
    const repeatCount = Math.abs(points); // sempre positivo
    const finalScore = Math.max(0, this.score + points); // non sotto zero

    this.score = finalScore;

    let steps = 0;
    const timeDelay = 50;

    this.scene.time.addEvent({
      delay: timeDelay,
      repeat: repeatCount - 1,
      callback: () => {
        this.displayedScore = Math.max(0, this.displayedScore + increment); // non sotto zero
        this.scoreText.setText(`${this.displayedScore.toString()} / ${this.maxScore}`);

        // Tween per effetto di scala
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
          this.scene.registry.set(assetConf.registry.score, finalScore);
          this.scoreText.setScale(1.3);

          if (this.score >= this.maxScore) {
            this.gameScene.gameOver();
            console.log("Hai vinto!");
          }
        }
      },
    });
  }
}
