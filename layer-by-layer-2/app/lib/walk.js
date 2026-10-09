// Walk Inside: shrink to player size and explore a finished build in first person.
// Touch: left thumb joystick to walk, drag anywhere else to look, a Jump button.
// Keyboard: WASD or arrows, Space to jump, drag the mouse to look. Game controller: sticks + A.
// Sizes and speeds match Minecraft: a 0.6 x 1.8 block player, eyes at 1.62, walking 4.317 blocks a second.
import { icon, calm } from './ui.js';

const W = 0.3, HEIGHT = 1.8, EYE = 1.62, SPEED = 4.317, JUMP = 8.4, GRAVITY = 28, STEP = 0.6;
// shapes you can walk through (you would open a door in the game; small things you'd walk over)
const SOFT = new Set(['door', 'gate', 'trapdoor_open', 'carpet', 'flower', 'tuft', 'crop', 'torch', 'button', 'lever', 'plate', 'dust', 'panel', 'ladder', 'lantern', 'pot', 'rail', 'cushion', 'leaf_litter', 'petals', 'wildflowers', 'item_frame', 'candle', 'sea_pickle', 'coral_fan', 'kelp', 'seagrass', 'hanging_moss', 'chain']);

export function startWalk(stage, opts = {}) {
  const host = stage.host, cam = stage.camera, ctl = stage.controls;
  const data = stage.data, idx = stage.mesh.idx, ground = stage.mesh.ground, reg = stage.reg;
  const tier = () => stage.U.uTierA.value;
  const off = stage.group.position.clone();                 // world = cell + off
  const [x0, y0, z0, x1, y1, z1] = data.bounds;
  const gx0 = x0 - ground.margin, gx1 = x1 + 1 + ground.margin, gz0 = z0 - ground.margin, gz1 = z1 + 1 + ground.margin;
  const saved = { pos: cam.position.clone(), target: ctl.target.clone(), fov: cam.fov, near: cam.near };
  ctl.enabled = false; stage.autoSpin(false); stage.walking = true;
  cam.fov = 70; cam.near = 0.05; cam.updateProjectionMatrix();

  // solid boxes in one cell (cell coordinates)
  function boxesAt(x, y, z) {
    const out = [], t = tier();
    const list = idx.at(x, y, z);
    let here = false;   // a block of this size stands in this cell
    if (list) for (const e of list) {
      if (e.t0 > t + 0.01 || e.t1 <= t + 0.01) continue;
      here = true;
      const pe = data.palette[e.p], s = pe.st && pe.st.s;
      if (SOFT.has(s) || pe.b === 'water' || pe.b === 'lava') continue;
      for (const b of reg.models[pe.m].b) out.push([x + b[0] / 16, y + b[1] / 16, z + b[2] / 16, x + b[3] / 16, y + Math.max(b[4], s === 'fence' || s === 'wall' ? 24 : 0) / 16, z + b[5] / 16]);
    }
    // no block of this size here: the grass is (a Legend-only pond is still solid ground at Starter)
    if (!here) { const g = ground.at(x, y, z, Math.round(t)); if (g && g.b !== 'water') out.push([x, y, z, x + 1, y + 1, z + 1]); }
    return out;
  }
  // player feet position in cell coordinates
  const p = { x: (x0 + x1 + 1) / 2, y: 0, z: z1 + 2.5, vy: 0, yaw: 0, pitch: -0.08, onGround: false };
  // start on top of whatever is under the spawn point, facing the build
  for (let y = y1 + 2; y >= -3; y--) { if (boxesAt(Math.floor(p.x), y, Math.floor(p.z)).length) { p.y = y + 1; break; } }
  function hits(ax0, ay0, az0, ax1, ay1, az1) {
    const res = [];
    for (let x = Math.floor(ax0); x <= Math.floor(ax1); x++) for (let y = Math.floor(ay0); y <= Math.floor(ay1); y++) for (let z = Math.floor(az0); z <= Math.floor(az1); z++)
      for (const b of boxesAt(x, y, z)) if (ax0 < b[3] && ax1 > b[0] && ay0 < b[4] && ay1 > b[1] && az0 < b[5] && az1 > b[2]) res.push(b);
    return res;
  }
  const blocked = (x, y, z) => hits(x - W, y + 0.001, z - W, x + W, y + HEIGHT, z + W).length > 0;
  function moveAxis(axis, d) {
    if (!d) return;
    const n = { ...p }; n[axis] += d;
    if (!blocked(n.x, n.y, n.z)) { p[axis] = n[axis]; return; }
    // step up onto a slab, stair or block edge (like the game's auto step)
    if (p.onGround) for (const up of [0.5, STEP, 1.0]) {
      if (up > STEP && up > 0.51) break;
      if (!blocked(n.x, n.y + up, n.z) && !blocked(p.x, p.y + up, p.z)) { p.y += up; p[axis] = n[axis]; return; }
    }
  }

  // ---------------------------------------------------------------- controls
  const ui = document.createElement('div'); ui.className = 'walk-ui';
  ui.innerHTML = `<div class="walk-help">Drag to look · ${matchMedia('(pointer:coarse)').matches ? 'Thumb stick to walk' : 'W A S D to walk, Space to jump'}</div>
    <div class="walk-stick" aria-hidden="true"><i></i></div>
    <button class="walk-jump" type="button" aria-label="Jump">Jump</button>
    <button class="walk-exit tool" type="button" aria-label="Stop walking">${icon('close')}</button>
    <div class="walk-cross" aria-hidden="true"></div>`;
  host.appendChild(ui);
  const stick = ui.querySelector('.walk-stick'), knob = stick.querySelector('i');
  const keys = new Set();
  let move = { x: 0, z: 0 }, stickId = null, lookId = null, last = null, jumpQ = false;
  const onKey = e => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault(); if (e.type === 'keydown') { keys.add(k); if (k === ' ') jumpQ = true; } else keys.delete(k);
    }
    if (k === 'escape' && e.type === 'keydown') stop();
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  const canvas = stage.canvas;
  const down = e => {
    if (e.target.closest('.walk-jump,.walk-exit')) return;
    const r = stick.getBoundingClientRect();
    if (e.pointerType !== 'mouse' && stickId === null && e.clientX < host.getBoundingClientRect().left + host.clientWidth * 0.4 && e.clientY > host.getBoundingClientRect().top + host.clientHeight * 0.45) {
      stickId = e.pointerId; stick.classList.add('on'); stick.style.left = (e.clientX - host.getBoundingClientRect().left - r.width / 2) + 'px';
      stick.style.top = (e.clientY - host.getBoundingClientRect().top - r.height / 2) + 'px'; stick._c = [e.clientX, e.clientY];
    } else if (lookId === null) { lookId = e.pointerId; last = [e.clientX, e.clientY]; }
    try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
  };
  const mv = e => {
    if (e.pointerId === stickId) {
      const dx = e.clientX - stick._c[0], dy = e.clientY - stick._c[1], R = 46, L = Math.min(R, Math.hypot(dx, dy)) / R, a = Math.atan2(dy, dx);
      move = { x: Math.cos(a) * L, z: Math.sin(a) * L };
      knob.style.transform = `translate(${Math.cos(a) * L * R}px, ${Math.sin(a) * L * R}px)`;
    } else if (e.pointerId === lookId && last) {
      p.yaw -= (e.clientX - last[0]) * 0.006; p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - (e.clientY - last[1]) * 0.006));
      last = [e.clientX, e.clientY];
    }
  };
  const up = e => {
    if (e.pointerId === stickId) { stickId = null; move = { x: 0, z: 0 }; knob.style.transform = ''; stick.classList.remove('on'); stick.style.left = stick.style.top = ''; }
    if (e.pointerId === lookId) { lookId = null; last = null; }
  };
  canvas.addEventListener('pointerdown', down); addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  ui.querySelector('.walk-jump').addEventListener('pointerdown', e => { e.preventDefault(); jumpQ = true; });
  ui.querySelector('.walk-exit').addEventListener('click', () => stop());

  // ---------------------------------------------------------------- loop
  let raf = 0, t0 = performance.now(), running = true;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    let fx = 0, fz = 0;
    if (keys.has('w') || keys.has('arrowup')) fz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) fz += 1;
    if (keys.has('a') || keys.has('arrowleft')) fx -= 1;
    if (keys.has('d') || keys.has('arrowright')) fx += 1;
    fx += move.x; fz += move.z;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (pads[0]) {
      const a = pads[0].axes, dz = v => Math.abs(v) < 0.15 ? 0 : v;
      fx += dz(a[0]); fz += dz(a[1]); p.yaw -= dz(a[2] || 0) * dt * 2.6; p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - dz(a[3] || 0) * dt * 2));
      if (pads[0].buttons[0] && pads[0].buttons[0].pressed) jumpQ = true;
    }
    const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
    const sp = SPEED * (calm() ? 0.7 : 1) * dt, s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    moveAxis('x', (fx * c + fz * s) * sp);
    moveAxis('z', (-fx * s + fz * c) * sp);
    if (jumpQ && p.onGround) p.vy = JUMP;
    jumpQ = false;
    p.vy -= GRAVITY * dt;
    const ny = p.y + p.vy * dt;
    if (blocked(p.x, ny, p.z)) { if (p.vy < 0) { p.onGround = true; const h = hits(p.x - W, ny, p.z - W, p.x + W, p.y, p.z + W); p.y = h.length ? Math.max(...h.map(b => b[4])) : p.y; } p.vy = 0; }
    else { p.y = ny; p.onGround = false; }
    if (p.y < -12) { p.x = (x0 + x1 + 1) / 2; p.z = z1 + 2.5; p.y = 2; p.vy = 0; }   // fell off the island: back to the start
    p.x = Math.max(gx0 + W, Math.min(gx1 - W, p.x)); p.z = Math.max(gz0 + W, Math.min(gz1 - W, p.z));
    cam.position.set(p.x + off.x, p.y + EYE, p.z + off.z);
    cam.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    stage.kick(); raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function stop() {
    if (!running) return; running = false; cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
    canvas.removeEventListener('pointerdown', down); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    ui.remove();
    cam.fov = saved.fov; cam.near = saved.near; cam.updateProjectionMatrix();
    stage.walking = false;
    cam.position.copy(saved.pos); ctl.target.copy(saved.target); ctl.enabled = true; ctl.update(); stage.kick();
    opts.onExit && opts.onExit();
  }
  return { stop };
}
