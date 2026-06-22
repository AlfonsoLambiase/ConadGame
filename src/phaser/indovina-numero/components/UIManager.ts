import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import {IndovinaNumeroAssetConf} from "../shared/config/asset-conf.const";
import {getDefaultStage, IndovinaNumeroStage, isStageAnswerCorrect} from "../scenes/stage";

const assetConf = IndovinaNumeroAssetConf; //* Generalizzazione

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

  private countdownText!: Phaser.GameObjects.Text;
  private countdownEvent?: Phaser.Time.TimerEvent;
  private startPopupImage?: Phaser.GameObjects.Image;
  private startButtonImage?: Phaser.GameObjects.Image;
  private startBackdropImage?: Phaser.GameObjects.Image;
  private roundStarted = false;
  private timerContainer?: Phaser.GameObjects.Container;
  private lavagnaContainer?: Phaser.GameObjects.Container;
  private lavagnaImage?: Phaser.GameObjects.Image;
  private stageImage?: Phaser.GameObjects.Image;
  private questionText?: Phaser.GameObjects.Text;
  private answerButtons: Phaser.GameObjects.Container[] = [];
  private answerLocked = false;
  private backdropImage?: Phaser.GameObjects.Image;
  private backdropDim?: Phaser.GameObjects.Rectangle;
  private backdropTextureKey?: string;

  private static readonly ROUND_COUNTDOWN_START = 5;
  private static readonly ROUND_COUNTDOWN_BEFORE_START_MS = 1000;
  private static readonly ROUND_COUNTDOWN_DELAY_MS = 1500;
  private static readonly COUNTDOWN_PULSE_SCALE_FROM = 1.2;
  private static readonly COUNTDOWN_PULSE_SCALE_TO = 1.55;
  private static readonly UI_DEPTH_BACKDROP = 6;
  private static readonly UI_DEPTH_BACKDROP_DIM = 7;
  private static readonly UI_DEPTH_LAVAGNA = 8;
  private static readonly UI_DEPTH_START_SCREEN = 9;
  private static readonly UI_DEPTH_TIMER = 10;
  private static readonly TIMER_DEPTH_IMAGE = 0;
  private static readonly TIMER_DEPTH_GLOW = 1;
  private static readonly TIMER_DEPTH_COUNTDOWN = 2;
  private static readonly ANSWER_DEPTH_BUTTON = 0;
  private static readonly ANSWER_DEPTH_TEXT = 2;
  private static readonly COUNTDOWN_GLOW_PULSE_RATIO = 0.45;
  private static readonly ANSWER_PRESS_ZOOM_SCALE = 1.12;
  private static readonly ANSWER_PRESS_DURATION_MS = 400;
  private static readonly ANSWER_RESULT_DELAY_MS = 200;
  private static readonly START_BUTTON_PRESS_SCALE = 1.03;
  private static readonly START_BUTTON_PRESS_DURATION_MS = 280;
  private static readonly OVERLAY_BACKDROP_BLUR_SCALE = 0.9;
  private static readonly OVERLAY_BACKDROP_DIM_ALPHA = 0.65;
  private static readonly LAVAGNA_HORIZONTAL_MARGIN_PX = 50;
  private static readonly LAVAGNA_ENTRANCE_INITIAL_SCALE_RATIO = 0.55;
  private static readonly LAVAGNA_ENTRANCE_DURATION_MS = 480;
  private static readonly QUESTION_WRAP_WIDTH_RATIO = 0.88;
  private static readonly QUESTION_MAX_HEIGHT_RATIO = 0.12;
  private static readonly QUESTION_FONT_SIZE_RATIO = 0.062;
  private static readonly QUESTION_FONT_SIZE_RATIO_LONG = 0.05;
  private static readonly QUESTION_MIN_FONT_SIZE_RATIO = 0.035;
  private static readonly QUESTION_FONT_REDUCE_AT_LENGTH = 19;
  private static readonly QUESTION_FONT_FIT_STEP = 2;
  private static readonly TEXT_OUTLINE = {
    stroke: "#000000",
    strokeThickness: 6,
  } as const;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(): void {
    this.#createStartScreen();
    this.#createBackgroundLogoAndLogo();
    // Sfondo stage: GameManager.#createGameBackground() dopo questo overlay
    //this.#createContainerScore();
    //this.#createIconHelp();
    //this.#createLives();
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  #getCurrentStage(): IndovinaNumeroStage {
    return this.scene.registry.get(assetConf.registry.currentStage) ?? getDefaultStage();
  }

  #createBackgroundLogoAndLogo() {
    // Leggi il valore dal registry - for backgrounLogo and logo
    const sponsorLogo = this.scene.registry.get("sponsorLogo");

    if (sponsorLogo !== "empty") {
      const safeTop = this.scene.registry.get("safeTop") || 0; //! notch Area
      const dynamicScale = this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0);

      // AGGIUNTA:
      // Se c'Ã¨ notch, crea un bgLogo extra per riempire lo spazio sopra
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

  #createStartScreen(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    this.startBackdropImage = this.scene.add
      .image(centerX, centerY, assetConf.image.startBackground)
      .setDisplaySize(this.scene.scale.width, this.scene.scale.height)
      .setScrollFactor(0)
      .setDepth(UIManager.UI_DEPTH_BACKDROP);

    this.#buildStartScreenContent();
  }

  #buildStartScreenContent(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const popupScale = this.gameScene.setDynamicValueBasedOnScale(0.55, 1);
    const btnStartScale = this.gameScene.setDynamicValueBasedOnScale(0.55, 1);

    this.startPopupImage = this.scene.add
      .image(centerX, centerY, assetConf.image.popup)
      .setOrigin(0.5)
      .setScale(popupScale)
      .setScrollFactor(0)
      .setDepth(UIManager.UI_DEPTH_START_SCREEN);

    const popupBottom = centerY + (this.startPopupImage.height * popupScale) / 2;
    const btnOffsetFromPopupBottom = this.gameScene.setDynamicValueBasedOnScale(75, 150);
    const btnStartY = popupBottom - btnOffsetFromPopupBottom;

    this.startButtonImage = this.scene.add
      .image(centerX, btnStartY, assetConf.image.btnStart)
      .setOrigin(0.5)
      .setScale(btnStartScale)
      .setScrollFactor(0)
      .setDepth(UIManager.UI_DEPTH_START_SCREEN);

    this.startButtonImage.setInteractive({useHandCursor: true});
    this.startButtonImage.on("pointerdown", () => this.#onStartButtonPress());
    this.#startStartButtonIdlePulse(btnStartScale);
  }

  #startStartButtonIdlePulse(baseScale: number): void {
    if (!this.startButtonImage) return;

    const target = this.startButtonImage;

    this.scene.tweens.killTweensOf(target);
    target.setScale(baseScale);

    this.scene.tweens.add({
      targets: target,
      scale: baseScale * UIManager.START_BUTTON_PRESS_SCALE,
      duration: UIManager.START_BUTTON_PRESS_DURATION_MS,
      ease: "Quad.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  #onStartButtonPress(): void {
    if (this.roundStarted || !this.startButtonImage) return;

    this.gameScene.audioManager?.playAudio(assetConf.audio.clickButton);

    this.roundStarted = true;
    this.startButtonImage.disableInteractive();
    if (this.startButtonImage) {
      this.scene.tweens.killTweensOf(this.startButtonImage);
    }
    this.#onStartRound();
  }

  #onStartRound(): void {
    this.#destroyStartScreen();
    this.#createTimerCountdown();
  }

  #destroyStartScreen(): void {
    if (this.startButtonImage) {
      this.scene.tweens.killTweensOf(this.startButtonImage);
    }

    this.startPopupImage?.destroy();
    this.startPopupImage = undefined;

    this.startButtonImage?.destroy();
    this.startButtonImage = undefined;

    this.startBackdropImage?.destroy();
    this.startBackdropImage = undefined;
  }

  #createTimerCountdown(): void {
    const safeTop = this.scene.registry.get("safeTop") || 0;
    const marginX = this.gameScene.setDynamicValueBasedOnScale(24, 48);
    const marginY = this.gameScene.setDynamicValueBasedOnScale(150, 270) + safeTop;
    const scale = this.gameScene.setDynamicValueBasedOnScale(0.38, 0.78);

    const timerX = this.scene.scale.width - marginX;
    const timerY = marginY;

    const timerImg = this.scene.add
      .image(0, 0, assetConf.image.timer)
      .setOrigin(1, 0)
      .setScale(scale)
      .setDepth(UIManager.TIMER_DEPTH_IMAGE);

    const countdownFontSize = this.gameScene.setDynamicValueBasedOnScale(32, 52);
    const countdownOffsetY = this.gameScene.setDynamicValueBasedOnScale(8, 18);

    this.countdownText = this.scene.add
      .text(
        -timerImg.displayWidth / 2,
        timerImg.displayHeight / 2 + countdownOffsetY,
        String(UIManager.ROUND_COUNTDOWN_START),
        {
          fontFamily: "Paytone One",
          fontSize: `${countdownFontSize}px`,
          color: "#ffffff",
          ...UIManager.TEXT_OUTLINE,
        },
      )
      .setOrigin(0.5);

    this.timerContainer = this.scene.add.container(timerX, timerY, [timerImg, this.countdownText]);

    this.timerContainer.setScrollFactor(0).setDepth(UIManager.UI_DEPTH_TIMER);
    this.countdownText.setDepth(UIManager.TIMER_DEPTH_COUNTDOWN);

    this.scene.time.delayedCall(UIManager.ROUND_COUNTDOWN_BEFORE_START_MS, () => {
      if (!this.timerContainer) return;

      this.#startRoundCountdown();
    });
  }

  #startRoundCountdown(): void {
    let remaining = UIManager.ROUND_COUNTDOWN_START;

    this.countdownText.setText(String(remaining));
    this.#pulseCountdownNumber();

    this.countdownEvent?.remove();
    this.countdownEvent = this.scene.time.addEvent({
      delay: UIManager.ROUND_COUNTDOWN_DELAY_MS,
      repeat: UIManager.ROUND_COUNTDOWN_START,
      callback: () => {
        remaining--;
        this.countdownText.setText(String(remaining));
        this.#pulseCountdownNumber(remaining > 0);

        if (remaining <= 0) {
          this.countdownEvent?.remove();
          this.countdownEvent = undefined;
          this.scene.tweens.killTweensOf(this.countdownText);
          this.#showLavagna();
        }
      },
    });
  }

  #pulseCountdownNumber(playCountSound = true): void {
    if (playCountSound) {
      this.gameScene.audioManager?.playAudio(assetConf.audio.count);
    }

    this.#playCountdownGlow();

    this.scene.tweens.killTweensOf(this.countdownText);
    this.countdownText.setScale(UIManager.COUNTDOWN_PULSE_SCALE_FROM);

    this.scene.tweens.add({
      targets: this.countdownText,
      scale: {
        from: UIManager.COUNTDOWN_PULSE_SCALE_FROM,
        to: UIManager.COUNTDOWN_PULSE_SCALE_TO,
      },
      duration: UIManager.ROUND_COUNTDOWN_DELAY_MS * UIManager.COUNTDOWN_GLOW_PULSE_RATIO,
      ease: "Quad.easeOut",
      yoyo: true,
    });
  }

  #playCountdownGlow(): void {
    if (!this.timerContainer || !this.countdownText) return;

    const pulseDuration = UIManager.ROUND_COUNTDOWN_DELAY_MS * UIManager.COUNTDOWN_GLOW_PULSE_RATIO;

    this.#spawnCountdownLuminousGlow(
      this.timerContainer,
      this.countdownText.x,
      this.countdownText.y,
      {
        insertBefore: this.countdownText,
        glowDepth: UIManager.TIMER_DEPTH_GLOW,
        baseRadius: this.gameScene.setDynamicValueBasedOnScale(30, 56),
        duration: pulseDuration,
        scaleFrom: 0.4,
        scaleTo: 1.55,
        innerColor: 0xffd54f,
        midColor: 0xffffff,
        outerColor: 0xfff9c4,
        burstScale: this.gameScene.setDynamicValueBasedOnScale(0.3, 0.58),
      },
    );
  }

  #spawnCountdownLuminousGlow(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    config: {
      insertBefore: Phaser.GameObjects.GameObject;
      glowDepth: number;
      baseRadius: number;
      duration: number;
      scaleFrom: number;
      scaleTo: number;
      innerColor: number;
      midColor: number;
      outerColor: number;
      burstScale: number;
    },
  ): void {
    const insertIndex = parent.getIndex(config.insertBefore);

    const glow = this.scene.add.graphics({x, y});

    glow.setDepth(config.glowDepth);
    glow.setBlendMode(Phaser.BlendModes.ADD);

    glow.fillStyle(config.innerColor, 0.5);
    glow.fillCircle(0, 0, config.baseRadius * 0.5);
    glow.fillStyle(config.midColor, 0.38);
    glow.fillCircle(0, 0, config.baseRadius * 0.78);
    glow.fillStyle(config.outerColor, 0.22);
    glow.fillCircle(0, 0, config.baseRadius);

    glow.setScale(config.scaleFrom);
    glow.setAlpha(1);

    parent.addAt(glow, insertIndex);

    this.scene.tweens.add({
      targets: glow,
      scaleX: config.scaleTo,
      scaleY: config.scaleTo,
      alpha: 0,
      duration: config.duration,
      ease: "Cubic.easeOut",
      onComplete: () => {
        glow.parentContainer?.remove(glow, false);
        glow.destroy();
      },
    });

    this.gameScene.starsEffectManager?.playGlowBurst(x, y, config.burstScale, parent, insertIndex);
  }

  #playAnswerPressEffect(
    buttonContainer: Phaser.GameObjects.Container,
    onPressAnimationComplete: () => void,
  ): void {
    const pressDuration = UIManager.ANSWER_PRESS_DURATION_MS;
    const zoomScale = UIManager.ANSWER_PRESS_ZOOM_SCALE;

    this.scene.tweens.killTweensOf(buttonContainer);
    buttonContainer.setScale(1);

    this.scene.tweens.add({
      targets: buttonContainer,
      scaleX: zoomScale,
      scaleY: zoomScale,
      duration: pressDuration / 2,
      ease: "Quad.easeInOut",
      yoyo: true,
      onComplete: () => {
        buttonContainer.setScale(1);
        onPressAnimationComplete();
      },
    });
  }

  #hideRoundTimer(): void {
    this.countdownEvent?.remove();
    this.countdownEvent = undefined;
    this.scene.tweens.killTweensOf(this.countdownText);

    this.timerContainer?.destroy();
    this.timerContainer = undefined;
  }

  #showLavagna(): void {
    if (this.lavagnaContainer) return;

    this.#hideRoundTimer();

    this.#createBlurredBackdrop(
      "lavagna",
      {
        onDimReady: (dim) => {
          this.backdropDim = dim;
          this.#createLavagnaImage();
        },
        onBlurReady: ({image, textureKey}) => {
          this.backdropImage = image;
          this.backdropTextureKey = textureKey;
        },
      },
      {
        blurScale: UIManager.OVERLAY_BACKDROP_BLUR_SCALE,
        dimAlpha: UIManager.OVERLAY_BACKDROP_DIM_ALPHA,
      },
    );
  }

  #createBlurredBackdrop(
    textureSuffix: string,
    callbacks: {
      onDimReady: (dim: Phaser.GameObjects.Rectangle) => void;
      onBlurReady?: (backdrop: {image: Phaser.GameObjects.Image; textureKey: string}) => void;
    },
    options?: {blurScale?: number; dimAlpha?: number},
  ): void {
    const blurScale = options?.blurScale ?? UIManager.OVERLAY_BACKDROP_BLUR_SCALE;
    const dimAlpha = options?.dimAlpha ?? UIManager.OVERLAY_BACKDROP_DIM_ALPHA;
    const width = Math.floor(this.scene.scale.width);
    const height = Math.floor(this.scene.scale.height);

    const backdropDim = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, dimAlpha)
      .setScrollFactor(0)
      .setDepth(UIManager.UI_DEPTH_BACKDROP_DIM);

    callbacks.onDimReady(backdropDim);

    this.scene.game.renderer.snapshotArea(0, 0, width, height, (snapshot) => {
      if (!(snapshot instanceof HTMLImageElement)) {
        return;
      }

      const textureKey = `${textureSuffix}-backdrop-${this.scene.sys.settings.key}`;

      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }

      const blurCanvas = document.createElement("canvas");

      blurCanvas.width = Math.max(1, Math.floor(width * blurScale));
      blurCanvas.height = Math.max(1, Math.floor(height * blurScale));

      const ctx = blurCanvas.getContext("2d");

      if (!ctx) {
        return;
      }

      ctx.drawImage(snapshot, 0, 0, blurCanvas.width, blurCanvas.height);
      this.scene.textures.addCanvas(textureKey, blurCanvas);

      const backdropImage = this.scene.add
        .image(width / 2, height / 2, textureKey)
        .setDisplaySize(width, height)
        .setScrollFactor(0)
        .setDepth(UIManager.UI_DEPTH_BACKDROP);

      callbacks.onBlurReady?.({image: backdropImage, textureKey});
    });
  }

  #createLavagnaImage(): void {
    const stage = this.#getCurrentStage();

    this.lavagnaImage = this.scene.add.image(0, 0, assetConf.image.lavagna).setOrigin(0.5);

    const stageAboveLavagnaY = -this.lavagnaImage.height / 2;

    this.stageImage = this.scene.add
      .image(0, stageAboveLavagnaY, stage.imageStage)
      .setOrigin(0.5, 0);

    const lavagnaWidth = this.lavagnaImage.width;
    const lavagnaHeight = this.lavagnaImage.height;
    const questionMaxWidth = lavagnaWidth * UIManager.QUESTION_WRAP_WIDTH_RATIO;
    const questionMaxHeight = lavagnaHeight * UIManager.QUESTION_MAX_HEIGHT_RATIO;
    const isLongQuestion = stage.question.length >= UIManager.QUESTION_FONT_REDUCE_AT_LENGTH;
    const questionFontSize = Math.round(
      lavagnaWidth *
        (isLongQuestion
          ? UIManager.QUESTION_FONT_SIZE_RATIO_LONG
          : UIManager.QUESTION_FONT_SIZE_RATIO),
    );
    const questionMinFontSize = Math.max(
      16,
      Math.round(lavagnaWidth * UIManager.QUESTION_MIN_FONT_SIZE_RATIO),
    );
    const questionY = -lavagnaHeight * 0.16;

    this.questionText = this.scene.add
      .text(0, questionY, stage.question, {
        fontFamily: "Paytone One",
        fontSize: `${questionFontSize}px`,
        color: "#ffffff",
        align: "center",
        wordWrap: {width: questionMaxWidth},
      })
      .setOrigin(0.5);

    if (isLongQuestion) {
      this.#fitQuestionText(
        this.questionText,
        questionMaxWidth,
        questionMaxHeight,
        questionFontSize,
        questionMinFontSize,
      );
    }

    this.answerButtons = this.#createAnswerButtons(stage);

    this.lavagnaContainer = this.scene.add.container(0, 0, [
      this.lavagnaImage,
      this.stageImage,
      this.questionText,
      ...this.answerButtons,
    ]);

    const targetScale = this.#computeLavagnaScale();
    const offsetY = this.gameScene.setDynamicValueBasedOnScale(70, 150);

    this.lavagnaContainer
      .setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2 + offsetY)
      .setScrollFactor(0)
      .setDepth(UIManager.UI_DEPTH_LAVAGNA);

    this.#animateLavagnaEntrance(targetScale);
  }

  #computeLavagnaScale(): number {
    const maxWidth = this.scene.scale.width - UIManager.LAVAGNA_HORIZONTAL_MARGIN_PX * 2;

    return maxWidth / this.lavagnaImage!.width;
  }

  #animateLavagnaEntrance(targetScale: number): void {
    if (!this.lavagnaContainer) return;

    this.gameScene.audioManager?.playAudio(assetConf.audio.zoomIn);

    const initialScale = targetScale * UIManager.LAVAGNA_ENTRANCE_INITIAL_SCALE_RATIO;

    this.lavagnaContainer.setScale(initialScale);

    this.scene.tweens.add({
      targets: this.lavagnaContainer,
      scale: targetScale,
      duration: UIManager.LAVAGNA_ENTRANCE_DURATION_MS,
      ease: "Back.easeOut",
    });
  }

  #fitQuestionText(
    text: Phaser.GameObjects.Text,
    maxWidth: number,
    maxHeight: number,
    startFontSize: number,
    minFontSize: number,
  ): void {
    let fontSize = startFontSize;

    while (fontSize >= minFontSize) {
      text.setFontSize(fontSize);
      text.setWordWrapWidth(maxWidth, true);

      if (text.height <= maxHeight) {
        return;
      }

      fontSize -= UIManager.QUESTION_FONT_FIT_STEP;
    }

    text.setFontSize(minFontSize);
    text.setWordWrapWidth(maxWidth, true);
  }

  #createAnswerButtons(stage: IndovinaNumeroStage): Phaser.GameObjects.Container[] {
    const lavagnaWidth = this.lavagnaImage!.width;
    const lavagnaHeight = this.lavagnaImage!.height;
    const buttonWidth = lavagnaWidth * 0.48;
    const buttonSpacing = lavagnaHeight * 0.095;
    const firstButtonY = -lavagnaHeight * 0.05;
    const answerFontSize = Math.round(lavagnaWidth * 0.054);

    return stage.answers.map((answer, index) => {
      const buttonY = firstButtonY + index * buttonSpacing;
      const buttonHeight = buttonSpacing * 0.82;
      const buttonImage = this.scene.add
        .image(0, buttonY, assetConf.image.button)
        .setOrigin(0.5)
        .setDisplaySize(buttonWidth, buttonHeight)
        .setDepth(UIManager.ANSWER_DEPTH_BUTTON);

      const answerText = this.scene.add
        .text(0, buttonY, answer, {
          fontFamily: "Paytone One",
          fontSize: `${answerFontSize}px`,
          color: "#ffffff",
          align: "center",
          ...UIManager.TEXT_OUTLINE,
        })
        .setOrigin(0.5)
        .setDepth(UIManager.ANSWER_DEPTH_TEXT);

      const buttonContainer = this.scene.add.container(0, 0, [buttonImage, answerText]);

      buttonImage.setInteractive({useHandCursor: true});
      buttonImage.on("pointerdown", () => {
        this.#handleAnswer(
          index,
          stage,
          buttonImage,
          answerText,
          buttonContainer,
          buttonWidth,
          buttonHeight,
        );
      });

      return buttonContainer;
    });
  }

  #handleAnswer(
    selectedIndex: number,
    stage: IndovinaNumeroStage,
    buttonImage: Phaser.GameObjects.Image,
    answerText: Phaser.GameObjects.Text,
    buttonContainer: Phaser.GameObjects.Container,
    buttonWidth: number,
    buttonHeight: number,
  ): void {
    if (this.answerLocked) return;

    this.gameScene.audioManager?.playAudio(assetConf.audio.clickButton);

    this.answerLocked = true;
    this.#disableAnswerButtons();

    const isCorrect = isStageAnswerCorrect(stage, selectedIndex);

    this.#playAnswerPressEffect(buttonContainer, () => {
      this.scene.time.delayedCall(UIManager.ANSWER_RESULT_DELAY_MS, () => {
        this.#applyAnswerResult(buttonImage, buttonWidth, buttonHeight, isCorrect);
      });
    });
  }

  #applyAnswerResult(
    buttonImage: Phaser.GameObjects.Image,
    buttonWidth: number,
    buttonHeight: number,
    isCorrect: boolean,
  ): void {
    const resultTexture = isCorrect ? assetConf.image.button_true : assetConf.image.button_false;

    buttonImage.setTexture(resultTexture);
    buttonImage.setDisplaySize(buttonWidth, buttonHeight);

    if (isCorrect) {
      this.gameScene.finishGame("Win");

      return;
    }

    this.gameScene.audioManager?.playAudio(assetConf.audio.error);
    this.gameScene.finishGame("Failed");
  }

  #disableAnswerButtons(): void {
    for (const buttonContainer of this.answerButtons) {
      const buttonImage = buttonContainer.list[0];

      if (buttonImage instanceof Phaser.GameObjects.Image) {
        buttonImage.disableInteractive();
      }
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

    // 3. Creazione background centrato (0,0 perchÃ© Ã¨ il centro del container)
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
