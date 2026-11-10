// Installation et usage hors ligne : enregistre le service worker (public/sw.js) et lui envoie ce que la page a charge.
export function enregistrerHorsLigne() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !import.meta.env.PROD || location.protocol === "file:") return;
  const base = import.meta.env.BASE_URL;
  const lancer = () => {
    navigator.serviceWorker.register(`${base}sw.js`).then(() => navigator.serviceWorker.ready).then((r) => {
      const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => u.startsWith(location.origin) || /fonts\.(googleapis|gstatic)\.com/.test(u));
      r.active?.postMessage({ precache: [...new Set([location.href, ...urls])] });
    }).catch(() => { /* navigateur sans service worker : l'appli marche normalement, en ligne */ });
  };
  if (document.readyState === "complete") lancer(); else window.addEventListener("load", lancer, { once: true });
}
