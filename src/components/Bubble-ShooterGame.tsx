/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";
import { Boot } from "@/phaser/bubble-shooter/scenes/boot";
import { Game } from "@/phaser/bubble-shooter/scenes/game";
import { Outro } from "@/phaser/bubble-shooter/scenes/outro";
import { Tutorial } from "@/phaser/bubble-shooter/scenes/tutorial";
import { ExitManager } from "@/phaser/bubble-shooter/scenes/exit-manager";
import { TimerManager } from "@/phaser/bubble-shooter/scenes/timer-manager";
import { BubbleShooterManager } from "@/phaser/bubble-shooter/scenes/bubble-shooter-manager";
import { BubbleShooterAssetConf } from "@/phaser/bubble-shooter/shared/config/asset-conf.const";
import { BubbleShooterConfig } from "@/phaser/bubble-shooter/config/bubble-shooter-config";

const basePath = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true" ? "/conad_prova2" : "";

export default function BubbleShooterGame({
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
    backgroundImage: `url('${basePath}/games/bubble-shooter/images/loadingBackground.jpg')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "100%",
  });

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({
      ...BubbleShooterConfig,
      parent: gameRef.current,
    });

    gameInstance.current = game;

    // Registriamo le scene
    game.scene.add(BubbleShooterAssetConf.scene.boot, Boot);
    game.scene.add(BubbleShooterAssetConf.scene.game, Game);
    game.scene.add(BubbleShooterAssetConf.scene.tutorial, Tutorial);
    game.scene.add(BubbleShooterAssetConf.scene.timerManager, TimerManager);
    game.scene.add(BubbleShooterAssetConf.scene.bubbleShooterManager, BubbleShooterManager);
    game.scene.add(BubbleShooterAssetConf.scene.exitManager, ExitManager);
    game.scene.add(BubbleShooterAssetConf.scene.outro, Outro);

    // LOGHI dinamici
    let sponsorLogo = `${basePath}/games/platformer/images/logo_purinaone.png`;
    let brand = `${basePath}/games/bubble-shooter/images/brand_NoBrand.png`;

    // Qui puoi mettere la tua logica reale, esempio finto per test:
    if (true) {
      sponsorLogo = `${basePath}/games/platformer/images/logo_nescafe.png`;
      brand = `${basePath}/games/bubble-shooter/images/brand_nescafe.png`;
    } else {
      brand = `${basePath}/games/bubble-shooter/images/brand_NoBrand.png`;
    }

    const logoPhaser = `${basePath}/games/bubble-shooter/images/logoPhaser.png`;

    game.scene.start(BubbleShooterAssetConf.scene.boot, {
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
  }, [isTesting]);

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
