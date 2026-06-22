/* eslint-disable no-console */
import * as Phaser from "phaser";

import {Game} from "../scenes/game";
import {IpposumoAssetConf} from "../shared/config/asset-conf.const";
import {
  getIpposumoEnemyDifficulty,
  type IpposumoEnemyDifficultyLevel,
  type IpposumoEnemyDifficultyPreset,
} from "../shared/config/enemy-difficulty.const";

const assetConf = IpposumoAssetConf; //* Generalizzazione

export class UIManager {
  private scene: Phaser.Scene;
  gameScene!: Game;

  public score = 0;
  public opponentScore = 0;
  public maxScore = 30;
  private displayedScore: number = 0;
  private displayedOpponentScore = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private opponentScoreText!: Phaser.GameObjects.Text;
  originalScale: number = 1;
  ofssetY: number = 0;
  ofssetX: number = 0;
  scoreContainer!: Phaser.GameObjects.Container;
  opponentScoreContainer!: Phaser.GameObjects.Container;
  arenaContainer!: Phaser.GameObjects.Container;
  arena!: Phaser.GameObjects.Image;
  playerIppo!: Phaser.GameObjects.Sprite;
  enemyIppo!: Phaser.GameObjects.Sprite;
  private scontroImage: Phaser.GameObjects.Image | null = null;
  private isIppoColliding = false;
  private ippoCollisionCooldownUntil = 0;
  private enemyAutoPushPausedUntil = 0;
  private isGameFinished = false;
  private topFinishLine!: Phaser.GameObjects.Rectangle;
  private bottomFinishLine!: Phaser.GameObjects.Rectangle;
  private playerColliderDebug!: Phaser.GameObjects.Rectangle;
  private enemyColliderDebug!: Phaser.GameObjects.Rectangle;
  private enemyAutoPushTimer?: Phaser.Time.TimerEvent;
  private enemyPressureTimer?: Phaser.Time.TimerEvent;
  private enemyDifficultyLevel: IpposumoEnemyDifficultyLevel = 2;
  private static readonly IPPO_COLLISION_COOLDOWN_MS = 200;
  /** Spazio vuoto nel frame animIppo.png + offset collider originale */
  private static readonly IPPO_SPRITE_PADDING_PERCENT = 0.02;
  private static readonly IPPO_VISUAL_OVERLAP_PERCENT = -0.02;
  /** Micro-sovrapposizione visiva a contatto (dopo trim padding) */
  private static readonly IPPO_CONTACT_OVERLAP_PERCENT = 0.01;
  /** Tuning potenza carica massima (player + collisioni) */
  private static readonly CHARGE_PUSH_POWER_SCALE = 0.7;
  private static readonly CHARGE_HOLD_STEP_PER_LEVEL = 0.32;
  private static readonly CHARGE_KNOCKBACK_PER_LEVEL = 0.28;
  private static readonly CHARGE_COLLISION_POWER_FACTOR = 0.72;
  /** Fase rilascio carica: copertura gap verso avversario e moltiplicatore impatto finale */
  private static readonly CHARGE_RUSH_GAP_COVERAGE_BASE = 0.58;
  private static readonly CHARGE_RUSH_GAP_COVERAGE_PER_LEVEL = 0.045;
  private static readonly CHARGE_RUSH_DURATION_BASE_MS = 130;
  private static readonly CHARGE_RUSH_DURATION_PER_LEVEL_MS = -12;
  private static readonly CHARGE_IMPACT_POWER_PER_LEVEL = 0.18;
  /** Potenza nemico sempre sotto il player: tap ~75%, carica ~48% */
  private static readonly ENEMY_TAP_POWER_RATIO = 0.75;
  private static readonly ENEMY_CHARGE_POWER_RATIO = 0.48;
  private static readonly ENEMY_MAX_CHARGE_LEVEL = 4;
  /** Ogni N spinte automatiche il nemico carica (1 su 5) */
  private static readonly ENEMY_CHARGED_PUSH_EVERY_N = 5;
  private static readonly ENEMY_TAP_DURATION_MS = 88;
  private static readonly ENEMY_TAP_STEP_BONUS = 1.15;
  private static readonly ENEMY_TAP_KNOCKBACK = 1.14;
  private static readonly ENEMY_CHARGE_STEP_POWER_MULT = 1.25;
  private static readonly ENEMY_CHARGE_STEP_DURATION_MS = 62;
  foregroundCharge!: Phaser.GameObjects.Image;
  fulmine!: Phaser.GameObjects.Image;
  chargeButton!: Phaser.GameObjects.Image;
  private chargeHudScale = 1;
  private isChargeButtonPressed = false;
  private isHoldCharging = false;
  private currentChargeLevel = 0;
  private activeChargeOverlay: Phaser.GameObjects.Image | null = null;
  private chargeHoldDelay?: Phaser.Time.TimerEvent;
  private chargeLevelTimer?: Phaser.Time.TimerEvent;
  private activePlayerKnockback = 1;
  private activeEnemyKnockback = 1;
  private activePlayerChargeLevel = 1;
  private activePlayerIsHoldCharge = false;
  private activeEnemyChargeLevel = 1;
  private isPlayerPushActive = false;
  private isEnemyPushActive = false;
  private enemyAutoPushCounter = 0;
  private activePushCollisionResolved = false;
  private chargedReleaseRushContactHandler: (() => void) | null = null;
  private chargedReleaseImpactContactHandler: (() => void) | null = null;

