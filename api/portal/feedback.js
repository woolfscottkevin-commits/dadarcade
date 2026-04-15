// api/portal/feedback.js — Get feedback items + archive ideas (auth required)

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

const keyMap = {
  ideas: 'feedback:ideas',
  bugs: 'feedback:bugs',
  archive: 'feedback:bugs:archive',
  'ideas-archive': 'feedback:ideas:archive',
};

export default async function handler(req, res) {
  const origin = process.env.VERCEL_ENV === 'production' ? 'https://dadarcade.com' : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    // Archive a single idea by timestamp
    const { action, type, timestamp } = req.body || {};
    if (action !== 'archive') return res.status(400).json({ error: 'Invalid action' });
    if (type !== 'ideas') return res.status(400).json({ error: 'Only ideas can be archived' });
    if (!timestamp) return res.status(400).json({ error: 'Missing timestamp' });

    try {
      const raw = await redis('LRANGE', 'feedback:ideas', 0, -1);
      let target = null;
      for (const s of raw || []) {
        try {
          const item = JSON.parse(s);
          if (item.timestamp === timestamp) { target = s; break; }
        } catch(e) {}
      }
      if (!target) return res.status(404).json({ error: 'Idea not found' });

      await redis('LREM', 'feedback:ideas', 1, target);
      await redis('LPUSH', 'feedback:ideas:archive', target);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Portal archive error:', err);
      return res.status(500).json({ error: 'Failed to archive idea' });
    }
  }

  const type = req.query.type || 'bugs';
  const key = keyMap[type];
  if (!key) return res.status(400).json({ error: 'Invalid type' });

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
