/* eslint-disable no-console */
import * as Phaser from "phaser";

import {ColpoVincenteGameplayConfig} from "../config/colpo-vincente-gameplay.config";
import {Game} from "../scenes/game";
import {ColpoVincenteAssetConf} from "../shared/config/asset-conf.const";

const assetConf = ColpoVincenteAssetConf; //* Generalizzazione
const gameplayCfg = ColpoVincenteGameplayConfig;

export type LaneMinimapBlipKind = "boccino" | "player" | "enemy";

export type LaneMinimapBlip = {
  u: number;
  v: number;
  kind: LaneMinimapBlipKind;
};

/** Sopra corsia/palla (depth ~5–6) nella stessa scena GameManager. */
const HUD_DEPTH = 12;
/** Minimap sopra pannelli score (12) e sotto overlay exit (100+) / confetti (95). */
const LANE_MINIMAP_DEPTH = 88;
/** Sopra laneRoot (-2) e sotto palla/aim (5–6): fascia logo visibile. */
const LOGO_BAND_DEPTH = 8;
/** Pool punti sulla minimap (palle in campo + boccino). */
const LANE_MINIMAP_DOT_POOL = 16;

export class UIManager {
  private scene: Phaser.Scene;
  gameScene!: Game;

  public score = 0;
  public maxScore = 30;
  private displayedScore: number = 0;
  /** HUD: distanza boccino–palla (cm), non più punteggio "x / max". */
  private scoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;
  ofssetY: number = 0;
  ofssetX: number = 0;
  scoreContainer!: Phaser.GameObjects.Container;

  public scoreEnemy = 0;
  public maxScoreEnemy = 30;
  private displayedScoreEnemy = 0;
  private scoreEnemyText!: Phaser.GameObjects.Text;
  scoreEnemyContainer!: Phaser.GameObjects.Container;

  /** Icone palla grandi dentro i pannelli distanza (effetto “chi sta vincendo”). */
  private scoreHudPlayerBallIcon!: Phaser.GameObjects.Image;
  private scoreHudEnemyBallIcon!: Phaser.GameObjects.Image;
  private static readonly SCORE_HUD_BALL_ICON_BASE_SCALE = 0.8;
  private lastWinningHudLeader: "player" | "enemy" | "tie" | "off" = "off";

  helpUsed: number = 0;
  differenceTryLimit: number = 1; // limite massimo tasto aiuto
  public iconHelp!: Phaser.GameObjects.Image;

  //private imgLive!: Phaser.GameObjects.Image;
  private livesImages: Phaser.GameObjects.Image[] = [];
  private lives: number = 3;
  private livesImageSpacing: number = 110; // Spazio tra le icone delle vite

  /**
   * Icone “munizioni” sotto i pannelli: ordine [esterno → interno] (verso il centro schermo).
   * A ogni lancio si fa `pop()` = si toglie prima quella più interna.
   */
  private playerShotIcons: Phaser.GameObjects.Image[] = [];
  private enemyShotIcons: Phaser.GameObjects.Image[] = [];
  /** Scala base delle chip (per evidenziare +20% la prossima da lanciare). */
  private shotChipBaseScale = 0;
  private static readonly SHOT_CHIP_TURN_SCALE_MUL = 1.2;
  /** Chip già tolte dall’array ma ancora in tween (evita orphan al reset). */
  private readonly shotChipsPendingDestroy: Phaser.GameObjects.Image[] = [];

