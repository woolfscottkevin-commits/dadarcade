// Layer by Layer 2: boot, router, navigation and settings.
// Pages live in app/pages/*.js and export render(main, params, ctx) -> optional cleanup function.
// No top-level await anywhere (older Safari can load modules out of order with it).
import { SECTIONS, icon, esc, installLinkGate, toast, track } from './lib/ui.js';
import { settings, store } from './lib/store.js';
import { content } from './lib/data.js';
import * as read from './lib/read.js';
import { unlockAudio } from './lib/sound.js';

const ROUTES = [
  [/^\/?$/, 'home', 'home'],
  [/^\/builds$/, 'builds', 'builds'],
  [/^\/build\/([\w-]+)$/, 'build', 'builds'],
  [/^\/mode\/([\w-]+)$/, 'mode', 'builds'],
  [/^\/secrets$/, 'secrets', 'secrets'],
  [/^\/secrets\/([\w-]+)$/, 'secrets', 'secrets'],
  [/^\/redstone$/, 'redstone', 'redstone'],
  [/^\/redstone\/([\w-]+)$/, 'redstone', 'redstone'],
  [/^\/showcase$/, 'showcase', 'showcase'],
  [/^\/showcase\/([\w-]+)$/, 'showcase', 'showcase'],
  [/^\/top10$/, 'top10', 'top10'],
  [/^\/top10\/([\w-]+)$/, 'top10', 'top10'],
  [/^\/log$/, 'log', 'log'],
  [/^\/grownups$/, 'grownups', 'home'],
  [/^\/howto$/, 'howto', 'home'],
];

const main = document.getElementById('main');
const html = document.documentElement;
let cleanup = null, routeId = 0, book = null, lastPath = null;
const BOOK_TITLE = document.title;

// Reading pages (Builds, My Log, For Grown-ups, How to Use) never load the 3D engine. It is loaded by
// the first page that shows 3D, and only then does a page change need to hand the canvas back.
const PAGES_3D = new Set(['home', 'build', 'mode', 'secrets', 'redstone', 'showcase', 'top10']);
let used3D = false;
async function release3D() {
  if (!used3D) return;
  try { const m = await import('./lib/stage3d.js'); await m.release(); } catch (e) { console.warn(e); }
}

// ---------------------------------------------------------------- settings
function applySettings() {
  const s = settings.all();
  html.dataset.text = s.text;
  html.toggleAttribute('data-spacey', !!s.spacey);
  html.toggleAttribute('data-calm', !!s.calm);
  document.querySelectorAll('#set-text button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === +s.text)));
  document.querySelectorAll('#set-rate button').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.v - s.rate) < 0.01)));
  document.getElementById('set-spacey').checked = !!s.spacey;
  document.getElementById('set-calm').checked = !!s.calm;
  document.getElementById('set-sound').checked = !!s.sound;
}
function wireSettings() {
  document.querySelectorAll('#set-text button').forEach(b => b.addEventListener('click', () => { settings.set('text', +b.dataset.v); applySettings(); }));
  document.querySelectorAll('#set-rate button').forEach(b => b.addEventListener('click', () => { settings.set('rate', +b.dataset.v); applySettings(); }));
  document.getElementById('set-spacey').addEventListener('change', e => { settings.set('spacey', e.target.checked); applySettings(); });
  document.getElementById('set-calm').addEventListener('change', e => { settings.set('calm', e.target.checked); applySettings(); track('lbl2_calm', { on: e.target.checked }); });
  document.getElementById('set-sound').addEventListener('change', e => { settings.set('sound', e.target.checked); applySettings(); });
  document.getElementById('btn-offline').addEventListener('click', saveOffline);
  // browsers without the Popover API: make the settings button toggle the sheet by hand
  const sheet = document.getElementById('settings');
  if (!sheet.showPopover) {
    sheet.hidden = true; sheet.classList.add('sheet-fallback');
    document.getElementById('btn-settings').addEventListener('click', () => { sheet.hidden = !sheet.hidden; });
    sheet.querySelector('[popovertargetaction="hide"]').addEventListener('click', () => { sheet.hidden = true; });
  }
}

