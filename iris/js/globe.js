// Globe overlay: simulated OSINT / threat-intel traffic. Comet arcs, launch flashes, impact shockwaves,
// light beams, DDoS storms and an atmosphere. The group shares the globe particles' transform (main.js).
// Everything here is SIMULATED; the weights only mimic the shape of public threat reports.
import * as THREE from 'three';
import { GLOBE_RADIUS, latLonToVec3 } from './geo.js';

const SEG = 96; // points per arc
const ARC_COUNT = 42;
const RING_COUNT = 48;
const BEAM_COUNT = 24;

// [city, country code, lat, lon, source weight, target weight]
export const NODES = [
  ['Ashburn', 'US', 39.04, -77.49, 8, 6], ['New York', 'US', 40.71, -74.0, 5, 9], ['Washington', 'US', 38.9, -77.04, 2, 9],
  ['San Francisco', 'US', 37.77, -122.42, 4, 7], ['Los Angeles', 'US', 34.05, -118.24, 3, 4], ['Chicago', 'US', 41.88, -87.63, 3, 4],
  ['Dallas', 'US', 32.78, -96.8, 3, 4], ['Seattle', 'US', 47.61, -122.33, 2, 4], ['Toronto', 'CA', 43.65, -79.38, 2, 4],
  ['Montreal', 'CA', 45.5, -73.57, 1, 2], ['Mexico City', 'MX', 19.43, -99.13, 2, 2], ['Bogotá', 'CO', 4.71, -74.07, 2, 1],
  ['São Paulo', 'BR', -23.55, -46.63, 6, 3], ['Rio de Janeiro', 'BR', -22.91, -43.17, 2, 2], ['Buenos Aires', 'AR', -34.6, -58.38, 1, 1],
  ['Santiago', 'CL', -33.45, -70.67, 1, 1], ['London', 'GB', 51.5, -0.12, 4, 8], ['Dublin', 'IE', 53.35, -6.26, 2, 4],
  ['Amsterdam', 'NL', 52.37, 4.9, 7, 5], ['Frankfurt', 'DE', 50.11, 8.68, 6, 7], ['Berlin', 'DE', 52.52, 13.4, 2, 4],
  ['Paris', 'FR', 48.85, 2.35, 3, 6], ['Madrid', 'ES', 40.42, -3.7, 2, 3], ['Milan', 'IT', 45.46, 9.19, 2, 3],
  ['Zurich', 'CH', 47.37, 8.54, 1, 4], ['Stockholm', 'SE', 59.33, 18.07, 1, 2], ['Helsinki', 'FI', 60.17, 24.94, 1, 2],
  ['Warsaw', 'PL', 52.23, 21.01, 2, 4], ['Kyiv', 'UA', 50.45, 30.52, 1, 8], ['Bucharest', 'RO', 44.43, 26.1, 3, 1],
  ['Moscow', 'RU', 55.75, 37.62, 8, 3], ['St Petersburg', 'RU', 59.93, 30.36, 4, 1], ['Istanbul', 'TR', 41.01, 28.98, 3, 2],
  ['Tel Aviv', 'IL', 32.08, 34.78, 2, 7], ['Tehran', 'IR', 35.69, 51.39, 5, 2], ['Dubai', 'AE', 25.2, 55.27, 2, 4],
  ['Riyadh', 'SA', 24.71, 46.68, 1, 4], ['Cairo', 'EG', 30.04, 31.24, 2, 1], ['Lagos', 'NG', 6.52, 3.38, 3, 2],
  ['Nairobi', 'KE', -1.29, 36.82, 1, 2], ['Johannesburg', 'ZA', -26.2, 28.05, 2, 2], ['Mumbai', 'IN', 19.08, 72.88, 4, 5],
  ['Bengaluru', 'IN', 12.97, 77.59, 3, 5], ['Delhi', 'IN', 28.61, 77.21, 3, 4], ['Karachi', 'PK', 24.86, 67.0, 2, 1],
  ['Beijing', 'CN', 39.9, 116.4, 8, 3], ['Shanghai', 'CN', 31.23, 121.47, 7, 3], ['Shenzhen', 'CN', 22.54, 114.06, 5, 2],
  ['Hong Kong', 'HK', 22.32, 114.17, 4, 4], ['Taipei', 'TW', 25.03, 121.57, 1, 7], ['Seoul', 'KR', 37.57, 126.98, 3, 6],
  ['Pyongyang', 'KP', 39.04, 125.76, 4, 0], ['Tokyo', 'JP', 35.68, 139.69, 2, 7], ['Singapore', 'SG', 1.35, 103.82, 4, 6],
  ['Hanoi', 'VN', 21.03, 105.85, 4, 1], ['Ho Chi Minh City', 'VN', 10.82, 106.63, 3, 1], ['Bangkok', 'TH', 13.76, 100.5, 2, 2],
  ['Jakarta', 'ID', -6.2, 106.85, 3, 2], ['Manila', 'PH', 14.6, 120.98, 1, 2], ['Sydney', 'AU', -33.87, 151.21, 1, 4],
];

