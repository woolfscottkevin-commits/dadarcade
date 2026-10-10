// Mahjong Garden: offline support, so the game runs as a Home Screen app on an
// iPad with no Wi-Fi.
//
// Why this file sits at the site root: production serves the game at /mahjong
// with NO trailing slash (cleanUrls + trailingSlash:false). A worker inside
// /mahjong/ could only claim "/mahjong/..." and would never control the page
// itself. From the root it can claim the exact "/mahjong" prefix.
//
// Strategy
//   the page         network first (3 s timeout), cached copy when offline
//   icons, manifest  cached copy first, refreshed in the background
//   Google Fonts     cached copy first, refreshed in the background, so the
//                    brush-script tile characters still render offline
//   /api/*, analytics, non-GET: not touched, straight to the network
//
// The cache refreshes itself on every online launch, so edits to index.html
// need nothing here. Bump VERSION only when the CORE list changes.

const VERSION = 'mahjong-v1';
const PAGE = '/mahjong';
const CORE = [
  PAGE,
  PAGE + '/manifest.webmanifest',
  PAGE + '/icons/apple-touch-icon.png',
  PAGE + '/icons/icon-192.png',
  PAGE + '/icons/icon-512.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mahjong-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Never store redirects or errors (Safari refuses a redirected response for a page load).
// Font files come back as CORS responses, which are fine to keep.
function cacheable(res) {
  return !!res && res.ok && (res.type === 'basic' || res.type === 'cors') && !res.redirected;
}

// Clone the response the moment it arrives (before the page starts reading the
// body) and write the copy to the cache.
function saveCopy(fetched, key) {
  return fetched
    .then((res) => {
      if (!cacheable(res)) return null;
      const copy = res.clone();
      return caches.open(VERSION).then((c) => c.put(key, copy));
    })
    .catch(() => null);
}

async function pageResponse(event) {
  const fetched = fetch(event.request);
  event.waitUntil(saveCopy(fetched, PAGE));
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000, null));
  const first = await Promise.race([fetched.catch(() => null), timeout]);
  if (first && (first.ok || first.type === 'opaqueredirect')) return first;
  const cached = await caches.match(PAGE);
  return cached || first || fetched;
}

function cacheFirst(event, req) {
  const fetched = fetch(req);
  event.waitUntil(saveCopy(fetched, req));
  event.respondWith(caches.match(req).then((hit) => hit || fetched));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) { cacheFirst(event, req); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== PAGE && !url.pathname.startsWith(PAGE + '/')) return;

  if (req.mode === 'navigate') {
    if (url.pathname === PAGE || url.pathname === PAGE + '/') event.respondWith(pageResponse(event));
    return;
  }
  cacheFirst(event, req);
});
