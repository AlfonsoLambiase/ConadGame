import dynamic from "next/dynamic";

const PrendiOggetti = dynamic(() => import('@/components/prendi-oggetti-game'), {
  ssr: false,
});

export default function PrendiOggettiPage() {
  return (
    <div className="bg-black text-white h-screen">
      <PrendiOggetti 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
