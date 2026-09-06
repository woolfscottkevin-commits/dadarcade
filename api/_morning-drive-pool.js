// The content bank.
//
// Morning Drive used to generate a whole day every night, and 91% of that
// prompt was the "don't repeat yourself" block — ~26,000 tokens of everything
// the model had previously written, re-sent nightly and growing. A database
// does that job with a unique constraint.
//
// Almost every tile is evergreen: a joke, a riddle, a verse, a flag question
// about Japan is no worse for having been written six weeks ago. So content is
// generated in BATCHES into morning_drive_pool, and the nightly job assembles a
// day from it in pure code. Most mornings cost nothing at all.

import { fingerprint } from "./_morning-drive-shared.js";

// ----------------------------------------------------------------------------
// What lives in the pool
// ----------------------------------------------------------------------------
// `min`   — top up when fewer than this many remain unused
// `batch` — how many to generate in one call when topping up
// Batches are deliberately large: asking for 50 jokes at once also produces
// BETTER jokes than 50 separate calls, because the model can see the whole set
// and vary it.
export const POOL_KINDS = {
  math:             { perKid: true,  batchDays: 14, perDay: 5, min: 30 },
  grammar:          { perKid: true,  batchDays: 14, perDay: 3, min: 18 },
  word:             { perKid: true,  batch: 30, min: 10 },
  spelling:         { perKid: true,  batch: 24, min: 9 },
  bible:            { batch: 30, min: 10 },
  quote:            { batch: 30, min: 10 },
  joke:             { batch: 50, min: 16 },
  wyr:              { batch: 60, min: 24 },
  trivia:           { batch: 45, min: 15 },
  fact:             { batch: 45, min: 15 },
  news:             { batch: 30, min: 10 },
  riddle:           { batch: 30, min: 8 },
  twoTruths:        { batch: 30, min: 8 },
  characterTrait:   { batch: 25, min: 8 },
  geography:        { batch: 30, min: 8 },
  spanishWord:      { batch: 40, min: 12 },
  artwork:          { batch: 12, min: 5, media: true },
  landmark:         { batch: 15, min: 5, media: true },
  flag:             { batch: 20, min: 6, media: true },
  animal:           { batch: 20, min: 6, media: true },
  thisDayInHistory: { batch: 30, min: 10, slotted: true },
};

// How each rendered section is filled from the pool.
export const SECTION_NEEDS = {
  claireMath:       { kind: "math", kid: "claire", count: 5, as: "list" },
  connorMath:       { kind: "math", kid: "connor", count: 5, as: "list" },
  grammarClaire:    { kind: "grammar", kid: "claire", count: 3, as: "list" },
  grammarConnor:    { kind: "grammar", kid: "connor", count: 3, as: "list" },
  wordsOfDay:       { kind: "word", perKid: 1, as: "byKid" },
  spelling:         { kind: "spelling", perKid: 3, as: "byKidList" },
  bibleVerse:       { kind: "bible", count: 1, as: "single" },
  quote:            { kind: "quote", count: 1, as: "single" },
  jokes:            { kind: "joke", count: 2, as: "list" },
  wyr:              { kind: "wyr", count: 4, as: "list" },
  news:             { kind: "news", count: 2, as: "list" },
  trivia:           { kind: "trivia", count: 3, as: "list" },
  facts:            { kind: "fact", count: 3, as: "list" },
  riddle:           { kind: "riddle", count: 1, as: "single" },
  twoTruths:        { kind: "twoTruths", count: 1, as: "single" },
  characterTrait:   { kind: "characterTrait", count: 1, as: "single" },
  geography:        { kind: "geography", count: 1, as: "single" },
  spanishWord:      { kind: "spanishWord", count: 1, as: "single" },
  artwork:          { kind: "artwork", count: 1, as: "single" },
  landmark:         { kind: "landmark", count: 1, as: "single" },
  flag:             { kind: "flag", count: 1, as: "single" },
  animal:           { kind: "animal", count: 1, as: "single" },
  thisDayInHistory: { kind: "thisDayInHistory", count: 1, as: "single", slotted: true },
};

// The text a fingerprint is taken from, per kind. Picking the identifying line
// rather than the whole object means a reworded story doesn't sneak the same
// artwork or joke back into the pool.
export function itemKey(kind, item) {
  switch (kind) {
    case "math":
    case "grammar":       return item.question;
    case "word":
    case "spelling":      return item.word;
    case "bible":         return item.reference;
    case "quote":         return item.text;
    case "joke":          return item.setup;
    case "wyr":           return `${item.a} || ${item.b}`;
    case "trivia":        return item.question;
    case "fact":          return item.title || item.fact;
    case "news":          return item.headline;
    case "riddle":        return item.riddle;
    case "twoTruths":     return (item.items || []).map((i) => i.text).join(" | ");
    case "characterTrait":return item.trait;
    case "geography":     return `${item.us?.answer || ""}|${item.world?.answer || ""}`;
    case "spanishWord":   return item.spanish;
    case "artwork":       return item.title;
    case "landmark":      return item.name;
    case "flag":          return item.country;
    case "animal":        return item.name;
    case "thisDayInHistory": return item.event;
    default:              return JSON.stringify(item).slice(0, 200);
  }
}

