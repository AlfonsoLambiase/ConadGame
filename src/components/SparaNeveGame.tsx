
// import {useEffect, useRef, useState, CSSProperties} from "react";
// import * as Phaser from "phaser";
 
// import {EventBus} from "@/phaser/EventBus";
// import {PhaserEvents} from "@/lib/phaser-events";

// import {Boot} from "@/phaser/sparaneve/scenes/boot"; //*
// import {Game} from "@/phaser/sparaneve/scenes/game"; //*
// import {Outro} from "@/phaser/sparaneve/scenes/outro"; //*
// import {Tutorial} from "@/phaser/sparaneve/scenes/tutorial"; //*
// import {ExitManager} from "@/phaser/sparaneve/scenes/exit-manager"; //*
// import {TimerManager} from "@/phaser/sparaneve/scenes/timer-manager"; //*
// import {SparaNeveAssetConf} from "@/phaser/sparaneve/shared/config/asset-conf.const"; //*
// import {GameSparaNeveManager} from "@/phaser/sparaneve/scenes/sparaneve-manager"; //* //*
// import {GameSparaNeveConfig} from "@/phaser/sparaneve/config/sparaneve-config"; //* //*
// import MainMenu from "@/phaser/sparaneve/scenes/main-menu";
// import MainGame from "@/phaser/sparaneve/scenes/main-game";
// import MobileControlsScene from "@/phaser/sparaneve/shared/utils/mobile-controls";
 
// const assetConf = SparaNeveAssetConf; //* Generalizzazione
// const gameName = "sparaneve"; //* Generalizzazione
 
// export default function SparaNeveGame({
//   isTesting,
//   setLevelComplete,
//   setExitGame,
// }: {
//   isTesting: boolean;
//   setLevelComplete: () => void;
//   setExitGame: () => void;
// }) {

//   const gameRef = useRef<HTMLDivElement>(null);
//   const gameInstance = useRef<Phaser.Game | null>(null);
 
//   // Stato iniziale con due background
//   const [backgroundStyle, setBackgroundStyle] = useState<CSSProperties>({
//     backgroundImage: `url('/games/${gameName}/images/loadingBackground_logo.png'), url('/games/${gameName}/images/loadingBackground.png')`,
//     backgroundSize: "contain, cover", // Prima immagine 150px, seconda copre tutto
//     backgroundPosition: "center, center",
//     backgroundRepeat: "no-repeat, no-repeat",
//     width: "100%",
//     height: "100%",
//   });
 
//   useEffect(() => {
//     if (!gameRef.current) return;
 
//     const game = new Phaser.Game({
//       ...GameSparaNeveConfig, //*
//       parent: gameRef.current,
//     });
 
//     gameInstance.current = game; // Salva l'istanza del gioco
 
//     // Registriamo le scene manualmente
//     game.scene.add(assetConf.scene.boot, Boot);
//     game.scene.add(assetConf.scene.game, Game);
//     game.scene.add(assetConf.scene.mainMenu, MainMenu);
//     game.scene.add(assetConf.scene.mainGame, MainGame);
//     game.scene.add(assetConf.scene.tutorial, Tutorial);
//     game.scene.add(assetConf.scene.timerManager, TimerManager);
//     game.scene.add(assetConf.scene.sparaNeveManager, GameSparaNeveManager); //* //*
//     game.scene.add(assetConf.scene.exitManager, ExitManager);
//     game.scene.add(assetConf.scene.outro, Outro);
//     game.scene.add(assetConf.scene.mobileControlsScene, MobileControlsScene);
 
//     //! Sono parametri da personalizzare
//     //* NOTA: se non si vuole mettere nessun logo quando è nobrand scirvere: empty
//     let sponsorLogo = "empty";
//     //let sponsorLogo = "/images/loghi/logo_verso_natura.png";
//     let backgroundGame = `/games/${gameName}/images/backgroundGame_0.png`;
//     sponsorLogo = "empty";
    
//   backgroundGame = `/games/${gameName}/images/backgroundGame_1.png`;
//     game.scene.start(assetConf.scene.boot, {
//       //! Inserire qui i parametri desiderati
//       sponsorLogo,
//       isTesting,
//       backgroundGame,
//     });
 
//     const handleEndGame = () => {
//       setLevelComplete();
//     };
 
//     const handleExitGame = () => {
//       setExitGame();
//     };
 
//     const handleChangeBackground = () => {
//       console.log("handleChangeBackground");
//       setBackgroundStyle({
//         backgroundColor: "black",
//         width: "100%",
//         height: "100%",
//       });
//     };
 
