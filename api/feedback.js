// api/feedback.js — Stores feedback in Redis (ideas + bugs)

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(...args) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  const cors = {
    'Access-Control-Allow-Origin': process.env.VERCEL_ENV === 'production' ? 'https://dadarcade.com' : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, message, name } = req.body || {};

  if (!type || !['idea', 'bug'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "idea" or "bug"' });
  }
  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    return res.status(400).json({ error: 'Message must be at least 3 characters' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message must be under 2000 characters' });
  }

  // Rate limit: 20 per hour per IP
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const rlKey = `ratelimit:feedback:${ip}`;
  try {
    const count = await redis('INCR', rlKey);
    if (count === 1) await redis('EXPIRE', rlKey, 3600);
    if (count > 20) {
      return res.status(429).json({ error: 'Too many submissions. Try again later.' });
    }
  } catch (e) {
    console.error('Rate limit check failed:', e);
  }

  const displayName = name && name.trim() ? name.trim().slice(0, 50) : 'Anonymous';
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: displayName,
    message: message.trim(),
    timestamp: new Date().toISOString(),
    ip,
  };

  try {
    const key = type === 'idea' ? 'feedback:ideas' : 'feedback:bugs';
    await redis('LPUSH', key, JSON.stringify(item));
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Feedback store error:', err);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
}
