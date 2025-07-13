import dynamic from "next/dynamic";

// Import dinamico del componente Phaser (BasketGame) che sta in phaser/basket
const BasketGame = dynamic(() => import('@/components/BottleGame'), {
  ssr: false,
});

export default function BasketPage() {
  return (
    <div className="bg-black text-white h-screen">
      <BasketGame 
  isTesting={false} 
  setLevelComplete={() => console.log("Livello completato")} 
  setExitGame={() => console.log("Esco dal gioco")} 
/>

    </div>
  );
}
