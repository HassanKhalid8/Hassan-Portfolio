/* ============================================================
   AI COPILOT VOICE — /api/speak
   Vercel serverless function (also mounted locally by server.js).
   Turns a chat reply into speech in Hassan's cloned voice.
   Two providers, picked by whichever env vars are set:
     · Cartesia   — CARTESIA_API_KEY + CARTESIA_VOICE_ID (free clone + 20k chars/mo)
     · ElevenLabs — ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID (Starter plan needed to clone)
   With neither configured — or once the monthly quota runs out —
   GET reports { voice:false } and the front-end hides the speaker.
   ============================================================ */

const MAX_TEXT = 600;

/* --- tiny in-memory rate limit: 10 requests / minute / IP --- */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear(); // crude memory guard
  return list.length > 10;
}

/* --- audio cache: repeated questions (chips) cost zero credits --- */
const cache = new Map(); // text → Buffer
function cachePut(key, buf) {
  if (cache.size >= 40) cache.delete(cache.keys().next().value);
  cache.set(key, buf);
}

/* URLs sound terrible read aloud — the text on screen has them anyway */
const speakable = (s) =>
  s.replace(/https?:\/\/[^\s]+/g, '(link on screen)').replace(/\s+/g, ' ').trim();

/* Quota-exhausted flag — set when a provider says "no more credits",
   retried after 6h in case the month rolled over or the plan changed. */
let quotaBlockedUntil = 0;
const quotaError = () => {
  quotaBlockedUntil = Date.now() + 6 * 3_600_000;
  const err = new Error('quota_exceeded');
  err.quota = true;
  return err;
};

/* ---------------- Cartesia (preferred: free cloning) ---------------- */
async function askCartesia(text) {
  const r = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CARTESIA_API_KEY,
      'Cartesia-Version': '2025-04-16',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: process.env.CARTESIA_MODEL || 'sonic-2',
      transcript: text,
      voice: { mode: 'id', id: process.env.CARTESIA_VOICE_ID },
      output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
    }),
  });
  if (!r.ok) {
    if (r.status === 402 || r.status === 429) throw quotaError();
    throw new Error(`Cartesia ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

/* ---------------- ElevenLabs ---------------- */
async function askElevenLabs(text) {
  const model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'; // 0.5 credits/char
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_id: model }),
    }
  );
  if (!r.ok) {
    let status = '';
    try { status = (await r.json()).detail?.status || ''; } catch { /* non-JSON error body */ }
    if (status === 'quota_exceeded' || r.status === 402) throw quotaError();
    throw new Error(`ElevenLabs ${r.status}: ${status}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

function provider() {
  if (process.env.CARTESIA_API_KEY && process.env.CARTESIA_VOICE_ID) return askCartesia;
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) return askElevenLabs;
  return null;
}

module.exports = async (req, res) => {
  /* GET — availability probe: should the speaker button exist? */
  if (req.method === 'GET') {
    return res.status(200).json({ voice: Boolean(provider()) && Date.now() > quotaBlockedUntil });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'GET or POST only' });
  }
  const tts = provider();
  if (!tts || Date.now() < quotaBlockedUntil) {
    return res.status(402).json({ error: 'Voice synth offline.', voice: false });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .toString().split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Voice channel jammed — too many requests.' });
  }

  const text = speakable(String((req.body || {}).text || '')).slice(0, MAX_TEXT);
  if (!text) return res.status(400).json({ error: 'Nothing to say.' });

  try {
    let audio = cache.get(text);
    if (!audio) {
      audio = await tts(text);
      cachePut(text, audio);
    }
    res.status(200);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(audio);
  } catch (err) {
    if (err.quota) {
      return res.status(402).json({ error: 'Voice quota depleted for this month.', voice: false });
    }
    console.error('[api/speak]', err.message);
    return res.status(502).json({ error: 'Voice synth relay failed.' });
  }
};
