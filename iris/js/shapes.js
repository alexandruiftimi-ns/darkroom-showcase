// Particle targets. Every target holds N particles; particle i flies from target k to target k+1.
// Colour is stored as a palette role + brightness so a palette swap only re-bakes colours.
import { isLand, latLonToVec3, CITIES, GLOBE_RADIUS } from './geo.js';

export const ROLE = { BASE: 0, ACCENT: 1, ACCENT2: 2, DIM: 3, GRAD: 4 };
export const NECK_STEPS = 16;

const TAU = Math.PI * 2;

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function makeNoise3(rand) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const P = new Uint16Array(512);
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const V = new Float32Array(256).map(() => rand());
  const h = (x, y, z) => V[P[P[P[x & 255] + (y & 255)] + (z & 255)]];
  const lerp = (a, b, t) => a + (b - a) * t;
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let u = x - xi, v = y - yi, w = z - zi;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
    return lerp(
      lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
      w,
    );
  };
}

function gauss(rand) {
  return Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(TAU * rand());
}

function unitVec(rand) {
  const z = rand() * 2 - 1, a = rand() * TAU, r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), r * Math.sin(a), z];
}

function createTarget(n) {
  const t = { pos: new Float32Array(n * 3), role: new Uint8Array(n), lum: new Float32Array(n), grad: new Float32Array(n), i: 0 };
  t.put = (x, y, z, role, lum, g = 0) => {
    const i = t.i++;
    t.pos[i * 3] = x; t.pos[i * 3 + 1] = y; t.pos[i * 3 + 2] = z;
    t.role[i] = role; t.lum[i] = lum; t.grad[i] = g;
    return i;
  };
  return t;
}

/* ---------- 0 · Head bust ----------
   Sculpted in head units (chin ≈ 0, crown ≈ 1), then baked to world space with HS / HOY.
   Reference: beanie, face mask, funnel-neck techwear jacket, chest harness, twin braids worn forward. */

const HS = 1.25, HOY = 0.02;
export const NECK_PIVOT = [0, -0.38 * HS + HOY, -0.03 * HS];

const sq = Math.sqrt;
const len3 = (x, y, z) => sq(x * x + y * y + z * z);
function sdEllipsoid(x, y, z, a, b, c) {
  const px = x / a, py = y / b, pz = z / c;
  const k0 = sq(px * px + py * py + pz * pz);
  const qx = px / a, qy = py / b, qz = pz / c;
  const k1 = sq(qx * qx + qy * qy + qz * qz);
  return k1 === 0 ? -Math.min(a, b, c) : (k0 * (k0 - 1)) / k1;
}
const sdSphere = (x, y, z, r) => len3(x, y, z) - r;
function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
const smax = (a, b, k) => -smin(-a, -b, k);

const sdEyeball = (x, y, z) => sdSphere(Math.abs(x) - 0.115, y - 0.495, z - 0.275, 0.058);

function sdFace(x, y, z) {
  const ax = Math.abs(x);
  let d = sdEllipsoid(x, y - 0.62, z + 0.05, 0.35, 0.42, 0.43); // cranium
  d = smin(d, sdEllipsoid(x, y - 0.4, z - 0.07, 0.29, 0.38, 0.31), 0.1); // face mass
  d = smin(d, sdEllipsoid(x, y - 0.18, z - 0.06, 0.23, 0.2, 0.26), 0.12); // jaw
  d = smin(d, sdSphere(x, y - 0.05, z - 0.2, 0.085), 0.1); // chin
  d = smin(d, sdEllipsoid(ax - 0.19, y - 0.41, z - 0.2, 0.1, 0.07, 0.1), 0.08); // cheekbones
  d = smin(d, sdEllipsoid(x, y - 0.575, z - 0.29, 0.25, 0.045, 0.07), 0.06); // brow ridge
  d = smin(d, sdCapsule(x, y, z, 0, 0.52, 0.33, 0, 0.37, 0.41, 0.035), 0.05); // nose
  d = smin(d, sdCapsule(x, y, z, 0, -0.5, -0.04, 0, 0.15, 0, 0.115), 0.08); // neck
  d = smax(d, -sdSphere(ax - 0.115, y - 0.5, z - 0.34, 0.07), 0.04); // eye sockets
  d = Math.min(d, sdEyeball(x, y, z));
  d = smin(d, sdEllipsoid(ax - 0.345, y - 0.44, z + 0.02, 0.035, 0.085, 0.06), 0.03); // ears
  return d;
}

const beanieEdge = (z) => 0.56 + 0.2 * z;
function sdBeanie(x, y, z) {
  let d = sdEllipsoid(x, y - 0.64, z + 0.05, 0.385, 0.46, 0.47);
  d = smin(d, sdEllipsoid(x, y - 1.0, z + 0.1, 0.2, 0.12, 0.22), 0.14); // slouch
  const e = beanieEdge(z);
  const cuff = Math.max(sdEllipsoid(x, y - 0.64, z + 0.05, 0.4, 0.475, 0.485), y - (e + 0.13));
  return Math.max(Math.min(d, cuff), e - y);
}

