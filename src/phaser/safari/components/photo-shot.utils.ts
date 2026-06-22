import * as Phaser from "phaser";

import {SafariViewfinderConfig, type ViewfinderRectNorm} from "../shared/config/viewfinder.config";

export type ShotFailReason = "no_animal" | "multiple_animals" | "not_centered" | "low_overlap";

export type ShotEvaluation = {
  success: boolean;
  failReason?: ShotFailReason;
  targetCard: Phaser.GameObjects.Image | null;
  /** 0..1: quanto del rettangolo OUTER è coperto dalla card (solo per debug/log) */
  outerCoverage: number;
  /** 0..1: quanto della larghezza card è dentro OUTER (solo X) */
  horizontalInsideRatio: number;
  animalsInFrame: number;
};

export type ViewfinderRects = {
  outer: Phaser.Geom.Rectangle;
  inner: Phaser.Geom.Rectangle;
};

type CardCandidate = {
  card: Phaser.GameObjects.Image;
  outerCoverage: number;
  bounds: Phaser.Geom.Rectangle;
};

export function rectFromNorm(
  bounds: Phaser.Geom.Rectangle,
  norm: ViewfinderRectNorm,
): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(
    bounds.x + bounds.width * norm.x,
    bounds.y + bounds.height * norm.y,
    bounds.width * norm.w,
    bounds.height * norm.h,
  );
}

export function getViewfinderRects(cameraZoom: Phaser.GameObjects.Image): ViewfinderRects {
  const bounds = cameraZoom.getBounds();

  return {
    outer: rectFromNorm(bounds, SafariViewfinderConfig.OUTER),
    inner: rectFromNorm(bounds, SafariViewfinderConfig.INNER),
  };
}

/** Scala display rispetto ai px della texture (per convertire misure "a freddo") */
export function getCameraZoomDisplayScale(cameraZoom: Phaser.GameObjects.Image): {
  scaleX: number;
  scaleY: number;
} {
  const bounds = cameraZoom.getBounds();
  const frameW = cameraZoom.frame.width;
  const frameH = cameraZoom.frame.height;

  return {
    scaleX: frameW > 0 ? bounds.width / frameW : 1,
    scaleY: frameH > 0 ? bounds.height / frameH : 1,
  };
}

/** Area di cattura anteprima foto (OUTER senza la fascia alta della camera) */
export function getPhotoResultRect(cameraZoom: Phaser.GameObjects.Image): Phaser.Geom.Rectangle {
  const cfg = SafariViewfinderConfig;
  const {outer} = getViewfinderRects(cameraZoom);
  const {scaleY} = getCameraZoomDisplayScale(cameraZoom);
  const topExclude = cfg.CAMERA_ZOOM_TOP_EXCLUDE_UNSCALED_PX * scaleY;

  return new Phaser.Geom.Rectangle(
    outer.x,
    outer.y + topExclude,
    outer.width,
    Math.max(1, outer.height - topExclude),
  );
}

/** Crop texture per cornice anteprima (px asset, senza scala) */
export function getPhotoResultTextureCrop(
  cameraZoom: Phaser.GameObjects.Image,
): Phaser.Geom.Rectangle {
  const cfg = SafariViewfinderConfig;
  const frame = cameraZoom.frame;
  const crop = rectFromNorm(new Phaser.Geom.Rectangle(0, 0, frame.width, frame.height), cfg.OUTER);

  crop.y += cfg.CAMERA_ZOOM_TOP_EXCLUDE_UNSCALED_PX;
  crop.height = Math.max(1, crop.height - cfg.CAMERA_ZOOM_TOP_EXCLUDE_UNSCALED_PX);

  return crop;
}

export type PhotoResultDisplayLayout = {
  photoRect: Phaser.Geom.Rectangle;
  photoDisplayScale: number;
  photoDisplayX: number;
  photoDisplayY: number;
  photoDisplayW: number;
  photoDisplayH: number;
  corniceX: number;
  corniceY: number;
  corniceScale: number;
  corniceDisplayW: number;
  corniceDisplayH: number;
  /** Y locale (origine cornice al centro) per il testo risultato */
  resultTextY: number;
};

let photoResultSuccessLabelPool: string[] = [];

/** Azzera il ciclo messaggi foto riuscita (chiamare all’inizio partita). */
export function resetPhotoResultSuccessLabels(): void {
  photoResultSuccessLabelPool = [...SafariViewfinderConfig.PHOTO_RESULT_SUCCESS_LABELS];
}