  #captureSeparationSnapshot(): {
    playerKnockback: number;
    enemyKnockback: number;
    playerChargeLevel: number;
    playerIsHoldCharge: boolean;
    enemyChargeLevel: number;
    playerPushActive: boolean;
    enemyPushActive: boolean;
  } {
    return {
      playerKnockback: this.#getActivePushKnockback(true),
      enemyKnockback: this.#getActivePushKnockback(false),
      playerChargeLevel: this.activePlayerChargeLevel,
      playerIsHoldCharge: this.activePlayerIsHoldCharge,
      enemyChargeLevel: this.activeEnemyChargeLevel,
      playerPushActive: this.isPlayerPushActive,
      enemyPushActive: this.isEnemyPushActive,
    };
  }

  #isChargedPushCollision(): boolean {
    return (
      (this.isPlayerPushActive && this.activePlayerIsHoldCharge) ||
      (this.isEnemyPushActive && this.activeEnemyChargeLevel > 1)
    );
  }
  private static readonly CHARGE_TAP_THRESHOLD_MS = 200;
  private static readonly CHARGE_LEVEL_INTERVAL_MS = 350;
  private readonly chargeOverlayKeys = [
    assetConf.image.charge_1,
    assetConf.image.charge_2,
    assetConf.image.charge_3,
    assetConf.image.charge_4,
    assetConf.image.charge_5,
    assetConf.image.charge_6,
    assetConf.image.charge_7,
  ];

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
    this.#rollEnemyDifficultyLevel();
    this.#createBackgroundGame();
    this.#createArena();
    this.#createBackgroundLogoAndLogo();
    //this.#createContainerScore();
    this.#createForegroundCharge();
    //this.#createIconHelp();
    //this.#createLives();
  }

  public setGameScene(scene: Game): void {
    this.gameScene = scene;
  }

  public freezeIppoSpritesOnWin(): void {
    [this.playerIppo, this.enemyIppo].forEach((ippo) => {
      if (!ippo) return;

      const {displayWidth, displayHeight} = ippo;

      ippo.anims.stop();
      ippo.setFrame(1);
      ippo.setDisplaySize(displayWidth, displayHeight);

      if (ippo.body) {
        this.#fitIppoBody(ippo);
      }
    });
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

  #getIppoDisplaySize(ippoScale: number): {width: number; height: number} {
    const ippoFrame = this.scene.textures.getFrame(assetConf.spritesheet.animIppo.key, 0);

    return {
      width: ippoFrame.width * ippoScale,
      height: ippoFrame.height * ippoScale,
    };
  }

  #applyIppoDisplaySize(sprite: Phaser.GameObjects.Sprite, ippoScale: number): void {
    const {width, height} = this.#getIppoDisplaySize(ippoScale);

    const lockDisplaySize = () => {
      sprite.setDisplaySize(width, height);
      if (sprite.body) {
        this.#fitIppoBody(sprite);
      }
    };

    lockDisplaySize();
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, lockDisplaySize);
  }

  #createIppoAnimation(): void {
    if (this.scene.anims.exists(assetConf.keyAnim.animIppo)) return;

    this.scene.anims.create({
      key: assetConf.keyAnim.animIppo,
      frames: this.scene.anims.generateFrameNumbers(assetConf.spritesheet.animIppo.key, {
        start: 0,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });
  }

  #toArenaLocalDistance(worldDistance: number): number {
    return worldDistance / (this.arenaContainer?.scale ?? 1);
  }

  #createArena() {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const arenaOffsetY = this.gameScene.setDynamicValueBasedOnScale(25, 60);
    const arenaCenterY = centerY + arenaOffsetY;
    const arenaScale = this.gameScene.setDynamicValueBasedOnScale(0.3, 1.0); //* scala container arena
    const ippoScale = this.gameScene.setDynamicValueBasedOnScale(0.3, 1.0); //* scala ippos (relativa al container)
    const ippoLocalScale = ippoScale / arenaScale;

    this.arenaContainer = this.scene.add
      .container(centerX, arenaCenterY)
      .setDepth(0)
      .setScrollFactor(0);

    this.arena = this.scene.add.image(0, 0, assetConf.image.arena);
    this.arena.setOrigin(0.5).setDepth(0);

    const arenaHalfHeight = this.arena.height / 2;
    const ippoOffsetY = this.gameScene.setDynamicValueBasedOnScale(30, 70) / arenaScale;

    this.#createIppoAnimation();

    // PLAYER — ippo in basso (coordinate locali al container)
    this.playerIppo = this.scene.add.sprite(
      0,
      arenaHalfHeight + ippoOffsetY,
      assetConf.spritesheet.animIppo.key,
    );
    this.playerIppo.setOrigin(0.5, 1).setFlipY(true).setDepth(1).play(assetConf.keyAnim.animIppo);
    this.#applyIppoDisplaySize(this.playerIppo, ippoLocalScale);

    // ENEMY — ippo in alto
    this.enemyIppo = this.scene.add.sprite(
      0,
      -(arenaHalfHeight + ippoOffsetY),
      assetConf.spritesheet.animIppo.key,
    );
    this.enemyIppo.setOrigin(0.5, 0).setDepth(1).play(assetConf.keyAnim.animIppo);
    this.#applyIppoDisplaySize(this.enemyIppo, ippoLocalScale);

    this.arenaContainer.add([this.arena, this.playerIppo, this.enemyIppo]);

    this.#createFinishLines(arenaScale);
    this.arenaContainer.setScale(arenaScale); //* Modificare valori scala arena (0.4-0.9)
    this.#setupIppoColliders();
    this.#createColliderDebugGraphics();
  }

  #createFinishLines(arenaScale: number): void {
    const arenaHalfHeight = this.arena.height / 2;
    const arenaTop = -arenaHalfHeight;
    const arenaBottom = arenaHalfHeight;
    const topOffset = this.gameScene.setDynamicValueBasedOnScale(35, 70) / arenaScale;
    const bottomOffset = this.gameScene.setDynamicValueBasedOnScale(35, 70) / arenaScale;
    const lineWidth = this.arena.width * 0.85;
    const lineHeight = this.gameScene.setDynamicValueBasedOnScale(4, 8) / arenaScale;

    this.topFinishLine = this.scene.add
      .rectangle(0, arenaTop + topOffset, lineWidth, lineHeight, 0x00ff00, 0)
      .setOrigin(0.5)
      .setDepth(2);

    this.bottomFinishLine = this.scene.add
      .rectangle(0, arenaBottom - bottomOffset, lineWidth, lineHeight, 0xff0000, 0)
      .setOrigin(0.5)
      .setDepth(2);

    this.arenaContainer.add([this.topFinishLine, this.bottomFinishLine]);
  }

  #createColliderDebugGraphics(): void {
    this.playerColliderDebug = this.scene.add
      .rectangle(0, 0, 1, 1, 0x00aaff, 0)
      .setOrigin(0, 0)
      .setDepth(3)
      .setScrollFactor(0);

    this.enemyColliderDebug = this.scene.add
      .rectangle(0, 0, 1, 1, 0xffaa00, 0)
      .setOrigin(0, 0)
      .setDepth(3)
      .setScrollFactor(0);
  }

  #updateColliderDebugGraphics(): void {
    const debugPairs: [Phaser.GameObjects.Sprite, Phaser.GameObjects.Rectangle][] = [
      [this.playerIppo, this.playerColliderDebug],
      [this.enemyIppo, this.enemyColliderDebug],
    ];

    debugPairs.forEach(([ippo, debugRect]) => {
      if (!ippo || !debugRect) return;

      const bounds = this.#getIppoColliderBounds(ippo);

      debugRect.setPosition(bounds.x, bounds.y);
      debugRect.setSize(bounds.width, bounds.height);
    });
  }

  #getIppoColliderSize(sprite: Phaser.GameObjects.Sprite): {width: number; height: number} {
    return {
      width: sprite.displayWidth * 0.65,
      height: sprite.displayHeight * 0.35,
    };
  }

  #getIppoOverlapOffset(sprite: Phaser.GameObjects.Sprite): number {
    return sprite.displayHeight * UIManager.IPPO_VISUAL_OVERLAP_PERCENT;
  }

  /** Bounds visivi senza il padding trasparente sotto/sopra nel PNG */
  #getIppoVisualContactBounds(sprite: Phaser.GameObjects.Sprite): Phaser.Geom.Rectangle {
    const bounds = sprite.getBounds();
    const trim = sprite.displayHeight * UIManager.IPPO_SPRITE_PADDING_PERCENT;

    if (sprite === this.enemyIppo) {
      return new Phaser.Geom.Rectangle(bounds.left, bounds.top, bounds.width, bounds.height - trim);
    }

    return new Phaser.Geom.Rectangle(
      bounds.left,
      bounds.top + trim,
      bounds.width,
      bounds.height - trim,
    );
  }

  #getAllowedVisualOverlapWorld(): number {
    const avgHeight = (this.playerIppo.displayHeight + this.enemyIppo.displayHeight) / 2;

    return Math.max(
      this.gameScene.setDynamicValueBasedOnScale(1, 3),
      avgHeight * UIManager.IPPO_CONTACT_OVERLAP_PERCENT,
    );
  }

  #getIppoVisualOverlapDepth(): number {
    const playerBounds = this.#getIppoVisualContactBounds(this.playerIppo);
    const enemyBounds = this.#getIppoVisualContactBounds(this.enemyIppo);

    return Math.max(0, enemyBounds.bottom - playerBounds.top);
  }

  #getRequiredVisualSeparation(): number {
    return Math.max(0, this.#getIppoVisualOverlapDepth() - this.#getAllowedVisualOverlapWorld());
  }

  #resolveIppoVisualOverlap(): void {
    const separationWorld = this.#getRequiredVisualSeparation();

    if (separationWorld <= 0) return;

    const halfLocal = this.#toArenaLocalDistance(separationWorld / 2);

    this.enemyIppo.y -= halfLocal;
    this.playerIppo.y += halfLocal;
  }

  #getIppoColliderBounds(sprite: Phaser.GameObjects.Sprite): Phaser.Geom.Rectangle {
    const displayBounds = sprite.getBounds();
    const {width: colliderW, height: colliderH} = this.#getIppoColliderSize(sprite);
    const overlapOffset = this.#getIppoOverlapOffset(sprite);
    const colliderLeft = displayBounds.centerX - colliderW / 2;

    if (sprite === this.enemyIppo) {
      const colliderTop = displayBounds.bottom - colliderH;

      return new Phaser.Geom.Rectangle(
        colliderLeft,
        colliderTop,
        colliderW,
        colliderH + overlapOffset,
      );
    }

    return new Phaser.Geom.Rectangle(
      colliderLeft,
      displayBounds.top - overlapOffset,
      colliderW,
      colliderH + overlapOffset,
    );
  }

  #fitIppoBody(sprite: Phaser.GameObjects.Sprite): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    const colliderBounds = this.#getIppoColliderBounds(sprite);
    const displayBounds = sprite.getBounds();
    const scaleX = sprite.scaleX || 1;
    const scaleY = sprite.scaleY || 1;

    body.setSize(colliderBounds.width / scaleX, colliderBounds.height / scaleY);
    body.setOffset(
      (colliderBounds.left - displayBounds.left) / scaleX,
      (colliderBounds.top - displayBounds.top) / scaleY,
    );
    body.updateFromGameObject();
  }

  #setupIppoColliders(): void {
    [this.playerIppo, this.enemyIppo].forEach((ippo) => {
      this.scene.physics.add.existing(ippo);
      const body = ippo.body as Phaser.Physics.Arcade.Body;

      body.setAllowGravity(false);
      body.setImmovable(true);
      this.#fitIppoBody(ippo);
    });

    this.scene.physics.add.overlap(
      this.playerIppo,
      this.enemyIppo,
      this.#onIppoOverlap,
      undefined,
      this,
    );

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.#onGameUpdate, this);
    this.#startEnemyAutoPush();
  }

  #onGameUpdate(): void {
    this.#updateColliderDebugGraphics();
    this.#checkChargedReleaseContact();
    this.#checkPushVisualContact();
    this.#checkIppoSeparation();
    this.#checkFinishLines();
  }

  #checkPushVisualContact(): void {
    if (!this.isPlayerPushActive && !this.isEnemyPushActive) return;
    if (this.activePushCollisionResolved) return;
    if (!this.#isIppoOverlapping()) return;
    if (this.chargedReleaseRushContactHandler || this.chargedReleaseImpactContactHandler) return;

    this.#resolvePushImpactCollision();
  }

  #clearChargedReleaseWatch(): void {
    this.chargedReleaseRushContactHandler = null;
    this.chargedReleaseImpactContactHandler = null;
  }

  #checkChargedReleaseContact(): void {
    if (!this.#isIppoOverlapping()) return;

    if (this.chargedReleaseRushContactHandler) {
      const onRushContact = this.chargedReleaseRushContactHandler;

      this.chargedReleaseRushContactHandler = null;
      onRushContact();

      return;
    }

    if (this.chargedReleaseImpactContactHandler) {
      const onImpactContact = this.chargedReleaseImpactContactHandler;

      this.chargedReleaseImpactContactHandler = null;
      onImpactContact();
    }
  }

  #getTapPushParams(): {pushStep: number; duration: number} {
    return {
      pushStep: this.gameScene.setDynamicValueBasedOnScale(10, 25),
      duration: 110,
    };
  }

  #startEnemyAutoPush(): void {
    this.#scheduleNextEnemyTap(0);
  }

  #rollEnemyDifficultyLevel(): void {
    const {randomMin, randomMax} = assetConf.enemyDifficulty;

    this.enemyDifficultyLevel = Phaser.Math.Between(
      randomMin,
      randomMax,
    ) as IpposumoEnemyDifficultyLevel;
  }

  #getEnemyDifficulty(): IpposumoEnemyDifficultyPreset {
    return getIpposumoEnemyDifficulty(this.enemyDifficultyLevel);
  }

  #scheduleNextEnemyTap(delayMs: number): void {
    if (this.isGameFinished) return;

    this.enemyAutoPushTimer?.remove(false);
    this.enemyAutoPushTimer = this.scene.time.delayedCall(delayMs, () => {
      this.enemyAutoPushTimer = undefined;
      this.#executeEnemyTap();
    });
  }

  #executeEnemyTap(): void {
    if (this.isGameFinished) return;

    const now = this.scene.time.now;

    if (now < this.enemyAutoPushPausedUntil) {
      this.#scheduleNextEnemyTap(this.enemyAutoPushPausedUntil - now);

      return;
    }

    if (this.#isIppoOverlapping()) {
      if (now >= this.ippoCollisionCooldownUntil) {
        this.#handleIppoCollision();
      } else {
        this.#scheduleNextEnemyTap(this.ippoCollisionCooldownUntil - now + 40);
      }

      return;
    }

    this.#tryEnemyAutoPush();
  }

  #tryEnemyAutoPush(): void {
    const chargeLevel = this.#rollEnemyChargeLevel();

    if (chargeLevel !== null) {
      this.#pushEnemyIppoDown(chargeLevel, () => {
        if (this.isGameFinished) return;
        this.#scheduleNextEnemyTap(this.#getEnemyNextPushDelay());
      });

      return;
    }

    this.#pushEnemyIppoTap(() => {
      if (this.isGameFinished) return;
      this.#scheduleNextEnemyTap(this.#getEnemyNextPushDelay());
    });
  }

  #getEnemyNextPushDelay(): number {
    const {autoPushIntervalMs} = this.#getEnemyDifficulty();

    return autoPushIntervalMs + Phaser.Math.Between(-60, 60);
  }

  #rollEnemyTapSteps(): number {
    return 1;
  }

  #getEnemyTapPushParams(): {pushStep: number; duration: number} {
    const {pushStep} = this.#getTapPushParams();

    return {
      pushStep: pushStep * UIManager.ENEMY_TAP_STEP_BONUS,
      duration: UIManager.ENEMY_TAP_DURATION_MS,
    };
  }

  #rollEnemyChargeLevel(): number | null {
    this.enemyAutoPushCounter++;

    if (this.enemyAutoPushCounter % UIManager.ENEMY_CHARGED_PUSH_EVERY_N !== 0) return null;

    const difficulty = this.#getEnemyDifficulty();
    const level = Phaser.Math.Between(difficulty.chargeLevelMin, difficulty.chargeLevelMax);

    return Phaser.Math.Clamp(level, 1, UIManager.ENEMY_MAX_CHARGE_LEVEL);
  }

  #rollEnemyCounterLevel(playerChargeLevel: number, playerIsHoldCharge: boolean): number {
    const {chargeLevelMin, chargeLevelMax} = this.#getEnemyDifficulty();

    if (!playerIsHoldCharge) {
      return Phaser.Math.Between(chargeLevelMin, chargeLevelMax);
    }

    const min = Math.max(chargeLevelMin, playerChargeLevel - 1);
    const max = Math.min(chargeLevelMax, playerChargeLevel + 1);

    return Phaser.Math.Between(min, max);
  }

  #triggerEnemyCounterPush(playerChargeLevel: number, playerIsHoldCharge: boolean): void {
    if (this.isGameFinished) return;

    const difficulty = this.#getEnemyDifficulty();

    if (Math.random() > difficulty.counterPushChance) return;

    this.enemyAutoPushPausedUntil = 0;
    this.scene.tweens.killTweensOf(this.enemyIppo);

    const strongCounterChance = playerIsHoldCharge
      ? difficulty.chargedCounterChance
      : difficulty.chargedCounterOnTapChance;

    if (Math.random() < strongCounterChance) {
      this.#pushEnemyIppoDown(this.#rollEnemyCounterLevel(playerChargeLevel, playerIsHoldCharge));

      return;
    }

    this.#pushEnemyIppoTap();
  }

  #startEnemyPressureWhilePlayerCharges(): void {
    this.#stopEnemyPressureWhilePlayerCharges();

    const {pressureIntervalMs} = this.#getEnemyDifficulty();

    if (pressureIntervalMs <= 0) return;

    this.enemyPressureTimer = this.scene.time.addEvent({
      delay: pressureIntervalMs,
      loop: true,
      callback: () => {
        if (!this.isChargeButtonPressed || this.isGameFinished) return;

        if (this.#isIppoOverlapping()) {
          if (this.scene.time.now >= this.ippoCollisionCooldownUntil) {
            this.#handleIppoCollision();
          }

          return;
        }

        if (this.isEnemyPushActive) return;

        this.enemyAutoPushPausedUntil = 0;
        this.#tryEnemyAutoPush();
      },
    });
  }

  #stopEnemyPressureWhilePlayerCharges(): void {
    this.enemyPressureTimer?.destroy();
    this.enemyPressureTimer = undefined;
  }

  #getEnemyPushPowerScale(isCharged: boolean): number {
    if (!isCharged) {
      return UIManager.ENEMY_TAP_POWER_RATIO;
    }

    const {pushPowerScale} = this.#getEnemyDifficulty();
    const maxAllowed = UIManager.CHARGE_PUSH_POWER_SCALE * UIManager.ENEMY_CHARGE_POWER_RATIO;

    return Math.min(pushPowerScale, maxAllowed);
  }

  #getEnemyKnockbackMultiplier(chargeLevel: number): number {
    const level = Phaser.Math.Clamp(chargeLevel, 1, this.chargeOverlayKeys.length);
    const playerKnockback = this.#getKnockbackMultiplier(level, true);

    return 1 + (playerKnockback - 1) * UIManager.ENEMY_CHARGE_POWER_RATIO;
  }

  #pushEnemyIppoTap(onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this.enemyIppo);

    const tapSteps = this.#rollEnemyTapSteps();

    this.isEnemyPushActive = true;
    this.activeEnemyKnockback = UIManager.ENEMY_TAP_KNOCKBACK;
    this.activeEnemyChargeLevel = 1;

    this.#executeEnemyTapSteps(tapSteps, onComplete);
  }

  #executeEnemyTapSteps(remainingSteps: number, onComplete?: () => void): void {
    const {pushStep, duration} = this.#getEnemyTapPushParams();
    const scaledPushStep = pushStep * this.#getEnemyPushPowerScale(false);

    this.scene.tweens.add({
      targets: this.enemyIppo,
      y: this.enemyIppo.y + this.#toArenaLocalDistance(scaledPushStep),
      duration,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.isGameFinished) return;

        if (this.#isIppoOverlapping()) {
          this.#resolvePushImpactCollision();

          return;
        }

        if (remainingSteps > 1) {
          this.#executeEnemyTapSteps(remainingSteps - 1, onComplete);

          return;
        }

        this.isEnemyPushActive = false;
        onComplete?.();
      },
    });
  }

  #executeEnemyChargedSteps(remainingSteps: number, onComplete?: () => void): void {
    const {pushStep} = this.#getEnemyTapPushParams();
    const scaledPushStep =
      pushStep * this.#getEnemyPushPowerScale(true) * UIManager.ENEMY_CHARGE_STEP_POWER_MULT;

    this.scene.tweens.add({
      targets: this.enemyIppo,
      y: this.enemyIppo.y + this.#toArenaLocalDistance(scaledPushStep),
      duration: UIManager.ENEMY_CHARGE_STEP_DURATION_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.isGameFinished) return;

        if (this.#isIppoOverlapping()) {
          this.#resolvePushImpactCollision();

          return;
        }

        if (remainingSteps > 1) {
          this.#executeEnemyChargedSteps(remainingSteps - 1, onComplete);

          return;
        }

        this.isEnemyPushActive = false;
        this.activeEnemyKnockback = 1;
        this.activeEnemyChargeLevel = 1;
        onComplete?.();
      },
    });
  }

  #pushEnemyIppoDown(chargeLevel: number, onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this.enemyIppo);

    const clampedLevel = Phaser.Math.Clamp(chargeLevel, 1, this.chargeOverlayKeys.length);

    this.isEnemyPushActive = true;
    this.activeEnemyChargeLevel = clampedLevel;
    this.activeEnemyKnockback = this.#getEnemyKnockbackMultiplier(clampedLevel);
    this.#executeEnemyChargedSteps(clampedLevel, onComplete);
  }

  #onIppoOverlap(): void {
    if (this.#isPushAnimationControllingCollision()) return;

    this.#handleIppoCollision();
  }

  #isPushAnimationControllingCollision(): boolean {
    return this.isPlayerPushActive || this.isEnemyPushActive;
  }

  #resolvePushImpactCollision(): void {
    if (this.activePushCollisionResolved) return;

    this.#handleIppoCollision();
  }

  #handleIppoCollision(): void {
    const now = this.scene.time.now;
    const isChargedHit = this.#isChargedPushCollision();

    if (now < this.ippoCollisionCooldownUntil && !isChargedHit) return;
    if (this.activePushCollisionResolved) return;

    const separationSnapshot = this.#captureSeparationSnapshot();

    this.activePushCollisionResolved = true;
    this.#clearChargedReleaseWatch();
    this.#updateScontroImage();

    this.isIppoColliding = true;
    this.ippoCollisionCooldownUntil = now + UIManager.IPPO_COLLISION_COOLDOWN_MS;
    this.enemyAutoPushPausedUntil = now + this.#getEnemyDifficulty().autoPushPauseMs;

    this.gameScene.audioManager.playAudio(assetConf.audio.hit);

    const pauseMs = this.#getEnemyDifficulty().autoPushPauseMs;

    this.scene.time.delayedCall(0, () => {
      this.scene.tweens.killTweensOf(this.playerIppo);
      this.scene.tweens.killTweensOf(this.enemyIppo);
      this.#forceSeparateIppoPair(separationSnapshot);
      this.#resetPushState();

      if (!this.isGameFinished) {
        this.#scheduleNextEnemyTap(pauseMs);
      }
    });
  }

  #resetPushState(): void {
    this.isEnemyPushActive = false;
    this.isPlayerPushActive = false;
    this.activePlayerKnockback = 1;
    this.activeEnemyKnockback = 1;
    this.activePlayerChargeLevel = 1;
    this.activePlayerIsHoldCharge = false;
    this.activeEnemyChargeLevel = 1;
    this.activePushCollisionResolved = false;
    this.#clearChargedReleaseWatch();
  }

  #updateScontroImage(): void {
    const playerBounds = this.#getIppoColliderBounds(this.playerIppo);
    const enemyBounds = this.#getIppoColliderBounds(this.enemyIppo);
    const centerX = (playerBounds.centerX + enemyBounds.centerX) / 2;
    const centerY = (playerBounds.centerY + enemyBounds.centerY) / 2;
    const scontroScale = this.gameScene.setDynamicValueBasedOnScale(0.4, 0.8);

    if (!this.scontroImage) {
      this.scontroImage = this.scene.add.image(centerX, centerY, assetConf.image.scontro);
      this.scontroImage
        .setOrigin(0.5)
        .setDepth(5)
        .setScrollFactor(0)
        .setScale(scontroScale)
        .setVisible(false);
    }

    this.scontroImage.setPosition(centerX, centerY).setVisible(true);
  }

  #getIppoOverlapDepth(): number {
    return this.#getIppoVisualOverlapDepth();
  }

  #getDistanceToEnemyWorld(): number {
    const playerBounds = this.#getIppoVisualContactBounds(this.playerIppo);
    const enemyBounds = this.#getIppoVisualContactBounds(this.enemyIppo);

    return Math.max(0, playerBounds.top - enemyBounds.bottom);
  }

  #isIppoOverlapping(): boolean {
    return this.#getIppoVisualOverlapDepth() > this.#getAllowedVisualOverlapWorld();
  }

  #getKnockbackMultiplier(chargeLevel: number, isCharged: boolean): number {
    if (!isCharged) return 1;

    const level = Phaser.Math.Clamp(chargeLevel, 1, this.chargeOverlayKeys.length);

    return 1 + (level - 1) * UIManager.CHARGE_KNOCKBACK_PER_LEVEL;
  }

  #getHoldChargePushMetrics(
    chargeLevel: number,
    powerScale = UIManager.CHARGE_PUSH_POWER_SCALE,
  ): {clampedLevel: number; pushStepWorld: number; totalPower: number} {
    const clampedLevel = Phaser.Math.Clamp(chargeLevel, 1, this.chargeOverlayKeys.length);
    const basePushStep = this.gameScene.setDynamicValueBasedOnScale(10, 22) * powerScale;
    const holdStepMultiplier = 1 + clampedLevel * UIManager.CHARGE_HOLD_STEP_PER_LEVEL;
    const pushStepWorld = basePushStep * holdStepMultiplier;

    return {
      clampedLevel,
      pushStepWorld,
      totalPower: pushStepWorld * clampedLevel,
    };
  }

  #getChargePushPower(chargeLevel: number, isHoldCharge: boolean): number {
    if (!isHoldCharge) {
      return this.#getTapPushParams().pushStep;
    }

    return this.#getHoldChargePushMetrics(chargeLevel).totalPower;
  }

  #getActivePushKnockback(forPlayer: boolean): number {
    if (forPlayer) {
      return this.isPlayerPushActive ? this.activePlayerKnockback : 0;
    }

    return this.isEnemyPushActive ? this.activeEnemyKnockback : 0;
  }

  #getTapCollisionSeparation(): number {
    return this.#getRequiredVisualSeparation();
  }

  #getChargedCollisionSeparation(
    chargeLevel: number,
    isHoldCharge: boolean,
    powerScale = 1,
  ): number {
    const chargePower = this.#getChargePushPower(chargeLevel, isHoldCharge) * powerScale;
    const visualSeparation = this.#getRequiredVisualSeparation();

    return Math.max(chargePower * UIManager.CHARGE_COLLISION_POWER_FACTOR, visualSeparation);
  }

  #addSeparationTween(
    target: Phaser.GameObjects.Sprite,
    y: number,
    duration: number,
    ease: string,
  ): void {
    this.scene.tweens.add({
      targets: target,
      y,
      duration,
      ease,
      onComplete: () => this.#resolveIppoVisualOverlap(),
    });
  }

  #forceSeparateIppoPair(snapshot = this.#captureSeparationSnapshot()): void {
    const playerKnockback = snapshot.playerPushActive ? snapshot.playerKnockback : 0;
    const enemyKnockback = snapshot.enemyPushActive ? snapshot.enemyKnockback : 0;

    if (playerKnockback > enemyKnockback) {
      this.#applyChargedSeparation("player", playerKnockback, snapshot);

      return;
    }

    if (enemyKnockback > playerKnockback) {
      this.#applyChargedSeparation("enemy", enemyKnockback, snapshot);

      return;
    }

    if (snapshot.playerPushActive && snapshot.playerIsHoldCharge) {
      this.#applyChargedSeparation(
        "player",
        Math.max(playerKnockback, this.#getKnockbackMultiplier(snapshot.playerChargeLevel, true)),
        snapshot,
      );

      return;
    }

    if (snapshot.enemyPushActive && snapshot.enemyChargeLevel > 1) {
      this.#applyChargedSeparation("enemy", Math.max(enemyKnockback, 1), snapshot);

      return;
    }

    this.#applyTapSeparation(snapshot);
  }

  #applyChargedSeparation(
    winner: "player" | "enemy",
    knockback: number,
    snapshot = this.#captureSeparationSnapshot(),
  ): void {
    const isPlayerWinner = winner === "player";
    const chargeLevel = isPlayerWinner ? snapshot.playerChargeLevel : snapshot.enemyChargeLevel;
    const isHoldCharge = isPlayerWinner ? snapshot.playerIsHoldCharge : true;
    const powerScale = isPlayerWinner ? 1 : this.#getEnemyPushPowerScale(true);
    const separation = this.#getChargedCollisionSeparation(chargeLevel, isHoldCharge, powerScale);
    const winnerRatio = Phaser.Math.Clamp(0.55 + (knockback - 1) * 0.08, 0.55, 0.85);
    let winnerSeparation =
      separation * winnerRatio +
      this.gameScene.setDynamicValueBasedOnScale(6, 16) * (knockback - 1);
    const loserSeparation = separation * (1 - winnerRatio);
    const duration = 110 + knockback * 12;
    const winnerEase = "Cubic.easeOut";
    const loserEase = "Quad.easeOut";

    if (isPlayerWinner && isHoldCharge) {
      const minEnemyPush = this.gameScene.setDynamicValueBasedOnScale(12, 28);

      winnerSeparation = Math.max(winnerSeparation, minEnemyPush);
    }

    this.#resolveIppoVisualOverlap();

    if (isPlayerWinner) {
      this.#addSeparationTween(
        this.enemyIppo,
        this.enemyIppo.y - this.#toArenaLocalDistance(winnerSeparation),
        duration,
        winnerEase,
      );

      this.#addSeparationTween(
        this.playerIppo,
        this.playerIppo.y + this.#toArenaLocalDistance(loserSeparation),
        duration,
        loserEase,
      );

      return;
    }

    this.#addSeparationTween(
      this.playerIppo,
      this.playerIppo.y + this.#toArenaLocalDistance(winnerSeparation),
      duration,
      winnerEase,
    );

    this.#addSeparationTween(
      this.enemyIppo,
      this.enemyIppo.y - this.#toArenaLocalDistance(loserSeparation),
      duration,
      loserEase,
    );
  }

  #applyTapSeparation(snapshot = this.#captureSeparationSnapshot()): void {
    const isEnemyTapPush =
      snapshot.enemyPushActive && snapshot.enemyChargeLevel === 1 && snapshot.enemyKnockback > 1;
    const isPlayerTapPush =
      snapshot.playerPushActive && !snapshot.playerIsHoldCharge && snapshot.playerKnockback <= 1;

    let separation = this.#getTapCollisionSeparation();

    if (isEnemyTapPush) {
      const enemyTapPower =
        this.#getEnemyTapPushParams().pushStep * this.#getEnemyPushPowerScale(false);
      const margin = this.gameScene.setDynamicValueBasedOnScale(3, 8);

      separation = Math.max(separation, enemyTapPower + margin);
    }

    let enemyShare = 0.5;

    if (isEnemyTapPush && !isPlayerTapPush) {
      enemyShare = 0.64;
    } else if (isPlayerTapPush && !isEnemyTapPush) {
      enemyShare = 0.36;
    }

    const enemySeparation = separation * enemyShare;
    const playerSeparation = separation * (1 - enemyShare);
    const duration = isEnemyTapPush ? 115 : 130;

    this.#resolveIppoVisualOverlap();

    this.#addSeparationTween(
      this.enemyIppo,
      this.enemyIppo.y - this.#toArenaLocalDistance(enemySeparation),
      duration,
      "Quad.easeOut",
    );

    this.#addSeparationTween(
      this.playerIppo,
      this.playerIppo.y + this.#toArenaLocalDistance(playerSeparation),
      duration,
      "Quad.easeOut",
    );
  }

  #checkIppoSeparation(): void {
    if (!this.#isIppoOverlapping()) {
      this.isIppoColliding = false;
      this.scontroImage?.setVisible(false);

      return;
    }

    if (this.#isPushAnimationControllingCollision()) return;

    if (this.scene.time.now >= this.ippoCollisionCooldownUntil) {
      this.#handleIppoCollision();
    }
  }

  #checkFinishLines(): void {
    if (this.isGameFinished) return;

    const enemyBounds = this.#getIppoColliderBounds(this.enemyIppo);
    const playerBounds = this.#getIppoColliderBounds(this.playerIppo);
    const passBuffer = this.gameScene.setDynamicValueBasedOnScale(3, 10);

    const topLineBounds = this.topFinishLine.getBounds();
    const bottomLineBounds = this.bottomFinishLine.getBounds();
    const topLineEdge = topLineBounds.top;
    const bottomLineEdge = bottomLineBounds.bottom;

    // Win: tutto il collider enemy oltre la linea alta
    if (enemyBounds.bottom < topLineEdge - passBuffer) {
      this.#finishGame("Win");

      return;
    }

    // Lose: tutto il collider player oltre la linea bassa
    if (playerBounds.top > bottomLineEdge + passBuffer) {
      this.#finishGame("Failed");
    }
  }

  #finishGame(resultStatus: "Win" | "Failed"): void {
    if (this.isGameFinished) return;

    this.isGameFinished = true;
    this.enemyAutoPushTimer?.remove(false);
    this.enemyAutoPushTimer = undefined;
    this.#stopEnemyPressureWhilePlayerCharges();
    this.chargeButton?.disableInteractive();
    this.gameScene.audioManager.stopAudio(assetConf.audio.caricamento);
    this.scene.tweens.killTweensOf(this.playerIppo);
    this.scene.tweens.killTweensOf(this.enemyIppo);

    this.#animateEndScore(resultStatus === "Win");
    this.gameScene.endGame(resultStatus);
  }

  #animateEndScore(forPlayer: boolean): void {
    if (forPlayer) {
      this.score = 1;
      this.displayedScore = 1;
      this.scene.registry.set(assetConf.registry.score, this.score);
    } else {
      this.opponentScore = 1;
      this.displayedOpponentScore = 1;
    }

    if (!this.scoreContainer) return;

    const scoreText = forPlayer ? this.scoreText : this.opponentScoreText;
    const container = forPlayer ? this.scoreContainer : this.opponentScoreContainer;

    scoreText.setText("1");
    scoreText.setScale(1.3);

    const baseScaleX = container.scaleX;
    const baseScaleY = container.scaleY;

    this.scene.tweens.add({
      targets: scoreText,
      scale: {from: 1.3, to: 1.6},
      duration: 100,
      ease: "Quad.easeOut",
      yoyo: true,
    });

    this.scene.tweens.add({
      targets: container,
      scaleX: baseScaleX * 1.18,
      scaleY: baseScaleY * 1.18,
      duration: 180,
      ease: "Back.easeOut",
      yoyo: true,
    });
  }

  #createForegroundCharge() {
    const insetX = this.gameScene.setDynamicValueBasedOnScale(20, 50);
    const insetY = this.gameScene.setDynamicValueBasedOnScale(20, 50);
    const bottomY = this.scene.scale.height - insetY;
    const chargeOffsetY = this.gameScene.setDynamicValueBasedOnScale(50, 180);
    const chargeY = bottomY - chargeOffsetY;
    const hudScale = this.gameScene.setDynamicValueBasedOnScale(0.4, 0.9);
    const {buttonScaleMin, buttonScaleMax} = assetConf.layout.chargeHud;
    const btnScale = this.gameScene.setDynamicValueBasedOnScale(buttonScaleMin, buttonScaleMax);

    this.chargeHudScale = hudScale;

    this.foregroundCharge = this.scene.add.image(0, chargeY, assetConf.image.foregroundCharge);

    this.foregroundCharge.setOrigin(0.5, 0.5).setDepth(8).setScrollFactor(0).setScale(hudScale);
    this.foregroundCharge.setX(insetX + this.foregroundCharge.displayWidth / 2);

    this.fulmine = this.scene.add.image(
      this.foregroundCharge.x,
      this.foregroundCharge.y,
      assetConf.image.fulmine,
    );

    this.fulmine
      .setOrigin(0.5, 0.5)
      .setDepth(11)
      .setScrollFactor(0)
      .setDisplaySize(this.foregroundCharge.displayWidth, this.foregroundCharge.displayHeight);

    this.chargeButton = this.scene.add.image(
      this.scene.scale.width / 2,
      chargeY,
      assetConf.image.btn_unpressed,
    );

    this.chargeButton.setOrigin(0.5, 0.5).setDepth(8).setScrollFactor(0).setScale(btnScale);

    this.#setupChargeButton();
  }

  #setupChargeButton(): void {
    this.chargeButton.setInteractive({useHandCursor: true});
    this.chargeButton.on("pointerdown", () => this.#onChargePointerDown());
    this.chargeButton.on("pointerup", () => this.#onChargePointerUp());
    this.chargeButton.on("pointerout", () => this.#onChargePointerUp());
  }

  #onChargePointerDown(): void {
    this.isChargeButtonPressed = true;
    this.isHoldCharging = false;
    this.chargeButton.setTexture(assetConf.image.btn_pressed);
    this.gameScene.audioManager.playLoop(assetConf.audio.caricamento);
    this.#clearChargeOverlay();
    this.#setChargeLevel(1);

    this.chargeHoldDelay?.destroy();
    this.chargeHoldDelay = this.scene.time.delayedCall(UIManager.CHARGE_TAP_THRESHOLD_MS, () => {
      if (!this.isChargeButtonPressed) return;

      this.isHoldCharging = true;
      this.#startHoldChargeProgression();
      this.#startEnemyPressureWhilePlayerCharges();
    });
  }

  #onChargePointerUp(): void {
    if (!this.isChargeButtonPressed) return;

    this.isChargeButtonPressed = false;
    this.gameScene.audioManager.stopAudio(assetConf.audio.caricamento);
    this.chargeButton.setTexture(assetConf.image.btn_unpressed);
    this.chargeHoldDelay?.destroy();
    this.chargeHoldDelay = undefined;
    this.#stopHoldChargeProgression();
    this.#stopEnemyPressureWhilePlayerCharges();

    const isHoldCharge = this.isHoldCharging;
    const chargeLevel = Phaser.Math.Clamp(
      isHoldCharge ? this.currentChargeLevel : 1,
      1,
      this.chargeOverlayKeys.length,
    );

    this.#clearChargeOverlay();
    this.#pushPlayerIppoUp(chargeLevel, isHoldCharge);
    this.isHoldCharging = false;
  }

  #startHoldChargeProgression(): void {
    this.#stopHoldChargeProgression();

    this.chargeLevelTimer = this.scene.time.addEvent({
      delay: UIManager.CHARGE_LEVEL_INTERVAL_MS,
      loop: true,
      callback: () => {
        if (this.currentChargeLevel >= this.chargeOverlayKeys.length) return;

        this.#setChargeLevel(this.currentChargeLevel + 1);
      },
    });
  }

  #stopHoldChargeProgression(): void {
    this.chargeLevelTimer?.destroy();
    this.chargeLevelTimer = undefined;
  }

  #setChargeLevel(level: number): void {
    this.currentChargeLevel = Phaser.Math.Clamp(level, 1, this.chargeOverlayKeys.length);

    if (!this.activeChargeOverlay) {
      this.activeChargeOverlay = this.#createChargeOverlay(this.currentChargeLevel);

      return;
    }

    this.activeChargeOverlay.setTexture(this.chargeOverlayKeys[this.currentChargeLevel - 1]);
  }

  #createChargeOverlay(level: number): Phaser.GameObjects.Image {
    const chargeIndex = Phaser.Math.Clamp(level, 1, this.chargeOverlayKeys.length) - 1;

    const chargeOverlay = this.scene.add.image(
      this.foregroundCharge.x,
      this.foregroundCharge.y,
      this.chargeOverlayKeys[chargeIndex],
    );

    chargeOverlay.setOrigin(0.5, 0.5).setDepth(10).setScrollFactor(0).setScale(this.chargeHudScale);

    return chargeOverlay;
  }

  #clearChargeOverlay(): void {
    this.activeChargeOverlay?.destroy();
    this.activeChargeOverlay = null;
    this.currentChargeLevel = 0;
  }

  #getChargedReleaseMetrics(
    chargeLevel: number,
    powerScale = UIManager.CHARGE_PUSH_POWER_SCALE,
  ): {
    rushStepWorld: number;
    rushDuration: number;
    impactStepWorld: number;
    impactDuration: number;
  } {
    const holdMetrics = this.#getHoldChargePushMetrics(chargeLevel, powerScale);
    const gapWorld = this.#getDistanceToEnemyWorld();
    const rushCoverage = Phaser.Math.Clamp(
      UIManager.CHARGE_RUSH_GAP_COVERAGE_BASE +
        (holdMetrics.clampedLevel - 1) * UIManager.CHARGE_RUSH_GAP_COVERAGE_PER_LEVEL,
      0.5,
      0.92,
    );
    const minRushWorld = this.gameScene.setDynamicValueBasedOnScale(18, 40);
    const rushStepWorld = Math.max(minRushWorld, gapWorld * rushCoverage);
    const rushDuration = Math.max(
      40,
      UIManager.CHARGE_RUSH_DURATION_BASE_MS +
        (holdMetrics.clampedLevel - 1) * UIManager.CHARGE_RUSH_DURATION_PER_LEVEL_MS,
    );
    const impactMultiplier =
      1 + (holdMetrics.clampedLevel - 1) * UIManager.CHARGE_IMPACT_POWER_PER_LEVEL;
    const impactStepWorld = holdMetrics.totalPower * impactMultiplier;
    const impactDuration = 70 + holdMetrics.clampedLevel * 16;

    return {rushStepWorld, rushDuration, impactStepWorld, impactDuration};
  }

  #runChargedReleaseSequence(
    sprite: Phaser.GameObjects.Sprite,
    deltaSign: -1 | 1,
    metrics: {
      rushStepWorld: number;
      rushDuration: number;
      impactStepWorld: number;
      impactDuration: number;
    },
    onComplete?: () => void,
  ): void {
    const rushStep = this.#toArenaLocalDistance(metrics.rushStepWorld) * deltaSign;
    const impactStep = this.#toArenaLocalDistance(metrics.impactStepWorld) * deltaSign;
    let pushFinished = false;
    let rushPhaseDone = false;
    let impactPhaseDone = false;

    const finishPush = () => {
      if (pushFinished) return;

      pushFinished = true;
      this.#clearChargedReleaseWatch();

      if (!this.activePushCollisionResolved) {
        this.#resetPushState();
      }

      onComplete?.();
    };

    const executeImpact = () => {
      if (pushFinished || rushPhaseDone) return;

      rushPhaseDone = true;

      if (this.#isIppoOverlapping()) {
        this.#resolvePushImpactCollision();
        finishPush();

        return;
      }

      this.chargedReleaseImpactContactHandler = () => {
        if (pushFinished || impactPhaseDone) return;

        impactPhaseDone = true;
        this.scene.time.delayedCall(0, () => {
          this.scene.tweens.killTweensOf(sprite);
          this.#resolvePushImpactCollision();
          finishPush();
        });
      };

      this.scene.tweens.add({
        targets: sprite,
        y: sprite.y + impactStep,
        duration: metrics.impactDuration,
        ease: "Back.easeOut",
        onComplete: () => {
          this.chargedReleaseImpactContactHandler = null;

          if (pushFinished || impactPhaseDone) return;

          impactPhaseDone = true;

          if (this.#isIppoOverlapping()) {
            this.#resolvePushImpactCollision();
          }

          finishPush();
        },
      });
    };

    this.chargedReleaseRushContactHandler = () => {
      if (rushPhaseDone || pushFinished) return;

      this.scene.time.delayedCall(0, () => {
        if (rushPhaseDone || pushFinished) return;

        this.scene.tweens.killTweensOf(sprite);
        executeImpact();
      });
    };

    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y + rushStep,
      duration: metrics.rushDuration,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.chargedReleaseRushContactHandler = null;

        if (pushFinished || rushPhaseDone) return;

        if (this.#isIppoOverlapping()) {
          rushPhaseDone = true;
          this.#resolvePushImpactCollision();
          finishPush();

          return;
        }

        executeImpact();
      },
    });
  }

  #pushPlayerIppoChargedRelease(clampedLevel: number, onComplete?: () => void): void {
    this.#runChargedReleaseSequence(
      this.playerIppo,
      -1,
      this.#getChargedReleaseMetrics(clampedLevel),
      onComplete,
    );
  }

  #pushPlayerIppoUp(chargeLevel: number, isHoldCharge: boolean, onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this.playerIppo);

    const clampedLevel = Phaser.Math.Clamp(chargeLevel, 1, this.chargeOverlayKeys.length);

    this.isPlayerPushActive = true;
    this.activePlayerChargeLevel = clampedLevel;
    this.activePlayerIsHoldCharge = isHoldCharge;
    this.activePlayerKnockback = this.#getKnockbackMultiplier(clampedLevel, isHoldCharge);

    if (!isHoldCharge) {
      this.#triggerEnemyCounterPush(clampedLevel, false);
    } else {
      this.scene.tweens.killTweensOf(this.enemyIppo);
      this.isEnemyPushActive = false;
      this.activeEnemyKnockback = 1;
      this.activeEnemyChargeLevel = 1;
      this.enemyAutoPushPausedUntil = this.scene.time.now + 450;
    }

    if (isHoldCharge) {
      this.#pushPlayerIppoChargedRelease(clampedLevel, onComplete);

      return;
    }

    const tapPush = this.#getTapPushParams();
    const pushStep = this.#toArenaLocalDistance(tapPush.pushStep);
    let stepsDone = 0;

    const finishPush = () => {
      this.#resetPushState();
      onComplete?.();
    };

    const executeStep = () => {
      if (stepsDone >= clampedLevel) {
        finishPush();

        return;
      }

      if (this.#isIppoOverlapping()) {
        this.#resolvePushImpactCollision();
        finishPush();

        return;
      }

      stepsDone++;

      this.scene.tweens.add({
        targets: this.playerIppo,
        y: this.playerIppo.y - pushStep,
        duration: tapPush.duration,
        ease: "Sine.easeOut",
        onComplete: () => {
          if (this.#isIppoOverlapping()) {
            this.#resolvePushImpactCollision();
            finishPush();

            return;
          }

          executeStep();
        },
      });
    };

    executeStep();
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
      .setScale(1.1);

    // 5. Testo punteggio (a destra rispetto al centro)
    this.scoreText = this.scene.add
      .text(60, 0, `${this.score}`, {
        fontFamily: "Paytone One",
        fontSize: "48px",
        color: "#0066FF",
      })
      .setOrigin(0.5)
      .setScale(1.3);

    // 6. Aggiungo tutti gli elementi al container
    this.scoreContainer.add([backgroundScore, iconScore, this.scoreText]);

    // 7. Scala del container
    this.scoreContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 0.8)); //* Modificare valori scala (3-3)

    const opponentCenterX = this.scene.scale.width - centerX;

    this.opponentScoreContainer = this.scene.add.container(opponentCenterX, centerY);
    this.opponentScoreContainer.setScrollFactor(0).setDepth(10);

    const opponentBackgroundScore = this.scene.add
      .image(0, 0, assetConf.image.backgroundScore)
      .setOrigin(0.5)
      .setScale(1.4);

    const opponentIconScore = this.scene.add
      .image(90, 0, assetConf.image.iconScore)
      .setOrigin(0.5)
      .setScale(1.1);

    this.opponentScoreText = this.scene.add
      .text(-60, 0, `${this.opponentScore}`, {
        fontFamily: "Paytone One",
        fontSize: "48px",
        color: "#FF0000",
      })
      .setOrigin(0.5)
      .setScale(1.3);

    this.opponentScoreContainer.add([
      opponentBackgroundScore,
      opponentIconScore,
      this.opponentScoreText,
    ]);
    this.opponentScoreContainer.setScale(this.gameScene.setDynamicValueBasedOnScale(0.4, 0.8));
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

    if (!this.scoreContainer) {
      this.scene.registry.set(assetConf.registry.score, this.score);

      if (this.score >= this.maxScore) {
        this.score = this.maxScore;
        this.gameScene.gameOver();
      }

      return;
    }

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
