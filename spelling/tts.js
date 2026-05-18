// Spelling Trainer — speech synthesis with weekly accent rotation.
//
// iPad Safari quirk: speechSynthesis.getVoices() returns [] on first call.
// We wait for the voiceschanged event with a 1.5s timeout fallback so the
// first tap actually speaks. Voice rotation is voiceIndex % 4 across
// en-GB, en-AU, en-IE, en-IN — works for any program length.

import { getActiveUser, getUserState } from "./state.js";

const LOCALES = ["en-GB", "en-AU", "en-IE", "en-IN"];

let voicesReadyPromise = null;

export function getVoicesReady() {
  if (voicesReadyPromise) return voicesReadyPromise;
  voicesReadyPromise = new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length > 0) {
      resolve(existing);
      return;
    }
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      resolve(window.speechSynthesis.getVoices() || []);
    };
    try {
      window.speechSynthesis.onvoiceschanged = settle;
    } catch (err) { /* ignore */ }
    setTimeout(settle, 1500);
  });
  return voicesReadyPromise;
}

// Resolve to the locale string for the active user's current voiceIndex.
// Falls back to "en-GB" if no active user (used only for the picker, which
// doesn't speak anything).
export function getActiveLocale() {
  const id = getActiveUser();
  if (!id) return LOCALES[0];
  const s = getUserState(id);
  return LOCALES[(s.voiceIndex || 0) % LOCALES.length];
}

function pickVoice(voices, primaryLocale) {
  if (!voices || voices.length === 0) return null;
  let v = voices.find((vc) => typeof vc.lang === "string" && vc.lang.toLowerCase().startsWith(primaryLocale.toLowerCase()));
  if (v) return v;
  for (const fallback of LOCALES) {
    if (fallback === primaryLocale) continue;
    v = voices.find((vc) => typeof vc.lang === "string" && vc.lang.toLowerCase().startsWith(fallback.toLowerCase()));
    if (v) return v;
  }
  v = voices.find((vc) => typeof vc.lang === "string" && vc.lang.toLowerCase().startsWith("en"));
  return v || null;
}

function isMutedForActive() {
  const id = getActiveUser();
  if (!id) return false;
  return !!getUserState(id).muted;
}

export function speak(text, opts = {}) {
  return new Promise(async (resolve) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      resolve(false);
      return;
    }
    if (isMutedForActive()) {
      resolve(true);
      return;
    }
    const voices = await getVoicesReady();
    const locale = opts.locale || getActiveLocale();
    const voice = pickVoice(voices, locale);
    try { window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : (locale || "en-US");
    u.rate = typeof opts.rate === "number" ? opts.rate : 0.85;
    u.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
    u.volume = 1.0;
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(true); } };
    u.onend = done;
    u.onerror = done;
    try { window.speechSynthesis.speak(u); } catch (err) { done(); }
    // iOS sometimes drops onend; give a generous safety timeout.
    const safetyMs = Math.max(2500, text.length * 90);
    setTimeout(done, safetyMs);
  });
}

export function cancelSpeech() {
  try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
}
