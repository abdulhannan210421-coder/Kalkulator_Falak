const CACHE_NAME = 'falak-hub-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './falak-engine.js',
  './hilal-module.js',
  './manifest.json'
  // URL CDN eksternal dihapus dari sini agar tidak kena blokir CORS
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
