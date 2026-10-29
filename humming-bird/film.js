/* Between Wingbeats: the scroll film.
   One sticky stage. A GSAP timeline, scrubbed by native scroll, drives the frame index, the photo crossfade,
   the camera (lens) and every line of text. Timeline units are "vh of scroll": T = 1300. */
(() => {
  const root = document.documentElement;
  const still = () => document.querySelector('.replay').addEventListener('click', () => scrollTo(0, 0));
  if (!root.classList.contains('film')) { still(); return; }
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('film'); still(); return; } // CDN missing: still edition

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const T = 1300;
  const N = 122;              // frames 000-121; after the last one, only the photograph is shown
  const FPS = 24;
  const BIRD = [0.56, 0.45];  // bird's body in the final frame and the photograph (u, v of the 16:9 image)

  // Where the bird is (x, 0–1) per frame: the virtual camera pans to keep it in view when the 16:9 frame is wider than the screen.
  const FOCUS = [[0, .1], [6, .2], [10, .36], [14, .48], [18, .55], [30, .52], [39, .5], [42, .44], [45, .33], [48, .25],
    [51, .23], [54, .28], [57, .33], [60, .42], [63, .58], [72, .6], [78, .56], [90, .53], [121, .53]];
  const focusAt = (f) => {
    for (let k = 1; k < FOCUS.length; k++) {
      const [f1, x1] = FOCUS[k];
      if (f <= f1) { const [f0, x0] = FOCUS[k - 1]; return lerp(x0, x1, (f - f0) / (f1 - f0)); }
    }
    return FOCUS[FOCUS.length - 1][1];
  };

  /* ---------------- Frame engine ---------------- */

  const canvas = $('.screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  const band = () => innerWidth / innerHeight < 1.25; // portrait / phone: show the whole frame in a band, never crop the wings
  const small = band() || innerWidth * Math.min(devicePixelRatio || 1, 2) < 1500;
  const DIR = small ? 'media/f1080/' : 'media/f1920/';
  const PHOTO = small ? 'media/still-photo-1080.webp' : 'media/still-photo.webp';
  const pad = (i) => String(i).padStart(3, '0');

  const blobs = new Array(N).fill(null);
  const bmps = new Array(N).fill(null);
  const edges = new Array(N).fill(null); // [top rgb, bottom rgb] sampled per frame, for the band fill
  const decoding = new Set();
  let photo = null, photoEdges = null;
  const state = { f: 0, photo: 0 };
  let dirty = true, W = 0, H = 0, dpr = 1;

  const probe = document.createElement('canvas'); probe.width = 16; probe.height = 9;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  function sampleEdges(img) {
    pctx.drawImage(img, 0, 0, 16, 9);
    const d = pctx.getImageData(0, 0, 16, 9).data, row = (y) => {
      let r = 0, g = 0, b = 0;
      for (let x = 0; x < 16; x++) { const o = (y * 16 + x) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; }
      return [r / 16, g / 16, b / 16];
    };
    return [row(0), row(8)];
  }

  async function fetchFrame(i) {
    try { blobs[i] = await (await fetch(DIR + pad(i) + '.webp')).blob(); } catch { /* the nearest frame stays */ }
    if (Math.abs(i - Math.round(state.f)) <= 10) decode(i);
  }
  async function decode(i) {
    if (bmps[i] || decoding.has(i) || !blobs[i]) return;
    decoding.add(i);
    try {
      const b = await createImageBitmap(blobs[i]);
      if (Math.abs(i - Math.round(state.f)) > 14) { b.close(); return; }
      bmps[i] = b; if (!edges[i]) edges[i] = sampleEdges(b);
      dirty = true;
    } catch { /* keep going */ } finally { decoding.delete(i); }
  }
  function manage() {
    const c = Math.round(state.f);
    for (let i = 0; i < N; i++) if (bmps[i] && Math.abs(i - c) > 14) { bmps[i].close(); bmps[i] = null; }
    for (let d = 0; d <= 10; d++) { decode(c + d); if (d) decode(c - d); }
  }
  function nearest(i) {
    for (let d = 0; d < N; d++) { if (bmps[i - d]) return i - d; if (bmps[i + d]) return i + d; }
    return -1;
  }

  // Load: frame 0 first, then coarse-to-fine so a fast scroller always lands near a real frame, then the photograph.
  (async () => {
    await fetchFrame(0);
    const order = [], seen = new Set([0]);
    for (let step = 32; step >= 1; step /= 2) for (let i = 0; i < N; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    if (!seen.has(N - 1)) order.push(N - 1);
    let k = 0;
    const worker = async () => { while (k < order.length) await fetchFrame(order[k++]); };
    await Promise.all([worker(), worker(), worker(), worker()]);
  })();
  fetch(PHOTO).then((r) => r.blob()).then(createImageBitmap).then((b) => { photo = b; photoEdges = sampleEdges(b); dirty = true; }).catch(() => {});

  // Layout of the 16:9 image on the stage for a given focus.
  function geom(focus) {
    let w, h, y;
    if (band()) { w = W * 1.5; h = w * 9 / 16; if (h > H * .62) { h = H * .62; w = h * 16 / 9; } y = H * .47 - h / 2; }
    else { const s = Math.max(W / 1920, H / 1080); w = 1920 * s; h = 1080 * s; y = (H - h) / 2; }
    const x = w > W ? clamp(W / 2 - focus * w, W - w, 0) : (W - w) / 2;
    return { x, y, w, h };
  }
  // CSS px position of the bird at rest (used for the camera push-in and the editorial reframes).
  function birdPoint() { const g = geom(focusAt(N - 1)); return { x: g.x + BIRD[0] * g.w, y: g.y + BIRD[1] * g.h, g }; }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = canvas.clientHeight || innerHeight;
    const cw = Math.round(Math.min(W * dpr, 2880)), ch = Math.round(H * (cw / W));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const p = birdPoint();
    gsap.set('.lens', { transformOrigin: `${p.x}px ${p.y}px` });
    dirty = true;
  }

  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  function render() {
    if (!dirty) return;
    dirty = false;
    manage();
    const i0 = clamp(Math.floor(state.f), 0, N - 1);
    const a = bmps[i0] ? i0 : nearest(i0);
    if (a < 0 && !photo) return;
    const k = canvas.width / W;
    const g = geom(focusAt(state.f));
    ctx.setTransform(k, 0, 0, k, 0, 0);

    // Hard cuts only: one image on the canvas at a time, never two blended (no ghosting).
    const showPhoto = photo && (state.photo >= .5 || state.f >= N - 1);
    if (band()) {
      const e = (showPhoto ? photoEdges : edges[a]) || photoEdges;
      if (e) { ctx.fillStyle = rgb(e[0]); ctx.fillRect(0, 0, W, g.y + 2); ctx.fillStyle = rgb(e[1]); ctx.fillRect(0, g.y + g.h - 2, W, H); }
    }
    ctx.globalAlpha = 1;
    if (showPhoto) ctx.drawImage(photo, g.x, g.y, g.w, g.h);
    else if (a >= 0) ctx.drawImage(bmps[a], g.x, g.y, g.w, g.h);

    if (band()) { // feather the band into its fill so the frame has no hard edge
      const e = (showPhoto ? photoEdges : edges[a]) || photoEdges;
      if (e) {
        const fz = g.h * .2;
        let gr = ctx.createLinearGradient(0, g.y, 0, g.y + fz); gr.addColorStop(0, rgb(e[0])); gr.addColorStop(1, rgb(e[0], 0));
        ctx.fillStyle = gr; ctx.fillRect(0, g.y, W, fz);
        gr = ctx.createLinearGradient(0, g.y + g.h - fz, 0, g.y + g.h); gr.addColorStop(0, rgb(e[1], 0)); gr.addColorStop(1, rgb(e[1]));
        ctx.fillStyle = gr; ctx.fillRect(0, g.y + g.h - fz, W, fz);
      }
    }
  }

  /* ---------------- Layout-dependent camera values ---------------- */

  // Plate = the clip window over the footage. Spread: Chapter 05's editorial page. Card: the end credit.
  const plates = {
    wide: { spread: [10, 4, 10, 42], card: [19, 38, 45, 38] },
    band: { spread: [8, 6, 50, 6], card: [12, 21, 58, 21] },
  };
  const inset = (v) => `inset(${v[0]}% ${v[1]}% ${v[2]}% ${v[3]}%)`;
  function camera(which) {
    const v = plates[band() ? 'band' : 'wide'][which];
    const cx = (v[3] + (100 - v[1])) / 2 / 100 * W, cy = (v[0] + (100 - v[2])) / 2 / 100 * H;
    const pw = (100 - v[1] - v[3]) / 100 * W;
    const p = birdPoint();
    // Bird spans from its beak (u .30) to its tail (u .75): fit that into 88% of the plate width.
    const span = .45 * p.g.w;
    const s = clamp((pw * .88) / span, .45, band() ? 1.2 : .95);
    return { clip: inset(v), x: cx - p.x, y: cy - p.y, s };
  }

  /* ---------------- Timeline ---------------- */

  const film = $('#film');
  film.style.setProperty('--units', T);
  resize();

  const ch1 = $('.ch1');
  requestAnimationFrame(() => requestAnimationFrame(() => ch1.classList.add('is-in')));

  const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: () => { dirty = true; hud(); } });
  const io = (el, at, dur, from = {}, to = {}) => tl.fromTo(el, { opacity: 0, ...from }, { opacity: 1, duration: dur, ...to }, at);
  const out = (el, at, dur, to = {}) => tl.to(el, { opacity: 0, duration: dur, ...to }, at);
  const draw = (path, at, dur) => tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dur }, at);

  // 01 The Silence: the mist parts.
  tl.to('.ch1-block', { y: () => -innerHeight * .08, opacity: 0, duration: 90, ease: 'power1.in' }, 0);
  tl.to('.cue', { opacity: 0, duration: 25 }, 0);
  tl.to('.veil', { opacity: 0, duration: 110, ease: 'power1.inOut' }, 25);
  tl.fromTo('.lens', { scale: 1.05 }, { scale: 1, duration: 140, ease: 'power1.out' }, 0);
  tl.to('.mark', { opacity: 1, duration: 30 }, 95);

  // Footage: 0→36 arrival, 36→70 dance, 70→100 landing (decelerating), 100→121 a quick run-out, then the photograph.
  tl.fromTo(state, { f: 0 }, { f: 36, duration: 220 }, 110);
  tl.to(state, { f: 70, duration: 320 }, 330);
  tl.to(state, { f: 100, duration: 160, ease: 'power2.out' }, 650);
  tl.to(state, { f: N - 1, duration: 30 }, 810);

  // 02 The Arrival
  io('.ch2 .line', 205, 35, { y: 18 }, { y: 0 });
  out('.ch2 .line', 322, 28, { y: -10 });

  // 03 The Dance: the words land on the movement they name.
  const wide = () => !band();
  io('.ch3 .line', 338, 10);
  io('.ch3 .w1', 338, 24, { y: 14 }, { y: 0 });
  tl.to('.ch3 .w1, .ch3 .line-br .eyebrow', { opacity: () => (wide() ? 0 : 1), duration: 14 }, 404);
  io('.ch3 .w2', 420, 22, { x: () => (wide() ? 24 : 0), y: () => (wide() ? 0 : 14) }, { x: 0, y: 0 }); // drifts back, like the bird
  tl.to('.ch3 .w2', { opacity: () => (wide() ? 0 : 1), duration: 14 }, 506);
  io('.ch3 .w3', 520, 34, { y: 14 }, { y: 0 });
  out('.ch3 .line', 628, 28, { y: -10 });

  // Reverse flight and the wing path share the top-right slot, one after the other (the bird is left of centre then).
  io('.note-a1', 398, 22, { x: 14 }, { x: 0 });
  draw('.glyph-arrow path', 398, 60);
  out('.note-a1', 482, 16);

  io('.note-a2', 502, 22, { y: 10 }, { y: 0 });
  draw('.glyph-eight path', 502, 60);
  out('.note-a2', 556, 14);

  io('.note-a3', 655, 26, { x: -12 }, { x: 0 });
  draw('.glyph-tick path', 655, 50);
  out('.note-a3', 760, 22);

  // 04 The Stillness
  io('.ch4-lede', 722, 34, { y: 16 }, { y: 0 });
  out('.ch4-lede', 828, 26, { y: -10 });
  tl.set(state, { photo: 1 }, 840);                                                      // last frame reached → cut to the photograph
  tl.to('.lens', { scale: 1.07, duration: 200, ease: 'power1.inOut' }, 850);              // the slow push-in
  tl.fromTo('.headline .wd', { opacity: 0, yPercent: 18, filter: 'blur(14px)' },          // words come into focus
    { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 44, stagger: 16, ease: 'power1.out' }, 880);
  // 1000–1060: held. The deliberate pause.
  out('.headline', 1062, 26, { y: -16 });

  // 05 The Revelation: the same picture becomes a page.
  tl.fromTo('.plate', { clipPath: inset([0, 0, 0, 0]) }, { clipPath: () => camera('spread').clip, duration: 100, ease: 'power2.inOut' }, 1080);
  tl.to('.lens', { scale: () => camera('spread').s, x: () => camera('spread').x, y: () => camera('spread').y, duration: 100, ease: 'power2.inOut' }, 1080);
  io('.spread', 1140, 36, { y: 18 }, { y: 0 });
  io('.plate-cap', 1150, 30);

  // End card
  out('.spread', 1200, 22, { y: -12 });
  out('.plate-cap', 1200, 16);
  tl.to('.plate', { clipPath: () => camera('card').clip, duration: 70, ease: 'power2.inOut' }, 1212);
  tl.to('.lens', { scale: () => camera('card').s, x: () => camera('card').x, y: () => camera('card').y, duration: 70, ease: 'power2.inOut' }, 1212);
  tl.fromTo('.credits', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 30 }, 1262);
  tl.set({}, {}, T);

  const st = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    animation: tl, scrub: 0.9, invalidateOnRefresh: true,
  });
  ScrollTrigger.addEventListener('refreshInit', resize);
  gsap.ticker.add(render);

  /* ---------------- HUD: chapters + timecode ---------------- */

  const CH = [0, 110, 330, 650, 1070];           // chapter starts (timeline units)
  const GO = [0, 230, 400, 940, 1170];           // where a chapter button lands
  const rail = $$('.rail button');
  const tcEl = $('.tc-val');
  let lastCh = -1, lastTc = '';
  function hud() {
    const t = tl.time();
    let c = 0; for (let k = 0; k < CH.length; k++) if (t >= CH[k] - 1) c = k;
    if (c !== lastCh) { rail.forEach((b, k) => (k === c ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'))); lastCh = c; }
    const fr = Math.round(state.f), sec = Math.floor(fr / FPS), ff = fr % FPS;
    const tc = `00:${String(sec).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
    if (tc !== lastTc) { tcEl.textContent = tc; lastTc = tc; }
  }
  const yAt = (t) => st.start + (st.end - st.start) * (t / T);
  rail.forEach((b, k) => b.addEventListener('click', () => scrollTo({ top: yAt(GO[k]), behavior: 'smooth' })));
  // In-page links point at elements inside the sticky stage; send them to the right moment of the film instead.
  $('.mark').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); });
  $('.skip').addEventListener('click', (e) => { e.preventDefault(); scrollTo(0, st.end); setTimeout(() => $('.replay').focus(), 400); });
  hud();

  /* ---------------- Replay: the film rewinds (they can fly backward, after all) ---------------- */

  let rewind = null;
  const stop = () => { if (rewind) { rewind.kill(); rewind = null; } };
  ['wheel', 'touchstart', 'keydown'].forEach((e) => addEventListener(e, stop, { passive: true }));
  $('.replay').addEventListener('click', () => {
    stop();
    const p = { y: scrollY };
    rewind = gsap.to(p, {
      y: 0, duration: 4.2, ease: 'power2.inOut',
      onUpdate: () => scrollTo(0, p.y),
      onComplete: () => {
        rewind = null;
        ch1.classList.remove('is-in'); void ch1.offsetWidth; ch1.classList.add('is-in');
        $('.mark').focus({ preventScroll: true });
      },
    });
  });

  addEventListener('resize', () => { dirty = true; });
  document.addEventListener('visibilitychange', () => { dirty = true; });
})();
