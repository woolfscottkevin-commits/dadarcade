// Top 10 Coolest Things to Do: a countdown from 10 to 1 (#/top10), then one page per thing (#/top10/<id>).
// The countdown is one of the two places (with Showcase) allowed decorative motion. Cards rise in as
// they scroll into view, driven only by CSS view() timelines in top10.css, so this file runs no timers
// and Calm mode or reduced motion simply leaves the page still.
import { esc, icon, tip, pips, sourcesLine, track, calm, $ } from '../lib/ui.js';
import { content, iconFor, iconSpan, figureData, buildData } from '../lib/data.js';
import { mountFigure } from '../lib/figure.js';
import { getStage } from '../lib/stage3d.js';
import { log } from '../lib/store.js';

export const DANGER_WORDS = ['', 'Totally safe', 'A little risky', 'Be careful', 'Dangerous', 'Very dangerous'];
const LEVELS = { Beginner: 1, Explorer: 2, Expert: 3 };
const TIP_KINDS = ['pro', 'warn', 'know', 'start'];

// A full stop only the read-aloud voice and screen readers meet, so labels and chips that sit side
// by side are spoken as separate sentences instead of running together.
const STOP = '<span class="visually-hidden">. </span>';

// In-book links carry the page's own path. A bare "#/..." resolves against <base href>, so from
// /layer-by-layer-2 (no slash) or /index.html it is a different URL: the whole book reloads, the
// 3D stage restarts and the card-to-page morph never plays. (Same fix as redstone.js.)
const to = hash => esc(location.pathname + location.search + hash);

// Keep whatever the JSON says inside 1..5 so a typo can never break the meter.
const dangerOf = it => Math.max(1, Math.min(5, Math.round(+it.danger || 1)));
// The last three get medal colours. The number always says the rank too, so colour is never the only signal.
const medal = rank => ({ 1: 't10-gold', 2: 't10-silver', 3: 't10-bronze' })[rank] || '';
// Countdown order: 10 first, 1 last.
const countdown = data => [...(data.items || [])].sort((a, b) => b.rank - a.rank);

// Five blocks that step up like stairs, filled up to the danger level. Height, count and the words
// beside it all carry the meaning, so the colour is only a bonus. `label` is what a screen reader
// hears; leave it out where the words right next to the meter already say the same thing.
export function dangerMeter(n, cls = '', label = '') {
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<span class="t10-meter t10-d${n} ${cls}" ${a11y}>${[1, 2, 3, 4, 5]
    .map(k => `<i class="${k <= n ? 'on' : ''}" style="--k:${k}"></i>`).join('')}</span>`;
}
// The pips are a picture of the word beside them, so they stay quiet ("Level: Explorer",
// not "Level: Difficulty 2 of 3 Explorer").
function levelChip(level) {
  const name = LEVELS[level] ? level : 'Beginner';
  return `<span class="chip t10-level"><span class="visually-hidden">Level: </span><span aria-hidden="true">${pips(LEVELS[name])}</span> ${esc(name)}</span>`;
}
// a small pixel crown for number 1: three points, the middle one tallest, and three gems on the
// band (a plain shape, not a character or logo)
const crown = cls => `<svg class="t10-crown ${cls}" viewBox="0 0 14 10" aria-hidden="true"><path d="M0 1h2v4h3V2h1V0h2v2h1v3h3V1h2v9H0z" fill="currentColor"/><path d="M3 7h2v2H3zM6 7h2v2H6zM9 7h2v2H9z" fill="rgba(0,0,0,.28)"/></svg>`;

// Item names in "What you need" are written for kids ("Torches", "Furnace and fuel"), so try a few
// plainer spellings before giving up on a picture from the icon sheet.
async function needIcon(name) {
  const base = String(name).replace(/\s*\(.*\)\s*$/, '').split(/,| and | or /)[0].trim();
  const tries = [name, base, base.replace(/es$/, ''), base.replace(/s$/, '')];
  for (const t of tries) { const ix = await iconFor(t).catch(() => -1); if (ix >= 0) return ix; }
  return -1;
}

// The rank tile. It shares a view-transition name with the item page's badge, so tapping a card
// morphs its number into the badge (the router skips the transition in Calm mode).
function rankTile(it, cls = '') {
  return `<span class="t10-rank ${medal(it.rank)} ${cls}" aria-hidden="true" style="view-transition-name:t10-rank-${esc(it.id)}">
    ${it.rank === 1 ? crown('') : ''}<span class="t10-rank-n"><small>#</small>${esc(it.rank)}</span></span>`;
}

