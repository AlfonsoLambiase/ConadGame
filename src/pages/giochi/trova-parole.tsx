
import dynamic from "next/dynamic";

const TrovaParole = dynamic(() => import('@/components/trova-parole-game'), {
  ssr: false,
});

export default function TrovaParolePage() {
  return (
    <div className="bg-black text-white h-screen">
      <TrovaParole 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
