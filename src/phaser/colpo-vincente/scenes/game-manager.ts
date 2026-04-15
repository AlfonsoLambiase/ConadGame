/* eslint-disable @typescript-eslint/no-unused-vars */
import type {LaneMinimapBlip} from "../components/UIManager";

import * as Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {ColpoVincenteGameplayConfig} from "../config/colpo-vincente-gameplay.config";
import {ColpoVincenteAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = ColpoVincenteAssetConf;
const gameplayCfg = ColpoVincenteGameplayConfig;

type MatchPhase =
  | "boccino_pending"
  | "boccino_rolling"
  | "flag_to_player"
  | "player_turn"
  | "enemy_turn";

/** Palle da considerare per il bandierino post-tiro: stessa lista = tutte ferme prima di riattivare. */
type FlagIdleTrackedBall = {
  ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image;
  maxSpeed: number;
};

export type ColpoVincenteMatchOutcome = "win" | "draw" | "loss";

type AxisAlignedWallConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  /** 0 = invisibile, collisioni Matter attive. */
  alpha?: number;
};

/** Parete inclinata: un solo rect ruotato con Matter (rimbalzo lungo la superficie). */
type SegmentLineWallConfig = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  color: number;
  /** 0 = invisibile, collisioni Matter attive. */
  alpha?: number;
};

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;

  public canShoot = false;
  public isGameOver = false;
  /** Esito Colpo Vincente: vittoria se la palla giocatore più vicina batte quella nemica (dopo 3+3 tiri). */
  public playerWonColpoVincente = true;
  /** Esito finale esplicito (vittoria / pareggio / sconfitta). */
  public colpoVincenteMatchOutcome: ColpoVincenteMatchOutcome = "win";

  gameScene!: Game;

  speedBall = 80;
  timeAddNewRow = 20000;

  /**
   * Valori “dinamici”
   */
  /**
   * **Moltiplicatore forza lancio** (pull → velocity).
   * Se su uno schermo piccolo “tiri poco” e su uno grande “tiri troppo”, questo è il primo valore da toccare.
   */
  private dynLaunchPowerMul = 1;
  /** Moltiplicatore device per velocità boccino (auto-launch iniziale). */
  private dynBoccinoAutoLaunchSpeedWorld = 60;
  /** Moltiplicatore device per potenza lancio IA (enemy). */
  private dynEnemyLaunchPowerMul = 1;
  /**
   * **Max pull** dello slingshot (world px): quanto puoi trascinare via il dito dalla palla.
   * Più alto = puoi caricare più potenza (perché il pull massimo cresce).
   */
  private dynMaxPullWorld = 160;
  /**
   * **Cap velocità** (player/enemy) dopo il lancio: anti “proiettile”.
   * Più basso = palle più controllate; più alto = più esplosive.
   */
  private dynBallMaxSpeedMul = 1;
  /**
   * **Cap velocità boccino**: separato dal cap delle palle perché spesso vuoi un boccino più “calmo”.
   */
  private dynBoccinoMaxSpeedMul = 1;
  /**
   * Prospettiva: **Y “lontana”** in spazio design (poi * `laneScale` → world).
   * Serve come riferimento per calcolare quanto rimpicciolire palle/bandierina verso il fondo corsia.
   */
  private dynPerspectiveYFarDesign = 180;
  /** SetDynamic: scala base bandierino (vicino al player, prima della prospettiva). */
  private dynFlagBaseScale: number = gameplayCfg.flagBaseScale;
  /** SetDynamic: mul minimo bandierino in profondità (più lontano = più piccolo). */
  private dynFlagPerspectiveMinMul: number = gameplayCfg.flagPerspectiveMinMul;
  /**
   * Prospettiva: **scala minima** delle palle in lontananza.
   * Più basso = più effetto profondità (palle piccole in alto), più alto = effetto più leggero.
   */
  private dynPerspectiveMinMul = 0.34;
  /**
   * UI: quanto la **freccia potenza** si allunga rispetto al pull.
   * Non cambia il gameplay: è solo feedback visivo.
   */
  private dynArrowBodyLengthMul = 1.46;
  /**
   * UI: scala base freccia (spessore + testa) per mantenere leggibilità su device diversi.
   */
  private dynArrowScaleX = 0.52;
  /**
   * “Kick” prospettico sui rimbalzi laterali: range minimo del kick in Y (verso il fondo corsia).
   * Più alto = rimbalzi che spingono più “in profondità”.
   */
  private dynLateralKickMin = 4;
  /**
   * “Kick” prospettico sui rimbalzi laterali: range massimo del kick in Y (verso il fondo corsia).
   */
  private dynLateralKickMax = 60;

  /** Sotto il bg_Top: riempimento bianco a tutto schermo. */
  private fullScreenWhiteBg!: Phaser.GameObjects.Rectangle;

  /** Sotto il bordo inferiore di bg_Top: tappo se il canvas è più alto della corsia. */
  private bottomSandExtension!: Phaser.GameObjects.Rectangle;

  laneRoot!: Phaser.GameObjects.Container;
  /** Riempimento: pivot basso-centro, ancorato al fondo schermo (stessa scala orizzontale di bg_Top). */
  private bgBottomLane!: Phaser.GameObjects.Image;
  bgTopLane!: Phaser.GameObjects.Image;

  wallLeftPlank?: Phaser.GameObjects.Rectangle;
  wallRightPlank?: Phaser.GameObjects.Rectangle;

  wallBack!: Phaser.GameObjects.Rectangle;

  private laneScale = 1;
  private laneX = 0;
  private laneY = 0;

  /**
   * Corrimano sx in spazio design (1080×1920): basso e più esterno → alto e verso il centro (prospettiva).
   */
  private readonly wallLeftLine: SegmentLineWallConfig = {
    x1: -800,
    y1: 1200,
    x2: -50,
    y2: 350,
    thickness: 50,
    color: 0xe74c3c,
    alpha: 0,
  };

  private readonly wallRightLine: SegmentLineWallConfig = {
    x1: 800,
    y1: 1200,
    x2: 50,
    y2: 350,
    thickness: 50,
    color: 0x3498db,
    alpha: 0,
  };

  /** Muro trasversale in alto corsia (bocca stretta). */
  private readonly wallBackConfig: AxisAlignedWallConfig = {
    x: 0,
    y: 460,
    width: 400,
    height: 40,
    color: 0x2ecc71,
    alpha: 0,
  };

  ballPlayer!: Phaser.Physics.Matter.Sprite;
  private ballBoccino?: Phaser.Physics.Matter.Image;
  private boccinoShadow?: Phaser.GameObjects.Image;
  private flagMarker?: Phaser.GameObjects.Sprite;
  /** PNG sopra la palla (player o nemica) più vicina al boccino. */
  private closestBallIndicator?: Phaser.GameObjects.Image;
  /** Palla di cui seguire posizione (boccino / nemico) mentre il bandierino è visibile. */
  private flagFollowTarget?: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image;
  private matchPhase: MatchPhase = "boccino_pending";
  private boccinoStoppedFrames = 0;
  private boccinoLaunchedAt = 0;
  /** >0: frame rimanenti di smorzamento prima dello stop definitivo del boccino. */
  private boccinoSoftStopFramesLeft = 0;
  /**
   * Finché true: parametri di settling “lunghi” del primo lancio automatico.
   * Si azzera in `completeBoccinoNaturalStopAndHandoff`; si rimette true a ogni `createBallAndSlingshot`.
   */
  private boccinoFirstAutoLaunchSettling = true;

  /** Dopo un tiro: bandierino nascosto finché boccino, ball_player e tutte le ball_enemy siano di nuovo fermi. */
  private flagAwaitAllStopped = false;
  private flagAllStoppedFrames = 0;
  private playerShotAt = 0;
  private flagReactivateTimer?: Phaser.Time.TimerEvent;
  private flagReactivateDelayPending = false;
  private nextBallSpawnTimer?: Phaser.Time.TimerEvent;
  /** Durante la mira IA: freccia agganciata a questa palla per il depth. */
  private enemyBallForAimArrow?: Phaser.Physics.Matter.Sprite;
  private enemyAimTween?: Phaser.Tweens.Tween;

  /** Palle nemiche da considerare per la rivalutazione del bandierino (registra quando le crei). */
  private readonly ballEnemies: Phaser.Physics.Matter.Sprite[] = [];

  /** Scia particelle: una emitter per ogni palla lanciata (player o enemy). */
  private readonly ballTrailEmitters = new Map<
    Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
    Phaser.GameObjects.Particles.ParticleEmitter
  >();

  private static readonly BALL_TRAIL_TEXTURE_KEY = "__cv_ball_trail_bold";

  /** Palle giocatore già lanciate: restano in fisica, non più prensili. */
  private readonly releasedPlayerBalls: Phaser.Physics.Matter.Sprite[] = [];
  private playerShotsUsed = 0;
  private enemyShotsUsed = 0;
  /** `time.now` al completamento del lancio dell’ultima ball_enemy (fine match); 0 se non applicabile. */
  private colpoMatchEndEnemyLaunchAtMs = 0;
  /** Ultimo tiro nemico: attendi camera a idle (zoom out) poi delay prima di `scheduleMatchResolveWhenFieldSettled`. */
  private matchEndAwaitCameraIdleForResolve = false;

  private ballRestWorld = new Phaser.Math.Vector2();
  /** Scala base (vicino al giocatore); la prospettiva la moltiplica in base a Y. */
  private ballPerspectiveBaseScale = 1;
  private ballDragging = false;
  /** Un'ombra per ogni `ball_player` (in campo + quella controllabile). */
  private readonly playerBallShadowByBall = new Map<
    Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
    Phaser.GameObjects.Image
  >();
  private readonly playerBallColliderDebugByBall = new Map<
    Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
    Phaser.GameObjects.Graphics
  >();
  private boccinoColliderDebug?: Phaser.GameObjects.Graphics;
  private aimArrowRoot!: Phaser.GameObjects.Container;
  private aimArrowBottom!: Phaser.GameObjects.Image;
  private aimArrowTop!: Phaser.GameObjects.Image;

  private camDefaultMidX = 0;
  private camDefaultMidY = 0;
  private camDefaultZoom = 1;

  private camShotPhase: "idle" | "delay" | "follow" | "return" = "idle";
  private camShotAnchorMidX = 0;
  private camShotAnchorMidY = 0;
  private camShotAnchorZoom = 1;
  private camShotStartedAt = 0;
  private camShotFollowStartedAt = 0;
  /** Palla lanciata che la camera deve seguire durante lo shot. */
  private camShotFollowBall?: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image;

  /**
   * Quota della |vx| convertita in spinta verso l’alto (schermo) dopo urto sui corrimano:
   * simula profondità prospettica (il rimbalzo “sale” verso il fondo visivo della corsia).
   */
  private readonly lateralDepthKickFactor = 0.34;
  private lateralKickNextAllowedAt = 0;
  private readonly lateralKickCooldownMs = 55;

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.matchPhase !== "player_turn" || !this.canShoot || this.isGameOver) {
      return;
    }

    if (!this.isBallSlowEnoughToGrab()) {
      return;
    }

    const hitR = this.getBallGrabRadiusWorld();

    if (
      Phaser.Math.Distance.Between(
        pointer.worldX,
        pointer.worldY,
        this.ballPlayer.x,
        this.ballPlayer.y,
      ) > hitR
    ) {
      return;
    }

    this.ballDragging = true;
    this.syncPlayerBallAtRest(this.ballPlayer);
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.ballDragging) {
      return;
    }

    this.syncPlayerBallAtRest(this.ballPlayer);

    const aim = this.getClampedAimFromPointer(pointer.worldX, pointer.worldY);

    if (!aim.aimValid) {
      this.aimArrowRoot.setVisible(false);

      return;
    }

    this.drawPowerArrow(aim.launchDirX, aim.launchDirY, aim.pull);
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer) => {
    if (!this.ballDragging) {
      return;
    }

    this.ballDragging = false;
    this.aimArrowRoot.setVisible(false);

    this.syncPlayerBallAtRest(this.ballPlayer);

    const aim = this.getClampedAimFromPointer(pointer.worldX, pointer.worldY);

    if (!aim.aimValid || aim.pull < 10) {
      return;
    }

    const power = Phaser.Math.Clamp(aim.pull * this.getLaunchPowerScale(), 22, 210);

    this.ballPlayer.setVelocity(aim.launchDirX * power, aim.launchDirY * power);
    this.playBallLaunchSfx();

    this.onPlayerBallLaunchedAfterVelocitySet();
  };

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }

    // Cache parametri “dinamici” in base al device (es. forza lancio).
    this.refreshDynamicTuningFromScale();
  }

  private refreshDynamicTuningFromScale(): void {
    if (!this.gameScene) {
      return;
    }

    // FORZA LANCIO: senza questo, la stessa “trazione” produce risultati diversi su schermi diversi.
    // - aumenta se su schermi grandi “tira poco”
    // - diminuisci se su schermi piccoli “tira troppo”
    this.dynLaunchPowerMul = this.gameScene.setDynamicValueBasedOnScale(0.82, 1.12);

    // BOCCINO auto (inizio match): velocità iniziale device-aware.
    // DEFAULT (modifica qui):
    // - iPhone SE: 54
    // - iPhone 12 Pro: 75
    this.dynBoccinoAutoLaunchSpeedWorld = this.gameScene.setDynamicValueBasedOnScale(12, 80);

    // IA enemy: potenza di lancio device-aware (su schermi grandi alziamo per mantenere efficacia).
    this.dynEnemyLaunchPowerMul = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.enemyLaunchPowerDeviceMulMin,
      gameplayCfg.enemyLaunchPowerDeviceMulMax,
    );

    // Slingshot / input.
    // - aumenta per permettere un pull massimo più ampio (più potenza massima potenziale)
    this.dynMaxPullWorld = this.gameScene.setDynamicValueBasedOnScale(110, 200);

    // Clamp velocità (anti-proiettile).
    // - abbassa se vedi rimbalzi troppo violenti / velocità “irreali”
    this.dynBallMaxSpeedMul = this.gameScene.setDynamicValueBasedOnScale(0.92, 1.4);
    this.dynBoccinoMaxSpeedMul = this.gameScene.setDynamicValueBasedOnScale(0.88, 1);

    // Prospettiva (valori in design px, poi moltiplicati per `laneScale`).
    // - `YFar`: dove inizia la “lontananza”
    // - `MinMul`: quanto possono diventare piccole le palle in alto
    this.dynPerspectiveYFarDesign = this.gameScene.setDynamicValueBasedOnScale(130, 300);
    this.dynPerspectiveMinMul = this.gameScene.setDynamicValueBasedOnScale(0.28, 0.44);

    // Bandierino: scala base + minimo in profondità (device-aware).
    this.dynFlagBaseScale = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.flagBaseScaleMin,
      gameplayCfg.flagBaseScaleMax,
    );
    this.dynFlagPerspectiveMinMul = this.gameScene.setDynamicValueBasedOnScale(
      gameplayCfg.flagPerspectiveMinMulMin,
      gameplayCfg.flagPerspectiveMinMulMax,
    );

    // Freccia potenza.
    // (solo UI)
    this.dynArrowBodyLengthMul = this.gameScene.setDynamicValueBasedOnScale(1.38, 1.55);
    this.dynArrowScaleX = this.gameScene.setDynamicValueBasedOnScale(0.38, 0.72);

    // Kick prospettico sui laterali.
    // - più alto = rimbalzi laterali che “tirano su” di più la palla (verso il fondo corsia)
    this.dynLateralKickMin = this.gameScene.setDynamicValueBasedOnScale(3, 8);
    this.dynLateralKickMax = this.gameScene.setDynamicValueBasedOnScale(38, 105);
  }

  /** Per overlay fine partita: 0 se non è l’ultimo lancio nemico del match. */
  getColpoMatchEndEnemyLaunchAtMs(): number {
    return this.colpoMatchEndEnemyLaunchAtMs;
  }

  // create() {
  //   console.log("Start Scene Colpo Vincente");

  //   this.computeLayoutDimensions();
  //   this.createLaneAndWalls();
  //   this.captureDefaultCameraState();
  //   this.createBallAndSlingshot();

  //   this.scene.bringToTop();

  //   this.scale.on("resize", this.handleResize, this);

  //   this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);

  //   this.time.delayedCall(50, () => {
  //     this.isGameOver = false;
  //   });
  // }

  create() {
    console.log("Start Scene Colpo Vincente");

    this.createBallAndFlagAnimations();
    this.computeLayoutDimensions();
    this.createLaneAndWalls();
    this.captureDefaultCameraState();
    this.createBallAndSlingshot();

    // NON portare GameManager sopra:
    // la UI deve restare nella scene Game, quindi GameManager deve stare sotto.

    this.scale.on("resize", this.handleResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);

    this.time.delayedCall(50, () => {
      this.isGameOver = false;
    });
  }

  private createBallAndFlagAnimations(): void {
    if (!this.anims.exists(assetConf.keyAnim.animBallPlayerSpin)) {
      this.anims.create({
        key: assetConf.keyAnim.animBallPlayerSpin,
        frames: this.anims.generateFrameNumbers(assetConf.spritesheet.animBall_Player.key, {
          start: 0,
          end: 60,
        }),
        frameRate: 30,
        repeat: -1,
      });
    }

    if (!this.anims.exists(assetConf.keyAnim.animBallEnemySpin)) {
      this.anims.create({
        key: assetConf.keyAnim.animBallEnemySpin,
        frames: this.anims.generateFrameNumbers(assetConf.spritesheet.animBall_Enemy.key, {
          start: 0,
          end: 60,
        }),
        frameRate: 30,
        repeat: -1,
      });
    }

    if (!this.anims.exists(assetConf.keyAnim.animBandieraLoop)) {
      this.anims.create({
        key: assetConf.keyAnim.animBandieraLoop,
        frames: this.anims.generateFrameNumbers(assetConf.spritesheet.animBandiera.key, {
          start: 0,
          end: 37,
        }),
        frameRate: 25,
        repeat: -1,
      });
    }
  }

  update(): void {
    this.updateBoccinoSettling();
    this.updateBoccinoDistanceHud();
    this.updateLaneEntityDepthsByY();
    this.updateClosestBallIndicator();
    this.updateBallTrailEmittingState();
    this.updateCameraShotLaunch();
    this.updateMatchEndAwaitCameraIdleForResolve();
    this.updateBoccinoColliderDebugVisuals();
    this.updatePlayerBallColliderDebugVisuals();
    this.updateFlagFollowWorldPosition();
    this.updateFlagPerspectiveScale();

    if (this.matchPhase === "boccino_rolling") {
      this.clampBoccinoMaxSpeed();
      this.constrainBoccinoInsideLane();
    }

    if (this.matchPhase === "player_turn" || this.matchPhase === "enemy_turn") {
      this.updateBallShadow();

      this.updateBallPerspectiveScale();
      this.clampBallMaxSpeed();
      this.updateFlagWhenAllBallsIdle();
      this.updateBallSpinAnimations();
    }

    this.gameScene?.uiManager?.updateLaneMinimap(this.buildLaneMinimapBlips());
  }

  /**
   * Verso il fondo prospettico della corsia (alto schermo, Y più piccolo) la palla si riduce leggermente.
   * Vicino al giocatore (Y ~ riposo) scala piena; in profondità tende a `minMul`.
   */
  private updateBallPerspectiveScale(): void {
    if (this.matchPhase !== "player_turn" && this.matchPhase !== "enemy_turn") {
      return;
    }

    const yNear = this.ballRestWorld.y;
    const yFar = this.laneY + this.dynPerspectiveYFarDesign * this.laneScale;
    const span = Math.max(yNear - yFar, 64);
    const minMul = this.dynPerspectiveMinMul;

    this.forEachPerspectiveBallForPerspective((ball) => {
      if (!ball.body || !ball.visible) {
        return;
      }

      const tRaw = Phaser.Math.Clamp((ball.y - yFar) / span, 0, 1);
      const t = Math.pow(tRaw, 1.12);
      const mul = Phaser.Math.Linear(minMul, 1, t);

      ball.setScale(this.ballPerspectiveBaseScale * mul);
    });
  }

  /**
   * Restituisce il moltiplicatore di prospettiva per una data Y (stessa formula di `updateBallPerspectiveScale`).
   * 1 = vicino al giocatore (scala piena), `dynPerspectiveMinMul` = fondo corsia.
   */
  private getPerspectiveMulAtY(y: number): number {
    const yNear = this.ballRestWorld.y;
    const yFar = this.laneY + this.dynPerspectiveYFarDesign * this.laneScale;
    const span = Math.max(yNear - yFar, 64);
    const tRaw = Phaser.Math.Clamp((y - yFar) / span, 0, 1);
    const t = Math.pow(tRaw, 1.12);

    return Phaser.Math.Linear(this.dynPerspectiveMinMul, 1, t);
  }

  /**
   * Distanza euclidea tra due punti corretta per la prospettiva.
   * La componente Y di ciascun punto viene divisa per il suo `perspectiveMul`,
   * così 1 px in alto (oggetti rimpiccioliti) "pesa" di più nel calcolo.
   */
  private perspectiveCorrectedDistance(x1: number, y1: number, x2: number, y2: number): number {
    const mul1 = this.getPerspectiveMulAtY(y1);
    const mul2 = this.getPerspectiveMulAtY(y2);
    const corrY1 = y1 / mul1;
    const corrY2 = y2 / mul2;

    return Math.hypot(x2 - x1, corrY2 - corrY1);
  }

  /** Regola la velocità di riproduzione dell'anim di spin in base alla velocità della palla. */
  private updateBallSpinAnimations(): void {
    const speedThreshold = 0; // sotto questa velocità la palla è considerata "ferma" e l'animazione si mette in pausa. Alzalo se vuoi che si fermi prima, abbassalo se vuoi che giri anche a velocità bassissime.
    const maxSpeedForAnim = 5; // la velocità a cui il framerate raggiunge il massimo. Abbassalo (es. 6) e la rotazione arriverà a velocità piena prima; alzalo (es. 20) e ci vorrà più velocità per far girare veloce la palla.
    const baseFrameRate = 80; // il framerate massimo dell'animazione (quando la palla va a maxSpeedForAnim o più). Alzalo per una rotazione più frenetica, abbassalo per un cap più calmo.

    const syncSpin = (ball: Phaser.Physics.Matter.Sprite): void => {
      if (!ball.active || !ball.body || !ball.anims) {
        return;
      }

      const body = ball.body as MatterJS.BodyType;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);

      if (speed <= speedThreshold) {
        if (ball.anims.isPlaying) {
          ball.anims.pause();
        }

        return;
      }

      const t = Phaser.Math.Clamp(speed / maxSpeedForAnim, 0, 1);
      const rate = Phaser.Math.Linear(4, baseFrameRate, t);

      if (!ball.anims.isPlaying) {
        ball.anims.resume();
      }

      ball.anims.msPerFrame = 1000 / rate;
    };

    this.forEachPlayerBallForPerspective((b) => syncSpin(b as Phaser.Physics.Matter.Sprite));

    for (const e of this.ballEnemies) {
      syncSpin(e);
    }
  }

  private updateFlagFollowWorldPosition(): void {
    if (!this.flagMarker?.visible || !this.flagFollowTarget?.active) {
      return;
    }

    const t = this.flagFollowTarget;

    this.flagMarker.setPosition(t.x, t.y);
  }

  private updateFlagPerspectiveScale(): void {
    if (!this.flagMarker?.visible) {
      return;
    }

    const yNear = this.ballRestWorld.y;
    const yFar = this.laneY + this.dynPerspectiveYFarDesign * this.laneScale;
    const span = Math.max(yNear - yFar, 64);
    const tRaw = Phaser.Math.Clamp((this.flagMarker.y - yFar) / span, 0, 1);
    const t = Math.pow(tRaw, 1.12);
    const mul = Phaser.Math.Linear(this.dynFlagPerspectiveMinMul, 1, t);

    this.flagMarker.setScale(this.dynFlagBaseScale * mul);
  }

  /** Depth display: Y più in basso → valore più alto (sopra agli altri). Resta sotto l’HUD (depth ~12). */
  private getLaneEntitySortDepth(worldY: number, typeBias: number): number {
    const raw =
      gameplayCfg.laneEntityDepthBase +
      worldY * gameplayCfg.laneEntityDepthPerWorldPixel +
      typeBias;

    return Phaser.Math.Clamp(raw, gameplayCfg.laneEntityDepthMin, gameplayCfg.laneEntityDepthMax);
  }

  private updateLaneEntityDepthsByY(): void {
    if (this.ballBoccino?.active) {
      this.ballBoccino.setDepth(
        this.getLaneEntitySortDepth(this.ballBoccino.y, gameplayCfg.laneDepthBiasBoccino),
      );

      if (this.boccinoShadow?.active) {
        this.boccinoShadow.setPosition(this.ballBoccino.x, this.ballBoccino.y);
        this.boccinoShadow.setScale(this.ballBoccino.scaleX, this.ballBoccino.scaleY);
        this.boccinoShadow.setRotation(0);
        this.boccinoShadow.setVisible(this.ballBoccino.visible);
        this.boccinoShadow.setDepth(
          Math.max(
            gameplayCfg.laneEntityDepthMin,
            this.ballBoccino.depth - gameplayCfg.laneShadowDepthDelta,
          ),
        );
      }
    } else if (this.boccinoShadow) {
      this.boccinoShadow.setVisible(false);
    }

    for (const enemy of this.ballEnemies) {
      if (enemy.active && enemy.visible) {
        enemy.setDepth(this.getLaneEntitySortDepth(enemy.y, gameplayCfg.laneDepthBiasBallEnemy));
      }
    }

    const seen = new Set<Phaser.Physics.Matter.Sprite>();
    const playerBalls: Phaser.Physics.Matter.Sprite[] = [];

    for (const b of this.releasedPlayerBalls) {
      if (b.active && !seen.has(b)) {
        seen.add(b);
        playerBalls.push(b);
      }
    }

    if (this.ballPlayer?.active && !seen.has(this.ballPlayer)) {
      playerBalls.push(this.ballPlayer);
    }

    for (const b of playerBalls) {
      if (b.visible) {
        b.setDepth(this.getLaneEntitySortDepth(b.y, gameplayCfg.laneDepthBiasBallPlayer));
      }
    }

    if (this.flagMarker?.visible) {
      // Depth bandierina: sempre "dietro" al boccino di 1, come richiesto.
      const boccinoDepth = this.ballBoccino?.active
        ? this.getLaneEntitySortDepth(this.ballBoccino.y, gameplayCfg.laneDepthBiasBoccino)
        : this.getLaneEntitySortDepth(this.flagMarker.y, gameplayCfg.laneDepthBiasFlag);

      this.flagMarker.setDepth(boccinoDepth - 1);
    }

    const aimBall =
      this.matchPhase === "enemy_turn" && this.enemyBallForAimArrow?.active
        ? this.enemyBallForAimArrow
        : this.ballPlayer;

    if (this.aimArrowRoot?.visible && aimBall?.active && aimBall.visible) {
      this.aimArrowRoot.setDepth(
        Math.max(
          gameplayCfg.laneEntityDepthMin,
          aimBall.depth - gameplayCfg.laneAimArrowDepthBehindBall,
        ),
      );
    }

    this.syncBallTrailEmitterDepths();
  }

  private ensureBallTrailTexture(): void {
    const key = GameManager.BALL_TRAIL_TEXTURE_KEY;

    if (this.textures.exists(key)) {
      return;
    }

    const g = this.add.graphics().setVisible(false);
    const c = 32;

    /** Nucleo più “pieno” + alone più denso → nastro continuo e meno trasparente. */
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(c, c, 31);
    g.fillStyle(0xffffff, 0.32);
    g.fillCircle(c, c, 26);
    g.fillStyle(0xffffff, 0.58);
    g.fillCircle(c, c, 19);
    g.fillStyle(0xffffff, 0.88);
    g.fillCircle(c, c, 12);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 7);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  private removeBallTrailEmitter(
    ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
  ): void {
    const emitter = this.ballTrailEmitters.get(ball);

    if (!emitter) {
      return;
    }

    emitter.stop();
    emitter.destroy();
    this.ballTrailEmitters.delete(ball);
  }

  private destroyAllBallTrailEmitters(): void {
    for (const ball of [...this.ballTrailEmitters.keys()]) {
      this.removeBallTrailEmitter(ball);
    }
  }

  /**
   * Aggancia un ParticleEmitter che segue la palla; emissione on/off in `updateBallTrailEmittingState`.
   */
  private attachBallTrailEmitter(
    ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
    tint: number,
  ): void {
    if (!gameplayCfg.ballTrailEnabled || !ball?.active) {
      return;
    }

    this.ensureBallTrailTexture();
    this.removeBallTrailEmitter(ball);

    const trailFreq = gameplayCfg.ballTrailFrequencyMs;
    const trailBlend =
      gameplayCfg.ballTrailBlendMode === "ADD"
        ? Phaser.BlendModes.ADD
        : gameplayCfg.ballTrailBlendMode === "SCREEN"
          ? Phaser.BlendModes.SCREEN
          : Phaser.BlendModes.NORMAL;

    const emitter = this.add.particles(0, 0, GameManager.BALL_TRAIL_TEXTURE_KEY, {
      emitting: false,
      lifespan: gameplayCfg.ballTrailLifespanMs,
      /** 0 = un burst ogni frame → scia continua invece che grumi ogni X ms. */
      frequency: trailFreq <= 0 ? 0 : trailFreq,
      quantity: gameplayCfg.ballTrailQuantity,
      maxParticles: gameplayCfg.ballTrailMaxParticles,
      radial: false,
      particleBringToTop: false,
      scale: {
        start: gameplayCfg.ballTrailScaleStart,
        end: gameplayCfg.ballTrailScaleEnd,
        ease: "Sine.easeOut",
      },
      alpha: {start: gameplayCfg.ballTrailAlphaStart, end: 0, ease: "Quad.easeOut"},
      speedX: gameplayCfg.ballTrailDriftMin,
      speedY: gameplayCfg.ballTrailDriftMax,
      blendMode: trailBlend,
      tint,
    });

    emitter.startFollow(ball, 0, 0, true);
    this.ballTrailEmitters.set(ball, emitter);
  }

  private syncBallTrailEmitterDepths(): void {
    if (!gameplayCfg.ballTrailEnabled) {
      return;
    }

    const behind = gameplayCfg.ballTrailDepthBehindBall;

    for (const [ball, emitter] of this.ballTrailEmitters) {
      if (!ball.active) {
        this.removeBallTrailEmitter(ball);

        continue;
      }

      emitter.setDepth(Math.max(gameplayCfg.laneEntityDepthMin, ball.depth - behind));
    }
  }

  private updateBallTrailEmittingState(): void {
    if (!gameplayCfg.ballTrailEnabled) {
      return;
    }

    const th = gameplayCfg.ballTrailMinSpeedWorld;

    for (const [ball, emitter] of [...this.ballTrailEmitters]) {
      if (!ball.active || !ball.body) {
        this.removeBallTrailEmitter(ball);

        continue;
      }

      const body = ball.body as MatterJS.BodyType;
      const speed = this.getBodyLinearSpeed(body);
      const wantTrail = ball.visible && speed >= th;

      if (wantTrail) {
        if (!emitter.emitting) {
          emitter.start();
        }
      } else if (emitter.emitting) {
        emitter.stop();
      }
    }
  }

  private captureDefaultCameraState(): void {
    const cam = this.cameras.main;

    this.camDefaultMidX = cam.midPoint.x;
    this.camDefaultMidY = cam.midPoint.y;
    this.camDefaultZoom = cam.zoom;
  }

  private resetCameraToDefaultLayout(): void {
    const cam = this.cameras.main;

    cam.setZoom(this.camDefaultZoom);
    cam.centerOn(this.camDefaultMidX, this.camDefaultMidY);
    this.camShotPhase = "idle";
    this.camShotFollowBall = undefined;
    this.gameScene?.uiManager?.resetCameraShotUiAlphaImmediate();
  }

  private beginCameraShotOnLaunch(
    followBall?: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
  ): void {
    if (!gameplayCfg.cameraShotLaunchEnabled || this.isGameOver) {
      return;
    }

    const cam = this.cameras.main;

    this.camShotAnchorMidX = cam.midPoint.x;
    this.camShotAnchorMidY = cam.midPoint.y;
    this.camShotAnchorZoom = cam.zoom;
    this.camShotStartedAt = this.time.now;
    this.camShotFollowStartedAt = 0;
    this.camShotFollowBall = followBall;
    this.camShotPhase = "delay";
  }

  private snapCameraShotToAnchorIfActive(): void {
    if (this.camShotPhase === "idle") {
      return;
    }

    const cam = this.cameras.main;

    cam.setZoom(this.camShotAnchorZoom);
    cam.centerOn(this.camShotAnchorMidX, this.camShotAnchorMidY);
    this.camShotPhase = "idle";
    this.camShotFollowBall = undefined;
    this.gameScene?.uiManager?.resetCameraShotUiAlphaImmediate();
  }

  /**
   * Limiti mondo del PNG bg_Top: la camera non può mostrare aree fuori da questo rettangolo.
   */
  private getCameraBgBounds(): {left: number; right: number; top: number; bottom: number} {
    const {designW, designH} = this.getLaneDesignDimensions();
    const left = this.laneX - designW * this.laneScale * 0.5;
    const right = this.laneX + designW * this.laneScale * 0.5;
    const top = this.laneY;
    const bottom = this.laneY + designH * this.laneScale;

    return {left, right, top, bottom};
  }

  /** Clampa centro camera perché il viewport zoomato non esca dal PNG. */
  private clampCameraCenterToBgBounds(
    cx: number,
    cy: number,
    zoom: number,
  ): {cx: number; cy: number} {
    const cam = this.cameras.main;
    const halfW = cam.width / (2 * zoom);
    const halfH = cam.height / (2 * zoom);
    const bounds = this.getCameraBgBounds();

    return {
      cx: Phaser.Math.Clamp(cx, bounds.left + halfW, bounds.right - halfW),
      cy: Phaser.Math.Clamp(cy, bounds.top + halfH, bounds.bottom - halfH),
    };
  }

  private updateCameraShotLaunch(): void {
    if (!gameplayCfg.cameraShotLaunchEnabled || this.camShotPhase === "idle") {
      return;
    }

    const cam = this.cameras.main;
    const cfg = gameplayCfg;

    if (this.isGameOver && this.camShotPhase !== "return") {
      const wasFollow = this.camShotPhase === "follow";

      this.camShotPhase = "return";
      if (wasFollow) {
        this.gameScene?.uiManager?.setCameraShotUiDimmed(false);
      }
    }

    // --- DELAY: la camera resta ferma ---
    if (this.camShotPhase === "delay") {
      if (this.time.now - this.camShotStartedAt >= cfg.cameraShotDelayMs) {
        this.camShotPhase = "follow";
        this.camShotFollowStartedAt = this.time.now;
        this.gameScene?.uiManager?.setCameraShotUiDimmed(true);
      }

      return;
    }

    // --- FOLLOW: segue la palla con lerp + ramp-up sincronizzato zoom+pan ---
    if (this.camShotPhase === "follow") {
      const elapsed = this.time.now - this.camShotFollowStartedAt;

      if (elapsed > cfg.cameraShotFollowMaxMs) {
        this.camShotPhase = "return";
        this.gameScene?.uiManager?.setCameraShotUiDimmed(false);

        return;
      }

      const rampT = Phaser.Math.Clamp(elapsed / 600, 0, 1);
      const lerp = cfg.cameraShotPanLerp * rampT;

      const targetZoom = this.camShotAnchorZoom * cfg.cameraShotZoomMul;
      const newZoom = Phaser.Math.Linear(cam.zoom, targetZoom, lerp);

      if (this.camShotFollowBall?.active && this.camShotFollowBall.body) {
        const bx = this.camShotFollowBall.x;
        const by = this.camShotFollowBall.y;
        const clamped = this.clampCameraCenterToBgBounds(bx, by, newZoom);

        cam.setZoom(newZoom);
        cam.centerOn(
          Phaser.Math.Linear(cam.midPoint.x, clamped.cx, lerp),
          Phaser.Math.Linear(cam.midPoint.y, clamped.cy, lerp),
        );
      } else {
        cam.setZoom(newZoom);
      }

      return;
    }

    // --- RETURN: torna alla posizione iniziale con lerp sincronizzato ---
    if (this.camShotPhase === "return") {
      const lerp = cfg.cameraShotReturnLerp;

      const newZoom = Phaser.Math.Linear(cam.zoom, this.camShotAnchorZoom, lerp);
      const newX = Phaser.Math.Linear(cam.midPoint.x, this.camShotAnchorMidX, lerp);
      const newY = Phaser.Math.Linear(cam.midPoint.y, this.camShotAnchorMidY, lerp);

      cam.setZoom(newZoom);
      cam.centerOn(newX, newY);

      const dx = Math.abs(newX - this.camShotAnchorMidX);
      const dy = Math.abs(newY - this.camShotAnchorMidY);
      const dz = Math.abs(newZoom - this.camShotAnchorZoom);

      if (
        dx < cfg.cameraShotReturnEpsilonPx &&
        dy < cfg.cameraShotReturnEpsilonPx &&
        dz < cfg.cameraShotReturnEpsilonZoom
      ) {
        cam.setZoom(this.camShotAnchorZoom);
        cam.centerOn(this.camShotAnchorMidX, this.camShotAnchorMidY);
        this.camShotPhase = "idle";
        this.camShotFollowBall = undefined;
      }
    }
  }

  /**
   * Ultimo tiro nemico: zoom-out camera fino a idle, poi `matchEndResolveDelayAfterCameraMs`,
   * poi `scheduleMatchResolveWhenFieldSettled` (palle ferme + esito).
   */
  private updateMatchEndAwaitCameraIdleForResolve(): void {
    if (!this.matchEndAwaitCameraIdleForResolve || this.isGameOver) {
      return;
    }

    const camIdle = !gameplayCfg.cameraShotLaunchEnabled || this.camShotPhase === "idle";

    if (!camIdle) {
      return;
    }

    this.matchEndAwaitCameraIdleForResolve = false;
    this.time.delayedCall(gameplayCfg.matchEndResolveDelayAfterCameraMs, () => {
      if (this.isGameOver) {
        return;
      }

      this.scheduleMatchResolveWhenFieldSettled();
    });
  }

  private ensurePlayerBallShadow(
    ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
    initialScale: number,
  ): Phaser.GameObjects.Image {
    const existing = this.playerBallShadowByBall.get(ball);

    if (existing && existing.active) {
      return existing;
    }

    const shadow = this.add
      .image(ball.x, ball.y, assetConf.image.ball_shadow)
      .setOrigin(0.5, 0.5)
      .setDepth(gameplayCfg.laneEntityDepthMin)
      .setRotation(0)
      .setVisible(ball.visible);

    shadow.setScale(initialScale, initialScale);
    this.playerBallShadowByBall.set(ball, shadow);

    return shadow;
  }

  /** Raggio collider in pixel a scala 1 (texture half 110 come in creazione Matter). */
  private getPlayerBallColliderRadiusAtScale1(): number {
    return Math.round(110 * gameplayCfg.ballPlayerPhysicsRadiusMul);
  }

  private getBoccinoColliderRadiusAtScale1(): number {
    return Math.round(110 * gameplayCfg.boccinoPhysicsRadiusMul);
  }

  private getBoccinoColliderWorldRadius(): number {
    if (!this.ballBoccino) {
      return 0;
    }

    return this.getBoccinoColliderRadiusAtScale1() * this.ballBoccino.scaleX;
  }

  private updateBoccinoColliderDebugVisuals(): void {
    if (!this.boccinoColliderDebug) {
      this.boccinoColliderDebug = this.add.graphics().setDepth(gameplayCfg.laneEntityDepthMin);
    }

    if (
      !gameplayCfg.boccinoColliderDebugVisible ||
      !this.ballBoccino?.active ||
      !this.ballBoccino.visible
    ) {
      this.boccinoColliderDebug.setVisible(false);

      return;
    }

    this.boccinoColliderDebug.setVisible(true);
    this.boccinoColliderDebug.clear();
    this.boccinoColliderDebug.lineStyle(2, 0xff8a00, 0.9);
    this.boccinoColliderDebug.strokeCircle(
      this.ballBoccino.x,
      this.ballBoccino.y,
      this.getBoccinoColliderWorldRadius(),
    );
    this.boccinoColliderDebug.setDepth(
      Math.min(
        this.ballBoccino.depth + gameplayCfg.laneColliderDebugDepthDelta,
        gameplayCfg.laneEntityDepthMax,
      ),
    );
  }

  private getPlayerBallColliderWorldRadius(
    ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
  ): number {
    return this.getPlayerBallColliderRadiusAtScale1() * ball.scaleX;
  }

  private ensurePlayerBallColliderDebug(
    ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
  ): Phaser.GameObjects.Graphics {
    let g = this.playerBallColliderDebugByBall.get(ball);

    if (g && g.active) {
      return g;
    }

    g = this.add.graphics().setDepth(gameplayCfg.laneEntityDepthMin);
    this.playerBallColliderDebugByBall.set(ball, g);

    return g;
  }

  private updatePlayerBallColliderDebugVisuals(): void {
    for (const [ball, g] of [...this.playerBallColliderDebugByBall.entries()]) {
      if (!ball.active) {
        g.destroy();
        this.playerBallColliderDebugByBall.delete(ball);
      }
    }

    if (!gameplayCfg.ballPlayerColliderDebugVisible) {
      for (const gfx of this.playerBallColliderDebugByBall.values()) {
        gfx.setVisible(false);
      }

      return;
    }

    const seen = new Set<Phaser.Physics.Matter.Sprite>();
    const balls: Phaser.Physics.Matter.Sprite[] = [];

    for (const b of this.releasedPlayerBalls) {
      if (b.active && !seen.has(b)) {
        seen.add(b);
        balls.push(b);
      }
    }

    if (this.ballPlayer?.active && !seen.has(this.ballPlayer)) {
      balls.push(this.ballPlayer);
    }

    const inPlay = new Set<Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image>(balls);

    for (const [ball, gfx] of this.playerBallColliderDebugByBall.entries()) {
      if (!inPlay.has(ball)) {
        gfx.setVisible(false);
      }
    }

    for (const ball of balls) {
      const gfx = this.ensurePlayerBallColliderDebug(ball);

      if (!ball.visible) {
        gfx.setVisible(false);

        continue;
      }

      gfx.setVisible(true);
      gfx.clear();
      gfx.lineStyle(2, 0x00ff00, 0.85);
      gfx.strokeCircle(ball.x, ball.y, this.getPlayerBallColliderWorldRadius(ball));
      gfx.setDepth(
        Math.min(
          ball.depth + gameplayCfg.laneColliderDebugDepthDelta,
          gameplayCfg.laneEntityDepthMax,
        ),
      );
    }
  }

  /** Ombra per ogni palla giocatore: stesso centro, scala prospettica, rotation 0. */
  private updateBallShadow(): void {
    const seen = new Set<Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image>();
    const balls: (Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image)[] = [];

    for (const b of this.releasedPlayerBalls) {
      if (b.active && !seen.has(b)) {
        seen.add(b);
        balls.push(b);
      }
    }

    if (this.ballPlayer?.active && !seen.has(this.ballPlayer)) {
      balls.push(this.ballPlayer);
    }

    for (const e of this.ballEnemies) {
      if (e.active && !seen.has(e)) {
        seen.add(e);
        balls.push(e);
      }
    }

    for (const ball of balls) {
      const shadow = this.playerBallShadowByBall.get(ball);

      if (!shadow || !shadow.active) {
        continue;
      }

      if (!ball.visible) {
        shadow.setVisible(false);

        continue;
      }

      shadow.setVisible(true);
      shadow.setPosition(ball.x, ball.y);
      shadow.setRotation(0);
      shadow.setScale(ball.scaleX, ball.scaleY);
      shadow.setDepth(
        Math.max(gameplayCfg.laneEntityDepthMin, ball.depth - gameplayCfg.laneShadowDepthDelta),
      );
    }
  }

  private collectVisiblePlayerBallsUnique(): Phaser.Physics.Matter.Sprite[] {
    const seen = new Set<Phaser.Physics.Matter.Sprite>();
    const out: Phaser.Physics.Matter.Sprite[] = [];

    for (const b of this.releasedPlayerBalls) {
      if (b.active && b.body && b.visible && !seen.has(b)) {
        seen.add(b);
        out.push(b);
      }
    }

    if (
      this.ballPlayer?.active &&
      this.ballPlayer.body &&
      this.ballPlayer.visible &&
      !seen.has(this.ballPlayer)
    ) {
      out.push(this.ballPlayer);
    }

    return out;
  }

  /** Stesse palle nemiche usate per HUD min distanza, indicatore e `resolveMatchWinnerAndEnd`. */
  private getEnemyBallsForDistanceAndScoring(): Phaser.Physics.Matter.Sprite[] {
    return this.ballEnemies.filter((b) => b.active && b.body && b.visible);
  }

  /**
   * Distanza minima (px, float) dal boccino tra le palle passate; solo `active && body && visible`.
   * Allineato a HUD / indicator / esito partita.
   */
  private getMinDistancePxToBoccinoAmong(
    balls: readonly (Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image)[],
  ): number {
    if (!this.ballBoccino?.active || !this.ballBoccino.body) {
      return Infinity;
    }

    let min = Infinity;
    const bx = this.ballBoccino.x;
    const by = this.ballBoccino.y;

    for (const b of balls) {
      if (!b.active || !b.body || !b.visible) {
        continue;
      }

      const d = this.perspectiveCorrectedDistance(bx, by, b.x, b.y);

      if (d < min) {
        min = d;
      }
    }

    return min;
  }

  private updateBoccinoDistanceHud(): void {
    if (!this.ballBoccino?.active || !this.ballBoccino.body) {
      this.gameScene.uiManager.setNearestPlayerBallDistanceCm(null);
      this.gameScene.uiManager.setEnemyHudNumericText(null);
      this.gameScene.uiManager.updateWinningHudByDistance(null, null);

      return;
    }

    const h = Math.max(this.scale.height, 1);
    const pxToMeters = gameplayCfg.distanceHudMetersPerScreenHeight / h;

    let playerDistM: number | null = null;
    let enemyDistM: number | null = null;

    /** Prima del primo lancio: “punteggio” iniziale 0 come il pannello score; poi distanza reale. */
    if (this.playerShotsUsed === 0) {
      this.gameScene.uiManager.setNearestPlayerBallDistanceCm(0);
    } else {
      const candidates = this.collectVisiblePlayerBallsUnique();

      if (candidates.length === 0) {
        this.gameScene.uiManager.setNearestPlayerBallDistanceCm(null);
      } else {
        let minPx = Infinity;

        for (const b of candidates) {
          const d = this.perspectiveCorrectedDistance(
            this.ballBoccino.x,
            this.ballBoccino.y,
            b.x,
            b.y,
          );

          if (d < minPx) {
            minPx = d;
          }
        }

        playerDistM = minPx * pxToMeters;
        this.gameScene.uiManager.setNearestPlayerBallDistanceCm(playerDistM);
      }
    }

    if (this.enemyShotsUsed === 0) {
      this.gameScene.uiManager.setEnemyHudNumericText(0);
    } else {
      const enemies = this.getEnemyBallsForDistanceAndScoring();

      if (enemies.length === 0) {
        this.gameScene.uiManager.setEnemyHudNumericText(null);
      } else {
        let minPxEnemy = Infinity;

        for (const b of enemies) {
          const d = this.perspectiveCorrectedDistance(
            this.ballBoccino.x,
            this.ballBoccino.y,
            b.x,
            b.y,
          );

          if (d < minPxEnemy) {
            minPxEnemy = d;
          }
        }

        enemyDistM = minPxEnemy * pxToMeters;
        this.gameScene.uiManager.setEnemyHudNumericText(enemyDistM);
      }
    }

    const playerForWin =
      this.playerShotsUsed > 0 && playerDistM !== null && Number.isFinite(playerDistM)
        ? playerDistM
        : null;
    const enemyForWin =
      this.enemyShotsUsed > 0 && enemyDistM !== null && Number.isFinite(enemyDistM)
        ? enemyDistM
        : null;

    this.gameScene.uiManager.updateWinningHudByDistance(playerForWin, enemyForWin);
  }

  /** Evita velocità da “proiettile” dopo il lancio. */
  private clampBallMaxSpeed(): void {
    if (this.ballDragging) {
      return;
    }

    const maxSp = this.speedBall * this.dynBallMaxSpeedMul;

    this.forEachPerspectiveBallForPerspective((ball) => {
      if (ball.body) {
        this.clampBodySpeed(ball, maxSp);
      }
    });
  }

  private clampBoccinoMaxSpeed(): void {
    if (!this.ballBoccino?.body) {
      return;
    }

    const maxSp = Math.min(
      gameplayCfg.boccinoMaxLaunchSpeed,
      gameplayCfg.boccinoMaxLaunchSpeed * this.dynBoccinoMaxSpeedMul,
    );

    this.clampBodySpeed(this.ballBoccino, maxSp);
  }

  private clampBodySpeed(
    go: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
    maxSp: number,
  ): void {
    const body = go.body as MatterJS.BodyType;
    const sp = Math.hypot(body.velocity.x, body.velocity.y);

    if (sp > maxSp) {
      const k = maxSp / sp;

      this.matter.setVelocity(go, body.velocity.x * k, body.velocity.y * k);
    }
  }

  private playBallLaunchSfx(): void {
    // Audio gestito dalla scene Game (AudioManager).
    this.gameScene?.audioManager?.playAudio(assetConf.audio.ball);
  }

  private onSceneShutdown(): void {
    this.resetCameraToDefaultLayout();
    this.destroyAllBallTrailEmitters();

    for (const e of this.ballEnemies) {
      e.destroy();
    }

    this.ballEnemies.length = 0;

    for (const sh of this.playerBallShadowByBall.values()) {
      sh.destroy();
    }

    this.playerBallShadowByBall.clear();

    for (const gfx of this.playerBallColliderDebugByBall.values()) {
      gfx.destroy();
    }

    this.playerBallColliderDebugByBall.clear();
    this.boccinoColliderDebug?.destroy();
    this.boccinoColliderDebug = undefined;
    this.boccinoShadow?.destroy();
    this.boccinoShadow = undefined;
    this.nextBallSpawnTimer?.remove(false);
    this.nextBallSpawnTimer = undefined;
    this.enemyAimTween?.remove();
    this.enemyAimTween = undefined;
    this.enemyBallForAimArrow = undefined;
    this.clearFlagReactivateTimer();
    this.scale.off("resize", this.handleResize, this);
    this.input.off("pointerdown", this.onPointerDown);
    this.input.off("pointermove", this.onPointerMove);
    this.input.off("pointerup", this.onPointerUp);
    this.input.off("pointerupoutside", this.onPointerUp);
    this.matter.world.off("collisionstart", this.onLateralWallCollisionStart, this);

    this.closestBallIndicator?.destroy();
    this.closestBallIndicator = undefined;
  }

  /**
   * Palla più vicina al boccino tra **le stesse** candidate di HUD / esito: player
   * (`collectVisiblePlayerBallsUnique`) + nemiche visibili con body.
   */
  private findClosestBallToBoccinoAmongAll(): {
    ball: Phaser.Physics.Matter.Sprite;
    team: "player" | "enemy";
  } | null {
    const boccino = this.ballBoccino;

    if (!boccino?.active || !boccino.body) {
      return null;
    }

    let best: Phaser.Physics.Matter.Sprite | null = null;
    let bestTeam: "player" | "enemy" = "player";
    let bestD = Infinity;

    const consider = (b: Phaser.Physics.Matter.Sprite, team: "player" | "enemy"): void => {
      if (!b.active || !b.visible || !b.body) {
        return;
      }

      const d = this.perspectiveCorrectedDistance(boccino.x, boccino.y, b.x, b.y);

      if (d < bestD) {
        bestD = d;
        best = b;
        bestTeam = team;
      }
    };

    for (const b of this.collectVisiblePlayerBallsUnique()) {
      consider(b, "player");
    }

    for (const b of this.getEnemyBallsForDistanceAndScoring()) {
      consider(b, "enemy");
    }

    return best ? {ball: best, team: bestTeam} : null;
  }

  private updateClosestBallIndicator(): void {
    if (!gameplayCfg.closestBallIndicatorEnabled) {
      this.closestBallIndicator?.setVisible(false);

      return;
    }

    if (this.isGameOver) {
      this.closestBallIndicator?.setVisible(false);

      return;
    }

    if (this.matchPhase === "boccino_pending" || this.matchPhase === "boccino_rolling") {
      this.closestBallIndicator?.setVisible(false);

      return;
    }

    if (this.enemyShotsUsed < 1) {
      this.closestBallIndicator?.setVisible(false);

      return;
    }

    const result = this.findClosestBallToBoccinoAmongAll();

    if (!result) {
      this.closestBallIndicator?.setVisible(false);

      return;
    }

    const {ball: closest, team} = result;
    const indicatorKey =
      team === "player"
        ? assetConf.image.ball_indicator_Player
        : assetConf.image.ball_indicator_Enemy;

    if (!this.closestBallIndicator) {
      this.closestBallIndicator = this.add
        .image(closest.x, closest.y, indicatorKey)
        .setOrigin(0.5, 1);
    } else {
      this.closestBallIndicator.setTexture(indicatorKey);
    }

    const gap = gameplayCfg.ballIndicatorGapAboveBallPx;
    const halfH = closest.displayHeight * 0.5;
    const bobCycle = Math.max(gameplayCfg.ballIndicatorBobCycleMs, 1);
    const bob =
      Math.sin((this.time.now / bobCycle) * Math.PI * 2) * gameplayCfg.ballIndicatorBobAmplitudePx;
    const baseY = closest.y - halfH - gap;

    this.closestBallIndicator.setVisible(true);
    this.closestBallIndicator.setPosition(closest.x, baseY + bob);

    const tw = Math.max(this.closestBallIndicator.width, 1);
    const scale = (closest.displayWidth / tw) * gameplayCfg.ballIndicatorScaleMul;

    this.closestBallIndicator.setScale(scale);
    this.closestBallIndicator.setDepth(
      this.getLaneEntitySortDepth(closest.y, gameplayCfg.laneDepthBiasClosestBallIndicator),
    );
  }

  /**
   * Chiamalo quando crei una `ball_enemy` Matter così il bandierino non torna prima che sia ferma.
   * Il depth in corsia viene aggiornato ogni frame in base alla Y (`updateLaneEntityDepthsByY`).
   */
  registerEnemyBallForFlagIdle(ball: Phaser.Physics.Matter.Sprite): void {
    if (this.ballEnemies.includes(ball)) {
      return;
    }

    this.ballEnemies.push(ball);
  }

  /** Chiamalo quando distruggi un nemico per non lasciare riferimenti morti. */
  unregisterEnemyBallForFlagIdle(ball: Phaser.Physics.Matter.Sprite): void {
    const i = this.ballEnemies.indexOf(ball);

    if (i !== -1) {
      this.ballEnemies.splice(i, 1);
    }

    this.removeBallTrailEmitter(ball);

    if (this.flagFollowTarget === ball) {
      this.flagFollowTarget = undefined;

      if (this.ballBoccino?.active) {
        this.syncFlagToBoccinoAndShow();
      } else {
        this.hideFlagMarker();
      }
    }
  }

  private forEachPlayerBallForPerspective(cb: (b: Phaser.Physics.Matter.Sprite) => void): void {
    const seen = new Set<Phaser.Physics.Matter.Sprite>();

    for (const b of this.releasedPlayerBalls) {
      if (b.active && !seen.has(b)) {
        seen.add(b);
        cb(b);
      }
    }

    if (this.ballPlayer?.active && !seen.has(this.ballPlayer)) {
      cb(this.ballPlayer);
    }
  }

  /** Palle giocatore in campo + nemiche (prospettiva / clamp velocità). */
  private forEachPerspectiveBallForPerspective(
    cb: (b: Phaser.Physics.Matter.Sprite) => void,
  ): void {
    this.forEachPlayerBallForPerspective(cb);

    for (const e of this.ballEnemies) {
      if (e.active) {
        cb(e);
      }
    }
  }

  private getTeamBallMatterImageForBody(
    body: MatterJS.BodyType,
  ): Phaser.Physics.Matter.Sprite | null {
    if (this.ballPlayer?.body === body) {
      return this.ballPlayer;
    }

    for (const b of this.releasedPlayerBalls) {
      if (b.body === body) {
        return b;
      }
    }

    for (const b of this.ballEnemies) {
      if (b.body === body) {
        return b;
      }
    }

    return null;
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
  }

  /** Collisioni e scala corsia solo su bg_Top; bg è solo riempimento visivo. */
  private getLaneDesignDimensions(): {designW: number; designH: number} {
    const topFrame = this.textures.get(assetConf.image.bg_Top).get();

    return {
      designW: Math.max(topFrame.width, 1),
      designH: Math.max(topFrame.height, 1),
    };
  }

  /** Posizione locale Y del bg (pivot basso) così che in mondo sia sul fondo schermo. */
  private getBgFillLocalY(): number {
    return this.scale.height / this.laneScale;
  }

  private updateBgFillPosition(): void {
    if (this.bgBottomLane) {
      this.bgBottomLane.setPosition(0, this.getBgFillLocalY());
    }
  }

  /** Scala da larghezza; gap sotto bg_Top coperto da sabbia (sotto al bg di riempimento in depth). */
  private updateBottomSandExtension(designH: number): void {
    const contentBottom = this.laneY + designH * this.laneScale;
    const gap = Math.max(0, this.scale.height - contentBottom);
    const w = this.scale.width;

    if (!this.bottomSandExtension) {
      this.bottomSandExtension = this.add.rectangle(w * 0.5, 0, w, 1, 0xdecfba);
      this.bottomSandExtension.setDepth(-9);
    }

    if (gap < 1) {
      this.bottomSandExtension.setVisible(false);

      return;
    }

    this.bottomSandExtension.setVisible(true);
    this.bottomSandExtension.setPosition(w * 0.5, contentBottom + gap * 0.5);
    this.bottomSandExtension.setSize(w, gap);
  }

  private createLaneAndWalls(): void {
    const texKey = assetConf.image.bg_Top;

    this.createOrUpdateFullScreenWhiteBackground();

    this.laneX = this.scale.width * 0.5;
    /** bg_Top: pivot alto-centro, mondo y=0. Collisioni in spazio design di bg_Top. */
    this.laneY = 0;
    const {designW, designH} = this.getLaneDesignDimensions();

    this.laneScale = this.scale.width / designW;

    this.laneRoot = this.add.container(this.laneX, this.laneY);
    this.laneRoot.setDepth(-2);
    this.laneRoot.setScale(this.laneScale);

    this.bgBottomLane = this.add
      .image(0, this.getBgFillLocalY(), assetConf.image.bg)
      .setOrigin(0.5, 1)
      .setDepth(-1);
    this.laneRoot.add(this.bgBottomLane);

    this.bgTopLane = this.add.image(0, 0, texKey).setOrigin(0.5, 0).setDepth(0);
    this.laneRoot.add(this.bgTopLane);

    this.updateBottomSandExtension(designH);

    const wallBackAlpha = this.wallBackConfig.alpha ?? 0;

    this.wallBack = this.add
      .rectangle(0, 0, 10, 10, this.wallBackConfig.color, wallBackAlpha)
      .setStrokeStyle(wallBackAlpha > 0 ? 2 : 0, 0xffffff, wallBackAlpha > 0 ? 0.6 : 0)
      .setDepth(-1);

    this.syncWallsFromLane();
  }

  private createBallAndSlingshot(): void {
    this.resetCameraToDefaultLayout();
    this.destroyAllBallTrailEmitters();
    this.updateBallRestWorldPosition();

    for (const e of [...this.ballEnemies]) {
      const sh = this.playerBallShadowByBall.get(e);

      if (sh) {
        sh.destroy();
        this.playerBallShadowByBall.delete(e);
      }

      e.destroy();
    }

    this.ballEnemies.length = 0;
    this.releasedPlayerBalls.length = 0;
    this.playerShotsUsed = 0;
    this.enemyShotsUsed = 0;
    this.colpoMatchEndEnemyLaunchAtMs = 0;
    this.matchEndAwaitCameraIdleForResolve = false;
    this.playerWonColpoVincente = true;
    this.colpoVincenteMatchOutcome = "win";

    this.gameScene.uiManager.resetColpoVincenteShotChips();

    this.matchPhase = "boccino_pending";
    this.canShoot = false;
    this.boccinoStoppedFrames = 0;
    this.boccinoSoftStopFramesLeft = 0;
    this.boccinoFirstAutoLaunchSettling = true;

    const s = this.gameScene.setDynamicValueBasedOnScale(0.42, 0.72);
    const sBoccino = s * gameplayCfg.boccinoScaleMul;
    const texHalf = 110;
    const radiusPlayer = this.getPlayerBallColliderRadiusAtScale1();
    const radiusBoccino = this.getBoccinoColliderRadiusAtScale1();

    this.boccinoShadow?.destroy();
    this.boccinoShadow = undefined;
    this.ballBoccino?.destroy();

    this.ballBoccino = this.matter.add.image(
      this.ballRestWorld.x,
      this.ballRestWorld.y,
      assetConf.image.ball_boccino,
      undefined,
      {
        shape: {type: "circle", radius: radiusBoccino},
        density: gameplayCfg.boccinoDensity,
        friction: gameplayCfg.boccinoFriction,
        frictionStatic: gameplayCfg.boccinoFrictionStatic,
        frictionAir: gameplayCfg.boccinoFrictionAir,
        restitution: gameplayCfg.boccinoRestitution,
      },
    );
    this.ballBoccino.setScale(sBoccino);

    this.boccinoShadow = this.add
      .image(this.ballBoccino.x, this.ballBoccino.y, assetConf.image.ball_boccino_shadow)
      .setOrigin(0.5, 0.5)
      .setRotation(0)
      .setScale(sBoccino)
      .setVisible(this.ballBoccino.visible);

    this.ballPlayer = this.matter.add.sprite(
      this.ballRestWorld.x,
      this.ballRestWorld.y,
      assetConf.spritesheet.animBall_Player.key,
      0,
      {
        shape: {type: "circle", radius: radiusPlayer},
        density: gameplayCfg.ballPlayerDensity,
        friction: gameplayCfg.ballPlayerFriction,
        frictionStatic: gameplayCfg.ballPlayerFrictionStatic,
        frictionAir: 0.032,
        restitution: gameplayCfg.ballPlayerRestitution,
        isSensor: true,
      },
    );
    this.ballPlayer.play(assetConf.keyAnim.animBallPlayerSpin);
    this.ballPlayer.anims.pause();
    this.ballPlayer.setVisible(false);

    this.ballPerspectiveBaseScale = s;
    this.ballPlayer.setScale(s);
    this.syncPlayerBallAtRest(this.ballPlayer);

    this.ensurePlayerBallShadow(this.ballPlayer, s);

    this.updateMatterWorldBounds();

    this.aimArrowBottom = this.add.image(0, 0, assetConf.image.arrow_bottom).setOrigin(0.5, 1);
    this.aimArrowTop = this.add.image(0, 0, assetConf.image.arrow_top).setOrigin(0.5, 1);

    this.aimArrowRoot = this.add
      .container(this.ballRestWorld.x, this.ballRestWorld.y, [
        this.aimArrowBottom,
        this.aimArrowTop,
      ])
      .setDepth(gameplayCfg.laneEntityDepthMin)
      .setVisible(false);

    this.input.on("pointerdown", this.onPointerDown);
    this.input.on("pointermove", this.onPointerMove);
    this.input.on("pointerup", this.onPointerUp);
    this.input.on("pointerupoutside", this.onPointerUp);

    this.matter.world.on("collisionstart", this.onLateralWallCollisionStart, this);

    this.time.delayedCall(gameplayCfg.boccinoLaunchDelayMs, () => this.tryAutoLaunchBoccino());
  }

  private tryAutoLaunchBoccino(): void {
    if (this.matchPhase !== "boccino_pending" || !this.ballBoccino?.body) {
      return;
    }

    this.matchPhase = "boccino_rolling";
    this.boccinoStoppedFrames = 0;
    this.boccinoSoftStopFramesLeft = 0;
    this.boccinoLaunchedAt = this.time.now;

    const deg = Phaser.Math.FloatBetween(
      gameplayCfg.boccinoLaunchAngleMinDeg,
      gameplayCfg.boccinoLaunchAngleMaxDeg,
    );
    const rad = Phaser.Math.DegToRad(deg);
    const speed = this.dynBoccinoAutoLaunchSpeedWorld;
    const dirX = Math.sin(rad);
    const dirY = -Math.cos(rad);

    this.matter.setVelocity(this.ballBoccino, dirX * speed, dirY * speed);
    this.playBallLaunchSfx();
  }

  private getBoccinoSettlingParams(): {
    minRollingMs: number;
    rollLerpTh: number;
    rollLerpT: number;
    stoppedSettleFrames: number;
    softStopFrames: number;
    softStopVelLerp: number;
    softStopAngLerp: number;
    softStopCompleteBelow: number;
  } {
    if (this.boccinoFirstAutoLaunchSettling) {
      return {
        minRollingMs: gameplayCfg.boccinoFirstAutoRollMinRollingMs,
        rollLerpTh: gameplayCfg.boccinoFirstAutoRollRollingLerpSpeedThreshold,
        rollLerpT: gameplayCfg.boccinoFirstAutoRollRollingVelocityLerp,
        stoppedSettleFrames: gameplayCfg.boccinoFirstAutoRollStoppedSettleFrames,
        softStopFrames: gameplayCfg.boccinoFirstAutoRollSoftStopFrames,
        softStopVelLerp: gameplayCfg.boccinoFirstAutoRollSoftStopVelocityLerp,
        softStopAngLerp: gameplayCfg.boccinoFirstAutoRollSoftStopAngularLerp,
        softStopCompleteBelow: gameplayCfg.boccinoFirstAutoRollSoftStopCompleteSpeedThreshold,
      };
    }

    return {
      minRollingMs: gameplayCfg.boccinoMinRollingMs,
      rollLerpTh: gameplayCfg.boccinoRollingLerpSpeedThreshold,
      rollLerpT: gameplayCfg.boccinoRollingVelocityLerp,
      stoppedSettleFrames: gameplayCfg.boccinoStoppedSettleFrames,
      softStopFrames: gameplayCfg.boccinoSoftStopFrames,
      softStopVelLerp: gameplayCfg.boccinoSoftStopVelocityLerp,
      softStopAngLerp: gameplayCfg.boccinoSoftStopAngularLerp,
      softStopCompleteBelow: gameplayCfg.boccinoSoftStopCompleteSpeedThreshold,
    };
  }

  private updateBoccinoSettling(): void {
    if (this.matchPhase !== "boccino_rolling" || !this.ballBoccino?.body) {
      return;
    }

    if (this.boccinoSoftStopFramesLeft > 0) {
      this.applyBoccinoSoftStop();

      return;
    }

    const settle = this.getBoccinoSettlingParams();

    if (this.time.now - this.boccinoLaunchedAt < settle.minRollingMs) {
      this.boccinoStoppedFrames = 0;

      return;
    }

    const body = this.ballBoccino.body as MatterJS.BodyType;
    let vx = body.velocity.x;
    let vy = body.velocity.y;
    let sp = Math.hypot(vx, vy);

    const rollLerpTh = settle.rollLerpTh;
    const rollLerpT = settle.rollLerpT;

    if (sp > 0.02 && sp <= rollLerpTh) {
      vx = Phaser.Math.Linear(vx, 0, rollLerpT);
      vy = Phaser.Math.Linear(vy, 0, rollLerpT);
      this.matter.setVelocity(this.ballBoccino, vx, vy);
      sp = Math.hypot(vx, vy);
    }

    if (sp < gameplayCfg.boccinoStoppedSpeedThreshold) {
      this.boccinoStoppedFrames++;
    } else {
      this.boccinoStoppedFrames = 0;
    }

    if (this.boccinoStoppedFrames >= settle.stoppedSettleFrames) {
      this.boccinoSoftStopFramesLeft = settle.softStopFrames;
      this.boccinoStoppedFrames = 0;
    }
  }

  private applyBoccinoSoftStop(): void {
    if (!this.ballBoccino?.body) {
      this.boccinoSoftStopFramesLeft = 0;
      this.completeBoccinoNaturalStopAndHandoff();

      return;
    }

    const body = this.ballBoccino.body as MatterJS.BodyType;
    const settle = this.getBoccinoSettlingParams();
    const lerpL = settle.softStopVelLerp;
    const lerpA = settle.softStopAngLerp;
    const vx = Phaser.Math.Linear(body.velocity.x, 0, lerpL);
    const vy = Phaser.Math.Linear(body.velocity.y, 0, lerpL);
    const w = Phaser.Math.Linear(body.angularVelocity, 0, lerpA);

    this.matter.setVelocity(this.ballBoccino, vx, vy);
    this.matter.setAngularVelocity(this.ballBoccino, w);

    this.boccinoSoftStopFramesLeft--;
    const sp = Math.hypot(vx, vy);
    const completeBelow = settle.softStopCompleteBelow;

    if (sp < completeBelow || this.boccinoSoftStopFramesLeft <= 0) {
      this.completeBoccinoNaturalStopAndHandoff();
    }
  }

  private completeBoccinoNaturalStopAndHandoff(): void {
    this.boccinoSoftStopFramesLeft = 0;
    this.boccinoFirstAutoLaunchSettling = false;

    if (this.ballBoccino?.body) {
      this.matter.setVelocity(this.ballBoccino, 0, 0);
      this.matter.setAngularVelocity(this.ballBoccino, 0);
    }

    this.finalizeBoccinoBeforePlayerTurn();
  }

  /** Boccino fermo: niente bandierino finché non compare ball_player (o ball_enemy registrata). */
  private finalizeBoccinoBeforePlayerTurn(): void {
    if (this.matchPhase !== "boccino_rolling" || !this.ballBoccino) {
      return;
    }

    this.matchPhase = "flag_to_player";

    this.time.delayedCall(gameplayCfg.delayMsAfterFlagBeforePlayer, () => this.beginPlayerTurn());
  }

  private beginPlayerTurn(): void {
    if (this.matchPhase !== "flag_to_player") {
      return;
    }

    this.matchPhase = "player_turn";

    const body = this.ballPlayer.body as MatterJS.BodyType;

    body.isSensor = false;

    this.updateBallRestWorldPosition();
    this.syncPlayerBallAtRest(this.ballPlayer);
    this.ballPlayer.setVisible(true);

    const playerSh = this.ensurePlayerBallShadow(this.ballPlayer, this.ballPlayer.scaleX);

    playerSh.setPosition(this.ballRestWorld.x, this.ballRestWorld.y);
    playerSh.setVisible(true);

    this.aimArrowRoot.setPosition(this.ballRestWorld.x, this.ballRestWorld.y);

    this.canShoot = true;

    this.syncFlagToBoccinoAndShow();

    this.flagAwaitAllStopped = false;
    this.flagAllStoppedFrames = 0;
    this.clearFlagReactivateTimer();
    this.flagReactivateDelayPending = false;

    this.gameScene.uiManager.updateColpoVincenteShotChipTurnHighlight("player");
  }

  private syncFlagToBoccinoAndShow(): void {
    if (!this.ballBoccino) {
      return;
    }

    this.syncFlagToBallAndShow(this.ballBoccino);
  }

  private syncFlagToBallAndShow(
    ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image,
  ): void {
    const x = ball.x;
    const y = ball.y;

    this.flagFollowTarget = ball;

    if (!this.flagMarker) {
      this.flagMarker = this.add
        .sprite(x, y, assetConf.spritesheet.animBandiera.key)
        .setOrigin(0.5, 1)
        .setDepth(gameplayCfg.laneEntityDepthMin);
      this.flagMarker.play(assetConf.keyAnim.animBandieraLoop);
    } else {
      this.flagMarker.setPosition(x, y);
      this.flagMarker.setVisible(true);

      if (!this.flagMarker.anims.isPlaying) {
        this.flagMarker.play(assetConf.keyAnim.animBandieraLoop);
      }
    }

    this.updateFlagPerspectiveScale();
  }

  private hideFlagMarker(): void {
    if (this.flagMarker) {
      this.flagMarker.setVisible(false);
      this.flagMarker.anims.stop();
    }

    this.flagFollowTarget = undefined;
  }

  private onPlayerBallLaunchedHideFlag(): void {
    this.hideFlagMarker();
    this.flagAwaitAllStopped = true;
    this.resetFlagIdleProgress();
    this.playerShotAt = this.time.now;
  }

  private onEnemyBallLaunchedHideFlag(): void {
    this.hideFlagMarker();
    // Stessa logica: a fine lancio (quando tutto si ferma) il bandierino deve tornare visibile.
    this.flagAwaitAllStopped = true;
    this.resetFlagIdleProgress();
    this.playerShotAt = this.time.now;
  }

  private onPlayerBallLaunchedAfterVelocitySet(): void {
    this.onPlayerBallLaunchedHideFlag();

    this.releasedPlayerBalls.push(this.ballPlayer);
    this.playerShotsUsed++;
    this.gameScene.uiManager.consumePlayerShotIcon();
    this.gameScene.uiManager.updateColpoVincenteShotChipTurnHighlight("neutral");
    this.canShoot = false;
    this.nextBallSpawnTimer?.remove(false);

    this.attachBallTrailEmitter(this.ballPlayer, gameplayCfg.ballTrailTintPlayer);
    this.beginCameraShotOnLaunch(this.ballPlayer);

    if (this.enemyShotsUsed < gameplayCfg.maxEnemyShots) {
      this.nextBallSpawnTimer = this.time.delayedCall(
        gameplayCfg.delayMsAfterPlayerShotBeforeEnemyMs,
        () => {
          this.nextBallSpawnTimer = undefined;
          this.spawnAndLaunchEnemyBall();
        },
      );
    }
  }

  private spawnAndLaunchEnemyBall(): void {
    if (this.isGameOver || !this.ballBoccino?.body) {
      return;
    }

    this.matchPhase = "enemy_turn";
    this.gameScene.uiManager.updateColpoVincenteShotChipTurnHighlight("enemy");

    this.updateBallRestWorldPosition();

    const s = this.ballPerspectiveBaseScale;
    const radiusPlayer = this.getPlayerBallColliderRadiusAtScale1();

    const enemy = this.matter.add.sprite(
      this.ballRestWorld.x,
      this.ballRestWorld.y,
      assetConf.spritesheet.animBall_Enemy.key,
      0,
      {
        shape: {type: "circle", radius: radiusPlayer},
        density: gameplayCfg.ballEnemyDensity,
        friction: gameplayCfg.ballEnemyFriction,
        frictionStatic: gameplayCfg.ballEnemyFrictionStatic,
        frictionAir: 0.032,
        restitution: gameplayCfg.ballEnemyRestitution,
        isSensor: false,
      },
    );

    enemy.play(assetConf.keyAnim.animBallEnemySpin);
    enemy.anims.pause();
    enemy.setScale(s);
    this.syncBallAtRest(enemy);
    this.registerEnemyBallForFlagIdle(enemy);
    this.ensurePlayerBallShadow(enemy, s);

    // Quando “carica” la prossima ball (anche enemy) la bandierina deve vedersi.
    this.syncFlagToBoccinoAndShow();

    const plan = this.computeEnemyShotPlan();

    this.runEnemyAimSimulationThenLaunch(enemy, plan);
  }

  private runEnemyAimSimulationThenLaunch(
    enemy: Phaser.Physics.Matter.Sprite,
    plan: {dirX: number; dirY: number; pull: number; vx: number; vy: number},
  ): void {
    this.enemyBallForAimArrow = enemy;
    this.enemyAimTween?.remove();

    const pullEnd = plan.pull;
    let pullStart = Math.min(gameplayCfg.enemyAimPullSimulateStart, pullEnd - 0.5);

    pullStart = Math.max(6, pullStart);

    if (pullStart >= pullEnd) {
      pullStart = Math.max(4, pullEnd * 0.35);
    }

    const state = {pull: pullStart};

    this.drawPowerArrow(plan.dirX, plan.dirY, pullStart);

    this.enemyAimTween = this.tweens.add({
      targets: state,
      pull: pullEnd,
      duration: gameplayCfg.enemyAimSimulateDurationMs,
      ease: "Sine.easeOut",
      onUpdate: () => {
        this.drawPowerArrow(plan.dirX, plan.dirY, state.pull);
      },
      onComplete: () => {
        this.enemyAimTween = undefined;
        this.enemyBallForAimArrow = undefined;
        this.aimArrowRoot.setVisible(false);

        if (enemy.active && enemy.body) {
          this.onEnemyBallLaunchedHideFlag();
          this.playBallLaunchSfx();
          this.matter.setVelocity(enemy, plan.vx, plan.vy);
          this.attachBallTrailEmitter(enemy, gameplayCfg.ballTrailTintEnemy);
          this.beginCameraShotOnLaunch(enemy);
        }

        this.onEnemyTurnLaunchComplete();
      },
    });
  }

  private onEnemyTurnLaunchComplete(): void {
    this.enemyShotsUsed++;
    this.gameScene.uiManager.consumeEnemyShotIcon();
    this.gameScene.uiManager.updateColpoVincenteShotChipTurnHighlight("neutral");
    this.canShoot = false;
    this.nextBallSpawnTimer?.remove(false);

    if (this.playerShotsUsed >= gameplayCfg.maxPlayerShots) {
      this.colpoMatchEndEnemyLaunchAtMs = this.time.now;
      this.matchEndAwaitCameraIdleForResolve = true;

      return;
    }

    this.nextBallSpawnTimer = this.time.delayedCall(gameplayCfg.nextPlayerBallSpawnDelayMs, () => {
      this.nextBallSpawnTimer = undefined;
      this.spawnNextControllablePlayerBall();
    });
  }

  private computeEnemyShotPlan(): {
    dirX: number;
    dirY: number;
    pull: number;
    vx: number;
    vy: number;
  } {
    const rx = this.ballRestWorld.x;
    const ry = this.ballRestWorld.y;
    const bx = this.ballBoccino!.x;
    const by = this.ballBoccino!.y;
    const dx = bx - rx;
    const dy = by - ry;
    const dist = Math.hypot(dx, dy) || 1;

    const lx = dx / dist;
    const ly = dy / dist;

    const precision = Phaser.Math.Clamp(gameplayCfg.enemyAimPrecision, 0, 1);
    const imprecision = 1 - precision;

    const jitterMax = gameplayCfg.enemyAimMaxJitterDeg * imprecision;
    const jitterDeg = Phaser.Math.FloatBetween(-jitterMax, jitterMax);
    const rad = Phaser.Math.DegToRad(jitterDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const jx = lx * cos - ly * sin;
    const jy = lx * sin + ly * cos;

    const aim = this.clampLaunchDirectionToForwardCone(jx, jy);

    const pullSpan = gameplayCfg.enemyPullMax - gameplayCfg.enemyPullMin;
    const pullTightMin = gameplayCfg.enemyPullMin + pullSpan * 0.1;
    const pullTightMax = gameplayCfg.enemyPullMax - pullSpan * 0.1;
    const pullMinEff = Phaser.Math.Linear(pullTightMin, gameplayCfg.enemyPullMin, imprecision);
    const pullMaxEff = Phaser.Math.Linear(pullTightMax, gameplayCfg.enemyPullMax, imprecision);
    const pull = Phaser.Math.FloatBetween(pullMinEff, pullMaxEff);

    const mulLo = Phaser.Math.Linear(0.94, gameplayCfg.enemyPowerMulMin, imprecision);
    const mulHi = Phaser.Math.Linear(1.06, gameplayCfg.enemyPowerMulMax, imprecision);
    const powerMul = Phaser.Math.FloatBetween(mulLo, mulHi);
    const power = Phaser.Math.Clamp(
      pull * this.getLaunchPowerScale() * powerMul * this.dynEnemyLaunchPowerMul,
      22,
      210,
    );

    return {
      dirX: aim.x,
      dirY: aim.y,
      pull,
      vx: aim.x * power,
      vy: aim.y * power,
    };
  }

  /**
   * Stesso cono dello slingshot giocatore: verso il fondo corsia (Y negativo), max ±75° laterale.
   */
  private clampLaunchDirectionToForwardCone(rawLx: number, rawLy: number): {x: number; y: number} {
    const len = Math.hypot(rawLx, rawLy);

    if (len < 1e-6) {
      return {x: 0, y: -1};
    }

    const lx = rawLx / len;
    const ly = rawLy / len;
    const minDot = Math.cos(Phaser.Math.DegToRad(this.aimMaxSideDeg));
    const dot = lx * this.aimForwardX + ly * this.aimForwardY;

    if (dot >= minDot) {
      return {x: lx, y: ly};
    }

    let ax = lx;
    let ay = ly;

    for (let i = 0; i < 14; i++) {
      ax = Phaser.Math.Linear(ax, this.aimForwardX, 0.32);
      ay = Phaser.Math.Linear(ay, this.aimForwardY, 0.32);
      const n = Math.hypot(ax, ay) || 1;

      ax /= n;
      ay /= n;

      if (ax * this.aimForwardX + ay * this.aimForwardY >= minDot) {
        return {x: ax, y: ay};
      }
    }

    return {x: this.aimForwardX, y: this.aimForwardY};
  }

  private scheduleMatchResolveWhenFieldSettled(): void {
    const tryResolve = (): void => {
      if (this.isGameOver) {
        return;
      }

      if (this.time.now - this.playerShotAt < gameplayCfg.postShotFlagMinWaitMs) {
        this.time.delayedCall(100, tryResolve);

        return;
      }

      if (!this.areAllFlagIdleBallsStopped()) {
        this.time.delayedCall(100, tryResolve);

        return;
      }

      // Fine partita: dopo l'ultimo tiro enemy, quando tutto si ferma e prima del risultato,
      // la bandierina deve ricomparire.
      this.syncFlagToBoccinoAndShow();

      this.time.delayedCall(gameplayCfg.postShotFlagExtraSettleDelayMs + 100, () => {
        if (this.isGameOver) {
          return;
        }

        if (!this.areAllFlagIdleBallsStopped()) {
          tryResolve();

          return;
        }

        this.resolveMatchWinnerAndEnd();
      });
    };

    this.time.delayedCall(120, tryResolve);
  }

  private resolveMatchWinnerAndEnd(): void {
    if (this.isGameOver) {
      return;
    }

    const dP = this.getMinDistancePxToBoccinoAmong(this.collectVisiblePlayerBallsUnique());
    const dE = this.getMinDistancePxToBoccinoAmong(this.getEnemyBallsForDistanceAndScoring());
    const eps = gameplayCfg.matchTieDistanceEpsilonPx;
    const pOk = Number.isFinite(dP);
    const eOk = Number.isFinite(dE);

    let outcome: ColpoVincenteMatchOutcome;
    let logDetail: string;

    if (!pOk && !eOk) {
      outcome = "draw";
      logDetail = "nessuna distanza valida (player / nemico).";
    } else if (!pOk) {
      outcome = "loss";
      logDetail = `nessuna palla giocatore valida; d nemico ≈ ${dE.toFixed(1)} px.`;
    } else if (!eOk) {
      outcome = "win";
      logDetail = `nessuna palla nemica valida; d player ≈ ${dP.toFixed(1)} px.`;
    } else if (Math.abs(dP - dE) < eps) {
      outcome = "draw";
      logDetail = `entro ε=${eps}px: player ${dP.toFixed(1)} px, nemico ${dE.toFixed(1)} px.`;
    } else if (dP < dE) {
      outcome = "win";
      logDetail = `player più vicino: ${dP.toFixed(1)} px vs nemico ${dE.toFixed(1)} px.`;
    } else {
      outcome = "loss";
      logDetail = `nemico più vicino: ${dE.toFixed(1)} px vs player ${dP.toFixed(1)} px.`;
    }

    if (outcome === "win") {
      console.log(`[Colpo Vincente] VITTORIA — ${logDetail}`);
    } else if (outcome === "draw") {
      console.log(`[Colpo Vincente] PAREGGIO — ${logDetail}`);
    } else {
      console.log(`[Colpo Vincente] SCONFITTA — ${logDetail}`);
    }

    this.colpoVincenteMatchOutcome = outcome;
    this.playerWonColpoVincente = outcome === "win";

    const ui = this.gameScene.uiManager;

    if (outcome === "win") {
      ui.score = ui.maxScore;
    } else if (outcome === "draw") {
      ui.score = Math.round(ui.maxScore * 0.5);
    } else {
      ui.score = 0;
    }

    this.gameScene.registry.set(assetConf.registry.score, ui.score);

    this.gameScene.uiManager.updateColpoVincenteShotChipTurnHighlight("neutral");
    this.gameScene.uiManager.updateWinningHudByDistance(null, null);

    this.snapCameraShotToAnchorIfActive();

    this.isGameOver = true;
    this.canShoot = false;
    this.scene.pause();
    this.gameScene.gameOver();
  }

  private spawnNextControllablePlayerBall(): void {
    this.matchPhase = "player_turn";
    this.updateBallRestWorldPosition();

    const s = this.gameScene.setDynamicValueBasedOnScale(0.42, 0.72);
    const radiusPlayer = this.getPlayerBallColliderRadiusAtScale1();

    this.ballPlayer = this.matter.add.sprite(
      this.ballRestWorld.x,
      this.ballRestWorld.y,
      assetConf.spritesheet.animBall_Player.key,
      0,
      {
        shape: {type: "circle", radius: radiusPlayer},
        density: gameplayCfg.ballPlayerDensity,
        friction: gameplayCfg.ballPlayerFriction,
        frictionStatic: gameplayCfg.ballPlayerFrictionStatic,
        frictionAir: 0.032,
        restitution: gameplayCfg.ballPlayerRestitution,
        isSensor: false,
      },
    );
    this.ballPlayer.play(assetConf.keyAnim.animBallPlayerSpin);
    this.ballPlayer.anims.pause();

    this.ballPlayer.setVisible(true);
    this.ballPerspectiveBaseScale = s;
    this.ballPlayer.setScale(s);
    this.syncPlayerBallAtRest(this.ballPlayer);

    const nextSh = this.ensurePlayerBallShadow(this.ballPlayer, s);

    nextSh.setPosition(this.ballRestWorld.x, this.ballRestWorld.y);
    nextSh.setVisible(true);
    nextSh.setScale(s, s);

    this.aimArrowRoot.setPosition(this.ballRestWorld.x, this.ballRestWorld.y);
    this.aimArrowRoot.setVisible(false);

    this.canShoot = true;

    this.syncFlagToBoccinoAndShow();

    this.time.delayedCall(0, () => {
      if (this.ballPlayer?.active && this.ballPlayer.body) {
        this.syncPlayerBallAtRest(this.ballPlayer);
      }
    });

    this.gameScene.uiManager.updateColpoVincenteShotChipTurnHighlight("player");
  }

  private clearFlagReactivateTimer(): void {
    this.flagReactivateTimer?.remove(false);

    this.flagReactivateTimer = undefined;
  }

  private resetFlagIdleProgress(): void {
    this.flagAllStoppedFrames = 0;
    this.clearFlagReactivateTimer();
    this.flagReactivateDelayPending = false;
  }

  private getBodyLinearSpeed(body: MatterJS.BodyType): number {
    const v = body.velocity;

    return Math.hypot(v.x, v.y);
  }

  private isBodyBelowSpeedThreshold(body: MatterJS.BodyType, th: number): boolean {
    return this.getBodyLinearSpeed(body) < th;
  }

  /**
   * Ordine: boccino → ball_player → ball_enemy registrate.
   * Ogni voce ha la propria soglia (player più stretta).
   */
  private buildBallsForFlagIdleCheck(): FlagIdleTrackedBall[] {
    const thOther = gameplayCfg.boccinoStoppedSpeedThreshold;
    const thPlayer = gameplayCfg.postShotPlayerStoppedSpeedThreshold;
    const list: FlagIdleTrackedBall[] = [];

    if (this.ballBoccino?.active && this.ballBoccino.body) {
      list.push({ball: this.ballBoccino, maxSpeed: thOther});
    }

    for (const pb of this.releasedPlayerBalls) {
      if (pb.active && pb.body) {
        list.push({ball: pb, maxSpeed: thPlayer});
      }
    }

    if (
      this.ballPlayer?.active &&
      this.ballPlayer.body &&
      !this.releasedPlayerBalls.includes(this.ballPlayer)
    ) {
      list.push({ball: this.ballPlayer, maxSpeed: thPlayer});
    }

    for (const enemy of this.ballEnemies) {
      if (enemy.active && enemy.body) {
        list.push({ball: enemy, maxSpeed: thOther});
      }
    }

    return list;
  }

  /** True solo se ogni palla in `buildBallsForFlagIdleCheck()` è sotto la sua maxSpeed. */
  private areAllFlagIdleBallsStopped(): boolean {
    const tracked = this.buildBallsForFlagIdleCheck();

    if (tracked.length < 2 || !this.ballBoccino?.body || !this.ballPlayer?.body) {
      return false;
    }

    for (const {ball, maxSpeed} of tracked) {
      const body = ball.body as MatterJS.BodyType | undefined;

      if (!body || !this.isBodyBelowSpeedThreshold(body, maxSpeed)) {
        return false;
      }
    }

    return true;
  }

  private updateFlagWhenAllBallsIdle(): void {
    if (!this.flagAwaitAllStopped || !this.ballBoccino?.body || !this.ballPlayer?.body) {
      return;
    }

    /** In mira la palla è ferma in hand-position: non considerare “tutto fermo” per il bandierino. */
    if (this.ballDragging) {
      this.resetFlagIdleProgress();

      return;
    }

    if (this.time.now - this.playerShotAt < gameplayCfg.postShotFlagMinWaitMs) {
      this.resetFlagIdleProgress();

      return;
    }

    if (!this.areAllFlagIdleBallsStopped()) {
      this.resetFlagIdleProgress();

      return;
    }

    if (this.flagReactivateDelayPending) {
      return;
    }

    this.flagAllStoppedFrames++;

    if (this.flagAllStoppedFrames < gameplayCfg.boccinoStoppedSettleFrames) {
      return;
    }

    this.flagReactivateDelayPending = true;

    this.flagReactivateTimer = this.time.delayedCall(
      gameplayCfg.postShotFlagExtraSettleDelayMs,
      () => {
        this.flagReactivateTimer = undefined;
        this.flagReactivateDelayPending = false;

        if (!this.flagAwaitAllStopped) {
          return;
        }

        if (this.ballDragging || !this.areAllFlagIdleBallsStopped()) {
          this.flagAllStoppedFrames = 0;

          return;
        }

        // Dopo un tiro: qui *non* mostriamo il bandierino. Deve comparire solo quando si “carica”
        // la prossima palla (player/enemy), oppure nel caso speciale di fine partita (gestito altrove).
        this.flagAwaitAllStopped = false;
        this.flagAllStoppedFrames = 0;
      },
    );
  }

  /**
   * Dopo che Matter ha risolto l’urto, aggiunge vy negativo (verso l’alto) in base alla componente orizzontale.
   * Vale per ogni ball_player (attiva o già rilasciata).
   */
  private readonly onLateralWallCollisionStart = (
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ): void => {
    if (
      (this.matchPhase !== "player_turn" && this.matchPhase !== "enemy_turn") ||
      this.ballDragging
    ) {
      return;
    }

    const leftBody = this.wallLeftPlank?.body as MatterJS.BodyType | null | undefined;
    const rightBody = this.wallRightPlank?.body as MatterJS.BodyType | null | undefined;

    if (!leftBody || !rightBody) {
      return;
    }

    for (const pair of event.pairs) {
      const {bodyA, bodyB} = pair;
      const wallHit =
        bodyA === leftBody || bodyA === rightBody
          ? bodyA
          : bodyB === leftBody || bodyB === rightBody
            ? bodyB
            : null;

      if (wallHit === null) {
        continue;
      }

      const other = bodyA === wallHit ? bodyB : bodyA;
      const ballImg = this.getTeamBallMatterImageForBody(other);

      if (!ballImg?.body) {
        continue;
      }

      this.time.delayedCall(0, () => this.applyLateralPerspectiveKickToBall(ballImg));
    }
  };

  private applyLateralPerspectiveKickToBall(ball: Phaser.Physics.Matter.Sprite): void {
    if (
      (this.matchPhase !== "player_turn" && this.matchPhase !== "enemy_turn") ||
      !ball.body ||
      this.ballDragging
    ) {
      return;
    }

    const now = this.time.now;

    if (now < this.lateralKickNextAllowedAt) {
      return;
    }

    const body = ball.body as MatterJS.BodyType;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const horizontal = Math.abs(vx);

    if (horizontal < 3) {
      return;
    }

    const kickBase = horizontal * this.lateralDepthKickFactor;
    const minKick = this.dynLateralKickMin;
    const maxKick = this.dynLateralKickMax;
    const kick = Phaser.Math.Clamp(kickBase, minKick, maxKick);

    this.lateralKickNextAllowedAt = now + this.lateralKickCooldownMs;

    this.matter.setVelocity(ball, vx, vy - kick);
  }

  private updateMatterWorldBounds(): void {
    const t = 64;

    this.matter.world.setBounds(
      0,
      0,
      this.scale.width,
      this.scale.height,
      t,
      true,
      true,
      true,
      true,
    );
  }

  private constrainBoccinoInsideLane(): void {
    const b = this.ballBoccino;

    if (!b?.active || !b.body) {
      return;
    }

    const r = Math.max(this.getBoccinoColliderWorldRadius(), 1);
    const scale = Math.max(this.laneScale, 1e-6);

    // Converti a design per usare i laterali inclinati come recinto.
    const lx = (b.x - this.laneX) / scale;
    const ly = b.y / scale;

    const {xL, xR} = this.getLaneSideXsAtDesignY(ly);
    const xMinW = this.laneX + (xL * scale + r);
    const xMaxW = this.laneX + (xR * scale - r);

    const yBackDesign = this.getMinimapYColliderDesign();
    const yMinW = this.laneY + yBackDesign * scale + r;

    const {designH} = this.getLaneDesignDimensions();
    const yMaxW = this.laneY + designH * scale - r;

    const body = b.body as MatterJS.BodyType;
    const vx = body.velocity.x;
    const vy = body.velocity.y;

    let nx = b.x;
    let ny = b.y;
    let outX = false;
    let outY = false;

    if (nx < xMinW) {
      nx = xMinW;
      outX = true;
    } else if (nx > xMaxW) {
      nx = xMaxW;
      outX = true;
    }

    if (ny < yMinW) {
      ny = yMinW;
      outY = true;
    } else if (ny > yMaxW) {
      ny = yMaxW;
      outY = true;
    }

    if (!outX && !outY) {
      return;
    }

    b.setPosition(nx, ny);
    this.matter.alignBody(b, nx, ny, Phaser.Display.Align.CENTER);

    // Taglia solo la componente che spinge fuori.
    const nvx = outX && ((nx <= xMinW && vx < 0) || (nx >= xMaxW && vx > 0)) ? 0 : vx;
    const nvy = outY && ((ny <= yMinW && vy < 0) || (ny >= yMaxW && vy > 0)) ? 0 : vy;

    this.matter.setVelocity(b, nvx, nvy);
  }

  private updateBallRestWorldPosition(): void {
    const cx = this.scale.width * 0.5;
    const cy =
      this.scale.height * 0.8 +
      this.gameScene.setDynamicValueBasedOnScale(0, this.scale.height * 0.04);

    this.ballRestWorld.set(cx, cy);
  }

  /**
   * Sprite e body Matter sul punto di riposo (alignBody = centro massa / bounds coerenti).
   * Senza questo, la palla può risultare spostata finché non si tocca di nuovo.
   */
  private syncBallAtRest(ball: Phaser.Physics.Matter.Sprite | Phaser.Physics.Matter.Image): void {
    if (!ball.body) {
      return;
    }

    const x = this.ballRestWorld.x;
    const y = this.ballRestWorld.y;

    ball.setPosition(x, y);
    this.matter.alignBody(ball, x, y, Phaser.Display.Align.CENTER);
    this.matter.setVelocity(ball, 0, 0);
    this.matter.setAngularVelocity(ball, 0);
  }

  private syncPlayerBallAtRest(ball: Phaser.Physics.Matter.Sprite): void {
    this.syncBallAtRest(ball);
  }

  private getMaxPullDistanceWorld(): number {
    return this.dynMaxPullWorld;
  }

  private getLaunchPowerScale(): number {
    return (this.speedBall / 260) * this.dynLaunchPowerMul;
  }

  private getBallGrabRadiusWorld(): number {
    if (!this.canShoot || !this.ballPlayer.visible) {
      return 0;
    }

    return Math.max(this.ballPlayer.displayWidth * 0.55, 48);
  }

  private isBallSlowEnoughToGrab(): boolean {
    if (!this.canShoot) {
      return false;
    }

    const body = this.ballPlayer?.body as MatterJS.BodyType | undefined;

    if (!body) {
      return false;
    }

    const sp = Math.hypot(body.velocity.x, body.velocity.y);

    return sp < 32;
  }

  /**
   * Avanzamento verso il fondo corsia = verso l’alto schermo (Y Phaser verso il basso).
   * Max ±75° rispetto all’avanti: non si può tirare indietro; il puro 90° laterale è vietato (tolleranza 15° verso avanti).
   */
  private readonly aimForwardX = 0;
  private readonly aimForwardY = -1;
  private readonly aimMaxSideDeg = 75;

  /**
   * Slingshot: tiri il dito dalla palla → la palla parte nell’opposto.
   * Fuori settore (indietro / troppo laterale): `aimValid` false → niente freccia e niente lancio al rilascio.
   */
  private getClampedAimFromPointer(
    ptrX: number,
    ptrY: number,
  ): {pull: number; launchDirX: number; launchDirY: number; aimValid: boolean} {
    const rx = this.ballRestWorld.x;
    const ry = this.ballRestWorld.y;
    let dx = ptrX - rx;
    let dy = ptrY - ry;
    const dist = Math.hypot(dx, dy);
    const maxPull = this.getMaxPullDistanceWorld();

    if (dist > maxPull && dist > 0) {
      dx = (dx / dist) * maxPull;
      dy = (dy / dist) * maxPull;
    }

    const pull = Math.hypot(dx, dy);

    if (pull < 1) {
      return {pull: 0, launchDirX: 0, launchDirY: -1, aimValid: false};
    }

    const ux = dx / pull;
    const uy = dy / pull;
    const rawLx = -ux;
    const rawLy = -uy;
    const minDot = Math.cos(Phaser.Math.DegToRad(this.aimMaxSideDeg));
    const dot = rawLx * this.aimForwardX + rawLy * this.aimForwardY;
    const aimValid = dot >= minDot;

    if (!aimValid) {
      return {pull, launchDirX: 0, launchDirY: -1, aimValid: false};
    }

    return {
      pull,
      launchDirX: rawLx,
      launchDirY: rawLy,
      aimValid: true,
    };
  }

  /**
   * `arrow_bottom` (corpo) sotto, stirato in altezza con la potenza; `arrow_top` (testa) sopra, scala uniforme.
   * Pivot container al centro palla, rotazione come freccia verticale composita.
   */
  private drawPowerArrow(launchDirX: number, launchDirY: number, pull: number): void {
    if (pull < 6) {
      this.aimArrowRoot.setVisible(false);

      return;
    }

    const rx = this.ballRestWorld.x;
    const ry = this.ballRestWorld.y;
    const dirX = launchDirX;
    const dirY = launchDirY;
    /** Corpo più lungo rispetto al pull (base meno “corta”). */
    const bodyLengthMul = this.dynArrowBodyLengthMul;
    const arrowLen = Math.max((pull - 2) * bodyLengthMul, 10);

    const hBot = Math.max(this.textures.get(assetConf.image.arrow_bottom).get().height, 1);
    const scaleX = this.dynArrowScaleX;

    this.aimArrowTop.setScale(scaleX, scaleX);
    const headH = this.aimArrowTop.displayHeight;
    const bodyLen = Math.max(arrowLen - headH, hBot * scaleX * 0.22);
    const scaleYBottom = bodyLen / hBot;

    this.aimArrowBottom.setScale(scaleX, scaleYBottom);
    this.aimArrowTop.setPosition(0, -this.aimArrowBottom.displayHeight);

    this.aimArrowRoot.setVisible(true);
    this.aimArrowRoot.setPosition(rx, ry);
    this.aimArrowRoot.setRotation(Math.atan2(dirY, dirX) + Math.PI / 2);
  }

  private createOrUpdateFullScreenWhiteBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.fullScreenWhiteBg) {
      this.fullScreenWhiteBg.setPosition(w * 0.5, h * 0.5);
      this.fullScreenWhiteBg.setSize(w, h);

      return;
    }

    this.fullScreenWhiteBg = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0xffffff);
    this.fullScreenWhiteBg.setDepth(-10);
  }

  private syncWallsFromLane(): void {
    this.rebuildMatterInclinedPlanks();
    this.applyAxisAlignedWallMatter(this.wallBack, this.wallBackConfig);
  }

  private destroyInclinedPlanks(): void {
    this.wallLeftPlank?.destroy();
    this.wallRightPlank?.destroy();
    this.wallLeftPlank = undefined;
    this.wallRightPlank = undefined;
  }

  private rebuildMatterInclinedPlanks(): void {
    this.destroyInclinedPlanks();

    this.wallLeftPlank = this.buildMatterInclinedPlank(this.wallLeftLine);
    this.wallRightPlank = this.buildMatterInclinedPlank(this.wallRightLine);
  }

  private buildMatterInclinedPlank(line: SegmentLineWallConfig): Phaser.GameObjects.Rectangle {
    const alpha = line.alpha ?? 0;
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const lenDesign = Math.hypot(dx, dy);
    const cxDesign = (line.x1 + line.x2) * 0.5;
    const cyDesign = (line.y1 + line.y2) * 0.5;
    const worldX = this.laneX + cxDesign * this.laneScale;
    const worldY = this.laneY + cyDesign * this.laneScale;
    const worldLen = lenDesign * this.laneScale;
    const worldTh = line.thickness * this.laneScale;
    const angle = Math.atan2(dy, dx);

    const rect = this.add
      .rectangle(worldX, worldY, worldLen, worldTh, line.color, alpha)
      .setStrokeStyle(alpha > 0 ? 2 : 0, 0xffffff, alpha > 0 ? 0.6 : 0)
      .setRotation(angle)
      .setDepth(-1);

    this.matter.add.gameObject(rect, {
      isStatic: true,
      angle,
      friction: 0.06,
      frictionStatic: 0.28,
      restitution: 0.48,
    });

    return rect;
  }

  private applyAxisAlignedWallMatter(
    wall: Phaser.GameObjects.Rectangle,
    cfg: AxisAlignedWallConfig,
  ): void {
    const worldX = this.laneX + cfg.x * this.laneScale;
    const worldY = this.laneY + cfg.y * this.laneScale;
    const worldW = cfg.width * this.laneScale;
    const worldH = cfg.height * this.laneScale;

    wall.setPosition(worldX, worldY);
    wall.setSize(worldW, worldH);
    wall.setDisplaySize(worldW, worldH);
    wall.setRotation(0);

    const hasMatter = wall.body !== undefined && wall.body !== null;

    if (!hasMatter) {
      this.matter.add.gameObject(wall, {
        isStatic: true,
        angle: 0,
        friction: 0.06,
        frictionStatic: 0.3,
        restitution: 0.48,
      });
    }
  }

  private handleResize(): void {
    this.laneX = this.scale.width * 0.5;
    this.laneY = 0;
    const {designW, designH} = this.getLaneDesignDimensions();

    this.laneScale = this.scale.width / designW;

    this.laneRoot.setPosition(this.laneX, this.laneY);
    this.laneRoot.setScale(this.laneScale);
    this.updateBgFillPosition();

    this.createOrUpdateFullScreenWhiteBackground();
    this.updateBottomSandExtension(designH);

    this.syncWallsFromLane();

    this.updateMatterWorldBounds();

    this.updateBallRestWorldPosition();

    if (this.matchPhase === "boccino_pending" && this.ballBoccino) {
      this.ballBoccino.setPosition(this.ballRestWorld.x, this.ballRestWorld.y);
      this.matter.setVelocity(this.ballBoccino, 0, 0);
    }

    this.ballPerspectiveBaseScale = this.gameScene.setDynamicValueBasedOnScale(0.42, 0.72);
    this.refreshDynamicTuningFromScale();

    if (
      this.matchPhase === "player_turn" &&
      this.canShoot &&
      this.ballPlayer?.visible &&
      this.isBallSlowEnoughToGrab()
    ) {
      this.syncPlayerBallAtRest(this.ballPlayer);
    }

    if (
      (this.matchPhase === "player_turn" || this.matchPhase === "enemy_turn") &&
      this.aimArrowRoot
    ) {
      this.aimArrowRoot.setPosition(this.ballRestWorld.x, this.ballRestWorld.y);
    }

    if (this.ballPlayer) {
      this.updateBallPerspectiveScale();
    }

    if (this.matchPhase === "player_turn" || this.matchPhase === "enemy_turn") {
      this.updateBallShadow();
    }

    if (this.camShotPhase === "idle") {
      this.captureDefaultCameraState();
    }
  }

  /**
   * Laterali corsia in spazio design (stessi segmenti di `wallLeftLine` / `wallRightLine`).
   * y in [350, 1200] interpolato; fuori range clamp → bocca stretta o fondo largo.
   */
  private getLaneSideXsAtDesignY(yDesign: number): {xL: number; xR: number} {
    const yLow = Math.min(this.wallLeftLine.y1, this.wallLeftLine.y2);
    const yHigh = Math.max(this.wallLeftLine.y1, this.wallLeftLine.y2);
    const yC = Phaser.Math.Clamp(yDesign, yLow, yHigh);
    const t = (yC - yLow) / Math.max(yHigh - yLow, 1e-6);

    return {
      xL: Phaser.Math.Linear(this.wallLeftLine.x2, this.wallLeftLine.x1, t),
      xR: Phaser.Math.Linear(this.wallRightLine.x2, this.wallRightLine.x1, t),
    };
  }

  /** Bordo “fondo corsia” lato muro (design), come `wallBack` (faccia verso il gioco). */
  private getMinimapYFondoDesign(): number {
    return this.wallBackConfig.y - this.wallBackConfig.height * 0.5;
  }

  /** Y design del collider orizzontale di fondo corsia (`wallBack`). */
  private getMinimapYColliderDesign(): number {
    return this.getMinimapYFondoDesign();
  }

  /**
   * Minimap in pianta: `u` tra pareti inclinate alla Y della palla; `v` tra fondo (collider orizzontale)
   * e bordo inferiore texture `bg_Top` (altezza corsia sullo schermo).
   */
  private designPosToMinimapUv(lx: number, ly: number): {u: number; v: number} {
    const yBack = this.getMinimapYColliderDesign();
    const yFront = this.getLaneDesignDimensions().designH;
    const spanY = Math.max(yFront - yBack, 1e-3);
    const {xL, xR} = this.getLaneSideXsAtDesignY(ly);
    const laneW = Math.max(xR - xL, 1e-6);
    const e = Math.max(gameplayCfg.laneMinimapCameraEdgeEpsilon, 1e-6);
    const u = (lx - xL) / laneW;
    const v = (ly - yBack) / spanY;

    return {
      u: Phaser.Math.Clamp(u, e, 1 - e),
      v: Phaser.Math.Clamp(v, e, 1 - e),
    };
  }

  public buildLaneMinimapBlips(): LaneMinimapBlip[] {
    const scale = Math.max(this.laneScale, 1e-6);
    const out: LaneMinimapBlip[] = [];

    const push = (wx: number, wy: number, kind: LaneMinimapBlip["kind"]): void => {
      const lx = (wx - this.laneX) / scale;
      const ly = wy / scale;
      const uv = this.designPosToMinimapUv(lx, ly);

      out.push({u: uv.u, v: uv.v, kind});
    };

    if (this.ballBoccino?.active && this.ballBoccino.visible) {
      push(this.ballBoccino.x, this.ballBoccino.y, "boccino");
    }

    for (const b of this.releasedPlayerBalls) {
      if (b.active && b.visible && b.body) {
        push(b.x, b.y, "player");
      }
    }

    if (
      this.ballPlayer?.active &&
      this.ballPlayer.visible &&
      this.ballPlayer.body &&
      !this.releasedPlayerBalls.includes(this.ballPlayer)
    ) {
      push(this.ballPlayer.x, this.ballPlayer.y, "player");
    }

    for (const e of this.ballEnemies) {
      if (e.active && e.visible && e.body) {
        push(e.x, e.y, "enemy");
      }
    }

    return out;
  }

  checkGameOver() {
    if (this.isGameOver) {
      console.log("GAME OVER:");

      this.canShoot = false;

      this.scene.pause();
      this.gameScene.gameOver();
    }
  }
}
