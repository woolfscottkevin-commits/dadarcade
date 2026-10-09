// Small shared helpers for pages: escaping, icons, tips, pips, links that ask a grown-up first,
// toasts and analytics. Pages import what they need.

// The page has <base href="/layer-by-layer-2/">, so a bare "#/x" would resolve to a different
// URL than the page itself (served at /layer-by-layer-2 with no slash) and reload the whole book.
// Use this for history.replaceState and anywhere a full URL is built from a hash.
export const hashUrl = h => location.pathname + location.search + (h.startsWith('#') ? h : '#' + h);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const plural = (n, word, many) => `${Number(n).toLocaleString()} ${n === 1 ? word : (many || word + 's')}`;

// "1 stack + 12" for counts of 64 and more (what kids see in their inventory)
export function stacks(n) {
  if (n < 64) return '';
  const s = Math.floor(n / 64), r = n % 64;
  return `${s} stack${s > 1 ? 's' : ''}${r ? ' + ' + r : ''}`;
}

export const SECTIONS = [
  { key: 'home', href: '#/', label: 'Home', color: 'var(--c-front)', icon: 'home' },
  { key: 'builds', href: '#/builds', label: 'Builds', color: 'var(--c-builds)', icon: 'builds' },
  { key: 'secrets', href: '#/secrets', label: 'Secrets', color: 'var(--c-secrets)', icon: 'secrets' },
  { key: 'redstone', href: '#/redstone', label: 'Redstone', color: 'var(--c-redstone)', icon: 'redstone' },
  { key: 'showcase', href: '#/showcase', label: 'Showcase', color: 'var(--c-showcase)', icon: 'showcase' },
  { key: 'top10', href: '#/top10', label: 'Top 10', color: 'var(--c-top10)', icon: 'top10' },
  { key: 'log', href: '#/log', label: 'My Log', color: 'var(--c-log)', icon: 'log' },
];

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor"/>',
  builds: '<path d="M12 2 21 7v10l-9 5-9-5V7z" fill="currentColor" opacity=".35"/><path d="M12 2 21 7l-9 5-9-5z" fill="currentColor"/>',
  secrets: '<path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="currentColor"/><rect x="8.5" y="18.5" width="7" height="3" rx="1" fill="currentColor"/>',
  redstone: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  showcase: '<path d="M6 3h12v4a6 6 0 0 1-12 0z" fill="currentColor"/><path d="M6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 13h4v4h3v4H7v-4h3z" fill="currentColor"/>',
  top10: '<text x="12" y="17" text-anchor="middle" font-family="Lilita One,Impact,sans-serif" font-size="14" fill="currentColor">10</text><rect x="2.5" y="3.5" width="19" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  log: '<path d="M5 3h11l3 3v15H5z" fill="currentColor" opacity=".35"/><path d="m8 12 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4.5" height="16" rx="1.4" fill="currentColor"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.4" fill="currentColor"/>',
  prev: '<path d="m15 4-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  next: '<path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="currentColor"/>',
  explode: '<rect x="5" y="3" width="14" height="4" rx="1" fill="currentColor"/><rect x="5" y="10" width="14" height="4" rx="1" fill="currentColor" opacity=".7"/><rect x="5" y="17" width="14" height="4" rx="1" fill="currentColor" opacity=".45"/>',
  cube: '<path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 7l9 5 9-5M12 12v10" fill="none" stroke="currentColor" stroke-width="2"/>',
  mode: '<rect x="2" y="4" width="20" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 21h8M10 14l2-6 2 6M10.6 12h2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  print: '<path d="M6 9V3h12v6M6 17H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="7" y="13" width="10" height="8" fill="none" stroke="currentColor" stroke-width="2"/>',
  check: '<path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="currentColor"/><circle cx="12" cy="13" r="4" fill="#fff"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z" fill="currentColor"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  front: '<rect x="4" y="6" width="16" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10 20v-6h4v6" fill="currentColor"/>',
  side: '<path d="M4 20V9l8-5 8 5v11z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  top: '<rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 12h16M12 4v16" stroke="currentColor" stroke-width="1.6"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  walk: '<ellipse cx="8" cy="9" rx="3.2" ry="4.6" fill="currentColor"/><circle cx="6.4" cy="15.6" r="1.6" fill="currentColor"/><ellipse cx="16" cy="12" rx="3.2" ry="4.6" fill="currentColor"/><circle cx="17.6" cy="18.6" r="1.6" fill="currentColor"/>',
  ar: '<path d="M3 8V4.5A1.5 1.5 0 0 1 4.5 3H8M16 3h3.5A1.5 1.5 0 0 1 21 4.5V8M21 16v3.5a1.5 1.5 0 0 1-1.5 1.5H16M8 21H4.5A1.5 1.5 0 0 1 3 19.5V16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 6.6 17 9.4v5.6l-5 2.8-5-2.8V9.4z" fill="currentColor" opacity=".4"/><path d="M12 6.6 17 9.4l-5 2.8-5-2.8z" fill="currentColor"/><path d="M12 12.2v5.6" stroke="currentColor" stroke-width="1.4"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
};
export const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const TIP_LABEL = { pro: 'PRO TIP', warn: 'WATCH OUT', know: 'DID YOU KNOW?', start: 'START HERE' };
export function tip(kind, title, text) {
  const t = String(title || '').trim(), end = /[.?!]$/.test(t) ? '' : '.';
  // the hidden colon keeps read-aloud from running "WATCH OUT" into the title
  return `<div class="tip ${esc(kind)}"><span class="t">${TIP_LABEL[kind] || 'PRO TIP'}</span><span class="visually-hidden">: </span><b>${esc(t)}${end}</b> ${esc(text)}</div>`;
}
export const pips = (d, max = 3) => `<span class="pips" role="img" aria-label="Difficulty ${d} of ${max}">${Array.from({ length: max }, (_, k) => `<i class="${k < d ? '' : 'off'}"></i>`).join('')}</span>`;

