/* ============================================================
   3D PORTFOLIO — MAIN
   Concept: scrolling flies the camera through a tunnel of stars.
   Each section is a "zone" with its own color + 3D sculpture.
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ---------------- Zone config ---------------- */
const ZONES = [
  { id: 'hero',           label: '// 001 — LAUNCH',         color: '#8b5cf6' },
  { id: 'about',          label: '// 002 — ABOUT',          color: '#22d3ee' },
  { id: 'skills',         label: '// 003 — SKILLS',         color: '#a3e635' },
  { id: 'projects',       label: '// 004 — WEB PROJECTS',   color: '#ec4899' },
  { id: 'lab',            label: '// 005 — ENGINEERING LAB', color: '#eab308' },
  { id: 'experience',     label: '// 006 — EXPERIENCE',     color: '#f43f5e' },
  { id: 'certifications', label: '// 007 — CERTIFICATIONS', color: '#2dd4bf' },
  { id: 'education',      label: '// 008 — EDUCATION',      color: '#f59e0b' },
  { id: 'shortfilms',     label: '// 009 — SHORT FILMS',    color: '#f97316' },
  { id: 'interests',      label: '// 010 — INTERESTS',      color: '#60a5fa' },
  { id: 'contact',        label: '// 011 — CONTACT',        color: '#a78bfa' },
];
const SEG = 90;                                  // depth of each zone
const TOTAL_DEPTH = SEG * (ZONES.length - 1) + 50;

/* ================= THREE.JS SCENE ================= */
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05010f');
scene.fog = new THREE.FogExp2('#05010f', 0.014);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 0, 12);

/* ---------- Starfield ---------- */
function makeStars(count, size, spread, colorHex) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
    pos[i * 3 + 2] = 20 - Math.random() * (TOTAL_DEPTH + 120);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: colorHex, size, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
scene.add(makeStars(2600, 0.35, 130, 0xffffff));
const tintedDust = makeStars(900, 0.7, 90, 0x8b5cf6);   // color updated per zone
scene.add(tintedDust);

/* ---------- Zone sculptures (wireframe shapes along the path) ---------- */
const zoneGeometries = [
  new THREE.TorusKnotGeometry(6, 1.8, 130, 18),      // hero — knot
  new THREE.IcosahedronGeometry(7, 1),               // about — icosphere
  new THREE.TorusGeometry(6, 2.2, 16, 60),           // skills — torus
  new THREE.DodecahedronGeometry(7, 0),              // web projects — dodecahedron
  new THREE.TetrahedronGeometry(8, 0),               // engineering lab — tetrahedron
  new THREE.BoxGeometry(7, 7, 7, 2, 2, 2),           // experience — cube
  new THREE.ConeGeometry(6.5, 10, 4, 2),             // certifications — pyramid
  new THREE.OctahedronGeometry(7.5, 0),              // education — octahedron
  new THREE.CylinderGeometry(6, 6, 1.6, 28, 2),      // short films — film reel
  new THREE.SphereGeometry(6.5, 18, 14),             // interests — sphere
  new THREE.TorusKnotGeometry(5, 1.6, 90, 14, 2, 3), // contact — knot variant
];

const sculptures = [];
ZONES.forEach((zone, i) => {
  const group = new THREE.Group();
  const color = new THREE.Color(zone.color);

  const mesh = new THREE.Mesh(
    zoneGeometries[i],
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.45 })
  );
  group.add(mesh);

  // small glowing satellites orbiting the sculpture
  const sats = new THREE.Group();
  for (let s = 0; s < 5; s++) {
    const sat = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    const angle = (s / 5) * Math.PI * 2;
    sat.position.set(Math.cos(angle) * 11, Math.sin(angle * 2) * 3, Math.sin(angle) * 11);
    sats.add(sat);
  }
  group.add(sats);

  // alternate sides so the camera weaves past them
  group.position.set(i % 2 === 0 ? 15 : -15, (Math.random() - 0.5) * 6, -i * SEG - 28);
  scene.add(group);
  sculptures.push({ group, mesh, sats, speed: 0.15 + Math.random() * 0.2 });
});

/* ---------- Zone anchors ----------
   Sections have different heights, so deriving the current zone from the raw
   scroll fraction drifts (a tall section "runs out" of its color early).
   Measure the real section tops and re-park each sculpture at the camera-path
   depth where its section's middle actually crosses the viewport center. */
let zoneTops = [];
function measureZones() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  zoneTops = ZONES.map((z) => document.getElementById(z.id).offsetTop);
  ZONES.forEach((z, i) => {
    const el = document.getElementById(z.id);
    const centerScroll = Math.min(maxScroll, Math.max(0, el.offsetTop + el.offsetHeight / 2 - innerHeight / 2));
    sculptures[i].group.position.z = 12 - (centerScroll / maxScroll) * TOTAL_DEPTH - 30;
  });
}
measureZones();
window.addEventListener('load', measureZones);
window.addEventListener('resize', measureZones);

/* ================= SCROLL → CAMERA JOURNEY ================= */
const camState = { z: 12 };
gsap.to(camState, {
  z: 12 - TOTAL_DEPTH,
  ease: 'none',
  scrollTrigger: { trigger: '#content', start: 'top top', end: 'bottom bottom', scrub: 1.2 },
});

/* Progress bar */
gsap.to('#progress-bar', {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: { trigger: '#content', start: 'top top', end: 'bottom bottom', scrub: 0.3 },
});

/* ---------- Zone color transitions (fog, dust, CSS accent) ---------- */
const zoneLabel = document.getElementById('zone-label');
const fogColor = new THREE.Color('#05010f');
const accentColor = new THREE.Color(ZONES[0].color);
let currentZone = -1;

function updateZoneColors() {
  if (!zoneTops.length) return;
  // Each section boundary contributes 0→1 as it crosses the viewport center,
  // so a section keeps its exact color while it fills the screen and colors
  // blend only during the actual hand-off between two sections.
  const refY = window.scrollY + innerHeight / 2;
  let f = 0;
  for (let z = 1; z < ZONES.length; z++) {
    f += Math.min(1, Math.max(0, (refY - zoneTops[z] + innerHeight * 0.5) / innerHeight));
  }
  const i = Math.min(Math.floor(f), ZONES.length - 2);
  const t = f - i;

  const cA = new THREE.Color(ZONES[i].color);
  const cB = new THREE.Color(ZONES[i + 1].color);
  accentColor.copy(cA).lerp(cB, t);

  // deep-space background tinted by the zone color
  fogColor.copy(accentColor).multiplyScalar(0.07);
  scene.background.copy(fogColor);
  scene.fog.color.copy(fogColor);
  tintedDust.material.color.copy(accentColor);

  // drive the CSS theme from the 3D world
  document.documentElement.style.setProperty('--accent', '#' + accentColor.getHexString());

  const nearest = Math.round(f);
  if (nearest !== currentZone) {
    currentZone = nearest;
    zoneLabel.textContent = ZONES[nearest].label;
    document.querySelectorAll('#dots-nav .dot').forEach((d, di) =>
      d.classList.toggle('active', di === nearest));
    headerNavLinks.forEach((l) =>
      l.classList.toggle('nav-active', NAV_ZONE_HREF[nearest] === l.getAttribute('href')));
  }
}

