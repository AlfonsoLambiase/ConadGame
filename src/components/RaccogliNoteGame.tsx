
import {useEffect, useRef, useState, CSSProperties} from "react";
import * as Phaser from "phaser";
 
import {EventBus} from "@/phaser/EventBus";
import {PhaserEvents} from "@/lib/phaser-events";
import {Boot} from "@/phaser/raccogli-note/scenes/boot"; //*
import {Game} from "@/phaser/raccogli-note/scenes/game"; //*
import {Outro} from "@/phaser/raccogli-note/scenes/outro"; //*
import {Tutorial} from "@/phaser/raccogli-note/scenes/tutorial"; //*
import {ExitManager} from "@/phaser/raccogli-note/scenes/exit-manager"; //*
import {TimerManager} from "@/phaser/raccogli-note/scenes/timer-manager"; //*
import {RaccogliNoteAssetConf} from "@/phaser/raccogli-note/shared/config/asset-conf.const"; //*
import {RaccogliNoteManager} from "@/phaser/raccogli-note/scenes/raccogli-note-manager"; //* //*
import {RaccogliNoteConfig} from "@/phaser/raccogli-note/config/raccogli-note-config"; //* //*
 
const assetConf = RaccogliNoteAssetConf; //* Generalizzazione
const gameName = "raccogli-note"; //* Generalizzazione
 
export default function RaccogliNoteGame({
  isTesting,
  setLevelComplete,
  setExitGame,
}: {
  isTesting: boolean;
  setLevelComplete: () => void;
  setExitGame: () => void;
}) {
//   const gameContext = useGame();
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
      ...RaccogliNoteConfig, //*
      parent: gameRef.current,
    });
 
    gameInstance.current = game; // Salva l'istanza del gioco
 
    // Registriamo le scene manualmente
    game.scene.add(assetConf.scene.boot, Boot);
    game.scene.add(assetConf.scene.game, Game);
    game.scene.add(assetConf.scene.tutorial, Tutorial);
    game.scene.add(assetConf.scene.timerManager, TimerManager);
    game.scene.add(assetConf.scene.raccogliNoteManager, RaccogliNoteManager); //* //*
    game.scene.add(assetConf.scene.exitManager, ExitManager);
    game.scene.add(assetConf.scene.outro, Outro);
 
    //! Sono parametri da personalizzare
    //* NOTA: se non si vuole mettere nessun logo quando è nobrand scirvere: empty
    let sponsorLogo = "/images/loghi/logo_verso_natura.png";
 
   sponsorLogo = "/images/loghi/logo_verso_natura.png";
 
    game.scene.start(assetConf.scene.boot, {
      //! Inserire qui i parametri desiderati
      sponsorLogo,
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
 