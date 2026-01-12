import Link from "next/link";

const giochi = [
  // { title: "Bubble-Shooter", path: "/giochi/bubble-shooter" },
  // { title: "Basket", path: "/giochi/basket" },
  // { title: "Bottle-Puzzle", path: "/giochi/bottle" },
  // { title: "Tetris", path: "/giochi/tetris" },
  // { title: "Spara Neve", path: "/giochi/spara-neve" },
  // { title: "Raccogli Note", path: "/giochi/raccogli-note" },
  // { title: "Impara Inglese", path: "/giochi/impara-inglese " },
  { title: "Collega Tutto", path: "/giochi/collega-tutto" },
  { title: "Crea Parole", path: "/giochi/crea-parole" },
  { title: "Ritmo Giusto", path: "/giochi/ritmo-giusto" },
  { title: "Trova Parole", path: "/giochi/trova-parole" },
  { title: "Prendi Oggetti", path: "/giochi/prendi-oggetti" },
];

export default function Home() {
  return (
    <div className="min-h-screen p-10 flex flex-col items-center gap-10 bg-gray-100">
      <h1 className="text-3xl font-bold text-black">DEMO GIOCHI v1.0.1</h1>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {giochi.map((gioco) => (
          <li
            key={gioco.path}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition flex flex-col"
          >
            <h2 className="text-xl font-semibold mb-4 text-center text-black">
              {gioco.title}
            </h2>
            <div className="flex justify-center">
              <Link href={gioco.path}>
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Gioca ora
                </button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