//     EventBus.on(PhaserEvents.END_GAME, handleEndGame);
//     EventBus.on(PhaserEvents.EXIT_GAME, handleExitGame);
//     EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);
 
//     // Cleanup function
//     return () => {
//       EventBus.off(PhaserEvents.END_GAME, handleEndGame);
//       EventBus.off(PhaserEvents.EXIT_GAME, handleExitGame);
//       EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);
 
//       cleanGameMemory();
//     };
//   }, [isTesting, setExitGame, setLevelComplete]);
 
//   function cleanGameMemory() {
//     if (gameInstance.current) {
//       gameInstance.current.destroy(true);
//       gameInstance.current = null;
//     }
//   }
 
//   return (
//     <div style={backgroundStyle}>
//       <div ref={gameRef} />
//     </div>
//   );
// }

// // SparaNeveGame.tsx
// "use client";

// import { useEffect, useRef, useState, CSSProperties } from "react";
// import * as Phaser from "phaser";

// import { EventBus } from "@/phaser/EventBus";
// import { PhaserEvents } from "@/lib/phaser-events";

// import { Boot } from "@/phaser/sparaneve/scenes/boot";
// import { Game } from "@/phaser/sparaneve/scenes/game";
// import { Outro } from "@/phaser/sparaneve/scenes/outro";
// import { Tutorial } from "@/phaser/sparaneve/scenes/tutorial";
// import { ExitManager } from "@/phaser/sparaneve/scenes/exit-manager";
// import { TimerManager } from "@/phaser/sparaneve/scenes/timer-manager";
// import { SparaNeveAssetConf } from "@/phaser/sparaneve/shared/config/asset-conf.const";
// import { GameSparaNeveManager } from "@/phaser/sparaneve/scenes/sparaneve-manager";
// import { createGameConfig } from "@/phaser/sparaneve/config/sparaneve-config";
// import MainMenu from "@/phaser/sparaneve/scenes/main-menu";
// import MainGame from "@/phaser/sparaneve/scenes/main-game";
// import MobileControlsScene from "@/phaser/sparaneve/shared/utils/mobile-controls";

// // Tipo minimale per il metodo lock
// type OrientationLockType =
//   | "landscape"
//   | "portrait"
//   | "any"
//   | "natural"
//   | "landscape-primary"
//   | "landscape-secondary"
//   | "portrait-primary"
//   | "portrait-secondary";

// // Interfaccia minima per screen.orientation con lock
// interface ScreenOrientationWithLock {
//   lock(orientation: OrientationLockType): Promise<void>;
// }

// // Funzione helper per restituire screen.orientation tipato
// function getScreenOrientation(): ScreenOrientationWithLock | null {
//   // Primo caso: screen.orientation esiste
//   const orientationCandidate = (screen as unknown as { orientation?: unknown }).orientation;

//   if (orientationCandidate && typeof (orientationCandidate as ScreenOrientationWithLock).lock === "function") {
//     return orientationCandidate as ScreenOrientationWithLock;
//   }

//   // Fallback: alcuni browser (iOS Safari) potrebbero avere screen.lock
//   const screenCandidate = screen as unknown as { lock?: (o: OrientationLockType) => Promise<void> };

//   if (screenCandidate.lock && typeof screenCandidate.lock === "function") {
//     return screenCandidate as ScreenOrientationWithLock;
//   }

//   return null;
// }



// const assetConf = SparaNeveAssetConf;
// const gameName = "sparaneve";

// export default function SparaNeveGame({
//   isTesting,
//   setLevelComplete,
//   setExitGame,
// }: {
//   isTesting: boolean;
//   setLevelComplete: () => void;
//   setExitGame: () => void;
// }) {
//   const gameRef = useRef<HTMLDivElement | null>(null);
//   const gameInstance = useRef<Phaser.Game | null>(null);
//   const [backgroundStyle, setBackgroundStyle] = useState<CSSProperties>({
//     backgroundImage: `url('/games/${gameName}/images/loadingBackground_logo.png'), url('/games/${gameName}/images/loadingBackground.png')`,
//     backgroundSize: "contain, cover",
//     backgroundPosition: "center, center",
//     backgroundRepeat: "no-repeat, no-repeat",
//     width: "100%",
//     height: "100%",
//   });

//   // stato solo per debug / fallback UI se vuoi mostrare un bottone
//   const [needsUserGesture, setNeedsUserGesture] = useState(false);

//   useEffect(() => {
//     if (!gameRef.current) return;

//     let mounted = true;

//     async function tryStart() {
//       // 1) prova a mettere in fullscreen e lockare orientamento (se supportato)
//       const container = gameRef.current!.parentElement || gameRef.current!; // il #game-container o il wrapper
//       let orientationLocked = false;
//       let usedFullscreen = false;

