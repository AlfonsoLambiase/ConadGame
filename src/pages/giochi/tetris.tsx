import dynamic from "next/dynamic";

// Import dinamico del componente Phaser (Tetris) che sta in phaser/basket
const Tetris = dynamic(() => import('@/components/Tetris'), {
  ssr: false,
});

export default function BasketPage() {
  return (
    <div className="bg-black text-white h-screen">
      <Tetris 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
