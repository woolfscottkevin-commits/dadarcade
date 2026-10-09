// Master Build Showcase: a magazine. #/showcase is the cover (every story as a big headline card in
// its own colour); #/showcase/<id> is one feature spread. One of the two sections allowed decorative
// motion, so reveals live in showcase.css behind @supports, reduced-motion and Calm mode guards.
import { esc, icon, outLink, sourcesLine, track, calm, $, $$ } from '../lib/ui.js';
import { content, catalog, buildData, figureData } from '../lib/data.js';
import { mountFigure } from '../lib/figure.js';
import { getStage } from '../lib/stage3d.js';
import { toolMenuButton, wireToolMenu } from './build.js';

export async function render(main, [id], ctx) {
  let data;
  try { data = await content('showcase'); }
  catch (e) {
    main.innerHTML = `<div class="wrap section"><h1>The stories could not load</h1><p>Check your Wi-Fi and try again.</p><p><a class="btn" href="#/">Back to the start</a></p></div>`;
    return;
  }
  const book = ctx.book || await content('book').catch(() => ({}));
  const list = data.features || [];
  return id ? story(main, id, list, ctx) : cover(main, data, list, book, ctx);
}

// ---------------------------------------------------------------- colour
// Each story brings one accent colour. Text on it must stay readable whatever the colour is, so the
// page works out which ink to use (and deepens the colour if neither white nor dark ink is clear enough).
const INK = [27, 33, 48], WHITE = [255, 255, 255], PAPER = [251, 247, 238], NAVY = [42, 47, 107];
const rgb = h => { const m = /^#?([\da-f]{6})$/i.exec(h || ''); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const lum = c => c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = c => `rgb(${c.join(' ')})`;
// darken towards black (not the navy ink) so gold turns a warm brown instead of olive
function deepen(c, against, need) {
  let out = c;
  for (let k = 0.05; k <= 1 && contrast(out, against) < need; k += 0.05) out = mix(c, [0, 0, 0], k);
  return out;
}
function tones(hex) {
  let ac = rgb(hex) || NAVY, on = WHITE;
  // the story header draws faint white grid lines over the colour (7% white), so white text has to
  // pass on the lightest part of the header, not only on the plain colour
  const lit = c => mix(c, WHITE, 0.07);
  if (contrast(lit(ac), WHITE) < 4.5) {
    if (contrast(ac, INK) >= 4.5) on = INK;
    else { const base = ac; for (let k = 0.05; k <= 1 && contrast(lit(ac), WHITE) < 4.5; k += 0.05) ac = mix(base, [0, 0, 0], k); }
  }
  return {
    ac, on,
    style: [`--ac:${css(ac)}`, `--on:${css(on)}`, `--deep:${css(deepen(ac, PAPER, 4.5))}`, `--tint:${css(mix(ac, WHITE, 0.84))}`,
      `--ac-lt:${css(mix(ac, WHITE, 0.6))}`, `--ac-dk:${css(mix(ac, INK, 0.3))}`].join(';'),
  };
}

// ---------------------------------------------------------------- small helpers
// "16 x 16 x 32" reads better as "16 × 16 × 32", and Read to Me says "times" for ×. No-break spaces
// keep a size on one line, so a heading never wraps between "16 × 16" and "× 32".
const nice = s => String(s ?? '').replace(/(\d)\s*x\s*(?=\d)/g, '$1\u00a0×\u00a0');
const t = s => esc(nice(s));
const issueOf = book => ((book.edition || '').match(/Updated ([A-Z][a-z]+ \d{4})/) || [])[1] || '';

// A little pile of blocks for a header corner, one block per colour. Bottom row first, so the
// drop-in animation builds the pile from the ground up.
const PILE = [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [2, 1], [2, 2], [3, 1], [0, 1], [1, 2]];
function pile(colors, cls = '') {
  return `<div class="sc-pile ${cls}" aria-hidden="true" data-build>${colors.slice(0, PILE.length).map((c, k) =>
    `<i style="--b:${c};--x:${PILE[k][0]};--y:${PILE[k][1]};--k:${k}"></i>`).join('')}</div>`;
}

// sourcesLine() names each link by its website, so five videos read "youtube.com" five times.
// Number the repeats so each source is still its own link a grown-up can tell apart. Each " · " is
// also glued to the link before it, so a wrapped line never starts with a dot.
function tidySources(root) {
  const links = $$('.sources a', root), count = {}, seen = {};
  links.forEach(a => { count[a.textContent] = (count[a.textContent] || 0) + 1; });
  links.forEach(a => { const h = a.textContent; if (count[h] > 1) a.textContent = `${h}\u00a0(${(seen[h] = (seen[h] || 0) + 1)})`; });
  links.forEach(a => { const n = a.nextSibling; if (n && n.nodeType === 3 && n.data === ' · ') n.data = '\u00a0· '; });
}

// Reveals and the block pile only play once the thing is on screen (and never in Calm mode).
function watchBuilds(main) {
  if (calm() || !('IntersectionObserver' in window)) return null;
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-built'); io.unobserve(e.target); }
  }), { threshold: 0.35 });
  $$('[data-build]', main).forEach(el => { el.classList.add('armed'); io.observe(el); });
  // never leave blocks hidden: anything already on screen that has not dropped in after a moment just appears
  const late = setTimeout(() => $$('.armed:not(.is-built)', main).forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-built'); }), 2500);
  return { disconnect() { clearTimeout(late); io.disconnect(); } };
}

