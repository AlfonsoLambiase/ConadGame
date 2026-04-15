import * as Phaser from "phaser";

import {AudioManager} from "../components/audioManager";
import {Puzzle2026AssetConf} from "../shared/config/asset-conf.const";

import {Game} from "./game";

const assetConf = Puzzle2026AssetConf;

type PuzzlePieceMeta = {
  row: number;
  col: number;
  correctIndex: number;
  cellIndex: number;
  w: number;
  h: number;
};

/** Container: [0]=Image card, [1]=Graphics bordo bianco */
type PuzzlePieceRoot = Phaser.GameObjects.Container;

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  private mainContainer!: Phaser.GameObjects.Container;
  private piecesContainer!: Phaser.GameObjects.Container;

  /** Griglia puzzle: maxScore UI = puzzleRows × puzzleCols (modificabili). */
  private puzzleRows = 3;
  private puzzleCols = 3;

  private readonly BG_W = 920;
  private readonly BG_H = 1345;
  private readonly CARD_MAX_W = 900;
  private readonly CARD_MAX_H = 1345;

  private cardDisplayW = this.CARD_MAX_W;
  private cardDisplayH = this.CARD_MAX_H;

  private cellCenters: Phaser.Math.Vector2[] = [];
  private piecesByCellIndex: (PuzzlePieceRoot | null)[] = [];

  private static readonly PIECE_BORDER_WIDTH = 5;
  private static readonly PIECE_BORDER_CORNER_RADIUS = 8;
  private static readonly TILE_SEAM_OVERLAP = 2;

  private activeDragClusterCellIndices: number[] | null = null;
  private activeDragStartPositions: Map<PuzzlePieceRoot, Phaser.Math.Vector2> = new Map();
  private activeDragAnchorStart: Phaser.Math.Vector2 | null = null;
  private activeDragAnchorFromCellIndex: number | null = null;

  /** Dopo una mossa, check vittoria ritardato (snap + eventuale pulse merge prima di coriandoli / fine gioco). */
  private checkGameOverDelayedEvent: Phaser.Time.TimerEvent | null = null;

  private static readonly STAR_TEXTURE_KEY = "__puzzle_star__";

  private static readonly MERGE_WORDS: Array<{min: number; words: string[]}> = [
    {min: 3, words: ["Bene!", "Bravo!", "Ottimo!"]},
    {min: 5, words: ["Eccellente!", "Fantastico!", "Magnifico!"]},
    {min: 7, words: ["Incredibile!", "Spettacolare!", "Leggendario!"]},
    {min: 9, words: ["PERFETTO!", "PUZZLE COMPLETO!"]},
  ];

  private static readonly MERGE_PULSE_DELAY_MS = 140;
  private static readonly MERGE_PULSE_SCALE = 1.06;
  private static readonly MERGE_PULSE_UP_MS = 160;
  private static readonly MERGE_PULSE_DOWN_MS = 200;

  private static readonly CHECK_GAME_OVER_AFTER_MS =
    140 +
    GameManager.MERGE_PULSE_DELAY_MS +
    GameManager.MERGE_PULSE_UP_MS +
    GameManager.MERGE_PULSE_DOWN_MS +
    80;

  /** Max dimensione cluster collegato dopo l’ultima mossa (null = non ancora inizializzato). */
  private prevMaxLinkedSize: number | null = null;

  /** Numero di coppie adiacenti collegate (per rilevare nuove unioni senza crescita del max). */
  private prevLinkedEdgeCount: number | null = null;

  constructor() {
    super({key: assetConf.scene.gameManager});
  }

  init(data: {gameScene?: Game}) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
  }

  create() {
    console.log("Start Scene GameManager Puzzle 2026");
    this.computeLayoutDimensions();
    this.ensureStarTexture();

    this.logLoadedImageSizes();
    this.createPuzzleStep1();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });
  }

  /** Numero totale di card in griglia (= max score). */
  private getTotalGridCells(): number {
    return this.puzzleRows * this.puzzleCols;
  }

  private logLoadedImageSizes(): void {
    const logSize = (key: string) => {
      const tex = this.textures.get(key);
      const src = tex?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
      const w = src?.width;
      const h = src?.height;

      console.log(`[Puzzle2026] texture "${key}" size:`, {w, h});
    };

    logSize(assetConf.image.bg_card);
    logSize(assetConf.image.card_1);
  }

  private createPuzzleStep1(): void {
    const scaleGame = this.gameScene.setDynamicValueBasedOnScale(0.65, 1.15);
    const padding = 40;
    const fitScale = Math.min(
      (this.cameras.main.height - padding * 2) / this.BG_H,
      (this.cameras.main.width - padding * 2) / this.BG_W,
      1,
    );

    if (this.mainContainer) this.mainContainer.destroy(true);

    const yTop = this.gameScene.uiManager.getScoreHudBottomY();
    const yBottom = this.gameScene.uiManager.getHelpButtonTopY();
    const puzzleCenterY = (yTop + yBottom) / 2;

    this.mainContainer = this.add.container(this.cameras.main.centerX, puzzleCenterY);
    this.mainContainer.setScale(scaleGame * fitScale);

    const bg = this.add.image(0, 0, assetConf.image.bg_card).setOrigin(0.5);

    bg.setDisplaySize(this.BG_W, this.BG_H);

    this.piecesContainer = this.add.container(0, 0);
    this.mainContainer.add([bg, this.piecesContainer]);

    this.computeCardDisplaySize();
    this.buildGridCellCenters({rows: this.puzzleRows, cols: this.puzzleCols});

    this.spawnPuzzlePieces({
      rows: this.puzzleRows,
      cols: this.puzzleCols,
    });

    this.gameScene.uiManager.setPuzzleMaxScore(this.getTotalGridCells());
    this.afterPuzzleMove();
  }

  private computeCardDisplaySize(): void {
    const texKey = assetConf.image.card_1;
    const tex = this.textures.get(texKey);
    const src = tex?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
    const srcW = src?.width ?? this.CARD_MAX_W;
    const srcH = src?.height ?? this.CARD_MAX_H;

    const s = Math.min(this.CARD_MAX_W / srcW, this.CARD_MAX_H / srcH);

    this.cardDisplayW = Math.round(srcW * s);
    this.cardDisplayH = Math.round(srcH * s);
  }

  private buildGridCellCenters(params: {rows: number; cols: number}): void {
    const {rows, cols} = params;

    const boardLeft = -this.cardDisplayW / 2;
    const boardTop = -this.cardDisplayH / 2;

    const tileDisplayW = this.cardDisplayW / cols;
    const tileDisplayH = this.cardDisplayH / rows;

    this.cellCenters = [];
    this.piecesByCellIndex = Array.from({length: rows * cols}, () => null);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = boardLeft + c * tileDisplayW + tileDisplayW / 2;
        const y = boardTop + r * tileDisplayH + tileDisplayH / 2;

        this.cellCenters.push(new Phaser.Math.Vector2(x, y));
      }
    }
  }

  private getRowCol(cellIndex: number): {row: number; col: number} {
    return {
      row: Math.floor(cellIndex / this.puzzleCols),
      col: cellIndex % this.puzzleCols,
    };
  }

  private getCellIndex(row: number, col: number): number {
    return row * this.puzzleCols + col;
  }

  private getNearestCellIndex(x: number, y: number): number {
    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.cellCenters.length; i++) {
      const center = this.cellCenters[i];
      const d = Phaser.Math.Distance.Between(x, y, center.x, center.y);

      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private computeTranslatedCells(
    cellIndices: number[],
    dRow: number,
    dCol: number,
  ): number[] | null {
    const result: number[] = [];

    for (const cellIndex of cellIndices) {
      const rc = this.getRowCol(cellIndex);
      const nr = rc.row + dRow;
      const nc = rc.col + dCol;

      if (nr < 0 || nr >= this.puzzleRows || nc < 0 || nc >= this.puzzleCols) {
        return null;
      }

      result.push(this.getCellIndex(nr, nc));
    }

    return result;
  }

  private forceSnapAllToGrid(): void {
    for (let i = 0; i < this.piecesByCellIndex.length; i++) {
      const p = this.piecesByCellIndex[i];

      if (!p) continue;

      this.tweens.killTweensOf(p);
      const center = this.cellCenters[i];

      p.setPosition(center.x, center.y);
      p.setScale(1);
    }
  }

  private rebuildPiecesByCellIndex(): void {
    const total = this.puzzleRows * this.puzzleCols;
    const next: (PuzzlePieceRoot | null)[] = Array.from({length: total}, () => null);

    for (const obj of this.piecesContainer?.list ?? []) {
      if (!this.isPieceRoot(obj)) continue;

      const meta = obj.getData("meta") as PuzzlePieceMeta | undefined;
      const idx = meta?.cellIndex;

      if (typeof idx !== "number") continue;
      if (idx < 0 || idx >= total) continue;

      next[idx] = obj;
    }

    this.piecesByCellIndex = next;
  }

  private isPieceRoot(obj: Phaser.GameObjects.GameObject): obj is PuzzlePieceRoot {
    return obj instanceof Phaser.GameObjects.Container && obj.getData("isPuzzlePiece") === true;
  }

  private edgeLinked(cellIndex: number, neighborIndex: number, selfMeta: PuzzlePieceMeta): boolean {
    const nb = this.piecesByCellIndex[neighborIndex];

    if (!nb) return false;

    const nmeta = nb.getData("meta") as PuzzlePieceMeta | undefined;

    if (!nmeta) return false;

    return this.arePiecesLinked(selfMeta, nmeta);
  }

  private drawPieceBorder(root: PuzzlePieceRoot): void {
    const meta = root.getData("meta") as PuzzlePieceMeta | undefined;
    const border = root.getAt(1) as Phaser.GameObjects.Graphics | undefined;

    if (!meta || !border) return;

    const ci = meta.cellIndex;
    const {row, col} = this.getRowCol(ci);
    const w = meta.w;
    const h = meta.h;
    const hw = w / 2;
    const hh = h / 2;
    const lw = GameManager.PIECE_BORDER_WIDTH;
    const rad = GameManager.PIECE_BORDER_CORNER_RADIUS;
    const inset = lw / 2;

    const linkedUp = row > 0 && this.edgeLinked(ci, ci - this.puzzleCols, meta);
    const linkedDown = row < this.puzzleRows - 1 && this.edgeLinked(ci, ci + this.puzzleCols, meta);
    const linkedLeft = col > 0 && this.edgeLinked(ci, ci - 1, meta);
    const linkedRight = col < this.puzzleCols - 1 && this.edgeLinked(ci, ci + 1, meta);

    const showTop = !linkedUp;
    const showBottom = !linkedDown;
    const showLeft = !linkedLeft;
    const showRight = !linkedRight;

    border.clear();
    border.lineStyle(lw, 0xffffff, 1);

    if (showTop && showBottom && showLeft && showRight) {
      border.strokeRoundedRect(-hw + inset, -hh + inset, w - 2 * inset, h - 2 * inset, rad);

      return;
    }

    const edgePad = Math.min(rad, lw * 2);

    if (showTop) {
      border.beginPath();
      border.moveTo(-hw + (showLeft ? edgePad : 0), -hh);
      border.lineTo(hw - (showRight ? edgePad : 0), -hh);
      border.strokePath();
    }

    if (showRight) {
      border.beginPath();
      border.moveTo(hw, -hh + (showTop ? edgePad : 0));
      border.lineTo(hw, hh - (showBottom ? edgePad : 0));
      border.strokePath();
    }

    if (showBottom) {
      border.beginPath();
      border.moveTo(hw - (showRight ? edgePad : 0), hh);
      border.lineTo(-hw + (showLeft ? edgePad : 0), hh);
      border.strokePath();
    }

    if (showLeft) {
      border.beginPath();
      border.moveTo(-hw, hh - (showBottom ? edgePad : 0));
      border.lineTo(-hw, -hh + (showTop ? edgePad : 0));
      border.strokePath();
    }
  }

  private redrawAllPieceBorders(): void {
    for (const obj of this.piecesContainer?.list ?? []) {
      if (this.isPieceRoot(obj)) {
        this.drawPieceBorder(obj);
      }
    }
  }

  private getLinkedClusterFromCell(cellIndex: number): number[] {
    this.rebuildPiecesByCellIndex();

    const piece = this.piecesByCellIndex[cellIndex];
    const meta = piece?.getData("meta") as PuzzlePieceMeta | undefined;

    if (!piece || !meta) return [cellIndex];

    const visited = new Set<number>();
    const queue: number[] = [cellIndex];

    visited.add(cellIndex);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const {row, col} = this.getRowCol(current);

      const currentPiece = this.piecesByCellIndex[current];
      const currentMeta = currentPiece?.getData("meta") as PuzzlePieceMeta | undefined;

      if (!currentPiece || !currentMeta) continue;

      const neighbors: Array<{row: number; col: number}> = [
        {row: row - 1, col},
        {row: row + 1, col},
        {row, col: col - 1},
        {row, col: col + 1},
      ];

      for (const n of neighbors) {
        if (n.row < 0 || n.row >= this.puzzleRows || n.col < 0 || n.col >= this.puzzleCols) {
          continue;
        }

        const ni = this.getCellIndex(n.row, n.col);

        if (visited.has(ni)) continue;

        const np = this.piecesByCellIndex[ni];
        const nmeta = np?.getData("meta") as PuzzlePieceMeta | undefined;

        if (!np || !nmeta) continue;
        if (!this.arePiecesLinked(currentMeta, nmeta)) continue;

        visited.add(ni);
        queue.push(ni);
      }
    }

    return Array.from(visited).sort((a, b) => a - b);
  }

  private getCorrectRowCol(correctIndex: number): {row: number; col: number} {
    return {
      row: Math.floor(correctIndex / this.puzzleCols),
      col: correctIndex % this.puzzleCols,
    };
  }

  private arePiecesLinked(a: PuzzlePieceMeta, b: PuzzlePieceMeta): boolean {
    const aCur = this.getRowCol(a.cellIndex);
    const bCur = this.getRowCol(b.cellIndex);
    const dCurRow = bCur.row - aCur.row;
    const dCurCol = bCur.col - aCur.col;

    const isAdjacentNow =
      (Math.abs(dCurRow) === 1 && dCurCol === 0) || (Math.abs(dCurCol) === 1 && dCurRow === 0);

    if (!isAdjacentNow) return false;

    const aCor = this.getCorrectRowCol(a.correctIndex);
    const bCor = this.getCorrectRowCol(b.correctIndex);
    const dCorRow = bCor.row - aCor.row;
    const dCorCol = bCor.col - aCor.col;

    return dCurRow === dCorRow && dCurCol === dCorCol;
  }

  /**
   * Union-find sui pezzi collegati (arePiecesLinked): maxSize, cluster più grande, archi, tutti i cluster.
   */
  private getLinkedClusterAnalysis(): {
    maxSize: number;
    largestClusterCells: number[];
    linkedEdgeCount: number;
    clusters: number[][];
  } {
    this.rebuildPiecesByCellIndex();
    const total = this.puzzleRows * this.puzzleCols;
    const parent = Array.from({length: total}, (_, i) => i);

    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }

      return parent[x];
    };

    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);

      if (ra !== rb) {
        parent[rb] = ra;
      }
    };

    let linkedEdgeCount = 0;

    for (let i = 0; i < total; i++) {
      const p = this.piecesByCellIndex[i];

      if (!p) continue;

      const meta = p.getData("meta") as PuzzlePieceMeta | undefined;

      if (!meta) continue;

      const {row, col} = this.getRowCol(i);

      if (col + 1 < this.puzzleCols) {
        const j = i + 1;
        const np = this.piecesByCellIndex[j];
        const nmeta = np?.getData("meta") as PuzzlePieceMeta | undefined;

        if (np && nmeta && this.arePiecesLinked(meta, nmeta)) {
          union(i, j);
          linkedEdgeCount++;
        }
      }

      if (row + 1 < this.puzzleRows) {
        const j = i + this.puzzleCols;
        const np = this.piecesByCellIndex[j];
        const nmeta = np?.getData("meta") as PuzzlePieceMeta | undefined;

        if (np && nmeta && this.arePiecesLinked(meta, nmeta)) {
          union(i, j);
          linkedEdgeCount++;
        }
      }
    }

    const byRoot = new Map<number, number[]>();

    for (let i = 0; i < total; i++) {
      if (!this.piecesByCellIndex[i]) continue;

      const r = find(i);
      const list = byRoot.get(r);

      if (list) {
        list.push(i);
      } else {
        byRoot.set(r, [i]);
      }
    }

    let maxSize = 0;
    let largestClusterCells: number[] = [];

    for (const cells of byRoot.values()) {
      if (cells.length > maxSize) {
        maxSize = cells.length;
        largestClusterCells = cells;
      }
    }

    const clusters = Array.from(byRoot.values());

    return {maxSize, largestClusterCells, linkedEdgeCount, clusters};
  }

  /** Cluster con meno tessere tra quelli di dimensione ≥ 2 (es. nuova coppia mentre esiste un blocco più grande). */
  private pickSmallestMultiCellCluster(clusters: number[][]): number[] | null {
    let best: number[] | null = null;

    for (const c of clusters) {
      if (c.length < 2) continue;

      if (best === null || c.length < best.length) {
        best = c;
      }
    }

    return best;
  }

  /**
   * Dimensione del gruppo collegato più grande (stessa logica arePiecesLinked).
   * Due gruppi 2+2 → 2; 3+2 → 3; un solo blocco da 9 → 9.
   */
  private computeLinkedGroupScore(): number {
    return this.getLinkedClusterAnalysis().maxSize;
  }

  /**
   * Scala il blocco attorno al centro del bbox senza reparent (evita scatti / ordine lista).
   * Per ogni s: pos = pivot + s * (pos0 - pivot), scale = s (rettangoli allineati agli assi).
   */
  private scheduleMergePulse(roots: PuzzlePieceRoot[]): void {
    const unique = [...new Set(roots)];

    if (unique.length < 2) return;

    this.time.delayedCall(GameManager.MERGE_PULSE_DELAY_MS, () => {
      const alive = unique.filter((r) => r.active && r.scene === this);

      if (alive.length < 2) return;

      const saved = alive.map((r) => {
        const meta = r.getData("meta") as PuzzlePieceMeta | undefined;
        const center = meta ? this.cellCenters[meta.cellIndex] : null;
        const cx = center ? center.x : r.x;
        const cy = center ? center.y : r.y;

        this.tweens.killTweensOf(r);
        r.setPosition(cx, cy);

        return {r, cx, cy};
      });

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const {cx, cy} of saved) {
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
      }

      const px = (minX + maxX) / 2;
      const py = (minY + maxY) / 2;

      const applyBlockScale = (s: number) => {
        for (const {r, cx, cy} of saved) {
          if (!r.active) continue;

          r.x = px + s * (cx - px);
          r.y = py + s * (cy - py);
          r.setScale(s);
        }
      };

      const state = {s: 1};

      this.tweens.add({
        targets: state,
        s: GameManager.MERGE_PULSE_SCALE,
        duration: GameManager.MERGE_PULSE_UP_MS,
        ease: "Back.easeOut",
        onUpdate: () => applyBlockScale(state.s),
        onComplete: () => {
          this.tweens.add({
            targets: state,
            s: 1,
            duration: GameManager.MERGE_PULSE_DOWN_MS,
            ease: "Sine.easeInOut",
            onUpdate: () => applyBlockScale(state.s),
            onComplete: () => {
              this.forceSnapAllToGrid();
            },
          });
        },
      });
    });
  }

  private ensureStarTexture(): void {
    const key = GameManager.STAR_TEXTURE_KEY;

    if (this.textures.exists(key)) return;

    const size = 32;
    const g = this.add.graphics().setVisible(false);
    const cx = size / 2;
    const cy = size / 2;
    const spikes = 5;
    const outerR = size / 2 - 1;
    const innerR = outerR * 0.4;

    g.fillStyle(0xffffff, 1);
    g.beginPath();

    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;

      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }

    g.closePath();
    g.fillPath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private emitStarParticles(cellIndices: number[]): void {
    const clusterSet = new Set(cellIndices);
    const cornerKeys = new Set<string>();
    const outerCorners: Phaser.Math.Vector2[] = [];

    for (const ci of cellIndices) {
      const center = this.cellCenters[ci];

      if (!center) continue;

      const piece = this.piecesByCellIndex[ci];
      const meta = piece?.getData("meta") as PuzzlePieceMeta | undefined;

      if (!meta) continue;

      const hw = meta.w / 2;
      const hh = meta.h / 2;
      const {row, col} = this.getRowCol(ci);

      const corners: Array<{dx: number; dy: number; neighbors: [number, number][]}> = [
        {
          dx: -hw,
          dy: -hh,
          neighbors: [
            [row - 1, col - 1],
            [row - 1, col],
            [row, col - 1],
          ],
        },
        {
          dx: hw,
          dy: -hh,
          neighbors: [
            [row - 1, col + 1],
            [row - 1, col],
            [row, col + 1],
          ],
        },
        {
          dx: -hw,
          dy: hh,
          neighbors: [
            [row + 1, col - 1],
            [row + 1, col],
            [row, col - 1],
          ],
        },
        {
          dx: hw,
          dy: hh,
          neighbors: [
            [row + 1, col + 1],
            [row + 1, col],
            [row, col + 1],
          ],
        },
      ];

      for (const {dx, dy, neighbors} of corners) {
        const allInCluster = neighbors.every(([nr, nc]) => {
          if (nr < 0 || nr >= this.puzzleRows || nc < 0 || nc >= this.puzzleCols) return false;

          return clusterSet.has(this.getCellIndex(nr, nc));
        });

        if (allInCluster) continue;

        const wx = Math.round(center.x + dx);
        const wy = Math.round(center.y + dy);
        const key = `${wx},${wy}`;

        if (cornerKeys.has(key)) continue;

        cornerKeys.add(key);
        outerCorners.push(new Phaser.Math.Vector2(center.x + dx, center.y + dy));
      }
    }

    for (const corner of outerCorners) {
      const emitter = this.add.particles(corner.x, corner.y, GameManager.STAR_TEXTURE_KEY, {
        speed: {min: 60, max: 180},
        scale: {start: 1.6, end: 0},
        alpha: {start: 1, end: 0},
        lifespan: 1400,
        tint: [0xffff00, 0xffd700, 0xffffff, 0xffe066],
        gravityY: 40,
        rotate: {min: 0, max: 360},
        emitting: false,
      });

      this.piecesContainer.add(emitter);
      emitter.explode(8);

      this.time.delayedCall(2000, () => {
        if (emitter.active) emitter.destroy();
      });
    }
  }

  private showMergeWord(cellIndices: number[]): void {
    const size = cellIndices.length;

    let wordPool: string[] | null = null;

    for (const tier of GameManager.MERGE_WORDS) {
      if (size >= tier.min) wordPool = tier.words;
    }

    if (!wordPool) return;

    const word = Phaser.Utils.Array.GetRandom(wordPool) as string;

    let cx = 0;
    let cy = 0;

    for (const ci of cellIndices) {
      const center = this.cellCenters[ci];

      if (!center) continue;

      cx += center.x;
      cy += center.y;
    }

    cx /= cellIndices.length;
    cy /= cellIndices.length;

    const fontSize = Math.min(36 + size * 4, 64);

    const text = this.add
      .text(cx, cy, word, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        stroke: "#ff8800",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.3)
      .setDepth(100);

    this.piecesContainer.add(text);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1.2,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          scale: 1.8,
          y: cy - 40,
          duration: 600,
          ease: "Sine.easeIn",
          delay: 400,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private isPuzzleSolved(): boolean {
    this.rebuildPiecesByCellIndex();
    const total = this.puzzleRows * this.puzzleCols;

    for (let i = 0; i < total; i++) {
      const p = this.piecesByCellIndex[i];

      if (!p) return false;

      const meta = p.getData("meta") as PuzzlePieceMeta | undefined;

      if (!meta || meta.cellIndex !== meta.correctIndex) return false;
    }

    return true;
  }

  private afterPuzzleMove(): void {
    const {maxSize, largestClusterCells, linkedEdgeCount, clusters} =
      this.getLinkedClusterAnalysis();

    const maxGrew =
      this.prevMaxLinkedSize !== null && maxSize > this.prevMaxLinkedSize && maxSize >= 2;
    const edgesGrew =
      this.prevLinkedEdgeCount !== null &&
      linkedEdgeCount > this.prevLinkedEdgeCount &&
      maxSize >= 2;

    let pulseCellIndices: number[] | null = null;

    if (maxGrew) {
      pulseCellIndices = largestClusterCells;
    } else if (edgesGrew) {
      pulseCellIndices = this.pickSmallestMultiCellCluster(clusters);
    }

    if (pulseCellIndices && pulseCellIndices.length >= 2) {
      console.log(
        `[Puzzle2026] Uniti pezzi! Cluster di ${pulseCellIndices.length} celle:`,
        pulseCellIndices,
      );

      this.gameScene.audioManager.playAudio(assetConf.audio.mergeCard);

      const pulseRoots = pulseCellIndices
        .map((i) => this.piecesByCellIndex[i])
        .filter((r): r is PuzzlePieceRoot => r !== null);

      this.scheduleMergePulse(pulseRoots);
      this.emitStarParticles(pulseCellIndices);

      if (pulseCellIndices.length >= 3) {
        this.showMergeWord(pulseCellIndices);
      }
    }

    this.prevMaxLinkedSize = maxSize;
    this.prevLinkedEdgeCount = linkedEdgeCount;

    this.redrawAllPieceBorders();
    this.gameScene.uiManager.setPuzzleScoreImmediate(maxSize);
    this.scheduleCheckGameOverAfterMove();
  }

  private scheduleCheckGameOverAfterMove(): void {
    if (this.checkGameOverDelayedEvent) {
      this.checkGameOverDelayedEvent.remove(false);
      this.checkGameOverDelayedEvent = null;
    }

    this.checkGameOverDelayedEvent = this.time.delayedCall(
      GameManager.CHECK_GAME_OVER_AFTER_MS,
      () => {
        this.checkGameOverDelayedEvent = null;
        this.checkGameOver();
      },
    );
  }

  private spawnPuzzlePieces(params: {rows: number; cols: number}): void {
    const {rows, cols} = params;

    const texKey = assetConf.image.card_1;
    const tex = this.textures.get(texKey);
    const source = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
    const srcW = source?.width ?? this.CARD_MAX_W;
    const srcH = source?.height ?? this.CARD_MAX_H;

    const tileSrcW = srcW / cols;
    const tileSrcH = srcH / rows;

    const tileDisplayW = this.cardDisplayW / cols;
    const tileDisplayH = this.cardDisplayH / rows;

    this.piecesContainer.removeAll(true);

    this.prevMaxLinkedSize = null;
    this.prevLinkedEdgeCount = null;

    const framePrefix = `pzl_${rows}x${cols}_`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const frameName = `${framePrefix}${r}_${c}`;

        if (!tex.has(frameName)) {
          tex.add(frameName, 0, c * tileSrcW, r * tileSrcH, tileSrcW, tileSrcH);
        }
      }
    }

    const total = rows * cols;
    const cellPermutation: number[] = Array.from({length: total}, (_, i) => i);

    Phaser.Utils.Array.Shuffle(cellPermutation);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const correctIndex = r * cols + c;
        const cellIndex = cellPermutation[correctIndex]!;
        const cellCenter = this.cellCenters[cellIndex];

        const frameName = `${framePrefix}${r}_${c}`;
        const root = this.add.container(cellCenter.x, cellCenter.y);

        const card = this.add.image(0, 0, texKey, frameName).setOrigin(0.5);
        const overlap = GameManager.TILE_SEAM_OVERLAP;

        card.setDisplaySize(tileDisplayW + overlap, tileDisplayH + overlap);

        const border = this.add.graphics();

        root.add([card, border]);
        card.setDepth(0);
        border.setDepth(1);

        const hit = new Phaser.Geom.Rectangle(
          -tileDisplayW / 2,
          -tileDisplayH / 2,
          tileDisplayW,
          tileDisplayH,
        );

        root.setInteractive({
          hitArea: hit,
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          draggable: true,
          useHandCursor: true,
        });
        this.input.setDraggable(root);

        const meta: PuzzlePieceMeta = {
          row: r,
          col: c,
          correctIndex,
          cellIndex,
          w: tileDisplayW,
          h: tileDisplayH,
        };

        root.setData("isPuzzlePiece", true);
        root.setData("meta", meta);

        this.piecesByCellIndex[cellIndex] = root;

        root.on(Phaser.Input.Events.DRAG_START, () => {
          this.gameScene.audioManager.playAudio(assetConf.audio.selectCard);
          this.rebuildPiecesByCellIndex();
          this.forceSnapAllToGrid();

          this.piecesContainer.bringToTop(root);
          root.setDepth(10);

          const m = root.getData("meta") as PuzzlePieceMeta | undefined;
          const fromCellIndex = m?.cellIndex ?? null;

          this.activeDragClusterCellIndices =
            fromCellIndex !== null ? this.getLinkedClusterFromCell(fromCellIndex) : null;

          const anchorCenter = fromCellIndex !== null ? this.cellCenters[fromCellIndex] : null;

          this.activeDragAnchorStart = anchorCenter
            ? new Phaser.Math.Vector2(anchorCenter.x, anchorCenter.y)
            : new Phaser.Math.Vector2(root.x, root.y);
          this.activeDragAnchorFromCellIndex = fromCellIndex;

          this.activeDragStartPositions.clear();

          if (this.activeDragClusterCellIndices && this.activeDragClusterCellIndices.length > 1) {
            for (const ci of this.activeDragClusterCellIndices) {
              const p = this.piecesByCellIndex[ci];

              if (!p) continue;

              this.piecesContainer.bringToTop(p);
              p.setDepth(10);
              const cc = this.cellCenters[ci];

              this.activeDragStartPositions.set(p, new Phaser.Math.Vector2(cc.x, cc.y));
            }
          } else {
            const cc = fromCellIndex !== null ? this.cellCenters[fromCellIndex] : null;

            this.activeDragStartPositions.set(
              root,
              cc ? new Phaser.Math.Vector2(cc.x, cc.y) : new Phaser.Math.Vector2(root.x, root.y),
            );
          }
        });

        root.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer) => {
          const local = this.mainContainer.getLocalPoint(pointer.worldX, pointer.worldY);

          if (!this.activeDragAnchorStart) {
            root.setPosition(local.x, local.y);

            return;
          }

          const dx = local.x - this.activeDragAnchorStart.x;
          const dy = local.y - this.activeDragAnchorStart.y;

          for (const [p, startPos] of this.activeDragStartPositions.entries()) {
            p.setPosition(startPos.x + dx, startPos.y + dy);
          }
        });

        root.on(Phaser.Input.Events.DRAG_END, () => {
          this.rebuildPiecesByCellIndex();

          const metaBefore = root.getData("meta") as PuzzlePieceMeta | undefined;
          const cellBefore = metaBefore?.cellIndex ?? -1;

          const cluster = this.activeDragClusterCellIndices;

          if (cluster && cluster.length > 1) {
            this.snapAndSwapClusterToNearest(root, cluster);
          } else {
            this.snapAndSwapToNearestCell(root);
          }

          const metaAfter = root.getData("meta") as PuzzlePieceMeta | undefined;

          if (metaAfter && metaAfter.cellIndex !== cellBefore) {
            this.gameScene.audioManager.playAudio(assetConf.audio.moveCard);
          }

          this.activeDragClusterCellIndices = null;
          this.activeDragStartPositions.clear();
          this.activeDragAnchorStart = null;
          this.activeDragAnchorFromCellIndex = null;

          this.rebuildPiecesByCellIndex();
          this.afterPuzzleMove();
          // this.debugCheckBoardState();
        });

        this.piecesContainer.add(root);
      }
    }
  }

  private snapAndSwapToNearestCell(piece: PuzzlePieceRoot): void {
    const meta = piece.getData("meta") as PuzzlePieceMeta | undefined;

    if (!meta) return;

    const bestIndex = this.getNearestCellIndex(piece.x, piece.y);

    const fromIndex = meta.cellIndex;
    const toIndex = bestIndex;

    if (fromIndex === toIndex) {
      const center = this.cellCenters[fromIndex];

      this.tweens.add({
        targets: piece,
        x: center.x,
        y: center.y,
        duration: 120,
        ease: "Sine.Out",
      });

      piece.setDepth(0);

      return;
    }

    const other = this.piecesByCellIndex[toIndex];
    const fromCenter = this.cellCenters[fromIndex];
    const toCenter = this.cellCenters[toIndex];

    this.piecesByCellIndex[toIndex] = piece;
    this.piecesByCellIndex[fromIndex] = other ?? null;

    meta.cellIndex = toIndex;
    piece.setData("meta", meta);

    if (other) {
      const otherMeta = other.getData("meta") as PuzzlePieceMeta | undefined;

      if (otherMeta) {
        otherMeta.cellIndex = fromIndex;
        other.setData("meta", otherMeta);
      }
    }

    this.tweens.add({
      targets: piece,
      x: toCenter.x,
      y: toCenter.y,
      duration: 120,
      ease: "Sine.Out",
    });

    if (other) {
      this.tweens.add({
        targets: other,
        x: fromCenter.x,
        y: fromCenter.y,
        duration: 120,
        ease: "Sine.Out",
      });
      other.setDepth(0);
    }

    piece.setDepth(0);
  }

  private snapAndSwapClusterToNearest(anchorPiece: PuzzlePieceRoot, clusterCells: number[]): void {
    this.rebuildPiecesByCellIndex();

    const anchorMeta = anchorPiece.getData("meta") as PuzzlePieceMeta | undefined;

    if (!anchorMeta) return;

    const fromAnchorCell = this.activeDragAnchorFromCellIndex ?? anchorMeta.cellIndex;
    const toAnchorCell = this.getNearestCellIndex(anchorPiece.x, anchorPiece.y);

    const fromRC = this.getRowCol(fromAnchorCell);
    const toRC = this.getRowCol(toAnchorCell);

    const dRow = toRC.row - fromRC.row;
    const dCol = toRC.col - fromRC.col;

    if (dRow === 0 && dCol === 0) {
      this.snapClusterBack(clusterCells);

      return;
    }

    const movingCells = [...clusterCells].sort((a, b) => a - b);
    const movingDestCells = this.computeTranslatedCells(movingCells, dRow, dCol);

    if (!movingDestCells) {
      this.snapClusterBack(clusterCells);

      return;
    }

    const total = this.puzzleRows * this.puzzleCols;
    const oldBoard = this.piecesByCellIndex;
    const movingSet = new Set<number>(movingCells);
    const destSet = new Set<number>(movingDestCells);

    const destSeen = new Set<number>();

    for (const d of movingDestCells) {
      if (destSeen.has(d)) {
        this.snapClusterBack(clusterCells);

        return;
      }

      destSeen.add(d);
    }

    const movingPieces: PuzzlePieceRoot[] = [];

    for (const fromCell of movingCells) {
      const p = oldBoard[fromCell];

      if (!p) {
        this.snapClusterBack(clusterCells);

        return;
      }
      movingPieces.push(p);
    }

    // U = celle coinvolte: solo qui cambia qualcosa; il resto della griglia resta identico.
    const touched = new Set<number>([...movingCells, ...movingDestCells]);

    const vacated = movingCells.filter((c) => !destSet.has(c)).sort((a, b) => a - b);
    const displacedFrom = movingDestCells.filter((c) => !movingSet.has(c)).sort((a, b) => a - b);

    if (vacated.length !== displacedFrom.length) {
      console.error("[Puzzle] vacated/displaced mismatch", vacated.length, displacedFrom.length);
      this.snapClusterBack(clusterCells);

      return;
    }

    const nextBoard: (PuzzlePieceRoot | null)[] = Array.from({length: total}, () => null);

    for (let c = 0; c < total; c++) {
      if (!touched.has(c)) {
        nextBoard[c] = oldBoard[c];
      }
    }

    for (let i = 0; i < movingPieces.length; i++) {
      nextBoard[movingDestCells[i]!] = movingPieces[i]!;
    }

    for (let j = 0; j < vacated.length; j++) {
      const piece = oldBoard[displacedFrom[j]!];

      if (!piece) {
        this.snapClusterBack(clusterCells);

        return;
      }

      nextBoard[vacated[j]!] = piece;
    }

    for (let i = 0; i < nextBoard.length; i++) {
      if (!nextBoard[i]) {
        console.error("[Puzzle] cella vuota dopo permutazione locale:", i);
        this.snapClusterBack(clusterCells);

        return;
      }
    }

    this.piecesByCellIndex = nextBoard;

    for (let i = 0; i < this.piecesByCellIndex.length; i++) {
      const piece = this.piecesByCellIndex[i];

      if (!piece) continue;

      const center = this.cellCenters[i];
      const meta = piece.getData("meta") as PuzzlePieceMeta | undefined;

      if (meta) {
        meta.cellIndex = i;
        piece.setData("meta", meta);
      }

      this.tweens.add({
        targets: piece,
        x: center.x,
        y: center.y,
        duration: 140,
        ease: "Sine.Out",
      });

      piece.setDepth(0);
    }

    this.rebuildPiecesByCellIndex();
  }

  private snapClusterBack(clusterCells: number[]): void {
    for (const ci of clusterCells) {
      const p = this.piecesByCellIndex[ci];

      if (!p) continue;

      const center = this.cellCenters[ci];

      this.tweens.add({
        targets: p,
        x: center.x,
        y: center.y,
        duration: 120,
        ease: "Sine.Out",
      });

      p.setDepth(0);
    }
  }

  private debugCheckBoardState(): void {
    const seen = new Set<PuzzlePieceRoot>();

    for (let i = 0; i < this.piecesByCellIndex.length; i++) {
      const p = this.piecesByCellIndex[i];

      if (!p) {
        console.error("[Puzzle] cella vuota:", i);
        continue;
      }

      if (seen.has(p)) {
        console.error("[Puzzle] pezzo duplicato:", i);
      }

      seen.add(p);

      const meta = p.getData("meta") as PuzzlePieceMeta | undefined;

      if (!meta || meta.cellIndex !== i) {
        console.error("[Puzzle] meta incoerente:", {cell: i, meta});
      }
    }
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as {width: number; height: number};

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
  }

  checkGameOver(): void {
    if (this.isGameOver) return;

    if (!this.isPuzzleSolved()) return;

    this.isGameOver = true;
    this.canShoot = false;

    const max = this.getTotalGridCells();

    this.gameScene.uiManager.setPuzzleScoreImmediate(max);
    this.startAnimConfetti();
    this.gameScene.gameOver();
  }

  startAnimConfetti() {
    const config = this.sys.game.config as {width: number; height: number};

    // Create spriteLeft
    const spriteLeft = this.add
      .sprite(0, config.height / 2, assetConf.spritesheet.confetti_left.key)
      .setOrigin(0, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationLeft
    this.anims.create({
      key: "animConfettiLeft",
      frames: this.anims.generateFrameNumbers(assetConf.spritesheet.confetti_left.key, {
        start: 0,
        end: 54,
      }),
      frameRate: 20,
    });

    spriteLeft.play("animConfettiLeft");

    // Create spriteRight
    const spriteRight = this.add
      .sprite(config.width, config.height / 2, assetConf.spritesheet.confetti_right.key)
      .setOrigin(1, 0.5)
      .setDepth(15)
      .setScale(5)
      .setScrollFactor(0);

    // Create animationRight
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
}
