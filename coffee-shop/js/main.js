// NorthShutter hero: scroll-scrubbed frames on a canvas, an invisible handoff to plate + cut-out at the last frame,
// then the cut-out cup stays fixed and keeps spinning (scroll-driven) while the page scrolls past it.
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const win = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const params = new URLSearchParams(location.search);
const RM = document.documentElement.classList.contains('rm');

const hero = $('#hero'), stage = $('.hero__stage'), heroCanvas = $('#hero-canvas'), cupCanvas = $('#cup-canvas');
const loader = $('#loader'), nav = $('#nav'), poster = $('#poster');
const hctx = heroCanvas.getContext('2d', { alpha: false });
const cctx = cupCanvas.getContext('2d');

const SCRUB_END = 0.97; // the frames finish at 97 % of the pinned hero; the release follows right after
const DPR_CAP = 1.5;
const manifest = await (await fetch('media/manifest.json')).json();
const N = manifest.count, LAST = manifest.last;
const FORCE_VIDEO = params.get('handoff') === 'video'; // QA: show the last video frame instead of the layered version

// ---------- view math: cover-crop centred on the cup, with a zoom-out floor on portrait screens ----------
let vw = 0, vh = 0, dpr = 1, navH = 68, setName = '', S = null, V = null;

function viewFor(set, w, h) {
  const [ux0, uy0, ux1, uy1] = set.union;
  const uw = ux1 - ux0, uh = uy1 - uy0, ucx = (ux0 + ux1) / 2 - set.cropX, ucy = (uy0 + uy1) / 2;
  let s = Math.max(w / set.w, h / set.h);
  const portrait = h > w;
  if (portrait) {
    const band = clamp(h * 0.25, 170, 280); // room under the frame for the headline
    s = Math.max(w / set.w, Math.min(s, (0.6 * w) / uw, (h - band) / set.h));
  }
  const dw = set.w * s, dh = set.h * s;
  const ox = clamp(w / 2 - ucx * s, w - dw, 0);
  let oy = 0;
  if (dh >= h) oy = clamp((navH * 0.5 + h) / 2 - ucy * s, h - dh, 0);
  return { s, ox, oy, dw, dh, portrait };
}

function pickSet(w, h) {
  const m = manifest.sets.mobile;
  if (h > w) { const v = viewFor(m, w, h); if (v.dw >= w - 0.5) return 'mobile'; }
  return 'desktop';
}

// ---------- loading: blobs for every frame, a small window of decoded bitmaps ----------
const media = {};
function makeStore(set, kind) {
  return { kind, set, blobs: new Array(N).fill(null), bmps: new Array(N).fill(null), decoding: new Map(), fetched: 0, started: false };
}
const url = (name, kind, i) => `media/${name}/${kind}/${String(i).padStart(3, '0')}.webp`;

function anchors(n) {
  const out = [0, n - 1], seen = new Set(out); let spans = [[0, n - 1]];
  while (spans.length) { const nx = []; for (const [a, b] of spans) { if (b - a <= 1) continue; const m = (a + b) >> 1; if (!seen.has(m)) { seen.add(m); out.push(m); } nx.push([a, m], [m, b]); } spans = nx; }
  return out;
}

