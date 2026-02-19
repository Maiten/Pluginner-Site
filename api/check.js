// GET /api/check
// Checks if the user has a valid session cookie (for page reload persistence)

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookie = parseCookie(req.headers.cookie || '');
  const session = cookie['beta_session'];

  if (session && validateToken(session)) {
    return res.status(200).json({ authenticated: true });
  }

  return res.status(200).json({ authenticated: false });
}

function parseCookie(cookieStr) {
  const cookies = {};
  cookieStr.split(';').forEach(pair => {
    const [key, ...vals] = pair.trim().split('=');
    if (key) cookies[key] = vals.join('=');
  });
  return cookies;
}

function validateToken(token) {
  const crypto = require('crypto');
  const secret = process.env.BETA_PASSWORD + '_session_secret';
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, hash] = parts;
  const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('hex').slice(0, 32);

  if (hash !== expected) return false;

  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 7 * 24 * 60 * 60 * 1000) return false;

  return true;
}
