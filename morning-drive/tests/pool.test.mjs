// Tests for the content bank.
// Run: node morning-drive/tests/pool.test.mjs
//
// These run against an in-memory stand-in for the Supabase client rather than a
// real database, so they need no network, no credentials and no AI credit.

import {
  POOL_KINDS, SECTION_NEEDS, itemKey,
  kindsNeedingTopUp, poolAvailability, claimItems, insertItems,
  releaseItems, assembleFromPool,
} from "../../api/_morning-drive-pool.js";
import { ITEM_SCHEMAS, activeSectionsFor, DAILY_SECTIONS } from "../../api/_morning-drive-shared.js";
import { canStartAnotherBatch } from "../../api/morning-drive-cron.js";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"}  ${m}`); if (!c) fail++; };

// ---------------------------------------------------------------------------
// A minimal stand-in for the bits of the Supabase client the pool module uses:
// a thenable query builder supporting select/eq/is/in/order/limit/update/upsert.
// ---------------------------------------------------------------------------
function fakeSb(seed = []) {
  const rows = seed.map((r, i) => ({ id: i + 1, kid: null, slot: null, used_on: null, ...r }));
  let nextId = rows.length + 1;

  return {
    rows,
    from() {
      const filters = [];
      let order = null, limit = null, mode = "select", payload = null;
      const run = () => {
        let out = rows.filter((r) => filters.every((f) => f(r)));
        if (order) out = [...out].sort((a, b) => (order.asc ? a[order.col] - b[order.col] : b[order.col] - a[order.col]));
        if (limit != null) out = out.slice(0, limit);
        return out;
      };
      const api = {
        select() { return api; },
        eq(col, val) { filters.push((r) => r[col] === val); return api; },
        is(col, val) { filters.push((r) => r[col] === val); return api; },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return api; },
        order(col, o = {}) { order = { col, asc: o.ascending !== false }; return api; },
        limit(n) { limit = n; return api; },
        update(vals) { mode = "update"; payload = vals; return api; },
        upsert(newRows, opts = {}) {
          mode = "upsert"; payload = { newRows, opts }; return api;
        },
        then(resolve) {
          if (mode === "update") {
            const hit = run();
            for (const r of hit) Object.assign(r, payload);
            return resolve({ data: hit, error: null });
          }
          if (mode === "upsert") {
            const inserted = [];
            for (const r of payload.newRows) {
              const clash = rows.find((x) => x.kind === r.kind && x.fingerprint === r.fingerprint);
              if (clash) continue; // ignoreDuplicates
              const row = { id: nextId++, kid: null, slot: null, used_on: null, ...r };
              rows.push(row); inserted.push({ id: row.id });
            }
            return resolve({ data: inserted, error: null });
          }
          return resolve({ data: run(), error: null });
        },
      };
      return api;
    },
  };
}

const mkItems = (kind, n, kid = null) =>
  Array.from({ length: n }, (_, i) => ({
    kind, kid, used_on: null, slot: null,
    fingerprint: `${kind}-${kid || "s"}-${i}`,
    payload: { question: `${kind} q${i}`, setup: `${kind} s${i}`, word: `${kind}w${i}`,
      reference: `Ref ${i}`, text: `text ${i}`, a: `a${i}`, b: `b${i}`, title: `t${i}`,
      name: `n${i}`, country: `c${i}`, spanish: `sp${i}`, trait: `tr${i}`, riddle: `r${i}`,
      event: `On March ${(i % 28) + 1}, thing ${i}`, sentence: `s${i}`,
      items: [{ text: `x${i}` }], us: { answer: `us${i}` }, world: { answer: `w${i}` } },
  }));