function refillPhotoResultSuccessLabelPoolIfEmpty(): void {
  if (photoResultSuccessLabelPool.length === 0) {
    resetPhotoResultSuccessLabels();
  }
}

export function getPhotoResultLabel(success: boolean): string {
  const cfg = SafariViewfinderConfig;

  if (!success) {
    return cfg.PHOTO_RESULT_FAIL_LABEL;
  }

  refillPhotoResultSuccessLabelPoolIfEmpty();

  const pickIndex = Phaser.Math.Between(0, photoResultSuccessLabelPool.length - 1);

  return photoResultSuccessLabelPool.splice(pickIndex, 1)[0];
}

export type PhotoResultOverlayPlacement = {
  centerX: number;
  centerY: number;
  fitWidth: number;
  fitHeight: number;
};

/**
 * Posiziona l’anteprima sul centro della zona cattura, ancorata al top di background_Terrain
 * (scrollAnchorY). Segue terrain/viewfinder su ogni dispositivo.
 */
export function getPhotoResultOverlayPlacement(
  cameraZoom: Phaser.GameObjects.Image,
  scrollAnchorY: number,
  backgroundScale: number,
  gameWidth: number,
  dynamicPx: (minPx: number, maxPx: number) => number,
): PhotoResultOverlayPlacement {
  const cfg = SafariViewfinderConfig;
  const {outer} = getViewfinderRects(cameraZoom);
  const photoRect = getPhotoResultRect(cameraZoom);

  const extraOffsetY =
    dynamicPx(cfg.PHOTO_RESULT_EXTRA_OFFSET_SMALL_PX, cfg.PHOTO_RESULT_EXTRA_OFFSET_LARGE_PX) *
    backgroundScale;

  // Centro zona cattura rispetto al top terrain (scrollAnchorY + fascia UI camera + metà altezza)
  const captureCenterFromTerrainTop = photoRect.centerY - scrollAnchorY;
  const centerY = scrollAnchorY + captureCenterFromTerrainTop + extraOffsetY;

  return {
    centerX: gameWidth / 2,
    centerY,
    fitWidth: outer.width * cfg.PHOTO_RESULT_FIT_WIDTH_RATIO,
    fitHeight: photoRect.height * cfg.PHOTO_RESULT_FIT_HEIGHT_RATIO,
  };
}

/**
 * Layout anteprima: scala `cornice` per lo schermo, foto nello slot interno 830×460
 * (slot ancorato a offset X/Y sulla cornice, foto centrata nello slot, tutto × corniceScale).
 */
export function getPhotoResultDisplayLayout(
  cameraZoom: Phaser.GameObjects.Image,
  centerX: number,
  centerY: number,
  fitWidth: number,
  fitHeight: number,
): PhotoResultDisplayLayout {
  const cfg = SafariViewfinderConfig;
  const photoRect = getPhotoResultRect(cameraZoom);
  const captureW = Math.max(1, photoRect.width);
  const captureH = Math.max(1, photoRect.height);

  const corniceW = cfg.CORNICE_TEXTURE_WIDTH;
  const corniceH = cfg.CORNICE_TEXTURE_HEIGHT;
  const corniceScale = Math.min(fitWidth / corniceW, fitHeight / corniceH);
  const corniceDisplayW = corniceW * corniceScale;
  const corniceDisplayH = corniceH * corniceScale;
  const corniceLeft = centerX - corniceDisplayW / 2;
  const corniceTop = centerY - corniceDisplayH / 2;
  const leftOffset = cfg.PHOTO_IN_CORNICE_SLOT_OFFSET_X_UNSCALED_PX * corniceScale;
  const topOffset = cfg.PHOTO_IN_CORNICE_TOP_OFFSET_UNSCALED_PX * corniceScale;
  const slotW = cfg.PHOTO_IN_CORNICE_SLOT_WIDTH_UNSCALED_PX * corniceScale;
  const slotH = cfg.PHOTO_IN_CORNICE_SLOT_HEIGHT_UNSCALED_PX * corniceScale;
  const slotLeft = corniceLeft + leftOffset;

  const widthScale = slotW / captureW;
  const heightScale = slotH / captureH;
  const fitScale =
    cfg.PHOTO_RESULT_DISPLAY_FIT === "cover"
      ? Math.max(widthScale, heightScale)
      : Math.min(widthScale, heightScale);
  const photoDisplayScale = fitScale * cfg.PHOTO_RESULT_DISPLAY_SCALE_BOOST;
  const photoDisplayW = captureW * photoDisplayScale;
  const photoDisplayH = captureH * photoDisplayScale;
  const slotBottomLocalY =
    -corniceDisplayH / 2 +
    (cfg.PHOTO_IN_CORNICE_TOP_OFFSET_UNSCALED_PX + cfg.PHOTO_IN_CORNICE_SLOT_HEIGHT_UNSCALED_PX) *
      corniceScale;
  const resultTextY =
    slotBottomLocalY + cfg.PHOTO_RESULT_LABEL_OFFSET_FROM_SLOT_BOTTOM_UNSCALED_PX * corniceScale;

  return {
    photoRect,
    photoDisplayScale,
    photoDisplayX: slotLeft + (slotW - photoDisplayW) / 2,
    photoDisplayY: corniceTop + topOffset,
    photoDisplayW,
    photoDisplayH,
    corniceX: centerX,
    corniceY: centerY,
    corniceScale,
    corniceDisplayW,
    corniceDisplayH,
    resultTextY,
  };
}