/* ---------- Mouse parallax ---------- */
const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});

/* ---------- Hero photo state: intro fade-in, then vanish as you scroll out of the hero ----------
   Driven directly off window.scrollY every frame (inside animate() below) rather than
   ScrollTrigger's element-position math, which drifts when a large image or web font
   loads after the trigger's initial measurement and shifts section heights. */
const heroPhotoEl = document.getElementById('hero-photo');
const heroSectionEl = document.getElementById('hero');
let heroPhotoIntroStart = null; // set by the launch sequence at ignition
function igniteHeroPhoto() { heroPhotoIntroStart = performance.now(); }

function updateHeroPhoto() {
  if (!heroPhotoEl) return;

  let introP = 0;
  if (heroPhotoIntroStart !== null) introP = Math.min(1, (performance.now() - heroPhotoIntroStart) / 1000);
  const introEase = 1 - Math.pow(1 - introP, 3);

  const heroH = heroSectionEl.offsetHeight || innerHeight;
  const scrollP = Math.min(1, Math.max(0, window.scrollY / (heroH * 0.8)));

  const opacity = introEase * (1 - scrollP);
  const translateY = (1 - introEase) * 50 - scrollP * 160;
  const scale = (0.9 + introEase * 0.1) * (1 - scrollP * 0.3);
  const rotate = -scrollP * 8;

  heroPhotoEl.style.opacity = opacity;
  heroPhotoEl.style.transform = `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`;
  heroPhotoEl.style.filter = scrollP > 0.01 ? `blur(${scrollP * 6}px)` : 'none';
  heroPhotoEl.style.pointerEvents = scrollP > 0.5 ? 'none' : 'auto';
}

/* ---------- Header nav: hidden while the loader / launch countdown play,
   then dropped in letter-by-letter and kept on screen for the whole ride.
   Hovering a link scrambles it like a signal decoding; the link whose
   section is on screen stays lit (see updateZoneColors). ---------- */
const headerNavEl = document.getElementById('header-nav');
const headerNavLinks = headerNavEl ? Array.from(headerNavEl.querySelectorAll('a')) : [];
/* zone index → nav link (zones without a header link light nothing) */
const NAV_ZONE_HREF = { 1: '#about', 2: '#skills', 3: '#projects', 10: '#contact' };

function showHeaderNav() {
  if (!headerNavEl || headerNavEl.classList.contains('nav-visible')) return;
  headerNavEl.classList.add('nav-visible');
  gsap.fromTo(headerNavLinks,
    { y: -22, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.2)', stagger: 0.09, clearProps: 'all' });
}

/* hover: quick transmission-decode scramble (leaves opacity to the CSS) */
headerNavLinks.forEach((link) => {
  const label = link.textContent;
  let busy = false;
  link.addEventListener('mouseenter', () => {
    if (busy || prefersReducedMotion) return;
    busy = true;
    const charset = '!<>-_\\/[]{}—=+*^?#';
    const start = performance.now();
    (function frame() {
      const p = Math.min(1, (performance.now() - start) / 320);
      const solved = Math.floor(p * label.length);
      let out = '';
      for (let i = 0; i < label.length; i++) {
        out += i < solved || label[i] === ' ' ? label[i] : charset[(Math.random() * charset.length) | 0];
      }
      link.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else { link.textContent = label; busy = false; }
    })();
  });
});

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  camera.position.z = camState.z;
  camera.position.x += (mouse.x * 2.5 - camera.position.x) * 0.04;
  camera.position.y += (-mouse.y * 1.5 - camera.position.y) * 0.04;
  camera.lookAt(camera.position.x * 0.4, camera.position.y * 0.4, camera.position.z - 40);

  sculptures.forEach((s, i) => {
    s.mesh.rotation.x = t * s.speed;
    s.mesh.rotation.y = t * s.speed * 1.4;
    s.sats.rotation.y = t * 0.5;
    s.group.position.y += Math.sin(t * 0.6 + i) * 0.004; // gentle float
  });

  updateZoneColors();
  updateHeroPhoto();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================= CONTENT TRANSITIONS ================= */

/* Reveal: every .reveal slides + fades in when its section arrives.
   The hero is excluded — it runs its own cinematic launch timeline. */
document.querySelectorAll('.section').forEach((section) => {
  if (section.id === 'hero') return;
  const items = section.querySelectorAll('.reveal');
  gsap.fromTo(items,
    { y: 70, opacity: 0 },
    {
      y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 65%', toggleActions: 'play none none reverse' },
    });
});

/* Section content drifts up + fades slightly as you fly past it */
document.querySelectorAll('.section-inner').forEach((inner) => {
  gsap.to(inner, {
    y: -60, opacity: 0.15, ease: 'none',
    scrollTrigger: { trigger: inner.parentElement, start: 'bottom 70%', end: 'bottom 10%', scrub: true },
  });
});

/* Stat counters */
document.querySelectorAll('.stat-num').forEach((el) => {
  const target = +el.dataset.count;
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true,
    onEnter: () => gsap.fromTo(el, { innerText: 0 }, {
      innerText: target, duration: 1.8, ease: 'power2.out', snap: { innerText: 1 },
    }),
  });
});

/* Skill chips are rendered + animated by the SKILL BAY engine at the
   bottom of this file — the generic .reveal tween above only moves the
   console frame itself. */

