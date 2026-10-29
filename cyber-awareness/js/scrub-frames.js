// Scroll-scrubbed image sequence on a <canvas>, with fractional frames. Framework-free ES module.
// Based on the Darkroom scrub-frames recipe; adds `mapFrame(progress) -> fractional frame index`, so a position like
// 13.5 draws a 50/50 blend of frames 13 and 14. `stills` [{ pos, url }] are hand-finished images that replace the film
// at exact positions: shown at full strength at `pos`, fading into the film over one frame either side.
//
// Behaviour: poster first; only frames near the target are decoded (sliding window of +/- `window`); stale loads are
// aborted; bitmaps outside the window are closed; drawing happens only when the shown position changes; paused off-screen
// and in hidden tabs; DPR is capped; reduced motion shows one still frame and never scrubs. Never draws a blank.

export async function createFrameScrubber({
  canvas, scene, manifestUrl, window: R = 12, dprCap = 2, ease = 0.3, concurrency = 4, anchors: anchorCount = 11,
  mobileQuery = '(max-width: 1023px)', mapFrame, extraAnchors = [], stills = [], blend = true,
  restFrame = 'last', reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches, onFrame,
}) {
  let manifest = await (await fetch(manifestUrl)).json();
  if (manifest.mobile && matchMedia(mobileQuery).matches) {
    manifestUrl = new URL(manifest.mobile, new URL(manifestUrl, location.href)).href;
    manifest = await (await fetch(manifestUrl)).json();
  }
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
  const n = manifest.count;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toPos = mapFrame || ((p) => p * (n - 1));
  const anchors = [...new Set([...extraAnchors.map((a) => clamp(a, 0, n - 1)), ...coarseToFine(n)])].slice(0, Math.max(anchorCount, extraAnchors.length));
  const anchorSet = new Set(anchors);
  const ctx = canvas.getContext('2d', { alpha: false });
  const bitmaps = new Array(n).fill(null);
  const loading = new Map(); // index -> AbortController
  const stillBmps = stills.map(() => null);
  const loadStill = async (k) => {
    if (stillBmps[k]) return;
    try { const bmp = await createImageBitmap(await (await fetch(stills[k].url)).blob()); if (destroyed) bmp.close(); else { stillBmps[k] = bmp; shownKey = -1; kick?.(); } } catch { /* the film frame stays */ }
  };
  const stillAt = (raw) => {
    let best = -1, bd = 1;
    stills.forEach((st, k) => { const d = Math.abs(raw - st.pos); if (d < bd && stillBmps[k]) { bd = d; best = k; } });
    return best < 0 ? null : { bmp: stillBmps[best], alpha: 1 - bd };
  };
  let cur = 0, target = 0, shownKey = -1, raf = 0, running = false, destroyed = false, active = true, wantW = 0, wantH = 0;

  const progress = () => {
    const r = scene.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  };

  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, dprCap);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w !== wantW || h !== wantH) { canvas.width = wantW = w; canvas.height = wantH = h; shownKey = -1; }
  }

  function blit(bmp, alpha) {
    const s = Math.max(canvas.width / bmp.width, canvas.height / bmp.height); // cover
    const w = bmp.width * s, h = bmp.height * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(bmp, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  function nearestLoaded(i) {
    for (let d = 0; d < n; d++) { if (bitmaps[i - d]) return i - d; if (bitmaps[i + d]) return i + d; }
    return -1;
  }

  // draw the fractional position `pos`; returns false if nothing is decoded yet
  function draw(raw) {
    const pos = clamp(raw, 0, n - 1);
    const a = Math.floor(pos), f = pos - a;
    const key = Math.round(raw * 32) / 32;
    sizeCanvas();
    const still = stillAt(raw);
    if (!blend) { // solid mode: a still within half a frame of its spot, otherwise the nearest whole frame
      if (still && still.alpha > 0.5) {
        if (key !== shownKey) { blit(still.bmp, 1); shownKey = key; onFrame?.(raw, n); }
        return true;
      }
      // the nearest whole frame; if it isn't decoded yet, the closest one that is. Never two at once.
      const r = bitmaps[Math.round(pos)] ? Math.round(pos) : nearestLoaded(Math.round(pos));
      if (r < 0) return false;
      if (r !== shownKey) { blit(bitmaps[r], 1); shownKey = r; onFrame?.(r, n); }
      return true;
    }
    if (still && still.alpha > 0.97) { // resting on a hand-finished still
      if (key !== shownKey) { blit(still.bmp, 1); shownKey = key; onFrame?.(raw, n); }
      return true;
    }
    if (bitmaps[a] && (f < 0.04 || bitmaps[a + 1])) {
      if (key === shownKey) return true;
      blit(bitmaps[a], 1);
      if (f >= 0.04) blit(bitmaps[a + 1], f);
      if (still) blit(still.bmp, still.alpha);
      shownKey = key; onFrame?.(raw, n);
      return true;
    }
    const near = nearestLoaded(Math.round(pos));
    if (near < 0) return false;
    if (near !== shownKey) { blit(bitmaps[near], 1); shownKey = near; onFrame?.(near, n); }
    return true;
  }

  async function load(i) {
    if (i < 0 || i >= n || bitmaps[i] || loading.has(i)) return;
    const ac = new AbortController(); loading.set(i, ac);
    try {
      const res = await fetch(base + manifest.frames[i].file, { signal: ac.signal });
      const bmp = await createImageBitmap(await res.blob());
      if (destroyed || ac.signal.aborted) { bmp.close(); return; }
      bitmaps[i] = bmp;
    } catch { /* aborted or failed: the nearest decoded frame stays on screen */ }
    finally { loading.delete(i); }
  }

  function manageWindow(centre) {
    const lo = centre - R, hi = centre + R;
    for (const [i, ac] of loading) if ((i < lo - 2 || i > hi + 2) && !anchorSet.has(i)) ac.abort();
    for (let i = 0; i < n; i++) if (bitmaps[i] && (i < lo - R || i > hi + R) && !anchorSet.has(i)) { bitmaps[i].close(); bitmaps[i] = null; }
    const order = []; for (let d = 0; d <= R; d++) { order.push(centre + d); if (d) order.push(centre - d); }
    order.push(...anchors);
    for (const i of order) { if (loading.size >= concurrency) break; if (i >= 0 && i < n && !bitmaps[i] && !loading.has(i)) load(i); }
  }

  function tick() {
    raf = 0;
    if (destroyed || !active || document.hidden) { running = false; return; }
    target = progress();
    cur += (target - cur) * ease; if (Math.abs(target - cur) < 0.0004) cur = target;
    const pos = toPos(cur);
    manageWindow(Math.round(pos));
    draw(pos);
    if (Math.abs(target - cur) > 0.0004 || loading.size) raf = requestAnimationFrame(tick); else running = false;
  }
  var kick = () => { if (!running && !destroyed && !reducedMotion) { running = true; raf = requestAnimationFrame(tick); } };
  const onResize = () => { shownKey = -1; kick(); };

  const scrubber = {
    io: null, manifest, count: n,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); scrubber.io?.disconnect();
      removeEventListener('scroll', kick); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', kick);
      for (const ac of loading.values()) ac.abort();
      bitmaps.forEach((b) => b?.close()); stillBmps.forEach((b) => b?.close());
    },
  };

  await Promise.all(stills.map((_, k) => loadStill(k)));
  if (reducedMotion) { // one calm frame, no scrubbing
    const rest = typeof restFrame === 'number' ? restFrame : restFrame === 'last' ? toPos(1) : toPos(0);
    await load(clamp(Math.floor(rest), 0, n - 1)); draw(rest);
  } else {
    cur = target = progress();
    const start = toPos(cur);
    await Promise.all([load(Math.floor(start)), load(Math.min(n - 1, Math.floor(start) + 1))]);
    draw(start);
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', kick);
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) kick(); }, { rootMargin: '25% 0px' });
    io.observe(scene);
    scrubber.io = io;
    kick();
  }
  return scrubber;
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
