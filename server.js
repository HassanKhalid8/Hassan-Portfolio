/* ============================================================
   LOCAL DEV SERVER — mirrors what Vercel does in production:
   serves the static site and mounts api/chat.js at /api/chat.
   Zero dependencies. Run:  node server.js  →  http://localhost:3000
   Reads GEMINI_API_KEY from a .env file in this folder (optional —
   without it the chat runs in offline/local-cache mode).
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || process.argv[2] || 3000;

/* --- minimal .env loader (KEY=VALUE lines) --- */
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const API = {
  '/api/chat': require('./api/chat'),
  '/api/speak': require('./api/speak'),
};

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};

/* Vercel-style helpers so api/chat.js runs unchanged locally */
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const apiHandler = API[url.pathname];
  if (apiHandler) {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 50_000) req.destroy(); });
    req.on('end', async () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
      try { await apiHandler(req, decorate(res)); }
      catch (err) {
        console.error('[server]', err);
        decorate(res).status(500).json({ error: 'Internal error' });
      }
    });
    return;
  }

  /* --- static files --- */
  let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end('Forbidden'); }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache'); // dev server — always revalidate
    res.end(data);
  });
});

server.listen(PORT, () => {
  const mode = process.env.GEMINI_API_KEY ? `GEMINI (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})` : 'OFFLINE (no GEMINI_API_KEY — local cache answers)';
  const voice = process.env.CARTESIA_API_KEY && process.env.CARTESIA_VOICE_ID ? 'CARTESIA (cloned voice)'
    : process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID ? 'ELEVENLABS (cloned voice)'
    : 'OFF (no CARTESIA_/ELEVENLABS_ keys — speaker hidden)';
  console.log(`▲ Portfolio dev server → http://localhost:${PORT}`);
  console.log(`  AI copilot mode: ${mode}`);
  console.log(`  Voice synth: ${voice}`);
});
