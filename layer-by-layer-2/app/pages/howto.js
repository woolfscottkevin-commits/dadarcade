// How to Use This Book: the steps, how to read a layer plan, the plan symbols, the 3D player,
// Build Mode and the three sizes. Words come from book.json "howto". Every plan picture here is
// plain HTML and CSS using the same block pictures as the real plans (data/tiles.png), so a kid
// can match what they see here to what they see on a build page.
import { esc, icon, tip, sourcesLine } from '../lib/ui.js';
import { content, registryMeta, iconSpan } from '../lib/data.js';

let REG = null, COLS = 16;

// CSS variables that pick one block's picture out of the tile sheet (top face by default)
function tex(id, face = 0) {
  const b = REG && REG.blocks && REG.blocks[id];
  if (!b) return '';
  const t = b.t[face] ?? b.t[0];
  return `--tx:${t % COLS};--ty:${Math.floor(t / COLS)};--tc:${esc(b.c)}`;
}
const texSpan = (id, face, cls = '') => `<span class="ht-tex ${cls}" style="${tex(id, face)}"></span>`;
const badge = L => `<b class="ht-badge">${esc(L)}</b>`;
// the "uphill" stair arrow, filled (normal stairs) or hollow (upside-down stairs), pointing north
const arrow = hollow => `<svg class="ht-arrow${hollow ? ' hollow' : ''}" viewBox="0 0 24 24"><path d="M12 3 20 18 12 14 4 18z"/></svg>`;

// One plan square for each symbol in book.json, drawn the way lib/plan.js really draws it: blocks
// show their texture (logs a line, glass a shine, stairs an arrow, hollow when upside down), and
// small things show their own item picture on a white square. Unknown shapes get a plain block.
const itemPic = name => iconSpan(REG && REG.icons ? REG.icons.items.indexOf(name) : -1);
const SYMBOL = {
  'full': () => cell(texSpan('oak_planks') + badge('A')),
  'log': () => cell(texSpan('oak_log', 1) + '<i class="ht-logline"></i>'),
  'glass': () => cell(texSpan('glass') + '<i class="ht-shine"></i>'),
  'slab-bottom': () => cell(texSpan('oak_planks') + '<i class="ht-fade top"></i>'),
  'slab-top': () => cell(texSpan('oak_planks') + '<i class="ht-fade bottom"></i>'),
  'stairs': () => cell(texSpan('oak_planks') + arrow(false)),
  'stairs-top': () => cell(texSpan('oak_planks') + arrow(true)),
  'fence': () => small(itemPic('Oak Fence')),
  'pane': () => small(itemPic('Glass Pane')),
  'door': () => small('<i class="ht-bar door"></i>' + itemPic('Oak Door')),
  'trapdoor': () => small('<i class="ht-bar trap"></i>' + itemPic('Oak Trapdoor')) + small(itemPic('Oak Trapdoor')),
  'lantern': () => small(itemPic('Lantern')) + small(itemPic('Lantern') + '<i class="ht-ring"></i>'),
  'flower': () => small(itemPic('Poppy')),
  'dust': () => small(itemPic('Redstone Dust')),
};
function cell(inner) { return `<span class="ht-cell">${inner}</span>`; }
function small(inner) { return `<span class="ht-cell ht-small">${inner}</span>`; }

// A tiny layer plan. Each string is a row seen from above, north at the top:
// "." empty, "-" the grey layer below, "A"/"B" a block with its letter, "a"/"b" without a letter.
const BLOCK = { a: 'oak_planks', b: 'stone_bricks' };
function miniPlan(rows, { nums = false, north = false, cls = '' } = {}) {
  const w = rows[0].length, h = rows.length;
  const cells = rows.join('').split('').map(ch => {
    if (ch === '.') return '<span></span>';
    if (ch === '-') return '<span class="ht-below"></span>';
    const id = BLOCK[ch.toLowerCase()] || BLOCK.a;
    return `<span class="ht-tex" style="${tex(id)}">${ch !== ch.toLowerCase() ? badge(ch) : ''}</span>`;
  }).join('');
  const n = k => Array.from({ length: k }, (_, i) => `<span>${i + 1}</span>`).join('');
  return `<div class="ht-mini ${cls}${nums ? ' has-nums' : ''}" style="--w:${w};--h:${h}" aria-hidden="true">
    ${north ? `<span class="ht-north"><svg viewBox="0 0 24 24"><path d="M12 2 19 13h-4.5v9h-5v-9H5z"/></svg>N</span>` : ''}
    ${nums ? `<div class="ht-nx">${n(w)}</div><div class="ht-nz">${n(h)}</div>` : ''}
    <div class="ht-grid">${cells}</div>
  </div>`;
}

