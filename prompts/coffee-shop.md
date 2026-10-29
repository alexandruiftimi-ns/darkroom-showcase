# NorthShutter Coffee — scroll-scrubbed product café landing page

**One line:** a dark, warm café landing page where your product spins and lands in a 3D clip as you scroll, then steps out of the video and travels down the page with you.

**The experience.** The page opens on a full-screen frame of a café with your product (a takeaway cup in the demo) floating in mid-air. Scrolling scrubs a real video clip frame by frame: the cup turns a full 360° and drops onto the table, while three short captions come and go on the left. When the café scrolls away, the cup is cut out of the video with an elastic pop and a soft shadow, and it settles into a fixed lane on the right of the screen, where it keeps turning with the scroll (one turn backwards, then one forwards) while the coffee, menu, locations and contact sections pass beside it. It ends logo-facing at the bottom of the page.

**How to use**
1. Put your media into the slots in Part A (same file names, your content).
2. Open an empty folder in your coding agent, copy your `assets/` folder into it, and paste all of Part B.
3. When you swap media later, re-run the two pipeline scripts the agent writes (`tools/extract.sh`, then `tools/process.py`). The site reads everything from the generated `site/media/manifest.json`, so no code changes are needed.

---

## Part A — Asset slots (bring your own)

The structure is fixed; the content is yours. Every media property (frame count, fps, size, where the product sits) is measured from your files by the pipeline.

| Slot | Path | What it is | Requirements |
|---|---|---|---|
| Product clip | `assets/video.*` (mp4, mov, mkv, webm) | The hero clip: your product in a room, turning one full 360° turn while it descends and comes to rest on a surface. The whole site is built around this clip. | Landscape 16:9. Minimum 1920×1080, ideally 3840×2160. 3–6 s at 24–30 fps (the pipeline keeps 100–150 frames). The product is fully in frame with clear margin on every frame and never touches an edge. Product roughly centred horizontally. The first frame and the last frame should show the same face of the product (it does exactly one full turn), so the spin can run back and forth across the whole clip. **The clip must end on the climax frame:** product at rest, logo facing the camera, sharp, no motion blur. The camera may move (the demo camera drifts down with the cup), but it must stop when the product lands. A dark product on a warm, bright room reads best. |
| Clean plate | `assets/plate.*` (png preferred, jpg ok) | The clip's **last frame without the product**: the same room, same framing, same light, with the product removed. Used to rebuild the background under the cut-out so the product can leave the video invisibly. | Same aspect ratio as the clip. At least ~1600 px wide (it is aligned and colour-matched automatically, so it does not have to be pixel-perfect or full resolution). Must contain no trace of the product or its shadow. |
| Room photo (optional) | `assets/photo.*` (jpg, png, webp) | The wide photo in the Locations section. If you have no photo, the pipeline uses the clean plate (the empty café) instead. | Landscape, at least 2400 px wide. It is shown cropped to 21:9 with the focus at 40 % across / 60 % down, so keep the subject there. |

**Demo-brand copy you can edit in Part B:** the name "NorthShutter" (brand, loader, nav, footer, meta), all section copy, the whole menu with prices, both locations with addresses and hours, the email, phone and social handle, the © line. The menu, addresses, hours and contact details are marked on the page as sample content; replace them and remove the "Sample …" notes once they are real.

---

## Part B — Build prompt (paste everything below into your coding agent)

### 1. Role and goal

You are a senior front-end engineer and motion developer. Build the static landing page specified below in this folder, **exactly** as specified: same structure, sections, copy, design values, motion and behaviour. Do not add sections, features, libraries, effects, analytics or copy, and do not leave anything out. Where this prompt gives a number, use that number. Where it gives copy, use it character for character.

### 2. Media rules

- The buyer's media is in `assets/`: `assets/video.*` (required), `assets/plate.*` (required), `assets/photo.*` (optional). If a required slot is missing, **stop and ask** for it. Do not generate or substitute media.
- Never hardcode media properties in the site code. Frame count, last-frame index, fps, source size, set sizes, crop offsets, cut-out cell sizes and per-frame product positions are all measured by the pipeline (section 4) and written to one config object, `site/media/manifest.json`. The page code reads only that file. The single place where a media constant may appear is the poster image's `width`/`height` attributes and the photo's `width`/`height`, which the pipeline step fills in from the real files.
- All images ship as WebP. Every `<img>` gets its real pixel `width` and `height` attributes, read from the file.
- Frame sequences, cut-outs, plates and the photo are generated by the pipeline; they are not slots.

### 3. Stack and files

Plain static site, no build step, no framework. `site/` is the deployable folder.

    project/
    ├── assets/                    buyer media (slots, not deployed)
    ├── tools/
    │   ├── extract.sh             video → PNG masters
    │   ├── matte.py               PNG masters → alpha masks (BiRefNet)
    │   └── process.py             masters + masks + plate → web sets + manifest
    ├── .work/                     pipeline scratch (f4k/, mask/, report/), not deployed
    └── site/
        ├── index.html
        ├── css/style.css
        ├── js/main.js             one ES module, top-level await
        ├── vendor/lenis.min.js    Lenis 1.1.13, vendored
        ├── vendor/lenis.css       the stock lenis.css from the same package
        └── media/
            ├── manifest.json
            ├── desktop/ f/000.webp…  cup/000.webp…  plate.webp  plate-photo.webp
            └── mobile/  f/000.webp…  cup/000.webp…  plate.webp  plate-photo.webp

