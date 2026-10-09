// The "living mesh". Every face of every block is in the buffers, tagged with the block that
// would cover it. The vertex shader hides a face only once its cover has landed, so watching a
// build assemble, slicing it by layer or switching tiers never shows a hole.
//
// Input: a build JSON from tools/lbl/export.py and the registry from data/blocks.json.

const FACES = ['top', 'bottom', 'N', 'S', 'E', 'W'];
const NORMAL = { top: [0, 1, 0], bottom: [0, -1, 0], N: [0, 0, -1], S: [0, 0, 1], E: [1, 0, 0], W: [-1, 0, 0] };
const FACE_SHADE = { top: 1.0, bottom: 0.5, N: 0.8, S: 0.8, E: 0.62, W: 0.62 };
const AO_CURVE = [0.47, 0.66, 0.83, 1.0];
export const FLAG_GLOW = 1, FLAG_GROUND = 2, FLAG_TRANS = 4, FLAG_WATER = 8;

// corners (counter-clockwise from outside) and their uv, for a box b = [x0,y0,z0,x1,y1,z1] in 0..1
const CORNERS = {
  top:    b => [[b[0], b[4], b[5]], [b[3], b[4], b[5]], [b[3], b[4], b[2]], [b[0], b[4], b[2]]],
  bottom: b => [[b[0], b[1], b[2]], [b[3], b[1], b[2]], [b[3], b[1], b[5]], [b[0], b[1], b[5]]],
  S:      b => [[b[0], b[1], b[5]], [b[3], b[1], b[5]], [b[3], b[4], b[5]], [b[0], b[4], b[5]]],
  N:      b => [[b[3], b[1], b[2]], [b[0], b[1], b[2]], [b[0], b[4], b[2]], [b[3], b[4], b[2]]],
  E:      b => [[b[3], b[1], b[5]], [b[3], b[1], b[2]], [b[3], b[4], b[2]], [b[3], b[4], b[5]]],
  W:      b => [[b[0], b[1], b[2]], [b[0], b[1], b[5]], [b[0], b[4], b[5]], [b[0], b[4], b[2]]],
};
const UVS = {
  top:    b => [[b[0], b[5]], [b[3], b[5]], [b[3], b[2]], [b[0], b[2]]],
  bottom: b => [[b[0], 1 - b[2]], [b[3], 1 - b[2]], [b[3], 1 - b[5]], [b[0], 1 - b[5]]],
  S:      b => [[b[0], 1 - b[1]], [b[3], 1 - b[1]], [b[3], 1 - b[4]], [b[0], 1 - b[4]]],
  N:      b => [[1 - b[3], 1 - b[1]], [1 - b[0], 1 - b[1]], [1 - b[0], 1 - b[4]], [1 - b[3], 1 - b[4]]],
  E:      b => [[1 - b[5], 1 - b[1]], [1 - b[2], 1 - b[1]], [1 - b[2], 1 - b[4]], [1 - b[5], 1 - b[4]]],
  W:      b => [[b[2], 1 - b[1]], [b[5], 1 - b[1]], [b[5], 1 - b[4]], [b[2], 1 - b[4]]],
};
const onBoundary = (face, b) => ({ top: b[4] >= 1, bottom: b[1] <= 0, N: b[2] <= 0, S: b[5] >= 1, E: b[3] >= 1, W: b[0] <= 0 })[face];
const rotUV = (s, t, rot) => { for (let i = 0; i < rot; i++) [s, t] = [1 - t, s]; return [s, t]; };

const k3 = (x, y, z) => (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512);

