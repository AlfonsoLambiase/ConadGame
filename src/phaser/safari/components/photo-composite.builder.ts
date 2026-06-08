import * as Phaser from "phaser";

export type MountedPhotoComposite = {
  composite: Phaser.GameObjects.Container;
  maskGfx: Phaser.GameObjects.Graphics;
};

function rectsOverlap(a: Phaser.Geom.Rectangle, b: Phaser.Geom.Rectangle): boolean {
  return Phaser.Geom.Rectangle.Overlaps(a, b);
}

function cloneImageIntoComposite(
  scene: Phaser.Scene,
  composite: Phaser.GameObjects.Container,
  source: Phaser.GameObjects.Image,
  outerRect: Phaser.Geom.Rectangle,
): void {
  const bounds = source.getBounds();

  if (!rectsOverlap(bounds, outerRect)) {
    return;
  }

  const clone = scene.add
    .image(bounds.centerX - outerRect.x, bounds.y - outerRect.y, source.texture.key)
    .setOrigin(0.5, 0)
    .setFlipX(source.flipX)
    .setFlipY(source.flipY);

  clone.setDisplaySize(bounds.width, bounds.height);

  composite.add(clone);
}

/**
 * Ricostruisce la porzione di scena dentro `outerRect` clonando bg camera e card.
 * Va chiamato mentre i layer di gioco sono ancora visibili.
 */
export function buildPhotoComposite(
  scene: Phaser.Scene,
  outerRect: Phaser.Geom.Rectangle,
  cameraScrollContainer: Phaser.GameObjects.Container,
  cardScrollContainer: Phaser.GameObjects.Container,
  cardPool: Phaser.GameObjects.Image[],
): Phaser.GameObjects.Container {
  const composite = scene.add.container(0, 0);

  for (const child of cameraScrollContainer.list) {
    if (child instanceof Phaser.GameObjects.Image) {
      cloneImageIntoComposite(scene, composite, child, outerRect);
    }
  }

  for (const card of cardPool) {
    if (!card.visible || !card.active) {
      continue;
    }

    cloneImageIntoComposite(scene, composite, card, outerRect);
  }

  return composite;
}

export function mountPhotoCompositeForDisplay(
  scene: Phaser.Scene,
  composite: Phaser.GameObjects.Container,
  outerRect: Phaser.Geom.Rectangle,
  displayX: number,
  displayY: number,
  displayScale: number,
  depth: number,
  parent?: Phaser.GameObjects.Container,
): MountedPhotoComposite {
  const captureW = Math.max(1, outerRect.width);
  const captureH = Math.max(1, outerRect.height);
  const displayW = captureW * displayScale;
  const displayH = captureH * displayScale;

  composite.setPosition(displayX, displayY);
  composite.setScale(displayScale);
  composite.setScrollFactor(0);

  const maskGfx = scene.add.graphics();

  maskGfx.setPosition(displayX, displayY);
  maskGfx.fillStyle(0xffffff, 1);
  maskGfx.fillRect(0, 0, displayW, displayH);
  maskGfx.setVisible(false);
  maskGfx.setScrollFactor(0);

  const mask = maskGfx.createGeometryMask();

  composite.setMask(mask);

  if (parent) {
    parent.add([maskGfx, composite]);
    parent.setDepth(depth);
  } else {
    composite.setDepth(depth);
    maskGfx.setDepth(depth - 0.1);
    scene.add.existing(composite);
    scene.add.existing(maskGfx);
  }

  return {composite, maskGfx};
}