- **Lenis 1.1.13**, vendored (download `https://unpkg.com/lenis@1.1.13/dist/lenis.min.js` and `https://unpkg.com/lenis@1.1.13/dist/lenis.css` into `site/vendor/`). Loaded as a classic script before `main.js`; used through `window.Lenis`. The stylesheet order is `vendor/lenis.css` then `css/style.css`.
- **Fonts** (Google Fonts, `display=swap`): Hanken Grotesk 400 and 600; Instrument Serif 400 (regular only). Preconnect to `https://fonts.googleapis.com` and `https://fonts.gstatic.com` (the latter with crossorigin).
- `main.js` is loaded with `type="module"` at the end of `<body>`.
- `<link rel="preload" href="media/manifest.json" as="fetch" crossorigin>` in the head.
- **Head meta:** `lang="en"`, charset utf-8, viewport `width=device-width, initial-scale=1, viewport-fit=cover`, title **NorthShutter Coffee**, meta description **Small-batch coffee, brewed slowly and served warm in a room full of afternoon light.**, `theme-color` `#0e0a07`. No favicon is linked in the original; leave it out unless the buyer supplies one.
- **Inline head script (runs before first paint):** if `prefers-reduced-motion: reduce` matches, or the URL query contains `motion=off`, add class `rm` to `<html>`.
- **Forbidden:** GSAP, ScrollTrigger, any animation library, any framework, wheel hijacking, scroll snapping, `<video>` playback for the hero, autoplaying media, tracking scripts.

### 4. Media pipeline

Write these as re-runnable scripts in `tools/`. Use a Python 3 virtual env in `.work/venv` with `rembg` (with `onnxruntime`), `pymatting`, `opencv-python`, `numpy`, `pillow`. Run Python with `-I`.

**Step 1 — extract masters (`tools/extract.sh`).** Probe the clip, then dump every frame as lossless PNG, numbered from 000 with 3 digits:

    ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_read_frames -of compact assets/video.mp4
    mkdir -p .work/f4k .work/mask
    ffmpeg -v error -i assets/video.mp4 -vsync 0 -start_number 0 .work/f4k/%03d.png

If the clip has more than 150 frames, decimate evenly so the count lands in 100–150 (for example add `-vf fps=24` for a 30 fps clip of 6 s); never drop the final frame. The clip's last frame must be the landed, logo-facing frame. N = number of PNGs, LAST = N − 1. Source size W×H comes from the probe.

**Step 2 — masks (`tools/matte.py`).** For every PNG, run rembg with the `birefnet-general` session in `only_mask=True` mode and save an 8-bit greyscale mask with the same number to `.work/mask/`. Skip files that already exist (so it can resume).

    .work/venv/Scripts/python -I tools/matte.py .work/f4k .work/mask

**Step 3 — process (`tools/process.py <project root>`).** All maths in float32 RGB 0–1.

1. *Bounding boxes at source resolution.* For each frame, the bbox of mask pixels with alpha > 0.06 (x0, y0, x1+1, y1+1). From these: centre cx, cy, box width bw, height bh per frame, and the union box of all frames.
2. *Patched plate at source resolution.* Take the last frame I and its mask A.
   - Align the clean plate to I: convert both to grey at half source resolution (the plate upscaled with cubic interpolation to half-res; the frame downscaled with area interpolation), Gaussian-blur both with sigma 2, and run OpenCV ECC with an affine motion model (300 iterations, epsilon 1e-7, Gaussian filter size 5), using a validity mask that excludes the product: (A > 0.02) dilated with an 81×81 square kernel, inverted. Compose the scale changes into one matrix and warp the plate to full source size with cubic interpolation, inverse-map, reflected borders.
   - Colour-match the warped plate to I per channel with a linear fit (gain, offset) over a ring around the product: pixels inside (A > 0.02) dilated by a 241×241 kernel but outside it dilated by 25×25. Clip to 0–1. Log the ring's mean absolute error (0–255); it should be a few units.
   - Patch weight Wp: hard = A > 0.004; dilate it with a 9×9 ellipse; Gaussian blur sigma 2; take the max of that and hard. Plate P = I × (1 − Wp) + warpedPlate × Wp. So P is the real last frame everywhere except under the product.
3. *Two web sets*, each resized from source with area interpolation:
   - **desktop:** scale = 2400 / W (0.625 for a 3840-wide source), full frame (2400×1350 for 16:9), no crop. Frame quality 78.
   - **mobile:** scale = 1080 / H (0.5 for a 2160-tall source), then a **square** crop of side = scaled height (1080×1080), whose left edge cropX = round(median(cx) × scale − side / 2), clamped inside the frame. Frame quality 72.
   - For each set: cut-out padding pad = round(18 × scale / 0.5) (23 desktop, 18 mobile). Cell size cellW = ceil(max(bw) × scale) + 2·pad, cellH = ceil(max(bh) × scale) + 2·pad, each rounded up to an even number. Every cut-out of the set has this same cell size.
4. *Per frame i, per set:*
   - `f/iii.webp`: the scaled frame (cropped for mobile), WebP at the set quality, method 6. **The last frame is lossless** (lossless, quality 100, method 6, exact).
   - Cell origin in scaled full-frame coordinates: ox = round(cx·s − cellW/2), oy = round(cy·s − cellH/2). Copy the scaled frame and scaled mask into a cellW×cellH canvas at that origin (out-of-frame parts stay transparent black). Clean the alpha: values < 1.5/255 become 0, values > 253.5/255 become 1.
   - Foreground colour: for normal frames, decontaminate edges with pymatting `estimate_foreground_ml` (float64), then put back the exact frame pixels wherever alpha ≥ 0.99. For **the last frame**, solve the foreground against the plate instead: where alpha > 0, F = (frame − (1 − alpha) × plateCell) / max(alpha, 1e-4), clipped to 0–1, so that plate + cut-out adds back up to the video frame exactly.
   - `cup/iii.webp`: RGBA WebP of F with the alpha, quality 86, alpha quality 100, method 6. **The last cut-out is lossless** (exact).
   - Record the cell: x = ox, y = oy, dx = round(cx·s − (ox + cellW/2), 3 decimals), dy likewise for y, w = round(bw·s, 1), h = round(bh·s, 1).
