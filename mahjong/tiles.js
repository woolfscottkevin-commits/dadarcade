/* =====================================================================
   Mahjong Garden — shared by the Solitaire and American Mah Jongg pages:
   utilities, the hand-painted tile art, garden scenes, drifting ambient
   life, and the synthesized sound.

   A page that loads this defines these globals before calling into it:
     settings  { theme, sound, music, calm }
     cv, cx    canvases/contexts with an .amb entry (cv.amb._s = its scale)
     VW, VH    viewport size;  FXS = makeFxSprites(THEMES[settings.theme])
   ===================================================================== */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outQuint: t => 1 - Math.pow(1 - t, 5),
};
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffleArr(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
function fmtTime(s) {
  s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), r = s % 60;
  if (m >= 60) return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  return m + ':' + String(r).padStart(2, '0');
}
function dateKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/* =====================================================================
   Tile art — every face is painted in code on a 100 × 130 canvas
   ===================================================================== */
const ART_W = 100, ART_H = 130, TILE_R = ART_H / ART_W;
const PAL = {
  red: '#c42f3d', redDk: '#8f1b28', green: '#15825a', greenDk: '#0b5a3c', blue: '#1f58a6', blueDk: '#123a75',
  ink: '#1c2238', ivory: '#fbf6ea', gold: '#c99a33', brown: '#5a3626',
};
const CJK = '"LXGW WenKai TC","Kaiti TC","STKaiti","BiauKai","KaiTi","Songti TC","PingFang TC","Noto Serif TC",serif';
const LATIN = '"Nunito Sans",-apple-system,"Segoe UI",system-ui,sans-serif';

function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function disc(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill(); }

/* --- dots --- */
function dotCoin(c, x, y, r, col, dk) {
  const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  g.addColorStop(0, lighten(col, .25)); g.addColorStop(1, dk);
  disc(c, x, y, r, g);
  disc(c, x, y, r * .8, PAL.ivory);
  disc(c, x, y, r * .66, g);
  c.fillStyle = PAL.ivory;
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; disc(c, x + Math.cos(a) * r * .43, y + Math.sin(a) * r * .43, r * .1, PAL.ivory); }
  disc(c, x, y, r * .24, PAL.ivory);
  disc(c, x, y, r * .11, col);
  c.beginPath(); c.arc(x, y, r * .9, Math.PI * 1.1, Math.PI * 1.55); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = r * .09; c.lineCap = 'round'; c.stroke();
}
function drawDots(c, n) {
  const B = [PAL.blue, PAL.blueDk], G = [PAL.green, PAL.greenDk], R = [PAL.red, PAL.redDk];
  const d = (x, y, r, k) => dotCoin(c, x, y, r, k[0], k[1]);
  switch (n) {
    case 1: {
      const x = 50, y = 65;
      disc(c, x, y, 39, PAL.greenDk); disc(c, x, y, 37, PAL.green); disc(c, x, y, 33, PAL.ivory);
      for (let k = 0; k < 14; k++) { const a = k * TAU / 14; disc(c, x + Math.cos(a) * 28, y + Math.sin(a) * 28, 3.6, PAL.red); }
      const g = c.createRadialGradient(x - 6, y - 7, 2, x, y, 23); g.addColorStop(0, lighten(PAL.blue, .25)); g.addColorStop(1, PAL.blueDk);
      disc(c, x, y, 22.5, g);
      c.fillStyle = PAL.ivory;
      for (let k = 0; k < 8; k++) { c.save(); c.translate(x, y); c.rotate(k * TAU / 8); c.beginPath(); c.ellipse(0, -12, 4.2, 8, 0, 0, TAU); c.fill(); c.restore(); }
      disc(c, x, y, 7.5, PAL.red); disc(c, x, y, 3, PAL.ivory);
      c.beginPath(); c.arc(x, y, 35, Math.PI * 1.1, Math.PI * 1.5); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2.5; c.lineCap = 'round'; c.stroke();
      break;
    }
    case 2: d(50, 36, 21, G); d(50, 94, 21, B); break;
    case 3: d(25, 29, 16.5, B); d(50, 65, 16.5, R); d(75, 101, 16.5, G); break;
    case 4: d(29, 38, 17.5, B); d(71, 38, 17.5, G); d(29, 92, 17.5, G); d(71, 92, 17.5, B); break;
    case 5: d(27, 33, 15, B); d(73, 33, 15, G); d(50, 65, 15, R); d(27, 97, 15, G); d(73, 97, 15, B); break;
    case 6: d(31, 28, 14, G); d(69, 28, 14, G); d(31, 68, 14, R); d(69, 68, 14, R); d(31, 103, 14, R); d(69, 103, 14, R); break;
    case 7: d(24, 21, 11.5, G); d(50, 35, 11.5, G); d(76, 49, 11.5, G); d(31, 78, 13, R); d(69, 78, 13, R); d(31, 108, 13, R); d(69, 108, 13, R); break;
    case 8: for (let i = 0; i < 4; i++) { d(31, 21 + i * 29.5, 13, B); d(69, 21 + i * 29.5, 13, B); } break;
    case 9: { const cols = [B, R, G]; for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) d(21 + k * 29, 29 + r * 36, 12.5, cols[r]); break; }
  }
}

/* --- bamboo --- */
function stick(c, x, y, len, w, col, dk, ang = 0) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const h = len / 2;
  const g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, dk); g.addColorStop(.35, lighten(col, .3)); g.addColorStop(.6, col); g.addColorStop(1, dk);
  rrect(c, -w / 2, -h, w, len, w * .48); c.fillStyle = g; c.fill();
  c.strokeStyle = dk; c.lineWidth = w * .16; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -h + w * .75); c.lineTo(0, -w * .45); c.moveTo(0, w * .45); c.lineTo(0, h - w * .75); c.stroke();
  // joints: one in the middle, and a cap at each end
  const band = (yy, ww, hh) => { rrect(c, -ww / 2, yy - hh / 2, ww, hh, hh / 2); c.fillStyle = dk; c.fill(); rrect(c, -ww / 2 + 1, yy - hh / 2 + .6, ww - 2, hh * .45, hh / 3); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill(); };
  band(0, w * 1.18, w * .34); band(-h + w * .28, w * 1.05, w * .28); band(h - w * .28, w * 1.05, w * .28);
  c.restore();
}
function drawBird(c) {
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // tail plumes
  const plume = (x1, y1, cx, cy, x2, y2, col) => {
    c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.strokeStyle = PAL.greenDk; c.lineWidth = 2.2; c.stroke();
    c.save(); c.translate(x2, y2);
    c.beginPath(); c.ellipse(0, 0, 7.5, 9.5, Math.atan2(y2 - cy, x2 - cx) + Math.PI / 2, 0, TAU); c.fillStyle = PAL.green; c.fill();
    disc(c, 0, 0, 5.2, col); disc(c, 0, 0, 2.2, PAL.ivory); c.restore();
  };
  plume(44, 80, 24, 82, 16, 110, PAL.blue);
  plume(46, 82, 34, 98, 34, 118, PAL.red);
  plume(42, 76, 18, 70, 12, 88, PAL.red);
  plume(48, 84, 50, 104, 54, 120, PAL.blue);
  // legs
  c.strokeStyle = PAL.red; c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(56, 82); c.lineTo(54, 102); c.lineTo(48, 106); c.moveTo(54, 102); c.lineTo(58, 107);
  c.moveTo(64, 80); c.lineTo(66, 100); c.lineTo(61, 105); c.moveTo(66, 100); c.lineTo(71, 104); c.stroke();
  // body
  const bg = c.createLinearGradient(40, 50, 80, 90); bg.addColorStop(0, lighten(PAL.green, .25)); bg.addColorStop(1, PAL.greenDk);
  c.beginPath(); c.moveTo(42, 78); c.bezierCurveTo(40, 58, 58, 50, 70, 52); c.bezierCurveTo(80, 54, 82, 72, 74, 82); c.bezierCurveTo(64, 92, 48, 90, 42, 78); c.fillStyle = bg; c.fill();
  // wing
  c.beginPath(); c.moveTo(50, 70); c.bezierCurveTo(54, 58, 68, 58, 72, 66); c.bezierCurveTo(68, 78, 56, 84, 46, 84); c.closePath(); c.fillStyle = PAL.blue; c.fill();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(54, 74); c.lineTo(66, 66); c.moveTo(52, 79); c.lineTo(65, 72); c.moveTo(51, 83); c.lineTo(61, 78); c.stroke();
  // neck & head
  c.beginPath(); c.moveTo(66, 56); c.quadraticCurveTo(66, 44, 72, 38); c.lineTo(80, 42); c.quadraticCurveTo(76, 50, 76, 58); c.closePath(); c.fillStyle = PAL.green; c.fill();
  disc(c, 75, 36, 9.5, PAL.green);
  // crest
  c.strokeStyle = PAL.red; c.lineWidth = 1.8;
  for (const [dx, dy] of [[-4, -14], [0, -16], [4, -14]]) { c.beginPath(); c.moveTo(75, 28); c.lineTo(75 + dx, 28 + dy + 10); c.stroke(); disc(c, 75 + dx, 28 + dy + 9, 2.2, PAL.red); }
  // beak & eye
  c.beginPath(); c.moveTo(83, 33); c.lineTo(93, 37); c.lineTo(83, 40); c.closePath(); c.fillStyle = '#e0892a'; c.fill();
  disc(c, 77, 34, 3.4, PAL.ivory); disc(c, 77.8, 34, 1.8, PAL.ink);
  disc(c, 72, 40, 2.6, PAL.red);
  c.restore();
}
function drawBamboo(c, n) {
  const G = [PAL.green, PAL.greenDk], B = [PAL.blue, PAL.blueDk], R = [PAL.red, PAL.redDk];
  const s = (x, y, len, k, a = 0, w = 10) => stick(c, x, y, len, w, k[0], k[1], a);
  switch (n) {
    case 1: drawBird(c); break;
    case 2: s(50, 37, 46, B, 0, 12); s(50, 93, 46, G, 0, 12); break;
    case 3: s(50, 37, 46, B, 0, 11); s(30, 93, 46, G, 0, 11); s(70, 93, 46, G, 0, 11); break;
    case 4: s(30, 37, 46, G, 0, 11); s(70, 37, 46, B, 0, 11); s(30, 93, 46, B, 0, 11); s(70, 93, 46, G, 0, 11); break;
    case 5: s(24, 37, 46, G); s(76, 37, 46, B); s(50, 65, 46, R); s(24, 93, 46, B); s(76, 93, 46, G); break;
    case 6: for (let k = 0; k < 3; k++) { s(24 + k * 26, 37, 46, G); s(24 + k * 26, 93, 46, B); } break;
    case 7: s(50, 22, 30, R, 0, 9.5); for (let k = 0; k < 3; k++) { s(24 + k * 26, 64, 34, G, 0, 9.5); s(24 + k * 26, 106, 34, B, 0, 9.5); } break;
    case 8: {
      const t = .38;
      s(15, 37, 44, G, 0, 9); s(85, 37, 44, G, 0, 9); s(38, 37, 46, G, t, 9); s(62, 37, 46, G, -t, 9);
      s(15, 93, 44, B, 0, 9); s(85, 93, 44, B, 0, 9); s(38, 93, 46, B, -t, 9); s(62, 93, 46, B, t, 9);
      break;
    }
    case 9: for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) s(23 + k * 27, 25 + r * 40, 33, k === 1 ? R : (r === 1 ? B : G), 0, 9.5); break;
  }
}

