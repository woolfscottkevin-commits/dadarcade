// My Builder Log: a calm record of what you built and tried, kept only on this device.
// No streaks, points or badges on purpose: promised rewards make building feel like a chore for
// kids (Deci, Koestner & Ryan 1999), so this page only says what you did, in plain words.
import { esc, icon, plural, toast, track, $ } from '../lib/ui.js';
import { catalog, content } from '../lib/data.js';
import { log, store, exportProgress, importProgress } from '../lib/store.js';

const TIERS = ['Starter', 'Pro', 'Legend'];
// what "Clear my log" removes: builds, saved layers, ticked blocks and lessons tried (not settings)
const LOG_KEY = /^(done$|where:|got:|ld:|tried:)/;

// "2026-10-05" -> "October 5" (and the year when it isn't this year). Parsed as a local date so
// the day never slips by one in the evening.
function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const year = d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' };
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', ...year });
}
// "soft-curves" -> "Soft curves", for lessons whose content file isn't there yet
const fromId = id => String(id).replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase());

// the poster of the size you built (Starter and Pro have their own), falling back to the main one
function posterFor(b, tier) {
  const main = `img/posters/${b.slug}.webp`;
  if (!tier || !(b.ntiers > 1) || tier >= b.ntiers) return { src: main, fallback: '' };
  return { src: `img/posters/${b.slug}-t${tier}.webp`, fallback: main };
}

