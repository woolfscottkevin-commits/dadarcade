// Layer plans, drawn from the build data on a canvas.
// Every square shows the block's own texture AND a letter from the legend, so the plan works for
// colour-blind readers and in black-and-white print. Stairs get an "uphill" arrow (hollow when
// upside down), logs on their side a line, glass a shine line, doors and ladders a bar on their
// side, and small things (torches, flowers, fences) their item picture on a white square, with a
// dashed ring round a hanging lantern. North is always up. How to Use draws the same symbols.

let tilesImg = null, iconsImg = null;
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
export async function planAssets() {
  if (!tilesImg) [tilesImg, iconsImg] = await Promise.all([loadImg('data/tiles.png'), loadImg('data/icons.webp')]);
  return { tilesImg, iconsImg };
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (they look like 1 and 0)
// After the 24 single letters come AA, AB … AZ, BA …, so a crowded layer never shows "?".
// The plan squares, the key and Build Mode all take their letters from legendFor, so they always match.
export const letterFor = i => i < LETTERS.length ? LETTERS[i]
  : LETTERS[Math.floor((i - LETTERS.length) / LETTERS.length) % LETTERS.length] + LETTERS[(i - LETTERS.length) % LETTERS.length];

// cells of one layer (y), for a tier: [{x, z, pe, e}]
export function layerCells(data, cells, y, tier) {
  return cells.filter(e => e.y === y && e.t0 <= tier && tier < e.t1).map(e => ({ x: e.x, z: e.z, pe: data.palette[e.p], e }));
}

// legend for a layer: items sorted by count, each with a letter
export function legendFor(list) {
  const counts = new Map();
  for (const c of list) {
    const it = c.pe.i; if (!it || c.pe.env) continue;   // scenery (the sea) is not something to place
    if (c.pe.st && ((c.pe.st.s === 'door' && c.pe.st.h === 'upper') || (c.pe.st.s === 'bed' && c.pe.st.part === 'head'))) continue;
    counts.set(it, (counts.get(it) || { item: it, n: 0, icon: c.pe.ic })); counts.get(it).n++;
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).map((v, i) => ({ ...v, letter: letterFor(i) }));
}

// The part of the grid one size uses. Every layer of that size shares it, so the square numbers
// stay put from layer to layer, and a Starter plan isn't lost in a Legend-sized grid.
export function tierBounds(data, cells, tier) {
  const key = '_tb' + tier;
  if (data[key]) return data[key];
  let b = null;
  for (const e of cells) {
    if (!(e.t0 <= tier && tier < e.t1)) continue;
    if (!b) b = [e.x, e.y, e.z, e.x, e.y, e.z];
    else { b[0] = Math.min(b[0], e.x); b[1] = Math.min(b[1], e.y); b[2] = Math.min(b[2], e.z); b[3] = Math.max(b[3], e.x); b[4] = Math.max(b[4], e.y); b[5] = Math.max(b[5], e.z); }
  }
  Object.defineProperty(data, key, { value: b || data.bounds, configurable: true });
  return data[key];
}

const FULLISH = new Set(['full', 'slab', 'stairs', 'carpet', 'table', 'chest', 'bed', 'detector']);

export function drawPlan(canvas, opts) {
  // maxH fits the plan to a box's height too (Build Mode). Below minCell the plan scrolls in its box
  // instead of shrinking, so every square keeps a letter you can read and tap.
  const { data, cells, reg, y, tier, below = true, sel = null, hiItem = null, dpr = Math.min(2, window.devicePixelRatio || 1), maxCell = 34, minCell = 14, maxH = 0, print = false } = opts;
  const [x0, , z0, x1, , z1] = tierBounds(data, cells, tier);
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1;
  const wrapW = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
  const fitW = Math.floor((wrapW - 40) / (nx + 1.6)), fitH = maxH > 0 ? Math.floor((maxH - 8) / (nz + 1.25)) : Infinity;
  const cs = Math.max(minCell, Math.min(maxCell, fitW, fitH));
  const pad = Math.round(cs * 1.25);
  const W = pad + nx * cs + 6, H = pad + nz * cs + 6;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  g.fillStyle = print ? '#fff' : '#fbfaf5'; g.fillRect(pad, pad, nx * cs, nz * cs);
  const X = x => pad + (x - x0) * cs, Z = z => pad + (z - z0) * cs;
  // the layer below, as a grey shadow so you know where you are
  if (below) {
    g.fillStyle = 'rgba(120,130,145,.22)';
    for (const c of layerCells(data, cells, y - 1, tier)) if (FULLISH.has(c.pe.st.s || 'full')) g.fillRect(X(c.x), Z(c.z), cs, cs);
  }
  const list = layerCells(data, cells, y, tier);
  const legend = legendFor(list), letter = new Map(legend.map(l => [l.item, l.letter]));
  const tileOf = pe => {
    const m = reg.models[pe.m]; const b = m.b[0]; let ref = b[6];
    const blk = reg.blocks[pe.b];
    return ref >= 0 ? ref : blk.t[-ref - 1];
  };
  const drawTile = (t, x, y2, s) => {
    const cols = 16; g.drawImage(tilesImg, (t % cols) * 16, Math.floor(t / cols) * 16, 16, 16, x, y2, s, s);
  };
  const drawIcon = (ic, x, y2, s) => {
    if (ic == null || ic < 0) return;
    g.imageSmoothingEnabled = true;
    g.drawImage(iconsImg, (ic % 16) * 48, Math.floor(ic / 16) * 48, 48, 48, x, y2, s, s);
    g.imageSmoothingEnabled = false;
  };
  for (const c of list) {
    const st = c.pe.st || {}, s = st.s || 'full', px = X(c.x), pz = Z(c.z);
    if (c.pe.env) {   // scenery: a faint wash of its colour, no letter
      g.globalAlpha = .28; drawTile(tileOf(c.pe), px, pz, cs); g.globalAlpha = 1; continue;
    }
    const dim = hiItem && c.pe.i !== hiItem;
    if (FULLISH.has(s)) {
      drawTile(tileOf(c.pe), px, pz, cs);
      if (s === 'full' && /glass/.test(c.pe.b)) {   // see-through: a white shine line
        g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = Math.max(1.5, cs * .1);
        g.beginPath(); g.moveTo(px + cs * .22, pz + cs * .62); g.lineTo(px + cs * .62, pz + cs * .22); g.stroke(); g.restore();
      }
      if (st.a === 'x' || st.a === 'z') logLine(g, px, pz, cs, st.a);   // a log on its side: the line shows which way it lies
      if (s === 'slab') {      // a half block: stripes on the empty half
        g.fillStyle = 'rgba(255,255,255,.55)';
        if (st.h === 'top') g.fillRect(px, pz + cs / 2, cs, cs / 2); else g.fillRect(px, pz, cs, cs / 2);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.font = `900 ${Math.round(cs * .32)}px Nunito, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom';
        g.fillText(st.h === 'top' ? '▀' : '▄', px + cs - 2, pz + cs);
      }
      if (s === 'stairs' && st.f) arrow(g, px, pz, cs, st.f, st.h === 'top');
    } else {
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(px, pz, cs, cs);
      if (['door', 'trapdoor', 'ladder', 'panel', 'button', 'lever', 'torch'].includes(s) && st.side) sideBar(g, px, pz, cs, st.side, c.pe, reg, tileOf);
      drawIcon(c.pe.ic, px + cs * .12, pz + cs * .12, cs * .76);
      if (s === 'lantern' && st.hang) {   // a hanging lantern: a dashed ring
        g.save(); g.setLineDash([Math.max(2, cs * .1), Math.max(2, cs * .08)]); g.strokeStyle = '#6b4e10'; g.lineWidth = Math.max(1.2, cs * .06);
        g.beginPath(); g.arc(px + cs / 2, pz + cs / 2, cs * .44, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    }
    if (dim) { g.fillStyle = 'rgba(251,250,245,.78)'; g.fillRect(px, pz, cs, cs); }
    const L = letter.get(c.pe.i);
    if (L) {
      // a corner badge on roomy squares; on small squares the badge grows so the letter stays readable.
      // Two letters (AA, AB …) get a wider badge. If they still don't fit, they squeeze sideways
      // (fillText's maxWidth) and keep a single letter's height; they only get smaller past 70%.
      const b = cs >= 16 ? Math.max(9.5, cs * .38) : cs * .72;
      const bw = L.length > 1 ? Math.min(cs - 2, b * 1.6) : b;
      let f = Math.round(cs >= 16 ? b * .78 : b * .86), squeeze = 0;
      g.font = `900 ${f}px Nunito, sans-serif`;
      if (L.length > 1) {
        const tw = g.measureText(L).width, room = bw - 2;
        if (tw > room) {
          squeeze = room;
          if (room / tw < .7) { f = Math.max(6, Math.floor(f * room / (tw * .7))); g.font = `900 ${f}px Nunito, sans-serif`; }
        }
      }
      g.fillStyle = 'rgba(27,33,48,.82)'; g.beginPath(); g.roundRect ? g.roundRect(px + 1, pz + 1, bw, b, Math.min(3, b / 4)) : g.rect(px + 1, pz + 1, bw, b); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (squeeze) g.fillText(L, px + 1 + bw / 2, pz + 1 + b * .54, squeeze); else g.fillText(L, px + 1 + bw / 2, pz + 1 + b * .54);
    }
  }
  // grid: thin lines, thick every 5
  for (let i = 0; i <= nx; i++) line(g, X(x0 + i), pad, X(x0 + i), pad + nz * cs, i % 5 === 0 ? 1.4 : .6, i % 5 === 0 ? '#7d8796' : '#b9c0c8');
  for (let j = 0; j <= nz; j++) line(g, pad, Z(z0 + j), pad + nx * cs, Z(z0 + j), j % 5 === 0 ? 1.4 : .6, j % 5 === 0 ? '#7d8796' : '#b9c0c8');
  // numbers on the edges
  g.fillStyle = '#5f6a7d'; g.font = `800 ${Math.max(9, Math.round(cs * .42))}px Nunito, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'bottom';
  for (let i = 0; i < nx; i++) if (nx <= 20 || (i + 1) % 2 === 1 || i + 1 === nx) g.fillText(String(i + 1), pad + (i + .5) * cs, pad - 3);
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let j = 0; j < nz; j++) if (nz <= 20 || (j + 1) % 2 === 1 || j + 1 === nz) g.fillText(String(j + 1), pad - 4, pad + (j + .5) * cs);
  // north arrow
  g.fillStyle = '#1b2130'; g.font = `900 ${Math.max(10, Math.round(cs * .45))}px Lilita One, Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', pad * .45, pad * .42);
  if (sel) {
    g.strokeStyle = '#f2c230'; g.lineWidth = 3; g.strokeRect(X(sel.x) + 1.5, Z(sel.z) + 1.5, cs - 3, cs - 3);
  }
  canvas._plan = { x0, z0, cs, pad, nx, nz, list };
  return { legend, count: list.filter(c => c.pe.i && !c.pe.env).length };
}

// which cell is under a pointer event
export function planHit(canvas, ev) {
  const p = canvas._plan; if (!p) return null;
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left - p.pad) / p.cs), z = Math.floor((ev.clientY - r.top - p.pad) / p.cs);
  if (x < 0 || z < 0 || x >= p.nx || z >= p.nz) return null;
  return p.list.find(c => c.x === p.x0 + x && c.z === p.z0 + z) || null;
}

function line(g, a, b, c, d, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
function arrow(g, px, pz, cs, f, upside) {
  // points toward the tall back of the stair: "the arrow walks uphill"
  const cx = px + cs / 2, cz = pz + cs / 2, s = cs * .26;
  const dir = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[f];
  g.save(); g.translate(cx, cz); g.rotate(Math.atan2(dir[1], dir[0]) + Math.PI / 2);
  // upside-down stairs get a hollow arrow, so the two never depend on colour
  g.beginPath(); g.moveTo(0, -s * 1.25); g.lineTo(s, s * .55); g.lineTo(0, s * .1); g.lineTo(-s, s * .55); g.closePath();
  g.lineJoin = 'round';
  if (upside) {
    g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = Math.max(3, cs * .14); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.6, cs * .07); g.stroke();
  } else {
    g.fillStyle = 'rgba(255,255,255,.92)'; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; g.fill(); g.stroke();
  }
  g.restore();
}
function logLine(g, px, pz, cs, a) {
  const t = Math.max(2.5, cs * .13), m = cs * .14;
  g.fillStyle = 'rgba(255,255,255,.6)';
  if (a === 'x') g.fillRect(px + m - 1, pz + cs / 2 - t / 2 - 1, cs - 2 * m + 2, t + 2); else g.fillRect(px + cs / 2 - t / 2 - 1, pz + m - 1, t + 2, cs - 2 * m + 2);
  g.fillStyle = 'rgba(27,33,48,.85)';
  if (a === 'x') g.fillRect(px + m, pz + cs / 2 - t / 2, cs - 2 * m, t); else g.fillRect(px + cs / 2 - t / 2, pz + m, t, cs - 2 * m);
}
function sideBar(g, px, pz, cs, side, pe, reg, tileOf) {
  const t = Math.max(3, cs * .2);
  g.fillStyle = reg.blocks[pe.b] ? reg.blocks[pe.b].c : '#8a6a3a';
  if (side === 'N') g.fillRect(px, pz, cs, t);
  if (side === 'S') g.fillRect(px, pz + cs - t, cs, t);
  if (side === 'W') g.fillRect(px, pz, t, cs);
  if (side === 'E') g.fillRect(px + cs - t, pz, t, cs);
}

export const DIR_WORD = { N: 'north', S: 'south', E: 'east', W: 'west' };
// a short description of a block's placement, for the tap label
export function describe(pe) {
  const st = pe.st || {}, s = st.s;
  if (s === 'stairs') return `${st.h === 'top' ? 'upside down, ' : ''}tall side to the ${DIR_WORD[st.f] || ''}`;
  if (s === 'slab') return st.h === 'top' ? 'top half of the block' : 'bottom half of the block';
  if (s === 'door') return `on the ${DIR_WORD[st.side] || ''} edge`;
  if (s === 'trapdoor') return st.open ? `open, against the ${DIR_WORD[st.side] || ''} side` : (st.h === 'top' ? 'top half' : 'bottom half');
  if (['torch', 'ladder', 'button', 'lever', 'panel'].includes(s) && st.side) return `on the ${DIR_WORD[st.side]} wall`;
  if (s === 'lantern') return st.hang ? 'hanging' : 'standing';
  if (st.a === 'x') return 'lying east to west';
  if (st.a === 'z') return 'lying north to south';
  return '';
}