// ---------------------------------------------------------------- nav
function renderNav(active) {
  const link = s => `<a href="${s.href}" style="--nc:${s.color}" ${s.key === active ? 'aria-current="page"' : ''}>${icon(s.icon)}<span>${s.label}</span></a>`;
  document.getElementById('nav').innerHTML = SECTIONS.map(link).join('');
  // phones: four tabs and a More button for the rest
  const main4 = ['home', 'builds', 'secrets', 'redstone'];
  const rest = SECTIONS.filter(s => !main4.includes(s.key));
  const moreActive = rest.some(s => s.key === active);
  document.getElementById('tabbar').innerHTML = SECTIONS.filter(s => main4.includes(s.key)).map(link).join('') +
    `<button type="button" popovertarget="more-sheet" style="--nc:var(--c-top10)" ${moreActive ? 'aria-current="page"' : ''}>${icon('top10')}<span>More</span></button>`;
  let sheet = document.getElementById('more-sheet');
  if (!sheet) { sheet = document.createElement('div'); sheet.id = 'more-sheet'; sheet.className = 'more-sheet'; sheet.setAttribute('popover', ''); document.body.appendChild(sheet);
    sheet.addEventListener('click', e => { if (e.target.closest('a') && sheet.hidePopover) sheet.hidePopover(); }); }
  sheet.innerHTML = rest.map(link).join('') + `<a href="#/grownups" style="--nc:var(--c-log)">${icon('log')}<span>For Grown-ups</span></a>`;
  if (!sheet.showPopover) {   // no Popover API: the button toggles the list by hand
    const b = document.querySelector('#tabbar button');
    sheet.hidden = true; b.onclick = () => { sheet.hidden = !sheet.hidden; };
  }
}

// ---------------------------------------------------------------- read to me
const readBtn = document.getElementById('btn-read');
function setReadable(on) {
  readBtn.hidden = !(on && read.canRead);
  if (!on) read.stop(true);
  readBtn.setAttribute('aria-pressed', 'false');
}
readBtn.addEventListener('click', () => {
  if (read.reading()) { read.stop(); return; }
  const root = main.querySelector('[data-readable]') || main;
  read.start(root, 0, on => readBtn.setAttribute('aria-pressed', String(on)));
});

// ---------------------------------------------------------------- router
function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, q] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(q || ''));
  for (const [re, page, section] of ROUTES) {
    const m = path.match(re);
    if (m) return { path, page, section, params: m.slice(1), query };
  }
  return { path, page: 'home', section: 'home', params: [], query };
}

async function route() {
  const id = ++routeId;
  const firstLoad = lastPath === null;   // gtag('config') already counted the first page view
  const r = parse();
  const samePage = lastPath && lastPath.split('/')[1] === r.path.split('/')[1] && r.page === 'mode';
  let mod;
  try { mod = await import(`./pages/${r.page}.js`); }
  catch (e) { console.error(e); main.innerHTML = `<div class="wrap section"><h1>Oops</h1><p>That page could not load. Check your Wi-Fi and try again.</p><p><a class="btn" href="#/">Back to the start</a></p></div>`; return; }
  if (id !== routeId) return;
  // close the More and Settings sheets before the page changes
  for (const id of ['more-sheet', 'settings']) {
    const el = document.getElementById(id);
    try { if (el && el.matches(':popover-open')) el.hidePopover(); } catch (e) {}
  }
  const swap = async () => {
    read.stop(true);
    if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
    await release3D();
    if (PAGES_3D.has(r.page)) used3D = true;
    html.dataset.page = r.page;
    html.style.setProperty('--c', (SECTIONS.find(s => s.key === r.section) || SECTIONS[0]).color);
    renderNav(r.section);
    setReadable(false);
    main.innerHTML = '';
    const ctx = { book, setReadable, query: r.query, path: r.path, go: h => { location.hash = h; } };
    try { cleanup = (await mod.render(main, r.params, ctx)) || null; }
    catch (e) {
      console.error(e);
      main.innerHTML = `<div class="wrap section"><h1>Oops</h1><p>Something went wrong on this page.</p><p><a class="btn" href="#/">Back to the start</a></p></div>`;
    }
    // name the page in the browser tab, and move focus to its heading so a screen reader says where
    // you are (a page can point at a better first stop with data-autofocus, like Build Mode's Start)
    const h1 = main.querySelector('h1');
    document.title = r.page === 'home' || !h1 ? BOOK_TITLE : `${h1.textContent.replace(/\s+/g, ' ').trim()} | Layer by Layer 2`;
    if (!samePage) {
      window.scrollTo(0, 0);
      const target = main.querySelector('[data-autofocus]') || h1;
      if (target) { if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.tabIndex = -1; target.focus({ preventScroll: true }); }
      else main.focus({ preventScroll: true });
    }
    lastPath = r.path;
  };
  const vt = document.startViewTransition && !document.hidden && !html.hasAttribute('data-calm') && !matchMedia('(prefers-reduced-motion: reduce)').matches && lastPath !== null;
  if (vt) {
    const t = document.startViewTransition(swap);
    // a skipped transition (fast taps, background tab) rejects these; the page still changes
    t.ready.catch(() => {}); t.finished.catch(() => {});
    try { await t.updateCallbackDone; } catch (e) { /* transition skipped */ }
  }
  else await swap();
  if (!firstLoad) track('page_view', { page_title: r.page, page_location: location.href });
}