5. *Plates per set:* `plate.webp` = P scaled and cropped like the frames, **lossless**. `plate-photo.webp` = P scaled but not cropped, quality 80. If `assets/photo.*` exists, write that instead to `desktop/plate-photo.webp` (resized to 2400 wide, quality 80).
6. *Manifest* (`site/media/manifest.json`, compact JSON): `count` N, `last` LAST, `fps`, `source {w, h}`, and per set `scale, frameW, frameH, cropX, w, h, cellW, cellH, cells[]` (one record per frame as above) and `union` (the union box × scale, 1 decimal, in **uncropped** scaled-frame coordinates), plus `seam: {mode: "one-turn-each-way", split: 0.75}`. Write `.work/report/stats.json` with the ECC score and the ring error.
7. After processing, update the `width`/`height` attributes of the poster and photo `<img>` tags in `index.html` from the real files.

**Size budgets (demo, 121 frames):** desktop frames ≈ 100 KB each (≈ 12 MB set, the lossless last frame ≈ 1.8 MB), desktop cut-outs ≈ 25–30 KB each, mobile frames ≈ 40 KB, mobile cut-outs ≈ 20 KB. If a set is more than ~30 % over this per frame, lower the quality by 4 and re-run; never go below 70 for frames.

**Finding the climax point:** the climax is the clip's last frame by contract. Check it visually (sharp, logo facing, at rest). If the product is still moving at the end, trim the clip before step 1 rather than changing the code.

### 5. Design tokens

| Token | Value | Use |
|---|---|---|
| `--ground` | `#0e0a07` | page, hero, loader, normal sections, footer, theme-color, canvas fill |
| `--ground-2` | `#140f0a` | alternate sections (Menu, Contact) |
| `--surface` | `#1b140e` | defined, reserved |
| `--line` | `rgba(243, 235, 224, .12)` | hairlines, loader track, nav border |
| `--ink` | `#f3ebe0` | text |
| `--muted` | `#b8a893` | secondary text |
| `--gold` | `#d8a25a` | eyebrows, accents, links, loader bar |
| scrim/ink tint | `rgba(10, 7, 5, …)` | hero scrims |
| solid nav | `rgba(14, 10, 7, .72)` + 14px backdrop blur | |
| lede ink | `rgba(243, 235, 224, .84)` | ledes |
| `.btn--solid` (defined, unused) | background gold, text `#1a1109`, hover `#e4b06a` | |

Colour ratio 60 espresso / 30 cream / 10 gold. `color-scheme: dark`.

**Type.** `--display: "Instrument Serif", Georgia, serif` (weight 400 only). `--text: "Hanken Grotesk", system-ui, sans-serif`. Body: 400 17px/1.6 text font, antialiased (16px under 640px). h1–h3: display font, weight 400, margin 0, letter-spacing −.01em. Paragraph margin 0. `.eyebrow`: 600 12px/1 text font, letter-spacing .16em, uppercase, gold.

**Layout tokens.** `--gutter: clamp(16px, 5.5vw, 88px)`. `--lane: 34vw` (≤1023px: 30vw; ≤639px: 30vw) — the right-hand column reserved for the cup; no text ever enters it. `--nav-h: 68px` (≤639px: 58px).

**Easing.** Standard ease-out `cubic-bezier(.2, .7, .2, 1)` (loader fade, reveals). Cue line `cubic-bezier(.5, 0, .2, 1)`. Script smoothstep: smooth(t) = t²(3 − 2t).

**Base.** Border-box everything. `html` and `body` background ground; body `overflow-x: clip`; links inherit colour; images block, max-width 100 %. `.visually-hidden` utility (1px, clip-path inset 50 %). No custom focus style is defined: keep the browser's default focus ring visible on every link and button (do not remove outlines).

### 6. Sections, in page order

Entities in the copy: "·" is a middle dot, "’" a right single quote, "–" an en dash.

**0. Loader** (`div.loader#loader`, `aria-hidden="true"`). Fixed, inset 0, z-index 100, ground background, content centred with grid. Inner box width `min(220px, 60vw)`, centred text. Mark **NorthShutter** in 400 30px/1 display. Below it, 18px gap, a 1px track (`--line`, overflow hidden) holding a gold bar that scales on X from the left by the CSS variable `--load` (0–1), transition transform .25s. When done it gets `is-done`: opacity 0 over .6s with the standard ease-out, then visibility hidden after .6s.

**1. Nav** (`header.nav#nav`). Fixed to the top, full width, z-index 50, height `--nav-h`, flex with space-between, centred items, horizontal padding = gutter, 1px transparent bottom border; transitions background-color, backdrop-filter, border-color .4s. State `is-solid`: background `rgba(14,10,7,.72)`, `backdrop-filter: blur(14px)` (plus -webkit-), border colour `--line`.
- Brand link **NorthShutter** → `#top`, `aria-label="NorthShutter, back to top"`, 400 26px/1 display, no underline.
- `<nav aria-label="Main">` with a list (flex, gap 34px, no bullets): **Our coffee** → `#coffee`, **Menu** → `#menu`, **Locations** → `#locations`, **Contact** → `#contact`. 14px, no underline, ink at opacity .82, hover 1 (transition .2s).
- Button `.btn` **Visit us** → `#locations`: inline-flex, height 42px, padding 0 20px, pill radius 999px, 600 14px/1 text font, border 1px `rgba(216,162,90,.6)`, ink text, transitions background-color .25s, border-color .25s, transform .16s. Hover: background `rgba(216,162,90,.14)`, border gold. Active: scale .97.
- ≤819px: links hidden, brand 23px, button height 38px, padding 0 16px.