// Common vectors seen in public honeypot / IDS telemetry, plus widely reported public CVEs
export const VECTORS = [
  { type: 'SSH brute force', port: 'TCP/22', sev: 1, w: 9 },
  { type: 'Telnet scan (Mirai variant)', port: 'TCP/23', sev: 1, w: 7 },
  { type: 'Mass port scan', port: 'TCP/1-65535', sev: 1, w: 8 },
  { type: 'RDP credential spray', port: 'TCP/3389', sev: 2, w: 6 },
  { type: 'SMB exploitation attempt', port: 'TCP/445', sev: 2, w: 4 },
  { type: 'Log4Shell probe · CVE-2021-44228', port: 'TCP/8080', sev: 2, w: 4 },
  { type: 'PAN-OS exploit · CVE-2024-3400', port: 'TCP/443', sev: 3, w: 2 },
  { type: 'Citrix Bleed · CVE-2023-4966', port: 'TCP/443', sev: 3, w: 2 },
  { type: 'Ivanti Connect Secure · CVE-2024-21887', port: 'TCP/443', sev: 3, w: 2 },
  { type: 'MOVEit SQLi · CVE-2023-34362', port: 'TCP/443', sev: 3, w: 1 },
  { type: 'Web shell upload', port: 'HTTP/80', sev: 3, w: 2 },
  { type: 'Phishing kit staged', port: 'HTTPS', sev: 2, w: 5 },
  { type: 'Credential dump posted', port: 'Paste site', sev: 2, w: 3 },
  { type: 'Botnet C2 beacon', port: 'HTTPS/8443', sev: 3, w: 3 },
  { type: 'DNS tunnelling', port: 'UDP/53', sev: 2, w: 2 },
  { type: 'NTP amplification', port: 'UDP/123', sev: 2, w: 3 },
  { type: 'Exposed Elasticsearch indexed', port: 'TCP/9200', sev: 1, w: 3 },
  { type: 'Ransomware staging (rclone exfil)', port: 'HTTPS', sev: 3, w: 1 },
  { type: 'Malicious OAuth consent grant', port: 'HTTPS', sev: 2, w: 2 },
];
export const SECTORS = ['Finance', 'Government', 'Healthcare', 'Energy', 'Telecom', 'Education', 'Retail', 'Manufacturing', 'Defence', 'Logistics', 'Cloud hosting'];

