// Redstone Workshop: a shelf of gadgets, and a workbench where you work each one by hand.
// Each gadget is a 3D figure whose frames are its states (off, on, ...). The big input control
// (a button, a lever, a plate) moves to the next state only when the reader taps it, then wraps
// back to the first state the way the real gadget resets. Nothing plays by itself.
import { esc, icon, tip, plural, stacks, sourcesLine, track, $, $$ } from '../lib/ui.js';
import { content, iconFor, iconSpan, figureData, buildData } from '../lib/data.js';
import { mountFigure } from '../lib/figure.js';
import { getStage, skyFor } from '../lib/stage3d.js';
import { log } from '../lib/store.js';
import { clack, pop, tick } from '../lib/sound.js';
import * as read from '../lib/read.js';
import { toolMenuButton, wireToolMenu } from './build.js';

// In-book links carry the page's own path. A bare "#/..." resolves against <base href>, so from
// /layer-by-layer-2 (no slash) or /index.html it is a different URL and reloads the whole book.
const to = hash => esc(location.pathname + location.search + hash);

// An item's picture from the icon sheet, or a plain block outline while the sheet lacks it
// (an empty box looks broken to a kid).
const itemIcon = ix => ix != null && ix >= 0 ? iconSpan(ix) : `<span class="rs-noicon" aria-hidden="true">${icon('cube')}</span>`;

// What the reader taps, from gadget.input. `kind` picks the little drawing on the control.
// `latch` controls stay where you put them (a lever shows ON or OFF by its handle); the others
// spring back, so they only dip when tapped.
const INPUTS = {
  button: { verb: 'Press the button', name: 'Button', kind: 'button' },
  lever: { verb: 'Flip the lever', name: 'Lever', kind: 'lever', latch: true },
  plate: { verb: 'Step on the plate', name: 'Pressure Plate', kind: 'plate' },
  rail: { verb: 'Send the minecart', name: 'Detector Rail', kind: 'rail', latch: true },
  minecart: { verb: 'Send the minecart', name: 'Minecart', kind: 'rail', latch: true },
  tripwire: { verb: 'Walk through the tripwire', name: 'Tripwire', kind: 'plate' },
  target: { verb: 'Hit the target', name: 'Target', kind: 'button' },
};
const inputFor = k => {
  if (INPUTS[k]) return INPUTS[k];
  const word = String(k || 'switch').replace(/[-_]+/g, ' ').toLowerCase();
  return { verb: `Use the ${word}`, name: word.replace(/\b\w/g, c => c.toUpperCase()), kind: 'bolt' };
};

// Small drawings of each control (original art, 64 x 64). Parts with class d-move are the bits
// the CSS presses down or tilts.
const DEVICES = {
  button: '<rect x="6" y="6" width="52" height="52" rx="5" class="d-block"/><g class="d-move"><rect x="19" y="21" width="26" height="17" rx="2.5" class="d-cap"/><rect x="19" y="36" width="26" height="6" rx="2" class="d-lip"/></g>',
  lever: '<g class="d-move"><rect x="29" y="12" width="6" height="36" rx="2" class="d-stick"/><rect x="26.5" y="8" width="11" height="11" rx="2.5" class="d-knob"/></g><rect x="13" y="44" width="38" height="14" rx="3" class="d-block"/>',
  plate: '<rect x="4" y="50" width="56" height="10" rx="2" class="d-ground"/><rect x="11" y="39" width="42" height="11" rx="2.5" class="d-move d-cap"/>',
  rail: '<path d="M4 50h56M4 58h56" class="d-rail"/><path d="M10 47v14M22 47v14M34 47v14M46 47v14M58 47v14" class="d-tie"/><g class="d-move"><rect x="8" y="26" width="26" height="18" rx="3" class="d-cart"/><circle cx="14" cy="46" r="4" class="d-wheel"/><circle cx="28" cy="46" r="4" class="d-wheel"/></g>',
  bolt: '<path d="M36 5 13 37h15l-3 22 24-33H34z" class="d-bolt"/>',
};
const device = (kind, cls = '') => `<svg class="rs-devsvg ${cls}" viewBox="0 0 64 64" aria-hidden="true">${DEVICES[kind] || DEVICES.bolt}</svg>`;