// ---------------------------------------------------------------- the cover
function cover(main, data, list, book, ctx) {
  const part = (book.parts || []).find(p => p.key === 'showcase') || {};
  const words = (part.title || 'Master Build Showcase').split(' '), big = words.pop();
  const issue = issueOf(book);
  const [lead, ...rest] = list;

  main.innerHTML = `
  <div class="sc sc-cover" data-readable>
    <header class="sc-mast">
      <div class="wrap sc-mast-in">
        <div class="sc-mast-copy">
          <p class="sc-mast-line no-read"><span>${esc(book.title || 'Layer by Layer')}</span>${issue ? `<span>${esc(issue)} issue</span>` : ''}<span>${list.length} stories</span></p>
          <h1 class="sc-mast-title">${words.length ? `<span class="sc-mast-pre">${esc(words.join(' '))}</span> ` : ''}<span class="sc-mast-big">${esc(big)}</span></h1>
          <p class="sc-mast-intro">${esc(data.intro || part.blurb || '')}</p>
        </div>
        ${pile(list.map(f => css(tones(f.accent).ac)), 'sc-mast-pile')}
      </div>
    </header>
    <div class="wrap sc-cover-in">
      ${lead ? card(lead, true) : '<p>New stories are on the way.</p>'}
      ${rest.length ? `<div class="sc-grid">${rest.map(f => card(f, false)).join('')}</div>` : ''}
    </div>
  </div>`;
  ctx.setReadable(true);
  const io = watchBuilds(main);
  return () => { if (io) io.disconnect(); };
}

// The whole card is one link. Its name is just the headline (with the deck as its description), so a
// screen reader says "Four Builds Are Going to the Movies, link" instead of every word on the card.
function card(f, lead) {
  const s = (f.stats || [])[0], hid = `sc-c-${esc(f.id)}`;
  return `<a class="sc-card sc-reveal${lead ? ' sc-lead' : ''}" href="#/showcase/${esc(f.id)}" style="${tones(f.accent).style}" aria-labelledby="${hid}" aria-describedby="${hid}-d">
    <div class="sc-card-text">
      <div class="sc-card-tags">${lead ? '<span class="sc-tag sc-tag-inv">Cover story</span>' : ''}<span class="sc-tag">${esc(f.kicker || 'Story')}</span></div>
      <h2 class="sc-card-h" id="${hid}" style="view-transition-name:sc-${esc(f.id)}">${t(f.headline)}</h2>
      <p class="sc-card-deck" id="${hid}-d">${t(f.deck)}</p>
    </div>
    ${s ? `<p class="sc-card-stat${String(s[0]).length > 9 ? ' long' : ''}" style="--len:${String(s[0]).length}"><b>${t(s[0])}</b> <span>${t(s[1])}</span></p>` : ''}
    <span class="sc-card-go" aria-hidden="true">Read the story ${icon('next')}</span>
  </a>`;
}

