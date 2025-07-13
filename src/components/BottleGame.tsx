/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";
import { Boot } from "@/phaser/bottle-sort-puzzle/scenes/boot";
import { Game } from "@/phaser/bottle-sort-puzzle/scenes/game";
import { Outro } from "@/phaser/bottle-sort-puzzle/scenes/outro";
import { Tutorial } from "@/phaser/bottle-sort-puzzle/scenes/tutorial";
import { ExitManager } from "@/phaser/bottle-sort-puzzle/scenes/exit-manager";
import { TimerManager } from "@/phaser/bottle-sort-puzzle/scenes/timer-manager";
import { BottleSortPuzzleManager } from "@/phaser/bottle-sort-puzzle/scenes/bottle-sort-puzzle-manager";
import { BottleSortPuzzleAssetConf } from "@/phaser/bottle-sort-puzzle/shared/config/asset-conf.const";
import { BottleSortPuzzleConfig } from "@/phaser/bottle-sort-puzzle/config/bottle-sort-puzzle-config";

export default function BottleSortPuzzleGame({
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
    backgroundImage: "url('/games/bottle-sort-puzzle/images/loadingBackground.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "100%",
  });

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({
      ...BottleSortPuzzleConfig,
      parent: gameRef.current,
    });

    gameInstance.current = game;

    // Registrazione delle scene
    game.scene.add(BottleSortPuzzleAssetConf.scene.boot, Boot);
    game.scene.add(BottleSortPuzzleAssetConf.scene.game, Game);
    game.scene.add(BottleSortPuzzleAssetConf.scene.tutorial, Tutorial);
    game.scene.add(BottleSortPuzzleAssetConf.scene.timerManager, TimerManager);
    game.scene.add(BottleSortPuzzleAssetConf.scene.bottleSortManager, BottleSortPuzzleManager);
    game.scene.add(BottleSortPuzzleAssetConf.scene.exitManager, ExitManager);
    game.scene.add(BottleSortPuzzleAssetConf.scene.outro, Outro);

    // LOGHI dinamici (qui metti la tua logica reale)
    let sponsorLogo = "/games/platformer/images/logo_purinaone.png";
    let brand = "/games/bottle-sort-puzzle/images/brand_NoBrand.png";

    // Esempio dummy (sostituisci con la tua logica reale)
    if (isTesting) {
      sponsorLogo = "/games/platformer/images/logo_nescafe.png";
      brand = "/games/bottle-sort-puzzle/images/brand_nescafe.png";
    } else {
      brand = "/games/bottle-sort-puzzle/images/brand_NoBrand.png";
    }

    const logoPhaser = "/games/bottle-sort-puzzle/images/logoPhaser.png";

    game.scene.start(BottleSortPuzzleAssetConf.scene.boot, {
      logo: sponsorLogo,
      brand,
      isTesting,
      logoPhaser,
    });

    const handleEndGame = () => setLevelComplete();
    const handleExitGame = () => setExitGame();
    const handleChangeBackground = () =>
      setBackgroundStyle({
        backgroundColor: "black",
        width: "100%",
        height: "100%",
      });

    EventBus.on(PhaserEvents.END_GAME, handleEndGame);
    EventBus.on(PhaserEvents.EXIT_GAME, handleExitGame);
    EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);

    return () => {
      EventBus.off(PhaserEvents.END_GAME, handleEndGame);
      EventBus.off(PhaserEvents.EXIT_GAME, handleExitGame);
      EventBus.off(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);
      cleanGameMemory();
    };
  }, [isTesting, setLevelComplete, setExitGame]);

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