// ----------------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------------

// How many unused items exist for every (kind, kid). Cheap — this runs nightly
// even when no generation is needed.
export async function poolAvailability(sb) {
  const { data, error } = await sb
    .from("morning_drive_pool")
    .select("kind, kid")
    .is("used_on", null)
    .limit(20000);
  if (error) throw error;

  const counts = {};
  for (const row of data || []) {
    const key = row.kid ? `${row.kind}:${row.kid}` : row.kind;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Which kinds have fallen below their threshold, worst deficit first.
export function kindsNeedingTopUp(counts) {
  const out = [];
  for (const [kind, spec] of Object.entries(POOL_KINDS)) {
    const kids = spec.perKid ? ["claire", "connor"] : [null];
    for (const kid of kids) {
      const key = kid ? `${kind}:${kid}` : kind;
      const have = counts[key] || 0;
      const min = spec.perKid && spec.batchDays ? spec.min : spec.min;
      if (have < min) out.push({ kind, kid, have, min, deficit: min - have });
    }
  }
  return out.sort((a, b) => b.deficit - a.deficit);
}

// ----------------------------------------------------------------------------
// Claiming
// ----------------------------------------------------------------------------

// Take `count` unused items and stamp them as used by `dateStr`. Oldest first,
// so the pool drains in the order it was written rather than always serving the
// newest batch. Returns fewer than requested (or none) if the pool is short —
// callers decide whether that means dropping a section.
export async function claimItems(sb, { kind, kid = null, count = 1, slot = null, dateStr }) {
  let q = sb
    .from("morning_drive_pool")
    .select("id, payload")
    .eq("kind", kind)
    .is("used_on", null)
    .order("id", { ascending: true })
    .limit(count);

  q = kid ? q.eq("kid", kid) : q.is("kid", null);
  if (slot) q = q.eq("slot", slot);

  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return [];

  const ids = data.map((r) => r.id);
  const { error: markErr } = await sb
    .from("morning_drive_pool")
    .update({ used_on: dateStr })
    .in("id", ids);
  if (markErr) throw markErr;

  return data.map((r) => r.payload);
}

// Hand items back if the day ends up not being written (a later failure), so a
// crash doesn't silently burn a week of pool.
export async function releaseItems(sb, dateStr) {
  const { error } = await sb
    .from("morning_drive_pool")
    .update({ used_on: null })
    .eq("used_on", dateStr);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Writes
// ----------------------------------------------------------------------------

// Insert a generated batch. Duplicates collide on (kind, fingerprint) and are
// skipped silently — that unique index IS the never-repeat guarantee that used
// to cost 26,000 prompt tokens a night.
export async function insertItems(sb, { kind, kid = null, items, slotOf = null }) {
  const rows = [];
  const seen = new Set();
  for (const item of items || []) {
    const key = itemKey(kind, item);
    if (!key) continue;
    const fp = fingerprint(`${kind}:${kid || "shared"}:${key}`);
    if (seen.has(fp)) continue; // duplicates inside one batch
    seen.add(fp);
    rows.push({
      kind, kid, payload: item, fingerprint: fp,
      slot: slotOf ? slotOf(item) : null,
    });
  }
  if (!rows.length) return { inserted: 0, attempted: 0 };

  const { data, error } = await sb
    .from("morning_drive_pool")
    .upsert(rows, { onConflict: "kind,fingerprint", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return { inserted: data?.length || 0, attempted: rows.length };
}

// ----------------------------------------------------------------------------
// Assembly
// ----------------------------------------------------------------------------

// Build a day's payload entirely from the pool. No model call. Sections the
// pool can't fill are reported as `short` so the caller can drop them rather
// than render half a tile.
export async function assembleFromPool(sb, dateStr, activeSections) {
  const payload = {};
  const short = [];
  const monthDay = dateStr.slice(5); // 'MM-DD'

  for (const section of activeSections) {
    const need = SECTION_NEEDS[section];
    if (!need) continue;

    if (need.as === "byKid" || need.as === "byKidList") {
      const per = need.perKid;
      const out = {};
      let ok = true;
      for (const kid of ["claire", "connor"]) {
        const items = await claimItems(sb, { kind: need.kind, kid, count: per, dateStr });
        if (items.length < per) { ok = false; break; }
        out[kid] = need.as === "byKid" ? items[0] : items;
      }
      if (ok) payload[section] = out; else short.push(section);
      continue;
    }

    const items = await claimItems(sb, {
      kind: need.kind,
      kid: need.kid || null,
      count: need.count,
      slot: need.slotted ? monthDay : null,
      dateStr,
    });
    if (items.length < need.count) { short.push(section); continue; }
    payload[section] = need.as === "single" ? items[0] : items;
  }

  return { payload, short };
}