/* --- characters, winds, dragons --- */
function glyph(c, ch, x, y, size, col, shadow = true) {
  c.font = `700 ${size}px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (shadow) { c.fillStyle = 'rgba(80,50,20,.18)'; c.fillText(ch, x + size * .02, y + size * .03); }
  c.fillStyle = col; c.fillText(ch, x, y);
}
const NUMS = '一二三四五六七八九';
function drawCharacter(c, n) {
  glyph(c, NUMS[n - 1], 50, 38, n === 1 ? 50 : 48, PAL.ink);
  glyph(c, '萬', 50, 94, 52, PAL.red);
}
function drawWind(c, k) { glyph(c, '東南西北'[k], 50, 68, 76, PAL.ink); }
function drawDragon(c, k) {
  if (k === 0) glyph(c, '中', 50, 68, 88, PAL.red);
  else if (k === 1) glyph(c, '發', 50, 68, 80, PAL.green);
  else {
    c.lineJoin = 'round';
    rrect(c, 16, 17, 68, 96, 6); c.lineWidth = 6; c.strokeStyle = PAL.blue; c.stroke();
    rrect(c, 25, 26, 50, 78, 3); c.lineWidth = 2.2; c.strokeStyle = PAL.blue; c.stroke();
    c.fillStyle = PAL.blue;
    for (const [x, y] of [[25, 26], [75, 26], [25, 104], [75, 104]]) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillRect(-3.4, -3.4, 6.8, 6.8); c.restore(); }
  }
}

/* --- flowers & seasons --- */
function blossom(c, x, y, r, petal, centre, notched) {
  for (let k = 0; k < 5; k++) {
    c.save(); c.translate(x, y); c.rotate(k * TAU / 5 - Math.PI / 2);
    c.beginPath();
    if (notched) { c.moveTo(0, 0); c.bezierCurveTo(-r * .75, -r * .25, -r * .6, -r * 1.05, -r * .12, -r * .98); c.lineTo(0, -r * .82); c.lineTo(r * .12, -r * .98); c.bezierCurveTo(r * .6, -r * 1.05, r * .75, -r * .25, 0, 0); }
    else { c.ellipse(0, -r * .5, r * .44, r * .52, 0, 0, TAU); }
    const g = c.createLinearGradient(0, 0, 0, -r); g.addColorStop(0, centre); g.addColorStop(.55, petal); g.addColorStop(1, lighten(petal, .35));
    c.fillStyle = g; c.fill(); c.restore();
  }
  disc(c, x, y, r * .2, '#e9b23c');
  c.fillStyle = '#b8661c';
  for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + .3; disc(c, x + Math.cos(a) * r * .32, y + Math.sin(a) * r * .32, r * .06, '#b8661c'); }
}
function branch(c, pts, w, col) {
  c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    c.lineWidth = lerp(w, w * .35, i / (pts.length - 1));
    c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
  }
}
function leaf(c, x, y, len, wid, ang, col, vein = true) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * .45, 0, -len); c.quadraticCurveTo(-wid, -len * .45, 0, 0);
  const g = c.createLinearGradient(-wid, 0, wid, 0); g.addColorStop(0, lighten(col, .2)); g.addColorStop(1, darken(col, .2));
  c.fillStyle = g; c.fill();
  if (vein) { c.beginPath(); c.moveTo(0, -len * .08); c.lineTo(0, -len * .9); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .9; c.stroke(); }
  c.restore();
}
function seasonFrame(c, flower, n) {
  const col = flower ? '#d0617d' : '#3f76bd';
  rrect(c, 8, 8, 84, 114, 9); c.lineWidth = 2.4; c.strokeStyle = col; c.stroke();
  rrect(c, 12, 12, 76, 106, 6); c.lineWidth = .8; c.strokeStyle = col; c.globalAlpha = .55; c.stroke(); c.globalAlpha = 1;
  const label = flower ? '梅蘭菊竹'[n] : '春夏秋冬'[n];
  glyph(c, label, 76, 25, 21, flower ? PAL.red : PAL.blue, false);
  c.font = `800 15px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = flower ? PAL.red : PAL.blue;
  c.fillText(String(n + 1), 22, 24);
}
function drawFlower(c, k) {
  seasonFrame(c, true, k);
  c.lineCap = 'round';
  if (k === 0) { // plum
    branch(c, [[18, 118], [30, 98], [28, 80], [44, 62], [58, 44]], 7, PAL.brown);
    branch(c, [[44, 62], [64, 70], [80, 64]], 4, PAL.brown);
    branch(c, [[30, 98], [48, 100], [62, 94]], 3.5, PAL.brown);
    blossom(c, 58, 44, 13, '#e2465f', '#a3162f'); blossom(c, 78, 64, 11, '#e2465f', '#a3162f');
    blossom(c, 30, 78, 10, '#ea6b80', '#a3162f'); blossom(c, 62, 94, 8.5, '#ea6b80', '#a3162f');
    disc(c, 46, 98, 3.2, '#c22e47'); disc(c, 70, 40, 2.8, '#c22e47'); disc(c, 40, 60, 2.6, '#c22e47');
  } else if (k === 1) { // orchid
    const lf = (x1, y1, cx, cy, x2, y2, w) => { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.quadraticCurveTo(cx + w, cy + w * .6, x1 + w * .4, y1); c.fillStyle = '#2c7d46'; c.fill(); };
    lf(48, 120, 20, 80, 14, 40, 5); lf(52, 120, 80, 86, 88, 52, -5); lf(50, 120, 36, 90, 30, 70, 4); lf(52, 120, 70, 100, 82, 98, -3);
    c.strokeStyle = '#3d8f55'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(52, 118); c.quadraticCurveTo(56, 80, 58, 58); c.stroke();
    const pet = (x, y, len, w, a, col) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, -len / 2, w, len / 2, 0, 0, TAU); const g = c.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, '#5b2a7e'); g.addColorStop(1, col); c.fillStyle = g; c.fill(); c.restore(); };
    const fx = 58, fy = 52;
    pet(fx, fy, 24, 6, 0, '#b37ad6'); pet(fx, fy, 23, 6, -1.9, '#b37ad6'); pet(fx, fy, 23, 6, 1.9, '#b37ad6');
    pet(fx, fy, 17, 6, -.85, '#c896e6'); pet(fx, fy, 17, 6, .85, '#c896e6');
    c.beginPath(); c.ellipse(fx, fy + 6, 5.5, 7, 0, 0, TAU); c.fillStyle = '#f4ecf8'; c.fill();
    for (const [dx, dy] of [[-2, 4], [2, 6], [-1, 9], [2, 10]]) disc(c, fx + dx, fy + dy, 1.1, '#9b2f5c');
    pet(36, 72, 12, 4, -.5, '#b37ad6'); pet(36, 72, 12, 4, .4, '#c896e6');
  } else if (k === 2) { // chrysanthemum
    c.strokeStyle = '#2f7d43'; c.lineWidth = 3; c.beginPath(); c.moveTo(50, 80); c.quadraticCurveTo(46, 100, 50, 120); c.stroke();
    leaf(c, 49, 104, 26, 9, -1.1, '#2f7d43'); leaf(c, 50, 96, 24, 8, 1.15, '#2f7d43');
    const cx = 50, cy = 56;
    for (let layer = 0; layer < 3; layer++) {
      const n = 18 - layer * 4, len = 26 - layer * 7, col = ['#e08e12', '#efae22', '#f8cd4a'][layer];
      for (let i = 0; i < n; i++) {
        c.save(); c.translate(cx, cy); c.rotate(i * TAU / n + layer * .2);
        c.beginPath(); c.ellipse(0, -len * .55, 3.6 - layer * .4, len * .5, 0, 0, TAU);
        const g = c.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, '#b45f0a'); g.addColorStop(1, col);
        c.fillStyle = g; c.fill(); c.restore();
      }
    }
    disc(c, cx, cy, 5, '#a8540c');
  } else { // bamboo flower
    const stalk = (x1, y1, x2, y2, w) => {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const ax = lerp(x1, x2, i / n), ay = lerp(y1, y2, i / n), bx = lerp(x1, x2, (i + 1) / n), by = lerp(y1, y2, (i + 1) / n);
        c.strokeStyle = '#3f9a52'; c.lineWidth = w; c.lineCap = 'butt'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        c.strokeStyle = '#1f6b34'; c.lineWidth = w + 2; c.beginPath(); const ux = (bx - ax) * .04, uy = (by - ay) * .04; c.moveTo(bx - ux, by - uy); c.lineTo(bx + ux, by + uy); c.stroke();
      }
    };
    stalk(40, 122, 52, 18, 7); stalk(64, 122, 70, 46, 5);
    for (const [x, y, a, l] of [[52, 40, -.9, 30], [52, 40, -1.6, 26], [50, 62, .9, 30], [50, 62, 1.5, 24], [68, 62, 1.0, 26], [68, 62, .4, 22], [46, 86, -1.1, 26]]) leaf(c, x, y, l, 5.5, a, '#2a7f3e');
  }
}
function drawSeason(c, k) {
  seasonFrame(c, false, k);
  c.lineCap = 'round';
  if (k === 0) { // spring: cherry blossom
    branch(c, [[16, 112], [34, 92], [46, 70], [70, 50], [84, 36]], 6, '#4b2c24');
    branch(c, [[46, 70], [40, 50], [30, 40]], 3.5, '#4b2c24');
    branch(c, [[34, 92], [58, 96], [74, 88]], 3.2, '#4b2c24');
    blossom(c, 68, 50, 12, '#f6a9bf', '#d4507a', true); blossom(c, 32, 42, 10.5, '#f8b7c9', '#d4507a', true);
    blossom(c, 74, 88, 10.5, '#f6a9bf', '#d4507a', true); blossom(c, 46, 72, 8.5, '#f8b7c9', '#d4507a', true);
    leaf(c, 84, 38, 12, 4, .8, '#5f9b4a'); leaf(c, 56, 96, 11, 4, 2.4, '#5f9b4a');
  } else if (k === 1) { // summer: lotus on its pad
    c.strokeStyle = '#4f8fc7'; c.lineWidth = 1.6;
    for (const [y, x1, x2] of [[112, 20, 44], [116, 54, 82], [106, 62, 84]]) { c.beginPath(); c.moveTo(x1, y); c.quadraticCurveTo((x1 + x2) / 2, y - 3, x2, y); c.stroke(); }
    c.beginPath(); c.ellipse(50, 96, 34, 12, 0, .35, TAU - .05); c.lineTo(50, 96); c.closePath();
    const pg = c.createLinearGradient(16, 86, 84, 108); pg.addColorStop(0, '#5aa85a'); pg.addColorStop(1, '#2a6e3a'); c.fillStyle = pg; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = .9;
    for (let a = .6; a < 6; a += .7) { c.beginPath(); c.moveTo(50, 96); c.lineTo(50 + Math.cos(a) * 30, 96 + Math.sin(a) * 10); c.stroke(); }
    const pet = (a, len, w, col) => { c.save(); c.translate(50, 80); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(w, -len * .55, 0, -len); c.quadraticCurveTo(-w, -len * .55, 0, 0); const g = c.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, '#fff3f6'); g.addColorStop(1, col); c.fillStyle = g; c.fill(); c.restore(); };
    for (const a of [-1.25, 1.25]) pet(a, 30, 11, '#ee85a8');
    for (const a of [-.75, .75]) pet(a, 38, 12, '#f08fb1');
    for (const a of [-.28, .28]) pet(a, 42, 11, '#f39bb8');
    pet(0, 44, 10, '#f5a8c2');
  } else if (k === 2) { // autumn: maple leaves under the moon
    disc(c, 64, 42, 17, 'rgba(240,200,110,.35)');
    const maple = (x, y, s, a, col) => {
      c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
      c.beginPath();
      const pts = [[0, -20], [4, -9], [12, -14], [10, -4], [19, -5], [12, 3], [15, 7], [5, 6], [3, 14], [0, 10], [-3, 14], [-5, 6], [-15, 7], [-12, 3], [-19, -5], [-10, -4], [-12, -14], [-4, -9]];
      c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath();
      const g = c.createLinearGradient(0, -20, 0, 14); g.addColorStop(0, lighten(col, .2)); g.addColorStop(1, darken(col, .2)); c.fillStyle = g; c.fill();
      c.strokeStyle = 'rgba(80,20,0,.45)'; c.lineWidth = .9;
      c.beginPath(); c.moveTo(0, 18); c.lineTo(0, -16); c.moveTo(0, 2); c.lineTo(14, -10); c.moveTo(0, 2); c.lineTo(-14, -10); c.moveTo(0, 6); c.lineTo(11, 5); c.moveTo(0, 6); c.lineTo(-11, 5); c.stroke();
      c.strokeStyle = darken(col, .3); c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, 24); c.stroke();
      c.restore();
    };
    maple(42, 58, 1.35, -.35, '#d8452a'); maple(66, 92, 1.1, .5, '#ea8a1d'); maple(32, 98, .8, -.9, '#c2361f');
  } else { // winter: snowflake & pine
    const flake = (x, y, r, w) => {
      c.save(); c.translate(x, y); c.strokeStyle = PAL.blue; c.lineWidth = w; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r);
        c.moveTo(0, -r * .55); c.lineTo(r * .22, -r * .75); c.moveTo(0, -r * .55); c.lineTo(-r * .22, -r * .75);
        c.moveTo(0, -r * .3); c.lineTo(r * .16, -r * .42); c.moveTo(0, -r * .3); c.lineTo(-r * .16, -r * .42); c.stroke();
      }
      disc(c, 0, 0, w * .9, PAL.blue); c.restore();
    };
    branch(c, [[14, 112], [40, 100], [66, 96], [88, 84]], 4, '#4b3426');
    for (let i = 0; i < 9; i++) { const t = i / 8, x = lerp(20, 84, t), y = lerp(108, 86, t) - Math.sin(t * 3) * 3; for (const a of [-2.3, -.8, 2.5]) leaf(c, x, y, 13, 1.6, a + i * .05, '#2b6e47', false); }
    c.fillStyle = '#ffffff';
    for (const [x, y, rx] of [[34, 98, 9], [58, 93, 10], [80, 84, 7]]) { c.beginPath(); c.ellipse(x, y, rx, 3.4, -.25, 0, TAU); c.fill(); }
    flake(48, 54, 24, 2.6); flake(78, 40, 8, 1.4); flake(22, 70, 7, 1.3);
  }
}

