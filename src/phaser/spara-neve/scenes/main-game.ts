import * as Phaser from "phaser";

import Track from "../components/track";
import Player from "../components/player";
import {GameSparaNeveAssetConf} from "../shared/config/asset-conf.const";
//import {addScreenZones} from "../shared/utils/mobile-controls";

import {Game} from "./game";

const assetConf = GameSparaNeveAssetConf; //* Generalizzazione

export default class MainGame extends Phaser.Scene {
  private player!: Player;
  public tracks!: Track[];

  private score: number = 0;
  private highscore: number = 0;
  private infoPanel!: Phaser.GameObjects.Image;

  gameScene!: Game;

  public enemies!: Phaser.GameObjects.Group;

  // 🆕 Aggiungi questo flag
  public isGameOver: boolean = false;

  constructor() {
    super({key: assetConf.scene.mainGame});
  }

  init() {
    //! Metodo per assegnare direttamente riferimento alla scena Game con registry 2/2
    this.gameScene = this.registry.get("gameSnowmanInstance") as Game;
  }

  create(): void {
    console.log("Start MainGame");

    //! Disattivata gravita in tutto il gioco
    this.physics.world.gravity.y = 0;

    this.score = 0;
    this.highscore = this.registry.get("highscore") ?? 0;

    this.enemies = this.add.group();

    this.generateGame();

    //* Disattivato inizio con schermata iniziale Input tastiera
    // this.input.keyboard!.once("keydown-SPACE", this.start, this);
    // this.input.keyboard!.once("keydown-UP", this.start, this);
    // this.input.keyboard!.once("keydown-DOWN", this.start, this);

    // //* Aggiunto mobile touch
    // const width = Number(this.sys.game.config.width);
    // const height = Number(this.sys.game.config.height);

    // if (!this.sys.game.device.os.desktop) {
    //   this.gameScene.isDownPressed = false;
    //   this.gameScene.isUpPressed = false;
    //   this.gameScene.isShootPressed = false;
    //   addScreenZones(this.gameScene, height, width);
    // }

    //! Avvio diretto gioco
    this.start();
  }

  generateGame() {
    //* Con questo metodo si generano le 4 file iniziale del gioco, posizionando i nest, player e nemici
    const trackCount = 4;

    // Coefficienti proporzionali (più bassi → corsie più vicine)
    const bottomOffsetFactor = this.gameScene.setDynamicValueBasedOnScale(0.25, 0.02); // distanza dal fondo (8% altezza schermo) // 0.15
    const spacingFactor = 0.18; // distanza tra corsie (18% altezza schermo) // 0.18

    // Calcoli dinamici
    const bottomOffset = this.scale.height * bottomOffsetFactor;
    const spacing = this.scale.height * spacingFactor;

    // Calcolo delle posizioni Y dal basso verso l’alto
    const trackYPositions = Array.from(
      {length: trackCount},
      (_, i) => this.scale.height - bottomOffset - spacing * (trackCount - 1 - i),
    );

    // Creazione delle corsie
    this.tracks = trackYPositions.map((y, i) => new Track(this, i, y));

    // player parte sulla prima corsia
    this.player = new Player(this, this.tracks[0]);

    // overlay adattato
    // this.add
    //   .image(0, 0, "overlay")
    //   .setOrigin(0)
    //   .setDisplaySize(this.scale.width, this.scale.height);

    //! Disattivato inizio con schermata iniziale Input tastiera, inserito png trasparente
    this.infoPanel = this.add.image(this.scale.width / 2, this.scale.height / 2, "controls");
  }

  start(): void {
    this.input.keyboard!.removeAllListeners();

    this.tweens.add({
      targets: this.infoPanel,
      y: 700,
      alpha: 0,
      duration: 500,
      ease: "Power2",
    });

    this.player.start();

    // Avvia tracks con delay differenti per gli enemies
    this.tracks[0].start(4000, 8000);
    this.tracks[1].start(500, 1000);
    this.tracks[2].start(5000, 9000);
    this.tracks[3].start(6000, 10000);
  }

  public addScore(points: number): void {
    this.score += points;

    this.gameScene.uiManager.updateScore(1);
    //console.log("Punteggio:", this.score);
  }

  gameOver(cause: string = "unknown"): void {
    if (this.gameScene.uiManager.score < 20) {
      // 🆕 Imposta il flag subito all'inizio
      this.isGameOver = true;

      this.infoPanel.setTexture("gameover");

      this.tweens.add({
        targets: this.infoPanel,
        y: 384,
        alpha: 1,
        duration: 500,
        ease: "Power2",
      });

      // Pausa la fisica
      this.physics.pause();

      // Ferma tutti i track
      this.tracks.forEach((track) => {
        track.stop();
      });

      this.sound.stopAll();
      this.sound.play("gameOver");

      this.player.stop();

      this.input.keyboard!.once("keydown-SPACE", () => {
        this.scene.start(assetConf.scene.mainMenu);
      });

      this.input.once("pointerdown", () => {
        this.scene.start(assetConf.scene.mainMenu);
      });
    }

    this.gameScene.gameOver();

    console.log("GameOver cause:", cause);
  }

  update(): void {
    const gameScene = this.gameScene as Game; // riferimento alla scena Game con i flag

    if (!this.player) return;

    // Movimento verticale
    if (gameScene.isUpPressed) {
      this.player.moveUp();
      gameScene.isUpPressed = false;
    } else if (gameScene.isDownPressed) {
      this.player.moveDown();
      gameScene.isDownPressed = false;
    }

    // Fuoco
    if (gameScene.isShootPressed) {
      this.player.throw();
      gameScene.isShootPressed = false;
    }
  }
}