async function fetchAll(store, name, onProgress) {
  if (store.started) return; store.started = true;
  const order = [...new Set([...anchors(N).slice(0, 9), ...Array.from({ length: N }, (_, i) => i)])];
  let k = 0;
  const worker = async () => {
    while (k < order.length) {
      const i = order[k++];
      try { store.blobs[i] = await (await fetch(url(name, store.kind, i))).blob(); store.fetched++; onProgress?.(); requestRender(); } catch {}
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

function want(store, centre, back, ahead) {
  // decode a window around the wanted frame, release the rest
  for (let i = 0; i < N; i++) {
    const keep = (i >= centre - back - 2 && i <= centre + ahead + 2) || i === LAST;
    if (!keep && store.bmps[i]) { store.bmps[i].close(); store.bmps[i] = null; }
  }
  for (let d = 0; d <= Math.max(back, ahead); d++) {
    for (const i of [centre + d, centre - d]) {
      if (i < 0 || i >= N || (i > centre + ahead) || (i < centre - back)) continue;
      if (store.bmps[i] || store.decoding.has(i) || !store.blobs[i] || store.decoding.size >= 3) continue;
      store.decoding.set(i, createImageBitmap(store.blobs[i]).then((b) => { store.bmps[i] = b; store.decoding.delete(i); requestRender(); }, () => store.decoding.delete(i)));
    }
  }
}
function nearest(store, i) {
  for (let d = 0; d < N; d++) { if (store.bmps[i - d]) return i - d; if (store.bmps[i + d]) return i + d; }
  return -1;
}

async function loadBitmap(src) { return createImageBitmap(await (await fetch(src)).blob()); }

// ---------- sizing ----------
function measure() {
  vw = innerWidth; vh = stage.clientHeight; dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  navH = nav.offsetHeight;
  const next = pickSet(vw, vh);
  if (next !== setName) useSet(next);
  V = viewFor(S, vw, vh);
  for (const c of [heroCanvas, cupCanvas]) {
    const w = Math.round(vw * dpr), h = Math.round(vh * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.style.height = vh + 'px';
  }
  for (const c of [hctx, cctx]) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; }
  shownHero = ''; shownCup = '';
  buildShadow();
}

function useSet(name) {
  setName = name; S = manifest.sets[name];
  if (!media[name]) media[name] = { f: makeStore(S, 'f'), cup: makeStore(S, 'cup'), plate: null, cutLast: null };
  const M = media[name];
  fetchAll(M.f, name, updateLoader);
  if (!M.plateLoading) { M.plateLoading = loadBitmap(`media/${name}/plate.webp`).then((b) => { M.plate = b; requestRender(); }); }
  if (cupWanted) startCupLoad();
}

let cupWanted = false;
function startCupLoad() {
  cupWanted = true;
  const M = media[setName];
  if (!M.cutLastLoading) M.cutLastLoading = loadBitmap(url(setName, 'cup', LAST)).then((b) => { M.cutLast = b; buildShadow(); requestRender(); });
  fetchAll(M.cup, setName);
}

// ---------- loader ----------
let loaderDone = false;
function updateLoader() {
  const f = media[setName].f;
  loader.style.setProperty('--load', (f.fetched / N).toFixed(3));
  let run = 0; while (run < N && f.blobs[run]) run++;
  if (!loaderDone && (f.fetched === N || (run >= 30 && f.blobs[LAST]))) {
    loaderDone = true; loader.classList.add('is-done'); document.body.classList.add('is-ready');
  }
}

// ---------- the drop shadow sprite (built once from the last cut-out) ----------
let shadow = null;
function buildShadow() {
  const M = media[setName]; if (!M?.cutLast) return;
  const b = M.cutLast, blur = Math.round(S.cellH * 0.07), pad = blur * 3;
  const c = document.createElement('canvas'); c.width = b.width + pad * 2; c.height = b.height + pad * 2;
  const x = c.getContext('2d');
  // classic trick: draw the image far off-canvas and keep only its shadow
  x.shadowColor = 'rgba(0,0,0,1)'; x.shadowBlur = blur; x.shadowOffsetX = c.width + 1000;
  x.drawImage(b, pad - c.width - 1000, pad);
  shadow = { c, pad };
}

// ---------- spin after the release (scroll-driven) ----------
// The page below the hero counts as 4 parts: over the first 3 the cup turns once one way (last frame back to the
// first), over the last part once the other way (first frame forward to the last), so the page ends logo-facing.
// Both turns run along the real frames, so there is never a jump between the clip's last and first frame.
function spinFrame(y, yFree, maxY) {
  const s = clamp((y - yFree) / Math.max(1, maxY - yFree), 0, 1);
  return Math.round(s <= 0.75 ? LAST * (1 - s / 0.75) : LAST * ((s - 0.75) / 0.25));
}

// ---------- render ----------
const QA = {};
// the release: when the cup leaves the video it gets an elastic kick (damped spring, time-based so it plays out
// the same however fast the scroll is), with squash and stretch from the spring's velocity and a small tilt.
const spring = { x: 0, v: 0, t: 0, active: false, prevD: 0 };
const SPRING_K = 190, SPRING_C = 6.2;
function kick(v) { spring.v += v; spring.active = true; }
function stepSpring(now) {
  if (!spring.active) { spring.t = now; return; }
  let dt = Math.min(0.05, (now - spring.t) / 1000 || 0.016); spring.t = now;
  while (dt > 0) { const h = Math.min(dt, 1 / 240); const a = -SPRING_K * spring.x - SPRING_C * spring.v; spring.v += a * h; spring.x += spring.v * h; dt -= h; }
  if (Math.abs(spring.x) < 0.002 && Math.abs(spring.v) < 0.02) { spring.x = 0; spring.v = 0; spring.active = false; }
  dirty = true;
}
let raf = 0, lastY = -1, shownHero = '', shownCup = '', dirty = true;
function requestRender() { dirty = true; }

const intro = $('#hero-intro'), cap2 = $('#cap-2'), cap3 = $('#cap-3'), cue = $('#cue');
const styleCache = new WeakMap();
function setFx(el, o, y) {
  const v = `${o.toFixed(3)}|${y.toFixed(1)}`;
  if (styleCache.get(el) === v) return; styleCache.set(el, v);
  el.style.opacity = o; el.style.transform = `translate3d(0,${y}px,0)`;
  el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
}

function drawHero(key, bmp) {
  if (shownHero === key) return;
  hctx.fillStyle = '#0e0a07'; hctx.fillRect(0, 0, heroCanvas.width, heroCanvas.height);
  hctx.drawImage(bmp, V.ox * dpr, V.oy * dpr, V.dw * dpr, V.dh * dpr);
  if (V.dh < vh - 0.5) { // portrait: fade the bottom edge of the frame into the ground
    const y1 = (V.oy + V.dh) * dpr, y0 = y1 - Math.min(140, V.dh * 0.22) * dpr;
    const g = hctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(14,10,7,0)'); g.addColorStop(1, 'rgba(14,10,7,1)');
    hctx.fillStyle = g; hctx.fillRect(0, y0, heroCanvas.width, y1 - y0 + 1);
  }
  shownHero = key;
  if (poster.style.display !== 'none') poster.style.display = 'none';
}

function composite(M) {
  // plate + last cut-out at 1:1 on the frame grid (no resampling between the two layers)
  if (M.comp?.set === setName) return M.comp.c;
  const c = document.createElement('canvas'); c.width = S.w; c.height = S.h;
  const x = c.getContext('2d'); const cl = S.cells[LAST];
  x.drawImage(M.plate, 0, 0); x.drawImage(M.cutLast, cl.x - S.cropX, cl.y);
  M.comp = { set: setName, c };
  return c;
}

let laneCache = null;
function laneGeom() {
  // the cup's lane on the right; sized from the widest frame of the spin so no frame gets near the edge
  if (laneCache?.vw === vw && laneCache?.vh === vh && laneCache?.set === setName) return laneCache.g;
  const lane = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lane')) / 100 * vw;
  const gutter = parseFloat(getComputedStyle(nav).paddingLeft) || 16;
  const maxW = Math.max(...S.cells.map((c) => c.w)), maxH = Math.max(...S.cells.map((c) => c.h));
  const phone = vw < 640;
  const w = phone ? lane - gutter - 6 : Math.min(lane - 56, vh * 0.42 * maxW / maxH);
  const k = w / maxW;
  const g = { cx: vw - (phone ? gutter + w / 2 : lane / 2), cy: navH + (vh - navH) * 0.54, k };
  laneCache = { vw, vh, set: setName, g };
  return g;
}

function render() {
  raf = requestAnimationFrame(loop);
}
function loop(t) {
  raf = requestAnimationFrame(loop);
  lenis?.raf(t);
  stepSpring(t);
  const y = scrollY;
  if (y === lastY && !dirty) return;
  lastY = y; dirty = false;
  if (!S) return;
  const M = media[setName];

  const top = hero.offsetTop, len = hero.offsetHeight - vh;
  const p = clamp((y - top) / len, 0, 1);
  const fi = Math.round(clamp(p / SCRUB_END, 0, 1) * LAST);

  // hero text, driven by the same progress as the frames
  setFx(intro, 1 - smooth(win(p, 0.05, 0.2)), -48 * smooth(win(p, 0.05, 0.2)));
  setFx(cap2, smooth(win(p, 0.3, 0.38)) * (1 - smooth(win(p, 0.52, 0.6))), 28 * (1 - smooth(win(p, 0.3, 0.38))) - 28 * smooth(win(p, 0.52, 0.6)));
  // the last caption fades as the café scrolls away, so the departing cup never crosses readable text
  const gone = smooth(clamp((y - (hero.offsetTop + hero.offsetHeight - vh)) / (vh * 0.28), 0, 1));
  setFx(cap3, smooth(win(p, 0.68, 0.78)) * (1 - gone), 28 * (1 - smooth(win(p, 0.68, 0.78))));
  setFx(cue, 1 - win(p, 0, 0.04), 0);
  nav.classList.toggle('is-solid', y > top + hero.offsetHeight - vh * 0.5);

  if (fi > LAST * 0.4) startCupLoad();
  const layered = fi === LAST && M.plate && M.cutLast && !FORCE_VIDEO;
  const heroOnScreen = y < top + hero.offsetHeight;
  const yFree = top + len;                              // the stage unpins here
  const maxY = document.documentElement.scrollHeight - innerHeight;
  const sq = { i: spinFrame(y, yFree, maxY), j: -1, w: 0 };
  const d = smooth(clamp((y - yFree) / (vh * 0.55), 0, 1));
  // while the cup still sits on its last frame in place, plate + cut-out are composited 1:1 at the frames' own
  // resolution and drawn exactly like a video frame (same resampling), so the swap is pixel-identical. The two
  // layers split only when the cup's frame changes, which hides any resampling difference at its edge.
  const merged = layered && sq.i === LAST && d === 0 && !spring.active;
  if (layered) {
    if (spring.prevD === 0 && d > 0) kick(19);        // leaving the video: pop
    else if (spring.prevD > 0 && d === 0) kick(11);   // settling back into it
    spring.prevD = d;
  }

  // hero canvas
  if (heroOnScreen) {
    if (merged) drawHero('composite', composite(M));
    else if (layered) drawHero('plate', M.plate);
    else {
      want(M.f, fi, 4, 9);
      const use = M.f.bmps[fi] ? fi : nearest(M.f, fi);
      if (use >= 0) drawHero('f' + use, M.f.bmps[use]);
    }
  }
  if (!layered) { // where the cup is on screen, for QA
    const c = S.cells[fi];
    QA.rect = { phase: 'hero', fi, cx: V.ox + (c.x - S.cropX + S.cellW / 2 + c.dx) * V.s, cy: V.oy - (y > top + len ? y - top - len : 0) + (c.y + S.cellH / 2 + c.dy) * V.s, w: c.w * V.s, h: c.h * V.s };
  }

  // cup canvas
  if (merged) { const c = S.cells[LAST]; QA.rect = { phase: 'handoff', fi: LAST, cx: V.ox + (c.x - S.cropX + S.cellW / 2 + c.dx) * V.s, cy: V.oy + (c.y + S.cellH / 2 + c.dy) * V.s, w: c.w * V.s, h: c.h * V.s, d: 0 }; }
  if (!layered || merged) { if (cupCanvas.classList.contains('is-on')) { cupCanvas.classList.remove('is-on'); shownCup = ''; } return; }
  cupCanvas.classList.add('is-on');

  const c = S.cells[LAST];
  const k0 = V.s, ax0 = V.ox + (c.x - S.cropX + S.cellW / 2 + c.dx) * k0, ay0 = V.oy + (c.y + S.cellH / 2 + c.dy) * k0;
  const L = laneGeom();
  const k = lerp(k0, L.k, d), ax = lerp(ax0, L.cx, d), ay = lerp(ay0, L.cy, d);

  want(M.cup, sq.i, 6, 8);
  const ci = M.cup.bmps[sq.i] ? sq.i : (sq.i === LAST ? -1 : nearest(M.cup, sq.i));
  const bmp = sq.i === LAST || ci < 0 ? M.cutLast : M.cup.bmps[ci];
  const cell = S.cells[bmp === M.cutLast ? LAST : ci];
  QA.rect = { phase: d > 0 ? 'fall' : 'handoff', fi: sq.i, cx: ax, cy: ay, w: cell.w * k, h: cell.h * k, d };
  const pop = spring.x, jel = clamp(spring.v / Math.sqrt(SPRING_K), -1.5, 1.5);
  const sx = (1 + 0.13 * pop) * (1 - 0.08 * jel), sy = (1 + 0.13 * pop) * (1 + 0.09 * jel), rot = 0.06 * pop;
  QA.rect.w *= Math.max(sx, sy); QA.rect.h *= Math.max(sx, sy);
  const key = `${bmp === M.cutLast ? LAST : ci}|${sq.j}|${sq.w.toFixed(2)}|${ax.toFixed(2)}|${ay.toFixed(2)}|${k.toFixed(4)}|${d.toFixed(3)}|${pop.toFixed(4)}|${jel.toFixed(4)}`;
  if (key === shownCup) return;
  shownCup = key;
  cctx.clearRect(0, 0, cupCanvas.width, cupCanvas.height);
  const shA = 0.55 * d + 0.3 * Math.max(0, pop);
  if (shadow && shA > 0.005) {
    const sk = k * dpr * (1 + 0.18 * Math.max(0, pop)), sw = shadow.c.width * sk, sh = shadow.c.height * sk;
    cctx.globalAlpha = Math.min(0.7, shA);
    cctx.drawImage(shadow.c, ax * dpr - sw / 2, ay * dpr - sh / 2 + S.cellH * (0.06 + 0.05 * Math.max(0, pop)) * k * dpr, sw, sh);
    cctx.globalAlpha = 1;
  }
  const drawCell = (b, cl, alpha) => {
    cctx.globalAlpha = alpha;
    cctx.setTransform(sx * Math.cos(rot) * dpr, sx * Math.sin(rot) * dpr, -sy * Math.sin(rot) * dpr, sy * Math.cos(rot) * dpr, ax * dpr, ay * dpr);
    cctx.drawImage(b, -(S.cellW / 2 + cl.dx) * k, -(S.cellH / 2 + cl.dy) * k, S.cellW * k, S.cellH * k);
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.globalAlpha = 1;
  };
  drawCell(bmp, cell, 1);
  if (sq.j >= 0 && sq.w > 0) { want(M.cup, sq.j, 1, 1); const bj = M.cup.bmps[sq.j]; if (bj) drawCell(bj, S.cells[sq.j], sq.w); }
}

// ---------- reduced motion: a still hero (the last frame), no pin, no falling cup ----------
async function stillHero() {
  measure();
  const b = await loadBitmap(url(setName, 'f', LAST));
  drawHero('still', b);
  loader.classList.add('is-done');
  addEventListener('resize', () => { measure(); drawHero('still', b); });
}

// ---------- boot ----------
let lenis = null;
if (RM) {
  await stillHero();
} else {
  measure();
  if (window.Lenis && params.get('lenis') !== 'off') {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href'); const el = id === '#top' ? 0 : document.querySelector(id); if (el === null) return;
      e.preventDefault(); lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    });
  }
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); requestRender(); }, 80); });
  document.fonts?.ready.then(requestRender);
  render();
}

// section reveals
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.rv').forEach((el) => io.observe(el));

window.__ns = { SCRUB_END, QA, get loaded() { const M = media[setName]; return { f: M.f.fetched, cup: M.cup.fetched, plate: !!M.plate, cutLast: !!M.cutLast }; }, manifest, get set() { return setName; }, get view() { return V; }, lane: () => laneGeom() };
