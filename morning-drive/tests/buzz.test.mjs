// Tests for the radio's outside-the-house material.
// Run: node morning-drive/tests/buzz.test.mjs
//
// The fetching is network and is exercised by rendering a real show. What is
// checked here is everything a wrong answer would put in a child's ear: the
// score that gets read aloud, which result is worth mentioning, and what never
// reaches the microphone at all.

import { spellNumber, readGame, notability, seasonContext, isUsableStory } from "../../api/_morning-drive-buzz.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

console.log("\n[1] Scores are spelled where they are still numbers");
for (const [n, want] of [[0,"zero"],[3,"three"],[10,"ten"],[13,"thirteen"],[17,"seventeen"],
                          [20,"twenty"],[21,"twenty-one"],[45,"forty-five"],[60,"sixty"],
                          [72,"seventy-two"],[100,"one hundred"],[104,"one hundred four"]]) {
  ok(spellNumber(n) === want, `${n} reads as "${spellNumber(n)}"`);
}
ok(spellNumber("x") === "x", "a non-number is passed through rather than mangled");

console.log("\n[2] Reading a finished game");
const game = (home, hs, away, as, { state = "post", detail = "Final" } = {}) => ({
  id: `${home}${away}${hs}${as}`, date: "2026-09-10T00:20Z",
  competitions: [{
    status: { type: { state, detail } },
    competitors: [
      { homeAway: "home", team: { displayName: home }, score: String(hs), winner: hs > as },
      { homeAway: "away", team: { displayName: away }, score: String(as), winner: as > hs },
    ],
    leaders: [{ shortDisplayName: "PASS", leaders: [{ displayValue: "16/22, 187 YDS, 1 TD", athlete: { fullName: "Drew Lock" } }] }],
  }],
});
{
  const g = readGame(game("Seattle Seahawks", 13, "New England Patriots", 10), "the NFL", "the opening week of the NFL season");
  ok(g.winner === "Seattle Seahawks" && g.loser === "New England Patriots", "winner and loser are read from the feed, not inferred");
  ok(g.score === "thirteen to ten", `the spoken score is "${g.score}"`);
  ok(g.scoreDigits === "13-10", "the digits are kept alongside for anything that checks");
  ok(g.standout === "Drew Lock: 16/22, 187 YDS, 1 TD", "one human detail comes through");
  ok(readGame(game("A", 1, "B", 0, { state: "in" }), "x", "x") === null, "a game still being played is not reported as a result");
  ok(readGame(game("A", 2, "B", 2), "x", "x") === null, "a draw is skipped rather than given an invented winner");
}
{
  const g = readGame(game("A", 45, "B", 0), "the NFL", "the NFL");
  ok(g.score === "forty-five to zero", "a shutout is spoken in full");
  ok(g.margin === 45, "the margin is available for ranking");
}
{
  const ot = readGame(game("A", 4, "B", 3, { detail: "Final/OT" }), "the NHL", "the NHL");
  ok(ot.overtime === true, "an overtime finish is flagged");
  ok(readGame(game("A", 4, "B", 3), "the NHL", "the NHL").overtime === false, "a regulation finish is not");
}

console.log("\n[3] Which result is worth the airtime");
{
  const mk = (over) => ({ ...over, context: over.context || "the NFL" });
  const ordinary = mk({ overtime: false, score: "five to two", margin: 3 });
  const shutout  = mk({ overtime: false, score: "forty-five to zero", margin: 45 });
  const overtime = mk({ overtime: true,  score: "four to three", margin: 1 });
  const opener   = mk({ overtime: false, score: "thirteen to ten", margin: 3, context: "the opening week of the NFL season" });
  ok(notability(shutout) > notability(ordinary), "a shutout beats a routine result");
  ok(notability(overtime) > notability(ordinary), "so does an overtime finish");
  ok(notability(opener) > notability(ordinary), "and so does the first week of a season");
}

console.log("\n[4] Season context is said the way a person would say it");
ok(seasonContext("the NFL", { season: { type: 2 }, week: { number: 1 } }) === "the opening week of the NFL season", "week one becomes 'the opening week'");
ok(seasonContext("the NBA", { season: { type: 3 }, week: { number: 2 } }) === "the NBA playoffs", "the postseason is named");
ok(/week four/.test(seasonContext("the NFL", { season: { type: 2 }, week: { number: 4 } })) === false, "an ordinary week keeps its number");
ok(seasonContext("the NFL", { season: { type: 2 }, week: { number: 4 } }) === "week 4 of the NFL season", "…as 'week 4 of the NFL season'");

console.log("\n[5] What never reaches a seven-year-old");
const story = (title, summary = "x".repeat(80), published = "2026-09-09") => ({ title, summary, published });
const today = "2026-09-10";
ok(isUsableStory(story("Giant new dinosaur discovered in Brazil"), today), "a new dinosaur is exactly the point");
ok(!isUsableStory(story("Thieves stole Renoir paintings from a French museum"), today), "the museum theft that got through the first run is now blocked");
ok(!isUsableStory(story("Poachers kill rhino in reserve"), today), "poaching is blocked");
ok(!isUsableStory(story("Canon RF 20mm review: wide and bright"), today), "a gear review is not a story");
ok(!isUsableStory(story("Best telescopes for 2026"), today), "nor is a shopping guide");
ok(!isUsableStory(story("Election result confirmed by parliament"), today), "politics stays off the show");
ok(!isUsableStory(story("Fine story", "too short")), "a summary too thin to retell accurately is dropped");
ok(!isUsableStory(story("Old but good", "x".repeat(80), "2026-08-01"), today), "a story from last month is not 'what is going on'");
ok(isUsableStory(story("Fresh", "x".repeat(80), "2026-09-10"), today), "today's story is in");

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
