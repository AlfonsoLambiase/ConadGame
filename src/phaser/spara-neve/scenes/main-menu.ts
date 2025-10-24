import * as Phaser from "phaser";

import {GameSparaNeveAssetConf} from "../shared/config/asset-conf.const";

const assetConf = GameSparaNeveAssetConf; //* Generalizzazione

export default class MainMenu extends Phaser.Scene {
  constructor() {
    super({key: assetConf.scene.mainMenu});
  }

  create(): void {
    console.log("Start MainMenu");

    //! Metodo fermarandosi in main-menu
    // // Dimensioni dello schermo
    // const sw = this.scale.width;
    // const sh = this.scale.height;
    // const centerX = sw / 2;
    // const centerY = sh / 2;

    // // Riproduzione musica
    // this.sound.play("music", {loop: true, delay: 2});

    // // Shader adattato allo schermo
    // // ✅ Controllo se il renderer è WebGL
    // if (this.sys.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
    //   this.add.shader("snowEffect", centerX, centerY, sw, sh);
    // } else {
    //   // ❄️ Fallback: immagine statica o particelle
    //   console.log("Non è webGL creare un immagine fissa");
    //   this.add.image(centerX, centerY, "snow").setDisplaySize(this.scale.width, this.scale.height);
    // }

    // // Intro snowball fight - posizioni iniziali fuori dallo schermo
    // const ball1 = this.add.image(-64, sh * 0.4, "snowball1");
    // const ball2 = this.add.image(sw + 64, sh * 0.45, "snowball1");
    // const ball3 = this.add.image(-64, sh * 0.42, "snowball1");
    // const logo = this.add.image(sw + 600, centerY, "title");

    // // Tween helper: sposta le immagini verso posizioni relative allo schermo
    // const createTween = (
    //   target: Phaser.GameObjects.GameObject,
    //   x: number,
    //   y: number,
    //   delay = 0,
    // ) => {
    //   this.tweens.add({
    //     targets: target,
    //     x,
    //     y,
    //     ease: "cubic.out",
    //     delay,
    //     duration: 600,
    //     onStart: () => {
    //       this.sound.play("throw");
    //     },
    //   });
    // };

    // // Nuove posizioni finali relative allo schermo
    // createTween(ball1, sw * 0.85, sh * 0.45);
    // createTween(ball2, sw * 0.15, sh * 0.35, 700);
    // createTween(ball3, sw * 0.85, sh * 0.48, 1200);
    // createTween(logo, centerX, centerY, 1800);

    // // Input tastiera
    // this.input.keyboard!.once("keydown-SPACE", () => {
    //   this.scene.start(assetConf.scene.mainGame);
    // });

    // // Input click/touch
    // this.input.once("pointerdown", () => {
    //   this.scene.start(assetConf.scene.mainGame);
    // });

    // //! Metodo senza fermarsi in main-menu
    this.sound.play("music", {loop: true, delay: 2});
    this.scene.start(assetConf.scene.mainGame);
  }
}
