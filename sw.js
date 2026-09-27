const CACHE_NAME = 'falak-hub-v2';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'tailwind.js',
  'falak-engine.js',
  'hilal-module.js',
  'manifest.json'
];

// 1. Install & langsung paksa SW baru aktif
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. Activate & Otomatis HAPUS CACHE LAMA
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Strategy dengan penanganan Fallback Offline aman
self.addEventListener('fetch', (e) => {
  // Abaikan request non-GET atau request dari chrome-extension
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).catch(() => {
        // Mencegah error crash jika koneksi offline saat fetch resource luar
        return new Response('Offline network error', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});