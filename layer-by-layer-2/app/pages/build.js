// A build's page: the living 3D build, its layer plans and its block list.
import { esc, icon, tip, pips, plural, stacks, toast, track, sourcesLine, calm, $, $$ } from '../lib/ui.js';
import { catalog, buildData, registryMeta, iconSpan } from '../lib/data.js';
import { getStage, has3D, skyFor } from '../lib/stage3d.js';
import { drawPlan, planHit, planAssets, describe, legendFor, layerCells, tierBounds } from '../lib/plan.js';
import { parseBuild } from '../engine/voxels.js';
import { log, store } from '../lib/store.js';
import { clack, pop, tick } from '../lib/sound.js';
import { startWalk } from '../lib/walk.js';

export const TIER_NAMES = ['Starter', 'Pro', 'Legend'];
export const TIME_PRESETS = [{ t: 0.39, label: 'Day', icon: 'sun' }, { t: 0.715, label: 'Sunset', icon: 'sun' }, { t: 0.93, label: 'Night', icon: 'moon' }];
// AR Quick Look (Safari on iPad and iPhone) puts ar/<slug>.usdz on a real table. Other browsers throw here.
const canAR = (() => { try { return document.createElement('a').relList.supports('ar'); } catch (e) { return false; } })();
// Safari opens AR Quick Look only when the <a rel="ar"> has one child and it is an <img>. So the icon is
// that image: an empty picture filled with the button's text colour through an icon-shaped mask.
const arImg = () => {
  const svg = icon('ar').replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const mask = `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}') center/contain no-repeat`;
  return `<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" width="22" height="22" style="background:currentColor;-webkit-mask:${mask};mask:${mask}">`;
};

// On a phone a stage's tool buttons fold away behind one button (build.css: .has-menu), so they don't
// cover the build. Markup: <div class="stage-tools top-right has-menu">${toolMenuButton(id, label)}
// <div class="tool-list" id="${id}">…the buttons…</div></div>. On an iPad the list shows as before.
const DOTS = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.4" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="19" cy="12" r="2.4" fill="currentColor"/></svg>';
export const toolMenuButton = (listId, label) =>
  `<button type="button" class="tool tools-more" aria-expanded="false" aria-controls="${listId}" aria-label="${esc(label)}" data-label="${esc(label)}">${DOTS}</button>`;
// Opens and closes the menu. Dragging or tapping the 3D closes it, and so does any button in `closers`.
export function wireToolMenu(box, stage, closers = []) {
  const btn = box && box.querySelector('.tools-more');
  if (!btn) return () => {};
  const set = open => {
    box.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = open ? icon('close') : DOTS;
    btn.setAttribute('aria-label', open ? 'Hide these buttons' : btn.dataset.label);
  };
  btn.addEventListener('click', () => set(!box.classList.contains('open')));
  box.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) { set(false); btn.focus(); } });
  closers.forEach(b => b && b.addEventListener('click', () => set(false)));
  if (stage) { stage.on('interact', () => set(false)); stage.on('tap', () => set(false)); }
  return set;
}

// Layer 1 sits on the grass (y = 0), as How to Use says. The grass layer itself is the Ground layer
// (y = -1), and a few builds dig deeper than that. (minY is no longer needed; callers still pass it.)
export const layerName = y => y >= 0 ? `Layer ${y + 1}` : y === -1 ? 'Ground layer' : `Dig layer: ${-y} blocks down`;
export function groupName(g, minY) {
  if (g.y0 === g.y1) return layerName(g.y0);
  return g.y0 >= 0 ? `Layers ${g.y0 + 1} to ${g.y1 + 1}` : `${layerName(g.y0)} to ${layerName(g.y1)}`;
}

