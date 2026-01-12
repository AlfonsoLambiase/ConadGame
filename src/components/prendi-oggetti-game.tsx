
import {useEffect, useRef, useState, CSSProperties} from "react";
import * as Phaser from "phaser";

import {EventBus} from "@/phaser/EventBus";
import {PhaserEvents} from "@/lib/phaser-events";
import {Boot} from "@/phaser/prendi-oggetti/scenes/boot"; //*
import {Game} from "@/phaser/prendi-oggetti/scenes/game"; //*
import {Outro} from "@/phaser/prendi-oggetti/scenes/outro"; //*
import {Tutorial} from "@/phaser/prendi-oggetti/scenes/tutorial"; //*
import {ExitManager} from "@/phaser/prendi-oggetti/scenes/exit-manager"; //*
import {TimerManager} from "@/phaser/prendi-oggetti/scenes/timer-manager"; //*
import {PrendiOggettiAssetConf} from "@/phaser/prendi-oggetti/shared/config/asset-conf.const"; //*
import {GameManager} from "@/phaser/prendi-oggetti/scenes/game-manager"; //* //*
import {PrendiOggettiConfig} from "@/phaser/prendi-oggetti/config/prendi-oggetti-config"; //* //*
import {UIManager} from "@/phaser/prendi-oggetti/components/UIManager";

const assetConf = PrendiOggettiAssetConf; //* Generalizzazione
const gameName = "prendi-oggetti"; //* Generalizzazione

export default function PrendiOggettiGame({
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
      ...PrendiOggettiConfig, //*
      parent: gameRef.current,
    });

    gameInstance.current = game; // Salva l'istanza del gioco

    // Registriamo le scene manualmente
    game.scene.add(assetConf.scene.boot, Boot);
    game.scene.add(assetConf.scene.game, Game);
    game.scene.add(assetConf.scene.tutorial, Tutorial);
    game.scene.add(assetConf.scene.timerManager, TimerManager);
    game.scene.add(assetConf.scene.gameManager, GameManager); //* //*
    game.scene.add(assetConf.scene.uiManager, UIManager);
    game.scene.add(assetConf.scene.exitManager, ExitManager);
    game.scene.add(assetConf.scene.outro, Outro);

    //! Sono parametri da personalizzare
    let sponsorLogo = `/games/${gameName}/images/brand_NoBrand.png`;
    let brand = `/games/${gameName}/images/brand_NoBrand.png`;

  brand = `/games/${gameName}/images/brand_NoBrand.png`;
    //! parametro test
    let logoPhaser = `/games/${gameName}/images/logoPhaser.png`;
    
    sponsorLogo = `/games/${gameName}/images/logo_purinaone.png`;
    logoPhaser = `/games/${gameName}/images/logoPhaser.png`;

    game.scene.start(assetConf.scene.boot, {
      //! Inserire qui i parametri desiderati
      logo: sponsorLogo,
      brand: brand,
      isTesting,
      logoPhaser, //! parametro test
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

  return (
    <div style={backgroundStyle}>
      <div ref={gameRef} />
    </div>
  );
}