//       try {
//         // screen.orientation.lock richiede spesso fullscreen & gesture
//         const screenOrientation = (screen as any).orientation || (screen as any);
//         const canLock = typeof screenOrientation?.lock === "function";

//         if (canLock) {
//           // prova a entrare in fullscreen
//           if (container.requestFullscreen) {
//             try {
//               await container.requestFullscreen();
//               usedFullscreen = true;
//             } catch (err) {
//               // fullscreen negato
//             }
//           }

//           // prova lock
//           try {
//             await screenOrientation.lock("landscape");
//             orientationLocked = true;
//             console.log("Orientation locked to landscape");
//           } catch (err) {
//             console.warn("Orientation lock failed:", err);
//           }
//         } else {
//           console.info("Screen Orientation API not available");
//         }
//       } catch (err) {
//         console.warn("Orientation attempt error", err);
//       }

//       // 2) se lock fallisce, useremo fallback CSS + inverted dimensions
//       const isPortrait = window.innerHeight > window.innerWidth;
//       const forceCssRotation = !orientationLocked && isPortrait;

//       // se il lock non è possibile E il browser richiede gesture per fullscreen,
//       // potresti voler mostrare un bottone che faccia requestFullscreen() (facoltativo)
//       if (!orientationLocked && !usedFullscreen && isPortrait) {
//         // molti browser richiedono che l'utente faccia un gesto per entrare in fullscreen.
//         // Non forziamo un prompt qui: settiamo flag così puoi mostrare UI se vuoi.
//         setNeedsUserGesture(true);
//       }

//       // 3) create config: se forziamo rotazione via CSS dobbiamo invertire width/height in config
//       const orientationToUse = "landscape" as const;
//       const config = createGameConfig(orientationToUse, [Boot, Tutorial, Game, MainMenu, MainGame, TimerManager, GameSparaNeveManager, ExitManager, Outro, MobileControlsScene], {
//         forcePortraitRotation: forceCssRotation
//       });

//       if (!mounted) return;

//       // 4) aggiungi classe 'landscape' al container se usiamo il fallback CSS
//       const parentContainer = document.getElementById("game-container");
//       if (parentContainer) {
//         if (forceCssRotation) parentContainer.classList.add("landscape");
//         else parentContainer.classList.remove("landscape");
//       }

//       // 5) crea l'istanza Phaser
//       const game = new Phaser.Game({
//         ...config,
//         parent: gameRef.current!,
//       });

//       gameInstance.current = game;

//       // registra le scene come prima (le aggiungiamo manualmente)
//       game.scene.add(assetConf.scene.boot, Boot);
//       game.scene.add(assetConf.scene.game, Game);
//       game.scene.add(assetConf.scene.mainMenu, MainMenu);
//       game.scene.add(assetConf.scene.mainGame, MainGame);
//       game.scene.add(assetConf.scene.tutorial, Tutorial);
//       game.scene.add(assetConf.scene.timerManager, TimerManager);
//       game.scene.add(assetConf.scene.sparaNeveManager, GameSparaNeveManager);
//       game.scene.add(assetConf.scene.exitManager, ExitManager);
//       game.scene.add(assetConf.scene.outro, Outro);
//       game.scene.add(assetConf.scene.mobileControlsScene, MobileControlsScene);

//       // start boot con params
//       const sponsorLogo = "empty";
//       const backgroundGame = `/games/${gameName}/images/backgroundGame_1.png`;

//       game.scene.start(assetConf.scene.boot, {
//         sponsorLogo,
//         isTesting,
//         backgroundGame,
//       });

//       // listeners EventBus
//       const handleEndGame = () => setLevelComplete();
//       const handleExitGame = () => setExitGame();
//       const handleChangeBackground = () => {
//         setBackgroundStyle({
//           backgroundColor: "black",
//           width: "100%",
//           height: "100%",
//         });
//       };

//       EventBus.on(PhaserEvents.END_GAME, handleEndGame);
//       EventBus.on(PhaserEvents.EXIT_GAME, handleExitGame);
//       EventBus.on(PhaserEvents.CHANGE_BACKGROUND, handleChangeBackground);
//     }

//     tryStart();

//     return () => {
//       mounted = false;
//       // cleanup
//       EventBus.off(PhaserEvents.END_GAME);
//       EventBus.off(PhaserEvents.EXIT_GAME);
//       EventBus.off(PhaserEvents.CHANGE_BACKGROUND);
//       if (gameInstance.current) {
//         gameInstance.current.destroy(true);
//         gameInstance.current = null;
//       }
//     };
//   }, [isTesting, setExitGame, setLevelComplete]);

