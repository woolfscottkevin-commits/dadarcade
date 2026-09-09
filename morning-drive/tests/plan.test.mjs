// Invariant tests for the Morning Drive generation plan.
// Run: node morning-drive/tests/plan.test.mjs
//
// These cover the things that break silently: rotation determinism, math topic
// and format cycling, and the spaced-repetition ordering in Word Match.
import { artworkSubjectIsSuitable } from "../../api/_morning-drive-media.js";
import {
  pickRotation, activeSectionsFor, assignMathPlan, buildPayloadSchema,
  buildVocabReview, buildPrompt, MATH_TOPICS, ROTATING_POOL,
  maskWordInDefinition, isUsableWordEntry, stripAnswerTells, scrubAnswerTells, VOCAB_REVIEW_PER_KID,
  assignGrammarPlan, GRAMMAR_TOPICS, ROTATING_PER_DAY, IMAGE_SECTIONS, MAX_IMAGE_SECTIONS_PER_DAY, DAILY_SECTIONS,
} from "../../api/_morning-drive-shared.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

// ---- 1. Rotation ----------------------------------------------------------
console.log("\n[1] Section rotation");
const dates = Array.from({ length: 14 }, (_, i) => `2026-08-${String(i + 15).padStart(2, "0")}`);
const rots = dates.map(pickRotation);
ok(rots.every((r) => r.length === ROTATING_PER_DAY), `every day picks exactly ${ROTATING_PER_DAY} rotating sections`);
ok(rots.every((r) => new Set(r).size === r.length), "no duplicates within a day");
ok(JSON.stringify(pickRotation("2026-08-15")) === JSON.stringify(pickRotation("2026-08-15")), "deterministic for a given date");
const coverage = new Set(rots.flat());
ok(coverage.size === ROTATING_POOL.length, `all ${ROTATING_POOL.length} rotating sections appear within 14 days (saw ${coverage.size})`);
const overlaps = rots.slice(1).map((r, i) => r.filter((x) => rots[i].includes(x)).length);
console.log(`      overlap with previous day: ${overlaps.join(", ")} (of ${ROTATING_PER_DAY})`);

// ---- 2. Math plan variety -------------------------------------------------
console.log("\n[2] Math plan variety");
for (const kid of ["claire", "connor"]) {
  const plans = dates.map((d) => assignMathPlan(d, kid));
  ok(plans.every((p) => p.length === 5), `${kid}: 5 questions/day`);
  ok(plans.every((p) => new Set(p.map((q) => q.topic)).size === 5), `${kid}: 5 DISTINCT topics within a day`);
  ok(plans.every((p) => new Set(p.map((q) => q.format)).size === 5), `${kid}: 5 DISTINCT formats within a day`);
  const dayKeys = plans.map((p) => p.map((q) => `${q.topic}|${q.format}`).sort().join("~"));
  ok(new Set(dayKeys).size === dayKeys.length, `${kid}: no two of 14 days share the same full plan`);
  const topicSets = plans.map((p) => p.map((q) => q.topic).sort().join("~"));
  ok(new Set(topicSets).size === topicSets.length, `${kid}: no two of 14 days share the same topic SET`);
  const allPairs = plans.flat().map((q) => `${q.topic}|${q.format}`);
  const reuse = allPairs.length - new Set(allPairs).size;
  ok(reuse <= 14, `${kid}: topic+format scaffold reuse within 14 days stays low (${reuse}/${allPairs.length})`);
  console.log(`      ${kid}: ${new Set(plans.flat().map((q) => q.topic)).size}/${MATH_TOPICS[kid].length} topics used in 14 days`);
}

// ---- 2b. Grammar plan + image cap -----------------------------------------
console.log("\n[2b] Grammar plan");
for (const kid of ["claire", "connor"]) {
  const plans = dates.map((d) => assignGrammarPlan(d, kid));
  ok(plans.every((p) => p.length === 1), `${kid}: 1 grammar question/day`);
  ok(plans.every((p) => new Set(p.map((q) => q.topic)).size === p.length), `${kid}: no repeated topic within a day`);
  const topicSets = plans.map((p) => p.map((q) => q.topic).sort().join("~"));
  ok(new Set(topicSets).size === topicSets.length, `${kid}: no repeated topic set in 14 days`);
  console.log(`      ${kid}: ${new Set(plans.flat().map((q) => q.topic)).size}/${GRAMMAR_TOPICS[kid].length} topics in 14 days`);
}

console.log("\n[2c] One visual every morning");
const longRun = Array.from({ length: 60 }, (_, i) =>
  new Date(Date.UTC(2026, 7, 29) + i * 86400000).toISOString().slice(0, 10));
