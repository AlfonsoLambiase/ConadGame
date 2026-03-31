import dynamic from "next/dynamic";

const Puzzle2026Game = dynamic(() => import('@/components/puzzle-2026-game'), {
  ssr: false,
});

export default function Puzzle2026Page() {
  return (
    <div className="bg-black text-white h-screen">
      <Puzzle2026Game 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}