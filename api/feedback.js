// api/feedback.js — Sends feedback emails via Resend (no npm dependencies)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = 'woolf.scott.kevin@gmail.com';

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

  // Validate type
  if (!type || !['idea', 'bug'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "idea" or "bug"' });
  }

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    return res.status(400).json({ error: 'Message must be at least 3 characters' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message must be under 2000 characters' });
  }

  // Rate limit: 5 per hour per IP
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const rlKey = `ratelimit:feedback:${ip}`;

  // Simple rate limit via Upstash
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  if (KV_URL && KV_TOKEN) {
    try {
      const rlRes = await fetch(KV_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['INCR', rlKey]),
      });
      const rlData = await rlRes.json();
      const count = rlData.result;
      if (count === 1) {
        await fetch(KV_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(['EXPIRE', rlKey, 3600]),
        });
      }
      if (count > 5) {
        return res.status(429).json({ error: 'Too many submissions. Try again later.' });
      }
    } catch (e) {
      console.error('Rate limit check failed:', e);
      // Continue anyway — don't block feedback if Redis is down
    }
  }

  const isIdea = type === 'idea';
  const emoji = isIdea ? '💡' : '🐛';
  const label = isIdea ? 'Game Idea' : 'Bug Report';
  const displayName = name && name.trim() ? name.trim() : 'Anonymous';

  const subject = `${emoji} Dad Arcade ${label} from ${displayName}`;

  const html = `
    <div style="font-family:monospace;background:#111;color:#fff;padding:2rem;border-radius:12px;max-width:600px">
      <h1 style="color:${isIdea ? '#f0c420' : '#ff4444'};font-size:1.5rem;margin-bottom:1rem">
        ${emoji} New ${label}
      </h1>
      <p style="color:#aaa;font-size:0.9rem;margin-bottom:0.5rem">From: <strong style="color:#fff">${escapeHtml(displayName)}</strong></p>
      <div style="background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:1.5rem;margin-top:1rem">
        <p style="color:#fff;font-size:1rem;line-height:1.6;white-space:pre-wrap">${escapeHtml(message.trim())}</p>
      </div>
      <p style="color:#444;font-size:0.8rem;margin-top:1.5rem">Sent from dadarcade.com</p>
    </div>
  `;

  try {
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dad Arcade <onboarding@resend.dev>',
        to: [TO_EMAIL],
        subject,
        html,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send feedback' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Feedback send error:', err);
    return res.status(500).json({ error: 'Failed to send feedback' });
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
