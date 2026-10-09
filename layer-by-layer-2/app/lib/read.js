// Read to me. Reads the page's text sentence by sentence with the device's voice, highlights the
// current sentence (and word, where the voice reports word boundaries) with the CSS Custom Highlight
// API, and lets a kid tap any sentence to start from there. Text stays real text, so Safari's own
// "Listen to Page" and screen readers keep working too.
import { settings } from './store.js';
import { track } from './ui.js';

const synth = window.speechSynthesis;
export const canRead = !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
const HL = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';

let state = null; // {sentences, i, root, onEnd}

function bestVoice() {
  const vs = synth.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
  const score = v => (/(premium|enhanced|natural|neural)/i.test(v.name) ? 40 : 0) + (/en-(US|GB|AU|CA)/i.test(v.lang) ? 10 : 0)
    + (/(samantha|ava|allison|karen|daniel|serena|google us english|aria|jenny)/i.test(v.name) ? 8 : 0) + (v.localService ? 3 : 0);
  return vs.sort((a, b) => score(b) - score(a))[0] || null;
}

// Collect sentences from the readable parts of root: elements marked data-read, or headings,
// paragraphs and list items inside [data-readable].
function collect(root) {
  const blocks = [...root.querySelectorAll('[data-read], [data-readable] :is(h1,h2,h3,p,li,figcaption,.tip)')]
    .filter((el, i, all) => !all.some(o => o !== el && o.contains(el)) && el.offsetParent !== null && el.textContent.trim());
  const out = [];
  for (const el of blocks) {
    const nodes = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let text = '', n;
    while ((n = walker.nextNode())) {
      if (n.parentElement.closest('[aria-hidden="true"], .no-read, button, svg')) continue;
      nodes.push([n, text.length]); text += n.data;
    }
    const re = /[^.!?]+(?:[.!?]+["'”’)\]]*|$)\s*/g; let m;
    while ((m = re.exec(text))) {
      const s = m[0]; if (!s.trim()) continue;
      const start = m.index + (s.length - s.trimStart().length), end = m.index + s.trimEnd().length;
      const range = rangeFor(nodes, start, end);
      if (range) out.push({ el, text: text.slice(start, end), range, nodes, start });
    }
  }
  return out;
}
function locate(nodes, off) {
  for (let i = nodes.length - 1; i >= 0; i--) if (off >= nodes[i][1]) return [nodes[i][0], Math.min(off - nodes[i][1], nodes[i][0].length)];
  return null;
}
function rangeFor(nodes, a, b) {
  const s = locate(nodes, a), e = locate(nodes, b); if (!s || !e) return null;
  const r = document.createRange(); r.setStart(...s); r.setEnd(...e); return r;
}

function mark(sent, wordRange) {
  if (HL) {
    CSS.highlights.set('lbl-sentence', new Highlight(sent.range));
    if (wordRange) CSS.highlights.set('lbl-word', new Highlight(wordRange)); else CSS.highlights.delete('lbl-word');
  } else {
    document.querySelectorAll('.reading-now').forEach(e => e.classList.remove('reading-now'));
    sent.el.classList.add('reading-now');
  }
}
function clearMarks() {
  if (HL) { CSS.highlights.delete('lbl-sentence'); CSS.highlights.delete('lbl-word'); }
  document.querySelectorAll('.reading-now').forEach(e => e.classList.remove('reading-now'));
}

function speak(i) {
  if (!state) return;
  if (i >= state.sentences.length) { stop(); return; }
  state.i = i;
  const sent = state.sentences[i];
  mark(sent);
  const r = sent.el.getBoundingClientRect();
  if (r.top < 70 || r.bottom > innerHeight - 90) sent.el.scrollIntoView({ block: 'center', behavior: document.documentElement.hasAttribute('data-calm') ? 'auto' : 'smooth' });
  const u = new SpeechSynthesisUtterance(sent.text.replace(/×/g, ' times '));
  const v = bestVoice(); if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = settings.all().rate || 0.95; u.pitch = 1.02;
  u.onboundary = e => {
    if (e.name !== 'word' || !state) return;
    const len = e.charLength || (sent.text.slice(e.charIndex).match(/^\S+/) || [''])[0].length;
    const wr = rangeFor(sent.nodes, sent.start + e.charIndex, sent.start + e.charIndex + len);
    mark(sent, wr);
  };
  u.onend = () => { if (state && state.i === i && !state.paused) speak(i + 1); };
  u.onerror = () => { if (state && state.i === i) speak(i + 1); };
  synth.speak(u);
}

export function start(root, from = 0, onChange) {
  if (!canRead) return false;
  stop(true);
  const sentences = collect(root);
  if (!sentences.length) return false;
  state = { sentences, i: from, root, onChange };
  // tap a sentence to jump there
  state.tap = e => {
    if (e.target.closest('a,button,input,canvas,label')) return;
    const x = e.clientX, y = e.clientY;
    const k = state.sentences.findIndex(s => [...s.range.getClientRects()].some(rc => x >= rc.left && x <= rc.right && y >= rc.top - 2 && y <= rc.bottom + 2));
    if (k >= 0) { synth.cancel(); speak(k); }
  };
  root.addEventListener('click', state.tap);
  document.documentElement.classList.add('is-reading');
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  synth.cancel();
  speak(from);
  onChange && onChange(true);
  track('lbl2_read_aloud');
  return true;
}
export function stop(silent) {
  if (!state) return;
  const s = state; state = null;
  s.root.removeEventListener('click', s.tap);
  try { synth.cancel(); } catch (e) {}
  clearMarks();
  document.documentElement.classList.remove('is-reading');
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
  if (!silent && s.onChange) s.onChange(false);
  else if (s.onChange) s.onChange(false);
}
export const reading = () => !!state;
if (canRead) { synth.getVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', () => {}); }