function intersectionArea(a: Phaser.Geom.Rectangle, b: Phaser.Geom.Rectangle): number {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);

  if (overlapX <= 0 || overlapY <= 0) {
    return 0;
  }

  return overlapX * overlapY;
}

function getCardBounds(card: Phaser.GameObjects.Image): Phaser.Geom.Rectangle {
  return card.getBounds();
}

function collectCandidates(
  cards: Phaser.GameObjects.Image[],
  outerRect: Phaser.Geom.Rectangle,
): CardCandidate[] {
  const cfg = SafariViewfinderConfig;
  const candidates: CardCandidate[] = [];
  const outerArea = outerRect.width * outerRect.height || 1;

  for (const card of cards) {
    if (!card.visible || !card.active) {
      continue;
    }

    const bounds = getCardBounds(card);
    const outerCoverage = intersectionArea(bounds, outerRect) / outerArea;

    // riuso la soglia esistente, ora intesa come \"copertura minima di OUTER\"
    if (outerCoverage >= cfg.MIN_IN_FRAME_FOCUS_COVERAGE) {
      candidates.push({card, outerCoverage, bounds});
    }
  }

  candidates.sort((a, b) => b.outerCoverage - a.outerCoverage);

  return candidates;
}

function getHorizontalInsideRatio(
  cardBounds: Phaser.Geom.Rectangle,
  outerRect: Phaser.Geom.Rectangle,
): number {
  if (cardBounds.width <= 0) {
    return 0;
  }

  const overlapX =
    Math.min(cardBounds.right, outerRect.right) - Math.max(cardBounds.left, outerRect.left);

  return Math.max(0, overlapX) / cardBounds.width;
}

function getHorizontalOverflowPx(
  cardBounds: Phaser.Geom.Rectangle,
  outerRect: Phaser.Geom.Rectangle,
): {left: number; right: number} {
  return {
    left: Math.max(0, outerRect.left - cardBounds.left),
    right: Math.max(0, cardBounds.right - outerRect.right),
  };
}

/** Centro X della parte di card che interseca OUTER (non dello sprite intero) */
function getVisibleCenterX(
  cardBounds: Phaser.Geom.Rectangle,
  outerRect: Phaser.Geom.Rectangle,
): number {
  const left = Math.max(cardBounds.left, outerRect.left);
  const right = Math.min(cardBounds.right, outerRect.right);

  if (right > left) {
    return (left + right) / 2;
  }

  return cardBounds.centerX;
}

function isCenterXInOuter(
  cardBounds: Phaser.Geom.Rectangle,
  outerRect: Phaser.Geom.Rectangle,
): boolean {
  const cfg = SafariViewfinderConfig;
  const centerX = getVisibleCenterX(cardBounds, outerRect);
  const dx = Math.abs(centerX - outerRect.centerX);
  const maxDx = (outerRect.width / 2) * cfg.MAX_CENTER_OFFSET_X;

  return dx <= maxDx;
}

function isHorizontallyInsideOuter(
  cardBounds: Phaser.Geom.Rectangle,
  outerRect: Phaser.Geom.Rectangle,
): boolean {
  const cfg = SafariViewfinderConfig;
  const insideRatio = getHorizontalInsideRatio(cardBounds, outerRect);
  const overflow = getHorizontalOverflowPx(cardBounds, outerRect);

  if (insideRatio >= cfg.MIN_HORIZONTAL_INSIDE_RATIO) {
    return true;
  }

  const maxOverflow = Math.max(overflow.left, overflow.right);

  return maxOverflow <= cfg.MAX_HORIZONTAL_OVERFLOW_PX;
}

