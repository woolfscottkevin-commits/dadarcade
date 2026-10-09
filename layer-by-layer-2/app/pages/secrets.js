// Master Builder Secrets: technique lessons. #/secrets lists every lesson as a card; #/secrets/<id>
// is one lesson: a live 3D figure with a stepper the reader drives (one figure frame per step, never
// played by itself), then the lesson's words, tips and a small challenge to try in the game.
import { esc, icon, tip, plural, sourcesLine, track, calm, $, $$ } from '../lib/ui.js';
import { content, figureData, buildData } from '../lib/data.js';
import { mountFigure } from '../lib/figure.js';
import { getStage } from '../lib/stage3d.js';
import { log } from '../lib/store.js';
import { tick, pop } from '../lib/sound.js';
import * as read from '../lib/read.js';
import { toolMenuButton, wireToolMenu } from './build.js';

// Figure ids starting "test-" are builds standing in for figures that don't exist yet
// (data/builds/test-*.json). Harmless once the real figures arrive, so it stays.
const isTest = l => /^test-/.test(l.figure || '');

export async function render(main, [id], ctx) {
  const data = await content('lessons').catch(() => null);
  const lessons = data && Array.isArray(data.lessons) ? data.lessons : [];
  let off;
  if (!lessons.length) {
    main.innerHTML = `<div class="ms-page"><section class="band"><div class="wrap"><h1>Master Builder Secrets</h1>
      <p>The lessons are on their way. Check back soon.</p></div></section>
      <div class="wrap section"><a class="btn" href="#/builds">${icon('builds')} Pick a build</a></div></div>`;
  } else off = id ? renderLesson(main, data, id, ctx) : renderList(main, data, ctx);
  const links = stayInBook(main, ctx);
  return () => { links(); if (off) off(); };
}

// <base href> makes a bare "#/..." link point at /layer-by-layer-2/#/..., which is a different
// address from the page's own /layer-by-layer-2, so a plain tap reloads the whole book (and the
// 3D picture starts from cold). Taps on this page's own links change only the hash instead.
// Modified clicks (open in a new tab) are left alone.
function stayInBook(main, ctx) {
  const onClick = e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || !main.contains(a)) return;
    e.preventDefault();
    ctx.go(a.getAttribute('href'));
  };
  main.addEventListener('click', onClick);
  return () => main.removeEventListener('click', onClick);
}

// ---------------------------------------------------------------- the list
function renderList(main, data, ctx) {
  const tried = log.tried('secrets');
  main.innerHTML = `
  <div class="ms-page" data-readable>
    <section class="band"><div class="wrap">
      <div class="kicker">Technique lessons</div>
      <h1>Master Builder Secrets</h1>
      ${data.intro ? `<p>${esc(data.intro)}</p>` : ''}
    </div></section>
    <div class="wrap section">
      <div class="grid ms-grid">${data.lessons.map((l, i) => lessonCard(l, i, tried[l.id])).join('')}</div>
      ${data.placeholder ? '<p class="tiny ms-sample no-read">These are sample lessons while the real ones are being written.</p>' : ''}
    </div>
  </div>`;
  ctx.setReadable(true);
  wireArt(main);
}

function lessonCard(l, i, tried) {
  const n = (l.steps || []).length;
  return `<a class="ms-card" href="#/secrets/${esc(l.id)}">
    <div class="ms-art">${poster(l, i + 1)}</div>
    <div class="ms-card-body">
      <div class="kicker">Lesson ${i + 1}</div>
      <h2 style="view-transition-name:ms-title-${esc(l.id)}">${esc(l.title)}</h2>
      <p>${esc(l.lead || '')}</p>
      <div class="ms-card-meta">${n ? `<span class="chip">${icon('layers')} ${plural(n, 'step')}</span>` : ''}${tried ? `<span class="chip done">${icon('check')} Tried it</span>` : ''}</div>
    </div></a>`;
}

// A card's picture is the figure's last frame (img/figures/<figure>.webp). Test figures use their
// build poster. If no picture exists yet, the card shows a blocky stand-in, never a broken image.
function poster(l, n) {
  const none = `<span class="ms-art-none" aria-hidden="true"><i></i><i></i><i></i><b>${n}</b></span>`;
  if (!l.figure) return none;
  const src = `img/${isTest(l) ? 'posters' : 'figures'}/${l.figure}.webp`;
  return `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">${none}`;
}
function wireArt(root) {
  $$('.ms-art', root).forEach(art => {
    const img = $('img', art), miss = () => art.classList.add('none');
    if (!img) return miss();
    // a picture the browser already knows is missing may have failed before this listener existed
    if (img.complete && !img.naturalWidth) miss(); else img.addEventListener('error', miss, { once: true });
  });
}