export async function render(main, params, ctx) {
  const book = ctx.book || await content('book').catch(() => ({}));
  const optional = n => content(n).catch(() => null);
  const [cat, lessons, redstone] = await Promise.all([catalog(), optional('lessons'), optional('redstone')]);
  const part = (book.parts || []).find(p => p.key === 'log') || {};
  const tierName = t => (book.strings && book.strings.tiers && book.strings.tiers[t]) || TIERS[t - 1] || '';

  main.innerHTML = `<div class="lg" id="lg" style="--c:var(--c-log)" data-readable></div>`;
  const root = $('#lg', main);

  // ---------------------------------------------------------------- the page, drawn from the log
  function paint() {
    const done = log.done(), builds = cat.builds;
    const built = builds.filter(b => done[b.slug]);
    const keep = builds.map(b => ({ b, w: log.where(b.slug) }))
      .filter(({ b, w }) => w && w.layer > 0 && !done[b.slug]);   // same rule Build Mode uses to offer "Keep going"
    const big = builds.filter(b => b.kind !== 'mini'), minis = builds.filter(b => b.kind === 'mini');

    root.innerHTML = `
    <section class="band"><div class="wrap">
      <div class="kicker">Saved on this device</div>
      <h1>${esc(part.title || 'My Builder Log')}</h1>
      <p>${esc(part.blurb || 'Check off the builds you finish. Your log stays on this device.')}</p>
    </div></section>
    <div class="wrap">
      <section class="section lg-top" aria-label="Your log so far">${summary(built, builds.length, done)}</section>
      ${keep.length ? `<section class="section lg-keep" aria-labelledby="lg-keep-h">
        <h2 id="lg-keep-h">Keep building</h2>
        <p class="muted">You stopped partway through ${keep.length === 1 ? 'this build' : 'these builds'}. Build Mode remembers your layer.</p>
        <div class="lg-keep-list">${keep.map(keepCard).join('')}</div>
      </section>` : ''}
      <section class="section lg-shelf-sec" aria-labelledby="lg-shelf-h">
        <div class="section-head"><h2 id="lg-shelf-h">Your shelf</h2><p class="muted lg-shelf-note">Tap any build to open it.</p></div>
        ${minis.length ? '<h3 class="lg-sub">Big builds</h3>' : ''}
        <ul class="lg-shelf no-read">${big.map(b => tile(b, done[b.slug])).join('')}</ul>
        ${minis.length ? `<h3 class="lg-sub">Mini builds</h3><ul class="lg-shelf no-read">${minis.map(b => tile(b, done[b.slug])).join('')}</ul>` : ''}
      </section>
      <section class="section lg-tried" aria-labelledby="lg-tried-h">
        <h2 id="lg-tried-h">Lessons and gadgets you've tried</h2>
        <div class="lg-tried-grid">
          ${triedCard('secrets', 'Master Builder Secrets', lessons, 'lessons', 'lesson')}
          ${triedCard('redstone', 'Redstone Workshop', redstone, 'gadgets', 'gadget')}
        </div>
      </section>
      ${grownPanel()}
    </div>`;

    // a size-specific poster may not exist yet: quietly show the main one instead
    root.querySelectorAll('img[data-fallback]').forEach(img => img.addEventListener('error', () => {
      const f = img.dataset.fallback; delete img.dataset.fallback; if (f) img.src = f;
    }, { once: true }));
    const code = $('#lg-code', root); if (code) code.value = exportProgress();
  }

  function summary(built, total, done) {
    const n = built.length;
    const blocks = built.reduce((s, b) => s + (((b.tiers_stats || [])[(done[b.slug].tier || 1) - 1] || {}).blocks || 0), 0);
    const skills = [...new Set(built.flatMap(b => b.teaches || []))];
    const line = n === 0 ? 'Nothing built yet. Every build you finish goes on your shelf.'
      : n === total ? `You've built every build in the book: all ${total} of them!`
      : `You've built ${n} of ${plural(total, 'build')}.`;
    return `<div class="card lg-sum">
      <div class="lg-sum-mark" aria-hidden="true">${icon('log')}</div>
      <div class="lg-sum-text">
        <p class="lg-big">${esc(line)}</p>
        ${blocks ? `<p class="lg-blocks">That's ${plural(blocks, 'block')}, placed one at a time.</p>` : ''}
        ${n === 0 ? `<p><a class="btn" href="#/builds">${icon('builds')} Pick a build</a></p>` : ''}
        ${skills.length ? `<p class="lg-skills"><b>Skills you've used:</b> ${skills.map(s => `<span class="chip">${esc(s)}</span>`).join('<span class="visually-hidden">, </span> ')}</p>` : ''}
      </div>
    </div>`;
  }

  // articles, not list items: Read to Me reads a list item as one run of text, which would join
  // the build's name onto the next sentence
  function keepCard({ b, w }) {
    const steps = ((b.tiers_stats || [])[(w.tier || 1) - 1] || {}).layers || 0;
    const at = Math.min(w.layer + 1, steps || w.layer + 1);
    const size = b.ntiers > 1 ? `${tierName(w.tier)} size · ` : '';
    const href = `#/mode/${esc(b.slug)}?t=${+w.tier || 1}`, p = posterFor(b, w.tier);
    // the bar fills with the steps already finished, like the bar along the top of Build Mode,
    // so "step 11 of 11" is not drawn as a full (finished) bar
    const pct = steps ? Math.round(Math.min(w.layer, steps) / steps * 100) : 0;
    // the picture is a second way in for kids who tap pictures; the button is the one that's read
    return `<article class="card lg-keep-item">
      <a class="lg-keep-art" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(p.src)}" ${p.fallback ? `data-fallback="${esc(p.fallback)}"` : ''} alt="" loading="lazy" decoding="async"></a>
      <div class="lg-keep-text">
        <h3>${esc(b.title)}</h3>
        <p>${esc(size)}You were on step ${at}${steps ? ` of ${steps}` : ''}.</p>
        ${steps ? `<div class="lg-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>` : ''}
      </div>
      <a class="btn gold lg-keep-go" href="${href}">${icon('mode')} <span>Keep building</span></a>
    </article>`;
  }

  // Built tiles are full colour with a solid edge, a tick, the size and the date. Not-yet tiles are
  // faded with a dashed edge and the words "Not yet", so colour is never the only difference.
  function tile(b, d) {
    const p = posterFor(b, d && d.tier);
    // the size and the date each get their own line, so a narrow tile never splits "December 24"
    const when = d ? [b.ntiers > 1 ? `${tierName(d.tier || 1)} size` : '', niceDate(d.at)].filter(Boolean) : [];
    return `<li class="lg-tile ${d ? 'is-built' : 'is-todo'}"><a href="#/build/${esc(b.slug)}${d && b.ntiers > 1 ? `?t=${+d.tier || 1}` : ''}">
      <div class="lg-art"><img src="${esc(p.src)}" ${p.fallback ? `data-fallback="${esc(p.fallback)}"` : ''} alt="" loading="lazy" decoding="async"></div>
      <div class="lg-tile-body">
        <b class="lg-name">${esc(b.title)}</b>
        ${d ? `<span class="lg-state built">${icon('check')} Built ${when.map(t => `<small>${esc(t)}</small>`).join(' ')}</span>`
            : '<span class="lg-state todo">Not yet</span>'}
      </div></a></li>`;
  }

  function triedCard(kind, title, data, listKey, word) {
    const tried = log.tried(kind), all = (data && data[listKey]) || [];
    // with the content file: its order and titles (skipping ids that no longer exist);
    // without it: whatever was saved, with a title made from the id
    const items = all.length ? all.filter(x => tried[x.id]).map(x => ({ id: x.id, title: x.title || fromId(x.id) }))
      : Object.keys(tried).map(id => ({ id, title: fromId(id) }));
    const count = items.length
      ? (all.length ? `You've tried ${items.length} of ${plural(all.length, word)}.` : `You've tried ${plural(items.length, word)}.`)
      : `None yet. Open a ${word} and it shows up here.`;
    return `<div class="card lg-tried-card" style="--tc:var(--c-${kind})">
      <h3>${icon(kind)} ${esc(title)}</h3>
      <p class="muted">${esc(count)}</p>
      ${items.length ? `<ul class="lg-tried-list">${items.map(x => `<li><a href="#/${kind}/${esc(x.id)}">${esc(x.title)}</a></li>`).join('')}</ul>`
        : `<a class="btn small ghost" href="#/${kind}">See the ${word}s ${icon('next')}</a>`}
    </div>`;
  }

  // For grown-ups. Kept out of Read to Me, since it is not for the young reader. "Clear my log" sits
  // inside the grown-ups card, not loose below it, so it doesn't look like a kid's button.
  function grownPanel() {
    return `<section class="section lg-grown no-read" id="lg-move" aria-labelledby="lg-move-h">
      <div class="card lg-move">
        <div class="kicker">For grown-ups</div>
        <h2 id="lg-move-h">Move my progress</h2>
        <p>Progress only lives on this device, so use this code to move it to another device or into the Home Screen app.</p>
        <div class="lg-move-cols">
          <div class="lg-move-step">
            <h3><span class="lg-num" aria-hidden="true">1</span> Copy this code</h3>
            <textarea id="lg-code" class="lg-code" rows="4" readonly spellcheck="false" aria-label="Your progress code"></textarea>
            <button type="button" class="btn" id="lg-copy">Copy the code</button>
          </div>
          <div class="lg-move-step">
            <h3><span class="lg-num" aria-hidden="true">2</span> Paste it on the other device</h3>
            <textarea id="lg-paste" class="lg-code" rows="4" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off"
              aria-label="Paste a progress code here" placeholder="Paste a code here"></textarea>
            <button type="button" class="btn" id="lg-load">Add this progress</button>
            <p class="lg-msg" id="lg-msg" role="status"></p>
          </div>
        </div>
        <div class="lg-clear">
          <button type="button" class="btn ghost" id="lg-clear">${icon('close')} <span>Clear my log</span></button>
          <p>Empties the shelf and forgets saved layers, ticked blocks and the lessons and gadgets tried on this device. Settings stay.</p>
        </div>
      </div>
    </section>`;
  }

  // ---------------------------------------------------------------- actions
  async function copyCode() {
    const ta = $('#lg-code', root), code = ta.value = exportProgress();
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (e) {}
    if (!ok) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (e) {} }
    toast(ok ? 'Code copied. Paste it on the other device.' : 'Select the code and copy it by hand.');
    if (ok) track('lbl2_progress_copy');
  }
  function loadCode() {
    const code = $('#lg-paste', root).value.trim(), msg = $('#lg-msg', root);
    if (!code) { msg.textContent = 'Paste a code in the box first.'; return; }
    if (!confirm('Add the progress in this code to this device? Where both devices have saved the same thing, the code\'s copy wins. You can\'t undo this.')) return;
    // importProgress() overwrites whole keys, and one key ("done") holds every finished build, so a
    // plain import would swap this device's shelf for the other one's. Keep what was here and lay
    // the code's entries on top: the code's copy wins only where both saved the same thing.
    const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const before = new Map(store.keys().map(k => [k, store.get(k)]));
    let n = 0;
    try { n = importProgress(code); } catch (e) { msg.textContent = 'That code didn\'t work. Check you copied all of it, then try again.'; return; }
    for (const [k, old] of before) { const now = store.get(k); if (isMap(old) && isMap(now)) store.set(k, { ...old, ...now }); }
    // the "offline" marker says this device holds a saved copy of the book. That is only true of
    // the device the code came from, so keep our own.
    if (before.has('offline')) store.set('offline', before.get('offline')); else store.del('offline');
    if (!n) { msg.textContent = 'That code was empty. Nothing changed.'; return; }
    track('lbl2_progress_import');
    paint(); toast('Progress added to this device.');
  }
  function clearLog() {
    if (!confirm('Clear your Builder Log on this device? Your shelf, saved layers, ticked blocks and the lessons and gadgets you tried will be gone. You can\'t undo this.')) return;
    for (const k of store.keys()) if (LOG_KEY.test(k)) store.del(k);
    track('lbl2_log_clear');
    paint(); toast('Your log is clear.');
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'lg-copy') copyCode();
    else if (b.id === 'lg-load') loadCode();
    else if (b.id === 'lg-clear') clearLog();
  });
  // a tap on the code selects all of it, so it's easy to copy by hand too
  root.addEventListener('focusin', e => { if (e.target.id === 'lg-code') e.target.select(); });

  paint();
  ctx.setReadable(true);
  // the For Grown-ups page links here with ?move=1
  // (and the heading takes focus, so a keyboard or screen reader lands there too)
  if (ctx.query.move) requestAnimationFrame(() => {
    const m = $('#lg-move', root), h = $('#lg-move-h', root); if (!m) return;
    m.scrollIntoView({ block: 'start' });
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  });
}
