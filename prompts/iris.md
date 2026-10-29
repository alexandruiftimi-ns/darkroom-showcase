# Build prompt: IRIS/09, "AI, driven by a human mind"

Build a single-page, static (no build step) sci-fi landing page in vanilla HTML/CSS/JS with Three.js r170 from a
CDN import map. A full-screen WebGL particle system tells a five-chapter scroll story. It starts as a realistic
female bust that turns toward the cursor and ends as an interactive OSINT threat-map globe. The UI is
"liquid glass". Follow every section below. Numbers are the tuned values: use them as given.

---

## 0. Ground rules

- Static files only: `index.html`, `css/style.css`, `js/*.js`, `assets/iris.glb`, `tools/build_bust.py`, `DECISIONS.md`.
  Serve the folder with any static server (`npx http-server -p 4817 -a 127.0.0.1 -c-1 .`). Check the port is free first.
- Import map: `"three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"`,
  `"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"`.
- Set `THREE.ColorManagement.enabled = false` so the hex colours in the ShaderMaterials render exactly as written.
- **Native scroll only.** No wheel hijacking, no scroll snapping, everything reversible.
- Fonts: Geist (300–600) and Geist Mono (400–500) from Google Fonts.
- Respect `prefers-reduced-motion`: no scatter or camera dolly, critically damped springs (damping 13), liquid
  background at 0.25× speed, CSS animations off.
- If WebGL fails, add `html.no-webgl`, show a CSS radial-gradient fallback, and keep the UI fully working.
- Do not write tests unless asked. Verify visually with headless Chrome (puppeteer-core plus the installed Chrome,
  `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`), including at `deviceScaleFactor: 2`.

## 1. Concept and story

The protagonist is **IRIS/09**, a fictional female synthetic analyst. She looks human: a realistic bust, hair
combed back into two high bunches with floating twin tails. Her only machine tell is glowing irises.
The concept is **"AI driven by a human mind"**, and the closing beat ties it to OSINT: open-source intelligence is
the trail people leave in public, AI gives it speed, and humans give it meaning and judgment.

| # | id | Nav label | Particle shape | Headline |
|---|----|-----------|----------------|----------|
| 0 | ch-0 | IRIS | Realistic female bust; the head turns at the neck ±30° toward the cursor | "AI, driven / by a *human mind.*" |
| 1 | ch-1 | Origin | Human brain (two hemispheres, gyri, cerebellum, stem, synapse sparks) | "Every model begins as someone's question." |
| 2 | ch-2 | Lattice | Neural network (layers 6/10/14/10/6 on rings, all-to-all edges) | "Intent, wired into a lattice." |
| 3 | ch-3 | Sight | Eye: iris fibres, pupil, limbus, sclera shell, three dashed scanner orbits; tracks the cursor | "She reads what the world leaves in the open." |
| 4 | ch-4 | World (footer) | Dotted Earth with OSINT/cyber-attack arcs; drag to rotate | "The world, read in real time." |

Copy (use it verbatim):

- **Hero.**
  - Eyebrow: "IRIS/09 · Synthetic analyst · Online" (with a pulsing dot).
  - Lede: "IRIS works at machine speed, and every question she answers started as a human one. Move your cursor
    and she'll turn to watch."
  - CTAs: "Enter the mind" (scrolls to 1) and "Request access" (opens the dialog).
  - Glass "Subject file" card on the right:
    - Build: Synthetic analyst, gen 4
    - Tails: Carbon filament, 2.1 m, held up by a static field
    - Wardrobe: Techwear shell, comms collar
    - Trained on: 40,000 hours of human analysts' decisions
  - Bottom-centre cue: "Scroll to go inside", with an animated line.
- **01 Origin.**
  - Body: "Nobody taught IRIS to be curious. She picked it up from the analysts who sat next to her: what they
    doubted, what they chased, and when they stopped. The mind sets the direction and the machine covers the
    distance."
  - Two glass stats: "100% / of objectives set by a person" and "1 : 1 / a human signs off on every call".
