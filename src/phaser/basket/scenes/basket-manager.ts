/* eslint-disable @typescript-eslint/no-unused-vars */

import Phaser from "phaser";
 
import {BasketAssetConf} from "../shared/config/asset-conf.const";
 
import {Game} from "./game";

interface RectangleWithOriginalData extends Phaser.GameObjects.Rectangle {
  originalData: {
    baseX: number;
    baseY: number;
    baseWidth: number;
    baseHeight: number;
  };
}
 
export class BasketManager extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragEndX: number = 0;
  private dragEndY: number = 0;
  private trajectoryLine!: Phaser.GameObjects.Graphics;
  private speedBall: number = 750; // 750
 
  public canShoot: boolean = true;
  public isGameOver: boolean = false;
 
  private basketWalls!: Phaser.Physics.Arcade.StaticGroup;
 
  private basketImage!: Phaser.GameObjects.Image;
  private basketScale: number = 0.8; // Scala del basket
 
  private basketOffsetXLeft: number = 10; // pixel da sinistra // 40
  private basketOffsetXRight: number = 10; // pixel da destra // 30
  private basketOffsetYTop: number = 30; // pixel sopra
  private basketOffsetYBottom: number = 150; // pixel sotto (base canestro)
  private basketLateralWallHeight: number = 220; // Altezza dei muri laterali in pixel (pre-scale)
  private basketLateralWallYOffset: number = 0; // Spostamento verticale delle pareti laterali
 
  private ballInBasket: boolean = false; // metodo per rilevare l'entrata della palla nel basket
 
  private scoreZone!: Phaser.GameObjects.Rectangle;
  private floorZone!: Phaser.GameObjects.Rectangle; // Zona per rilevare il tocco della palla con il pavimento
 
  private bounceBall: number = 0.59;
 
  private alphaRectangleTest: number = 0.0; //! solo per test 0.5
 
  private ballColliderRadius: number = 65; // modifica dimensione del collider della palla
 
  private ballStartX: number = 0;
  private ballStartY: number = 0;
 
  private ballFollowBasket: boolean = false;
 
  private offsetX: number = 0;
  private offsetY: number = 0;
 
  private rotationSpeed: number = 0;
  private maxRotationSpeed: number = 0.15; // Velocità massima di rotazione
  private isRotateActive: boolean = true; //! Rotazione palla. attiva o disattiva la rotazione.
 
  private isBonusCollect: boolean = false;
  private bonusObject: Phaser.GameObjects.Sprite | null = null;
  private _sparklingStarsAnimation: Phaser.GameObjects.Sprite | null = null;
  private frameRate: number = 20;
 
  private valueBonus: number = 0;
 
  // Variabili per gestire il reset automatico
  private resetTimer?: Phaser.Time.TimerEvent;
  private ballHasLanded: boolean = false;
  gameScene!: Game;
  bonusCreatedAt3: boolean = false;
  bonusCreatedAt7: boolean = false;
 
  private currentBallIndex: number = 0;
 
  private ballTextures = [
    BasketAssetConf.image.obj0,
    BasketAssetConf.image.obj1,
    BasketAssetConf.image.obj2,
    BasketAssetConf.image.obj3,
    BasketAssetConf.image.obj4,
    BasketAssetConf.image.obj5,
    BasketAssetConf.image.obj6,
    BasketAssetConf.image.obj7,
    BasketAssetConf.image.obj8,
    BasketAssetConf.image.obj9,
  ];
 
  private dragStartTime: number = 0;
 
  constructor() {
    super({key: BasketAssetConf.scene.basketManager});
  }
 
  //* Scopo: inizializza lo stato della scena con dati in input
  init(data: {typeImage: number}) {}
 
  //* Scopo: metodo principale per creare tutti gli oggetti della scena
  create() {
    this.canShoot = true;
    this.isGameOver = false;
 
    this.bonusCreatedAt3 = false;
    this.bonusCreatedAt7 = false;
 
    this.basketScale = this.gameScene.getGlobalScale();
 
    this.createWalls(); //* Scopo: crea i muri ai bordi dello schermo
    this.createBall(); //* Scopo: crea la palla con fisica e texture personalizzata
    this.createBasket(); //* Scopo: crea il canestro con pareti fisiche e area punteggio
    this.createFloorZone(); //* Scopo: crea la zona di rilevamento per il pavimento
 
    this.trajectoryLine = this.add.graphics(); //* Scopo: grafica per disegnare la traiettoria
 
    this.setupInput(); //* Scopo: imposta gli eventi per drag della palla
 
    // Imposta la camera per seguire la palla
    this.cameras.main.setBounds(0, 0, this.scale.width, this.scale.height * 2);
    //this.cameras.main.startFollow(this.ball, false, 0.1, 0.1); // la camera segue la palla
    this.cameras.main.scrollY = this.scale.height; // Sposta la camera in basso di 1 schermata
 
    this.physics.add.collider(this.ball, this.basketWalls); //* Scopo: aggiunge la collisione con il canestro
 
    // Rimuovi la vecchia collisione con le pareti per il reset - ora usa floorZone
    this.physics.add.collider(this.ball, this.walls);
 
    this.speedBall = this.gameScene.setDynamicValueBasedOnScale(750 + 300, 1300 + 500);
    console.log("this.speedBall: " + this.speedBall);
  }
 
  //* Scopo: metodo di aggiornamento frame-by-frame
  update() {
    if (this.ballFollowBasket) {
      this.ball.setPosition(this.basketImage.x + this.offsetX, this.basketImage.y + this.offsetY);
    } else {
      if (this.isRotateActive) {
        // Applica la rotazione continua alla palla
        if (Math.abs(this.rotationSpeed) > 0.001) {
          this.ball.rotation += this.rotationSpeed;
 
          // Applica attrito alla rotazione per farla diminuire gradualmente
          this.rotationSpeed *= 0.995;
 
          // Ferma la rotazione se è troppo lenta
          if (Math.abs(this.rotationSpeed) < 0.001) {
            this.rotationSpeed = 0;
          }
        }
      }
    }
  }
 
  //* Scopo: crea collegamento con la scena game
  setGameScene(scene: Game): void {
    this.gameScene = scene;
  }
 
  //* Scopo: crea una zona invisibile sopra il pavimento per rilevare quando la palla tocca terra
  private createFloorZone() {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
 
    // Dimensioni della zona: larghezza = larghezza schermo, altezza = scoreZone * 2
    const scoreZoneHeight = this.basketLateralWallHeight * this.basketScale * 0.4; // Come nello scoreZone
    const floorZoneWidth = screenWidth;
    const floorZoneHeight = scoreZoneHeight;
 
    // Posizione: centrata orizzontalmente, appena sopra il pavimento
    const wallThickness = 20;
    const floorZoneX = screenWidth / 2;
    const floorZoneY = screenHeight * 2 - wallThickness - floorZoneHeight / 2;
 
    // Crea la zona di rilevamento pavimento
    this.floorZone = this.add.rectangle(
      floorZoneX,
      floorZoneY,
      floorZoneWidth,
      floorZoneHeight,
      0x00ff00, // Verde come scoreZone
      this.alphaRectangleTest, // Stessa trasparenza per vederla
    );
 
    this.floorZone.setDepth(15);
    this.physics.add.existing(this.floorZone, true); // Statica
 
    // Aggiungi l'overlap per rilevare quando la palla tocca la zona pavimento
    this.physics.add.overlap(
      this.ball,
      this.floorZone,
      () => {
        if (!this.ballHasLanded && !this.ballInBasket) {
          this.ballHasLanded = true;
          console.log("🏀 Palla toccata zona pavimento - Reset in 2 secondi");
          this.ball.setBounce(this.bounceBall * 0.5);
 
          // Cancella timer precedente se esiste
          if (this.resetTimer) {
            this.resetTimer.destroy();
          }
 
          // Avvia timer per reset
          this.resetTimer = this.time.delayedCall(2000, () => {
            if (!this.isGameOver) {
              this.resetBall();
            }
          });
 
          if (this.isBonusCollect) {
            this.playAnimOccasionePersa(false);
          }
        }
      },
      undefined,
      this,
    );
  }
 
  //* Scopo: crea le pareti statiche ai bordi della scena per contenere la palla
  private createWalls() {
    this.walls = this.physics.add.staticGroup();
 
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const wallThickness = 20;
 
    // Parete sinistra - STATICA
    const leftWall = this.add.rectangle(
      wallThickness / 2,
      screenHeight,
      wallThickness,
      screenHeight * 2,
      0x8b4513, // <- marrone
      0.0, // <- alpha
    );
 
    this.physics.add.existing(leftWall, true); // true = statico
    this.walls.add(leftWall);
 
    // Parete destra - STATICA
    const rightWall = this.add.rectangle(
      screenWidth - wallThickness / 2,
      screenHeight,
      wallThickness,
      screenHeight * 2,
      0x8b4513, // <- marrone
      0.0, // <- alpha
    );
 
    this.physics.add.existing(rightWall, true); // true = statico
    this.walls.add(rightWall);
 
    // Parete superiore - STATICA
    const topWall = this.add.rectangle(
      screenWidth / 2,
      wallThickness / 2,
      screenWidth,
      wallThickness,
      0x8b4513, // <- marrone
      0.0, // <- alpha
    );
 
    this.physics.add.existing(topWall, true); // true = statico
    this.walls.add(topWall);
 
    // Parete inferiore - STATICA
    const bottomWall = this.add.rectangle(
      screenWidth / 2,
      screenHeight * 2 - wallThickness / 2,
      screenWidth,
      wallThickness,
      0x8b4513, // <- marrone
      0.0, // <- alpha
    );
 
    this.physics.add.existing(bottomWall, true); // true = statico
    this.walls.add(bottomWall);
  }
 
  //* Scopo: Crea la palla iniziale sospesa, senza gravità finché non viene lanciata
  private createBall() {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
 
    this.ballStartX = screenWidth / 2;
    this.ballStartY =
      screenHeight * 2 - screenHeight * this.gameScene.setDynamicValueBasedOnScale(0.15, 0.1);
 
    this.ball = this.physics.add.sprite(
      this.ballStartX,
      this.ballStartY,
      this.ballTextures[this.currentBallIndex], // Usa l’array
    );
    this.ball.setOrigin(0.5);
    this.ball.setScale(this.basketScale);
 
    const radius = this.ballColliderRadius;
    const offsetX = (this.ball.width - radius * 2) / 2;
    const offsetY = (this.ball.height - radius * 2) / 2;
 
    this.ball.setCircle(radius, offsetX, offsetY);
 
    this.ball.setBounce(this.bounceBall);
    this.ball.setDrag(100); // 50
    this.ball.setCollideWorldBounds(false);
 
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
 
    body.setAllowGravity(false);
    this.ball.setVelocity(0, 0);
 
    this.rotationSpeed = 0;
    this.ball.setRotation(0);
 
    this.physics.add.collider(this.ball, this.walls, () => {
      this.handleBallCollision();
    });
  }
 //* Scopo: crea il canestro con pareti laterali e zona punteggio usando oggetti statici
  private createBasket() {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
 
    const basketY = screenHeight * 0.6 + this.scale.height;
    const basketX = screenWidth - 20;
 
    this.basketImage = this.add
      .image(basketX, basketY, BasketAssetConf.image.basket)
      .setScale(this.basketScale)
      .setDepth(10)
      .setOrigin(1, 0.5);
 
    this.basketWalls = this.physics.add.staticGroup();
 
    const wallThickness = 20;
    const basketImageWidth = 420;
    const basketImageHeight = 380;
 
    const wallThicknessScaled = wallThickness * this.basketScale;
    const internalWidth =
      (basketImageWidth - this.basketOffsetXLeft - this.basketOffsetXRight) * this.basketScale;
    const internalHeight =
      (basketImageHeight - this.basketOffsetYTop - this.basketOffsetYBottom) * this.basketScale;
 
    const colliderCenterX =
      basketX -
      basketImageWidth * this.basketScale * this.basketImage.originX +
      (basketImageWidth * this.basketScale) / 2;
    const colliderCenterY = basketY;
 
    const lateralWallHeight = this.basketLateralWallHeight * this.basketScale;
    const lateralWallYOffset = this.basketLateralWallYOffset * this.basketScale;
 
    // Left wall
    const leftWall = this.add.rectangle(
      colliderCenterX - internalWidth / 2,
      colliderCenterY + lateralWallYOffset,
      wallThicknessScaled,
      lateralWallHeight,
      0x00aaff,
      this.alphaRectangleTest,
    );
 
    leftWall.setDepth(15);
    this.physics.add.existing(leftWall, true);
    this.basketWalls.add(leftWall);
 
    // Right wall
    const rightWall = this.add.rectangle(
      colliderCenterX + internalWidth / 2,
      colliderCenterY + lateralWallYOffset,
      wallThicknessScaled,
      lateralWallHeight,
      0x00aaff,
      this.alphaRectangleTest,
    );
 
    rightWall.setDepth(15);
    this.physics.add.existing(rightWall, true);
    this.basketWalls.add(rightWall);
 
    // Bottom wall
    const bottomWall = this.add.rectangle(
      colliderCenterX,
      colliderCenterY + internalHeight / 2,
      internalWidth,
      wallThicknessScaled,
      0x00aaff,
      this.alphaRectangleTest,
    );
 
    bottomWall.setDepth(15);
    this.physics.add.existing(bottomWall, true);
    this.basketWalls.add(bottomWall);


    this.basketWalls.children.entries.forEach((wall) => {
      const rect = wall as Phaser.GameObjects.Rectangle;
 
      (rect as RectangleWithOriginalData).originalData = {
        baseX: rect.x,
        baseY: rect.y,
        baseWidth: rect.width,
        baseHeight: rect.height,
      };
    });
 
    // metodo per rilevare l'entrata della palla nel basket e assegnare punteggio
    // Calcola le dimensioni ridotte del 20% del collider interno per assegnare punteggio
    const scoreZoneWidth = internalWidth * 0.8;
    const scoreZoneHeight = lateralWallHeight * 0.4;
 
    // === Score Zone (area interna che dà il punto) ===
    this.scoreZone = this.add.rectangle(
      colliderCenterX, // Centrato in X con la base del collider
      colliderCenterY + lateralWallYOffset + lateralWallHeight / 7 - 10, // Stessa altezza Y delle pareti laterali
      scoreZoneWidth,
      scoreZoneHeight,
      0x00ff00, // Verde per testing
      this.alphaRectangleTest, // Semi-trasparente
    );
 
    this.scoreZone.setDepth(15);
    this.physics.add.existing(this.scoreZone, true);
    this.basketWalls.add(this.scoreZone);
 
    // Attiva l'overlap per segnare punto e ridurre rimbalzo
    this.physics.add.overlap(
      this.ball,
      this.scoreZone,
      () => {
        if (!this.ballInBasket) {
          this.ballInBasket = true;
          console.log("Punto! La palla è entrata nel canestro.");
          this.gameScene.uiManager.updateScore(1 + this.valueBonus);
 
          if (this.isBonusCollect) {
            this.playAnimCanestroDoppio(false);
          }
 
          this.ball.setBounce(this.bounceBall * 0.5);
          // Riduce anche la rotazione quando entra nel canestro
          this.rotationSpeed *= 0.3;
          (this.scoreZone.body as Phaser.Physics.Arcade.Body).enable = false;
 
          // Cancella timer precedente se esiste
          if (this.resetTimer) {
            this.resetTimer.destroy();
          }
 
          // Dopo 0.1 secondi, inizia a far seguire la palla al canestro
          this.time.delayedCall(100, () => {
            this.offsetX = this.ball.x - this.basketImage.x;
            this.offsetY = this.ball.y - this.basketImage.y;
            this.ballFollowBasket = true;
            // Blocca fisica, velocità e rotazione
            const body = this.ball.body;
 
            if (body instanceof Phaser.Physics.Arcade.Body) {
              body.setVelocity(0, 0);
              body.allowGravity = false;
            }
            this.rotationSpeed = 0;
          });
 
          // Dopo 2 secondi, reset
          this.resetTimer = this.time.delayedCall(2000, () => {
            if (!this.isGameOver) {
              this.resetBall(true);
              this.repositionBasket();
              this.ballFollowBasket = false;
            }
          });
        }
      },
      undefined,
      this,
    );
 
    // Aggiungi collisioni con rotazione per le pareti del canestro
    this.physics.add.collider(this.ball, this.basketWalls, () => {
      this.handleBallCollision();
    });
  }
 
  //* Scopo: Riporta la palla alla posizione iniziale e resetta tutto per un nuovo lancio
  private resetBall(changeTexture: boolean = false) {
    console.log("Reset ball");
 
    this.isBonusCollect = false;
    this.valueBonus = 0;
 
    // Distruggi bonus e animazioni quando cambia texture
    if (changeTexture) {
      if (this.bonusObject) {
        this.bonusObject.destroy();
        this.bonusObject = null;
      }
 
      if (this._sparklingStarsAnimation) {
        this._sparklingStarsAnimation.destroy();
        this._sparklingStarsAnimation = null;
      }
    }
 
    if (this.resetTimer) {
      this.resetTimer.destroy();
      this.resetTimer = undefined;
    }
 
    // Cambia texture solo se richiesto
    if (changeTexture) {
      this.currentBallIndex = (this.currentBallIndex + 1) % this.ballTextures.length;
      this.ball.setTexture(this.ballTextures[this.currentBallIndex]);
    }
 
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
 
    this.ball.setPosition(this.ballStartX, this.ballStartY);
    this.ball.setVelocity(0, 0);
    this.ball.setBounce(this.bounceBall);
 
    this.rotationSpeed = 0;
    this.ball.setRotation(0);
 
    body.setAllowGravity(false);
 
    this.ballInBasket = false;
    this.ballHasLanded = false;
    this.canShoot = true;
 
    (this.scoreZone.body as Phaser.Physics.Arcade.Body).enable = true;
 
    console.log("Palla resettata e pronta per un nuovo tiro.");
  }
 
  //* Scopo: imposta gli input pointer per iniziare, aggiornare e terminare il drag della palla
  private setupInput() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.canShoot) {
        this.startDrag(pointer.x, pointer.y);
      }
    });
 
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.canShoot) {
        this.updateDrag(pointer.x, pointer.y);
      }
    });
 
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.canShoot) {
        this.endDrag(pointer.x, pointer.y);
      }
    });
  }
 
  //* Scopo: salva le coordinate di inizio drag e ferma la palla
  private startDrag(x: number, y: number) {
    if (!this.canShoot) return;
 
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
 
    // Ferma la palla se si sta muovendo
    this.ball.setVelocity(0, 0);
  }
 
  //* Scopo: aggiorna la posizione finale del drag e disegna la linea di traiettoria
  private updateDrag(x: number, y: number) {
    if (!this.isDragging || !this.canShoot) return;
 
    this.dragEndX = x;
    this.dragEndY = y;
 
    // Disegna la linea di traiettoria
    this.drawTrajectoryLine();
  }
 
  //* Scopo: Al rilascio, lancia la palla con forza e attiva la gravità
  private endDrag(x: number, y: number) {
    if (!this.isDragging || !this.canShoot) return;
 
    this.isDragging = false;
    this.dragEndX = x;
    this.dragEndY = y;
 
    const angle = Phaser.Math.Angle.Between(
      this.dragStartX,
      this.dragStartY,
      this.dragEndX,
      this.dragEndY,
    );
 
    const distance = Phaser.Math.Distance.Between(
      this.dragStartX,
      this.dragStartY,
      this.dragEndX,
      this.dragEndY,
    );
 
    const dragTime = this.time.now - this.dragStartTime;
 
    const timeForce = Math.min(dragTime / 1000, 1.5); //! Serve 1 secondo per max tempo, parametri da modificare per la forza applicata
    const distanceForce = Math.min(
      distance / this.gameScene.setDynamicValueBasedOnScale(300, 600),
      1.5,
    ); //! Serve 300px per max distanza, parametri da modificare per la forza applicata
    const force = Math.min(timeForce * distanceForce, 2); //! Si moltiplicano tra di loro per avere la massima forza entrambi devono essere al massimo
 
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
 
    // Attiva gravità al lancio
    body.setAllowGravity(true);
 
    const velocityX = Math.cos(angle) * this.speedBall * force;
    const velocityY = Math.sin(angle) * this.speedBall * force;
 
    body.setVelocity(velocityX, velocityY);
 
    // Calcola rotazione basata sulla velocità orizzontale
    this.rotationSpeed = (velocityX / this.speedBall) * this.maxRotationSpeed;
    // Limita la velocità di rotazione
    this.rotationSpeed = Phaser.Math.Clamp(
      this.rotationSpeed,
      -this.maxRotationSpeed,
      this.maxRotationSpeed,
    );
 
    // Disabilita il tiro fino al reset
    this.canShoot = false;
 
    this.trajectoryLine.clear();
 
    console.log("Palla lanciata!");
  }
  //* Scopo: disegna la linea verde della traiettoria + una freccia rossa per indicare la direzione
  private drawTrajectoryLine() {
    this.trajectoryLine.clear();
    this.trajectoryLine.lineStyle(4, 0x00ff00, 0.8);
 
    // Disegna una linea dalla posizione di inizio trascinamento al punto finale
    this.trajectoryLine.beginPath();
    this.trajectoryLine.moveTo(this.dragStartX, this.dragStartY);
    this.trajectoryLine.lineTo(this.dragEndX, this.dragEndY);
    this.trajectoryLine.strokePath();
 
    // Disegna una freccia alla fine per indicare la direzione
    const angle = Phaser.Math.Angle.Between(
      this.dragStartX,
      this.dragStartY,
      this.dragEndX,
      this.dragEndY,
    );
    const arrowLength = 20;
 
    this.trajectoryLine.lineStyle(3, 0xff0000, 1);
 
    // Punta della freccia
    const arrowX1 = this.dragEndX - Math.cos(angle - 0.3) * arrowLength;
    const arrowY1 = this.dragEndY - Math.sin(angle - 0.3) * arrowLength;
    const arrowX2 = this.dragEndX - Math.cos(angle + 0.3) * arrowLength;
    const arrowY2 = this.dragEndY - Math.sin(angle + 0.3) * arrowLength;
 
    this.trajectoryLine.beginPath();
    this.trajectoryLine.moveTo(this.dragEndX, this.dragEndY);
    this.trajectoryLine.lineTo(arrowX1, arrowY1);
    this.trajectoryLine.strokePath();
 
    this.trajectoryLine.beginPath();
    this.trajectoryLine.moveTo(this.dragEndX, this.dragEndY);
    this.trajectoryLine.lineTo(arrowX2, arrowY2);
    this.trajectoryLine.strokePath();
  }
 
  //* Scopo: riposiziona randomicamente la posizione del canestro
  // Sceglie casualmente tra parete sinistra (origin 0,0.5) e destra (origin 1,0.5)
  // Calcola posizione Y nel range consentito (2/5 schermo sopra, 1/5 sotto il centro)
  // Sceglie movimento: statico, verticale (su/giù per dimensione PNG), orizzontale (verso l'interno per dimensione PNG)
  // Riposiziona tutti i collider (pareti e scoreZone) in base alla nuova posizione
  // Applica animazioni Tween per i movimenti dinamici
  private repositionBasket() {
    // Ferma eventuali animazioni precedenti
    this.tweens.killAll();
 
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
 
    // Scegli parete casuale (0 = sinistra, 1 = destra)
    const wallSide = Math.floor(Math.random() * 2);
 
    // Scegli tipo di movimento (0 = statico, 1 = verticale, 2 = orizzontale)
    const movementType = Math.floor(Math.random() * 3);
 
    // Calcola posizione Y con tolleranze: centro ±1/5 verso il basso, ±2/5 verso l'alto
    const centerY = screenHeight * 0.5 + this.scale.height; // Posizione centrale attuale
    const minY = centerY - (screenHeight * 1) / 5; // 1/5 verso l'alto
    let maxY = centerY + (centerY * 1) / 6; // 1/6 verso il basso
 
    // Se il movimento è verticale, dobbiamo lasciare spazio per l'oscillazione
    let basketY: number = 0;
 
    if (movementType === 1) {
      maxY = centerY;
    }
 
    basketY = minY + Math.random() * (maxY - minY);
 
    // Calcola posizione X base
    let basketX: number;
 
    if (wallSide === 0) {
      // Parete sinistra - pivot a sinistra (origin 0, 0.5)
      basketX = 20;
      this.basketImage.setOrigin(0, 0.5);
    } else {
      // Parete destra - pivot a destra (origin 1, 0.5)
      basketX = screenWidth - 20;
      this.basketImage.setOrigin(1, 0.5);
    }
 
    // Aggiorna posizione base del canestro
    this.basketImage.setPosition(basketX, basketY);
 
    // Ricalcola le posizioni dei collider
    const basketImageWidth = 420;
    const basketImageHeight = 380;
 
    const internalWidth =
      (basketImageWidth - this.basketOffsetXLeft - this.basketOffsetXRight) * this.basketScale;
 
    const internalHeight =
      (basketImageHeight - this.basketOffsetYTop - this.basketOffsetYBottom) * this.basketScale;
 
    // Calcola centro collider basato sulla nuova posizione e origin
    let colliderCenterX: number;
 
    if (wallSide === 0) {
      // Origin 0: il punto di riferimento è il bordo sinistro
      colliderCenterX = basketX + (basketImageWidth * this.basketScale) / 2;
    } else {
      // Origin 1: il punto di riferimento è il bordo destro
      colliderCenterX = basketX - (basketImageWidth * this.basketScale) / 2;
    }
    const colliderCenterY = basketY;
 
    const lateralWallHeight = this.basketLateralWallHeight * this.basketScale;
    const lateralWallYOffset = this.basketLateralWallYOffset * this.basketScale;
 
    // Ottieni riferimenti alle pareti e aggiorna le loro posizioni
    const walls = this.basketWalls.children.entries;
    const leftWall = walls[0] as Phaser.GameObjects.Rectangle;
    const rightWall = walls[1] as Phaser.GameObjects.Rectangle;
    const bottomWall = walls[2] as Phaser.GameObjects.Rectangle;
 
    // Aggiorna posizioni base
    const baseLeftWallX = colliderCenterX - internalWidth / 2;
    const baseLeftWallY = colliderCenterY + lateralWallYOffset;
    const baseRightWallX = colliderCenterX + internalWidth / 2;
    const baseRightWallY = colliderCenterY + lateralWallYOffset;
    const baseBottomWallX = colliderCenterX;
    const baseBottomWallY = colliderCenterY + internalHeight / 2;
    const baseScoreZoneX = colliderCenterX;
    const baseScoreZoneY = colliderCenterY + lateralWallYOffset + lateralWallHeight / 7 - 10;
 
    leftWall.setPosition(baseLeftWallX, baseLeftWallY);
    rightWall.setPosition(baseRightWallX, baseRightWallY);
    bottomWall.setPosition(baseBottomWallX, baseBottomWallY);
    this.scoreZone.setPosition(baseScoreZoneX, baseScoreZoneY);
 
    // Aggiorna manualmente i body fisici statici
    (leftWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    (rightWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    (bottomWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    (this.scoreZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
 
    // Salva le posizioni base per le animazioni
    const basketElements = {
      image: this.basketImage,
      leftWall: leftWall,
      rightWall: rightWall,
      bottomWall: bottomWall,
      scoreZone: this.scoreZone,
    };
 
    // Applica movimento in base al tipo
    switch (movementType) {
      case 0:
        // Movimento statico - nessuna animazione
        break;
 
      case 1:
        // Movimento verticale - tutti gli elementi si muovono insieme
        const verticalRange = basketImageHeight * this.basketScale;
 
        this.tweens.add({
          targets: Object.values(basketElements),
          y: `+=${verticalRange / 2}`,
          duration: 2000,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
          onUpdate: () => {
            // Aggiorna i body fisici durante l'animazione
            (leftWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            (rightWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            (bottomWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            (this.scoreZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
          },
        });
        break;
 
      case 2:
        // Movimento orizzontale - tutti gli elementi si muovono insieme
        const horizontalRange = (basketImageWidth * this.basketScale * 1) / 3;
        const direction = wallSide === 0 ? 1 : -1; // Sinistra va verso destra, destra va verso sinistra
 
        this.tweens.add({
          targets: Object.values(basketElements),
          x: `+=${horizontalRange * direction}`,
          duration: 3000,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
          onUpdate: () => {
            // Aggiorna i body fisici durante l'animazione
            (leftWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            (rightWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            (bottomWall.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
            (this.scoreZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
          },
        });
        break;
    }
 
    // Forza l'aggiornamento dei body fisici rimuovendo e riaggiungendo i collider
    this.physics.world.remove(leftWall.body as Phaser.Physics.Arcade.Body);
    this.physics.world.remove(rightWall.body as Phaser.Physics.Arcade.Body);
    this.physics.world.remove(bottomWall.body as Phaser.Physics.Arcade.Body);
    this.physics.world.remove(this.scoreZone.body as Phaser.Physics.Arcade.Body);
 
    this.physics.world.add(leftWall.body as Phaser.Physics.Arcade.Body);
    this.physics.world.add(rightWall.body as Phaser.Physics.Arcade.Body);
    this.physics.world.add(bottomWall.body as Phaser.Physics.Arcade.Body);
    this.physics.world.add(this.scoreZone.body as Phaser.Physics.Arcade.Body);
 
    // creazione oggetto bonus
    const score = this.gameScene.uiManager.score;
 
    // Controllo per bonus > 3
    if (score > 3 && !this.bonusCreatedAt3) {
      this.createBonusObject(wallSide, basketY, minY, maxY, screenWidth, screenHeight);
      this.bonusCreatedAt3 = true;
    }
 
    // Controllo per bonus > 7
    if (score > 7 && !this.bonusCreatedAt7) {
      this.createBonusObject(wallSide, basketY, minY, maxY, screenWidth, screenHeight);
      this.bonusCreatedAt7 = true;
    }
 
    console.log("score: " + score);
  }
 
  private createBonusObject(
    wallSide: number,
    basketY: number,
    minY: number,
    maxY: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    // Rimuovi il bonus precedente se esiste
    if (this.bonusObject) {
      this.bonusObject.destroy();
      this.bonusObject = null;
    }
 
    // Rimuovi il _sparklingStarsAnimation precedente se esiste
    if (this._sparklingStarsAnimation) {
      this._sparklingStarsAnimation.destroy();
      this._sparklingStarsAnimation = null;
    }
 
    let bonusX: number;
    let bonusY: number;
 
    // Genera SOLO dal lato opposto al canestro
    const marginFromEdge = 128; // Margine minimo dal bordo
 
    if (wallSide === 0) {
      // Canestro a sinistra, bonus a destra
      bonusX = screenWidth - marginFromEdge - Math.random() * (screenWidth * 0.3);
    } else {
      // Canestro a destra, bonus a sinistra
      bonusX = marginFromEdge + Math.random() * (screenWidth * 0.3);
    }
 
    // Posiziona il bonus solo nella metà superiore dello schermo
    // Considerando l'offset della camera (screenHeight * 0.5 + this.scale.height)
    const cameraCenterY = screenHeight * 0.5 + this.scale.height;
    const halfScreenFromCamera = cameraCenterY - screenHeight * 0.25; // Metà schermo verso l'alto dal centro camera
 
    // Il bonus deve essere posizionato solo sopra questa linea
    const bonusMaxY = Math.min(maxY, halfScreenFromCamera);
 
    // Assicura che ci sia spazio sufficiente per posizionare il bonus
    if (bonusMaxY > minY) {
      bonusY = minY + Math.random() * (bonusMaxY - minY);
    } else {
      bonusY = minY;
    }
 
    // Crea l'oggetto bonus
    this.bonusObject = this.physics.add.sprite(bonusX, bonusY, BasketAssetConf.image.bonus);
    this.bonusObject.setOrigin(0.5);
    this.bonusObject.setScale(this.basketScale); // Usa la stessa scala del canestro o una personalizzata
    console.log("basketScale: " + this.basketScale);
 
    // animazione di scala in loop
    this.tweens.add({
      targets: this.bonusObject,
      scaleX: this.basketScale * 1.1, // Aumenta del 10%
      scaleY: this.basketScale * 1.1, // Aumenta del 10%
      duration: 500, // 500ms per andare alla scala massima
      ease: "Sine.easeInOut",
      yoyo: true, // Torna indietro automaticamente
      repeat: -1, // Ripete infinitamente
    });
 
    // Imposta il collider circolare della stessa dimensione del PNG
    const bonusRadius = Math.min(this.bonusObject.width, this.bonusObject.height) / 2;
 
    // Cast esplicito per accedere ai metodi di physics
    const bonusBody = this.bonusObject.body as Phaser.Physics.Arcade.Body;
 
    bonusBody.setCircle(bonusRadius);
 
    // Rende l'oggetto statico
    bonusBody.setImmovable(true);
    bonusBody.setAllowGravity(false);
 
    // aggiunge star stesse coordinate
    if (this.bonusObject) {
      this._sparklingStarsAnimation = this.sparklingStarsAnimation(this.bonusObject);
      this._sparklingStarsAnimation.setScale(0.5 + this.basketScale);
    }
 
    // Crea overlap con la palla
    if (this.ball) {
      this.physics.add.overlap(this.ball, this.bonusObject, () => {
        console.log("Bonus collected!");
        this.isBonusCollect = true;
        this.valueBonus = 1; // aggiunto + 1 al punteggio
 
        if (this.bonusObject) {
          const bonusAnim = this.playAnimBonus(this.bonusObject);
 
          bonusAnim.setScale(this.basketScale);
        }
 
        // Rimuove il bonus dopo la raccolta
        if (this.bonusObject) {
          this.bonusObject.destroy();
          this.bonusObject = null;
        }
 
        // Rimuove il _sparklingStarsAnimation dopo la raccolta
        if (this._sparklingStarsAnimation) {
          this._sparklingStarsAnimation.destroy();
          this._sparklingStarsAnimation = null;
        }
      });
    }
  }
  //* Scopo: Gestisce le collisioni della palla e modifica la rotazione
  private handleBallCollision() {
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
 
    // Modifica la rotazione in base alla velocità dopo la collisione
    this.rotationSpeed = (body.velocity.x / this.speedBall) * this.maxRotationSpeed * 0.8;
    // Applica un fattore di riduzione per simulare l'attrito
    this.rotationSpeed = Phaser.Math.Clamp(
      this.rotationSpeed,
      -this.maxRotationSpeed,
      this.maxRotationSpeed,
    );
  }
 
  public gameOver() {
    if (this.ball) {
      this.ball.destroy();
    }
 
    if (this.basketImage) {
      this.basketImage.destroy();
    }
 
    if (this.bonusObject) {
      this.bonusObject.destroy();
    }
  }
 
  // metodi animazioni
  // Avvia l'animazione delle stelle in loop nella posizione dell'oggetto
  sparklingStarsAnimation(object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const {x, y} = object; // Prendi le coordinate dell'oggetto
 
    const newAnimation = this.#createAnimation(
      BasketAssetConf.keyAnim.sparklingStars,
      BasketAssetConf.spritesheet.sparklingStars.key,
      17,
      x,
      y,
      true,
    );
 
    newAnimation.setVisible(true);
    newAnimation.play(BasketAssetConf.keyAnim.sparklingStars);
 
    return newAnimation;
  }
 
  //* Animazioni
  // Avvia l'animazione delle stelle in loop nella posizione dell'oggetto
  playAnimBonus(object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
    const {x, y} = object; // Prendi le coordinate dell'oggetto
 
    const newAnimation = this.#createAnimation(
      BasketAssetConf.keyAnim.animBonus,
      BasketAssetConf.spritesheet.animBonus.key,
      20,
      x,
      y,
      false,
      1.1,
    );
 
    newAnimation.setVisible(true);
    newAnimation.play(BasketAssetConf.keyAnim.animBonus);
 
    //Distrugge l'animazione dopo la durata dell'animazione stessa
    this.time.delayedCall((20 / this.frameRate) * 1000, () => {
      newAnimation.destroy();
    });
 
    return newAnimation;
  }
 
  // Crea una nuova animazione nella scena alle coordinate date
  #createAnimation(
    animKey: string,
    spriteKey: string,
    frameEnd: number,
    x: number,
    y: number,
    loop: boolean = false, // nuovo parametro
    velocityFrameRate: number = 1,
  ) {
    // Controlla se l'animazione esiste già, altrimenti la crea
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(spriteKey, {start: 0, end: frameEnd}),
        frameRate: this.frameRate * velocityFrameRate,
        repeat: loop ? -1 : 0, // se loop true → -1, altrimenti 0
      });
    }
 
    // Crea una nuova istanza dell'animazione
    return this.add
      .sprite(x, y, spriteKey)
      .setOrigin(0.5)
      .setVisible(false)
      .setScale(1)
      .setDepth(2);
  }
 
  playAnimOccasionePersa(loop: boolean = false): Phaser.GameObjects.Sprite {
    const cam = this.cameras.main;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
 
    const animKey = BasketAssetConf.keyAnim.animOccasionePersa;
 
    // Crea l'animazione una sola volta
    if (!this.anims.exists(animKey)) {
      const k1 = BasketAssetConf.spritesheet.animOccasionePersa_1di3.key;
      const k2 = BasketAssetConf.spritesheet.animOccasionePersa_2di3.key;
      const k3 = BasketAssetConf.spritesheet.animOccasionePersa_3di3.key;
 
      const f1 = this.anims.generateFrameNumbers(k1, {start: 0, end: 9}); // 10 frame
      const f2 = this.anims.generateFrameNumbers(k2, {start: 0, end: 9}); // 10 frame
      const f3 = this.anims.generateFrameNumbers(k3, {start: 0, end: 0}); // 1 frame
 
      this.anims.create({
        key: animKey,
        frames: [...f1, ...f2, ...f3],
        frameRate: this.frameRate,
        repeat: loop ? -1 : 0,
      });
    }
 
    // Usa il primo sheet come texture di base per lo sprite
    const sprite = this.add
      .sprite(cx, cy, BasketAssetConf.spritesheet.animOccasionePersa_1di3.key)
      .setOrigin(0.5)
      .setScrollFactor(0) // sempre al centro dello schermo (UI / overlay)
      .setScale(this.basketScale)
      .setDepth(1000);
 
    sprite.play(animKey);
 
    // Se NON in loop, distruggi al termine
    if (!loop) {
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        sprite.destroy();
      });
    }
 
    return sprite;
  }
 
  playAnimCanestroDoppio(loop: boolean = false): Phaser.GameObjects.Sprite {
    const cam = this.cameras.main;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
 
    const animKey = BasketAssetConf.keyAnim.animCanestroDoppio;
 
    // Crea l'animazione una sola volta
    if (!this.anims.exists(animKey)) {
      const k1 = BasketAssetConf.spritesheet.animCanestroDoppio_1di2.key;
      const k2 = BasketAssetConf.spritesheet.animCanestroDoppio_2di2.key;
 
      const f1 = this.anims.generateFrameNumbers(k1, {start: 0, end: 14}); // 15 frame
      const f2 = this.anims.generateFrameNumbers(k2, {start: 0, end: 5}); // 6 frame
 
      this.anims.create({
        key: animKey,
        frames: [...f1, ...f2],
        frameRate: this.frameRate,
        repeat: loop ? -1 : 0,
      });
    }
 
    // Usa il primo sheet come texture di base per lo sprite
    const sprite = this.add
      .sprite(cx, cy, BasketAssetConf.spritesheet.animCanestroDoppio_1di2.key)
      .setOrigin(0.5)
      .setScrollFactor(0) // sempre al centro dello schermo (UI / overlay)
      .setScale(this.basketScale)
      .setDepth(1000);
 
    sprite.play(animKey);
 
    // Se NON in loop, distruggi al termine
    if (!loop) {
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        sprite.destroy();
      });
    }
 
    return sprite;
  }
}