
import dynamic from "next/dynamic";

const IndovinaNumero = dynamic(() => import('@/components/indovina-numero-game'), {
  ssr: false,
});

export default function IndovinaNumeroPage() {
  return (
    <div className="bg-black text-white h-screen">
      <IndovinaNumero 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
