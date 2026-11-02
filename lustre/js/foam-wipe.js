// Scroll-linked dirty → clean wipe: the dirty photo is cut away along a wavy seam that travels left → right,
// and a rising foam column (texture + loose bubbles that pop) hides the seam. Native scroll only; the
// page is never moved by this script. Reduced motion: returns null and the static clean image stays.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => (r() + r() + r() + r() - 2) / 2; // ~N(0, .58), bounded ±1

function load(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img.decode().then(() => img);
}

export async function foamWipe({
  section, stage, canvas, dirty, clean,
  frame = () => ({ fx: 0.5, fy: 0.5, zoom: 1 }),
  range = [0.04, 0.9],
  onProgress = () => {},
}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const large = innerWidth * Math.min(devicePixelRatio || 1, 2) > 1100;
  const [imgD, imgC] = await Promise.all([load(large ? dirty.large : dirty.small), load(large ? clean.large : clean.small)]);

  const ctx = canvas.getContext('2d');
  const R = rng(11);
  let W = 0, H = 0, dpr = 1, band = 120, TH = 384, foam = null, cover = null;
  let target = 0, cur = 0, t = 0, last = 0, running = false, onScreen = true;
  let parts = [];

  function buildFoam() {
    band = clamp(Math.min(W, H) * 0.2, 84, 210);
    const c = document.createElement('canvas');
    c.width = Math.ceil(band * dpr);
    c.height = Math.ceil(TH * 2 * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);

    const lg = g.createLinearGradient(0, 0, band, 0);
    lg.addColorStop(0, 'rgba(236,236,234,0)');
    lg.addColorStop(0.26, 'rgba(240,240,238,.9)');
    lg.addColorStop(0.5, 'rgba(247,247,245,1)');
    lg.addColorStop(0.74, 'rgba(240,240,238,.9)');
    lg.addColorStop(1, 'rgba(236,236,234,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, band, TH * 2);

    const r = rng(3);
    const n = Math.round((band * TH) / 34);
    for (let i = 0; i < n; i++) {
      const x = band / 2 + gauss(r) * band * 0.62;
      const y = r() * TH;
      const rad = 1.2 + Math.pow(r(), 2.4) * band * 0.085;
      const a = clamp(1 - Math.abs(x - band / 2) / (band / 2), 0, 1) ** 0.6;
      if (a < 0.05) continue;
      for (const yy of [y - TH, y, y + TH, y + TH * 2]) bubble(g, x, yy, rad, a);
    }
    foam = c;
  }

  function bubble(g, x, y, rad, a) {
    const rg = g.createRadialGradient(x - rad * 0.32, y - rad * 0.38, rad * 0.08, x, y, rad);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(0.68, `rgba(238,240,243,${a * 0.86})`);
    rg.addColorStop(1, `rgba(158,170,184,${a * 0.6})`);
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }

  function spawn(initial) {
    return {
      u: gauss(R) * 1.1 - 0.35,
      y: initial ? R() * H : H + R() * 60,
      r: 1.6 + Math.pow(R(), 3) * 11,
      vy: 16 + R() * 46,
      wob: R() * Math.PI * 2,
      life: 0,
      max: 0.8 + R() * 2.6,
      pop: -1,
    };
  }

  function resize() {
    const b = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, b.width); H = Math.max(1, b.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const { fx, fy, zoom } = frame(W, H);
    const s = Math.max(W / imgC.naturalWidth, H / imgC.naturalHeight) * zoom;
    const dw = imgC.naturalWidth * s, dh = imgC.naturalHeight * s;
    cover = { x: (W - dw) * fx, y: (H - dh) * fy, w: dw, h: dh };
    buildFoam();
    parts = Array.from({ length: Math.round(clamp(H / 9, 40, 110)) }, () => spawn(true));
    draw();
  }

  const wave = (y) =>
    band * (0.2 * Math.sin(y * 0.0105 + t * 0.9) + 0.09 * Math.sin(y * 0.031 - t * 1.4) + 0.14 * Math.sin(y * 0.0043 + 1.7))
    + (y / H - 0.5) * band * 0.35;

  const seamAt = (y, edge) => edge + wave(y);

  function draw() {
    if (!cover) return;
    const edge = -band * 0.25 + cur * (W + band * 1.6);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(imgC, cover.x, cover.y, cover.w, cover.h);

    const STEP = 4;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W + 2, -2);
    for (let y = -2; y <= H + STEP; y += STEP) ctx.lineTo(seamAt(y, edge), y);
    ctx.lineTo(W + 2, H + 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(imgD, cover.x, cover.y, cover.w, cover.h);
    ctx.restore();

    if (edge < -band * 1.2 || edge > W + band * 1.2) return;

    const rise = (t * 38 + cur * H * 0.7) % TH;
    const SL = 2;
    const srcH = SL * dpr;
    for (let y = 0; y < H; y += SL) {
      const sy = Math.round(((y + rise) % TH + TH * 0.5) * dpr);
      ctx.drawImage(foam, 0, sy, foam.width, srcH, seamAt(y + SL / 2, edge) - band / 2, y, band, SL);
    }

    for (const p of parts) {
      const x = seamAt(p.y, edge) + p.u * band + Math.sin(t * 2.2 + p.wob) * 2.5;
      if (p.pop >= 0) {
        const k = p.pop / 0.26;
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, p.y, p.r * (1 + k * 1.8), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        for (let j = 0; j < 4; j++) {
          const ang = p.wob + j * (Math.PI / 2);
          const d = p.r * (1.2 + k * 3.2);
          ctx.beginPath(); ctx.arc(x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 0.9, 0, Math.PI * 2); ctx.fill();
        }
        continue;
      }
      ctx.fillStyle = 'rgba(255,255,255,.09)';
      ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.beginPath(); ctx.arc(x, p.y, p.r, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
      ctx.strokeStyle = 'rgba(196,222,255,.35)';
      ctx.beginPath(); ctx.arc(x, p.y, p.r, Math.PI * 0.2, Math.PI * 0.9); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(x - p.r * 0.35, p.y - p.r * 0.4, Math.max(0.6, p.r * 0.16), 0, Math.PI * 2); ctx.fill();
    }
  }

  function step(dt) {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.pop >= 0) {
        p.pop += dt;
        if (p.pop > 0.26) parts[i] = spawn(false);
        continue;
      }
      p.y -= p.vy * dt;
      p.life += dt;
      if (p.y < -20) parts[i] = spawn(false);
      else if (p.life > p.max && p.u < 0.1) p.pop = 0;
    }
  }

  function readTarget() {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const raw = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    target = clamp((raw - range[0]) / (range[1] - range[0]), 0, 1);
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    cur += (target - cur) * (1 - Math.pow(1 - 0.16, dt * 60));
    if (Math.abs(target - cur) < 0.0005) cur = target;
    step(dt);
    draw();
    onProgress(cur);
    const parked = cur === target && cur >= 1;
    if (onScreen && !document.hidden && !parked) requestAnimationFrame(tick);
    else running = false;
  }

  function kick() {
    if (running || !onScreen || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  new ResizeObserver(() => { resize(); readTarget(); kick(); }).observe(stage);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; kick(); }).observe(stage);
  addEventListener('scroll', () => { readTarget(); kick(); }, { passive: true });
  document.addEventListener('visibilitychange', kick);

  resize();
  readTarget();
  cur = target;
  draw();
  stage.classList.add('is-live');
  kick();
  return { get progress() { return cur; } };
}