// ---------------------------------------------------------------- one story
function story(main, id, list, ctx) {
  const i = list.findIndex(f => f.id === id), f = list[i];
  if (!f) {
    main.innerHTML = `<div class="wrap section"><h1>Story not found</h1><p>That story is not in this book.</p><p><a class="btn" href="#/showcase">See all the stories</a></p></div>`;
    return;
  }
  track('lbl2_story_open', { story: f.id });
  const tone = tones(f.accent);
  const stats = f.stats || [], body = f.body || [];
  const cut = body.length > 2 ? 2 : 1;            // the pull line goes in after this many paragraphs
  const prev = list[i - 1], next = list[i + 1];
  const shades = [tone.ac, mix(tone.ac, INK, 0.3), mix(tone.ac, WHITE, 0.45), mix(tone.ac, INK, 0.45), mix(tone.ac, WHITE, 0.7), mix(tone.ac, INK, 0.15), mix(tone.ac, WHITE, 0.3)].map(css);
  const p = s => `<p>${t(s)}</p>`;
  // With no 3D scene, wide screens show the numbers as a tower of blocks beside the story. The
  // tower then IS the numbers (the strip hides there), so nothing is said twice side by side.
  const towered = !f.scene && stats.length > 0;
  const side = f.scene ? scenePanel(f) : art(stats);

  main.innerHTML = `
  <article class="sc sc-story${towered ? ' sc-towered' : ''}" style="${tone.style}" data-readable>
    <header class="sc-head">
      <div class="wrap sc-head-in">
        <div class="sc-head-top">
          <a class="sc-back" href="#/showcase">${icon('prev')} <span>All stories</span></a>
          <span class="sc-count no-read">Story ${i + 1} of ${list.length}</span>
        </div>
        <span class="sc-tag sc-kicker">${esc(f.kicker || 'Story')}</span>
        <h1 class="sc-h1" style="view-transition-name:sc-${esc(f.id)}">${t(f.headline)}</h1>
        <p class="sc-deck">${t(f.deck)}</p>
        ${pile(shades.slice(1), 'sc-head-pile')}
      </div>
    </header>

    ${stats.length ? `<div class="wrap sc-stats-wrap"><ul class="sc-stats" style="--n:${Math.min(stats.length, 4)}" data-n="${stats.length}" aria-label="This story in numbers">${stats.map((s, k) =>
      `<li class="sc-stat sc-reveal${String(s[0]).length > 9 ? ' long' : ''}" style="--k:${k}"><b>${t(s[0])}</b> <span>${t(s[1])}</span></li>`).join('')}</ul></div>` : ''}

    <div class="wrap sc-layout${side ? '' : ' sc-solo'}">
      ${side ? `<aside class="sc-side${f.scene ? '' : ' is-art'}" id="sc-side">${side}</aside>` : ''}
      <div class="sc-main">
        <div class="sc-body">
          ${body.slice(0, cut).map(p).join('')}
          ${f.pull ? `<p class="sc-pull sc-reveal">${t(f.pull)}</p>` : ''}
          ${body.slice(cut).map(p).join('')}
        </div>
        ${f.record ? `<section class="sc-record sc-reveal" aria-labelledby="sc-rec-h">
          <span class="sc-record-ico">${icon('showcase')}</span>
          <div><h2 class="sc-label" id="sc-rec-h">World record</h2><p>${t(f.record)}</p></div>
        </section>` : ''}
        ${f.try_it && (f.try_it.steps || []).length ? `<section class="sc-try sc-reveal" aria-labelledby="sc-try-h">
          <p class="sc-tag sc-try-tag">Try it yourself</p>
          <h2 id="sc-try-h">${t(f.try_it.title || 'Try it yourself')}</h2>
          <ol class="steps">${f.try_it.steps.map(s => `<li>${t(s)}</li>`).join('')}</ol>
        </section>` : ''}
        ${(f.links || []).length ? `<section class="sc-more" aria-labelledby="sc-more-h">
          <h2 id="sc-more-h" class="no-read">Find out more</h2>
          <div class="sc-more-links">${f.links.map(([label, url]) => outLink(label, url, 'btn ghost sc-out')).join('')}</div>
        </section>` : ''}
        <div class="no-read">${sourcesLine(f.sources)}</div>
      </div>
    </div>

    <nav class="wrap sc-pager" aria-label="More stories">
      ${pagerCard(prev, 'prev')}
      ${pagerCard(next, 'next')}
    </nav>
  </article>`;
  ctx.setReadable(true);
  tidySources(main);

  const io = watchBuilds(main);
  let fig = null, gone = false;
  if (f.scene) showScene(main, f).then(x => { fig = x; if (gone && fig) fig.spin(false); });
  return () => { gone = true; if (io) io.disconnect(); if (fig) fig.spin(false); };
}

