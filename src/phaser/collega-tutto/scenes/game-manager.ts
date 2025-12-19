/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {CollegaTuttoAssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = CollegaTuttoAssetConf;

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;
  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;

  private gridRows = 5;
  private gridCols = 5;
  private gridBlocks: Phaser.GameObjects.Image[][] = [];
  private gridObjects: (Phaser.GameObjects.Image | undefined)[] = [];

  private graphics!: Phaser.GameObjects.Graphics;
  private dragLineActive: boolean = false;
  private startObj!: Phaser.GameObjects.Image | undefined;
  private currentLineObj?: Phaser.GameObjects.Graphics;

  private pathBlocks: Phaser.GameObjects.Image[] = [];

  private permanentLines: Phaser.GameObjects.Graphics[] = [];

  private userLines: {
    line: Phaser.GameObjects.Graphics;
    startObj: Phaser.GameObjects.Image;
    endObj: Phaser.GameObjects.Image;
    pathBlocks: Phaser.GameObjects.Image[];
  }[] = [];

  private helpUsed: boolean = false;

  // SMOOTHNESS FACTOR: più alto = curva più morbida (default 32)
  private readonly SMOOTH_SEGMENTS = 32;

  // MAPPA I COLORI DEGLI OGGETTI
  private objectColors: Record<string, number> = {
    obj_0: 0xfbba02,
    obj_1: 0x606083,
    obj_2: 0xff8b95,
    obj_3: 0x0349a2,
    obj_4: 0x97b86a,
  };

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) this.gameScene = data.gameScene;
  }

  // CONTROLLA SE TUTTE LE COPPIE SONO COLLEGATE, 5 LINEE ESATTE E FA PARTIRE GAME OVER
  private checkAllPairsConnected() {
    const allPaired = this.gridObjects.every((obj) => obj === undefined);
    const correctLineCount = this.userLines.length === 5;

    if (allPaired && correctLineCount) {
      this.isGameOver = true;
      this.checkGameOver();
    }
  }

  // CONTROLLA SE IL BLOCCO È OCCUPATO DA UN OGGETTO O DA UN PERCORSO
  private isBlockOccupied(block: Phaser.GameObjects.Image): boolean {
    if (block.getData("occupied")) return true;

    const hasObject = this.gridObjects.some((obj) => {
      if (!obj) return false;
      const objBlock = this.getNearestBlock(obj.x, obj.y);

      return objBlock && objBlock.x === block.x && objBlock.y === block.y;
    });

    return hasObject;
  }

  // CONTROLLA SE LA MOSSA VERSO IL BLOCCO È VALIDA
  private isValidNextMove(
    nearestBlock: Phaser.GameObjects.Image,
    lastBlock: Phaser.GameObjects.Image,
  ): boolean {
    if (this.isBlockOccupied(nearestBlock)) return false;
    if (this.pathBlocks.some((b) => b.x === nearestBlock.x && b.y === nearestBlock.y)) return false;

    const dx = Math.abs(nearestBlock.x - lastBlock.x);
    const dy = Math.abs(nearestBlock.y - lastBlock.y);
    const blockDist = Math.max(dx, dy);

    if (blockDist === 0) return false;

    if (blockDist > 1) {
      if (dx > dy) {
        const step = nearestBlock.x > lastBlock.x ? 1 : -1;

        for (let x = lastBlock.x + step; x !== nearestBlock.x; x += step) {
          const intermediate = this.gridBlocks.flat().find((b) => b.x === x && b.y === lastBlock.y);

          if (intermediate && this.isBlockOccupied(intermediate)) return false;
          if (intermediate && this.pathBlocks.some((pb) => pb.x === x && pb.y === lastBlock.y))
            return false;
        }
      } else if (dy > dx) {
        const step = nearestBlock.y > lastBlock.y ? 1 : -1;

        for (let y = lastBlock.y + step; y !== nearestBlock.y; y += step) {
          const intermediate = this.gridBlocks.flat().find((b) => b.x === lastBlock.x && b.y === y);

          if (intermediate && this.isBlockOccupied(intermediate)) return false;
          if (intermediate && this.pathBlocks.some((pb) => pb.x === lastBlock.x && pb.y === y))
            return false;
        }
      }
    }

    return true;
  }

  // AUTO-COLLEGA UNA COPPIA VALIDA (AIUTO) - VERSIONE INTELLIGENTE
  private autoConnectPair() {
    // Trova tutte le coppie ancora da collegare
    const remainingPairs: Array<{
      obj1: Phaser.GameObjects.Image;
      obj2: Phaser.GameObjects.Image;
      index1: number;
      index2: number;
    }> = [];

    for (let i = 0; i < this.gridObjects.length; i++) {
      const obj1 = this.gridObjects[i];

      if (!obj1) continue;

      for (let j = i + 1; j < this.gridObjects.length; j++) {
        const obj2 = this.gridObjects[j];

        if (!obj2) continue;
        if (!this.isMatchingPair(obj1, obj2)) continue;

        remainingPairs.push({obj1, obj2, index1: i, index2: j});
      }
    }

    if (remainingPairs.length === 0) {
      console.log("Nessuna coppia rimanente da collegare");

      return;
    }

    // Fallback: salva la prima coppia disponibile trovata
    let fallbackPair: {
      pair: (typeof remainingPairs)[0];
      startBlock: Phaser.GameObjects.Image;
      endBlock: Phaser.GameObjects.Image;
      pathBlocks: Phaser.GameObjects.Image[];
    } | null = null;

    // Prova ogni coppia e verifica se collegandola le altre rimangono collegabili
    for (const pair of remainingPairs) {
      const startBlock = this.getNearestBlock(pair.obj1.x, pair.obj1.y);
      const endBlock = this.getNearestBlock(pair.obj2.x, pair.obj2.y);

      if (!startBlock || !endBlock) continue;

      // Calcola percorso per questa coppia
      const pathBlocks = this.computeAutoPath(startBlock, endBlock);

      if (!pathBlocks || pathBlocks.length < 1) continue;

      // Salva come fallback se è la prima coppia disponibile
      if (!fallbackPair) {
        fallbackPair = {pair, startBlock, endBlock, pathBlocks};
      }

      // SIMULAZIONE: occupa temporaneamente i blocchi
      const originalOccupied: Map<Phaser.GameObjects.Image, boolean> = new Map();

      originalOccupied.set(startBlock, startBlock.getData("occupied"));
      originalOccupied.set(endBlock, endBlock.getData("occupied"));

      startBlock.setData("occupied", true);
      endBlock.setData("occupied", true);
      pathBlocks.forEach((b) => {
        if (!originalOccupied.has(b)) {
          originalOccupied.set(b, b.getData("occupied"));
        }
        b.setData("occupied", true);
      });

      // Verifica se le altre coppie sono ancora collegabili
      let allOtherPairsCanConnect = true;

      for (const otherPair of remainingPairs) {
        if (otherPair === pair) continue; // salta la coppia corrente

        const otherStart = this.getNearestBlock(otherPair.obj1.x, otherPair.obj1.y);
        const otherEnd = this.getNearestBlock(otherPair.obj2.x, otherPair.obj2.y);

        if (!otherStart || !otherEnd) {
          allOtherPairsCanConnect = false;
          break;
        }

        const otherPath = this.computeAutoPath(otherStart, otherEnd);

        if (!otherPath) {
          allOtherPairsCanConnect = false;
          break;
        }
      }

      // Ripristina lo stato originale dei blocchi
      originalOccupied.forEach((wasOccupied, block) => {
        block.setData("occupied", wasOccupied);
      });

      // Se tutte le altre coppie possono ancora connettersi, questa è una buona scelta!
      if (allOtherPairsCanConnect) {
        console.log(`Coppia sicura trovata: ${pair.obj1.texture.key}`);
        // this.gameScene.audioManager.playAudio(assetConf.audio.success);
        this.executeAutoConnection(pair, startBlock, endBlock, pathBlocks);

        return;
      } else {
        console.log(`Coppia ${pair.obj1.texture.key} bloccherebbe altre connessioni`);
      }
    }

    // Se non abbiamo trovato una coppia sicura, usa il fallback (prima coppia disponibile)
    if (fallbackPair) {
      console.log(
        `Nessuna coppia sicura trovata, collego la prima disponibile: ${fallbackPair.pair.obj1.texture.key}`,
      );
      this.executeAutoConnection(
        fallbackPair.pair,
        fallbackPair.startBlock,
        fallbackPair.endBlock,
        fallbackPair.pathBlocks,
      );

      return;
    }

    // Solo se non c'è NESSUNA coppia collegabile, mostra la popup
    console.log("Creata popup");
    const {width, height} = this.scale;

    const overlay = this.add.graphics();

    overlay.fillStyle(0x000000, 0.4); // nero con alpha 40%
    overlay.fillRect(0, 0, width, height);

    // opzionale: portalo sopra a tutto
    //overlay.setDepth(1000);

    const popup = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, "popupHelp");

    popup.setOrigin(0.5); // Centro perfetto
    popup.setScale(this.gameScene.setDynamicValueBasedOnScale(0.5, 1.1)); // Scala leggermente aumentata
    popup.setDepth(99);
    // Dopo 2 secondi lo rimuovi
    this.time.delayedCall(2300, () => {
      popup.destroy();
      overlay.destroy();
    });
    console.warn("Nessuna coppia può essere collegata!");
  }

  // Esegue effettivamente il collegamento automatico
  private executeAutoConnection(
    pair: {
      obj1: Phaser.GameObjects.Image;
      obj2: Phaser.GameObjects.Image;
      index1: number;
      index2: number;
    },
    startBlock: Phaser.GameObjects.Image,
    endBlock: Phaser.GameObjects.Image,
    pathBlocks: Phaser.GameObjects.Image[],
  ) {
    const helpButton = this.children.getByName("helpButton") as Phaser.GameObjects.Image;

    if (helpButton) {
      this.helpUsed = true;
      helpButton.setAlpha(0.4).disableInteractive();
    }

    startBlock.setData("occupied", true);
    endBlock.setData("occupied", true);
    pathBlocks.forEach((b) => b.setData("occupied", true));

    pair.obj1.disableInteractive();
    pair.obj2.disableInteractive();

    this.gridObjects[pair.index1] = undefined;
    this.gridObjects[pair.index2] = undefined;

    const line = this.add.graphics();
    const color = this.objectColors[pair.obj1.texture.key] ?? 0x00ff00;
    const lineWidth = this.gameScene.setDynamicValueBasedOnScale(20, 80);

    line.setDepth(3);

    const allPoints = [
      {x: pair.obj1.x, y: pair.obj1.y},
      ...pathBlocks.map((b) => ({x: b.x, y: b.y})),
      {x: pair.obj2.x, y: pair.obj2.y},
    ];

    let index = 1;
    const totalAnimationTime = (allPoints.length - 1) * 100;

    // ANIMAZIONE DI TRACCIAMENTO DELLA LINEA MORBIDA
    this.time.addEvent({
      delay: 100,
      repeat: allPoints.length - 2,
      callback: () => {
        index++;
        // Ridisegna l'intera linea morbida fino al punto corrente
        const currentPoints = allPoints.slice(0, index);

        this.drawSmoothLine(line, currentPoints, color, lineWidth);
      },
    });

    this.userLines.push({
      line,
      startObj: pair.obj1,
      endObj: pair.obj2,
      pathBlocks: [...pathBlocks],
    });

    const addDeleteListener = (o: Phaser.GameObjects.Image) => {
      o.removeAllListeners("pointerdown");
      o.setInteractive();
      o.on("pointerdown", () => {
        const idx = this.userLines.findIndex((u) => u.startObj === o || u.endObj === o);

        if (idx !== -1) this.deleteUserLine(idx);
      });
    };

    addDeleteListener(pair.obj1);
    addDeleteListener(pair.obj2);

    // ASPETTA CHE LA LINEA SIA COMPLETAMENTE TRACCIATA
    this.time.delayedCall(totalAnimationTime + 100, () => {
      // SUONO come nel merge manuale
      this.gameScene.audioManager.playAudio(assetConf.audio.success);

      // ZOOM come al collegamento manuale
      this.tweens.add({
        targets: pair.obj1,
        scaleX: pair.obj1.scaleX * 1.3,
        scaleY: pair.obj1.scaleY * 1.3,
        duration: 150,
        yoyo: true,
        repeat: 2,
      });

      this.tweens.add({
        targets: pair.obj2,
        scaleX: pair.obj2.scaleX * 1.3,
        scaleY: pair.obj2.scaleY * 1.3,
        duration: 150,
        yoyo: true,
        repeat: 2,
      });

      // Ora puoi controllare se il gioco è finito
      this.checkAllPairsConnected();
    });

    console.log(`Collegata coppia: ${pair.obj1.texture.key} con ${pair.obj2.texture.key}`);
    console.log(`Start: (${startBlock.x}, ${startBlock.y}), End: (${endBlock.x}, ${endBlock.y})`);
    console.log("Percorso:", pathBlocks.map((b) => `(${b.x},${b.y})`).join(" -> "));
  }

  // CONTROLLA SE IL BLOCCO È OCCUPATO DA UN OGGETTO O DA UN PERCORSO (PER AUTO-PERCORSO)
  private isAutoPathBlockOccupied(block: Phaser.GameObjects.Image): boolean {
    if (block.getData("occupied")) return true;
    const hasObject = this.gridObjects.some((obj) => {
      if (!obj) return false;
      const objBlock = this.getNearestBlock(obj.x, obj.y);

      return objBlock && objBlock.x === block.x && objBlock.y === block.y;
    });

    return hasObject;
  }

  // CALCOLA IL PERCORSO AUTOMATICO TRA DUE BLOCCHI
  private computeAutoPath(
    start: Phaser.GameObjects.Image,
    end: Phaser.GameObjects.Image,
  ): Phaser.GameObjects.Image[] | null {
    const key = (b: Phaser.GameObjects.Image) => `${b.x}_${b.y}`;
    const startKey = key(start);
    const endKey = key(end);

    const queue: Array<{
      block: Phaser.GameObjects.Image;
      path: Phaser.GameObjects.Image[];
    }> = [];
    const visited = new Set<string>();

    queue.push({block: start, path: []});
    visited.add(startKey);

    while (queue.length > 0) {
      const {block: current, path: currentPath} = queue.shift()!;

      if (key(current) === endKey) {
        // Se il percorso ha meno di 1 blocco, forziamo il ritorno a null
        if (currentPath.length < 1) return null;

        return currentPath;
      }

      const directions = [
        {dx: 0, dy: -1},
        {dx: 0, dy: 1},
        {dx: -1, dy: 0},
        {dx: 1, dy: 0},
      ];

      for (const dir of directions) {
        const blockSize = Math.abs(this.gridBlocks[0][1].x - this.gridBlocks[0][0].x);
        const nextX = current.x + dir.dx * blockSize;
        const nextY = current.y + dir.dy * blockSize;

        let next: Phaser.GameObjects.Image | null = null;

        for (let r = 0; r < this.gridRows; r++) {
          for (let c = 0; c < this.gridCols; c++) {
            const b = this.gridBlocks[r][c];

            if (Math.abs(b.x - nextX) < 5 && Math.abs(b.y - nextY) < 5) {
              next = b;
              break;
            }
          }
          if (next) break;
        }
        if (!next) continue;
        const nextKey = key(next);

        if (visited.has(nextKey)) continue;
        if (next !== end && this.isAutoPathBlockOccupied(next)) continue;

        visited.add(nextKey);
        queue.push({block: next, path: [...currentPath, next]});
      }
    }

    return null;
  }

  // ANIMAZIONE DEI CONFETTI RICREATA (DA GAME.TS NON FUNZIONA)
  public startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    // Create spriteLeft
    const spriteLeft = this.add
      .sprite(0, config.height / 2, "confetti_left")
      .setOrigin(0, 0.5)
      .setDepth(100)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationLeft
    if (!this.anims.exists("animConfettiLeft")) {
      this.anims.create({
        key: "animConfettiLeft",
        frames: this.anims.generateFrameNumbers("confetti_left", {
          start: 0,
          end: 54,
        }),
        frameRate: 20,
      });
    }

    spriteLeft.play("animConfettiLeft");

    // Create spriteRight
    const spriteRight = this.add
      .sprite(config.width, config.height / 2, "confetti_right")
      .setOrigin(1, 0.5)
      .setDepth(100)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationRight
    if (!this.anims.exists("animConfettiRight")) {
      this.anims.create({
        key: "animConfettiRight",
        frames: this.anims.generateFrameNumbers("confetti_right", {
          start: 0,
          end: 54,
        }),
        frameRate: 20,
      });
    }

    spriteRight.play("animConfettiRight");
  }

  // CREA LE LINEE TRASCINABILI E GESTISCE IL DRAG-AND-DROP
  private createDraggableObjects() {
    this.graphics = this.add.graphics();

    this.gridObjects.forEach((img) => {
      if (!img) return;
      img.setInteractive({draggable: true});

      img.on("dragstart", () => {
        this.dragLineActive = true;
        this.startObj = img;

        if (this.currentLineObj) this.currentLineObj.destroy();
        this.currentLineObj = this.add.graphics();
        this.currentLineObj.setDepth(3);

        this.pathBlocks = [];
        const startBlock = this.getNearestBlock(this.startObj.x, this.startObj.y);

        if (startBlock) this.pathBlocks.push(startBlock);
      });

      img.on("drag", (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        // BLOCCA COMPLETAMENTE SE STA LAMPEGGIANDO
        if (this.isBlinking) return;

        if (!this.dragLineActive || !this.currentLineObj || !this.startObj) return;

        const startBlock = this.getNearestBlock(this.startObj.x, this.startObj.y);

        if (!startBlock || !this.startObj) return;

        const matchedObj = this.gridObjects
          .filter((o): o is Phaser.GameObjects.Image => !!o && o !== this.startObj)
          .find((o) => this.isMatchingPair(this.startObj!, o));

        const matchedObjBlock = matchedObj
          ? this.getNearestBlock(matchedObj.x, matchedObj.y)
          : null;

        if (this.pathBlocks.length > 0 && matchedObjBlock) {
          const lastBlock = this.pathBlocks[this.pathBlocks.length - 1];

          if (lastBlock.x === matchedObjBlock.x && lastBlock.y === matchedObjBlock.y) return;
        }

        const nearestBlock = this.getNearestBlock(dragX, dragY);

        if (!nearestBlock) return;
        if (nearestBlock.x === startBlock.x && nearestBlock.y === startBlock.y) return;

        const lastBlock =
          this.pathBlocks.length > 0 ? this.pathBlocks[this.pathBlocks.length - 1] : startBlock;

        const dx = Math.abs(nearestBlock.x - lastBlock.x);
        const dy = Math.abs(nearestBlock.y - lastBlock.y);

        let targetX = nearestBlock.x;
        let targetY = nearestBlock.y;

        if (dx > dy) targetY = lastBlock.y;
        else if (dy > dx) targetX = lastBlock.x;
        else return;

        const virtualBlock = this.gridBlocks.flat().find((b) => b.x === targetX && b.y === targetY);

        if (!virtualBlock) return;

        // Controllo blocco occupato da pezzi o da linee esistenti
        const isBlockOccupied =
          virtualBlock.getData("occupied") ||
          this.userLines.some((line) =>
            line.pathBlocks.some((b) => b.x === virtualBlock.x && b.y === virtualBlock.y),
          );

        if (isBlockOccupied) return; // blocco non valido

        const isOnMatchedObj =
          matchedObjBlock &&
          virtualBlock.x === matchedObjBlock.x &&
          virtualBlock.y === matchedObjBlock.y;

        // Controlla se la linea è arrivata su un oggetto NON corrispondente
        if (!this.startObj) return;
        const wrongObj = this.gridObjects
          .filter((o): o is Phaser.GameObjects.Image => !!o && o !== this.startObj)
          .find((o) => {
            const objBlock = this.getNearestBlock(o.x, o.y);

            return (
              objBlock &&
              virtualBlock.x === objBlock.x &&
              virtualBlock.y === objBlock.y &&
              this.startObj &&
              !this.isMatchingPair(this.startObj, o)
            );
          });

        // Se è un oggetto sbagliato, permetti di entrare nel blocco
        if (wrongObj) {
          // Aggiungi il blocco al percorso
          this.pathBlocks.push(virtualBlock);

          // Disegna la linea morbida fino all'oggetto sbagliato
          const color = this.objectColors[this.startObj.texture.key] ?? 0xff0000;
          const lineWidth = this.gameScene.setDynamicValueBasedOnScale(20, 80);
          const points = [
            {x: this.startObj.x, y: this.startObj.y},
            ...this.pathBlocks.map((b) => ({x: b.x, y: b.y})),
          ];

          this.drawSmoothLine(this.currentLineObj, points, color, lineWidth);

          // Audio coppia sbagliata
          console.log("audio coppia sbagliata");
          this.gameScene.audioManager.playAudio(assetConf.audio.error);

          // Linea arrivata su oggetto sbagliato: lampeggia e cancella
          this.blinkLine();

          return;
        }

        if (!isOnMatchedObj) {
          if (!this.isValidNextMove(virtualBlock, lastBlock)) return;
        } else {
          // Anche sul matchedObj, richiedi almeno due blocchi di percorso prima di connettere
          if (this.pathBlocks.length < 2) return;
        }

        // Aggiungi il blocco al percorso
        this.pathBlocks.push(virtualBlock);

        if (!this.startObj || !this.currentLineObj) return;
        this.currentLineObj.clear();
        const color = this.objectColors[this.startObj.texture.key] ?? 0xff0000;
        const lineWidth = this.gameScene.setDynamicValueBasedOnScale(20, 80);

        // CREA LA LINEA MORBIDA DURANTE IL DRAG
        const points = [
          {x: this.startObj.x, y: this.startObj.y},
          ...this.pathBlocks.map((b) => ({x: b.x, y: b.y})),
        ];

        this.drawSmoothLine(this.currentLineObj, points, color, lineWidth);
      });

      img.on("dragend", () => {
        // NON CANCELLARE SE STA LAMPEGGIANDO
        if (this.isBlinking) return;

        this.dragLineActive = false;

        if (this.pathBlocks.length === 0 || !this.startObj) {
          if (this.currentLineObj) this.currentLineObj.destroy();
          this.currentLineObj = undefined;

          return;
        }

        const matchedObj = this.gridObjects
          .filter((o): o is Phaser.GameObjects.Image => !!o && o !== this.startObj)
          .find((o) => this.isMatchingPair(this.startObj!, o));

        // Controlla se la linea termina su matchedObj
        const endsOnMatchedObj =
          matchedObj &&
          Phaser.Math.Distance.Between(
            this.pathBlocks[this.pathBlocks.length - 1].x,
            this.pathBlocks[this.pathBlocks.length - 1].y,
            matchedObj.x,
            matchedObj.y,
          ) < 10;

        // Se non termina su nessun oggetto, cancella la linea
        if (!endsOnMatchedObj) {
          if (this.currentLineObj) this.currentLineObj.destroy();
          this.currentLineObj = undefined;
          this.pathBlocks = [];

          return;
        }

        if (
          matchedObj &&
          Phaser.Math.Distance.Between(
            this.pathBlocks[this.pathBlocks.length - 1].x,
            this.pathBlocks[this.pathBlocks.length - 1].y,
            matchedObj.x,
            matchedObj.y,
          ) < 10
        ) {
          const startBlock = this.getNearestBlock(this.startObj.x, this.startObj.y);
          const endBlock = this.getNearestBlock(matchedObj.x, matchedObj.y);

          const isPathValid = this.pathBlocks.every((b) => {
            if (
              (startBlock && b.x === startBlock.x && b.y === startBlock.y) ||
              (endBlock && b.x === endBlock.x && b.y === endBlock.y)
            )
              return true;

            return !this.isBlockOccupied(b);
          });

          if (!isPathValid) {
            console.warn("Percorso non valido: passa su blocchi occupati");
            if (this.currentLineObj) this.currentLineObj.destroy();
            this.currentLineObj = undefined;
            this.pathBlocks = [];

            return;
          }

          if (startBlock) startBlock.setData("occupied", true);
          if (endBlock) endBlock.setData("occupied", true);
          this.pathBlocks.forEach((b) => b.setData("occupied", true));

          if (this.currentLineObj && this.startObj) {
            this.userLines.push({
              line: this.currentLineObj,
              startObj: this.startObj,
              endObj: matchedObj,
              pathBlocks: [...this.pathBlocks],
            });
          }

          // LOG DI DEBUG
          if (!this.startObj) return;
          console.log(
            `Coppia collegata: ${this.startObj.texture.key} -> ${matchedObj.texture.key}`,
          );

          // Audio coppia trovata
          console.log("audio coppia trovata");
          this.gameScene.audioManager.playAudio(assetConf.audio.success);

          // Animazione di zoom per entrambi gli oggetti
          this.tweens.add({
            targets: this.startObj,
            scaleX: this.startObj.scaleX * 1.3,
            scaleY: this.startObj.scaleY * 1.3,
            duration: 150,
            yoyo: true,
            repeat: 2,
          });

          this.tweens.add({
            targets: matchedObj,
            scaleX: matchedObj.scaleX * 1.3,
            scaleY: matchedObj.scaleY * 1.3,
            duration: 150,
            yoyo: true,
            repeat: 2,
          });

          // Audio coppia trovata
          console.log("audio coppia trovata");
          this.gameScene.audioManager.playAudio(assetConf.audio.success);

          // Listener per cancellare la linea
          const addDeleteListener = (obj: Phaser.GameObjects.Image) => {
            obj.removeAllListeners("pointerdown");
            obj.on("pointerdown", () => {
              const lineIndex = this.userLines.findIndex(
                (ul) => ul.startObj === obj || ul.endObj === obj,
              );

              if (lineIndex !== -1) this.deleteUserLine(lineIndex);
            });
          };

          addDeleteListener(this.startObj);
          addDeleteListener(matchedObj);

          const startIndex = this.gridObjects.indexOf(this.startObj);
          const endIndex = this.gridObjects.indexOf(matchedObj);

          if (startIndex !== -1) this.gridObjects[startIndex] = undefined;
          if (endIndex !== -1) this.gridObjects[endIndex] = undefined;

          this.startObj = undefined;
          this.currentLineObj = undefined;
          this.pathBlocks = [];

          this.checkAllPairsConnected();
        }
      });
    });
  }

  // Aggiungi questa proprietà nella classe
  private isBlinking: boolean = false;

  // FUNZIONE PER FAR LAMPEGGIARE LA LINEA
  private blinkLine() {
    if (!this.currentLineObj || !this.startObj) return;

    this.isBlinking = true; // Blocca la cancellazione durante i lampeggi
    const color = this.objectColors[this.startObj.texture.key] ?? 0xff0000;
    const lineWidth = this.gameScene.setDynamicValueBasedOnScale(20, 80);
    const points = [
      {x: this.startObj.x, y: this.startObj.y},
      ...this.pathBlocks.map((b) => ({x: b.x, y: b.y})),
    ];
    let blinkCount = 0;
    const maxBlinks = 6;

    this.gameScene.time.addEvent({
      delay: 200,
      repeat: maxBlinks - 1,
      callback: () => {
        if (!this.currentLineObj) return;

        blinkCount++;

        // Alterna tra visibile e invisibile
        if (blinkCount % 2 === 0) {
          this.drawSmoothLine(this.currentLineObj, points, color, lineWidth);
        } else {
          this.currentLineObj.clear();
        }

        // Dopo l'ultimo lampeggio, cancella e sblocca
        if (blinkCount === maxBlinks) {
          if (this.currentLineObj) this.currentLineObj.destroy();
          this.currentLineObj = undefined;
          this.pathBlocks = [];
          this.isBlinking = false; // Sblocca
        }
      },
    });
  }

  // ELIMINA LA LINEA DELL'UTENTE E RIATTIVA GLI OGGETTI
  private deleteUserLine(index: number): void {
    if (index < 0 || index >= this.userLines.length) return;

    const ul = this.userLines[index];

    ul.line.destroy();

    const startBlock = this.getNearestBlock(ul.startObj.x, ul.startObj.y);
    const endBlock = this.getNearestBlock(ul.endObj.x, ul.endObj.y);

    if (startBlock) startBlock.setData("occupied", false);
    if (endBlock) endBlock.setData("occupied", false);

    ul.pathBlocks.forEach((b) => {
      const realBlock = this.getNearestBlock(b.x, b.y);

      if (realBlock) realBlock.setData("occupied", false);
    });

    let startInserted = false;
    let endInserted = false;

    for (let i = 0; i < this.gridObjects.length; i++) {
      if (!startInserted && this.gridObjects[i] === undefined) {
        this.gridObjects[i] = ul.startObj;
        startInserted = true;
      } else if (!endInserted && this.gridObjects[i] === undefined && startInserted) {
        this.gridObjects[i] = ul.endObj;
        endInserted = true;
        break;
      }
    }

    ul.startObj.removeAllListeners("pointerdown");
    ul.endObj.removeAllListeners("pointerdown");

    ul.startObj.input!.draggable = true;
    ul.endObj.input!.draggable = true;

    this.userLines.splice(index, 1);
    console.log(`Linea eliminata. Oggetti riattivati per il drag.`);
  }

  create() {
    console.log("StartGameCollegaTutto");
    this.computeLayoutDimensions();
    this.createGrid5x5();
    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
      // Musica di sottofondo
      console.log("audio sottofondo");
    });
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);
    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
  }

  // CREA LA GRIGLIA 5X5 CON GLI OGGETTI POSIZIONATI
  private createGrid5x5(): void {
    const rows = this.gridRows;
    const cols = this.gridCols;

    const padding = 40;
    const availableWidth = this.gameWidth - padding * 2;
    const availableHeight = this.gameHeight - this.marginTop - padding;
    const gridSize = Math.min(availableWidth, availableHeight);
    const blockSize = Math.floor(gridSize / Math.max(rows, cols));

    const totalGridWidth = blockSize * cols;
    const totalGridHeight = blockSize * rows;

    const startX = (this.gameWidth - totalGridWidth) / 2;
    const startY = (this.gameHeight - totalGridHeight) / 2;

    // centro della griglia
    const centerX = startX + totalGridWidth / 2;
    const centerY = startY + totalGridHeight / 2;

    // GRID BACKGROUND
    const gridBg = this.add.image(centerX, centerY, "grid");

    // padding dinamico in base al dispositivo
    const gridPadding = this.gameScene.setDynamicValueBasedOnScale(30, 95);

    // calcola le dimensioni desiderate dello sfondo (griglia + padding)
    const desiredWidth = totalGridWidth + gridPadding * 2;
    const desiredHeight = totalGridHeight + gridPadding * 2;

    // scale rispetto alle dimensioni originali
    const scaleX = desiredWidth / gridBg.width;
    const scaleY = desiredHeight / gridBg.height;

    // usa la scala minore per mantenere le proporzioni
    const finalScale = Math.min(scaleX, scaleY);

    gridBg.setScale(finalScale);
    gridBg.setDepth(0);

    console.log("Grid scale applicata:", finalScale);

    const helpButton = this.add
      .image(0, 0, "iconHelp")
      .setOrigin(0.5)
      .setScale(this.gameScene.setDynamicValueBasedOnScale(0.35, 1.0))
      .setInteractive({useHandCursor: true})
      .setName("helpButton");

    helpButton.setPosition(
      startX + totalGridWidth - helpButton.displayWidth / 2,
      startY + totalGridHeight + helpButton.displayHeight / 2 + 80,
    );
    helpButton.on("pointerdown", () => {
      this.autoConnectPair();
    });

    this.gridBlocks.forEach((row) => row.forEach((b) => b.destroy()));
    this.gridBlocks = [];

    for (let r = 0; r < rows; r++) {
      this.gridBlocks[r] = [];
      for (let c = 0; c < cols; c++) {
        const x = startX + c * blockSize + blockSize / 2;
        const y = startY + r * blockSize + blockSize / 2;

        const rect = this.add
          .image(x, y, "block")
          .setOrigin(0.5)
          .setDisplaySize(blockSize, blockSize);

        rect.setData("occupied", false);
        this.gridBlocks[r][c] = rect;
      }
    }

    const objects: string[] = [];

    for (let i = 0; i < 5; i++) objects.push(`obj_${i}`, `obj_${i}`);

    // SCHEMI DI POSIZIONAMENTO DEGLI OGGETTI NELLA GRIGLIA
    const positionSchemes: {r: number; c: number}[][] = [
      // DISPOSIZIONE 1
      [
        // prima coppia OBJ_0
        {r: 0, c: 0},
        {r: 4, c: 2},
        // seconda coppia OBJ_1
        {r: 3, c: 1},
        {r: 0, c: 2},
        // terza coppia OBJ_2
        {r: 0, c: 3},
        {r: 3, c: 2},
        // quarta coppia OBJ_3
        {r: 2, c: 3},
        {r: 4, c: 4},
        // quinta coppia OBJ_4
        {r: 0, c: 4},
        {r: 3, c: 4},
      ],
      // DISPOSIZIONE 2
      [
        // prima coppia OBJ_0
        {r: 4, c: 2},
        {r: 4, c: 0},
        // seconda coppia OBJ_1
        {r: 3, c: 0},
        {r: 2, c: 2},
        // terza coppia OBJ_2
        {r: 1, c: 0},
        {r: 0, c: 4},
        // quarta coppia OBJ_3
        {r: 1, c: 1},
        {r: 4, c: 3},
        // quinta coppia OBJ_4
        {r: 4, c: 4},
        {r: 1, c: 4},
      ],
      // DISPOSIZIONE 3
      [
        // prima coppia OBJ_0
        {r: 0, c: 0},
        {r: 1, c: 1},
        // seconda coppia OBJ_1
        {r: 3, c: 1},
        {r: 1, c: 0},
        // terza coppia OBJ_2
        {r: 3, c: 0},
        {r: 4, c: 2},
        // quarta coppia OBJ_3
        {r: 0, c: 2},
        {r: 4, c: 4},
        // quinta coppia OBJ_4
        {r: 1, c: 2},
        {r: 4, c: 3},
      ],
    ];

    const selectedPositions = Phaser.Utils.Array.GetRandom(positionSchemes);

    this.gridObjects = [];
    selectedPositions.forEach((pos, index) => {
      const r = pos.r;
      const c = pos.c;
      const rect = this.gridBlocks[r][c];
      const img = this.add.image(rect.x, rect.y, objects[index]).setOrigin(0.5);

      img.setDisplaySize(blockSize * 0.7, blockSize * 0.7);
      img.setDepth(10);
      this.gridObjects.push(img);
    });

    this.createDraggableObjects();
  }

  checkGameOver() {
    if (this.isGameOver) {
      console.log(`GAME OVER:`);
      this.canShoot = false;
      // this.gameScene.startAnimConfetti();
      // this.startAnimConfetti();
      this.gameScene.gameOver();
    }
  }

  private getNearestBlock(x: number, y: number) {
    let nearest: Phaser.GameObjects.Image | null = null;
    let minDist = Infinity;

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const block = this.gridBlocks[r][c];
        const dx = block.x - x;
        const dy = block.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          nearest = block;
        }
      }
    }

    return nearest;
  }

  private isMatchingPair(obj1: Phaser.GameObjects.Image, obj2: Phaser.GameObjects.Image) {
    return obj1.texture.key === obj2.texture.key && obj1 !== obj2;
  }

  /**
   * Disegna una linea normale collegando i punti in sequenza
   */
  private drawSmoothLine(
    graphics: Phaser.GameObjects.Graphics,
    points: {x: number; y: number}[],
    color: number,
    lineWidth: number,
  ): void {
    if (points.length < 2) return;

    graphics.clear();
    graphics.lineStyle(lineWidth, color);

    // LINEE NORMALI - Commentata la parte con spline morbide
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();

    // // Catmull-Rom Spline per curve morbide attraverso tutti i punti (COMMENTATO)
    // const spline = new Phaser.Curves.Spline(points.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
    // // Campiona punti dalla spline per una curva fluida
    // const smoothPoints = spline.getPoints(this.SMOOTH_SEGMENTS * (points.length - 1));
    // graphics.moveTo(smoothPoints[0].x, smoothPoints[0].y);
    // for (let i = 1; i < smoothPoints.length; i++) {
    //   graphics.lineTo(smoothPoints[i].x, smoothPoints[i].y);
    // }
    // graphics.strokePath();
  }
}

//TODO: RISOLVERE ERRORE TYPE, METTERE POPUP PER AIUTO NON DISPONIBILE AL CONSOLE WARN R.228
