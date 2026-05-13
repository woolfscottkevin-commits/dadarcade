// Shared helpers for the Morning Drive API + cron routes.
// Single source of truth for: Supabase client, fingerprinting, date math,
// payload schema, and the prompt builder.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { z } from "zod";

// ----------------------------------------------------------------------------
// Supabase
// ----------------------------------------------------------------------------

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----------------------------------------------------------------------------
// Date helpers — everything anchors to America/New_York (where the kids live)
// ----------------------------------------------------------------------------

const ET_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayET(date = new Date()) {
  return ET_FMT.format(date); // "YYYY-MM-DD"
}

export function isValidDateStr(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ----------------------------------------------------------------------------
// Fingerprinting — used for the "never repeat" guarantee
// ----------------------------------------------------------------------------

export function fingerprint(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

// Walk the payload and emit one { kind, fingerprint } per item that should
// never repeat across days.
export function extractFingerprints(payload) {
  const out = [];
  const push = (kind, text) => {
    if (!text) return;
    out.push({ kind, fingerprint: fingerprint(text) });
  };

  for (const m of payload.claireMath || []) push("math", `claire:${m.question}`);
  for (const m of payload.connorMath || []) push("math", `connor:${m.question}`);

  if (payload.wordsOfDay?.connor?.word) push("word", `connor:${payload.wordsOfDay.connor.word}`);
  if (payload.wordsOfDay?.claire?.word) push("word", `claire:${payload.wordsOfDay.claire.word}`);

  if (payload.vocabMatch?.connor?.word) push("vocab_match", `connor:${payload.vocabMatch.connor.word}`);
  if (payload.vocabMatch?.claire?.word) push("vocab_match", `claire:${payload.vocabMatch.claire.word}`);

  for (const n of payload.news || []) push("news", n.headline);
  for (const t of payload.trivia || []) push("trivia", t.question);
  for (const f of payload.facts || []) push("fact", f.title || f.fact);
  for (const j of payload.jokes || []) push("joke", j.setup);
  for (const w of payload.wyr || []) push("wyr", `${w.a} || ${w.b}`);

  return out;
}

// ----------------------------------------------------------------------------
// Schema for the day's payload — passed to generateObject as the response shape
// ----------------------------------------------------------------------------

const mathQ = z.object({
  question: z.string().describe("The math question text. Word problems are encouraged. Use the kid's name (Claire or Connor) sometimes for engagement."),
  choices: z.array(z.string()).length(4).describe("Exactly 4 answer choices, one of which is correct."),
  correctIndex: z.number().int().min(0).max(3).describe("Index of the correct choice in `choices`."),
  hint: z.string().describe("One short, kid-friendly hint, shown only on request."),
  topic: z.string().describe("Short tag like 'addition-regrouping', 'multiplication-facts', 'fractions', 'elapsed-time', 'word-problem-money'. Used for difficulty tuning."),
});

const wotd = z.object({
  word: z.string(),
  definition: z.string().describe("Kid-friendly definition in plain language."),
  example: z.string().describe("One example sentence using the word in context."),
});

const vocabMatchQ = z.object({
  word: z.string().describe("Must match the corresponding word-of-the-day exactly."),
  definition: z.string().describe("The definition shown as the prompt. Should be the same as wordsOfDay's definition."),
  options: z.array(z.string()).length(4).describe("4 word options including the correct word."),
  correctIndex: z.number().int().min(0).max(3),
});

const newsItem = z.object({
  headline: z.string(),
  summary: z.string().describe("2-3 sentence kid-friendly summary."),
  question: z.string().describe("One discussion question — open-ended is great for the car."),
  sourceUrl: z.string().optional().describe("Optional URL if you have a real source. Otherwise leave blank."),
});

const triviaQ = z.object({
  question: z.string(),
  answer: z.string(),
  context: z.string().describe("1-2 sentences of cool context revealed alongside the answer."),
});

const factItem = z.object({
  emoji: z.string().describe("One emoji that matches the fact topic."),
  title: z.string().describe("Short fact headline, e.g., 'Octopus blood is blue'."),
  fact: z.string().describe("2-3 kid-friendly sentences."),
});

const jokeItem = z.object({
  setup: z.string(),
  punchline: z.string(),
  level: z.enum(["connor", "claire"]).describe("Connor for younger/visual, Claire for slightly more verbal."),
});

const wyrItem = z.object({
  a: z.string().describe("Option A — full sentence."),
  b: z.string().describe("Option B — full sentence."),
});

export const payloadSchema = z.object({
  claireMath: z.array(mathQ).length(5),
  connorMath: z.array(mathQ).length(5),
  wordsOfDay: z.object({
    connor: wotd,
    claire: wotd,
  }),
  vocabMatch: z.object({
    connor: vocabMatchQ,
    claire: vocabMatchQ,
  }),
  news: z.array(newsItem).length(2),
  trivia: z.array(triviaQ).length(3),
  facts: z.array(factItem).length(3),
  jokes: z.array(jokeItem).length(2),
  wyr: z.array(wyrItem).length(4),
});

// ----------------------------------------------------------------------------
// Prompt builder
// ----------------------------------------------------------------------------

export function buildPrompt({ dateStr, doNotRepeat, recentDifficulty }) {
  const sections = Object.entries(doNotRepeat || {}).map(([kind, items]) => {
    if (!items || items.length === 0) return null;
    // Cap the list so we don't blow the context. Show the most recent ~150 per kind.
    const slice = items.slice(0, 150);
    return `### ${kind} (${slice.length} items already used)\n${slice.map((s) => `- ${s}`).join("\n")}`;
  }).filter(Boolean).join("\n\n");

  const difficultyNote = recentDifficulty?.length
    ? `### Recent difficulty signal (last 14 days)\n${recentDifficulty.join("\n")}\n\nUse this to nudge today's math: if Connor or Claire averaged > 2 attempts on a topic, dial it slightly easier. If they averaged ≤ 1.2, dial it slightly harder.`
    : "";

  return `You are building today's Morning Drive content for Kevin's two kids — Claire (Grade 4, older, sharp) and Connor (Grade 2, younger). Date: ${dateStr}.

The kids will play this in the car on the way to school. It needs to feel warm and conversational, and reward both of them at their own level.

## What to generate

- **5 math questions per kid** (10 total), MC with 4 options.
  - Claire (Grade 4): multi-digit addition/subtraction with regrouping, multiplication/division facts up through 12, word problems, fractions, area/perimeter, elapsed time.
  - Connor (Grade 2): 2-digit addition/subtraction, skip counting, early multiplication as grouping, simple word problems, telling time, basic measurement comparisons.
  - One short hint per question.
  - Topic tag per question (used for difficulty tuning).

- **2 Words of the Day** — one Connor-level (concrete, encounterable; e.g., *enormous*, *gentle*, *sturdy*) and one Claire-level (slightly more abstract; e.g., *curious*, *determined*, *vivid*, *peculiar*). Each with kid-friendly definition + one example sentence.

- **2 Vocab-Match questions** — one per kid. Same word as the Word of the Day for that kid. The DEFINITION is the prompt. Options are 4 grade-appropriate words including the correct one. Generate 3 plausible distractors at the same grade level.

- **2 News stories** — kid-appropriate "cool stuff happening" framed as recent. Topics: space discoveries, animals, science, nature, cool inventions, archaeology. NO violence, war, crime, disasters, politics, anything scary. One discussion question per story. Source URLs are optional — leave blank if you don't have a real one.

- **3 History Trivia questions** — mix of difficulty (one Connor can guess, one Claire can guess, one stretch). Topics: explorers, inventors, ancient civilizations, US presidents, scientists. Include 1-2 sentences of context with each answer.

- **3 Fun Facts** — animals, space, food science, nature, human body, geography. Each with one emoji and 2-3 kid-friendly sentences.

- **2 Jokes** — kid-clean (puns, knock-knocks, riddles; no bathroom humor). One Connor-level (visual/concrete) and one Claire-level (verbal/punny). Mark each with the level field.

- **4 Would You Rather** — imaginative, fun, kid-appropriate scenarios.

## Hard "never repeat" rules

Below are items already used in prior days. Do NOT reuse any of them. Vary topics, characters, scenarios, and word choices.

${sections || "(No prior content yet — fresh start.)"}

${difficultyNote}

Return the full structured payload now. Be specific, warm, and a little playful — these get read out loud at 7am.`;
}

// ----------------------------------------------------------------------------
// Difficulty stats — read last 14 days of attempts and build a nudge line
// ----------------------------------------------------------------------------

export async function fetchRecentDifficulty(sb) {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("morning_drive_attempts")
    .select("kid, kind, topic, attempts")
    .gte("date", since);
  if (error || !data?.length) return [];

  // Group by kid + topic, compute average attempts.
  const groups = new Map();
  for (const row of data) {
    const key = `${row.kid}|${row.kind}|${row.topic || "uncategorized"}`;
    if (!groups.has(key)) groups.set(key, { sum: 0, n: 0 });
    const g = groups.get(key);
    g.sum += row.attempts;
    g.n += 1;
  }
  const lines = [];
  for (const [key, g] of groups) {
    if (g.n < 2) continue; // need at least 2 data points to call it a signal
    const [kid, kind, topic] = key.split("|");
    const avg = g.sum / g.n;
    const cap = kid.charAt(0).toUpperCase() + kid.slice(1);
    const tag = `${kind === "math" ? "" : `${kind} — `}${topic}`;
    lines.push(`- ${cap} ${tag}: avg ${avg.toFixed(1)} attempts/question over ${g.n} questions.`);
  }
  return lines;
}

// ----------------------------------------------------------------------------
// Fetch "never repeat" lists by kind
// ----------------------------------------------------------------------------

export async function fetchDoNotRepeat(sb) {
  const { data, error } = await sb
    .from("morning_drive_seen")
    .select("kind, fingerprint, date")
    .order("date", { ascending: false })
    .limit(2000);
  if (error || !data) return {};
  // Group by kind; we send fingerprints (short hashes) as the list — the model
  // can't decode them, but they prevent us re-inserting an exact duplicate,
  // and we also send the human-readable recent items below for actual semantic
  // dedupe. We fetch the readable versions from morning_drive_days separately.
  return { fingerprints: data };
}

// Fetch the last N days of *readable* content so the model can see what's been
// said and avoid it semantically. This is the heavier-but-more-accurate dedupe.
export async function fetchRecentReadable(sb, days = 60) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("morning_drive_days")
    .select("date, payload")
    .gte("date", since)
    .order("date", { ascending: false });
  const buckets = {
    math: [],
    word: [],
    news: [],
    trivia: [],
    fact: [],
    joke: [],
    wyr: [],
    vocab_match: [],
  };
  for (const row of data || []) {
    const p = row.payload || {};
    for (const m of p.claireMath || []) buckets.math.push(`(Claire) ${m.question}`);
    for (const m of p.connorMath || []) buckets.math.push(`(Connor) ${m.question}`);
    if (p.wordsOfDay?.connor?.word) buckets.word.push(`(Connor) ${p.wordsOfDay.connor.word}`);
    if (p.wordsOfDay?.claire?.word) buckets.word.push(`(Claire) ${p.wordsOfDay.claire.word}`);
    if (p.vocabMatch?.connor?.word) buckets.vocab_match.push(`(Connor) ${p.vocabMatch.connor.word}`);
    if (p.vocabMatch?.claire?.word) buckets.vocab_match.push(`(Claire) ${p.vocabMatch.claire.word}`);
    for (const n of p.news || []) buckets.news.push(n.headline);
    for (const t of p.trivia || []) buckets.trivia.push(t.question);
    for (const f of p.facts || []) buckets.fact.push(f.title || f.fact?.slice(0, 80));
    for (const j of p.jokes || []) buckets.joke.push(j.setup);
    for (const w of p.wyr || []) buckets.wyr.push(`${w.a} vs ${w.b}`);
  }
  return buckets;
}