// Links to other sites: an "Ask a grown-up" step first.
export function outLink(label, url, cls = 'btn small ghost') {
  return `<a class="${cls}" href="${esc(url)}" data-out rel="noopener" target="_blank">${esc(label)} ${icon('link')}</a>`;
}
// "Stay in the book" comes first and has the focus, so Enter or a quick tap never leaves the book.
// The grown-up button opens the link only after a press-and-hold: it fills up, then opens when you
// let go (opening inside the release keeps Safari's pop-up blocker happy). A keyboard press opens it
// straight away.
let gate;
const HOLD_MS = 900, GO_LABEL = 'Grown-up: press and hold to open';
export function installLinkGate() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-out]');
    if (!a) return;
    e.preventDefault();
    if (!gate) {
      gate = document.createElement('dialog'); gate.className = 'gate';
      gate.innerHTML = `<h2>Ask a grown-up</h2><p>This link goes to another website. Get a grown-up to check it with you first.</p>
        <p class="tiny gate-url"></p><div class="actions"><button class="btn big" value="no" autofocus>Stay in the book</button><button class="btn ghost gate-go" value="go" style="--hold:${HOLD_MS}ms"><span>${GO_LABEL}</span></button></div>`;
      document.body.appendChild(gate);
      const go = gate.querySelector('.gate-go'), label = go.querySelector('span');
      let holdTimer = 0, ready = false, opened = false;
      const open = () => {
        if (gate.dataset.url) { window.open(gate.dataset.url, '_blank', 'noopener'); track('lbl2_outbound', { url: gate.dataset.url }); }
        opened = true; gate.close();
      };
      const reset = () => { clearTimeout(holdTimer); ready = false; go.classList.remove('holding', 'ready'); label.textContent = GO_LABEL; };
      go.addEventListener('pointerdown', ev => {
        if (ev.button !== 0) return;
        reset(); opened = false; go.classList.add('holding');
        holdTimer = setTimeout(() => { ready = true; go.classList.add('ready'); label.textContent = 'Let go to open'; }, HOLD_MS);
      });
      go.addEventListener('pointerup', () => { const ok = ready; reset(); if (ok) open(); });
      for (const t of ['pointerleave', 'pointercancel']) go.addEventListener(t, reset);
      go.addEventListener('contextmenu', ev => ev.preventDefault());   // a long press on iPad would show a menu
      go.addEventListener('click', ev => {
        if (ev.detail === 0) { open(); return; }      // Enter or Space on a keyboard
        // a quick tap: say so on the button itself (a toast would sit behind the dialog's dark backdrop)
        if (!opened) label.textContent = 'Keep holding until it fills up';
      });
      gate.querySelector('[value="no"]').addEventListener('click', () => gate.close());
      gate.addEventListener('close', reset);
    }
    gate.dataset.url = a.href;
    gate.querySelector('.gate-url').textContent = new URL(a.href).hostname.replace(/^www\./, '');
    gate.showModal();
    gate.querySelector('[value="no"]').focus();
  });
}

let toastTimer;
export function toast(msg, ms = 2600) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

// GA4 events: names only, no free text from kids, no identifiers.
export function track(name, params = {}) { try { window.gtag && window.gtag('event', name, params); } catch (e) {} }

// sources line, e.g. "Facts checked October 2026. Sources: minecraft.net · minecraft.wiki"
// Each source is a URL, or a [label, url] pair (or {label, url}) when the page needs a better name.
const GENERIC_SEG = /^(watch|show bug|answer|answers|index|guide|article|articles|en us|en gb|en|ipados|ios|macos|w|wiki|news|blog|post|p|v|embed|shorts|status|item|id|page)$/i;
const ID_SEG = /^[a-z]*\d[a-z\d]{5,}$/i;   // "ipadc602b75b", "11397207"
function linkLabel(u) {
  const url = new URL(u), host = url.hostname.replace(/^www\./, '');
  const segs = url.pathname.split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  // the last part of the address that reads like words ("minecraft.wiki: Cushion"), skipping ids and filler
  for (let i = segs.length - 1; i >= 0; i--) {
    if (ID_SEG.test(segs[i])) continue;
    const seg = segs[i].replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').replace(/\s+[a-z]*\d[a-z\d]{5,}$/i, '').trim();
    if (/[a-z]{2}/i.test(seg) && !GENERIC_SEG.test(seg) && seg.length < 48) return `${host}: ${seg}`;
  }
  if (/youtube\.com$|youtu\.be$/.test(host)) return `${host}: video`;
  return host;
}
export function sourcesLine(urls, when = 'October 2026') {
  if (!urls || !urls.length) return '';
  // label each link with its site AND page, so a grown-up can tell them apart
  const seen = new Set(), used = new Map(), items = [];
  for (const src of urls) {
    const [given, u] = Array.isArray(src) ? src : src && typeof src === 'object' ? [src.label, src.url] : [null, src];
    if (!u || seen.has(u)) continue; seen.add(u);
    let label = given || u;
    if (!given) try { label = linkLabel(u); } catch (e) {}
    const n = (used.get(label) || 0) + 1; used.set(label, n);
    items.push(`<a href="${esc(u)}" data-out rel="noopener" target="_blank">${esc(n > 1 ? `${label} ${n}` : label)}</a>`);
  }
  return `<p class="sources">Facts checked ${esc(when)}. Sources: ${items.join(' · ')}</p>`;
}

export const calm = () => document.documentElement.hasAttribute('data-calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
