// Invariant tests for the Morning Drive generation plan.
// Run: node morning-drive/tests/plan.test.mjs
//
// These cover the things that break silently: rotation determinism, math topic
// and format cycling, and the spaced-repetition ordering in Word Match.
import {
  pickRotation, activeSectionsFor, assignMathPlan, buildPayloadSchema,
  buildVocabReview, buildPrompt, MATH_TOPICS, ROTATING_POOL,
} from "../../api/_morning-drive-shared.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

// ---- 1. Rotation ----------------------------------------------------------
console.log("\n[1] Section rotation");
const dates = Array.from({ length: 14 }, (_, i) => `2026-08-${String(i + 15).padStart(2, "0")}`);
const rots = dates.map(pickRotation);
ok(rots.every((r) => r.length === 4), "every day picks exactly 4 rotating sections");
ok(rots.every((r) => new Set(r).size === r.length), "no duplicates within a day");
ok(JSON.stringify(pickRotation("2026-08-15")) === JSON.stringify(pickRotation("2026-08-15")), "deterministic for a given date");
const coverage = new Set(rots.flat());
ok(coverage.size === ROTATING_POOL.length, `all ${ROTATING_POOL.length} rotating sections appear within 14 days (saw ${coverage.size})`);
const overlaps = rots.slice(1).map((r, i) => r.filter((x) => rots[i].includes(x)).length);
console.log(`      overlap with previous day: ${overlaps.join(", ")} (of 4)`);

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

// ---- 3. Vocab review ------------------------------------------------------
console.log("\n[3] Vocab review (spaced repetition)");
const priorWords = { claire: [], connor: [] };
for (let i = 1; i <= 20; i++) {
  priorWords.claire.push({ word: `word${i}`, definition: `def ${i}`, learnedOn: `2026-08-${String(i).padStart(2, "0")}` });
}
const stats = {
  "claire|word20": { times: 3, misses: 0, lastSeen: "2026-08-27" },
  "claire|word19": { times: 1, misses: 1, lastSeen: "2026-08-26" },
};
const rev = buildVocabReview({ priorWords, stats, kid: "claire", dateStr: "2026-08-28", todaysWord: "word20" });
ok(rev.length === 3, `returns 3 review questions (got ${rev.length})`);
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

// ---- 4. Schema ------------------------------------------------------------
console.log("\n[4] Per-day schema");
const active = activeSectionsFor("2026-08-28");
const schema = buildPayloadSchema(active);
const keys = Object.keys(schema.shape);
ok(keys.length === active.length, `schema has exactly the ${active.length} active sections`);
ok(!keys.includes("vocabMatch") && !keys.includes("vocabReview"), "vocab review is NOT in the model schema (built in code)");
ok(keys.includes("bibleVerse") && keys.includes("quote") && keys.includes("geography"), "new daily sections present");
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
const markers = { riddle: "Riddle", twoTruths: "Two Truths and a Lie", characterTrait: "Character trait of the day", thisDayInHistory: "This Day in History", news: "2 News stories", trivia: "3 History Trivia", facts: "3 Fun Facts" };
ok(inactive.every((s) => !prompt.includes(markers[s])), `no instructions for today's inactive sections (${inactive.join(", ") || "none"})`);
ok(active.filter((s) => markers[s]).every((s) => prompt.includes(markers[s])), "instructions present for every active rotating section");
console.log(`      prompt length: ${prompt.length} chars`);

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