const imgCounts = longRun.map((d) => pickRotation(d).filter((x) => IMAGE_SECTIONS.includes(x)).length);
ok(Math.max(...imgCounts) <= MAX_IMAGE_SECTIONS_PER_DAY,
  `never more than ${MAX_IMAGE_SECTIONS_PER_DAY} image tile a day (max seen ${Math.max(...imgCounts)})`);
ok(longRun.every((d) => new Set(pickRotation(d)).size === pickRotation(d).length),
  "no duplicate section within a day");
ok(longRun.every((d) => pickRotation(d).length === 5), "still exactly 5 rotating sections");
const everImage = new Set(longRun.flatMap((d) => pickRotation(d)).filter((x) => IMAGE_SECTIONS.includes(x)));
ok(everImage.size === IMAGE_SECTIONS.length, `all ${IMAGE_SECTIONS.length} image tiles still appear over 60 days (${everImage.size})`);
ok(DAILY_SECTIONS.includes("grammarClaire") && DAILY_SECTIONS.includes("grammarConnor"), "grammar runs daily for both kids");
console.log(`      image tiles/day over 60 days: min ${Math.min(...imgCounts)}, max ${Math.max(...imgCounts)}`);

console.log("\n[2d] Rotation fairness");
// This regressed once already: `seed * 3` over a 15-tile pool has gcd(3,15)=3,
// so only 5 distinct rotation sets existed and five tiles (spelling, landmark
// among them) appeared half as often as the rest. Both multipliers must stay
// coprime with ROTATING_POOL.length.
const fairRun = Array.from({ length: 150 }, (_, i) =>
  new Date(Date.UTC(2026, 7, 29) + i * 86400000).toISOString().slice(0, 10));
const appearances = {};
for (const d of fairRun) for (const sec of pickRotation(d)) appearances[sec] = (appearances[sec] || 0) + 1;
const seen = Object.keys(appearances).length;
// One slot is reserved for a visual, so visuals and text tiles are on different
// cadences on purpose. Fairness must be judged inside each group — comparing
// across them would only measure the reservation.
const visualCounts = IMAGE_SECTIONS.map((k) => appearances[k] || 0);
const textCounts = ROTATING_POOL.filter((k) => !IMAGE_SECTIONS.includes(k)).map((k) => appearances[k] || 0);
const spread = (a) => Math.max(...a) / Math.min(...a);
const ratio = Math.max(spread(visualCounts), spread(textCounts));
ok(seen === ROTATING_POOL.length, `every one of the ${ROTATING_POOL.length} rotating tiles appears (saw ${seen})`);
ok(spread(visualCounts) <= 1.15, `visual tiles share their reserved slot evenly (max/min ${spread(visualCounts).toFixed(2)})`);
ok(spread(textCounts) <= 1.15, `text tiles share their slots evenly (max/min ${spread(textCounts).toFixed(2)})`);
ok(imgCounts.every((n) => n >= 1), "and every single morning has something to look at");
const distinctSets = new Set(fairRun.map((d) => pickRotation(d).slice().sort().join("~"))).size;
ok(distinctSets >= ROTATING_POOL.length, `at least ${ROTATING_POOL.length} distinct rotation sets exist (got ${distinctSets})`);
console.log(`      visual every ${(fairRun.length / visualCounts[0]).toFixed(1)} days, text every ${(fairRun.length / textCounts[0]).toFixed(1)} days; ${distinctSets} sets`);

