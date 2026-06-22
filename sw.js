/* WeDrink PWA service worker — app shell кэші + офлайн жұмыс */
const CACHE = "wedrink-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // API POST/PUT т.б. сұраулар (Supabase, Anthropic, Gemini) — кэштеусіз өткіземіз
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Беттер: network-first, желі болмаса кэштелген index.html (офлайн)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", cp));
          return r;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const cdnFont = url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com");
  const cdnLib = url.hostname.includes("cdn.jsdelivr.net"); // Tesseract.js
  // AI/синхрондау API жауаптарын ешқашан кэштемейміз
  const isApi = /supabase\.co|api\.anthropic\.com|generativelanguage\.googleapis\.com/.test(url.hostname);

  if (!isApi && (sameOrigin || cdnFont || cdnLib)) {
    // cache-first: жылдам әрі офлайн жұмыс істейді
    e.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((r) => {
          if (r && r.ok) {
            const cp = r.clone();
            caches.open(CACHE).then((c) => c.put(req, cp));
          }
          return r;
        }).catch(() => cached)
      )
    );
  }
  // басқасы (API): браузердің әдеттегі желі сұрауы
});
