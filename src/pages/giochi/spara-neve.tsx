import dynamic from "next/dynamic";

// Import dinamico del componente Phaser (BasketGame) che sta in phaser/basket
const SparaNeveGame = dynamic(() => import('@/components/SparaNeveGame'), {
  ssr: false,
});

export default function SparaNevePage() {
  return (
    <div className="bg-black text-white h-screen">
      <SparaNeveGame 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}


/*
// import dynamic from "next/dynamic";

// // Import dinamico del componente Phaser (BasketGame) che sta in phaser/basket
// const SparaNeveGame = dynamic(() => import('@/components/SparaNeveGame'), {
//   ssr: false,
// });

// export default function SparaNevePage() {
//   return (
//     <div className="bg-black text-white h-screen">
//       <SparaNeveGame 
//   isTesting={false} 
//   setLevelComplete={() => console.log("Livello completato")} 
//   setExitGame={() => console.log("Esco dal gioco")} 
// />

//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Import dinamico del componente Phaser
const SparaNeveGame = dynamic(() => import("@/components/SparaNeveGame"), {
  ssr: false,
});

export default function SparaNevePage() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    function checkOrientation() {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
    }

    // Controllo iniziale
    checkOrientation();

    // Listener per quando ruoti lo schermo
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", () =>
      setTimeout(checkOrientation, 200)
    );

    return () => {
      window.removeEventListener("resize", checkOrientation);
    };
  }, []);

  return (
    <div className="bg-black text-white h-screen">
      {/* overlay che appare finché NON sei in landscape * /}
      {!isLandscape && (
        <div
          id="rotate-device"
          className="fixed inset-0 bg-black/90 text-white flex items-center justify-center z-50"
        >
          <p className="text-3xl px-8 text-center">
            Ruota il dispositivo per giocare
          </p>
        </div>
      )}

      {/* il gioco viene caricato SOLO in landscape * /}
      <SparaNeveGame
        isTesting={false}
        setLevelComplete={() => console.log("Livello completato")}
        setExitGame={() => console.log("Esco dal gioco")}
      />
    </div>
  );
}

*/