  /** Vista dall’alto corsia: `Rectangle` + `Circle` (bounds espliciti; `Graphics` poteva non comparire con Canvas/culling). */
  private laneMinimapRoot?: Phaser.GameObjects.Container;
  private laneMinimapBg?: Phaser.GameObjects.Rectangle;
  private readonly laneMinimapDots: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createUI(): void {
    this.#createBackgroundGame();
    this.#createBackgroundLogoAndLogo();
    this.#createContainerScore();
    this.#createContainerScoreEnemy();
    this.#createLaneMinimapRadar();
    //this.#createIconHelp();
    //this.#createLives();
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

    // Con UI sulla scena GameManager, laneRoot è a depth -2: questo sfondo (-3) resta sotto
    // e non si vede dove la corsia è opaca a tutta larghezza. Serve solo se in futuro la lane
    // ha trasparenza o margini; altrimenti lo strato visivo è bg/bianco del GameManager.
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
        bgLogoTopFill.setDepth(LOGO_BAND_DEPTH);
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
      logoContainer.setDepth(LOGO_BAND_DEPTH);
      logoContainer.setScale(dynamicScale);
      logoContainer.setScrollFactor(0);

      // IMPORTANTE: regola origine con setOrigin-like comportamento
      logoContainer.setPosition(this.scene.scale.width / 2, safeTop); //! notch Area
    }
  }

  /** Stessa distanza bordo schermo usata per player (sinistra) e nemico (destra). */
  #getScoreHudInsetFromScreenEdge(): number {
    return this.gameScene.setDynamicValueBasedOnScale(80, 200);
  }

  #getScoreHudCenterY(): number {
    const safeTop = this.scene.registry.get("safeTop") || 0;

    return this.gameScene.setDynamicValueBasedOnScale(170, 330) + safeTop;
  }

  #getScorePanelLocalScale(): number {
    return this.gameScene.setDynamicValueBasedOnScale(0.4, 0.8);
  }

  #createContainerScore() {
    const centerX = this.#getScoreHudInsetFromScreenEdge();
    const centerY = this.#getScoreHudCenterY();

    this.scoreContainer = this.scene.add.container(centerX, centerY);
    this.scoreContainer.setScrollFactor(0).setDepth(HUD_DEPTH);

    const backgroundScore = this.scene.add
      .image(0, 0, assetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);

    this.scoreHudPlayerBallIcon = this.scene.add
      .image(-122, 0, assetConf.image.iconScore_Player)
      .setOrigin(0.5)
      .setScale(UIManager.SCORE_HUD_BALL_ICON_BASE_SCALE);

    this.scoreText = this.scene.add
      .text(34, 0, "0.000 m", {
        fontFamily: "Paytone One",
        fontSize: "44px",
        color: "#000000",
      })
      .setOrigin(0.5)
      .setScale(1.2);

    this.scoreContainer.add([backgroundScore, this.scoreHudPlayerBallIcon, this.scoreText]);
    this.scoreContainer.setScale(this.#getScorePanelLocalScale());
  }

  /** Specchio del pannello player: stesso bg, icon a destra, testo a sinistra, stesso inset dal bordo destro. */
  #createContainerScoreEnemy() {
    const centerX = this.scene.scale.width - this.#getScoreHudInsetFromScreenEdge();
    const centerY = this.#getScoreHudCenterY();

    this.scoreEnemyContainer = this.scene.add.container(centerX, centerY);
    this.scoreEnemyContainer.setScrollFactor(0).setDepth(HUD_DEPTH);

    const backgroundScoreEnemy = this.scene.add
      .image(0, 0, assetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);

    this.scoreEnemyText = this.scene.add
      .text(-34, 0, "0.000 m", {
        fontFamily: "Paytone One",
        fontSize: "44px",
        color: "#000000",
      })
      .setOrigin(0.5)
      .setScale(1.2);

    this.scoreHudEnemyBallIcon = this.scene.add
      .image(122, 0, assetConf.image.iconScore_Enemy)
      .setOrigin(0.5)
      .setScale(UIManager.SCORE_HUD_BALL_ICON_BASE_SCALE);

    this.scoreEnemyContainer.add([
      backgroundScoreEnemy,
      this.scoreEnemyText,
      this.scoreHudEnemyBallIcon,
    ]);
    this.scoreEnemyContainer.setScale(this.#getScorePanelLocalScale());
  }

  #createLaneMinimapRadar(): void {
    this.laneMinimapRoot = this.scene.add.container(0, 0);
    this.laneMinimapRoot.setScrollFactor(0);
    this.laneMinimapRoot.setDepth(LANE_MINIMAP_DEPTH);
    this.laneMinimapRoot.setVisible(true);

    this.laneMinimapBg = this.scene.add.rectangle(0, 0, 144, 192, 0x152535, 0.55);
    this.laneMinimapBg.setStrokeStyle(2, 0xffffff, 0.5);
    this.laneMinimapRoot.add(this.laneMinimapBg);

    for (let i = 0; i < LANE_MINIMAP_DOT_POOL; i++) {
      const dot = this.scene.add.circle(0, 0, 4, 0xffffff, 0).setVisible(false);

      dot.setStrokeStyle(1, 0x000000, 0.45);
      this.laneMinimapRoot.add(dot);
      this.laneMinimapDots.push(dot);
    }

    this.updateLaneMinimap([]);
  }

  /**
   * Centro schermo del pannello minimap: sotto le chip player (stesso inset sinistro del punteggio).
   */
  #getLaneMinimapScreenPosition(): {x: number; y: number} {
    const inset =
      this.#getScoreHudInsetFromScreenEdge() -
      this.gameScene.setDynamicValueBasedOnScale(
        gameplayCfg.laneMinimapShiftLeftPxMin,
        gameplayCfg.laneMinimapShiftLeftPxMax,
      );
    const centerY = this.#getScoreHudCenterY();
    const panelScale = this.#getScorePanelLocalScale();
    const baseY = this.gameScene.setDynamicValueBasedOnScale(112, 178);
    const chipS =
      this.shotChipBaseScale > 0
        ? this.shotChipBaseScale
        : this.gameScene.setDynamicValueBasedOnScale(0.64, 1.04);
    const chipR = Math.max(40, 110 * chipS * 0.5) * panelScale;
    const gap = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.laneMinimapOffsetBelowShotChipsPxMin,
      gameplayCfg.laneMinimapOffsetBelowShotChipsPxMax,
    );
    const mapHalfH =
      this.gameScene.setDynamicValueBasedOnScale(
        gameplayCfg.laneMinimapHeightPxMin,
        gameplayCfg.laneMinimapHeightPxMax,
      ) * 0.5;

    const y = centerY + baseY * panelScale + chipR + gap + mapHalfH;
    const minX = this.gameScene.setDynamicValueBasedOnScale(20, 40);

    return {x: Math.max(minX, inset), y};
  }

  updateLaneMinimap(blips: LaneMinimapBlip[]): void {
    const root = this.laneMinimapRoot;
    const bg = this.laneMinimapBg;

    if (!root || !bg) {
      return;
    }

    const w = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.laneMinimapWidthPxMin,
      gameplayCfg.laneMinimapWidthPxMax,
    );
    const h = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.laneMinimapHeightPxMin,
      gameplayCfg.laneMinimapHeightPxMax,
    );
    const pad = gameplayCfg.laneMinimapInnerPaddingPx;
    const rDot = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.laneMinimapDotRadiusPxMin,
      gameplayCfg.laneMinimapDotRadiusPxMax,
    );
    const pos = this.#getLaneMinimapScreenPosition();

    root.setPosition(pos.x, pos.y);
    bg.setSize(w, h);
    bg.setFillStyle(0x152535, gameplayCfg.laneMinimapPanelBgAlpha);
    bg.setStrokeStyle(2, 0xffffff, gameplayCfg.laneMinimapPanelBorderAlpha);

    const iw = Math.max(w - pad * 2, 4);
    const ih = Math.max(h - pad * 2, 4);
    const x0 = -w * 0.5 + pad;
    const y0 = -h * 0.5 + pad;

    const drawOrder: LaneMinimapBlipKind[] = ["boccino", "player", "enemy"];
    const sorted = [...blips].sort((a, b) => drawOrder.indexOf(a.kind) - drawOrder.indexOf(b.kind));

    for (const dot of this.laneMinimapDots) {
      dot.setVisible(false);
    }

    const n = Math.min(sorted.length, this.laneMinimapDots.length);

    for (let i = 0; i < n; i++) {
      const b = sorted[i];
      const dot = this.laneMinimapDots[i];
      const col =
        b.kind === "boccino"
          ? gameplayCfg.laneMinimapColorBoccino
          : b.kind === "player"
            ? gameplayCfg.laneMinimapColorPlayer
            : gameplayCfg.laneMinimapColorEnemy;

      dot.setPosition(x0 + b.u * iw, y0 + b.v * ih);
      dot.setRadius(rDot);
      dot.setFillStyle(col, 0.98);
      dot.setVisible(true);
    }
  }

  /** All’inizio partita / reset: `maxPlayerShots` icone per lato (piene). */
  resetColpoVincenteShotChips(): void {
    for (const img of this.shotChipsPendingDestroy) {
      this.scene.tweens.killTweensOf(img);
      img.destroy();
    }

    this.shotChipsPendingDestroy.length = 0;

    for (const img of this.playerShotIcons) {
      this.scene.tweens.killTweensOf(img);
      img.destroy();
    }

    this.playerShotIcons = [];

    for (const img of this.enemyShotIcons) {
      this.scene.tweens.killTweensOf(img);
      img.destroy();
    }

    this.enemyShotIcons = [];

    const nPlayer = gameplayCfg.maxPlayerShots;
    const nEnemy = gameplayCfg.maxEnemyShots;
    const scale = this.gameScene.setDynamicValueBasedOnScale(0.64, 1.04);

    this.shotChipBaseScale = scale;
    const spacing = this.gameScene.setDynamicValueBasedOnScale(88, 138);
    const baseY = this.gameScene.setDynamicValueBasedOnScale(112, 178);

    const anchorPlayer = this.gameScene.setDynamicValueBasedOnScale(-132, -118);

    for (let idx = 0; idx < nPlayer; idx++) {
      const icon = this.scene.add
        .image(anchorPlayer + idx * spacing, baseY, assetConf.image.iconScore_Player)
        .setOrigin(0.5)
        .setScale(scale);

      this.scoreContainer.add(icon);
      this.playerShotIcons.push(icon);
    }

    const anchorEnemy = this.gameScene.setDynamicValueBasedOnScale(132, 118);

    for (let idx = 0; idx < nEnemy; idx++) {
      const icon = this.scene.add
        .image(anchorEnemy - idx * spacing, baseY, assetConf.image.iconScore_Enemy)
        .setOrigin(0.5)
        .setScale(scale);

      this.scoreEnemyContainer.add(icon);
      this.enemyShotIcons.push(icon);
    }

    this.updateColpoVincenteShotChipTurnHighlight("neutral");
  }

  /**
   * Ingrandisce ~20% la chip “prossima” (la più interna, ultima in lista) sul lato di chi sta tirando.
   */
  updateColpoVincenteShotChipTurnHighlight(phase: "player" | "enemy" | "neutral"): void {
    const base = this.shotChipBaseScale;

    if (base <= 0) {
      return;
    }

    const hi = base * UIManager.SHOT_CHIP_TURN_SCALE_MUL;

    for (let i = 0; i < this.playerShotIcons.length; i++) {
      const isNext = phase === "player" && i === this.playerShotIcons.length - 1;

      this.playerShotIcons[i].setScale(isNext ? hi : base);
    }

    for (let i = 0; i < this.enemyShotIcons.length; i++) {
      const isNext = phase === "enemy" && i === this.enemyShotIcons.length - 1;

      this.enemyShotIcons[i].setScale(isNext ? hi : base);
    }
  }

  /** Dopo un tiro player: toglie un’icona da dentro verso fuori (ultima in lista = più verso il centro). */
  consumePlayerShotIcon(): void {
    const icon = this.playerShotIcons.pop();

    if (icon) {
      this.#runShotChipConsumeEffect(icon);
    }
  }

  consumeEnemyShotIcon(): void {
    const icon = this.enemyShotIcons.pop();

    if (icon) {
      this.#runShotChipConsumeEffect(icon);
    }
  }

  #runShotChipConsumeEffect(icon: Phaser.GameObjects.Image): void {
    if (!icon.active) {
      icon.destroy();

      return;
    }

    this.shotChipsPendingDestroy.push(icon);

    const s0 = icon.scaleX;
    const endS = s0 * gameplayCfg.shotChipConsumeEffectScaleEndMul;

    this.scene.tweens.killTweensOf(icon);

    this.scene.tweens.add({
      targets: icon,
      alpha: 0,
      scaleX: endS,
      scaleY: endS,
      duration: gameplayCfg.shotChipConsumeEffectDurationMs,
      ease: "Power2.easeIn",
      onComplete: () => {
        const j = this.shotChipsPendingDestroy.indexOf(icon);

        if (j !== -1) {
          this.shotChipsPendingDestroy.splice(j, 1);
        }

        if (icon.active) {
          icon.destroy();
        }
      },
    });
  }

  /**
   * Icone grandi nel pannello distanza: tint + pulse scala sul lato più vicino al boccino.
   * Passa `null` se un lato non ha ancora tiri con distanza valida (nessun effetto).
   */
  updateWinningHudByDistance(playerM: number | null, enemyM: number | null): void {
    if (
      playerM === null ||
      enemyM === null ||
      !Number.isFinite(playerM) ||
      !Number.isFinite(enemyM)
    ) {
      this.#clearWinningHudBallEffect();

      return;
    }

    const eps = gameplayCfg.hudWinningDistanceTieEpsilonM;
    const diff = Math.abs(playerM - enemyM);
    let next: "player" | "enemy" | "tie";

    if (diff < eps) {
      next = "tie";
    } else if (playerM < enemyM) {
      next = "player";
    } else {
      next = "enemy";
    }

    if (next === this.lastWinningHudLeader) {
      return;
    }

    this.lastWinningHudLeader = next;
    this.#stopWinningHudBallTweensAndResetVisuals();

    if (next === "tie") {
      return;
    }

    const icon = next === "player" ? this.scoreHudPlayerBallIcon : this.scoreHudEnemyBallIcon;
    const base = UIManager.SCORE_HUD_BALL_ICON_BASE_SCALE;
    const hi = base * gameplayCfg.hudWinningIconPulseScaleMul;

    icon.setTint(gameplayCfg.hudWinningIconTint);
    icon.setScale(base);

    this.scene.tweens.add({
      targets: icon,
      scaleX: hi,
      scaleY: hi,
      duration: gameplayCfg.hudWinningIconPulseDurationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  #clearWinningHudBallEffect(): void {
    this.lastWinningHudLeader = "off";
    this.#stopWinningHudBallTweensAndResetVisuals();
  }

  #stopWinningHudBallTweensAndResetVisuals(): void {
    this.scene.tweens.killTweensOf(this.scoreHudPlayerBallIcon);
    this.scene.tweens.killTweensOf(this.scoreHudEnemyBallIcon);

    const base = UIManager.SCORE_HUD_BALL_ICON_BASE_SCALE;

    this.scoreHudPlayerBallIcon.setScale(base);
    this.scoreHudPlayerBallIcon.clearTint();
    this.scoreHudEnemyBallIcon.setScale(base);
    this.scoreHudEnemyBallIcon.clearTint();
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
    iconHelp.setDepth(HUD_DEPTH);
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

  /** Distanza già in metri (da `GameManager`, scala: altezza schermo = N m). */
  #formatHudMeters(meters: number | null): string {
    if (meters === null || !Number.isFinite(meters)) {
      return "0.000 m";
    }

    return `${meters.toFixed(3)} m`;
  }

  /** Distanza boccino → ball_player più vicina (valore in metri). */
  setNearestPlayerBallDistanceCm(meters: number | null): void {
    if (!this.scoreText) {
      return;
    }

    this.scoreText.setText(this.#formatHudMeters(meters));
  }

  /** HUD nemico: distanza in metri, stesso formato del player. */
  setEnemyHudNumericText(meters: number | null): void {
    if (!this.scoreEnemyText) {
      return;
    }

    this.scoreEnemyText.setText(this.#formatHudMeters(meters));
  }

  /**
   * Aggiorna solo lo stato punteggio/registry (HUD = distanza su `scoreText`, non toccato qui).
   */
  updateScore(points: number) {
    const finalScore = Math.min(this.score + points, this.maxScore);

    if (finalScore <= this.score) {
      return;
    }

    this.score = finalScore;
    this.displayedScore = finalScore;
    this.scene.registry.set(assetConf.registry.score, this.score);

    if (this.score >= this.maxScore) {
      this.score = this.maxScore;
      this.gameScene.gameOver();
    }
  }

  /**
   * Punteggio nemico + registry (`scoreEnemy`); non aggiorna l’HUD testo finché non colleghi `setEnemyHudNumericText` o simile.
   */
  updateScoreEnemy(points: number): void {
    const finalScore = Math.min(this.scoreEnemy + points, this.maxScoreEnemy);

    if (finalScore <= this.scoreEnemy) {
      return;
    }

    this.scoreEnemy = finalScore;
    this.displayedScoreEnemy = finalScore;
    this.scene.registry.set(assetConf.registry.scoreEnemy, this.scoreEnemy);
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
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH);

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
