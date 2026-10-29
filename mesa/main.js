(() => {
  'use strict';

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const seg = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const staticMode = reduceMotion || saveData;
  const touchMode = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (staticMode) root.classList.add('is-static');

  /* ============================================================
     HERO: frame sequence on canvas
     ============================================================ */
  const FRAMES = 142;
  const ASPECT = 16 / 9;
  const FOCAL = { x: 0.499, y: 0.479 };       // touch point in the full frame (measured on the last frame)
  const SETS = {
    desktop: { dir: 'frames/desktop/', x0: 0, w: 1 },
    mobile:  { dir: 'frames/mobile/',  x0: 0.2, w: 0.6 }, // centre 60% crop of the full frame
  };
  const BG = '#0b0a09';
  const REVEAL_ON = 0.97, REVEAL_OFF = 0.85;
  // cursor distance, normalised so 1 = edge midpoint of the viewport (ellipse)
  const INNER = 0.16;  // = 8% of the shorter side
  const OUTER = 0.90;  // = 45% of the shorter side

  const hero = document.getElementById('hero');
  const stage = hero.querySelector('.hero__stage');
  const canvas = hero.querySelector('.hero__canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const pulseEl = hero.querySelector('.hero__pulse');
  const cursorEl = document.querySelector('.cursor');

  const set = (innerWidth < innerHeight && innerWidth <= 900) ? SETS.mobile : SETS.desktop;
  const frameSrc = i => `${set.dir}f${String(i + 1).padStart(3, '0')}.webp`;
  const frames = new Array(FRAMES);

  let vw = 0, vh = 0, geo = null;
  let shown = 0, target = 0, drawn = -1, dirty = true;
  let revealed = false, touchedOnce = false;
  let pointerIn = false, px = 0, py = 0, cx = 0, cy = 0;
  let heroVisible = true, running = false, ready = false;

  if (touchMode && !staticMode) hero.classList.add('is-scroll');

  function layout() {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75, 2560 / vw);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    // scale = drawn width of the FULL frame in css px.
    // Cover, but never zoom in so far that less than 60% of the frame width shows
    // (keeps both hands in view on portrait phones), and never past the set's crop.
    let S = Math.min(Math.max(vw, vh * ASPECT), vw / 0.6);
    S = Math.max(S, vw / set.w);
    const W = S, H = S / ASPECT;

    let rx = vw / 2 - FOCAL.x * W + set.x0 * W;   // left edge of the drawn set region
    const rw = set.w * W;
    if (rw >= vw) rx = clamp(rx, vw - rw, 0);
    let y = (H >= vh) ? clamp(vh * 0.5 - FOCAL.y * H, vh - H, 0) : vh * 0.44 - FOCAL.y * H;

    const x0 = rx - set.x0 * W;
    geo = { rx, rw, y, H, gaps: H < vh };
    const tx = x0 + FOCAL.x * W, ty = y + FOCAL.y * H;
    geo.tx = tx; geo.ty = ty;
    stage.style.setProperty('--tx', tx + 'px');
    stage.style.setProperty('--ty', ty + 'px');
    stage.style.setProperty('--gs', Math.round(Math.max(W * 0.42, 280)) + 'px');
    dirty = true;
  }

  function usable(i) {
    const img = frames[i];
    if (img && img.complete && img.naturalWidth) return img;
    for (let d = 1; d < FRAMES; d++) {           // nearest loaded neighbour
      const a = frames[i - d], b = frames[i + d];
      if (a && a.naturalWidth) return a;
      if (b && b.naturalWidth) return b;
    }
    return null;
  }

  function draw(p) {
    const f = p * (FRAMES - 1);
    const i = Math.floor(f), a = f - i;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, vw, vh);
    const A = usable(i);
    if (A) ctx.drawImage(A, geo.rx, geo.y, geo.rw, geo.H);
    if (a > 0.002 && i + 1 < FRAMES) {          // crossfade to the next frame for sub-frame smoothness
      const B = usable(i + 1);
      if (B && B !== A) { ctx.globalAlpha = a; ctx.drawImage(B, geo.rx, geo.y, geo.rw, geo.H); ctx.globalAlpha = 1; }
    }
    if (geo.gaps) {                              // portrait: feather the frame into the page
      const f1 = geo.H * 0.22;
      let g = ctx.createLinearGradient(0, geo.y, 0, geo.y + f1);
      g.addColorStop(0, BG); g.addColorStop(1, 'rgba(11,10,9,0)');
      ctx.fillStyle = g; ctx.fillRect(0, geo.y - 1, vw, f1 + 1);
      g = ctx.createLinearGradient(0, geo.y + geo.H, 0, geo.y + geo.H - f1);
      g.addColorStop(0, BG); g.addColorStop(1, 'rgba(11,10,9,0)');
      ctx.fillStyle = g; ctx.fillRect(0, geo.y + geo.H - f1, vw, f1 + 1);
    }
  }

  function setRevealed(p) {
    if (!revealed && p >= REVEAL_ON) {
      revealed = true;
      stage.classList.add('is-touched');
      pulseEl.classList.remove('pulse'); void pulseEl.offsetWidth; pulseEl.classList.add('pulse');
      if (!touchedOnce) { touchedOnce = true; stage.classList.add('has-touched'); }
    } else if (revealed && p < REVEAL_OFF) {
      revealed = false;
      stage.classList.remove('is-touched');
    }
  }

  function pointerTarget() {
    if (!pointerIn) return 0;
    const r = stage.getBoundingClientRect();
    const dx = (px - r.left - geo.tx) / (vw / 2);
    const dy = (py - r.top - geo.ty) / (vh / 2);
    const t = seg(OUTER - Math.hypot(dx, dy), 0, OUTER - INNER);
    return 1 - Math.pow(1 - t, 1.6);             // ease-out: the last stretch to the touch is slow
  }

  function scrollTarget() {
    const r = hero.getBoundingClientRect();
    const range = hero.offsetHeight - vh;
    return range > 0 ? seg(-r.top, 0, range * 0.8) : 1; // touch at 80%; last 20% holds the reveal
  }

  let last = 0;
  function tick(now) {
    const dt = Math.min(64, now - (last || now));
    last = now;
    if (touchMode) target = scrollTarget();
    else target = pointerTarget();

    // weighted glide toward the target, frame-rate independent
    const rate = touchMode ? 0.14 : (pointerIn ? 0.09 : 0.03);
    const k = 1 - Math.pow(1 - rate, dt / 16.667);
    // speed cap: even a cursor jump or a long frame can't make the hands lunge
    const maxStep = (touchMode ? 0.06 : 0.04) * dt / 16.667;
    shown += clamp((target - shown) * k, -maxStep, maxStep);
    if (Math.abs(target - shown) < 0.0004) shown = target;

    if (dirty || shown !== drawn) {
      draw(shown);
      drawn = shown; dirty = false;
      stage.style.setProperty('--p', shown.toFixed(4));
    }
    setRevealed(shown);

    if (!touchMode) {
      cx += (px - cx) * 0.25; cy += (py - cy) * 0.25;
      cursorEl.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${1 + shown * 0.6})`;
    }

    if (heroVisible) requestAnimationFrame(tick);
    else running = false;
  }
  function start() {
    if (running || !ready) return;
    running = true; last = 0;
    requestAnimationFrame(tick);
  }

  function preload(onFrame) {
    // last frame first (the touch), then coarse-to-fine so the sequence is usable early
    const order = [FRAMES - 1], seen = new Set([0, FRAMES - 1]);
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
    let k = 0;
    const worker = async () => {
      while (k < order.length) {
        const i = order[k++];
        const img = new Image();
        img.decoding = 'async';
        img.src = frameSrc(i);
        try { await img.decode(); } catch (e) { /* drawn from a neighbour */ }
        frames[i] = img;
        onFrame();
      }
    };
    return Promise.all(Array.from({ length: 6 }, worker));
  }

  function becomeReady() {
    ready = true;
    stage.classList.add('is-ready');
    hero.classList.add('is-ready');
    layout(); draw(shown); drawn = shown;
  }

  if (staticMode) {
    // final touching frame, text shown, nothing animates
    const img = new Image();
    img.src = frameSrc(FRAMES - 1);
    frames[FRAMES - 1] = img;
    const done = () => {
      shown = target = 1;
      becomeReady();
      stage.style.setProperty('--p', 1);
      stage.classList.add('is-touched', 'has-touched');
    };
    img.decode().then(done, done);
    addEventListener('resize', () => { layout(); draw(1); });
  } else {
    // no loader: paint the first frame as soon as it decodes, stream the rest behind it
    layout();
    const first = new Image();
    first.src = frameSrc(0);
    frames[0] = first;
    const go = () => { becomeReady(); start(); preload(() => { dirty = true; }); };
    first.decode().then(go, go);

    addEventListener('resize', layout);
    new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      if (heroVisible) start();
    }).observe(hero);

    if (!touchMode) {
      addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        px = e.clientX; py = e.clientY;
        if (!pointerIn) { pointerIn = true; cx = px; cy = py; }
        const r = hero.getBoundingClientRect();
        const over = py >= r.top && py <= r.bottom;
        cursorEl.classList.toggle('is-on', over && ready);
        document.body.classList.toggle('hero-cursor', over);
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => {
        pointerIn = false;                       // hands drift slowly back apart
        cursorEl.classList.remove('is-on');
      });
      addEventListener('blur', () => { pointerIn = false; });
    }
  }

  /* ============================================================
     Scroll reveals
     ============================================================ */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ============================================================
     Parallax + Le Toucher merge (one rAF per scroll)
     ============================================================ */
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const toucher = document.getElementById('toucher');
  const tStage = toucher.querySelector('.toucher__stage');

  function setToucher(a, b, r, t) {
    tStage.style.setProperty('--a', a.toFixed(4));
    tStage.style.setProperty('--b', b.toFixed(4));
    tStage.style.setProperty('--r', r.toFixed(4));
    tStage.style.setProperty('--t', t.toFixed(4));
  }

  if (staticMode) {
    setToucher(1, 0, 1, 1);
  } else {
    let queued = false;
    const update = () => {
      queued = false;
      const h = innerHeight;
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > h + 200) continue;
        const off = (r.top + r.height / 2 - h / 2) * parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      }
      const tr = toucher.getBoundingClientRect();
      if (tr.bottom > 0 && tr.top < h) {
        const p = seg(-tr.top, 0, toucher.offsetHeight - h);
        const a = easeInOut(seg(p, 0.06, 0.48));
        const b = p < 0.56 ? easeOut(seg(p, 0.40, 0.56)) : 1 - easeInOut(seg(p, 0.56, 0.82));
        const r = easeInOut(seg(p, 0.50, 0.70));
        const t = easeOut(seg(p, 0.70, 0.88));
        setToucher(a, b, r, t);
      }
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
  }

  /* ============================================================
     Discovery: appointment form + discovery set
     ============================================================ */
  const form = document.getElementById('appointment');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const note = form.querySelector('.form__note');
    let firstBad = null;
    for (const input of form.querySelectorAll('input')) {
      const ok = input.checkValidity();
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !firstBad) firstBad = input;
    }
    if (firstBad) { note.textContent = 'Please complete each field.'; firstBad.focus(); return; }
    // TODO: connect to the booking backend
    const name = form.elements.name.value.trim().split(/\s+/)[0];
    note.textContent = `Merci, ${name}. The salon will write to confirm your hour.`;
    form.querySelector('button').disabled = true;
  });

  document.getElementById('order-set').addEventListener('click', e => {
    // TODO: connect to checkout (add discovery set to cart)
    e.currentTarget.disabled = true;
    document.getElementById('order-note').textContent = 'The discovery set is reserved for you.';
  });
})();
