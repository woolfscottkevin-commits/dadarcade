// Tiny synthesized sounds (no audio files): a soft "clack" when a block lands, a "pop" on taps,
// a little fanfare when a build is finished. One AudioContext, started by the first tap.
// Off in Calm mode or when Block sounds is turned off in Settings.
import { settings } from './store.js';

let ctx = null, last = 0;
function ac() {
  if (!settings.all().sound || document.documentElement.hasAttribute('data-calm')) return null;
  try {
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state !== 'running') ctx.resume();
    return ctx;
  } catch (e) { return null; }
}
export function unlockAudio() { ac(); }

function blip(freq, dur, type = 'triangle', vol = 0.05, slide = 0.6, when = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
// a wooden "clack": short noise burst through a band-pass
export function clack(pitch = 1) {
  const c = ac(); if (!c) return;
  const now = performance.now(); if (now - last < 45) return; last = now;
  const t = c.currentTime, len = 0.06;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 * pitch + Math.random() * 200; f.Q.value = 3.5;
  const g = c.createGain(); g.gain.value = 0.22;
  src.connect(f).connect(g).connect(c.destination); src.start(t);
}
export const pop = () => blip(620, 0.09, 'sine', 0.05, 1.6);
export const tick = () => blip(1100, 0.04, 'square', 0.018, 1);
export function fanfare() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.05, 1, i * 0.11)); }
