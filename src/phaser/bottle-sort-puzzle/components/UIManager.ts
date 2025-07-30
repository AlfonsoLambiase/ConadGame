import * as Phaser from "phaser";
 
import {Game} from "../scenes/game";
import {BottleSortPuzzleAssetConf} from "../shared/config/asset-conf.const";
 
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
 
  helpUsed: number = 0;
  differenceTryLimit: number = 1; // limite massimo tasto aiuto
 
  private iconHelpHighlight!: Phaser.GameObjects.Image;
  public iconHelp!: Phaser.GameObjects.Image;
  private handIndicator!: Phaser.GameObjects.Image;
  private arrowBaseScale: number = 1;
 
  private helpHighlightTimer: Phaser.Time.TimerEvent | null = null;
  private isIconHelpUsed: boolean = false;
 
  scoreContainer: Phaser.GameObjects.Container | null = null;
 
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
 
  createUI(): void {
    //* backgroundGame: copre l'intera area di gioco.
    const backgroundGame = this.scene.add.image(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      BottleSortPuzzleAssetConf.image.backgroundGame,
    );
 
    backgroundGame
      .setDepth(-3)
      .setScrollFactor(0)
      .setDisplaySize(this.scene.scale.width, this.scene.scale.height);
 
    //* backgroundLogo
    const bgLogo = this.scene.add.image(
      this.scene.scale.width / 2,
      0,
      BottleSortPuzzleAssetConf.image.backgroundLogo,
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
      BottleSortPuzzleAssetConf.image.logo,
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
      ) + this.ofssetX;
 
    //* Modificare pos Y (2-3)
    const centerY =
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.height - 75,
        this.scene.scale.height - 170,
      ) + this.ofssetY;
 
    // 2. Creazione container centrato nello schermo
    this.scoreContainer = this.scene.add.container(centerX, centerY);
    this.scoreContainer.setScrollFactor(0).setDepth(10);
 
    // 3. Creazione background centrato (0,0 perché è il centro del container)
    const backgroundScore = this.scene.add
      .image(0, 0, BottleSortPuzzleAssetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);
 
    // 4. Icona punteggio (a sinistra rispetto al centro)
    const iconScore = this.scene.add
      .image(-90, 0, BottleSortPuzzleAssetConf.image.iconScore)
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
 
    // 7. Scala del container
    this.scoreContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0)); //* Modificare valori scala (3-3)
 
    //* iconHelp
    const iconHelp = this.scene.add.image(
      this.gameScene.setDynamicValueBasedOnScale(20, 50) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.height - 75,
        this.scene.scale.height - 170,
      ) + this.ofssetY,
      BottleSortPuzzleAssetConf.image.iconHelp,
    );
 
    iconHelp.setOrigin(0, 0.5);
    iconHelp.setDepth(0);
    iconHelp.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
    iconHelp.setInteractive();
    this.iconHelp = iconHelp; // <-- NEW
    this.iconHelp.setPosition(iconHelp.x, iconHelp.y);
 
    //* iconHelpHighlight - stesso posizionamento e scala
    const iconHelpHighlight = this.scene.add.image(
      this.gameScene.setDynamicValueBasedOnScale(20, 50) + this.ofssetX,
      this.gameScene.setDynamicValueBasedOnScale(
        this.scene.scale.height - 75,
        this.scene.scale.height - 170,
      ) + this.ofssetY,
      BottleSortPuzzleAssetConf.image.iconHelpHighlight,
    );
 
    iconHelpHighlight.setOrigin(0, 0.5);
    iconHelpHighlight.setDepth(1); // Sopra iconHelp
    iconHelpHighlight.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0));
    iconHelpHighlight.setVisible(false);
 
    this.iconHelpHighlight = iconHelpHighlight;
    this.helpHighlightTimer = null;
    this.helpUsed = 0;
 
    // handIndicator (png) 100px a destra di iconHelp
    const arrowBaseScale = this.gameScene.setDynamicValueBasedOnScale(0.5, 1.0);
 
    this.arrowBaseScale = arrowBaseScale;
 
    //Crea animazione solo se non esiste già
    if (!this.scene.anims.exists(BottleSortPuzzleAssetConf.keyAnim.animHandIndicator)) {
      this.scene.anims.create({
        key: BottleSortPuzzleAssetConf.keyAnim.animHandIndicator,
        frames: this.scene.anims.generateFrameNumbers(
          BottleSortPuzzleAssetConf.spritesheet.handIndicator.key,
          {
            start: 0,
            end: 22,
          },
        ),
        frameRate: 15,
        repeat: -1,
      });
    }
 
    const handIndicator = this.scene.add.sprite(
      iconHelp.x + iconHelp.displayWidth + this.gameScene.setDynamicValueBasedOnScale(100, 200),
      iconHelp.y,
      BottleSortPuzzleAssetConf.spritesheet.handIndicator.key,
    );
 
    handIndicator.setOrigin(0.5).setDepth(2).setScale(arrowBaseScale).setVisible(false);
 
    this.handIndicator = handIndicator; // sprite
 
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
          iconHelp.setAlpha(0.7);
          iconHelp.setTint(0x999999);
        }
 
        this.gameScene.bottleSortPuzzleManager.setAddExtraBottle();
 
        this.stopHelpHighlight();
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
          this.scene.registry.set(BottleSortPuzzleAssetConf.registry.score, finalScore);
 
          this.scoreText.setScale(1.3);
 
          if (this.score >= this.maxScore) {
            this.gameScene.gameOver();
            console.log("Hai vinto!");
          }
 
          //console.log("egistry.score: ", this.scene.registry.get(GameDemo02AssetConf.registry.score));
        }
      },
    });
  }
 
  //* Scopo: Metodo per attivare l'animazione di highlight
  public startHelpHighlight(): void {
    if (this.helpHighlightTimer) return; // Evita timer multipli
    if (this.isIconHelpUsed) return;
 
    this.isIconHelpUsed = true;
 
    // Blink dell'icona highlight (come prima)
    this.helpHighlightTimer = this.scene.time.addEvent({
      delay: 200, // 0.2 secondi
      callback: () => {
        this.iconHelpHighlight.setVisible(!this.iconHelpHighlight.visible);
      },
      loop: true,
    });
 
    // --- NEW: mostra e anima handIndicator ---
    this.showHandIndicator();
  }
 
  //* Scopo: Metodo per disattivare l'animazione di highlight
  public stopHelpHighlight(): void {
    if (this.helpHighlightTimer) {
      this.helpHighlightTimer.destroy();
      this.helpHighlightTimer = null;
    }
    this.iconHelpHighlight.setVisible(false);
 
    // --- NEW: ferma e nasconde handIndicator ---
    this.hideHandIndicator();
  }
 
  // Gestione handIndicator
  private showHandIndicator(): void {
    if (!this.handIndicator) return;
 
    this.repositionHandIndicator();
 
    const sprite = this.handIndicator as Phaser.GameObjects.Sprite;
 
    sprite.setVisible(true);
    sprite.setScale(this.arrowBaseScale);
    sprite.play(BottleSortPuzzleAssetConf.keyAnim.animHandIndicator, true); // avvia animazione
  }
 
  private hideHandIndicator(): void {
    if (!this.handIndicator) return;
 
    const sprite = this.handIndicator as Phaser.GameObjects.Sprite;
 
    sprite.stop();
    sprite.setVisible(false);
    sprite.setScale(this.arrowBaseScale);
  }
 
  private repositionHandIndicator(): void {
    if (!this.handIndicator || !this.iconHelp) return;
    // Mantieni offset 100px a destra del bordo destro (displayWidth già scalato)
    const newX =
      this.iconHelp.x +
      this.iconHelp.displayWidth +
      this.gameScene.setDynamicValueBasedOnScale(100, 200);
 
    this.handIndicator.setPosition(newX, this.iconHelp.y);
  }
}
 