// ---------------------------------------------------------------- offline
let saving = false;
async function saveOffline() {
  const status = document.getElementById('offline-status');
  if (!('caches' in window)) { status.textContent = 'This browser cannot save the book.'; return; }
  if (saving) return;
  saving = true;
  try {
    const list = await fetch('data/files.json', { cache: 'no-store' }).then(r => r.json());
    const cache = await caches.open('lbl2-v1');   // the same cache the service worker reads
    // a newer book than the saved copy: fetch every file again, past the browser's own cache, so
    // "tap again to check for anything new" really brings the changes in
    const old = store.get('offline'), refresh = !!old && old !== list.version;
    const total = list.files.length;
    let done = 0, failed = 0;
    for (const f of list.files) {
      // the page itself lives at /layer-by-layer-2 (no slash): never cache the redirecting "./" URL
      const u = f === './' ? location.origin + location.pathname : new URL(f, document.baseURI).href;
      try {
        if (refresh) await cache.add(new Request(u, { cache: 'reload' }));
        else if (!(await cache.match(u))) await cache.add(u);
      } catch (e) { failed++; }
      done++; if (done % 5 === 0 || done === total) status.textContent = `Saving… ${Math.round(done / total * 100)}%`;
    }
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    if (failed) {
      // never say "Saved!" for a partial copy: the book would break in the car
      status.textContent = `Saved ${total - failed} of ${total} files. Some files did not save. Try again with good Wi-Fi.`;
      track('lbl2_offline_partial', { failed });
    } else {
      store.set('offline', list.version);
      status.textContent = (book && book.strings && book.strings.saved) || 'Saved! The whole book now works with no Wi-Fi.';
      track('lbl2_offline_saved');
    }
  } catch (e) { status.textContent = 'Could not save right now. Try again with Wi-Fi.'; }
  saving = false;
}

// ---------------------------------------------------------------- boot
function main_() {
  applySettings(); wireSettings(); installLinkGate();
  addEventListener('hashchange', route);
  // In-book links are written href="#/...". With <base href="/layer-by-layer-2/"> the browser would
  // treat them as a different page (the book is served at /layer-by-layer-2 with no slash) and reload
  // everything, 3D included. Change only the hash instead.
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.target || a.hasAttribute('download')) return;
    e.preventDefault();
    const h = a.getAttribute('href');
    if (h === '#main') { main.focus(); return; }
    if (location.hash === h) route(); else location.hash = h;
  });
  addEventListener('pointerdown', unlockAudio, { once: true });
  content('book').then(b => {
    book = b;
    document.getElementById('foot').innerHTML = `<p>${esc(b.disclaimer)}</p><p>${esc(b.edition)}</p>
      <p><a href="#/grownups">For Grown-ups</a> · <a href="#/howto">How to Use This Book</a> · <a href="/layer-by-layer">Layer by Layer Volume 1</a> · <a href="/">Dad Arcade</a></p>`;
  }).catch(() => {}).finally(route);
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/layer-by-layer-2-sw.js', { scope: '/layer-by-layer-2' }).catch(() => {});
  }
}
main_();
