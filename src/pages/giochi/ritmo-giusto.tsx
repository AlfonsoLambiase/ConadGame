
import dynamic from "next/dynamic";

const RitmoGiusto = dynamic(() => import('@/components/ritmo-giusto-game'), {
  ssr: false,
});

export default function RitmoGiustoPage() {
  return (
    <div className="bg-black text-white h-screen">
      <RitmoGiusto 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
