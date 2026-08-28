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
  todayET,
} from "./_morning-drive-shared.js";

const MODEL = "anthropic/claude-sonnet-4.6";

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

  try {
    const result = await generateAndStore(dateStr, "cron");
    return res.status(200).json(result);
  } catch (err) {
    console.error("[morning-drive-cron] failed:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

// Exposed so the on-demand fallback in api/morning-drive.js can reuse it.
export async function generateAndStore(dateStr, generatedBy) {
  const sb = getSupabase();

  // Idempotency check — if the row already exists, do nothing.
  const { data: existing } = await sb
    .from("morning_drive_days")
    .select("date")
    .eq("date", dateStr)
    .maybeSingle();
  if (existing) {
    return { ok: true, status: "exists", date: dateStr };
  }

  // Which sections run today, and what each math question must cover. Both are
  // derived from the date alone, so regenerating an old day reproduces it.
  const activeSections = activeSectionsFor(dateStr);
  const mathPlans = {
    claire: assignMathPlan(dateStr, "claire"),
    connor: assignMathPlan(dateStr, "connor"),
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

  const payload = {
    ...generated,
    vocabReview,
    // Recorded so the page (and any later regeneration) knows exactly which
    // sections this day was built with.
    meta: { sections: activeSections, mathPlans, schemaVersion: 2 },
  };

  // Insert the day row.
  const { error: insertDayErr } = await sb
    .from("morning_drive_days")
    .insert({ date: dateStr, payload, generated_by: generatedBy });
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
    status: "generated",
    date: dateStr,
    sections: activeSections,
    counts: {
      math: (payload.claireMath?.length || 0) + (payload.connorMath?.length || 0),
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