/** Log 1 e 2 — attiva/disattiva da `SafariViewfinderConfig.DEBUG_LOG_SHOT*` */
export function logShotEvaluation(evaluation: ShotEvaluation): void {
  const cfg = SafariViewfinderConfig;

  if (!cfg.DEBUG_LOG_SHOT) {
    return;
  }

  const covPct = Math.round(evaluation.outerCoverage * 100);
  const minSuccessPct = Math.round(cfg.MIN_SUCCESS_FOCUS_COVERAGE * 100);

  if (evaluation.success) {
    console.log(`[Safari Shot] OK — outer ${covPct}% (min ${minSuccessPct}%)`);
  } else {
    console.log(
      `[Safari Shot] FALLITA — ${evaluation.failReason ?? "unknown"} — outer ${covPct}% (min ${minSuccessPct}%)`,
    );
  }

  if (!cfg.DEBUG_LOG_SHOT_VERBOSE) {
    return;
  }

  const insidePct = Math.round(evaluation.horizontalInsideRatio * 100);

  console.log("[Safari Shot] detail", {
    failReason: evaluation.failReason,
    outerCoverage: evaluation.outerCoverage,
    outerCoveragePercent: covPct,
    horizontalInsidePercent: insidePct,
    animalsInFrame: evaluation.animalsInFrame,
    thresholds: {
      MIN_SUCCESS_FOCUS_COVERAGE: cfg.MIN_SUCCESS_FOCUS_COVERAGE,
      MIN_IN_FRAME_FOCUS_COVERAGE: cfg.MIN_IN_FRAME_FOCUS_COVERAGE,
      MIN_SECOND_ANIMAL_FOCUS_COVERAGE: cfg.MIN_SECOND_ANIMAL_FOCUS_COVERAGE,
      MAX_CENTER_OFFSET_X: cfg.MAX_CENTER_OFFSET_X,
      MIN_HORIZONTAL_INSIDE_RATIO: cfg.MIN_HORIZONTAL_INSIDE_RATIO,
      MAX_HORIZONTAL_OVERFLOW_PX: cfg.MAX_HORIZONTAL_OVERFLOW_PX,
    },
  });
}

export function evaluateShot(
  cards: Phaser.GameObjects.Image[],
  outerRect: Phaser.Geom.Rectangle,
): ShotEvaluation {
  const cfg = SafariViewfinderConfig;
  const candidates = collectCandidates(cards, outerRect);

  if (candidates.length === 0) {
    return {
      success: false,
      failReason: "no_animal",
      targetCard: null,
      outerCoverage: 0,
      horizontalInsideRatio: 0,
      animalsInFrame: 0,
    };
  }

  const primary = candidates[0];
  const horizontalInsideRatio = getHorizontalInsideRatio(primary.bounds, outerRect);
  const secondary = candidates[1];

  if (secondary) {
    const secondaryCenterInside = outerRect.contains(
      secondary.bounds.centerX,
      secondary.bounds.centerY,
    );
    const secondAnimalInOuter =
      secondaryCenterInside || secondary.outerCoverage >= cfg.MIN_SECOND_ANIMAL_FOCUS_COVERAGE;

    if (secondAnimalInOuter) {
      return {
        success: false,
        failReason: "multiple_animals",
        targetCard: null,
        outerCoverage: primary.outerCoverage,
        horizontalInsideRatio,
        animalsInFrame: candidates.length,
      };
    }
  }

  // 1) centratura solo su X (l’altezza non conta)
  if (cfg.REQUIRE_CENTER_IN_FOCUS && !isCenterXInOuter(primary.bounds, outerRect)) {
    return {
      success: false,
      failReason: "not_centered",
      targetCard: primary.card,
      outerCoverage: primary.outerCoverage,
      horizontalInsideRatio,
      animalsInFrame: 1,
    };
  }

  // 2) containment orizzontale con tolleranza (evita fallito se è ancora “quasi tutto” dentro)
  if (!isHorizontallyInsideOuter(primary.bounds, outerRect)) {
    return {
      success: false,
      failReason: "low_overlap",
      targetCard: primary.card,
      outerCoverage: primary.outerCoverage,
      horizontalInsideRatio,
      animalsInFrame: 1,
    };
  }

  return {
    success: true,
    targetCard: primary.card,
    outerCoverage: primary.outerCoverage,
    horizontalInsideRatio,
    animalsInFrame: 1,
  };
}