/* About status log: lines type in one after another, terminal-style */
document.querySelectorAll('.about-now-lines').forEach((log) => {
  gsap.fromTo(log.children,
    { opacity: 0, x: -18 },
    {
      opacity: 1, x: 0, duration: 0.5, stagger: 0.28, ease: 'power2.out',
      scrollTrigger: { trigger: log, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
});

/* About: build-process scanner sweeps the timeline on a loop, lighting up each step in turn.
   The fill bar is driven from the exact same progress value as the ball every frame (never
   a separate tween chasing it) so the two can't drift out of sync or feel laggy. A quick
   fade bridges the loop reset so the ball restarting at the left reads as a soft blink
   instead of a hard teleport. */
const processTrack = document.querySelector('.process-track');
const processScanner = document.querySelector('.process-scanner');
const processFill = document.querySelector('.process-fill');
const processCards = document.querySelectorAll('.process-card');
if (processTrack && processScanner && processFill && processCards.length) {
  const segment = 100 / processCards.length;
  let activeStep = -1;
  const sync = (p) => {
    const x = p * 100;
    processScanner.style.left = `${x}%`;
    processFill.style.left = `${Math.min(Math.max(x - segment / 2, 0), 100 - segment)}%`;
    const idx = Math.min(processCards.length - 1, Math.floor(p * processCards.length));
    if (idx !== activeStep) {
      activeStep = idx;
      processCards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
    }
  };
  sync(0);
  const proxy = { p: 0 };
  const sweep = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true })
    .to(proxy, { p: 1, duration: 6, ease: 'power1.inOut', onUpdate: () => sync(proxy.p) })
    .to([processScanner, processFill], { opacity: 0, duration: 0.3, ease: 'power1.in' })
    .call(() => { proxy.p = 0; sync(0); })
    .to([processScanner, processFill], { opacity: 1, duration: 0.3, ease: 'power1.out' });
  ScrollTrigger.create({ trigger: processTrack, start: 'top 85%', once: true, onEnter: () => sweep.play() });
}

/* Engineering Lab: staggered card entrance + animated category filtering */
const labGrid = document.querySelector('.lab-grid');
if (labGrid) {
  const labCards = gsap.utils.toArray(labGrid.children);
  gsap.from(labCards, {
    opacity: 0, y: 36, duration: 0.65, ease: 'power2.out', stagger: 0.07,
    scrollTrigger: { trigger: labGrid, start: 'top 80%', once: true },
  });
  const labFilters = document.querySelectorAll('.lab-filter');
  labFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      labFilters.forEach((b) => b.classList.toggle('is-on', b === btn));
      labCards.forEach((card) => {
        const show = f === 'all' || card.dataset.group === f;
        if (show && card.style.display === 'none') {
          card.style.display = '';
          gsap.fromTo(card, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'scale' });
        } else if (!show && card.style.display !== 'none') {
          gsap.to(card, {
            opacity: 0, scale: 0.94, duration: 0.25, ease: 'power1.in',
            onComplete: () => { card.style.display = 'none'; },
          });
        }
      });
    });
  });
}

/* Project cards: 3D tilt following the mouse */
document.querySelectorAll('.project-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
    card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* Hero photo: tilt on hover, vanish into the void as you scroll past it */
const heroPhotoFrame = document.querySelector('.hero-photo-frame');
if (heroPhotoFrame) {
  heroPhotoFrame.addEventListener('mousemove', (e) => {
    const r = heroPhotoFrame.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
    heroPhotoFrame.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    /* drive the scanner lens + ring from the same cursor position */
    heroPhotoFrame.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    heroPhotoFrame.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  heroPhotoFrame.addEventListener('mouseleave', () => { heroPhotoFrame.style.transform = ''; });
}

/* ================= UI EXTRAS ================= */

/* Typewriter — EDIT THESE ROLES with your own.
   Started by the launch sequence once the name has landed. */
const roles = ['Computer Engineering Student @ GIKI', 'Full-Stack Developer', 'AI/ML Enthusiast', 'Filmmaker & Video Editor'];
const tw = document.getElementById('typewriter');
let roleIdx = 0, charIdx = 0, deleting = false, twStarted = false;
function typeLoop() {
  const word = roles[roleIdx];
  charIdx += deleting ? -1 : 1;
  tw.textContent = word.slice(0, charIdx);
  let delay = deleting ? 35 : 70;
  if (!deleting && charIdx === word.length) { delay = 1800; deleting = true; }
  else if (deleting && charIdx === 0) { deleting = false; roleIdx = (roleIdx + 1) % roles.length; delay = 400; }
  setTimeout(typeLoop, delay);
}
function startTypewriter() {
  if (twStarted) return;
  twStarted = true;
  typeLoop();
}

/* Custom cursor */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
const ringPos = { x: innerWidth / 2, y: innerHeight / 2 };
window.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  gsap.to(ringPos, {
    x: e.clientX, y: e.clientY, duration: 0.35, ease: 'power2.out',
    onUpdate: () => { ring.style.left = ringPos.x + 'px'; ring.style.top = ringPos.y + 'px'; },
  });
});
document.querySelectorAll('.hoverable, a, .btn').forEach((el) => {
  el.addEventListener('mouseenter', () => ring.classList.add('grow'));
  el.addEventListener('mouseleave', () => ring.classList.remove('grow'));
});

/* Loader → hand off to the launch sequence.
   Skip the theatrics on reduced-motion or when the browser restored
   a mid-page scroll position (reload halfway down the site). */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('done');
    if (prefersReducedMotion || window.scrollY > 200) revealHeroInstant();
    else setTimeout(runLaunchSequence, 300);
  }, 400);
});

/* Images can shift section heights after ScrollTrigger's first measurement — resync. */
window.addEventListener('load', () => ScrollTrigger.refresh());
document.querySelectorAll('img').forEach((img) => {
  if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh());
});

/* ================= LAUNCH SEQUENCE =================
   The hero is zone "LAUNCH", so it launches: countdown → ignition
   (flash, shockwaves, screen shake, FOV warp) → the name slams in
   letter-by-letter → supporting content cascades in. Afterwards the
   letters ride a cursor wave, buttons turn magnetic, and the portrait
   hologram glitches now and then. */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroEl = document.getElementById('hero');
const launchOverlay = document.getElementById('launch-overlay');
const igniteFlash = document.getElementById('ignite-flash');
const heroNameEl = document.getElementById('hero-name');

/* ---------- Split the name into animatable letters ----------
   The gradient moves from the line onto each letter (transformed
   children break parent background-clip), with a negative animation
   delay per letter so the shine sweeps across the word. */
heroNameEl.querySelectorAll('.line').forEach((line) => {
  const grad = line.classList.contains('gradient-text');
  if (grad) line.classList.remove('gradient-text');
  const chars = line.textContent.trim().split('');
  line.textContent = '';
  chars.forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ltr' + (grad ? ' ltr-grad' : '');
    if (grad) s.style.animationDelay = `${-(i / chars.length) * 4}s`;
    s.textContent = ch;
    line.appendChild(s);
  });
});
const heroLetters = Array.from(heroNameEl.querySelectorAll('.ltr'));

