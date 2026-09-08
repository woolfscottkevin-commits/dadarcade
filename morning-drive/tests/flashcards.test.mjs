// Tests for flashcard generation.
// Run: node morning-drive/tests/flashcards.test.mjs
//
// The card content is arithmetic, so it can be checked exactly rather than
// eyeballed — a flashcard with a wrong answer teaches the wrong fact.

import { DECKS, DECK_BY_ID, planRound, buildRound, ROUND_SIZE,
         analyzeVariety, VARIETY_LIMITS } from "../flashcards.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

const sel = (decks, tables = {}) => ({ decks, tables: { multiplication: [], division: [], ...tables } });

console.log("\n[1] Decks");
ok(DECKS.length === 3, `three decks (${DECKS.map((d) => d.title).join(", ")})`);
ok(DECK_BY_ID.multiplication.tables.length === 12, "multiplication offers 1s through 12s");
ok(DECK_BY_ID.division.tables.length === 12, "division offers 1s through 12s");
ok(!DECK_BY_ID.fractions.tables, "fractions has no table picker");

console.log("\n[2] Even distribution across selected decks");
for (const decks of [["multiplication"], ["multiplication", "division"], ["multiplication", "division", "fractions"]]) {
  const counts = planRound(decks).reduce((a, d) => ((a[d] = (a[d] || 0) + 1), a), {});
  const vals = Object.values(counts);
  const total = vals.reduce((a, b) => a + b, 0);
  ok(total === ROUND_SIZE, `${decks.length} deck(s): ${ROUND_SIZE} cards (got ${total})`);
  ok(Math.max(...vals) - Math.min(...vals) <= 1, `${decks.length} deck(s): as even as ten allows (${JSON.stringify(counts)})`);
  ok(Object.keys(counts).length === decks.length, `${decks.length} deck(s): every chosen deck appears`);
}
// The spare card in an uneven split should not always land on the same deck.
const owners = new Set();
for (let off = 0; off < 3; off++) {
  const counts = planRound(["multiplication", "division", "fractions"], 10, off)
    .reduce((a, d) => ((a[d] = (a[d] || 0) + 1), a), {});
  owners.add(Object.entries(counts).find(([, n]) => n === 4)[0]);
}
ok(owners.size === 3, `the extra card rotates between rounds (${[...owners].join(", ")})`);

console.log("\n[3] Multiplication");
{
  const cards = Array.from({ length: 200 }, () => buildRound(sel(["multiplication"]))).flat();
  ok(cards.every((c) => c.deck === "multiplication"), "only multiplication when only it is selected");
  const bad = cards.filter((c) => {
    const [a, b] = c.prompt.split(" × ").map(Number);
    return String(a * b) !== c.answer;
  });
  ok(bad.length === 0, `every answer is correct (${cards.length} cards checked)`);
}
{
  const cards = Array.from({ length: 60 }, () => buildRound(sel(["multiplication"], { multiplication: [7] }))).flat();
  ok(cards.every((c) => c.prompt.startsWith("7 × ")), "picking the 7s gives only 7s");
  const others = new Set(cards.map((c) => Number(c.prompt.split(" × ")[1])));
  ok(others.size > 6, `the other factor still varies (${others.size} distinct)`);
}

console.log("\n[4] Division");
{
  const cards = Array.from({ length: 200 }, () => buildRound(sel(["division"]))).flat();
  const bad = cards.filter((c) => {
    const [n, d] = c.prompt.split(" ÷ ").map(Number);
    return n % d !== 0 || String(n / d) !== c.answer;
  });
  ok(bad.length === 0, `always divides evenly, always correct (${cards.length} cards)`);
  ok(cards.every((c) => Number(c.answer) >= 1), "no zero or negative answers");
}
{
  const cards = Array.from({ length: 60 }, () => buildRound(sel(["division"], { division: [6] }))).flat();
  ok(cards.every((c) => Number(c.prompt.split(" ÷ ")[1]) === 6), "picking ÷6 gives only ÷6");
}

