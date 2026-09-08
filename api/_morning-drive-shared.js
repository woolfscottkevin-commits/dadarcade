// Shared helpers for the Morning Drive API + cron routes.
// Single source of truth for: Supabase client, fingerprinting, date math,
// payload schema, section rotation, the math variety planner, the vocab
// review builder, and the prompt builder.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { z } from "zod";

// ============================================================================
// CONFIG — the stuff Kevin edits
// ============================================================================

// Bump these each August when school starts. Everything downstream (math
// topics, reading level, vocab difficulty) keys off `grade`.
export const KIDS = {
  claire: { name: "Claire", grade: 4, blurb: "older, sharp, reads well" },
  connor: { name: "Connor", grade: 2, blurb: "younger, concrete thinker" },
};

// Bible translation for the daily verse. NIrV / ICB sit at roughly a 3rd-grade
// reading level, which is the level Connor can follow when it's read aloud.
export const BIBLE_TRANSLATION =
  "NIrV (New International Reader's Version) or ICB (International Children's Bible) — simple, kid-readable wording";

// Sections that appear EVERY day: the skills that benefit from consistency,
// plus the two reflective tiles and the jokes that close the drive.
export const DAILY_SECTIONS = [
  "claireMath",
  "connorMath",
  "grammarClaire",
  "grammarConnor",
  "wordsOfDay",
  "bibleVerse",
  "quote",
  "jokes",
];

// Sections that rotate so the drive doesn't balloon to 17 sections. Each day
// picks ROTATING_PER_DAY of these, deterministically from the date — so a past
// day always replays with the exact same sections it originally had.
// Raise ROTATING_PER_DAY to 7 to show everything every day.
export const ROTATING_POOL = [
  "geography",
  "wyr",
  "news",
  "trivia",
  "facts",
  "thisDayInHistory",
  "riddle",
  "twoTruths",
  "characterTrait",
  "artwork",
  "landmark",
  "flag",
  "animal",
  "spelling",
  "spanishWord",
];
export const ROTATING_PER_DAY = 5;

// Tiles that load a photo. Capped per day because this is read on a phone on
// mobile data in a moving car — each image is roughly 100-250KB, so three or
// four at once is a noticeably slower morning.
export const IMAGE_SECTIONS = ["artwork", "landmark", "flag", "animal"];
// Exactly one visual a day now — the rotation reserves a slot for it, so this
// is a description of the design rather than a cap applied afterwards.
export const MAX_IMAGE_SECTIONS_PER_DAY = 1;

// How many previously-learned words each kid reviews in Word Match.
export const VOCAB_REVIEW_PER_KID = 3;


// Grammar gets the same assigned-topic rotation as math, for the same reason:
// left to itself the model will ask about nouns and verbs every single day.
export const GRAMMAR_TOPICS = {
  claire: [
    "commas in a series",
    "commas after introductory phrases",
    "apostrophes: possessive vs plural",
    "its vs it's",
    "their / there / they're",
    "your / you're",
    "subject-verb agreement",
    "past, present and future tense consistency",
    "common vs proper nouns",
    "adjectives vs adverbs",
    "prepositions and prepositional phrases",
    "conjunctions joining two sentences",
    "quotation marks in dialogue",
    "complete sentences vs fragments",
    "run-on sentences",
    "pronouns and what they refer to",
    "comparative and superlative forms",
    "homophones (to/too/two, here/hear)",
    "capitalising titles and proper nouns",
    "singular and plural irregular nouns",
  ],
  connor: [
    "capital letter at the start of a sentence",
    "capital letters for names and places",
    "ending a sentence with a period",
    "question marks",
    "exclamation marks",
    "nouns: person, place or thing",
    "verbs: action words",
    "adjectives: describing words",
    "plural nouns with -s and -es",
    "a vs an",
    "is vs are",
    "was vs were",
    "contractions (do not / don't)",
    "commas in a list of three",
    "sentence word order that makes sense",
    "rhyming and word families",
    "compound words",
    "silent letters",
    "syllables in a word",
    "opposites (antonyms)",
  ],
};

export const GRAMMAR_FORMATS = [
  "pick the sentence that is written correctly",
  "choose the word that correctly fills the blank",
  "find the word in the sentence that is the given part of speech",
  "spot the mistake in a sentence",
  "choose the correct punctuation for a sentence",
  "decide which two sentences join together best",
];

// ----------------------------------------------------------------------------
// Math variety engine
// ----------------------------------------------------------------------------
// The old prompt shipped one fixed list of ~6 topics per kid every single night
// and asked the model not to repeat *question text*. The model complied the
// cheapest way it could: same problem skeleton, new name, new numbers. So we
// now assign each question an explicit (topic, format) pair, rotated by date.
// Variety becomes structural instead of something we hope for.

export const MATH_TOPICS = {
  claire: [
    "multi-digit addition with regrouping",
    "multi-digit subtraction with regrouping",
    "multiplication facts through 12",
    "division facts and remainders",
    "multi-digit multiplication (2-digit by 1-digit)",
    "equivalent fractions",
    "comparing and ordering fractions",
    "adding and subtracting fractions with like denominators",
    "decimals to the hundredths place",
    "area of rectangles",
    "perimeter of shapes",
    "elapsed time",
    "money and making change",
    "rounding and estimation",
    "place value to the hundred-thousands",
    "number patterns and rules",
    "measurement conversion (feet/inches, minutes/hours)",
    "angles and lines (right, acute, obtuse)",
    "symmetry and shape properties",
    "factors and multiples",
  ],
  connor: [
    "two-digit addition without regrouping",
    "two-digit addition with regrouping",
    "two-digit subtraction without regrouping",
    "two-digit subtraction with regrouping",
    "skip counting by 2s, 5s, and 10s",
    "early multiplication as equal groups",
    "sharing equally (early division)",
    "telling time to the nearest five minutes",
    "counting coins and dollar amounts",
    "comparing numbers with > and <",
    "place value to the hundreds",
    "simple fractions (halves, thirds, fourths)",
    "measuring length in inches and centimeters",
    "reading a simple picture graph",
    "shapes and their sides and corners",
    "odd and even numbers",
    "number bonds to 20",
    "missing addend problems",
    "ordering numbers to 1000",
    "doubles and near doubles",
  ],
};

