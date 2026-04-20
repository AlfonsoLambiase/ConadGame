/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Phaser from "phaser";

import {FaiLaTuaSceltaAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = FaiLaTuaSceltaAssetConf; //* Generalizzazione

type RpsChoice = "carta" | "forbice" | "sasso";

const RPS_CHOICES: RpsChoice[] = ["sasso", "carta", "forbice"];

/** `wins[a] === b` ⇒ a batte b (sasso/forbice/carta) */
const RPS_WINS: Record<RpsChoice, RpsChoice> = {
  carta: "sasso",
  sasso: "forbice",
  forbice: "carta",
};

const RPS_ANIM_FRAME_COUNT = 24;
const RPS_ANIM_LAST_FRAME = RPS_ANIM_FRAME_COUNT - 1;
/** Durata totale animazione ~1s; regola qui la velocità */
const RPS_ANIM_MS_PER_FRAME = Math.ceil(250 / RPS_ANIM_FRAME_COUNT);

type RpsBattleTextureSpec = {key: string; frame?: number};

/** Stesse sorgenti per player e nemico (frame solo per setTexture puntuale; anim usa 0..23) */
const RPS_BATTLE_TEXTURE: Record<RpsChoice, RpsBattleTextureSpec> = {
  carta: {key: assetConf.spritesheet.animCarta.key, frame: RPS_ANIM_LAST_FRAME},
  forbice: {key: assetConf.spritesheet.animForbice.key, frame: RPS_ANIM_LAST_FRAME},
  sasso: {key: assetConf.image.sasso},
};

const PLAYER_HAND_DEPTH = 98;
const ENEMY_HAND_DEPTH = -2.5;
/** Dietro la mano; offset depth per asse player/enemy */
const ASSE_DEPTH_OFFSET = 0.01;
/** Scala extra per mani RPS (sasso / animCarta / animForbice) su player e nemico */
const RPS_HAND_SCALE_MULT = 2;

export class GameManager extends Phaser.Scene {
  private gameWidth!: number;
  private gameHeight!: number;

  private choiceImages!: Record<RpsChoice, Phaser.GameObjects.Image>;
  public selectedRpsChoice: RpsChoice | null = null;

  private playerImg!: Phaser.GameObjects.Image;
  /** Pivot top-center (0.5,0) coincidente col centro geometrico della mano (0.5,0.5) */
  private playerAsseImg!: Phaser.GameObjects.Image;
  private enemyImg!: Phaser.GameObjects.Image;
  /** Bottom-center (0.5,1) sul pivot mano: asta disegnata dall’alto che termina sul sasso */
  private enemyAsseImg!: Phaser.GameObjects.Image;
  private playerBaseY!: number;
  private enemyBaseY!: number;
  /** |ΔY| dal centro camera verso l’alto (uguale a playerBelowCenterY) */
  private enemyAboveCenterY!: number;
  /** |ΔY| dal centro camera verso il basso (uguale a enemyAboveCenterY) */
  private playerBelowCenterY!: number;
  /** Serve per regolare l'allungo (movimento in avanti) di player/enemy nella vittoria */
  private slamDistance!: number;
  /** Serve per regolare la distanza dal bordo inferiore della fascia icone attivo/inattivo */
  private choiceBarBottomMargin!: number;

  private isRoundPlaying = false;

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
    console.log("Start Scene GameManager");
    this.computeLayoutDimensions();
    this.createRpsChoiceBar();

    this.selectedRpsChoice = "sasso";
    this.canShoot = true;
    this.isGameOver = false;

    this.time.delayedCall(50, () => {
      const entryDur = 800;

      this.gameScene.tweens.add({
        targets: [this.enemyImg, this.enemyAsseImg],
        y: this.enemyBaseY,
        duration: entryDur,
        ease: "Cubic.easeOut",
        onComplete: () => this.syncEnemyAsseToHand(),
      });
      this.gameScene.tweens.add({
        targets: [this.playerImg, this.playerAsseImg],
        y: this.playerBaseY,
        duration: entryDur,
        ease: "Cubic.easeOut",
        onComplete: () => this.startRound(),
      });
    });
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    /** Stessa distanza in |Y| dal centro camera per nemico (su) e player (giù), più lontani dal centro */
    const distFromCenterY = this.gameScene.setDynamicValueBasedOnScale(140, 720);

    this.enemyAboveCenterY = distFromCenterY;
    this.playerBelowCenterY = distFromCenterY;
    this.slamDistance = this.gameScene.setDynamicValueBasedOnScale(110, 660);
    this.choiceBarBottomMargin = this.gameScene.setDynamicValueBasedOnScale(100, 250);
  }

  private createRpsChoiceBar(): void {
    const img = assetConf.image;
    const cam = this.gameScene.cameras.main;
    const centerWorld = cam.getWorldPoint(cam.centerX, cam.centerY);
    const cx = centerWorld.x;
    const gap = this.gameScene.setDynamicValueBasedOnScale(20, 44);
    const barDynamicScale = this.gameScene.setDynamicValueBasedOnScale(0.4, 1.0);
    const dynamicScale = this.gameScene.setDynamicValueBasedOnScale(0.3, 1.2);
    const rpsHandScale = dynamicScale * RPS_HAND_SCALE_MULT;
    const entryOffscreenPad = this.gameScene.setDynamicValueBasedOnScale(160, 320);

    const handTopTargetY = centerWorld.y - this.enemyAboveCenterY;

    this.enemyImg = this.gameScene.add
      .image(cx, 0, img.sasso)
      .setOrigin(0.5, 0.5)
      .setScale(rpsHandScale)
      .setScrollFactor(0)
      .setDepth(ENEMY_HAND_DEPTH)
      .setFlipY(true);
    this.enemyBaseY = handTopTargetY + this.enemyImg.displayHeight / 2;
    this.enemyImg.y = this.enemyBaseY - this.enemyImg.displayHeight / 2 - entryOffscreenPad;

    this.enemyAsseImg = this.gameScene.add
      .image(0, 0, img.asse_enemy)
      .setOrigin(0.5, 1)
      .setScale(dynamicScale)
      .setScrollFactor(0);
    this.syncEnemyAsseToHand();
    this.syncEnemyAsseDepth();

    const handBottomTargetY = centerWorld.y + this.playerBelowCenterY;

    this.playerImg = this.gameScene.add
      .image(cx, 0, img.sasso)
      .setOrigin(0.5, 0.5)
      .setScale(rpsHandScale)
      .setScrollFactor(0)
      .setDepth(PLAYER_HAND_DEPTH);
    this.playerBaseY = handBottomTargetY - this.playerImg.displayHeight / 2;
    this.playerImg.y = this.playerBaseY + this.playerImg.displayHeight / 2 + entryOffscreenPad;

    this.playerAsseImg = this.gameScene.add
      .image(this.playerImg.x, this.playerImg.y, img.asse_player)
      .setOrigin(0.5, 0)
      .setScale(dynamicScale)
      .setScrollFactor(0);
    this.syncPlayerAsseDepth();

    const choices: RpsChoice[] = ["sasso", "carta", "forbice"];
    const inactiveKeys = [img.sasso_inattivo, img.carta_inattivo, img.forbice_inattivo] as const;

    const probe = this.add.image(0, 0, inactiveKeys[0]).setVisible(false).setScale(barDynamicScale);
    const iconW = probe.displayWidth;
    const step = iconW + gap;

    probe.destroy();

    const y = this.gameHeight - this.choiceBarBottomMargin;

    const totalWidth = 3 * iconW + 2 * gap;
    const x0 = (this.gameWidth - totalWidth) / 2 + iconW / 2;

    this.choiceImages = {} as Record<RpsChoice, Phaser.GameObjects.Image>;

    choices.forEach((choice, i) => {
      const imgKey = inactiveKeys[i];
      const image = this.add
        .image(x0 + i * step, y, imgKey)
        .setOrigin(0.5)
        .setScale(barDynamicScale)
        .setScrollFactor(0)
        .setDepth(100)
        .setInteractive({useHandCursor: true});

      image.on("pointerdown", () => this.onChoiceClick(choice));
      this.choiceImages[choice] = image;
    });
  }

  private syncPlayerAsseDepth(): void {
    this.playerAsseImg.setDepth(this.playerImg.depth - ASSE_DEPTH_OFFSET);
  }

  private syncEnemyAsseDepth(): void {
    this.enemyAsseImg.setDepth(this.enemyImg.depth - ASSE_DEPTH_OFFSET);
  }

  /** Top-center asse = centro PNG mano (sasso / animCarta / animForbice) */
  private syncPlayerAsseToHand(): void {
    this.playerAsseImg.setPosition(this.playerImg.x, this.playerImg.y);
  }

  /** Il basso dell’asse coincide col centro pivot della mano/sasso; il PNG va verso -Y (in alto) */
  private syncEnemyAsseToHand(): void {
    this.enemyAsseImg.setPosition(this.enemyImg.x, this.enemyImg.y);
  }

  private syncAsseForHand(hand: Phaser.GameObjects.Image): void {
    if (hand === this.playerImg) {
      this.syncPlayerAsseToHand();
    } else {
      this.syncEnemyAsseToHand();
    }
  }

  /**
   * Sasso: subito. Carta/forbice: animazione 24 frame poi callback.
   * Poi resolve + slam (showVictory) senza fade.
   */
  private runHandRevealAnim(
    hand: Phaser.GameObjects.Image,
    choice: RpsChoice,
    onDone: () => void,
  ): void {
    if (choice === "sasso") {
      this.applyRpsTexture(hand, "sasso");
      onDone();

      return;
    }

    const sheetKey =
      choice === "carta"
        ? assetConf.spritesheet.animCarta.key
        : assetConf.spritesheet.animForbice.key;

    hand.setTexture(sheetKey, 0);
    this.syncAsseForHand(hand);

    let frame = 0;

    const ev = this.time.addEvent({
      delay: RPS_ANIM_MS_PER_FRAME,
      loop: true,
      callback: () => {
        frame++;
        hand.setTexture(sheetKey, frame);
        this.syncAsseForHand(hand);
        if (frame >= RPS_ANIM_LAST_FRAME) {
          ev.remove();
          onDone();
        }
      },
    });
  }

  private applyRpsTexture(target: Phaser.GameObjects.Image, choice: RpsChoice): void {
    const spec = RPS_BATTLE_TEXTURE[choice];

    if (spec.frame !== undefined) {
      target.setTexture(spec.key, spec.frame);
    } else {
      target.setTexture(spec.key);
    }

    if (target === this.playerImg) {
      this.syncPlayerAsseToHand();
    } else if (target === this.enemyImg) {
      this.syncEnemyAsseToHand();
    }
  }

  private onChoiceClick(choice: RpsChoice): void {
    if (this.isRoundPlaying) return;
    this.setRpsChoice(choice);
  }

  private setRpsChoice(choice: RpsChoice): void {
    const img = assetConf.image;
    const activeMap: Record<RpsChoice, string> = {
      carta: img.carta_attivo,
      forbice: img.forbice_attivo,
      sasso: img.sasso_attivo,
    };
    const inactiveMap: Record<RpsChoice, string> = {
      carta: img.carta_inattivo,
      forbice: img.forbice_inattivo,
      sasso: img.sasso_inattivo,
    };

    (Object.keys(this.choiceImages) as RpsChoice[]).forEach((key) => {
      this.choiceImages[key].setTexture(key === choice ? activeMap[key] : inactiveMap[key]);
    });
    this.selectedRpsChoice = choice;
  }

  // ─── Round flow: auto countdown+oscillazione → reveal → vittoria → next ───

  private startPlayerEnemyHandBounce(): void {
    const bounce = this.gameScene.setDynamicValueBasedOnScale(30, 60);
    const bounceDuration = 350;

    this.tweens.add({
      targets: [this.playerImg, this.playerAsseImg],
      y: {from: this.playerBaseY, to: this.playerBaseY - bounce},
      duration: bounceDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: [this.enemyImg, this.enemyAsseImg],
      y: {from: this.enemyBaseY, to: this.enemyBaseY + bounce},
      duration: bounceDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private startRound(): void {
    this.isRoundPlaying = false;
    this.setChoiceBarEnabled(true);

    this.showCountdown(() => {
      this.isRoundPlaying = true;
      this.setChoiceBarEnabled(false);

      this.tweens.killTweensOf(this.playerImg);
      this.tweens.killTweensOf(this.playerAsseImg);
      this.tweens.killTweensOf(this.enemyImg);
      this.tweens.killTweensOf(this.enemyAsseImg);
      this.playerImg.y = this.playerBaseY;
      this.syncPlayerAsseToHand();
      this.enemyImg.y = this.enemyBaseY;
      this.syncEnemyAsseToHand();

      this.revealChoices();
    });
  }

  // Se vuoi il counter piu lento alza i valori
  private showCountdown(onComplete: () => void): void {
    const popMs = 550;
    const fadeMs = 550;
    const introMs = 2000;

    const cam = this.gameScene.cameras.main;
    const centerWorld = cam.getWorldPoint(cam.centerX, cam.centerY);
    const cx = centerWorld.x;
    const cy = centerWorld.y;
    const fontSize = this.gameScene.setDynamicValueBasedOnScale(80, 160);
    const introFontSize = Math.round(fontSize * 0.5);
    const introStroke = Math.max(4, Math.round(8 * (introFontSize / fontSize)));

    const textStyleBase: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Paytone One",
      fontSize: `${fontSize}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
      align: "center",
    };

    const introStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      ...textStyleBase,
      fontSize: `${introFontSize}px`,
      strokeThickness: introStroke,
    };

    const introLabel = "Fai la tua mossa!";

    const text = this.add
      .text(cx, cy, introLabel, introStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setScale(1)
      .setAlpha(1);

    const numbers = ["3", "2", "1"];
    let index = 0;

    const showNext = () => {
      if (index >= numbers.length) {
        text.destroy();
        onComplete();

        return;
      }
      text.setText(numbers[index]);
      text.setStyle(textStyleBase);
      text.setScale(0).setAlpha(1);

      this.tweens.add({
        targets: text,
        scale: 1,
        duration: popMs,
        ease: "Back.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: text,
            alpha: 0,
            scale: 1.5,
            duration: fadeMs,
            ease: "Cubic.easeIn",
            onComplete: () => {
              index++;
              showNext();
            },
          });
        },
      });
    };

    this.time.delayedCall(introMs, () => {
      this.startPlayerEnemyHandBounce();
      showNext();
    });
  }

  private revealChoices(): void {
    const playerChoice = this.selectedRpsChoice ?? "sasso";
    const enemyChoice = this.pickBiasedEnemyChoice(playerChoice);

    this.playerImg.setAlpha(1);
    this.playerAsseImg.setAlpha(1);
    this.enemyImg.setAlpha(1);
    this.enemyAsseImg.setAlpha(1);

    let pending = 2;

    const onBothRevealsDone = () => {
      pending--;
      if (pending > 0) return;

      const result = this.resolveRound(playerChoice, enemyChoice);

      console.log(`Player: ${playerChoice} vs Enemy: ${enemyChoice} → ${result}`);

      if (result === "player") {
        this.gameScene.uiManager.addPlayerPoint();
        this.gameScene.audioManager.playAudio("success");
        this.showVictory("player", () => this.nextRound());
      } else if (result === "enemy") {
        this.gameScene.uiManager.addEnemyPoint();
        this.gameScene.audioManager.playAudio("error");
        this.showVictory("enemy", () => this.nextRound());
      } else {
        this.time.delayedCall(1200, () => this.nextRound());
      }
    };

    this.runHandRevealAnim(this.playerImg, playerChoice, onBothRevealsDone);
    this.runHandRevealAnim(this.enemyImg, enemyChoice, onBothRevealsDone);
  }

  private showVictory(winner: "player" | "enemy", onComplete: () => void): void {
    const dur = 400;
    const loserDepth = (this.enemyImg.depth + this.playerImg.depth) / 2;

    if (winner === "player") {
      const winDepth = this.enemyImg.depth + 1;

      this.playerImg.setDepth(winDepth);
      this.syncPlayerAsseDepth();
      this.tweens.add({
        targets: [this.playerImg, this.playerAsseImg],
        y: this.playerBaseY - this.slamDistance,
        duration: dur,
        ease: "Back.easeOut",
        yoyo: true,
        hold: 600,
        onComplete: () => {
          this.playerImg.y = this.playerBaseY;
          this.syncPlayerAsseToHand();
          this.playerImg.setDepth(PLAYER_HAND_DEPTH);
          this.syncPlayerAsseDepth();
          onComplete();
        },
      });
      this.time.delayedCall(dur, () => {
        this.gameScene.starsEffectManager.playStarsAboveWinner(this.enemyImg, 0, "enemyBottom");
      });
    } else {
      const winDepth = this.playerImg.depth + 1;

      this.enemyImg.setDepth(winDepth);
      this.syncEnemyAsseDepth();
      this.tweens.add({
        targets: [this.enemyImg, this.enemyAsseImg],
        y: this.enemyBaseY + this.slamDistance,
        duration: dur,
        ease: "Back.easeOut",
        yoyo: true,
        hold: 600,
        onComplete: () => {
          this.enemyImg.y = this.enemyBaseY;
          this.syncEnemyAsseToHand();
          this.enemyImg.setDepth(ENEMY_HAND_DEPTH);
          this.syncEnemyAsseDepth();
          onComplete();
        },
      });
      this.time.delayedCall(dur, () => {
        this.gameScene.starsEffectManager.playStarsAboveWinner(this.playerImg, 0, "playerTop");
      });
    }
  }

  private nextRound(): void {
    this.applyRpsTexture(this.playerImg, "sasso");
    this.applyRpsTexture(this.enemyImg, "sasso");
    this.selectedRpsChoice = "sasso";
    this.resetChoiceBar();

    const ui = this.gameScene.uiManager;

    if (ui.playerScore >= 3) {
      this.gameScene.gameOver("Win");
    } else if (ui.enemyScore >= 3) {
      this.gameScene.gameOver("Failed");
    } else {
      this.time.delayedCall(800, () => this.startRound());
    }
  }

  private resetChoiceBar(): void {
    const img = assetConf.image;
    const inactiveMap: Record<RpsChoice, string> = {
      carta: img.carta_inattivo,
      forbice: img.forbice_inattivo,
      sasso: img.sasso_inattivo,
    };

    (Object.keys(this.choiceImages) as RpsChoice[]).forEach((key) => {
      this.choiceImages[key].setTexture(inactiveMap[key]);
    });
  }

  /**
   * Pareggio 20%, vittoria player 50%, vittoria nemico 30% (per round, indipendente dalla scelta).
   */
  private pickBiasedEnemyChoice(player: RpsChoice): RpsChoice {
    const roll = Phaser.Math.Between(0, 99);

    if (roll < 20) return player;

    if (roll < 65) return RPS_WINS[player];

    return RPS_CHOICES.find((c) => RPS_WINS[c] === player) ?? player;
  }

  private resolveRound(player: RpsChoice, enemy: RpsChoice): "player" | "enemy" | "draw" {
    if (player === enemy) return "draw";

    return RPS_WINS[player] === enemy ? "player" : "enemy";
  }

  private setChoiceBarEnabled(enabled: boolean): void {
    (Object.keys(this.choiceImages) as RpsChoice[]).forEach((key) => {
      if (enabled) {
        this.choiceImages[key].setInteractive({useHandCursor: true});
      } else {
        this.choiceImages[key].disableInteractive();
      }
    });
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
