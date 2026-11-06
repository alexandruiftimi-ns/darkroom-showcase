import { createFrameScrubber, holdAt } from './scrub-frames.js';
import { reveal } from './reveal.js';
import { nav } from './nav.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = '(max-width: 640px)'; // phones get frames/mobile: the square slice they show, native pixels, about 110 KB a frame
const slowLink = /2g|3g/.test(navigator.connection?.effectiveType || ''); // Data Saver is handled inside the scrubber
nav();
reveal();

/* ---------- Skeletons: each media box shimmers until its picture has decoded ---------- */
function settle(box) {
  const img = box.querySelector('img');
  const done = () => box.classList.add('is-loaded');
  if (!img) return done();
  const ready = () => (img.decode ? img.decode().catch(() => {}).then(done) : done());
  if (img.complete) { if (img.naturalWidth) ready(); else done(); return; }
  img.addEventListener('load', ready, { once: true });
  img.addEventListener('error', done, { once: true });
}
document.querySelectorAll('.skel').forEach(settle);

/* ---------- Hero film ---------- */
const film = document.getElementById('top');
const stageEl = film.querySelector('.film-stage');
const canvas = film.querySelector('.film-canvas');
const chapters = [...film.querySelectorAll('[data-chapter]')];
const statusEl = film.querySelector('[data-status]');
const track = film.querySelector('.film-track');

// the nav is transparent while it sits over the film, solid paper after it
const navBar = document.querySelector('.nav');
new IntersectionObserver(([e]) => navBar.classList.toggle('is-over', e.isIntersecting), { rootMargin: '0px 0px -100% 0px' }).observe(film.querySelector('.film-cover'));

// stage ranges measured on the source film (24 fps, 241 frames); the intro owns the first few frames
const RANGES = [[6, 20], [21, 92], [93, 175], [176, 240]];
const mapFrame = holdAt([0, 12, 84, 156, 240], 0.055);

/* The survey line. ROOF is the building's left corner, measured on the film: [frame, height from the frame's top, 0 to 1].
   CORNER is that corner's position across the frame. The frame is fitted by cover and anchored top right, as in the CSS. */
const ROOF = [[0, .778], [22, .76], [40, .6], [60, .45], [84, .4], [240, .392]];
const CORNER = .307;
const roofAt = (f) => {
  for (let i = 1; i < ROOF.length; i++) {
    const [a, y0] = ROOF[i - 1], [b, y1] = ROOF[i];
    if (f <= b) return y0 + (y1 - y0) * ((f - a) / (b - a));
  }
  return ROOF.at(-1)[1];
};
const dim = film.querySelector('[data-dim]');
const dimLabel = film.querySelector('[data-level]');
const desktop = matchMedia('(min-width: 1024px)');
let shownFrame = 0;
function placeDim(f) {
  if (!desktop.matches) return;
  const vw = stageEl.clientWidth, vh = stageEl.clientHeight, s = Math.max(vw / 1916, vh / 1080);
  const w = 1916 * s, y = roofAt(f);
  dim.style.transform = `translateY(${(y * 1080 * s).toFixed(1)}px)`;
  dim.style.setProperty('--end', `${(vw - w + CORNER * w).toFixed(1)}px`);
  const level = Math.max(0, Math.min(8, Math.round(((.778 - y) / (.778 - .4)) * 8)));
  const text = f > 150 ? 'Roof, level 8' : level ? `Level ${level}` : 'Ground level';
  if (dimLabel.textContent !== text) dimLabel.textContent = text;
  dim.classList.toggle('is-on', f >= RANGES[0][0]);
}
addEventListener('resize', () => placeDim(shownFrame));

let stage = -1;
function showFrame(f) {
  shownFrame = f;
  placeDim(f);
  const s = f < RANGES[0][0] ? 0 : RANGES.findIndex(([a, b]) => f >= a && f <= b) + 1;
  if (s === stage) return;
  stage = s;
  if (s) film.dataset.stage = String(s); else delete film.dataset.stage;
  chapters.forEach((c) => c.setAttribute('aria-hidden', String(c.dataset.chapter !== String(s))));
}

if (reduced) {
  const poster = film.querySelector('.film-poster');
  film.querySelector('.film-frame source')?.remove(); // the phone first frame must not win over the last frame
  poster.src = 'frames/seq_0241.webp';
  poster.alt = 'The finished residential block at sunset, with young trees and a playground in front.';
} else {
  showFrame(0);
  // the frames are lossless (about 1.3 MB each): they start once the page itself has loaded, and arrive as the visitor nears them
  const start = () => createFrameScrubber({
    canvas, scene: track, stage: stageEl, manifestUrl: 'frames/manifest.json', mapFrame, mobileQuery: PHONE,
    ...(matchMedia(PHONE).matches ? { ahead: 120, behind: 30, startFrames: 12, warm: slowLink ? 0 : 241 } : {}),
    onFrame: (i) => showFrame(i),
    onWait: (late) => { statusEl.hidden = !late; },
  }).then(() => film.classList.add('is-live')).catch(() => { statusEl.hidden = true; /* the poster stays: the page still works */ });
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
}

