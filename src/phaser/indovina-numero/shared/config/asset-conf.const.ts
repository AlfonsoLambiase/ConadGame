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
    backgroundStage_1: "backgroundStage_1",
    backgroundStage_2: "backgroundStage_2",
    backgroundStage_3: "backgroundStage_3",
    backgroundStage_4: "backgroundStage_4",
    backgroundStage_5: "backgroundStage_5",
    foregroundStage_0: "foregroundStage_0",
    foregroundStage_1: "foregroundStage_1",
    foregroundStage_2: "foregroundStage_2",
    foregroundStage_3: "foregroundStage_3",
    foregroundStage_4: "foregroundStage_4",
    foregroundStage_5: "foregroundStage_5",
    backgroundLogo: "backgroundLogo",
    backgroundScore: "backgroundScore",
    popup: "popup",
    timer: "timer",
    lavagna: "lavagna",

    // animali
    imageStage_scimmia: "imageStage_scimmia",
    imageStage_zebra: "imageStage_zebra",
    imageStage_giraffa: "imageStage_giraffa",
    imageStage_leopardo: "imageStage_leopardo",
    imageStage_avvoltoio: "imageStage_avvoltoio",
    imageStage_leone: "imageStage_leone",
    imageStage_suricato: "imageStage_suricato",
    imageStage_tigre: "imageStage_tigre",
    imageStage_elefante: "imageStage_elefante",
    imageStage_ippopotamo: "imageStage_ippopotamo",

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
export const imageFileExtensions: Partial<Record<string, string>> = {};
