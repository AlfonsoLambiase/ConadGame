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
