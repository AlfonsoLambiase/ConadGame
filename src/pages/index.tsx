import Link from "next/link";

const giochi = [
  { title: "Bubble-Shooter", path: "/giochi/bubble-shooter" },
  { title: "Basket", path: "/giochi/basket" },
  { title: "Bottle-Puzzle", path: "/giochi/bottle" },
];

export default function Home() {
  return (
    <div className="min-h-screen p-10 flex flex-col items-center gap-10 bg-gray-100">
      <h1 className="text-3xl font-bold">Scegli un gioco</h1>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {giochi.map((gioco) => (
          <li
            key={gioco.path}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition flex flex-col"
          >
            <h2 className="text-xl font-semibold mb-4 text-center">
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