export async function render(main, [id], ctx) {
  let data;
  try { data = await content('top10'); }
  catch (e) {
    main.innerHTML = `<div class="wrap section"><h1>The Top 10 could not load</h1><p>Check your Wi-Fi and try again.</p><p><a class="btn" href="${to('#/')}">Back to the start</a></p></div>`;
    return;
  }
  return id ? renderItem(main, data, id, ctx) : renderList(main, data, ctx);
}

// ---------------------------------------------------------------- the countdown
function card(it, seen) {
  const d = dangerOf(it), m = medal(it.rank);
  return `<article class="t10-card ${m} ${it.rank === 1 ? 't10-first' : ''}" data-id="${esc(it.id)}">
    ${rankTile(it)}
    <div class="t10-body">
      ${it.rank === 1 ? '<div class="t10-best">The coolest thing of all</div>' : ''}
      <h2 class="t10-title"><a class="t10-link" href="${to(`#/top10/${it.id}`)}"><span class="t10-tt" style="view-transition-name:t10-title-${esc(it.id)}"><span class="visually-hidden">Number ${esc(it.rank)}: </span>${esc(it.title)}</span></a></h2>
      <p class="t10-why">${esc(it.why)}</p>
      <p class="t10-facts">
        <span class="t10-danger"><span class="t10-lab">Danger<span class="visually-hidden">:</span></span> ${dangerMeter(d, '', `${d} out of 5`)} <b>${DANGER_WORDS[d]}</b>${STOP}</span>
        ${levelChip(it.level)}
        ${seen ? `<span class="chip done no-read">${icon('check')} Seen</span>` : ''}
      </p>
    </div>
    <span class="t10-go" aria-hidden="true">${icon('next')}</span>
  </article>`;
}

function renderList(main, data, ctx) {
  const items = countdown(data), seen = log.tried('top10');
  const book = ctx.book || {}, parts = (book.parts || []).filter(p => !['minis', 'log'].includes(p.key));
  const title = (parts.find(p => p.key === 'top10') || {}).title || 'Top 10 Coolest Things to Do';
  const first = items[items.length - 1];

  main.innerHTML = `<div data-readable>
  <section class="band t10-band"><div class="wrap t10-band-in">
    <div class="t10-band-copy">
      <div class="kicker">Countdown</div>
      <h1>${esc(title)}</h1>
      <p>${esc(data.intro || '')}</p>
    </div>
    <div class="t10-band-side">
      <div class="t10-key">
        <p><b>The danger meter.</b> <span class="t10-key-row">${dangerMeter(1)} <span>1 block: totally safe.</span></span>
        <span class="t10-key-row">${dangerMeter(5)} <span>5 blocks: very dangerous.</span></span></p>
      </div>
      ${first ? `<button class="btn gold" type="button" id="t10-jump">${crown('')} Jump to #1</button>` : ''}
    </div>
  </div></section>
  <div class="wrap section t10-list-wrap">
    <div class="t10-list">
      ${items.map(it => (it.rank === 3 ? '<p class="t10-drum">Drum roll, please! Here come the top 3.</p>' : '') + card(it, seen[it.id])).join('')}
    </div>
    <p class="t10-end">That is the whole countdown. Which one will you try first?</p>
  </div></div>`;
  ctx.setReadable(true);

  // land on a card and focus its link, e.g. "Jump to #1" or coming back from an item page
  const goTo = (itemId, smooth) => {
    const c = main.querySelector(`.t10-card[data-id="${CSS.escape(itemId)}"]`); if (!c) return;
    c.scrollIntoView({ block: 'center', behavior: smooth && !calm() ? 'smooth' : 'auto' });
    $('.t10-link', c).focus({ preventScroll: true });
  };
  const jump = $('#t10-jump', main);
  if (jump) jump.addEventListener('click', () => { goTo(first.id, true); track('lbl2_top10_jump'); });
  // The router scrolls to the top after render returns, so wait a tick before scrolling back.
  if (ctx.query.from) setTimeout(() => goTo(ctx.query.from, false), 0);
}

// ---------------------------------------------------------------- one thing to try
// Big rank-number art for when an item has no 3D scene yet (or 3D can't load).
function rankArt(it) {
  const cubes = ['a', 'b', 'c'].map(k => `<span class="t10-cube t10-cube-${k}">${icon('cube')}</span>`).join('');
  return `<div class="t10-art ${medal(it.rank)}" aria-hidden="true">
    ${cubes}
    <span class="t10-art-tag">${it.rank === 1 ? 'Number one' : it.rank <= 3 ? 'Top 3' : 'Top 10'}</span>
    <span class="t10-art-num">${it.rank === 1 ? crown('t10-art-crown') : ''}<span><small>#</small>${esc(it.rank)}</span></span>
    <span class="t10-art-ground"></span>
  </div>`;
}

function pagerLink(o, dir) {
  const next = dir === 'next';
  return `<a class="btn ${next ? '' : 'ghost'} t10-pg-${dir}" href="${to(`#/top10/${o.id}`)}" rel="${dir}">${next ? '' : icon('prev')}
    <span class="t10-pg"><small>${next ? 'Next' : 'Previous'}: #${esc(o.rank)}</small>${STOP}<b>${esc(o.title)}</b></span>${next ? icon('next') : ''}</a>`;
}

