import type {ShotEvaluation} from "./photo-shot.utils";
 
import * as Phaser from "phaser";
 
import {SafariAssetConf} from "../shared/config/asset-conf.const";
import {SafariViewfinderConfig} from "../shared/config/viewfinder.config";
 
import {buildPhotoComposite, mountPhotoCompositeForDisplay} from "./photo-composite.builder";
import {
  getPhotoResultDisplayLayout,
  getPhotoResultLabel,
  type PhotoResultOverlayPlacement,
} from "./photo-shot.utils";
 
const assetConf = SafariAssetConf;
 
const DEPTH_PHOTO_BACKDROP = 20;
const DEPTH_PHOTO_CAPTURE = 21;
const DEPTH_PHOTO_CORNICE = 22;
 
/** Tempo minimo (ms) prima di poter chiudere la foto col tocco */
const PHOTO_DISMISS_COOLDOWN_MS = 2000;
 
type PhotoResultOverlayOptions = {
  scene: Phaser.Scene;
  gameWidth: number;
  gameHeight: number;
  cameraZoom: Phaser.GameObjects.Image;
  evaluation: ShotEvaluation;
  cameraScrollContainer: Phaser.GameObjects.Container;
  cardScrollContainer: Phaser.GameObjects.Container;
  cardPool: Phaser.GameObjects.Image[];
  placement: PhotoResultOverlayPlacement;
  onDismiss: () => void;
};
 
type RevealTransform = {
  scale: number;
  angle: number;
};
 
export class PhotoResultOverlay {
  private readonly rootObjects: Phaser.GameObjects.GameObject[] = [];
  private dismissTimer: Phaser.Time.TimerEvent | null = null;
  private dismissed = false;
  private photoComposite: Phaser.GameObjects.Container | null = null;
  private photoMaskGfx: Phaser.GameObjects.Graphics | null = null;
  private revealContainer: Phaser.GameObjects.Container | null = null;
 
