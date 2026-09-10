// Tests for the pure parts of Morning Drive Radio.
// Run: node morning-drive/tests/radio.test.mjs
//
// The script and the voice are model calls and are exercised by rendering a
// real show. What can be checked exactly is checked here: what material the DJ
// is allowed to use, how text is cut for the speech limit, and how the audio
// pieces are joined.

import { radioMaterial, chunkForTts, stripId3, concatMp3, TTS_CHUNK_CHARS } from "../../api/_morning-drive-radio.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

console.log("\n[1] Material — the DJ may only retell what is on the page");
{
  const payload = {
    news: [{ headline: "H1", summary: "S1", source: "NASA", published: "2026-09-09", sourceUrl: "https://x" }],
    wordsOfDay: { claire: { word: "vivid", definition: "d", example: "e" }, connor: { word: "sturdy", definition: "d", example: "e" } },
    jokes: { claire: [{ setup: "a", punchline: "b" }], connor: [{ setup: "c", punchline: "d" }] },
    facts: [{ title: "Octopus", fact: "blue blood" }],
    trivia: { claire: [{ question: "q", answer: "a", context: "c" }], connor: [] },
    thisDayInHistory: { year: "1969", event: "Moon", context: "ctx" },
    quote: { text: "Q", author: "A" },
    characterTrait: { trait: "Patience", challenge: "wait" },
    // Things the DJ must NOT get: raw answer keys, URLs, pool ids.
    claireMath: [{ question: "1+1", choices: ["1", "2"], correctIndex: 1 }],
    vocabReview: { claire: [{ word: "x", options: ["x", "y"], correctIndex: 0 }] },
  };
  const m = radioMaterial(payload);
  ok(m.news.length === 1 && m.news[0].source === "NASA", "news carries the outlet name for attribution on air");
  ok(!("sourceUrl" in m.news[0]), "URLs are not passed to the script — they would be read aloud");
  ok(m.words.length === 2 && m.words.every((w) => w.kid), "both words of the day, labelled with the child");
  ok(m.jokes.length === 2, "one joke per kid reaches the script");
  ok(m.learned.some((l) => l.kind === "fun fact") && m.learned.some((l) => l.kind === "on this day"), "facts and On This Day are available as 'things you learned'");
  ok(m.quote?.author === "A" && m.trait?.trait === "Patience", "quote and challenge come through");
  const flat = JSON.stringify(m);
  ok(!flat.includes("correctIndex") && !flat.includes("choices"), "no answer keys or choice lists reach the DJ");
  ok(!flat.includes("vocabReview"), "Word Match answers are never spoken");
}
{
  const m = radioMaterial({ jokes: [{ setup: "flat", punchline: "array", level: "connor" }], trivia: [{ question: "q", answer: "a" }] });
  ok(m.jokes.length === 1 && m.learned.length === 1, "older flat-array day shapes still work");
  const empty = radioMaterial({});
  ok(empty.news.length === 0 && empty.words.length === 0 && empty.quote === null, "an empty day yields empty material rather than throwing");
}

console.log("\n[2] Chunking — never over the speech limit, never mid-sentence");
{
  const sentence = "This is a sentence about a rover on Mars that has been busy for a very long time. ";
  const long = sentence.repeat(120); // ~10,000 chars
  const chunks = chunkForTts(long);
  ok(chunks.length >= 3, `a long segment is split into several pieces (${chunks.length})`);
  ok(chunks.every((c) => c.length <= TTS_CHUNK_CHARS), `every piece is within ${TTS_CHUNK_CHARS} characters (max ${Math.max(...chunks.map((c) => c.length))})`);
  ok(chunks.every((c) => /[.!?]["']?$/.test(c)), "every piece ends at a sentence boundary");
  ok(chunks.join(" ").replace(/\s+/g, " ").trim() === long.replace(/\s+/g, " ").trim(), "nothing is lost or duplicated in the split");
  ok(chunkForTts("Short one.").length === 1, "a short segment stays whole");
  ok(chunkForTts("").length === 0, "empty text yields no pieces");
  const huge = "x".repeat(TTS_CHUNK_CHARS * 2 + 10) + ".";
  ok(chunkForTts(huge).every((c) => c.length <= TTS_CHUNK_CHARS), "a single oversized sentence is still cut to the limit rather than dropped");
}

console.log("\n[3] Joining audio pieces");
{
  const id3 = (payloadLen) => {
    // ID3v2 header: "ID3", version, flags, then a 4-byte syncsafe size.
    const b = new Uint8Array(10 + payloadLen);
    b.set([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);
    b[6] = (payloadLen >> 21) & 0x7f; b[7] = (payloadLen >> 14) & 0x7f; b[8] = (payloadLen >> 7) & 0x7f; b[9] = payloadLen & 0x7f;
    return b;
  };
  const frames = (n, fill) => new Uint8Array(n).fill(fill);
  const tagged = new Uint8Array([...id3(20), ...frames(50, 0xbb)]);
  ok(stripId3(tagged).length === 50, "an ID3v2 header is stripped, leaving only the audio frames");
  ok(stripId3(frames(30, 0xaa)).length === 30, "untagged audio passes through untouched");

  const a = frames(40, 0x11), b = tagged, c = frames(25, 0x33);
  const joined = concatMp3([a, b, c]);
  ok(joined.length === 40 + 50 + 25, `pieces are laid end to end with later tags removed (${joined.length} bytes)`);
  ok(joined[0] === 0x11 && joined[40] === 0xbb && joined[90] === 0x33, "order is preserved");
  ok(concatMp3([id3(5).length ? new Uint8Array([...id3(5), 1, 2, 3]) : a]).length === 18, "the first piece keeps its own header (players expect it at the start)");
}

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
