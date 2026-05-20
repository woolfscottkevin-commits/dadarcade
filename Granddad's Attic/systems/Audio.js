export class AudioSystem {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.ambientNodes = [];
    this.muted = false;
  }

  async startAmbient() {
    await this.ensureContext();
    if (this.ambientNodes.length > 0 || this.muted) return;

    const now = this.context.currentTime;
    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.setValueAtTime(0.0001, now);
    this.ambientGain.gain.exponentialRampToValueAtTime(0.09, now + 2.4);
    this.ambientGain.connect(this.masterGain);

    const low = this.context.createOscillator();
    low.type = "sine";
    low.frequency.value = 73.42;
    low.connect(this.ambientGain);
    low.start(now);

    const high = this.context.createOscillator();
    high.type = "triangle";
    high.frequency.value = 146.83;
    const highGain = this.context.createGain();
    highGain.gain.value = 0.16;
    high.connect(highGain);
    highGain.connect(this.ambientGain);
    high.start(now);

    this.ambientNodes = [low, high];
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.22;
    }
  }

  async ensureContext() {
    if (!this.context) {
      const BrowserAudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new BrowserAudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.22;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async tone(frequency, duration = 0.2, type = "sine", gainValue = 0.24, destination = this.masterGain) {
    await this.ensureContext();
    if (this.muted) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
  }

  async noiseBurst(duration = 0.18, gainValue = 0.12, filterFrequency = 1400) {
    await this.ensureContext();
    if (this.muted) return;

    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    filter.type = "bandpass";
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  async click() {
    await this.noiseBurst(0.04, 0.12, 2600);
    await this.tone(92, 0.05, "square", 0.11);
  }

  async wrong() {
    await this.tone(82, 0.14, "triangle", 0.14);
    setTimeout(() => this.tone(58, 0.18, "triangle", 0.12), 90);
  }

  async chime() {
    await this.tone(392.0, 0.18, "triangle", 0.12);
    setTimeout(() => this.tone(523.25, 0.2, "sine", 0.13), 150);
    setTimeout(() => this.tone(659.25, 0.32, "sine", 0.1), 320);
  }

  async page() {
    await this.noiseBurst(0.2, 0.08, 1900);
    setTimeout(() => this.noiseBurst(0.12, 0.045, 900), 90);
  }

  async playMelody(notes) {
    await this.ensureContext();
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.tone(note.frequency, 0.5, "triangle", 0.12);
        this.tone(note.frequency * 2, 0.22, "sine", 0.035);
      }, index * 680);
    });
  }

  async radioStatic() {
    await this.noiseBurst(0.34, 0.1, 1200);
    setTimeout(() => this.noiseBurst(0.22, 0.06, 2600), 140);
  }

  async radioVoice(text) {
    await this.radioStatic();
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    if (this.muted) return;

    const voices = await this.voicesReady();
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.82;
    utterance.pitch = 0.72;
    utterance.volume = 0.72;
    const voice = this.pickRadioVoice(voices);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-GB";
    }
    window.speechSynthesis.speak(utterance);
  }

  // The radio sounds best with a deeper male British voice ("Daniel" on macOS,
  // for example). We:
  //   1. Wait for `voiceschanged` if the list starts empty (Safari quirk).
  //   2. Normalize voice.lang underscores → hyphens (macOS reports `en_GB`).
  //   3. Prefer non-"compact" voices so we don't pick the robotic fallback.
  //   4. Search by name regex for the warmer voices Granddad should sound like.
  //   5. Fall through to any en-GB → en-* → null.
  voicesReady() {
    if (this._voicesPromise) return this._voicesPromise;
    this._voicesPromise = new Promise((resolve) => {
      const list = window.speechSynthesis.getVoices();
      if (list && list.length > 0) { resolve(list); return; }
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve(window.speechSynthesis.getVoices() || []);
      };
      try { window.speechSynthesis.onvoiceschanged = settle; } catch (e) { /* ignore */ }
      setTimeout(settle, 1500);
    });
    return this._voicesPromise;
  }

  pickRadioVoice(voices) {
    if (!voices || voices.length === 0) return null;
    const norm = (s) => (typeof s === "string" ? s.toLowerCase().replace(/_/g, "-") : "");
    const isCompact = (v) => /compact/i.test(v.name || "") || /compact/i.test(v.voiceURI || "");
    const inLocale = (loc) => voices.filter((v) => norm(v.lang).startsWith(loc));
    const preferNatural = (list) => {
      const natural = list.filter((v) => !isCompact(v));
      return natural.length > 0 ? natural : list;
    };
    // 1. By name — the warm, deeper voices Granddad's message wants.
    const named = preferNatural(voices.filter((v) => /daniel|reed|rocko|fred|ralph|tom|george/i.test(v.name || "")));
    if (named.length > 0) return named[0];
    // 2. British first.
    const gb = preferNatural(inLocale("en-gb"));
    if (gb.length > 0) return gb[0];
    // 3. Any English.
    const en = preferNatural(voices.filter((v) => norm(v.lang).startsWith("en")));
    return en[0] || null;
  }
}