// ---------------------------------------------------------------- one lesson
function renderLesson(main, data, id, ctx) {
  const list = data.lessons, idx = list.findIndex(l => l.id === id), L = list[idx];
  if (!L) {
    main.innerHTML = `<div class="ms-page"><section class="band"><div class="wrap"><h1>Secret not found</h1>
      <p>We can't find that lesson. Pick one from the list.</p></div></section>
      <div class="wrap section"><a class="btn big" href="#/secrets">${icon('secrets')} See all the secrets</a></div></div>`;
    return;
  }
  const steps = (L.steps || []).filter(s => s && (s.title || s.text));
  const n = steps.length, test = isTest(L);
  let k = Math.max(0, Math.min(n - 1, (parseInt(ctx.query.step, 10) || 1) - 1));   // 0-based step
  let fig = null, live = true, ended = false, flat = false;   // flat: showing a still picture, not 3D
  track('lbl2_lesson_open', { lesson: L.id });
  // "Tried it" (on the list and in My Log) means the reader did something here: took a step, turned
  // the figure or went to the challenge. Opening a lesson by mistake doesn't count, the same as
  // the Redstone Workshop, which waits for the first press.
  let tried = false;
  const useIt = () => { if (!tried) { tried = true; log.markTried('secrets', L.id); } };

  const prev = list[idx - 1], next = list[idx + 1];
  const pageLink = (l, dir) => l
    ? `<a class="btn ${dir === 'prev' ? 'ghost' : ''}" href="#/secrets/${esc(l.id)}">${dir === 'prev' ? icon('prev') : ''}<span>${esc(l.title)}</span>${dir === 'next' ? icon('next') : ''}</a>`
    : `<a class="btn ghost" href="#/secrets">${icon('secrets')}<span>All the secrets</span></a>`;
  const hasMore = (L.body || []).length || (L.tips || []).length;

  main.innerHTML = `
  <div class="ms-page ms-lesson" data-readable>
    <section class="band ms-band"><div class="wrap">
      <div class="kicker">Master Builder Secret ${idx + 1} of ${list.length}</div>
      <h1 style="view-transition-name:ms-title-${esc(L.id)}">${esc(L.title)}</h1>
      ${L.lead ? `<p>${esc(L.lead)}</p>` : ''}
    </div></section>
    <div class="wrap ms-wrap">
      <div class="ms-player ${n ? '' : 'no-steps'}">
        <div class="ms-figbox">
          <div class="ms-fig fig-stage" id="ms-fig" role="group" aria-label="${esc(figLabel())}">
            <div class="ms-fig-wait no-read">Loading the 3D picture…</div>
          </div>
          <div class="stage-tools top-right has-menu" id="ms-tools" hidden>
            ${toolMenuButton('ms-tool-list', 'View buttons')}
            <div class="tool-list" id="ms-tool-list">
            <button class="tool" type="button" data-view="front" aria-label="Look from the front">${icon('front')}</button>
            <button class="tool" type="button" data-view="side" aria-label="Look from the side">${icon('side')}</button>
            <button class="tool" type="button" data-view="top" aria-label="Look from the top">${icon('top')}</button>
            <button class="tool" type="button" data-view="hero" aria-label="Reset the view">${icon('reset')}</button>
            </div>
          </div>
          <div class="stage-hint" id="ms-hint" hidden>Drag to spin</div>
        </div>
        ${n ? `<section class="ms-stepper card" aria-label="Steps">
          <div class="ms-stephead">
            <div class="ms-count" id="ms-count"></div>
            ${n > 1 ? `<div class="ms-dots" role="group" aria-label="Jump to a step">${steps.map((s, i) => `<button type="button" class="ms-dot" data-k="${i}" aria-label="Step ${i + 1}: ${esc(s.title || '')}">${i + 1}</button>`).join('')}</div>` : ''}
          </div>
          <div class="ms-steps" id="ms-steps">${steps.map((s, i) => `<div class="ms-step" data-k="${i}">
            ${s.title ? `<h2>${esc(s.title)}</h2>` : ''}${s.text ? `<p>${esc(s.text)}</p>` : ''}</div>`).join('')}</div>
          <p class="visually-hidden no-read" aria-live="polite" id="ms-say"></p>
          <div class="ms-nav ${n > 1 ? '' : 'solo'}">
            ${n > 1 ? `<button class="btn big ghost" type="button" id="ms-back">${icon('prev')}<span>Back</span></button>` : ''}
            <button class="btn big" type="button" id="ms-next"></button>
          </div>
        </section>` : ''}
      </div>

      <article class="ms-body">
        ${hasMore ? '<h2>Good to know</h2>' : ''}
        ${(L.body || []).map(p => `<p>${esc(p)}</p>`).join('')}
        ${(L.tips || []).map(t => tip(t[0], t[1], t[2])).join('')}
        ${L.challenge ? `<div class="ms-try" id="ms-try" tabindex="-1"><p><span class="t">Try it<span class="visually-hidden">:</span></span> ${esc(L.challenge)}</p></div>` : ''}
        <div class="no-read">${sourcesLine(L.sources)}</div>
      </article>
      <nav class="pager" aria-label="More secrets">${pageLink(prev, 'prev')}${prev || next ? pageLink(next, 'next') : ''}</nav>
    </div>
  </div>`;
  ctx.setReadable(true);

  const figEl = $('#ms-fig', main);
  const frameFor = i => Math.min(i + 1, fig ? fig.frames : i + 1);

  // ---------------------------------------------------------------- the stepper
  function figLabel() {
    const s = steps[k];
    return `${flat ? 'Picture' : '3D picture'} of ${L.title}${s ? `. Step ${k + 1} of ${n}${s.title ? `: ${s.title}` : ''}` : ''}.${flat ? '' : ' Drag to spin it.'}`;
  }
  // Every step sits in the same grid cell, so the box is as tall as the longest step and the
  // Back and Next buttons never move under a kid's finger between steps.
  function show(announce) {
    if (!n) return;
    $('#ms-count', main).innerHTML = `Step <b>${k + 1}</b> of ${n}`;
    $$('.ms-step', main).forEach(el => {
      const on = +el.dataset.k === k;
      el.classList.toggle('on', on); el.classList.toggle('no-read', !on);
      el.setAttribute('aria-hidden', String(!on));
    });
    $$('.ms-dot', main).forEach(b => { if (+b.dataset.k === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    const bb = $('#ms-back', main), nb = $('#ms-next', main);
    const last = k === n - 1, toTry = last && !!L.challenge;
    // On the last step Next turns into "Try it" (same spot, nothing lost if tapped by accident).
    // With no challenge to jump to, Next just rests.
    nb.innerHTML = toTry ? `${icon('check')}<span>Try it</span>` : `<span>Next</span>${icon('next')}`;
    nb.classList.toggle('gold', toTry);
    // A disabled button drops keyboard focus to the top of the page, so hand it to the other one first
    const backOff = k === 0, nextOff = last && !toTry;
    nb.disabled = false; if (bb) bb.disabled = false;
    if (nextOff) { if (document.activeElement === nb && bb && !backOff) bb.focus(); nb.disabled = true; }
    if (bb && backOff) { if (document.activeElement === bb && !nextOff) nb.focus(); bb.disabled = true; }
    figEl.setAttribute('aria-label', figLabel());
    if (announce) $('#ms-say', main).textContent = [`Step ${k + 1} of ${n}`, steps[k].title, steps[k].text].filter(Boolean)
      .map(s => /[.!?]$/.test(s.trim()) ? s.trim() : s.trim() + '.').join(' ');
    if (fig) fig.set(frameFor(k));
  }
  function go(to) {
    to = Math.max(0, Math.min(n - 1, to));
    if (to === k) return;
    k = to; show(true); tick(); useIt();
    // keep the step in the address so a reload stays put; replaceState so Back leaves the lesson.
    // Full path, because a bare "#..." resolves against <base href> and would change the page's URL.
    history.replaceState(null, '', `${location.pathname}${location.search}#/secrets/${L.id}${k ? `?step=${k + 1}` : ''}`);
    if (k === n - 1) end();
    // Read to me was on: read the new step out loud, so the reader can keep listening as they tap
    if (read.reading()) read.start($(`.ms-step[data-k="${k}"]`, main), 0, on => { const b = document.getElementById('btn-read'); if (b) b.setAttribute('aria-pressed', String(on)); });
  }
  function end() { if (!ended) { ended = true; track('lbl2_lesson_end', { lesson: L.id }); } }
  function tryIt() {
    const box = $('#ms-try', main); if (!box) return;
    pop(); useIt(); end();   // a one-step lesson ends here, since there is no step to move to
    box.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
    box.focus({ preventScroll: true });
  }

  // a fast double tap counts once, so it never skips a step (or jumps to Try it by accident)
  let lastTap = 0;
  const guard = fn => (...a) => { const t = performance.now(); if (t - lastTap < 300) return; lastTap = t; fn(...a); };
  const back = guard(() => go(k - 1));
  const forward = guard(() => { if (k < n - 1) go(k + 1); else tryIt(); });
  if (n) {
    if (n > 1) $('#ms-back', main).addEventListener('click', back);
    $('#ms-next', main).addEventListener('click', forward);
    $$('.ms-dot', main).forEach(b => b.addEventListener('click', () => go(+b.dataset.k)));
  }
  // arrow keys step too, unless the reader is typing, has a dialog or the settings sheet open, or
  // is on the 3D canvas (there the arrows turn the figure)
  const overlayOpen = () => {
    if (document.querySelector('dialog[open], .sheet-fallback:not([hidden])')) return true;
    try { return !!document.querySelector(':popover-open'); } catch (e) { return false; }   // older Safari
  };
  const onKey = e => {
    if (!n || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.defaultPrevented || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable],canvas'))) return;
    if (overlayOpen()) return;
    if (e.key === 'ArrowRight' && k < n - 1) { e.preventDefault(); go(k + 1); }
    if (e.key === 'ArrowLeft' && k > 0) { e.preventDefault(); go(k - 1); }
  };
  addEventListener('keydown', onKey);
  $$('[data-view]', main).forEach(b => b.addEventListener('click', () => { if (fig) { fig.view(b.dataset.view); useIt(); } }));
  show(false);

  // ---------------------------------------------------------------- the 3D figure
  // Not awaited, so the words show straight away while 3D loads. The data and the stage are fetched
  // first; after that mountFigure finishes in a few microtasks, so it can never grab the shared
  // canvas for this page after the reader has already moved on.
  // No `time` here: each figure's own META picks its time of day (figure.js falls back to 0.4).
  (async () => {
    try {
      if (!L.figure) throw new Error('no figure');
      await Promise.all([test ? buildData(L.figure) : figureData(L.figure), getStage()]);
      if (!live) return;
      fig = await mountFigure(figEl, L.figure, { build: test, frame: n ? k + 1 : 999, alt: L.title });
    } catch (e) { if (live) noFigure(); return; }
    if (!live) return;
    if (n) fig.set(frameFor(k), 0);   // the reader may have stepped while the 3D was loading
    if (fig.stage) {
      $('#ms-tools', main).hidden = false; wireToolMenu($('#ms-tools', main), fig.stage);
      const hint = $('#ms-hint', main); hint.hidden = false;
      fig.stage.on('interact', () => { hint.hidden = true; useIt(); });
    } else { flat = true; figEl.setAttribute('aria-label', figLabel()); watchPoster(); }
  })();

  // No 3D (old device): figure.js shows still pictures instead, falling back to the last frame's
  // picture when a step's is missing. If that one fails too, stop retrying and show the stand-in.
  function watchPoster() {
    const img = $('.stage-poster', figEl); if (!img) return;
    let fails = 0;
    const onErr = () => {
      if (++fails < 2) return;
      img.onerror = null; img.removeEventListener('error', onErr);   // figure.js would retry forever
      if (live) noFigure();
    };
    img.addEventListener('load', () => { fails = 0; });
    img.addEventListener('error', onErr);
  }
  // The figure isn't built yet (or failed): show its poster, or a friendly stand-in. Steps still work.
  function noFigure() {
    fig = null; flat = true;
    figEl.setAttribute('aria-label', figLabel());
    figEl.innerHTML = `${L.figure ? `<img class="stage-poster" src="img/${test ? 'posters' : 'figures'}/${esc(L.figure)}.webp" alt="">` : ''}
      <div class="ms-fig-none"><span class="ms-art-none" aria-hidden="true"><i></i><i></i><i></i></span><p>The 3D picture for this secret is still being built.</p></div>`;
    const img = $('img', figEl);
    if (img) {
      img.addEventListener('load', () => { const s = $('.ms-fig-none', figEl); if (s) s.remove(); }, { once: true });
      img.addEventListener('error', () => img.remove(), { once: true });
    }
    $('#ms-tools', main).hidden = true;
    $('#ms-hint', main).hidden = true;
  }

  return () => { live = false; removeEventListener('keydown', onKey); if (fig) fig.destroy(); };
}