- **02 Lattice.**
  - Body: "Questions turn into weights, and weights turn into instinct. Each layer folds human judgment into
    something that runs a billion times a second and still answers to the person who asked."
  - Glass chart card "Model confidence vs. analyst agreement" with an "Illustrative" chip.
  - The chart is two SVG polylines over 12 rounds, with `pathLength="1"` and `stroke-dashoffset` drawn in when
    the chapter is first seen.
- **03 Sight.**
  - Body: "Open-source intelligence is the trail people leave in public: posts, certificates, ship transponders,
    exposed ports, satellite passes. IRIS watches all of it at once, and analysts decide what it means."
  - Glass pills: Certificate logs, Paste sites, AIS ship signals, Exposed services, Satellite passes, Public
    filings.
- **04 World (a `<footer>`).**
  - Body: "Each arc is a signal a person left behind, and a person will act on it. AI gives open-source
    intelligence its speed. The human mind gives it a reason."
  - Inline glass pill form: email input plus a "Request a briefing" button. On mobile this becomes a button that
    opens the dialog.
  - Threat feed panel (section 7).
  - "Drag to turn the globe" hint.
  - Legal bar: "© 2026 IRIS Labs. A fictional studio." · Privacy · Terms · Contact · "Palette: <name>".

## 2. Page architecture ("it shouldn't feel like scrolling")

- A full-screen `<canvas id="scene">` is `position:fixed` (`touch-action: pan-y`).
- Every chapter is a `position:fixed; inset:0` overlay (`.chapter[data-chapter]`), with `pointer-events:none`
  except on interactive or glass children.