// The SHAPE of the question, independent of the topic. Pairing a rotating topic
// with a rotating format is what stops "Claire has N apples" from being every
// question forever.
export const MATH_FORMATS = [
  "a short story word problem about something a kid cares about",
  "a straight computation shown as a number sentence",
  "a comparison question (which is bigger / which is correct)",
  "a missing-number puzzle (fill in the blank)",
  "a two-step problem that needs one intermediate answer",
  "a real-world money or shopping situation",
  "a real-world time or schedule situation",
  "a pattern or sequence — find what comes next",
  "a question that reads data out of a tiny list or table described in words",
  "an estimation question (about how much / roughly how many)",
  "a 'spot the mistake' question where someone solved it wrong",
  "a measurement or comparison-of-units situation",
];

// ============================================================================
// Supabase
// ============================================================================

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

// ============================================================================
// Date helpers — everything anchors to America/New_York (where the kids live)
// ============================================================================

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

// Stable integer for a date string — the rotation seed. Same date always yields
// the same number, so re-generating an old day reproduces its exact sections.
export function daySeed(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// Human-friendly "August 28" for prompts that need the calendar date.
export function monthDayLabel(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long", day: "numeric", timeZone: "UTC",
  });
}

// ============================================================================
// Section rotation
// ============================================================================

// Deterministically choose which rotating sections run on a given date. Walks
// the pool with a stride so consecutive days share as few sections as possible.
// Every morning gets exactly one picture-or-video tile and four text tiles.
//
// The first attempt picked five from one pool and then swapped a visual in on
// days that happened to have none. That skewed the distribution badly (some
// tiles 1.45x others), because the swap both over-served visuals and robbed
// whichever tile it displaced. Reserving the slot up front is fair by
// construction and needs no correction afterwards.
//
// It also fixes the bandwidth question for free: exactly one image a day rather
// than a cap of two.
export function pickRotation(dateStr) {
  const seed = daySeed(dateStr);
  const visuals = ROTATING_POOL.filter((s) => IMAGE_SECTIONS.includes(s));
  const texts = ROTATING_POOL.filter((s) => !IMAGE_SECTIONS.includes(s));

  // gcd(3, 4) = 1, so the visual walks all four rather than sticking on some.
  const picked = [visuals[(seed * 3) % visuals.length]];

  // texts.length is 11 (prime), so every multiplier is coprime with it: the
  // day-offset visits all 11 and the within-day step gives 4 distinct picks.
  const wanted = Math.max(0, ROTATING_PER_DAY - 1);
  for (let i = 0; i < wanted; i++) {
    picked.push(texts[(seed * 7 + i * 3) % texts.length]);
  }
  return picked;
}

export function activeSectionsFor(dateStr) {
  return [...DAILY_SECTIONS, ...pickRotation(dateStr)];
}

// ============================================================================
// Math planning — assign each question an explicit (topic, format)
// ============================================================================

export function assignMathPlan(dateStr, kid, count = 5) {
  const topics = MATH_TOPICS[kid] || [];
  const seed = daySeed(dateStr);
  const T = topics.length;        // 20
  const F = MATH_FORMATS.length;  // 12

  // The day-advance multiplier MUST be coprime with the pool length, or the
  // whole schedule cycles early — `seed * 5 % 20` only ever lands on 4 distinct
  // offsets, which meant every 4th day drew the identical topic set. 7 is
  // coprime with both 20 and 12, so topics cycle with period 20 and formats
  // with period 12 (a 60-day plan cycle overall).
  //
  // The within-day step must ALSO be coprime with the pool length. A step of 4
  // over 20 topics looks fine per-day (5 distinct topics) but silently pins the
  // whole day to one residue class mod 4 — meaning only 4 distinct topic SETS
  // exist and the set repeats every 4th day. Step 3 is coprime with 20, so the
  // set genuinely walks the whole list.
  const plan = [];
  for (let i = 0; i < count; i++) {
    const topic = topics[(seed * 7 + i * 3) % T];
    // Format runs on a deliberately different day-multiplier (5 vs 7) so the two
    // progressions drift against each other instead of marching in lockstep —
    // that's what stops a given topic being welded to the same format every
    // time it comes back around.
    const format = MATH_FORMATS[(seed * 5 + i * 5) % F];
    plan.push({ topic, format });
  }
  return plan;
}

export function assignGrammarPlan(dateStr, kid, count = 2) {
  const topics = GRAMMAR_TOPICS[kid] || [];
  const seed = daySeed(dateStr);
  const T = topics.length;   // 20
  const F = GRAMMAR_FORMATS.length; // 6
  const plan = [];
  for (let i = 0; i < count; i++) {
    // Same coprimality rule as the math planner: 7 with 20, and a within-day
    // step of 3 so the picked SET walks the list instead of being pinned to one
    // residue class.
    const topic = topics[(seed * 7 + i * 3) % T];
    const format = GRAMMAR_FORMATS[(seed * 5 + i) % F];
    plan.push({ topic, format });
  }
  return plan;
}

// ============================================================================
// Fingerprinting — used for the "never repeat" guarantee
// ============================================================================

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

  for (const n of payload.news || []) push("news", n.headline);
  for (const t of payload.trivia || []) push("trivia", t.question);
  for (const f of payload.facts || []) push("fact", f.title || f.fact);
  for (const j of payload.jokes || []) push("joke", j.setup);
  for (const w of payload.wyr || []) push("wyr", `${w.a} || ${w.b}`);

  if (payload.bibleVerse?.reference) push("bible", payload.bibleVerse.reference);
  if (payload.quote?.text) push("quote", payload.quote.text);
  if (payload.geography?.us?.question) push("geo_us", payload.geography.us.question);
  if (payload.geography?.world?.question) push("geo_world", payload.geography.world.question);
  if (payload.thisDayInHistory?.event) push("tdih", payload.thisDayInHistory.event);
  if (payload.riddle?.riddle) push("riddle", payload.riddle.riddle);
  if (payload.twoTruths?.items?.length) push("two_truths", payload.twoTruths.items.map((i) => i.text).join(" | "));
  if (payload.characterTrait?.trait) push("trait", payload.characterTrait.trait);
  for (const g of payload.grammarClaire || []) push("grammar", `claire:${g.question}`);
  for (const g of payload.grammarConnor || []) push("grammar", `connor:${g.question}`);
  if (payload.artwork?.title) push("artwork", payload.artwork.title);
  for (const c of payload.artwork?.candidates || []) push("artwork", c.title);
  if (payload.landmark?.name) push("landmark", payload.landmark.name);
  if (payload.flag?.country) push("flag", payload.flag.country);
  if (payload.animal?.name) push("animal", payload.animal.name);
  if (payload.spanishWord?.spanish) push("spanish", payload.spanishWord.spanish);
  for (const w of payload.spelling?.claire || []) push("spelling", `claire:${w.word}`);
  for (const w of payload.spelling?.connor || []) push("spelling", `connor:${w.word}`);

  return out;
}

