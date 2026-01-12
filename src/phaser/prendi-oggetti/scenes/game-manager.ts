/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {PrendiOggettiAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = PrendiOggettiAssetConf; //* Generalizzazione

interface GameObjectWithGood extends Phaser.GameObjects.Image {
  isGood: boolean;
}
export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;

  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  // NUOVO: Variabile per scegliere il metodo di spawn
  private useNewSpawnMethod: boolean = true; //! Cambiare metodo tra quello vecchio e quello nuovo.

  private windowsOffset = {x: 0, y: 0};
  private windowsSpacing = {x: 30, y: 30};

  private houseContainer!: Phaser.GameObjects.Container;
  private houseImage!: Phaser.GameObjects.Image;
  private windowsSprites: Phaser.GameObjects.Sprite[] = [];

  private sky!: Phaser.GameObjects.Image;
  private snow!: Phaser.GameObjects.Image;

  private windowsBusy: boolean[] = [];

  private windowColliders: Phaser.GameObjects.Zone[] = [];

  private goodObjects: string[] = ["obj0", "obj1"];
  private badObjects: string[] = ["enemy0"];
  private activeObjects: Map<number, Phaser.GameObjects.Image> = new Map();
  private objectOffsets = {x: 0, y: -80}; // Offset dal centro finestra
  private objectScale = 1.0; // Scala degli oggetti
  private windowOpenDelay = 0; // Delay apertura finestra in millisecondi
  private windowTimers: Map<number, Phaser.Time.TimerEvent> = new Map(); // Timer per chiusura automatica

  private objectSpawnDelay = 150; // ms

  private windowScheduler!: Phaser.Time.TimerEvent;

  // Config gameplay metodo OLD
  private maxOpenWindows = 4; // quante finestre insieme
  private windowCheckInterval = 700;

  // Config gameplay metodo NEW
  private newMethodWindowOpenTime = 4000; // durata finestre aperte (4-6 secondi random)
  private newMethodAllWindowsTimer!: Phaser.Time.TimerEvent;

  private badObjectsOnlyTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  //* Scopo: Inizializza la scena con dati passati dalla scena chiamante
  init(data: {gameScene?: Game; useNewSpawnMethod?: boolean}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }

    // NUOVO: Imposta il metodo di spawn (default: false = metodo vecchio)
    if (data.useNewSpawnMethod !== undefined) {
      this.useNewSpawnMethod = data.useNewSpawnMethod;
    }
  }

  //* Scopo: Crea e configura tutti gli elementi della scena
  create() {
    this.computeLayoutDimensions();

    this.createSky();
    this.setWindowsOffset(0, this.gameScene.setDynamicValueBasedOnScale(40, 120));
    this.objectScale = this.gameScene.setDynamicValueBasedOnScale(0.5, 1.55);
    this.setObjectOffsets(
      this.gameScene.setDynamicValueBasedOnScale(3, 7),
      this.gameScene.setDynamicValueBasedOnScale(40, 100),
    );
    this.windowsBusy = new Array(9).fill(false);
    this.createWindowAnimations();
    this.createHouseContainer();
    this.createSnow();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });

    // NUOVO: Avvia il metodo di spawn appropriato
    if (this.useNewSpawnMethod) {
      this.startNewSpawnMethod();
    } else {
      this.startWindowScheduler();
    }
  }

  //* Scopo: Metodo di spawn nuovo - apre tutte le finestre insieme
  private startNewSpawnMethod(): void {
    if (this.isGameOver) return;

    // Cancella eventuale timer precedente
    if (this.newMethodAllWindowsTimer) {
      this.newMethodAllWindowsTimer.remove();
    }

    // Numero finestre da aprire (4–6)
    const windowsToOpen = Phaser.Math.Between(4, 6);

    // Durata finestre aperte
    const stayOpenDuration = Phaser.Math.Between(4000, 6000);

    // Indici disponibili
    const availableIndexes = this.windowsBusy
      .map((busy, index) => (!busy ? index : -1))
      .filter((i) => i !== -1);

    Phaser.Utils.Array.Shuffle(availableIndexes);

    // Apri finestre
    for (let i = 0; i < Math.min(windowsToOpen, availableIndexes.length); i++) {
      this.openWindowAnimationNewMethod(availableIndexes[i], stayOpenDuration);
    }

    // Timer di sicurezza: se qualcosa resta aperto troppo a lungo
    this.newMethodAllWindowsTimer = this.time.delayedCall(stayOpenDuration + 200, () => {
      this.forceCheckNewCycle();
    });

    // 🔴 NUOVO: Avvia controllo oggetti cattivi dopo che tutte le animazioni sono complete
    this.time.delayedCall(this.windowOpenDelay + this.objectSpawnDelay + 1000, () => {
      this.startBadObjectsOnlyCheck();
    });
  }

  //* NUOVO: Avvia il controllo periodico per oggetti cattivi
  private startBadObjectsOnlyCheck(): void {
    if (!this.useNewSpawnMethod || this.isGameOver) return;

    // Controlla ogni 200ms se ci sono solo oggetti cattivi
    const checkInterval = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (this.isGameOver) {
          checkInterval.remove();

          return;
        }

        let hasGoodObjects = false;
        let hasBadObjects = false;
        let totalActiveObjects = 0;

        this.activeObjects.forEach((obj) => {
          if (obj.active) {
            totalActiveObjects++;
            if ((obj as GameObjectWithGood).isGood) {
              hasGoodObjects = true;
            } else {
              hasBadObjects = true;
            }
          }
        });

        // Se ci sono solo oggetti cattivi (nessun oggetto buono ma almeno un cattivo)
        if (!hasGoodObjects && hasBadObjects && totalActiveObjects > 0) {
          // Ferma il controllo
          checkInterval.remove();

          // Aspetta 1 secondo e poi chiudi tutte le finestre
          this.time.delayedCall(1000, () => {
            this.closeAllOpenWindows();
          });
        }

        // Se non ci sono più finestre aperte, ferma il controllo
        const openWindows = this.windowsBusy.filter((b) => b).length;

        if (openWindows === 0) {
          checkInterval.remove();
        }
      },
    });
  }

  //* NUOVO: Chiusura finestra con nuovo metodo - controlla oggetti rimasti
  private closeWindowAnimationNewMethod(index: number): void {
    const win = this.windowsSprites[index];
    const collider = this.windowColliders[index];
    const obj = this.activeObjects.get(index);

    if (!win || !collider) return;
    if (!this.windowsBusy[index]) return;

    // Penalità se oggetto buono non cliccato
    if (obj && obj.active && (obj as GameObjectWithGood).isGood) {
      this.badObjectEffectAnimation(obj);
      this.gameScene.uiManager.updateLives();
      this.gameScene.audioManager.playAudio(assetConf.audio.bad_obj);
    }

    this.gameScene.audioManager.playAudio(assetConf.audio.open_close_window);

    // Cancella timer finestra
    const timer = this.windowTimers.get(index);

    if (timer) {
      timer.remove();
      this.windowTimers.delete(index);
    }

    this.closeObjectInWindow(index);

    win.removeAllListeners();
    win.setDepth(10);

    const totalFrames = 40;
    let halfFrameReached = false;

    win.play("window_close");

    win.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_: any, frame: any) => {
      if (!halfFrameReached && frame.index <= totalFrames / 2) {
        collider.setInteractive();
        halfFrameReached = true;
      }
    });

    win.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      win.setDepth(5);
      this.removeObjectFromWindow(index);
      this.windowsBusy[index] = false;

      // CHECK IMMEDIATO: se tutte chiuse → nuovo ciclo
      this.forceCheckNewCycle();
    });
  }

  //* Scopo: Genera un oggetto buono o cattivo nella finestra specificata con animazione di apparizione
  private spawnObjectInWindow(windowIndex: number): void {
    const win = this.windowsSprites[windowIndex];

    if (!win) return;

    // Scegli random tra buoni e cattivi
    const isGood = Math.random() > 0.3; // 70% oggetti buoni
    const objectKey = isGood
      ? this.goodObjects[Math.floor(Math.random() * this.goodObjects.length)]
      : this.badObjects[Math.floor(Math.random() * this.badObjects.length)];

    // Calcola posizione mondiale della finestra
    const worldPos = this.houseContainer.getWorldTransformMatrix();
    const objX = worldPos.tx + win.x + this.objectOffsets.x;
    const objY = worldPos.ty + win.y + this.objectOffsets.y;

    // Crea oggetto con scala configurabile e depth SOTTO la finestra
    const obj = this.add
      .image(objX, objY, objectKey)
      .setOrigin(0.5, 1.0)
      .setScale(0)
      .setDepth(3) // SOTTO la finestra (finestra = 5)
      .setInteractive();

    // Store se è buono o cattivo sull'oggetto per riferimento futuro
    (obj as GameObjectWithGood).isGood = isGood;

    // Animazione scale: 0 -> 1.2 -> scala finale in ~1 secondo
    const targetScale = this.objectScale;

    this.tweens.add({
      targets: obj,
      scale: targetScale * 1.2,
      duration: 500,
      ease: "Back.eOut",
      onComplete: () => {
        this.tweens.add({
          targets: obj,
          scale: targetScale,
          duration: 500,
          ease: "Sine.eInOut",
          onComplete: () => {
            // Quando raggiunge scala finale (1.0), passa SOPRA la finestra
            obj.setDepth(7);
          },
        });
      },
    });

    // Click handler
    obj.on("pointerdown", () => {
      if (isGood) {
        //console.log("GOOD!");
        this.starsEffectAnimation(obj);
        this.gameScene.uiManager.updateScore(1);
        this.gameScene.audioManager.playAudio(assetConf.audio.good_obj);
      } else {
        //console.log("BAD!");
        this.badObjectEffectAnimation(obj);
        this.gameScene.uiManager.updateLives();
        this.gameScene.audioManager.playAudio(assetConf.audio.bad_obj);
      }
      // Rimuovi oggetto al click e chiudi finestra
      this.removeObjectFromWindow(windowIndex);

      // NUOVO: Chiama il metodo appropriato in base al sistema attivo
      if (this.useNewSpawnMethod) {
        this.closeWindowAnimationNewMethod(windowIndex);
      } else {
        this.closeWindowAnimation(windowIndex);
      }
    });

    // Salva riferimento
    this.activeObjects.set(windowIndex, obj);

    // Se è enemy, attiva animazione flash rosso
    if (!isGood && objectKey === "enemy0") {
      this.startEnemyFlash(obj);
    }
  }

  //* NUOVO: Chiude tutte le finestre aperte
  private closeAllOpenWindows(): void {
    if (this.isGameOver) return;

    for (let i = 0; i < this.windowsBusy.length; i++) {
      if (this.windowsBusy[i]) {
        this.closeWindowAnimationNewMethod(i);
      }
    }
  }

  //* NUOVO: Apertura finestra con nuovo metodo
  private openWindowAnimationNewMethod(index: number, stayOpenDuration: number): void {
    const win = this.windowsSprites[index];
    const collider = this.windowColliders[index];

    if (!win || !collider) return;
    if (this.windowsBusy[index]) return;

    this.gameScene.audioManager.playAudio(assetConf.audio.open_close_window);

    this.windowsBusy[index] = true;

    // Delay prima di aprire la finestra
    this.time.delayedCall(this.windowOpenDelay, () => {
      // spawn oggetto leggermente dopo
      this.time.delayedCall(this.objectSpawnDelay, () => {
        this.spawnObjectInWindow(index);
      });

      // Colliders inizialmente attivi → disattiva quando apertura al 50%
      const totalFrames = 40;
      let halfFrameReached = false;

      // Animazione apertura
      win.play("window_open");

      // Event listener per disattivare collider al 50%
      win.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim: any, frame: any) => {
        if (!halfFrameReached && frame.index >= totalFrames / 2) {
          collider.disableInteractive();
          halfFrameReached = true;
        }
      });

      win.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // Salva il timer per chiusura automatica dopo stayOpenDuration
        const closeTimer = this.time.delayedCall(stayOpenDuration, () => {
          this.windowTimers.delete(index);
          this.closeWindowAnimationNewMethod(index);
        });

        this.windowTimers.set(index, closeTimer);
      });
    });
  }

  private forceCheckNewCycle(): void {
    if (this.isGameOver) return;

    const openWindows = this.windowsBusy.filter((b) => b).length;

    if (openWindows === 0) {
      this.startNewSpawnMethod();
    }
  }

  //* Scopo: Inizia apertura automatica delle finestre (METODO VECCHIO)
  private startWindowScheduler(): void {
    if (this.windowScheduler) {
      this.windowScheduler.remove();
    }

    this.windowScheduler = this.time.addEvent({
      delay: this.windowCheckInterval,
      loop: true,
      callback: () => {
        this.tryOpenRandomWindows();
      },
    });
  }

  //* Scopo: Quantita di finestre che si posso aprire allo stesso tempo (METODO VECCHIO)
  private tryOpenRandomWindows(): void {
    if (this.isGameOver) return;

    const openCount = this.windowsBusy.filter((b) => b).length;

    if (openCount >= this.maxOpenWindows) return;

    const availableIndexes: number[] = [];

    for (let i = 0; i < this.windowsBusy.length; i++) {
      if (!this.windowsBusy[i]) {
        availableIndexes.push(i);
      }
    }

    if (availableIndexes.length === 0) return;

    // Quante aprire ora (1 o più)
    const slotsAvailable = this.maxOpenWindows - openCount;
    const toOpen = Phaser.Math.Between(1, slotsAvailable);

    Phaser.Utils.Array.Shuffle(availableIndexes);

    for (let i = 0; i < toOpen; i++) {
      const idx = availableIndexes[i];

      this.openWindowAnimation(idx);
    }
  }

  //* Scopo: Crea l'immagine del cielo che copre tutto lo schermo
  private createSky(): void {
    this.sky = this.add
      .image(this.gameWidth / 2, this.gameHeight / 2, "sky")
      .setOrigin(0.5)
      .setDepth(-1);

    // Stretch completo
    this.sky.displayWidth = this.gameWidth;
    this.sky.displayHeight = this.gameHeight;
  }

  //* Scopo: Crea il container della casa e lo scala proporzionalmente allo schermo
  private createHouseContainer(): void {
    this.houseContainer = this.add.container(this.gameWidth / 2, this.gameHeight / 2);

    // House
    this.houseImage = this.add.image(0, 0, "house").setOrigin(0.5);
    this.houseContainer.add(this.houseImage);

    // Scala house proporzionale in base allo schermo (solo X, y segue)
    const scaleX = this.gameWidth / this.houseImage.width;

    this.houseImage.setScale(scaleX);

    // Finestre
    this.createWindows();
  }

  //* Scopo: Crea le 9 finestre con sprite animati e collider interattivi
  private createWindows(): void {
    const cols = 3;
    const rows = 3;

    const frameWidth = 288;
    const frameHeight = 270;

    const scale = this.houseImage.scale * this.gameScene.setDynamicValueBasedOnScale(1.0, 1.05);

    const spacingX = frameWidth * scale + this.windowsSpacing.x;
    const spacingY = frameHeight * scale + this.windowsSpacing.y;

    const centerIndex = 4;

    for (let i = 0; i < 9; i++) {
      const sprite = this.add.sprite(0, 0, "animWindow", 0).setOrigin(0.5);

      sprite.setDepth(5); // Depth base finestra
      sprite.setScale(scale);

      this.windowsSprites.push(sprite);
      this.houseContainer.add(sprite);

      // Posizione
      const col = i % cols;
      const row = Math.floor(i / cols);
      const centerCol = centerIndex % cols;
      const centerRow = Math.floor(centerIndex / cols);

      sprite.x = (col - centerCol) * spacingX + this.windowsOffset.x;
      sprite.y = (row - centerRow) * spacingY + this.windowsOffset.y;

      // Collider invisibile
      const zone = this.add
        .zone(sprite.x, sprite.y, frameWidth * scale, frameHeight * scale)
        .setOrigin(0.5)
        .setInteractive();

      // Aggiungi corpo Arcade per debug
      this.physics.add.existing(zone);
      (zone.body as Phaser.Physics.Arcade.Body).setImmovable(true); // blocca il collider

      zone.on("pointerdown", () => {
        //console.log(`window close ${i + 1}`);
      });

      this.windowColliders.push(zone);
      this.houseContainer.add(zone);
    }
  }

  //* Scopo: Gestisce l'animazione di apertura e chiusura di una finestra con delay configurabile (METODO VECCHIO)
  private openWindowAnimation(index: number): void {
    const win = this.windowsSprites[index];
    const collider = this.windowColliders[index];

    if (!win || !collider) return;
    if (this.windowsBusy[index]) return;

    this.gameScene.audioManager.playAudio(assetConf.audio.open_close_window);

    this.windowsBusy[index] = true;

    // Delay prima di aprire la finestra
    this.time.delayedCall(this.windowOpenDelay, () => {
      // spawn oggetto leggermente dopo
      this.time.delayedCall(this.objectSpawnDelay, () => {
        this.spawnObjectInWindow(index);
      });

      // Colliders inizialmente attivi → disattiva quando apertura al 50%
      const totalFrames = 40;
      let halfFrameReached = false;

      // Animazione apertura
      win.play("window_open");

      // Event listener per disattivare collider al 50%
      win.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim: any, frame: any) => {
        if (!halfFrameReached && frame.index >= totalFrames / 2) {
          collider.disableInteractive();
          halfFrameReached = true;
        }
      });

      win.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // Genera un tempo random tra 500 e 2000 ms
        const randomCloseTime = Phaser.Math.Between(500, 2000);
        // Dopo X secondi finestra aperta, salva il timer per poterlo cancellare
        const closeTimer = this.time.delayedCall(randomCloseTime, () => {
          this.windowTimers.delete(index);
          this.closeWindowAnimation(index);
        });

        // Salva il riferimento al timer
        this.windowTimers.set(index, closeTimer);
      });
    });
  }

  //* Scopo: Gestisce l'animazione di chiusura della finestra e riporta depth sopra oggetto (METODO VECCHIO)
  private closeWindowAnimation(index: number): void {
    const win = this.windowsSprites[index];
    const collider = this.windowColliders[index];

    if (!win || !collider) return;

    // Se la finestra non è busy, non fare nulla (già chiusa)
    if (!this.windowsBusy[index]) return;

    this.gameScene.audioManager.playAudio(assetConf.audio.open_close_window);

    // Cancella il timer di chiusura automatica se esiste
    const timer = this.windowTimers.get(index);

    if (timer) {
      timer.remove();
      this.windowTimers.delete(index);
    }

    this.closeObjectInWindow(index);

    // Finestra deve essere SOPRA l'oggetto durante chiusura
    win.setDepth(10);

    const totalFrames = 40;
    let halfFrameReached = false;

    // Animazione chiusura
    win.play("window_close");

    win.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim: any, frame: any) => {
      if (!halfFrameReached && frame.index <= totalFrames / 2) {
        collider.setInteractive();
        halfFrameReached = true;
      }
    });

    win.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      // Ripristina depth normale finestra
      win.setDepth(5);
      this.removeObjectFromWindow(index);
      this.windowsBusy[index] = false;

      // forza una nuova apertura immediata
      this.time.delayedCall(100, () => {
        this.tryOpenRandomWindows();
      });
    });
  }

  private closeObjectInWindow(windowIndex: number): void {
    const obj = this.activeObjects.get(windowIndex);

    if (!obj) return;

    this.tweens.killTweensOf(obj);

    this.tweens.add({
      targets: obj,
      scale: 0,
      duration: 350,
      ease: "Back.easeIn",
      onComplete: () => {
        obj.destroy();
        this.activeObjects.delete(windowIndex);
      },
    });
  }

  //* Scopo: Rimuove e distrugge l'oggetto dalla finestra specificata
  private removeObjectFromWindow(windowIndex: number): void {
    const obj = this.activeObjects.get(windowIndex);

    if (obj) {
      // Stop eventuali tween/timer attivi
      this.tweens.killTweensOf(obj);
      obj.destroy();
      this.activeObjects.delete(windowIndex);
    }
  }

  //* Scopo: Attiva l'animazione di flash rosso per i nemici alternando le texture
  private startEnemyFlash(enemy: Phaser.GameObjects.Image): void {
    // Alterna tra enemy0 e enemy0_red ogni 200ms
    this.time.addEvent({
      delay: 200,
      callback: () => {
        if (!enemy.active) return; // Stop se oggetto distrutto

        const currentTexture = enemy.texture.key;

        if (currentTexture === "enemy0") {
          enemy.setTexture("enemy0_red");
        } else {
          enemy.setTexture("enemy0");
        }
      },
      loop: true,
    });
  }

  //* Scopo: Crea l'immagine della neve in basso allo schermo
  private createSnow(): void {
    this.snow = this.add
      .image(this.gameWidth / 2, this.gameHeight, "snow")
      .setOrigin(0.5, 1)
      .setDepth(9999); // sopra tutto

    // Scala snow come sky: scala X e Y identici
    const scaleX = this.gameWidth / this.snow.width;

    this.snow.setScale(scaleX, scaleX * this.gameScene.setDynamicValueBasedOnScale(1.0, 1.59));
  }

  //* Scopo: Calcola le dimensioni del layout in base alle configurazioni di gioco
  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);
  }

  //* Scopo: Imposta l'offset delle finestre rispetto al centro della casa
  public setWindowsOffset(x: number, y: number): void {
    this.windowsOffset.x = x;
    this.windowsOffset.y = y;
    this.updateWindowsPositions();
  }

  //* Scopo: Imposta l'offset degli oggetti rispetto al centro delle finestre
  public setObjectOffsets(x: number, y: number): void {
    this.objectOffsets.x = x;
    this.objectOffsets.y = y;
  }

  //* Scopo: Imposta la scala degli oggetti che appaiono nelle finestre
  public setObjectScale(scale: number): void {
    this.objectScale = scale;
  }

  //* Scopo: Imposta il delay in millisecondi prima dell'apertura della finestra
  public setWindowOpenDelay(delay: number): void {
    this.windowOpenDelay = delay;
  }

  //* Scopo: Aggiorna la posizione di tutte le finestre in base agli offset correnti
  private updateWindowsPositions(): void {
    if (!this.windowsSprites || this.windowsSprites.length === 0) return;

    const cols = 3;
    const rows = 3;
    const centerIndex = 4;

    const frameWidth = 288;
    const frameHeight = 270;

    const scale = this.houseImage.scale;

    const spacingX = frameWidth * scale + this.windowsSpacing.x;
    const spacingY = frameHeight * scale + this.windowsSpacing.y;

    const centerCol = centerIndex % cols;
    const centerRow = Math.floor(centerIndex / cols);

    for (let i = 0; i < this.windowsSprites.length; i++) {
      const sprite = this.windowsSprites[i];

      const col = i % cols;
      const row = Math.floor(i / cols);

      const dx = (col - centerCol) * spacingX + this.windowsOffset.x;
      const dy = (row - centerRow) * spacingY + this.windowsOffset.y;

      sprite.x = dx;
      sprite.y = dy;
    }
  }

  //* Scopo: Crea le animazioni di apertura e chiusura delle finestre
  private createWindowAnimations(): void {
    // Apertura
    this.anims.create({
      key: "window_open",
      frames: this.anims.generateFrameNumbers("animWindow", {
        start: 0,
        end: 40,
      }),
      frameRate: 60,
      repeat: 0,
    });

    // Chiusura
    this.anims.create({
      key: "window_close",
      frames: this.anims.generateFrameNumbers("animWindow", {
        start: 40,
        end: 0,
      }),
      frameRate: 60,
      repeat: 0,
    });
  }

  //* Scopo: Animazione coriandoli a fine partita
  startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    const spriteLeft = this.add
      .sprite(0, config.height / 2, assetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    const spriteRight = this.add
      .sprite(config.width, config.height / 2, assetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    this.anims.create({
      key: "animConfettiRight",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_right.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteRight.play("animConfettiRight");
  }

  //* Scopo: Controlla se il gioco è finito e gestisce il game over
  checkGameOver() {
    if (this.isGameOver) {
      this.canShoot = false;

      this.scene.pause();
      this.gameScene.gameOver();
    }
  }

  //* Scopo: Mette in pausa il gioco fermando lo scheduler e le animazioni
  public pauseGame(): void {
    if (this.windowScheduler) {
      this.windowScheduler.paused = true;
    }

    if (this.newMethodAllWindowsTimer) {
      this.newMethodAllWindowsTimer.paused = true;
    }

    // Metti in pausa tutte le animazioni delle finestre
    this.windowsSprites.forEach((sprite) => {
      if (sprite.anims.isPlaying) {
        sprite.anims.pause();
      }
    });

    // Metti in pausa tutti i tween attivi sugli oggetti
    this.activeObjects.forEach((obj) => {
      this.tweens.pauseAll();
    });

    // Pausa tutti i timer di chiusura finestre
    this.windowTimers.forEach((timer) => {
      timer.paused = true;
    });
  }

  //* Scopo: Riprende il gioco riattivando lo scheduler e le animazioni
  public resumeGame(): void {
    if (this.windowScheduler) {
      this.windowScheduler.paused = false;
    }

    if (this.newMethodAllWindowsTimer) {
      this.newMethodAllWindowsTimer.paused = false;
    }

    // Riprendi tutte le animazioni delle finestre
    this.windowsSprites.forEach((sprite) => {
      if (sprite.anims.isPaused) {
        sprite.anims.resume();
      }
    });

    // Riprendi tutti i tween
    this.tweens.resumeAll();

    // Riprendi tutti i timer di chiusura finestre
    this.windowTimers.forEach((timer) => {
      timer.paused = false;
    });
  }

  //* Scopo: Avvia l'animazione delle stelle rosse + cuore spezzato
  private badObjectEffectAnimation(obj: Phaser.GameObjects.Image) {
    const {x, y} = obj;
    const frameRate = 20;
    const offsetY = this.gameScene.setDynamicValueBasedOnScale(-50, -100);

    // -----------------------------
    // STELLE ROSSE
    // -----------------------------
    const starsAnimKey = "animStarsRed";

    if (!this.anims.exists(starsAnimKey)) {
      this.anims.create({
        key: starsAnimKey,
        frames: this.anims.generateFrameNumbers("starsEffect_red", {
          start: 0,
          end: 18,
        }),
        frameRate,
        repeat: 0,
      });
    }

    const stars = this.add
      .sprite(x, y + offsetY, "starsEffect_red")
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1))
      .setDepth(10);

    stars.play(starsAnimKey);

    stars.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      stars.destroy();
    });

    // -----------------------------
    // CUORE SPEZZATO (SPRITE ANIM)
    // -----------------------------
    this.time.delayedCall(300, () => {
      const brokenHeartAnimKey = "animBrokenHeart";

      if (!this.anims.exists(brokenHeartAnimKey)) {
        this.anims.create({
          key: brokenHeartAnimKey,
          frames: this.anims.generateFrameNumbers("animBrokenHeart", {
            start: 0,
            end: 26, // 27 frame totali
          }),
          frameRate: 70,
          repeat: 0,
        });
      }

      const brokenHeart = this.add
        .sprite(x, y + offsetY, "animBrokenHeart")
        .setOrigin(0.5)
        .setScale(this.gameScene.setDynamicValueBasedOnScale(0.6, 1.2))
        .setDepth(10);

      brokenHeart.play(brokenHeartAnimKey);

      // Movimento verso il basso
      this.tweens.add({
        targets: brokenHeart,
        y: y + offsetY + 60,
        duration: 1600,
        ease: "Sine.easeIn",
      });

      // Fade out
      this.tweens.add({
        targets: brokenHeart,
        alpha: 0,
        duration: 1600,
        ease: "Sine.easeIn",
        onComplete: () => {
          brokenHeart.destroy();
        },
      });
    });
  }

  //* Scopo: Avvia l'animazione delle stelle nella posizione dell'oggetto buono
  private starsEffectAnimation(obj: Phaser.GameObjects.Image) {
    const {x, y} = obj;
    const frameRate = 20;
    const offsetY = this.gameScene.setDynamicValueBasedOnScale(-50, -100);

    const animKey = "animStarsGreen";

    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers("starsEffect_green", {
          start: 0,
          end: 18,
        }),
        frameRate,
        repeat: 0,
      });
    }

    const stars = this.add
      .sprite(x, y + offsetY, "starsEffect_green")
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1))
      .setDepth(3);

    stars.play(animKey);

    stars.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      stars.destroy();
    });

    this.time.delayedCall(300, () => {
      const fontSize = this.gameScene.setDynamicValueBasedOnScale(40, 100);
      const text = this.add.text(x, y + offsetY, "+1", {
        fontFamily: "Paytone One",
        fontSize: `${fontSize}px`,
        color: "#05d85dff",
        stroke: "#000",
        strokeThickness: 2,
      });

      text.setOrigin(0.5);
      text.setDepth(3);

      this.tweens.add({
        targets: text,
        y: y + offsetY + 40,
        alpha: 0,
        duration: 1000,
        ease: "Sine.easeIn",
        onComplete: () => {
          text.destroy();
        },
      });
    });
  }

  public disableGameInput(): void {
    this.canShoot = false;
    this.isGameOver = true;

    // Disabilita input globale della scena
    this.input.enabled = false;

    // Disabilita tutti gli oggetti cliccabili ancora attivi
    this.activeObjects.forEach((obj) => {
      if (obj.input) {
        obj.disableInteractive();
      }
    });

    // Disabilita anche i collider delle finestre
    this.windowColliders.forEach((zone) => {
      zone.disableInteractive();
    });
  }
}
