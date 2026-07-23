// Service worker — caches the application shell for offline use.
// Dynamic content (games, shots) always goes through Firebase, never through this cache.
//
// "Network-first" strategy: always try to fetch the latest version online;
// the cache is only a fallback if the network is unavailable.
// (A "cache-first" strategy would prevent code updates from applying until
// the cache is explicitly cleared — which we want to avoid here.)

const CACHE_NAME = 'battleship-v4';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/firebase-config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept network calls to Firebase / Google APIs:
  // they must always reach the network for real-time sync.
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
