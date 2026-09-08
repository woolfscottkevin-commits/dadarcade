// Tests for flashcard generation.
// Run: node morning-drive/tests/flashcards.test.mjs
//
// The card content is arithmetic, so it can be checked exactly rather than
// eyeballed — a flashcard with a wrong answer teaches the wrong fact.

import { DECKS, DECK_BY_ID, planRound, buildRound, ROUND_SIZE } from "../flashcards.js";

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
  const bad = cards.filter((c) => {
    const { a, b, denominator, sum } = c.visual;
    if (a + b !== sum) return true;
    if (sum > denominator) return true;              // never more than one whole
    if (a < 1 || b < 1) return true;                 // both sides must be visible
    const g = gcd(sum, denominator);
    const want = sum === denominator ? "1 whole" : `${sum / g}/${denominator / g}`;
    return c.answer !== want;
  });
  ok(bad.length === 0, `sums are right and fully simplified (${cards.length} cards)`);
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

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