**2. Hero** (`section.hero#hero`, `aria-label="Introduction"`, inside `<main id="top">`). Height **375vh**, ground background. Inside, `.hero__stage`: sticky, top 0, height 100vh then 100lvh, overflow hidden. Layers, bottom to top:
- `img.hero__poster#poster`: `src="media/desktop/f/000.webp"`, `alt=""`, `fetchpriority="high"`, real width/height; absolute, fills the stage, object-fit cover, centred. Hidden (display none) the first time the canvas draws.
- `canvas.hero__canvas#hero-canvas`, `aria-hidden="true"`, absolute, fills the stage.
- `.hero__scrim`, no pointer events, two gradients: top `linear-gradient(180deg, rgba(10,7,5,.55) 0, rgba(10,7,5,0) 22%)` and left `linear-gradient(90deg, rgba(10,7,5,.82) 0, rgba(10,7,5,.55) 26%, rgba(10,7,5,0) 46%)`.
- `.hero__copy#hero-intro`: absolute, left gutter, bottom 14vh, width `min(32vw, 30rem)`; children get `will-change: opacity, transform`.
  - eyebrow **NorthShutter Coffee**
  - h1 **Everything else can wait.** — `clamp(44px, 5.4vw, 92px)`, line-height .98, margin 18px 0 22px, text-wrap balance.
  - p.hero__lede **Small-batch coffee, brewed slowly and served warm in a room full of afternoon light.** — `rgba(243,235,224,.84)`, `clamp(16px, 1.25vw, 19px)`, max-width 27em, text-shadow `0 1px 14px rgba(0,0,0,.5)`.
- Caption `.hero__cap#cap-2` (`aria-hidden="true"`): eyebrow **Roasted in small batches**, p **One origin at a time, pulled by hand.**
- Caption `.hero__cap#cap-3` (`aria-hidden="true"`): eyebrow **Keep scrolling**, p **It hasn’t landed yet.**
  - Captions: absolute, left gutter, bottom 14vh, width `min(30vw, 26rem)`, start at opacity 0. Eyebrow is block with 16px bottom margin. The p is 400 `clamp(30px, 3.4vw, 54px)`/1.04 display, text-shadow `0 2px 24px rgba(0,0,0,.45)`, balanced.
- `.hero__cue#cue`: absolute, left gutter, bottom 5vh, flex, gap 12px, 13px muted text **Scroll**, preceded by an `<i>`: 1px × 34px line, `linear-gradient(gold, transparent)`, top origin, infinite 2.2s animation with `cubic-bezier(.5, 0, .2, 1)`: 0 % scaleY 0, 50 % scaleY 1, 100 % scaleY 1 and opacity 0. Animation off under reduced motion.
- Link `.hero__skip` **Skip the intro** → `#coffee`: absolute, right gutter, bottom 5vh, 13px, `rgba(243,235,224,.82)`, no underline, text-shadow `0 1px 10px rgba(0,0,0,.6)`; hover ink.
- Portrait orientation: scrim becomes only `linear-gradient(180deg, rgba(10,7,5,.5) 0, rgba(10,7,5,0) 16%)`; copy and captions span left gutter to right gutter (width auto), bottom `calc(4vh + 40px)`; h1 `clamp(36px, 9.6vw, 64px)`, margin 12px 0 12px; lede 15px; caption p `clamp(26px, 7.4vw, 44px)`; cue and skip at bottom 3vh.

**Shared section styles.** `.section`: relative, padding `clamp(96px, 16vh, 180px)` vertical and gutter horizontal, ground background. `.section--alt`: ground-2. Every section has a `::before` overlay (inset 0, no pointer events): `radial-gradient(60vw 50vh at 88% 18%, rgba(216,162,90,.10), transparent 70%)` — warm light pooling from the right where the cup falls. `.wrap`: relative, `max-width: calc(100vw - var(--lane) - var(--gutter) - 24px)` (≤639px: `calc(100vw - var(--lane) - var(--gutter))`). h2: `clamp(40px, 5vw, 80px)`, line-height 1, margin 20px 0 28px, max-width 13ch, balanced (≤639px: `clamp(34px, 9vw, 48px)`). `.lede`: `clamp(17px, 1.3vw, 20px)`, `rgba(243,235,224,.84)`, max-width 34em. `.note`: margin-top 28px, muted, 13px. Every element marked "rv" below gets the scroll reveal (section 7).

**3. Our coffee** (`section.section#coffee`). Top padding overridden to `clamp(220px, 42vh, 460px)` so the cup finishes moving into its lane before the heading arrives.
- eyebrow (rv) **01 · Our coffee**
- h2 (rv) **Roasted light, so you can taste where it grew.**
- lede (rv) **We buy green coffee from a handful of farms we know by name, roast it in small batches and rest it before it reaches your cup. Nothing is rushed, because nothing has to be.**
- `ul.facts`: grid of 3 equal columns, gap 32px, margin-top `clamp(56px, 9vh, 96px)`, no bullets; each li (rv) has a 1px `--line` top border and 22px top padding; h3 28px/1.1 with 10px bottom margin; p muted 15px.
  1. **Traceable** — **Every bag names the farm, the region and the harvest.**
  2. **Small batches** — **Roasted in short runs, so every roast gets watched start to finish.**
  3. **Brewed to order** — **Espresso dialled in each morning. Filter made one cup at a time.**

