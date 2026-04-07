// api/scores.js — Leaderboard API for Space Invaders
// Uses raw fetch() against Upstash REST API — no npm dependencies

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(...args) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function redisPipeline(commands) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  const data = await res.json();
  return data.map(d => d.result);
}

// Encode score for Redis sorted set: higher score first, earlier time first on ties
// Multiplier must be larger than max timestamp offset (~10^13)
const SCORE_MULT = 10000000000000; // 10^13
const TS_MAX = 9999999999999;

function encodeScore(displayScore) {
  return displayScore * SCORE_MULT + (TS_MAX - Date.now());
}

function decodeScore(redisScore) {
  return Math.floor(redisScore / SCORE_MULT);
}

function getCorsHeaders(req) {
  const allowed = ['https://dadarcade.com', 'https://dadarcade.itch.io', 'https://html-classic.itch.zone'];
  const reqOrigin = req.headers.origin || '';
  let origin;
  if (process.env.VERCEL_ENV !== 'production') {
    origin = '*';
  } else if (allowed.some(a => reqOrigin.startsWith(a) || reqOrigin === a)) {
    origin = reqOrigin;
  } else {
    origin = 'https://dadarcade.com';
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const ALLTIME_KEY = 'si_leaderboard:alltime';

export default async function handler(req, res) {
  const cors = getCorsHeaders(req);
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      return await handleGet(req, res);
    }
    if (req.method === 'POST') {
      return await handlePost(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res) {
  const raw = await redis('ZREVRANGE', ALLTIME_KEY, 0, 9, 'WITHSCORES');
  const alltime = parseLeaderboard(raw);
  return res.status(200).json({ alltime });
}

async function handlePost(req, res) {
  const { initials, score } = req.body || {};

  // Validate initials
  if (!initials || typeof initials !== 'string' || !/^[A-Z]{3}$/.test(initials)) {
    return res.status(400).json({ error: 'Initials must be exactly 3 uppercase letters A-Z' });
  }

  // Validate score
  if (!Number.isInteger(score) || score <= 0 || score > 999999) {
    return res.status(400).json({ error: 'Score must be a positive integer up to 999,999' });
  }

  // Rate limit: 10 submissions per minute per IP
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const rlKey = `ratelimit:scores:${ip}`;
  const rlCount = await redis('INCR', rlKey);
  if (rlCount === 1) {
    await redis('EXPIRE', rlKey, 60);
  }
  if (rlCount > 10) {
    return res.status(429).json({ error: 'Too many submissions. Try again in a minute.' });
  }

  // Encode and submit score
  const encoded = encodeScore(score);
  // Use initials + timestamp as unique member to allow same initials multiple times
  const member = `${initials}|${Date.now()}`;

  // Pipeline: ZADD + ZREVRANK + fetch top 10
  const results = await redisPipeline([
    ['ZADD', ALLTIME_KEY, encoded, member],
    ['ZREVRANK', ALLTIME_KEY, member],
    ['ZREVRANGE', ALLTIME_KEY, 0, 9, 'WITHSCORES'],
  ]);

  const rank = results[1]; // 0-indexed
  const displayRank = rank !== null ? rank + 1 : null;
  const alltime = parseLeaderboard(results[2]);

  return res.status(200).json({
    alltimeRank: displayRank <= 10 ? displayRank : null,
    alltime,
  });
}

function parseLeaderboard(raw) {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i];       // "ABC|1712345678901"
    const redisScore = parseFloat(raw[i + 1]);
    const initials = member.split('|')[0];
    const score = decodeScore(redisScore);
    entries.push({ initials, score, rank: entries.length + 1 });
  }
  return entries;
}
