/**
 * MINI OFFICE — Service Worker
 * Enables offline functionality and PWA caching
 */

const CACHE_NAME = 'mini-office-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/main.css',
  './js/storage.js',
  './js/particles.js',
  './js/splash.js',
  './js/home.js',
  './js/docs.js',
  './js/sheets.js',
  './js/app.js',
  './manifest.json',
  // External CDN (cached on first load)
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => {
          console.warn('[SW] Failed to cache:', url, err);
        }))
      );
    }).then(() => {
      console.log('[SW] Installed ✓');
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => {
      console.log('[SW] Activated ✓');
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache: fetch from network and cache
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline — Recurso não disponível', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});
