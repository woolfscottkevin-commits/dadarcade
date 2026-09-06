// api/morning-drive-cron.js — Nightly Morning Drive generator
// Wired into vercel.json under "crons" at 8:30 UTC (4:30am EDT / 3:30am EST).
// Idempotent: if today's row already exists, this is a no-op.
//
// Manual invocation for testing:
//   curl https://dadarcade.com/api/morning-drive-cron \
//     -H "Authorization: Bearer <CRON_SECRET>"

import { generateText, Output } from "ai";
import {
  activeSectionsFor,
  assignGrammarPlan,
  assignMathPlan,
  buildPayloadSchema,
  buildPrompt,
  buildVocabReview,
  extractFingerprints,
  fetchPriorWords,
  fetchRecentDifficulty,
  fetchRecentFormats,
  fetchRecentReadable,
  fetchVocabStats,
  getSupabase,
  scrubAnswerTells,
  todayET,
} from "./_morning-drive-shared.js";
import { resolveArtwork, resolveFlag, resolveWikiImage } from "./_morning-drive-media.js";
import {
  DAILY_SECTIONS as _DAILY,
} from "./_morning-drive-shared.js";
import {
  assembleFromPool, kindsNeedingTopUp, poolAvailability, releaseItems,
} from "./_morning-drive-pool.js";
import { generateBatch } from "./_morning-drive-batch.js";

const MODEL = "anthropic/claude-sonnet-4.6";

// Batch generation is slow (a 70-item math batch is tens of seconds), so this
// function needs materially longer than a typical request. Declared explicitly
// so it does not silently inherit whatever the platform default happens to be.
export const config = { maxDuration: 300 };

// Stop starting new batches with this much of the budget gone. The guard cannot
// interrupt a generation already in flight, so it has to leave room for the
// longest batch we might begin — see runTopUps().
const RUN_BUDGET_MS = 200_000;

// Pure so it can be tested without a clock or a network. The guard cannot
// interrupt a generation already in flight, so it must refuse to START one it
// does not expect to finish — hence budgeting against the SLOWEST batch seen,
// not the average.
export function canStartAnotherBatch(elapsedMs, worstBatchMs, budgetMs = RUN_BUDGET_MS) {
  return elapsedMs + worstBatchMs <= budgetMs;
}

