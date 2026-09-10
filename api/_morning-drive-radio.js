// Morning Drive Radio — a short spoken show for the rest of the drive.
//
// The first version was built entirely out of the day's tiles, and it landed the
// way a recap lands: Connor had just done all of it. The note back was exact —
// "I was looking more for them telling Connor fun, culture, interesting things
// like, hey Connor, did you know the NFL started last night."
//
// So the DJ now has their own material, gathered by code in _morning-drive-buzz:
// real finished games with real scores, and stories from feeds the page does not
// read. The morning's lesson is still in there, but as a nod near the end rather
// than the body of the show.
//
// The safety rule is unchanged and is what makes any of this printable: the
// model never supplies a score, a team, a date or an outlet. It picks from what
// code fetched and says it out loud.
//
// Cost per show, roughly: one small text call for the script (~$0.01) and
// openai/tts-1 for the voice ($0.015 per thousand characters, so ~$0.06 for a
// five-minute show). Rendered once, nightly, into an MP3 in Supabase Storage;
// playing it in the morning costs nothing.

import { generateText, Output, experimental_generateSpeech as generateSpeech } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { KIDS } from "./_morning-drive-shared.js";
import { gatherBuzz } from "./_morning-drive-buzz.js";

const SCRIPT_MODEL = "anthropic/claude-sonnet-4.6";
const SPEECH_MODEL = "openai/tts-1";

// One line to change once a voice is chosen by ear. Options on this model:
// alloy, echo, fable, onyx, nova, shimmer.
export const RADIO_VOICE = "nova";
export const RADIO_ENABLED = true;

export const BUCKET = "morning-drive-audio";
export const KEEP_DAYS = 14; // shows older than this are pruned from storage

// openai/tts-1 refuses inputs over 4096 characters; stay well clear of it.
export const TTS_CHUNK_CHARS = 3500;

// ----------------------------------------------------------------------------
// What the DJ is allowed to talk about
// ----------------------------------------------------------------------------

// Flatten the day's payload into plain facts the script may draw on. Nothing
// else reaches the model, so nothing else can reach the air.
export function radioMaterial(payload) {
  const p = payload || {};
  const news = (p.news || []).map((n) => ({
    headline: n.headline, summary: n.summary, source: n.source, published: n.published,
  }));
  const words = ["connor", "claire"].map((kid) => {
    const w = p.wordsOfDay?.[kid];
    return w ? { kid: KIDS[kid].name, word: w.word, definition: w.definition, example: w.example } : null;
  }).filter(Boolean);
  const jokes = Array.isArray(p.jokes)
    ? p.jokes
    : ["connor", "claire"].flatMap((kid) => (p.jokes?.[kid] || []).map((j) => ({ ...j, kid: KIDS[kid].name })));
  const learned = [];
  for (const f of p.facts || []) learned.push({ kind: "fun fact", title: f.title, text: f.fact });
  const trivia = Array.isArray(p.trivia) ? p.trivia : ["connor", "claire"].flatMap((k) => p.trivia?.[k] || []);
  for (const t of trivia) learned.push({ kind: "history", question: t.question, answer: t.answer, context: t.context });
  if (p.thisDayInHistory) learned.push({ kind: "on this day", year: p.thisDayInHistory.year, event: p.thisDayInHistory.event, context: p.thisDayInHistory.context });
  if (p.animal) learned.push({ kind: "animal", name: p.animal.name, facts: p.animal.facts });
  if (p.landmark) learned.push({ kind: "landmark", name: p.landmark.name, country: p.landmark.country, funFact: p.landmark.funFact });
  if (p.artwork) learned.push({ kind: "art", title: p.artwork.title, artist: p.artwork.artist, story: p.artwork.story });
  const quote = p.quote ? { text: p.quote.text, author: p.quote.author } : null;
  const trait = p.characterTrait ? { trait: p.characterTrait.trait, challenge: p.characterTrait.challenge } : null;
  return { news, words, jokes, learned, quote, trait };
}

// ----------------------------------------------------------------------------
// Script
// ----------------------------------------------------------------------------

const scriptSchema = z.object({
  segments: z.array(z.object({
    id: z.enum(["intro", "sports", "world", "jokes", "lesson", "signoff"]),
    text: z.string().describe("Exactly what the DJ says, as spoken prose. No headings, no bullet points, no URLs. Write <beat> where the delivery should stop for half a second — before a punchline, or before a big reveal."),
  })).min(4).max(8),
});

