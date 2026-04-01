let listenersBound = false;
let cachedTop = 0;

export interface SafeAreaInsets {
  top: number;
}

/** Padding extra oltre il valore env() per evitare che gli elementi siano troppo attaccati al notch */
const EXTRA_BUFFER = 8;

function readSafeTop(): number {
  if (typeof window === "undefined" || !document?.body) return 0;

  const probe = document.createElement("div");

  probe.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    padding-top: env(safe-area-inset-top, 0px);
    contain: strict;
    pointer-events: none;
    visibility: hidden;
    z-index: -1;
  `;
  document.body.appendChild(probe);
  const top = parseFloat(getComputedStyle(probe).paddingTop || "0");

  document.body.removeChild(probe);

  return Number.isFinite(top) ? top : 0;
}

/** Ritorna safe-area-inset-top in px con buffer extra */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === "undefined") return {top: 0};

  if (cachedTop === 0) {
    cachedTop = readSafeTop();
  }

  return {
    top: cachedTop > 0 ? cachedTop + EXTRA_BUFFER : 0,
  };
}

/** Ritorna il valore corrente di safe-area-inset-top in px (con buffer) */
export function getSafeTop(): number {
  return getSafeAreaInsets().top;
}

/** Aggiorna una CSS var (default: --safe-top) con il valore corrente */
export function setSafeTopVar(varName = "--safe-top"): number {
  const raw = readSafeTop();

  cachedTop = raw;

  if (typeof document !== "undefined") {
    const buffered = getSafeAreaInsets().top;

    document.documentElement?.style.setProperty(varName, `${buffered}px`);
  }

  return getSafeAreaInsets().top;
}

/**
 * Inizializza il watcher che:
 *  - aggiorna la CSS var (default: --safe-top)
 *  - chiama onChange(topPx) ad ogni update
 * Ritorna una funzione di cleanup per rimuovere i listener.
 */
export function initSafeTopWatcher(
  varName = "--safe-top",
  onChange?: (topPx: number) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const update = () => {
    const top = setSafeTopVar(varName);

    onChange?.(top);
  };

  update();

  if (!listenersBound) {
    window.addEventListener("resize", update, {passive: true});
    window.addEventListener("orientationchange", update, {passive: true});
    window.addEventListener("pageshow", update, {passive: true});
    listenersBound = true;
  }

  return () => {
    if (!listenersBound) return;
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
    window.removeEventListener("pageshow", update);
    listenersBound = false;
  };
}
