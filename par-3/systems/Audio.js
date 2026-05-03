import { getValue, setValue } from "./Persistence.js";

export class AudioSystem {
  constructor() {
    this.context = null;
    this.muted = getValue("muted", "false") === "true";
  }

  unlock() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
      return;
    }
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    setValue("muted", this.muted ? "true" : "false");
  }

  hit(power) {
    this.tone(80 + power * 60, 0.055, "sine", 0.22, 48);
  }

  cup() {
    this.tone(523, 0.16, "triangle", 0.18);
    setTimeout(() => this.tone(659, 0.18, "triangle", 0.18), 120);
  }

  fanfare() {
    [523, 659, 784, 1047].forEach((note, i) => {
      setTimeout(() => this.tone(note, 0.18, "triangle", 0.2), i * 110);
    });
  }

  lip() {
    this.tone(210, 0.08, "square", 0.12, 150);
  }

  tone(freq, duration, type, volume, endFreq) {
    if (this.muted || !this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
