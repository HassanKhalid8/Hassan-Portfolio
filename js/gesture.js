/* ============================================================
   OPTICAL NAV — hands-free scrolling
   A webcam + MediaPipe HandLandmarker read one hand and turn it
   into scroll velocity:

     open palm, fingers UP    → scroll up
     open palm, fingers DOWN  → scroll down
     closed fist              → stop

   The tilt of the palm sets the speed, so a lazy tilt crawls and a
   fully vertical palm flies. Nothing leaves the machine — the model
   runs in the page and the video element is never uploaded anywhere.

   The heavy bits (WASM runtime + 8MB model) are fetched lazily on the
   first open so the landing page cost stays exactly zero.
   ============================================================ */

(() => {
  const root = document.getElementById('gesture');
  if (!root) return;

  const fab = document.getElementById('gesture-fab');
  const panel = document.getElementById('gesture-panel');
  const closeBtn = document.getElementById('gesture-close');
  const video = document.getElementById('gesture-video');
  const canvas = document.getElementById('gesture-canvas');
  const hintEl = document.getElementById('gesture-hint');
  const stateEl = document.getElementById('gesture-state');
  const rateEl = document.getElementById('gesture-rate');
  const meterEl = document.getElementById('gesture-meter');
  const legend = document.getElementById('gesture-legend');
  const ctx = canvas.getContext('2d');

  const MP = '0.10.14';
  const MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP}/vision_bundle.mjs`;
  const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP}/wasm`;
  const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  /* 21-point hand skeleton, as pairs of landmark indices */
  const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17],
  ];

  /* --- tuning ------------------------------------------------- */
  const TILT_DEADZONE = 0.22;  // |vertical| below this = palm held sideways, idle
  const MAX_SPEED = 20;        // px per 60fps frame at a fully vertical palm
  const MIN_SPEED = 0.3;       // fraction of MAX_SPEED right at the deadzone edge
  const COMMIT_FRAMES = 3;     // identical reads needed before a gesture takes effect
  const LOST_GRACE = 650;      // ms a hand may vanish before we coast to a stop
  const DETECT_HZ = 30;

  let landmarker = null;       // cached across open/close — reload is instant
  let loading = null;          // in-flight boot promise
  let stream = null;
  let rafId = 0;
  let running = false;
  let session = 0;             // bumped on every open/close — strands stale boots

  let lastVideoTime = -1;      // MediaPipe rejects a repeated frame timestamp
  let lastDetect = 0;
  let lastFrame = 0;
  let lastSeen = 0;

  let raw = 'none';            // this frame's read
  let rawCount = 0;            // how many frames in a row it has held
  let gesture = 'none';        // the committed gesture
  let tilt = 0;                // -1 (straight down) … +1 (straight up)

  let target = 0;              // desired px/frame, signed
  let velocity = 0;
  let carry = 0;               // sub-pixel remainder, so slow scrolls still move
  let edge = 0;                // -1 pinned at the top, +1 at the bottom
  let smoothing = false;       // are we currently overriding CSS smooth-scroll?

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     Readout
     ------------------------------------------------------------ */
  const STATE_TEXT = {
    up: 'SCROLLING ▲',
    down: 'SCROLLING ▼',
    stop: 'HOLD',
    none: 'STANDBY',
  };

  function paintReadout() {
    const pinned = (edge === -1 && gesture === 'up') || (edge === 1 && gesture === 'down');
    stateEl.textContent = pinned
      ? (edge === -1 ? 'TOP OF PAGE' : 'END OF PAGE')
      : STATE_TEXT[gesture] || 'STANDBY';
    stateEl.dataset.g = pinned ? 'edge' : gesture;
    root.dataset.g = gesture;

    legend.querySelectorAll('li').forEach((li) => {
      li.classList.toggle('on', li.dataset.g === gesture);
    });

    const pct = pinned ? 0 : Math.min(100, Math.round((Math.abs(velocity) / MAX_SPEED) * 100));
    meterEl.style.transform = `scaleX(${pct / 100})`;
    rateEl.textContent = pct ? `${pct}%` : '—';
  }

  function setHint(text, kind = '') {
    hintEl.textContent = text || '';
    hintEl.hidden = !text;
    hintEl.dataset.kind = kind;
  }

  /* ------------------------------------------------------------
     Gesture classification
     Distances are measured from the wrist rather than compared on the
     y axis, so the reading survives a hand held upside down.
     ------------------------------------------------------------ */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function extendedFingers(lm) {
    const wrist = lm[0];
    let n = 0;
    for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
      if (dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.18) n++;
    }
    return n;
  }

  function classify(lm) {
    const wrist = lm[0];
    const palm = lm[9];                     // middle-finger knuckle
    const dx = palm.x - wrist.x;
    const dy = palm.y - wrist.y;
    const len = Math.hypot(dx, dy) || 1;
    tilt = -dy / len;                       // image y grows downward, so flip it

    const open = extendedFingers(lm);
    if (open <= 1) return 'stop';
    if (open < 3) return 'none';            // half-open — ambiguous, ignore
    if (tilt > TILT_DEADZONE) return 'up';
    if (tilt < -TILT_DEADZONE) return 'down';
    return 'none';                          // palm sideways — the neutral zone
  }

  /* Palm tilt → speed. Just past the deadzone crawls; vertical flies. */
  function speedFromTilt() {
    const t = (Math.abs(tilt) - TILT_DEADZONE) / (1 - TILT_DEADZONE);
    const eased = MIN_SPEED + Math.min(1, Math.max(0, t)) * (1 - MIN_SPEED);
    return MAX_SPEED * eased;
  }

  function commit(next) {
    if (next === raw) rawCount++;
    else { raw = next; rawCount = 1; }
    if (rawCount < COMMIT_FRAMES) return;

    gesture = next;
    if (next === 'up') target = -speedFromTilt();
    else if (next === 'down') target = speedFromTilt();
    else target = 0;
  }

  /* ------------------------------------------------------------
     Skeleton overlay — mirrored to match the flipped video
     ------------------------------------------------------------ */
  function drawHand(lm) {
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#8b5cf6';
    const px = (p) => [(1 - p.x) * w, p.y * h];

    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (const [a, b] of BONES) {
      const [x1, y1] = px(lm[a]);
      const [x2, y2] = px(lm[b]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    lm.forEach((p, i) => {
      const [x, y] = px(p);
      ctx.beginPath();
      ctx.arc(x, y, i === 0 || i % 4 === 0 ? 3.2 : 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  const clearHand = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* ------------------------------------------------------------
     Scrolling
     The stylesheet sets `scroll-behavior: smooth`, which would turn
     every per-frame nudge into a fight with the browser's own scroll
     animation — so it is suspended for exactly as long as we drive.
     ScrollTrigger pins its own inline value here for the same reason,
     so whatever was there is put back rather than cleared.
     ------------------------------------------------------------ */
  let priorBehavior = null;

  function setSmoothOverride(on) {
    if (on === smoothing) return;
    smoothing = on;
    const html = document.documentElement;
    if (on) {
      priorBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
    } else {
      html.style.scrollBehavior = priorBehavior || '';
      priorBehavior = null;
    }
  }

  function applyScroll(dt) {
    // exponential approach, made frame-rate independent
    velocity += (target - velocity) * (1 - Math.pow(1 - 0.14, dt));
    if (Math.abs(velocity) < 0.06 && target === 0) velocity = 0;

    if (!velocity) { setSmoothOverride(false); carry = 0; edge = 0; return; }

    setSmoothOverride(true);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    carry += velocity * dt;
    const step = Math.trunc(carry);
    carry -= step;
    if (!step) return;

    const next = Math.min(max, Math.max(0, window.scrollY + step));
    if (next === window.scrollY) {
      // pinned against the top or bottom — park until the gesture changes
      edge = step < 0 ? -1 : 1;
      velocity = 0;
      carry = 0;
      return;
    }
    edge = 0;
    window.scrollTo(0, next);
  }

  /* ------------------------------------------------------------
     Main loop
     ------------------------------------------------------------ */
  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    const now = performance.now();
    const dt = lastFrame ? Math.min(4, (now - lastFrame) / 16.667) : 1;
    lastFrame = now;

    if (landmarker && video.readyState >= 2 && now - lastDetect >= 1000 / DETECT_HZ) {
      lastDetect = now;
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        let res = null;
        try {
          res = landmarker.detectForVideo(video, now);
        } catch { /* a dropped frame is not worth killing the loop over */ }

        const hand = res && res.landmarks && res.landmarks[0];
        if (hand) {
          lastSeen = now;
          drawHand(hand);
          commit(classify(hand));
        } else {
          clearHand();
          if (now - lastSeen > LOST_GRACE) { commit('none'); tilt = 0; }
        }
      }
    }

    applyScroll(dt);
    paintReadout();
  }

  /* ------------------------------------------------------------
     Boot / teardown
     ------------------------------------------------------------ */
  async function loadModel() {
    if (landmarker) return landmarker;
    if (loading) return loading;

    loading = (async () => {
      const { FilesetResolver, HandLandmarker } = await import(MODULE_URL);
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, opts('GPU'));
      } catch {
        landmarker = await HandLandmarker.createFromOptions(vision, opts('CPU'));
      }
      return landmarker;
    })();

    try {
      return await loading;
    } catch (err) {
      loading = null; // let the next open retry from scratch
      throw err;
    }
  }

  async function start(mySession) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setHint(
        location.protocol === 'file:'
          ? 'NEEDS A SERVER — run `node server.js`, then open localhost:3000'
          : 'CAMERA UNAVAILABLE — this browser blocks it here',
        'err',
      );
      return;
    }

    root.classList.add('booting');
    setHint('REQUESTING CAMERA …');

    let mine;
    try {
      mine = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });
    } catch (err) {
      if (mySession !== session) return;
      root.classList.remove('booting');
      setHint(
        err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
          ? 'ACCESS DENIED — allow the camera in your browser, then reopen'
          : 'NO CAMERA FOUND',
        'err',
      );
      return;
    }

    // closed (or reopened) while the permission prompt was up — drop this feed
    if (mySession !== session) { mine.getTracks().forEach((t) => t.stop()); return; }

    stream = mine;
    video.srcObject = stream;
    try { await video.play(); } catch { /* autoplay guard — muted+playsinline covers it */ }

    setHint('LOADING HAND MODEL …');
    try {
      await loadModel();
    } catch {
      if (mySession !== session) return;
      root.classList.remove('booting');
      setHint('MODEL FAILED TO LOAD — CHECK CONNECTION', 'err');
      return;
    }

    // the model download is slow enough that the panel may be long gone
    if (mySession !== session) return;

    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;

    root.classList.remove('booting');
    root.classList.add('live');
    setHint('');

    running = true;
    lastFrame = 0;
    lastSeen = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopCamera() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    lastVideoTime = -1;
    clearHand();

    raw = gesture = 'none';
    rawCount = 0;
    tilt = 0;
    target = 0;
    velocity = 0;
    carry = 0;
    edge = 0;
    setSmoothOverride(false);
    root.classList.remove('live', 'booting');
    paintReadout();
  }

  /* ------------------------------------------------------------
     Open / close
     ------------------------------------------------------------ */
  function open() {
    if (root.classList.contains('open')) return;
    root.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    setHint('');
    start(++session);
  }

  function close() {
    if (!root.classList.contains('open')) return;
    session++;
    root.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    stopCamera();
    setHint('');
  }

  fab.addEventListener('click', () => (root.classList.contains('open') ? close() : open()));
  closeBtn.addEventListener('click', close);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) close();
  });

  /* Scrolling away in a hidden tab would be disorienting — park it. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) { target = 0; velocity = 0; carry = 0; setSmoothOverride(false); }
  });

  /* A real wheel/touch scroll means the user took the wheel back. */
  ['wheel', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, () => {
      if (!running || !velocity) return;
      target = 0; velocity = 0; carry = 0;
      gesture = 'none'; raw = 'none'; rawCount = 0;
      setSmoothOverride(false);
    }, { passive: true }),
  );

  window.addEventListener('pagehide', close);

  if (reduced) fab.title = 'Scroll the page with hand gestures';
  paintReadout();
})();
