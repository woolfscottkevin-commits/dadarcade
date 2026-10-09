// For Grown-ups: what the book is, what it keeps (only on this device), outside links, screen time,
// offline use and accessibility. Words come from book.json "grownups"; this page adds the trust
// summary at the top, the Install on iPad guide, Save the Whole Book and Clear My Progress.
import { esc, icon, sourcesLine, toast, track, calm, $, $$ } from '../lib/ui.js';
import { content } from '../lib/data.js';
import { store } from '../lib/store.js';

// small line pictures for this page only (the shared set in ui.js has no lock, chat or Wi-Fi)
const GLYPH = {
  account: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  typed: '<rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="15.5" r="1.8" fill="currentColor"/>',
  offline: '<path d="M2.5 9a14 14 0 0 1 19 0M6 12.5a9 9 0 0 1 12 0M9.5 16a4 4 0 0 1 5 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="19.5" r="1.6" fill="currentColor"/>',
  visits: '<path d="M4 20h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5.5" y="12" width="3.4" height="6" rx="1" fill="currentColor"/><rect x="10.3" y="7" width="3.4" height="11" rx="1" fill="currentColor"/><rect x="15.1" y="10" width="3.4" height="8" rx="1" fill="currentColor"/>',
  save: '<path d="M12 3v12M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 17v3h16v-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
};
const glyph = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${GLYPH[name]}</svg>`;

const PROMISES = [
  ['account', 'No accounts'],
  ['chat', 'No chat'],
  ['typed', 'Nothing typed is collected'],
  ['offline', 'Works offline once saved'],   // not before: say so, so nobody counts on it in the car
  ['visits', 'Counts visits (Google Analytics)'],   // the Privacy section explains it; the summary shouldn't skip it
];

export async function render(main, params, ctx) {
  const book = ctx.book || await content('book').catch(() => ({}));
  const g = book.grownups || { title: 'For Grown-ups', sections: [] };
  const strings = book.strings || {};
  const secs = g.sections || [];
  const idFor = (s, i) => `gu-${esc(s.key || i)}`;

  main.innerHTML = `
  <div class="gu" data-readable style="--c:var(--c-front)">
    <section class="band"><div class="wrap gu-wrap">
      <div class="kicker">Layer by Layer · Volume 2</div>
      <h1>${esc(g.title || 'For Grown-ups')}</h1>
      ${g.lead ? `<p>${esc(g.lead)}</p>` : ''}
    </div></section>
    <div class="wrap gu-wrap">
      <section class="section gu-top" aria-label="At a glance">
        <ul class="card gu-promise">${PROMISES.map(([k, t]) => `<li>${glyph(k)}<span>${esc(t)}</span></li>`).join('')}</ul>
        <p class="gu-promise-note">No ads and nothing to buy. Progress and settings stay on this device.</p>
      </section>
      ${secs.length > 2 ? `<nav class="gu-jump no-read" aria-label="On this page">${secs.map((s, i) => `<button type="button" class="gu-jump-btn" data-jump="${idFor(s, i)}">${esc(s.title)}</button>`).join('')}</nav>` : ''}
      <div class="gu-secs">${secs.map((s, i) => section(s, i)).join('')}</div>
      <section class="card gu-more" aria-labelledby="gu-more-h">
        <h2 id="gu-more-h">More from Dad Arcade</h2>
        <p>Volume 1 has even more step-by-step builds to try.</p>
        <div class="gu-more-actions">
          <a class="btn" href="/layer-by-layer">${icon('builds')} Layer by Layer Volume 1</a>
          <a class="btn ghost" href="#/howto">How to Use This Book</a>
          <a class="btn ghost" href="/">Dad Arcade home</a>
        </div>
      </section>
    </div>
  </div>`;
  ctx.setReadable(true);

  function section(s, i) {
    const id = idFor(s, i);
    const paras = list => (list || []).map(p => `<p>${esc(p)}</p>`).join('');
    const steps = s.steps && s.steps.length ? `<ol class="steps">${s.steps.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : '';
    let inner;
    if (s.key === 'offline') {
      // the Install on iPad mini guide, then the button that saves every file
      inner = `${paras(s.body)}
        <div class="gu-install">
          <div class="gu-install-text">
            <div class="kicker">Install on iPad</div>
            <h3>${esc(s.steps_title || 'Add the book to an iPad Home Screen')}</h3>
            ${steps}
            ${paras(s.after)}
          </div>
          ${ipad()}
        </div>
        <div class="gu-save">
          <button type="button" class="btn big gold" id="gu-save">${glyph('save')} <span>${esc(strings.save || 'Save the Whole Book')}</span></button>
          <div class="gu-bar" id="gu-bar" role="progressbar" aria-label="Saving the book" aria-valuemin="0" aria-valuemax="100" hidden><i></i></div>
          <p class="gu-status" id="gu-status" role="status" aria-live="polite"></p>
        </div>`;
    } else {
      inner = `${paras(s.body)}${steps ? `<h3>${esc(s.steps_title || 'Steps')}</h3>${steps}` : ''}${paras(s.after)}`;
    }
    if (s.key === 'privacy') {
      inner += `<div class="gu-actions no-read">
        <a class="btn ghost" href="#/log?move=1">Move progress to another device</a>
        <button type="button" class="btn ghost gu-clear" id="gu-clear">${icon('close')} <span>${esc(strings.clear || 'Clear My Progress')}</span></button>
      </div>`;
    }
    return `<section class="card gu-sec" id="${id}" aria-labelledby="${id}-h">
      <h2 id="${id}-h">${esc(s.title)}</h2>${inner}${sourcesLine(s.sources)}</section>`;
  }

  // An iPad Home Screen drawn with CSS: plain app tiles and the book's own block icon.
  function ipad() {
    const tiles = Array.from({ length: 11 }, (_, k) => k === 6
      ? '<span class="gu-app is-book"><span class="gu-app-icon"><i></i><i></i><i></i></span><span class="gu-app-name">Layer by Layer</span></span>'
      : '<span class="gu-app"><span class="gu-app-icon"></span></span>').join('');
    return `<div class="gu-ipad" aria-hidden="true"><div class="gu-screen">${tiles}</div></div>`;
  }

  // ---------------------------------------------------------------- jump links
  // Buttons, not #anchors: the book's router owns the hash.
  $$('[data-jump]', main).forEach(b => b.addEventListener('click', () => {
    const sec = document.getElementById(b.dataset.jump); if (!sec) return;
    sec.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
    const h = sec.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }));

  // ---------------------------------------------------------------- Save the Whole Book
  // The settings sheet owns the real saving (main.js). This button presses it and shows its
  // progress here, because the sheet's own status line is hidden while the sheet is closed.
  let watch = null;
  const save = $('#gu-save', main), status = $('#gu-status', main), bar = $('#gu-bar', main);
  if (save) {
    const src = document.getElementById('offline-status');
    // "waiting" covers the moment between the tap and main.js's first progress line (it fetches the
    // file list first), so a second tap can't start a second download alongside the first
    let busy = false, waiting = false;
    const sync = () => {
      const t = src ? src.textContent.trim() : '';
      busy = waiting || /^Saving/.test(t);
      status.textContent = waiting ? 'Saving…'
        : t || (store.get('offline') ? 'This device already has a saved copy. Tap again to check for anything new.' : '');
      // aria-disabled, not disabled: a disabled button drops keyboard focus to the page
      save.setAttribute('aria-disabled', String(busy)); save.classList.toggle('is-busy', busy);
      // while saving, the bar carries the number; a busy status line isn't announced every 5 files
      status.setAttribute('aria-busy', String(busy));
      // the bar the words above promise: it follows the "Saving… 40%" line
      const pct = /(\d+)%/.exec(t);
      bar.hidden = !busy;
      const v = !waiting && pct ? +pct[1] : 0;
      bar.setAttribute('aria-valuenow', v); bar.firstElementChild.style.width = v + '%';
    };
    if (src) { watch = new MutationObserver(() => { waiting = false; sync(); }); watch.observe(src, { childList: true, characterData: true, subtree: true }); }
    sync();
    save.addEventListener('click', () => {
      if (busy) return;
      const real = document.getElementById('btn-offline');
      if (!real || !src) { status.textContent = 'This browser cannot save the book.'; return; }
      waiting = true; sync();
      real.click();
    });
  }

  // ---------------------------------------------------------------- Clear My Progress
  // Everything this book saved, settings too. The "offline" marker stays because the saved
  // files themselves stay. Reloading puts the default settings back on screen.
  const clear = $('#gu-clear', main);
  if (clear) clear.addEventListener('click', () => {
    if (!confirm(strings.clear_confirm || 'Clear all checkmarks, your Builder Log and your settings on this device? You can\'t undo this.')) return;
    for (const k of store.keys()) if (k !== 'offline') store.del(k);
    track('lbl2_progress_clear');
    toast('Cleared.');
    setTimeout(() => location.reload(), 400);
  });

  return () => { if (watch) watch.disconnect(); };
}
