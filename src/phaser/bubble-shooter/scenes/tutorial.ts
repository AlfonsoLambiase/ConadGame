
import {BubbleShooterAssetConf} from "../shared/config/asset-conf.const";

export class Tutorial extends Phaser.Scene {
  private width!: number;
  private height!: number;
  private globalScale: number = 1;

  private tutorialPlayer01!: Phaser.GameObjects.Sprite;
  private tutorialPlayer02!: Phaser.GameObjects.Sprite;
  private tutorialPlayer03!: Phaser.GameObjects.Sprite;
  private tutorialText01!: Phaser.GameObjects.Sprite;
  private tutorialText02!: Phaser.GameObjects.Sprite;
  private tutorialText03!: Phaser.GameObjects.Sprite;

  private frameRate: number = 8;

  private startButton!: Phaser.GameObjects.Sprite;

  private backgroundOverlay!: Phaser.GameObjects.Graphics;

  private isTutorialActive: boolean = true;

  constructor() {
    super({key: BubbleShooterAssetConf.scene.tutorial});
  }

  create() {
    this.setGlobalScale();

    this.addRoadAndBackgroundRoad();
    this.addBackgroundOverlay();
    this.addAnims();

    const normalSizeButton = 0.8;
    const reduceSizeButton = 0.7;

    this.addButton(normalSizeButton, reduceSizeButton);
    this.startAnimation(normalSizeButton, reduceSizeButton);
  }

  addRoadAndBackgroundRoad(): void {
    //this.#addRoad();
    //this.#addBackgroundRoad();
  }

  // #addRoad(): void {
  //   const roadSprite = this.add.tileSprite(
  //     this.width / 2, // Position X
  //     this.height / 2, // Position Y
  //     this.width, // Ridimensionamento X
  //     1080, // Ridimensionamento Y
  //     BubbleShooterAssetConf.image.road,
  //     //"road",
  //   );

  //   roadSprite
  //     .setOrigin(0.5, 1)
  //     .setDepth(-2)
  //     .setScrollFactor(0)
  //     .setScale(1, this.setDynamicValueBasedOnScale(0.45, 1)); // ! TEST Iphone SE.
  //   roadSprite.y = this.cameras.main.height;
  // }

  // #addBackgroundRoad(): void {
  //   const backgroundRoadSprite = this.add.tileSprite(
  //     this.width / 2, // Position X
  //     this.height / 2, // Position Y
  //     this.width, // Ridimensionamento X
  //     1080, // Ridimensionamento Y
  //     //BubbleShooterAssetConf.image.roadBackground,
  //     "roadBackground",
  //   );

  //   backgroundRoadSprite
  //     .setOrigin(0.5, 0)
  //     .setDepth(-3)
  //     .setScrollFactor(0)
  //     .setScale(1, this.setDynamicValueBasedOnScale(0.7, 1)); // ! TEST Iphone SE.
  //   backgroundRoadSprite.setSize(this.width, this.height); // Modifica la dimensione del TileSprite
  //   backgroundRoadSprite.y = 0;
  // }

  addBackgroundOverlay() {
    this.backgroundOverlay = this.add.graphics();
    this.backgroundOverlay.fillStyle(0x000000, 0.5);
    this.backgroundOverlay.fillRect(0, 0, this.width, this.height);
    this.backgroundOverlay.setDepth(100);
  }

  addAnims() {
    // Animazione 1
    this.tutorialPlayer01 = this.#createTutorialPlayerAnimation(
      BubbleShooterAssetConf.keyAnim.animTutorialPlayer01,
      BubbleShooterAssetConf.spritesheet.tutorialPlayer01.key,
      38,
    );

