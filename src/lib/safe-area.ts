export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Legge i safe area inset tramite CSS `env()` (webview / iOS notch, ecc.). */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined") {
    return {top: 0, right: 0, bottom: 0, left: 0};
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;" +
    "padding-top:env(safe-area-inset-top,0px);" +
    "padding-right:env(safe-area-inset-right,0px);" +
    "padding-bottom:env(safe-area-inset-bottom,0px);" +
    "padding-left:env(safe-area-inset-left,0px);";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const parse = (px: string) => Number.parseFloat(px) || 0;
  const inset: SafeAreaInsets = {
    top: parse(cs.paddingTop),
    right: parse(cs.paddingRight),
    bottom: parse(cs.paddingBottom),
    left: parse(cs.paddingLeft),
  };
  document.body.removeChild(probe);
  return inset;
}
