/**
 * UI bootstrap — Phase 3+.
 * Phase 1 ships a static landing shell only.
 */

const shortName = "Token Contrast Checker";

export function initApp() {
  const mount = document.getElementById("app");
  if (!mount) return;

  const status = document.getElementById("phase-status");
  if (status) {
    status.textContent = `${shortName}: Phase 1 complete — color math ready. Parsers and matrix UI come next.`;
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
