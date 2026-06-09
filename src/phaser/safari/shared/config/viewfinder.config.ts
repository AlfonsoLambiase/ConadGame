/** Rettangolo normalizzato (0–1) rispetto ai bounds di `camera_zoom` */
export type ViewfinderRectNorm = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Taratura viewfinder e soglie scatto.
 * `SHOW_DEBUG_ZONE: false` nasconde il riempimento celeste di debug.
 */
export const SafariViewfinderConfig = {
  SHOW_DEBUG_ZONE: false,

  /** Rettangolo grande (validazione scatto / debug) */
  // camera_zoom ora è ritagliata sulla cornice utile: OUTER coincide con tutta l'immagine.
  OUTER: {x: 0, y: 0, w: 1, h: 1} satisfies ViewfinderRectNorm,

  /**
   * Anteprima foto: px dall'alto della texture `camera_zoom` da non mostrare (asset a freddo, senza scala).
   * In mondo di gioco si moltiplica per scaleY derivata da `getBounds()` / frame.
   */
  CAMERA_ZOOM_TOP_EXCLUDE_UNSCALED_PX: 315,

  /** Dimensioni texture `cornice.png` (px asset, senza scala) */
  CORNICE_TEXTURE_WIDTH: 1027,
  CORNICE_TEXTURE_HEIGHT: 706,

  /** Anteprima: distanza dall’alto della cornice al bordo alto della foto (px asset × scala cornice) */
  PHOTO_IN_CORNICE_TOP_OFFSET_UNSCALED_PX: 75,

  /** Anteprima: distanza dal bordo sinistro della cornice allo slot foto (px asset × scala cornice) */
  /** (1027−830)/2 ≈ 99 se la finestra è centrata; abbassa se la foto resta troppo a destra */
  PHOTO_IN_CORNICE_SLOT_OFFSET_X_UNSCALED_PX: 82,

  /** Finestra interna cornice dove deve entrare la foto (px asset × scala cornice) */
  PHOTO_IN_CORNICE_SLOT_WIDTH_UNSCALED_PX: 830,
  PHOTO_IN_CORNICE_SLOT_HEIGHT_UNSCALED_PX: 460,

  /**
   * Scala anteprima foto nello slot cornice: `cover` riempie lo slot (taglia i bordi),
   * `contain` mostra tutta la cattura (può lasciare bande nere ai lati).
   */
  PHOTO_RESULT_DISPLAY_FIT: "cover" as const,

  /** Moltiplicatore extra sulla scala display (es. 1.03 per eliminare micro-gap ai bordi) */
  PHOTO_RESULT_DISPLAY_SCALE_BOOST: 1.03,

  /**
   * Testo risultato foto: distanza dal bordo basso dello slot foto verso il basso,
   * nello spazio bianco della cornice (px asset × scala cornice).
   */
  PHOTO_RESULT_LABEL_OFFSET_FROM_SLOT_BOTTOM_UNSCALED_PX: 28,

  /** Messaggi random su scatto riuscito */
  PHOTO_RESULT_SUCCESS_LABELS: [
    "Super scatto!",
    "Che tempismo!",
    "Foto spettacolare!",
    "Scatto incredibile!",
    "Scatto da esploratore!",
    "Ottimo lavoro!",
  ],

  PHOTO_RESULT_FAIL_LABEL: "FOTO FALLITA",

  /** Rettangolo piccolo (focus / centratura animale) */
  // Non serve più per la validazione (usiamo containment su OUTER), resta solo per debug se vuoi.
  INNER: {x: 0.2, y: 0.2, w: 0.6, h: 0.4} satisfies ViewfinderRectNorm,

  /** Copertura minima del focus da parte di una card per considerarla in scena */
  MIN_IN_FRAME_FOCUS_COVERAGE: 0.04,

  /** Copertura del focus per scatto riuscito (tarare il margine errore) */
  MIN_SUCCESS_FOCUS_COVERAGE: 0.18,

  /** Secondo animale nel focus: sopra questa soglia → foto fallita */
  MIN_SECOND_ANIMAL_FOCUS_COVERAGE: 0.1,

  /** Il centro della card deve stare dentro INNER */
  REQUIRE_CENTER_IN_FOCUS: true,

  /**
   * Centro card su X: distanza max dal centro di OUTER (frazione di mezza larghezza OUTER).
   * Es. 0.35 = tolleranza generosa se l’animale è quasi centrato.
   */
  MAX_CENTER_OFFSET_X: 0.42,

  /**
   * Quota minima della larghezza card che deve restare dentro OUTER (solo asse X).
   * Es. 0.82 = fino a ~18% fuori totale ancora OK (evita falsi falliti al bordo).
   */
  MIN_HORIZONTAL_INSIDE_RATIO: 0.82,

  /** Max pixel fuori da un lato (usa il peggiore tra sinistra/destra) se sotto la quota ratio */
  MAX_HORIZONTAL_OVERFLOW_PX: 48,

  /** Log 1: messaggio sintetico a ogni scatto — `true` per attivare */
  DEBUG_LOG_SHOT: true,

  /** Log 2: dettaglio soglie e valori — `true` per attivare */
  DEBUG_LOG_SHOT_VERBOSE: true,

  /** Intervallo tra un animale e il successivo (ms) */
  CARD_SPAWN_INTERVAL_MIN_MS: 1000,
  CARD_SPAWN_INTERVAL_MAX_MS: 2500,

  /** Sprite nel pool: 1 = un solo animale in scena alla volta */
  CARD_POOL_SIZE: 1,

  /** Distanza extra oltre il bordo destro quando spawna */
  CARD_SPAWN_OFFSCREEN_PAD_PX: 48,

  /** Incremento velocità scroll dopo ogni foto riuscita (0.1 = +10%) */
  SCROLL_SPEED_SUCCESS_INCREASE_RATIO: 0.1,

  PHOTO_RESULT_MAX_MS: 5000,
  SHUTTER_FLASH_MS: 100,
  SHUTTER_FLASH_ALPHA: 0.7,
  /** Pausa dopo la fine di camera-shot prima di ottima-foto / foto-fallita (ms) */
  PHOTO_RESULT_SOUND_DELAY_MS: 150,

  /** px asset: tappo in basso su background_Terrain (visibile su schermi lunghi) */
  TERRAIN_BOTTOM_PADDING_UNSCALED_PX: 330,
  /** Offset Y solo su schermi bassi (+ = terrain scende). Su schermi alti = 0 (pivot resta a gameHeight) */
  TERRAIN_OFFSET_Y_SMALL_PX: 500,
  TERRAIN_OFFSET_Y_LARGE_PX: 0,
  /** aspect ratio gameHeight/gameWidth: sotto SHORT = offset pieno, sopra TALL = nessun offset */
  TERRAIN_OFFSET_ASPECT_SHORT: 1.72,
  TERRAIN_OFFSET_ASPECT_TALL: 1.92,

  /** Anteprima foto: centro cornice ancorato al top terrain → metà zona cattura + extra dinamico (px asset × backgroundScale) */
  PHOTO_RESULT_EXTRA_OFFSET_SMALL_PX: 0,
  PHOTO_RESULT_EXTRA_OFFSET_LARGE_PX: 0,
  PHOTO_RESULT_FIT_WIDTH_RATIO: 1.08,
  PHOTO_RESULT_FIT_HEIGHT_RATIO: 1.35,

  /** Animazione comparsa anteprima foto */
  PHOTO_RESULT_REVEAL_MS: 520,
  PHOTO_RESULT_REVEAL_ANGLE_MIN: -15,
  PHOTO_RESULT_REVEAL_ANGLE_MAX: 15,
  PHOTO_RESULT_REVEAL_SPIN_EXTRA_DEG: 28,
  PHOTO_RESULT_BACKDROP_ALPHA: 0.7,
  PHOTO_RESULT_BACKDROP_FADE_MS: 280,

  DEBUG_ZONE_COLOR: 0x87ceeb,
  DEBUG_ZONE_ALPHA: 0.3,
} as const;
