// A figure is a small 3D scene with frames (lesson steps, redstone states, showcase dioramas).
// Frames are stored like build tiers, so moving between frames animates only the blocks that change.
//
//   const fig = await mountFigure(el, 'roof-shapes', { time: 0.4, style: 'drop' });
//   fig.frames            -> number of frames
//   fig.set(k)            -> show frame k (1-based), animated
//   fig.view('front')     -> camera preset: hero | front | side | top | back | low
//   fig.spin(true)        -> slow turntable (ignored in Calm mode)
//   fig.destroy()         -> release (pages also release automatically on navigation)
// If 3D is not available it shows the figure's poster picture and set() swaps pictures.
import { getStage, has3D, skyFor } from './stage3d.js';
import { figureData, buildData } from './data.js';
import { calm, esc } from './ui.js';

export async function mountFigure(el, id, opts = {}) {
  const data = await (opts.build ? buildData(id) : figureData(id));
  // the figure's own settings (from its META in tools/lbl/figures2) fill in anything the page didn't set
  const fm = data.meta || {};
  opts = { ...opts, time: opts.time ?? fm.time, view: opts.view || fm.view,
    ground: opts.ground ?? (fm.ground !== null), groundBlock: opts.groundBlock || fm.ground || undefined };
  el.classList.add('fig-stage');
  el.innerHTML = `<div class="stage-sky"></div>`;
  const sky = el.querySelector('.stage-sky');
  sky.style.background = opts.sky || skyFor(opts.time ?? 0.4);
  const frames = data.ntiers;
  let cur = Math.min(frames, opts.frame || 1);
  const stage = has3D ? await getStage() : null;
  if (!stage) {
    const dir = opts.build ? 'posters' : 'figures';
    const img = document.createElement('img'); img.className = 'stage-poster'; img.alt = opts.alt || '';
    const src = k => `img/${dir}/${esc(id)}${k === frames ? '' : '-t' + k}.webp`;
    img.src = src(cur); img.onerror = () => { img.onerror = null; img.src = `img/${dir}/${esc(id)}.webp`; };
    el.appendChild(img);
    return { frames, data, stage: null, set(k) { cur = k; img.src = src(k); }, view() {}, spin() {}, destroy() {} };
  }
  stage.mount(el);
  // 'snap' (redstone): changed blocks pop in place instead of dropping from above
  await stage.show(data, { view: opts.view || 'hero', ground: opts.ground !== false, groundMargin: opts.groundMargin ?? 1, groundDepth: opts.groundDepth ?? 2,
    groundBlock: opts.groundBlock, drop: opts.style === 'snap' ? 0 : 6 });
  if (opts.open) stage.set('uOpen', 1);
  stage.setTime(opts.time ?? 0.4);
  stage.set('uTierA', cur);
  if (opts.assemble && !calm()) { stage.set('uReveal', 0); stage.set('uReveal', (data.bounds[4] - data.bounds[1]) + 2, 2600); }
  const api = {
    frames, data, stage,
    set(k, ms) {
      k = Math.max(1, Math.min(frames, k)); if (k === cur) return;
      const d = ms ?? (opts.style === 'snap' ? 260 : 900);
      stage.set('uTierA', k, calm() ? 0 : d, t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      cur = k;
    },
    get frame() { return cur; },
    view(v) { stage.frame(v, !calm()); },
    spin(on) { stage.autoSpin(on && !calm()); },
    time(t) { stage.setTime(t); sky.style.background = skyFor(t); },
    destroy() { stage.autoSpin(false); },
  };
  return api;
}
