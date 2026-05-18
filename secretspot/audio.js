// Spelling Trainer — procedural ding/thunk via the Web Audio API.
//
// iPad Safari requires the AudioContext to start under a direct user
// gesture. We build it lazily on first use and resume if suspended.
// Honors the active user's mute flag.

import { getActiveUser, getUserState } from "./state.js";

let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch (err) {
    return null;
  }
  return ctx;
}

function ensureRunning() {
  const c = getCtx();
  if (!c) return null;
  if (c.state === "suspended" && typeof c.resume === "function") {
    c.resume().catch(() => {});
  }
  return c;
}

function isMutedForActive() {
  const id = getActiveUser();
  if (!id) return false;
  return !!getUserState(id).muted;
}

function tone(frequency, durationMs, peak) {
  if (isMutedForActive()) return;
  const c = ensureRunning();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  const now = c.currentTime;
  const dur = durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function ding() {
  tone(880, 150, 0.25);
}

export function thunk() {
  tone(220, 150, 0.22);
}

export function primeAudio() {
  ensureRunning();
}
