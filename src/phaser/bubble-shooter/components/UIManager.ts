
import * as Phaser from "phaser";
 
import {Game} from "../scenes/game";
import {BubbleShooterAssetConf} from "../shared/config/asset-conf.const";
 
export class UIManager {
  private scene: Phaser.Scene;
  gameScene!: Game;
 
  public score = 0;
  public maxScore = 10;
  private displayedScore: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;
 
  ofssetY: number = 0;
  ofssetX: number = 0;
 
  scoreContainer: Phaser.GameObjects.Container | undefined;
 
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
 
    //* Container Score
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
      .image(0, 0, BubbleShooterAssetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);
 
    // 4. Icona punteggio (a sinistra rispetto al centro)
    const iconScore = this.scene.add
      .image(-90, 0, BubbleShooterAssetConf.image.iconScore)
      .setOrigin(0.5)
      .setScale(0.8); //! modificato valore manualmente, troppo grande
 
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
          this.scene.registry.set(BubbleShooterAssetConf.registry.score, finalScore);
 
          // Assicura la scala originale alla fine
          this.scoreText.setScale(1.3);
 
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
 
 