async function renderItem(main, data, id, ctx) {
  const items = countdown(data), i = items.findIndex(x => x.id === id), it = items[i];
  if (!it) {
    main.innerHTML = `<div class="wrap section"><h1>We couldn't find that one</h1><p>That page is not in the countdown. Pick one from the list instead.</p><p><a class="btn" href="${to('#/top10')}">See the whole Top 10</a></p></div>`;
    return;
  }
  const prev = items[i - 1], next = items[i + 1], d = dangerOf(it);
  const noteKind = TIP_KINDS.includes(it.note_kind) ? it.note_kind : 'pro';
  // item icons where the book has one; everything else gets a plain block shape
  const needIcons = await Promise.all((it.need || []).map(needIcon));
  log.markTried('top10', it.id);
  track('lbl2_top10_open', { item: it.id });

  main.innerHTML = `<div data-readable>
  <section class="band t10-band t10-item-band"><div class="wrap t10-band-in">
    ${rankTile(it, 't10-badge')}
    <div class="t10-band-copy">
      <div class="kicker" data-read>Top 10<span aria-hidden="true"> · </span>${STOP}Number ${esc(it.rank)} of 10</div>
      <h1><span class="t10-tt" style="view-transition-name:t10-title-${esc(it.id)}">${esc(it.title)}</span></h1>
      <p>${esc(it.why)}</p>
      <p class="t10-band-chips">${levelChip(it.level)}</p>
    </div>
  </div></section>
  <div class="wrap t10-page">
    <div class="t10-hero ${it.scene ? 't10-has-scene' : ''}">
      <div class="t10-scene">
        ${it.scene ? `<section class="t10-stage" id="t10-stage" aria-label="${esc(`A 3D scene for ${it.title}. Drag to spin it.`)}">${rankArt(it)}</section>
          <div class="t10-stage-tools" id="t10-tools" hidden>
            <button class="btn small ghost" type="button" id="t10-replay">${icon('play')} Watch it build</button>
            ${calm() ? '' : `<button class="btn small ghost" type="button" id="t10-spin" aria-pressed="false">${icon('reset')} <span>Spin</span></button>`}
          </div>` : rankArt(it)}
      </div>
      <div class="t10-side-facts">
        <section class="card t10-risk" aria-labelledby="t10-risk-h">
          <h2 id="t10-risk-h">How risky is it?</h2>
          <div class="t10-gauge">${dangerMeter(d, 't10-big')}
            <p class="t10-gauge-word"><b>${DANGER_WORDS[d]}</b>${STOP}<span>Danger ${d} out of 5.</span></p></div>
        </section>
        <section class="card t10-where" aria-labelledby="t10-where-h">
          <h2 id="t10-where-h">Where to go</h2>
          <p>${esc(it.where)}</p>
        </section>
      </div>
    </div>
    <div class="t10-cols">
      <section class="t10-how" aria-labelledby="t10-how-h">
        <h2 id="t10-how-h">How to do it</h2>
        <ol class="steps">${(it.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      </section>
      <aside class="t10-aside">
        ${(it.need || []).length ? `<section class="card t10-need-card" aria-labelledby="t10-need-h">
          <h2 id="t10-need-h">What you need</h2>
          <ul class="t10-need">${it.need.map((n, k) => `<li class="t10-pill">${needIcons[k] >= 0 ? iconSpan(needIcons[k]) : icon('cube')}<span>${esc(n)}</span></li>`).join('')}</ul>
        </section>` : ''}
        ${it.wow ? tip('know', it.wow_title || 'Did you know', it.wow) : ''}
        ${it.note ? tip(noteKind, it.note_title || '', it.note) : ''}
      </aside>
    </div>
    <div class="no-read">${sourcesLine(it.sources)}</div>
    <nav class="t10-pager" aria-label="More from the Top 10">
      ${prev ? pagerLink(prev, 'prev') : ''}
      <a class="btn ${next ? 'ghost' : 't10-pg-last'} t10-pg-all" href="${to(`#/top10?from=${it.id}`)}">${icon('top10')} <span>${next ? 'All 10' : 'Back to the countdown'}</span></a>
      ${next ? pagerLink(next, 'next') : ''}
    </nav>
  </div></div>`;
  ctx.setReadable(true);

  // The 3D scene, when this item has one. Until it loads (or if it can't), the rank art stays.
  // Not awaited: the router holds the old page on screen until render returns, so a slow scene
  // must not keep the words from showing. The data and the stage are fetched first and the figure
  // only mounts if the reader is still here, so it never grabs the shared canvas from the next page.
  // Scene ids starting "test-" are builds standing in for figures that don't exist yet (as in secrets.js).
  let fig = null, live = true;
  const stageEl = $('#t10-stage', main), test = /^test-/.test(it.scene || '');
  if (stageEl) (async () => {
    try {
      await Promise.all([test ? buildData(it.scene) : figureData(it.scene), getStage()]);
      if (!live) return;
      fig = await mountFigure(stageEl, it.scene, { time: it.time, frame: 99, assemble: true, build: test, alt: it.title });
    } catch (e) {
      // the rank art stays, so stop promising a 3D scene to spin
      if (live) { console.warn('Top 10 scene not ready', it.scene, e); stageEl.removeAttribute('aria-label'); }
      return;
    }
    if (live) wireScene(fig);
  })();
  return () => { live = false; if (fig) fig.destroy(); };

  function wireScene(f) {
    const tools = $('#t10-tools', main);
    if (!f.stage) { stageEl.removeAttribute('aria-label'); return; }   // a poster picture (its alt says what it is) has nothing to control
    tools.hidden = false;
    const layers = f.data.bounds[4] - f.data.bounds[1] + 2;
    $('#t10-replay', main).addEventListener('click', () => {
      f.stage.set('uReveal', 0); f.stage.set('uReveal', layers, calm() ? 0 : 2600);
    });
    const spin = $('#t10-spin', main);
    if (spin) spin.addEventListener('click', () => {
      const on = spin.getAttribute('aria-pressed') !== 'true';
      spin.setAttribute('aria-pressed', String(on)); f.spin(on);
      spin.querySelector('span').textContent = on ? 'Stop spinning' : 'Spin';
    });
  }
}