console.log("\n[5] Fractions");
{
  const cards = Array.from({ length: 300 }, () => buildRound(sel(["fractions"]))).flat();
  ok(cards.every((c) => c.visual), "every fraction card carries a picture");
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // Cards are now addition OR subtraction, so check the arithmetic of both.
  const bad = cards.filter((c) => {
    const { a, b, denominator, result, op } = c.visual;
    if (a < 1 || b < 1) return true;                    // both sides must be visible
    if (op === "-") {
      if (a - b !== result || result < 1) return true;  // never zero or negative
      if (a > denominator) return true;
    } else {
      if (a + b !== result) return true;
      if (result > denominator) return true;            // never more than one whole
    }
    const g = gcd(result, denominator);
    const want = result === denominator ? "1 whole" : `${result / g}/${denominator / g}`;
    return c.answer !== want;
  });
  ok(bad.length === 0, `addition and subtraction are both right and fully simplified (${cards.length} cards)`);
  const denominators = new Set(cards.map((c) => c.visual.denominator));
  ok(denominators.size >= 4, `several denominators appear (${[...denominators].sort((x, y) => x - y).join(", ")})`);
  ok(cards.some((c) => c.answer === "1 whole"), "reaching a whole is possible");
  ok(cards.some((c) => c.answer.includes("/")), "and so is a fraction that stays a fraction");
}

console.log("\n[6] Rounds");
{
  const round = buildRound(sel(["multiplication", "division", "fractions"]));
  ok(round.length === ROUND_SIZE, `a round is ${ROUND_SIZE} cards`);
  ok(round.every((c) => c.prompt && c.answer), "every card has a prompt and an answer");
  const dupeRounds = Array.from({ length: 50 }, () => buildRound(sel(["multiplication"], { multiplication: [3] })))
    .filter((r) => new Set(r.map((c) => c.key)).size < r.length).length;
  // With only twelve 3-times facts available, a repeat inside ten is sometimes
  // unavoidable — but it should be rare rather than routine.
  ok(dupeRounds <= 40, `repeats within a round are limited even on a tiny deck (${dupeRounds}/50 rounds)`);
  ok(buildRound(sel([])).length === 0, "no decks selected yields no cards rather than throwing");
}

console.log("\n[7] Variety — the check that would have caught the fraction bug");
// A round of ten answering "1 whole" eight times shipped, because every card was
// individually correct. Only the distribution shows it, so measure it.
for (const deck of ["multiplication", "division", "fractions"]) {
  const cards = Array.from({ length: 400 }, () => buildRound(sel([deck]))).flat();
  const v = analyzeVariety(cards);
  const lim = VARIETY_LIMITS[deck];
  ok(v.topAnswerShare <= lim.maxTopAnswerShare,
    `${deck}: no answer dominates — "${v.topAnswer}" is ${(100 * v.topAnswerShare).toFixed(1)}% (limit ${(100 * lim.maxTopAnswerShare).toFixed(0)}%)`);
  ok(v.distinctAnswers >= lim.minDistinctAnswers,
    `${deck}: ${v.distinctAnswers} distinct answers (need ${lim.minDistinctAnswers})`);
  ok(v.topPromptShare <= 0.06,
    `${deck}: no single question dominates (${(100 * v.topPromptShare).toFixed(1)}%)`);
}

// Fractions must vary the OPERATION too, not just the numbers.
{
  const cards = Array.from({ length: 400 }, () => buildRound(sel(["fractions"]))).flat();
  const { questionTypes } = analyzeVariety(cards);
  const kinds = Object.keys(questionTypes);
  ok(kinds.length >= 2, `fractions ask more than one kind of question (${kinds.join(", ")})`);
  const shares = Object.values(questionTypes).map((n) => n / 400 / 10);
  ok(Math.min(...shares) >= 0.2, `both fraction operations appear often (min ${(100 * Math.min(...shares)).toFixed(0)}%)`);
}

// The specific regression, stated plainly so it cannot creep back.
{
  const cards = Array.from({ length: 400 }, () => buildRound(sel(["fractions"]))).flat();
  const whole = cards.filter((c) => c.answer === "1 whole").length / cards.length;
  ok(whole <= 0.22, `"1 whole" is ${(100 * whole).toFixed(1)}% of fraction answers, not 56%`);
}

// A single round of ten should not be dominated by one answer either — that is
// what a kid actually experiences.
{
  let worstRun = 0;
  for (let i = 0; i < 500; i++) {
    const round = buildRound(sel(["fractions"]));
    const counts = round.reduce((a, c) => ((a[c.answer] = (a[c.answer] || 0) + 1), a), {});
    worstRun = Math.max(worstRun, Math.max(...Object.values(counts)));
  }
  ok(worstRun <= 5, `worst single round repeats one answer at most ${worstRun}/10 times`);
}

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
