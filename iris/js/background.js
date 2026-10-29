// Dark liquid backdrop: domain-warped fbm drawn at half resolution, then upscaled with grain.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const LIQUID = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uSeed, uShift;
uniform vec2 uRes, uMouse;
uniform vec3 uC0, uC1, uC2, uC3;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02 + 17.1; a *= 0.5; }
  return v;
}
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * asp * 1.6 + uSeed;
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + 0.6 * t + uMouse * 0.12),
                fbm(p + 3.5 * q + vec2(8.3, 2.8) - 0.4 * t));
  float f = fbm(p + 3.0 * r + uShift * 0.55);

  vec3 col = uC0;
  col = mix(col, uC1, clamp(f * f * 1.7, 0.0, 1.0));
  col = mix(col, uC2, clamp(length(q) * 0.55, 0.0, 1.0) * 0.6);
  float ink = smoothstep(0.62, 0.95, f + 0.15 * r.x);
  col = mix(col, uC3, ink * 0.45);
  float sheen = pow(clamp(1.0 - abs(r.y - 0.5) * 6.0, 0.0, 1.0), 3.0);
  col += uC3 * sheen * 0.05;
  col *= 0.5 + 0.45 * f;
  float v = smoothstep(1.25, 0.2, length((vUv - 0.5) * asp));
  col *= mix(0.3, 1.0, v);
  gl_FragColor = vec4(col, 1.0);
}`;

const BLIT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tMap;
uniform float uTime;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(tMap, vUv).rgb;
  c += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.03;
  gl_FragColor = vec4(c, 1.0);
}`;

export function createBackground(renderer) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });

  const uniforms = {
    uTime: { value: 0 }, uSeed: { value: 0 }, uShift: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2() },
    uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() },
    uC2: { value: new THREE.Color() }, uC3: { value: new THREE.Color() },
  };
  const liquid = new THREE.Mesh(tri, new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: LIQUID, uniforms, depthTest: false, depthWrite: false,
  }));
  const blitMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: BLIT, depthTest: false, depthWrite: false,
    uniforms: { tMap: { value: rt.texture }, uTime: uniforms.uTime },
  });
  const blit = new THREE.Mesh(tri, blitMat);
  liquid.frustumCulled = blit.frustumCulled = false;
  const liquidScene = new THREE.Scene().add(liquid);
  const blitScene = new THREE.Scene().add(blit);

  // Palette crossfade
  const from = [0, 1, 2, 3].map(() => new THREE.Color());
  const to = [0, 1, 2, 3].map(() => new THREE.Color());
  const slots = [uniforms.uC0.value, uniforms.uC1.value, uniforms.uC2.value, uniforms.uC3.value];
  let mix = 1;

  return {
    uniforms,
    setPalette(hexes, seed, instant) {
      slots.forEach((c, i) => { from[i].copy(c); to[i].set(hexes[i]); if (instant) c.set(hexes[i]); });
      uniforms.uSeed.value = seed;
      mix = instant ? 1 : 0;
    },
    setSize(w, h) {
      rt.setSize(Math.max(2, Math.ceil(w * 0.5)), Math.max(2, Math.ceil(h * 0.5)));
      uniforms.uRes.value.set(w, h);
    },
    render(dt) {
      if (mix < 1) {
        mix = Math.min(1, mix + dt / 1.4);
        const e = mix * mix * (3 - 2 * mix);
        slots.forEach((c, i) => c.copy(from[i]).lerp(to[i], e));
      }
      renderer.setRenderTarget(rt);
      renderer.render(liquidScene, cam);
      renderer.setRenderTarget(null);
      renderer.render(blitScene, cam);
    },
  };
}
