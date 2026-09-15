const CACHE_NAME = 'falak-hub-v2'; // Versi dinaikkan ke v2
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './tailwind.js',
  './falak-engine.js',
  './hilal-module.js',
  './manifest.json'
];

// 1. Install & langsung paksa SW baru aktif
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. Activate & Otomatis HAPUS CACHE LAMA (falak-hub-v1)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Membuang cache versi lama dari memori
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Strategy
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