// The power light: a lamp with rays when on. The word ON or OFF always sits next to it.
const LAMP = '<svg class="rs-lamp" viewBox="0 0 40 40" aria-hidden="true"><g class="rs-rays"><path d="M20 1v6M20 33v6M1 20h6M33 20h6M6.5 6.5l4.2 4.2M29.3 29.3l4.2 4.2M6.5 33.5l4.2-4.2M29.3 10.7l4.2-4.2"/></g><circle cx="20" cy="20" r="10.5" class="rs-bulb"/></svg>';

// Is the gadget powered in this state? Content can say so with "power": true/false;
// otherwise the first state is the resting (off) state and the rest are on.
const powered = (s, i) => typeof s.power === 'boolean' ? s.power : i > 0;

// Gadget posters are the figure's last frame. Test figures borrow a build's poster.
const isTest = fig => String(fig || '').startsWith('test-');
const posterSrc = fig => isTest(fig) ? `img/posters/${fig}.webp` : `img/figures/${fig}.webp`;
function wirePosters(root) {
  // Posters stay invisible until they load (CSS), and a missing one shows the redstone mark
  // instead of a broken image.
  $$('img[data-rs-poster]', root).forEach(img => {
    const swap = () => { const s = document.createElement('span'); s.className = 'rs-noart'; s.innerHTML = icon('redstone'); img.replaceWith(s); };
    const ok = () => img.classList.add('rs-ok');
    if (img.complete && img.getAttribute('src')) { if (img.naturalWidth) ok(); else swap(); return; }
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', swap, { once: true });
  });
}

export async function render(main, [id], ctx) {
  // No file yet, or no Wi-Fi before the book was saved: a friendly page, not "Oops"
  const data = await content('redstone').catch(() => null);
  if (!data || !Array.isArray(data.gadgets) || !data.gadgets.length) {
    main.innerHTML = `<section class="band rs-band"><div class="wrap"><h1>Redstone Workshop</h1>
      <p>The gadgets are on their way. Check back soon.</p></div></section>
      <div class="wrap section"><a class="btn" href="${to('#/builds')}">${icon('builds')} Pick a build</a></div>`;
    return;
  }
  return id ? renderGadget(main, data, id, ctx) : renderList(main, data, ctx);
}

// ---------------------------------------------------------------- #/redstone: the gadget shelf
function renderList(main, data, ctx) {
  const gadgets = data.gadgets || [], tried = log.tried('redstone');
  const part = ((ctx.book && ctx.book.parts) || []).find(p => p.key === 'redstone') || {};
  main.innerHTML = `
  <div data-readable>
    <section class="band rs-band"><div class="wrap">
      <div class="kicker">Hands-on gadgets</div>
      <h1>${esc(part.title || 'Redstone Workshop')}</h1>
      ${data.intro || part.blurb ? `<p>${esc(data.intro || part.blurb)}</p>` : ''}
    </div></section>
    <div class="wrap section rs-shelf">
      <h2 class="rs-list-h">Pick a gadget</h2>
      <div class="grid rs-grid">${gadgets.map((g, i) => gadgetCard(g, i, tried[g.id])).join('')}</div>
      ${data.placeholder ? `<p class="tiny rs-sample no-read">${gadgets.length > 1 ? 'These are practice gadgets' : 'This is a practice gadget'} while the real ones are being built.</p>` : ''}
    </div>
  </div>`;
  wirePosters(main);
  ctx.setReadable(true);
}

