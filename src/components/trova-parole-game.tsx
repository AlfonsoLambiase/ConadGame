import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";

import { Boot } from "@/phaser/trova-parole/scenes/boot"; //*
import { Game } from "@/phaser/trova-parole/scenes/game"; //*
import { Outro } from "@/phaser/trova-parole/scenes/outro"; //*
import { Tutorial } from "@/phaser/trova-parole/scenes/tutorial"; //*
import { ExitManager } from "@/phaser/trova-parole/scenes/exit-manager"; //*
import { TimerManager } from "@/phaser/trova-parole/scenes/timer-manager"; //*
import { TrovaParoleAssetConf } from "@/phaser/trova-parole/shared/config/asset-conf.const"; //*
import { GameManager } from "@/phaser/trova-parole/scenes/game-manager"; //* //*
import { TrovaParoleConfig } from "@/phaser/trova-parole/config/trova-parole-config"; //* //*

const assetConf = TrovaParoleAssetConf; //* Generalizzazione
const gameName = "trova-parole"; //* Generalizzazione

export default function TrovaParoleGame({
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
      ...TrovaParoleConfig, //*
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
    let sponsorLogo = "/games/platformer/images/logo_purinaone.png";

    sponsorLogo = "/games/platformer/images/logo_barilla.png";

    game.scene.start(assetConf.scene.boot, {
      //! Inserire qui i parametri desiderati
      logo: sponsorLogo,
      isTesting,
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
  }, []);

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

  //! Simulazione sfondo e logo
  // return (
  //   <div
  //     style={{
  //       width: "100%",
  //       paddingTop: "env(safe-area-inset-top)",
  //       display: "flex",
  //       flexDirection: "column",
  //       alignItems: "center",
  //     }}
  //   >
  //     {/* Contenitore logo */}
  //     <div
  //       style={{
  //         backgroundColor: "white",
  //         borderBottomLeftRadius: "1rem",
  //         borderBottomRightRadius: "1rem",
  //         padding: "8px",
  //         maxWidth: "180px",
  //         width: "100%",
  //         display: "flex",
  //         justifyContent: "center",
  //         boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  //       }}
  //     >
  //       <img
  //         alt="sponsorLogo"
  //         src="/images/logo_intro.png"
  //         style={{
  //           maxHeight: "60px",
  //           width: "auto",
  //           objectFit: "contain",
  //         }}
  //       />
  //     </div>

  //     {/* Resto del contenuto */}
  //     <div ref={gameRef} style={{width: "100%"}} />
  //   </div>
  // );
}