    this.tutorialText01 = this.#createTutorialTextAnimation(
      BubbleShooterAssetConf.keyAnim.animStartTutorialText01,
      BubbleShooterAssetConf.spritesheet.tutorialText01.key,
      0,
      2,
    );

    this.tutorialText01 = this.#createTutorialTextAnimation(
      BubbleShooterAssetConf.keyAnim.animEndTutorialText01,
      BubbleShooterAssetConf.spritesheet.tutorialText01.key,
      3,
      5,
    );

    // Animazione 2
    this.tutorialPlayer02 = this.#createTutorialPlayerAnimation(
      BubbleShooterAssetConf.keyAnim.animTutorialPlayer02,
      BubbleShooterAssetConf.spritesheet.tutorialPlayer02.key,
      37,
    );

    this.tutorialText02 = this.#createTutorialTextAnimation(
      BubbleShooterAssetConf.keyAnim.animStartTutorialText02,
      BubbleShooterAssetConf.spritesheet.tutorialText02.key,
      0,
      2,
    );

    this.tutorialText02 = this.#createTutorialTextAnimation(
      BubbleShooterAssetConf.keyAnim.animEndTutorialText02,
      BubbleShooterAssetConf.spritesheet.tutorialText02.key,
      3,
      5,
    );

    // Animazione 3
    this.tutorialPlayer03 = this.#createTutorialPlayerAnimation(
      BubbleShooterAssetConf.keyAnim.animTutorialPlayer03,
      BubbleShooterAssetConf.spritesheet.tutorialPlayer03.key,
      38,
    );

    this.tutorialText03 = this.#createTutorialTextAnimation(
      BubbleShooterAssetConf.keyAnim.animStartTutorialText03,
      BubbleShooterAssetConf.spritesheet.tutorialText03.key,
      0,
      2,
    );

    this.tutorialText03 = this.#createTutorialTextAnimation(
      BubbleShooterAssetConf.keyAnim.animEndTutorialText03,
      BubbleShooterAssetConf.spritesheet.tutorialText03.key,
      3,
      5,
    );
  }

  addButton(normalSizeButton: number, reduceSizeButton: number) {
    this.startButton = this.add
      .sprite(this.width / 2, this.height - 50, BubbleShooterAssetConf.image.tutorialTastoAvanti)
      .setInteractive()
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setScale(normalSizeButton * this.globalScale)
      .setDepth(102)
      .on("pointerup", () => {
        this.#functionButton(normalSizeButton, reduceSizeButton);
      });

    this.isTutorialActive = true; // Imposta il tutorial come attivo
  }

  startAnimation(normalSizeButton: number, reduceSizeButton: number) {
    this.#playTutorial01(normalSizeButton, reduceSizeButton);
  }

  #playTutorial01(normalSizeButton: number, reduceSizeButton: number) {
    if (!this.isTutorialActive) return;

    // Disattiva eventuali immagini precedenti
    this.tutorialPlayer02.setVisible(false);
    this.tutorialText02.setVisible(false);
    this.tutorialPlayer03.setVisible(false);
    this.tutorialText03.setVisible(false);

    this.tutorialPlayer01.setVisible(true);
    this.tutorialPlayer01.play(BubbleShooterAssetConf.keyAnim.animTutorialPlayer01);

    this.tutorialPlayer01.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!this.isTutorialActive) return;
        if (
          animation.key === BubbleShooterAssetConf.keyAnim.animTutorialPlayer01 &&
          frame.index === 12
        ) {
          this.tutorialText01.setVisible(true);
          this.tutorialText01.play(BubbleShooterAssetConf.keyAnim.animStartTutorialText01);
        }
      },
    );

    this.tutorialPlayer01.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +
        BubbleShooterAssetConf.keyAnim.animTutorialPlayer01,
      () => {
        this.tutorialText01.play(BubbleShooterAssetConf.keyAnim.animEndTutorialText01);
        this.tutorialText01.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +
            BubbleShooterAssetConf.keyAnim.animEndTutorialText01,
          () => {
            this.#playTutorial02(normalSizeButton, reduceSizeButton);
          },
        );
      },
    );
  }

  #playTutorial02(normalSizeButton: number, reduceSizeButton: number) {
    if (!this.isTutorialActive) return;

    // Disattiva le immagini precedenti
    this.tutorialPlayer01.setVisible(false);
    this.tutorialText01.setVisible(false);

    this.tutorialPlayer02.setVisible(true);
    this.tutorialPlayer02.play(BubbleShooterAssetConf.keyAnim.animTutorialPlayer02);

    this.tutorialPlayer02.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!this.isTutorialActive) return;
        if (
          animation.key === BubbleShooterAssetConf.keyAnim.animTutorialPlayer02 &&
          frame.index === 12
        ) {
          this.tutorialText02.setVisible(true);
          this.tutorialText02.play(BubbleShooterAssetConf.keyAnim.animStartTutorialText02);
        }
      },
    );

    this.tutorialPlayer02.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +
        BubbleShooterAssetConf.keyAnim.animTutorialPlayer02,
      () => {
        this.tutorialText02.play(BubbleShooterAssetConf.keyAnim.animEndTutorialText02);
        this.tutorialText02.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +
            BubbleShooterAssetConf.keyAnim.animEndTutorialText02,
          () => {
            this.#playTutorial03(normalSizeButton, reduceSizeButton);
          },
        );
      },
    );
  }

  #playTutorial03(normalSizeButton: number, reduceSizeButton: number) {
    if (!this.isTutorialActive) return;

    // Disattiva le immagini precedenti
    this.tutorialPlayer02.setVisible(false);
    this.tutorialText02.setVisible(false);

    this.tutorialPlayer03.setVisible(true);
    this.tutorialPlayer03.play(BubbleShooterAssetConf.keyAnim.animTutorialPlayer03);

    this.tutorialPlayer03.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!this.isTutorialActive) return;
        if (
          animation.key === BubbleShooterAssetConf.keyAnim.animTutorialPlayer03 &&
          frame.index === 12
        ) {
          this.tutorialText03.setVisible(true);
          this.tutorialText03.play(BubbleShooterAssetConf.keyAnim.animStartTutorialText03);
        }
      },
    );

    this.tutorialPlayer03.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +
        BubbleShooterAssetConf.keyAnim.animTutorialPlayer03,
      () => {
        this.tutorialText03.play(BubbleShooterAssetConf.keyAnim.animEndTutorialText03);
        this.tutorialText03.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +
            BubbleShooterAssetConf.keyAnim.animEndTutorialText03,
          () => {
            if (this.isTutorialActive) {
              this.#functionButton(normalSizeButton, reduceSizeButton);
            }
          },
        );
      },
    );
  }

  #createTutorialPlayerAnimation(animKey: string, spriteKey: string, frameEnd: number) {
    // Crea l'animazione con il nome e i frames dinamici
    this.anims.create({
      key: animKey,
      frames: this.anims.generateFrameNumbers(spriteKey, {
        start: 0,
        end: frameEnd,
      }),
      frameRate: this.frameRate,
      repeat: 0,
    });

    // Crea il sprite e applica le configurazioni necessarie
    const tutorialPlayer = this.add
      .sprite(this.width / 2, this.height / 2 + 50, spriteKey)
      .setOrigin(0.5)
      .setVisible(false)
      .setScale(2 * this.globalScale)
      .setDepth(101);

    return tutorialPlayer;
  }

  #createTutorialTextAnimation(
    animKey: string,
    spriteKey: string,
    startFrame: number,
    endFrame: number,
  ) {
    // Crea l'animazione con i parametri dinamici
    this.anims.create({
      key: animKey,
      frames: this.anims.generateFrameNumbers(spriteKey, {
        start: startFrame,
        end: endFrame,
      }),
      frameRate: this.frameRate,
      repeat: 0,
    });

    // Crea lo sprite associato all'animazione
    const sprite = this.add
      .sprite(this.width / 2 + 50, 100, spriteKey)
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setScale(1 * this.globalScale)
      .setDepth(101);

    return sprite;
  }

  #functionButton(normalSizeButton: number, reduceSizeButton: number) {
    this.isTutorialActive = false; // Blocca la sequenza di animazioni
    this.startButton.setScale(reduceSizeButton * this.globalScale); // Rimpicciolisce il bottone quando viene premuto
    this.time.delayedCall(200, () => {
      this.startButton.setScale(normalSizeButton * this.globalScale);
      this.scene.start(BubbleShooterAssetConf.scene.game);
    });
  }

  // Metodo per ridimensionare gli oggetti in scena dipendendo dal tipo di dispositivo e della sua dimensione schermo.
  //! Metodo nuovo piu robusto copiare questo in tutti gli altri
  setGlobalScale() {
    // Otteniamo dimensioni reali del display
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const realWidth = cssWidth * pixelRatio;
    const realHeight = cssHeight * pixelRatio;

    // Recuperiamo le dimensioni configurate nel gioco (non influenzate da scale di Phaser)
    const config = this.sys.game.config as {width: number; height: number};

    this.width = config.width;
    this.height = config.height;

    // Definizione della risoluzione di riferimento
    //! NB: Attualmente settato a verticale (1080x1920) per mobile
    const refW = 1080;
    const refH = 1920;

    const scaleX = this.width / refW;
    const scaleY = this.height / refH;

   const calculatedScale = Math.min(scaleX, scaleY);

    // Impostiamo limiti massimi e minimi
    const minScale = 0.59;
    const maxScale = 1.2;

    // Clamp dello scale in range [minScale, maxScale]
    let globalScale = Math.min(maxScale, Math.max(minScale, calculatedScale));

    // Penalità extra se dimensioni CSS sono piccole (es. dispositivi vecchi o SE)
    const isBigScreen = realWidth >= 2500 || realHeight >= 1400;

    if (!isBigScreen && cssWidth < 750 && cssHeight < 450) {
      globalScale *= 0.7;
    }

    this.globalScale = globalScale;

    console.log("Scala applicata tutorial:", this.globalScale);
    console.log("Dimensioni scena width height:", this.width, this.height);
  }

  setDynamicValueBasedOnScale(minValue: number, maxValue: number): number {
    if (this.globalScale >= 1) return maxValue;
    if (this.globalScale <= 0.5) return minValue;
    const minScale = 0.5,
      maxScale = 1;
    const t = (this.globalScale - minScale) / (maxScale - minScale);

    return minValue + t * (maxValue - minValue);
  }
}