function pagerCard(f, dir) {
  const label = dir === 'prev' ? 'Previous story' : 'Next story';
  const arrow = dir === 'prev' ? icon('prev') : icon('next');
  if (!f) return `<a class="sc-pg sc-pg-${dir} sc-pg-home" href="#/showcase"><span class="sc-pg-dir">${dir === 'prev' ? arrow : ''} All stories ${dir === 'next' ? arrow : ''}</span><b>Back to the cover</b></a>`;
  return `<a class="sc-pg sc-pg-${dir}" href="#/showcase/${esc(f.id)}" style="${tones(f.accent).style}">
    <span class="sc-pg-dir">${dir === 'prev' ? arrow : ''} ${label} ${dir === 'next' ? arrow : ''}</span><b>${t(f.headline)}</b></a>`;
}

// No 3D scene yet: the story's numbers as a tower of blocks, first number at the bottom. On wide
// screens this replaces the numbers strip (CSS hides one or the other by width), so it is real
// content: a list Read to Me and screen readers can use. Narrow screens show the strip instead.
function art(stats) {
  if (!stats.length) return '';
  return `<div class="sc-art" data-build>
    <p class="sc-art-label" id="sc-art-h">By the numbers</p>
    <ul class="sc-tower" aria-labelledby="sc-art-h">${stats.map((s, k) => `<li class="sc-brick${k % 2 ? ' alt' : ''}${String(s[0]).length > 9 ? ' long' : ''}" style="--k:${k};--dx:${[0, 14, -10, 8, -6][k % 5]}px;--w:${Math.max(64, 100 - k * 9)}%">
      <b>${t(s[0])}</b> <span>${t(s[1])}</span></li>`).join('')}</ul>
    <div class="sc-ground" aria-hidden="true"></div>
  </div>`;
}

// The view buttons are the tap way to turn the scene (WCAG 2.5.7), the same four the lessons and
// gadgets use, so they still work in Calm mode when the Turn button is hidden.
function scenePanel(f) {
  const what = nice(f.scene_alt || f.scene_idea || 'A 3D scene made for this story').trim().replace(/\.?$/, '.');
  return `<figure class="sc-scene">
    <div class="sc-stage-box">
      <section class="sc-stage" id="sc-stage" aria-label="${esc(what)} Drag to spin it, or use the view buttons."></section>
      <div class="stage-tools top-right has-menu" id="sc-views" hidden>
        ${toolMenuButton('sc-tool-list', 'View buttons')}
        <div class="tool-list" id="sc-tool-list">
        <button type="button" class="tool" data-view="front" aria-label="Look from the front">${icon('front')}</button>
        <button type="button" class="tool" data-view="side" aria-label="Look from the side">${icon('side')}</button>
        <button type="button" class="tool" data-view="top" aria-label="Look from the top">${icon('top')}</button>
        <button type="button" class="tool" data-view="hero" aria-label="Reset the view">${icon('reset')}</button>
        </div>
      </div>
    </div>
    <figcaption class="sc-cap">
      <span class="sc-cap-t no-read">${icon('cube')} Made for this book</span>
      <span class="sc-cap-tools no-read">
        <span class="sc-frames" id="sc-frames" hidden>
          <button type="button" class="sc-tool" id="sc-fprev" aria-label="Show the part before">${icon('prev')}</button>
          <span class="sc-fnum" id="sc-fnum" aria-live="polite"></span>
          <button type="button" class="sc-tool" id="sc-fnext" aria-label="Show the next part">${icon('next')}</button>
        </span>
        <button type="button" class="sc-tool sc-turn" id="sc-turn" hidden>${icon('play')}<span>Turn</span></button>
      </span>
    </figcaption>
  </figure>`;
}