// A side view: which layer sits where, with Layer 1 on the grass and the Ground layer dug in.
function sideView() {
  const row = (label, ids) => `<div class="ht-srow"><span class="ht-scells">${ids.map(id => id ? texSpan(id.split(':')[0], +(id.split(':')[1] || 0)) : '<span></span>').join('')}</span><span class="ht-slabel">${esc(label)}</span></div>`;
  const P = 'oak_planks:0', S = 'stone_bricks:0', G = 'grass_block:1', D = 'dirt:0';
  return `<div class="ht-side" aria-hidden="true">
    ${row('Layer 2', ['', P, P, P, ''])}
    ${row('Layer 1', ['', P, P, P, ''])}
    ${row('Ground layer', [G, S, S, S, G])}
    ${row('', [D, D, D, D, D])}
  </div>`;
}

// The legend: a letter, the block's picture, its name and how many.
function legendDemo() {
  const ic = name => REG && REG.icons ? REG.icons.items.indexOf(name) : -1;
  const row = (L, name, n) => `<li>${badge(L)}${iconSpan(ic(name))}<span>${esc(name)}</span><em>×${n}</em></li>`;
  return `<div class="ht-letters" aria-hidden="true">${miniPlan(['AAB', 'A.B', 'AAB'])}
    <ul class="ht-legend">${row('A', 'Oak Planks', 5)}${row('B', 'Stone Bricks', 3)}</ul></div>`;
}

function repeatDemo() {
  const layer = texSpan('oak_planks').repeat(4);
  return `<div class="ht-repeat" aria-hidden="true"><span class="ht-rep">build ×3</span>
    <div class="ht-stack">${`<span class="ht-srow-mini">${layer}</span>`.repeat(3)}</div></div>`;
}

// which picture goes with each "how to read a plan" item, matched by words in its title
function planPicture(title) {
  const t = title.toLowerCase();
  if (/north/.test(t)) return miniPlan(['aaaa', 'a..a', 'aaaa'], { north: true });
  if (/count/.test(t)) return miniPlan(['aaaaaaa', 'a.....a', 'aaaaaaa'], { nums: true, cls: 'wide' });
  if (/shadow|below/.test(t)) return miniPlan(['aaa--', 'a...-', 'a...-', '-----']);
  if (/letter/.test(t)) return legendDemo();
  if (/repeat|badge/.test(t)) return repeatDemo();
  if (/grass|ground/.test(t)) return sideView();
  return miniPlan(['AAA', 'A.A', 'AAA']);
}

// a picture for each 3D player and Build Mode tip, matched by words in its title
const FEATURE_ICONS = [
  [/spin|turn/, 'reset'], [/zoom|pinch/, 'zoom'], [/tap zone/, 'next'], [/watch/, 'play'], [/slider|layer at a time/, 'layers'],
  [/ghost|glow/, 'cube'], [/front|side|view/, 'front'], [/screen|awake/, 'sun'], [/remember/, 'log'],
  [/stack|count/, 'builds'], [/night|sunset|day\b/, 'sun'], [/hear|speaker|out loud/, 'speaker'], [/pull|apart/, 'explode'],
  [/picture|photo|camera/, 'camera'], [/walk/, 'walk'], [/table|\bar\b/, 'ar'], [/tap/, 'cube'], [/key|pedal/, 'next'],
];
const ZOOM = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
// tip() puts a full stop after the title, so "What does tap mean?" would read "mean?." on screen
const tipOf = ([kind, title, text]) => tip(kind, title, text).replace(/([?!])\.<\/b>/, '$1</b>');

function featureIcon(title) {
  const t = title.toLowerCase(), hit = FEATURE_ICONS.find(([re]) => re.test(t)), name = hit ? hit[1] : 'cube';
  return name === 'zoom' ? ZOOM : icon(name);
}