// ---------------------------------------------------------------------------
console.log("\n[1] Config coherence");
const kinds = Object.keys(POOL_KINDS);
ok(kinds.every((k) => ITEM_SCHEMAS[k]), "every pool kind has an item schema");
ok(Object.values(SECTION_NEEDS).every((n) => POOL_KINDS[n.kind]), "every section maps to a real kind");
const perKidKinds = kinds.filter((k) => POOL_KINDS[k].perKid);
ok(perKidKinds.every((k) => POOL_KINDS[k].batch || POOL_KINDS[k].batchDays), "per-kid kinds define a batch size");
ok(kinds.every((k) => POOL_KINDS[k].min > 0), "every kind has a non-zero minimum");
console.log(`      ${kinds.length} kinds, ${Object.keys(SECTION_NEEDS).length} sections`);

// A day must never need more of a kind than the top-up threshold keeps around.
const dailyDemand = {};
for (const [sec, n] of Object.entries(SECTION_NEEDS)) {
  const per = n.count ?? ((n.perKid || 0) * 2);
  dailyDemand[n.kind] = (dailyDemand[n.kind] || 0) + per;
}
const underStocked = Object.entries(dailyDemand).filter(([k, d]) => POOL_KINDS[k].min < d);
ok(underStocked.length === 0, `no kind's minimum is below one day's demand${underStocked.length ? " — " + JSON.stringify(underStocked) : ""}`);

// ---------------------------------------------------------------------------
console.log("\n[2] Availability + top-up selection");
const sb1 = fakeSb([...mkItems("joke", 3), ...mkItems("wyr", 40), ...mkItems("math", 5, "claire")]);
const counts = await poolAvailability(sb1);
ok(counts.joke === 3, `counts shared kinds (joke=${counts.joke})`);
ok(counts["math:claire"] === 5, `counts per-kid kinds (math:claire=${counts["math:claire"]})`);
const low = kindsNeedingTopUp(counts);
const lowNames = low.map((l) => `${l.kind}${l.kid ? ":" + l.kid : ""}`);
ok(!lowNames.includes("wyr"), "a well-stocked kind is not flagged (wyr has 40)");
ok(lowNames.includes("joke"), "an empty-ish kind is flagged (joke has 3)");
ok(low[0].deficit >= low[low.length - 1].deficit, "worst deficit is ordered first");
ok(lowNames.includes("math:claire") && lowNames.includes("math:connor"), "both kids flagged independently");

// ---------------------------------------------------------------------------
console.log("\n[3] Claiming");
const sb2 = fakeSb(mkItems("joke", 5));
const first = await claimItems(sb2, { kind: "joke", count: 2, dateStr: "2026-09-06" });
ok(first.length === 2, "claims the requested number");
ok(sb2.rows.filter((r) => r.used_on === "2026-09-06").length === 2, "marks exactly those rows used");
const second = await claimItems(sb2, { kind: "joke", count: 2, dateStr: "2026-09-07" });
ok(JSON.stringify(second) !== JSON.stringify(first), "a later day gets different items");
ok((await poolAvailability(sb2)).joke === 1, "availability drops as items are consumed");
const overdraw = await claimItems(sb2, { kind: "joke", count: 5, dateStr: "2026-09-08" });
ok(overdraw.length === 1, "an over-request returns only what exists rather than throwing");

console.log("\n[4] Release");
const sb3 = fakeSb(mkItems("joke", 4));
await claimItems(sb3, { kind: "joke", count: 3, dateStr: "2026-09-06" });
await releaseItems(sb3, "2026-09-06");
ok((await poolAvailability(sb3)).joke === 4, "a failed day hands every claimed item back");

// ---------------------------------------------------------------------------
console.log("\n[5] Insert + dedupe");
const sb4 = fakeSb([]);
const jokes = [{ setup: "Why did the scarecrow win?", punchline: "Outstanding", level: "connor" },
                { setup: "What do you call a fish in a bowtie?", punchline: "Sofishticated", level: "claire" }];
const r1 = await insertItems(sb4, { kind: "joke", items: jokes });
ok(r1.inserted === 2, "inserts new items");
const r2 = await insertItems(sb4, { kind: "joke", items: jokes });
ok(r2.inserted === 0, "re-inserting the same items is a no-op — the unique index IS the never-repeat rule");
const r3 = await insertItems(sb4, { kind: "joke", items: [jokes[0], jokes[0], { setup: "New one", punchline: "p", level: "claire" }] });
ok(r3.inserted === 1, "duplicates within a single batch are collapsed too");

