export const SparaNeveAssetConf = {
  scene: {
    boot: "boot",
    tutorial: "tutorial",
    game: "game",
    timerManager: "timerManager",
    exitManager: "exitManager",
    sparaNeveManager: "sparaNeveManager",
    outro: "outro",

    mainMenu: "mainMenu",
    mainGame: "mainGame",
    mobileControlsScene: "mobileControlsScene",
  },
  audio: {
    music: "music",
    success: "success",
    error: "error",
    help: "help",
    endWin: "endWin",
    endFailed: "endFailed",

    throw: "throw",
    gameOver: "gameOver",
    hitSnowman: "hitSnowman",
    move: "move",
  } as const,
  image: {
    // for timerManager
    iconSandClock: "iconSandClock",

    // for game
    //backgroundGame: "backgroundGame",
    backgroundLogo: "backgroundLogo",
    backgroundScore: "backgroundScore",
    iconHelp: "iconHelp",
    iconScore: "iconScore",
    iconLive: "iconLive",
    endWin: "endWin",
    endFailed: "endFailed",
    endBackground: "endBackground",

    arrowDown: "arrowDown",
    arrowUp: "arrowUp",
    arrowBurst: "arrowBurst",

    // for specific game
    overlay: "overlay",
    gameover: "gameover",
    title: "title",
    snow: "snow",
    nest: "nest",
    snowball1: "snowball1",
    snowball2: "snowball2",
    snowball3: "snowball3",
    controls: "controls",
    panelBest: "panelBest",
    panelScore: "panelScore",

    // for exitManager
    btnExitGame: "btnExitGame",
    btnConfirm: "btnConfirm",
    btnCancel: "btnCancel",
    popupExitGame: "popupExitGame",

    // for tutorial
    tutorialTastoAvanti: "tutorialTastoAvanti",
  },
  spritesheet: {
    // for player
    player: {
      // 20
      frameWidth: 256, // 128
      frameHeight: 256, // 128
      key: "player",
    },
    // for snowmanSmall
    // snowmanSmall: {
    //   // 20
    //   frameWidth: 128,
    //   frameHeight: 128,
    //   key: "snowmanSmall",
    // },
    snowmanSmall: {
      // 20
      frameWidth: 256,
      frameHeight: 256,
      key: "snowmanSmall",
    },
    // for snowmanBig
    snowmanBig: {
      // 20
      frameWidth: 256, // 160
      frameHeight: 256, // 160
      key: "snowmanBig",
    },
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
    coins: "coins",
    timer: "timer",
  },
};
