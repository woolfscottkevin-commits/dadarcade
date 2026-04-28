// Tiny Web Audio sound cues for Phase 4 polish. Browsers only allow audio after
// a user gesture, so failed/blocked playback is intentionally silent.

let audioCtx = null;

function ctx() {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(freq, duration = 0.08, type = "sine", gainValue = 0.04) {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playSfx(name) {
  if (name === "card") {
    tone(440, 0.06, "triangle", 0.035);
    setTimeout(() => tone(660, 0.05, "triangle", 0.025), 45);
  } else if (name === "hit") {
    tone(150, 0.09, "sawtooth", 0.035);
  } else if (name === "endTurn") {
    tone(260, 0.07, "square", 0.025);
  } else if (name === "victory") {
    tone(523, 0.08, "triangle", 0.035);
    setTimeout(() => tone(659, 0.08, "triangle", 0.03), 80);
    setTimeout(() => tone(784, 0.12, "triangle", 0.03), 160);
  } else if (name === "defeat") {
    tone(220, 0.12, "sine", 0.035);
    setTimeout(() => tone(165, 0.16, "sine", 0.03), 120);
  }
}