export async function render(main, params, ctx) {
  const book = ctx.book || await content('book').catch(() => ({}));
  REG = await registryMeta().catch(() => null);
  COLS = (REG && REG.tiles && REG.tiles.cols) || 16;
  const h = book.howto || { title: 'How to Use This Book' };
  const feats = list => `<div class="ht-feats">${list.map(f => `<div class="ht-feat">${featureIcon(f.title)}<div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div></div>`).join('')}</div>`;

  main.innerHTML = `
  <div class="ht" data-readable style="--c:var(--c-builds);--cols:${COLS}">
    <section class="band"><div class="wrap">
      <div class="kicker">Start here</div>
      <h1>${esc(h.title || 'How to Use This Book')}</h1>
      ${h.lead ? `<p>${esc(h.lead)}</p>` : ''}
    </div></section>
    <div class="wrap">
      ${(h.steps || []).length ? `<section class="section" aria-labelledby="ht-steps-h">
        <h2 id="ht-steps-h">From first tap to finished build</h2>
        <ol class="steps ht-steps">${h.steps.map(s => `<li><b>${esc(s.title)}.</b> ${esc(s.text)}</li>`).join('')}</ol>
      </section>` : ''}

      ${(h.plans || []).length ? `<section class="section" aria-labelledby="ht-plans-h">
        <h2 id="ht-plans-h">${esc(h.plans_title || 'How to read a layer plan')}</h2>
        <div class="ht-plans">${h.plans.map(p => `<div class="card ht-plan">
          <div class="ht-pic">${planPicture(p.title)}</div>
          <div class="ht-words"><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
        </div>`).join('')}</div>
      </section>` : ''}

      ${(h.symbols || []).length ? `<section class="section" aria-labelledby="ht-sym-h">
        <h2 id="ht-sym-h">${esc(h.symbols_title || 'Plan symbols')}</h2>
        <p class="muted">Every square also has a letter, so you never need colors to read a plan.</p>
        <div class="ht-syms">${h.symbols.map(s => `<div class="ht-sym">
          <div class="ht-sym-pic" aria-hidden="true">${(SYMBOL[s.shape] || SYMBOL.full)()}</div>
          <div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>
        </div>`).join('')}</div>
      </section>` : ''}

      ${(h.player || []).length ? `<section class="section" aria-labelledby="ht-player-h">
        <h2 id="ht-player-h">${esc(h.player_title || 'The 3D build player')}</h2>
        ${feats(h.player)}
      </section>` : ''}

      ${(h.buildmode || []).length ? `<section class="section" aria-labelledby="ht-bm-h">
        <h2 id="ht-bm-h">${esc(h.buildmode_title || 'Build Mode')}</h2>
        ${h.buildmode_lead ? `<p class="ht-lead">${esc(h.buildmode_lead)}</p>` : ''}
        ${feats(h.buildmode)}
      </section>` : ''}

      ${(h.tiers || []).length ? `<section class="section" aria-labelledby="ht-tiers-h">
        <h2 id="ht-tiers-h">${esc(h.tiers_title || 'Starter, Pro or Legend?')}</h2>
        ${h.tiers_lead ? `<p class="ht-lead">${esc(h.tiers_lead)}</p>` : ''}
        <div class="ht-tiers">${h.tiers.map((t, i) => `<div class="card ht-tier t${+t.tier || i + 1}">
          <div class="ht-tier-pic" aria-hidden="true">${texSpan('oak_planks').repeat(+t.tier || i + 1)}</div>
          <div><h3>${esc(t.name)}</h3><p>${esc(t.text)}</p></div>
        </div>`).join('')}</div>
      </section>` : ''}

      ${(h.tips || []).length ? `<section class="section ht-tips">${h.tips.map(tipOf).join('')}${sourcesLine(h.sources)}</section>` : ''}

      <section class="section ht-go no-read">
        <a class="btn big gold" href="#/builds">${icon('builds')} Pick a build</a>
        <a class="btn big ghost" href="#/grownups">For Grown-ups</a>
      </section>
    </div>
  </div>`;
  ctx.setReadable(true);
}