**4. Menu** (`section.section.section--alt#menu`).
- eyebrow (rv) **02 · Menu**
- h2 (rv) **Short, on purpose.**
- lede (rv) **Ask the bar what’s on the slow bar today. Oat, almond and whole milk at no extra cost.**
- `.menu`: grid of 2 equal columns, gap 56px 56px, margin-top `clamp(48px, 8vh, 88px)`. Each `.menu__group` (rv) has an h3 styled like an eyebrow (600 12px/1 text font, .16em, uppercase, gold, 18px bottom margin) and a list. Each item is a 2-column grid (`1fr auto`, gap 2px 16px, padding 14px 0, 1px `--line` bottom border): name in bold-tag styled 400 24px/1.15 display; price in an `em` with normal style, tabular numbers, row 1 column 2, baseline-aligned, ink; description in a span, muted 14px, column 1.
  - **Espresso bar:** Espresso 2.80 — Double shot, house blend · Cortado 3.40 — Equal parts espresso and milk · Flat white 3.80 — Double shot, thin silky milk · Cappuccino 3.80 — Deeper foam, cocoa on request
  - **Slow bar:** Pour-over 4.60 — Single origin, brewed to order · Batch brew 3.20 — Today’s filter, refills welcome · Cold brew 4.20 — Steeped overnight, served over ice
  - **Not coffee:** Matcha latte 4.40 — Ceremonial grade, whisked · Chai 3.90 — Spiced in house · Hot chocolate 3.90 — Dark, not too sweet
  - **To take home:** Whole beans, 250 g 14.00 — This month’s origins, ground on request · House blend, 1 kg 42.00 — For the office or the café at home
  - (Markup order inside each item: name, price, description.)
- note (rv) **Sample menu and prices. Replace with your own.**

**5. Locations** (`section.section#locations`).
- `.wrap`: eyebrow (rv) **03 · Locations**; h2 (rv) **Two rooms, the same light.**; lede (rv) **Big windows, long tables, and a bar you can lean on while you wait.**
- `figure.photo` (rv), outside the wrap, bleeding to the screen edges: margin `clamp(56px, 9vh, 96px) calc(-1 * var(--gutter)) 0`. Image `media/desktop/plate-photo.webp`, `loading="lazy"`, real width/height, alt **The NorthShutter café in the afternoon: tables by tall windows and a long wooden bar.**, width 100 %, aspect-ratio 21/9, object-fit cover, object-position 40 % 60 %. Figcaption **Harbour Street, mid-afternoon.** — padding 14px gutter 0, muted 13px.
- Second `.wrap`: `.places` grid of 2 equal columns, gap 40px, margin-top `clamp(48px, 8vh, 80px)`. Each `article.place` (rv): 1px `--line` top border, 24px top padding; h3 34px/1.05, 12px bottom margin; address p muted 15px; a `dl` grid (`auto 1fr`, gap 6px 18px, margin 18px 0 22px, 15px; dt muted, dd margin 0); link `.link` gold 14px, underline offset 4px, opens in a new tab with `rel="noopener"`.
  1. **Harbour Street** — **14 Harbour Street** — Mon–Fri 7:00–18:00 · Sat–Sun 8:00–17:00 — **Get directions** → `https://www.google.com/maps/search/?api=1&query=14+Harbour+Street`
  2. **Old Town** — **3 Linden Square** — Mon–Fri 7:30–17:00 · Sat–Sun 9:00–16:00 — **Get directions** → `https://www.google.com/maps/search/?api=1&query=3+Linden+Square`
- note (rv) **Sample addresses and hours. Replace with your own.**

**6. Contact** (`section.section.section--alt.contact#contact`).
- eyebrow (rv) **04 · Contact**; h2 (rv, max-width 10ch here) **Say hello.**; lede (rv) **Wholesale, events, or a question about a roast. We read everything.**
- `.contact__rows` (rv): grid, gap 0, margin-top `clamp(40px, 7vh, 72px)`, max-width 40rem. Each row is a link: flex, space-between, baseline, gap 20px, padding 22px 0, 1px `--line` top border (last row also a bottom border), no underline, colour transition .2s; label span muted 14px; value in a bold tag styled 400 `clamp(22px, 2.2vw, 32px)`/1.1 display, gold on hover.
  1. **Email** — **hello@northshutter.coffee** → `mailto:hello@northshutter.coffee`
  2. **Phone** — **+1 000 000 0000** → `tel:+10000000000`
  3. **Social** — **@northshutter** → `https://example.com/` (new tab, `rel="noopener"`)
- note (rv) **Sample contact details. Replace with your own.**

**7. Footer** (`footer.footer`, after `</main>`). Relative, padding `clamp(72px, 14vh, 140px)` gutter 40px, ground background, 1px `--line` top border.
- `.footer__word` (`aria-hidden="true"`) **NorthShutter**: 400 `clamp(56px, 13vw, 220px)`/.86 display, letter-spacing −.02em, `rgba(243,235,224,.92)`.
- `.footer__meta`: flex, space-between, gap 24px, wraps, margin-top 40px, muted 13px, `max-width: calc(100vw - var(--lane) - var(--gutter))`: **© 2026 NorthShutter Coffee** and link **Back to top** → `#top` (no underline, hover ink).

**8. Cup canvas.** Last element before the scripts: `canvas.cup#cup-canvas`, `aria-hidden="true"`, fixed, inset 0, full size, z-index 30 (above sections, below nav), no pointer events, `visibility: hidden` until it has class `is-on`.

Scripts at the end of body: `vendor/lenis.min.js` (classic), then `js/main.js` (module).

### 7. Behaviour (`main.js`)

**Helpers.** clamp(v, a, b); lerp(a, b, t) = a + (b − a)t; smooth(t) = t²(3 − 2t); win(p, a, b) = clamp((p − a)/(b − a), 0, 1). Read URL params. RM = `<html>` has class `rm`.

**Constants.** SCRUB_END = 0.97 (frames finish at 97 % of the pinned hero; the release follows). DPR_CAP = 1.5. SPRING_K = 190, SPRING_C = 6.2. Fetch `media/manifest.json` with top-level await; N = count, LAST = last.

