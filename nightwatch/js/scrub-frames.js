// Scroll-scrubbed image sequence on a <canvas>, with fractional frames. Framework-free ES module.
// Based on the Darkroom scrub-frames recipe; adds `mapFrame(progress) -> fractional frame index`, so a position like
// 13.5 draws a 50/50 blend of frames 13 and 14. `stills` [{ pos, url }] are hand-finished images that replace the film
// at exact positions: shown at full strength at `pos`, fading into the film over one frame either side.
//
// Behaviour: poster first; every frame's compressed bytes are fetched once and kept (a few MB), so decoding never waits
// on the network; only frames near the shown one are decoded, `window * 2` ahead in the direction of travel and `window`
// behind; bitmaps outside that are closed. The shown frame chases the scroll at a capped speed (a fling plays through
// the film instead of skipping it), and if the frame it wants isn't decoded yet it holds the closest decoded frame on
// the way there, never one from the other side. Paused off-screen and in hidden tabs; DPR is capped; reduced motion
// shows one still frame and never scrubs. Never draws a blank.

export async function createFrameScrubber({
  canvas, scene, manifestUrl, window: R = 12, dprCap = 2, ease = 0.3, maxSpeed = 4, concurrency = 4, anchors: anchorCount = 11,
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
  const blobs = new Array(n).fill(null);
  const bitmaps = new Array(n).fill(null);
  const decoding = new Set();
  const fetchAc = new AbortController();
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
  let cur = 0, target = 0, dir = 1, shown = -1, shownKey = -1, raf = 0, last = 0, running = false, destroyed = false, active = true, wantW = 0, wantH = 0;

  // the sticky stage's own height, not innerHeight: on phones innerHeight changes as the address bar shows and hides,
  // which shifted the progress (and the frame) every time the scroll direction flipped
  const progress = () => {
    const r = scene.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - (canvas.clientHeight || innerHeight)), 0, 1);
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
  // frame i if it's decoded; else the decoded frame closest to i on the way there from the one on screen (the film
  // holds or moves on, it never flashes a frame from the other side); nothing on screen yet: the nearest decoded frame
  function usable(i) {
    if (bitmaps[i]) return i;
    if (shown >= 0 && bitmaps[shown]) {
      let best = shown;
      for (let k = shown, s = Math.sign(i - shown); k !== i; k += s) if (bitmaps[k]) best = k;
      return best;
    }
    return nearestLoaded(i);
  }
  function show(i) {
    if (i === shownKey) return;
    blit(bitmaps[i], 1); shown = shownKey = i; onFrame?.(i, n);
  }

  // draw the fractional position `pos`; returns false if nothing is decoded yet
  function draw(raw) {
    const pos = clamp(raw, 0, n - 1);
    const a = Math.floor(pos), f = pos - a;
    const key = Math.round(raw * 32) / 32;
    sizeCanvas();
    const still = stillAt(raw);
    if (!blend) { // solid mode: a still within half a frame of its spot, otherwise one whole frame. Never two at once.
      if (still && still.alpha > 0.5) {
        if (key !== shownKey) { blit(still.bmp, 1); shownKey = key; onFrame?.(raw, n); }
        return true;
      }
      const r = usable(Math.round(pos));
      if (r < 0) return false;
      show(r);
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
      shown = f < 0.5 ? a : a + 1; shownKey = key; onFrame?.(raw, n);
      return true;
    }
    const r = usable(Math.round(pos));
    if (r < 0) return false;
    show(r);
    return true;
  }

  async function fetchOne(i) {
    if (blobs[i]) return;
    try { blobs[i] = await (await fetch(base + manifest.frames[i].file, { signal: fetchAc.signal })).blob(); } catch { /* aborted or failed: neighbours cover it */ }
  }
  // every frame's bytes, once: the anchors first (so any spot has something close), then outward from where we are
  async function fetchAll(start) {
    const byDistance = Array.from({ length: n }, (_, i) => i).sort((x, y) => Math.abs(x - start) - Math.abs(y - start));
    const order = [...new Set([...anchors, ...byDistance])];
    let k = 0;
    const worker = async () => { while (k < order.length && !destroyed) { await fetchOne(order[k++]); kick(); } };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  function decode(i) {
    if (i < 0 || i >= n || bitmaps[i] || decoding.has(i) || !blobs[i]) return;
    decoding.add(i);
    createImageBitmap(blobs[i]).then((bmp) => { if (destroyed) bmp.close(); else bitmaps[i] = bmp; }, () => {})
      .finally(() => { decoding.delete(i); kick(); });
  }

  // decode around the wanted frame, `R * 2` ahead in the direction of travel and `R` behind; release the rest,
  // except anchors and the frames between what's on screen and what's wanted
  function manageWindow(centre) {
    const ahead = R * 2;
    const lo = dir > 0 ? centre - R : centre - ahead, hi = dir > 0 ? centre + ahead : centre + R;
    const pLo = Math.min(shown, centre), pHi = Math.max(shown, centre);
    for (let i = 0; i < n; i++) {
      if (bitmaps[i] && (i < lo - 4 || i > hi + 4) && !(i >= pLo && i <= pHi) && !anchorSet.has(i)) { bitmaps[i].close(); bitmaps[i] = null; }
    }
    const order = [];
    for (let d = 0; d <= ahead; d++) { order.push(centre + dir * d); if (d && d <= R) order.push(centre - dir * d); }
    order.push(...anchors);
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
    manageWindow(Math.round(clamp(cur, 0, n - 1)));
    draw(cur);
    if (cur !== target || decoding.size) raf = requestAnimationFrame(tick); else running = false;
  }
  var kick = () => { if (!running && !destroyed && !reducedMotion) { running = true; last = 0; raf = requestAnimationFrame(tick); } };
  const onResize = () => { shownKey = -1; kick(); };

  const scrubber = {
    io: null, manifest, count: n,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); scrubber.io?.disconnect(); fetchAc.abort();
      removeEventListener('scroll', kick); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', kick);
      bitmaps.forEach((b) => b?.close()); stillBmps.forEach((b) => b?.close());
    },
  };

  const decodeNow = async (i) => { await fetchOne(i); if (blobs[i] && !bitmaps[i]) bitmaps[i] = await createImageBitmap(blobs[i]); };
  await Promise.all(stills.map((_, k) => loadStill(k)));
  if (reducedMotion) { // one calm frame, no scrubbing
    const rest = typeof restFrame === 'number' ? restFrame : restFrame === 'last' ? toPos(1) : toPos(0);
    await decodeNow(clamp(Math.floor(rest), 0, n - 1)); draw(rest);
  } else {
    cur = target = toPos(progress());
    const a = clamp(Math.floor(cur), 0, n - 1);
    await Promise.all([decodeNow(a), decodeNow(Math.min(n - 1, a + 1))]);
    draw(cur);
    fetchAll(a);
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