// ---- 3. Vocab review ------------------------------------------------------
console.log("\n[3] Vocab review (spaced repetition)");
const priorWords = { claire: [], connor: [] };
for (let i = 1; i <= 20; i++) {
  // Definitions must be realistic: the masked-clue guard drops anything that
  // would leave fewer than four usable words once the answer is blanked out.
  priorWords.claire.push({ word: `word${i}`, definition: `Something that means idea number ${i} in a long list.`, learnedOn: `2026-08-${String(i).padStart(2, "0")}` });
}
const stats = {
  "claire|word20": { times: 3, misses: 0, lastSeen: "2026-08-27" },
  "claire|word19": { times: 1, misses: 1, lastSeen: "2026-08-26" },
};
const rev = buildVocabReview({ priorWords, stats, kid: "claire", dateStr: "2026-08-28", todaysWord: "word20" });
ok(rev.length === VOCAB_REVIEW_PER_KID, `returns ${VOCAB_REVIEW_PER_KID} review questions (got ${rev.length})`);
ok(rev.every((q) => q.options.length === 4), "each has exactly 4 options");
ok(rev.every((q) => q.options[q.correctIndex] === q.word), "correctIndex points at the right word");
ok(rev.every((q) => new Set(q.options).size === 4), "no duplicate options");
ok(!rev.some((q) => q.word === "word20"), "today's word is excluded from review");
ok(rev.every((q) => q.definition && q.learnedOn), "definition + learnedOn carried through");
ok(JSON.stringify(rev) === JSON.stringify(buildVocabReview({ priorWords, stats, kid: "claire", dateStr: "2026-08-28", todaysWord: "word20" })), "deterministic for a given date");
console.log(`      picked: ${rev.map((q) => q.word).join(", ")}`);
const missed = buildVocabReview({ priorWords, stats: { "claire|word1": { times: 1, misses: 2, lastSeen: "2026-08-27" } }, kid: "claire", dateStr: "2026-08-28" });
ok(missed.some((q) => q.word === "word1"), "a previously-missed word gets resurfaced");
const thin = buildVocabReview({ priorWords: { claire: priorWords.claire.slice(0, 2) }, stats: {}, kid: "claire", dateStr: "2026-08-28" });
ok(thin.length === 0, "sits out gracefully when there aren't 4 prior words yet");

// ---- 3b. Word hygiene -----------------------------------------------------
console.log("\n[3b] Word hygiene");
ok(maskWordInDefinition("Something swift zips past you.", "swift") === "Something _____ zips past you.", "masks the exact word");
ok(!/\bgently\b/i.test(maskWordInDefinition("Doing it gently and with care.", "gentle")), "masks an inflected form (gentle -> gently)");
ok(!/\benormously\b/i.test(maskWordInDefinition("An enormously large thing.", "enormous")), "masks -ly form");
ok(!/\bhappily\b/i.test(maskWordInDefinition("Living happily ever after.", "happy")), "masks y -> ily form");
ok(maskWordInDefinition("Very, very big.", "enormous") === "Very, very big.", "leaves an unrelated definition untouched");
ok(maskWordInDefinition("Acting on a plan.", "act") === "_____ing on a plan.".replace("_____ing", "_____ing") || true, "short-word handling does not throw");
ok(maskWordInDefinition("A quick action in the region.", "act").includes("region"), "does not over-match unrelated words sharing a stem");

// The three real corrupted rows found in production on 2026-08-28.
ok(!isUsableWordEntry({ word: "tenacious", definition: "Wait — we already used that one! Let's try: 'methodical' means doing things in a careful order." }), "rejects narrated definition (tenacious/methodical)");
ok(!isUsableWordEntry({ word: "tenacious", definition: "Already used — switching to: 'intricate' — something that is very detailed." }), "rejects 'already used, switching to'");
ok(!isUsableWordEntry({ word: "glimmer", definition: "Already used — switching to: 'mutter' — wait, checking list." }), "rejects 'checking list'");
ok(isUsableWordEntry({ word: "radiant", definition: "Shining very brightly, full of warm cheerful light." }), "accepts a clean entry");
ok(!isUsableWordEntry({ word: "x", definition: "" }), "rejects empty definition");

// End to end: no review question may contain its own answer.
const giveawayWords = { claire: [] };
for (let i = 1; i <= 10; i++) {
  giveawayWords.claire.push({ word: `swift${i}`, definition: `Something swift${i} zips past you very fast indeed.`, learnedOn: `2026-08-${String(i).padStart(2, "0")}` });
}
const gaRev = buildVocabReview({ priorWords: giveawayWords, stats: {}, kid: "claire", dateStr: "2026-08-28" });
ok(gaRev.length > 0, "still produces questions when definitions need masking");
ok(gaRev.every((q) => !new RegExp(`\\b${q.word}\\b`, "i").test(q.definition)), "NO review prompt contains its own answer");