  show(options: PhotoResultOverlayOptions): void {
    const {
      scene,
      gameWidth,
      gameHeight,
      cameraZoom,
      evaluation,
      cameraScrollContainer,
      cardScrollContainer,
      cardPool,
      placement,
      onDismiss,
    } = options;
 
    const cfg = SafariViewfinderConfig;
    const {centerX, centerY, fitWidth, fitHeight} = placement;
 
    const layout = getPhotoResultDisplayLayout(cameraZoom, centerX, centerY, fitWidth, fitHeight);
    const {
      photoRect: photoResultRect,
      photoDisplayScale,
      photoDisplayX,
      photoDisplayY,
      corniceX,
      corniceY,
      corniceScale,
      corniceDisplayH,
      corniceDisplayW,
      resultTextY,
    } = layout;
    const captureW = Math.max(1, Math.ceil(photoResultRect.width));
    const captureH = Math.max(1, Math.ceil(photoResultRect.height));
 
    const compositeSource = buildPhotoComposite(
      scene,
      photoResultRect,
      cameraScrollContainer,
      cardScrollContainer,
      cardPool,
    );
 
    const backdrop = scene.add
      .rectangle(centerX, gameHeight / 2, gameWidth, gameHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH_PHOTO_BACKDROP)
      .setAlpha(0)
      .setInteractive();
 
    this.track(backdrop);
 
    scene.tweens.add({
      targets: backdrop,
      alpha: cfg.PHOTO_RESULT_BACKDROP_ALPHA,
      duration: cfg.PHOTO_RESULT_BACKDROP_FADE_MS,
      ease: "Quad.easeOut",
    });
 
    const photoLocalX = photoDisplayX - corniceX;
    const photoLocalY = photoDisplayY - corniceY;
 
    const mounted = mountPhotoCompositeForDisplay(
      scene,
      compositeSource,
      photoResultRect,
      photoDisplayX,
      photoDisplayY,
      photoDisplayScale,
      DEPTH_PHOTO_CAPTURE,
    );
 
    this.photoComposite = mounted.composite;
    this.photoMaskGfx = mounted.maskGfx;
    this.track(this.photoComposite);
    this.track(this.photoMaskGfx);
 
    const revealContainer = scene.add
      .container(corniceX, corniceY)
      .setScrollFactor(0)
      .setDepth(DEPTH_PHOTO_CORNICE);
 
    this.revealContainer = revealContainer;
    this.track(revealContainer);
 
    const cornice = scene.add
      .image(0, 0, assetConf.image.cornice)
      .setOrigin(0.5, 0.5)
      .setScale(corniceScale);
 
    revealContainer.add(cornice);
 
    const resultLabel = getPhotoResultLabel(evaluation.success);
    const resultColor = evaluation.success ? "#ed6e0b" : "#e53935";
    const resultText = scene.add
      .text(0, resultTextY - 8, resultLabel, {
        fontFamily: "Paytone One, Arial, sans-serif",
        fontSize: `${Math.max(22, Math.round(gameWidth * 0.045))}px`,
        color: resultColor,
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
 
    revealContainer.add(resultText);
 
    const revealState: RevealTransform = {scale: 0, angle: 0};
    const {finalAngle, startAngle} = this.getRevealAngles();
 
    revealState.angle = startAngle;
    this.applyRevealTransform(
      revealContainer,
      this.photoComposite,
      this.photoMaskGfx,
      corniceX,
      corniceY,
      photoLocalX,
      photoLocalY,
      photoDisplayScale,
      revealState.scale,
      revealState.angle,
    );
 
    scene.tweens.add({
      targets: revealState,
      scale: 1,
      angle: finalAngle,
      duration: cfg.PHOTO_RESULT_REVEAL_MS,
      ease: "Back.easeOut",
      onUpdate: () => {
        if (!this.photoComposite || !this.photoMaskGfx || !this.revealContainer) {
          return;
        }
 
        this.applyRevealTransform(
          this.revealContainer,
          this.photoComposite,
          this.photoMaskGfx,
          corniceX,
          corniceY,
          photoLocalX,
          photoLocalY,
          photoDisplayScale,
          revealState.scale,
          revealState.angle,
        );
      },
    });
 
    scene.tweens.add({
      targets: resultText,
      alpha: 1,
      y: resultTextY,
      duration: cfg.PHOTO_RESULT_REVEAL_MS * 0.55,
      delay: cfg.PHOTO_RESULT_REVEAL_MS * 0.45,
      ease: "Quad.easeOut",
    });
 
    const shownAt = scene.time.now;
 
    const dismiss = (viaUser = false) => {
      if (this.dismissed) {
        return;
      }
 
      if (viaUser && scene.time.now - shownAt < PHOTO_DISMISS_COOLDOWN_MS) {
        return;
      }
 
      this.dismissed = true;
      this.dismissTimer?.remove(false);
      this.destroy();
      onDismiss();
    };
 
    const dismissByUser = () => dismiss(true);
 
    backdrop.on("pointerdown", dismissByUser);
    cornice.setInteractive();
    cornice.on("pointerdown", dismissByUser);
    revealContainer.setSize(corniceDisplayW, corniceDisplayH);
    revealContainer.setInteractive(
      new Phaser.Geom.Rectangle(
        -corniceDisplayW / 2,
        -corniceDisplayH / 2,
        corniceDisplayW,
        corniceDisplayH,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    revealContainer.on("pointerdown", dismissByUser);
    this.photoComposite.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, captureW, captureH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.photoComposite.on("pointerdown", dismissByUser);
 
    this.dismissTimer = scene.time.delayedCall(cfg.PHOTO_RESULT_MAX_MS, () => dismiss(false));
  }
 
  private getRevealAngles(): {finalAngle: number; startAngle: number} {
    const cfg = SafariViewfinderConfig;
    const finalAngle = Phaser.Math.Between(
      cfg.PHOTO_RESULT_REVEAL_ANGLE_MIN,
      cfg.PHOTO_RESULT_REVEAL_ANGLE_MAX,
    );
    const spinDir = Phaser.Math.RND.sign();
    const startAngle = finalAngle + spinDir * cfg.PHOTO_RESULT_REVEAL_SPIN_EXTRA_DEG;
 
    return {finalAngle, startAngle};
  }
 
  /** Foto/mask restano a livello scena (mask ok); cornice nel container — stesso pivot e rotazione */
  private applyRevealTransform(
    revealContainer: Phaser.GameObjects.Container,
    photoComposite: Phaser.GameObjects.Container,
    maskGfx: Phaser.GameObjects.Graphics,
    pivotX: number,
    pivotY: number,
    photoLocalX: number,
    photoLocalY: number,
    photoDisplayScale: number,
    revealScale: number,
    angleDeg: number,
  ): void {
    revealContainer.setPosition(pivotX, pivotY).setScale(revealScale).setAngle(angleDeg);
 
    const rad = Phaser.Math.DegToRad(angleDeg);
    const sx = photoLocalX * revealScale;
    const sy = photoLocalY * revealScale;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const worldX = pivotX + sx * cos - sy * sin;
    const worldY = pivotY + sx * sin + sy * cos;
 
    photoComposite
      .setPosition(worldX, worldY)
      .setScale(photoDisplayScale * revealScale)
      .setAngle(angleDeg);
    maskGfx.setPosition(worldX, worldY).setScale(revealScale).setAngle(angleDeg);
  }
 
  private track(obj: Phaser.GameObjects.GameObject): void {
    this.rootObjects.push(obj);
  }
 
  destroy(): void {
    this.dismissTimer?.remove(false);
    this.dismissTimer = null;
 
    for (const obj of this.rootObjects) {
      obj.destroy();
    }
 
    this.rootObjects.length = 0;
    this.photoComposite = null;
    this.photoMaskGfx = null;
    this.revealContainer = null;
  }
}
 
 