// Parse a build into cells. Each cell: {x,y,z,p (palette), t0, t1 (tiers [t0,t1)), s (stagger)}
export function parseBuild(data) {
  const c = data.cells, cells = [];
  for (let i = 0; i < c.length; i += 6) cells.push({ x: c[i], y: c[i + 1], z: c[i + 2], p: c[i + 3], t0: c[i + 4], t1: c[i + 5], s: 0 });
  // stagger inside each layer: a snake path from the front-left corner, like a real builder
  const byY = new Map();
  for (const e of cells) { if (!byY.has(e.y)) byY.set(e.y, []); byY.get(e.y).push(e); }
  for (const list of byY.values()) {
    list.sort((a, b) => a.z - b.z || ((a.z & 1) ? b.x - a.x : a.x - b.x));
    const n = list.length;
    list.forEach((e, i) => { e.s = n > 1 ? (i / (n - 1)) * 0.999 : 0; });
  }
  return cells;
}

export class VoxelIndex {
  constructor(cells, data, reg) {
    this.map = new Map(); this.data = data; this.reg = reg;
    for (const e of cells) { const k = k3(e.x, e.y, e.z); const a = this.map.get(k); if (a) a.push(e); else this.map.set(k, [e]); }
  }
  at(x, y, z) { return this.map.get(k3(x, y, z)); }
  pal(e) { return this.data.palette[e.p]; }
  // an opaque full cube hides the faces touching it
  isCover(e) {
    const pe = this.pal(e), m = this.reg.models[pe.m], b = this.reg.blocks[pe.b];
    return !!m.full && !((b.f || 0) & 3);
  }
  isTrans(e) { return !!((this.reg.blocks[this.pal(e).b].f || 0) & 1); }
}

// ---------------------------------------------------------------- light (Minecraft flood fill)
// Light is worked out once per tier (or frame), with only the blocks and ground that are there at
// that tier. So a roof that arrives at Pro darkens the room at Pro but not at Starter, and a block
// that arrives later never leaves a dark patch on the grass before it lands.
export const LIGHT_TIERS = 8;    // per-tier light is packed for up to 8 tiers or frames, 2 per float
// ground next door is packed as one bit per tier (into aNb.y, beside the stagger) for up to 16 tiers;
// more than that and it joins the block's tier range, as it once did
const GROUND_BITS = 16;
const FOREVER = 99;
const on = (e, t) => e.t0 <= t && t < e.t1;   // is this cell (or ground) there at tier t?
// the box light is worked out in: the build, its ground and a little air around them
function lightGrid(bounds, ground) {
  const pad = 2;
  const [x0, y0, z0, x1, y1, z1] = bounds;
  const X0 = x0 - pad - ground.margin, Y0 = Math.min(y0, -ground.depth) - 1, Z0 = z0 - pad - ground.margin;
  const NX = x1 - x0 + 1 + 2 * (pad + ground.margin), NY = y1 - Y0 + 2 + pad, NZ = z1 - z0 + 1 + 2 * (pad + ground.margin);
  const inside = (x, y, z) => x >= X0 && x < X0 + NX && y >= Y0 && y < Y0 + NY && z >= Z0 && z < Z0 + NZ;
  const id = (x, y, z) => ((y - Y0) * NZ + (z - Z0)) * NX + (x - X0);
  return { X0, Y0, Z0, NX, NY, NZ, N: NX * NY * NZ, inside, id, at: (x, y, z) => inside(x, y, z) ? id(x, y, z) : -1 };
}
function computeLight(G, cells, idx, reg, ground, t) {
  const { X0, Y0, Z0, NX, NY, NZ, N, inside, id } = G;
  const opaque = new Uint8Array(N), filt = new Uint8Array(N), sky = new Uint8Array(N), blk = new Uint8Array(N);
  for (const e of cells) {
    if (!on(e, t) || !inside(e.x, e.y, e.z)) continue;
    const i = id(e.x, e.y, e.z), pe = idx.pal(e), b = reg.blocks[pe.b];
    if (idx.isCover(e)) opaque[i] = 1;
    else if (pe.st && pe.st.s === 'full' && ((b.f || 0) & 3)) filt[i] = 1;
  }
  for (const g of ground.cells) {
    if (!on(g, t) || !inside(g.x, g.y, g.z)) continue;
    if ((reg.blocks[g.b].f || 0) & 3) filt[id(g.x, g.y, g.z)] = 1;   // a sea of water lets light through
    else opaque[id(g.x, g.y, g.z)] = 1;
  }
  const q = [];
  for (let x = X0; x < X0 + NX; x++) for (let z = Z0; z < Z0 + NZ; z++) {
    let l = 15;
    for (let y = Y0 + NY - 1; y >= Y0; y--) {
      const i = id(x, y, z); if (opaque[i]) break;
      if (filt[i]) l = Math.max(0, l - 2);
      sky[i] = l; if (l > 1) q.push(i);
    }
  }
  const spread = (arr, queue) => {
    for (let h = 0; h < queue.length; h++) {
      const i = queue[h], l = arr[i]; if (l <= 1) continue;
      const x = i % NX, r = (i - x) / NX, z = r % NZ, y = (r - z) / NZ;
      const nb = [i - 1, i + 1, i - NX, i + NX, i - NX * NZ, i + NX * NZ];
      const ok = [x > 0, x < NX - 1, z > 0, z < NZ - 1, y > 0, y < NY - 1];
      for (let k = 0; k < 6; k++) {
        if (!ok[k]) continue; const j = nb[k]; if (opaque[j]) continue;
        const nl = l - 1 - (filt[j] ? 1 : 0);
        if (nl > arr[j]) { arr[j] = nl; queue.push(j); }
      }
    }
  };
  spread(sky, q);
  const bq = [];
  for (const e of cells) {
    if (!on(e, t)) continue;
    const L = reg.blocks[idx.pal(e).b].l || 0;
    if (L && inside(e.x, e.y, e.z)) { const i = id(e.x, e.y, e.z); if (L > blk[i]) { blk[i] = L; bq.push(i); } }
  }
  spread(blk, bq);
  return {
    opaque, sky, blk,
    sample: (x, y, z) => inside(x, y, z) ? [sky[id(x, y, z)], blk[id(x, y, z)]] : [15, 0],
    // a solid cube (or solid ground) at this spot at this tier: blocks light and darkens corners (AO)
    solid: (x, y, z) => inside(x, y, z) && opaque[id(x, y, z)] === 1,
  };
}

