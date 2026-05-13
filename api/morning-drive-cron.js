// api/morning-drive-cron.js — Nightly Morning Drive generator
// Wired into vercel.json under "crons" at 8:30 UTC (4:30am EDT / 3:30am EST).
// Idempotent: if today's row already exists, this is a no-op.
//
// Manual invocation for testing:
//   curl https://dadarcade.com/api/morning-drive-cron \
//     -H "Authorization: Bearer <CRON_SECRET>"

import { generateText, Output } from "ai";
import {
  buildPrompt,
  extractFingerprints,
  fetchRecentDifficulty,
  fetchRecentReadable,
  getSupabase,
  payloadSchema,
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

  // Build the "do not repeat" context + difficulty signal in parallel.
  const [readable, difficultyLines] = await Promise.all([
    fetchRecentReadable(sb, 60),
    fetchRecentDifficulty(sb),
  ]);

  const prompt = buildPrompt({
    dateStr,
    doNotRepeat: readable,
    recentDifficulty: difficultyLines,
  });

  // Generate the day's payload. AI SDK v6 routes provider/model strings through
  // the Vercel AI Gateway automatically.
  //
  // Auth: OIDC. When this function runs on Vercel, OIDC auto-wires the
  // Gateway token with zero config and automatic rotation. For local dev,
  // run `vercel env pull` so `vercel dev` inherits the same OIDC-issued token.
  //
  // Structured output uses generateText + Output.object().
  const { output: payload } = await generateText({
    model: MODEL,
    output: Output.object({ schema: payloadSchema }),
    prompt,
  });

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
    counts: {
      math: (payload.claireMath?.length || 0) + (payload.connorMath?.length || 0),
      words: 2,
      vocabMatch: 2,
      news: payload.news?.length || 0,
      trivia: payload.trivia?.length || 0,
      facts: payload.facts?.length || 0,
      jokes: payload.jokes?.length || 0,
      wyr: payload.wyr?.length || 0,
      fingerprintsLogged: fingerprints.length,
    },
  };
}
