/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";
import { Boot } from "@/phaser/basket/scenes/boot";
import { Game } from "@/phaser/basket/scenes/game";
import { Outro } from "@/phaser/basket/scenes/outro";
import { Tutorial } from "@/phaser/basket/scenes/tutorial";
import { ExitManager } from "@/phaser/basket/scenes/exit-manager";
import { TimerManager } from "@/phaser/basket/scenes/timer-manager";
import { BasketManager } from "@/phaser/basket/scenes/basket-manager";
import { BasketAssetConf } from "@/phaser/basket/shared/config/asset-conf.const";
import { GameDemo02Config } from "@/phaser/basket/config/basket-config";

// Qui definisci il basePath da env
const basePath = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true" ? "/conad_prova" : "";

export default function GameDemo02Game({
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
    backgroundImage: `url('${basePath}/games/basket/images/loadingBackground.jpg')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "100%",
  });

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({
      ...GameDemo02Config,
      parent: gameRef.current,
    });

    gameInstance.current = game;

    // Scene setup
    game.scene.add(BasketAssetConf.scene.boot, Boot);
    game.scene.add(BasketAssetConf.scene.game, Game);
    game.scene.add(BasketAssetConf.scene.tutorial, Tutorial);
    game.scene.add(BasketAssetConf.scene.timerManager, TimerManager);
    game.scene.add(BasketAssetConf.scene.basketManager, BasketManager);
    game.scene.add(BasketAssetConf.scene.exitManager, ExitManager);
    game.scene.add(BasketAssetConf.scene.outro, Outro);

    // LOGHI
    let sponsorLogo = `${basePath}/games/basket/images/logo_purinaone.png`;
    let brand = `${basePath}/games/basket/images/brand_NoBrand.png`;

    if (true) {
      sponsorLogo = `${basePath}/games/platformer/images/logo_nescafe.png`;
      brand = `${basePath}/games/basket/images/brand_nescafe.png`;
    } else {
      brand = `${basePath}/games/basket/images/brand_NoBrand.png`;
    }

    const logoPhaser = `${basePath}/games/basket/images/logoPhaser.png`;

    game.scene.start(BasketAssetConf.scene.boot, {
      logo: sponsorLogo,
      brand: brand,
      isTesting,
      logoPhaser,
    });

    const handleEndGame = () => {
      setLevelComplete();
    };

    const handleExitGame = () => {
      setExitGame();
    };

    const handleChangeBackground = () => {
      setBackgroundStyle({
        backgroundColor: "black",
        width: "100%",
        height: "100%",
      });
    };

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
