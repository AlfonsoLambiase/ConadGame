
import dynamic from "next/dynamic";

const CreaParole = dynamic(() => import('@/components/crea-parole-game'), {
  ssr: false,
});

export default function CreaParolePage() {
  return (
    <div className="bg-black text-white h-screen">
      <CreaParole 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
