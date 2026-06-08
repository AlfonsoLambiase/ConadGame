export const IndovinaNumeroAssetConf = {
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
    count: "count",
    zoomIn: "zoomIn",
    clickButton: "clickButton",
  } as const,
  image: {
    // for timerManager
    iconSandClock: "iconSandClock",

    // for game
    backgroundStage_0: "backgroundStage_0",
    backgroundStage_1: "backgroundStage_0",
    foregroundStage_0: "foregroundStage_0",
    foregroundStage_1: "foregroundStage_0",
    backgroundLogo: "backgroundLogo",
    backgroundScore: "backgroundScore",
    popup: "popup",
    timer: "timer",
    lavagna: "lavagna",
    imageStage_0: "imageStage_0",
    imageStage_1: "imageStage_1",
    imageStage_2: "imageStage_2",
    button: "button",
    button_true: "button_true",
    button_false: "button_false",
    //logo: "logo",
    iconHelp: "iconHelp",
    iconScore: "iconScore",
    iconLive: "iconLive",
    logoPhaser: "logoPhaser", //! Solo per test
    endWin: "endWin",
    endFailed: "endFailed",
    endBackground: "endBackground",
    btnStart: "btnStart",
    startBackground: "startBackground",

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

    // for starsEffect (UIManager, StarsEffectManager)
    starsEffect: {
      // 20 frame
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
    currentStage: "currentStage",
  },
};

/** Estensioni file non-.png per texture con nome file custom */
export const imageFileExtensions: Partial<Record<string, string>> = {
  backgroundStage_0: "jpg",
};
