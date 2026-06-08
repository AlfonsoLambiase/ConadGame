export const SafariAssetConf = {
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
    jeepSound: "jeep-sound",
    cameraShot: "camera-shot",
    ottimaFoto: "ottima-foto",
    fotoFallita: "foto-fallita",
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

    // for specific game
    background_Sky: "background_Sky",
    background_Terrain: "background_Terrain",
    background_camera_1: "background_camera_1",
    background_camera_2: "background_camera_2",
    card_1: "card_1",
    card_2: "card_2",
    card_3: "card_3",
    card_4: "card_4",
    card_5: "card_5",
    card_6: "card_6",
    card_7: "card_7",
    camera_zoom: "camera_zoom",
    camera_btn: "camera_btn",
    /** Cornice anteprima foto risultato */
    cornice: "cornice",

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
    coins: "coins",
    timer: "timer",
  },
};
