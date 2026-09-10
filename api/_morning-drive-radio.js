// Morning Drive Radio — a short spoken show built from the day's content.
//
// The DJ has nothing of their own to say. Every line is a retelling of
// something already on the page: the two real news stories (with their
// outlets named), the words of the day, the jokes, and whichever fact, trivia
// answer or On-This-Day event ran. That is the point — it is the same morning,
// heard instead of read, for after the tiles are done.
//
// Cost per show, roughly: one small text call for the script (~$0.01) and
// openai/tts-1 for the voice ($0.015 per thousand characters, so ~$0.06 for a
// five-minute show). Rendered once, nightly, into an MP3 in Supabase Storage;
// playing it in the morning costs nothing.

import { generateText, Output, experimental_generateSpeech as generateSpeech } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { KIDS } from "./_morning-drive-shared.js";

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
    id: z.enum(["intro", "news", "words", "jokes", "learned", "signoff"]),
    text: z.string().describe("Exactly what the DJ says, as spoken prose. No headings, no bullet points, no URLs."),
  })).min(4).max(8),
});

export async function writeRadioScript({ payload, dateStr }) {
  const m = radioMaterial(payload);
  const dayLabel = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  const prompt = `You are the host of "Morning Drive Radio", a short show for ${KIDS.claire.name} (age 9) and ${KIDS.connor.name} (age 7), played in the car after they have finished their morning activities. Today is ${dayLabel}.

Write the show as segments of spoken prose. Everything you say must come from the material below — you are retelling the morning, not adding to it.

## Material

NEWS (name the outlet each time, e.g. "Smithsonian Magazine reported…"):
${JSON.stringify(m.news, null, 1)}

WORDS OF THE DAY:
${JSON.stringify(m.words, null, 1)}

JOKES (tell each one — setup, a beat, punchline):
${JSON.stringify(m.jokes, null, 1)}

THINGS THEY LEARNED TODAY (pick the two or three best):
${JSON.stringify(m.learned, null, 1)}

${m.quote ? `QUOTE: "${m.quote.text}" — ${m.quote.author}` : ""}
${m.trait ? `TODAY'S CHALLENGE: ${m.trait.trait} — ${m.trait.challenge}` : ""}

## Rules
- Segments in this order: intro, news, words, jokes, learned, signoff. Skip a segment only if there is no material for it.
- 550 to 800 words in total. It is read aloud at a natural pace, so that is four to five minutes.
- Warm, upbeat radio-host energy — not shouty, not sing-song. Talk to them by name once or twice, not every sentence.
- Say only what the material says. Do not add facts, numbers or claims. If a story mentions a number, say it in words a child can follow.
- Written for the ear: contractions, short sentences, no lists, no headings, no web addresses, no emoji. Spell out abbreviations.
- Nothing frightening, sad or violent. Nothing that talks down to them.
- Close by telling them to have a great day at school.`;

  const { output } = await generateText({
    model: SCRIPT_MODEL,
    output: Output.object({ schema: scriptSchema }),
    prompt,
  });
  const segments = (output.segments || []).filter((s) => s.text && s.text.trim());
  const words = segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  return { segments, words };
}

// ----------------------------------------------------------------------------
// Voice
// ----------------------------------------------------------------------------

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

export async function renderRadioAudio(segments, { voice = RADIO_VOICE } = {}) {
  const parts = [];
  let chars = 0;
  for (const seg of segments) {
    for (const chunk of chunkForTts(seg.text)) {
      const { audio } = await generateSpeech({
        model: gateway.speechModel(SPEECH_MODEL),
        text: chunk,
        voice,
        outputFormat: "mp3",
      });
      parts.push(audio.uint8Array ?? new Uint8Array(Buffer.from(audio.base64, "base64")));
      chars += chunk.length;
    }
  }
  return { bytes: concatMp3(parts), chars, pieces: parts.length };
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

// Rough speaking pace for openai/tts-1 at default speed.
const CHARS_PER_SECOND = 15;

export async function buildRadio(sb, { payload, dateStr, voice = RADIO_VOICE }) {
  const t0 = Date.now();
  const script = await writeRadioScript({ payload, dateStr });
  if (!script.segments.length) throw new Error("radio: empty script");
  const audio = await renderRadioAudio(script.segments, { voice });
  const url = await uploadRadio(sb, dateStr, audio.bytes);
  const prune = await pruneRadio(sb, dateStr).catch(() => ({ removed: 0 }));
  return {
    url,
    voice,
    words: script.words,
    chars: audio.chars,
    pieces: audio.pieces,
    bytes: audio.bytes.length,
    durationSec: Math.round(audio.chars / CHARS_PER_SECOND),
    segments: script.segments.map((s) => s.id),
    renderedAt: new Date().toISOString(),
    pruned: prune.removed,
    elapsedMs: Date.now() - t0,
  };
}
