// GET /api/download
// Verifies session cookie, then returns a signed download URL from Supabase Storage
// Environment variables:
//   BETA_PASSWORD (for session validation)
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY (service role key — NOT the anon key)
//   DOWNLOAD_FILENAME (e.g. "PluginnerFX-beta.zip")

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check session cookie
  const cookie = parseCookie(req.headers.cookie || '');
  const session = cookie['beta_session'];

  if (!session || !validateToken(session)) {
    return res.status(401).json({ error: 'Not authenticated. Please enter the access code first.' });
  }

  // Generate signed URL from Supabase Storage
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const filename = process.env.DOWNLOAD_FILENAME || 'PluginnerFX-beta.zip';
  const bucket = 'beta-downloads';

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Create a signed URL valid for 10 minutes
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${bucket}/${filename}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: 600 }) // 10 minutes
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase Storage error:', err);
      return res.status(500).json({ error: 'Failed to generate download link' });
    }

    const data = await response.json();
    const signedUrl = `${supabaseUrl}/storage/v1${data.signedURL}`;

    return res.status(200).json({ url: signedUrl });
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ error: 'Failed to generate download link' });
  }
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

  // Check token age — valid for 7 days
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 7 * 24 * 60 * 60 * 1000) return false;

  return true;
}
