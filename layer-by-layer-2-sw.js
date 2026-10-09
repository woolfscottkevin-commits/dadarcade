// Layer by Layer 2: offline support, so the book works as a Home Screen app on a kid's iPad
// with no Wi-Fi (car, plane, the cabin with no signal).
//
// Why this file sits at the site root: production serves the book at /layer-by-layer-2 with NO
// trailing slash (cleanUrls + trailingSlash:false). A worker inside /layer-by-layer-2/ could only
// claim "/layer-by-layer-2/..." and would never control the page itself. From the root it can claim
// the exact "/layer-by-layer-2" prefix. (Same reason as balloon-uncle-bop-sw.js.)
//
// Strategy
//   the page      network first (3 s timeout), cached copy when offline
//   book files    cached copy first, refreshed in the background (so edits show up on the next visit)
//   other sites (GA), non-GET: not touched
//
// The "Save the whole book" button in Settings fills the same cache from data/files.json, so every
// build, picture and page works offline afterwards. Bump VERSION only to throw the cache away.

const VERSION = 'lbl2-v1';
const PAGE = '/layer-by-layer-2';
const CORE = [
  PAGE,
  PAGE + '/manifest.webmanifest',
  PAGE + '/app/main.js',
  PAGE + '/app/css/base.css',
  PAGE + '/icons/icon-192.png',
  PAGE + '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(CORE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('lbl2-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Never store redirects or errors (Safari refuses a redirected response for a page load).
function cacheable(res) {
  return !!res && res.ok && res.type === 'basic' && !res.redirected;
}

// Clone the response as soon as it arrives and write the copy to the cache.
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== PAGE && !url.pathname.startsWith(PAGE + '/')) return;

  if (req.mode === 'navigate') {
    if (url.pathname === PAGE || url.pathname === PAGE + '/') event.respondWith(pageResponse(event));
    return;
  }

  // ignore the query string so cache-busted URLs still hit the saved copy
  const key = url.origin + url.pathname;
  const fetched = fetch(req);
  event.waitUntil(saveCopy(fetched, key));
  event.respondWith(caches.match(key).then((hit) => hit || fetched));
});