**QA flags.** `?handoff=video` keeps showing the real last video frame instead of the layered plate + cut-out (no cup canvas). `?lenis=off` disables Lenis. `?motion=off` forces the reduced-motion page. Expose `window.__ns` with SCRUB_END, a QA object holding the cup's current on-screen rect (phase "hero" / "handoff" / "fall", frame index, centre x/y, w, h, d), a `loaded` getter (frames fetched, cut-outs fetched, plate loaded, last cut-out loaded), the manifest, the current set name, the current view, and a `lane()` function.

**Contexts.** Hero canvas 2D context with `alpha: false`; cup canvas normal 2D context. Image smoothing on, quality high, on both after every resize.

**View math (cover crop centred on the product).** For a set and a viewport w×h: from the set's union box take its width uw, height uh, and centre ucx = union centre x − cropX, ucy = union centre y. Scale s = max(w / set.w, h / set.h). If portrait (h > w): band = clamp(h × 0.25, 170, 280) (room under the frame for the headline), and s = max(w / set.w, min(s, 0.6 × w / uw, (h − band) / set.h)). Drawn size dw = set.w × s, dh = set.h × s. Offset ox = clamp(w/2 − ucx × s, w − dw, 0). oy = 0, except when dh ≥ h: oy = clamp((navH × 0.5 + h)/2 − ucy × s, h − dh, 0).

**Set choice.** Use "mobile" when the viewport is portrait and the mobile view's dw ≥ w − 0.5; otherwise "desktop".

**Sizing (measure).** Key = innerWidth | stage clientHeight | devicePixelRatio | nav offsetHeight; if unchanged, do nothing (phones fire resize when the address bar moves; the stage is 100lvh so nothing changed). Else vw = innerWidth, vh = stage clientHeight, dpr = min(devicePixelRatio, 1.5), navH = nav height; switch set if needed; compute the view; size both canvases to round(vw × dpr) × round(vh × dpr) (only if different) and set their CSS height to vh px; reset the drawn-frame caches; rebuild the shadow sprite. Resize is debounced 80 ms, then measure and request a render. Request a render when `document.fonts.ready` resolves.

**Loading.**
- Per set, two stores ("f" frames, "cup" cut-outs), each with an array of fetched blobs, an array of decoded ImageBitmaps, a map of in-flight decodes, a fetched count, travel direction (+1 initially), last wanted index and the index on screen.
- Fetch order: the first 9 entries of a binary-subdivision anchor list (0, N−1, then the midpoint of each span, recursively, breadth-first), then every frame from 0 upward, de-duplicated. Six parallel fetch workers. Each finished blob increments the count, updates the loader and requests a render. Failures are ignored.
- On choosing a set: start fetching its frames (with loader progress) and load `plate.webp` as an ImageBitmap. Cut-outs are wanted once the frame index passes LAST × 0.4: then load the last cut-out (`cup/LAST`) as a bitmap (and rebuild the shadow when it arrives) and fetch all cut-outs (no loader progress). If the set changes later, the same applies to the new set.
- Decode window (want(store, centre, back, ahead)): update direction from the change of the wanted index. Window lo..hi is centre − back to centre + ahead in the direction of travel (mirrored when scrolling up). Release (close) every bitmap outside [lo − 3, hi + 3], except those between the on-screen index and the wanted one, and except LAST. Then, walking outwards from the centre (direction of travel first), start createImageBitmap for up to `ahead` steps for frames inside the window that have a blob and no bitmap, with at most 4 decodes in flight. Each decode requests a render.
- pick(store, i): i if decoded; otherwise, if a frame is on screen and decoded, the decoded frame furthest along the way from the on-screen frame towards i (so a fast scroll holds or moves on and never flashes a frame from the other side of the clip); otherwise the nearest decoded frame in either direction.

**Loader.** `--load` = fetched/N with 3 decimals. Done (once) when all frames are fetched, or when frames 0–29 are all fetched and the last frame is fetched: add `is-done` to the loader and `is-ready` to body.

**Shadow sprite.** Built from the last cut-out: blur = round(cellH × 0.07), pad = blur × 3; a canvas of cut-out size + 2·pad; draw the cut-out far off-canvas with shadowColor black, shadowBlur = blur and shadowOffsetX = canvas width + 1000, so only its blurred black silhouette lands on the canvas.

**Render loop.** One requestAnimationFrame loop, always running (not on scroll events). Each tick: advance Lenis with the timestamp, step the spring, read scrollY. Skip if scrollY is unchanged and nothing is dirty.
- top = hero offsetTop; len = hero height − vh; p = clamp((y − top)/len, 0, 1); frame fi = round(clamp(p / 0.97, 0, 1) × LAST).
- **Hero text** (each element: opacity, translateY in px via translate3d, visibility hidden when opacity < 0.01; cache values to avoid redundant writes):
  - intro: a = smooth(win(p, 0.05, 0.2)); opacity 1 − a, y = −48a.
  - cap-2: a = smooth(win(p, 0.3, 0.38)), b = smooth(win(p, 0.52, 0.6)); opacity a(1 − b), y = 28(1 − a) − 28b.
  - cap-3: a = smooth(win(p, 0.68, 0.78)); gone = smooth(clamp((y − (top + hero height − vh)) / (vh × 0.28), 0, 1)); opacity a(1 − gone), y = 28(1 − a). (It fades as the café scrolls away, so the departing cup never crosses readable text.)
  - cue: opacity 1 − win(p, 0, 0.04), y 0.
