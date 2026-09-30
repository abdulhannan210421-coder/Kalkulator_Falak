const CACHE_NAME = 'falak-hub-v3'; // BUMP VERSI INI SETIAP KALI UPDATE FITUR!

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'tailwind.js',
  'falak-engine.js',
  'hilal-module.js',
  'manifest.json'
];

// 1. Install: Paksa download file segar dari server (bypass browser HTTP cache)
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return fetch(new Request(url, { cache: 'reload' }))
            .then((response) => {
              if (response.ok) return cache.put(url, response);
            })
            .catch(() => {});
        })
      );
    })
  );
});

// 2. Activate: Hapus semua cache versi lama
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

// 3. Fetch Strategy: Network-First (Prioritas Internet, Fallback Offline Cache)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Jika berhasil mengambil dari server, perbarui cache secara otomatis
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline atau jaringan gagal, gunakan cache lokal
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
