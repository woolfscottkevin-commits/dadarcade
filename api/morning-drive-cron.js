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
  todayET,
} from "./_morning-drive-shared.js";
import { resolveArtwork, resolveFlag, resolveWikiImage } from "./_morning-drive-media.js";

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

  // `?force=1` regenerates a day that already exists. Without it the run is
  // idempotent, which is what you want from a nightly cron — but it also means
  // a day generated before a code change keeps serving the old content forever.
  // Only reachable with the CRON_SECRET, and it only ever replaces one dated row.
  const force = ["1", "true", "yes"].includes(
    (url.searchParams.get("force") || "").toLowerCase()
  );

  try {
    const result = await generateAndStore(dateStr, "cron", { force });
    return res.status(200).json(result);
  } catch (err) {
    console.error("[morning-drive-cron] failed:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

// Exposed so the on-demand fallback in api/morning-drive.js can reuse it.
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
    status: force && existing ? "regenerated" : "generated",
    date: dateStr,
    sections: activeSections.filter((x) => !media.dropped.includes(x)),
    droppedForMedia: media.dropped,
    mediaAttempts: media.attempts,
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
