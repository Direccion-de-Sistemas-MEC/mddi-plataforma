/* Service worker de la Plataforma MDDI.
   - Guarda en caché la interfaz (HTML, JS, CSS, fuentes) para poder abrirla sin conexión.
   - NUNCA guarda en caché la API (/api): los datos van siempre al servidor; cuando no hay
     conexión, el motor de sincronización los conserva en IndexedDB y los envía después. */
const CACHE = "mddi-shell-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icono.svg"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return; // la API no pasa por caché
  if (req.mode === "navigate") {
    // Red primero; sin conexión, la interfaz guardada
    e.respondWith(fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put("/", copia)); return r; })
      .catch(() => caches.match("/")));
    return;
  }
  const esEstatico = url.pathname.startsWith("/assets/") || url.hostname.includes("fonts.g");
  if (esEstatico || url.origin === location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok || r.type === "opaque") { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
      return r;
    })));
  }
});