- **Nav:** `is-solid` when y > top + hero height − vh × 0.5.
- If fi > LAST × 0.4, start the cut-out loading.
- layered = fi is LAST and the plate and the last cut-out are loaded and `?handoff=video` is not set.
- heroOnScreen = y < top + hero height. yFree = top + len (where the stage unpins). maxY = document scrollHeight − innerHeight.
- **Spin frame:** s = clamp((y − yFree)/max(1, maxY − yFree), 0, 1); frame = round(s ≤ 0.75 ? LAST × (1 − s/0.75) : LAST × ((s − 0.75)/0.25)). So the page below the hero counts as 4 parts: over the first 3 the cup turns once backwards (last frame to first), over the last part once forwards (first to last), ending logo-facing. It only ever steps between neighbouring real frames, so the clip's end-to-start seam never shows. (Do not loop in one direction; the seam jumps.)
- **Departure:** d = smooth(clamp((y − yFree)/(vh × 0.55), 0, 1)).
- merged = layered and spin frame is LAST and d = 0 and the spring is at rest.
- **Spring kicks** (only evaluated while layered): when the previous d was 0 and d > 0, add velocity 19 (leaving the video: pop); when the previous d was > 0 and d = 0, add velocity 11 (settling back). Store d as previous.
- **Spring step:** time-based, so it plays the same at any scroll speed. dt = min(0.05 s, elapsed since last tick, or 0.016 if unknown); integrate in substeps of at most 1/240 s: acceleration = −190x − 6.2v, v += a·h, x += v·h. At rest (x = v = 0, inactive) once |x| < 0.002 and |v| < 0.02. While active, the scene is dirty every tick.
- **Hero canvas** (only while heroOnScreen):
  - merged: draw the composite — a canvas of the set's w×h with the plate drawn at 0,0 and the last cut-out at (lastCell.x − cropX, lastCell.y), built once per set — exactly like a video frame. This makes the swap from the last video frame pixel-identical.
  - layered but not merged: draw the plate alone.
  - otherwise: want(frames, fi, 6, 12), pick, draw that frame, remember it as shown.
  - Drawing a hero image (skip if the same key is already shown): fill `#0e0a07`, draw the image at (ox, oy, dw, dh) × dpr. If dh < vh − 0.5 (portrait zoom-out), fade the bottom edge into the ground: gradient from y0 = y1 − min(140, dh × 0.22) to y1 = oy + dh (× dpr), from `rgba(14,10,7,0)` to `rgba(14,10,7,1)`. Hide the poster the first time.
- **Cup canvas:** if not layered, or merged: remove `is-on` and stop. Otherwise add `is-on` and:
  - Start position (where the cup sits in the hero frame, from the last cell): k0 = view s, ax0 = ox + (cell.x − cropX + cellW/2 + cell.dx) × k0, ay0 = oy + (cell.y + cellH/2 + cell.dy) × k0.
  - **Lane geometry** (cached per vw, vh, set): lane = `--lane` percentage × vw / 100; gutter = nav padding-left (fallback 16); maxW, maxH = largest cell w and h in the set; phone = vw < 640. Width w = phone ? lane − gutter − 6 : min(lane − 56, vh × 0.42 × maxW / maxH). k = w / maxW. Centre cx = phone ? vw − gutter − w/2 : vw − lane/2; cy = navH + (vh − navH) × 0.54.
  - Current scale and centre: k = lerp(k0, lane k, d), ax = lerp(ax0, lane cx, d), ay = lerp(ay0, lane cy, d).
  - Frame: want(cut-outs, spin frame, 6, 8). If the spin frame is LAST, or no cut-out is decoded yet, use the last cut-out bitmap with the last cell; else use the decoded spin frame or pick() from the on-screen one, with that frame's cell.
  - Squash and stretch: pop = spring x; jel = clamp(spring v / √190, −1.5, 1.5); sx = (1 + 0.13·pop)(1 − 0.08·jel); sy = (1 + 0.13·pop)(1 + 0.09·jel); rotation = 0.06·pop radians (≈ 3.4° at full pop).
  - Skip drawing if the key (frame, ax, ay to 2 decimals, k to 4, d, pop, jel to 3–4) is unchanged. Clear the canvas.
  - Shadow: alpha = 0.55·d + 0.3·max(0, pop); if > 0.005, draw the sprite at global alpha min(0.7, alpha), scaled by k × dpr × (1 + 0.18·max(0, pop)), centred on ax, and on ay plus cellH × (0.06 + 0.05·max(0, pop)) × k (all × dpr). No rotation or squash on the shadow.
  - Cut-out: set the transform to (sx·cos r, sx·sin r, −sy·sin r, sy·cos r, ax, ay), each × dpr, draw the bitmap at (−(cellW/2 + cell.dx) × k, −(cellH/2 + cell.dy) × k) with size cellW × k by cellH × k, then reset the transform.
