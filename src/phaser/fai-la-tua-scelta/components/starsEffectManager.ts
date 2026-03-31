import {FaiLaTuaSceltaAssetConf} from "../shared/config/asset-conf.const";

const assetConf = FaiLaTuaSceltaAssetConf; //* Generalizzazione

export class StarsEffectManager {
  private scene: Phaser.Scene;
  private frameRate: number = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Avvia l'animazione delle stelle nella posizione del frutto
  starsEffectAnimation(fruit: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const {x, y} = fruit; // Prendi le coordinate del frutto

    const newAnimation = this.#createAnimation(
      assetConf.keyAnim.animStars,
      assetConf.spritesheet.starsEffect.key,
      19,
      x,
      y,
    );

    newAnimation.setVisible(true);
    newAnimation.setScale(0.5);
    newAnimation.play(assetConf.keyAnim.animStars);

    // Distrugge l'animazione dopo la durata dell'animazione stessa
    this.scene.time.delayedCall((19 / this.frameRate) * 1000, () => {
      newAnimation.destroy();
    });

    // metodo per creare testo +1 a caduta
    this.scene.time.delayedCall(500, () => {
      const text = this.scene.add.text(x, y, "+1", {
        fontFamily: "Paytone One",
        fontSize: "60px",
        color: "#ffffff",
        stroke: "#000", // imposta colore contorno
        strokeThickness: 2, // imposta spessore contorno
      });

      text.setOrigin(0.5);
      text.setDepth(3); // Depth maggiore per sovrapporlo

      // Effetto "caduta" leggera
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

  /**
   * Stelle sul centro del bounds del target (es. mano sasso/carta/forbice), non sul bordo — evita offset verso l’asse.
   * `band` sposta leggermente dal centro verso l’esterno della “faccia” vinta.
   */
  playStarsAboveWinner(
    display: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    pad = 0,
    band: "playerTop" | "enemyBottom" = "playerTop",
  ): void {
    const withScale = this.scene as {
      setDynamicValueBasedOnScale?: (min: number, max: number) => number;
    };
    const starScale = withScale.setDynamicValueBasedOnScale?.(1.85, 3.4) ?? 2.5;

    const b = display.getBounds();
    const x = b.centerX;
    let y = b.centerY;
    if (band === "playerTop") y -= pad;
    else y += pad;

    const cam = this.scene.cameras.main;
    const margin = 24;
    const starHalf = (assetConf.spritesheet.starsEffect.frameHeight / 2) * starScale;
    const minY = cam.worldView.y + margin + starHalf;
    const maxY = cam.worldView.bottom - margin - starHalf;
    let yClamped = y;
    if (yClamped < minY) yClamped = minY;
    if (yClamped > maxY) yClamped = maxY;

    const frameEnd = 19;
    const newAnimation = this.#createAnimation(
      assetConf.keyAnim.animStars,
      assetConf.spritesheet.starsEffect.key,
      frameEnd,
      x,
      yClamped,
    );

    newAnimation
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(true)
      .setScale(starScale)
      .play(assetConf.keyAnim.animStars);

    this.scene.time.delayedCall((frameEnd / this.frameRate) * 1000, () => {
      newAnimation.destroy();
    });
  }

  // Crea una nuova animazione nella scena alle coordinate date
  #createAnimation(animKey: string, spriteKey: string, frameEnd: number, x: number, y: number) {
    // Controlla se l'animazione esiste già, altrimenti la crea
    if (!this.scene.anims.exists(animKey)) {
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(spriteKey, {start: 0, end: frameEnd}),
        frameRate: this.frameRate,
        repeat: 0,
      });
    }

    // Crea una nuova istanza dell'animazione
    return this.scene.add
      .sprite(x, y, spriteKey)
      .setOrigin(0.5)
      .setVisible(false)
      .setScale(1)
      .setDepth(2);
  }
}
