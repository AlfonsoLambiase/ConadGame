
import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";

import { Boot } from "@/phaser/collega-tutto/scenes/boot"; //*
import { Game } from "@/phaser/collega-tutto/scenes/game"; //*
import { Outro } from "@/phaser/collega-tutto/scenes/outro"; //*
import { Tutorial } from "@/phaser/collega-tutto/scenes/tutorial"; //*
import { ExitManager } from "@/phaser/collega-tutto/scenes/exit-manager"; //*
import { TimerManager } from "@/phaser/collega-tutto/scenes/timer-manager"; //*
import { CollegaTuttoAssetConf } from "@/phaser/collega-tutto/shared/config/asset-conf.const"; //*
import { GameManager } from "@/phaser/collega-tutto/scenes/game-manager"; //* //*
import { CollegaTuttoConfig } from "@/phaser/collega-tutto/config/collega-tutto-config"; //* //*

const assetConf = CollegaTuttoAssetConf; //* Generalizzazione
const gameName = "collega-tutto"; //* Generalizzazione

export default function CollegaTuttoGame({
  //*
  isTesting,
  setLevelComplete,
  setExitGame,
}: {
  isTesting: boolean;
  setLevelComplete: () => void;
  setExitGame: () => void;
}) {
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
      ...CollegaTuttoConfig, //*
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

    //! Sono parametri da personalizzare
    //* NOTA: se non si vuole mettere nessun logo quando è nobrand scirvere: empty
    let sponsorLogo = "empty";
    //let sponsorLogo = "/images/loghi/logo_verso_natura.png";
    let backgroundGame = `/games/${gameName}/images/backgroundGame_0.png`;
    sponsorLogo = "empty";

    backgroundGame = `/games/${gameName}/images/backgroundGame_1.png`;
    game.scene.start(assetConf.scene.boot, {
      //! Inserire qui i parametri desiderati
      sponsorLogo,
      isTesting,
      backgroundGame,
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
      EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);

      cleanGameMemory();
    };
  }, [isTesting, setExitGame, setLevelComplete]);

  function cleanGameMemory() {
    if (gameInstance.current) {
      gameInstance.current.destroy(true);
      gameInstance.current = null;
    }
  }

  //! Originale
  return (
    <div style={backgroundStyle}>
      <div ref={gameRef} />
    </div>
  );
}