- **Reduced motion (RM):** no Lenis, no loop, no pin, no cut-out. Measure, load the last frame of the chosen set as a bitmap, draw it on the hero canvas, mark the loader done, and redraw on resize. CSS: hero height auto; stage position relative, height 100vh then 100svh; captions and cue hidden; reveals shown immediately with no transition.
- **Lenis** (when not RM, `window.Lenis` exists and `?lenis` isn't `off`): `lerp: 0.1`, `smoothWheel: true`; touch stays native; driven from the render loop's `raf(t)`. A delegated click handler on links whose href starts with `#`: `#top` scrolls to 0, otherwise to the target element (ignore if not found), prevent default, `scrollTo(target, { offset: 0, duration: 1.4 })`. Scrolling stays native in feel and fully reversible; no snapping.
- **Reveals:** elements with `.rv` start at opacity 0 and translateY 22px, transitioning opacity and transform over .9s with `cubic-bezier(.2, .7, .2, 1)`. An IntersectionObserver with rootMargin `0px 0px -10% 0px` adds `is-in` (opacity 1, no transform) the first time each enters and then stops watching it. Runs in RM too (where `.rv` is already visible).

### 8. Responsive

- **≥1024px:** lane 34vw; facts 3 columns; menu and places 2 columns.
- **≤1023px:** lane 30vw; facts 1 column, gap 24px; menu and places 1 column, gap 40px.
- **≤819px:** nav links hidden; brand 23px; button 38px tall, padding 0 16px.
- **≤639px:** nav height 58px; body 16px; wrap max-width `calc(100vw - var(--lane) - var(--gutter))`; h2 `clamp(34px, 9vw, 48px)`; menu names 20px; menu items become 1 column with the price below the name in gold 14px (grid-row auto, column 1); place names 28px; contact rows stack (column, gap 4px); footer meta stacks (column, gap 10px). Cup lane uses the phone formula (vw < 640).
- **Portrait (any width):** hero portrait rules from section 6; the mobile square frame set is used when it covers the width; the frame sits at the top and fades into the ground, text in the band below it.

### 9. Accessibility and quality

- Landmarks: `header` with a labelled `nav` ("Main"), one `main#top`, the hero section labelled "Introduction", `footer`. One h1; h2 per section; h3 for facts, menu groups and places.
- Decorative layers are hidden from assistive tech: loader, hero canvas, the two captions, footer word, cup canvas. The poster alt is empty (decorative; the h1 carries the meaning). The photo alt is the sentence given above.
- Skip link "Skip the intro" in the hero; keep default focus rings on all interactive elements.
- Reduced motion and `?motion=off` give a still hero (the last frame), no pin, no cut-out, no smooth scroll, content visible.
- Performance: canvases capped at 1.5× DPR; only a small window of frames is decoded at a time and the rest are closed; the hero and cup canvases redraw only when their content key changes; the poster is the first paint (high fetch priority); the photo is lazy-loaded; no layout reads in the loop except offsets and scrollHeight.

### 10. Verification checklist (do this in a real browser before saying it's done)

1. Serve `site/` over HTTP (top-level await and fetch need it). No console errors; manifest loads; loader fills and fades.
2. At the top, the poster shows immediately, then the canvas takes over with no visible jump.
3. Scroll slowly through the hero: the product turns and lands; intro fades out over 5–20 % of the hero; caption 2 shows 30–60 %; caption 3 from 68 %; cue fades in the first 4 %.
4. At the end of the hero the last frame and the layered plate + cut-out are pixel-identical (compare with `?handoff=video`; nothing should shift).
5. Keep scrolling: the cup pops (swell, squash, slight tilt, shadow bloom), moves into the right lane, and never overlaps section text at 1440, 1024, 768 and 390 px widths.
6. Down the page the cup turns once backwards, then once forwards over the last quarter, and is logo-facing at the very bottom. Scroll back up: it reverses, flies back into the video with a smaller kick and merges invisibly.
7. Fast flick scrolling in both directions never flashes a frame from the wrong part of the clip.
8. Portrait phone (390×844): mobile set loads, frame sits at the top with the faded bottom edge, text below it, no horizontal scroll.
9. Reduced motion (OS setting and `?motion=off`): still last frame, no pin, no cup canvas, all content visible.
10. Nav turns solid halfway through the hero's last screen; anchor links scroll smoothly with Lenis; touch scrolling is native.
11. All copy matches this prompt verbatim; every `<img>` has real width/height.

---

## Appendix — Optional: recreate the original media

Use these if you want the demo look with your own product. Replace "[YOUR LOGO]" with your own mark; don't use anyone else's brand.

**Shared style block (prepend to every image prompt):**
Photorealistic commercial product photography, 16:9, 3840×2160. Interior of a modern specialty café in late-afternoon golden-hour sun. Left: floor-to-ceiling black-framed windows with blurred green trees and city buildings outside; warm globe pendant lights hanging from a dark ceiling. Right: a back bar with lit wooden shelves of bottles and plants, a dark chalk menu board, an espresso machine, a blurred barista. Seated customers softly out of focus in the middle distance. Warm amber and honey tones, deep espresso shadows, creamy bokeh, shallow depth of field (f/2), 35mm lens, eye-level camera. The product is the only sharp object.

**Keyframe 01-first:** a matte black double-wall paper takeaway coffee cup with a black plastic lid and a thin white rim at the base, floating in mid-air in the upper-middle of the frame, upright, logo side facing the camera: a small white monogram above the wordmark "[YOUR LOGO]". Camera framed slightly upward: windows, pendant lights and ceiling visible.

**Keyframe 02-middle:** same cup, same lighting, turned 180° (back side and seam facing the camera, logo hidden), lower in the frame and slightly tilted, mid-descent. Camera has drifted down: tables, chairs and seated customers in view.

**Keyframe 03-last:** same cup at rest, standing upright on a warm wooden table top in the foreground, centred, logo facing the camera, sharp, no motion. Camera at table height: the bar counter and tables behind, the floor of the table filling the lower third.

**Clean plate (slot `assets/plate.*`):** keyframe 03-last with the cup removed: the same wooden table and room, identical framing and light, no cup and no cup shadow. Easiest route: inpaint the cup out of the clip's final frame.

**Image-to-video prompt — first frame 01, end frame 03 (if the model needs it, make 01→02 and 02→03 and join them):**
"A matte black takeaway coffee cup floats in a sunlit café, then slowly turns exactly one full 360° rotation around its vertical axis while gently descending, and settles upright on the wooden table in the foreground, logo facing the camera. Camera slowly pedestals down with the cup, smooth and steady, then holds still for the final half second. Golden afternoon light, soft bokeh, background people move subtly. The cup keeps its exact shape, colour, lid and logo throughout; no deformation, no extra objects, no text changes, no motion blur at the end. 5 seconds." Save the result as `assets/video.mp4`.

**Room photo (slot `assets/photo.*`, optional):** the shared style block without any product: the empty café in the afternoon, tables by tall windows and a long wooden bar, composed so the interest sits at 40 % across and 60 % down for a 21:9 crop.
