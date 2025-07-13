import {BottleSortPuzzleAssetConf} from "../shared/config/asset-conf.const";

export class StarsEffectManager {
  private scene: Phaser.Scene;
  private frameRate: number = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Avvia l'animazione delle stelle nella posizione del frutto
   */
  starsEffectAnimation(fruit: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const {x, y} = fruit; // Prendi le coordinate del frutto

    const newAnimation = this.#createAnimation(
      BottleSortPuzzleAssetConf.keyAnim.animStars,
      BottleSortPuzzleAssetConf.spritesheet.starsEffect.key,
      19,
      x,
      y,
    );

    newAnimation.setVisible(true);
    newAnimation.setScale(0.5);
    newAnimation.play(BottleSortPuzzleAssetConf.keyAnim.animStars);

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
