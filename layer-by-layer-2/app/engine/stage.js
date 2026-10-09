// One WebGL canvas for the whole book. Pages borrow it with stage.mount(container).
// Renders only when something changes (battery), and freezes the sun's shadow map until the
// build or the sun moves.
import * as THREE from './three.js';
import { OrbitControls } from './three.js';
import { buildMesh } from './voxels.js';
import { makeUniforms, voxelMaterial, depthMaterial } from './material.js';

const BOOT_KEY = 'lbl2-3d-boot';

export function webgl2Available() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return false;
    const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();   // give the test context back
    return true;
  } catch (e) { return false; }
}
// iOS can kill a WebGL-heavy tab without warning. If the last start never finished, go lite.
function crashedLastTime() { try { return sessionStorage.getItem(BOOT_KEY) === '1'; } catch (e) { return false; } }
function markBoot(v) { try { v ? sessionStorage.setItem(BOOT_KEY, '1') : sessionStorage.removeItem(BOOT_KEY); } catch (e) {} }

// blocks: an already started fetch of blocks.json (the pages load it too), so it is downloaded once
export async function loadRegistry(base = 'data/', blocks = null) {
  const [reg, img] = await Promise.all([
    blocks || fetch(base + 'blocks.json').then(r => { if (!r.ok) throw new Error('blocks.json ' + r.status); return r.json(); }),
    new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = base + 'tiles.png'; }),
  ]);
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const src = cx.getImageData(0, 0, img.width, img.height).data;
  const n = reg.tiles.count, cols = reg.tiles.cols, data = new Uint8Array(16 * 16 * 4 * n);
  for (let t = 0; t < n; t++) {
    const tx = (t % cols) * 16, ty = Math.floor(t / cols) * 16;
    for (let y = 0; y < 16; y++) {
      const s = ((ty + y) * img.width + tx) * 4, d = (t * 256 + y * 16) * 4;
      data.set(src.subarray(s, s + 64), d);
    }
  }
  const tex = new THREE.DataArrayTexture(data, 16, 16, n);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType; tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true; tex.flipY = false; tex.unpackAlignment = 4; tex.needsUpdate = true;
  reg.texture = tex; reg.tileImage = img;
  return reg;
}

