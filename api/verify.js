// POST /api/verify
// Checks password server-side, sets secure session cookie
// Environment variable: BETA_PASSWORD (set in Vercel dashboard)

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const correctPassword = process.env.BETA_PASSWORD;

  if (!correctPassword) {
    console.error('BETA_PASSWORD environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (password === correctPassword) {
    // Set HTTP-only cookie — can't be read or faked by client JS
    // Expires in 7 days
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    res.setHeader('Set-Cookie', [
      `beta_session=${generateToken()};Path=/;HttpOnly;Secure;SameSite=Strict;Expires=${expires}`
    ]);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Wrong password' });
}

function generateToken() {
  // Simple HMAC-like token: timestamp + hash
  // In production you'd use JWT, but for a beta with one password this is fine
  const crypto = require('crypto');
  const secret = process.env.BETA_PASSWORD + '_session_secret';
  const timestamp = Date.now().toString();
  const hash = crypto.createHmac('sha256', secret).update(timestamp).digest('hex').slice(0, 32);
  return `${timestamp}.${hash}`;
}
