import dynamic from "next/dynamic";

const ColpoVincenteGame = dynamic(() => import('@/components/colpo-vincente-game'), {
  ssr: false,
});

export default function ColpoVincentePage() {
  return (
    <div className="bg-black text-white h-screen">
      <ColpoVincenteGame 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}