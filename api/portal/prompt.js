// api/portal/prompt.js — Compile bugs into Claude Code prompt + archive

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

async function redisPipeline(commands) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  const data = await res.json();
  return data.map(d => d.result);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const valid = await verifyToken(token);
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Get all bugs
    const raw = await redis('LRANGE', 'feedback:bugs', 0, -1);
    if (!raw || raw.length === 0) {
      return res.status(200).json({ prompt: '', count: 0 });
    }

    const bugs = raw.map(s => {
      try { return JSON.parse(s); } catch(e) { return null; }
    }).filter(Boolean);

    // Build prompt
    const today = new Date().toISOString().split('T')[0];
    let prompt = `# Dad Arcade — Bug Fix Batch (generated ${today})\n\n`;
    prompt += `The following ${bugs.length} glitch report${bugs.length > 1 ? 's were' : ' was'} submitted by users. Fix each one.\n\n`;

    bugs.forEach((bug, i) => {
      const date = new Date(bug.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      prompt += `## Bug ${i + 1}: ${bug.name} — ${date}\n`;
      prompt += `${bug.message}\n\n`;
    });

    prompt += `---\n\n## Files that may need changes:\n`;
    prompt += `- space-invaders/index.html\n`;
    prompt += `- math-quest-rpg/index.html\n`;
    prompt += `- index.html\n`;
    prompt += `- api/scores.js\n`;
    prompt += `- api/feedback.js\n`;

    // Move bugs to archive: LPUSH each to archive, then DEL bugs list
    const pipeline = bugs.map(bug => ['LPUSH', 'feedback:bugs:archive', JSON.stringify(bug)]);
    pipeline.push(['DEL', 'feedback:bugs']);
    await redisPipeline(pipeline);

    return res.status(200).json({ prompt, count: bugs.length });
  } catch (err) {
    console.error('Prompt generation error:', err);
    return res.status(500).json({ error: 'Failed to generate prompt' });
  }
}
