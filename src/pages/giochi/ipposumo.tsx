
import dynamic from "next/dynamic";

const Ipposumo = dynamic(() => import('@/components/ipposumo-game'), {
  ssr: false,
});

export default function IpposumoPage() {
  return (
    <div className="bg-black text-white h-screen">
      <Ipposumo 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}