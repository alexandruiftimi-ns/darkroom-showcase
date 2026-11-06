// Scroll-scrubbed image sequence on a <canvas>. Framework-free ES module.
//
//   import { createFrameScrubber, holdAt } from './scrub-frames.js';
//   const s = await createFrameScrubber({ canvas, scene, manifestUrl: '/frames/manifest.json' });
//
// scene  : the tall element (e.g. height 400vh) whose scroll progress drives the sequence; the canvas sits in a sticky child.
// The HTML must already work without this script: put a real <img> poster (and the h1/copy) in the markup under the canvas.
//
// Behaviour: poster first. Frames are fetched by proximity: a few spread anchors and the opening frames on load, then
// a window around the shown frame once the visitor scrolls (desktop goes on to fill in the rest; phones and Save-Data
// stay on the sliding window and drop far-away bytes, the HTTP cache holds them). Only frames near the shown one are decoded: `window * 2` ahead in the direction of travel, `window` behind;
// bitmaps outside that are closed. The shown frame chases the scroll at a capped speed (`maxSpeed` frames per 60 Hz
// frame), so a fling plays through the film instead of skipping around. If the wanted frame isn't decoded yet it holds
// the closest decoded frame ON THE WAY there, never one from the other side (the old "nearest decoded frame anywhere"
// fallback flashed far-away frames on fast scrolls and when scrolling back up). Never draws a blank. One whole frame at
// full opacity per draw: never blend neighbours or fade a still over the film (ghosting; the audit's `frame-blend` check
// fails it). Smoother = more frames. Progress uses the sticky stage's own height, not innerHeight: on phones innerHeight
// changes whenever the address bar shows or hides, which moved the frame every time the scroll direction flipped.
// Paused off-screen and in hidden tabs; reduced motion shows one still frame and never scrubs.
// Phones: when the manifest names a `mobile` set (`darkroom media frames --mobile-width`) and `mobileQuery` matches, that
// set is used instead. Frames are never scaled down here: large ones (4K) shrink the decode window to fit `memoryMB`.
// A few `anchors` spread coarse-to-fine stay decoded once the window has room.
// Breaking points: pass `mapFrame: holdAt([...frames], 0.04)` to make the film rest on chosen frames for a stretch of
// scroll. Never snap or glide the page's scroll to a stop: it fights touch momentum and reads as a glitch.