export async function render(main, [slug], ctx) {
  const stageP = has3D ? getStage() : null;   // start the 3D engine loading while the build data comes in
  const [cat, data, reg] = await Promise.all([catalog(), buildData(slug), registryMeta()]);
  const list = cat.builds, idx = list.findIndex(b => b.slug === slug), meta = list[idx];
  if (!meta) { main.innerHTML = `<div class="wrap section"><h1>Build not found</h1><p><a class="btn" href="#/builds">See all builds</a></p></div>`; return; }
  const cells = parseBuild(data);
  const minY = data.bounds[1];
  const where = log.where(slug);
  // open at Starter ("start small and level up later") unless the link, or this kid, picked a size
  let tier = Math.max(1, Math.min(data.ntiers, +(ctx.query.t || log.pickedTier(slug) || (where && where.tier) || 1) || 1));
  let step = null;            // null = finished view; else index of the layer group
  let timeIdx = 0, exploded = false, hiItem = null, selCell = null, playing = false, playTimer = 0;
  const color = meta.kind === 'mini' ? 'var(--c-minis)' : 'var(--c-builds)';
  document.documentElement.style.setProperty('--c', color);
  track('lbl2_build_open', { build: slug });

  const groups = () => data.tiers[tier - 1].layers;
  const tierStats = t => meta.tiers_stats[t - 1];
  const done = log.done()[slug];
  const number = meta.kind === 'big' ? list.filter(b => b.kind === 'big').findIndex(b => b.slug === slug) + 1 : null;

  main.innerHTML = `
  <section class="band build-band"><div class="wrap">
    <div class="kicker">${meta.kind === 'mini' ? 'Mini build' : `Build ${number}`} · ${esc(meta.mode || 'Creative')}${meta.needs ? ` · needs Bedrock ${esc(meta.needs)}+` : ''}</div>
    <h1 style="view-transition-name:title-${esc(slug)}">${esc(meta.title)}</h1>
    <p>${esc(meta.pitch || '')}</p>
    <div class="stat-row" id="stats"></div>
  </div></section>
  <div class="wrap build-wrap" data-readable>
    ${data.ntiers > 1 ? `<div class="tier-pick" role="radiogroup" aria-label="Build size">
      ${Array.from({ length: data.ntiers }, (_, i) => `<button type="button" role="radio" data-t="${i + 1}" class="tier t${i + 1}" tabindex="-1">
        <b>${TIER_NAMES[i]}</b><span>${plural(tierStats(i + 1).blocks, 'block')} · about ${tierStats(i + 1).minutes} min</span></button>`).join('')}
    </div>` : ''}
    <div class="player">
      <section class="stage-box" id="stage-box" aria-label="3D build. Drag to spin, pinch to zoom, tap a block to see its name.">
        <div class="stage-sky" id="sky"></div>
        <img class="stage-poster" id="poster" alt="${esc(meta.title)}" src="img/posters/${esc(slug)}.webp" ${has3D ? 'hidden' : ''}>
        <div class="stage-tools top-left"><div class="tapinfo" id="tapinfo" hidden></div></div>
        <div class="stage-tools top-right has-menu" id="stage-tools">
          ${toolMenuButton('tool-list', 'More buttons: views, night, photo, walk')}
          <div class="tool-list" id="tool-list">
          <button class="tool" data-view="front" aria-label="Look from the front">${icon('front')}</button>
          <button class="tool" data-view="side" aria-label="Look from the side">${icon('side')}</button>
          <button class="tool" data-view="top" aria-label="Look from the top">${icon('top')}</button>
          <button class="tool" data-view="hero" aria-label="Reset the view">${icon('reset')}</button>
          <button class="tool" id="btn-time" aria-label="Change the time of day">${icon('sun')}</button>
          <button class="tool" id="btn-explode" aria-pressed="false" aria-label="Pull the layers apart">${icon('explode')}</button>
          <button class="tool" id="btn-photo" aria-label="Take a picture">${icon('camera')}</button>
          <button class="tool" id="btn-walk" aria-label="Walk inside the build">${icon('walk')}</button>
          ${canAR ? `<a class="tool" id="btn-ar" rel="ar" href="ar/${esc(slug)}.usdz" aria-label="See it on your table" hidden>${arImg()}</a>` : ''}
          </div>
        </div>
        <div class="stage-hint" id="hint">Drag to spin · Pinch to zoom · Tap a block</div>
      </section>
      <section class="plan-box card" aria-labelledby="plan-title">
        <div class="plan-head"><h2 id="plan-title">Layer plan</h2><span class="rep" id="rep" hidden></span></div>
        <div class="plan-canvas-wrap"><canvas id="plan" role="img" aria-label="Layer plan"></canvas></div>
        <ul class="legend" id="legend"></ul>
      </section>
      <div class="controls">
        <button class="btn big gold" id="btn-watch">${icon('play')} <span>Watch it build</span></button>
        <div class="stepper" role="group" aria-label="Layers">
          <button class="btn ghost step-btn" id="btn-prev" aria-label="Previous layer">${icon('prev')}</button>
          <div class="step-mid">
            <div class="step-label" id="step-label" aria-live="polite">Finished build</div>
            <input type="range" id="step" min="0" max="1" value="1" aria-label="Show the build up to this layer">
          </div>
          <button class="btn ghost step-btn" id="btn-next" aria-label="Next layer">${icon('next')}</button>
        </div>
        <a class="btn big" id="btn-mode" href="#/mode/${esc(slug)}?t=${tier}">${icon('mode')} <span>Build Mode</span></a>
      </div>
    </div>

    <div class="build-cols">
      <article class="about">
        <h2>About this build</h2>
        <p class="lead">${esc(meta.blurb || '')}</p>
        ${meta.tiers && data.ntiers > 1 ? `<ul class="tier-notes">${meta.tiers.map((t, i) => `<li><b class="tn t${i + 1}">${TIER_NAMES[i]}</b> ${esc(String(t).replace(/^\w+:\s*/, ''))}</li>`).join('')}</ul>` : ''}
        ${meta.teaches && meta.teaches.length ? `<p class="teaches"><b>You'll learn:</b> ${meta.teaches.map(t => `<span class="chip">${esc(t)}</span>`).join(' ')}</p>` : ''}
        ${(meta.tips || []).map(t => tip(t[0], t[1], t[2])).join('')}
        ${meta.challenge ? `<div class="make-it"><span class="t">MAKE IT YOURS</span> ${esc(meta.challenge.replace(/^Make it yours:\s*/i, ''))}</div>` : ''}
        ${meta.dad ? `<div class="dad"><span class="t">DAD'S CORNER</span> ${esc(meta.dad.replace(/^Dad's Corner:\s*/i, ''))}</div>` : ''}
        ${(meta.auto_new || []).length ? `<p class="newblocks"><span class="chip new">NEW BLOCKS</span> ${meta.auto_new.map(esc).join(', ')}. You need Bedrock ${esc(meta.needs || '26.50')} or newer.${/^1\./.test(meta.needs || '') ? ' Versions that start with 26 are newer.' : ''}</p>` : ''}
        ${sourcesLine(meta.sources)}
      </article>
      <aside class="mats card" aria-labelledby="mats-title">
        <div class="mats-head"><h2 id="mats-title">Block list</h2><span class="muted" id="mats-total"></span></div>
        <p class="tiny">Tick a block when you have it. Tap its name to light it up in 3D.</p>
        <ul class="mat-list" id="mats"></ul>
        <div class="mats-actions">
          <button class="btn small ghost" id="btn-print">${icon('print')} Print the plans</button>
          <button class="btn small ghost" id="btn-done">${icon('check')} <span>${done ? 'Built it!' : 'I built it!'}</span></button>
        </div>
      </aside>
    </div>
    <nav class="pager">${idx > 0 ? `<a class="btn ghost" href="#/build/${list[idx - 1].slug}">${icon('prev')} <span>${esc(list[idx - 1].title)}</span></a>` : '<span></span>'}
      ${idx < list.length - 1 ? `<a class="btn" href="#/build/${list[idx + 1].slug}"><span>${esc(list[idx + 1].title)}</span> ${icon('next')}</a>` : ''}</nav>
  </div>`;
  ctx.setReadable(true);

  const stageBox = $('#stage-box', main), planCanvas = $('#plan', main), stepInput = $('#step', main);
  const sky = $('#sky', main);
  await planAssets();
  let stage = null;
  if (has3D) {
    stage = await stageP;
    if (stage) {
      stage.mount(stageBox);
      await stage.show(data, { view: 'hero', groundBlock: meta.ground || undefined });
      if (meta.time) { const i = TIME_PRESETS.findIndex(p => Math.abs(p.t - meta.time) < .1); if (i >= 0) timeIdx = i; }
      stage.set('uTierA', tier); stage.set('uExplode', 0); stage.set('uHi', -1);
      stage.set('uSel', new stage.U.uSel.value.constructor(0, 0, 0, 0));
      applyTime();
      showMarkers();
      stage.on('tap', onTap);
      stage.on('interact', () => { const h = $('#hint', main); if (h) h.hidden = true; });
    } else $('#poster', main).hidden = false;
  }

  // ---------------------------------------------------------------- state -> view
  function statChips() {
    // this size's own footprint and height, not the Legend's
    const tb = tierBounds(data, cells, tier), s = tierStats(tier);
    const [w, d, h] = tb ? [tb[3] - tb[0] + 1, tb[5] - tb[2] + 1, tb[4] - tb[1] + 1] : meta.size;
    $('#stats', main).innerHTML = `<span class="chip">${w} × ${d} × ${h} blocks</span><span class="chip">${plural(s.blocks, 'block')}</span>
      <span class="chip">about ${s.minutes} min</span><span class="chip">${pips(meta.diff || 1)} ${['', 'Easy', 'Medium', 'Tricky'][meta.diff || 1]}</span>
      ${done ? `<span class="chip done">${icon('check')} You built it (${TIER_NAMES[(done.tier || 1) - 1]})</span>` : ''}`;
  }
  function setTierButtons() {
    // a radio group: one Tab stop (the picked size), arrow keys move between sizes
    $$('.tier', main).forEach(b => { const on = +b.dataset.t === tier; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    $('#btn-mode', main).href = `#/mode/${slug}?t=${tier}`;
  }
  function applyStep(animate = true) {
    const G = groups();
    stepInput.max = G.length; stepInput.value = step === null ? G.length : step;
    const label = $('#step-label', main);
    if (step === null) {
      label.innerHTML = `<b>Finished build</b> · ${G.length} steps`;
      if (stage) { stage.set('uReveal', 999, 0); stage.set('uCur', new stage.U.uCur.value.constructor(1, 0)); stage.set('uGhostLayer', -1); stage.set('uOpen', 0, 600); }
      drawPlanFor(G[0], true);
    } else {
      const g = G[step], next = G[step + 1];
      label.innerHTML = `<b>${esc(groupName(g, minY))}</b> · step ${step + 1} of ${G.length}`;
      if (stage) {
        const target = g.y1 - minY + 1;
        if (animate && !calm()) stage.set('uReveal', target, 520, k => 1 - Math.pow(1 - k, 2)); else stage.set('uReveal', target);
        stage.set('uCur', new stage.U.uCur.value.constructor(g.y0, g.y1));
        stage.set('uGhostLayer', next ? next.y0 - minY : -1);
        stage.set('uOpen', 1, 400);
      }
      drawPlanFor(g, false);
    }
  }
  function drawPlanFor(g, start) {
    const reps = g.y1 - g.y0 + 1;
    $('#plan-title', main).textContent = (start ? 'Start with: ' : '') + groupName(g, minY);
    const rep = $('#rep', main); rep.hidden = reps < 2; rep.textContent = `build ×${reps}`;
    const sel = selCell && selCell.y === g.y0 ? selCell : null;
    const { legend } = drawPlan(planCanvas, { data, cells, reg, y: g.y0, tier, sel, hiItem });
    $('#legend', main).innerHTML = legend.map(l => `<li><b class="lt">${l.letter}</b>${iconSpan(l.icon)}<span class="ln">${esc(l.item)}</span><span class="lc">×${l.n}${reps > 1 ? ' each' : ''}</span></li>`).join('');
  }
  function matList() {
    const t = data.tiers[tier - 1], got = log.got(slug, tier);
    const items = reg.icons.items, iconIdx = new Map(items.map((n, i) => [n, i]));
    $('#mats-total', main).textContent = plural(t.blocks, 'block');
    $('#mats', main).innerHTML = t.mats.map(([name, n]) => `<li class="mat ${got[name] ? 'got' : ''} ${hiItem === name ? 'hi' : ''}">
      <label class="mat-check"><input type="checkbox" data-n="${esc(name)}" ${got[name] ? 'checked' : ''} aria-label="I have the ${esc(name)}"></label>
      ${iconSpan(iconIdx.get(name))}<button type="button" class="mat-name" data-item="${esc(name)}">${esc(name)}</button>
      <span class="mat-n">×${n}${stacks(n) ? `<small>${stacks(n)}</small>` : ''}</span></li>`).join('');
  }
  function applyTime() {
    const p = TIME_PRESETS[timeIdx];
    sky.style.background = skyFor(p.t);
    stageBox.classList.toggle('night', p.t > 0.8);
    if (stage) stage.setTime(p.t);
    $('#btn-time', main).innerHTML = icon(p.icon);
    $('#btn-time', main).setAttribute('aria-label', `Time of day: ${p.label}. Tap to change.`);
  }
  // animal-space boxes: an optional 8th value says the first tier that has that space
  function showMarkers() {
    if (!stage || !meta.empty) return;
    stage.setMarkers(meta.empty.filter(m => (m[7] || 1) <= tier).map(([x, y, z, w, h, d, label]) => ({ x, y, z, w, h, d, label })));
  }
  function setTier(t) {
    if (t === tier) return;
    tier = t; log.pickTier(slug, t); track('lbl2_tier', { build: slug, tier: t });
    if (stage) stage.set('uTierA', tier, calm() ? 0 : 1300, k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    if (step !== null) step = Math.min(step, groups().length - 1);
    setTierButtons(); statChips(); matList(); applyStep(false); mcCard(); showMarkers(); pop();
  }
  function onTap(hit) {
    const info = $('#tapinfo', main);
    if (!hit) { info.hidden = true; selCell = null; if (stage) stage.set('uSel', new stage.U.uSel.value.constructor(0, 0, 0, 0)); return; }
    selCell = hit; tick();
    const pe = data.palette[hit.palette], d = describe(pe);
    const total = (data.tiers[tier - 1].mats.find(m => m[0] === hit.item) || [0, 0])[1];
    info.innerHTML = `${iconSpan(pe.ic)}<div><b>${esc(hit.item)}</b><span>${esc(groupName({ y0: hit.y, y1: hit.y }, minY))}${d ? ' · ' + esc(d) : ''}${total ? ` · ${total} in this build` : ''}</span></div>`;
    info.hidden = false;
    if (stage) stage.set('uSel', new stage.U.uSel.value.constructor(hit.x, hit.y, hit.z, 1));
    const G = groups(), gi = G.findIndex(g => hit.y >= g.y0 && hit.y <= g.y1);
    if (gi >= 0 && step !== null) drawPlanFor(G[step], false); else if (gi >= 0) drawPlanFor(G[gi], false);
  }

  // ---------------------------------------------------------------- watch it build
  function stopPlay() {
    playing = false; clearInterval(playTimer);
    $('#btn-watch', main).innerHTML = `${icon('play')} <span>Watch it build</span>`;
    $('#step-label', main).removeAttribute('aria-busy');
  }
  function play() {
    if (!stage) return;
    if (playing) { stopPlay(); step = null; applyStep(false); return; }
    track('lbl2_watch', { build: slug }); log.markWatched(slug);
    // this size's own height: a Starter build doesn't sit through the Legend's empty top layers
    const G = groups(), layers = G[G.length - 1].y1 - minY + 1;
    playing = true; step = null;
    $('#btn-watch', main).innerHTML = `${icon('pause')} <span>Stop</span>`;
    // a live region that changes 10 times a second is noise to a screen reader: hold it until the end
    const label = $('#step-label', main); label.setAttribute('aria-busy', 'true');
    let shown = '';
    stage.set('uCur', new stage.U.uCur.value.constructor(1, 0)); stage.set('uGhostLayer', -1);
    stage.set('uReveal', 0); stage.set('uOpen', 1);
    const ms = calm() ? 10 : Math.min(16000, Math.max(5000, layers * 520));
    stage.set('uReveal', layers + 1, ms);
    const t0 = performance.now();
    playTimer = setInterval(() => {
      const k = (performance.now() - t0) / ms, r = k * (layers + 1);
      let g = 0; G.forEach((x, i) => { if (x.y0 - minY <= r) g = i; });   // the last layer reached so far
      const html = k >= 1 ? '<b>Finished build</b>' : `<b>${esc(groupName(G[g], minY))}</b>`;
      if (html !== shown) { label.innerHTML = html; shown = html; }
      if (k < 1 && Math.random() < .7) clack(0.8 + Math.random() * .5);
      if (k >= 1) { stopPlay(); applyStep(false); }
    }, 90);
  }

  // ---------------------------------------------------------------- events
  $$('.tier', main).forEach(b => b.addEventListener('click', () => setTier(+b.dataset.t)));
  const pick = $('.tier-pick', main);
  if (pick) pick.addEventListener('keydown', e => {
    const n = data.ntiers, k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const t = k ? (tier - 1 + k + n) % n + 1 : e.key === 'Home' ? 1 : e.key === 'End' ? n : 0;
    if (!t) return;
    e.preventDefault(); setTier(t); const b = $(`.tier[data-t="${t}"]`, main); if (b) b.focus();
  });
  stepInput.addEventListener('input', () => { stopPlay(); const v = +stepInput.value; step = v >= groups().length ? null : v; applyStep(); tick(); });
  $('#btn-prev', main).addEventListener('click', () => { stopPlay(); const G = groups(); step = step === null ? G.length - 1 : Math.max(0, step - 1); applyStep(); tick(); });
  $('#btn-next', main).addEventListener('click', () => { stopPlay(); const G = groups(); step = step === null ? 0 : step + 1 >= G.length ? null : step + 1; applyStep(); tick(); });
  $('#btn-watch', main).addEventListener('click', play);
  // the phone tool menu: Photo, Walk and AR take over the screen, so they close it. Views, time and
  // pulling the layers apart keep it open, to try one after another.
  wireToolMenu($('#stage-tools', main), stage, $$('#btn-photo, #btn-walk, #btn-ar', main));
  const VIEW_WORDS = { front: 'Front view', side: 'Side view', top: 'Top view', hero: 'Back to the start' };
  $$('[data-view]', main).forEach(b => b.addEventListener('click', () => { if (stage) { stage.frame(b.dataset.view, !calm()); toast(VIEW_WORDS[b.dataset.view] || 'View'); } }));
  $('#btn-time', main).addEventListener('click', () => { timeIdx = (timeIdx + 1) % TIME_PRESETS.length; applyTime(); toast(TIME_PRESETS[timeIdx].label === 'Night' ? 'Night time. See which lights really light it up!' : TIME_PRESETS[timeIdx].label); });
  $('#btn-explode', main).addEventListener('click', e => {
    exploded = !exploded; e.currentTarget.setAttribute('aria-pressed', String(exploded));
    if (stage) stage.set('uExplode', exploded ? 0.9 : 0, calm() ? 0 : 700, k => 1 - Math.pow(1 - k, 3));
    toast(exploded ? 'Layers pulled apart' : 'Layers back together');
  });
  $('#btn-photo', main).addEventListener('click', async () => {
    if (!stage) return;
    const blob = await stage.snapshot();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const d = document.createElement('dialog'); d.className = 'photo-dialog';
    d.innerHTML = `<img src="${url}" alt="Your picture of the ${esc(meta.title)}"><div class="photo-actions"><a class="btn gold" href="${url}" download="${esc(slug)}.png">Save picture</a><button class="btn ghost" value="x">Close</button></div>`;
    document.body.appendChild(d); d.showModal(); pop();
    d.addEventListener('close', () => { URL.revokeObjectURL(url); d.remove(); });
    d.querySelector('button').addEventListener('click', () => d.close());
    track('lbl2_photo', { build: slug });
  });
  let walker = null;
  $('#btn-walk', main).addEventListener('click', () => {
    if (!stage) return;
    if (walker) { walker.stop(); return; }
    stopPlay(); step = null; applyStep(false); stage.set('uExplode', 0); exploded = false;
    stageBox.classList.add('walking'); track('lbl2_walk', { build: slug });
    // the joystick and Jump sit at the bottom of the view: bring all of it on screen
    stageBox.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
    walker = startWalk(stage, { onExit: () => { walker = null; stageBox.classList.remove('walking'); } });
  });
  const arLink = $('#btn-ar', main);
  if (arLink) {   // show it only once we know this build has an AR model
    fetch(arLink.getAttribute('href'), { method: 'HEAD' }).then(r => { arLink.hidden = !r.ok; }).catch(() => {});
    arLink.addEventListener('click', () => track('lbl2_ar_open', { build: slug }));
  }
  planCanvas.addEventListener('click', ev => {
    const c = planHit(planCanvas, ev); if (!c) return;
    const G = groups(), g = step === null ? G[0] : G[step];
    onTap({ x: c.x, y: g.y0, z: c.z, layer: g.y0 - minY, item: c.pe.i, block: c.pe.b, palette: c.e.p });
  });
  $('#mats', main).addEventListener('change', e => {
    const n = e.target.dataset.n; if (!n) return;
    const got = log.got(slug, tier); got[n] = e.target.checked; log.setGot(slug, tier, got);
    e.target.closest('.mat').classList.toggle('got', e.target.checked); tick();
  });
  $('#mats', main).addEventListener('click', e => {
    const b = e.target.closest('.mat-name'); if (!b) return;
    const item = b.dataset.item;
    hiItem = hiItem === item ? null : item;
    if (stage) {
      const i = stage.mesh.itemIdx.get(item);
      stage.set('uHi', hiItem && i != null ? i : -1);
      if (hiItem) stage.frame('hero', !calm());
    }
    matList(); applyStep(false);
    if (hiItem) { toast(`Showing every ${item}`); stageBox.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); }
  });
  $('#btn-done', main).addEventListener('click', e => {
    const d = log.done()[slug];
    if (d) { log.unmark(slug); e.currentTarget.querySelector('span').textContent = 'I built it!'; }
    else { log.markDone(slug, tier); e.currentTarget.querySelector('span').textContent = 'Built it!'; toast('Added to your Builder Log.'); track('lbl2_build_done', { build: slug, tier }); }
    statChips();
  });
  $('#btn-print', main).addEventListener('click', () => printPack({ meta, data, cells, reg, tier, minY }));
  const onResize = () => { if (step === null) drawPlanFor(groups()[0], true); else drawPlanFor(groups()[step], false); };
  addEventListener('resize', onResize);

  // ---------------------------------------------------------------- labs: get it in Minecraft (hidden beta)
  // #/build/<slug>?labs=1 turns labs on for this device (labs=0 turns it off). The pack and its index come from
  // tools/lbl/mcpack.py: dl/layer-by-layer-2.json has the /structure load command for every build and tier.
  if (ctx.query.labs != null) store.set('labs', ctx.query.labs === '1' ? 1 : 0);
  let mcPack = null, alive = true;
  if (ctx.query.labs === '1' || store.get('labs', 0)) {
    fetch('dl/layer-by-layer-2.json').then(r => r.ok ? r.json() : null).then(j => { mcPack = j; mcCard(); }).catch(() => {});
  }
  function mcCard() {
    const t = mcPack && mcPack.builds[slug] && mcPack.builds[slug].tiers[tier - 1];
    let box = $('#mc-card', main);
    if (!alive) return;
    if (!t) { if (box) box.remove(); return; }
    if (!box) {
      $('.mats', main).insertAdjacentHTML('beforeend', '<section id="mc-card" aria-labelledby="mc-title" style="margin-top:18px;padding-top:14px;border-top:2px dashed rgba(0,0,0,.15)"></section>');
      box = $('#mc-card', main);
    }
    const left = Object.entries(t.skipped || {});
    box.innerHTML = `<h3 id="mc-title" style="margin:0 0 4px">Get it in Minecraft <span class="chip">beta</span></h3>
      <p class="tiny">For Minecraft Bedrock ${esc(mcPack.game)} or newer on iPad, Windows or Android. Game consoles can't add packs.</p>
      <p><a class="btn small gold" id="mc-dl" href="${esc(mcPack.pack)}" download="layer-by-layer-2.mcpack">${icon('cube')} Download the pack</a></p>
      <ol class="steps">
        <li>Open the file you downloaded. Minecraft opens and adds the pack.</li>
        <li>Make a <b>new</b> world. Pick Creative and turn on Cheats. A Flat world works best. In Behavior Packs, turn on Layer by Layer 2 Builds.</li>
        <li>Stand on flat, open ground. Open the chat, type this and press Enter. The build pops up right next to you, one layer at a time!</li>
      </ol>
      <p class="no-read"><code id="mc-cmd" style="display:block;overflow-wrap:anywhere;font-size:17px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.06);user-select:all">${esc(t.cmd)}</code></p>
      <p><button type="button" class="btn small ghost" id="mc-copy">${icon('check')} Copy</button></p>
      ${left.length ? `<p class="tiny">Not in the pack: ${left.map(([n, k]) => `${esc(n)} ×${k}`).join(', ')}. Cushions are not blocks in the game, so put them in yourself.</p>` : ''}
      ${tip('warn', 'For grown-ups', 'Cheats and behavior packs turn off achievements for that world, for good. Use a new world just for building. This free pack is made by fans. It is not from Mojang or Microsoft.')}`;
    $('#mc-dl', box).addEventListener('click', () => track('lbl2_mc_pack', { build: slug, tier }));
    $('#mc-copy', box).addEventListener('click', () => {
      const ok = () => { toast('Copied! Paste it in the Minecraft chat.'); track('lbl2_mc_copy', { build: slug, tier }); };
      (navigator.clipboard ? navigator.clipboard.writeText(t.cmd) : Promise.reject()).then(ok).catch(() => {
        const r = document.createRange(); r.selectNodeContents($('#mc-cmd', box));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Now tap Copy on the menu.');
      });
    });
  }

  setTierButtons(); statChips(); matList();
  // ?step=1 is the first step, the same way the step label and the Secrets pages count
  const qStep = parseInt(ctx.query.step, 10);
  if (qStep >= 1) step = Math.min(qStep - 1, groups().length - 1);
  applyStep(false);
  // first visit only: let it build itself once (unless calm mode). After that, Watch it build is a tap away.
  if (stage && !calm() && !ctx.query.step && !log.watched(slug)) setTimeout(() => { if (document.body.contains(stageBox)) play(); }, 350);

  // Calm mode switched on part way through Watch it build: finish the build at once
  const calmWatch = new MutationObserver(() => { if (playing && calm()) { stopPlay(); step = null; applyStep(false); } });
  calmWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-calm'] });

  return () => { alive = false; stopPlay(); calmWatch.disconnect(); if (walker) walker.stop(); removeEventListener('resize', onResize); };
}

