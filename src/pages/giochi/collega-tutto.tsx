import dynamic from "next/dynamic";

const CollegaTutto = dynamic(() => import('@/components/collega-tutto-game'), {
  ssr: false,
});

export default function CollegaTuttoPage() {
  return (
    <div className="bg-black text-white h-screen">
      <CollegaTutto 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
