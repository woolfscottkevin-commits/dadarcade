// Build Mode: the iPad stands next to the TV while you build in the game.
// Huge buttons, one layer at a time, the screen stays awake, and it remembers where you were.
import { esc, icon, plural, stacks, toast, track, calm, $, $$, hashUrl } from '../lib/ui.js';
import { catalog, buildData, registryMeta, iconSpan } from '../lib/data.js';
import { getStage, has3D, skyFor } from '../lib/stage3d.js';
import { drawPlan, planHit, planAssets, describe } from '../lib/plan.js';
import { parseBuild } from '../engine/voxels.js';
import { log } from '../lib/store.js';
import { settings } from '../lib/store.js';
import { clack, pop, tick, fanfare, unlockAudio } from '../lib/sound.js';
import { TIER_NAMES, groupName } from './build.js';

export async function render(main, [slug], ctx) {
  const stageP = has3D ? getStage() : null;   // start the 3D engine loading while the build data comes in
  const [cat, data, reg] = await Promise.all([catalog(), buildData(slug), registryMeta()]);
  const meta = cat.builds.find(b => b.slug === slug);
  if (!meta) { location.hash = '#/builds'; return; }
  const tier = Math.max(1, Math.min(data.ntiers, +(ctx.query.t || 1)));
  const cells = parseBuild(data), minY = data.bounds[1];
  const G = data.tiers[tier - 1].layers;
  const saved = log.where(slug);
  let step = saved && saved.tier === tier && saved.layer != null && saved.layer < G.length ? saved.layer : 0;
  let lock = null, idleTimer = 0, speakOn = !!settings.all().speakLayers, night = true;
  const done = () => log.layerDone(slug, tier);

  document.documentElement.classList.add('mode-on');
  main.innerHTML = `
  <div class="bm" id="bm">
    <header class="bm-top">
      <a class="bm-exit" href="#/build/${esc(slug)}?t=${tier}" aria-label="Leave Build Mode">${icon('close')}</a>
      <div class="bm-title"><b>${esc(meta.title)}</b><span>${data.ntiers > 1 ? TIER_NAMES[tier - 1] + ' · ' : ''}${plural(data.tiers[tier - 1].blocks, 'block')}</span></div>
      <div class="bm-tools">
        <button class="tool" id="bm-say" aria-pressed="${speakOn}" aria-label="Read each layer out loud">${icon('speaker')}</button>
        <button class="tool" id="bm-theme" aria-label="Switch light and dark">${icon('moon')}</button>
      </div>
    </header>
    <div class="bm-progress" aria-hidden="true"><i id="bm-bar"></i></div>
    <div class="bm-body">
      <section class="bm-stage" id="bm-stage" aria-label="3D view of this layer"><div class="stage-sky" id="bm-sky"></div>
        <img class="stage-poster" alt="" src="img/posters/${esc(slug)}.webp" ${has3D ? 'hidden' : ''}></section>
      <section class="bm-side">
        <div class="bm-step"><div class="bm-big" id="bm-big" aria-live="polite"></div><div class="bm-rep" id="bm-rep" hidden></div></div>
        <div class="bm-plan"><canvas id="bm-plan" role="img" aria-label="Layer plan"></canvas></div>
        <ul class="bm-need" id="bm-need" aria-label="Blocks for this layer"></ul>
        <div class="bm-tap" id="bm-tap" hidden></div>
      </section>
    </div>
    <footer class="bm-nav">
      <button class="bm-btn back" id="bm-back" aria-label="Previous layer">${icon('prev')}<span>Back</span></button>
      <button class="bm-btn next" id="bm-next"><span id="bm-next-label">Next layer</span>${icon('next')}</button>
    </footer>
    <div class="bm-start" id="bm-start">
      <div class="bm-start-card">
        <div class="kicker">Build Mode</div>
        <h1>${esc(meta.title)}</h1>
        <p>${G.length} steps. Stand your iPad next to the TV. The screen stays on while you build.</p>
        ${saved && saved.tier === tier && saved.layer > 0 ? `<p class="bm-resume">You were on <b>${esc(groupName(G[Math.min(step, G.length - 1)], minY))}</b>.</p>` : ''}
        <button class="btn big gold" id="bm-go" data-autofocus>${icon('play')} <span>${saved && saved.tier === tier && saved.layer > 0 ? 'Keep building' : 'Start building'}</span></button>
        ${saved && saved.tier === tier && saved.layer > 0 ? `<button class="btn ghost" id="bm-restart">Start again from the first step</button>` : ''}
        <p class="tiny">Tip: one person reads the plan out loud, the other places the blocks. Swap every few layers!</p>
      </div>
    </div>
  </div>`;

  const stageEl = $('#bm-stage', main), planCanvas = $('#bm-plan', main);
  await planAssets();
  let stage = null;
  if (has3D) {
    stage = await stageP;
    if (stage) {
      stage.mount(stageEl);
      await stage.show(data, { view: 'hero', groundBlock: meta.ground || undefined });
      stage.set('uTierA', tier); stage.set('uExplode', 0); stage.set('uHi', -1); stage.set('uOpen', 1);
      stage.set('uSel', new stage.U.uSel.value.constructor(0, 0, 0, 0));
      stage.setTime(0.39);
      if (meta.empty) stage.setMarkers(meta.empty.filter(m => (m[7] || 1) <= tier).map(([x, y, z, w, h, d, label]) => ({ x, y, z, w, h, d, label })));
      stage.on('tap', hit => showTap(hit));
    }
  }
  function applyTheme() {
    $('#bm', main).classList.toggle('light', !night);
    $('#bm-sky', main).style.background = night ? 'linear-gradient(180deg,#141a33,#232a4d)' : skyFor(0.4);
    $('#bm-theme', main).innerHTML = icon(night ? 'sun' : 'moon');
  }

  function stepText(g) {
    const items = (g.m || []).map(([n, c]) => `${c} ${n}`);
    const reps = g.y1 - g.y0 + 1;
    return `${groupName(g, minY)}. ${reps > 1 ? `Build this layer ${reps} times. ` : ''}You need ${items.slice(0, 4).join(', ')}${items.length > 4 ? ', and a few more' : ''}.`;
  }
  function say(text) {
    if (!speakOn || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = settings.all().rate || 0.95; speechSynthesis.speak(u); } catch (e) {}
  }
  function apply(animate = true) {
    const g = G[step], next = G[step + 1], reps = g.y1 - g.y0 + 1;
    $('#bm-big', main).innerHTML = `<span>${esc(groupName(g, minY))}</span><small>step ${step + 1} of ${G.length}</small>`;
    const rep = $('#bm-rep', main); rep.hidden = reps < 2; rep.textContent = `Build this layer ${reps} times`;
    $('#bm-bar', main).style.width = `${(step / G.length) * 100}%`;
    if (stage) {
      const target = g.y1 - minY + 1;
      if (animate && !calm()) stage.set('uReveal', target, 600, k => 1 - Math.pow(1 - k, 2)); else stage.set('uReveal', target);
      stage.set('uCur', new stage.U.uCur.value.constructor(g.y0, g.y1));
      stage.set('uGhostLayer', next ? next.y0 - minY : -1);
    }
    const { legend } = drawModePlan();
    const got = (done()[step] || {}), letter = new Map(legend.map(l => [l.item, l.letter]));
    // each block shows the same letter as on the plan, and stacks for big counts
    $('#bm-need', main).innerHTML = (g.m || []).map(([n, c]) => `<li class="${got[n] ? 'got' : ''}"><label><input type="checkbox" data-n="${esc(n)}" ${got[n] ? 'checked' : ''}>${letter.has(n) ? `<b class="lt" aria-hidden="true">${letter.get(n)}</b>` : ''}${iconSpan(reg.icons.items.indexOf(n))}<span class="nm">${esc(n)}</span><b class="ct">×${c}${reps > 1 ? ' each' : ''}${stacks(c) ? `<small>${stacks(c)}</small>` : ''}</b></label></li>`).join('');
    $('#bm-back', main).disabled = step === 0;
    const last = step === G.length - 1;
    $('#bm-next-label', main).textContent = last ? 'I built it!' : 'Next layer';
    $('#bm-next', main).classList.toggle('finish', last);
    $('#bm-tap', main).hidden = true;
    log.setWhere(slug, tier, step);
    history.replaceState(null, '', hashUrl(`#/mode/${slug}?t=${tier}`));
    say(stepText(g));
  }
  // the plan fills the side panel's height as well as its width, so the whole layer is on screen,
  // leaving room for the first row of the block list under it
  function drawModePlan() {
    const side = $('.bm-side', main), head = $('.bm-step', main);
    const maxH = side && head ? side.clientHeight - head.offsetHeight - 12 - 16 - 76 : 0;
    return drawPlan(planCanvas, { data, cells, reg, y: G[step].y0, tier, maxCell: 40, maxH: Math.max(200, maxH) });
  }
  // while the start or finished card is up, the rest of the screen is out of reach (keyboard too)
  function setModal(on) {
    for (const sel of ['.bm-top', '.bm-progress', '.bm-body', '.bm-nav']) { const el = $(sel, main); if (el) el.inert = on; }
  }
  function showTap(hit) {
    const box = $('#bm-tap', main);
    if (!hit) { box.hidden = true; if (stage) stage.set('uSel', new stage.U.uSel.value.constructor(0, 0, 0, 0)); return; }
    const pe = data.palette[hit.palette]; const d = describe(pe);
    box.innerHTML = `${iconSpan(pe.ic)}<div><b>${esc(hit.item)}</b><span>${esc(groupName({ y0: hit.y, y1: hit.y }, minY))}${d ? ' · ' + esc(d) : ''}</span></div>`;
    box.hidden = false; tick();
    if (stage) stage.set('uSel', new stage.U.uSel.value.constructor(hit.x, hit.y, hit.z, 1));
  }

  // ---------------------------------------------------------------- screen stays awake
  async function wake() {
    try { if ('wakeLock' in navigator) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { lock = null; }
    if (!('wakeLock' in navigator)) toast('Ask a grown-up to set Auto-Lock to Never while you build.', 4200);
    resetIdle();
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (lock) { lock.release().catch(() => {}); lock = null; toast('Screen can sleep now. Tap to keep building.', 4000); } }, 20 * 60 * 1000);
  }
  const onVis = () => { if (document.visibilityState === 'visible' && !lock && started) wake(); };
  document.addEventListener('visibilitychange', onVis);
  let started = false;

  function go(delta) {
    unlockAudio(); resetIdle(); if (!lock && started) wake();
    if (delta > 0 && step === G.length - 1) return finish();
    const nd = Math.max(0, Math.min(G.length - 1, step + delta));
    if (nd === step) return;
    if (delta > 0) { const d = done(); d[step] = d[step] || {}; d[step]._ = 1; log.setLayerDone(slug, tier, d); clack(1.1); } else pop();
    step = nd; apply();
  }
  function finish() {
    log.markDone(slug, tier); track('lbl2_build_done', { build: slug, tier, from: 'mode' });
    fanfare();
    if (stage) { stage.set('uCur', new stage.U.uCur.value.constructor(1, 0)); stage.set('uGhostLayer', -1); stage.set('uOpen', 0, 800); stage.set('uReveal', 999); stage.autoSpin(!calm()); }
    const c = document.createElement('div'); c.className = 'bm-done';
    c.innerHTML = `<div class="confetti" aria-hidden="true">${Array.from({ length: calm() ? 0 : 36 }, (_, i) => `<i style="--x:${(i * 37) % 100};--d:${(i % 7) * .12}s;--h:${(i * 53) % 360}"></i>`).join('')}</div>
      <div class="bm-start-card"><div class="kicker">Finished!</div><h1>You built the ${esc(meta.title)}!</h1>
      <p>That's ${plural(data.tiers[tier - 1].blocks, 'block')}, placed one layer at a time. It's in your Builder Log now.</p>
      <p><b>Try this:</b> stand back, take a picture in the game, and show someone what you made.</p>
      ${tier < data.ntiers ? `<a class="btn gold big" href="#/mode/${esc(slug)}?t=${tier + 1}">Level it up to ${TIER_NAMES[tier]}</a>` : ''}
      <a class="btn ghost" href="#/log">See my Builder Log</a> <a class="btn ghost" href="#/builds">Pick another build</a></div>`;
    $('#bm', main).appendChild(c);
    setModal(true); const f = c.querySelector('a,button'); if (f) f.focus();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  const onKey = e => {
    if (e.target.closest('input,textarea')) return;
    if (e.key === 'Escape') { location.hash = `#/build/${slug}?t=${tier}`; return; }
    if (main.querySelector('#bm-start, .bm-done')) return;   // the card's own buttons take Tab, Enter and Space
    if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('button,a,label')) return;   // a focused button does its own job
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
  };
  // debounce so a double tap never skips two layers
  let lastTap = 0;
  const guard = fn => () => { const n = performance.now(); if (n - lastTap < 300) return; lastTap = n; fn(); };
  $('#bm-next', main).addEventListener('click', guard(() => go(1)));
  $('#bm-back', main).addEventListener('click', guard(() => go(-1)));
  $('#bm-say', main).addEventListener('click', e => { speakOn = !speakOn; settings.set('speakLayers', speakOn); e.currentTarget.setAttribute('aria-pressed', String(speakOn)); if (speakOn) say(stepText(G[step])); else try { speechSynthesis.cancel(); } catch (x) {} });
  $('#bm-theme', main).addEventListener('click', () => { night = !night; applyTheme(); });
  $('#bm-need', main).addEventListener('change', e => {
    const n = e.target.dataset.n; if (!n) return;
    const d = done(); d[step] = d[step] || {}; d[step][n] = e.target.checked; log.setLayerDone(slug, tier, d);
    e.target.closest('li').classList.toggle('got', e.target.checked); tick(); resetIdle();
  });
  planCanvas.addEventListener('click', ev => {
    const c = planHit(planCanvas, ev); if (!c) return;
    showTap({ x: c.x, y: G[step].y0, z: c.z, item: c.pe.i, palette: c.e.p });
  });
  $('#bm-go', main).addEventListener('click', async e => {
    const byKey = e.detail === 0;
    started = true; unlockAudio(); await wake();
    try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement && matchMedia('(pointer:coarse)').matches) await el.requestFullscreen(); } catch (x) {}
    $('#bm-start', main).remove(); setModal(false); apply(); track('lbl2_mode', { build: slug, tier });
    // keyboard users land on Next layer; a tap leaves no focus ring behind
    if (byKey) $('#bm-next', main).focus({ preventScroll: true }); else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  });
  const rs = $('#bm-restart', main);
  if (rs) rs.addEventListener('click', () => { step = 0; log.setLayerDone(slug, tier, {}); $('#bm-go', main).click(); });
  addEventListener('keydown', onKey);
  const onResize = () => drawModePlan();
  addEventListener('resize', onResize);
  applyTheme(); setModal(true); apply(false);
  $('#bm-go', main).focus({ preventScroll: true });

  return () => {
    removeEventListener('keydown', onKey); removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    clearTimeout(idleTimer);
    if (lock) lock.release().catch(() => {});
    try { speechSynthesis.cancel(); } catch (e) {}
    if (stage) stage.autoSpin(false);
    document.documentElement.classList.remove('mode-on');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
}