/* --- joker (American Mah Jongg) --- */
function drawJoker(c) {
  // a jewelled crown over the word, in gold and lacquer red
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const g = c.createLinearGradient(0, 22, 0, 62); g.addColorStop(0, '#f6d77a'); g.addColorStop(1, '#b8862a');
  c.beginPath(); c.moveTo(22, 60); c.lineTo(17, 28); c.lineTo(34, 44); c.lineTo(50, 20); c.lineTo(66, 44); c.lineTo(83, 28); c.lineTo(78, 60); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = '#8a5d14'; c.lineWidth = 1.6; c.stroke();
  rrect(c, 21, 58, 58, 9, 3); c.fillStyle = '#a8741f'; c.fill();
  disc(c, 50, 20, 4.2, PAL.red); disc(c, 17, 28, 3.4, PAL.blue); disc(c, 83, 28, 3.4, PAL.green);
  disc(c, 36, 62.5, 2.6, PAL.red); disc(c, 50, 62.5, 2.6, PAL.blue); disc(c, 64, 62.5, 2.6, PAL.green);
  c.font = `800 25px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(80,20,10,.18)'; c.fillText('JOKER', 50.6, 89.8);
  c.fillStyle = PAL.red; c.fillText('JOKER', 50, 89);
  c.strokeStyle = PAL.gold; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(26, 106); c.bezierCurveTo(38, 100, 44, 114, 50, 106); c.bezierCurveTo(56, 98, 62, 112, 74, 106); c.stroke();
  c.restore();
}

/* --- colour helpers --- */
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1); }
function lighten(h, t) { const [r, g, b] = hexToRgb(h); return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t); }
function darken(h, t) { const [r, g, b] = hexToRgb(h); return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t)); }

/* =====================================================================
   Tile styles. "Classic" is the hand-painted set above. The others are
   bright white acrylic with flat, playful faces and a coloured back, in
   the spirit of today's designer American sets (all our own drawings).
   ===================================================================== */
const TILE_STYLES = {
  classic: { name: 'Classic' },
  sorbet: { name: 'Sorbet', modern: true, back: ['#c43e2c', '#ef6a50', '#ff9c80'],
    dots: ['#ef4f7a', '#ff8c42', '#1fa99a', '#8b6cdb'], bams: ['#1fa99a', '#5cc06a', '#ef4f7a'],
    ink: '#2e2848', crak: '#e23c5a', red: '#e23c5a', green: '#139c74', blue: '#3d7ee0', flower: '#ef4f7a', season: '#1fa99a', gold: '#f4b43a' },
  lagoon: { name: 'Lagoon', modern: true, back: ['#0b6e68', '#13a89c', '#4fd1c5'],
    dots: ['#1d6fd0', '#12b5a5', '#f05c9b', '#f6a623'], bams: ['#12b5a5', '#1d6fd0', '#f05c9b'],
    ink: '#13294b', crak: '#e0336f', red: '#e0336f', green: '#0f9e80', blue: '#1d6fd0', flower: '#f05c9b', season: '#1d6fd0', gold: '#f6b23a' },
  lilac: { name: 'Lilac', modern: true, back: ['#6a47b0', '#9775dc', '#c3a8f0'],
    dots: ['#9a63d8', '#f27fb2', '#3fbf9b', '#ffab4c'], bams: ['#3fbf9b', '#9a63d8', '#f27fb2'],
    ink: '#33264f', crak: '#d94f8c', red: '#e04a6a', green: '#2ea886', blue: '#6a6fe0', flower: '#f27fb2', season: '#9a63d8', gold: '#f5b649' },
  sage: { name: 'Sage', modern: true, back: ['#46634c', '#6f9a78', '#a3c2a8'],
    dots: ['#6f9a78', '#6f8fb8', '#c99a4e', '#c47a7f'], bams: ['#6f9a78', '#5d8a8c', '#c99a4e'],
    ink: '#2f3a35', crak: '#b85c62', red: '#b9545c', green: '#5c8f6a', blue: '#5f7fa8', flower: '#c47a7f', season: '#6f8fb8', gold: '#c99a4e' },
};
const tileStyle = id => TILE_STYLES[id] || TILE_STYLES.classic;
// one choice for both games
const TILE_STYLE_KEY = 'mj_tile_style_v1';
const savedTileStyle = () => { const v = store.get(TILE_STYLE_KEY, 'classic'); return TILE_STYLES[v] ? v : 'classic'; };

// a flat flower made of n round petals: the outline of a modern dot
function scallop(c, x, y, r, n) {
  c.beginPath();
  for (let k = 0; k < n; k++) { const a = k * TAU / n - Math.PI / 2, px = x + Math.cos(a) * r * .56, py = y + Math.sin(a) * r * .56; c.moveTo(px + r * .44, py); c.arc(px, py, r * .44, 0, TAU); }
  c.moveTo(x + r * .62, y); c.arc(x, y, r * .62, 0, TAU);
}
function mDot(c, x, y, r, col, ctr) {
  scallop(c, x, y, r, 8); c.fillStyle = col; c.fill();
  disc(c, x, y, r * .46, '#ffffff');
  disc(c, x, y, r * .32, ctr);
  disc(c, x, y, r * .11, '#ffffff');
}
function mDots(c, n, S) {
  const P = S.dots, d = (x, y, r, i) => mDot(c, x, y, r, P[i], P[(i + 2) % 4]);
  switch (n) {
    case 1: {
      const x = 50, y = 65;
      scallop(c, x, y, 41, 12); c.fillStyle = P[0]; c.fill();
      disc(c, x, y, 27, '#ffffff');
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; disc(c, x + Math.cos(a) * 20.5, y + Math.sin(a) * 20.5, 4.4, P[1]); }
      scallop(c, x, y, 14, 6); c.fillStyle = P[2]; c.fill();
      disc(c, x, y, 4.6, '#ffffff');
      break;
    }
    case 2: d(50, 36, 21, 2); d(50, 94, 21, 0); break;
    case 3: d(25, 29, 16.5, 0); d(50, 65, 16.5, 1); d(75, 101, 16.5, 2); break;
    case 4: d(29, 38, 17.5, 0); d(71, 38, 17.5, 2); d(29, 92, 17.5, 2); d(71, 92, 17.5, 0); break;
    case 5: d(27, 33, 15, 0); d(73, 33, 15, 2); d(50, 65, 15, 1); d(27, 97, 15, 2); d(73, 97, 15, 0); break;
    case 6: for (let i = 0; i < 3; i++) { d(31, 28 + i * 37.5, 14, i ? 0 : 2); d(69, 28 + i * 37.5, 14, i ? 0 : 2); } break;
    case 7: d(24, 21, 11.5, 2); d(50, 35, 11.5, 2); d(76, 49, 11.5, 2); d(31, 78, 13, 0); d(69, 78, 13, 0); d(31, 108, 13, 0); d(69, 108, 13, 0); break;
    case 8: for (let i = 0; i < 4; i++) { d(31, 21 + i * 29.5, 13, i % 2 ? 3 : 1); d(69, 21 + i * 29.5, 13, i % 2 ? 1 : 3); } break;
    case 9: for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) d(21 + k * 29, 29 + r * 36, 12.5, r); break;
  }
}
// a flat, rounded bamboo bar with a white joint across the middle
function mBar(c, x, y, len, w, col, ang = 0) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const h = len / 2;
  rrect(c, -w / 2, -h, w, len, w / 2); c.fillStyle = col; c.fill();
  rrect(c, -w * .28, -h + w * .45, w * .2, len - w * .9, w * .1); c.fillStyle = 'rgba(255,255,255,.42)'; c.fill();
  rrect(c, -w / 2 - .6, -w * .13, w + 1.2, w * .26, w * .13); c.fillStyle = '#ffffff'; c.fill();
  c.restore();
}
function mBird(c, S) {
  const [a, b] = S.bams, P = S.dots;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // the branch it sits on
  c.strokeStyle = darken(S.gold, .35); c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(12, 106); c.quadraticCurveTo(50, 96, 90, 106); c.stroke();
  const lf = (x, y, ang) => { c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -8, 0, -17); c.quadraticCurveTo(-6, -8, 0, 0); c.fillStyle = S.green; c.fill(); c.restore(); };
  lf(22, 103, -1.1); lf(30, 101, -.3); lf(82, 104, 1.0);
  // tail feathers, each with an eye
  for (const [ang, col] of [[-2.05, P[0]], [-2.45, P[3]], [-2.85, P[1]]]) {
    c.save(); c.translate(42, 72); c.rotate(ang);
    c.beginPath(); c.ellipse(0, -21, 6.5, 22, 0, 0, TAU); c.fillStyle = col; c.fill();
    disc(c, 0, -32, 4.4, '#ffffff'); disc(c, 0, -32, 2.6, S.gold);
    c.restore();
  }
  // legs
  c.strokeStyle = S.gold; c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(52, 82); c.lineTo(50, 99); c.moveTo(61, 81); c.lineTo(62, 99); c.stroke();
  // body, belly and wing
  c.beginPath(); c.ellipse(55, 66, 22, 18, -.35, 0, TAU); c.fillStyle = a; c.fill();
  c.beginPath(); c.ellipse(60, 74, 13, 8.5, -.35, 0, TAU); c.fillStyle = lighten(a, .6); c.fill();
  c.beginPath(); c.ellipse(48, 63, 14, 8.5, -.55, 0, TAU); c.fillStyle = b; c.fill();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(40, 66); c.lineTo(52, 59); c.moveTo(43, 70); c.lineTo(55, 63); c.stroke();
  // head, crest, cheek, eye and beak
  for (const [dx, dy] of [[-5, -15], [0, -18], [5, -15]]) { c.strokeStyle = a; c.lineWidth = 1.8; c.beginPath(); c.moveTo(73, 38); c.lineTo(73 + dx, 38 + dy + 6); c.stroke(); disc(c, 73 + dx, 38 + dy + 5, 2.6, P[0]); }
  disc(c, 73, 46, 13, a);
  disc(c, 77, 52, 3.4, lighten(P[0], .35));
  disc(c, 75, 43, 3.4, '#ffffff'); disc(c, 75.8, 43, 1.9, S.ink);
  c.beginPath(); c.moveTo(84, 43); c.lineTo(95, 47.5); c.lineTo(84, 51); c.closePath(); c.fillStyle = S.gold; c.fill();
  c.restore();
}
function mBamboo(c, n, S) {
  const [G, B, R] = S.bams;
  const s = (x, y, len, col, a = 0, w = 10) => mBar(c, x, y, len, w * 1.3, col, a);
  switch (n) {
    case 1: mBird(c, S); break;
    case 2: s(50, 37, 46, B, 0, 12); s(50, 93, 46, G, 0, 12); break;
    case 3: s(50, 37, 46, B, 0, 11); s(30, 93, 46, G, 0, 11); s(70, 93, 46, G, 0, 11); break;
    case 4: s(30, 37, 46, G, 0, 11); s(70, 37, 46, B, 0, 11); s(30, 93, 46, B, 0, 11); s(70, 93, 46, G, 0, 11); break;
    case 5: s(24, 37, 46, G); s(76, 37, 46, B); s(50, 65, 46, R); s(24, 93, 46, B); s(76, 93, 46, G); break;
    case 6: for (let k = 0; k < 3; k++) { s(24 + k * 26, 37, 46, G); s(24 + k * 26, 93, 46, B); } break;
    case 7: s(50, 22, 30, R, 0, 9.5); for (let k = 0; k < 3; k++) { s(24 + k * 26, 64, 34, G, 0, 9.5); s(24 + k * 26, 106, 34, B, 0, 9.5); } break;
    case 8: {
      const t = .38;
      s(15, 37, 44, G, 0, 9); s(85, 37, 44, G, 0, 9); s(38, 37, 46, R, t, 9); s(62, 37, 46, R, -t, 9);
      s(15, 93, 44, B, 0, 9); s(85, 93, 44, B, 0, 9); s(38, 93, 46, R, -t, 9); s(62, 93, 46, R, t, 9);
      break;
    }
    case 9: for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) s(23 + k * 27, 25 + r * 40, 33, k === 1 ? R : (r === 1 ? B : G), 0, 9.5); break;
  }
}
function mCharacter(c, n, S) {
  disc(c, 50, 38, 26, lighten(S.crak, .87));
  glyph(c, NUMS[n - 1], 50, 39, n === 1 ? 46 : 40, S.ink, false);
  glyph(c, '萬', 50, 97, 50, S.crak, false);
}
function mWind(c, k, S) {
  const col = S.dots[[0, 2, 3, 1][k]];
  disc(c, 50, 55, 33, col);
  c.beginPath(); c.arc(50, 55, 27.5, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.6; c.setLineDash([3, 3.4]); c.stroke(); c.setLineDash([]);
  c.font = `900 40px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText('ESWN'[k], 50, 57);
  glyph(c, '東南西北'[k], 50, 108, 22, S.ink, false);
}
function mDragon(c, k, S) {
  if (k < 2) {
    const col = k === 0 ? S.red : S.green;
    rrect(c, 13, 15, 74, 100, 18); c.fillStyle = lighten(col, .87); c.fill();
    glyph(c, k === 0 ? '中' : '發', 50, 66, k === 0 ? 76 : 68, col, false);
    return;
  }
  // the Soap: an empty frame with a blossom at each corner
  c.lineJoin = 'round';
  rrect(c, 16, 17, 68, 96, 14); c.lineWidth = 5.5; c.strokeStyle = S.blue; c.stroke();
  rrect(c, 25, 26, 50, 78, 8); c.lineWidth = 2; c.setLineDash([4, 3.5]); c.stroke(); c.setLineDash([]);
  for (const [x, y] of [[16, 17], [84, 17], [16, 113], [84, 113]]) { scallop(c, x, y, 8, 5); c.fillStyle = S.flower; c.fill(); disc(c, x, y, 2.6, '#ffffff'); }
}
function mFrame(c, col, n) {
  rrect(c, 7, 7, 86, 116, 12); c.lineWidth = 2.2; c.strokeStyle = col; c.stroke();
  disc(c, 21, 22, 10, col);
  c.font = `900 13px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText(String(n + 1), 21, 22.5);
}
function mLeaf(c, x, y, len, wid, ang, col) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * .45, 0, -len); c.quadraticCurveTo(-wid, -len * .45, 0, 0); c.fillStyle = col; c.fill();
  c.beginPath(); c.moveTo(0, -len * .1); c.lineTo(0, -len * .85); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.stroke();
  c.restore();
}
function mStem(c, pts, col, w) {
  c.beginPath(); c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke();
}
function mFlower(c, k, S) {
  const P = S.dots, G = S.green;
  mFrame(c, S.flower, k);
  if (k === 0) { // daisy
    mStem(c, [50, 120, 46, 96, 50, 66], G, 3.2); mLeaf(c, 49, 104, 24, 8, -1.05, G); mLeaf(c, 49, 96, 20, 7, 1.1, G);
    for (let i = 0; i < 12; i++) { c.save(); c.translate(50, 56); c.rotate(i * TAU / 12); c.beginPath(); c.ellipse(0, -15, 5, 13, 0, 0, TAU); c.fillStyle = P[0]; c.fill(); c.restore(); }
    disc(c, 50, 56, 9.5, S.gold);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; disc(c, 50 + Math.cos(a) * 5, 56 + Math.sin(a) * 5, 1.3, darken(S.gold, .3)); }
  } else if (k === 1) { // tulip
    mStem(c, [50, 120, 52, 92, 50, 70], G, 3.2); mLeaf(c, 50, 118, 40, 9, -.45, G); mLeaf(c, 51, 118, 34, 8, .5, G);
    const col = P[1];
    c.beginPath(); c.moveTo(34, 46); c.quadraticCurveTo(32, 76, 50, 76); c.quadraticCurveTo(68, 76, 66, 46); c.lineTo(58, 56); c.lineTo(50, 40); c.lineTo(42, 56); c.closePath(); c.fillStyle = col; c.fill();
    c.beginPath(); c.moveTo(42, 56); c.lineTo(50, 40); c.lineTo(58, 56); c.quadraticCurveTo(56, 72, 50, 74); c.quadraticCurveTo(44, 72, 42, 56); c.fillStyle = darken(col, .15); c.fill();
    c.beginPath(); c.moveTo(38, 54); c.quadraticCurveTo(38, 68, 44, 72); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.stroke();
  } else if (k === 2) { // rose, seen from above
    mLeaf(c, 40, 82, 22, 8, -2.3, G); mLeaf(c, 62, 84, 22, 8, 2.2, G); mLeaf(c, 50, 92, 18, 7, 3.14, G);
    const col = P[3];
    disc(c, 50, 60, 25, col);
    c.strokeStyle = darken(col, .25); c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); for (let t = 0; t < 5.2 * Math.PI; t += .12) { const r = 2 + t * 1.3, x = 50 + Math.cos(t) * r, y = 60 + Math.sin(t) * r * .92; if (t === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
    c.beginPath(); c.arc(50, 60, 25, Math.PI * 1.15, Math.PI * 1.5); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2.4; c.stroke();
  } else { // hibiscus
    mStem(c, [50, 120, 44, 100, 48, 82], G, 3); mLeaf(c, 47, 108, 24, 8, -1.2, G);
    const col = P[2];
    for (let i = 0; i < 5; i++) { c.save(); c.translate(50, 60); c.rotate(i * TAU / 5); c.beginPath(); c.ellipse(0, -14, 12, 15, 0, 0, TAU); c.fillStyle = col; c.fill(); c.restore(); }
    disc(c, 50, 60, 8, darken(col, .25));
    c.strokeStyle = S.gold; c.lineWidth = 2; c.beginPath(); c.moveTo(50, 60); c.quadraticCurveTo(60, 50, 64, 38); c.stroke();
    for (const [x, y] of [[64, 38], [61, 41], [67, 41]]) disc(c, x, y, 2.2, S.gold);
  }
}
function mSeason(c, k, S) {
  const P = S.dots, G = S.green;
  mFrame(c, S.season, k);
  if (k === 0) { // spring: a sprig of blossom
    mStem(c, [24, 116, 40, 80, 70, 40], darken(S.gold, .35), 3.4); mStem(c, [42, 82, 58, 84, 72, 76], darken(S.gold, .35), 2.4);
    mLeaf(c, 52, 64, 14, 5, .9, G); mLeaf(c, 36, 96, 14, 5, -1.2, G);
    for (const [x, y, r] of [[70, 40, 13], [72, 76, 10.5], [38, 66, 9]]) { scallop(c, x, y, r, 5); c.fillStyle = lighten(P[0], .25); c.fill(); disc(c, x, y, r * .3, S.gold); }
  } else if (k === 1) { // summer: the sun
    c.fillStyle = P[1];
    for (let i = 0; i < 12; i++) { c.save(); c.translate(50, 64); c.rotate(i * TAU / 12); c.beginPath(); c.moveTo(-4.5, -26); c.lineTo(0, -37); c.lineTo(4.5, -26); c.closePath(); c.fill(); c.restore(); }
    disc(c, 50, 64, 22, S.gold);
    c.strokeStyle = S.ink; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.arc(42, 61, 3.4, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(61.4, 61); c.arc(58, 61, 3.4, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.beginPath(); c.arc(50, 67, 7, Math.PI * .15, Math.PI * .85); c.stroke();
    disc(c, 39, 69, 3, lighten(P[0], .3)); disc(c, 61, 69, 3, lighten(P[0], .3));
  } else if (k === 2) { // autumn: a maple leaf
    c.save(); c.translate(50, 62); c.scale(1.75, 1.75);
    const pts = [[0, -20], [4, -9], [12, -14], [10, -4], [19, -5], [12, 3], [15, 7], [5, 6], [3, 14], [0, 10], [-3, 14], [-5, 6], [-15, 7], [-12, 3], [-19, -5], [-10, -4], [-12, -14], [-4, -9]];
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.lineJoin = 'round'; c.fillStyle = P[1]; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 18); c.lineTo(0, -15); c.moveTo(0, 2); c.lineTo(12, -9); c.moveTo(0, 2); c.lineTo(-12, -9); c.moveTo(0, 6); c.lineTo(10, 5); c.moveTo(0, 6); c.lineTo(-10, 5); c.stroke();
    c.strokeStyle = darken(P[1], .3); c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, 24); c.stroke();
    c.restore();
  } else { // winter: a snowflake
    c.save(); c.translate(50, 64); c.strokeStyle = S.season; c.lineWidth = 3.2; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -32);
      c.moveTo(0, -18); c.lineTo(8, -26); c.moveTo(0, -18); c.lineTo(-8, -26); c.moveTo(0, -8); c.lineTo(5, -13); c.moveTo(0, -8); c.lineTo(-5, -13); c.stroke();
      disc(c, 0, -34, 3, P[0]);
    }
    disc(c, 0, 0, 5, P[0]); c.restore();
  }
}
// the joker: a jester's cap with bells
function mJoker(c, S) {
  const P = S.dots;
  c.save(); c.lineJoin = 'round';
  const lobe = (path, col) => { c.beginPath(); path(); c.closePath(); c.fillStyle = col; c.fill(); };
  lobe(() => { c.moveTo(24, 64); c.quadraticCurveTo(13, 52, 12, 31); c.quadraticCurveTo(34, 40, 44, 64); }, P[0]);
  lobe(() => { c.moveTo(56, 64); c.quadraticCurveTo(66, 40, 88, 31); c.quadraticCurveTo(87, 52, 76, 64); }, P[2]);
  lobe(() => { c.moveTo(35, 64); c.quadraticCurveTo(40, 36, 50, 15); c.quadraticCurveTo(60, 36, 65, 64); }, P[1]);
  for (const [x, y] of [[12, 31], [50, 15], [88, 31]]) { disc(c, x, y, 5.6, S.gold); disc(c, x - 1.6, y - 1.8, 1.7, 'rgba(255,255,255,.8)'); }
  rrect(c, 21, 60, 58, 11, 5); c.fillStyle = P[3]; c.fill();
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) { const x = 29 + i * 10.5; c.beginPath(); c.moveTo(x, 62); c.lineTo(x + 3.2, 65.5); c.lineTo(x, 69); c.lineTo(x - 3.2, 65.5); c.closePath(); c.fill(); }
  c.font = `900 24px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = S.crak; c.fillText('JOKER', 50, 91);
  const star = (x, y, r, col) => { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fillStyle = col; c.fill(); };
  star(22, 111, 6, S.gold); star(78, 111, 6, S.gold); star(50, 113, 4, P[2]);
  c.restore();
}