export async function writeRadioScript({ payload, dateStr, buzz = null }) {
  const m = radioMaterial(payload);
  const dayLabel = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  const sports = (buzz?.sports || []).slice(0, 8).map((g, i) =>
    `${i}. [${g.context}] ${g.winner} beat ${g.loser} ${g.score}${g.overtime ? " in overtime" : ""}.` +
    (g.standout ? ` Best game from ${g.standout}.` : "")
  ).join("\n");

  const stories = (buzz?.stories || []).map((c, i) =>
    `${i}. [${c.source}, ${c.published || "this week"}] ${c.title}\n   ${c.summary.slice(0, 300)}`
  ).join("\n\n");

  const prompt = `You are the host of "Morning Drive Radio", a few minutes of radio for ${KIDS.claire.name} (age ${KIDS.claire.age}) and ${KIDS.connor.name} (age ${KIDS.connor.age}), played in the car on the way to school. Today is ${dayLabel}.

You are not a teacher and this is not a recap. They have already done their morning activities. Your job is to tell them what is going on out in the world — the things they would want to repeat to a friend at lunch.

## What happened in sport
${sports || "(nothing finished in the last couple of days — skip the sport segment entirely)"}

## What else is going on
${stories || "(no stories available — skip the world segment entirely)"}

## Their jokes for today (tell each one properly)
${JSON.stringify(m.jokes, null, 1)}

## From this morning's activities — for a short nod near the end, NOT the body of the show
Words they learned: ${JSON.stringify(m.words)}
${m.learned.length ? `Things they read about: ${JSON.stringify(m.learned.slice(0, 3))}` : ""}
${m.trait ? `Today's challenge: ${m.trait.trait} — ${m.trait.challenge}` : ""}

## The show
- Segments in this order, each one its own entry: intro, sports, world, jokes, lesson, signoff.
- Skip "sports" or "world" only if the material above says to.
- 550 to 800 words in total, and most of those words belong to sport and the world — the "lesson" segment is four or five sentences at most.
- "sports": pick the one or two results they would find most interesting and say who played, who won and the score. Say what it means if the material tells you — the first week of a season, a playoff game, an overtime finish.
- "world": pick two or three stories and tell them like a friend telling you something great. Name the outlet once per story. A new dinosaur, an animal, something in the sky tonight — those beat a study about scientific method.
- "lesson": one quick "and nice work this morning" — name a word they learned or one thing they read, then today's challenge if there is one. Four or five sentences. Do not re-teach it.

## How to say it
- Warm drive-time radio energy. Talk to them by name when you hand them something new: "Connor, listen to this one."
- Say ONLY what the material says. Every score, team, date and outlet is given to you above — copy it exactly. Never add a number, a result, a name or a claim of your own. If you are not sure, leave it out.
- You may make a size or a weight mean something by comparing it to one familiar object, but only where it is true with plenty of room to spare — a twenty-metre dinosaur is "longer than a school bus", not "longer than two school buses". If the comparison needs arithmetic to check, do not make it; say the number instead.
- Scores are already written in words. Use them exactly as written and never turn them back into digits.
- Write <beat> where the delivery should stop for half a second: right before every punchline, and before a big reveal. Nowhere else.
- Written for the ear: contractions, short sentences, no lists, no headings, no web addresses, no emoji, no stage directions other than <beat>.
- Nothing frightening, sad, violent or political. Nothing that talks down to them.
- Close by telling them to have a great day at school.`;

  const { output } = await generateText({
    model: SCRIPT_MODEL,
    output: Output.object({ schema: scriptSchema }),
    prompt,
  });
  const segments = (output.segments || []).filter((s) => s.text && s.text.trim());
  const words = segments.reduce((n, s) => n + s.text.replace(/<beat>/g, " ").split(/\s+/).filter(Boolean).length, 0);
  return { segments, words };
}

// ----------------------------------------------------------------------------
// Voice
// ----------------------------------------------------------------------------

// A punchline landed on top of its own setup in the first show. The voice model
// has no control for timing, so the pause is made here instead: real silence,
// spliced between two separate pieces of speech.
//
// The silence has to match the speech it sits between, and that is not a
// constant — openai/tts-1 and Grok return 24 kHz, fish-audio returns 44.1 kHz.
// So the frame is read off the audio that came back rather than assumed. A
// Layer III frame whose side info is all zeros carries no audio data and decodes
// to silence; ffmpeg reads a run of them as -91 dB for exactly the right length.

const MPEG_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
const L3_BITRATES = {
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],   // MPEG-1
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],       // MPEG-2 / 2.5
};

// Read the first MPEG audio frame header in a buffer.
export function frameSpec(bytes) {
  for (let i = 0; i + 4 <= bytes.length && i < 8192; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const version = (bytes[i + 1] >> 3) & 0x03;      // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
    const layer = (bytes[i + 1] >> 1) & 0x03;        // 1 = Layer III
    if (layer !== 1 || version === 1) continue;      // reserved values: not a real header
    const rates = MPEG_RATES[version];
    const bitrates = L3_BITRATES[version === 3 ? 3 : 2];
    const bitrate = bitrates[(bytes[i + 2] >> 4) & 0x0f] * 1000;
    const sampleRate = rates?.[(bytes[i + 2] >> 2) & 0x03];
    if (!bitrate || !sampleRate) continue;
    const samples = version === 3 ? 1152 : 576;
    return {
      header: [bytes[i], bytes[i + 1], bytes[i + 2] & 0xfd, bytes[i + 3]], // padding bit cleared
      frameBytes: Math.floor((samples / 8) * bitrate / sampleRate),
      frameMs: (samples / sampleRate) * 1000,
      sampleRate, bitrate,
    };
  }
  return null;
}

// The format openai/tts-1 has always returned, used when nothing is available to
// read — an empty show, or a model that returns something unparseable.
const DEFAULT_SPEC = { header: [0xff, 0xf3, 0xc4, 0xc0], frameBytes: 384, frameMs: (576 / 24000) * 1000, sampleRate: 24000, bitrate: 128000 };

export const BEAT_MS = 550;        // before a punchline
export const SEGMENT_GAP_MS = 400; // between segments, so it breathes like radio

export function silentFrames(ms, spec = DEFAULT_SPEC) {
  const { header, frameBytes, frameMs } = spec || DEFAULT_SPEC;
  const n = Math.max(1, Math.round(ms / frameMs));
  const out = new Uint8Array(frameBytes * n);
  for (let i = 0; i < n; i++) out.set(header, i * frameBytes);
  return out;
}

// Respellings applied to the microphone only — never to anything on the page.
// tts-1 stumbles over "Connor"; which spelling fixes it is a question for an ear,
// not for me, so this stays empty until someone has listened to the samples.
export const PRONUNCIATION = [
  // [/\bConnor\b/g, "Conner"],
];

// Everything between the script and the voice: markers out, respellings in.
export function sayable(text) {
  let out = String(text || "").replace(/<beat>/g, " ").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of PRONUNCIATION) out = out.replace(pattern, replacement);
  return out;
}

// A segment becomes the pieces of speech it is made of, with the beats marked.
export function splitOnBeats(text) {
  return String(text || "")
    .split("<beat>")
    .map((part) => sayable(part))
    .filter(Boolean);
}

// Break text into pieces under the TTS limit, on sentence boundaries so a
// chunk never ends mid-word.
export function chunkForTts(text, max = TTS_CHUNK_CHARS) {
  const sentences = String(text || "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) || [];
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    let piece = s;
    // Flush the current chunk if this sentence would push it over the limit.
    if (cur && (cur + piece).length > max) { chunks.push(cur.trim()); cur = ""; }
    // A single sentence longer than the limit is cut hard rather than dropped.
    // The first version of this loop sliced from `s` without ever shortening
    // it and ran until the heap gave out — caught by the test suite, which
    // crashed Node instead of failing an assertion.
    while (piece.length > max) { chunks.push(piece.slice(0, max)); piece = piece.slice(max); }
    cur += piece;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// Each TTS response is a complete MPEG stream from the same encoder at the
// same settings, so the frames can be laid end to end. Any ID3 header on a
// later piece is stripped so the player does not hit metadata mid-stream.
export function stripId3(bytes) {
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    return bytes.subarray(10 + size);
  }
  return bytes;
}

export function concatMp3(parts) {
  const cleaned = parts.map((p, i) => (i === 0 ? p : stripId3(p)));
  const total = cleaned.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of cleaned) { out.set(p, off); off += p.length; }
  return out;
}

export async function renderRadioAudio(segments, { voice = RADIO_VOICE, model = SPEECH_MODEL } = {}) {
  const parts = [];
  let chars = 0;
  let spoken = 0;   // pieces of speech
  let pauses = 0;   // silences spliced in
  let spec = null;  // learned from the first piece that comes back

  // Silences are queued rather than pushed, because until the first piece of
  // speech arrives there is nothing to match their sample rate to.
  const pending = [];
  const flush = () => {
    for (const ms of pending.splice(0)) { parts.push(silentFrames(ms, spec)); pauses++; }
  };

  for (const [segmentIndex, seg] of segments.entries()) {
    const beats = splitOnBeats(seg.text);
    for (const [beatIndex, piece] of beats.entries()) {
      if (beatIndex > 0) pending.push(BEAT_MS);
      for (const chunk of chunkForTts(piece)) {
        const { audio } = await generateSpeech({
          model: gateway.speechModel(model),
          text: chunk,
          voice,
          outputFormat: "mp3",
        });
        const bytes = audio.uint8Array ?? new Uint8Array(Buffer.from(audio.base64, "base64"));
        spec ??= frameSpec(stripId3(bytes));
        flush();
        parts.push(bytes);
        chars += chunk.length;
        spoken++;
      }
    }
    if (segmentIndex < segments.length - 1) pending.push(SEGMENT_GAP_MS);
  }

  return { bytes: concatMp3(parts), chars, pieces: spoken, pauses, sampleRate: spec?.sampleRate ?? null, bitrate: spec?.bitrate ?? null };
}

// ----------------------------------------------------------------------------
// Storage
// ----------------------------------------------------------------------------

export async function uploadRadio(sb, dateStr, bytes) {
  const path = `${dateStr}.mp3`;
  const { error } = await sb.storage.from(BUCKET).upload(path, Buffer.from(bytes), {
    contentType: "audio/mpeg", upsert: true, cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Storage is bounded: a five-minute show is ~5MB, and two weeks is plenty of
// Past Days to listen back to.
export async function pruneRadio(sb, today, keepDays = KEEP_DAYS) {
  const { data, error } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
  if (error || !data) return { removed: 0 };
  const cutoff = Date.parse(today) - keepDays * 86400000;
  const stale = data
    .map((f) => f.name)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.mp3$/.test(n) && Date.parse(n.slice(0, 10)) < cutoff);
  if (stale.length) await sb.storage.from(BUCKET).remove(stale);
  return { removed: stale.length };
}

// ----------------------------------------------------------------------------
// The whole thing
// ----------------------------------------------------------------------------

// The stream is constant bitrate, so its length is arithmetic rather than a
// guess. The first version estimated from character count and was twenty seconds
// long over a four-minute show.

export async function buildRadio(sb, { payload, dateStr, voice = RADIO_VOICE, model = SPEECH_MODEL, buzz = null }) {
  const t0 = Date.now();

  // Gathered here rather than passed in, so a caller cannot forget it and
  // quietly get the old recap show back. Sport and stories are best-effort:
  // if both come back empty the script still runs, on jokes and the lesson.
  const material = buzz ?? await gatherBuzz(dateStr, {
    avoidSubjects: (payload?.news || []).map((n) => n.subject).filter(Boolean),
  }).catch(() => null);

  const script = await writeRadioScript({ payload, dateStr, buzz: material });
  if (!script.segments.length) throw new Error("radio: empty script");
  const audio = await renderRadioAudio(script.segments, { voice, model });
  const url = await uploadRadio(sb, dateStr, audio.bytes);
  const prune = await pruneRadio(sb, dateStr).catch(() => ({ removed: 0 }));
  return {
    url,
    voice,
    model,
    words: script.words,
    chars: audio.chars,
    pieces: audio.pieces,
    pauses: audio.pauses,
    sampleRate: audio.sampleRate,
    bytes: audio.bytes.length,
    durationSec: Math.round(audio.bytes.length / ((audio.bitrate || 128_000) / 8)),
    segments: script.segments.map((s) => s.id),
    // Kept so what the DJ said is readable without listening to four minutes of
    // it — the fastest way to tell whether a prompt change did what was wanted.
    transcript: script.segments.map((s) => ({ id: s.id, text: s.text })),
    sports: (material?.sports || []).length,
    stories: (material?.stories || []).length,
    renderedAt: new Date().toISOString(),
    pruned: prune.removed,
    elapsedMs: Date.now() - t0,
  };
}
