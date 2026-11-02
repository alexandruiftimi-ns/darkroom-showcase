import { foamWipe } from './foam-wipe.js';
import { reveal } from './reveal.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const hero = document.querySelector('.hero');
const media = hero.querySelector('.hero-media');
const meter = hero.querySelector('.wipe-meter');
const poster = hero.querySelector('.poster-dirty img');

foamWipe({
  section: hero,
  stage: media,
  canvas: media.querySelector('canvas'),
  dirty: { large: 'media/hero-dirty-1672.webp', small: 'media/hero-dirty-960.webp' },
  clean: { large: 'media/hero-clean-1672.webp', small: 'media/hero-clean-960.webp' },
  frame: () => {
    const [fx, fy] = getComputedStyle(poster).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    return { fx, fy, zoom: 1 };
  },
  onProgress: (p) => meter.style.setProperty('--p', p.toFixed(4)),
});

reveal();

// Scroll progress (0 → 1 across a pinned section) for the scenes below the hero.
const progress = (el) => {
  const r = el.getBoundingClientRect();
  const total = r.height - innerHeight;
  return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
};

const expand = document.querySelector('.expand');
const dial = document.querySelector('.dial-section');
const progs = [...dial.querySelectorAll('.prog')];
const knob = dial.querySelector('.knob');
const knobN = dial.querySelector('.knob-n');
const bar = dial.querySelector('.dial-progress');
const STEP = 360 / progs.length;

const ticks = knob.querySelector('.ticks');
const ns = 'http://www.w3.org/2000/svg';
progs.forEach((_, i) => {
  const a = (i * STEP - 90) * (Math.PI / 180);
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', 100 + Math.cos(a) * 64); line.setAttribute('y1', 100 + Math.sin(a) * 64);
  line.setAttribute('x2', 100 + Math.cos(a) * 70); line.setAttribute('y2', 100 + Math.sin(a) * 70);
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', 100 + Math.cos(a) * 82); t.setAttribute('y', 100 + Math.sin(a) * 82);
  t.textContent = String(i + 1);
  ticks.append(line, t);
});
const labels = [...ticks.querySelectorAll('text')];

let active = -1;
const setProgram = (i) => {
  if (i === active) return;
  active = i;
  progs.forEach((p, k) => p.classList.toggle('is-active', k === i));
  labels.forEach((t, k) => t.classList.toggle('on', k === i));
  knob.style.setProperty('--angle', `${i * STEP}deg`);
  knobN.textContent = String(i + 1).padStart(2, '0');
};

if (!reduce) {
  expand.classList.add('is-live');
  dial.classList.add('is-live');
  let queued = false;
  const update = () => {
    queued = false;
    expand.style.setProperty('--p', clamp(progress(expand) / 0.75, 0, 1).toFixed(4));
    const p = progress(dial);
    bar.style.setProperty('--p', p.toFixed(4));
    setProgram(Math.min(progs.length - 1, Math.floor(p * progs.length)));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
} else {
  setProgram(0);
}

const header = document.querySelector('.site-header');
const setHeader = () => header.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < 80);
addEventListener('scroll', setHeader, { passive: true });
setHeader();

const ritual = document.querySelector('.ritual');
new IntersectionObserver(([e], io) => {
  if (e.isIntersecting) { ritual.classList.add('is-in'); io.disconnect(); }
}, { threshold: 0.2 }).observe(ritual);