export async function createFrameScrubber({
  canvas, scene, stage = canvas, manifestUrl, window: R = 12, ease = 0.3, maxSpeed = 4, concurrency = 4, anchors: anchorCount = 9, memoryMB = 600,
  mobileQuery = '(max-width: 1023px)', leanQuery = '(max-width: 1023px)', mapFrame, onFetched, onWait, ahead = 60, behind = 16, startFrames = 8, startAnchors = 5, warm = 0,
  restFrame = 'last', reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches, onFrame,
}) {
  let manifest = await (await fetch(manifestUrl)).json();
  if (manifest.mobile && matchMedia(mobileQuery).matches) {
    manifestUrl = new URL(manifest.mobile, new URL(manifestUrl, location.href)).href;
    manifest = await (await fetch(manifestUrl)).json();
  }
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
  // big frames (4K is ~32 MB decoded each) keep fewer decoded at once instead of being shrunk: full sharpness, bounded memory.
  // The window holds 3R + 1 frames plus the anchors; `memoryMB` caps them (1080p keeps R = 12, 4K drops to R = 3).
  const perFrameMB = (manifest.width * manifest.height * 4) / 1048576 || 8;
  R = Math.max(3, Math.min(R, Math.floor((memoryMB / perFrameMB - anchorCount - 1) / 3)));
  const n = manifest.count;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toPos = mapFrame ? (p) => clamp(mapFrame(p, n), 0, n - 1) : (p) => p * (n - 1);
  const anchors = coarseToFine(n).slice(0, Math.min(anchorCount, n));
  const anchorSet = new Set(anchors);
  const ctx = canvas.getContext('2d', { alpha: false });
  const blobs = new Array(n).fill(null);
  const bitmaps = new Array(n).fill(null);
  const decoding = new Set();
  const fetchAc = new AbortController();
  const inflight = new Set();
  const tries = new Uint8Array(n);
  const lean = matchMedia(leanQuery).matches || navigator.connection?.saveData === true || (navigator.deviceMemory || 8) <= 4;
  const startSet = [...new Set([...Array.from({ length: Math.min(startFrames, n) }, (_, i) => i), ...anchors.slice(0, startAnchors)])];
  let engaged = false, waiting = false;
  let cur = 0, target = 0, dir = 1, shown = -1, raf = 0, last = 0, running = false, destroyed = false, active = true;

  const progress = () => {
    const r = scene.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - (stage.clientHeight || innerHeight)), 0, 1);
  };

  // The canvas always holds the frame's native pixels, drawn 1:1. Code never resamples a frame; CSS object-fit places it.
  canvas.width = manifest.width; canvas.height = manifest.height;

  function draw(i) {
    const bmp = bitmaps[i];
    if (!bmp) return false;
    ctx.drawImage(bmp, 0, 0);
    shown = i; onFrame?.(i, n);
    return true;
  }

  function nearestLoaded(i) {
    for (let d = 0; d < n; d++) { if (bitmaps[i - d]) return i - d; if (bitmaps[i + d]) return i + d; }
    return -1;
  }
  // frame i if decoded; else the decoded frame closest to i between the one on screen and i; nothing on screen: nearest
  function usable(i) {
    if (bitmaps[i]) return i;
    if (shown >= 0 && bitmaps[shown]) {
      let best = shown;
      for (let k = shown, s = Math.sign(i - shown); k !== i; k += s) if (bitmaps[k]) best = k;
      return best;
    }
    return nearestLoaded(i);
  }

  async function fetchOne(i) {
    if (blobs[i]) return;
    try { blobs[i] = await (await fetch(base + manifest.frames[i].file, { signal: fetchAc.signal })).blob(); } catch { /* aborted or failed: neighbours cover it */ }
  }
  const need = (i) => i >= 0 && i < n && !blobs[i] && !inflight.has(i) && tries[i] < 2;
  function nextFetch() {
    if (!engaged) {
      for (const i of startSet) if (need(i)) return i;
      // while the visitor reads the first screen, buffer the start of the film, so the first scroll never waits
      if (navigator.connection?.saveData !== true) for (let i = 0; i < Math.min(warm, n); i++) if (need(i)) return i;
      return -1;
    }
    const c = Math.round(cur);
    for (let d = 0; d <= ahead; d++) {
      if (need(c + dir * d)) return c + dir * d;
      if (d <= behind && need(c - dir * d)) return c - dir * d;
    }
    if (!lean) for (let d = 1; d < n; d++) { if (need(c + dir * d)) return c + dir * d; if (need(c - dir * d)) return c - dir * d; }
    return -1;
  }
  function evict() {
    if (!lean || warm >= n) return; // a fully buffered film stays in memory: its bytes are small, refetching is not
    const c = Math.round(cur), lo = c - behind - 24, hi = c + ahead + 24;
    for (let i = 0; i < n; i++) if (blobs[i] && (i < lo || i > hi) && !anchorSet.has(i) && !bitmaps[i]) blobs[i] = null;
  }
  function pump() {
    while (!destroyed && inflight.size < 6) {
      const i = nextFetch();
      if (i < 0) return;
      inflight.add(i); tries[i]++;
      fetchOne(i).then(() => { inflight.delete(i); if (blobs[i]) onFetched?.(i, n); evict(); pump(); kick(); });
    }
  }
  const decodeNow = async (i) => { await fetchOne(i); if (blobs[i] && !bitmaps[i]) bitmaps[i] = await createImageBitmap(blobs[i], { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); };

  function decode(i) {
    if (i < 0 || i >= n || bitmaps[i] || decoding.has(i) || !blobs[i]) return;
    decoding.add(i);
    createImageBitmap(blobs[i], { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }).then((bmp) => { if (destroyed) bmp.close(); else bitmaps[i] = bmp; }, () => {})
      .finally(() => { decoding.delete(i); kick(); });
  }

  // decode `R * 2` ahead in the direction of travel and `R` behind; release the rest, except anchors, the frame on
  // screen and the frames between it and the wanted one
  function manageWindow(centre) {
    const ahead = R * 2;
    const lo = dir > 0 ? centre - R : centre - ahead, hi = dir > 0 ? centre + ahead : centre + R;
    const pLo = Math.min(shown, centre), pHi = Math.max(shown, centre);
    for (let i = 0; i < n; i++) {
      if (bitmaps[i] && (i < lo - 4 || i > hi + 4) && !(i >= pLo && i <= pHi) && !anchorSet.has(i)) { bitmaps[i].close(); bitmaps[i] = null; }
    }
    const order = [];
    for (let d = 0; d <= ahead; d++) { order.push(centre + dir * d); if (d && d <= R) order.push(centre - dir * d); }
    order.push(...anchors); // window first, then any anchor still missing
    for (const i of order) { if (decoding.size >= concurrency) break; decode(i); }
  }

  function tick(now) {
    raf = 0;
    if (destroyed || !active || document.hidden) { running = false; return; }
    const dt = Math.min(64, now - (last || now - 16.667)); last = now;
    target = toPos(progress());
    // glide toward the scroll position, never faster than `maxSpeed` frames per 60 Hz frame
    const cap = maxSpeed * dt / 16.667;
    const step = clamp((target - cur) * (1 - (1 - ease) ** (dt / 16.667)), -cap, cap);
    if (step) dir = Math.sign(step);
    cur += step; if (Math.abs(target - cur) < 0.01) cur = target;
    const want = Math.round(cur);
    manageWindow(want); pump();
    const use = usable(want);
    if (use >= 0 && use !== shown) draw(use);
    const late = Math.abs(want - (use < 0 ? want : use)) > 2;
    if (late !== waiting) { waiting = late; onWait?.(late); }
    if (cur !== target || decoding.size) raf = requestAnimationFrame(tick); else running = false;
  }
  function kick() { if (!running && !destroyed && !reducedMotion) { running = true; last = 0; raf = requestAnimationFrame(tick); } }
  const onResize = () => { shown = -1; kick(); };

  const scrubber = {
    io: null, manifest, get frame() { return shown; },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); scrubber.io?.disconnect(); fetchAc.abort();
      removeEventListener('scroll', kick); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', kick);
      bitmaps.forEach((b) => b?.close());
    },
  };

  if (reducedMotion) { // one calm frame, no scrubbing
    const rest = restFrame === 'last' ? n - 1 : restFrame === 'first' ? 0 : Math.round((n - 1) / 2);
    await decodeNow(rest); draw(bitmaps[rest] ? rest : 0);
  } else {
    cur = target = toPos(progress());
    const first = Math.round(cur);
    await decodeNow(first); // the frame for where the page opened, immediately
    draw(first);
    engaged = first > 0;
    pump();
    addEventListener('scroll', () => { if (!engaged) { engaged = true; pump(); } kick(); }, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', kick);
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) kick(); }, { rootMargin: '25% 0px' });
    io.observe(scene);
    scrubber.io = io;
    kick();
  }

  return scrubber;
}

