/* ============================================================
   AI COPILOT — UPLINK-02
   Front-end for the floating comms console. All intelligence
   lives server-side in api/chat.js; this file only renders the
   conversation with the site's mission-control theatrics.
   ============================================================ */

(() => {
  const root = document.getElementById('copilot');
  if (!root) return;

  const fab = document.getElementById('copilot-fab');
  const panel = document.getElementById('copilot-panel');
  const log = document.getElementById('copilot-log');
  const chips = document.getElementById('copilot-chips');
  const form = document.getElementById('copilot-form');
  const input = document.getElementById('copilot-input');
  const dotClose = document.getElementById('copilot-dot-close');
  const dotMin = document.getElementById('copilot-dot-min');
  const dotMax = document.getElementById('copilot-dot-max');
  const voiceTag = document.getElementById('copilot-voicetag');
  const statusEl = document.getElementById('copilot-status');
  const linkEl = document.getElementById('copilot-link');
  const msEl = document.getElementById('copilot-ms');
  const voiceBtn = document.getElementById('copilot-voice');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const history = [];       // {role:'user'|'model', text} — sent for context
  let booted = false;
  let busy = false;

  /* --- voice synth (Hassan's cloned voice via /api/speak) ------ */
  let voiceReady = false;                                     // server has key + quota
  let voiceOn = localStorage.getItem('uplink-voice') !== 'off';
  let voiceProbe = null;                                      // Promise — resolved on first open
  let playing = null;                                         // current Audio element
  let playingKey = null;                                      // text of what's playing
  const audioCache = new Map();                               // reply text → object URL

  const SAY_SVG = '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>';

  function syncVoiceBtn() {
    voiceBtn.hidden = !voiceReady;
    voiceTag.hidden = !voiceReady;
    root.classList.toggle('voiced', voiceReady); // reveals the per-message speakers
    voiceBtn.setAttribute('aria-pressed', String(voiceOn));
    voiceBtn.classList.toggle('muted', !voiceOn);
  }

  function stopSpeaking() {
    if (playing) { playing.pause(); playing = null; playingKey = null; }
    log.querySelectorAll('.cw-say.on').forEach((b) => b.classList.remove('on'));
  }

  /* Quota depleted (or key removed): the speaker sign simply vanishes. */
  function killVoice() {
    voiceReady = false;
    stopSpeaking();
    syncVoiceBtn();
  }

  function probeVoice() {
    if (!voiceProbe) {
      voiceProbe = fetch('/api/speak')
        .then((r) => r.json())
        .then((d) => { voiceReady = !!d.voice; syncVoiceBtn(); return voiceReady; })
        .catch(() => false);
    }
    return voiceProbe;
  }

  async function speak(text, opts = {}) {
    if (!voiceReady) return;
    if (!opts.force && !voiceOn) return; // header mute only affects auto-speak
    stopSpeaking();
    try {
      let url = audioCache.get(text);
      if (!url) {
        const r = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          if (data.voice === false) killVoice(); // out of credits — hide the speakers
          return;
        }
        url = URL.createObjectURL(await r.blob());
        audioCache.set(text, url);
      }
      if (!opts.force && !voiceOn) return; // muted while the audio was being fetched
      playing = new Audio(url);
      playingKey = text;
      if (opts.btn) {
        opts.btn.classList.add('on');
        playing.addEventListener('ended', () => opts.btn.classList.remove('on'));
      }
      playing.play().catch(() => {}); // autoplay blocked — text still shows
    } catch { /* voice is a garnish — never break the chat over it */ }
  }

  /* per-message speaker: play that reply; click again to stop */
  function speakToggle(text, btn) {
    if (playingKey === text) { stopSpeaking(); return; }
    speak(text, { force: true, btn });
  }

  voiceBtn.addEventListener('click', () => {
    voiceOn = !voiceOn;
    localStorage.setItem('uplink-voice', voiceOn ? 'on' : 'off');
    if (!voiceOn) stopSpeaking();
    syncVoiceBtn();
  });

  /* --- helpers ------------------------------------------------ */
  const missionTime = () => {
    const s = Math.floor((performance.now() - t0) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `T+${mm}:${ss}`;
  };

  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const linkify = (s) =>
    escapeHtml(s).replace(/https?:\/\/[^\s<>"')]+/g,
      (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);

  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function addMsg(who, text, cls = '') {
    const el = document.createElement('div');
    el.className = `cw-msg ${who} ${cls}`.trim();
    const label = who === 'you' ? `${missionTime()} · YOU` : `${missionTime()} · <b>HASSAN</b>`;
    el.innerHTML = `<span class="cw-meta">${label}</span><span class="cw-text"></span>`;
    log.appendChild(el);
    const textEl = el.querySelector('.cw-text');

    /* AI replies get a speaker — tap to hear it in Hassan's voice */
    if (who === 'ai' && !cls) {
      const say = document.createElement('button');
      say.type = 'button';
      say.className = 'cw-say hoverable';
      say.title = "Hear this in Hassan's voice";
      say.setAttribute('aria-label', "Play this reply in Hassan's voice");
      say.innerHTML = SAY_SVG;
      say.addEventListener('click', () => speakToggle(text, say));
      el.querySelector('.cw-meta').appendChild(say);
    }

    if (who === 'you' || cls || reduced) {
      textEl.innerHTML = linkify(text);
      scrollDown();
      return Promise.resolve();
    }

    /* AI replies decode character by character */
    return new Promise((resolve) => {
      const caret = document.createElement('span');
      caret.className = 'cw-caret';
      el.appendChild(caret);
      let i = 0;
      (function tick() {
        i = Math.min(text.length, i + 2);
        textEl.textContent = text.slice(0, i);
        scrollDown();
        if (i < text.length) return setTimeout(tick, 14);
        caret.remove();
        textEl.innerHTML = linkify(text);
        resolve();
      })();
    });
  }

  function bootLine(text, delay) {
    return new Promise((resolve) => setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'cw-msg boot';
      el.innerHTML = `<span class="cw-text">${escapeHtml(text)}</span>`;
      log.appendChild(el);
      scrollDown();
      resolve();
    }, reduced ? 0 : delay));
  }

  async function bootSequence() {
    booted = true;
    probeVoice(); // kick off in parallel with the boot theatrics
    await bootLine('ESTABLISHING UPLINK-02 …', 250);
    await bootLine('HANDSHAKE ▸ OK', 500);
    await bootLine('KNOWLEDGE CORE ▸ MOUNTED', 450);
    const hasVoice = await Promise.race([voiceProbe, new Promise((r) => setTimeout(() => r(false), 900))]);
    if (hasVoice) await bootLine("VOICE SYNTH ▸ HASSAN'S CLONED VOICE LOADED", 300);
    if (location.protocol === 'file:') {
      await bootLine('⚠ NO RELAY — run `node server.js` and open localhost:3000', 400);
    }
    await new Promise((r) => setTimeout(r, reduced ? 0 : 350));
    addMsg('ai', hasVoice
      ? "Hassan here — or rather, my digital double, speaking in my real voice (I cloned it myself). Tap the speaker on any reply to hear me. Ask about my projects, skills, experience or films."
      : "Hassan here — or rather, my digital double, wired to this site only. Ask me about my projects, skills, experience or films.");
  }

  /* --- open / close ------------------------------------------- */
  function open() {
    root.classList.add('open');
    panel.classList.remove('min'); // always reopen un-minimized
    fab.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    if (!booted) bootSequence();
    setTimeout(() => input.focus(), reduced ? 0 : 450);
  }
  function close() {
    root.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  fab.addEventListener('click', open);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) close();
  });

  /* mac traffic lights: red closes, yellow minimizes, green enlarges */
  dotClose.addEventListener('click', close);
  dotMin.addEventListener('click', () => panel.classList.toggle('min'));
  dotMax.addEventListener('click', () => {
    panel.classList.remove('min');
    panel.classList.toggle('big');
  });

  /* tap anywhere outside the console → close it */
  document.addEventListener('pointerdown', (e) => {
    if (root.classList.contains('open') && !root.contains(e.target)) close();
  });

  /* --- transmit ----------------------------------------------- */
  async function send(message) {
    if (busy || !message) return;
    busy = true;
    input.value = '';
    input.disabled = true;
    chips.classList.add('gone');
    root.classList.add('thinking');
    statusEl.querySelector('b').textContent = 'DECODING';

    addMsg('you', message);
    const started = performance.now();

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const data = await r.json().catch(() => ({}));
      const ms = Math.round(performance.now() - started);

      if (!r.ok || !data.reply) throw new Error(data.error || `Relay error ${r.status}`);

      linkEl.textContent = data.mode === 'gemini' ? 'LINK — GEMINI' : 'LINK — LOCAL CACHE';
      msEl.textContent = `${ms}MS`;
      history.push({ role: 'user', text: message }, { role: 'model', text: data.reply });
      if (history.length > 16) history.splice(0, history.length - 16);

      root.classList.remove('thinking');
      statusEl.querySelector('b').textContent = 'ONLINE';
      speak(data.reply); // voice starts alongside the decode animation
      await addMsg('ai', data.reply);
    } catch (err) {
      root.classList.remove('thinking');
      statusEl.querySelector('b').textContent = 'ONLINE';
      const note = location.protocol === 'file:'
        ? 'SIGNAL LOST — the relay only works through the dev server. Run `node server.js`, then open http://localhost:3000.'
        : `SIGNAL LOST — ${err.message}`;
      addMsg('ai', note, 'err');
    } finally {
      busy = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value.trim());
  });
  /* explicit Enter handling — some browsers/drivers skip implicit form submission */
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send(input.value.trim());
    }
  });

  chips.querySelectorAll('.cw-chip').forEach((chip) => {
    chip.addEventListener('click', () => send(chip.dataset.q));
  });
})();
