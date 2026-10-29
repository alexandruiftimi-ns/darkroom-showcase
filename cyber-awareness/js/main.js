import { createFrameScrubber } from './scrub-frames.js?v=6';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: fine */ } },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFXZ$%&';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const rnd = (str) => str[(Math.random() * str.length) | 0];
const gsap = window.gsap;
if (gsap && window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

/* ---------- motion preference: system setting, overridable with the FX chip ---------- */
const sysReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;
let motionOn = store.get('nw-motion') ? store.get('nw-motion') === 'on' : !(sysReduced || saveData);
const chip = $('#motionToggle');
function paintChip() {
  document.documentElement.classList.toggle('motion-off', !motionOn);
  chip.setAttribute('aria-pressed', String(motionOn));
  $('.chip__label', chip).textContent = motionOn ? 'FX on' : 'FX off';
}
paintChip();

/* =====================================================================
   STORY: the film scrubs between fixed breaking points.
   STOPS are the frame numbers (seq_XXXX, 1-based) picked by the client. A stop with a hand-finished still
   (seq/stops/stop-<n>.webp, web copies of the client's 4K masters in frames/) shows that still when the film reaches it.
   Solid mode: nothing is ever drawn see-through, it is always one whole frame or one still.
   Scrolling is free: the film follows the scroll and rests wherever the scroll rests (SNAP = true glides to a stop).
   ===================================================================== */
const STOPS = [5, 14.5, 26.2, 47.5, 67.5, 80.5, 91.5, 105.5, 127.5, 140.5, 151.5];
const STILLS = STOPS.slice(1); // every stop after the opening frame has a finished still
const stillDir = matchMedia('(max-width: 1023px)').matches ? 'seq/stops/mobile/' : 'seq/stops/';
const SNAP = false; // 2026-10-29: off, the glide fought touch momentum and felt like a glitch on phones and desktop
const N = STOPS.length;
const story = $('#story');
const canvas = $('.story__canvas', story);
const chapters = $$('.ch', story);
const nav = $('.nav');
const hudFrame = $('#hudFrame'), hudTime = $('#hudTime'), hudStop = $('#hudStop'), rail = $('#hudRail');
let scrubber = null;

// progress 0..1 -> fractional frame index (0-based), piecewise linear between stops
const mapFrame = (p) => {
  const seg = clamp(p, 0, 1) * (N - 1);
  const i = Math.min(N - 2, Math.floor(seg));
  return STOPS[i] - 1 + (STOPS[i + 1] - STOPS[i]) * (seg - i);
};

async function startScrubber() {
  scrubber?.destroy();
  story.classList.remove('is-live');
  scrubber = await createFrameScrubber({
    canvas, scene: story, manifestUrl: 'seq/manifest.json', window: 6, mapFrame,
    extraAnchors: STOPS.map((f) => Math.min(150, Math.floor(f) - 1)), blend: false,
    stills: STILLS.map((f) => ({ pos: f - 1, url: `${stillDir}stop-${f}.webp` })),
    reducedMotion: !motionOn, restFrame: 'last',
    onFrame(pos) {
      const fr = Math.round((pos + 1) * 10) / 10;
      hudFrame.textContent = Number.isInteger(fr) ? String(fr).padStart(3, '0') : fr.toFixed(1).padStart(5, '0');
      const t = pos / 15;
      hudTime.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}.${String(Math.floor((t % 1) * 100)).padStart(2, '0')}`;
    },
  });
  story.classList.add('is-live');
}
startScrubber().catch(() => { /* poster stays; the page still reads */ });

// HUD rail: a tick per stop, a label per chapter start
const marks = $('#hudMarks');
chapters.forEach((ch) => {
  const i = +ch.dataset.stop;
  const li = document.createElement('li');
  li.style.setProperty('--at', i / (N - 1));
  li.dataset.stop = i;
  if (ch.dataset.label) li.textContent = ch.dataset.label; else li.className = 'tick';
  marks.append(li);
});
const markEls = $$('li', marks);

// the sticky stage's height, not innerHeight, so the phone address bar showing/hiding doesn't shift the story
const geo = () => { const top = story.offsetTop; return { top, end: top + story.offsetHeight - (canvas.clientHeight || innerHeight) }; };
const storyProgress = () => { const g = geo(); return clamp((scrollY - g.top) / Math.max(1, g.end - g.top), 0, 1); };

let storyRaf = 0;
function updateStory() {
  storyRaf = 0;
  const seg = storyProgress() * (N - 1);
  const idx = Math.round(seg);
  const near = Math.abs(seg - idx) < (SNAP ? 0.28 : 0.4); // copy only shows when the film is at (or arriving at) a stop
  chapters.forEach((ch) => ch.classList.toggle('is-on', near && +ch.dataset.stop === idx));
  rail.style.height = `${(seg / (N - 1)) * 100}%`;
  let labelIdx = 0;
  markEls.forEach((m, i) => { if (!m.classList.contains('tick') && +m.dataset.stop <= idx) labelIdx = i; });
  markEls.forEach((m, i) => m.classList.toggle('is-on', m.classList.contains('tick') ? +m.dataset.stop === idx : i === labelIdx));
  hudStop.textContent = String(idx + 1).padStart(2, '0');
  nav.classList.toggle('is-solid', story.getBoundingClientRect().bottom < 80);
}
addEventListener('scroll', () => { if (!storyRaf) storyRaf = requestAnimationFrame(updateStory); }, { passive: true });
updateStory();

/* ---------- breaking points: scrolling stays free (fast, long, flings, drags); when it comes to rest inside the
   story, it glides to a stop: the next one in the direction of travel, or back if it was only nudged ---------- */
const stopY = (i) => { const g = geo(); return Math.round(g.top + (i / (N - 1)) * (g.end - g.top)); };
const atStop = (i) => Math.abs(scrollY - stopY(i)) <= 3;
const NUDGE = 0.15; // share of one step that counts as "meant to move on"
let animating = false, tweenRaf = 0, touching = false, lastStop = 0;
const jump = (y) => scrollTo({ top: y, behavior: 'instant' });

function cancelGlide() { if (animating) { cancelAnimationFrame(tweenRaf); animating = false; } }
function goTo(i) {
  i = clamp(i, 0, N - 1);
  lastStop = i;
  const to = stopY(i), from = scrollY, dist = to - from;
  cancelAnimationFrame(tweenRaf);
  if (!motionOn || Math.abs(dist) < 2) { jump(to); animating = false; return; }
  animating = true;
  const dur = clamp(450 + (Math.abs(dist) / innerHeight) * 500, 450, 1100);
  const t0 = performance.now();
  const ease = (t) => 1 - (1 - t) ** 3; // easeOutCubic: it continues the user's motion, then settles
  const step = (now) => {
    if (!animating) return;
    const t = Math.min(1, (now - t0) / dur);
    jump(from + dist * ease(t));
    if (t < 1) tweenRaf = requestAnimationFrame(step); else animating = false;
  };
  tweenRaf = requestAnimationFrame(step);
}
function settle() {
  if (!SNAP || animating || touching) return;
  const g = geo();
  if (scrollY < g.top - 2 || scrollY > g.end + 2) return; // outside the story: free page
  const seg = storyProgress() * (N - 1);
  const lo = Math.floor(seg), hi = Math.ceil(seg);
  if (lo === hi) { lastStop = lo; return; }
  let target;
  if (seg > lastStop) target = seg - lo > NUDGE ? hi : lo;        // travelling down
  else if (seg < lastStop) target = hi - seg > NUDGE ? lo : hi;   // travelling up
  else target = Math.round(seg);
  if (atStop(target)) { lastStop = target; return; }
  goTo(target);
}
// any new input from the user takes over immediately
['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => addEventListener(t, cancelGlide, { passive: true }));
addEventListener('touchstart', () => { touching = true; }, { passive: true });
addEventListener('touchend', () => { touching = false; clearTimeout(settleT); settleT = setTimeout(settle, 140); }, { passive: true });
let settleT = 0;
addEventListener('scroll', () => { if (!animating) { clearTimeout(settleT); settleT = setTimeout(settle, 140); } }, { passive: true });
if ('onscrollend' in window) addEventListener('scrollend', () => { if (!animating) { clearTimeout(settleT); settle(); } });
addEventListener('resize', () => { const g = geo(); if (SNAP && !animating && scrollY >= g.top - 2 && scrollY <= g.end + 2) jump(stopY(clamp(Math.round(storyProgress() * (N - 1)), 0, N - 1))); });
addEventListener('load', () => { lastStop = Math.round(storyProgress() * (N - 1)); settle(); });

chip.addEventListener('click', () => {
  motionOn = !motionOn;
  store.set('nw-motion', motionOn ? 'on' : 'off');
  paintChip();
  startScrubber().catch(() => {});
});

/* boot log in the HUD corner (non-blocking) */
(async () => {
  const lines = ['> handshake ......... ok', '> mode: WHITE_HAT', '> scope: authorised', `> breaking points: ${N}`, '> tracking subject…'];
  const el = $('#bootLog');
  for (const l of lines) {
    if (!motionOn) { el.innerHTML = lines.join('<br>'); return; }
    const row = document.createElement('div'); el.append(row);
    for (let i = 1; i <= l.length; i++) { row.textContent = l.slice(0, i); await new Promise((r) => setTimeout(r, 18)); }
    await new Promise((r) => setTimeout(r, 160));
  }
})();

/* ---------- custom cursor (fine pointer only) ---------- */
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const pointer = { x: -9999, y: -9999 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
if (finePointer) {
  const cur = $('.cursor'), xy = $('.cursor__xy');
  let cx = innerWidth / 2, cy = innerHeight / 2, raf = 0;
  const loop = () => {
    cx += (pointer.x - cx) * 0.35; cy += (pointer.y - cy) * 0.35;
    cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    raf = Math.abs(pointer.x - cx) + Math.abs(pointer.y - cy) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', () => {
    document.documentElement.classList.add('has-cursor');
    xy.textContent = `${String(pointer.x).padStart(3, '0')}·${String(pointer.y).padStart(3, '0')}`;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => document.documentElement.classList.remove('has-cursor'));
  document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hot', !!e.target.closest('a, button, label, .flag, input, .card')));
}

/* ---------- text scramble on hover (nav) ---------- */
function scramble(el) {
  if (!motionOn || el._busy) return;
  el.dataset.final ??= el.textContent;
  el._busy = true;
  let frame = 0;
  const total = 14;
  const step = () => {
    const final = el.dataset.final;
    el.textContent = [...final].map((ch, i) => (ch === ' ' || frame / total > i / final.length ? ch : rnd(GLYPHS))).join('');
    if (++frame <= total) requestAnimationFrame(step); else { el.textContent = el.dataset.final; el._busy = false; }
  };
  step();
}
$$('[data-scramble]').forEach((el) => {
  el.addEventListener('pointerenter', () => scramble(el));
  el.addEventListener('focus', () => scramble(el));
});

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -12% 0px' });
$$('.reveal').forEach((el) => io.observe(el));

/* ---------- decrypting section headlines ---------- */
function splitChars(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.append(' '); return; }
          const ws = document.createElement('span'); ws.className = 'dc-w';
          [...w].forEach((c) => { const cs = document.createElement('span'); cs.className = 'dc-c'; cs.textContent = c; cs.dataset.c = c; ws.append(cs); });
          frag.append(ws);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  walk(el);
  $$('.dc-w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  return $$('.dc-c', el);
}
function decrypt(chars) {
  const t0 = performance.now();
  const plan = chars.map((c, i) => ({ c, end: 250 + i * 22 + Math.random() * 300 }));
  plan.forEach(({ c }) => c.classList.add('is-scr'));
  let last = 0;
  const tick = (now) => {
    const t = now - t0;
    const swap = now - last > 45; if (swap) last = now;
    let busy = false;
    for (const p of plan) {
      if (p.done) continue;
      if (t >= p.end) { p.c.textContent = p.c.dataset.c; p.c.classList.remove('is-scr'); p.done = true; }
      else { busy = true; if (swap) p.c.textContent = rnd(GLYPHS); }
    }
    if (busy) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
if (motionOn) {
  $$('.sec__title').forEach((h) => {
    const chars = splitChars(h);
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); decrypt(chars); } }, { rootMargin: '0px 0px -20% 0px' });
    o.observe(h);
  });
}

/* ---------- spot the phish ---------- */
const mail = $('#mail');
const found = new Set();
$$('.flag').forEach((btn) => btn.addEventListener('click', (e) => {
  const n = +btn.dataset.flag;
  if (found.has(n)) return;
  found.add(n);
  btn.classList.add('is-found');
  btn.dataset.n = String(n + 1);
  $(`#flagList li[data-flag="${n}"]`).classList.add('is-found');
  $('#flagCount').textContent = found.size;
  $('#flagBar').style.width = `${found.size * 20}%`;
  if (motionOn && gsap) { // sonar ping where you clicked
    const r = mail.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const ping = document.createElement('span'); ping.className = 'ping';
    const px = e.clientX || b.left + b.width / 2, py = e.clientY || b.top + b.height / 2;
    ping.style.left = `${px - r.left}px`; ping.style.top = `${py - r.top}px`;
    mail.append(ping);
    gsap.fromTo(ping, { scale: 0.4, opacity: 1 }, { scale: 5, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ping.remove() });
  }
  if (found.size === 5) {
    $('#flagDone').hidden = false;
    const stamp = $('#stamp');
    stamp.classList.add('is-on');
    if (motionOn && gsap) gsap.fromTo(stamp, { scale: 2.6, rotate: -24, opacity: 0 }, { scale: 1, rotate: -8, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
  }
}));
$('.flag--link').addEventListener('click', (e) => e.preventDefault());
if (gsap && finePointer) { // the email tilts toward the cursor
  const rx = gsap.quickTo(mail, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(mail, 'rotationY', { duration: 0.6, ease: 'power3' });
  mail.addEventListener('pointermove', (e) => {
    if (!motionOn) return;
    const r = mail.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 7);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 5);
  });
  mail.addEventListener('pointerleave', () => { rx(0); ry(0); });
}

/* ---------- password lab (all local: no network, no storage) ---------- */
const COMMON = ['123456', 'password', '123456789', '12345678', '12345', 'qwerty', 'abc123', 'password1', '111111', '123123', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'iloveyou', 'football', 'baseball', 'sunshine', 'princess', 'qwerty123', '1q2w3e4r', 'zaq12wsx', 'master', 'shadow', 'superman', 'trustno1', 'passw0rd', 'p@ssw0rd', 'hello', 'freedom', 'whatever', 'qazwsx', 'starwars', 'login', 'secret', 'summer', 'winter', 'love', 'pokemon'];
const SEQS = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function estimate(pw) {
  if (!pw) return null;
  const lower = pw.toLowerCase();
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length;
  let bits = pw.length * Math.log2(Math.max(pool, 1));
  const unleet = lower.replace(/0/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/\$|5/g, 's');
  const common = COMMON.some((c) => lower === c || unleet === c || (c.length >= 5 && (lower.includes(c) || unleet.includes(c))));
  let pattern = /(.)\1{2,}/.test(pw);
  for (const s of SEQS) for (let i = 0; i + 4 <= s.length; i++) {
    const chunk = s.slice(i, i + 4);
    if (lower.includes(chunk) || lower.includes([...chunk].reverse().join(''))) pattern = true;
  }
  if (common) bits = Math.min(bits, 10);
  if (pattern) bits *= 0.6;
  if (/^[a-z]+\d{1,4}[!.?]?$/i.test(pw)) bits = Math.min(bits, 28); // word + digits: the first thing crackers try
  const seconds = 2 ** bits / 2 / 1e10;
  return { bits, seconds, len: pw.length >= 12, mix: classes >= 3, common: !common, pattern: !pattern };
}
function human(s) {
  if (s < 1) return 'instantly';
  const units = [['century', 3.156e9], ['year', 3.156e7], ['month', 2.63e6], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  if (s > 3.156e9 * 1000) return 'longer than humanity has existed';
  for (const [u, v] of units) if (s >= v) { const n = Math.floor(s / v); return `${n.toLocaleString()} ${u === 'century' ? (n > 1 ? 'centuries' : 'century') : u + (n > 1 ? 's' : '')}`; }
  return 'instantly';
}

// brute-force visual: slots cycle and lock left to right; the weaker the password, the more of it falls
const crack = $('#crack');
const pw = $('#pw');
let crackRaf = 0;
function runCrack(r, value, visible) {
  cancelAnimationFrame(crackRaf);
  if (!r) { crack.innerHTML = '<span class="crack__idle">[ idle ] waiting for a target…</span>'; return; }
  const len = Math.min(value.length, 24);
  const share = r.seconds < 1 ? 1 : r.seconds < 86400 ? 0.7 : r.seconds < 3.156e9 ? 0.35 : 0;
  const lockN = Math.round(len * share);
  crack.innerHTML = '';
  const slots = Array.from({ length: len }, () => { const s = document.createElement('span'); s.className = 'crack__s'; crack.append(s); return s; });
  const msg = document.createElement('span'); msg.className = 'crack__msg'; crack.append(msg);
  const t0 = performance.now();
  const per = r.seconds < 1 ? 45 : 140;
  let lastSwap = 0;
  const tick = (now) => {
    const locked = Math.min(lockN, Math.floor((now - t0) / per));
    const swap = now - lastSwap > 50; if (swap) lastSwap = now;
    slots.forEach((s, i) => {
      if (i < locked) { s.classList.add('is-lock'); s.textContent = visible ? value[i] : '•'; }
      else if (swap) s.textContent = motionOn ? rnd(GLYPHS + LETTERS.toLowerCase()) : '·';
    });
    const all = locked >= slots.length;
    if (all) { msg.className = 'crack__msg r'; msg.textContent = '▸ access granted. Password cracked.'; }
    else if (lockN && locked >= lockN) { msg.className = 'crack__msg a'; msg.textContent = '▸ partial match… still guessing'; }
    else if (!lockN) { msg.className = 'crack__msg c'; msg.textContent = '▸ no match. The rig is still guessing.'; }
    else { msg.className = 'crack__msg'; msg.textContent = '▸ guessing…'; }
    if (!all && motionOn && crackVisible) crackRaf = requestAnimationFrame(tick);
  };
  crackRaf = requestAnimationFrame(tick);
}
let crackVisible = false;
new IntersectionObserver(([e]) => {
  crackVisible = e.isIntersecting;
  if (!crackVisible) cancelAnimationFrame(crackRaf); else if (pw.value) update();
}).observe(crack);

function update() {
  const r = estimate(pw.value);
  const meter = $('#pwMeter'), verdict = $('#pwVerdict');
  $$('#pwChecks li').forEach((li) => { li.className = r ? (r[li.dataset.c] ? 'ok' : 'bad') : ''; });
  runCrack(r, pw.value, pw.type === 'text');
  if (!r) { meter.style.width = '0'; verdict.textContent = 'Waiting for input…'; return; }
  const pct = clamp(r.bits / 90, 0.04, 1);
  const color = pct < 0.4 ? 'var(--red)' : pct < 0.7 ? 'var(--amber)' : 'var(--cyan)';
  meter.style.width = `${pct * 100}%`; meter.style.background = color;
  verdict.style.setProperty('--c', color);
  verdict.innerHTML = r.seconds < 1 ? 'Cracked <em>instantly</em>.' : `About <em>${human(r.seconds)}</em> to crack.`;
}
pw.addEventListener('input', update);
$('#pwEye').addEventListener('click', (e) => {
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? 'hide' : 'show';
  e.currentTarget.setAttribute('aria-pressed', String(show));
  if (pw.value) update();
});

const WORDS = 'anchor velvet orbit cactus lantern meteor harbor pixel copper falcon glacier mango neon ribbon saddle tundra violet walrus quartz ember canyon drizzle fable gravity hammock island jigsaw kettle lagoon marble nectar oyster pepper quiver rocket satin thunder umbrella voyage willow yodel zephyr biscuit cobalt dynamo eclipse fossil gadget hazel igloo jungle kayak lemon magnet nugget olive parrot quilt raven sprout tango ultra vapor wombat xenon yonder zigzag atlas bramble cinder dune ferret goblin hollow ivory jasper koala lilac mosaic nimbus opal plaza radar sonar tulip upbeat vortex wander'.split(' ');
$('#phraseBtn').addEventListener('click', () => {
  const r = new Uint32Array(4); crypto.getRandomValues(r);
  const out = [...r].map((n) => WORDS[n % WORDS.length]).join('-');
  const el = $('#phrase');
  el.dataset.final = out;
  if (motionOn) scramble(el); else el.textContent = out;
});

/* ---------- protocol cards ---------- */
// the last word of each title scrambles for ~1.5 s on hover, then reveals the real word
const SCRAMBLE_MS = 1500;
$$('.card h3').forEach((h) => {
  const words = h.textContent.trim().split(' ');
  const last = words.pop();
  h.setAttribute('aria-label', h.textContent.trim());
  h.innerHTML = `<span aria-hidden="true">${words.join(' ')} <span class="lw">${last}</span></span>`;
  const lw = $('.lw', h);
  let busy = false;
  const run = () => {
    if (busy || !motionOn) return;
    busy = true;
    lw.style.minWidth = `${lw.getBoundingClientRect().width}px`;
    lw.classList.remove('is-done'); lw.classList.add('is-scr');
    const t0 = performance.now(); let lastSwap = 0;
    const tick = (now) => {
      if (now - lastSwap > 55) { lastSwap = now; lw.textContent = [...last].map((c) => (/[a-z0-9]/i.test(c) ? rnd(LETTERS) : c)).join(''); }
      if (now - t0 < SCRAMBLE_MS) requestAnimationFrame(tick);
      else { lw.textContent = last; lw.classList.remove('is-scr'); void lw.offsetWidth; lw.classList.add('is-done'); busy = false; }
    };
    requestAnimationFrame(tick);
  };
  const card = h.closest('.card');
  card.addEventListener('pointerenter', run);
  card.addEventListener('focusin', run);
});
$$('.card').forEach((c) => {
  c.setAttribute('tabindex', '0');
  c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- self-check ---------- */
const form = $('#checkForm');
const boxes = $$('input[type="checkbox"]', form);
const RANKS = [[0, 'EXPOSED', 'var(--red)'], [38, 'PATCHING', 'var(--amber)'], [63, 'HARDENED', 'var(--cyan)'], [100, 'GHOST', 'var(--violet)']];
const scoreBox = $('.score'), scoreNum = $('#scoreNum');
let lastRank = null, shownScore = 0;
function burst() {
  if (!motionOn || !gsap) return;
  for (let i = 0; i < 26; i++) {
    const b = document.createElement('span'); b.className = 'burst'; b.textContent = rnd('01<>/#{}*+');
    scoreBox.append(b);
    const a = (i / 26) * Math.PI * 2, d = 110 + Math.random() * 90;
    gsap.fromTo(b, { x: 0, y: 0, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, duration: 1 + Math.random() * 0.5, ease: 'power3.out', onComplete: () => b.remove() });
  }
}
function score(first = false) {
  const n = boxes.filter((b) => b.checked).length;
  const s = Math.round((n / boxes.length) * 100);
  const [, rank, color] = RANKS.filter(([min]) => s >= min).pop();
  if (gsap && motionOn && !first) {
    const o = { v: shownScore };
    gsap.to(o, { v: s, duration: 0.7, ease: 'power2.out', onUpdate: () => { scoreNum.textContent = Math.round(o.v); } });
  } else scoreNum.textContent = s;
  shownScore = s;
  const fill = $('#scoreFill');
  fill.style.strokeDashoffset = String(326.7 * (1 - s / 100));
  fill.style.stroke = color; fill.style.color = color;
  const rk = $('#scoreRank'); rk.textContent = `STATUS: ${rank}`; rk.style.color = color;
  if (lastRank && rank !== lastRank && motionOn) { scoreBox.classList.remove('is-glitch'); void scoreBox.offsetWidth; scoreBox.classList.add('is-glitch'); }
  if (rank === 'GHOST' && lastRank && lastRank !== 'GHOST') burst();
  lastRank = rank;
  const fixes = boxes.filter((b) => !b.checked).slice(0, 3).map((b) => `<li>${b.dataset.fix}</li>`);
  $('#fixList').innerHTML = fixes.length ? fixes.join('') : '<li>All eight done. Share this page with someone who needs it.</li>';
  store.set('nw-check', boxes.map((b) => (b.checked ? 1 : 0)).join(''));
}
const saved = store.get('nw-check');
if (saved) boxes.forEach((b, i) => { b.checked = saved[i] === '1'; });
form.addEventListener('change', () => score());
form.addEventListener('reset', () => setTimeout(score));
score(true);
$('#copyBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const lines = boxes.map((b) => `${b.checked ? '[x]' : '[ ]'} ${b.closest('label').textContent.trim()}`);
  const text = `My NIGHTWATCH security self-check: ${shownScore}/100\n${lines.join('\n')}\n${location.href.split('#')[0]}`;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied ✓'; }
  catch { btn.textContent = 'Copy failed'; }
  setTimeout(() => { btn.textContent = 'Copy my checklist'; }, 1800);
});

/* =====================================================================
   GSAP layer (skipped when animation is off or the library didn't load)
   ===================================================================== */
if (gsap && window.ScrollTrigger && motionOn) {
  const ST = window.ScrollTrigger;

  // protocol cards fly in from depth; a scan beam sweeps the grid as you scroll through it
  gsap.from('.card', {
    y: 80, rotationX: -28, opacity: 0, transformOrigin: '50% 0%', duration: 1, ease: 'power3.out', stagger: 0.09,
    scrollTrigger: { trigger: '.cards', start: 'top 82%' },
  });
  const beam = document.createElement('span'); beam.className = 'cards__beam'; $('.cards').append(beam);
  gsap.fromTo(beam, { top: '0%', opacity: 1 }, { top: '100%', ease: 'none', scrollTrigger: { trigger: '.cards', start: 'top 70%', end: 'bottom 40%', scrub: true } });

  // email and intel panel slide in from opposite sides; the lab console and generator too
  gsap.from('#mail', { x: -60, opacity: 0, rotationY: 12, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.phish', start: 'top 80%' } });
  gsap.from('.intel', { x: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.phish', start: 'top 80%' } });
  gsap.from('.lab__console', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.lab', start: 'top 80%' } });
  gsap.from('.lab__gen > *', { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.lab', start: 'top 75%' } });
  gsap.from('.q', { x: 40, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: '.check__list', start: 'top 80%' } });
  gsap.from('.foot__steps li', { y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.foot__steps', start: 'top 85%' } });

  // big ghost numbers drift against the scroll
  $$('.sec[data-ghost]').forEach((sec) => {
    gsap.fromTo(sec, { '--gy': '80px' }, { '--gy': '-120px', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // footer word fills as you reach the end
  gsap.fromTo('.foot__fill', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: '.foot__giant', start: 'top 95%', end: 'max', scrub: true },
  });

  // ticker speeds up and leans with scroll speed
  const track = $('.ticker__track');
  track.style.animation = 'none';
  const tickerTween = gsap.to(track, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
  let boost = 0;
  ST.create({ onUpdate: (self) => { boost = clamp(Math.abs(self.getVelocity()) / 400, 0, 6); } });
  gsap.ticker.add(() => { boost *= 0.92; tickerTween.timeScale(1 + boost); gsap.set(track, { skewX: -boost * 1.5 }); });

  // magnetic buttons
  if (finePointer) $$('.sec .btn').forEach((b) => {
    const mx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' }), my = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.3); my((e.clientY - r.top - r.height / 2) * 0.4); });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ---------- live network field behind the sections: dots dodge the cursor, red threats die at its shield ---------- */
(() => {
  const cv = $('.netfield');
  if (!motionOn || !cv) return;
  const ctx = cv.getContext('2d');
  const GAP = 34, R = 150;
  let w = 0, h = 0, cols = 0, rows = 0, running = false, raf = 0;
  const packets = [];
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
  }
  function spawn() {
    const horiz = Math.random() < 0.5;
    packets.push({ horiz, threat: Math.random() < 0.2, line: ((Math.random() * (horiz ? rows : cols)) | 0) * GAP, pos: -40, speed: 1.2 + Math.random() * 2.4, len: 30 + Math.random() * 60, life: 1 });
  }
  function frame() {
    raf = 0;
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      let x = i * GAP, y = j * GAP;
      const dx = x - pointer.x, dy = y - pointer.y, d = Math.hypot(dx, dy);
      let a = 0.12, s = 1;
      if (d < R) { const k = 1 - d / R; x += (dx / (d || 1)) * k * 14; y += (dy / (d || 1)) * k * 14; a += k * 0.75; s += k * 1.4; }
      ctx.fillStyle = d < R ? `rgba(45,226,230,${a})` : `rgba(130,225,255,${a})`;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    if (packets.length < 16 && Math.random() < 0.08) spawn();
    for (let k = packets.length - 1; k >= 0; k--) {
      const p = packets[k];
      p.pos += p.speed;
      const px = p.horiz ? p.pos : p.line, py = p.horiz ? p.line : p.pos;
      if (p.threat && Math.hypot(px - pointer.x, py - pointer.y) < 90) p.life -= 0.08;
      if (p.pos - p.len > (p.horiz ? w : h) || p.life <= 0) {
        if (p.life <= 0) { ctx.strokeStyle = 'rgba(45,226,230,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.stroke(); }
        packets.splice(k, 1); continue;
      }
      const c = p.threat ? '255,46,77' : '45,226,230';
      const g = p.horiz ? ctx.createLinearGradient(p.pos - p.len, 0, p.pos, 0) : ctx.createLinearGradient(0, p.pos - p.len, 0, p.pos);
      g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(1, `rgba(${c},${0.55 * p.life})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (p.horiz) { ctx.moveTo(p.pos - p.len, p.line); ctx.lineTo(p.pos, p.line); } else { ctx.moveTo(p.line, p.pos - p.len); ctx.lineTo(p.line, p.pos); }
      ctx.stroke();
    }
    raf = requestAnimationFrame(frame);
  }
  size();
  addEventListener('resize', size);
  // runs only once the film has scrolled away
  const check = () => {
    const on = story.getBoundingClientRect().bottom < innerHeight * 0.6 && !document.hidden;
    cv.classList.toggle('is-on', on);
    if (on && !running) { running = true; raf = requestAnimationFrame(frame); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  };
  addEventListener('scroll', check, { passive: true });
  document.addEventListener('visibilitychange', check);
  check();
})();

/* ---------- terminal ---------- */
const term = $('#term'), out = $('#termOut'), input = $('#termInput'), tbtn = $('#termBtn');
const TIPS = [
  'Your email is the master key: whoever controls it can reset everything else. Protect it first.',
  'Banks never ask for your full password or one-time code by phone, text or email.',
  'Scanned a QR code on a parking meter? Check the web address before you pay.',
  'Public Wi-Fi: fine for browsing, but avoid banking unless the site is HTTPS and your device is updated.',
  'A family "safe word" defeats voice-clone scam calls.',
  'Unexpected 2FA code arrived? Someone has your password. Change it now.',
];
const print = (html) => { const d = document.createElement('div'); d.innerHTML = html; out.append(d); out.scrollTop = out.scrollHeight; };
const go = (id) => { closeTerm(); document.getElementById(id)?.scrollIntoView({ behavior: motionOn ? 'smooth' : 'auto' }); };
const CMDS = {
  help: () => print('<span class="c">commands</span>\n  whoami     who built this\n  tip        a random defense tip\n  scan       check this browser (local only)\n  phish      go to Spot the phish\n  pass       go to Password lab\n  check      go to Self-check\n  fx         toggle animation\n  clear      clear the screen\n  exit       close'),
  whoami: () => print('<span class="c">white hat</span>: we break into systems only with written permission,\nreport what we find, and help fix it. This page is the public version of that work.'),
  tip: () => print(`<span class="v">tip ›</span> ${TIPS[(Math.random() * TIPS.length) | 0]}`),
  scan: () => {
    const https = location.protocol === 'https:';
    print(`<span class="c">scanning this browser (nothing is sent anywhere)…</span>
  connection      ${https ? '<span class="c">HTTPS ✓</span>' : '<span class="r">not HTTPS (local preview)</span>'}
  cookies         ${navigator.cookieEnabled ? 'enabled' : 'disabled'}
  do-not-track    ${navigator.doNotTrack === '1' ? '<span class="c">on</span>' : 'off'}
  language        ${navigator.language}
  screen          ${screen.width}×${screen.height}
  timezone        ${Intl.DateTimeFormat().resolvedOptions().timeZone}
<span class="v">›</span> every site you visit can read lines like these. Combined, they make you trackable.`);
  },
  phish: () => go('phish'), pass: () => go('passlab'), check: () => go('selfcheck'),
  fx: () => { chip.click(); print(`animation ${motionOn ? 'on' : 'off'}`); },
  clear: () => { out.innerHTML = ''; },
  exit: () => closeTerm(),
  sudo: () => print('<span class="r">nice try.</span> privilege is earned with permission, not typed.'),
  hack: () => print('<span class="r">denied.</span> this terminal only does defense. try <span class="c">tip</span>.'),
};
function openTerm() {
  term.hidden = false; tbtn.setAttribute('aria-expanded', 'true');
  if (!out.childElementCount) print('NIGHTWATCH shell v1.0 · <span class="c">white hat mode</span>\ntype <span class="c">help</span>');
  input.focus();
}
function closeTerm() { term.hidden = true; tbtn.setAttribute('aria-expanded', 'false'); }
tbtn.addEventListener('click', () => (term.hidden ? openTerm() : closeTerm()));
$('#termClose').addEventListener('click', () => { closeTerm(); tbtn.focus(); });
$('#termForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const cmd = input.value.trim().toLowerCase(); input.value = '';
  if (!cmd) return;
  print(`<span class="c">$</span> ${cmd.replace(/[<>&]/g, '')}`);
  (CMDS[cmd.split(' ')[0]] || (() => print(`command not found: ${cmd.replace(/[<>&]/g, '')} · type <span class="c">help</span>`)))();
});
addEventListener('keydown', (e) => {
  if (e.key === '`' && !e.target.closest('input, textarea')) { e.preventDefault(); term.hidden ? openTerm() : closeTerm(); }
  if (e.key === 'Escape' && !term.hidden) { closeTerm(); tbtn.focus(); }
});