function gadgetCard(g, i, tried) {
  const inp = inputFor(g.input), blocks = (g.parts || []).reduce((t, p) => t + (+p[1] || 0), 0);
  return `<a class="rs-card" href="${to(`#/redstone/${g.id}`)}">
    <div class="rs-card-art"><img src="${esc(posterSrc(g.figure))}" alt="" loading="lazy" decoding="async" data-rs-poster>
      <span class="rs-tag no-read">${device(inp.kind)}${esc(inp.name)}</span></div>
    <div class="rs-card-body">
      <div class="rs-card-top no-read"><span class="rs-num">Gadget ${i + 1}</span>${tried ? `<span class="chip done">${icon('check')} Tried it</span>` : ''}</div>
      <h3>${esc(g.title)}</h3>
      ${g.lead ? `<p>${esc(g.lead)}</p>` : ''}
      <div class="rs-card-meta no-read">${icon('redstone')}<span>${esc(inp.verb)}${blocks ? ` · ${plural(blocks, 'block')}` : ''}</span></div>
    </div></a>`;
}

// ---------------------------------------------------------------- #/redstone/<id>: the workbench
async function renderGadget(main, data, id, ctx) {
  const list = data.gadgets, idx = list.findIndex(g => g.id === id), g = list[idx];
  if (!g) {
    main.innerHTML = `<section class="band rs-band"><div class="wrap"><h1>Gadget not found</h1>
      <p>That gadget is not in the workshop.</p></div></section>
      <div class="wrap section"><a class="btn" href="${to('#/redstone')}">${icon('redstone')} See all gadgets</a></div>`;
    return;
  }
  const inp = inputFor(g.input), test = isTest(g.figure);
  const states = g.states && g.states.length ? g.states : [{ label: 'Ready', text: '' }];
  const n = states.length, parts = g.parts || [];
  const blocks = parts.reduce((t, p) => t + (+p[1] || 0), 0);
  const icons = await Promise.all(parts.map(([name]) => iconFor(name).catch(() => -1)));
  const triedBefore = !!log.tried('redstone')[g.id];
  const prevG = list[idx - 1], nextG = list[idx + 1];
  let cur = 0, lastTap = 0, pressTimer = 0, used = false, fig = null, live = true;
  track('lbl2_redstone_open', { gadget: g.id });

  main.innerHTML = `
  <div data-readable>
    <section class="band rs-band rs-gband"><div class="wrap">
      <div class="kicker">Gadget ${idx + 1} of ${list.length}</div>
      <h1>${esc(g.title)}</h1>
      ${g.lead ? `<p>${esc(g.lead)}</p>` : ''}
      <div class="rs-chips no-read"><span class="chip">${device(inp.kind)}${esc(inp.name)}</span>
        ${blocks ? `<span class="chip">${plural(blocks, 'block')}</span>` : ''}
        <span class="chip done" id="rs-tried" ${triedBefore ? '' : 'hidden'}>${icon('check')} Tried it</span></div>
    </div></section>
    <div class="wrap rs-wrap">
      <div class="rs-bench">
        <div class="rs-stage">
          <div class="rs-fig fig-stage" id="rs-fig" role="group" aria-label="${esc(g.title)}"></div>
          <div class="stage-tools top-right has-menu" id="rs-tools" hidden>
            ${toolMenuButton('rs-tool-list', 'View buttons')}
            <div class="tool-list" id="rs-tool-list">
            <button type="button" class="tool" data-view="front" aria-label="Look from the front">${icon('front')}</button>
            <button type="button" class="tool" data-view="side" aria-label="Look from the side">${icon('side')}</button>
            <button type="button" class="tool" data-view="top" aria-label="Look from the top">${icon('top')}</button>
            <button type="button" class="tool" data-view="hero" aria-label="Reset the view">${icon('reset')}</button>
            </div>
          </div>
          <div class="stage-hint" id="rs-hint" hidden>Tap the gadget · Drag to spin</div>
        </div>
        <p class="rs-changed no-read" id="rs-changed"></p>

        <section class="rs-panel" aria-labelledby="rs-try">
          <div class="rs-panel-top">
            <h2 id="rs-try">Try it</h2>
            <div class="rs-power" id="rs-power">${LAMP}<span class="rs-power-txt"><small>Power</small> <b id="rs-power-word">OFF</b></span></div>
          </div>
          <div class="rs-panel-body">
            <button type="button" class="rs-input" id="rs-input" data-kind="${esc(inp.kind)}" aria-describedby="rs-status">
              <span class="rs-dev">${device(inp.kind)}</span><span class="rs-verb">${esc(inp.verb)}</span>
            </button>
            <div class="rs-status" id="rs-status" aria-live="polite" aria-atomic="true"></div>
            ${n > 1 ? `<div class="rs-strip" role="group" aria-label="Jump to a stage" style="--cols:${n <= 4 ? n : Math.min(4, Math.ceil(n / 2))}">${states.map((s, i) => `<button type="button" class="rs-dot" data-k="${i}" aria-label="Stage ${i + 1}: ${esc(s.label)}"><b>${i + 1}</b><span>${esc(s.label)}</span></button>`).join('')}</div>` : ''}
          </div>
        </section>
      </div>

      <div class="rs-cols">
        ${parts.length ? `<aside class="card rs-parts-card" aria-labelledby="rs-parts-h">
          <h2 id="rs-parts-h">What you need</h2>
          <ul class="rs-parts">${parts.map(([name, k], i) => `<li>${itemIcon(icons[i])}<span class="rs-pname">${esc(name)}</span><span class="rs-pn">×${esc(k)}${stacks(+k) ? `<small>${stacks(+k)}</small>` : ''}</span></li>`).join('')}</ul>
        </aside>` : ''}
        <article class="rs-about">
          ${(g.steps || []).length ? `<h2>Build it</h2><ol class="steps">${g.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
          ${g.how ? `<h2>How it works</h2><p class="rs-how">${esc(g.how)}</p>` : ''}
          ${(g.tips || []).map(t => tip(t[0], t[1], t[2])).join('')}
          <div class="no-read">${sourcesLine(g.sources)}</div>
        </article>
      </div>

      <nav class="rs-pager" aria-label="More gadgets">
        ${prevG ? `<a class="btn ghost" href="${to(`#/redstone/${prevG.id}`)}">${icon('prev')} <span>${esc(prevG.title)}</span></a>` : '<span></span>'}
        <a class="btn ghost" href="${to('#/redstone')}">All gadgets</a>
        ${nextG ? `<a class="btn" href="${to(`#/redstone/${nextG.id}`)}"><span>${esc(nextG.title)}</span> ${icon('next')}</a>` : '<span></span>'}
      </nav>
    </div>
  </div>`;
  ctx.setReadable(true);

  const figEl = $('#rs-fig', main), input = $('#rs-input', main), changed = $('#rs-changed', main);
  paint();
  changed.innerHTML = `<b>Watch closely.</b> ${esc(inp.verb)}, then look at what changes.`;

  function frameFor(i) { return fig ? Math.min(fig.frames, i + 1) : i + 1; }

  // state -> everything on the bench that shows it
  function paint() {
    const s = states[cur], on = powered(s, cur);
    const power = $('#rs-power', main);
    power.toggleAttribute('data-on', on);
    $('#rs-power-word', main).textContent = on ? 'ON' : 'OFF';
    input.toggleAttribute('data-on', on);
    $('#rs-status', main).innerHTML = `<p class="rs-stepno">Stage ${cur + 1} of ${n}<span class="visually-hidden no-read">. Power ${on ? 'on' : 'off'}.</span></p>
      <h3 class="rs-label">${esc(s.label)}</h3>${s.text ? `<p class="rs-text">${esc(s.text)}</p>` : ''}`;
    $$('.rs-dot', main).forEach(b => { if (+b.dataset.k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    figLabel();
  }
  // The 3D group's name says what it shows now, and how to turn it without a mouse
  function figLabel() {
    const s = states[cur], live3D = fig && fig.stage;
    figEl.setAttribute('aria-label', `${live3D ? '3D picture' : 'Picture'} of ${g.title}. Stage ${cur + 1} of ${n}: ${s.label}. Power ${powered(s, cur) ? 'on' : 'off'}.${live3D ? ' Drag or use the arrow keys to turn it.' : ''}`);
  }

  function go(k) {
    const prev = cur;
    cur = ((k % n) + n) % n;
    if (fig) fig.set(frameFor(cur));
    paint();
    showChanges(prev, cur);
    if (powered(states[cur], cur) && !powered(states[prev], prev)) pop();
    // Read to me is on: read the new stage, so a listener can keep tapping and hearing
    if (read.reading()) read.start($('#rs-status', main), 0, on => { const b = document.getElementById('btn-read'); if (b) b.setAttribute('aria-pressed', String(on)); });
  }

  // "What changed": compare the two frames of the figure and name the blocks that differ.
  // Until the figure is in, the "Watch closely" line stays.
  function showChanges(a, b) {
    if (a === b || !fig || !fig.data) return;
    const list = changesBetween(fig.data, frameFor(a), frameFor(b));
    if (!list.length) { changed.innerHTML = '<b>What changed:</b> no blocks moved this time.'; return; }
    const WORD = { changed: 'changed', moved: 'moved', new: 'new', gone: 'gone' };
    const shown = list.slice(0, 3), more = list.length - shown.length;
    changed.innerHTML = `<b>What changed:</b> ${shown.map(c => `<span class="rs-chg">${itemIcon(c.ic)}<span class="rs-chg-name">${esc(c.item)}${c.n > 1 ? ` ×${c.n}` : ''}</span><em>${WORD[c.how]}</em></span>`).join(' ')}${more > 0 ? ` <span class="rs-more">and ${more} more</span>` : ''}`;
  }

  // ---------------------------------------------------------------- events
  function press() {
    // a quick double tap (or a held key) must not skip a stage
    const now = performance.now(); if (now - lastTap < 300) return; lastTap = now;
    input.classList.add('is-pressing'); clearTimeout(pressTimer);
    pressTimer = setTimeout(() => input.classList.remove('is-pressing'), 220);
    clack(1.2);
    go(cur + 1);
    if (!used) {
      used = true; log.markTried('redstone', g.id);
      $('#rs-tried', main).hidden = false;
      track('lbl2_redstone_use', { gadget: g.id });
    }
  }
  input.addEventListener('click', press);
  // Space and Enter press the control (a native button); a held key does not repeat
  input.addEventListener('keydown', e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); });
  $$('.rs-dot', main).forEach(b => b.addEventListener('click', () => { if (+b.dataset.k !== cur) { tick(); go(+b.dataset.k); } }));
  $$('[data-view]', main).forEach(b => b.addEventListener('click', () => { if (fig) fig.view(b.dataset.view); }));

  // ---------------------------------------------------------------- the live 3D gadget
  // Not awaited, so the words and the control work straight away. The data and the stage are
  // fetched first and mountFigure only runs if the reader is still here: a slow figure must never
  // grab the shared canvas from the next page. Test figures are builds until the real ones exist.
  (async () => {
    try {
      await Promise.all([test ? buildData(g.figure) : figureData(g.figure), getStage()]);
      if (!live) return;
      fig = await mountFigure(figEl, g.figure, { style: 'snap', build: test, frame: cur + 1, alt: g.title });
    } catch (e) { if (live) { console.warn('Redstone figure did not load', g.figure, e); noFigure(); } return; }
    if (!live) return;
    fig.set(frameFor(cur), 0);   // catch up if the control was pressed while the 3D loaded
    figLabel();
    if (fig.stage) {
      $('#rs-tools', main).hidden = false; wireToolMenu($('#rs-tools', main), fig.stage);
      const hint = $('#rs-hint', main); hint.hidden = false;
      fig.stage.on('interact', () => { hint.hidden = true; });
      // kids tap the picture: tapping a block of the gadget works it, like the big control
      fig.stage.on('tap', hit => { if (hit) press(); });
    } else watchPoster();
  })();

  // No 3D (old device): figure.js swaps still pictures per stage, falling back to the last one.
  // If that fails too, stop retrying and show the stand-in.
  function watchPoster() {
    const img = $('.stage-poster', figEl); if (!img) return;
    let fails = 0;
    img.addEventListener('load', () => { fails = 0; });
    img.addEventListener('error', () => { if (++fails >= 2) { img.onerror = null; noFigure(); } });
  }
  // The figure isn't built yet (or failed): its poster, or the redstone mark. The control still
  // works and the stage words tell the story, but there is nothing to compare, so no "What changed".
  function noFigure() {
    fig = null;
    figEl.innerHTML = `<div class="stage-sky" style="background:${skyFor(0.4)}"></div>
      <div class="rs-fig-none no-read"><span class="rs-noart" aria-hidden="true">${icon('redstone')}</span><p>The 3D picture for this gadget is still being built.</p></div>
      <img class="stage-poster" alt="" src="${esc(posterSrc(g.figure))}">`;
    const img = $('img', figEl);
    img.addEventListener('load', () => { const s = $('.rs-fig-none', figEl); if (s) s.remove(); });
    img.addEventListener('error', () => img.remove());
    $('#rs-tools', main).hidden = true; $('#rs-hint', main).hidden = true;
    changed.hidden = true;
    figLabel();
  }

  return () => { live = false; clearTimeout(pressTimer); if (fig) fig.destroy(); };
}

// A cell is shown in frames t0 .. t1 - 1 (the same rule the 3D shader uses), so two frames can be
// compared with one pass over the cells. A block that swaps in place "changed" (a lamp lighting up),
// the same block leaving one spot and arriving at another "moved" (a piston door), and the rest are
// "new" or "gone". Most changes first.
export function changesBetween(data, a, b) {
  const c = data.cells, pal = data.palette;
  const came = new Map(), went = new Map();     // "x,y,z" -> [palette entries]
  for (let i = 0; i < c.length; i += 6) {
    const inA = c[i + 4] <= a && a < c[i + 5], inB = c[i + 4] <= b && b < c[i + 5];
    if (inA === inB) continue;
    const key = `${c[i]},${c[i + 1]},${c[i + 2]}`, m = inB ? came : went;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(c[i + 3]);
  }
  // A spot can hold the same block in both frames on two cell runs (one ends, the next starts). That
  // block did not change, so drop it from both sides before comparing.
  for (const [key, cl] of came) {
    const wl = went.get(key); if (!wl) continue;
    const keepC = cl.filter(p => !wl.includes(p)), keepW = wl.filter(p => !cl.includes(p));
    if (keepC.length) came.set(key, keepC); else came.delete(key);
    if (keepW.length) went.set(key, keepW); else went.delete(key);
  }
  for (const m of [came, went]) for (const [key, list] of m) m.set(key, list.map(p => pal[p]));
  const tally = new Map();
  const add = (pe, how) => {
    const k = how + '|' + pe.i;
    const t = tally.get(k) || { item: pe.i, ic: pe.ic, how, n: 0 };
    t.n++; tally.set(k, t);
  };
  const newBy = new Map(), goneBy = new Map();
  for (const [key, list] of came) {
    if (went.has(key)) { list.forEach(pe => add(pe, 'changed')); went.delete(key); continue; }
    list.forEach(pe => { if (!newBy.has(pe.i)) newBy.set(pe.i, []); newBy.get(pe.i).push(pe); });
  }
  for (const list of went.values()) list.forEach(pe => { if (!goneBy.has(pe.i)) goneBy.set(pe.i, []); goneBy.get(pe.i).push(pe); });
  for (const [item, arr] of newBy) {
    const g = goneBy.get(item) || [], moved = Math.min(arr.length, g.length);
    arr.forEach((pe, i) => add(pe, i < moved ? 'moved' : 'new'));
    g.slice(moved).forEach(pe => add(pe, 'gone'));
    goneBy.delete(item);
  }
  for (const arr of goneBy.values()) arr.forEach(pe => add(pe, 'gone'));
  const order = { changed: 0, moved: 1, new: 2, gone: 3 };
  return [...tally.values()].sort((x, y) => order[x.how] - order[y.how] || y.n - x.n);
}