function weighted(list, key) {
  let total = 0;
  for (const it of list) total += key(it);
  let r = Math.random() * total;
  for (const it of list) { r -= key(it); if (r <= 0) return it; }
  return list[list.length - 1];
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

const TRAIL_VERT = /* glsl */ `
attribute float aT, aArc;
uniform float uHeads[${ARC_COUNT}], uFades[${ARC_COUNT}], uPR, uSize;
varying float vA;
varying float vArc;
void main() {
  int k = int(aArc + 0.5);
  float head = uHeads[k];
  float d = head - aT;
  float comet = step(0.0, d) * pow(1.0 - clamp(d / 0.42, 0.0, 1.0), 2.2);
  float trail = step(aT, head) * 0.1;
  vA = (comet + trail) * uFades[k];
  vArc = aArc;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPR * (0.35 + comet * 1.1) / -mv.z;
}`;
const TRAIL_FRAG = /* glsl */ `
uniform vec3 uColors[${ARC_COUNT}];
uniform float uOpacity;
varying float vA;
varying float vArc;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColors[int(vArc + 0.5)], a * vA * uOpacity);
}`;
const RING_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FRAG = /* glsl */ `
uniform float uProg, uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float ring = smoothstep(uProg - 0.22, uProg, r) * (1.0 - smoothstep(uProg, uProg + 0.04, r));
  float core = (1.0 - smoothstep(0.0, 0.18, r)) * (1.0 - uProg) * 0.8;
  gl_FragColor = vec4(uColor, (ring + core) * (1.0 - uProg) * uOpacity);
}`;
const BEAM_VERT = /* glsl */ `
attribute float aT;
varying float vT;
void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uLife, uOpacity;
varying float vT;
void main() {
  float a = (1.0 - vT) * (1.0 - uLife) * smoothstep(0.0, 0.08, uLife + 0.02);
  gl_FragColor = vec4(uColor, a * uOpacity);
}`;
const ATMO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const ATMO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(vN, vV)), 4.5);
  gl_FragColor = vec4(uColor, f * 0.45 * uOpacity);
}`;

export function createGlobeFx({ onSignal, onStorm, pixelRatio }) {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  const R = GLOBE_RADIUS;
  const sevColor = { 1: new THREE.Color(), 2: new THREE.Color(), 3: new THREE.Color('#ff3b4e') };

  const occluder = new THREE.Mesh(new THREE.SphereGeometry(R * 0.97, 48, 32), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.renderOrder = -1;
  group.add(occluder);

  const atmoUniforms = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } };
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, 64, 48), new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, uniforms: atmoUniforms, side: THREE.BackSide, ...additive,
  }));
  atmo.renderOrder = 1;
  group.add(atmo);

  const nodeVec = NODES.map((c) => new THREE.Vector3(...latLonToVec3(c[2], c[3], R)));

  // Comet trails: one Points cloud for every arc
  const trailPos = new Float32Array(ARC_COUNT * SEG * 3);
  const trailT = new Float32Array(ARC_COUNT * SEG);
  const trailArc = new Float32Array(ARC_COUNT * SEG);
  for (let a = 0; a < ARC_COUNT; a++) for (let i = 0; i < SEG; i++) { trailT[a * SEG + i] = i / (SEG - 1); trailArc[a * SEG + i] = a; }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('aT', new THREE.BufferAttribute(trailT, 1));
  trailGeo.setAttribute('aArc', new THREE.BufferAttribute(trailArc, 1));
  const trailUniforms = {
    uHeads: { value: new Float32Array(ARC_COUNT) }, uFades: { value: new Float32Array(ARC_COUNT) },
    uColors: { value: Array.from({ length: ARC_COUNT }, () => new THREE.Color()) },
    uPR: { value: pixelRatio }, uSize: { value: 70 }, uOpacity: { value: 0 },
  };
  const trails = new THREE.Points(trailGeo, new THREE.ShaderMaterial({ vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, uniforms: trailUniforms, ...additive }));
  trails.frustumCulled = false;
  trails.renderOrder = 3;
  group.add(trails);

  // Shockwave rings (impacts and launch flashes)
  const ringGeo = new THREE.PlaneGeometry(1, 1);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const rings = Array.from({ length: RING_COUNT }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({
      vertexShader: RING_VERT, fragmentShader: RING_FRAG, ...additive, side: THREE.DoubleSide,
      uniforms: { uProg: { value: 1 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color() } },
    }));
    m.renderOrder = 2;
    m.visible = false;
    group.add(m);
    return { m, t: 1, dur: 1, size: 0.4 };
  });
  let ringIdx = 0;
  function ring(p, color, size, dur, delay = 0) {
    const r = rings[ringIdx++ % RING_COUNT];
    r.m.position.copy(p).multiplyScalar(1.004);
    r.m.quaternion.setFromUnitVectors(zAxis, p.clone().normalize());
    r.m.scale.setScalar(size);
    r.m.material.uniforms.uColor.value.copy(color);
    r.t = -delay; r.dur = dur;
  }

  // Light beams shooting out of hit targets
  const beams = Array.from({ length: BEAM_COUNT }, () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    g.setAttribute('aT', new THREE.BufferAttribute(new Float32Array([0, 1]), 1));
    const l = new THREE.Line(g, new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, ...additive,
      uniforms: { uColor: { value: new THREE.Color() }, uLife: { value: 1 }, uOpacity: { value: 0 } },
    }));
    l.frustumCulled = false; l.renderOrder = 2; l.visible = false;
    group.add(l);
    return { l, t: 1 };
  });
  let beamIdx = 0;
  function beam(p, color, len) {
    const b = beams[beamIdx++ % BEAM_COUNT];
    const arr = b.l.geometry.attributes.position.array;
    const n = p.clone().normalize();
    p.toArray(arr, 0);
    n.multiplyScalar(R + len).toArray(arr, 3);
    b.l.geometry.attributes.position.needsUpdate = true;
    b.l.material.uniforms.uColor.value.copy(color);
    b.t = 0;
  }

  const arcs = Array.from({ length: ARC_COUNT }, (_, idx) => ({ idx, curve: null, life: -Math.random() * 4, dur: 2, fired: false, ev: null }));
  const tmp = new THREE.Vector3();

  function launch(a, src, dst, vec, storm) {
    const p0 = nodeVec[src], p2 = nodeVec[dst];
    const ang = p0.angleTo(p2);
    const lift = storm ? 1.08 + ang * 0.22 : 1.1 + ang * (0.22 + Math.random() * 0.18);
    const mid = p0.clone().add(p2).normalize().multiplyScalar(R * lift);
    a.curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    for (let i = 0; i < SEG; i++) a.curve.getPoint(i / (SEG - 1), tmp).toArray(trailPos, (a.idx * SEG + i) * 3);
    a.ev = { ...vec, src: NODES[src], dst: NODES[dst], sector: SECTORS[Math.floor(Math.random() * SECTORS.length)], storm: !!storm };
    trailUniforms.uColors.value[a.idx].copy(sevColor[vec.sev]);
    a.dur = (storm ? 1.1 : 1.3) + ang * (storm ? 0.5 : 0.8);
    a.life = 0;
    a.fired = false;
    ring(p0, sevColor[vec.sev], 0.16, 0.7);
    trailGeo.attributes.position.needsUpdate = true;
  }

  function spawn(a) {
    const vec = weighted(VECTORS, (v) => v.w);
    let src, dst;
    do {
      src = NODES.indexOf(weighted(NODES, (n) => n[4]));
      dst = NODES.indexOf(weighted(NODES, (n) => n[5]));
    } while (src === dst || NODES[src][1] === NODES[dst][1]);
    launch(a, src, dst, vec);
  }

  // DDoS storm: many sources converge on one target
  let stormIn = 6 + Math.random() * 6;
  function storm() {
    const dst = NODES.indexOf(weighted(NODES, (n) => n[5]));
    const vec = { type: 'Volumetric DDoS', port: Math.random() < 0.5 ? 'UDP/123 · NTP' : 'UDP/53 · DNS', sev: 3 };
    const free = arcs.filter((a) => !a.curve || a.life > a.dur + 1.2 || a.life < 0).slice(0, 9 + Math.floor(Math.random() * 5));
    const sources = new Set();
    for (const a of free) {
      let src;
      do { src = NODES.indexOf(weighted(NODES, (n) => n[4])); } while (src === dst);
      sources.add(NODES[src][1]);
      launch(a, src, dst, vec, true);
      a.life = -Math.random() * 0.5;
    }
    onStorm?.({ dst: NODES[dst], sources: free.length, countries: sources.size, gbps: Math.round(120 + Math.random() * 680), port: vec.port });
  }

  const fades = trailUniforms.uFades.value, heads = trailUniforms.uHeads.value;
  return {
    group,
    setColors(accent, accent2) { sevColor[1].set(accent); sevColor[2].set(accent2); atmoUniforms.uColor.value.set(accent); },
    setPixelRatio(pr) { trailUniforms.uPR.value = pr; },
    update(dt, opacity) {
      group.visible = opacity > 0.001;
      if (!group.visible) return;
      trailUniforms.uOpacity.value = opacity;
      atmoUniforms.uOpacity.value = opacity;
      const live = opacity > 0.6;

      if (live && (stormIn -= dt) < 0) { storm(); stormIn = 9 + Math.random() * 9; }

      for (const a of arcs) {
        a.life += dt;
        if (a.life < 0 || !a.curve) {
          fades[a.idx] = 0;
          if (!a.curve && a.life >= 0) { spawn(a); a.life = -Math.random() * 2; }
          continue;
        }
        const head = a.life / a.dur;
        heads[a.idx] = head;
        fades[a.idx] = head < 1 ? Math.min(1, a.life * 4) : Math.max(0, 1 - (a.life - a.dur) / 0.9);
        if (head >= 1 && !a.fired) {
          a.fired = true;
          const p = a.curve.v2, c = sevColor[a.ev.sev];
          ring(p, c, a.ev.sev === 3 ? 0.62 : 0.4, 1.2);
          if (a.ev.sev >= 2) ring(p, c, a.ev.sev === 3 ? 0.95 : 0.6, 1.6, 0.18);
          if (a.ev.sev === 3) beam(p, c, 0.25 + Math.random() * 0.25);
          if (live && !a.ev.storm) onSignal?.(a.ev);
        }
        if (a.life > a.dur + 0.9) { spawn(a); a.life = -Math.random() * (live ? 0.8 : 2); }
      }

      for (const r of rings) {
        r.t += dt / r.dur;
        const on = r.t >= 0 && r.t < 1;
        r.m.visible = on;
        if (on) { r.m.material.uniforms.uProg.value = r.t; r.m.material.uniforms.uOpacity.value = opacity; }
      }
      for (const b of beams) {
        b.t += dt / 1.4;
        b.l.visible = b.t < 1;
        b.l.material.uniforms.uLife.value = b.t;
        b.l.material.uniforms.uOpacity.value = opacity;
      }
    },
  };
}