export class Stage {
  constructor(reg) {
    this.reg = reg;
    this.lite = crashedLastTime();
    markBoot(true);
    const canvas = document.createElement('canvas');
    canvas.className = 'stage3d';
    canvas.setAttribute('role', 'img');
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lite ? 1 : 2));
    r.outputColorSpace = THREE.LinearSRGBColorSpace; // our shader writes display colours directly
    reg.texture.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 3000);
    const c = this.controls = new OrbitControls(this.camera, canvas);
    c.enableDamping = true; c.dampingFactor = 0.085; c.screenSpacePanning = true;
    c.minPolarAngle = 0.12; c.maxPolarAngle = Math.PI * 0.485; c.rotateSpeed = 0.75; c.zoomSpeed = 0.9;
    c.addEventListener('change', () => this.kick());
    // the kid grabs the build: stop any camera glide (a size change re-framing it) so the drag wins
    c.addEventListener('start', () => { this.userMoved = true; this.tweens.delete('cam'); this.stopSpin(); this.emit('interact'); });
    canvas.addEventListener('gesturestart', e => e.preventDefault());
    // keyboard: arrows turn and tilt, + and - zoom (the 3D view must work without a mouse or touch)
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', e => {
      if (document.documentElement.classList.contains('mode-on')) return;   // Build Mode: arrows (and pedals) change layers
      const k = e.key, off = this.camera.position.clone().sub(this.controls.target);
      if (k === 'ArrowLeft' || k === 'ArrowRight') off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (k === 'ArrowLeft' ? -1 : 1) * Math.PI / 12);
      else if (k === 'ArrowUp' || k === 'ArrowDown') {
        const sph = { r: off.length(), phi: Math.acos(Math.max(-1, Math.min(1, off.y / off.length()))), th: Math.atan2(off.x, off.z) };
        sph.phi = Math.max(this.controls.minPolarAngle, Math.min(this.controls.maxPolarAngle, sph.phi + (k === 'ArrowUp' ? -0.15 : 0.15)));
        off.set(Math.sin(sph.phi) * Math.sin(sph.th), Math.cos(sph.phi), Math.sin(sph.phi) * Math.cos(sph.th)).multiplyScalar(sph.r);
      } else if (k === '+' || k === '=' || k === '-' || k === '_') {
        off.multiplyScalar(k === '-' || k === '_' ? 1.15 : 1 / 1.15);
        const len = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, off.length())); off.setLength(len);
      } else return;
      e.preventDefault(); this.stopSpin(); this.userMoved = true; this.tweens.delete('cam');
      this.camera.position.copy(this.controls.target).add(off); this.controls.update(); this.kick();
    });
    this.U = makeUniforms(reg.texture);
    this.mats = { opaque: voxelMaterial(this.U, 'opaque'), trans: voxelMaterial(this.U, 'trans'), ghost: voxelMaterial(this.U, 'ghost'), depth: depthMaterial(this.U) };
    // sun shadows: rendered into a depth texture only when needed
    this.shadowSize = this.lite ? 0 : 2048;
    if (this.shadowSize) {
      const rt = new THREE.WebGLRenderTarget(this.shadowSize, this.shadowSize, { depthBuffer: true });
      rt.depthTexture = new THREE.DepthTexture(this.shadowSize, this.shadowSize, THREE.UnsignedIntType);
      rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
      this.shadowRT = rt; this.U.uShadowMap.value = rt.depthTexture; this.U.uShadowOn.value = 1;
      this.sunCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 500);
    }
    this.shadowDirty = true;
    this.tweens = new Map(); this.listeners = {};
    this.raf = 0; this.spin = 0; this.last = 0;
    this.ro = new ResizeObserver(() => this.resize());
    // a marker label changes size when the web font arrives or the reader picks bigger text: measure it again
    this.labelRO = new ResizeObserver(es => { for (const en of es) en.target._w = 0; this.kick(); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.shadowDirty = true; this.kick(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick(); });
    this.picker = new Picker(this);
    canvas.addEventListener('pointerdown', e => { this.downAt = [e.clientX, e.clientY, performance.now()]; });
    canvas.addEventListener('pointerup', e => {
      if (!this.downAt) return;
      const [x, y, t] = this.downAt; this.downAt = null;
      if (Math.hypot(e.clientX - x, e.clientY - y) < 8 && performance.now() - t < 450) this.emit('tap', this.picker.pick(e.clientX, e.clientY));
    });
  }
  // Calm mode or the system's reduce-motion setting, checked live so switching Calm on stops motion at once
  get reduceMotion() { return document.documentElement.hasAttribute('data-calm') || (this.rmq ||= matchMedia('(prefers-reduced-motion: reduce)')).matches; }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); return () => { this.listeners[ev] = this.listeners[ev].filter(f => f !== fn); }; }
  emit(ev, arg) { (this.listeners[ev] || []).forEach(f => f(arg)); }
  mount(el) {
    if (this.host === el) return;
    if (this.host) this.ro.unobserve(this.host);
    this.host = el; el.appendChild(this.canvas); this.ro.observe(el); this.resize();
    // the canvas takes its name from the box it sits in ("3D build. Drag to spin...")
    this.canvas.setAttribute('aria-label', (el.getAttribute('aria-label') || '3D build') + ' Arrow keys turn it, plus and minus zoom.');
  }
  unmount() { if (this.host) { this.ro.unobserve(this.host); this.canvas.remove(); this.host = null; } this.listeners = {}; this.stopSpin(); }
  resize() {
    if (!this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    // shiftX moves the picture sideways on screen (e.g. to leave room for a title) without moving the camera
    if (this.shiftX) this.camera.setViewOffset(w, h, -this.shiftX * w, 0, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    // the box changed shape (a phone turned, the page reflowed): frame the build again unless the kid moved it
    const shape = Math.round(w / h * 50);
    if (this.data && !this.userMoved && !this.walking && this.lastShape && shape !== this.lastShape) this.frame(this.view || 'hero', false);
    this.lastShape = shape;
    this.kick();
  }
  setShift(fx) {
    this.shiftX = fx || 0; this.resize();
    if (this.data && !this.userMoved && !this.walking) this.frame(this.view || 'hero', false);
  }

  // ---------------------------------------------------------------- builds
  async show(data, opts = {}) {
    if (this.group) { this.scene.remove(this.group); this.group.children.forEach(m => m.geometry.dispose()); }
    const t0 = performance.now();
    const mesh = buildMesh(data, this.reg, opts);
    this.mesh = mesh; this.data = data;
    const g = this.group = new THREE.Group();
    const geo = b => {
      const G = new THREE.BufferGeometry();
      G.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      G.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      G.setAttribute('uvl', new THREE.Float32BufferAttribute(b.uvl, 3));
      G.setAttribute('aBlk', new THREE.Float32BufferAttribute(b.blk, 4));
      G.setAttribute('aNb', new THREE.Float32BufferAttribute(b.nb, 4));
      G.setAttribute('aTier', new THREE.Float32BufferAttribute(b.tier, 4));
      G.setAttribute('aLit', new THREE.Float32BufferAttribute(b.lit, 4));
      G.setAttribute('aLT', new THREE.Float32BufferAttribute(b.lt, 4));
      G.setIndex(b.n > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
      G.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e5);
      return G;
    };
    const go = geo(mesh.bufs.opaque), gt = geo(mesh.bufs.trans);
    this.opaque = new THREE.Mesh(go, this.mats.opaque);
    this.trans = new THREE.Mesh(gt, this.mats.trans); this.trans.renderOrder = 1;
    this.ghost = new THREE.Mesh(go, this.mats.ghost); this.ghost.renderOrder = 2;
    this.ghost2 = new THREE.Mesh(gt, this.mats.ghost); this.ghost2.renderOrder = 3;
    [this.opaque, this.trans, this.ghost, this.ghost2].forEach(m => { m.frustumCulled = false; g.add(m); });
    const [x0, y0, z0, x1, y1, z1] = data.bounds;
    this.center = new THREE.Vector3((x0 + x1 + 1) / 2, 0, (z0 + z1 + 1) / 2);
    // the space each tier takes, so Starter is framed at Starter size (builds; a figure keeps one frame for all)
    this.fitTiers = opts.fitTiers ?? !data.meta;
    this.tierBounds = [];
    for (let t = 1; t <= data.ntiers; t++) {
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (const e of mesh.cells) if (e.t0 <= t && t < e.t1) {
        if (e.x < b[0]) b[0] = e.x; if (e.y < b[1]) b[1] = e.y; if (e.z < b[2]) b[2] = e.z;
        if (e.x > b[3]) b[3] = e.x; if (e.y > b[4]) b[4] = e.y; if (e.z > b[5]) b[5] = e.z;
      }
      this.tierBounds.push(b[0] === Infinity ? data.bounds : b);
    }
    g.position.set(-this.center.x, 0, -this.center.z);
    this.scene.add(g);
    this.U.uMinY.value = y0;
    this.layers = y1 - y0 + 1; this.minY = y0;
    // every page starts from the same defaults
    this.tweens.clear(); this.autoSpin(false); this.userMoved = false;
    if (this.shiftX) { this.shiftX = 0; this.resize(); }
    this.clearMarkerEls(); this.markers = null;
    const U = this.U;
    U.uReveal.value = 999; U.uCut.value = 999; U.uGhostLayer.value = -1; U.uExplode.value = 0; U.uHi.value = -1;
    U.uSel.value.set(0, 0, 0, 0); U.uCur.value.set(1, 0); U.uOpen.value = 0; U.uDrop.value = opts.drop ?? 6; U.uTierA.value = data.ntiers;
    U.uNT.value = data.ntiers; U.uLT.value = mesh.perTier ? 1 : 0;
    this.size = Math.max(x1 - x0 + 1, z1 - z0 + 1, y1 - y0 + 1);
    this.radius = Math.hypot(x1 - x0 + 1 + 4, y1 - y0 + 1, z1 - z0 + 1 + 4) / 2;
    this.meshMs = performance.now() - t0;
    this.tris = (mesh.bufs.opaque.idx.length + mesh.bufs.trans.idx.length) / 3;
    this.fitSun();
    if (!opts.keepCamera) this.frame(opts.view || 'hero', false);
    this.shadowDirty = true; this.kick();
    setTimeout(() => markBoot(false), 4000);
    return mesh;
  }
  // Dotted boxes for animal spaces (we never draw mobs): [{x, y, z, w, h, d, label}] in build coordinates.
  setMarkers(list = []) {
    if (this.markers) { this.group && this.group.remove(this.markers); this.markers.geometry.dispose(); this.markers = null; }
    this.clearMarkerEls();
    if (!list.length || !this.group) { this.kick(); return; }
    const pts = [];
    for (const m of list) {
      const x0 = m.x, y0 = m.y, z0 = m.z, x1 = m.x + m.w, y1 = m.y + m.h, z1 = m.z + m.d;
      const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) pts.push(...c[a], ...c[b]);
      if (m.label && this.host) {
        const el = document.createElement('div'); el.className = 'marker-label'; el.textContent = m.label;
        el._p = new THREE.Vector3((x0 + x1) / 2, y1 + 0.3, (z0 + z1) / 2); this.host.appendChild(el); this.markerEls.push(el);
        this.labelRO.observe(el);
        // a thin stem from a label that had to move out of the way back down to its box (under the
        // labels, so a long stem never crosses another label's word)
        const st = el._stem = document.createElement('div'); st.className = 'marker-stem'; st.hidden = true;
        st.style.cssText = 'position:absolute;left:0;top:0;width:2px;height:1px;z-index:2;pointer-events:none;transform-origin:50% 0;background:rgba(255,255,255,.9);box-shadow:0 0 0 1px rgba(27,33,48,.35)';
        this.host.appendChild(st);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineSegments(g, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.95 }));
    line.computeLineDistances(); line.renderOrder = 4;
    this.markers = line; this.group.add(line); this.kick();
  }
  clearMarkerEls() {
    this.labelRO.disconnect();
    (this.markerEls || []).forEach(e => { e.remove(); if (e._stem) e._stem.remove(); }); this.markerEls = [];
  }
  // Labels sit on top of their boxes. Nearest first: a label that would cover one already placed moves
  // up (or to the side) just far enough to be read, and a stem points back down to its box.
  placeMarkerLabels() {
    if (!this.markerEls || !this.markerEls.length || !this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight, GAP = 3;
    const tier = Math.round(this.U.uTierA.value), items = [];
    for (const el of this.markerEls) {
      const p = el._p.clone().add(this.group.position).project(this.camera);
      // walking inside, a label behind a wall stays hidden like its box
      const hide = p.z > 1 || (this.walking && this.labelBlocked(el._p, tier));
      if (hide) { el.hidden = true; el._stem.hidden = true; continue; }
      el.hidden = false;
      if (!el._w) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
      items.push({ el, z: p.z, ax: (p.x * .5 + .5) * w, ay: (-p.y * .5 + .5) * h, lw: el._w, lh: el._h });
    }
    items.sort((a, b) => a.z - b.z);
    // the buttons over the stage (and a tapped block's name card) sit on top of the labels: keep clear of them
    const placed = [];
    if (items.length) {
      const hb = this.host.getBoundingClientRect();
      for (const b of this.host.querySelectorAll('.stage-tools button, .stage-tools .tapinfo')) {
        const r = b.getBoundingClientRect();
        if (r.width && r.height) placed.push({ x: r.left - hb.left, y: r.top - hb.top, w: r.width, h: r.height });
      }
    }
    const hit = (x, y, lw, lh) => placed.find(r => x < r.x + r.w + GAP && x + lw + GAP > r.x && y < r.y + r.h + GAP && y + lh + GAP > r.y);
    const inBox = (x, y, lw, lh) => x >= 2 && y >= 2 && x + lw <= w - 2 && y + lh <= h - 2;
    for (const it of items) {
      const { el, ax, ay, lw, lh } = it;
      let x0 = ax - lw / 2, y0 = ay - lh;
      // a label that would be cut off by the edge (zoomed in close, or walking) moves fully inside, and
      // the stem shows where it belongs; one whose box is well off the picture stays out of sight
      if (ax > -lw / 2 && ax < w + lw / 2 && ay > 0 && ay < h + lh) { x0 = Math.max(2, Math.min(w - 2 - lw, x0)); y0 = Math.max(2, Math.min(h - 2 - lh, y0)); }
      let x = x0, y = y0;
      if (hit(x0, y0, lw, lh)) {
        // three ways out: keep stepping up past whatever is in the way, or step left, or right
        const push = (dir) => {
          let px = x0, py = y0;
          for (let i = 0; i < 12; i++) {
            const r = hit(px, py, lw, lh); if (!r) return inBox(px, py, lw, lh) ? [px, py] : null;
            if (dir === 'up') py = r.y - GAP - lh; else if (dir === 'left') px = r.x - GAP - lw; else px = r.x + r.w + GAP;
          }
          return null;
        };
        let best = null, cost = Infinity;
        for (const dir of ['up', 'left', 'right']) {
          const q = push(dir); if (!q) continue;
          const c = Math.abs(q[1] - y0) + 1.6 * Math.abs(q[0] - x0);
          if (c < cost) { cost = c; best = q; }
        }
        if (best) [x, y] = best;
      }
      if (!it.lw) { x = x0; y = y0; }
      placed.push({ x, y, w: lw, h: lh });
      el.style.transform = `translate(${x}px, ${y}px)`;
      // the stem: from the label's bottom middle to the top of its box
      const sx = x + lw / 2, sy = y + lh, len = Math.hypot(ax - sx, ay - sy);
      const st = el._stem;
      if (len > 6) {
        st.hidden = false;
        st.style.height = `${len.toFixed(1)}px`;   // (a scaleY would stretch the outline too)
        st.style.transform = `translate(${sx - 1}px, ${sy}px) rotate(${Math.atan2(ay - sy, ax - sx) - Math.PI / 2}rad)`;
      } else st.hidden = true;
    }
  }
  // is there a solid block between the camera and this point (cell coordinates)?
  labelBlocked(p, tier) {
    const idx = this.mesh && this.mesh.idx; if (!idx) return false;
    const o = this.camera.position.clone().sub(this.group.position), d = p.clone().sub(o);
    const L = d.length(); if (L < 1) return false;
    d.divideScalar(L);
    for (let t = 0.3; t < L - 0.6; t += 0.25) {
      const x = Math.floor(o.x + d.x * t), y = Math.floor(o.y + d.y * t), z = Math.floor(o.z + d.z * t);
      const list = idx.at(x, y, z);
      if (list && list.some(e => e.t0 <= tier && tier < e.t1 && idx.isCover(e))) return true;
    }
    return false;
  }

  // The box to fit on screen, in world space: the tier on show (builds) or the whole figure, with its ground.
  fitBox(tier) {
    const nt = this.data.ntiers, g = this.mesh.ground, hasG = g.cells.length > 0;
    const t = this.fitTiers ? Math.max(1, Math.min(nt, Math.round(tier ?? this.U.uTierA.value))) : nt;
    const whole = t === nt;
    const b = this.fitTiers ? this.tierBounds[t - 1] : this.data.bounds;
    // the finished build or a figure shows its whole patch of ground; a smaller tier zooms in on itself
    const m = hasG ? (whole ? g.margin : 1) : 0, y0 = hasG ? Math.min(b[1], whole ? -g.depth : -1) : b[1];
    const cx = this.center.x, cz = this.center.z;
    return { t, box: [b[0] - m - cx, y0, b[2] - m - cz, b[3] + 1 + m - cx, b[4] + 1, b[5] + 1 + m - cz] };
  }
  // camera presets. The camera aims at the middle of the box and backs off just far enough that no
  // corner is cut off, whether the stage is wide or tall (a 32-block tower fits on a phone too).
  frame(view = 'hero', animate = true, tier) {
    this.view = view; this.userMoved = false;
    const dirs = {
      hero: [0.62, 0.48, 0.78], front: [0, 0.32, 1], side: [1, 0.32, 0], back: [-0.5, 0.45, -0.85],
      top: [0.001, 1, 0.02], low: [0.75, 0.16, 0.7],
    };
    const d = new THREE.Vector3(...(dirs[view] || dirs.hero)).normalize();
    const { t, box } = this.fitBox(tier);
    this.framedTier = t;
    const corners = [];
    for (const x of [box[0], box[3]]) for (const y of [box[1], box[4]]) for (const z of [box[2], box[5]]) corners.push(new THREE.Vector3(x, y, z));
    const target = new THREE.Vector3((box[0] + box[3]) / 2, (box[1] + box[4]) / 2, (box[2] + box[5]) / 2);
    const fw = d.clone().negate(), right = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fw);
    // how much of the picture the build may fill (room for the buttons along the edge), and the
    // part of the width left after setShift moves the picture sideways
    const FILL = 0.86;
    const tanV = Math.tan(this.camera.fov * Math.PI / 360) * FILL;
    const tanH = Math.tan(this.camera.fov * Math.PI / 360) * this.camera.aspect * Math.max(0.3, 1 - 2 * Math.abs(this.shiftX || 0)) * FILL;
    const q = new THREE.Vector3();
    let dist = 1;
    for (let it = 0; it < 3; it++) {
      dist = 1;
      for (const c of corners) {
        q.subVectors(c, target); const z = q.dot(fw);
        dist = Math.max(dist, Math.abs(q.dot(right)) / tanH - z, Math.abs(q.dot(up)) / tanV - z);
      }
      if (it === 2) break;
      // aim so the margins on opposite sides match (a tall tower seen from above leans one way)
      let xl = Infinity, xh = -Infinity, yl = Infinity, yh = -Infinity;
      for (const c of corners) {
        q.subVectors(c, target); const z = dist + q.dot(fw), sx = q.dot(right) / z, sy = q.dot(up) / z;
        xl = Math.min(xl, sx); xh = Math.max(xh, sx); yl = Math.min(yl, sy); yh = Math.max(yh, sy);
      }
      target.addScaledVector(right, (xl + xh) / 2 * dist).addScaledVector(up, (yl + yh) / 2 * dist);
    }
    const R = this.radius;
    const pos = target.clone().addScaledVector(d, dist);
    this.controls.minDistance = Math.min(R * 0.6, dist * 0.5); this.controls.maxDistance = dist * 2.6;
    this.controls.maxTargetRadius = Math.max(R, target.length() + 2);
    if (!animate) { this.tweens.delete('cam'); this.camera.position.copy(pos); this.controls.target.copy(target); this.controls.update(); this.kick(); return; }
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    this.tween('cam', 0, 1, 900, k => {
      const e = 1 - Math.pow(1 - k, 3);
      // swing around the build rather than through it
      const a = p0.clone().sub(t0), b = pos.clone().sub(target);
      const ra = a.length(), rb = b.length();
      const dir = a.normalize().lerp(b.normalize(), e).normalize();
      this.controls.target.lerpVectors(t0, target, e);
      this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(ra + (rb - ra) * e));
    });
  }
  // a build grows or shrinks with its tier: frame the new size, unless the kid has moved the camera
  refit(tier, animate) {
    if (!this.fitTiers || this.userMoved || this.walking || !this.data) return;
    const t = Math.max(1, Math.min(this.data.ntiers, Math.round(tier)));
    if (t !== this.framedTier) this.frame(this.view || 'hero', animate, t);
  }
  fitSun() {
    if (!this.sunCam || !this.data) return;
    const R = this.radius + 3, d = this.U.uSunDir.value;
    this.sunCam.left = -R; this.sunCam.right = R; this.sunCam.top = R; this.sunCam.bottom = -R;
    this.sunCam.near = 0.5; this.sunCam.far = R * 4;
    const cy = (this.data.bounds[1] + this.data.bounds[4] + 1) / 2;   // the middle of the build, so a tall one keeps its shadow
    this.sunCam.position.copy(d).multiplyScalar(R * 2).add(new THREE.Vector3(0, cy, 0));
    this.sunCam.lookAt(0, cy, 0);
    this.sunCam.updateProjectionMatrix(); this.sunCam.updateMatrixWorld();
    this.U.uSunMat.value.multiplyMatrices(this.sunCam.projectionMatrix, this.sunCam.matrixWorldInverse);
    this.shadowDirty = true;
  }
  // time of day: 0 midnight .. 0.5 noon .. 1 midnight. Kids see a slider from sunrise to night.
  setTime(t) {
    const ang = (t - 0.25) * Math.PI * 2;           // 0.25 sunrise, 0.75 sunset
    const up = Math.sin(ang);
    const az = 0.6 + t * 1.4;
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(Math.asin(Math.max(-1, Math.min(1, up)))), Math.max(up, 0.08), Math.sin(az) * Math.cos(Math.asin(Math.max(-1, Math.min(1, up)))));
    this.U.uSunDir.value.copy(dir.normalize());
    const day = Math.max(0, Math.min(1, (up + 0.12) / 0.32));
    // night keeps some cool moonlight, so a gadget or garden shown at night can still be read
    this.U.uDay.value = 0.32 + 0.68 * day;
    this.U.uSkyCol.value.setRGB(1 - 0.28 * (1 - day), 1 - 0.2 * (1 - day), 1.04 + 0.12 * (1 - day));
    this.U.uNight.value = 1 - day;
    this.U.uSunUp.value = Math.max(0, Math.min(1, up / 0.18));
    const warm = 1 - Math.max(0, Math.min(1, (up - 0.05) / 0.35));
    this.U.uSunCol.value.setRGB(1, 0.97 - 0.3 * warm, 0.9 - 0.5 * warm);
    this.fitSun(); this.kick();
    return { day, up };
  }
  // ---------------------------------------------------------------- state
  set(name, value, ms = 0, ease) {
    const u = this.U[name]; if (!u) return;
    if (name === 'uTierA') this.refit(value, ms > 0 && !this.reduceMotion);
    if (!ms) { this.tweens.delete(name); u.value = value; this.shadowDirty = true; this.kick(); return; }
    this.tween(name, u.value, value, ms, v => { u.value = v; }, ease);
  }
  tween(id, from, to, ms, fn, ease) {
    this.tweens.set(id, { from, to, ms, fn, ease, t0: performance.now() }); this.kick();
  }
  autoSpin(on = true) { this.spin = on ? 1 : 0; this.kick(); }
  stopSpin() { this.spin = 0; }
  kick() { if (!this.raf && this.host) this.raf = requestAnimationFrame(t => this.frameTick(t)); }
  frameTick(now) {
    this.raf = 0;
    if (this.lost) return; // (background tabs already pause requestAnimationFrame)
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    let more = false;
    const still = this.reduceMotion;   // Calm switched on: finish every move at once
    for (const [id, tw] of this.tweens) {
      const k = still ? 1 : Math.min(1, (now - tw.t0) / tw.ms);
      const e = tw.ease ? tw.ease(k) : k;
      if (typeof tw.from === 'number') tw.fn(tw.from + (tw.to - tw.from) * e); else tw.fn(e);
      if (id !== 'cam') this.shadowDirty = true;
      if (k >= 1) this.tweens.delete(id); else more = true;
    }
    if (this.spin && !still) {
      const off = this.camera.position.clone().sub(this.controls.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.18);
      this.camera.position.copy(this.controls.target).add(off); more = true;
    }
    if (!this.walking && this.controls.update()) more = true;   // walk mode steers the camera itself
    this.U.uTime.value = now / 1000;
    const ghostOn = this.U.uGhostLayer.value >= 0 && this.ghost;
    if (this.ghost) { this.ghost.visible = !!ghostOn; this.ghost2.visible = !!ghostOn; }
    if (this.shadowRT && this.shadowDirty && this.group) {
      this.shadowDirty = false;
      const vis = [this.trans.visible, this.ghost.visible, this.ghost2.visible];
      this.trans.visible = this.ghost.visible = this.ghost2.visible = false;
      this.opaque.material = this.mats.depth;
      this.renderer.setRenderTarget(this.shadowRT); this.renderer.clear(); this.renderer.render(this.scene, this.sunCam);
      this.renderer.setRenderTarget(null);
      this.opaque.material = this.mats.opaque;
      [this.trans.visible, this.ghost.visible, this.ghost2.visible] = vis;
    }
    this.renderer.render(this.scene, this.camera);
    this.placeMarkerLabels();
    if (this.onFrame) this.onFrame();
    if (more || ghostOn) this.kick();
  }
  snapshot(type = 'image/png') {
    // render and read back in the same task (no preserveDrawingBuffer needed)
    this.renderer.render(this.scene, this.camera);
    return new Promise(res => this.canvas.toBlob(res, type));
  }
}