// ---------------------------------------------------------------- printing: the Plan Pack
export function printPack({ meta, data, cells, reg, tier, minY }) {
  const old = document.getElementById('print-pack'); if (old) old.remove();
  const pack = document.createElement('div'); pack.id = 'print-pack';
  const G = data.tiers[tier - 1].layers;
  pack.innerHTML = `<header class="pp-head"><h1>${esc(meta.title)}</h1><p>${data.ntiers > 1 ? TIER_NAMES[tier - 1] + ' size · ' : ''}${plural(data.tiers[tier - 1].blocks, 'block')} · ${G.length} steps · North is at the top of every plan.</p></header>`;
  for (const g of G) {
    const sec = document.createElement('section'); sec.className = 'pp-layer';
    const cv = document.createElement('canvas');
    const holder = document.createElement('div'); holder.style.width = '640px'; holder.appendChild(cv); document.body.appendChild(holder);
    const { legend } = drawPlan(cv, { data, cells, reg, y: g.y0, tier, dpr: 2, maxCell: 26, print: true });
    const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = groupName(g, minY);
    holder.remove();
    const reps = g.y1 - g.y0 + 1;
    sec.innerHTML = `<h2><span class="pp-box"></span>${esc(groupName(g, minY))}${reps > 1 ? ` <em>build ×${reps}</em>` : ''}</h2>`;
    sec.appendChild(img);
    const ul = document.createElement('ul'); ul.className = 'pp-legend';
    ul.innerHTML = legend.map(l => `<li><b>${l.letter}</b> ${esc(l.item)} ×${l.n}${reps > 1 ? ' each' : ''}</li>`).join('');
    sec.appendChild(ul);
    pack.appendChild(sec);
  }
  document.body.appendChild(pack);
  track('lbl2_print', { build: meta.slug, tier });
  setTimeout(() => { window.print(); setTimeout(() => pack.remove(), 1000); }, 250);
}
