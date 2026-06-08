/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import * as Phaser from "phaser";

import {PhotoResultOverlay} from "../components/photo-result-overlay";
import {
  evaluateShot,
  getPhotoResultOverlayPlacement,
  getViewfinderRects,
  logShotEvaluation,
} from "../components/photo-shot.utils";
import {SafariAssetConf} from "../shared/config/asset-conf.const";
import {SafariViewfinderConfig} from "../shared/config/viewfinder.config";

import {Game} from "./game";

const assetConf = SafariAssetConf; //* Generalizzazione

/** Sotto sky; in questa scena così non copre l’HUD della scene Game */
const DEPTH_BACKGROUND_GAME = -1;
/** Sky in fondo; sopra sky, sotto terrain */
const DEPTH_BACKGROUND_SKY = 0;
const DEPTH_BACKGROUND_CAMERA = 1;
const DEPTH_BACKGROUND_CARD = 2;
const DEPTH_BACKGROUND_TERRAIN = 3;
const DEPTH_CAMERA_ZOOM = 10;
const DEPTH_CAMERA_BTN = 11;
const DEPTH_CAMERA_FLASH = 12;
const DEPTH_VIEWFINDER_DEBUG = 9;

/** px/s — aumenta entrambi per scroll più veloce (camera + card) */
const CAMERA_SCROLL_SPEED_MIN = 408;
const CAMERA_SCROLL_SPEED_MAX = 1152;

const CARD_IMAGE_KEYS = [
  "card_1",
  "card_2",
  "card_3",
  "card_4",
  "card_5",
  "card_6",
  "card_7",
] as const;

export class GameManager extends Phaser.Scene {
  private gameWidth!: number;
  private gameHeight!: number;

  private backgroundSky!: Phaser.GameObjects.Image;
  private backgroundTerrain!: Phaser.GameObjects.Image;
  private cameraScrollContainer!: Phaser.GameObjects.Container;
  private cardScrollContainer!: Phaser.GameObjects.Container;