function sdBody(x, y, z) {
  const ax = Math.abs(x);
  let d = sdEllipsoid(x, y + 1.06, z, 0.6, 0.64, 0.33); // rib cage under the jacket
  d = smin(d, sdCapsule(ax, y, z, 0, -0.38, -0.06, 0.6, -0.62, -0.03, 0.14), 0.16); // trapezius slope
  d = smin(d, sdEllipsoid(ax - 0.66, y + 0.74, z, 0.21, 0.22, 0.25), 0.16); // padded shoulders
  d = smin(d, sdCapsule(ax, y, z, 0.72, -0.8, -0.01, 0.78, -1.8, -0.03, 0.18), 0.1); // upper arms
  d = smin(d, sdEllipsoid(ax - 0.2, y + 1.14, z - 0.19, 0.18, 0.16, 0.14), 0.14); // chest
  // funnel collar that flares into the shoulders
  const r = sq(x * x + (z + 0.03) * (z + 0.03)), cr = 0.18 + 0.16 * smoothstep(-0.12, -0.52, y);
  d = smin(d, Math.max(Math.abs(r - cr) - 0.03, Math.abs(y + 0.3) - 0.26), 0.1);
  return Math.max(d, -(y + 1.6));
}

const sdAll = (x, y, z) => Math.min(sdFace(x, y, z), sdBeanie(x, y, z), sdBody(x, y, z));

const _g = [0, 0, 0];
function gradient(f, x, y, z) {
  const h = 0.0015;
  const a = f(x + h, y - h, z - h), b = f(x - h, y - h, z + h), c = f(x - h, y + h, z - h), d = f(x + h, y + h, z + h);
  const gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d;
  const l = sq(gx * gx + gy * gy + gz * gz) || 1;
  _g[0] = gx / l; _g[1] = gy / l; _g[2] = gz / l;
  return _g;
}

const LIGHT = (() => { const l = len3(-0.4, 0.5, 0.77); return [-0.4 / l, 0.5 / l, 0.77 / l]; })();
const shade = (nx, ny, nz) => 0.42 + 0.58 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);

function catmull(pts, t, out) {
  const n = pts.length - 1, f = Math.min(t * n, n - 1e-6), i = Math.floor(f), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  for (let j = 0; j < 3; j++) {
    out[j] = 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u +
      (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u * u * u);
  }
  return out;
}

