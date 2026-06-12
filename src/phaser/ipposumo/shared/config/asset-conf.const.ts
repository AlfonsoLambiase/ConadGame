import type {IpposumoEnemyDifficultyLevel} from "./enemy-difficulty.const";

export const IpposumoAssetConf = {
  scene: {
    boot: "boot",
    tutorial: "tutorial",
    game: "game",
    timerManager: "timerManager",
    exitManager: "exitManager",
    gameManager: "gameManager",
    outro: "outro",
  },
  audio: {
    music: "music",
    success: "success",
    error: "error",
    help: "help",
    endWin: "endWin",
    endFailed: "endFailed",
    hit: "hit",
    caricamento: "caricamento",
  } as const,
  image: {
    // for timerManager
    iconSandClock: "iconSandClock",

    // for game
    backgroundGame: "backgroundGame",
    backgroundLogo: "backgroundLogo",
    backgroundScore: "backgroundScore",
    //logo: "logo",
    iconHelp: "iconHelp",
    iconScore: "iconScore",
    iconLive: "iconLive",
    logoPhaser: "logoPhaser", //! Solo per test
    endWin: "endWin",
    endFailed: "endFailed",
    endBackground: "endBackground",
    arena: "arena",
    points: "points",
    scontro: "scontro",
    btn_pressed: "btn_pressed",
    btn_unpressed: "btn_unpressed",
    foregroundCharge: "foregroundCharge",
    fulmine: "fulmine",
    charge_1: "charge_1",
    charge_2: "charge_2",
    charge_3: "charge_3",
    charge_4: "charge_4",
    charge_5: "charge_5",
    charge_6: "charge_6",
    charge_7: "charge_7",

    // for specific game

    // for exitManager
    btnExitGame: "btnExitGame",
    btnConfirm: "btnConfirm",
    btnCancel: "btnCancel",
    popupExitGame: "popupExitGame",

    // for tutorial
    tutorialTastoAvanti: "tutorialTastoAvanti",
  },
  spritesheet: {
    // for tutorial - ATTENZIONE Modificare dimensioni e quantita (in tutorialManager) per ogni texturePacker
    tutorialPlayer01: {
      frameWidth: 264,
      frameHeight: 292,
      key: "tutorialPlayer01",
    },
    tutorialPlayer02: {
      frameWidth: 264,
      frameHeight: 292,
      key: "tutorialPlayer02",
    },
    tutorialPlayer03: {
      frameWidth: 264,
      frameHeight: 292,
      key: "tutorialPlayer03",
    },
    tutorialText01: {
      frameWidth: 897,
      frameHeight: 253,
      key: "tutorialText01",
    },
    tutorialText02: {
      frameWidth: 897,
      frameHeight: 253,
      key: "tutorialText02",
    },
    tutorialText03: {
      frameWidth: 897,
      frameHeight: 253,
      key: "tutorialText03",
    },
    // for ipposumo wrestlers (4 frame)
    animIppo: {
      frameWidth: 429,
      frameHeight: 517,
      key: "animIppo",
    },

    // for confetti - fine partita
    confetti_left: {
      frameWidth: 195,
      frameHeight: 177.5,
      key: "confetti_left",
    },
    confetti_right: {
      frameWidth: 195,
      frameHeight: 177.5,
      key: "confetti_right",
    },

    // for starsEffect
    starsEffect: {
      // 20
      frameWidth: 184,
      frameHeight: 184,
      key: "starsEffect",
    },

    // for animLive
    animLive: {
      // 41
      frameWidth: 128,
      frameHeight: 256,
      key: "animLive",
    },

    // for brokenHeartAnim
    animBrokenHeart: {
      // 27
      frameWidth: 128,
      frameHeight: 104,
      key: "animBrokenHeart",
    },
  },
  keyAnim: {
    animIppo: "animIppo",
    // for starsEffect
    animStars: "animStars",
    // for tutorial
    animTutorialPlayer01: "animTutorialPlayer01",
    animTutorialPlayer02: "animTutorialPlayer02",
    animTutorialPlayer03: "animTutorialPlayer03",
    animStartTutorialText01: "animStartTutorialText01",
    animStartTutorialText02: "animStartTutorialText02",
    animStartTutorialText03: "animStartTutorialText03",
    animEndTutorialText01: "animEndTutorialText01",
    animEndTutorialText02: "animEndTutorialText02",
    animEndTutorialText03: "animEndTutorialText03",
  },
  font: {
    "PaytoneOne-Regular": "PaytoneOne-Regular",
  },
  registry: {
    score: "score",
    coins: "coins",
    timer: "timer",
  },
  enemyDifficulty: {
    /** Range difficoltà random a inizio partita (1 = facile … 5 = difficile) */
    randomMin: 2 as IpposumoEnemyDifficultyLevel,
    randomMax: 2 as IpposumoEnemyDifficultyLevel,
  },
  layout: {
    /** HUD carica: btn, foregroundCharge, fulmine, charge_1–7 */
    chargeHud: {
      /** Offset Y da fondo schermo su iPhone / schermi piccoli */
      offsetYFromBottom: 40,
      /** Quanto salire in più su schermi alti (px) */
      offsetYExtraOnTallScreen: 100,
      /** Scala btn_pressed / btn_unpressed */
      buttonScaleMin: 0.5,
      buttonScaleMax: 1.15,
    },
  },
};
