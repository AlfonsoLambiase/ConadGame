export const ColpoVincenteAssetConf = {
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
    ball: "ball",
    endWin: "endWin",
    endFailed: "endFailed",
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
    iconScore_Player: "iconScore_Player",
    iconScore_Enemy: "iconScore_Enemy",
    iconScore_bg_white: "iconScore_bg_white",
    iconLive: "iconLive",
    logoPhaser: "logoPhaser", //! Solo per test
    endWin: "endWin",
    endFailed: "endFailed",
    endBackground: "endBackground",

    // for specific game
    bg: "bg",
    bg_Top: "bg_Top",
    ball_player: "ball_player",
    ball_enemy: "ball_enemy",
    ball_boccino: "ball_boccino",
    ball_boccino_shadow: "ball_boccino_shadow",
    bandierino: "bandierino",
    ball_shadow: "ball_shadow",
    /** Sopra la palla (player o nemica) più vicina al boccino. */
    ball_indicator: "ball_indicator",
    arrow: "arrow",
    arrow_bottom: "arrow_bottom",
    arrow_top: "arrow_top",

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
    scoreEnemy: "scoreEnemy",
    coins: "coins",
    timer: "timer",
  },
};