function buildHead(n, rand) {
  const T = createTarget(n);
  const headW = new Uint8Array(n);
  const braidT = new Float32Array(n).fill(-1);
  const braidS = new Int8Array(n);
  const G = ROLE.GRAD;
  const gradY = (y) => smoothstep(1.15, -1.6, y);
  const put = (x, y, z, role, lum, w) => {
    const i = T.put(x * HS, y * HS + HOY, z * HS, role, lum, gradY(y));
    headW[i] = w;
    return i;
  };

  const nBraid = Math.floor(n * 0.17), nHead = Math.floor(n * 0.47), nBody = n - nBraid - nHead;

  // Head, mask and beanie
  for (let k = 0; k < nHead;) {
    let x = (rand() - 0.5) * 0.9, y = -0.3 + rand() * 1.45, z = (rand() - 0.5) * 1.1;
    if (Math.abs(sdAll(x, y, z)) > 0.02) continue;
    for (let it = 0; it < 2; it++) {
      const d = sdAll(x, y, z), g = gradient(sdAll, x, y, z);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
    }
    const dFace = sdFace(x, y, z), dBean = sdBeanie(x, y, z);
    if (sdBody(x, y, z) < Math.min(dFace, dBean) || y < -0.3) continue;
    const [nx, ny, nz] = gradient(sdAll, x, y, z);
    if (nz < -0.3 && rand() > 0.45) continue;
    let role = G, lum = shade(nx, ny, nz);
    const ax = Math.abs(x);

    if (dBean < dFace) { // knit beanie: ribbed cuff, small logo
      const e = beanieEdge(z);
      if (y < e + 0.13) {
        const rib = (Math.atan2(x, z) * 34 / Math.PI) % 1;
        lum *= Math.abs(rib) < 0.5 ? 0.95 : 0.6;
        if (nz > 0.8 && ax < (y - e - 0.02) * 0.55 && y > e + 0.025) { role = ROLE.ACCENT; lum = 1.4; }
      } else {
        lum *= 0.72 + 0.12 * Math.sin(y * 120);
      }
    } else if (sdEyeball(x, y, z) < 0.004) { // the only machine in her: lit eyes
      if (nz < 0.55) continue;
      const pupil = sq((ax - 0.115) ** 2 + (y - 0.495) ** 2) < 0.018;
      role = pupil ? ROLE.BASE : ROLE.ACCENT; lum = pupil ? 2.2 : 1.4;
    } else {
      const maskTop = 0.455 - 0.32 * x * x;
      const inMask = y < maskTop && (z > -0.06 || y < 0.12) && !(ax > 0.31 && y > 0.36);
      if (inMask) {
        const s = 0.012; x += nx * s; y += ny * s; z += nz * s; // fabric sits over the face
        lum *= Math.abs(y - maskTop) < 0.014 ? 1.6 : 0.55;
        if (ax < 0.008 && nz > 0.3) lum *= 1.6; // centre seam
      } else if (Math.abs(ax - 0.115) < 0.11 && y > 0.43 && y < 0.6 && z > 0.15) {
        lum *= 0.55; // shadowed sockets so the eyes glow, not the rims
      } else if (z < 0.02 && y < beanieEdge(z) && y > 0.08) { // hair gathered at the nape
        const strand = Math.abs((Math.atan2(x, -z) * 50) % 1);
        lum *= 0.65 + 0.35 * strand;
      }
    }
    put(x, y, z, role, lum, y > -0.05 ? NECK_STEPS : Math.round(smoothstep(-0.4, -0.05, y) * NECK_STEPS));
    k++;
  }

  // Jacket, collar and harness. Shoulders never turn.
  for (let k = 0; k < nBody;) {
    let x = (rand() - 0.5) * 2.3, y = -1.6 + rand() * 1.55, z = (rand() - 0.5) * 1.0;
    if (Math.abs(sdBody(x, y, z)) > 0.03) continue;
    for (let it = 0; it < 2; it++) {
      const d = sdBody(x, y, z), g = gradient(sdBody, x, y, z);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
    }
    if (y < -1.6 || sdFace(x, y, z) < 0) continue;
    const [nx, ny, nz] = gradient(sdBody, x, y, z);
    if (nz < -0.3 && rand() > 0.3) continue;
    const ax = Math.abs(x);
    let role = G, lum = shade(nx, ny, nz) * 0.5;
    const collar = y > -0.6 && sq(x * x + (z + 0.03) ** 2) < 0.36;
    if (collar) {
      lum = shade(nx, ny, nz) * (Math.abs(y + 0.04) < 0.02 ? 1.3 : 0.65);
    } else if (Math.abs(y + 0.98) < 0.06 && ax < 0.08 && nz > 0.5) {
      role = ROLE.ACCENT; lum = 1.3; // buckle
    } else if (Math.abs(y + 0.98) < 0.035 && nz > 0.15) {
      lum = shade(nx, ny, nz) * 0.95; // chest strap
    } else if (Math.abs(ax - 0.33 - 0.03 * (y + 0.6)) < 0.04 && (nz > 0.05 || y > -0.66)) {
      lum = shade(nx, ny, nz) * 0.9; // shoulder straps
      if (Math.abs(y + 1.32) < 0.03) { role = ROLE.ACCENT; lum = 1.1; }
    } else if (ax < 0.009 && nz > 0.5) {
      role = ROLE.ACCENT2; lum = 0.8; // zip
    } else if (x > 0.12 && x < 0.3 && y < -0.7 && y > -0.76 && nz > 0.4 && rand() < 0.5) {
      role = ROLE.ACCENT; lum = 0.9; // chest print
    }
    lum *= smoothstep(-1.6, -1.15, y); // dissolves at the cut, like a scan
    put(x, y, z, role, lum, 0);
    k++;
  }

  // Twin braids: from the nape, forward over the shoulders, loose ends drifting
  const C = [0, 0, 0], C2 = [0, 0, 0];
  for (let k = 0; k < nBraid; k++) {
    const s = k % 2 ? 1 : -1;
    const P = [[0.26, 0.5, -0.3], [0.36, 0.3, -0.2], [0.42, 0.05, -0.02], [0.44, -0.3, 0.15], [0.42, -0.7, 0.3],
      [0.4, -1.1, 0.36], [0.48, -1.42, 0.4], [0.72, -1.58, 0.42], [0.95, -1.5, 0.4]].map((p) => [p[0] * s, p[1], p[2]]);
    const t = rand();
    catmull(P, t, C); catmull(P, Math.min(1, t + 0.004), C2);
    // keep the braid resting on the jacket, not inside it
    const db = sdBody(C[0], C[1], C[2]), clear = 0.075 * (1 - 0.3 * t);
    if (db < clear) { const g = gradient(sdBody, C[0], C[1], C[2]); C[0] += g[0] * (clear - db); C[1] += g[1] * (clear - db); C[2] += g[2] * (clear - db); }
    let tx = C2[0] - C[0], ty = C2[1] - C[1], tz = C2[2] - C[2];
    const tl = len3(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    let nx = ty, ny = -tx, nz = 0; // N = T × Z
    const nl = sq(nx * nx + ny * ny) || 1; nx /= nl; ny /= nl;
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    const tuft = t > 0.88 ? (t - 0.88) / 0.12 : 0;
    const strand = Math.floor(rand() * 3), ph = t * 46 + (strand * TAU) / 3;
    const rr = 0.04 * (1 - 0.35 * t) * (1 - tuft);
    const sx = C[0] + (nx * Math.cos(ph) + bx * Math.sin(ph) * 0.6) * rr;
    const sy = C[1] + (ny * Math.cos(ph) + by * Math.sin(ph) * 0.6) * rr;
    const sz = C[2] + (nz * Math.cos(ph) + bz * Math.sin(ph) * 0.6) * rr;
    // a point on the surface of that strand
    const a = rand() * TAU, tube = 0.028 * (1 - 0.4 * t) + tuft * 0.07 * rand();
    const ox = (nx * Math.cos(a) + bx * Math.sin(a)) * tube, oy = (ny * Math.cos(a) + by * Math.sin(a)) * tube, oz = (nz * Math.cos(a) + bz * Math.sin(a)) * tube;
    const tie = Math.abs(t - 0.87) < 0.01;
    const lum = tie ? 1.3 : shade(ox / (tube || 1), oy / (tube || 1), oz / (tube || 1)) * 1.25;
    const i = put(sx + ox, sy + oy, sz + oz, G, lum, Math.round((1 - smoothstep(0.16, 0.38, t)) * NECK_STEPS));
    braidT[i] = t;
    braidS[i] = s;
  }

  return Object.assign(T, { headW, braidT, braidS });
}

/* ---------- 1 · Brain ---------- */

function buildBrain(n, rand, noise) {
  const T = createTarget(n);
  const nHemi = Math.floor(n * 0.72), nCere = Math.floor(n * 0.12), nStem = Math.floor(n * 0.04);
  for (let k = 0; k < nHemi; k++) {
    const d = unitVec(rand), s = d[0] >= 0 ? 1 : -1;
    let ax = 0.05 + Math.abs(d[0]) * 0.66, y = d[1] * 0.62, z = d[2] * 0.92;
    if (y < -0.25) y = -0.25 + (y + 0.25) * 0.5;
    const ridge = 1 - Math.abs(noise(ax * 3.4 + s * 10, y * 3.4, z * 3.4) * 2 - 1);
    const kk = 1 + (ridge - 0.5) * 0.12;
    ax = 0.05 + (ax - 0.05) * kk; y *= kk; z *= kk;
    const role = ridge > 0.86 ? ROLE.ACCENT : ridge > 0.5 ? ROLE.BASE : ROLE.DIM;
    T.put(s * ax, y + 0.1, z, role, 0.3 + ridge * 0.8);
  }
  for (let k = 0; k < nCere; k++) {
    const d = unitVec(rand), y = -0.36 + d[1] * 0.2;
    T.put(d[0] * 0.44, y, -0.55 + d[2] * 0.3, Math.sin(y * 90) > 0.3 ? ROLE.BASE : ROLE.DIM, 0.45 + 0.35 * rand());
  }
  for (let k = 0; k < nStem; k++) {
    const a = rand() * TAU, h = rand();
    T.put(Math.cos(a) * 0.11 * (1 - h * 0.3), -0.25 - h * 0.65, -0.28 + Math.sin(a) * 0.11, ROLE.DIM, 0.55);
  }
  while (T.i < n) { // synapse sparks inside the cortex
    const d = unitVec(rand), r = Math.cbrt(rand()) * 0.8;
    T.put(d[0] * 0.7 * r, d[1] * 0.55 * r + 0.1, d[2] * 0.9 * r, ROLE.ACCENT2, 0.8 + rand() * 0.6);
  }
  return T;
}

/* ---------- 2 · Neural lattice ---------- */

function buildNetwork(n, rand) {
  const T = createTarget(n);
  const counts = [6, 10, 14, 10, 6], xs = [-1.7, -0.85, 0, 0.85, 1.7], radii = [0.55, 0.95, 1.15, 0.95, 0.55];
  const layers = counts.map((c, l) =>
    Array.from({ length: c }, (_, k) => {
      const a = (k / c) * TAU + l * 0.3;
      return [xs[l], Math.cos(a) * radii[l], Math.sin(a) * radii[l]];
    }));
  const nodes = layers.flat();
  const edges = [];
  for (let l = 0; l < layers.length - 1; l++) for (const a of layers[l]) for (const b of layers[l + 1]) edges.push([a, b]);

  const nNode = Math.floor(n * 0.3), nEdge = Math.floor(n * 0.62);
  for (let k = 0; k < nNode; k++) {
    const p = nodes[Math.floor(rand() * nodes.length)];
    if (rand() < 0.3) { // halo ring
      const a = rand() * TAU;
      T.put(p[0], p[1] + Math.cos(a) * 0.11, p[2] + Math.sin(a) * 0.11, ROLE.BASE, 0.7);
    } else {
      T.put(p[0] + gauss(rand) * 0.035, p[1] + gauss(rand) * 0.035, p[2] + gauss(rand) * 0.035, ROLE.ACCENT, 1.2);
    }
  }
  for (let k = 0; k < nEdge; k++) {
    const ei = Math.floor(rand() * edges.length), [a, b] = edges[ei], t = rand();
    const hot = ei % 7 === 0;
    T.put(a[0] + (b[0] - a[0]) * t + gauss(rand) * 0.006, a[1] + (b[1] - a[1]) * t + gauss(rand) * 0.006,
      a[2] + (b[2] - a[2]) * t + gauss(rand) * 0.006,
      hot ? ROLE.ACCENT2 : ROLE.DIM, hot ? 0.85 : 0.3 + 0.5 * Math.pow(Math.abs(t - 0.5) * 2, 3));
  }
  while (T.i < n) {
    const d = unitVec(rand), r = Math.cbrt(rand());
    T.put(d[0] * 2.2 * r, d[1] * 1.4 * r, d[2] * 1.4 * r, ROLE.DIM, 0.2 + rand() * 0.2);
  }
  return T;
}

/* ---------- 3 · Eye ---------- */

function buildEye(n, rand) {
  const T = createTarget(n);
  const R = 1.25, irisR = 0.98, irisZ = Math.sqrt(R * R - irisR * irisR);
  const nFib = Math.floor(n * 0.42), nPupil = Math.floor(n * 0.07), nLimb = Math.floor(n * 0.07), nScl = Math.floor(n * 0.16);
  for (let k = 0; k < nFib; k++) {
    const f = Math.floor(rand() * 240), r = 0.3 + rand() * 0.68;
    const a = (f / 240) * TAU + (rand() - 0.5) * 0.01 + 0.04 * Math.sin(r * 18 + f);
    const collar = Math.exp(-Math.pow((r - 0.52) / 0.04, 2));
    T.put(Math.cos(a) * r, Math.sin(a) * r, irisZ + 0.1 * (1 - (r / irisR) ** 2),
      r < 0.52 ? ROLE.ACCENT2 : ROLE.ACCENT, (r > 0.9 ? 0.45 : 0.6) + collar * 0.7);
  }
  for (let k = 0; k < nPupil; k++) {
    const a = rand() * TAU, r = 0.27 + rand() * 0.035;
    T.put(Math.cos(a) * r, Math.sin(a) * r, irisZ + 0.1, ROLE.BASE, 1.3);
  }
  for (let k = 0; k < nLimb; k++) {
    const a = rand() * TAU, r = irisR + rand() * 0.06;
    T.put(Math.cos(a) * r, Math.sin(a) * r, irisZ - 0.02, ROLE.ACCENT, 1.1);
  }
  for (let k = 0; k < nScl; k++) {
    const d = unitVec(rand);
    if (d[2] > 0.6) { k--; continue; }
    T.put(d[0] * R, d[1] * R, d[2] * R, ROLE.DIM, 0.3 + rand() * 0.3);
  }
  // Scanner orbits: dashed rings at different tilts
  const rings = [[1.6, 0.4, 0.2, 18], [1.78, -0.5, 0.6, 40], [1.95, 1.2, -0.3, 9]];
  while (T.i < n) {
    const [rad, tx, ty, segs] = rings[Math.floor(rand() * rings.length)];
    const a = ((Math.floor(rand() * segs) + rand() * 0.55) / segs) * TAU;
    let x = Math.cos(a) * rad, y = Math.sin(a) * rad, z = gauss(rand) * 0.01;
    let c = Math.cos(tx), s = Math.sin(tx);
    [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(ty); s = Math.sin(ty);
    [x, z] = [x * c + z * s, -x * s + z * c];
    T.put(x, y, z, rad > 1.9 ? ROLE.ACCENT2 : ROLE.BASE, 0.55 + rand() * 0.3);
  }
  return T;
}

/* ---------- 4 · OSINT globe ---------- */

function buildGlobe(n, rand) {
  const T = createTarget(n);
  const R = GLOBE_RADIUS;
  const nGrid = Math.floor(n * 0.16), nHalo = Math.floor(n * 0.08), nCity = Math.floor(n * 0.06);
  const nLand = n - nGrid - nHalo - nCity;
  while (T.i < nLand) {
    const d = unitVec(rand);
    const lat = (Math.asin(d[1]) * 180) / Math.PI, lon = (Math.atan2(d[0], d[2]) * 180) / Math.PI;
    if (!isLand(lat, lon)) continue;
    T.put(d[0] * R, d[1] * R, d[2] * R, ROLE.BASE, 0.5 + rand() * 0.4);
  }
  for (let k = 0; k < nGrid; k++) {
    let lat, lon;
    if (rand() < 0.5) { lat = -60 + Math.floor(rand() * 7) * 20; lon = rand() * 360 - 180; }
    else { lon = -180 + Math.floor(rand() * 12) * 30; lat = rand() * 160 - 80; }
    const p = latLonToVec3(lat, lon, R * 0.995);
    T.put(p[0], p[1], p[2], ROLE.DIM, 0.28);
  }
  for (let k = 0; k < nHalo; k++) {
    const d = unitVec(rand), r = R * (1.04 + rand() * rand() * 0.2);
    T.put(d[0] * r, d[1] * r, d[2] * r, ROLE.ACCENT, 0.2);
  }
  while (T.i < n) {
    const c = CITIES[Math.floor(rand() * CITIES.length)];
    const p = latLonToVec3(c[1], c[2], R * 1.005);
    T.put(p[0] + gauss(rand) * 0.014, p[1] + gauss(rand) * 0.014, p[2] + gauss(rand) * 0.014, ROLE.ACCENT2, 1.3);
  }
  return T;
}

/* ---------- 0b · Head from a mesh (assets/iris.glb) ----------
   mesh: { bust: {pos, idx, ao?}, eyes?: {pos, idx}, landmarks: {top, neck, eyeL, eyeR, head} } in the file's units.
   Framing: crown near the top of the view, collarbones at the bottom edge. */

function meshSampler(pos, idx) {
  const nTri = idx.length / 3;
  const vn = new Float32Array(pos.length);
  const cdf = new Float64Array(nTri);
  let total = 0;
  for (let t = 0; t < nTri; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) { vn[o] += nx; vn[o + 1] += ny; vn[o + 2] += nz; }
    total += Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5;
    cdf[t] = total;
  }
  for (let i = 0; i < vn.length; i += 3) {
    const l = Math.sqrt(vn[i] ** 2 + vn[i + 1] ** 2 + vn[i + 2] ** 2) || 1;
    vn[i] /= l; vn[i + 1] /= l; vn[i + 2] /= l;
  }
  const out = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, w: [0, 0, 0], tri: 0 };
  // area-weighted random point, Phong-tessellated so flat triangles read as smooth skin
  out.sample = (rand) => {
    const r = rand() * total;
    let lo = 0, hi = nTri - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; }
    const s1 = Math.sqrt(rand()), s2 = rand();
    const w = [1 - s1, s1 * (1 - s2), s1 * s2];
    let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 3; k++) {
      const o = idx[lo * 3 + k] * 3;
      px += pos[o] * w[k]; py += pos[o + 1] * w[k]; pz += pos[o + 2] * w[k];
      nx += vn[o] * w[k]; ny += vn[o + 1] * w[k]; nz += vn[o + 2] * w[k];
    }
    let qx = 0, qy = 0, qz = 0;
    for (let k = 0; k < 3; k++) {
      const o = idx[lo * 3 + k] * 3;
      const d = (px - pos[o]) * vn[o] + (py - pos[o + 1]) * vn[o + 1] + (pz - pos[o + 2]) * vn[o + 2];
      qx += (px - d * vn[o]) * w[k]; qy += (py - d * vn[o + 1]) * w[k]; qz += (pz - d * vn[o + 2]) * w[k];
    }
    const a = 0.7;
    out.x = px * (1 - a) + qx * a; out.y = py * (1 - a) + qy * a; out.z = pz * (1 - a) + qz * a;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    out.nx = nx / l; out.ny = ny / l; out.nz = nz / l;
    out.w = w; out.tri = lo;
    return out;
  };
  return out;
}