//   // Bottoncino opzionale per entrare in fullscreen + lock (utile su browser che richiedono gesture)
//   const onRequestFullscreenAndLock = async () => {
//     // const container = gameRef.current?.parentElement || gameRef.current;
//     // try {
//     //   if (container && container.requestFullscreen) await container.requestFullscreen();
//     //   const screenOrientation = (screen as any).orientation || (screen as any);
//     //   if (typeof screenOrientation?.lock === "function") {
//     //     await screenOrientation.lock("landscape");
//     //     // ricarica la pagina / o restart del gioco per essere sicuri che config venga applicata
//     //     window.location.reload();
//     //   }
//     // } catch (err) {
//     //   console.warn("FullScreen/Lock failed", err);
//     // }
//     const orientationCtrl = getScreenOrientation();
// let orientationLocked = false;

// if (orientationCtrl) {
//   try {
//     await orientationCtrl.lock("landscape");
//     orientationLocked = true;
//   } catch (err) {
//     console.warn("Orientation lock failed", err);
//   }
// } else {
//   console.info("Orientation API not supported");
// }
//   };

//   return (
//     <div style={backgroundStyle} id="game-container">
//       <div ref={gameRef} />
//       {needsUserGesture && (
//         <div style={{
//           position: "fixed", inset: 0, zIndex: 60,
//           display: "flex", alignItems: "center", justifyContent: "center",
//           pointerEvents: "auto",
//         }}>
//           <button
//             onClick={onRequestFullscreenAndLock}
//             style={{
//               padding: "14px 20px",
//               borderRadius: 8,
//               background: "#ef6c00",
//               color: "white",
//               fontSize: 16,
//               border: "none"
//             }}
//           >
//             Apri in fullscreen e riproduci (consigliato)
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState, CSSProperties } from "react";
import * as Phaser from "phaser";

import { EventBus } from "@/phaser/EventBus";
import { PhaserEvents } from "@/lib/phaser-events";

import { Boot } from "@/phaser/sparaneve/scenes/boot";
import { Game } from "@/phaser/sparaneve/scenes/game";
import { Outro } from "@/phaser/sparaneve/scenes/outro";
import { Tutorial } from "@/phaser/sparaneve/scenes/tutorial";
import { ExitManager } from "@/phaser/sparaneve/scenes/exit-manager";
import { TimerManager } from "@/phaser/sparaneve/scenes/timer-manager";
import { SparaNeveAssetConf } from "@/phaser/sparaneve/shared/config/asset-conf.const";
import { GameSparaNeveManager } from "@/phaser/sparaneve/scenes/sparaneve-manager";
import { createGameConfig } from "@/phaser/sparaneve/config/sparaneve-config";
import MainMenu from "@/phaser/sparaneve/scenes/main-menu";
import MainGame from "@/phaser/sparaneve/scenes/main-game";
import MobileControlsScene from "@/phaser/sparaneve/shared/utils/mobile-controls";

const assetConf = SparaNeveAssetConf;
const gameName = "sparaneve";

// ---------------------
// Screen Orientation API helper
// ---------------------
type OrientationLockType =
  | "landscape"
  | "portrait"
  | "any"
  | "natural"
  | "landscape-primary"
  | "landscape-secondary"
  | "portrait-primary"
  | "portrait-secondary";

interface ScreenOrientationWithLock {
  lock(orientation: OrientationLockType): Promise<void>;
}

function getScreenOrientation(): ScreenOrientationWithLock | null {
  const orientationCandidate = (screen as unknown as { orientation?: unknown }).orientation;

  if (orientationCandidate && typeof (orientationCandidate as ScreenOrientationWithLock).lock === "function") {
    return orientationCandidate as ScreenOrientationWithLock;
  }

  const screenCandidate = screen as unknown as { lock?: (o: OrientationLockType) => Promise<void> };

  if (screenCandidate.lock && typeof screenCandidate.lock === "function") {
    return screenCandidate as ScreenOrientationWithLock;
  }

  return null;
}