// The scene is mounted after the page is on screen, so the words never wait for the 3D engine.
// A scene can be a figure or (while figures are being made) a build from the catalogue.
async function showScene(main, f) {
  const el = $('#sc-stage', main);
  try {
    const cat = await catalog().catch(() => ({ builds: [] }));
    const isBuild = (cat.builds || []).some(b => b.slug === f.scene);
    // warm both caches first, then check we are still on this page before taking the one 3D canvas
    await Promise.all([isBuild ? buildData(f.scene) : figureData(f.scene), getStage()]);
    if (!el.isConnected) return null;
    const fig = await mountFigure(el, f.scene, { build: isBuild, frame: 99, alt: nice(f.scene_alt || f.scene_idea || '') });
    wireScene(main, fig);
    return fig;
  } catch (e) {
    // the figure is missing or 3D failed: fall back to the number blocks
    console.warn('showcase scene', f.scene, e);
    const side = $('#sc-side', main), stats = f.stats || [];
    if (side && side.isConnected) {
      side.classList.add('is-art'); side.innerHTML = art(stats);
      // the tower now holds the numbers on wide screens, so the strip steps aside there
      // (it is not armed for the drop-in, so it simply appears)
      if (stats.length) $('.sc-story', main).classList.add('sc-towered');
    }
    return null;
  }
}

function wireScene(main, fig) {
  // with no 3D (a poster picture instead) there is nothing to turn, but frames still swap pictures
  if (fig.stage) {
    $('#sc-views', main).hidden = false; wireToolMenu($('#sc-views', main), fig.stage);
    $$('#sc-views [data-view]', main).forEach(b => b.addEventListener('click', () => fig.view(b.dataset.view)));
    const turn = $('#sc-turn', main);
    let spinning = false;
    // the words change (Turn / Stop), so it is a plain button, not a pressed toggle with a changing name
    const setTurn = on => {
      spinning = on; fig.spin(on);
      turn.classList.toggle('is-on', on);
      turn.innerHTML = on ? `${icon('pause')}<span>Stop</span>` : `${icon('play')}<span>Turn</span>`;
    };
    // Calm mode has no turntable; the view buttons still turn the scene one tap at a time
    turn.hidden = calm();
    turn.addEventListener('click', () => setTurn(!spinning));
  } else {
    // a still picture: no dragging and no view buttons to mention
    const st = $('#sc-stage', main);
    st.setAttribute('aria-label', st.getAttribute('aria-label').replace(/ Drag to spin it.*$/, ''));
  }
  if (fig.frames > 1) {
    const box = $('#sc-frames', main), num = $('#sc-fnum', main);
    let k = fig.frames;
    // aria-disabled, not disabled: a disabled button drops keyboard focus the moment you reach the end
    const show = () => { num.textContent = `Part ${k} of ${fig.frames}`; $('#sc-fprev', main).setAttribute('aria-disabled', String(k <= 1)); $('#sc-fnext', main).setAttribute('aria-disabled', String(k >= fig.frames)); };
    $('#sc-fprev', main).addEventListener('click', () => { k = Math.max(1, k - 1); fig.set(k); show(); });
    $('#sc-fnext', main).addEventListener('click', () => { k = Math.min(fig.frames, k + 1); fig.set(k); show(); });
    box.hidden = false; show();
  }
}
