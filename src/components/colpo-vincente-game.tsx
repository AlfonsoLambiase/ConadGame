
import {useEffect, useRef, useState, CSSProperties} from "react";
import * as Phaser from "phaser";

import {EventBus} from "@/phaser/EventBus";
import {PhaserEvents} from "@/lib/phaser-events";
import {useGame} from "@/context/game-context";
import {ELITE_SPONSOR} from "@/lib/elite-sponsor.enum";
import {getSafeAreaInsets} from "@/lib/safe-area";
import {Boot} from "@/phaser/colpo-vincente/scenes/boot"; //*
import {Game} from "@/phaser/colpo-vincente/scenes/game"; //*
import {Outro} from "@/phaser/colpo-vincente/scenes/outro"; //*
import {Tutorial} from "@/phaser/colpo-vincente/scenes/tutorial"; //*
import {ExitManager} from "@/phaser/colpo-vincente/scenes/exit-manager"; //*
import {TimerManager} from "@/phaser/colpo-vincente/scenes/timer-manager"; //*
import {ColpoVincenteAssetConf} from "@/phaser/colpo-vincente/shared/config/asset-conf.const"; //*
import {GameManager} from "@/phaser/colpo-vincente/scenes/game-manager"; //* //*
import {ColpoVincenteConfig} from "@/phaser/colpo-vincente/config/colpo-vincente-config"; //* //*

const assetConf = ColpoVincenteAssetConf; //* Generalizzazione
const gameName = "colpo-vincente"; //* Generalizzazione

export default function ColpoVincenteGame({
  //*
  isTesting,
  setLevelComplete,
  setExitGame,
}: {
  isTesting: boolean;
  setLevelComplete: () => void;
  setExitGame: () => void;
}) {
  const gameContext = useGame();
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  // Stato iniziale con due background
  const [backgroundStyle, setBackgroundStyle] = useState<CSSProperties>({
    backgroundImage: `url('/games/${gameName}/images/loadingBackground_logo.png'), url('/games/${gameName}/images/loadingBackground.png')`,
    backgroundSize: "100% auto, cover", // Prima immagine 150px, seconda copre tutto
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    width: "100%",
    height: "100%",
  });

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({
      ...ColpoVincenteConfig, //*
      parent: gameRef.current,
    });

    gameInstance.current = game; // Salva l'istanza del gioco

    // Registriamo le scene manualmente
    game.scene.add(assetConf.scene.boot, Boot);
    game.scene.add(assetConf.scene.game, Game);
    game.scene.add(assetConf.scene.tutorial, Tutorial);
    game.scene.add(assetConf.scene.timerManager, TimerManager);
    game.scene.add(assetConf.scene.gameManager, GameManager); //* //*
    game.scene.add(assetConf.scene.exitManager, ExitManager);
    game.scene.add(assetConf.scene.outro, Outro);

    // bg_logo and logo
    const {sponsorLogo, logoPhaser} = setLogo(gameContext.game?.sponsor);

    const {top: safeTop} = getSafeAreaInsets();
    //const safeTop = 25;
    const doubleSafeTop = safeTop * 2;

    game.scene.start(assetConf.scene.boot, {
      sponsorLogo,
      isTesting,
      logoPhaser,
      safeTop: doubleSafeTop,
    });

    const handleEndGame = () => {
      setLevelComplete();
    };

    const handleExitGame = () => {
      setExitGame();
    };

    const handleChangeBackground = () => {
      console.log("handleChangeBackground");
      setBackgroundStyle({
        backgroundColor: "black",
        width: "100%",
        height: "100%",
      });
    };

    EventBus.on(PhaserEvents.END_GAME, handleEndGame);
    EventBus.on(PhaserEvents.EXIT_GAME, handleExitGame);
    EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);

    // Cleanup function
    return () => {
      EventBus.off(PhaserEvents.END_GAME, handleEndGame);
      EventBus.off(PhaserEvents.EXIT_GAME, handleExitGame);
      EventBus.off(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);

      cleanGameMemory();
    };
  }, []);

  function cleanGameMemory() {
    if (gameInstance.current) {
      gameInstance.current.destroy(true);
      gameInstance.current = null;
    }
  }

  return (
    <div style={backgroundStyle}>
      <div ref={gameRef} />
    </div>
  );

  //! Metodo per attivare il notch
  // return (
  //   <div style={{...backgroundStyle, paddingTop: "env(safe-area-inset-top)"}}>
  //     <div ref={gameRef} />
  //   </div>
  // );
}

/** NOTA: per nessun logo (nobrand) usare urlLogo che finisce con "empty" */
function setLogo(sponsor: {id?: number; urlLogo?: string} | undefined) {
  const getRandomDefaultLogo = () =>
    Math.random() < 0.5 ? "/images/loghi/logo_conad.png" : "/images/loghi/logo_verso_natura.png";

  const sponsorUrlLogo = sponsor?.urlLogo;
  const sponsorLogoFileName = sponsorUrlLogo?.split("/").pop() ?? sponsorUrlLogo;
  const sponsorLogo: string =
    sponsorLogoFileName && sponsorLogoFileName !== "empty"
      ? sponsorLogoFileName.startsWith("http")
        ? sponsorLogoFileName
        : `/images/loghi/${sponsorLogoFileName}`
      : getRandomDefaultLogo();

  console.log(`[${gameName}] sponsor logo filename: `, sponsorLogoFileName);

  if (sponsor?.id === ELITE_SPONSOR.BARILLA) {
    console.log("[setLogo] Sponsor BARILLA selezionato");
  } else if (sponsor?.id === ELITE_SPONSOR.MULINO_BIANCO) {
    console.log("[setLogo] Sponsor MULINO_BIANCO selezionato");
  } else {
    console.log("[setLogo] Sponsor CONAD selezionato");
  }

  const logoPhaser = `/games/${gameName}/images/logoPhaser.png`;

  return {sponsorLogo, logoPhaser};
}
