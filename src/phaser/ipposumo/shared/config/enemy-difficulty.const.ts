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
    autoPushIntervalMs: 720,
    autoPushPauseMs: 400,
    chargedPushChance: 0.12,
    chargeLevelMin: 2,
    chargeLevelMax: 3,
    pushPowerScale: 0.4,
    knockbackPerLevel: 0.14,
    pressureIntervalMs: 0,
    counterPushChance: 0.18,
    chargedCounterChance: 0.1,
    chargedCounterOnTapChance: 0.05,
  },
  2: {
    autoPushIntervalMs: 580,
    autoPushPauseMs: 360,
    chargedPushChance: 0.2,
    chargeLevelMin: 2,
    chargeLevelMax: 3,
    pushPowerScale: 0.45,
    knockbackPerLevel: 0.16,
    pressureIntervalMs: 1100,
    counterPushChance: 0.22,
    chargedCounterChance: 0.14,
    chargedCounterOnTapChance: 0.08,
  },
  3: {
    autoPushIntervalMs: 560,
    autoPushPauseMs: 330,
    chargedPushChance: 0.26,
    chargeLevelMin: 2,
    chargeLevelMax: 4,
    pushPowerScale: 0.5,
    knockbackPerLevel: 0.18,
    pressureIntervalMs: 950,
    counterPushChance: 0.3,
    chargedCounterChance: 0.22,
    chargedCounterOnTapChance: 0.12,
  },
  4: {
    autoPushIntervalMs: 480,
    autoPushPauseMs: 280,
    chargedPushChance: 0.32,
    chargeLevelMin: 2,
    chargeLevelMax: 4,
    pushPowerScale: 0.55,
    knockbackPerLevel: 0.2,
    pressureIntervalMs: 750,
    counterPushChance: 0.42,
    chargedCounterChance: 0.3,
    chargedCounterOnTapChance: 0.18,
  },
  5: {
    autoPushIntervalMs: 400,
    autoPushPauseMs: 220,
    chargedPushChance: 0.38,
    chargeLevelMin: 3,
    chargeLevelMax: 4,
    pushPowerScale: 0.58,
    knockbackPerLevel: 0.22,
    pressureIntervalMs: 600,
    counterPushChance: 0.55,
    chargedCounterChance: 0.38,
    chargedCounterOnTapChance: 0.25,
  },
};

export function getIpposumoEnemyDifficulty(level: number): IpposumoEnemyDifficultyPreset {
  const clamped = Math.min(5, Math.max(1, Math.round(level))) as IpposumoEnemyDifficultyLevel;

  return IPPOSUMO_ENEMY_DIFFICULTY_PRESETS[clamped];
}