// ---------------------------------------------------------------- picking
// Exact: step through the voxel grid (Amanatides & Woo) and test each block's boxes,
// using the same placed() rule as the shader.
class Picker {
  constructor(stage) { this.s = stage; }
  placed(e) {
    const U = this.s.U;
    const tierA = U.uTierA.value, reveal = U.uReveal.value, cut = U.uCut.value, minY = U.uMinY.value;
    if (e.t0 > tierA + 0.01 || e.t1 <= tierA + 0.01) return false;
    const layer = e.y - minY;
    if (layer > cut + 0.5) return false;
    return (reveal - layer) - e.s * 0.55 > 0.2;
  }
  pick(clientX, clientY) {
    const s = this.s; if (!s.mesh) return null;
    const rect = s.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, s.camera);
    const o = ray.ray.origin.clone().add(s.center), d = ray.ray.direction.clone();
    const ex = s.U.uExplode.value, minY = s.minY;
    let best = null;
    // with an exploded view each layer is shifted, so test layers one by one; otherwise one DDA
    const [x0, y0, z0, x1, y1, z1] = s.data.bounds;
    const steps = Math.ceil((s.radius * 6) / 0.05);
    let t = 0;
    for (let i = 0; i < steps && t < s.radius * 8 + 400; i++, t += 0.05) {
      const p = o.clone().addScaledVector(d, t);
      let y = p.y;
      if (ex > 0) { const ly = Math.floor((y - minY) / (1 + ex)); y = p.y - ly * ex; }
      const cx = Math.floor(p.x), cy = Math.floor(y), cz = Math.floor(p.z);
      if (cx < x0 - 1 || cx > x1 + 1 || cz < z0 - 1 || cz > z1 + 1 || cy > y1 + 1) continue;
      if (cy < Math.min(y0, -1) - 1) break;
      const list = s.mesh.idx.at(cx, cy, cz);
      if (!list) continue;
      for (const e of list) {
        if (!this.placed(e)) continue;
        const pe = s.data.palette[e.p], m = s.reg.models[pe.m];
        const lx = p.x - cx, ly = y - cy, lz = p.z - cz;
        for (const b of m.b) {
          if (lx >= b[0] / 16 - 0.03 && lx <= b[3] / 16 + 0.03 && ly >= b[1] / 16 - 0.03 && ly <= b[4] / 16 + 0.03 && lz >= b[2] / 16 - 0.03 && lz <= b[5] / 16 + 0.03) { best = e; break; }
        }
        if (best) break;
      }
      if (best) break;
    }
    if (!best) return null;
    const pe = s.data.palette[best.p];
    return { x: best.x, y: best.y, z: best.z, layer: best.y - minY, item: pe.i, block: pe.b, palette: best.p, icon: pe.ic };
  }
}