// ============================================================================
// Payload schema — built per-day so the model is only ever asked for the
// sections that are actually running today.
// ============================================================================

const mathQ = z.object({
  question: z.string().describe("The math question text. Use the kid's name sometimes, but do NOT make every question a 'X has N items' story — follow the assigned format."),
  choices: z.array(z.string()).length(4).describe("Exactly 4 answer choices, one of which is correct."),
  correctIndex: z.number().int().min(0).max(3).describe("Index of the correct choice in `choices`."),
  hint: z.string().describe("One short, kid-friendly hint, shown only on request."),
  topic: z.string().describe("The assigned topic tag for this question, copied from the plan."),
  format: z.string().describe("The assigned format for this question, copied from the plan."),
});

const wotd = z.object({
  word: z.string(),
  definition: z.string().describe("Kid-friendly definition in plain language."),
  example: z.string().describe("One example sentence using the word in context."),
});

const newsItem = z.object({
  subject: z.string().describe("Two or three words naming the SUBJECT, lowercase, e.g. \"octopus blood\", \"saturn rings\", \"great wall\". Used to stop the same topic appearing twice — in different tiles on the same day, or weeks apart."),
  headline: z.string(),
  summary: z.string().describe("2-3 sentence kid-friendly summary."),
  question: z.string().describe("One discussion question — open-ended is great for the car."),
  sourceUrl: z.string().optional().describe("Optional URL if you have a real source. Otherwise leave blank."),
});

const triviaQ = z.object({
  subject: z.string().describe("Two or three words naming the SUBJECT, lowercase, e.g. \"octopus blood\", \"saturn rings\", \"great wall\". Used to stop the same topic appearing twice — in different tiles on the same day, or weeks apart."),
  question: z.string(),
  answer: z.string(),
  context: z.string().describe("1-2 sentences of cool context revealed alongside the answer."),
});