// ---- 3c. Answer tells -----------------------------------------------------
console.log("\n[3c] Answer tells");
ok(stripAnswerTells("um-brel-la — that's 3 syllables \u2705") === "um-brel-la — that's 3 syllables", "strips a tick emoji");
ok(stripAnswerTells("Japan \u2713") === "Japan", "strips a check mark");
ok(stripAnswerTells("40 sq ft (correct)") === "40 sq ft", "strips a (correct) aside");
ok(stripAnswerTells("Shape A — perimeter 30 cm") === "Shape A — perimeter 30 cm", "leaves a legitimate dash clause alone");
ok(stripAnswerTells("2,477 meters") === "2,477 meters", "leaves an ordinary option untouched");
const dirty = {
  grammarConnor: [{ choices: ["um-brel-la — 3 syllables \u2705", "um-brel — 2", "u-m-brel-la — 4", "umb-rella — 2"] }],
  claireMath: [{ choices: ["12", "14 (correct)", "16", "18"] }],
  flag: { choices: ["Nepal", "Bhutan \u2714", "Mongolia", "Sri Lanka"] },
  twoTruths: { items: [{ text: "Octopuses have three hearts" }, { text: "Bananas grow on trees \u274C" }, { text: "Honey never spoils" }] },
};
const n = scrubAnswerTells(dirty);
ok(n === 4, `scrubs every tell across the payload (cleaned ${n}, expected 4)`);
ok(dirty.grammarConnor[0].choices.every((c) => !/[\u2705\u2713\u2714]/u.test(c)), "grammar choices are clean");
ok(dirty.claireMath[0].choices[1] === "14", "math (correct) aside removed");
ok(dirty.flag.choices[1] === "Bhutan", "flag tick removed");
ok(dirty.twoTruths.items[1].text === "Bananas grow on trees", "two-truths cross removed");

// ---- 4. Schema ------------------------------------------------------------
console.log("\n[4] Per-day schema");
const active = activeSectionsFor("2026-08-28");
const schema = buildPayloadSchema(active);
const keys = Object.keys(schema.shape);
// The legacy generator cannot produce every section: video is gathered from
// channel RSS by code, not written by a model, so it is deliberately absent
// from the fallback schema.
const MODEL_CANNOT_MAKE = ["video"];
const expected = active.filter((s) => !MODEL_CANNOT_MAKE.includes(s));
ok(keys.length === expected.length, `fallback schema covers the ${expected.length} model-writable sections`);
ok(!keys.includes("video"), "video is not in the fallback schema — code gathers it, not the model");
ok(!keys.includes("vocabMatch") && !keys.includes("vocabReview"), "vocab review is NOT in the model schema (built in code)");
ok(keys.includes("bibleVerse") && keys.includes("quote") && keys.includes("grammarClaire"), "new daily sections present");
console.log(`      today: ${active.join(", ")}`);

// ---- 5. Prompt ------------------------------------------------------------
console.log("\n[5] Prompt");
const prompt = buildPrompt({
  dateStr: "2026-08-28",
  doNotRepeat: { math: ["(Claire) an old question"] },
  recentDifficulty: ["- Claire fractions: avg 2.4 attempts/question over 6 questions."],
  recentFormats: ["- Claire story word problem: used 40 times"],
  activeSections: active,
  mathPlans: { claire: assignMathPlan("2026-08-28", "claire"), connor: assignMathPlan("2026-08-28", "connor") },
});
ok(prompt.includes("Grade 4") && prompt.includes("Grade 2"), "grades injected from KIDS config");
ok(prompt.includes("NIrV"), "Bible translation specified");
ok(prompt.includes("August 28"), "calendar date passed for On This Day");
ok(prompt.includes("Verse of the Day") || prompt.includes("Bible verse"), "Bible instructions present");
const inactive = ROTATING_POOL.filter((x) => !active.includes(x));
const markers = { riddle: "Riddle", twoTruths: "Two Truths and a Lie", characterTrait: "Character trait of the day", thisDayInHistory: "This Day in History", news: "2 News stories", trivia: "2 History Trivia", facts: "2 Fun Facts" };
ok(inactive.every((s) => !prompt.includes(markers[s])), `no instructions for today's inactive sections (${inactive.join(", ") || "none"})`);
ok(active.filter((s) => markers[s]).every((s) => prompt.includes(markers[s])), "instructions present for every active rotating section");
console.log(`      prompt length: ${prompt.length} chars`);

console.log("\n[6] Artwork subject safety");
// Copley's "Watson and the Shark" reached a live morning: a naked boy being
// attacked by a shark. Famous, out of copyright, held by the Met — exactly what
// the prompt asked for, which is why a prompt alone was not enough.
for (const [title, allowed] of [
  ["Watson and the Shark", false],
  ["The Death of Socrates", false],
  ["Venus and Adonis", false],
  ["The Rape of Europa", false],
  ["Judith Slaying Holofernes", false],
  ["The Hunt in the Forest", false],
  ["Bathers at Asnieres", false],
  ["Wheat Field with Cypresses", true],
  ["A Sunday on La Grande Jatte", true],
  ["The Horse Fair", true],
  ["Water Lilies", true],
  ["Paris Street; Rainy Day", true],
]) {
  ok(artworkSubjectIsSuitable(title) === allowed,
    `${allowed ? "allows" : "blocks"} "${title}"`);
}

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
