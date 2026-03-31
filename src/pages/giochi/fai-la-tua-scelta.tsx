import dynamic from "next/dynamic";

const FaiLaTuaSceltaGame = dynamic(() => import('@/components/fai-la-tua-scelta-game'), {
  ssr: false,
});

export default function FaiLaTuaSceltaPage() {
  return (
    <div className="bg-black text-white h-screen">
      <FaiLaTuaSceltaGame 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
