import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTargets, NECK_STEPS } from './shapes.js';
import { createBackground } from './background.js';
import { createGlobeFx } from './globe.js';
import { initUI } from './ui.js';

THREE.ColorManagement.enabled = false;

// bg: [base, deep, deep 2, ink]; roles: [base, accent, accent2, dim, top→bottom scan gradient]
const PALETTES = [
  { name: 'Abyss', bg: ['#04050a', '#170d36', '#06303f', '#ff3d8b'], base: '#d4ddff', accent: '#7df9ff', accent2: '#ff4f9a', dim: '#5d6a9a', top: '#cdbcff', bottom: '#d6ff7a' },
  { name: 'Ember', bg: ['#060407', '#2e0b1c', '#0f1c3d', '#ff7a3d'], base: '#ffe7d9', accent: '#ffb86b', accent2: '#ff3d6e', dim: '#8a5c66', top: '#ffd3ea', bottom: '#ffb04a' },
  { name: 'Toxic', bg: ['#030705', '#082a24', '#1a1240', '#2dffb3'], base: '#dcfff2', accent: '#5dffc8', accent2: '#a77bff', dim: '#4f7d72', top: '#c9b8ff', bottom: '#7dffc4' },
  { name: 'Glacier', bg: ['#03060c', '#0a1c3c', '#1d1147', '#5ad8ff'], base: '#e3edff', accent: '#8be9ff', accent2: '#b48cff', dim: '#56709c', top: '#e6ecff', bottom: '#86e6ff' },
];

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const N = coarse || innerWidth < 760 ? 30000 : 90000;
const LAST = 4;
const MAX_TURN = (30 * Math.PI) / 180;

let globe = null;
let applyPaletteImpl = null;
const ui = initUI({ onRandomize: () => applyPalette(nextPalette(), false), reduced });

const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  document.documentElement.classList.add('no-webgl');
}

let paletteIndex = Math.floor(Math.random() * PALETTES.length);
function nextPalette() {
  return (paletteIndex + 1 + Math.floor(Math.random() * (PALETTES.length - 1))) % PALETTES.length;
}

if (renderer) loadBust().then(start);

// The bust is a mesh (assets/iris.glb, replaceable). Without it the procedural bust is used.
async function loadBust() {
  try {
    const gltf = await new GLTFLoader().loadAsync('assets/iris.glb');
    gltf.scene.updateMatrixWorld(true);
    let bust = null, eyes = null, landmarks = null;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const part = { pos: g.attributes.position.array, idx: g.index.array, ao: g.attributes._ao?.array, curv: g.attributes._curv?.array };
      if (/eye/i.test(o.name)) eyes = part; else bust = part;
      landmarks ??= o.userData.landmarks || o.parent?.userData.landmarks;
    });
    if (!bust || !landmarks) throw new Error('iris.glb needs a bust mesh with landmarks');
    return { bust, eyes, landmarks };
  } catch (err) {
    console.warn('Using the procedural bust:', err.message);
    return null;
  }
}