/* --- one face, with an optional corner index for easy reading --- */
const SUIT_COL = [PAL.blue, PAL.green, PAL.red];
function paintFace(c, f, indices, S = TILE_STYLES.classic) {
  const kind = f < 9 ? 0 : f < 18 ? 1 : f < 27 ? 2 : f < 31 ? 3 : f < 34 ? 4 : f < 38 ? 5 : f < 42 ? 6 : 7;
  const showIdx = indices && kind <= 4;
  c.save();
  if (showIdx) { c.translate(56, 70); c.scale(.88, .9); c.translate(-50, -65); }
  if (S.modern) {
    if (kind === 0) mDots(c, f + 1, S);
    else if (kind === 1) mBamboo(c, f - 8, S);
    else if (kind === 2) mCharacter(c, f - 17, S);
    else if (kind === 3) mWind(c, f - 27, S);
    else if (kind === 4) mDragon(c, f - 31, S);
    else if (kind === 5) mFlower(c, f - 34, S);
    else if (kind === 6) mSeason(c, f - 38, S);
    else mJoker(c, S);
  }
  else if (kind === 0) drawDots(c, f + 1);
  else if (kind === 1) drawBamboo(c, f - 8);
  else if (kind === 2) drawCharacter(c, f - 17);
  else if (kind === 3) drawWind(c, f - 27);
  else if (kind === 4) drawDragon(c, f - 31);
  else if (kind === 5) drawFlower(c, f - 34);
  else if (kind === 6) drawSeason(c, f - 38);
  else drawJoker(c);
  c.restore();
  if (showIdx) {
    // dragons get a D in their own colour, the way the card writes them
    const txt = kind === 4 ? 'D' : kind === 3 ? 'ESWN'[f - 27] : String(kind === 0 ? f + 1 : kind === 1 ? f - 8 : f - 17);
    c.font = `800 19px ${LATIN}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = S.modern
      ? (kind === 4 ? [S.red, S.green, S.blue][f - 31] : kind === 3 ? S.ink : [S.dots[0], S.bams[0], S.crak][kind])
      : (kind === 4 ? [PAL.red, PAL.green, PAL.blue][f - 31] : kind === 3 ? PAL.ink : SUIT_COL[kind]);
    c.fillText(txt, 13, 15);
  }
}

/* =====================================================================
   Tile sprites — body (ivory face over a coloured back), faces, glows
   ===================================================================== */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

function buildTileSet(W, d, dpr, theme, indices, styleId) {
  const H = Math.round(W * TILE_R);
  const pad = Math.ceil(W * .2);
  const r = W * .12;
  const set = { W, H, d, pad, dpr, faces: [], faceFlat: [], bw: W + d + pad * 2, bh: H + d + pad * 2 };
  // classic tiles take their back colour from the scene; the acrylic styles bring their own
  const S = tileStyle(styleId), back = S.back || theme.back;
  const bone = S.modern ? ['#cbc5d3', '#e9e4ee', '#f8f6fa'] : ['#b9a985', '#d9ccad', '#ece2c8'];

  // body: stack thin slices from the table up, coloured back first then bone
  const body = makeCanvas(set.bw * dpr, set.bh * dpr), bc = body.getContext('2d');
  bc.scale(dpr, dpr);
  const steps = Math.max(6, Math.ceil(d * dpr * 1.5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = pad + d * t, y = pad + d * (1 - t);
    const onBack = t < .55;
    const cols = onBack ? back : bone;
    const g = bc.createLinearGradient(x, 0, x + W, 0);
    g.addColorStop(0, cols[0]); g.addColorStop(.12, cols[1]); g.addColorStop(1, cols[2]);
    rrect(bc, x, y, W, H, r); bc.fillStyle = g; bc.fill();
  }
  // a fine line where bone meets back, and a dark outline around the whole block
  bc.save(); bc.globalAlpha = .35; rrect(bc, pad + d * .5, pad + d * .5, W, H, r); bc.strokeStyle = back[0]; bc.lineWidth = .8; bc.stroke(); bc.restore();
  // face
  const fx = pad + d, fy = pad;
  const fg = bc.createLinearGradient(fx, fy, fx + W * .6, fy + H);
  if (S.modern) { fg.addColorStop(0, '#ffffff'); fg.addColorStop(.6, '#fbfafd'); fg.addColorStop(1, '#efecf4'); }
  else { fg.addColorStop(0, '#fffef9'); fg.addColorStop(.55, '#fbf5e7'); fg.addColorStop(1, '#efe5cd'); }
  rrect(bc, fx, fy, W, H, r); bc.fillStyle = fg; bc.fill();
  // bevel: light on the top-left rim, shade on the bottom-right rim
  bc.save(); rrect(bc, fx, fy, W, H, r); bc.clip();
  const bev = Math.max(1.2, W * .045);
  bc.lineWidth = bev * 2;
  const hl = bc.createLinearGradient(fx, fy, fx + W, fy + H);
  const shade = S.modern ? '110,100,140' : '150,120,70';
  hl.addColorStop(0, 'rgba(255,255,255,.95)'); hl.addColorStop(.45, 'rgba(255,255,255,0)'); hl.addColorStop(.55, `rgba(${shade},0)`); hl.addColorStop(1, `rgba(${shade},.35)`);
  rrect(bc, fx, fy, W, H, r); bc.strokeStyle = hl; bc.stroke();
  bc.restore();
  rrect(bc, fx + .5, fy + .5, W - 1, H - 1, r); bc.strokeStyle = S.modern ? 'rgba(80,70,110,.35)' : 'rgba(110,85,45,.4)'; bc.lineWidth = 1; bc.stroke();
  set.body = body;

  // faces
  const s = W / ART_W;
  for (let f = 0; f < 43; f++) {
    const fc = makeCanvas(W * dpr, H * dpr), c = fc.getContext('2d');
    c.scale(dpr * s, dpr * s);
    paintFace(c, f, indices, S);
    set.faces.push(fc);
  }

  // drop shadow (cast down-left, away from a light at the top right)
  const sh = makeCanvas(set.bw * dpr, set.bh * dpr), sc = sh.getContext('2d');
  sc.scale(dpr, dpr);
  sc.shadowColor = 'rgba(0,0,0,.42)'; sc.shadowBlur = W * .16; sc.shadowOffsetX = 2000;
  rrect(sc, pad - 2000, pad + d, W, H, r); sc.fillStyle = '#000'; sc.fill();
  set.shadow = sh;

  // glows (selected = gold, hint = soft white-jade)
  const glow = (col, blur, line) => {
    const g = makeCanvas((W + pad * 2) * dpr, (H + pad * 2) * dpr), gc = g.getContext('2d');
    gc.scale(dpr, dpr);
    gc.shadowColor = col; gc.shadowBlur = blur;
    rrect(gc, pad, pad, W, H, r); gc.lineWidth = line; gc.strokeStyle = col; gc.stroke();
    gc.shadowBlur = 0; gc.lineWidth = line * .6; gc.strokeStyle = 'rgba(255,255,255,.9)'; gc.stroke();
    return g;
  };
  set.glowSel = glow('#ffcd4d', W * .22, Math.max(2.5, W * .05));
  set.glowHint = glow('#2fe0bd', W * .32, Math.max(3, W * .065));
  set.glowMatch = glow('#6cc4ff', W * .26, Math.max(2.5, W * .055));

  // the back of a tile (for tiles other players are holding): coloured lacquer with a small gold lotus
  {
    const bf = makeCanvas(W * dpr, H * dpr), b = bf.getContext('2d'); b.scale(dpr, dpr);
    const bg = b.createLinearGradient(0, 0, W * .7, H); bg.addColorStop(0, lighten(back[2], .12)); bg.addColorStop(.6, back[1]); bg.addColorStop(1, back[0]);
    rrect(b, 0, 0, W, H, r); b.fillStyle = bg; b.fill();
    if (S.modern) {
      // glossy acrylic with a little white blossom
      const gl = b.createLinearGradient(0, 0, W * .35, H * .55); gl.addColorStop(0, 'rgba(255,255,255,.3)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      rrect(b, 0, 0, W, H, r); b.fillStyle = gl; b.fill();
      scallop(b, W / 2, H / 2, W * .16, 6); b.fillStyle = 'rgba(255,255,255,.6)'; b.fill();
      disc(b, W / 2, H / 2, W * .05, back[1]);
    } else {
      rrect(b, W * .1, W * .1, W * .8, H - W * .2, r * .6); b.strokeStyle = 'rgba(240,210,140,.45)'; b.lineWidth = Math.max(.8, W * .025); b.stroke();
      b.save(); b.translate(W / 2, H / 2); b.fillStyle = 'rgba(240,210,140,.55)';
      for (let k = 0; k < 6; k++) { b.rotate(TAU / 6); b.beginPath(); b.ellipse(0, -W * .1, W * .05, W * .1, 0, 0, TAU); b.fill(); }
      disc(b, 0, 0, W * .045, 'rgba(255,230,170,.8)'); b.restore();
    }
    rrect(b, .5, .5, W - 1, H - 1, r); b.strokeStyle = 'rgba(0,0,0,.35)'; b.lineWidth = 1; b.stroke();
    set.backFace = bf;
  }

  // overlays for dimming and hover
  const ov = (fill) => { const o = makeCanvas(W * dpr, H * dpr), oc = o.getContext('2d'); oc.scale(dpr, dpr); rrect(oc, 0, 0, W, H, r); oc.fillStyle = fill; oc.fill(); return o; };
  set.dim = ov('rgba(46,36,22,1)');
  set.lite = ov('rgba(255,255,255,1)');
  set.warn = ov('rgba(200,60,50,1)');
  return set;
}

// a few sample tiles in one style, for the chooser in Settings (face -1 = the back)
function drawStyleSample(cvs, styleId, theme, faces, dpr) {
  const W = 26, S = buildTileSet(W, 3, dpr, theme, false, styleId);
  const gap = 3, w = faces.length * (W + gap) - gap + S.d + 10, h = S.H + S.d + 8;
  cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr); cvs.style.width = w + 'px';
  const c = cvs.getContext('2d'); c.scale(dpr, dpr);
  faces.forEach((f, i) => {
    const x = 5 + S.d + i * (W + gap), y = 3;
    c.globalAlpha = .5; c.drawImage(S.shadow, x - S.d - S.pad - S.d * .4, y - S.pad + S.d * .6, S.bw, S.bh); c.globalAlpha = 1;
    c.drawImage(S.body, x - S.d - S.pad, y - S.pad, S.bw, S.bh);
    c.drawImage(f < 0 ? S.backFace : S.faces[f], x, y, W, S.H);
  });
}

const THEMES = {
  jade:   { name: 'Jade Garden',    back: ['#063d2d', '#0f6e50', '#1d8c66'], petal: ['#f3d27a', '#fff3c4'], ambient: 'motes',    meta: '#0c2420' },
  sakura: { name: 'Cherry Blossom', back: ['#6f1f3b', '#9c3554', '#bd5270'], petal: ['#f7a9be', '#ffe1e9'], ambient: 'petals',   meta: '#5b3a57' },
  night:  { name: 'Lantern Night',  back: ['#5e1116', '#93222a', '#b53a37'], petal: ['#ffc56b', '#fff0c8'], ambient: 'lanterns', meta: '#0a0f2a' },
  paper:  { name: 'Rice Paper',     back: ['#124c62', '#1e6d88', '#2e89a3'], petal: ['#86b06c', '#c6dfae'], ambient: 'leaves',   meta: '#efe5cf' },
};

/* ---------- background scenes ---------- */
function ridge(c, w, h, baseY, amp, rng, fill, rough = .55) {
  // a mountain line made from a few layered sine waves
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU], fr = [1.3 + rng(), 3 + rng() * 2, 7 + rng() * 4, 15 + rng() * 6];
  c.beginPath(); c.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const u = x / w;
    let y = Math.sin(u * fr[0] + ph[0]) * .55 + Math.sin(u * fr[1] + ph[1]) * .28 * rough * 1.6 + Math.sin(u * fr[2] + ph[2]) * .12 * rough + Math.sin(u * fr[3] + ph[3]) * .05;
    c.lineTo(x, baseY - y * amp);
  }
  c.lineTo(w, h); c.closePath(); c.fillStyle = fill; c.fill();
}
function mist(c, w, y0, y1, col) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, col.replace('A', '0')); g.addColorStop(1, col.replace('A', '1')); c.fillStyle = g; c.fillRect(0, y0, w, y1 - y0); }
function grain(c, w, h, alpha, light) {
  const n = makeCanvas(160, 160), nc = n.getContext('2d'), id = nc.createImageData(160, 160);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = light ? 255 - v * .4 : v; id.data[i + 3] = Math.random() * 255 * alpha; }
  nc.putImageData(id, 0, 0);
  c.save(); c.fillStyle = c.createPattern(n, 'repeat'); c.fillRect(0, 0, w, h); c.restore();
}
function vignette(c, w, h, a, col = '0,0,0') {
  const g = c.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .3, w / 2, h / 2, Math.hypot(w, h) * .62);
  g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function cloudCurl(c, x, y, s, col, lw) {
  // a "lucky cloud" curl, the swirling cloud of Chinese decoration
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.lineWidth = lw / s; c.lineCap = 'round';
  const curl = (cx0, cy0, r, dir) => { c.beginPath(); for (let a = 0; a < TAU * 1.15; a += .08) { const rr = r * (1 - a / (TAU * 1.4)); c.lineTo(cx0 + Math.cos(a * dir) * rr, cy0 + Math.sin(a * dir) * rr); } c.stroke(); };
  curl(0, 0, 18, 1); curl(34, -6, 13, -1); curl(-30, 4, 11, -1);
  c.beginPath(); c.moveTo(-48, 16); c.bezierCurveTo(-20, 22, 20, 22, 56, 12); c.stroke();
  c.restore();
}
function cherryBranch(c, x, y, ang, len, depth, rng, wood, bloom) {
  if (depth === 0 || len < 6) return;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const mx = (x + ex) / 2 + (rng() - .5) * len * .25, my = (y + ey) / 2 + (rng() - .5) * len * .25;
  c.strokeStyle = wood; c.lineWidth = Math.max(1, depth * depth * .55); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
  if (depth <= 3) {
    const n = depth === 1 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const t = rng(), bx = lerp(x, ex, t) + (rng() - .5) * 10, by = lerp(y, ey, t) + (rng() - .5) * 10, r = 3 + rng() * 4;
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + rng(); disc(c, bx + Math.cos(a) * r * .55, by + Math.sin(a) * r * .55, r * .55, bloom[(rng() * bloom.length) | 0]); }
      disc(c, bx, by, r * .22, '#d9577c');
    }
  }
  const k = depth > 4 ? 2 : 1 + (rng() < .7 ? 1 : 0);
  for (let i = 0; i < k; i++) cherryBranch(c, ex, ey, ang + (rng() - .5) * 1.1, len * (.62 + rng() * .18), depth - 1, rng, wood, bloom);
}
function bambooStalk(c, x, h, w, col, rng, lean) {
  let y = h + 10; const seg = 60 + rng() * 40; let px = x;
  c.strokeStyle = col; c.lineCap = 'butt';
  while (y > -20) {
    const ny = y - seg, nx = px + lean * seg;
    c.lineWidth = w; c.beginPath(); c.moveTo(px, y - 3); c.lineTo(nx, ny + 3); c.stroke();
    c.lineWidth = w * 1.3; c.beginPath(); c.moveTo(nx - w * .1, ny + 2); c.lineTo(nx + w * .1, ny - 2); c.stroke();
    if (rng() < .45) for (let k = 0; k < 3; k++) leaf(c, nx, ny, 34 + rng() * 26, 6 + rng() * 3, (rng() < .5 ? -1 : 1) * (1.2 + rng() * 1.2), col, false);
    y = ny; px = nx;
  }
}
function paintScene(c, w, h, themeId) {
  const rng = mulberry32(hashStr(themeId + 'scene'));
  const s = Math.min(w, h);
  if (themeId === 'jade') {
    const g = c.createRadialGradient(w / 2, h * .42, s * .05, w / 2, h * .5, Math.hypot(w, h) * .6);
    g.addColorStop(0, '#1d5e4d'); g.addColorStop(.5, '#113c33'); g.addColorStop(1, '#06140f');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.save(); c.globalAlpha = .9;
    ridge(c, w, h, h * .78, h * .09, rng, 'rgba(70,140,118,.22)');
    mist(c, w, h * .7, h * .86, 'rgba(18,60,50,A)');
    ridge(c, w, h, h * .86, h * .07, rng, 'rgba(10,40,32,.75)');
    ridge(c, w, h, h * .95, h * .05, rng, 'rgba(4,20,16,.9)');
    c.restore();
    for (const [x, y, sc] of [[w * .1, h * .16, s / 520], [w * .9, h * .2, s / 600], [w * .08, h * .62, s / 700], [w * .93, h * .7, s / 640]]) cloudCurl(c, x, y, sc, 'rgba(233,197,111,.13)', 2.2);
    grain(c, w, h, .05);
    vignette(c, w, h, .55);
  } else if (themeId === 'sakura') {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6dcd8'); g.addColorStop(.38, '#eab6c1'); g.addColorStop(.72, '#b98aa7'); g.addColorStop(1, '#6b4c74');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sx = w * .74, sy = h * .27, sr = s * .11;
    const sg = c.createRadialGradient(sx, sy, sr * .2, sx, sy, sr * 3); sg.addColorStop(0, 'rgba(255,246,236,.9)'); sg.addColorStop(.3, 'rgba(255,236,230,.35)'); sg.addColorStop(1, 'rgba(255,230,230,0)');
    c.fillStyle = sg; c.fillRect(0, 0, w, h); disc(c, sx, sy, sr, 'rgba(255,248,240,.85)');
    ridge(c, w, h, h * .7, h * .14, rng, 'rgba(196,150,178,.75)', .8);
    mist(c, w, h * .62, h * .8, 'rgba(240,210,220,A)');
    ridge(c, w, h, h * .8, h * .09, rng, 'rgba(150,108,146,.85)');
    mist(c, w, h * .76, h * .9, 'rgba(200,160,190,A)');
    ridge(c, w, h, h * .92, h * .06, rng, 'rgba(92,66,104,.95)');
    const bloom = ['#f9c3d2', '#f4a6bc', '#fde3ea', '#f7b5c8'];
    const by = Math.max(h * .08, 96);
    cherryBranch(c, -10, by, .25, s * .22, 7, rng, '#3e2532', bloom);
    cherryBranch(c, w + 10, by - h * .04, Math.PI - .35, s * .2, 6, rng, '#3e2532', bloom);
    grain(c, w, h, .035, true);
    vignette(c, w, h, .28, '60,20,50');
  } else if (themeId === 'night') {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04071a'); g.addColorStop(.55, '#0d1540'); g.addColorStop(.8, '#1b2459'); g.addColorStop(1, '#0a0f2c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { const x = rng() * w, y = rng() * h * .75, r = rng() * 1.2 + .2; disc(c, x, y, r, `rgba(255,248,230,${.15 + rng() * .5})`); }
    const mx = w * .84, my = h * .17, mr = s * .065;
    const mg = c.createRadialGradient(mx, my, mr * .5, mx, my, mr * 6); mg.addColorStop(0, 'rgba(255,240,200,.35)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = mg; c.fillRect(0, 0, w, h);
    const mm = c.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr); mm.addColorStop(0, '#fffbea'); mm.addColorStop(1, '#f1dca6');
    disc(c, mx, my, mr, mm);
    for (let i = 0; i < 5; i++) disc(c, mx + (rng() - .5) * mr, my + (rng() - .5) * mr, mr * (.08 + rng() * .12), 'rgba(200,170,110,.25)');
    ridge(c, w, h, h * .8, h * .1, rng, '#121a45', .7);
    ridge(c, w, h, h * .86, h * .06, rng, '#0a1033');
    // still lake with the moon's reflection
    const lake = h * .88; const lg = c.createLinearGradient(0, lake, 0, h); lg.addColorStop(0, '#111a4a'); lg.addColorStop(1, '#060a22');
    c.fillStyle = lg; c.fillRect(0, lake, w, h - lake);
    for (let i = 0; i < 14; i++) { const y = lake + 4 + i * (h - lake) / 15, ww = mr * (1.6 - i * .07) * (0.6 + rng() * .5); c.fillStyle = `rgba(255,230,170,${.28 - i * .016})`; c.fillRect(mx - ww / 2 + (rng() - .5) * 8, y, ww, 1.6); }
    grain(c, w, h, .04);
    vignette(c, w, h, .5);
  } else {
    c.fillStyle = '#f2e8d4'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h * .45, s * .1, w / 2, h / 2, Math.hypot(w, h) * .6); g.addColorStop(0, 'rgba(255,252,242,.9)'); g.addColorStop(1, 'rgba(220,200,160,.5)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.save(); c.globalAlpha = .1; ridge(c, w, h, h * .78, h * .14, rng, '#3f5466', .9); c.globalAlpha = .16; ridge(c, w, h, h * .88, h * .08, rng, '#2e3e4c'); c.restore();
    mist(c, w, h * .7, h, 'rgba(242,232,212,A)');
    c.save(); c.globalAlpha = .26; bambooStalk(c, w * .035, h, s * .02, '#3e5a46', rng, .04); c.globalAlpha = .16; bambooStalk(c, w * .1, h, s * .014, '#4d6a55', rng, -.03);
    c.globalAlpha = .22; bambooStalk(c, w * .965, h, s * .019, '#3e5a46', rng, -.05); c.globalAlpha = .14; bambooStalk(c, w * .9, h, s * .013, '#4d6a55', rng, .02); c.restore();
    for (let i = 0; i < 900; i++) { const x = rng() * w, y = rng() * h, l = 4 + rng() * 14, a = rng() * TAU; c.strokeStyle = `rgba(120,95,60,${rng() * .06})`; c.lineWidth = .6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    vignette(c, w, h, .22, '120,90,40');
  }
}

/* ---------- ambient life: motes, petals, lanterns, leaves ---------- */
const amb = { list: [], stars: [], kind: '', last: 0, running: false };
function makeFxSprites(theme) {
  const S = {};
  const mk = (sz, fn) => { const c = makeCanvas(sz, sz), g = c.getContext('2d'); fn(g, sz); return c; };
  S.petal = mk(48, (g, s) => {
    g.translate(s / 2, s / 2);
    g.beginPath(); g.moveTo(0, s * .42); g.bezierCurveTo(-s * .42, s * .12, -s * .3, -s * .38, -s * .06, -s * .4); g.lineTo(0, -s * .3); g.lineTo(s * .06, -s * .4); g.bezierCurveTo(s * .3, -s * .38, s * .42, s * .12, 0, s * .42);
    const gr = g.createLinearGradient(0, s * .4, 0, -s * .4); gr.addColorStop(0, darken(theme.petal[0], .12)); gr.addColorStop(1, theme.petal[1]); g.fillStyle = gr; g.fill();
  });
  S.spark = mk(48, (g, s) => {
    g.translate(s / 2, s / 2);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.25, 'rgba(255,230,160,.6)'); gr.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s / 2, 0, TAU); g.fill();
    g.fillStyle = '#fffbe8';
    for (let k = 0; k < 2; k++) { g.save(); g.rotate(k * Math.PI / 2); g.beginPath(); g.moveTo(0, -s * .46); g.quadraticCurveTo(s * .04, 0, 0, s * .46); g.quadraticCurveTo(-s * .04, 0, 0, -s * .46); g.fill(); g.restore(); }
  });
  S.glow = mk(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.4, 'rgba(255,220,150,.35)'); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
  S.lantern = mk(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,190,90,.55)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    const b = g.createLinearGradient(-8, 0, 8, 0); b.addColorStop(0, '#b2241f'); b.addColorStop(.5, '#ff8a3c'); b.addColorStop(1, '#b2241f');
    g.beginPath(); g.ellipse(0, 0, 9, 11, 0, 0, TAU); g.fillStyle = b; g.fill();
    g.fillStyle = '#4a1608'; g.fillRect(-5, -12.5, 10, 2.5); g.fillRect(-5, 10, 10, 2.5);
    g.fillStyle = 'rgba(255,230,150,.75)'; g.beginPath(); g.ellipse(0, 1, 3.5, 6, 0, 0, TAU); g.fill();
  });
  S.leaf = mk(48, (g, s) => { leaf(g, s / 2, s * .92, s * .84, s * .14, 0, theme.petal[0], true); });
  return S;
}
function setupAmbient() {
  const th = THEMES[settings.theme]; amb.kind = th.ambient; amb.list = []; amb.stars = [];
  const area = VW * VH, n = amb.kind === 'motes' ? 26 : amb.kind === 'petals' ? 20 : amb.kind === 'lanterns' ? 10 : 9;
  const count = Math.round(n * clamp(area / (1200 * 800), .5, 1.4));
  for (let i = 0; i < count; i++) amb.list.push(spawnAmb(true));
  if (amb.kind === 'lanterns') for (let i = 0; i < 40; i++) amb.stars.push({ x: Math.random() * VW, y: Math.random() * VH * .7, r: Math.random() * 1.3 + .4, p: Math.random() * TAU, s: .6 + Math.random() * 1.6 });
}
function spawnAmb(initial) {
  const k = amb.kind, r = Math.random;
  if (k === 'motes') return { x: r() * VW, y: initial ? r() * VH : VH + 10, vy: -(6 + r() * 12), sway: 8 + r() * 18, ph: r() * TAU, sz: 6 + r() * 12, a: .25 + r() * .5, tw: 1 + r() * 2 };
  if (k === 'petals') return { x: r() * VW * 1.2 - VW * .1, y: initial ? r() * VH : -20, vy: 16 + r() * 22, vx: 8 + r() * 14, sway: 10 + r() * 20, ph: r() * TAU, sz: 9 + r() * 9, rot: r() * TAU, vr: (r() - .5) * 1.4, fl: r() * TAU, vf: 1 + r() * 2, a: .55 + r() * .4 };
  if (k === 'lanterns') return { x: r() * VW, y: initial ? r() * VH : VH + 30, vy: -(6 + r() * 9), sway: 6 + r() * 10, ph: r() * TAU, sz: 18 + r() * 22, a: .45 + r() * .45 };
  return { x: r() * VW * 1.2 - VW * .1, y: initial ? r() * VH : -30, vy: 10 + r() * 12, vx: 4 + r() * 10, sway: 14 + r() * 20, ph: r() * TAU, sz: 16 + r() * 12, rot: r() * TAU, vr: (r() - .5) * .8, fl: r() * TAU, vf: .6 + r(), a: .35 + r() * .3 };
}
function ambientFrame(now) {
  if (!amb.running) return;
  requestAnimationFrame(ambientFrame);
  if (now - amb.last < 32) return; // ~30 fps is plenty for drifting things
  const dt = Math.min(.1, (now - amb.last) / 1000); amb.last = now;
  const c = cx.amb, s = cv.amb._s; c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, VW, VH);
  const S = FXS, t = now / 1000;
  for (const st of amb.stars) { c.globalAlpha = .25 + .45 * (.5 + .5 * Math.sin(t * st.s + st.p)); disc(c, st.x, st.y, st.r, '#fff6dc'); }
  for (let i = 0; i < amb.list.length; i++) {
    const p = amb.list[i];
    p.y += p.vy * dt; if (p.vx) p.x += p.vx * dt;
    const sx = p.x + Math.sin(t * .6 + p.ph) * p.sway;
    if (amb.kind === 'motes') {
      c.globalAlpha = p.a * (.55 + .45 * Math.sin(t * p.tw + p.ph)); c.globalCompositeOperation = 'lighter';
      c.drawImage(S.glow, sx - p.sz, p.y - p.sz, p.sz * 2, p.sz * 2); c.globalCompositeOperation = 'source-over';
      if (p.y < -20) amb.list[i] = spawnAmb(false);
    } else if (amb.kind === 'lanterns') {
      c.globalAlpha = p.a * (.85 + .15 * Math.sin(t * 7 + p.ph));
      c.drawImage(S.lantern, sx - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      if (p.y < -40) amb.list[i] = spawnAmb(false);
    } else {
      p.rot += p.vr * dt; p.fl += p.vf * dt;
      c.save(); c.globalAlpha = p.a; c.translate(sx, p.y); c.rotate(p.rot); c.scale(Math.cos(p.fl), 1);
      const img = amb.kind === 'petals' ? S.petal : S.leaf; c.drawImage(img, -p.sz / 2, -p.sz / 2, p.sz, p.sz); c.restore();
      if (p.y > VH + 30 || p.x > VW + 60) amb.list[i] = spawnAmb(false);
    }
  }
  c.globalAlpha = 1;
}
function startAmbient() {
  const calm = settings.calm || reducedMotion();
  if (calm) { amb.running = false; cx.amb.setTransform(1, 0, 0, 1, 0, 0); cx.amb.clearRect(0, 0, cv.amb.width, cv.amb.height); return; }
  if (!amb.running && !document.hidden) { amb.running = true; amb.last = performance.now(); requestAnimationFrame(ambientFrame); }
}
function stopAmbient() { amb.running = false; }
function reducedMotion() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

/* =====================================================================
   Sound — all synthesized: tile clacks, plucked-string chimes, music
   ===================================================================== */
const Sound = (() => {
  let ac = null, sfx, mus, reverb, noise, ready = false;
  const plucks = new Map();
  // D major pentatonic, D3 to E6: the scale of a guzheng
  const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51];
  const MUSIC_VOL = .5;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .004; comp.release.value = .25;
    comp.connect(ac.destination);
    reverb = ac.createConvolver(); reverb.buffer = impulse(3.4, 2.8);
    const wet = ac.createGain(); wet.gain.value = .8; reverb.connect(wet); wet.connect(comp);
    sfx = ac.createGain(); sfx.gain.value = settings.sound ? 1 : 0; sfx.connect(comp);
    const sSend = ac.createGain(); sSend.gain.value = .22; sfx.connect(sSend); sSend.connect(reverb);
    mus = ac.createGain(); mus.gain.value = 0; mus.connect(comp);
    const mSend = ac.createGain(); mSend.gain.value = .75; mus.connect(mSend); mSend.connect(reverb);
    noise = makeNoise(.4);
    ready = true;
    if (settings.music) startMusic();
    // build the plucked notes a few at a time so the first match doesn't stutter
    let i = 0; const warm = () => { if (i < SCALE.length) { pluckBuf(SCALE[i++]); setTimeout(warm, 30); } }; setTimeout(warm, 50);
  }
  function impulse(dur, decay) {
    const sr = ac.sampleRate, len = Math.floor(sr * dur), b = ac.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function makeNoise(dur) { const sr = ac.sampleRate, len = Math.floor(sr * dur), b = ac.createBuffer(1, len, sr), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; }
  // Karplus–Strong plucked string
  function pluckBuf(freq) {
    if (plucks.has(freq)) return plucks.get(freq);
    const sr = ac.sampleRate, idx = clamp(SCALE.indexOf(freq), 0, 16);
    const dur = clamp(3.4 - idx * .13, 1.4, 3.4), len = Math.floor(sr * dur);
    const buf = ac.createBuffer(1, len, sr), out = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq)), line = new Float32Array(N);
    let prev = 0; for (let i = 0; i < N; i++) { prev += ((Math.random() * 2 - 1) - prev) * .55; line[i] = prev; }
    const dbps = lerp(20, 44, idx / 16), rho = Math.pow(10, -dbps / (20 * freq));
    let p = 0, peak = 0;
    for (let i = 0; i < len; i++) {
      const a = line[p], b = line[(p + 1) % N];
      out[i] = a; line[p] = (a + b) * .5 * rho; p = (p + 1) % N;
      const v = Math.abs(a); if (v > peak) peak = v;
    }
    const k = .9 / (peak || 1), fade = Math.floor(sr * .05);
    for (let i = 0; i < len; i++) out[i] *= k * (i > len - fade ? (len - i) / fade : 1);
    plucks.set(freq, buf); return buf;
  }
  function pluck(freq, t, vol, bus = sfx, pan = 0) {
    const src = ac.createBufferSource(); src.buffer = pluckBuf(freq);
    const g = ac.createGain(); g.gain.value = vol; src.connect(g);
    if (pan && ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = pan; g.connect(pn); pn.connect(bus); } else g.connect(bus);
    src.start(t);
  }
  function env(g, t, peak, decay) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + decay); }
  // two ivory tiles meeting: a bright transient plus a short ceramic ring
  function clack(t, vol = 1, pitch = 1) {
    const src = ac.createBufferSource(); src.buffer = noise;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3400 * pitch; bp.Q.value = 1.1;
    const g = ac.createGain(); env(g, t, .7 * vol, .04);
    src.connect(bp); bp.connect(g); g.connect(sfx); src.start(t, Math.random() * .3, .06);
    for (const [f, a, dc] of [[1780, .3, .055], [2870, .16, .035], [4100, .07, .02], [860, .16, .045]]) {
      const o = ac.createOscillator(); o.frequency.value = f * pitch * (1 + (Math.random() - .5) * .05);
      const og = ac.createGain(); env(og, t, a * vol, dc); o.connect(og); og.connect(sfx); o.start(t); o.stop(t + dc + .03);
    }
  }
  function thud(t, vol = 1) {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + .1);
    const g = ac.createGain(); env(g, t, .32 * vol, .14); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + .18);
    clack(t, .25 * vol, .55);
  }
  const now = () => ac.currentTime + .005;
  const ok = () => ready && settings.sound;

  /* --- music: a slow pentatonic melody over a soft drone, never the same twice --- */
  let musicOn = false, timer = 0, nextT = 0, deg = 8, drone = [];
  function startMusic() {
    if (!ready || musicOn) return; musicOn = true;
    const t = ac.currentTime;
    mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(mus.gain.value, t); mus.gain.linearRampToValueAtTime(MUSIC_VOL, t + 4);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const dg = ac.createGain(); dg.gain.value = .045; lp.connect(dg); dg.connect(mus);
    const lfo = ac.createOscillator(); lfo.frequency.value = .06; const lg = ac.createGain(); lg.gain.value = .02; lfo.connect(lg); lg.connect(dg.gain); lfo.start();
    drone = [lfo];
    for (const [f, type, a] of [[73.42, 'sine', 1], [110, 'sine', .6], [146.83, 'triangle', .25]]) {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 6;
      const og = ac.createGain(); og.gain.value = a; o.connect(og); og.connect(lp); o.start(); drone.push(o);
    }
    nextT = t + 1.2; timer = setInterval(schedule, 200);
  }
  function stopMusic() {
    if (!musicOn) return; musicOn = false; clearInterval(timer);
    const t = ac.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(mus.gain.value, t); mus.gain.linearRampToValueAtTime(0, t + 1.2);
    const d = drone; drone = []; setTimeout(() => d.forEach(o => { try { o.stop(); } catch (e) {} }), 1400);
  }
  function schedule() {
    if (!musicOn) return;
    while (nextT < ac.currentTime + .8) {
      const r = Math.random();
      deg = clamp(deg + (r < .3 ? -1 : r < .55 ? 1 : r < .7 ? -2 : r < .85 ? 2 : 0), 4, 13);
      const vel = .16 + Math.random() * .12, pan = (Math.random() - .5) * .7;
      if (Math.random() < .12) pluck(SCALE[clamp(deg + 1, 0, 16)], nextT - .07, vel * .5, mus, pan);
      pluck(SCALE[deg], nextT, vel, mus, pan);
      if (Math.random() < .2) pluck(SCALE[clamp(deg - 3, 0, 16)], nextT + .02, vel * .55, mus, -pan);
      const gaps = [.55, .8, 1.1, 1.1, 1.5, 2.1, 2.8];
      nextT += gaps[(Math.random() * gaps.length) | 0] + (Math.random() < .1 ? 3 + Math.random() * 3 : 0);
    }
  }

  return {
    init, SCALE,
    setSound(on) { if (ready) sfx.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, .05); },
    setMusic(on) { if (!ready) return; on ? startMusic() : stopMusic(); },
    suspend() { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); },
    resume() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); },
    select() { if (ok()) clack(now(), .5, 1.12); },
    switchSel() { if (ok()) clack(now(), .42, 1.25); },
    deselect() { if (ok()) clack(now(), .3, 1.35); },
    blocked() { if (ok()) thud(now(), .9); },
    match(streak, delay = 0) {
      if (!ok()) return; const t = now() + delay;
      clack(t, 1, .96); clack(t + .014, .55, .9);
      const i = clamp(5 + Math.min(streak - 1, 9), 5, 14);
      pluck(SCALE[i], t + .01, .42); pluck(SCALE[i + 2] || SCALE[16], t + .07, .2);
    },
    hint() { if (!ok()) return; const t = now(); pluck(SCALE[12], t, .22); pluck(SCALE[14], t + .1, .18); pluck(SCALE[16], t + .2, .14); },
    undo() { if (!ok()) return; const t = now(); pluck(SCALE[10], t, .22); pluck(SCALE[8], t + .08, .2); clack(t + .02, .35, 1.05); },
    shuffle() { if (!ok()) return; const t = now(); for (let i = 0; i < 22; i++) clack(t + i * .028 + Math.random() * .025, .18 + Math.random() * .3, .85 + Math.random() * .4); },
    deal(n = 26, dur = 1.3) { if (!ok()) return; const t = now(); for (let i = 0; i < n; i++) clack(t + (i / n) * dur + Math.random() * .03, .12 + Math.random() * .16, .9 + Math.random() * .3); },
    ui() { if (ok()) clack(now(), .22, 1.5); },
    win() {
      if (!ok()) return; const t = now() + .1;
      [5, 7, 8, 9, 10, 12, 13, 14, 16].forEach((d, k) => pluck(SCALE[d], t + k * .12, .32, sfx, (k / 8 - .5) * .6));
      const base = 98;
      for (const [m, a, dc] of [[1, .22, 4], [2.76, .08, 2.5], [5.4, .04, 1.6], [.5, .1, 4.5]]) {
        const o = ac.createOscillator(); o.frequency.value = base * m; const g = ac.createGain();
        g.gain.setValueAtTime(.0001, t + 1.1); g.gain.exponentialRampToValueAtTime(a, t + 1.13); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1 + dc);
        o.connect(g); g.connect(sfx); o.start(t + 1.1); o.stop(t + 1.2 + dc);
      }
    },
  };
})();

/* ---------- full screen (hides the browser's tabs and address bar) ----------
   Offered only where the browser allows it, and not when already running as a
   Home Screen app. Must be started from a tap or key press. */
const Fullscreen = {
  standalone() { return !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone); },
  supported() {
    const d = document;
    return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled) && !this.standalone();
  },
  // Safari on iPhone can't make a page full screen; opened from the Home Screen it fills the screen
  needsHomeScreen() {
    const ios = /iPhone|iPod|iPad/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && !this.supported() && !this.standalone();
  },
  active() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  toggle() {
    const d = document, el = d.documentElement;
    if (this.active()) { const exit = d.exitFullscreen || d.webkitExitFullscreen; if (exit) { const r = exit.call(d); if (r && r.catch) r.catch(() => {}); } return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { const r = req.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
  },
  // wire a button: icon follows the current state; on an iPhone it explains the Home Screen
  // instead (help is the page's own way of showing that); hidden anywhere else it can't work
  bind(btn, help) {
    if (!btn) return;
    if (!this.supported()) {
      if (help && this.needsHomeScreen()) { btn.innerHTML = FS_ICON_ENTER; btn.setAttribute('aria-label', 'Full screen'); btn.addEventListener('click', () => help(FS_HOME_HELP)); }
      else btn.style.display = 'none';
      return;
    }
    const sync = () => { const on = this.active(); btn.innerHTML = on ? FS_ICON_EXIT : FS_ICON_ENTER; btn.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen'); btn.title = on ? 'Leave full screen (Esc)' : 'Full screen (F)'; };
    btn.addEventListener('click', () => this.toggle());
    document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
    sync();
  },
};
const FS_HOME_HELP = {
  title: 'Full screen on iPhone',
  text: 'Safari can’t hide its bars for a game on iPhone, but your Home Screen can. In Safari, tap Share (it’s in the ••• menu), then Add to Home Screen. Open Mahjong from your Home Screen and it fills the whole screen, upright or sideways, with no address bar.',
};
const FS_ICON_ENTER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const FS_ICON_EXIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