function buildHeadFromMesh(n, rand, mesh) {
  const T = createTarget(n);
  const headW = new Uint8Array(n);
  const braidT = new Float32Array(n).fill(-1);
  const braidS = new Int8Array(n);
  const L = mesh.landmarks;
  const eyeY = (L.eyeL[1] + L.eyeR[1]) / 2;
  const unit = L.top - eyeY; // crown to eye line, about half a head
  const collar = L.neck[1] - unit * 0.48; // collarbone line
  const S = 3.4 / (L.top - collar);
  const cz = L.head ? L.head[2] : 0;
  const W = (x, y, z) => [x * S, (y - L.top) * S + 1.5, (z - cz) * S];
  const neckLo = L.neck[1] - unit * 0.3, neckHi = L.neck[1] + unit * 0.45;
  const pivot = W(0, L.neck[1] - unit * 0.15, L.neck[2]);
  const G = ROLE.GRAD;
  const gradY = (wy) => smoothstep(1.8, -1.9, wy);
  const LT = [-0.62, 0.42, 0.66];
  const ll = len3(LT[0], LT[1], LT[2]); LT[0] /= ll; LT[1] /= ll; LT[2] /= ll;
  const put = (x, y, z, role, lum, w) => {
    const p = W(x, y, z);
    const i = T.put(p[0], p[1], p[2], role, lum, gradY(p[1]));
    headW[i] = w;
    return i;
  };

  const nBraid = Math.floor(n * 0.13), nHair = Math.floor(n * 0.15), nTie = Math.floor(n * 0.012);
  const nEyes = mesh.eyes ? Math.floor(n * 0.008) : 0;
  const nBust = n - nBraid - nHair - nTie - nEyes;
  const bust = meshSampler(mesh.bust.pos, mesh.bust.idx);
  const ao = mesh.bust.ao, curv = mesh.bust.curv, bIdx = mesh.bust.idx;
  const FILL = [0.55, 0.05, 0.6];
  const attr = (arr, s) => (arr ? arr[bIdx[s.tri * 3]] * s.w[0] + arr[bIdx[s.tri * 3 + 1]] * s.w[1] + arr[bIdx[s.tri * 3 + 2]] * s.w[2] : null);

  // Scalp: above a hairline that sits at the forehead, rises over the ears and drops to the nape
  const hc = [0, eyeY + unit * 0.2, cz - unit * 0.15];
  const onScalp = (x, y, z) => {
    const front = smoothstep(-0.9, 0.85, (z - hc[2]) / unit); // 0 at the back, 1 at the face
    const line = -0.95 + front * (0.62 + 0.95); // hairline height relative to the eye line
    const temple = Math.abs(x) / unit > 0.62 && front > 0.45 ? 0.25 : 0;
    return (y - eyeY) / unit > line + temple;
  };

  const shadeSkin = (s) => {
    const occ = attr(ao, s) ?? 1, cv = attr(curv, s) ?? 0;
    const lambert = Math.max(0, s.nx * LT[0] + s.ny * LT[1] + s.nz * LT[2]);
    const fill = Math.max(0, s.nx * FILL[0] + s.ny * FILL[1] + s.nz * FILL[2]) * 0.22;
    const rim = Math.pow(1 - Math.abs(s.nz), 4) * 0.2;
    return (0.04 + 1.05 * Math.pow(lambert, 1.7) + fill + rim) * (0.06 + 0.94 * occ * occ * occ) * (1 + 0.45 * cv);
  };

  for (let k = 0; k < nBust;) {
    const s = bust.sample(rand);
    const { x, y, z, nz } = s;
    if (y <= neckLo && rand() > 0.32) continue; // spend the budget on the face
    if (nz < -0.25 && rand() > 0.4) continue; // the back is mostly hidden
    if (onScalp(x, y, z) && rand() > 0.25) continue; // hair covers it
    let lum = shadeSkin(s);
    const wy = (y - L.top) * S + 1.5;
    lum *= 0.35 + 0.65 * smoothstep(-2.15, -1.2, wy); // dissolves below the collarbones
    put(x, y, z, G, lum, Math.round(smoothstep(neckLo, neckHi, y) * NECK_STEPS));
    k++;
  }

  if (nEyes) { // the machine shows only in the eyes
    const eyes = meshSampler(mesh.eyes.pos, mesh.eyes.idx);
    for (let k = 0; k < nEyes;) {
      const { x, y, z, nz } = eyes.sample(rand);
      if (nz < 0.35) continue;
      const e = x > 0 ? L.eyeL : L.eyeR;
      const r = Math.hypot(x - e[0], y - e[1]) / unit;
      if (r > 0.065) continue; // only the iris shows between the lids
      const pupil = r < 0.025;
      put(x, y, z + unit * 0.004, pupil ? ROLE.BASE : ROLE.ACCENT, pupil ? 2.4 : 1.5, NECK_STEPS);
      k++;
    }
  }

  // Tail roots: the scalp points furthest out toward the upper back of each side
  const roots = [-1, 1].map((sd) => {
    const dir = [sd * 0.62, 0.42, -0.7];
    let best = null, bestDot = -Infinity;
    for (let k = 0; k < 6000; k++) {
      const s = bust.sample(rand);
      const dx = s.x - hc[0], dy = s.y - hc[1], dz = s.z - hc[2];
      const d = (dx * dir[0] + dy * dir[1] + dz * dir[2]) / (len3(dx, dy, dz) || 1);
      if (d > bestDot) { bestDot = d; best = [s.x, s.y, s.z, s.nx, s.ny, s.nz]; }
    }
    return best;
  });

  // Hair: combed from the hairline toward the nearer tail, slightly lifted off the scalp
  for (let k = 0; k < nHair;) {
    const s = bust.sample(rand);
    if (!onScalp(s.x, s.y, s.z)) continue;
    if (s.nz < -0.3 && rand() > 0.5) continue;
    const R = roots[s.x > 0 ? 1 : 0];
    let dx = R[0] - s.x, dy = R[1] - s.y, dz = R[2] - s.z;
    const along = dx * s.nx + dy * s.ny + dz * s.nz; // keep the comb direction on the surface
    dx -= along * s.nx; dy -= along * s.ny; dz -= along * s.nz;
    const dl = len3(dx, dy, dz) || 1;
    const u = rand() * 0.22 * unit, lift = unit * (0.035 + 0.07 * rand() * rand());
    const x = s.x + s.nx * lift + (dx / dl) * u, y = s.y + s.ny * lift + (dy / dl) * u, z = s.z + s.nz * lift + (dz / dl) * u;
    // strand banding: lines that converge on the tie
    const ang = Math.atan2(s.y - R[1], (s.z - R[2]) + (s.x - R[0]) * 0.3);
    const band = 0.55 + 0.45 * Math.abs(Math.sin(ang * 38 + Math.sin(ang * 7) * 2));
    const lambert = Math.max(0, s.nx * LT[0] + s.ny * LT[1] + s.nz * LT[2]);
    put(x, y, z, G, (0.16 + 1.05 * Math.pow(lambert, 1.3)) * band * 1.3, NECK_STEPS);
    k++;
  }

  // Hair ties: a ring at each root
  for (let k = 0; k < nTie; k++) {
    const R = roots[k % 2], a = rand() * TAU;
    let ux = -R[5], uy = 0, uz = R[3]; // tangent ⟂ normal
    const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
    const vx = R[4] * uz - R[5] * uy, vy = R[5] * ux - R[3] * uz, vz = R[3] * uy - R[4] * ux;
    const b = rand() * TAU, tube = unit * 0.035, r = unit * 0.075 + Math.cos(b) * tube, out = unit * 0.07 + Math.sin(b) * tube;
    put(R[0] + R[3] * out + (ux * Math.cos(a) + vx * Math.sin(a)) * r, R[1] + R[4] * out + (uy * Math.cos(a) + vy * Math.sin(a)) * r,
      R[2] + R[5] * out + (uz * Math.cos(a) + vz * Math.sin(a)) * r, G, 0.35 + 0.35 * Math.max(0, Math.sin(b)), NECK_STEPS); // same tone as the hair: the cloud is see-through
  }

  // Twin tails: grow out of the ties and float to the sides
  const C = [0, 0, 0], C2 = [0, 0, 0];
  for (let k = 0; k < nBraid; k++) {
    const sd = k % 2 ? 1 : -1;
    const R = roots[k % 2 ? 1 : 0];
    const o = [[0, 0, 0], [0.35, 0.12, -0.12], [0.85, 0.05, -0.3], [1.3, -0.55, -0.3], [1.55, -1.5, -0.12],
      [1.7, -2.5, 0.05], [2.0, -3.2, 0.1], [2.35, -3.55, 0.05]];
    const P = o.map((p, j) => [R[0] + R[3] * unit * 0.1 * (j ? 1 : 0.4) + sd * p[0] * unit, R[1] + p[1] * unit, R[2] + p[2] * unit]);
    const t = rand();
    catmull(P, t, C); catmull(P, Math.min(1, t + 0.004), C2);
    let tx = C2[0] - C[0], ty = C2[1] - C[1], tz = C2[2] - C[2];
    const tl = len3(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    let nx = ty, ny = -tx, nz = 0;
    const nl = sq(nx * nx + ny * ny) || 1; nx /= nl; ny /= nl;
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    const tuft = t > 0.9 ? (t - 0.9) / 0.1 : 0;
    const strand = Math.floor(rand() * 3), ph = t * 52 + (strand * TAU) / 3;
    const rr = unit * 0.075 * (1 - 0.35 * t) * (1 - tuft);
    const sx = C[0] + (nx * Math.cos(ph) + bx * Math.sin(ph) * 0.6) * rr;
    const sy = C[1] + (ny * Math.cos(ph) + by * Math.sin(ph) * 0.6) * rr;
    const sz = C[2] + (nz * Math.cos(ph) + bz * Math.sin(ph) * 0.6) * rr;
    const a = rand() * TAU, tube = unit * (0.052 * (1 - 0.4 * t) + tuft * 0.12 * rand());
    const ox = (nx * Math.cos(a) + bx * Math.sin(a)) * tube, oy = (ny * Math.cos(a) + by * Math.sin(a)) * tube, oz = (nz * Math.cos(a) + bz * Math.sin(a)) * tube;
    const tie = Math.abs(t - 0.89) < 0.008;
    const lambert = Math.max(0, (ox * LT[0] + oy * LT[1] + oz * LT[2]) / (tube || 1));
    const i = put(sx + ox, sy + oy, sz + oz, G, tie ? 1.4 : (0.2 + 0.8 * lambert) * 1.1, NECK_STEPS);
    braidT[i] = t;
    braidS[i] = sd;
  }

  return Object.assign(T, { headW, braidT, braidS, neckPivot: pivot, floatingBraids: true });
}

export function buildTargets(n, seed = 9, mesh = null) {
  const rand = mulberry32(seed);
  const noise = makeNoise3(rand);
  const head = mesh ? buildHeadFromMesh(n, rand, mesh) : buildHead(n, rand);
  return {
    targets: [head, buildBrain(n, rand, noise), buildNetwork(n, rand), buildEye(n, rand), buildGlobe(n, rand)],
    headW: head.headW,
    braidT: head.braidT,
    braidS: head.braidS,
    neckPivot: head.neckPivot || NECK_PIVOT,
    floatingBraids: !!head.floatingBraids,
  };
}