// Breaking points without touching the scroll: the film rests on each of `frames` (0-based) for `hold` of the scroll
// (0.04 = 4 % each) and moves evenly between them. Use as `mapFrame: holdAt([0, 40, 95], 0.05)`.
export function holdAt(frames, hold = 0.04) {
  const stops = [...frames].sort((a, b) => a - b);
  return (p, n) => {
    const k = stops.length;
    if (!k) return p * (n - 1);
    const moving = Math.max(0, 1 - hold * k);
    const segs = []; let prev = 0;
    for (const f of stops) { segs.push({ from: prev, to: f }); prev = f; }
    segs.push({ from: prev, to: n - 1 });
    const total = segs.reduce((s, g) => s + Math.abs(g.to - g.from), 0) || 1;
    let at = 0;
    for (let i = 0; i < segs.length; i++) {
      const len = moving * Math.abs(segs[i].to - segs[i].from) / total;
      if (p <= at + len) return segs[i].from + (segs[i].to - segs[i].from) * (len ? (p - at) / len : 1);
      at += len;
      if (i < k) { if (p <= at + hold) return stops[i]; at += hold; }
    }
    return n - 1;
  };
}

// 0, last, middle, then the middles of each half, and so on: any prefix covers the whole range evenly.
function coarseToFine(n) {
  if (n <= 0) return [];
  const out = [0], seen = new Set([0]);
  if (n > 1) { out.push(n - 1); seen.add(n - 1); }
  let spans = [[0, n - 1]];
  while (spans.length) {
    const next = [];
    for (const [a, b] of spans) {
      if (b - a <= 1) continue;
      const m = Math.floor((a + b) / 2);
      if (!seen.has(m)) { out.push(m); seen.add(m); }
      next.push([a, m], [m, b]);
    }
    spans = next;
  }
  return out;
}
