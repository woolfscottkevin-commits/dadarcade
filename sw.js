const CACHE_NAME = 'dadarcade-v1';
const SHELL_URLS = [
  '/',
  '/games',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      // Only clear our own old caches: games with their own offline worker
      // (bub-*, mahjong-*) keep separate caches on this same origin.
      Promise.all(keys.filter(k => k.startsWith('dadarcade-') && k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
