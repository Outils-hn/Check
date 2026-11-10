// Service worker de Check : l'appli s'ouvre aussi sans reseau (chantier, atelier, sous-sol).
// En ligne : on prend toujours la version la plus recente, qu'on garde en copie. Hors ligne : on sert la copie
// (les notes affichees viennent alors de la copie locale de l'appli, en lecture).
// Les echanges avec la base (Supabase) et les images des notes ne passent jamais par ici.
const VERSION = "3.16";
const CACHE = "check-" + VERSION;
const POLICES = ["fonts.googleapis.com", "fonts.gstatic.com"];
const FIXES = ["./", "icone-192.png", "icone-512.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(FIXES.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("check-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// La page envoie la liste de ce qu'elle a charge (scripts, styles, polices) : tout part dans la copie hors ligne.
self.addEventListener("message", (e) => {
  const urls = (e.data && e.data.precache) || [];
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(urls.map((u) => c.add(u)))));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;
  if (!memeOrigine && !POLICES.includes(url.hostname)) return; // base de donnees, images des notes : on ne touche pas
  e.respondWith(
    fetch(req).then((rep) => {
      if (rep && (rep.ok || rep.type === "opaque")) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
      return rep;
    }).catch(() => caches.match(req).then((m) => m || caches.match(req, { ignoreSearch: true })).then((m) => m || (req.mode === "navigate" ? caches.match("./") : undefined)))
  );
});