const heroBits = {
  eyebrow: document.querySelector('#hero .eyebrow'),
  tagline: document.querySelector('#hero .hero-tagline'),
  meta:    Array.from(document.querySelectorAll('#hero .meta-chip')),
  cta:     Array.from(document.querySelectorAll('#hero .hero-cta .btn')),
  stats:   document.querySelector('#hero .hero-stats'),
  chips:   Array.from(document.querySelectorAll('#hero .float-chip')),
  hud:     document.querySelector('#hero .hud'),
  hint:    document.querySelector('#hero .scroll-hint'),
};
const eyebrowText = heroBits.eyebrow.textContent;

/* Park everything off-stage until ignition */
gsap.set(heroLetters, { opacity: 0 });
gsap.set([heroBits.eyebrow, heroBits.tagline, heroBits.stats, heroBits.hint, heroBits.hud,
          ...heroBits.meta, ...heroBits.cta], { opacity: 0 });
gsap.set(heroBits.chips, { opacity: 0 });

let heroIntroDone = false;

/* Transmission-decode effect for the eyebrow line */
function scrambleText(el, finalText, duration = 850) {
  const charset = '!<>-_\\/[]{}—=+*^?#$%&';
  const start = performance.now();
  el.style.opacity = 1;
  (function frame() {
    const p = Math.min(1, (performance.now() - start) / duration);
    const solved = Math.floor(p * finalText.length);
    let out = '';
    for (let i = 0; i < finalText.length; i++) {
      out += i < solved || finalText[i] === ' '
        ? finalText[i]
        : charset[(Math.random() * charset.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  })();
}

/* Camera FOV punch + dust flare = brief hyperspace kick */
function warpPunch() {
  const proj = () => camera.updateProjectionMatrix();
  gsap.timeline()
    .to(camera, { fov: 84, duration: 0.25, ease: 'power2.in', onUpdate: proj })
    .to(camera, { fov: 62, duration: 1.0, ease: 'expo.out', onUpdate: proj });
  gsap.timeline()
    .to(tintedDust.material, { size: 1.9, opacity: 1, duration: 0.25, ease: 'power2.in' })
    .to(tintedDust.material, { size: 0.7, opacity: 0.85, duration: 1.1, ease: 'power2.out' });
}

function finishHeroIntro() {
  heroEl.classList.remove('launching');
  heroNameEl.classList.add('wave-ready');
  heroIntroDone = true;
  startGlitchLoop();
}

/* Full cinematic intro */
function runLaunchSequence() {
  heroEl.classList.add('launching');
  const tl = gsap.timeline();

  /* pre-flight boot: status lines + progress bar */
  const bootLines = gsap.utils.toArray('#launch-overlay .boot-line:not(.boot-go)');
  const bootGo = document.querySelector('#launch-overlay .boot-go');
  const bootFill = document.querySelector('.boot-bar-fill');
  const bootPct = document.getElementById('boot-pct-val');
  const boot = { p: 0 };
  const paintBoot = () => {
    bootPct.textContent = Math.round(boot.p);
    bootFill.style.width = boot.p + '%';
  };
  const fills = [21, 42, 58, 79, 93];
  tl.fromTo('.boot-wrap', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, 0.05);
  bootLines.forEach((line, i) => {
    const at = 0.25 + i * 0.22;
    tl.fromTo(line, { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.18, ease: 'power2.out' }, at)
      .to(boot, { p: fills[i], duration: 0.2, ease: 'power1.inOut', onUpdate: paintBoot }, at);
  });
  const GO = 0.25 + bootLines.length * 0.22 + 0.1;
  tl.to(boot, { p: 100, duration: 0.22, ease: 'power2.in', onUpdate: paintBoot }, GO - 0.12)
    .fromTo(bootGo, { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' }, GO);

  /* ignition: flash + shockwaves + shake + warp */
  const IG = GO + 0.5;
  tl.to('.boot-wrap', { opacity: 0, y: -12, duration: 0.22 }, IG + 0.05)
    .fromTo(igniteFlash, { opacity: 0 }, { opacity: 0.55, duration: 0.07, ease: 'none' }, IG)
    .to(igniteFlash, { opacity: 0, duration: 0.45, ease: 'power2.out' }, IG + 0.08)
    .fromTo('.shockwave', { scale: 0, opacity: 0.9 },
      { scale: 15, opacity: 0, duration: 1.15, ease: 'expo.out', stagger: 0.12 }, IG)
    .fromTo('#hero .section-inner', { x: 0 },
      { keyframes: [{ x: -9 }, { x: 7 }, { x: -5 }, { x: 3 }, { x: 0 }], duration: 0.5, ease: 'none' }, IG + 0.03)
    .call(warpPunch, null, IG)
    .call(() => launchOverlay.classList.add('gone'), null, IG + 1.3)
    .call(showHeaderNav, null, IG + 1.35);

  /* the name slams in, letters converging from chaos */
  const NS = IG + 0.1;
  tl.fromTo(heroLetters,
    {
      opacity: 0,
      y: () => gsap.utils.random(-170, 170),
      x: () => gsap.utils.random(-70, 70),
      rotation: () => gsap.utils.random(-55, 55),
      scale: 2.9,
    },
    {
      opacity: 1, x: 0, y: 0, rotation: 0, scale: 1,
      duration: 0.7, ease: 'back.out(1.4)',
      stagger: { each: 0.045, from: 'random' },
    }, NS);

  /* supporting cast cascades in */
  const CAS = NS + 0.55;
  tl.call(() => scrambleText(heroBits.eyebrow, eyebrowText), null, CAS)
    .fromTo(heroBits.tagline, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5 }, CAS + 0.15)
    .call(startTypewriter, null, CAS + 0.35)
    .fromTo(heroBits.meta,
      { opacity: 0, rotationX: -90, y: 16, transformPerspective: 500 },
      { opacity: 1, rotationX: 0, y: 0, duration: 0.6, ease: 'back.out(1.7)', stagger: 0.09 }, CAS + 0.2)
    .fromTo(heroBits.cta,
      { opacity: 0, y: 28, scale: 0.85 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)', stagger: 0.1 }, CAS + 0.4)
    .fromTo(heroBits.stats, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5 }, CAS + 0.55)
    .call(igniteHeroPhoto, null, NS + 0.15)
    .fromTo(heroBits.chips,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)', stagger: 0.12 }, CAS + 0.45)
    .fromTo(heroBits.hud, { opacity: 0 }, { opacity: 1, duration: 0.5 }, CAS + 0.55)
    .fromTo('.hud-corner', { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2)', stagger: 0.07 }, CAS + 0.55)
    .fromTo(heroBits.hint, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, CAS + 0.85)
    .call(finishHeroIntro, null, CAS + 1.8);
}

/* No-theatrics path: show everything as authored */
function revealHeroInstant() {
  launchOverlay.classList.add('gone');
  gsap.set([...heroLetters, heroBits.eyebrow, heroBits.tagline, heroBits.stats, heroBits.hint,
            heroBits.hud, ...heroBits.meta, ...heroBits.cta, ...heroBits.chips], { clearProps: 'all' });
  heroPhotoIntroStart = performance.now() - 2000;
  startTypewriter();
  showHeaderNav();
  finishHeroIntro();
}

/* ---------- Persistent effects (post-intro) ---------- */

/* Random signal glitch on the name + portrait while the hero is on screen */
function startGlitchLoop() {
  if (prefersReducedMotion) return;
  const targets = [
    heroNameEl,
    document.querySelector('.hero-photo-frame'),
    ...document.querySelectorAll('#hero .hud-readout'),
  ];
  (function loop() {
    setTimeout(() => {
      if (document.visibilityState === 'visible' && window.scrollY < innerHeight * 0.7) {
        targets.forEach((t) => t.classList.add('glitch'));
        setTimeout(() => targets.forEach((t) => t.classList.remove('glitch')), 240);
      }
      loop();
    }, gsap.utils.random(3500, 8000));
  })();
}

/* Letters bulge toward the cursor like a magnet wave */
heroNameEl.addEventListener('mousemove', (e) => {
  if (!heroIntroDone) return;
  heroLetters.forEach((l) => {
    const r = l.getBoundingClientRect();
    const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    const s = Math.max(0, 1 - d / 220);
    l.style.transform = s > 0.02 ? `translateY(${-16 * s}px) scale(${1 + 0.14 * s})` : '';
    l.style.textShadow = s > 0.05 ? `0 0 ${28 * s}px var(--accent)` : '';
  });
});
heroNameEl.addEventListener('mouseleave', () => {
  heroLetters.forEach((l) => { l.style.transform = ''; l.style.textShadow = ''; });
});

/* Magnetic CTA buttons (the .btn CSS transition smooths the pull) */
heroBits.cta.forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    if (!heroIntroDone) return;
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.3;
    const y = (e.clientY - r.top - r.height / 2) * 0.5;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

/* "Explore My Work" fires a warp jump as it scrolls you into the tunnel */
const exploreBtn = document.querySelector('#hero .hero-cta a[href="#projects"]');
if (exploreBtn) exploreBtn.addEventListener('click', () => { if (!prefersReducedMotion) warpPunch(); });

/* ---------- HUD telemetry ---------- */
const hudClockVal = document.getElementById('hud-clock-val');
const hudElapsedVal = document.getElementById('hud-elapsed-val');
const hudFuelVal = document.getElementById('hud-fuel-val');
const hudCoordsVal = document.getElementById('hud-coords-val');
if (hudClockVal) {
  /* mission clock: T+ elapsed · real local time (with seconds) */
  const missionStart = performance.now();
  function tickClock() {
    const s = Math.floor((performance.now() - missionStart) / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    hudElapsedVal.textContent = `${hh}:${mm}:${ss}`;
    hudClockVal.textContent = new Date().toLocaleTimeString('en-GB');
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* coffee fuel gauge: slowly drains, then pulses while topping back up */
  const fuelReadout = document.querySelector('#hero .hud-fuel');
  let fuel = 99.9, refueling = false;
  setInterval(() => {
    if (refueling) {
      fuel = Math.min(99.9, fuel + 4.2);
      if (fuel >= 99.9) { refueling = false; fuelReadout.classList.remove('refueling'); }
    } else {
      fuel = Math.max(0, fuel - gsap.utils.random(0.05, 0.35));
      if (fuel <= 82) { refueling = true; fuelReadout.classList.add('refueling'); }
    }
    hudFuelVal.textContent = fuel.toFixed(1);
  }, 800);

  window.addEventListener('mousemove', (e) => {
    hudCoordsVal.textContent =
      `X ${(e.clientX / innerWidth).toFixed(3)} · Y ${(e.clientY / innerHeight).toFixed(3)}`;
  });
}

/* ================= CONTACT: comms console ================= */

/* uplink terminal: the transmission log types itself in when the console arrives */
const termBody = document.getElementById('term-body');
if (termBody) {
  const TERM_LINES = [
    { text: 'ESTABLISHING UPLINK ......... OK', dim: false },
    { text: 'CHANNEL 011 OPEN — SIGNAL 98.6%', dim: false },
    { text: 'TO: HASSAN KHALID <hassank8125@gmail.com>', dim: false },
    { text: 'FROM: [ YOUR NAME HERE ]', dim: true },
    { text: 'PAYLOAD: REMOTE JOB · COLLAB · BIG IDEA', dim: true },
    { text: 'STATUS: AWAITING YOUR TRANSMISSION', dim: false },
  ];
  const caret = document.createElement('span');
  caret.className = 'term-caret';

  /* each line is: accent prompt + a text node the typer fills + (while active) the caret */
  const makeLine = (dim) => {
    const el = document.createElement('span');
    el.className = 'term-line' + (dim ? ' t-dim' : '');
    const prompt = document.createElement('b');
    prompt.textContent = '›';
    el.appendChild(prompt);
    el.appendChild(document.createTextNode(''));
    return el;
  };

  function renderInstant() {
    TERM_LINES.forEach(({ text, dim }) => {
      const el = makeLine(dim);
      el.childNodes[1].textContent = text;
      termBody.appendChild(el);
    });
    termBody.lastChild.appendChild(caret);
  }

  function typeLines() {
    let li = 0;
    (function nextLine() {
      const { text, dim } = TERM_LINES[li];
      const el = makeLine(dim);
      termBody.appendChild(el);
      el.appendChild(caret);
      let ci = 0;
      const tick = setInterval(() => {
        ci++;
        el.childNodes[1].textContent = text.slice(0, ci);
        if (ci >= text.length) {
          clearInterval(tick);
          li++;
          if (li < TERM_LINES.length) setTimeout(nextLine, 320);
          /* after the final line the caret just keeps blinking — channel stays open */
        }
      }, 17);
    })();
  }

  ScrollTrigger.create({
    trigger: '.contact-terminal', start: 'top 78%', once: true,
    onEnter: () => (prefersReducedMotion ? renderInstant() : typeLines()),
  });
}

/* signature outro: giant stroked name rises in letter by letter, then the
   letters bulge and fill with the accent as the cursor sweeps across them
   (same magnet feel as the hero name, so the site closes how it opened) */
const signName = document.getElementById('sign-name');
if (signName) {
  const signLetters = signName.textContent.split('').map((ch) => {
    const s = document.createElement('span');
    s.className = 'sn';
    s.textContent = ch === ' ' ? ' ' : ch;
    return s;
  });
  signName.textContent = '';
  signLetters.forEach((s) => signName.appendChild(s));

  if (!prefersReducedMotion) {
    gsap.from(signLetters, {
      opacity: 0, y: 70, rotationX: -55, transformPerspective: 700, transformOrigin: 'center bottom',
      duration: 0.8, ease: 'back.out(1.6)', stagger: 0.035, clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.contact-sign', start: 'top 85%', once: true },
    });
    signName.addEventListener('mousemove', (e) => {
      signLetters.forEach((l) => {
        const r = l.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        const s = Math.max(0, 1 - d / 200);
        l.style.transform = s > 0.02 ? `translateY(${-14 * s}px) scale(${1 + 0.12 * s})` : '';
        l.style.color = s > 0.25 ? 'var(--accent)' : '';
        l.style.textShadow = s > 0.05 ? `0 0 ${30 * s}px var(--accent)` : '';
      });
    });
    signName.addEventListener('mouseleave', () => {
      signLetters.forEach((l) => { l.style.transform = ''; l.style.color = ''; l.style.textShadow = ''; });
    });
  }
}

/* one-click email copy with feedback */
const copyBtn = document.getElementById('copy-email');
if (copyBtn) {
  const EMAIL = 'hassank8125@gmail.com';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = EMAIL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyBtn.textContent = 'COPIED ✓';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'COPY EMAIL';
      copyBtn.classList.remove('copied');
    }, 1600);
  });
}

/* magnetic pull on the contact CTAs (same feel as the hero buttons) */
document.querySelectorAll('#contact .contact-email-row .btn').forEach((btn) => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.3;
    const y = (e.clientY - r.top - r.height / 2) * 0.5;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});
/* ============ Certifications: registry console ============ */
const certsGrid = document.querySelector('.certs-grid');
if (certsGrid) {
  const certCards = gsap.utils.toArray(certsGrid.querySelectorAll('.cert-card'));

  /* stamp each card with a registry ID + a zoom hint on the certificate side */
  certCards.forEach((card, i) => {
    const id = document.createElement('span');
    id.className = 'cert-id mono';
    id.textContent = `CRT-${String(i + 1).padStart(3, '0')}`;
    card.querySelector('.cert-front').prepend(id);
    const hint = document.createElement('span');
    hint.className = 'cert-zoom-hint mono';
    hint.textContent = 'CLICK TO ENLARGE ⛶';
    card.querySelector('.cert-back').appendChild(hint);
  });

  /* ledger counters tick up when the section arrives */
  document.querySelectorAll('.cert-count').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.fromTo(el, { innerText: 0 }, {
        innerText: +el.dataset.count, duration: 1.2, ease: 'power2.out', snap: { innerText: 1 },
      }),
    });
  });

  /* entrance: cards stand up from flat like dominoes, then the scanner beam
     sweeps the row and flashes each one as it certifies it */
  const beam = document.querySelector('.certs-beam');
  if (prefersReducedMotion) {
    gsap.from(certCards, {
      opacity: 0, duration: 0.8,
      scrollTrigger: { trigger: certsGrid, start: 'top 80%', once: true },
    });
  } else {
    gsap.set(certCards, { opacity: 0 });
    ScrollTrigger.create({
      trigger: certsGrid, start: 'top 78%', once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        tl.fromTo(certCards,
          { opacity: 0, y: 90, rotationX: -58, transformPerspective: 1000, transformOrigin: 'center bottom' },
          {
            opacity: 1, y: 0, rotationX: 0, duration: 0.85, ease: 'back.out(1.5)',
            stagger: 0.1, clearProps: 'transform,opacity',
          });
        const SWEEP = 1.3, START = 0.7;
        tl.fromTo(beam, { left: '-3%', opacity: 0 }, { opacity: 1, duration: 0.2 }, START)
          .to(beam, { left: '103%', duration: SWEEP, ease: 'power1.inOut' }, START)
          .to(beam, { opacity: 0, duration: 0.25 }, START + SWEEP - 0.15);
        certCards.forEach((card, i) => {
          tl.call(() => {
            card.classList.add('is-scanned');
            setTimeout(() => card.classList.remove('is-scanned'), 450);
          }, null, START + ((i + 0.5) / certCards.length) * SWEEP);
        });
      },
    });
  }

  /* lightbox: click a card to inspect the certificate full-size */
  const lb = document.getElementById('cert-lightbox');
  const lbImg = document.getElementById('cert-lightbox-img');
  const lbCap = document.getElementById('cert-lightbox-cap');
  const lbFrame = lb.querySelector('.cert-lightbox-frame');
  const touchMode = window.matchMedia('(hover: none)').matches;

  function openLightbox(card) {
    const img = card.querySelector('.cert-back img');
    if (!img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent =
      `${card.querySelector('h3').textContent} — ${card.querySelector('.cert-issuer').textContent} · ${card.querySelector('.cert-date').textContent}`;
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    gsap.fromTo(lb.querySelector('.cert-lightbox-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' });
    gsap.fromTo(lbFrame,
      { opacity: 0, scale: 0.82, rotationX: 8, transformPerspective: 900 },
      { opacity: 1, scale: 1, rotationX: 0, duration: 0.5, ease: 'back.out(1.6)' });
  }
  function closeLightbox() {
    if (!lb.classList.contains('open')) return;
    gsap.to(lbFrame, { opacity: 0, scale: 0.88, duration: 0.25, ease: 'power1.in' });
    gsap.to(lb.querySelector('.cert-lightbox-backdrop'), {
      opacity: 0, duration: 0.3, ease: 'power1.in',
      onComplete: () => {
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      },
    });
  }
  certCards.forEach((card) => {
    card.addEventListener('click', () => {
      /* on touch there's no hover-flip: first tap flips, second tap enlarges */
      if (touchMode && !card.classList.contains('is-flipped')) {
        certCards.forEach((c) => c.classList.toggle('is-flipped', c === card));
        return;
      }
      openLightbox(card);
    });
  });
  lb.querySelector('.cert-lightbox-backdrop').addEventListener('click', closeLightbox);
  document.getElementById('cert-lightbox-close').addEventListener('click', closeLightbox);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

/* ================= SKILL BAY =================
   The skills section is a ship-systems console: category "racks" on the
   left, a display panel on the right. Selecting a rack sweeps a scanline
   down the panel while the old modules eject and the new ones warp in.
   Auto-cycles every SB_CYCLE seconds while the section is on screen;
   hovering the console holds the current system. Every chip is rendered
   identically — no sizes, no bars, no rankings. */

const SKILL_SYSTEMS = [
  {
    name: 'Languages', tag: 'THE LOGIC LAYER',
    skills: ['C', 'C++', 'C#', 'Python', 'MATLAB', 'SQL', 'Assembly (8051)', 'Assembly (RISC-V)', 'Verilog (HDL)'],
  },
  {
    name: 'Web & Mobile', tag: 'WHAT SHIPS TO A SCREEN',
    skills: ['HTML5', 'CSS3', 'JavaScript', 'React.js', 'React Native', 'Flask', 'REST APIs', 'WordPress', 'Framer Motion'],
  },
  {
    name: 'Embedded & Hardware', tag: 'WHERE CODE MEETS COPPER',
    skills: ['ESP32', 'Arduino IDE', 'Blynk', '8051 Microcontroller', 'Proteus', 'Keil uVision', 'MATLAB/Simulink'],
  },
  {
    name: 'Infrastructure & Tools', tag: 'KEEPS EVERYTHING RUNNING',
    skills: ['MySQL', 'PostgreSQL', 'Supabase', 'Git', 'GitHub Actions', 'VS Code', 'Figma'],
  },
  {
    name: 'Creative Suite', tag: "THE FILMMAKER'S BENCH",
    skills: ['DaVinci Resolve', 'Premiere Pro', 'Canva', 'Photoshop'],
  },
];

const skillbayEl = document.querySelector('.skillbay');
if (skillbayEl) {
  const SB_CYCLE = 5; // seconds per system while auto-cycling
  const tabsWrap = document.getElementById('skillbay-tabs');
  const chipsWrap = document.getElementById('skillbay-chips');
  const scanEl = document.getElementById('skillbay-scan');
  const sbCatLine = document.getElementById('sb-cat-line');
  const sbCatCount = document.getElementById('sb-cat-count');

  let sbIdx = 0, sbTl = null, sbTimer = null, sbProg = null;
  let sbInView = false, sbHold = false, sbBooted = false;
  let typeTimer = null;

  const bindRing = (el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('grow'));
    el.addEventListener('mouseleave', () => ring.classList.remove('grow'));
  };

  /* --- build the rack tabs --- */
  const tabEls = SKILL_SYSTEMS.map((sys, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'skillbay-tab';
    b.setAttribute('role', 'tab');
    b.innerHTML =
      `<span class="sbt-idx mono">0${i + 1}</span>` +
      `<span class="sbt-name">${sys.name}</span>` +
      `<span class="sbt-count mono">${String(sys.skills.length).padStart(2, '0')}</span>` +
      `<span class="sbt-progress" aria-hidden="true"><i></i></span>`;
    b.addEventListener('click', () => switchSystem(i));
    bindRing(b);
    tabsWrap.appendChild(b);
    return b;
  });

  /* --- constellation nodes: every skill is an identical star dropped at a
     randomized spot (order shuffled too), so neither reading direction nor
     placement can be mistaken for a ranking. --- */
  let lineSync = []; // { el, a, b } — live threads between neighbouring nodes

  /* thread endpoints chase their nodes every frame so the lines ride along
     with the idle drift and magnet pulls */
  gsap.ticker.add(() => {
    if (!lineSync.length) return;
    const wr = chipsWrap.getBoundingClientRect();
    lineSync.forEach(({ el, a, b }) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      el.setAttribute('x1', ra.left - wr.left + ra.width / 2);
      el.setAttribute('y1', ra.top - wr.top + ra.height / 2);
      el.setAttribute('x2', rb.left - wr.left + rb.width / 2);
      el.setAttribute('y2', rb.top - wr.top + rb.height / 2);
    });
  });

  function bindNode(node) {
    bindRing(node);
    const qx = gsap.quickTo(node, 'x', { duration: 0.35, ease: 'power3.out' });
    const qy = gsap.quickTo(node, 'y', { duration: 0.35, ease: 'power3.out' });
    node.addEventListener('mousemove', (e) => {
      if (!node.dataset.ready) return;
      const r = node.getBoundingClientRect();
      qx((e.clientX - r.left - r.width / 2) * 0.3);
      qy((e.clientY - r.top - r.height / 2) * 0.5);
    });
    node.addEventListener('mouseleave', () => {
      if (!node.dataset.ready) return;
      qx(0); qy(0);
    });
    /* light up the threads connected to the hovered star */
    node.addEventListener('mouseenter', () => {
      lineSync.forEach((s) => { if (s.a === node || s.b === node) s.el.style.opacity = 0.6; });
    });
    node.addEventListener('mouseleave', () => {
      lineSync.forEach((s) => { s.el.style.opacity = ''; });
    });
  }

  function makeNode(name) {
    const node = document.createElement('span');
    node.className = 'skill-node';
    const dot = document.createElement('b');
    dot.className = 'node-dot';
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = name;
    node.appendChild(dot);
    node.appendChild(label);
    bindNode(node);
    return node;
  }

  /* each node wanders a little on its own axis once seated */
  function startDrift(node) {
    if (prefersReducedMotion || chipsWrap.classList.contains('is-flow')) return;
    gsap.to(node, {
      yPercent: gsap.utils.random(-26, 26),
      duration: gsap.utils.random(2.6, 4.4),
      yoyo: true, repeat: -1, ease: 'sine.inOut',
      delay: gsap.utils.random(0, 0.8),
    });
  }

  function renderNodes(idx) {
    lineSync = [];
    chipsWrap.innerHTML = '';
    const flow = chipsWrap.clientWidth < 640;
    chipsWrap.classList.toggle('is-flow', flow);

    const names = gsap.utils.shuffle([...SKILL_SYSTEMS[idx].skills]);
    const nodes = names.map(makeNode);
    nodes.forEach((n) => chipsWrap.appendChild(n));
    if (flow) return { nodes, svg: null };

    /* scatter: rejection-sample random spots until nobody overlaps */
    const W = chipsWrap.clientWidth, H = chipsWrap.clientHeight, pad = 18;
    const placed = [];
    nodes.forEach((n) => {
      const w = n.offsetWidth, h = n.offsetHeight;
      let spot = null;
      for (let t = 0; t < 300 && !spot; t++) {
        const x = gsap.utils.random(0, Math.max(0, W - w));
        const y = gsap.utils.random(0, Math.max(0, H - h));
        const clear = placed.every((p) =>
          x > p.x + p.w + pad || p.x > x + w + pad || y > p.y + p.h + pad || p.y > y + h + pad);
        if (clear) spot = { x, y, w, h };
      }
      if (!spot) spot = { x: gsap.utils.random(0, Math.max(0, W - w)), y: gsap.utils.random(0, Math.max(0, H - h)), w, h };
      placed.push(spot);
      n.style.left = spot.x + 'px';
      n.style.top = spot.y + 'px';
    });

    /* constellation threads: everyone links to their nearest neighbour,
       some pick up a second thread for a richer web */
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('skillbay-lines');
    const centers = placed.map((p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 }));
    const seen = new Set();
    centers.forEach((c, i) => {
      const near = centers
        .map((o, j) => ({ j, d: Math.hypot(o.x - c.x, o.y - c.y) }))
        .filter((o) => o.j !== i)
        .sort((p, q) => p.d - q.d)
        .slice(0, Math.random() < 0.45 ? 2 : 1);
      near.forEach(({ j }) => {
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        svg.appendChild(line);
        lineSync.push({ el: line, a: nodes[i], b: nodes[j] });
      });
    });
    chipsWrap.prepend(svg);
    return { nodes, svg };
  }

  /* --- panel head: readout types itself in --- */
  function setHead(sys, idx, instant) {
    const full = `> ${sys.name.toUpperCase()} :: ${sys.tag}`;
    const done = `&gt; <b>${sys.name.toUpperCase()}</b> :: ${sys.tag}`;
    sbCatCount.textContent = `SYS-0${idx + 1} · ${String(sys.skills.length).padStart(2, '0')} MODULES`;
    clearInterval(typeTimer);
    if (instant) { sbCatLine.innerHTML = done; return; }
    let i = 0;
    sbCatLine.textContent = '';
    typeTimer = setInterval(() => {
      i += 2;
      sbCatLine.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(typeTimer); sbCatLine.innerHTML = done; }
    }, 18);
  }

  /* --- auto-cycle timer + progress fill on the live rack --- */
  function sbClear() {
    clearTimeout(sbTimer); sbTimer = null;
    if (sbProg) { sbProg.kill(); sbProg = null; }
  }
  function sbSchedule() {
    sbClear();
    if (!sbInView || sbHold || prefersReducedMotion) return;
    const fill = tabEls[sbIdx].querySelector('.sbt-progress i');
    gsap.set(fill, { scaleX: 0 });
    sbProg = gsap.to(fill, { scaleX: 1, duration: SB_CYCLE, ease: 'none' });
    sbTimer = setTimeout(() => switchSystem((sbIdx + 1) % SKILL_SYSTEMS.length), SB_CYCLE * 1000);
  }

  function switchSystem(idx, opts = {}) {
    if (idx === sbIdx && !opts.replay) { sbSchedule(); return; }
    sbIdx = idx;
    const sys = SKILL_SYSTEMS[idx];
    tabEls.forEach((t, ti) => {
      t.classList.toggle('is-live', ti === idx);
      gsap.set(t.querySelector('.sbt-progress i'), { scaleX: 0 });
    });
    sbClear();

    if (prefersReducedMotion) {
      renderNodes(idx);
      setHead(sys, idx, true);
      return;
    }

    if (sbTl) sbTl.kill();
    const oldNodes = Array.from(chipsWrap.querySelectorAll('.skill-node'));
    const oldSvg = chipsWrap.querySelector('.skillbay-lines');
    gsap.killTweensOf(oldNodes);
    sbTl = gsap.timeline({ onComplete: sbSchedule });
    /* scanline sweeps the panel while the swap happens underneath it */
    sbTl.fromTo(scanEl, { top: -3, opacity: 1 }, { top: '100%', duration: 0.55, ease: 'power2.inOut' }, 0)
        .to(scanEl, { opacity: 0, duration: 0.2 }, 0.5);
    if (oldSvg) sbTl.to(oldSvg, { opacity: 0, duration: 0.15 }, 0);
    if (oldNodes.length) {
      sbTl.to(oldNodes, {
        opacity: 0, scale: 0, duration: 0.2, ease: 'power1.in',
        stagger: { each: 0.015, from: 'random' },
      }, 0);
    }
    sbTl.call(() => {
      const { nodes, svg } = renderNodes(idx);
      setHead(sys, idx, false);
      gsap.fromTo(nodes,
        { opacity: 0, scale: 0 },
        {
          opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(2)',
          stagger: { each: 0.05, from: 'random' },
          onComplete: () => nodes.forEach((n) => { n.dataset.ready = '1'; startDrift(n); }),
        });
      if (svg) gsap.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.7, delay: 0.35 });
    }, null, 0.22);
  }

  /* hovering anywhere on the console holds the current system */
  skillbayEl.addEventListener('mouseenter', () => { sbHold = true; sbClear(); });
  skillbayEl.addEventListener('mouseleave', () => { sbHold = false; sbSchedule(); });

  /* re-scatter: re-roll the current system's star map on demand */
  const rescatterBtn = document.getElementById('skillbay-rescatter');
  if (rescatterBtn) {
    bindRing(rescatterBtn);
    rescatterBtn.addEventListener('click', () => switchSystem(sbIdx, { replay: true }));
  }

  /* panel resized → the map no longer fits its sky; re-roll it in place */
  let sbResizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(sbResizeT);
    sbResizeT = setTimeout(() => {
      if (prefersReducedMotion) { renderNodes(sbIdx); return; }
      const { nodes, svg } = renderNodes(sbIdx);
      gsap.fromTo(nodes,
        { opacity: 0, scale: 0.6 },
        {
          opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.8)',
          stagger: { each: 0.02, from: 'random' },
          onComplete: () => nodes.forEach((n) => { n.dataset.ready = '1'; startDrift(n); }),
        });
      if (svg) gsap.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.2 });
    }, 350);
  });

  /* first paint: system 01 sits ready so the layout is stable pre-scroll */
  tabEls[0].classList.add('is-live');
  renderNodes(0);
  setHead(SKILL_SYSTEMS[0], 0, true);

  /* cycle only while the section is actually on screen; the first arrival
     replays system 01 so its chips warp in as the console boots */
  ScrollTrigger.create({
    trigger: '#skills', start: 'top 75%', end: 'bottom 25%',
    onEnter: () => {
      sbInView = true;
      if (!sbBooted) { sbBooted = true; switchSystem(0, { replay: true }); }
      else sbSchedule();
    },
    onEnterBack: () => { sbInView = true; sbSchedule(); },
    onLeave: () => { sbInView = false; sbClear(); },
    onLeaveBack: () => { sbInView = false; sbClear(); },
  });
}