  /** Stessa scala uniforme di background_Terrain (gameWidth / larghezza texture) */
  private backgroundScale = 1;
  private cameraTileWidth = 0;
  private cameraSegmentWidth = 0;
  private cardPool: Phaser.GameObjects.Image[] = [];
  private cardSpawnTimer: Phaser.Time.TimerEvent | null = null;
  private cameraScrollOffset = 0;
  private scrollSpeedInitial = 0;
  private scrollSpeedMultiplier = 1;
  private isScrollPaused = false;
  private cameraZoom!: Phaser.GameObjects.Image;
  private cameraBtn!: Phaser.GameObjects.Image;
  private viewfinderDebugGfx: Phaser.GameObjects.Graphics | null = null;
  private photoResultOverlay: PhotoResultOverlay | null = null;
  private isShowingPhotoResult = false;
  private scrollAnchorY = 0;

  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    console.log("Start Scene Safari");
    this.computeLayoutDimensions();
    this.createBackgroundGame();
    this.createBackgrounds();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
      this.scrollSpeedMultiplier = 1;
    });
  }

  //* Scopo: Calcola le dimensioni e la posizione centrale dell’area di gioco (background),
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
    //console.log("marginTop: ", this.marginTop);
  }

  private createBackgroundGame(): void {
    const backgroundGame = this.add
      .image(this.gameWidth / 2, this.gameHeight / 2, assetConf.image.backgroundGame)
      .setDepth(DEPTH_BACKGROUND_GAME);

    backgroundGame.setDisplaySize(this.gameWidth, this.gameHeight);
  }

  private createBackgrounds(): void {
    const img = assetConf.image;

    this.backgroundSky = this.add
      .image(this.gameWidth / 2, 0, img.background_Sky)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH_BACKGROUND_SKY);

    this.backgroundTerrain = this.add
      .image(this.gameWidth / 2, this.gameHeight, img.background_Terrain)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_BACKGROUND_TERRAIN);

    this.applyWidthCoverScale(this.backgroundSky);
    this.backgroundScale = this.applyWidthCoverScale(this.backgroundTerrain);
    this.applyTerrainLayout();

    this.createCameraScroll();
    this.createCardScroll();
    this.createCameraOverlay();
    this.scheduleNextAnimalSpawn();
  }

  /** Posizione terrain + ancoraggio scroll (camera, card, viewfinder). Sky e camera_btn restano fissi. */
  private applyTerrainLayout(): void {
    const terrainOffsetY = this.getTerrainOffsetY();

    // Pivot basso: mai sopra gameHeight (evita vuoto sotto), su schermi bassi può scendere
    this.backgroundTerrain.setY(this.gameHeight + Math.max(0, terrainOffsetY));

    // Ancoraggio al bordo alto reale dell’immagine (come layout originale)
    this.scrollAnchorY = this.backgroundTerrain.y - this.backgroundTerrain.displayHeight;
  }

  /**
   * Offset basato su aspect ratio (h/w), non su globalScale.
   * Schermi alti e stretti (es. OnePlus 360×804) → 0; schermi bassi → scende.
   */
  private getTerrainOffsetY(): number {
    const cfg = SafariViewfinderConfig;
    const aspect = this.gameHeight / this.gameWidth;
    const span = cfg.TERRAIN_OFFSET_ASPECT_TALL - cfg.TERRAIN_OFFSET_ASPECT_SHORT;
    const t =
      span > 0 ? Phaser.Math.Clamp((cfg.TERRAIN_OFFSET_ASPECT_TALL - aspect) / span, 0, 1) : 0;
    const assetOffset = Phaser.Math.Linear(
      cfg.TERRAIN_OFFSET_Y_LARGE_PX,
      cfg.TERRAIN_OFFSET_Y_SMALL_PX,
      t,
    );

    return assetOffset * this.backgroundScale;
  }

  private createCameraScroll(): void {
    const img = assetConf.image;

    const cameraKeys = [img.background_camera_1, img.background_camera_2] as const;

    const probe = this.add
      .image(0, 0, cameraKeys[0])
      .setOrigin(0.5, 0)
      .setScale(this.backgroundScale)
      .setVisible(false);

    this.cameraTileWidth = probe.displayWidth;
    probe.destroy();

    this.cameraSegmentWidth = this.cameraTileWidth * cameraKeys.length;
    this.scrollSpeedInitial = this.gameScene.setDynamicValueBasedOnScale(
      CAMERA_SCROLL_SPEED_MIN,
      CAMERA_SCROLL_SPEED_MAX,
    );

    this.cameraScrollContainer = this.add
      .container(this.gameWidth / 2, this.scrollAnchorY)
      .setDepth(DEPTH_BACKGROUND_CAMERA);

    const tileCount = Math.ceil(this.gameWidth / this.cameraTileWidth) + 4;
    const startIndex = -Math.floor(tileCount / 2);

    for (let i = 0; i < tileCount; i++) {
      const tileIndex = startIndex + i;
      const key = this.getCameraTileKey(cameraKeys, tileIndex);

      const tile = this.make.image({
        x: tileIndex * this.cameraTileWidth,
        y: 0,
        key,
        origin: {x: 0.5, y: 0},
        scale: this.backgroundScale,
        add: false,
      });

      this.cameraScrollContainer.add(tile);
    }
  }

  private createCardScroll(): void {
    const cfg = SafariViewfinderConfig;

    this.cardScrollContainer = this.add
      .container(this.gameWidth / 2, this.scrollAnchorY)
      .setDepth(DEPTH_BACKGROUND_CARD);

    for (let i = 0; i < cfg.CARD_POOL_SIZE; i++) {
      const card = this.createCardImage(0, CARD_IMAGE_KEYS[0]);

      card.setVisible(false);
      card.setActive(false);
      this.cardPool.push(card);
    }
  }

  private scheduleNextAnimalSpawn(): void {
    const cfg = SafariViewfinderConfig;

    this.cardSpawnTimer?.remove(false);

    if (this.isShowingPhotoResult || this.isGameOver) {
      return;
    }

    const delay = Phaser.Math.Between(
      cfg.CARD_SPAWN_INTERVAL_MIN_MS,
      cfg.CARD_SPAWN_INTERVAL_MAX_MS,
    );

    this.cardSpawnTimer = this.time.delayedCall(delay, () => {
      this.spawnRandomAnimal();
      this.scheduleNextAnimalSpawn();
    });
  }

  private stopAnimalSpawnTimer(): void {
    this.cardSpawnTimer?.remove(false);
    this.cardSpawnTimer = null;
  }

  private hasVisibleAnimal(): boolean {
    return this.cardPool.some((card) => card.visible && card.active);
  }

  private spawnRandomAnimal(): void {
    if (this.isScrollPaused || this.isShowingPhotoResult || this.isGameOver) {
      return;
    }

    if (this.hasVisibleAnimal()) {
      return;
    }

    const card = this.cardPool.find((c) => !c.visible && !c.active);

    if (!card) {
      return;
    }

    const key = this.getRandomCardKey();
    const pad = this.gameScene.setDynamicValueBasedOnScale(
      SafariViewfinderConfig.CARD_SPAWN_OFFSCREEN_PAD_PX * 0.6,
      SafariViewfinderConfig.CARD_SPAWN_OFFSCREEN_PAD_PX,
    );

    card.setTexture(key);
    card.setScale(this.backgroundScale);

    const spawnX = this.gameWidth / 2 + card.displayWidth / 2 + pad;

    card.setPosition(spawnX, 0);
    card.setVisible(true);
    card.setActive(true);
  }

  private getRandomCardKey(): (typeof CARD_IMAGE_KEYS)[number] {
    return Phaser.Utils.Array.GetRandom([...CARD_IMAGE_KEYS]);
  }

  private createCardImage(
    localX: number,
    key: (typeof CARD_IMAGE_KEYS)[number],
  ): Phaser.GameObjects.Image {
    const card = this.make.image({
      x: localX,
      y: 0,
      key,
      origin: {x: 0.5, y: 0},
      scale: this.backgroundScale,
      add: false,
    });

    this.cardScrollContainer.add(card);

    return card;
  }

  private createCameraOverlay(): void {
    const img = assetConf.image;

    this.cameraZoom = this.add
      .image(this.gameWidth / 2, this.scrollAnchorY, img.camera_zoom)
      .setOrigin(0.5, 0)
      .setScale(this.backgroundScale)
      .setDepth(DEPTH_CAMERA_ZOOM);

    this.cameraBtn = this.add
      .image(this.gameWidth / 2, this.gameHeight, img.camera_btn)
      .setOrigin(0.5, 1)
      .setScale(this.backgroundScale)
      .setDepth(DEPTH_CAMERA_BTN)
      .setInteractive({useHandCursor: true});

    this.cameraBtn.on("pointerdown", () => this.onCameraBtnClick());

    this.createViewfinderDebugZone();
  }

  /** Zona foto (rettangolo grande): celeste 30%. Disattiva con `SafariViewfinderConfig.SHOW_DEBUG_ZONE = false` */
  private createViewfinderDebugZone(): void {
    this.viewfinderDebugGfx?.destroy();
    this.viewfinderDebugGfx = null;

    if (!SafariViewfinderConfig.SHOW_DEBUG_ZONE) {
      return;
    }

    const {outer, inner} = getViewfinderRects(this.cameraZoom);
    const gfx = this.add.graphics().setDepth(DEPTH_VIEWFINDER_DEBUG);

    const cfg = SafariViewfinderConfig;

    gfx.fillStyle(cfg.DEBUG_ZONE_COLOR, cfg.DEBUG_ZONE_ALPHA);
    gfx.fillRect(outer.x, outer.y, outer.width, outer.height);

    gfx.lineStyle(2, 0xffffff, 0.55);
    gfx.strokeRect(inner.x, inner.y, inner.width, inner.height);

    this.viewfinderDebugGfx = gfx;
  }

  private setViewfinderDebugVisible(visible: boolean): void {
    this.viewfinderDebugGfx?.setVisible(visible);
  }

  private onCameraBtnClick(): void {
    if (this.isScrollPaused || this.isShowingPhotoResult) {
      return;
    }

    this.isScrollPaused = true;
    this.stopAnimalSpawnTimer();
    this.cameraBtn.disableInteractive();
    this.setViewfinderDebugVisible(false);

    const {outer} = getViewfinderRects(this.cameraZoom);
    const evaluation = evaluateShot(this.cardPool, outer);

    logShotEvaluation(evaluation);

    this.gameScene.audioManager.playAudio("cameraShot");

    const flash = this.playCameraFlash();
    const flashMs = SafariViewfinderConfig.SHUTTER_FLASH_MS;

    this.time.delayedCall(flashMs, () => {
      flash.destroy();
      this.isShowingPhotoResult = true;
      this.gameScene.audioManager.stopAudio("jeepSound");

      this.photoResultOverlay = new PhotoResultOverlay();
      this.photoResultOverlay.show({
        scene: this,
        gameWidth: this.gameWidth,
        gameHeight: this.gameHeight,
        cameraZoom: this.cameraZoom,
        evaluation,
        cameraScrollContainer: this.cameraScrollContainer,
        cardScrollContainer: this.cardScrollContainer,
        cardPool: this.cardPool,
        placement: getPhotoResultOverlayPlacement(
          this.cameraZoom,
          this.scrollAnchorY,
          this.backgroundScale,
          this.gameWidth,
          (min, max) => this.gameScene.setDynamicValueBasedOnScale(min, max),
        ),
        onDismiss: () => this.onPhotoResultDismissed(),
      });

      const resultSound = evaluation.success ? "ottimaFoto" : "fotoFallita";

      this.gameScene.audioManager.playAudioAfterSoundEnds(
        "cameraShot",
        resultSound,
        SafariViewfinderConfig.PHOTO_RESULT_SOUND_DELAY_MS,
        () => {
          if (evaluation.success) {
            this.gameScene.uiManager.updateScore(1);
            this.applySuccessScrollSpeedBoost();
          } else {
            this.gameScene.uiManager.updateLives();
          }
        },
      );
    });
  }

  /** Flash bianco a schermo intero prima dell’anteprima foto */
  private playCameraFlash(): Phaser.GameObjects.Rectangle {
    const flashAlpha = SafariViewfinderConfig.SHUTTER_FLASH_ALPHA;

    return this.add
      .rectangle(
        this.gameWidth / 2,
        this.gameHeight / 2,
        this.gameWidth,
        this.gameHeight,
        0xffffff,
        flashAlpha,
      )
      .setDepth(DEPTH_CAMERA_FLASH)
      .setScrollFactor(0);
  }

  private onPhotoResultDismissed(): void {
    this.photoResultOverlay?.destroy();
    this.photoResultOverlay = null;
    this.isShowingPhotoResult = false;
    this.isScrollPaused = false;
    this.setLiveGameplayVisible(true);
    this.cameraBtn.setInteractive({useHandCursor: true});
    this.setViewfinderDebugVisible(SafariViewfinderConfig.SHOW_DEBUG_ZONE);
    this.scheduleNextAnimalSpawn();

    if (!this.isGameOver) {
      this.gameScene.audioManager.playLoop("jeepSound");
    }
  }

  private setLiveGameplayVisible(visible: boolean): void {
    this.backgroundSky.setVisible(visible);
    this.backgroundTerrain.setVisible(visible);
    this.cameraScrollContainer.setVisible(visible);
    this.cardScrollContainer.setVisible(visible);
    this.cameraZoom.setVisible(visible);
    this.cameraBtn.setVisible(visible);
  }

  private applySuccessScrollSpeedBoost(): void {
    const ratio = SafariViewfinderConfig.SCROLL_SPEED_SUCCESS_INCREASE_RATIO;

    this.scrollSpeedMultiplier *= 1 + ratio;
  }

  private getCurrentScrollSpeed(): number {
    return this.isScrollPaused ? 0 : this.scrollSpeedInitial * this.scrollSpeedMultiplier;
  }

  update(_time: number, delta: number): void {
    if (!this.cameraScrollContainer || !this.cardScrollContainer || this.isShowingPhotoResult) {
      return;
    }

    const scrollSpeed = this.getCurrentScrollSpeed();

    this.cameraScrollOffset += scrollSpeed * (delta / 1000);

    const centerX = this.gameWidth / 2;

    this.cameraScrollContainer.x = centerX - (this.cameraScrollOffset % this.cameraSegmentWidth);
    this.updateCardPool(delta, scrollSpeed);
  }

  private updateCardPool(delta: number, scrollSpeed: number): void {
    const dx = scrollSpeed * (delta / 1000);
    const leftLimit = -this.gameWidth / 2;

    for (const card of this.cardPool) {
      if (!card.visible || !card.active) {
        continue;
      }

      card.x -= dx;

      if (card.x + card.displayWidth / 2 < leftLimit) {
        card.setVisible(false);
        card.setActive(false);
      }
    }
  }

  private getCameraTileKey(
    keys: readonly [string, string],
    tileIndex: number,
  ): (typeof keys)[number] {
    const len = keys.length;

    return keys[((tileIndex % len) + len) % len];
  }

  /** Scala uniforme (stesso fattore su X e Y) fino a coprire la larghezza schermo */
  private applyWidthCoverScale(image: Phaser.GameObjects.Image): number {
    const scale = this.gameWidth / image.width;

    image.setScale(scale);

    return scale;
  }

  //* Scopo: Controlla se non ci sono piu file disponibile e attiva il gameOver
  checkGameOver() {
    if (this.isGameOver) {
      console.log(`GAME OVER:`);

      this.canShoot = false;

      this.scene.pause();
      this.gameScene.gameOver(); // toglierlo da qui e metterlo in outro, una volta creato.
    }
  }
}
