// api/portal/login.js — Authenticate portal admin

const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const PORTAL_EMAIL = process.env.PORTAL_EMAIL;
const PORTAL_PASSWORD_HASH = process.env.PORTAL_PASSWORD_HASH;

async function sha256(str) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(payload) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(KV_TOKEN),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify(payload)));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(JSON.stringify(payload)) + '.' + sigHex;
}

export async function verifyToken(token) {
  if (!token) return false;
  try {
    const [payloadB64, sigHex] = token.split('.');
    if (!payloadB64 || !sigHex) return false;
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.email || !payload.exp) return false;
    if (Date.now() > payload.exp) return false;
    // Verify HMAC
    const key = await globalThis.crypto.subtle.importKey(
      'raw', new TextEncoder().encode(KV_TOKEN),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify(payload)));
    const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return sigHex === expectedHex;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  const origin = process.env.VERCEL_ENV === 'production' ? 'https://dadarcade.com' : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const passwordHash = await sha256(password);

  if (email !== PORTAL_EMAIL || passwordHash !== PORTAL_PASSWORD_HASH) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = { email, exp: Date.now() + 24 * 60 * 60 * 1000 }; // 24h
  const token = await hmacSign(payload);

  return res.status(200).json({ token });
}
