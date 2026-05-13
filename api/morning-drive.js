// api/morning-drive.js — Morning Drive read + attempt-log API
//
//   GET  /api/morning-drive                → today's payload (in America/New_York)
//   GET  /api/morning-drive?date=YYYY-MM-DD → that date's payload (or 404)
//   GET  /api/morning-drive?past=1          → last 30 days as [{date, headline}]
//   POST /api/morning-drive                 → log an attempt
//                                             body: { date, kid, kind, problemKey, topic, attempts, correct }
//
// If today's row is missing (cron failed or hasn't run yet), GET falls back to
// generating on-demand. First load takes ~10–20s but content still lands.

import { generateAndStore } from "./morning-drive-cron.js";
import { getSupabase, isValidDateStr, todayET } from "./_morning-drive-shared.js";

const ALLOWED_ORIGINS = [
  "https://dadarcade.com",
  "https://www.dadarcade.com",
];
const MAX_PAST_DAYS = 30;

function corsHeaders(req) {
  const reqOrigin = req.headers.origin || "";
  let origin;
  if (process.env.VERCEL_ENV !== "production") origin = "*";
  else if (ALLOWED_ORIGINS.includes(reqOrigin)) origin = reqOrigin;
  else origin = "https://dadarcade.com";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async function handler(req, res) {
  Object.entries(corsHeaders(req)).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[morning-drive] failed:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

async function handleGet(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const sb = getSupabase();

  // Past-days picker
  if (url.searchParams.get("past")) {
    const { data, error } = await sb
      .from("morning_drive_days")
      .select("date, payload")
      .order("date", { ascending: false })
      .limit(MAX_PAST_DAYS);
    if (error) throw error;
    const list = (data || []).map((row) => ({
      date: row.date,
      headline:
        row.payload?.news?.[0]?.headline ||
        row.payload?.wordsOfDay?.claire?.word ||
        "Morning Drive",
    }));
    return res.status(200).json({ days: list });
  }

  // Day payload
  let dateStr = url.searchParams.get("date") || todayET();
  if (!isValidDateStr(dateStr)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const { data: row, error } = await sb
    .from("morning_drive_days")
    .select("date, payload, generated_by")
    .eq("date", dateStr)
    .maybeSingle();
  if (error) throw error;

  if (row) {
    return res.status(200).json({ date: row.date, payload: row.payload, source: "cache" });
  }

  // Fallback: generate on-demand. Slower, but the kids still get a page.
  // Only allow fallback for today or yesterday — older missing days stay 404
  // so we don't backfill the entire calendar by accident.
  const today = todayET();
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  const yesterdayET = todayET(yesterday);
  if (dateStr !== today && dateStr !== yesterdayET) {
    return res.status(404).json({ error: "No content for that date." });
  }

  const result = await generateAndStore(dateStr, "on-demand-fallback");
  // Re-read so we return the same shape regardless of path.
  const { data: fresh } = await sb
    .from("morning_drive_days")
    .select("date, payload, generated_by")
    .eq("date", dateStr)
    .maybeSingle();
  return res.status(200).json({
    date: fresh?.date || dateStr,
    payload: fresh?.payload || null,
    source: "on-demand",
    generationMeta: result,
  });
}

async function handlePost(req, res) {
  // Cheap rate limit by IP via Upstash (already wired in api/scores.js style).
  // We don't want a bored toddler with the parent's phone to fill the DB.
  const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
  const allowed = await rateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: "Too many submissions. Try again in a minute." });
  }

  const body = req.body || {};
  const { date, kid, kind, problemKey, topic, attempts, correct } = body;

  if (!isValidDateStr(date)) return res.status(400).json({ error: "Invalid date" });
  if (!["claire", "connor"].includes(kid)) return res.status(400).json({ error: "Invalid kid" });
  if (!["math", "vocab_match"].includes(kind)) return res.status(400).json({ error: "Invalid kind" });
  if (typeof problemKey !== "string" || !problemKey) return res.status(400).json({ error: "Missing problemKey" });
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 50) {
    return res.status(400).json({ error: "Invalid attempts" });
  }
  if (typeof correct !== "boolean") return res.status(400).json({ error: "Invalid correct" });

  const sb = getSupabase();
  const { error } = await sb.from("morning_drive_attempts").insert({
    date,
    kid,
    kind,
    problem_key: problemKey,
    topic: topic || null,
    attempts,
    correct,
  });
  if (error) throw error;

  return res.status(200).json({ ok: true });
}

// Lightweight IP rate-limit using the existing Upstash KV that scores.js uses.
// If KV isn't configured, just allow everything (we're a single-family site).
async function rateLimit(ip) {
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!KV_URL || !KV_TOKEN) return true;
  const key = `ratelimit:md:${ip}`;
  try {
    const incrRes = await fetch(KV_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(["INCR", key]),
    });
    const incrData = await incrRes.json();
    const count = incrData.result;
    if (count === 1) {
      await fetch(KV_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EXPIRE", key, 60]),
      });
    }
    return count <= 120; // 120 attempts/min/IP — plenty for two kids tapping fast
  } catch {
    return true;
  }
}