/* ---------- As drawn, as built: scroll moves the wipe. Without motion it rests half and half ---------- */
const wipe = document.getElementById('drawn');
const wipeStage = wipe.querySelector('.wipe-stage');
const plate = wipe.querySelector('.wipe-plate');
plate.style.setProperty('--p', reduced ? '.5' : '0');
if (reduced) wipe.classList.add('is-moving');
else {
  let queued = false;
  const update = () => {
    queued = false;
    const r = wipe.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - wipeStage.offsetHeight)));
    const p = Math.min(1, Math.max(0, (t - .08) / .84)); // rests a moment on the drawing and on the photo
    plate.style.setProperty('--p', p.toFixed(4));
    wipe.classList.toggle('is-moving', p > .015 && p < .985);
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- Method: the picture follows the stage being read ---------- */
const stageImgs = [...document.querySelectorAll('[data-stage-img]')];
const stageIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const k = [...e.target.parentElement.children].indexOf(e.target);
    stageImgs.forEach((img, i) => img.classList.toggle('is-on', i === k));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('.stage').forEach((el) => stageIo.observe(el));

/* ---------- Map: pins stamp in west to east; a city and its pin mark each other ---------- */
const map = document.querySelector('.map');
const mapIo = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  mapIo.disconnect();
  map.classList.add('is-in');
  setTimeout(() => map.classList.add('is-done'), reduced ? 0 : 1300);
}, { threshold: 0.3 });
mapIo.observe(map);
const cityEls = (name) => document.querySelectorAll(`[data-city="${name}"]`);
document.querySelectorAll('[data-city]').forEach((el) => {
  el.addEventListener('pointerenter', () => cityEls(el.dataset.city).forEach((x) => x.classList.add('is-on')));
  el.addEventListener('pointerleave', () => cityEls(el.dataset.city).forEach((x) => x.classList.remove('is-on')));
});

/* ---------- Nav: mark the section in view ---------- */
const navLinks = [...document.querySelectorAll('.nav-links a')];
const navIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    navLinks.forEach((a) => (a.hash === `#${e.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
navLinks.forEach((a) => { const t = document.querySelector(a.hash); if (t) navIo.observe(t); });

/* ---------- Project rail ---------- */
const rail = document.getElementById('rail');
const railBtns = [...document.querySelectorAll('[data-rail]')];
function railState() {
  railBtns[0].disabled = rail.scrollLeft <= 2;
  railBtns[1].disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
}
railBtns.forEach((b) => b.addEventListener('click', () => {
  const step = rail.querySelector('.card').getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap);
  rail.scrollBy({ left: Number(b.dataset.rail) * step, behavior: reduced ? 'auto' : 'smooth' });
}));
rail.addEventListener('scroll', railState, { passive: true });
addEventListener('resize', railState);
railState();

/* ---------- Footer wordmark: fit the line exactly ---------- */
const word = document.querySelector('.footer-word');
function fitWord() {
  word.style.fontSize = '100px';
  const box = word.parentElement, cs = getComputedStyle(box);
  const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  word.style.fontSize = `${(100 * avail) / word.getBoundingClientRect().width}px`;
}
fitWord();
addEventListener('resize', fitWord);
document.fonts?.ready.then(fitWord);

/* ---------- Building rows preselect the project type ---------- */
const typeSelect = document.getElementById('f-type');
document.querySelectorAll('[data-type]').forEach((a) => a.addEventListener('click', () => { typeSelect.value = a.dataset.type; }));

/* ---------- Enquiry form: validated, and honest that nothing is sent yet ---------- */
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const rules = [
  ['f-name', 'e-name', (v) => v.trim().length > 1, 'Tell us who to ask for.'],
  ['f-email', 'e-email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'Enter an email address like name@company.ro.'],
  ['f-type', 'e-type', (v) => v !== '', 'Choose the closest project type.'],
];
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let first = null;
  for (const [id, errId, ok, msg] of rules) {
    const input = document.getElementById(id);
    const valid = ok(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    document.getElementById(errId).textContent = valid ? '' : msg;
    if (!valid && !first) first = input;
  }
  if (first) { first.focus(); return; }
  // TEMP: no endpoint is connected yet. Say so; never pretend it was sent.
  status.hidden = false;
  status.textContent = 'This form is not connected yet, so nothing was sent. Please call or email us directly for now.';
});
