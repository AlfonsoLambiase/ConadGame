import Link from "next/link";

const giochi = [
  // { title: "Bubble-Shooter", path: "/giochi/bubble-shooter", accent: "from-cyan-500 to-blue-600" },
  // { title: "Basket", path: "/giochi/basket", accent: "from-orange-500 to-red-600" },
  // { title: "Bottle-Puzzle", path: "/giochi/bottle", accent: "from-emerald-500 to-teal-600" },
  // { title: "Tetris", path: "/giochi/tetris", accent: "from-indigo-500 to-violet-600" },
  // { title: "Spara Neve", path: "/giochi/spara-neve", accent: "from-sky-400 to-blue-500" },
  // { title: "Raccogli Note", path: "/giochi/raccogli-note", accent: "from-pink-500 to-rose-600" },
  // { title: "Impara Inglese", path: "/giochi/impara-inglese ", accent: "from-blue-500 to-indigo-600" },
  // { title: "Collega Tutto", path: "/giochi/collega-tutto", accent: "from-amber-500 to-orange-600" },
  // { title: "Crea Parole", path: "/giochi/crea-parole", accent: "from-lime-500 to-green-600" },
  // { title: "Ritmo Giusto", path: "/giochi/ritmo-giusto", accent: "from-fuchsia-500 to-purple-600" },
  // { title: "Trova Parole", path: "/giochi/trova-parole", accent: "from-yellow-500 to-amber-600" },
  // { title: "Prendi Oggetti", path: "/giochi/prendi-oggetti", accent: "from-red-500 to-orange-600" },
  // { title: "Fai la tua scelta", path: "/giochi/fai-la-tua-scelta", accent: "from-violet-500 to-purple-600" },
  // { title: "Colpo vincente", path: "/giochi/colpo-vincente", accent: "from-green-500 to-emerald-600" },
  // { title: "Puzzle 2026", path: "/giochi/puzzle-2026", accent: "from-teal-500 to-cyan-600" },
  {
    title: "Indovina Numero",
    path: "/giochi/indovina-numero",
    accent: "from-violet-500 to-purple-600",
  },
  {
    title: "Safari",
    path: "/giochi/safari",
    accent: "from-amber-500 to-orange-600",
  },
  {
    title: "Ipposumo",
    path: "/giochi/ipposumo",
    accent: "from-emerald-500 to-teal-600",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute top-1/3 left-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-12 sm:px-10 sm:py-16">
        <header className="mb-12 text-center">
          <span className="mb-4 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 text-xs font-medium tracking-widest text-orange-300 uppercase">
            v1.0.11
          </span>
          <h1 className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Demo Giochi
          </h1>
          <p className="mt-3 text-base text-slate-400 sm:text-lg">
            Scegli un gioco e provalo subito!
          </p>
        </header>

        <ul className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {giochi.map((gioco) => (
            <li key={gioco.path}>
              <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
                  {gioco.title}
                </h2>

                <Link
                  href={gioco.path}
                  className="group mt-6 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all duration-300 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/40 active:scale-95"
                >
                  Gioca ora
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>

                <div
                  className={`pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br ${gioco.accent} opacity-10 blur-2xl`}
                />
              </div>
            </li>
          ))}
        </ul>

        <footer className="mt-16 text-center text-xs text-slate-600">
          CONAD · Demo interattiva
        </footer>
      </main>
    </div>
  );
}
