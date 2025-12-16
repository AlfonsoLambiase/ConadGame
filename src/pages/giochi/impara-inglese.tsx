import dynamic from "next/dynamic";

const ImparaInglese = dynamic(() => import('@/components/impara-inglese-game'), {
  ssr: false,
});

export default function ImparaInglesePage() {
  return (
    <div className="bg-black text-white h-screen">
      <ImparaInglese 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