// ---------------------
// Component principale
// ---------------------
export default function SparaNeveGame({
  isTesting,
  setLevelComplete,
  setExitGame,
}: {
  isTesting: boolean;
  setLevelComplete: () => void;
  setExitGame: () => void;
}) {
  const gameRef = useRef<HTMLDivElement | null>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const [backgroundStyle, setBackgroundStyle] = useState<CSSProperties>({
    backgroundImage: `url('/games/${gameName}/images/loadingBackground_logo.png'), url('/games/${gameName}/images/loadingBackground.png')`,
    backgroundSize: "contain, cover",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    width: "100%",
    height: "100%",
  });
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  useEffect(() => {
    if (!gameRef.current) return;
    let mounted = true;

    async function startGame() {
      const container = gameRef.current!.parentElement || gameRef.current!;
      let orientationLocked = false;
      let usedFullscreen = false;

      // ---------------------
      // 1) tenta lock screen orientation
      // ---------------------
      try {
        const orientationCtrl = getScreenOrientation();
        if (orientationCtrl) {
          // Alcuni browser richiedono fullscreen
          if (container.requestFullscreen) {
            try {
              await container.requestFullscreen();
              usedFullscreen = true;
            } catch {}
          }
          await orientationCtrl.lock("landscape");
          orientationLocked = true;
          console.log("Orientation locked to landscape");
        }
      } catch (err) {
        console.warn("Orientation lock failed:", err);
      }

      // ---------------------
      // 2) fallback CSS se necessario
      // ---------------------
      const isPortrait = window.innerHeight > window.innerWidth;
      const forceCssRotation = !orientationLocked && isPortrait;
      const parentContainer = document.getElementById("game-container");
      if (parentContainer) {
        if (forceCssRotation) parentContainer.classList.add("landscape");
        else parentContainer.classList.remove("landscape");
      }

      if (!orientationLocked && !usedFullscreen && isPortrait) {
        setNeedsUserGesture(true);
      }

      // ---------------------
      // 3) Config Phaser
      // ---------------------
      const config = createGameConfig(
        "landscape",
        [Boot, Tutorial, Game, MainMenu, MainGame, TimerManager, GameSparaNeveManager, ExitManager, Outro, MobileControlsScene],
        { forcePortraitRotation: forceCssRotation }
      );

      if (!mounted) return;

      // ---------------------
      // 4) crea istanza Phaser
      // ---------------------
      const game = new Phaser.Game({ ...config, parent: gameRef.current });
      gameInstance.current = game;

      // aggiungi manualmente le scene
      game.scene.add(assetConf.scene.boot, Boot);
      game.scene.add(assetConf.scene.game, Game);
      game.scene.add(assetConf.scene.mainMenu, MainMenu);
      game.scene.add(assetConf.scene.mainGame, MainGame);
      game.scene.add(assetConf.scene.tutorial, Tutorial);
      game.scene.add(assetConf.scene.timerManager, TimerManager);
      game.scene.add(assetConf.scene.sparaNeveManager, GameSparaNeveManager);
      game.scene.add(assetConf.scene.exitManager, ExitManager);
      game.scene.add(assetConf.scene.outro, Outro);
      game.scene.add(assetConf.scene.mobileControlsScene, MobileControlsScene);

      // start scene boot
      const sponsorLogo = "empty";
      const backgroundGame = `/games/${gameName}/images/backgroundGame_1.png`;
      game.scene.start(assetConf.scene.boot, { sponsorLogo, isTesting, backgroundGame });

      // EventBus listeners
      EventBus.on(PhaserEvents.END_GAME, () => setLevelComplete());
      EventBus.on(PhaserEvents.EXIT_GAME, () => setExitGame());
      EventBus.on(PhaserEvents.CHANGE_BACKGROUND, () =>
        setBackgroundStyle({ backgroundColor: "black", width: "100%", height: "100%" })
      );
    }

    startGame();

    return () => {
      mounted = false;
      EventBus.off(PhaserEvents.END_GAME);
      EventBus.off(PhaserEvents.EXIT_GAME);
      EventBus.off(PhaserEvents.CHANGE_BACKGROUND);
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [isTesting, setLevelComplete, setExitGame]);

  // Bottone opzionale per i browser che richiedono gesture
  const requestFullscreenAndLock = async () => {
    const container = gameRef.current?.parentElement || gameRef.current;
    try {
      if (container && container.requestFullscreen) await container.requestFullscreen();
      const orientationCtrl = getScreenOrientation();
      if (orientationCtrl) {
        await orientationCtrl.lock("landscape");
        window.location.reload(); // reload per applicare lock + config Phaser corrette
      }
    } catch (err) {
      console.warn("Fullscreen/Lock failed", err);
    }
  };

  return (
    <div style={backgroundStyle} id="game-container">
      <div ref={gameRef} />
      {needsUserGesture && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={requestFullscreenAndLock}
            style={{
              padding: "14px 20px",
              borderRadius: 8,
              background: "#ef6c00",
              color: "white",
              fontSize: 16,
              border: "none",
            }}
          >
            Apri in fullscreen e riproduci
          </button>
        </div>
      )}
    </div>
  );
}

