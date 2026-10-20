// Mahjong Garden (Solitaire at /mahjong, American Mah Jongg at /mahjong/american):
// offline support, so both run as a Home Screen app on an iPad with no Wi-Fi.
//
// Why this file sits at the site root: production serves the game at /mahjong
// with NO trailing slash (cleanUrls + trailingSlash:false). A worker inside
// /mahjong/ could only claim "/mahjong/..." and would never control the page
// itself. From the root it can claim the exact "/mahjong" prefix.
//
// Strategy
//   the pages        network first (3 s timeout), cached copy when offline
//   tiles.js         the same as the pages: both pages call into it, so a fresh
//                    page must never run against a stale cached copy
//   icons            cached copy first, refreshed in the background
//   Google Fonts     cached copy first, refreshed in the background, so the
//                    brush-script tile characters still render offline
//   /api/*, analytics, non-GET: not touched, straight to the network
//
// The cache refreshes itself on every online launch, so edits to index.html
// and tiles.js need nothing here. Bump VERSION only when the CORE list changes.
// (The pages load tiles.js?v=N: workers from before tiles.js went network-first
// serve it from cache, so bump N when a page starts using something new in it.)

const VERSION = 'mahjong-v2';
const PAGE = '/mahjong';
const CORE = [
  PAGE,
  PAGE + '/american',
  PAGE + '/tiles.js',
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
    await cacheFonts(cache);
    await self.skipWaiting();
  })());
});

// On a first visit the pages load their fonts before this worker is running, so the fetch
// handler never sees them and an offline launch right after would have no tile font. So at
// install, read the font stylesheets out of the pages just cached and keep them, with the
// font files they point to. Best effort: without them the game falls back to system fonts.
async function cacheFonts(cache) {
  try {
    const sheets = new Set();
    for (const page of [PAGE, PAGE + '/american']) {
      const res = await cache.match(page);
      if (!res) continue;
      for (const m of (await res.text()).matchAll(/<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)) sheets.add(m[1].replace(/&amp;/g, '&'));
    }
    for (const href of sheets) {
      const css = await fetch(href, { mode: 'cors' });
      if (!cacheable(css)) continue;
      await cache.put(href, css.clone());
      const files = [...(await css.text()).matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
      await Promise.all(files.map(async (u) => { const f = await fetch(u, { mode: 'cors' }); if (cacheable(f)) await cache.put(u, f); }));
    }
  } catch (e) { /* offline at install, or Google Fonts unreachable: try again on the next install */ }
}

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

async function pageResponse(event, key) {
  const fetched = fetch(event.request);
  event.waitUntil(saveCopy(fetched, key));
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000, null));
  const first = await Promise.race([fetched.catch(() => null), timeout]);
  if (first && (first.ok || first.type === 'opaqueredirect')) return first;
  const cached = await caches.match(key);
  return cached || first || fetched;
}

function cacheFirst(event, req) {
  const fetched = fetch(req);
  event.waitUntil(saveCopy(fetched, req));
  // ignoreVary: font copies stored at install were fetched by this worker, not by a <link>
  event.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetched));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) { cacheFirst(event, req); return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== PAGE && !url.pathname.startsWith(PAGE + '/')) return;

  if (url.pathname === PAGE + '/tiles.js') { event.respondWith(pageResponse(event, PAGE + '/tiles.js')); return; }
  if (req.mode === 'navigate') {
    // one cache entry per page, with or without a trailing slash
    const key = url.pathname.replace(/\/+$/, '') || PAGE;
    if (key === PAGE || key === PAGE + '/american') event.respondWith(pageResponse(event, key));
    return;
  }
  cacheFirst(event, req);
});