- An empty `.track` div sets the scroll height to `4·H + innerHeight`, where `H = innerHeight × 1.6` (one
  chapter's scroll length). Progress is `x = scrollY / H`, from 0 to 4.
- Chapter i, with `u = x − i`:
  - `inA = i==0 ? 1 : smoothstep(-0.12, 0, u)`.
  - `outA = i==last ? 1 : 1 − smoothstep(0.5, 0.64, u)`.
  - `opacity = inA·outA`.
  - `transform = translateY((1−inA)·28px) scale((0.95+0.05·inA)·(1+(1−outA)·0.14))`, which reads as flying
    past the camera.
  - Headings blur via a `--blur` CSS variable.
  - When opacity ≈ 1, clear the inline styles (an opacity below 1 kills the children's backdrop-filter).
  - When opacity < 0.01, set `visibility:hidden` and `inert`.
- **Bug to avoid:** never put `data-chapter` on `<body>`. Select chapters with `.chapter[data-chapter]`. Use
  `body[data-active]` for the active index.
- Morph value for WebGL: `target = i0>=4 ? 4 : i0 + smoothstep(0.6, 0.92, x−i0)`, followed with
  `m += (target−m)·(1−e^(−7dt))`.
- Nav, rail and menu links call `scrollTo((i+0.06)·H)` (the footer scrolls to the bottom). Use smooth scrolling,
  or auto under reduced motion.
- **Bug to avoid on refresh mid-page:** clamp `dt = max(0, min((now−last)/1000, 1/30))`, since a rAF timestamp
  can be earlier than `performance.now()`. Clamp `seg = max(0, min(3, floor(m)))`. Initialise `m = −1` and snap
  `m = target` on the first frame. Otherwise the loop crashes and the canvas stays empty.

## 3. The bust: a real mesh, sampled into points

### 3a. Build the mesh (`tools/build_bust.py`, Python + numpy)

Use **MakeHuman hm08** data (explicitly CC0) from the MPFB2 extension zip
(extensions.blender.org/add-ons/mpfb). Read `data/3dobjs/base.obj` and the `data/targets/**/*.target.gz` files
(`index dx dy dz` per line) as **data only**; don't install or run the add-on.

1. Parse the OBJ vertices, plus faces per `g` group.
2. Apply the targets:
   - `macrodetails/{caucasian,asian,african}-female-young.target.gz`, each at weight 1/3.
   - `macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target.gz` at weight 1.
   - The universal targets are empty; skip them.
3. Landmarks:
   - `eyeL`/`eyeR` are the centres of the `joint-l-eye`/`joint-r-eye` groups.
   - `neck` is `joint-neck` and `head` is `joint-head`.
   - `top` is the maximum y of the `body` group.
4. Keep the `body` faces with every vertex above `cut = eyeY − (top−eyeY)·2.75` (mid-chest). Triangulate.
5. **Remove interior faces** (the mouth cavity shows through a transparent point cloud):
   - For faces above the neck, cast 5 rays (the normal plus 4 jittered at σ 0.45), using Möller–Trumbore against
     the head triangles.
   - If all 5 hit within 3 units, delete the face.
6. Bake **ambient occlusion** per vertex for the head and neck: 14 hemisphere rays, hits within 1.2 units,
   `AO = 1 − hits/14`.
7. Bake **convexity**:
   - `CURV = −dot(mean(neighbours) − v, normal)`.
   - Normalise by the 95th percentile and clamp to ±1.5.
8. Write the eye meshes from the `helper-l-eye`/`helper-r-eye` groups.
9. Write a minimal **GLB** by hand:
   - Node 0 `iris-bust`: POSITION, custom `_AO`, custom `_CURV`, uint32 indices, and
     `extras.landmarks = {eyeL, eyeR, top, cut, neck, head}`.
   - Node 1 `iris-eyes`: POSITION and indices.
   - Pad the chunks with `bytes(n)`. Don't write literal NUL characters into the Python source.
10. Output `assets/iris.glb` (about 160 KB, about 4.1k vertices and 7.5k triangles).

### 3b. Load it (`main.js`)

- Load with `GLTFLoader` (custom attributes become `_ao` and `_curv`) before starting the loop.
- Read `bust`/`eyes` by node name and the landmarks from `userData`.
- On failure, fall back to a procedural SDF bust.

### 3c. Sample it (`shapes.js`, `buildHeadFromMesh`)

**Normalising to world space**
- `unit = top − eyeY`.
- Collarbone line: `collar = neck.y − 0.48·unit`.
- `S = 3.4 / (top − collar)`.
- `world = (x·S, (y−top)·S + 1.5, (z − head.z)·S)`. The crown sits under the header and the collarbones at the
  bottom edge.

**Sampler**
- Area-weighted triangle choice (CDF plus binary search) with uniform barycentrics.
- **Phong tessellation** at α = 0.7, with interpolated vertex normals.

**Budget per mode**
- 13% tails, 15% scalp hair, 1.2% hair ties, 0.8% eyes, and the rest skin.

**Skin**
- Below `neckLo = neck.y − 0.3·unit`, keep 32% of samples.
- Back-facing samples (`nz < −0.25`): keep 40%.
- Samples under the hairline: keep 25%.
- Shading:
  - Key light `normalize(−0.62, 0.42, 0.66)`, fill `(0.55, 0.05, 0.6)·0.22`, rim `(1−|nz|)^4·0.2`.
  - `lum = (0.04 + 1.05·lambert^1.7 + fill + rim) · (0.06 + 0.94·AO³) · (1 + 0.45·CURV)`.
  - Then multiply by `0.35 + 0.65·smoothstep(−2.15, −1.2, worldY)` so the bust dissolves like a scan.
- Colour role GRAD, with `grad = smoothstep(1.8, −1.9, worldY)`.

**Neck turn weight**
- `round(smoothstep(neckLo, neck.y + 0.45·unit, y) · 16)`, in 17 quantised steps.

**Eyes**
- Sample the eye mesh; keep `nz > 0.35` and iris radius `< 0.065·unit`.
- Pupils (`< 0.025`) are BASE at brightness 2.4; irises are ACCENT at 1.5. They're the only glowing features.

**Hairline (`onScalp`)**
- `front = smoothstep(−0.9, 0.85, (z − hc.z)/unit)`, where `hc = (0, eyeY + 0.2·unit, head.z − 0.15·unit)`.
- Scalp means `(y − eyeY)/unit > −0.95 + front·1.57`, plus 0.25 at the temples (`|x|/unit > 0.62` and
  `front > 0.45`).

**Tail roots**
- Out of 6000 samples, pick the point that maximises `dot(normalize(p − hc), (±0.62, 0.42, −0.70))` on each side.

**Hair**
- Comb each scalp sample toward its side's root: take the direction, project it onto the tangent plane, and offset
  up to `0.22·unit` along it.
- Lift `unit·(0.035 + 0.07·r²)`.
- Strand banding: `0.55 + 0.45·|sin(angle·38 + sin(angle·7)·2)|` around the root.
- `lum = (0.16 + 1.05·lambert^1.3)·band·1.3`.

**Ties**
- A torus at each root: radius `0.075·unit`, tube `0.035·unit`, `0.07·unit` out along the normal.
- Use GRAD at a low brightness. The cloud is see-through, so an accent-coloured tie reads as a third eye.

**Floating twin tails**
- Catmull–Rom through the offsets from the root, in units, x mirrored per side:
  `(0,0,0), (.35,.12,−.12), (.85,.05,−.3), (1.3,−.55,−.3), (1.55,−1.5,−.12), (1.7,−2.5,.05), (2,−3.2,.1),
  (2.35,−3.55,.05)`.
- 3-strand braid: phase `t·52 + k·2π/3`, braid radius `0.075·unit·(1−0.35t)`, tube `0.052·unit·(1−0.4t)`.
- Tuft for `t > 0.9`, plus a second tie at `t ≈ 0.89`.
- Neck weight 16; `braidT = t` and side are stored for the sway.

## 4. Particle engine (`main.js`)

**Counts**
- N = 90,000 on desktop and 30,000 when the pointer is coarse or the viewport is under 760 px.
- Five targets × N particles, each holding pos, role, lum and grad.

**Palette roles:** 0 base, 1 accent, 2 accent2, 3 dim, 4 GRAD (top→bottom).

**Colours**
- Baked per target, then mixed with the ease during a transition (re-bake only when the palette changes).

**Per-frame CPU loop**
1. Transform targets A and B for the current segment.
   - Head target only:
     - Tail sway, `amp = bt·1.6`:
       - `x += sin(t·0.9 + bt·4 + s·1.7)·0.2a`
       - `y += cos(t·0.7 + bt·3 + s)·0.12a`
       - `z += sin(t·0.6 + bt·5 + s·2.3)·0.14a`
     - Neck rotation about the pivot `world(0, neck.y − 0.15·unit, neck.z)`, using 17 precomputed matrices
       `Ry(yaw·w)·Rx(pitch·w)`.
   - Then apply each target's Matrix4 (offset, Euler XYZ, scale).
2. Mix with an ease-in-out cubic.
3. Add `scatter[i]·(sin(πt)·1.8 + intro²·4)`. The scatter vectors are random within a radius of 1.2–2.8, with
   z + 0.8. `intro` goes from 1 to 0 over 2.4 s.
4. **Elastic cursor push**:
   - Take the ray from the camera through the pointer. Find the perpendicular from the particle to the ray, with
     `R = 0.6·(along/camDist)`.
   - Force `(1 − d/R)²·95` along the perpendicular, plus 0.3 of that in z.
   - Spring: `v += (−40·off − 4.2·v + F)·dt; off += v·dt` (underdamped, so it overshoots elastically).
5. Write positions every frame (`DynamicDrawUsage`).

**Head turn**
- `yaw → px·30°` and `pitch → −py·30°`, smoothed by `1−e^(−9dt)`.
- They return to 0 when the pointer leaves.

**Per-target transforms** (wide screens; `side = clamp(halfW − 1.95, 0, 1.4)`)

| Target | Offset | Rotation | Scale |
|--------|--------|----------|-------|
| 0 head | (0, 0, 0) | none | 1 |
| 1 brain | (+side, 0, 0) | yaw `t·0.18 + mx·0.5 − 0.6`, pitch `0.25 − my·0.25` | 1.3 |
| 2 lattice | (−side, 0, 0) | yaw `t·0.12 + mx·0.4 + 0.6`, pitch `0.15 − my·0.2` | 0.95 |
| 3 eye | (+side, 0, 0) | yaw `mx·0.45`, pitch `−my·0.35` (looks at you) | 0.95 |
| 4 globe | (0, −0.02, 0) | pitch `gPitch`, yaw `gYaw` | 0.86 |

- On portrait screens, shapes move up (y + 0.55 to 0.95) and the camera pulls back:
  `baseZ = 6.2/max(aspect, 0.45)·0.8`.

**Camera**
- FOV 35, z = 6.2.
- Dolly into the cloud mid-transition: `z = baseZ − sin(πt)·baseZ·0.45`. This is what makes scrolling feel like
  being inside the animation.

**Globe interaction**
- When `m > 3.7`, pointer-down on the canvas starts a drag: `gYaw += dx·0.006`, `gPitch` clamped to
  [−0.7, 0.9] with `dy·0.004`.
- Inertia `e^(−2.5dt)` and auto-spin 0.08 rad/s. Add `body.globe-live` for the grab cursor.

**Points shader**
- `size = min(16·aSize·PR·twinkle/−mvz, 48·PR)`, with aSize in 0.7–1.3 and twinkle `0.9 + 0.1·sin`.
- Crisp disc: alpha `1 − smoothstep(.28, .5, d)` × 0.5.
- Additive blending, `depthTest:false`, fade near the camera `smoothstep(0.25, 1.4, −mvz)`.
- Pixel ratio capped at 1.75 (1.5 on touch devices).

## 5. Other shapes (`shapes.js`, seeded mulberry32)

- **Brain:**
  - 72% hemispheres: unit sphere `(0.05 + |x|·0.66, y·0.62, z·0.92)`, flattened below −0.25, with a 3D value-noise
    ridge displacement of ±6%.
  - Brightness and role follow the ridge: above 0.86 accent, above 0.5 base, otherwise dim.
  - 12% cerebellum with striations, 4% stem, and the rest accent2 synapse sparks inside.
- **Lattice:** 30% node clusters (Gaussian σ 0.035, 30% halo rings), 62% edge particles (every 7th edge is
  accent2), and the rest dust.
- **Eye:**
  - Iris z = √(1.25² − 0.98²); 42% fibres (240 fibres, a collarette at r 0.52).
  - 7% pupil rim, 7% limbus, 16% sclera with the front window removed.
  - Dashed orbits at radii 1.6/1.78/1.95, with tilts.
- **Globe** (R = 1.3):
  - 70% land via point-in-polygon against hand-written continent rings in lon/lat (with bounding-box prechecks);
    everything below −67° latitude counts as land.
  - 16% graticule (every 20° of latitude, every 30° of longitude), 8% atmosphere halo, 6% city clusters.
  - `latLonToVec3`: `x = r·cosφ·sinλ, y = r·sinφ, z = r·cosφ·cosλ`.

## 6. Globe FX (`globe.js`, group matrix = the globe target's matrix)

- **Occluder:** a sphere at 0.97R with `colorWrite:false` and renderOrder −1, so arcs hide behind the planet.
- **Atmosphere:** a BackSide sphere at 1.14R with a fresnel `pow(1−|N·V|, 4.5)·0.45`, additive, in the accent colour.
- **42 arcs as comet trails:**
  - One Points cloud of 42×96 points, with uniform arrays `uHeads[42]`, `uFades[42]`, `uColors[42]`.
  - Comet `pow(1 − clamp(d/0.42), 2.2)`, plus a faint 0.1 trail. Point size grows at the head.
  - Path: quadratic Bézier with the control at `normalize(a+b)·R·(1.1 + angle·(0.22–0.40))`.
  - Duration `1.3 + angle·0.8` s.
- **Severity colours:** 1 = accent, 2 = accent2, 3 = `#ff3b4e`.
- **Launch:** a small ring at the source.
- **Impact:**
  - Ring 0.4 (0.62 for critical).
  - Elevated and critical add a second, delayed, larger ring.
  - Critical also gets a radial light beam (a 2-vertex line with fading alpha).
  - Rings are a pool of 48 shader planes oriented along the surface normal; beams are a pool of 24.
- **DDoS storm:** every 9–18 s, 9–13 free arcs converge on one weighted target ("Volumetric DDoS",
  UDP/123 NTP or UDP/53 DNS, 120–800 Gbps). Report it through `onStorm`.
- **Data model:**
  - 60 real hub cities with country codes and source/target weights (Ashburn 8/6, Amsterdam 7/5, Moscow 8/3,
    Beijing 8/3, Shanghai 7/3, New York 5/9, Washington 2/9, Kyiv 1/8, Taipei 1/7, Tel Aviv 2/6, Pyongyang 4/0,
    and so on). Never use the same country for source and target.
  - 19 weighted vectors: SSH brute force TCP/22, Telnet/Mirai TCP/23, mass port scan, RDP spray 3389, SMB 445,
    Log4Shell CVE-2021-44228, firewall RCE CVE-2024-3400, gateway session leak CVE-2023-4966, VPN command injection
    CVE-2024-21887, file-transfer SQL injection CVE-2023-34362, web shell, phishing kit, credential dump, botnet C2, DNS tunnelling,
    NTP amplification, exposed search cluster, ransomware staging with rclone, malicious OAuth consent.
  - Sectors: Finance, Government, Healthcare, Energy, Telecom, Education, Retail, Manufacturing, Defence,
    Logistics, Cloud hosting.
- Fire the `onSignal(event)` callback only while the globe's opacity is above 0.6.

## 7. Threat feed panel (glass, footer right, labelled **SIMULATED**)

- **Header:** "Threat feed" with a fast red pulse dot.
- **Metrics:**
  - Events per minute: a random walk between 1,800 and 3,400, ticked every 1 s, bumped by storms.
  - Today: seeded from the minutes elapsed since UTC midnight × about 2,400, accumulated every second.
  - A 30-point sparkline.
- **Severity mix:** a stacked flex bar plus a legend (Low / Elevated / Critical counts). Each arc adds 1–40 events
  to its severity; storms add 200–600 critical.
- **Top origins, last 5 minutes:** 5 rows, each with a country code, a gradient bar scaled with `scaleX` and a
  percentage.
- **Live events:**
  - At most 6 rows, added at most once every 650 ms.
  - Each row: severity dot, type, "CC City → CC City", "port · sector" in mono, and a UTC time.
  - Storm rows are red-tinted.
- **Mobile:** hide the severity mix, origins and labels, and show 2 rows.

## 8. Liquid background (`background.js`)

- Fullscreen triangle rendered into a **half-resolution** render target, then blitted with film grain (±0.015).
- Shader: domain-warped fbm (5 octaves, 2.02 lacunarity, rotation matrix (0.8, 0.6, −0.6, 0.8)).
  - `q = fbm(p + t)`
  - `r = fbm(p + 3.5q + …)`
  - `f = fbm(p + 3r + uShift·0.55)`, where uShift is the morph value, so the liquid changes per chapter.
  - Mix base → deep → deep 2 → ink, with a sheen. Keep it dark (`col *= 0.5 + 0.45f`) and add a vignette.
  - Time `·0.035`; the mouse warps it slightly.
- Four palettes, one picked at random on each load with a random seed (0–60). A crossfade of 1.4 s runs when the
  drop button re-rolls it.

| Palette | bg (base, deep, deep 2, ink) | base | accent | accent2 | dim | top | bottom |
|---------|------------------------------|------|--------|---------|-----|-----|--------|
| Abyss | #04050a #170d36 #06303f #ff3d8b | #d4ddff | #7df9ff | #ff4f9a | #5d6a9a | #cdbcff | #d6ff7a |
| Ember | #060407 #2e0b1c #0f1c3d #ff7a3d | #ffe7d9 | #ffb86b | #ff3d6e | #8a5c66 | #ffd3ea | #ffb04a |
| Toxic | #030705 #082a24 #1a1240 #2dffb3 | #dcfff2 | #5dffc8 | #a77bff | #4f7d72 | #c9b8ff | #7dffc4 |
| Glacier | #03060c #0a1c3c #1d1147 #5ad8ff | #e3edff | #8be9ff | #b48cff | #56709c | #e6ecff | #86e6ff |

- The palette also sets the CSS variables `--accent`, `--accent-2` and `--bg`, and the footer palette name.

## 9. Liquid-glass UI (`style.css`)

**`.glass`**
- Background `linear-gradient(180deg, rgba(255,255,255,.11), rgba(255,255,255,.035))`.
- `backdrop-filter: blur(18px) saturate(175%) brightness(1.06)`.
- Inset highlights: `inset 0 1px 0 rgba(255,255,255,.32)`, a bottom line, an inner glow, and a soft drop shadow.
- `::before`: a 1 px specular rim, as a 135° gradient border via mask-composite exclude.
- `::after`: a radial frost sheen at `var(--mx) var(--my)`, updated on pointermove from the hovered `.glass`
  element.
- On Chromium only (detected with `navigator.userAgentData.brands`), add `html.lg-refract`, which prepends
  `url(#lg-distort)` to the backdrop-filter. The SVG filter is feTurbulence (0.008, 0.012) → blur 2 →
  feDisplacementMap at scale 26.

**Components**
- Pill buttons, 2.75 rem tall, with a spring press `scale(.96)`. The accent variant uses an accent-tinted
  gradient and glow.
- 44 px round icon buttons.
- Inset dark fields with an accent focus ring and 16 px text (prevents iOS zoom).
- A custom select arrow and mono chips.

**Header**
- A three-column grid: brand mark ("IRIS/09" plus a concentric-circles SVG) · a glass nav pill with a **sliding
  lens** (its transform and width spring to the active link) · a UTC clock, the "New liquid" drop button and
  "Request access".
- Under 1080 px, the nav becomes a menu button with a glass popover.

**Other pieces**
- Right-side progress rail (`scaleY`).
- `<dialog>` "Request access" sheet: Name, Work email, Team select, a "What should IRIS look for?" textarea and
  "Send request". It uses a spring-in animation and a blurred backdrop.
- Glass toast at the bottom centre.
- **Forms:** any `form[data-form]` validates, POSTs FormData to `data-endpoint` if one is set, then shows the
  `data-success` toast; on failure it shows a retry message.
- Type: `.display` weight 500, letter-spacing −0.045 em, line-height 0.95.
  - h1 `clamp(3rem, 7.4vw, 7.6rem)`, with "human mind." as an ink→accent→accent2 gradient.
  - h2 `clamp(2.2rem, 4.6vw, 4.4rem)`.
  - Text shadow for legibility over the particles.
- **Layout:**
  - Hero copy bottom-left, dossier card right.
  - Chapters 1 and 3 text left with the shape right; chapter 2 the reverse.
  - Footer grid `minmax(18rem,25rem) 1fr minmax(20rem,25rem)`: intro and form | globe | feed (`max-height:
    calc(100svh − 11rem)`).
  - On mobile, copy sits at the bottom with shapes above.

## 10. Files

```
index.html  css/style.css  DECISIONS.md  PROMPT.md
js/main.js (renderer, loop, springs, pointer, palettes, GLB load)
js/shapes.js (targets, mesh sampler, hair/tails, procedural fallback bust)
js/geo.js (continent rings, isLand, latLonToVec3)
js/globe.js (arcs, storms, rings, beams, atmosphere, data model)
js/background.js (liquid shader)
js/ui.js (story scroll, nav lens, menu, glass sheen, dialog, forms, toast, clock, threat feed)
assets/iris.glb  tools/build_bust.py
```

## 11. Acceptance checks (screenshot each one)

1. The hero shows a realistic female bust with hair, two floating tails, small glowing irises and the full copy.
   Moving the cursor turns the head up to 30° while the shoulders stay still.
2. The cursor pushes a hole in the dots, and they spring back with an overshoot.
3. Scrolling flies the camera through the cloud: head → brain → lattice → eye → globe. Each chapter's text is
   visible at `x = i + 0.2` and absent mid-morph.
4. Reloading while scrolled to any chapter renders that chapter's shape immediately, with no console errors.
5. On the footer, the globe can be dragged and has inertia. Comet arcs, rings, beams and periodic storms play, and
   every feed widget updates.
6. The drop button crossfades to a new palette, recolouring the particles, UI accents and globe.
7. Reduced motion, the no-WebGL fallback, mobile layout and keyboard focus all work, and the forms show a toast.
