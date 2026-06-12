export type IpposumoEnemyDifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type IpposumoEnemyDifficultyPreset = {
  /** Intervallo tra una spinta e l'altra (ms) */
  autoPushIntervalMs: number;
  /** Pausa dopo uno scontro (ms) */
  autoPushPauseMs: number;
  /** Probabilità (0–1) di spinta caricata */
  chargedPushChance: number;
  chargeLevelMin: number;
  chargeLevelMax: number;
  /** Moltiplicatore potenza tap + carica */
  pushPowerScale: number;
  /** Knockback extra per livello carica */
  knockbackPerLevel: number;
  /** Intervallo spinte mentre il player tiene premuto il tasto carica (0 = off) */
  pressureIntervalMs: number;
  /** Probabilità (0–1) di contropush quando il player attacca */
  counterPushChance: number;
  /** Probabilità che il contropush sia caricato (se il player ha caricato) */
  chargedCounterChance: number;
  /** Probabilità di contropush caricato quando il player fa solo tap */
  chargedCounterOnTapChance: number;
};

/** Preset difficoltà avversario — 1 facile, 5 difficile */
export const IPPOSUMO_ENEMY_DIFFICULTY_PRESETS: Record<
  IpposumoEnemyDifficultyLevel,
  IpposumoEnemyDifficultyPreset
> = {
  1: {
    autoPushIntervalMs: 750,
    autoPushPauseMs: 400,
    chargedPushChance: 0.1,
    chargeLevelMin: 2,
    chargeLevelMax: 3,
    pushPowerScale: 0.45,
    knockbackPerLevel: 0.18,
    pressureIntervalMs: 0,
    counterPushChance: 0.25,
    chargedCounterChance: 0.15,
    chargedCounterOnTapChance: 0.08,
  },
  2: {
    autoPushIntervalMs: 680,
    autoPushPauseMs: 380,
    chargedPushChance: 0.25,
    chargeLevelMin: 2,
    chargeLevelMax: 3,
    pushPowerScale: 0.55,
    knockbackPerLevel: 0.22,
    pressureIntervalMs: 1000,
    counterPushChance: 0.42,
    chargedCounterChance: 0.32,
    chargedCounterOnTapChance: 0.22,
  },
  3: {
    autoPushIntervalMs: 600,
    autoPushPauseMs: 350,
    chargedPushChance: 0.38,
    chargeLevelMin: 2,
    chargeLevelMax: 5,
    pushPowerScale: 0.6,
    knockbackPerLevel: 0.25,
    pressureIntervalMs: 900,
    counterPushChance: 0.5,
    chargedCounterChance: 0.55,
    chargedCounterOnTapChance: 0.3,
  },
  4: {
    autoPushIntervalMs: 420,
    autoPushPauseMs: 240,
    chargedPushChance: 0.4,
    chargeLevelMin: 3,
    chargeLevelMax: 6,
    pushPowerScale: 0.85,
    knockbackPerLevel: 0.35,
    pressureIntervalMs: 480,
    counterPushChance: 0.88,
    chargedCounterChance: 0.6,
    chargedCounterOnTapChance: 0.55,
  },
  5: {
    autoPushIntervalMs: 320,
    autoPushPauseMs: 180,
    chargedPushChance: 0.55,
    chargeLevelMin: 3,
    chargeLevelMax: 7,
    pushPowerScale: 1,
    knockbackPerLevel: 0.4,
    pressureIntervalMs: 360,
    counterPushChance: 1,
    chargedCounterChance: 0.75,
    chargedCounterOnTapChance: 0.65,
  },
};

export function getIpposumoEnemyDifficulty(level: number): IpposumoEnemyDifficultyPreset {
  const clamped = Math.min(5, Math.max(1, Math.round(level))) as IpposumoEnemyDifficultyLevel;

  return IPPOSUMO_ENEMY_DIFFICULTY_PRESETS[clamped];
}
