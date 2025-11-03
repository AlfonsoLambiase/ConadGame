
import dynamic from "next/dynamic";

// Import dinamico del componente Phaser (RaccogliNoteGame) che sta in phaser/basket
const RaccogliNoteGame = dynamic(() => import('@/components/RaccogliNoteGame'), {
  ssr: false,
});

export default function RaccogliNotePage() {
  return (
    <div className="bg-black text-white h-screen">
      <RaccogliNoteGame 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