const factItem = z.object({
  subject: z.string().describe("Two or three words naming the SUBJECT, lowercase, e.g. \"octopus blood\", \"saturn rings\", \"great wall\". Used to stop the same topic appearing twice — in different tiles on the same day, or weeks apart."),
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

const bibleVerse = z.object({
  reference: z.string().describe("Book chapter:verse, e.g. 'Psalm 23:1'."),
  text: z.string().describe("The verse itself, in simple kid-readable wording."),
  translation: z.string().describe("Which translation the wording reflects, e.g. 'NIrV'."),
  question: z.string().describe("An open question asking the kids what they think it means. Warm, not a quiz."),
  meaning: z.string().describe("2-3 sentences explaining the verse in plain kid language. Revealed after they guess."),
  story: z.string().describe("3-4 sentences telling the story behind the verse — who said it, what was happening, why it mattered. Narrative, not a lecture."),
});

const quoteItem = z.object({
  text: z.string().describe("The quote itself. Short enough to read aloud in one breath."),
  question: z.string().describe("An open question asking what they think it means."),
  author: z.string().describe("Who said it."),
  context: z.string().describe("2-3 sentences: who this person was and what was happening when they said it. Kid-friendly."),
});

const geoQ = z.object({
  question: z.string().describe("A question about a state, city, country, or landmark."),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  answer: z.string().describe("The correct answer written out."),
  context: z.string().describe("2-3 kid-friendly sentences about the place — what makes it interesting."),
  funFact: z.string().describe("One surprising detail a kid would repeat to a friend."),
});

const thisDayItem = z.object({
  monthDay: z.string().describe("The calendar date this happened, as MM-DD, copied exactly from the list of dates you were given."),
  year: z.string().describe("The year it happened."),
  event: z.string().describe("One sentence: what happened on this calendar date."),
  question: z.string().describe("A question inviting them to guess or react before the reveal."),
  context: z.string().describe("3-4 kid-friendly sentences on why it mattered."),
});

const riddleItem = z.object({
  riddle: z.string().describe("A kid-solvable riddle or lateral-thinking puzzle."),
  answer: z.string(),
  explanation: z.string().describe("1-2 sentences explaining why, so a kid who missed it still learns the trick."),
});

const twoTruthsItem = z.object({
  subject: z.string().describe("Two or three words naming the SUBJECT, lowercase, e.g. \"octopus blood\", \"saturn rings\", \"great wall\". Used to stop the same topic appearing twice — in different tiles on the same day, or weeks apart."),
  items: z.array(z.object({ text: z.string() })).length(3).describe("Three kid-friendly statements — two true, one false."),
  lieIndex: z.number().int().min(0).max(2).describe("Index of the false statement."),
  explanation: z.string().describe("2-3 sentences covering all three: why two are true and why the lie is false."),
});

const characterTraitItem = z.object({
  trait: z.string().describe("One character trait, e.g. 'Patience', 'Courage', 'Honesty'."),
  emoji: z.string().describe("One emoji for the trait."),
  definition: z.string().describe("What it means, in kid language."),
  why: z.string().describe("2-3 sentences on why it matters, with a concrete everyday example."),
  challenge: z.string().describe("One specific 'try this today' action a kid can actually do at school."),
});

const grammarQ = z.object({
  question: z.string().describe("The grammar question, written so it can be read aloud in the car."),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  hint: z.string().describe("One short kid-friendly hint."),
  topic: z.string().describe("The assigned topic, copied from the plan."),
  format: z.string().describe("The assigned format, copied from the plan."),
  why: z.string().describe("One sentence explaining the RULE, so a wrong answer still teaches something."),
});

// For the visual tiles the model supplies only the SUBJECT. Image URLs are
// resolved and verified server-side in _morning-drive-media.js — a model-written
// URL looks plausible and 404s.
// Three candidates, not one. Only ~60% of the famous works a model names are
// both held by the Met/Art Institute AND out of copyright, so a single pick
// left the tile silently missing on roughly four mornings in ten. Each carries
// its own commentary because the story has to match whichever one resolves.
const artworkCandidate = z.object({
  title: z.string().describe("Exact title of a famous artwork, e.g. 'Wheat Field with Cypresses'."),
  artist: z.string().describe("The artist's full name."),
  question: z.string().describe("An open question inviting the kids to look and describe what they see, before any facts."),
  lookFor: z.string().describe("One concrete thing to notice in the picture — a colour, a shape, someone's face."),
  story: z.string().describe("3-4 kid-friendly sentences: who made it, when, and what makes it worth looking at."),
});

const artworkItem = z.object({
  candidates: z.array(artworkCandidate).length(3)
    .describe("Three different artworks in order of preference. The first one that is found in the museum collections is used."),
});

const landmarkItem = z.object({
  name: z.string().describe("The landmark's common name."),
  wikiTitle: z.string().describe("The EXACT English Wikipedia article title, e.g. 'Machu Picchu', 'Great Wall of China'."),
  country: z.string(),
  question: z.string().describe("A question to ask before revealing anything."),
  context: z.string().describe("3-4 kid-friendly sentences about the place."),
  funFact: z.string().describe("One surprising detail a kid would repeat at school."),
});

const flagItem = z.object({
  country: z.string().describe("Country name in plain English, matching common usage, e.g. 'Japan', 'Brazil', 'Kenya'."),
  question: z.string().describe("A question about the flag they are looking at."),
  choices: z.array(z.string()).length(4).describe("4 country names, including the correct one."),
  correctIndex: z.number().int().min(0).max(3),
  fact: z.string().describe("2-3 sentences: what the flag's colours or symbols mean, and one thing about the country."),
});

const animalItem = z.object({
  subject: z.string().describe("Two or three words naming the SUBJECT, lowercase, e.g. \"octopus blood\", \"saturn rings\", \"great wall\". Used to stop the same topic appearing twice — in different tiles on the same day, or weeks apart."),
  name: z.string().describe("Common name of the animal."),
  wikiTitle: z.string().describe("The EXACT English Wikipedia article title, e.g. 'Axolotl', 'Blue whale'."),
  question: z.string().describe("A question to ask while they look at the photo."),
  facts: z.array(z.string()).length(3).describe("3 short kid-friendly facts, one sentence each."),
});

const spellingItem = z.object({
  claire: z.array(z.object({
    word: z.string().describe(`A Grade ${KIDS.claire.grade} spelling word.`),
    sentence: z.string().describe("One sentence using the word, read aloud after the word."),
  })).length(2),
  connor: z.array(z.object({
    word: z.string().describe(`A Grade ${KIDS.connor.grade} spelling word.`),
    sentence: z.string().describe("One sentence using the word, read aloud after the word."),
  })).length(2),
});

const spanishWordItem = z.object({
  spanish: z.string().describe("The Spanish word."),
  english: z.string().describe("Its English meaning."),
  pronunciation: z.string().describe("Simple phonetic respelling a parent can read aloud, e.g. 'PEH-rro'."),
  example: z.string().describe("A short Spanish sentence using the word."),
  exampleEnglish: z.string().describe("The English translation of that sentence."),
});

// A single spelling word, for the pool (the daily section groups these by kid).
const spellingWord = z.object({
  word: z.string(),
  sentence: z.string().describe("One sentence using the word, read aloud after it."),
});

// The schema for ONE item of each pooled kind. Batch generation asks for an
// array of these; the daily assembly just reads them back out of the database.
export const ITEM_SCHEMAS = {
  math: mathQ,
  grammar: grammarQ,
  word: wotd,
  spelling: spellingWord,
  bible: bibleVerse,
  quote: quoteItem,
  joke: jokeItem,
  wyr: wyrItem,
  trivia: triviaQ,
  fact: factItem,
  news: newsItem,
  riddle: riddleItem,
  twoTruths: twoTruthsItem,
  characterTrait: characterTraitItem,
  geography: z.object({ us: geoQ, world: geoQ }),
  spanishWord: spanishWordItem,
  thisDayInHistory: thisDayItem,
  // Media kinds are generated as SUBJECTS and resolved to verified images
  // before they ever enter the pool, so the daily assembly never touches a URL.
  artwork: artworkCandidate,
  landmark: landmarkItem,
  flag: flagItem,
  animal: animalItem,
};

const SECTION_SCHEMAS = {
  claireMath: z.array(mathQ).length(5),
  connorMath: z.array(mathQ).length(5),
  grammarClaire: z.array(grammarQ).length(2),
  grammarConnor: z.array(grammarQ).length(2),
  artwork: artworkItem,
  landmark: landmarkItem,
  flag: flagItem,
  animal: animalItem,
  spelling: spellingItem,
  spanishWord: spanishWordItem,
  wordsOfDay: z.object({ connor: wotd, claire: wotd }),
  news: z.array(newsItem).length(2),
  trivia: z.array(triviaQ).length(3),
  facts: z.array(factItem).length(2),
  jokes: z.array(jokeItem).length(2),
  wyr: z.array(wyrItem).length(4),
  bibleVerse,
  quote: quoteItem,
  geography: z.object({ us: geoQ, world: geoQ }),
  thisDayInHistory: thisDayItem,
  riddle: riddleItem,
  twoTruths: twoTruthsItem,
  characterTrait: characterTraitItem,
};

export function buildPayloadSchema(activeSections) {
  const shape = {};
  for (const name of activeSections) {
    if (SECTION_SCHEMAS[name]) shape[name] = SECTION_SCHEMAS[name];
  }
  return z.object(shape);
}

// ============================================================================
// Vocab review — built in CODE, not by the model
// ============================================================================
// The original bug: the schema told the model the Word Match word "must match
// the corresponding word-of-the-day exactly", so kids were quizzed on a word
// they'd read 30 seconds earlier. Zero review value.
//
// Now we assemble Word Match ourselves from words the kids learned on PREVIOUS
// days. Because we already store every day's payload, the words and their
// definitions are right there — no model call needed, and it's impossible for
// this section to drift back into quizzing today's words.

// Deterministic shuffle so a given day always renders identically.
function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ----------------------------------------------------------------------------
// Word-entry hygiene
// ----------------------------------------------------------------------------

// Some stored days have a `definition` containing the model's own deliberation
// rather than a definition — e.g. word "tenacious" with definition "Wait, we
// already used that one! Let's try: 'methodical' means...". In those rows the
// word and the definition describe different things, so they're unusable as a
// review item AND unusable as a distractor. Filter them out at read time; the
// prompt fix below stops new ones, but 40-odd days of history already exist.
const META_COMMENTARY = [
  /already used/i,
  /we already/i,
  /switching to/i,
  /let'?s try/i,
  /checking (the )?list/i,
  /\bwait\b\s*[—–-]/i,
  /\bactually,? (let|I)/i,
];

export function isUsableWordEntry(entry) {
  const word = String(entry?.word || "").trim();
  const def = String(entry?.definition || "").trim();
  if (!word || !def) return false;
  if (word.split(/\s+/).length > 3) return false; // a sentence, not a word
  if (def.length < 12) return false;
  if (META_COMMENTARY.some((re) => re.test(def))) return false;
  // A quoted single word near the start that ISN'T the entry's own word means
  // the definition is describing some other word.
  const quoted = def.slice(0, 80).match(/['"\u2018\u2019\u201c\u201d]([a-z][a-z-]{2,})['"\u2018\u2019\u201c\u201d]/i);
  if (quoted && quoted[1].toLowerCase() !== word.toLowerCase()) return false;
  return true;
}

// Blank the target word out of its own definition. In Word Match the definition
// IS the prompt, so "Something swift zips past you" hands over the answer.
// Enumerate inflections rather than wildcarding a stem: a wildcard on a short
// stem ("act") would blank unrelated words ("actually", "action") and wreck the
// clue. Only ever applied to the quiz prompt — Words of the Day still shows the
// definition intact, because there the word is the thing being taught.
export function maskWordInDefinition(definition, word) {
  const def = String(definition || "");
  const w = String(word || "").trim().toLowerCase();
  if (!w || w.length < 3) return def;

  const base = w.replace(/(e|y)$/, "");
  const forms = new Set([
    w, w + "s", w + "es", w + "d", w + "ed", w + "ing", w + "ly", w + "ness",
    base + "s", base + "es", base + "ed", base + "ing", base + "y", base + "ly",
    base + "ily", base + "iness", base + "ies", base + "ier", base + "iest",
  ]);
  const alternation = [...forms]
    .filter((f) => f.length >= 3)
    .sort((a, b) => b.length - a.length) // longest first: "gently" before "gentl"
    .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!alternation) return def;
  return def.replace(new RegExp(`\\b(${alternation})\\b`, "gi"), "_____");
}

// A definition that's mostly blanks is no longer a usable clue.
function maskedClueIsUsable(masked) {
  const words = masked.replace(/_+/g, " ").trim().split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

// Pull every word each kid has learned before `beforeDate`, most recent first.
export async function fetchPriorWords(sb, beforeDate, days = 240) {
  const since = new Date(new Date(beforeDate).getTime() - days * 24 * 3600 * 1000)
    .toISOString().slice(0, 10);
  const { data } = await sb
    .from("morning_drive_days")
    .select("date, payload")
    .gte("date", since)
    .lt("date", beforeDate)
    .order("date", { ascending: false });

  const byKid = { claire: [], connor: [] };
  const seen = { claire: new Set(), connor: new Set() };
  for (const row of data || []) {
    const w = row.payload?.wordsOfDay;
    if (!w) continue;
    for (const kid of ["claire", "connor"]) {
      const entry = w[kid];
      if (!isUsableWordEntry(entry)) continue;
      const key = entry.word.toLowerCase();
      if (seen[kid].has(key)) continue;
      seen[kid].add(key);
      byKid[kid].push({ word: entry.word, definition: entry.definition, learnedOn: row.date });
    }
  }
  return byKid;
}

// How has each kid done on each word so far? Drives which words come back.
export async function fetchVocabStats(sb) {
  const { data } = await sb
    .from("morning_drive_attempts")
    .select("kid, item_key, attempts, correct, date")
    .eq("kind", "vocab_match")
    .not("item_key", "is", null)
    .order("date", { ascending: false })
    .limit(4000);

  const stats = {};
  for (const row of data || []) {
    const key = `${row.kid}|${String(row.item_key).toLowerCase()}`;
    const clean = row.correct && row.attempts === 1;
    if (!stats[key]) {
      // Rows arrive newest-first, so the first one we see for a key IS the most
      // recent attempt. That's what decides whether the word is still unresolved
      // — a word missed once but nailed since shouldn't be stuck at the front of
      // the queue forever.
      stats[key] = { times: 0, misses: 0, lastSeen: row.date, lastWasClean: clean };
    }
    const s = stats[key];
    s.times += 1;
    if (!clean) s.misses += 1;
    if (row.date > s.lastSeen) s.lastSeen = row.date;
  }
  return stats;
}

// Assemble the review questions for one kid.
//
// Priority: words never reviewed > words previously missed > words not seen in
// the longest time. That's the spaced-repetition part — a word they fumbled
// comes back around fast, a word they nailed drifts to the back of the queue.
export function buildVocabReview({ priorWords, stats, kid, dateStr, todaysWord, count = VOCAB_REVIEW_PER_KID }) {
  const pool = (priorWords?.[kid] || []).filter(
    (w) => !todaysWord || w.word.toLowerCase() !== todaysWord.toLowerCase()
  );
  // Need at least 4 distinct words to build one question with 3 distractors.
  if (pool.length < 4) return [];

  const today = daySeed(dateStr);
  const scored = pool.map((w) => {
    const s = stats?.[`${kid}|${w.word.toLowerCase()}`];
    const ageDays = Math.max(0, today - daySeed(w.learnedOn));
    let score;
    if (!s) {
      // Never reviewed — needs a first pass, but a word they actively got
      // wrong is more urgent than one they've simply not been asked yet.
      score = 1000 + ageDays;
    } else if (!s.lastWasClean) {
      // Got it wrong (or needed multiple taps) the last time it came up.
      // Lapsed cards are due immediately — this is the point of the whole thing.
      score = 2000 + s.misses * 100;
    } else {
      // Answered cleanly last time: drift toward the back, and further back the
      // more times they've already nailed it.
      const sinceSeen = Math.max(0, today - daySeed(s.lastSeen));
      score = sinceSeen * 3 - s.times * 40;
    }
    return { ...w, score };
  });

  scored.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  // Blank the answer out of its own definition before the definition becomes
  // the prompt, and skip any candidate whose clue doesn't survive that — walk
  // further down the queue rather than shipping a gutted question.
  const candidates = [];
  for (const target of scored) {
    if (candidates.length >= count) break;
    const clue = maskWordInDefinition(target.definition, target.word);
    if (!maskedClueIsUsable(clue)) continue;
    candidates.push({ ...target, clue });
  }

  const seed = daySeed(dateStr) + kid.length;
  return candidates.map((target, i) => {
    const distractors = seededShuffle(
      pool.filter((w) => w.word.toLowerCase() !== target.word.toLowerCase()),
      seed + i
    ).slice(0, 3).map((w) => w.word);
    const options = seededShuffle([target.word, ...distractors], seed + i * 7);
    return {
      word: target.word,
      definition: target.clue, // masked — never the raw stored definition
      learnedOn: target.learnedOn,
      options,
      correctIndex: options.indexOf(target.word),
    };
  }).filter((q) => q.options.length === 4 && q.correctIndex >= 0);
}

// ----------------------------------------------------------------------------
// Answer tells
// ----------------------------------------------------------------------------
// A real generation shipped the choice "um-brel-la — that's 3 syllables ✓" for
// the correct answer and plain text for the others, so the tick mark WAS the
// answer. Same failure as a definition containing its own word: the model
// annotates its own key and forgets the child can see it. The prompt now
// forbids it, but prompts alone did not hold last time, so strip the markers
// from every multiple-choice option before storing.
const ANSWER_TELLS = [
  /[\u2705\u2714\u2713\u2611]/gu,                  // ✅ ✔ ✓ ☑
  /[\u274C\u2716\u2718\u2717]/gu,                  // ❌ ✖ ✘ ✗
  /\s*\((?:correct|right|the answer|answer|true|false)\)\s*$/gi,
  /\s*[-—–]\s*(?:correct|this is correct|the answer)\s*$/gi,
];

export function stripAnswerTells(choice) {
  let out = String(choice ?? "");
  for (const re of ANSWER_TELLS) out = out.replace(re, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

// Clean every multiple-choice list in a generated payload, in place.
// Returns how many options actually had a tell, so it can be reported.
export function scrubAnswerTells(payload) {
  let cleaned = 0;
  const scrub = (item) => {
    if (!Array.isArray(item?.choices)) return;
    item.choices = item.choices.map((c) => {
      const next = stripAnswerTells(c);
      if (next !== String(c ?? "")) cleaned++;
      return next;
    });
  };
  for (const key of ["claireMath", "connorMath", "grammarClaire", "grammarConnor"]) {
    for (const q of payload[key] || []) scrub(q);
  }
  scrub(payload.flag);
  for (const k of ["us", "world"]) scrub(payload.geography?.[k]);
  if (Array.isArray(payload.twoTruths?.items)) {
    payload.twoTruths.items = payload.twoTruths.items.map((i) => {
      const text = stripAnswerTells(i.text);
      if (text !== String(i.text ?? "")) cleaned++;
      return { ...i, text };
    });
  }
  return cleaned;
}

// ============================================================================
// Prompt builder
// ============================================================================

function mathPlanBlock(kid, plan) {
  const k = KIDS[kid];
  const lines = plan.map((p, i) =>
    `  ${i + 1}. topic: **${p.topic}** — format: *${p.format}*`
  ).join("\n");
  return `**${k.name}'s math (Grade ${k.grade} — ${k.blurb})** — 5 questions, each MC with 4 options.
Every question below has an ASSIGNED topic and an ASSIGNED format. Follow both.
Copy the assigned topic into the question's \`topic\` field and the assigned
format into its \`format\` field verbatim.

${lines}`;
}

function grammarPlanBlock(kid, plan) {
  const k = KIDS[kid];
  const lines = plan.map((p, i) =>
    `  ${i + 1}. topic: **${p.topic}** — format: *${p.format}*`
  ).join("\n");
  return `**${k.name}'s grammar (Grade ${k.grade})** — 2 questions, MC with 4 options.
Each has an ASSIGNED topic and format below; follow both and copy them into the
question's \`topic\` and \`format\` fields. Every question needs a \`why\` field
stating the rule in one sentence, so a wrong answer still teaches the rule.

EXACTLY ONE option may be defensible. "___ the rain stopped, we rushed outside"
with both "Because" and "Once" available has two right answers and is a broken
question — check every distractor is genuinely wrong before you use it.
Never mark the correct option with a tick or an aside: all four must read the
same way.

${lines}`;
}

const SECTION_INSTRUCTIONS = {
  wordsOfDay: () => `- **2 Words of the Day** — one Connor-level (Grade ${KIDS.connor.grade}: concrete, encounterable — *enormous*, *sturdy*, *gentle*) and one Claire-level (Grade ${KIDS.claire.grade}: more abstract — *determined*, *vivid*, *peculiar*). Each with a kid-friendly definition and one example sentence. These get quizzed back to them on LATER days, so pick words genuinely worth keeping.
  - The \`definition\` must NOT contain the word itself or any form of it. On a later morning the definition is shown ALONE as a quiz prompt, so "something swift zips past you" hands over the answer. Write it so it still makes sense with the word missing.
  - The \`example\` sentence SHOULD use the word — that one isn't a quiz.
  - If a word you were about to choose is on the do-not-repeat list, silently pick a different one. Never narrate that decision, and never put commentary like "already used, switching to..." into any field. \`word\` must be the single word you actually settled on, and \`definition\` must define that same word.`,

  bibleVerse: () => `- **Bible verse** — one short verse in ${BIBLE_TRANSLATION}. Give the reference, the verse text, an open question asking what they think it means, then a plain-language \`meaning\`, then the \`story\` behind it (who said it, what was going on, why it mattered). Warm and age-appropriate. Choose verses about kindness, courage, honesty, gratitude, perseverance, forgiveness, friendship — not judgment, punishment, or anything frightening. No violent narrative detail.`,

  quote: () => `- **Inspirational quote** — one short, genuinely quotable line from a real person (scientist, explorer, athlete, author, civil-rights figure, inventor). Ask what they think it means, then reveal who said it and 2-3 kid-friendly sentences about who that person was and what was happening in their life. Vary the kind of person day to day — not all presidents, not all athletes.`,

  geography: () => `- **Geography — one US, one World.** Each is a 4-option MC question about a state, city, country, or major landmark, plus the written answer, 2-3 sentences of context about the place, and one surprising fun fact. Make the US one about a state, US city, or US landmark; make the World one about a country, world city, or world landmark. Keep it visual and concrete — things a kid could picture or find on a map.`,

  news: () => `- **2 News stories** — kid-appropriate "cool stuff happening" framed as recent. Topics: space discoveries, animals, science, nature, inventions, archaeology. NO violence, war, crime, disasters, or politics. One discussion question each. Only fill \`sourceUrl\` if you are genuinely confident the URL is real — otherwise leave it blank.`,

  trivia: () => `- **3 History Trivia questions** — mixed difficulty (one Connor can get, one Claire can get, one stretch). Explorers, inventors, ancient civilizations, presidents, scientists. 1-2 sentences of context with each answer.`,

  facts: () => `- **2 Fun Facts** — animals, space, food science, nature, human body, geography. One emoji and 2-3 kid-friendly sentences each.`,

  jokes: () => `- **2 Jokes** — kid-clean (puns, knock-knocks, riddles; no bathroom humor). One Connor-level (visual/concrete), one Claire-level (verbal/punny). Mark each with \`level\`.`,

  wyr: () => `- **4 Would You Rather** — imaginative, fun, kid-appropriate. Both options should be genuinely tempting; avoid one obviously-worse option.`,

  thisDayInHistory: (ctx) => `- **This Day in History** — something that actually happened on **${ctx.monthDay}** (any year). Give the year, one sentence on what happened, a question inviting a guess, and 3-4 sentences of kid-friendly context. Pick a well-documented event you are confident about — discovery, invention, exploration, science, a milestone. Nothing violent or frightening.`,

  riddle: () => `- **Riddle** — one kid-solvable riddle or lateral-thinking puzzle (aim at Claire's level so Connor can join in with help). Include the answer and a 1-2 sentence explanation of the trick.`,

  twoTruths: () => `- **Two Truths and a Lie** — three kid-friendly statements about animals, space, history, or the human body. Exactly two true, one false, and mark \`lieIndex\`. The lie should be plausible, not silly. Explanation covers all three.`,

  artwork: () => `- **Artwork of the day** — name **three different** famous artworks, in order of preference, each with its own question, look-for and story. Only the first one that can be found is used; the others are discarded, so make all three genuinely good choices rather than padding.

    Each must be:
    - **Held by the Metropolitan Museum of Art or the Art Institute of Chicago.** These are the only two collections searched. Works in MoMA, the Louvre, the Musée d'Orsay, the Rijksmuseum or the Uffizi cannot be used — so no *Starry Night*, no *Mona Lisa*, no *Girl with a Pearl Earring*.
    - **Out of copyright.** In practice this means created before about 1900. *American Gothic* (1930) and *Nighthawks* (1942) hang in the Art Institute but are still in copyright and cannot be shown.
    - **Completely appropriate for a ${KIDS.connor.grade === 2 ? "7" : "young"}-year-old**: no nudity, no violence, nothing frightening. Landscapes, animals, boats, dancers, star-filled skies, children, everyday scenes are ideal.

    Give the exact title and the artist's full name — the picture is looked up and verified in the museum's own collection, and an inexact title means that candidate is skipped. Ask what they SEE before telling them anything.`,

  landmark: () => `- **Landmark of the day** — one famous place. \`wikiTitle\` must be the EXACT English Wikipedia article title ("Machu Picchu", "Great Wall of China", "Uluru"), because the photo is fetched from that article and the tile is dropped if the title doesn't resolve. Ask a question first, then context and one surprising fact.`,

  flag: () => `- **Flag of the day** — pick a country whose flag is interesting to talk about. \`country\` must be the plain English country name ("Japan", "Brazil", "Kenya"). The kids see the flag and pick which country it belongs to, so the 4 choices are country names. Then explain what the colours or symbols mean.`,

  animal: () => `- **Animal of the day** — one animal worth a photo. \`wikiTitle\` must be the EXACT English Wikipedia article title ("Axolotl", "Blue whale", "Snow leopard"). Three short facts, and a question to ask while they look at the picture.`,

  spelling: () => `- **Spelling** — 2 words per kid, at Grade ${KIDS.claire.grade} for Claire and Grade ${KIDS.connor.grade} for Connor. Each word gets one sentence using it. The words are SPOKEN ALOUD by the phone and the kids spell them out loud, so choose words that sound clear and are not homophones of another word (avoid "there", "pair", "knight") — a kid can't tell which one you mean.`,

  spanishWord: () => `- **Spanish word of the day** — one useful, concrete Spanish word a child would actually say. Give the word, the English meaning, a simple phonetic respelling a parent can read aloud without knowing Spanish (e.g. "PEH-rro"), one short Spanish sentence, and its English translation.`,

  characterTrait: () => `- **Character trait of the day** — one trait (patience, courage, honesty, generosity, perseverance…), an emoji, a kid-language definition, 2-3 sentences on why it matters with a concrete everyday example, and one specific "try this today" challenge they could actually do at school.`,
};

export function buildPrompt({
  dateStr,
  doNotRepeat,
  recentDifficulty,
  recentFormats,
  activeSections,
  mathPlans,
  grammarPlans,
}) {
  const ctx = { monthDay: monthDayLabel(dateStr) };

  const sections = Object.entries(doNotRepeat || {}).map(([kind, items]) => {
    if (!items || items.length === 0) return null;
    const slice = items.slice(0, 150);
    return `### ${kind} (${slice.length} already used)\n${slice.map((s) => `- ${s}`).join("\n")}`;
  }).filter(Boolean).join("\n\n");

  const difficultyNote = recentDifficulty?.length
    ? `### Recent difficulty signal (last 14 days)\n${recentDifficulty.join("\n")}\n\nUse this to nudge today's math: if a kid averaged more than 2 attempts on a topic, dial that topic slightly easier. If they averaged 1.2 or fewer, dial it slightly harder.`
    : "";

  const formatNote = recentFormats?.length
    ? `### Question shapes used in the last 21 days\n${recentFormats.join("\n")}\n\nThese are the skeletons the kids have already seen a lot of. Even within an assigned format, change the situation, the characters, the setting, and the numbers — do not just swap a name and a number into a problem shaped like one above.`
    : "";

  // Only ask for the sections that are actually running today.
  const otherSections = activeSections
    .filter((s) => SECTION_INSTRUCTIONS[s])
    .map((s) => SECTION_INSTRUCTIONS[s](ctx))
    .join("\n\n");

  return `You are building today's Morning Drive content for Kevin's two kids — ${KIDS.claire.name} (Grade ${KIDS.claire.grade}, ${KIDS.claire.blurb}) and ${KIDS.connor.name} (Grade ${KIDS.connor.grade}, ${KIDS.connor.blurb}). Date: ${dateStr} (${ctx.monthDay}).

They play this in the car on the way to school, read aloud by Dad. It needs to feel warm and conversational and reward both kids at their own level.

## Math — follow the assigned plan exactly

${mathPlanBlock("claire", mathPlans.claire)}

${mathPlanBlock("connor", mathPlans.connor)}

**Math variety rules — these matter most:**
- The five questions for a kid must be five genuinely DIFFERENT problems, not one problem with different numbers. Different situations, different characters, different settings.
- Do not open every question with a kid's name plus a quantity. Vary the opening. Some questions should have no character at all.
- Not every question needs to be a story. When the assigned format is a straight computation or a comparison, just ask it cleanly.
- Names other than Claire and Connor are welcome — friends, animals, teachers, shopkeepers.
- Distractor answers should reflect real mistakes a kid would make (forgot to regroup, off by one, multiplied instead of added), not random numbers.
- NEVER mark the correct option. No tick, no ✓, no "(correct)", no explanatory aside that only the right answer carries. Every option must be written in the same style and at the same length, or the answer is obvious without reading the question.
- Any working shown inside an option must be arithmetically right. An option labelled "about 4/9 remains" when the true value is 5/9 teaches the wrong thing even when the child taps it.
- Keep each question to Grade ${KIDS.claire.grade} / Grade ${KIDS.connor.grade} level respectively.

## Grammar — follow the assigned plan exactly

${grammarPlans ? `${grammarPlanBlock("claire", grammarPlans.claire)}\n\n${grammarPlanBlock("connor", grammarPlans.connor)}` : ""}

## Everything else to generate

${otherSections}

## Content rules — all sections

- Everything is read aloud to a ${KIDS.connor.grade === 2 ? "7-year-old" : "child"} and a ${KIDS.claire.grade === 4 ? "9-year-old" : "child"}. Keep vocabulary and sentence length appropriate.
- Nothing violent, frightening, cruel, or sad. No war, crime, disaster, death, politics, or anything that would worry a kid on the way to school.
- No bathroom humor, no insults, no sarcasm aimed at anyone.
- Be accurate. If you are not confident a fact, date, or attribution is correct, choose a different one you ARE confident about.
- Warm, playful, specific. These get read out loud at 7am by a dad who wants his kids to enjoy the drive.

## Hard "never repeat" rules

Below is content already used on previous days. Do NOT reuse any of it, and do not produce close variations of it.

${sections || "(No prior content yet — fresh start.)"}

${difficultyNote}

${formatNote}

Return the full structured payload now.`;
}

// ============================================================================
// Stats reads
// ============================================================================

export async function fetchRecentDifficulty(sb) {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("morning_drive_attempts")
    .select("kid, kind, topic, attempts")
    .gte("date", since);
  if (error || !data?.length) return [];

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

// Which question SHAPES have been used recently. This is the signal the old
// pipeline was missing entirely — text-level dedupe can't see that twenty
// different questions all had the same skeleton.
export async function fetchRecentFormats(sb, days = 21) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("morning_drive_days")
    .select("payload")
    .gte("date", since);

  const counts = new Map();
  for (const row of data || []) {
    const p = row.payload || {};
    for (const kid of ["claireMath", "connorMath"]) {
      for (const q of p[kid] || []) {
        const key = `${kid === "claireMath" ? "Claire" : "Connor"} — ${q.format || "unspecified"}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, n]) => `- ${k}: used ${n}×`);
}

// Readable recent content so the model can dedupe semantically, not just by hash.
export async function fetchRecentReadable(sb, days = 60) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("morning_drive_days")
    .select("date, payload")
    .gte("date", since)
    .order("date", { ascending: false });

  const buckets = {
    math: [], word: [], news: [], trivia: [], fact: [], joke: [], wyr: [],
    bible: [], quote: [], geography: [], thisDayInHistory: [], riddle: [],
    twoTruths: [], characterTrait: [], grammar: [], artwork: [], landmark: [],
    flag: [], animal: [], spelling: [], spanish: [],
  };
  for (const row of data || []) {
    const p = row.payload || {};
    for (const m of p.claireMath || []) buckets.math.push(`(Claire) ${m.question}`);
    for (const m of p.connorMath || []) buckets.math.push(`(Connor) ${m.question}`);
    if (p.wordsOfDay?.connor?.word) buckets.word.push(`(Connor) ${p.wordsOfDay.connor.word}`);
    if (p.wordsOfDay?.claire?.word) buckets.word.push(`(Claire) ${p.wordsOfDay.claire.word}`);
    for (const n of p.news || []) buckets.news.push(n.headline);
    for (const t of p.trivia || []) buckets.trivia.push(t.question);
    for (const f of p.facts || []) buckets.fact.push(f.title || f.fact?.slice(0, 80));
    for (const j of p.jokes || []) buckets.joke.push(j.setup);
    for (const w of p.wyr || []) buckets.wyr.push(`${w.a} vs ${w.b}`);
    if (p.bibleVerse?.reference) buckets.bible.push(p.bibleVerse.reference);
    if (p.quote?.text) buckets.quote.push(`"${p.quote.text}" — ${p.quote.author || "?"}`);
    if (p.geography?.us?.answer) buckets.geography.push(`(US) ${p.geography.us.answer}`);
    if (p.geography?.world?.answer) buckets.geography.push(`(World) ${p.geography.world.answer}`);
    if (p.thisDayInHistory?.event) buckets.thisDayInHistory.push(p.thisDayInHistory.event);
    if (p.riddle?.riddle) buckets.riddle.push(p.riddle.riddle);
    if (p.twoTruths?.items?.length) buckets.twoTruths.push(p.twoTruths.items.map((i) => i.text).join(" / "));
    if (p.characterTrait?.trait) buckets.characterTrait.push(p.characterTrait.trait);
    for (const g of p.grammarClaire || []) buckets.grammar.push(`(Claire) ${g.question}`);
    for (const g of p.grammarConnor || []) buckets.grammar.push(`(Connor) ${g.question}`);
    if (p.artwork?.title) buckets.artwork.push(`${p.artwork.title} — ${p.artwork.artist || ""}`);
    if (p.landmark?.name) buckets.landmark.push(p.landmark.name);
    if (p.flag?.country) buckets.flag.push(p.flag.country);
    if (p.animal?.name) buckets.animal.push(p.animal.name);
    if (p.spanishWord?.spanish) buckets.spanish.push(p.spanishWord.spanish);
    for (const w of p.spelling?.claire || []) buckets.spelling.push(`(Claire) ${w.word}`);
    for (const w of p.spelling?.connor || []) buckets.spelling.push(`(Connor) ${w.word}`);
  }
  return buckets;
}
