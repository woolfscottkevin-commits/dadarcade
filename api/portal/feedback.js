// api/portal/feedback.js — Get feedback items (auth required)

import { verifyToken } from './login.js';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });

  const type = req.query.type || 'bugs';
  const keyMap = {
    ideas: 'feedback:ideas',
    bugs: 'feedback:bugs',
    archive: 'feedback:bugs:archive',
  };
  const key = keyMap[type];
  if (!key) return res.status(400).json({ error: 'Type must be ideas, bugs, or archive' });

  try {
    const raw = await redis('LRANGE', key, 0, 199); // last 200 items
    const items = (raw || []).map(s => {
      try { return JSON.parse(s); } catch(e) { return null; }
    }).filter(Boolean);
    return res.status(200).json({ items });
  } catch (err) {
    console.error('Portal feedback error:', err);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}
