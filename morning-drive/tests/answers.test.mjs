// Tests for where the right answer sits.
// Run: node morning-drive/tests/answers.test.mjs
//
// Connor stopped reading the questions, because the answer was always in the
// same box and he was right — one batch of seventy maths items put the correct
// choice first in all seventy. Every per-question check passed the whole time;
// only the distribution showed it. So this measures the distribution.

import { spreadAnswerPositions, MATH_PER_KID } from "../../api/_morning-drive-shared.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

// The shape of the poisoned batch: correct answer first, every time.
const poisonedDay = () => ({
  connorMath: Array.from({ length: MATH_PER_KID }, (_, i) => ({
    question: `connor ${i}`, choices: [`RIGHT${i}`, "w1", "w2", "w3"], correctIndex: 0,
  })),
  claireMath: Array.from({ length: MATH_PER_KID }, (_, i) => ({
    question: `claire ${i}`, choices: [`RIGHT${i}`, "w1", "w2", "w3"], correctIndex: 0,
  })),
  grammarConnor: [{ choices: ["RIGHTg", "a", "b", "c"], correctIndex: 0 }],
  vocabReview: { connor: [{ word: "sturdy", options: ["sturdy", "a", "b", "c"], correctIndex: 0 }] },
  twoTruths: { items: [{ text: "LIE" }, { text: "t1" }, { text: "t2" }], lieIndex: 0 },
});

const dates = Array.from({ length: 400 }, (_, i) =>
  new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10));

console.log("\n[1] The answer still has to be the answer");
{
  let intact = 0, total = 0;
  for (const date of dates.slice(0, 60)) {
    const day = poisonedDay();
    const before = JSON.parse(JSON.stringify(day));
    spreadAnswerPositions(day, date);
    for (const key of ["connorMath", "claireMath", "grammarConnor"]) {
      day[key].forEach((q, i) => {
        total++;
        if (q.choices[q.correctIndex] === before[key][i].choices[before[key][i].correctIndex]) intact++;
      });
    }
    total++; if (day.twoTruths.items[day.twoTruths.lieIndex].text === "LIE") intact++;
    total++; if (day.vocabReview.connor[0].options[day.vocabReview.connor[0].correctIndex] === "sturdy") intact++;
  }
  ok(intact === total, `the correct answer survives every move (${intact}/${total})`);
}
{
  const day = poisonedDay();
  spreadAnswerPositions(day, "2026-09-16");
  ok(day.connorMath.every((q) => q.choices.length === 4), "no choice is added or lost");
  ok(day.connorMath.every((q) => new Set(q.choices).size === 4), "no choice is duplicated");
  ok(day.twoTruths.items.length === 3, "Two Truths keeps its three statements");
}

console.log("\n[2] The distribution Connor cracked");
{
  const tally = {};
  let n = 0;
  for (const date of dates) {
    const day = poisonedDay();
    spreadAnswerPositions(day, date);
    for (const q of [...day.connorMath, ...day.claireMath, ...day.grammarConnor]) {
      tally[q.correctIndex] = (tally[q.correctIndex] || 0) + 1; n++;
    }
  }
  const shares = [0, 1, 2, 3].map((i) => (tally[i] || 0) / n);
  ok(Math.max(...shares) <= 0.30, `no slot dominates — worst is ${(100 * Math.max(...shares)).toFixed(1)}% (was 100% for Connor)`);
  ok(Math.min(...shares) >= 0.20, `no slot is starved — least used is ${(100 * Math.min(...shares)).toFixed(1)}% (index 3 was 5% in the bank)`);
  ok(Object.keys(tally).length === 4, "all four boxes get used");
}

console.log("\n[3] No pattern to learn instead");
{
  // Within one kid's set, the answer must not march one box to the right.
  let marching = 0, days = 0;
  for (const date of dates) {
    const day = poisonedDay();
    spreadAnswerPositions(day, date);
    const seq = day.connorMath.map((q) => q.correctIndex);
    days++;
    if (seq.every((v, i) => i === 0 || (v - seq[i - 1] + 4) % 4 === 1)) marching++;
  }
  // Chance alone puts a short run in ascending order sometimes; a rule does it always.
  ok(marching / days < 0.25, `answers step one box right on ${(100 * marching / days).toFixed(0)}% of days, not 100%`);
}
{
  // Nor may a kid's first question be the same box every day.
  const firsts = new Set();
  for (const date of dates.slice(0, 30)) {
    const day = poisonedDay();
    spreadAnswerPositions(day, date);
    firsts.add(day.connorMath[0].correctIndex);
  }
  ok(firsts.size === 4, `the first question lands in all four boxes across a month (${[...firsts].sort().join(", ")})`);
}
{
  // The kids are dealt independently, so the two sequences matching now and then
  // is correct rather than a bug — three draws from four slots collide about one
  // morning in twenty-four. What must not happen is them being locked together,
  // which is what a single shared bag did.
  let identical = 0;
  for (const date of dates) {
    const day = poisonedDay();
    spreadAnswerPositions(day, date);
    if (day.connorMath.map((q) => q.correctIndex).join() === day.claireMath.map((q) => q.correctIndex).join()) identical++;
  }
  const share = identical / dates.length;
  ok(share < 0.12, `Claire and Connor rarely share a run of boxes (${identical} of ${dates.length} days, ${(100 * share).toFixed(1)}%)`);
  ok(identical > 0 || dates.length < 24, "…and are not forced apart either, which would be its own pattern");
}

console.log("\n[4] Same day in, same day out");
{
  const a = poisonedDay(), b = poisonedDay();
  spreadAnswerPositions(a, "2026-09-16");
  spreadAnswerPositions(b, "2026-09-16");
  ok(JSON.stringify(a) === JSON.stringify(b), "re-running a date reproduces it exactly, so a regenerated day is not a different quiz");
  const c = poisonedDay();
  spreadAnswerPositions(c, "2026-09-17");
  ok(JSON.stringify(a.connorMath) !== JSON.stringify(c.connorMath), "a different date does not");
}

console.log("\n[5] Leaves alone what it should");
{
  const odd = {
    news: [{ headline: "no choices here", summary: "x" }],
    jokes: { connor: [{ setup: "a", punchline: "b" }] },
    broken: { choices: ["a", "b", "c", "d"], correctIndex: 9 },   // out of range
    single: { choices: ["only"], correctIndex: 0 },
    notAnIndex: { choices: ["a", "b"], correctIndex: "1" },
  };
  const snapshot = JSON.stringify(odd);
  const r = spreadAnswerPositions(odd, "2026-09-16");
  ok(JSON.stringify(odd) === snapshot, "malformed or index-free nodes are left untouched rather than corrupted");
  ok(r.questions === 0, "and are not counted as questions");
  ok(spreadAnswerPositions({}, "2026-09-16").questions === 0, "an empty day does not throw");
  ok(spreadAnswerPositions(null, "2026-09-16").questions === 0, "nor does a missing one");
}

console.log("\n[6] Three maths questions, not five");
ok(MATH_PER_KID === 3, `each kid gets ${MATH_PER_KID} maths questions`);

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