// ---------------------------------------------------------------- mesh
export function buildMesh(data, reg, opts = {}) {
  const cells = parseBuild(data);
  const idx = new VoxelIndex(cells, data, reg);
  const [bx0, by0, bz0, bx1, by1, bz1] = data.bounds;
  const nt = Math.max(1, data.ntiers || 1);
  const ground = { margin: opts.groundMargin ?? 2, depth: opts.groundDepth ?? 3, cells: [] };
  const gmap = new Map();   // spot -> ground cells there (a spot can lose its grass at Pro and get it back later)
  const addGround = g => { ground.cells.push(g); const k = k3(g.x, g.y, g.z); const a = gmap.get(k); if (a) a.push(g); else gmap.set(k, [g]); };
  if (opts.ground !== false) {
    const top = opts.groundBlock || 'grass_block';
    const below = { grass_block: 'dirt', water: 'sand', snow_block: 'dirt', podzol: 'dirt', moss_block: 'dirt', pale_moss: 'dirt', pale_moss_block: 'dirt', mycelium: 'dirt' }[top] || top;
    // a room dug into the ground (the spy base): an empty cell below y 0 with a block under it in the
    // same column (a floor, a carpet) is air at that tier, not grass or dirt. Per column and tier: the
    // lowest block deeper than y -1
    const k2 = (x, z) => (x + 512) * 1024 + (z + 512);
    const floorAt = new Map();
    for (const e of cells) if (e.y < -1) {
      const k = k2(e.x, e.z); let a = floorAt.get(k);
      if (!a) floorAt.set(k, a = new Array(nt + 2).fill(Infinity));
      for (let t = Math.max(1, e.t0); t < Math.min(nt + 1, e.t1); t++) if (e.y < a[t]) a[t] = e.y;
    }
    for (let x = bx0 - ground.margin; x <= bx1 + ground.margin; x++)
      for (let z = bz0 - ground.margin; z <= bz1 + ground.margin; z++) {
        const low = floorAt.get(k2(x, z));
        for (let d = 1; d <= ground.depth; d++) {
          const y = -d, b = d === 1 ? top : below, here = idx.at(x, y, z);
          const dug = t => !!low && low[t] < y;
          if (!here && !(low && low.some(v => v < y))) { addGround({ x, y, z, b, t0: 0, t1: FOREVER }); continue; }
          // the ground fills every tier in which no block stands here: a pond dug at Pro keeps its
          // grass at Starter, and a path laid in frame 3 has grass under frames 1 and 2
          let start = 0;
          for (let t = 1; t <= nt + 1; t++) {
            const free = t <= nt && !(here && here.some(e => on(e, t))) && !dug(t);
            if (free && !start) start = t;
            else if (!free && start) { addGround({ x, y, z, b, t0: start === 1 ? 0 : start, t1: t > nt ? FOREVER : t }); start = 0; }
          }
        }
      }
  }
  const always = g => g.t0 === 0 && g.t1 === FOREVER;
  // ground that is there at every tier, so it can hide the faces against it for good
  const groundAlways = (x, y, z) => { const a = gmap.get(k3(x, y, z)); return a ? a.find(always) || null : null; };
  // one light field per tier (up to LIGHT_TIERS); more frames than that share the last frame's light
  const perTier = nt <= LIGHT_TIERS;
  const lightTiers = perTier ? Array.from({ length: nt }, (_, i) => i + 1) : [nt];
  const G = lightGrid(data.bounds, ground);
  const lights = lightTiers.map(t => computeLight(G, cells, idx, reg, ground, t));
  const NL = lights.length;
  // every item name gets a number, so the shader can highlight "all the Oak Stairs"
  const items = [], itemIdx = new Map();
  const palItem = data.palette.map(pe => { if (!itemIdx.has(pe.i)) { itemIdx.set(pe.i, items.length); items.push(pe.i); } return itemIdx.get(pe.i); });

  const bufs = { opaque: newBuf(), trans: newBuf() };
  const full = [0, 0, 0, 16, 16, 16];
  // per tier, for one corner: ao (0..3), sky and block light (0..15)
  const lvA = new Uint8Array(NL), lvS = new Float32Array(NL), lvB = new Float32Array(NL);

  function emitCell(x, y, z, model, tilesOf, info) {
    const buf = info.trans ? bufs.trans : bufs.opaque;
    const isFull = !!model.full;
    for (const row of model.b) {
      const b = [row[0] / 16, row[1] / 16, row[2] / 16, row[3] / 16, row[4] / 16, row[5] / 16];
      for (let f = 0; f < 6; f++) {
        const face = FACES[f], n = NORMAL[face];
        let ref = row[6 + f * 2], rot = row[7 + f * 2];
        const tileIdx = ref >= 0 ? ref : tilesOf[-ref - 1];
        // cover: who hides this face?
        let cover = null; // [y, stagger, t0, t1] of the neighbour that hides this face while it is there
        let gbits = 0;    // the tiers (bit t-1) in which ground next door hides this face
        let hidden = false;
        if (onBoundary(face, b)) {
          const nx = x + n[0], ny = y + n[1], nz = z + n[2];
          // the tiers in which something next door hides this face: a solid block, the same see-through
          // block (no grid lines inside water or glass), or ground (unless it is water and we are not)
          const iv = [];
          let cs = 0;
          const nb = idx.at(nx, ny, nz);
          if (nb) for (const e of nb) {
            if (!(idx.isCover(e) || (info.trans && idx.isTrans(e) && idx.pal(e).b === info.block))) continue;
            if (!iv.length) cs = e.s;
            iv.push([e.t0, e.t1]);
          }
          const gl = gmap.get(k3(nx, ny, nz));
          if (gl) for (const g of gl) {
            if ((reg.blocks[g.b].f || 0) & 3 && g.b !== info.block) continue;
            if (always(g)) { hidden = true; break; }   // ground that is always there hides it for good
            // every run of ground counts, kept apart from the blocks: ground is there for its whole tier,
            // while a block hides the face only once its layer has been built (a sea keeps no outline of
            // the island that lands at Legend, even while Starter is being built)
            const t0 = Math.max(1, g.t0), t1 = Math.min(nt + 1, g.t1);
            if (nt <= GROUND_BITS) for (let t = t0; t < t1; t++) gbits |= 1 << (t - 1);
            else iv.push([t0, t1]);
          }
          if (!hidden && iv.length) {
            // join touching runs and keep the longest: the shader hides the face only while that
            // neighbour is there, so a face never hides over a gap
            iv.sort((p, q) => p[0] - q[0]);
            let best = null, run = null;
            for (const r of iv) {
              if (run && r[0] <= run[1]) run[1] = Math.max(run[1], r[1]);
              else { run = [r[0], r[1]]; if (!best || run[1] - run[0] >= best[1] - best[0]) best = run; }
              if (run[1] - run[0] >= best[1] - best[0]) best = run;
            }
            cover = [ny, cs, best[0], best[1]];
          }
          if (!hidden && gbits && !cover) cover = [ny, 0, 0, 0];   // ground only: no block range
        }
        if (hidden) continue;
        const corners = CORNERS[face](b), uvs = UVS[face](b);
        const fb = onBoundary(face, b);
        const fx = x + (fb ? n[0] : 0), fy = y + (fb ? n[1] : 0), fz = z + (fb ? n[2] : 0);
        const ao = [1, 1, 1, 1], lt = [], pk = [];
        for (let k = 0; k < 4; k++) {
          const c = corners[k];
          if (isFull && !info.trans) {
            const t = [0, 0, 0], s = [0, 0, 0];
            const axes = [0, 1, 2].filter(a => n[a] === 0);
            t[axes[0]] = c[axes[0]] > 0.5 ? 1 : -1; s[axes[1]] = c[axes[1]] > 0.5 ? 1 : -1;
            // the face's own spot, the two side neighbours and the corner (-1 = outside the light box)
            const i0 = G.at(fx, fy, fz), i1 = G.at(fx + t[0], fy + t[1], fz + t[2]), i2 = G.at(fx + s[0], fy + s[1], fz + s[2]);
            const i3 = G.at(fx + t[0] + s[0], fy + t[1] + s[1], fz + t[2] + s[2]);
            for (let j = 0; j < NL; j++) {
              const { opaque, sky, blk } = lights[j];
              const s1 = i1 >= 0 && opaque[i1] ? 1 : 0, s2 = i2 >= 0 && opaque[i2] ? 1 : 0, cr = i3 >= 0 && opaque[i3] ? 1 : 0;
              let ss = i0 >= 0 ? sky[i0] : 15, bb = i0 >= 0 ? blk[i0] : 0, cnt = 1;
              if (!s1) { ss += i1 >= 0 ? sky[i1] : 15; bb += i1 >= 0 ? blk[i1] : 0; cnt++; }
              if (!s2) { ss += i2 >= 0 ? sky[i2] : 15; bb += i2 >= 0 ? blk[i2] : 0; cnt++; }
              if (!cr && !(s1 && s2)) { ss += i3 >= 0 ? sky[i3] : 15; bb += i3 >= 0 ? blk[i3] : 0; cnt++; }
              lvA[j] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr); lvS[j] = ss / cnt; lvB[j] = bb / cnt;
            }
          } else {
            const i0 = G.at(x, y, z), i1 = G.at(fx, fy, fz);
            for (let j = 0; j < NL; j++) {
              const { sky, blk } = lights[j];
              lvA[j] = 3;
              lvS[j] = Math.max(i0 >= 0 ? sky[i0] : 15, i1 >= 0 ? sky[i1] : 15);
              lvB[j] = Math.max(i0 >= 0 ? blk[i0] : 0, i1 >= 0 ? blk[i1] : 0);
            }
          }
          // the finished build's light is the fallback (and decides how the quad is split)
          ao[k] = AO_CURVE[lvA[NL - 1]]; lt.push([lvS[NL - 1] / 15, lvB[NL - 1] / 15]);
          // 12 bits a tier: ao (0..3), sky and block light in half levels (0..30); two tiers a float
          const p4 = [0, 0, 0, 0];
          if (perTier) for (let j = 0; j < NL; j++) {
            const v = lvA[j] * 1024 + Math.round(lvS[j] * 2) * 32 + Math.round(lvB[j] * 2);
            p4[j >> 1] += (j & 1) ? v * 4096 : v;
          }
          pk.push(p4);
        }
        const shade = FACE_SHADE[face];
        const base = buf.n;
        for (let k = 0; k < 4; k++) {
          const c = corners[k];
          buf.pos.push(x + c[0], y + c[1], z + c[2]);
          buf.nrm.push(n[0], n[1], n[2]);
          const [u, v] = rotUV(uvs[k][0], uvs[k][1], rot);
          buf.uvl.push(u, v, tileIdx);
          buf.blk.push(x, y, z, info.s);
          // aNb: neighbour y, its stagger (0..1) + 2 x the ground bits, the block's tier range
          buf.nb.push(cover ? cover[0] : -9999, cover ? cover[1] + 2 * gbits : 0, cover ? cover[2] : 0, cover ? cover[3] : 0);
          buf.tier.push(info.t0, info.t1, info.p, info.item);
          buf.lit.push(shade * ao[k], lt[k][0], lt[k][1], info.flags);
          buf.lt.push(pk[k][0], pk[k][1], pk[k][2], pk[k][3]);
        }
        if (ao[0] + ao[2] < ao[1] + ao[3]) buf.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
        else buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        buf.n += 4;
        buf.faces.push(fb && cover === null ? 1 : 0); // 1 = visible in the finished build
      }
    }
  }

  for (const e of cells) {
    const pe = idx.pal(e), blk = reg.blocks[pe.b], model = reg.models[pe.m];
    const trans = !!((blk.f || 0) & 1);
    const flags = ((blk.f || 0) & 4 ? FLAG_GLOW : 0) | (trans ? FLAG_TRANS : 0) | (pe.b === 'water' ? FLAG_WATER : 0);
    emitCell(e.x, e.y, e.z, model, blk.t, { trans, block: pe.b, s: e.s, t0: e.t0, t1: e.t1, p: e.p, item: palItem[e.p], flags, ground: false });
  }
  const fullModel = { full: 1, b: [[...full, -1, 0, -3, 0, -2, 0, -2, 0, -2, 0, -2, 0]] };
  for (const g of ground.cells) {
    const blk = reg.blocks[g.b];
    const trans = !!((blk.f || 0) & 1);   // e.g. a sea of water around a ship
    // t0/t1: the tiers this ground is there (0..99 = always); the shader hides it outside them
    emitCell(g.x, g.y, g.z, fullModel, blk.t, { trans, block: g.b, s: 0, t0: g.t0, t1: g.t1, p: -1, item: -1, flags: FLAG_GROUND | (trans ? FLAG_TRANS : 0) | (g.b === 'water' ? FLAG_WATER : 0), ground: true });
  }
  // the ground at a spot at tier t (or, with no t, ground that is there at every tier)
  ground.at = (x, y, z, t) => {
    if (t === undefined) return groundAlways(x, y, z);
    const a = gmap.get(k3(x, y, z)); return a ? a.find(g => on(g, t)) || null : null;
  };
  return { cells, idx, bufs, ground, light: lights[NL - 1], lights, perTier, items, itemIdx };
}

function newBuf() { return { pos: [], nrm: [], uvl: [], blk: [], nb: [], tier: [], lit: [], lt: [], idx: [], faces: [], n: 0 }; }
