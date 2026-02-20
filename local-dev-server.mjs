import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// TODO: Remove this local test server before shipping/deploying.

const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();
const PASSWORD = process.env.BETA_PASSWORD;
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

if (!PASSWORD) {
  console.error('Missing BETA_PASSWORD. Start with: BETA_PASSWORD=<your-password> node local-dev-server.mjs');
  process.exit(1);
}

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(body));
}

function parseCookies(raw = '') {
  const cookies = {};
  raw.split(';').forEach((part) => {
    const [key, ...vals] = part.trim().split('=');
    if (key) cookies[key] = vals.join('=');
  });
  return cookies;
}

function generateToken() {
  const timestamp = Date.now().toString();
  const secret = `${PASSWORD}_session_secret`;
  const hash = crypto.createHmac('sha256', secret).update(timestamp).digest('hex').slice(0, 32);
  return `${timestamp}.${hash}`;
}

function validateToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, hash] = parts;
  const secret = `${PASSWORD}_session_secret`;
  const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('hex').slice(0, 32);
  if (hash !== expected) return false;

  const age = Date.now() - Number.parseInt(timestamp, 10);
  if (!Number.isFinite(age) || age > SESSION_MAX_AGE_SECONDS * 1000) return false;
  return true;
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.sql')) return 'text/plain; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let reqPath = decodeURIComponent(url.pathname);
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(ROOT, safePath);
  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(fullPath);
    res.writeHead(200, { 'Content-Type': contentType(fullPath) });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/check') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const cookies = parseCookies(req.headers.cookie || '');
    return json(res, 200, { authenticated: validateToken(cookies.beta_session) });
  }

  if (url.pathname === '/api/verify') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    let payload = {};
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { error: 'Invalid JSON body' });
    }

    if (payload.password !== PASSWORD) return json(res, 401, { error: 'Wrong password' });

    const token = generateToken();
    return json(
      res,
      200,
      { ok: true },
      { 'Set-Cookie': `beta_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}` }
    );
  }

  if (url.pathname === '/api/download') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const cookies = parseCookies(req.headers.cookie || '');
    if (!validateToken(cookies.beta_session)) {
      return json(res, 401, { error: 'Not authenticated. Please enter the access code first.' });
    }
    return json(res, 200, { url: `http://127.0.0.1:${PORT}/` });
  }

  return serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local beta server running at http://127.0.0.1:${PORT}`);
});
