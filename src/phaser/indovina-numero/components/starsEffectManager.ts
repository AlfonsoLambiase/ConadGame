import {IndovinaNumeroAssetConf} from "../shared/config/asset-conf.const";

const assetConf = IndovinaNumeroAssetConf; //* Generalizzazione

const STARS_EFFECT_FRAME_END = 19;
const STARS_EFFECT_FRAME_RATE = 20;

export class StarsEffectManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getBurstDurationMs(): number {
    return ((STARS_EFFECT_FRAME_END + 1) / STARS_EFFECT_FRAME_RATE) * 1000;
  }

  playGlowBurst(
    x: number,
    y: number,
    scale = 0.5,
    parent?: Phaser.GameObjects.Container,
    insertIndex = 0,
    onComplete?: () => void,
  ): void {
    const burst = this.#spawnStarsBurst(x, y, scale, parent ? 0 : 9);

    if (parent) {
      parent.addAt(burst, insertIndex);
    }

    this.scene.time.delayedCall(this.getBurstDurationMs(), () => {
      burst.parentContainer?.remove(burst, false);
      burst.destroy();
      onComplete?.();
    });
  }

  starsEffectAnimation(fruit: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const {x, y} = fruit;
    const burst = this.#spawnStarsBurst(x, y, 0.5, 2);

    this.scene.time.delayedCall(this.getBurstDurationMs(), () => {
      burst.destroy();
    });

    this.scene.time.delayedCall(500, () => {
      const text = this.scene.add.text(x, y, "+1", {
        fontFamily: "Paytone One",
        fontSize: "60px",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 2,
      });

      text.setOrigin(0.5);
      text.setDepth(3);

      this.scene.tweens.add({
        targets: text,
        y: y + 40,
        alpha: 0,
        duration: 1000,
        ease: "Sine.easeIn",
        onComplete: () => {
          text.destroy();
        },
      });
    });
  }

  #spawnStarsBurst(x: number, y: number, scale: number, depth: number): Phaser.GameObjects.Sprite {
    const burst = this.#createAnimation(
      assetConf.keyAnim.animStars,
      assetConf.spritesheet.starsEffect.key,
      STARS_EFFECT_FRAME_END,
      x,
      y,
    );

    burst
      .setVisible(true)
      .setScale(scale)
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(assetConf.keyAnim.animStars);

    return burst;
  }

  #createAnimation(animKey: string, spriteKey: string, frameEnd: number, x: number, y: number) {
    if (!this.scene.anims.exists(animKey)) {
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(spriteKey, {start: 0, end: frameEnd}),
        frameRate: STARS_EFFECT_FRAME_RATE,
        repeat: 0,
      });
    }

    return this.scene.add
      .sprite(x, y, spriteKey)
      .setOrigin(0.5)
      .setVisible(false)
      .setScale(1)
      .setDepth(2);
  }
}