export default async function handler(req, res) {
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. Verify when set.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${expected}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  // Allow `?date=YYYY-MM-DD` override for manual testing; default to today in ET.
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const dateStr = url.searchParams.get("date") || todayET();

  // `?force=1` regenerates a day that already exists. Without it the run is
  // idempotent, which is what you want from a nightly cron — but it also means
  // a day generated before a code change keeps serving the old content forever.
  // Only reachable with the CRON_SECRET, and it only ever replaces one dated row.
  const force = ["1", "true", "yes"].includes(
    (url.searchParams.get("force") || "").toLowerCase()
  );

  // `?mode=status` reports the bank without generating anything.
  if (url.searchParams.get("mode") === "status") {
    try {
      return res.status(200).json(await poolStatus());
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  // `?mode=topup` refills the content bank without assembling a day. Used to
  // seed the pool initially, and available if a kind ever runs dry unexpectedly.
  // `?kinds=N` caps how many kinds one invocation will generate, so a seed run
  // can be spread over several calls instead of hitting the function timeout.
  if (url.searchParams.get("mode") === "topup") {
    const max = Math.max(1, Math.min(8, Number(url.searchParams.get("kinds") || 1)));
    try {
      return res.status(200).json(await runTopUps(dateStr, max));
    } catch (err) {
      console.error("[morning-drive-cron] top-up failed:", err);
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  try {
    const result = await generateAndStore(dateStr, "cron", { force });
    return res.status(200).json(result);
  } catch (err) {
    console.error("[morning-drive-cron] failed:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

// Exposed so the on-demand fallback in api/morning-drive.js can reuse it.
//
// Normal path: assemble the day out of the content bank in pure code — no model
// call at all. The bank is refilled in large batches by runTopUps(), which is
// where the (much smaller) cost now lives.
export async function generateAndStore(dateStr, generatedBy, { force = false } = {}) {
  const sb = getSupabase();

  // Idempotency check — if the row already exists, do nothing, unless the
  // caller explicitly asked to overwrite it.
  const { data: existing } = await sb
    .from("morning_drive_days")
    .select("date")
    .eq("date", dateStr)
    .maybeSingle();
  if (existing && !force) {
    return { ok: true, status: "exists", date: dateStr };
  }

  const activeSections = activeSectionsFor(dateStr);
  const { payload: pooled, short } = await assembleFromPool(sb, dateStr, activeSections);

  // A day is only servable if the everyday sections are covered. If the bank
  // cannot manage that (first run before seeding, or a kind run dry), hand the
  // claimed items back and fall through to the original full-generation path so
  // the kids still get a drive.
  const coreShort = short.filter((sec) => _DAILY.includes(sec));
  if (coreShort.length) {
    await releaseItems(sb, dateStr).catch(() => {});
    const legacy = await legacyGenerateAndStore(dateStr, generatedBy, { force, sb, reason: coreShort });
    return legacy;
  }

  const vocabReview = await buildVocabReviewFor(sb, dateStr, pooled.wordsOfDay);
  const servedSections = activeSections.filter((sec) => !short.includes(sec));

  const payload = {
    ...pooled,
    vocabReview,
    meta: {
      sections: servedSections,
      shortFromPool: short,
      source: "pool",
      schemaVersion: 4,
    },
  };

  const row = { date: dateStr, payload, generated_by: generatedBy };
  const { error: writeErr } = force
    ? await sb.from("morning_drive_days").upsert(row, { onConflict: "date" })
    : await sb.from("morning_drive_days").insert(row);
  if (writeErr) {
    if (writeErr.code === "23505") return { ok: true, status: "race-skipped", date: dateStr };
    // Do not keep the pool items if the day did not land.
    await releaseItems(sb, dateStr).catch(() => {});
    throw writeErr;
  }

  // Refill at most one kind per night, so the cost is bounded and predictable.
  const topUp = await runTopUps(dateStr, 1, sb);

  return {
    ok: true,
    status: force && existing ? "regenerated" : "assembled",
    source: "pool",
    date: dateStr,
    sections: servedSections,
    shortFromPool: short,
    modelCalls: topUp.generated.length,
    topUp,
  };
}

// Word Match is still built in code from earlier days' words — the pool holds
// today's NEW words, the review comes from what they have already met.
async function buildVocabReviewFor(sb, dateStr, wordsOfDay) {
  const [priorWords, vocabStats] = await Promise.all([
    fetchPriorWords(sb, dateStr),
    fetchVocabStats(sb),
  ]);
  return {
    claire: buildVocabReview({
      priorWords, stats: vocabStats, kid: "claire", dateStr,
      todaysWord: wordsOfDay?.claire?.word,
    }),
    connor: buildVocabReview({
      priorWords, stats: vocabStats, kid: "connor", dateStr,
      todaysWord: wordsOfDay?.connor?.word,
    }),
  };
}

// Refill the emptiest kinds. One model call per kind, each producing 25-70
// items — this is where essentially all remaining spend lives.
export async function runTopUps(dateStr, maxKinds = 1, existingSb = null) {
  const sb = existingSb || getSupabase();
  const startedAt = Date.now();
  const counts = await poolAvailability(sb);
  const needed = kindsNeedingTopUp(counts);
  const generated = [];
  let stoppedEarly = false;

  // Assume the next batch takes as long as the slowest one so far. Before the
  // first batch there is nothing to go on, so seed the estimate high enough to
  // cover a full 70-item math batch.
  let worstBatchMs = 60_000;

  for (const need of needed.slice(0, maxKinds)) {
    const elapsed = Date.now() - startedAt;
    if (!canStartAnotherBatch(elapsed, worstBatchMs)) {
      // Returning a short, honest answer beats being killed mid-batch and
      // returning nothing at all — the earlier seeding run looked like a
      // failure purely because the platform cut the response.
      stoppedEarly = true;
      break;
    }

    const batchStart = Date.now();
    try {
      generated.push(await generateBatch(sb, { kind: need.kind, kid: need.kid, dateStr }));
    } catch (err) {
      console.error(`[morning-drive-cron] top-up failed for ${need.kind}:`, err);
      generated.push({ kind: need.kind, kid: need.kid, error: String(err.message || err) });
    }
    worstBatchMs = Math.max(worstBatchMs, Date.now() - batchStart);
  }

  const done = new Set(generated.map((g) => `${g.kind}:${g.kid || ""}`));
  const stillLow = needed
    .filter((n) => !done.has(`${n.kind}:${n.kid || ""}`))
    .map((n) => `${n.kind}${n.kid ? ":" + n.kid : ""} (${n.have}/${n.min})`);

  return {
    checked: Object.keys(counts).length,
    lowCount: needed.length,
    generated,
    stillLow,
    stoppedEarly,
    elapsedMs: Date.now() - startedAt,
    // Tells a seeding loop whether another pass is worth making.
    moreWork: stillLow.length > 0,
  };
}

// Read-only view of the bank. No generation, no cost — safe to poll while
// seeding, and the quickest way to see whether a kind is running dry.
export async function poolStatus() {
  const sb = getSupabase();
  const counts = await poolAvailability(sb);
  const low = kindsNeedingTopUp(counts);
  return {
    ok: true,
    totalAvailable: Object.values(counts).reduce((a, b) => a + b, 0),
    byKind: counts,
    low: low.map((n) => `${n.kind}${n.kid ? ":" + n.kid : ""} (${n.have}/${n.min})`),
    seeded: low.length === 0,
  };
}

// The original full-day generation. Retained as the fallback for when the bank
// cannot cover the everyday sections — chiefly the very first run, before the
// pool has been seeded.
async function legacyGenerateAndStore(dateStr, generatedBy, { force = false, sb: injected, reason = [] } = {}) {
  const sb = injected || getSupabase();

  // Which sections run today, and what each math question must cover. Both are
  // derived from the date alone, so regenerating an old day reproduces it.
  const activeSections = activeSectionsFor(dateStr);
  const mathPlans = {
    claire: assignMathPlan(dateStr, "claire"),
    connor: assignMathPlan(dateStr, "connor"),
  };
  const grammarPlans = {
    claire: assignGrammarPlan(dateStr, "claire"),
    connor: assignGrammarPlan(dateStr, "connor"),
  };

  // Everything the prompt needs, plus the raw material for Word Match.
  const [readable, difficultyLines, formatLines, priorWords, vocabStats] =
    await Promise.all([
      fetchRecentReadable(sb, 60),
      fetchRecentDifficulty(sb),
      fetchRecentFormats(sb, 21),
      fetchPriorWords(sb, dateStr),
      fetchVocabStats(sb),
    ]);

  const prompt = buildPrompt({
    dateStr,
    doNotRepeat: readable,
    recentDifficulty: difficultyLines,
    recentFormats: formatLines,
    activeSections,
    mathPlans,
    grammarPlans,
  });

  // Schema is built per-day from the active sections, so the model is never
  // asked for a section that isn't running today.
  const schema = buildPayloadSchema(activeSections);

  // Generate the day's payload. AI SDK v6 routes provider/model strings through
  // the Vercel AI Gateway automatically.
  //
  // Auth: OIDC. When this function runs on Vercel, OIDC auto-wires the
  // Gateway token with zero config and automatic rotation. For local dev,
  // run `vercel env pull` so `vercel dev` inherits the same OIDC-issued token.
  const { output: generated } = await generateText({
    model: MODEL,
    output: Output.object({ schema }),
    prompt,
  });

  // Word Match is assembled in code from PREVIOUS days' words — never by the
  // model, and never from today's words. Early on there aren't enough prior
  // words to build a question, so the section simply sits out until there are.
  const vocabReview = {
    claire: buildVocabReview({
      priorWords, stats: vocabStats, kid: "claire", dateStr,
      todaysWord: generated.wordsOfDay?.claire?.word,
    }),
    connor: buildVocabReview({
      priorWords, stats: vocabStats, kid: "connor", dateStr,
      todaysWord: generated.wordsOfDay?.connor?.word,
    }),
  };

  // Remove any tick marks or "(correct)" asides the model attached to its own
  // answer key before this reaches a child who can read them.
  const tellsCleaned = scrubAnswerTells(generated);

  // Turn the subjects the model named into real, verified, correctly-credited
  // images. Anything that fails to resolve is dropped rather than shipped
  // broken — a 404 in the car at 7am is worse than a missing tile.
  const media = await resolveMedia(generated);

  const payload = {
    ...generated,
    ...media.patch,
    vocabReview,
    // Recorded so the page (and any later regeneration) knows exactly which
    // sections this day was built with.
    meta: {
      sections: activeSections.filter((x) => !media.dropped.includes(x)),
      mathPlans,
      grammarPlans,
      droppedForMedia: media.dropped,
      mediaAttempts: media.attempts,
      answerTellsCleaned: tellsCleaned,
      schemaVersion: 3,
    },
  };

  // Write the day row. `date` is the primary key, so an upsert replaces the
  // existing row when forcing and behaves like an insert otherwise.
  const row = { date: dateStr, payload, generated_by: generatedBy };
  const { error: insertDayErr } = force
    ? await sb.from("morning_drive_days").upsert(row, { onConflict: "date" })
    : await sb.from("morning_drive_days").insert(row);
  if (insertDayErr) {
    // If the row was inserted by a concurrent run between our check and now,
    // treat as success.
    if (insertDayErr.code === "23505") {
      return { ok: true, status: "race-skipped", date: dateStr };
    }
    throw insertDayErr;
  }

  // Insert fingerprints. Use upsert on the unique (kind, fingerprint) so any
  // collision is a silent skip — the day still ships.
  const fingerprints = extractFingerprints(payload).map((fp) => ({
    ...fp,
    date: dateStr,
  }));
  if (fingerprints.length) {
    await sb
      .from("morning_drive_seen")
      .upsert(fingerprints, { onConflict: "kind,fingerprint", ignoreDuplicates: true });
  }

  return {
    ok: true,
    status: "generated-legacy",
    source: "legacy",
    legacyReason: reason,
    date: dateStr,
    sections: activeSections.filter((x) => !media.dropped.includes(x)),
    droppedForMedia: media.dropped,
    mediaAttempts: media.attempts,
    answerTellsCleaned: tellsCleaned,
    counts: {
      math: (payload.claireMath?.length || 0) + (payload.connorMath?.length || 0),
      grammar: (payload.grammarClaire?.length || 0) + (payload.grammarConnor?.length || 0),
      words: payload.wordsOfDay ? 2 : 0,
      vocabReview: vocabReview.claire.length + vocabReview.connor.length,
      news: payload.news?.length || 0,
      trivia: payload.trivia?.length || 0,
      facts: payload.facts?.length || 0,
      jokes: payload.jokes?.length || 0,
      wyr: payload.wyr?.length || 0,
      fingerprintsLogged: fingerprints.length,
    },
  };
}


// ----------------------------------------------------------------------------
// Media resolution
// ----------------------------------------------------------------------------
// The model names a subject; these look it up in a real collection or article
// and attach a verified image. Returns a patch to merge into the payload plus
// the list of sections that could not be resolved and must be dropped.
async function resolveMedia(generated) {
  const patch = {};
  const dropped = [];
  // What we actually tried, so a dropped tile is debuggable after the fact
  // rather than just vanishing.
  const attempts = {};

  const jobs = [];

  if (generated.artwork) {
    jobs.push(
      resolveArtworkFromCandidates(generated.artwork)
        .then(({ art, candidate, attempted }) => {
          attempts.artwork = attempted;
          if (!art || !candidate) return dropped.push("artwork");
          // Prefer the museum's own title/artist/date over the model's — the
          // catalogue is authoritative and the model's title is often shortened.
          patch.artwork = {
            question: candidate.question,
            lookFor: candidate.lookFor,
            story: candidate.story,
            title: art.title,
            artist: art.artist,
            year: art.year,
            image: {
              url: art.imageUrl, credit: art.credit,
              sourceUrl: art.sourceUrl, source: art.source,
            },
          };
        })
        .catch(() => dropped.push("artwork"))
    );
  }

  for (const [key, titleField] of [["landmark", "wikiTitle"], ["animal", "wikiTitle"]]) {
    const item = generated[key];
    if (!item) continue;
    jobs.push(
      resolveWikiImage(item[titleField] || item.name)
        .then((img) => {
          if (!img) return dropped.push(key);
          patch[key] = {
            ...item,
            image: {
              url: img.imageUrl, credit: img.credit,
              sourceUrl: img.sourceUrl, source: img.source,
              width: img.width, height: img.height,
            },
          };
        })
        .catch(() => dropped.push(key))
    );
  }

  if (generated.flag) {
    jobs.push(
      resolveFlag(generated.flag.country)
        .then((f) => {
          if (!f) return dropped.push("flag");
          patch.flag = {
            ...generated.flag,
            image: { url: f.imageUrl, credit: f.credit, source: f.source },
          };
        })
        .catch(() => dropped.push("flag"))
    );
  }

  await Promise.all(jobs);

  // Strip anything that could not be resolved so the page never sees a
  // half-built tile.
  for (const key of dropped) patch[key] = undefined;
  return { patch, dropped, attempts };
}

// Walk the model's three suggestions in order and keep the first that the
// museum collections can actually produce. Only ~60% of famous works a model
// names are both in these two collections and out of copyright, so one pick
// alone left the tile missing roughly four mornings in ten.
async function resolveArtworkFromCandidates(artwork) {
  const candidates = artwork.candidates?.length
    ? artwork.candidates
    // Tolerate the older single-artwork shape so a replay of an old day, or a
    // model response that ignores the array, still works.
    : [artwork].filter((a) => a?.title);

  const attempted = [];
  for (const candidate of candidates) {
    attempted.push(`${candidate.title} — ${candidate.artist || "?"}`);
    const art = await resolveArtwork({ title: candidate.title, artist: candidate.artist });
    if (art) return { art, candidate, attempted };
  }
  return { art: null, candidate: null, attempted };
}