console.log("\n[6] Fingerprint keys");
ok(itemKey("joke", { setup: "abc" }) === "abc", "joke keys on the setup, not the punchline");
ok(itemKey("artwork", { title: "The Horse Fair", story: "x" }) === "The Horse Fair", "artwork keys on title, so a reworded story cannot re-add it");
ok(itemKey("twoTruths", { items: [{ text: "a" }, { text: "b" }, { text: "c" }] }) === "a | b | c", "two-truths keys on all three statements");

// ---------------------------------------------------------------------------
console.log("\n[7] Assembling a day, no model call");
const dateStr = "2026-09-06";
const active = activeSectionsFor(dateStr);
const stocked = [];
for (const [, need] of Object.entries(SECTION_NEEDS)) {
  const per = need.count ?? need.perKid;
  if (need.kid) stocked.push(...mkItems(need.kind, per + 2, need.kid));
  else if (need.perKid) { stocked.push(...mkItems(need.kind, per + 2, "claire"), ...mkItems(need.kind, per + 2, "connor")); }
  else stocked.push(...mkItems(need.kind, per + 2));
}
// give the date-locked kind a matching slot
for (const r of stocked) if (r.kind === "thisDayInHistory") r.slot = "09-06";
const sb5 = fakeSb(stocked);
const { payload, short } = await assembleFromPool(sb5, dateStr, active);
ok(short.length === 0, `every active section filled from the bank${short.length ? " — short: " + short : ""}`);
ok(DAILY_SECTIONS.every((d) => payload[d] !== undefined), "all everyday sections present");
ok(Array.isArray(payload.claireMath) && payload.claireMath.length === 5, "Claire's math is a list of 5");
ok(payload.wordsOfDay?.claire && payload.wordsOfDay?.connor, "words of the day resolved per kid");
ok(!Array.isArray(payload.bibleVerse), "single-item sections are objects, not arrays");
const usedNow = sb5.rows.filter((r) => r.used_on === dateStr).length;
ok(usedNow > 0, `assembly consumes from the bank (${usedNow} items claimed)`);
const again = await assembleFromPool(sb5, "2026-09-07", active);
const overlap = Object.keys(payload).filter((k) => JSON.stringify(payload[k]) === JSON.stringify(again.payload[k]));
ok(overlap.length === 0, "the next day reuses nothing from today");

console.log("\n[8] Running dry is reported, not rendered broken");
const sb6 = fakeSb(mkItems("joke", 1));
const dry = await assembleFromPool(sb6, dateStr, ["jokes", "riddle"]);
ok(dry.short.includes("jokes"), "a section short of items is reported (jokes needs 2, has 1)");
ok(dry.short.includes("riddle"), "a section with no items at all is reported");
ok(dry.payload.jokes === undefined, "a short section is left out rather than half-filled");

console.log("\n[9] Top-up deadline guard");
// The first seeding run asked for 4 batches, finished 2, and was killed by the
// platform mid-third — so it returned no JSON at all and looked like a failure
// even though 140 items had landed.
ok(canStartAnotherBatch(0, 60_000, 200_000), "starts the first batch on a fresh budget");
ok(canStartAnotherBatch(100_000, 60_000, 200_000), "starts another when there is comfortably room");
ok(!canStartAnotherBatch(150_000, 60_000, 200_000), "refuses when the batch would overrun the budget");
ok(canStartAnotherBatch(140_000, 60_000, 200_000), "allows a batch that fits exactly");
ok(!canStartAnotherBatch(0, 300_000, 200_000), "refuses a batch longer than the whole budget");
// It must budget against the SLOWEST batch, not a typical one: a fast joke
// batch followed by a slow math batch is exactly how the first run died.
ok(!canStartAnotherBatch(160_000, 50_000, 200_000), "a slow outlier batch keeps the guard conservative");

console.log(fail === 0 ? "\nALL PASS\n" : `\n${fail} FAILURE(S)\n`);
process.exit(fail ? 1 : 0);
