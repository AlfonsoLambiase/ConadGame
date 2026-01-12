import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";

import { Boot } from "@/phaser/impara-inglese/scenes/boot";
import { Game } from "@/phaser/impara-inglese/scenes/game";
import { Outro } from "@/phaser/impara-inglese/scenes/outro";
import { Tutorial } from "@/phaser/impara-inglese/scenes/tutorial";
import { ExitManager } from "@/phaser/impara-inglese/scenes/exit-manager";
import { TimerManager } from "@/phaser/impara-inglese/scenes/timer-manager";
import { GameManager } from "@/phaser/impara-inglese/scenes/game-manager";
import { ImparaIngleseAssetConf } from "@/phaser/impara-inglese/shared/config/asset-conf.const";
import { assetConfig } from "@/phaser/impara-inglese/config/impara-inglese-config";

const assetConf = ImparaIngleseAssetConf;
const gameName = "template";

export default function ImparaIngleseGame({
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

  const [backgroundStyle, setBackgroundStyle] = useState<CSSProperties>({
    backgroundImage: `url('/games/${gameName}/images/loadingBackground_logo.png'), url('/games/${gameName}/images/loadingBackground.png')`,
    backgroundSize: "100% auto, cover",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    width: "100%",
    height: "100%",
  });

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({
      ...assetConfig,
      parent: gameRef.current,
    });

    gameInstance.current = game;

    // 🔹 Registrazione scene
    game.scene.add(assetConf.scene.boot, Boot);
    game.scene.add(assetConf.scene.game, Game);
    game.scene.add(assetConf.scene.tutorial, Tutorial);
    game.scene.add(assetConf.scene.timerManager, TimerManager);
    game.scene.add(assetConf.scene.gameManager, GameManager);
    game.scene.add(assetConf.scene.exitManager, ExitManager);
    game.scene.add(assetConf.scene.outro, Outro);

    // Logo sponsor
    const sponsorLogo = "empty";

    game.scene.start(assetConf.scene.boot, {
      sponsorLogo,
      isTesting,
    });

    const handleEndGame = () => {
      setLevelComplete();
      handleExit();
    };

    const handleExitGame = () => {
      setExitGame();
      handleExit();
    };

    const handleExit = () => {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    };

    const handleChangeBackground = () => {
      console.log("handleChangeBackground");
      setBackgroundStyle({
        backgroundColor: "black",
        width: "100%",
        height: "100%",
      });
    };

    // Event listeners
    EventBus.on(PhaserEvents.END_GAME, handleEndGame);
    EventBus.on(PhaserEvents.EXIT_GAME, handleExitGame);
    EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);

    // Cleanup
    return () => {
      EventBus.off(PhaserEvents.END_GAME, handleEndGame);
      EventBus.off(PhaserEvents.EXIT_GAME, handleExitGame);
      EventBus.off(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);

      cleanGameMemory();
    };
  }, [isTesting, setExitGame, setLevelComplete]);

  function cleanGameMemory() {
    if (gameInstance.current) {
      try {
        gameInstance.current.destroy(true);
      } catch (err) {
        console.warn("Errore durante il destroy del gioco:", err);
      }
      gameInstance.current = null;
    }
  }

  return (
    <div style={backgroundStyle}>
      <div ref={gameRef} />
    </div>
  );
}
