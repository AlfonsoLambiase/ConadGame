
import dynamic from "next/dynamic";

const Safari = dynamic(() => import('@/components/safari-game'), {
  ssr: false,
});

export default function SafariPage() {
  return (
    <div className="bg-black text-white h-screen">
      <Safari 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}