function start(mesh) {
  renderer.autoClear = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);
  const bg = createBackground(renderer);

  /* ---------- particles ---------- */
  const T = buildTargets(N, 9, mesh);
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const off = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const scatter = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = Math.cbrt(Math.random()) * (1.2 + Math.random() * 1.6);
    const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    scatter[i * 3] = s * Math.cos(a) * r; scatter[i * 3 + 1] = s * Math.sin(a) * r; scatter[i * 3 + 2] = z * r + 0.8;
    seed[i] = Math.random();
    size[i] = 0.7 + Math.random() * 0.6;
  }
  const baked = T.targets.map(() => new Float32Array(N * 3));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const pointUniforms = { uTime: { value: 0 }, uPR: { value: 1 }, uSize: { value: 16 }, uFade: { value: 0 } };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: pointUniforms,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 color;
      attribute float aSeed, aSize;
      uniform float uTime, uPR, uSize, uFade;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.9 + 0.1 * sin(uTime * 2.2 + aSeed * 40.0);
        gl_PointSize = min(uSize * aSize * uPR * tw / -mv.z, 48.0 * uPR);
        vColor = color;
        vAlpha = uFade * smoothstep(0.25, 1.4, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.28, 0.5, d);
        gl_FragColor = vec4(vColor, a * vAlpha * 0.5);
      }`,
  }));
  points.frustumCulled = false;
  scene.add(points);

  globe = createGlobeFx({ onSignal: ui.pushSignal, onStorm: ui.pushStorm, pixelRatio: 1 });
  scene.add(globe.group);

  /* ---------- palette ---------- */
  let colorsDirty = true;
  function bake(p) {
    const roles = [p.base, p.accent, p.accent2, p.dim].map((h) => new THREE.Color(h));
    const top = new THREE.Color(p.top), bottom = new THREE.Color(p.bottom), c = new THREE.Color();
    T.targets.forEach((t, k) => {
      const out = baked[k];
      for (let i = 0; i < N; i++) {
        const l = t.lum[i];
        if (t.role[i] === 4) c.copy(top).lerp(bottom, t.grad[i]);
        else c.copy(roles[t.role[i]]);
        out[i * 3] = c.r * l; out[i * 3 + 1] = c.g * l; out[i * 3 + 2] = c.b * l;
      }
    });
    colorsDirty = true;
  }

  function applyPaletteInner(idx, instant) {
    paletteIndex = idx;
    const p = PALETTES[idx];
    bg.setPalette(p.bg, Math.random() * 60, instant);
    bake(p);
    globe.setColors(p.accent, p.accent2);
    ui.setPalette(p);
  }
  applyPaletteImpl = applyPaletteInner;
  applyPaletteInner(paletteIndex, true);

  /* ---------- pointer ---------- */
  const ndc = new THREE.Vector2();
  let px = 0, py = 0, pointerActive = false;
  let yaw = 0, pitch = 0;
  let gYaw = -1.6, gPitch = 0.35, gVel = 0, dragging = false, lastDragX = 0, lastDragY = 0;
  let m = -1;

  addEventListener('pointermove', (e) => {
    px = (e.clientX / innerWidth) * 2 - 1;
    py = -((e.clientY / innerHeight) * 2 - 1);
    ndc.set(px, py);
    pointerActive = true;
    if (dragging) {
      const dx = e.clientX - lastDragX, dy = e.clientY - lastDragY;
      lastDragX = e.clientX; lastDragY = e.clientY;
      gVel = dx * 0.006;
      gYaw += gVel;
      gPitch = Math.max(-0.7, Math.min(0.9, gPitch + dy * 0.004));
    }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointerActive = false; });
  addEventListener('pointerup', (e) => {
    dragging = false;
    document.body.classList.remove('is-dragging');
    if (e.pointerType !== 'mouse') pointerActive = false;
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (m < 3.7) return;
    dragging = true;
    lastDragX = e.clientX; lastDragY = e.clientY;
    document.body.classList.add('is-dragging');
  });

  /* ---------- sizing ---------- */
  let baseZ = 6.2, aspect = 1;
  function resize() {
    const pr = Math.min(devicePixelRatio, coarse ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight, false);
    aspect = innerWidth / innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    baseZ = aspect < 1 ? (6.2 / Math.max(aspect, 0.45)) * 0.8 : 6.2;
    pointUniforms.uPR.value = pr;
    globe.setPixelRatio(pr);
    const v = renderer.getDrawingBufferSize(new THREE.Vector2());
    bg.setSize(v.x, v.y);
  }
  resize();
  addEventListener('resize', resize);

  /* ---------- per-target transforms ---------- */
  const M = T.targets.map(() => new THREE.Matrix4());
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'XYZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const setM = (k, x, y, z, pit, yw, sc) => {
    _e.set(pit, yw, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.setScalar(sc);
    M[k].compose(_p, _q, _s);
  };
  const neck = new Float32Array((NECK_STEPS + 1) * 9);
  const [PX, PY, PZ] = T.neckPivot;
  const pA = T.targets.map((t) => t.pos);
  const { headW, braidT, braidS, floatingBraids: floating } = T;
  let time = 0;
  const sway = reduced ? 0.3 : 1;

  function tf(k, i, out, o) {
    const p = pA[k], i3 = i * 3;
    let x = p[i3], y = p[i3 + 1], z = p[i3 + 2];
    if (k === 0) {
      const bt = braidT[i];
      if (bt > (floating ? 0.04 : 0.6)) { // floating tails sway along their length
        const s = braidS[i], a = (floating ? bt * 1.6 : ((bt - 0.6) / 0.4) ** 2) * sway;
        x += Math.sin(time * 0.9 + bt * 4 + s * 1.7) * 0.2 * a;
        y += Math.cos(time * 0.7 + bt * 3 + s) * 0.12 * a;
        z += Math.sin(time * 0.6 + bt * 5 + s * 2.3) * 0.14 * a;
      }
      const q = headW[i];
      if (q) {
        const n = q * 9, dx = x - PX, dy = y - PY, dz = z - PZ;
        x = neck[n] * dx + neck[n + 1] * dy + neck[n + 2] * dz + PX;
        y = neck[n + 3] * dx + neck[n + 4] * dy + neck[n + 5] * dz + PY;
        z = neck[n + 6] * dx + neck[n + 7] * dy + neck[n + 8] * dz + PZ;
      }
    }
    const e = M[k].elements;
    out[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
    out[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    out[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const ray = new THREE.Raycaster();
  const tmp = new Float32Array(6);
  const K = 40, C = reduced ? 13 : 4.2, REPEL = 95;
  let last = performance.now(), intro = reduced ? 0 : 1, lastColorM = -1;

  function frame(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30)); // rAF time can precede `last`
    last = now;
    time += dt;

    // scroll → morph value 0..4
    const x = ui.getProgress();
    const i0 = Math.floor(x);
    const target = i0 >= LAST ? LAST : i0 + smooth(0.6, 0.92, x - i0);
    if (m < 0) m = target; // first frame: start on the chapter the page was restored to
    m += (target - m) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - m) < 1e-4) m = target;
    const seg = Math.max(0, Math.min(LAST - 1, Math.floor(m)));
    const t = m - seg;
    const e = ease(t);
    const wave = Math.sin(Math.PI * t);

    intro = Math.max(0, intro - dt / 2.4);
    const introE = intro * intro;
    pointUniforms.uFade.value = Math.min(1, pointUniforms.uFade.value + dt * 0.8);

    // camera flies into the cloud mid-transition
    camera.position.set(0, 0, baseZ - (reduced ? 0 : wave * baseZ * 0.45));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // head: neck turns toward the cursor, shoulders stay put
    const k = 1 - Math.exp(-dt * 9);
    yaw += ((pointerActive ? px : 0) * MAX_TURN - yaw) * k;
    pitch += ((pointerActive ? -py : 0) * MAX_TURN - pitch) * k;
    for (let q = 0; q <= NECK_STEPS; q++) {
      const w = q / NECK_STEPS, a = yaw * w, b = pitch * w;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      neck.set([ca, sa * sb, sa * cb, 0, cb, -sb, -sa, ca * sb, ca * cb], q * 9);
    }

    // layout: shapes sit beside the copy on wide screens, above it on tall ones
    const halfW = baseZ * Math.tan((17.5 * Math.PI) / 180) * aspect;
    const side = aspect >= 1 ? Math.max(0, Math.min(1.4, halfW - 1.95)) : 0;
    const up = aspect >= 1 ? 0 : 0.95;
    const mx = pointerActive ? px : 0, my = pointerActive ? py : 0;
    setM(0, 0, aspect >= 1 ? 0 : 0.55, 0, 0, 0, 1);
    setM(1, side, up, 0, 0.25 - my * 0.25, time * 0.18 + mx * 0.5 - 0.6, aspect >= 1 ? 1.3 : 1.05);
    setM(2, -side, up, 0, 0.15 - my * 0.2, time * 0.12 + mx * 0.4 + 0.6, aspect >= 1 ? 0.95 : 0.75);
    setM(3, side, up, 0, -my * 0.35, mx * 0.45, aspect >= 1 ? 0.95 : 0.8);
    if (!dragging) {
      gVel *= Math.exp(-dt * 2.5);
      gYaw += gVel + dt * (reduced ? 0.02 : 0.08);
    }
    setM(4, 0, aspect >= 1 ? -0.02 : 0.85, 0, gPitch, gYaw, aspect >= 1 ? 0.86 : 0.8);
    globe.group.matrix.copy(M[4]);
    globe.group.matrixWorldNeedsUpdate = true;

    // pointer ray for the elastic push
    ray.setFromCamera(ndc, camera);
    const ro = ray.ray.origin, rd = ray.ray.direction;
    const camDist = camera.position.z;
    const spread = (reduced ? 0 : wave * 1.8) + introE * 4;
    const A = seg, B = seg + 1;
    const onlyA = e < 1e-4, onlyB = e > 1 - 1e-4;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let x0, y0, z0;
      if (onlyB) { tf(B, i, tmp, 0); x0 = tmp[0]; y0 = tmp[1]; z0 = tmp[2]; }
      else {
        tf(A, i, tmp, 0);
        x0 = tmp[0]; y0 = tmp[1]; z0 = tmp[2];
        if (!onlyA) {
          tf(B, i, tmp, 3);
          x0 += (tmp[3] - x0) * e; y0 += (tmp[4] - y0) * e; z0 += (tmp[5] - z0) * e;
        }
      }
      if (spread > 0) {
        x0 += scatter[i3] * spread; y0 += scatter[i3 + 1] * spread; z0 += scatter[i3 + 2] * spread;
      }

      let fx = 0, fy = 0, fz = 0;
      if (pointerActive && !dragging) {
        const vx = x0 + off[i3] - ro.x, vy = y0 + off[i3 + 1] - ro.y, vz = z0 + off[i3 + 2] - ro.z;
        const along = vx * rd.x + vy * rd.y + vz * rd.z;
        const cx = vx - rd.x * along, cy = vy - rd.y * along, cz = vz - rd.z * along;
        const R = 0.6 * (along / camDist);
        const d2 = cx * cx + cy * cy + cz * cz;
        if (d2 < R * R && along > 0) {
          const d = Math.sqrt(d2) + 1e-5;
          let f = 1 - d / R;
          f = f * f * REPEL;
          fx = (cx / d) * f; fy = (cy / d) * f; fz = (cz / d) * f + f * 0.3;
        }
      }
      // underdamped spring = elastic return
      vel[i3] += (-K * off[i3] - C * vel[i3] + fx) * dt;
      vel[i3 + 1] += (-K * off[i3 + 1] - C * vel[i3 + 1] + fy) * dt;
      vel[i3 + 2] += (-K * off[i3 + 2] - C * vel[i3 + 2] + fz) * dt;
      off[i3] += vel[i3] * dt; off[i3 + 1] += vel[i3 + 1] * dt; off[i3 + 2] += vel[i3 + 2] * dt;

      pos[i3] = x0 + off[i3]; pos[i3 + 1] = y0 + off[i3 + 1]; pos[i3 + 2] = z0 + off[i3 + 2];
    }
    geo.attributes.position.needsUpdate = true;

    if (colorsDirty || m !== lastColorM) {
      const a = baked[A], b = baked[B];
      for (let j = 0; j < N * 3; j++) col[j] = a[j] + (b[j] - a[j]) * e;
      geo.attributes.color.needsUpdate = true;
      colorsDirty = false;
      lastColorM = m;
    }

    globe.update(dt, smooth(3.55, 3.97, m));
    document.body.classList.toggle('globe-live', m > 3.7);

    pointUniforms.uTime.value = time;
    bg.uniforms.uTime.value = time * (reduced ? 0.25 : 1);
    bg.uniforms.uShift.value = m;
    bg.uniforms.uMouse.value.lerp(ndc, 0.03);

    renderer.clear();
    bg.render(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function applyPalette(idx, instant) {
  if (applyPaletteImpl) applyPaletteImpl(idx, instant);
  else { paletteIndex = idx; ui.setPalette(PALETTES[idx]); }
}
if (!renderer) applyPalette(paletteIndex, true);

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
