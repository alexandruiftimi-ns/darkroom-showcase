# Prompt: recreate the "Lustre Self Car Wash" landing page exactly

Copy everything below the line into Claude. Claude Code works best because it can write the files and run commands.

---

You are rebuilding a finished landing page **exactly**: every pixel, every timing and every line of copy. The complete source code is at the end of this prompt and is the reference. Do not redesign, "improve" or modernise it, add frameworks, or rename classes. Treat it like a print file.

## What you must do

1. **Create this file tree** and copy each file below into it **byte for byte**:
   ```
   site/
     index.html
     css/base.css   css/reveal.css   css/page.css
     js/page.js     js/reveal.js     js/foam-wipe.js
     fonts/         (step 2)
     media/         (step 3)
   ```
   It is static HTML: no build step, no libraries, no CDN scripts. `js/page.js` is an ES module, so serve the site over http (for example `python -m http.server` inside `site/`). Opening it as `file://` will not work.

2. **Fonts.** Both families are free under the SIL Open Font License. Download them from Fontsource's CDN and save them in `site/fonts/` under these exact file names:
   | File name | Download URL |
   |---|---|
   | cormorant-garamond-latin-300-normal.woff2 | https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-300-normal.woff2 |
   | cormorant-garamond-latin-300-italic.woff2 | https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-300-italic.woff2 |
   | cormorant-garamond-latin-400-normal.woff2 | https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-400-normal.woff2 |
   | cormorant-garamond-latin-500-normal.woff2 | https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-500-normal.woff2 |
   | cormorant-garamond-latin-500-italic.woff2 | https://cdn.jsdelivr.net/fontsource/fonts/cormorant-garamond@latest/latin-500-italic.woff2 |
   | hanken-grotesk-latin-wght-normal.woff2 (variable, 100–900) | https://cdn.jsdelivr.net/fontsource/fonts/hanken-grotesk:vf@latest/latin-wght-normal.woff2 |

   If you cannot download files, give the user these URLs and ask them to save the fonts themselves. Do not swap in other families or load the fonts through Google Fonts CSS.

3. **Images: the user's own photos.** This prompt includes no images. Ask the user for their photos. For each slot below:
   - Crop the photo to the slot's aspect ratio, resize it, and export it as WebP (quality ~80) under the exact file name.
   - Set that `<img>`'s `width` and `height` attributes to the real pixel size.
   - Rewrite its `alt` text to describe what is actually in the user's photo.
   - Grade it dark and warm (blacks lifted slightly, highlights cooled down, saturation lowered a little) so it sits on the #0b0a09 background.

   | Slot / file name | Used in | Size (aspect) | What the photo must be |
   |---|---|---|---|
   | `hero-dirty-1672.webp` + `hero-dirty-960.webp` | Hero, before | 1672×941 and 960×540 (16:9) | A **dirty** car in a wash bay. Dark and moody, car roughly centred, with room above it. |
   | `hero-clean-1672.webp` + `hero-clean-960.webp` | Hero, after | Same as dirty | **The same shot, clean.** It must line up pixel for pixel with the dirty photo: same camera, crop and light, with only the dirt changed. The foam wipe cuts between the two in place, so any shift shows as a jump. The easiest way is one photo plus an AI-edited copy (dirty ↔ clean). No text or signs in the frame. |
   | `expand-bay.webp` | "The care a 911 gets" chapter | 1920×1280 (3:2) | A car covered in snow foam in a bay, lit warm from the side. Focal point about 50% / 55%. The image opens from a small centred frame to full screen, so its middle must work on its own. |
   | `dial-01.webp` … `dial-08.webp` | The 8 programs, in order | 1600×1100 each | One photo per program: pre-wash spray, pink active foam, shampoo, foam brush, rim cleaner, high-pressure rinse, water beading on wax, droplets after the final rinse. **Keep the subject on the right half.** The left ~40% sits under a dark gradient behind the big title. |
   | `detail-wide.webp` | "Start to shine" full-screen band | At least 1920 wide (16:9) | The finished clean car (a crop of the clean hero photo works). Focal point about 60% / 50%. The bottom 40% is darkened behind the text. |
   | `visit-bay.webp` | Visit section, left half | 900×1100 (portrait, about 4:5) | A car in a bay. It fills half the screen on desktop and shows at 4:5 on phones. |

   If the user's hero photo frames the car differently, change only the image position: `.hero-media img { object-position: 50% 42%; }` for desktop, and `40% 50%` inside the `@media (max-width: 860px)` block. The canvas reads this value, so the foam wipe follows automatically.

   Until the user's photos arrive, use plain `#14120f` placeholder images at the right sizes. Never point the page at stock photos or file paths you made up.

4. **The user's business details.** If the user gives their own name, address, bay count or payment options, change only the text in these places:
   - the brand "LUSTRE / SELF CAR WASH" in the header and footer, and the large "Lustre." footer wordmark (`foot-word`)
   - the `<title>` and the meta description
   - the Visit details list (`<dl>`)
   - the credits line

   Keep each piece of copy about the same length, because the layout is tuned to it. The hero H1 must stay on two lines. Every heading keeps its pattern: a plain statement followed by a gold *italic* answer inside `<em>`.

   If the user has more or fewer than 8 programs, add or remove `<article class="prog">` blocks and change `8 * 55vh` in `.dial-section.is-live` to the new count. The knob's tick marks are generated from the number of programs.

   Otherwise, keep every word exactly as written.

5. **Do not change:**
   - colours, the type scale or any `clamp()` value
   - easings, durations or z-indexes
   - the breakpoints (1100 / 860 / 700 px)
   - the film-grain overlay
   - the foam-wipe algorithm (seeds 11 and 3, smoothing factor .16, scroll range .04–.9)
   - the reduced-motion fallbacks

   **Do not add:** booking forms, prices, reviews, ratings, countdowns, script fonts, gold-filled buttons, scroll hijacking or scroll snapping.

## Check before you hand it over

Serve `site/` and check it at **1440×900** and at **390×844**:
- **First screen:** the dirty car fills the top ~76% (about 64% on phones). The H1 "Every car leaves / looking *fresh.*" sits bottom-left on two lines, the short intro and the two buttons sit bottom-right, and the Before ── After meter sits on the right, just above where the photo fades out.
- **Foam wipe:** scrolling sweeps a rising column of white foam from left to right, leaving the car clean behind it, and the gold meter fills. Scrolling back reverses it.
- **Header:** after the hero, it turns into blurred dark glass.
- **"The care a 911 gets." chapter:** the photo opens from a framed card to full screen, and the short paragraph fades in near the end.
- **Figures:** 24/7 · *8* · 0 are set very large, and the 8 is gold italic.
- **Features:** the section stays pinned while you scroll. Each scroll step swaps the program photo (a crossfade with a slow settle), turns the knob pointer one tick, and moves the gold progress line along the bottom.
- **How it works:** an ivory sheet with 56 px rounded top corners slides up over the dark page.
- **The rest:** the "Start to shine" full-screen band, the Visit split and the giant "Lustre." footer wordmark come next.
- **Reduced motion** (`prefers-reduced-motion: reduce`): nothing is pinned, the hero shows the clean photo without animation, and all content is visible.
- **No horizontal overflow and no console errors.**

## Source files (reproduce exactly)

### `site/index.html`

````html
<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Lustre Self Car Wash — every car leaves looking fresh</title>
<meta name="description" content="Self-service wash bays with pink active foam, hot-water shampoo, liquid wax and a spot-free osmosis rinse. Open 24/7, for every car.">
<meta name="theme-color" content="#0b0a09">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230b0a09'/%3E%3Ctext x='32' y='44' font-family='Georgia,serif' font-size='38' text-anchor='middle' fill='%23c8a96a'%3EL%3C/text%3E%3C/svg%3E">
<script>document.documentElement.className = 'js';</script>
<link rel="preload" href="fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="media/hero-dirty-1672.webp" as="image" media="(min-width: 700px)">
<link rel="preload" href="media/hero-dirty-960.webp" as="image" media="(max-width: 699px)">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/reveal.css">
<link rel="stylesheet" href="css/page.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <a class="mark" href="#top" aria-label="Lustre Self Car Wash, back to top">LUSTRE<small>SELF CAR WASH</small></a>
  <nav class="nav" aria-label="Main">
    <a href="#features">Features</a>
    <a href="#how">How it works</a>
    <a href="#visit">Visit</a>
    <a class="btn btn-ghost" href="#visit">Find us</a>
  </nav>
</header>

<section class="hero" id="top" data-wipe aria-label="Introduction">
  <div class="hero-stage">
    <div class="hero-media">
      <picture class="poster-dirty">
        <source media="(min-width: 700px)" srcset="media/hero-dirty-1672.webp">
        <img src="media/hero-dirty-960.webp" width="1672" height="941" alt="A black Porsche 911 with gold wheels covered in road grime in a self-service wash bay" fetchpriority="high">
      </picture>
      <picture class="poster-clean">
        <source media="(min-width: 700px)" srcset="media/hero-clean-1672.webp">
        <img src="media/hero-clean-960.webp" width="1672" height="941" alt="The same Porsche 911 after the wash, paint gleaming and beaded with water">
      </picture>
      <canvas aria-hidden="true"></canvas>
    </div>

    <div class="meter-pos wipe-meter label" aria-hidden="true">
      <span>Before</span><span class="bar"><i></i></span><span>After</span>
    </div>

    <div class="hero-copy" id="main">
      <h1><span class="line">Every car leaves</span> <span class="line">looking <em>fresh.</em></span></h1>
      <div class="hero-side">
        <p>Pink active foam, hot-water shampoo and a spot-free osmosis rinse. Self-service bays, open day and night, for every car.</p>
        <div class="ctas">
          <a class="btn btn-primary" href="#features">See the features</a>
          <a class="link-arrow" href="#how">How it works</a>
        </div>
      </div>
    </div>
  </div>
</section>

<main>
  <section class="expand" id="promise" aria-labelledby="promise-h" data-scene>
    <div class="expand-stage">
      <div class="expand-media">
        <img src="media/expand-bay.webp" width="1920" height="1280" alt="A Honda Civic covered in snow foam inside a self-service wash bay, lit warm from the side" loading="lazy">
      </div>
      <h2 class="expand-h" id="promise-h">
        <span class="tl">The care a 911 gets.</span>
        <span class="br"><em>Whatever you drive.</em></span>
      </h2>
      <p class="expand-lede">Self-service doesn't have to feel cheap. Our bays run the programs a detailer would use, so the finish looks far more expensive than it was.</p>
    </div>
  </section>

  <section class="figures" aria-label="At a glance">
    <ul class="figures-list" data-reveal-stagger="120">
      <li data-reveal><b>24/7</b><span>Open every day of the year, holidays included</span></li>
      <li data-reveal><b>8</b><span>Programs on every dial, from pre-wash to wax</span></li>
      <li data-reveal><b>0</b><span>Towels needed after the spot-free rinse</span></li>
    </ul>
  </section>

  <section class="dial-section" id="features" aria-labelledby="feat-h" data-scene>
    <div class="dial-stage">
      <h2 class="dial-title label" id="feat-h">Features <span>· Eight programs, one dial</span></h2>

      <div class="programs">
        <article class="prog is-active">
          <img src="media/dial-01.webp" width="1600" height="1100" alt="A sports car being sprayed in a wash bay, water bursting off the rear" loading="lazy">
          <div class="prog-copy"><span class="prog-n">01</span><h3>Pre-wash</h3><p>A low-pressure pre-soak that loosens road film, salt and insects before the real wash starts.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-02.webp" width="1600" height="1100" alt="A hatchback covered in thick active foam under coloured bay lights" loading="lazy">
          <div class="prog-copy"><span class="prog-n">02</span><h3>Pink active foam</h3><p>Thick, coloured snow foam that clings to the paint and lifts the dirt away. The part everyone films.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-03.webp" width="1600" height="1100" alt="An SUV front with shampoo running down the grille" loading="lazy">
          <div class="prog-copy"><span class="prog-n">03</span><h3>Hot-water shampoo</h3><p>Warm water and shampoo at high pressure, worked from the roof down.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-04.webp" width="1600" height="1100" alt="A foam brush working over a red alloy wheel" loading="lazy">
          <div class="prog-copy"><span class="prog-n">04</span><h3>Foam brush</h3><p>A soft brush fed with foam for stubborn spots. Rinse it first, then go gently.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-05.webp" width="1600" height="1100" alt="A sports car wheel coated in cleaner in a dark bay" loading="lazy">
          <div class="prog-copy"><span class="prog-n">05</span><h3>Rim &amp; insect cleaner</h3><p>A stronger mix for brake dust on the wheels and insects on the bumper and mirrors.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-06.webp" width="1600" height="1100" alt="A high-pressure lance rinsing a black sports car's front wheel" loading="lazy">
          <div class="prog-copy"><span class="prog-n">06</span><h3>High-pressure rinse</h3><p>Clean water at full pressure to carry every trace of soap away.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-07.webp" width="1600" height="1100" alt="Water beading on the waxed black paint of a classic car" loading="lazy">
          <div class="prog-copy"><span class="prog-n">07</span><h3>Liquid wax</h3><p>A thin wax layer for gloss and protection. Water beads and slides straight off.</p></div>
        </article>
        <article class="prog">
          <img src="media/dial-08.webp" width="1600" height="1100" alt="Clean droplets on a dark car door after the final rinse" loading="lazy">
          <div class="prog-copy"><span class="prog-n">08</span><h3>Spot-free rinse</h3><p>Demineralised osmosis water as the final pass, so the car air-dries without water marks.</p></div>
        </article>
      </div>

      <div class="knob" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <defs>
            <radialGradient id="kg" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#3a352e"/><stop offset=".55" stop-color="#1a1714"/><stop offset="1" stop-color="#0b0a09"/></radialGradient>
            <linearGradient id="kr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9dcc0"/><stop offset=".5" stop-color="#8f7643"/><stop offset="1" stop-color="#e3cf9f"/></linearGradient>
          </defs>
          <circle cx="100" cy="100" r="96" fill="none" stroke="url(#kr)" stroke-width="1.2" opacity=".9"/>
          <g class="ticks"></g>
          <circle cx="100" cy="100" r="58" fill="url(#kg)" stroke="rgba(239,233,223,.22)"/>
          <g class="pointer"><line x1="100" y1="100" x2="100" y2="50" stroke="#c8a96a" stroke-width="2.4" stroke-linecap="round"/><circle cx="100" cy="100" r="5" fill="#c8a96a"/></g>
        </svg>
        <span class="knob-n">01</span>
      </div>

      <div class="dial-progress" aria-hidden="true"><i></i></div>
    </div>
  </section>

  <section class="section how" id="how" aria-labelledby="how-h">
    <div class="wrap">
      <div class="folio label" data-reveal><span>How it works</span><span>Pay by the minute</span></div>
      <div class="how-head">
        <h2 class="h2" id="how-h" data-reveal>Four steps. <em>No queue.</em></h2>
        <p class="lede" data-reveal>Pay only for the time you use. Most cars are done in a few minutes.</p>
      </div>
      <ol class="steps" data-reveal-stagger="100">
        <li class="step" data-reveal><h3>Pay</h3><p>Card, contactless, coins or tokens. The display counts down your time.</p></li>
        <li class="step" data-reveal><h3>Choose</h3><p>Turn the dial. Start with the pre-wash, then the pink foam.</p></li>
        <li class="step" data-reveal><h3>Wash</h3><p>Roof first, wheels last. Switch programs whenever you like.</p></li>
        <li class="step" data-reveal><h3>Finish</h3><p>Liquid wax, spot-free rinse, then drive out.</p></li>
      </ol>
      <div class="extras" data-reveal>
        <span class="label">Around the bays</span>
        <ul>
          <li>Vacuum stations</li>
          <li>Compressed air</li>
          <li>Floor mat cleaner</li>
          <li>Tyre pressure</li>
          <li>Change machine</li>
          <li>Wipes &amp; fragrance vending</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="ritual" aria-label="The finish">
    <img src="media/detail-wide.webp" width="1100" height="619" alt="The clean Porsche in the wash bay, water still beading on the paint" loading="lazy">
    <div class="ritual-copy">
      <span class="label" data-reveal>Start to shine</span>
      <p data-reveal>Foam. Wash. Rinse. Wax. <em>Drive away fresh.</em></p>
    </div>
  </section>

  <section class="visit" id="visit" aria-labelledby="visit-h">
    <figure class="visit-media" data-reveal="mask">
      <img src="media/visit-bay.webp" width="900" height="1100" alt="A BMW covered in foam inside a wash bay" loading="lazy">
    </figure>
    <div class="visit-copy">
      <div class="folio label" data-reveal><span>Visit</span><span>Open 24 hours</span></div>
      <h2 class="h2" id="visit-h" data-reveal>Open 24/7. <em>Just drive in.</em></h2>
      <dl data-reveal>
        <dt class="label">Address</dt><dd>12 Example Street, Your City <span>(template placeholder)</span></dd>
        <dt class="label">Open</dt><dd>Every day, 24 hours</dd>
        <dt class="label">Bays</dt><dd>6 wash bays, 2 tall enough for vans <span>(template placeholder)</span></dd>
        <dt class="label">Paying</dt><dd>Card, contactless, coins and tokens</dd>
      </dl>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="foot-top">
    <a class="mark" href="#top">LUSTRE<small>SELF CAR WASH</small></a>
    <nav class="foot-nav" aria-label="Footer">
      <a href="#features">Features</a><a href="#how">How it works</a><a href="#visit">Visit</a>
    </nav>
  </div>
  <p class="foot-word" aria-hidden="true">Lustre<em>.</em></p>
  <p class="credits">Presentation template. Business name, address, bay details and photos are placeholders.
    Section photos from <a href="https://unsplash.com/license">Unsplash</a> (Unsplash Licence), colour-graded.</p>
</footer>

<script type="module" src="js/page.js"></script>
</body>
</html>

````

### `site/css/base.css`

````css
@font-face { font-family: "Cormorant Garamond"; src: url(../fonts/cormorant-garamond-latin-300-normal.woff2) format("woff2"); font-weight: 300; font-style: normal; font-display: swap; }
@font-face { font-family: "Cormorant Garamond"; src: url(../fonts/cormorant-garamond-latin-300-italic.woff2) format("woff2"); font-weight: 300; font-style: italic; font-display: swap; }
@font-face { font-family: "Cormorant Garamond"; src: url(../fonts/cormorant-garamond-latin-400-normal.woff2) format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: "Hanken Grotesk"; src: url(../fonts/hanken-grotesk-latin-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Cormorant Garamond"; src: url(../fonts/cormorant-garamond-latin-500-normal.woff2) format("woff2"); font-weight: 500; font-style: normal; font-display: swap; }
@font-face { font-family: "Cormorant Garamond"; src: url(../fonts/cormorant-garamond-latin-500-italic.woff2) format("woff2"); font-weight: 500; font-style: italic; font-display: swap; }

:root {
  --ground: #0b0a09;
  --ground-2: #14120f;
  --ground-3: #1d1a16;
  --ink: #efe9df;
  --ink-2: #d6cfc3;
  --ink-3: #aaa297;
  --accent: #c8a96a;
  --line: rgba(239, 233, 223, 0.14);
  --line-strong: rgba(239, 233, 223, 0.32);

  --f-serif: "Cormorant Garamond", "Times New Roman", serif;
  --f-sans: "Hanken Grotesk", system-ui, sans-serif;

  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-state: cubic-bezier(.4, 0, .2, 1);

  --gutter: clamp(20px, 4vw, 64px);
  --section: clamp(88px, 12vw, 176px);
  --max: 80rem;

  color-scheme: dark;
  accent-color: var(--accent);
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font: 400 18px/1.55 var(--f-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
img, canvas { display: block; max-width: 100%; }
a { color: inherit; }
::selection { background: var(--accent); color: var(--ground); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
h1, h2, h3, p { margin: 0; }
h1, h2, h3 { text-wrap: balance; font-weight: 300; }
p { text-wrap: pretty; }

.skip { position: absolute; left: 12px; top: -60px; z-index: 50; padding: 10px 14px; background: var(--ink); color: var(--ground); text-decoration: none; }
.skip:focus { top: 12px; }

.label {
  font: 500 12px/1.2 var(--f-sans);
  letter-spacing: .22em;
  text-transform: uppercase;
}

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .6em;
  min-height: 48px; padding: 0 26px;
  font: 500 15px/1 var(--f-sans); letter-spacing: .02em;
  text-decoration: none; border-radius: 2px; border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 180ms var(--ease-state), color 180ms var(--ease-state), border-color 180ms var(--ease-state), transform 120ms var(--ease-state);
}
.btn:active { transform: scale(.97); }
.btn-primary { background: var(--ink); color: var(--ground); }
.btn-ghost { border-color: var(--line-strong); color: var(--ink); }
@media (hover: hover) {
  .btn-primary:hover { background: #fff; }
  .btn-ghost:hover { border-color: var(--ink); }
}

.link-arrow { font: 500 15px/1 var(--f-sans); display: inline-flex; align-items: center; padding: 14px 0; text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: 6px; transition: text-decoration-color 200ms var(--ease-state); }
.link-arrow span { transition: transform 250ms var(--ease-out); }
@media (hover: hover) { .link-arrow:hover { text-decoration-color: var(--accent); } }

/* Hero wipe: shared mechanics */
.hero { position: relative; }
.js .hero[data-wipe] { height: calc(100svh + 105vh); }
.hero-stage { position: relative; height: 100svh; overflow: hidden; }
.js .hero[data-wipe] .hero-stage { position: sticky; top: 0; }
.hero-media { position: absolute; inset: 0; overflow: hidden; background: var(--ground-2); }
.hero-media img, .hero-media canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-media canvas { opacity: 0; }
.hero-media.is-live canvas { opacity: 1; }
.poster-dirty { display: none; }
.js .poster-dirty { display: block; }
.js .poster-clean { display: none; }

.wipe-meter { display: flex; align-items: center; gap: 14px; color: var(--ink-2); }
.wipe-meter .bar { position: relative; width: clamp(80px, 12vw, 160px); height: 1px; background: var(--line-strong); }
.wipe-meter .bar i { position: absolute; inset: 0; background: var(--accent); transform-origin: left; transform: scaleX(var(--p, 0)); }

@media (prefers-reduced-motion: reduce) {
  .js .hero[data-wipe] { height: auto; }
  .js .hero[data-wipe] .hero-stage { position: relative; }
  .js .poster-dirty { display: none; }
  .js .poster-clean { display: block; }
  .hero-media canvas { display: none; }
  .wipe-meter .bar i { transform: scaleX(1); }
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}

````

### `site/css/reveal.css`

````css
/* On-scroll reveals (pairs with reveal.js). Hidden states apply only under html.reveal-ready, which the script sets,
   so the page is complete without JavaScript. Only opacity, transform and clip-path move. Tune per style pack:
   luxury = slower and shorter travel (900 ms, 12px); bold = faster, harder (350 ms, 40px); trust = fade only. */
:root { --reveal-dur: 700ms; --reveal-ease: cubic-bezier(.22, 1, .36, 1); --reveal-travel: 24px; }

.reveal-ready [data-reveal]:not(.is-revealed) { opacity: 0; }
.reveal-ready [data-reveal=""]:not(.is-revealed),
.reveal-ready [data-reveal="up"]:not(.is-revealed) { transform: translateY(var(--reveal-travel)); }
.reveal-ready [data-reveal="scale"]:not(.is-revealed) { transform: scale(.96); }
/* The clip sits on the children: a fully clipped target never reports as intersecting, so it would never reveal. */
.reveal-ready [data-reveal="mask"]:not(.is-revealed) { opacity: 1; }
.reveal-ready [data-reveal="mask"]:not(.is-revealed) > * { clip-path: inset(100% 0 0 0); }
.reveal-ready [data-reveal="words"]:not(.is-revealed) { opacity: 1; }
.reveal-ready [data-reveal="words"]:not(.is-revealed) .reveal-word { opacity: 0; transform: translateY(.4em); }

[data-reveal] {
  transition: opacity var(--reveal-dur) var(--reveal-ease), transform var(--reveal-dur) var(--reveal-ease), clip-path calc(var(--reveal-dur) * 1.4) var(--reveal-ease);
  transition-delay: var(--reveal-delay, 0ms);
}
[data-reveal="mask"] > * { clip-path: inset(0 0 0 0); transition: clip-path calc(var(--reveal-dur) * 1.4) var(--reveal-ease); transition-delay: var(--reveal-delay, 0ms); }
.reveal-word { display: inline-block; transition: opacity var(--reveal-dur) var(--reveal-ease), transform var(--reveal-dur) var(--reveal-ease); transition-delay: calc(var(--reveal-delay, 0ms) + var(--i, 0) * 60ms); }

@media (prefers-reduced-motion: reduce) {
  [data-reveal], [data-reveal] > *, .reveal-word { transition: none !important; opacity: 1 !important; transform: none !important; clip-path: none !important; }
}

````

### `site/css/page.css`

````css
:root {
  --reveal-dur: 900ms; --reveal-travel: 16px;
  --paper: #f2eee7;
  --paper-2: #e8e2d8;
  --paper-ink: #14120f;
  --paper-ink-2: #3f3a33;
  --paper-line: rgba(20, 18, 15, .16);
  --gold-deep: #74561f;
}

/* Film grain over everything: gives the flat fills a printed, photographic surface. */
body::after {
  content: ""; position: fixed; inset: 0; z-index: 60; pointer-events: none; opacity: .06;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Header */
.site-header {
  position: fixed; z-index: 40; top: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  height: 76px; padding: 0 var(--gutter);
  border-bottom: 1px solid transparent;
  transition: background-color 300ms var(--ease-state), border-color 300ms var(--ease-state);
}
.site-header.is-solid { background: rgba(11, 10, 9, .72); backdrop-filter: blur(18px) saturate(1.2); -webkit-backdrop-filter: blur(18px) saturate(1.2); border-color: var(--line); }
.mark { font: 600 15px/1 var(--f-sans); letter-spacing: .42em; text-decoration: none; }
.mark small { display: block; margin-top: 7px; font-weight: 500; font-size: 10px; letter-spacing: .3em; color: var(--ink); opacity: .8; }
.site-header .mark, .site-header .nav a { text-shadow: 0 1px 12px rgba(0,0,0,.6); }
.nav { display: flex; align-items: center; gap: clamp(20px, 2.6vw, 40px); }
.nav a:not(.btn) { text-decoration: none; font-size: 14px; color: var(--ink); transition: opacity 150ms; opacity: .86; }
@media (hover: hover) { .nav a:not(.btn):hover { opacity: 1; } }
.nav .btn { min-height: 40px; padding: 0 18px; font-size: 14px; background: rgba(11,10,9,.3); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }

/* Hero (Showroom) */
.hero-media { bottom: 24%; }
.hero-media img { object-position: 50% 42%; }
.hero-media::before, .hero-media::after { content: ""; position: absolute; left: 0; right: 0; z-index: 1; pointer-events: none; }
.hero-media::before { top: 0; height: 30%; background: linear-gradient(rgba(11,10,9,.9), rgba(11,10,9,.5) 45%, rgba(11,10,9,0)); }
.hero-media::after { bottom: 0; height: 34%; background: linear-gradient(rgba(11,10,9,0), var(--ground)); }
.meter-pos { position: absolute; z-index: 3; right: var(--gutter); bottom: 31%; }
.hero-copy {
  position: absolute; z-index: 3; left: 0; right: 0; bottom: 0;
  padding: 0 var(--gutter) clamp(36px, 6vh, 64px);
  display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 24px; align-items: end;
}
.hero h1 { grid-column: 1 / span 8; font: 500 clamp(48px, 7.4vw, 124px)/.9 var(--f-serif); letter-spacing: -.03em; text-shadow: 0 16px 38px rgba(0,0,0,.32); }
.hero h1 .line { display: block; }
.hero-side { grid-column: 9 / span 4; display: grid; gap: 26px; padding-bottom: 10px; }
.hero-side p { color: var(--ink); font-size: 18px; max-width: 34ch; }
.ctas { display: flex; flex-wrap: wrap; gap: 8px 28px; align-items: center; }
@media (min-width: 1024px) { .hero h1 .line { white-space: nowrap; } }
@media (max-height: 760px) and (min-width: 700px) { .hero h1 { font-size: clamp(44px, 6.2vw, 96px); } }

/* Shared */
em { font-style: italic; color: var(--accent); }
.section { padding: clamp(96px, 12vw, 184px) var(--gutter); }
.wrap { max-width: 88rem; margin: 0 auto; }
.folio {
  display: flex; justify-content: space-between; align-items: baseline;
  border-top: 1px solid var(--line-strong); padding-top: 16px;
  margin-bottom: clamp(48px, 6vw, 96px); color: var(--ink-2);
}
.h2 { font: 500 clamp(46px, 6.6vw, 116px)/.92 var(--f-serif); letter-spacing: -.03em; }
.lede { font-size: clamp(18px, 1.4vw, 21px); line-height: 1.55; color: var(--ink-2); max-width: 46ch; }

/* 1 Expand: a framed photo opens to full bleed as you scroll (--p from page.js) */
.expand { position: relative; --p: 1; }
.expand.is-live { height: 230vh; }
.expand-stage { position: relative; height: 100svh; min-height: 560px; overflow: hidden; }
.expand.is-live .expand-stage { position: sticky; top: 0; }
.expand-media {
  position: absolute; inset: 0;
  clip-path: inset(calc(24% * (1 - var(--p))) calc(31% * (1 - var(--p))) round calc(4px * (1 - var(--p))));
}
.expand-media img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 55%; transform: scale(calc(1.2 - .2 * var(--p))); }
.expand-media::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(11,10,9,.45), rgba(11,10,9,.15) 40%, rgba(11,10,9,.75)); opacity: calc(.25 + .75 * var(--p)); }
.expand-h { position: absolute; inset: 0; z-index: 2; pointer-events: none; font: 500 clamp(46px, 7.2vw, 132px)/.9 var(--f-serif); letter-spacing: -.03em; text-shadow: 0 16px 48px rgba(0,0,0,.45); }
.expand-h .tl { position: absolute; left: var(--gutter); top: clamp(96px, 15vh, 150px); max-width: 9ch; }
.expand-h .br { position: absolute; right: var(--gutter); bottom: clamp(48px, 12vh, 120px); max-width: 9ch; text-align: right; }
.expand-lede {
  position: absolute; z-index: 2; left: var(--gutter); bottom: clamp(48px, 12vh, 120px);
  max-width: 34ch; font-size: clamp(17px, 1.3vw, 20px); color: var(--ink);
  opacity: clamp(0, calc((var(--p) - .7) * 4), 1); transform: translateY(calc(16px * (1 - clamp(0, calc((var(--p) - .7) * 4), 1))));
}

/* 2 Figures: three numbers, set as large as the hero */
.figures { padding: clamp(96px, 12vw, 176px) var(--gutter); background: radial-gradient(55% 70% at 50% 0%, rgba(200,169,106,.12), rgba(200,169,106,0) 70%), var(--ground); }
.figures-list { list-style: none; margin: 0 auto; padding: 0; max-width: 88rem; display: grid; grid-template-columns: repeat(3, 1fr); column-gap: clamp(24px, 4vw, 64px); }
.figures-list li { border-top: 1px solid var(--line-strong); padding-top: 28px; display: grid; gap: 18px; align-content: start; }
.figures-list b { font: 500 clamp(96px, 13vw, 232px)/.82 var(--f-serif); letter-spacing: -.045em; font-variant-numeric: lining-nums; }
.figures-list li:nth-child(2) b { font-style: italic; color: var(--accent); }
.figures-list span { color: var(--ink-2); font-size: 17px; max-width: 24ch; }

/* 3 The dial: a pinned scene, one program per step of scroll */
.dial-section { position: relative; background: var(--ground); }
.dial-section.is-live { height: calc(100svh + 8 * 55vh); }
.dial-stage { position: relative; }
.dial-section.is-live .dial-stage { position: sticky; top: 0; height: 100svh; min-height: 600px; overflow: hidden; }
.dial-title { position: absolute; z-index: 4; top: 104px; left: var(--gutter); color: var(--ink); text-shadow: 0 1px 2px rgba(0,0,0,.7), 0 2px 16px rgba(0,0,0,.7); }
.dial-title span { color: var(--ink); opacity: .85; }
.prog { position: relative; height: 92svh; min-height: 560px; overflow: hidden; }
.prog img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.prog::after { content: ""; position: absolute; inset: 0; z-index: 1; background: linear-gradient(90deg, rgba(11,10,9,.9) 0%, rgba(11,10,9,.62) 34%, rgba(11,10,9,0) 68%), linear-gradient(rgba(11,10,9,.5), rgba(11,10,9,0) 24%, rgba(11,10,9,0) 64%, rgba(11,10,9,.7)); }
.prog-copy { position: absolute; z-index: 2; left: var(--gutter); bottom: clamp(56px, 12vh, 120px); max-width: 46rem; display: grid; gap: 18px; }
.prog-n { font: 500 13px/1 var(--f-sans); letter-spacing: .24em; color: var(--accent); }
.prog h3 { font: 500 clamp(56px, 8.4vw, 152px)/.88 var(--f-serif); letter-spacing: -.035em; }
.prog p { font-size: clamp(18px, 1.4vw, 21px); line-height: 1.5; color: var(--ink); max-width: 34ch; }

.dial-section.is-live .prog { position: absolute; inset: 0; height: auto; min-height: 0; opacity: 0; visibility: hidden; transition: opacity 700ms var(--ease-state), visibility 0s linear 700ms; }
.dial-section.is-live .prog.is-active { opacity: 1; visibility: visible; transition: opacity 700ms var(--ease-state), visibility 0s; }
.dial-section.is-live .prog img { transform: scale(1.07); transition: transform 2600ms var(--ease-out); }
.dial-section.is-live .prog.is-active img { transform: none; }
.dial-section.is-live .prog-copy > * { opacity: 0; transform: translateY(24px); transition: opacity 600ms var(--ease-out), transform 900ms var(--ease-out); }
.dial-section.is-live .prog.is-active .prog-copy > * { opacity: 1; transform: none; }
.dial-section.is-live .prog.is-active .prog-copy > :nth-child(2) { transition-delay: 70ms; }
.dial-section.is-live .prog.is-active .prog-copy > :nth-child(3) { transition-delay: 140ms; }

.knob { display: none; }
.dial-section.is-live .knob { display: block; position: absolute; z-index: 4; right: var(--gutter); bottom: clamp(48px, 10vh, 104px); width: clamp(150px, 15vw, 232px); aspect-ratio: 1; filter: drop-shadow(0 24px 40px rgba(0,0,0,.65)); }
.knob svg { width: 100%; height: 100%; overflow: visible; }
.knob .pointer { transform-box: view-box; transform-origin: 100px 100px; transform: rotate(var(--angle, 0deg)); transition: transform 700ms var(--ease-out); }
.knob .ticks text { font: 500 11px var(--f-sans); fill: var(--ink-3); text-anchor: middle; dominant-baseline: central; transition: fill 300ms; }
.knob .ticks text.on { fill: var(--accent); }
.knob .ticks line { stroke: rgba(239,233,223,.35); stroke-width: 1; }
.knob-n { position: absolute; left: 50%; top: 64%; transform: translateX(-50%); font: 500 clamp(16px, 1.4vw, 22px)/1 var(--f-serif); color: var(--ink); font-variant-numeric: tabular-nums; }
.dial-progress { display: none; }
.dial-section.is-live .dial-progress { display: block; position: absolute; z-index: 4; left: 0; right: 0; bottom: 0; height: 2px; background: var(--line); }
.dial-progress i { position: absolute; inset: 0; background: var(--accent); transform-origin: left; transform: scaleX(var(--p, 0)); }

/* 4 How it works: an ivory sheet that rises over the dark page */
.how { position: relative; z-index: 2; margin-top: -56px; border-radius: 56px 56px 0 0; background: var(--paper); color: var(--paper-ink); box-shadow: 0 -40px 80px rgba(0,0,0,.45); }
.how em { color: var(--gold-deep); }
.how .folio { border-color: var(--paper-ink); color: var(--paper-ink-2); }
.how .lede, .how p { color: var(--paper-ink-2); }
.how ::selection { background: var(--paper-ink); color: var(--paper); }
.how :focus-visible { outline-color: var(--paper-ink); }
.how-head { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 24px; align-items: end; }
.how-head .h2 { grid-column: 1 / span 8; }
.how-head .lede { grid-column: 9 / span 4; }
.steps { list-style: none; padding: 0; margin: clamp(64px, 8vw, 120px) 0 0; display: grid; grid-template-columns: repeat(4, 1fr); counter-reset: step; }
.step { counter-increment: step; padding: 24px 28px 8px; border-left: 1px solid var(--paper-line); border-top: 1px solid var(--paper-ink); display: grid; gap: 18px; align-content: start; }
.step:first-child { border-left: 0; padding-left: 0; }
.step::before { content: "Step " counter(step, decimal-leading-zero); font: 500 12px/1 var(--f-sans); letter-spacing: .2em; text-transform: uppercase; color: var(--gold-deep); }
.step h3 { font: 500 clamp(52px, 5.8vw, 100px)/.9 var(--f-serif); letter-spacing: -.03em; color: var(--paper-ink); }
.step h3::after { content: "."; color: var(--gold-deep); }
.step p { font-size: 17px; max-width: 30ch; }
.extras { margin-top: clamp(64px, 7vw, 104px); display: grid; grid-template-columns: 12rem 1fr; gap: 20px 40px; align-items: baseline; border-top: 1px solid var(--paper-line); padding-top: 24px; }
.extras .label { color: var(--paper-ink-2); }
.extras ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.extras li { font: 400 15px/1 var(--f-sans); padding: 12px 18px; border: 1px solid var(--paper-line); border-radius: 999px; color: var(--paper-ink); }

/* 5 Ritual */
.ritual { position: relative; height: 100svh; min-height: 560px; overflow: hidden; display: grid; align-items: end; }
.ritual img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 50%; transform: scale(1.06); transition: transform 2400ms var(--ease-out); }
.ritual.is-in img { transform: none; }
.ritual::before { content: ""; position: absolute; inset: 0; z-index: 1; background: linear-gradient(rgba(11,10,9,.55) 0%, rgba(11,10,9,0) 22%, rgba(11,10,9,0) 34%, rgba(11,10,9,.7) 58%, rgba(11,10,9,.92) 100%); }
.ritual-copy { position: relative; z-index: 2; padding: 0 var(--gutter) clamp(48px, 8vh, 96px); display: grid; gap: 22px; }
.ritual-copy p { font: 500 clamp(48px, 7.4vw, 128px)/.9 var(--f-serif); letter-spacing: -.03em; max-width: 13ch; text-shadow: 0 16px 38px rgba(0,0,0,.32); }
.ritual-copy .label { color: var(--ink); text-shadow: 0 2px 18px rgba(0,0,0,.6); }

/* 6 Visit: edge-to-edge split */
.visit { display: grid; grid-template-columns: 1fr 1fr; min-height: 100svh; background: radial-gradient(60% 60% at 80% 40%, rgba(200,169,106,.09), rgba(200,169,106,0) 70%), var(--ground); }
.visit-media { margin: 0; position: relative; overflow: hidden; background: var(--ground-3); }
.visit-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.visit-copy { padding: clamp(96px, 10vw, 160px) var(--gutter); display: flex; flex-direction: column; justify-content: center; }
.visit dl { margin: clamp(40px, 5vw, 64px) 0 0; display: grid; grid-template-columns: 8rem 1fr; gap: 0 24px; }
.visit dt, .visit dd { padding: 16px 0; border-top: 1px solid var(--line); }
.visit dt { color: var(--ink-3); padding-top: 19px; }
.visit dd { margin: 0; font-size: 18px; }
.visit dd span { color: var(--ink-3); font-size: 14px; }

/* Footer */
.site-footer { background: var(--ground); padding: clamp(64px, 8vw, 104px) var(--gutter) 32px; overflow: hidden; }
.foot-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 32px; align-items: start; border-top: 1px solid var(--line-strong); padding-top: 20px; }
.foot-nav { display: flex; flex-wrap: wrap; gap: 12px 32px; }
.foot-nav a { text-decoration: none; color: var(--ink-2); font-size: 14px; }
@media (hover: hover) { .foot-nav a:hover { color: var(--ink); } }
.foot-word { margin: clamp(48px, 7vw, 96px) 0 0; font: 500 23vw/.78 var(--f-serif); letter-spacing: -.05em; text-align: center; color: var(--ink); white-space: nowrap; }
.foot-word em { font-size: .3em; letter-spacing: -.01em; vertical-align: top; }
.credits { margin-top: 40px; font-size: 13px; line-height: 1.7; color: var(--ink-3); max-width: 120ch; }
.credits a { color: var(--ink-2); }

/* Motion extras */
[data-reveal="mask"] img { transform: scale(1.08); transition: transform 1800ms var(--ease-out); }
[data-reveal="mask"].is-revealed img, html:not(.reveal-ready) [data-reveal="mask"] img { transform: none; }
@media (prefers-reduced-motion: reduce) {
  [data-reveal="mask"] img, .ritual img, .expand-media img, .prog img { transform: none !important; }
}

/* Tablet and phone */
@media (max-width: 1100px) {
  .steps { grid-template-columns: repeat(2, 1fr); row-gap: 48px; }
  .step:nth-child(3) { border-left: 0; padding-left: 0; }
  .extras { grid-template-columns: 1fr; }
}
@media (max-width: 860px) {
  .nav a:not(.btn) { display: none; }
  .site-header { height: 64px; }
  .hero-media { bottom: 36%; }
  .hero-media::after { height: 22%; }
  .hero-media img { object-position: 40% 50%; }
  .meter-pos { bottom: calc(36% + 14px); }
  .hero-copy { display: block; padding-bottom: max(28px, env(safe-area-inset-bottom)); }
  .hero h1 { font-size: clamp(42px, 12vw, 68px); }
  .hero-side { margin-top: 18px; gap: 18px; }
  .hero-side p { font-size: 16px; }

  .expand-media { clip-path: inset(calc(14% * (1 - var(--p))) calc(8% * (1 - var(--p))) calc(50% * (1 - var(--p))) calc(8% * (1 - var(--p))) round calc(4px * (1 - var(--p)))); }
  .expand-media img { object-position: 50% 40%; }
  .expand-media::after { background: linear-gradient(rgba(11,10,9,.5), rgba(11,10,9,.1) 30%, rgba(11,10,9,.55) 52%, rgba(11,10,9,.94) 80%); }
  .expand-h { font-size: clamp(42px, 12vw, 64px); }
  .expand-h .tl { top: auto; bottom: calc(150px + 2.2em); max-width: none; }
  .expand-h .br { bottom: 150px; right: auto; left: var(--gutter); text-align: left; max-width: none; }
  .expand-lede { right: var(--gutter); bottom: max(36px, env(safe-area-inset-bottom)); font-size: 16px; }

  .figures-list { grid-template-columns: 1fr; row-gap: 48px; }
  .figures-list b { font-size: clamp(96px, 30vw, 150px); }

  .dial-title { top: 84px; }
  .prog::after { background: linear-gradient(rgba(11,10,9,.85), rgba(11,10,9,.35) 18%, rgba(11,10,9,0) 30%, rgba(11,10,9,.2) 46%, rgba(11,10,9,.95) 88%); }
  .prog-copy { right: var(--gutter); bottom: max(40px, env(safe-area-inset-bottom)); gap: 12px; }
  .prog h3 { font-size: clamp(46px, 13vw, 72px); }
  .prog p { font-size: 17px; }
  .dial-section.is-live .knob { width: 104px; top: 120px; bottom: auto; }
  .knob .ticks text { font-size: 15px; }

  .how { margin-top: -32px; border-radius: 32px 32px 0 0; }
  .how-head { display: block; }
  .how-head .lede { margin-top: 28px; }
  .steps { grid-template-columns: 1fr; row-gap: 36px; }
  .step, .step:nth-child(3) { border-left: 0; padding-left: 0; padding-right: 0; }

  .visit { grid-template-columns: 1fr; min-height: 0; }
  .visit-media { aspect-ratio: 4 / 5; }
  .visit-copy { padding-top: 64px; }
  .visit dl { grid-template-columns: 1fr; }
  .visit dd { border-top: 0; padding-top: 0; }
  .visit dt { padding-bottom: 6px; }
  .foot-word { font-size: 25vw; }
}

````

### `site/js/page.js`

````js
import { foamWipe } from './foam-wipe.js';
import { reveal } from './reveal.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const hero = document.querySelector('.hero');
const media = hero.querySelector('.hero-media');
const meter = hero.querySelector('.wipe-meter');
const poster = hero.querySelector('.poster-dirty img');

foamWipe({
  section: hero,
  stage: media,
  canvas: media.querySelector('canvas'),
  dirty: { large: 'media/hero-dirty-1672.webp', small: 'media/hero-dirty-960.webp' },
  clean: { large: 'media/hero-clean-1672.webp', small: 'media/hero-clean-960.webp' },
  frame: () => {
    const [fx, fy] = getComputedStyle(poster).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    return { fx, fy, zoom: 1 };
  },
  onProgress: (p) => meter.style.setProperty('--p', p.toFixed(4)),
});

reveal();

// Scroll progress (0 → 1 across a pinned section) for the scenes below the hero.
const progress = (el) => {
  const r = el.getBoundingClientRect();
  const total = r.height - innerHeight;
  return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
};

const expand = document.querySelector('.expand');
const dial = document.querySelector('.dial-section');
const progs = [...dial.querySelectorAll('.prog')];
const knob = dial.querySelector('.knob');
const knobN = dial.querySelector('.knob-n');
const bar = dial.querySelector('.dial-progress');
const STEP = 360 / progs.length;

const ticks = knob.querySelector('.ticks');
const ns = 'http://www.w3.org/2000/svg';
progs.forEach((_, i) => {
  const a = (i * STEP - 90) * (Math.PI / 180);
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', 100 + Math.cos(a) * 64); line.setAttribute('y1', 100 + Math.sin(a) * 64);
  line.setAttribute('x2', 100 + Math.cos(a) * 70); line.setAttribute('y2', 100 + Math.sin(a) * 70);
  const t = document.createElementNS(ns, 'text');
  t.setAttribute('x', 100 + Math.cos(a) * 82); t.setAttribute('y', 100 + Math.sin(a) * 82);
  t.textContent = String(i + 1);
  ticks.append(line, t);
});
const labels = [...ticks.querySelectorAll('text')];

let active = -1;
const setProgram = (i) => {
  if (i === active) return;
  active = i;
  progs.forEach((p, k) => p.classList.toggle('is-active', k === i));
  labels.forEach((t, k) => t.classList.toggle('on', k === i));
  knob.style.setProperty('--angle', `${i * STEP}deg`);
  knobN.textContent = String(i + 1).padStart(2, '0');
};

if (!reduce) {
  expand.classList.add('is-live');
  dial.classList.add('is-live');
  let queued = false;
  const update = () => {
    queued = false;
    expand.style.setProperty('--p', clamp(progress(expand) / 0.75, 0, 1).toFixed(4));
    const p = progress(dial);
    bar.style.setProperty('--p', p.toFixed(4));
    setProgram(Math.min(progs.length - 1, Math.floor(p * progs.length)));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
} else {
  setProgram(0);
}

const header = document.querySelector('.site-header');
const setHeader = () => header.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < 80);
addEventListener('scroll', setHeader, { passive: true });
setHeader();

const ritual = document.querySelector('.ritual');
new IntersectionObserver(([e], io) => {
  if (e.isIntersecting) { ritual.classList.add('is-in'); io.disconnect(); }
}, { threshold: 0.2 }).observe(ritual);

````

### `site/js/reveal.js`

````js
// On-scroll reveals for ordinary landing pages: headings, text, images and cards appear as they enter the screen.
// Not a scroll story: nothing is pinned or scrubbed, scrolling is never captured, and each element plays once.
//
//   <link rel="stylesheet" href="reveal.css">
//   <h2 data-reveal="up">…</h2>   <img data-reveal="mask" …>   <ul data-reveal-stagger="80"><li data-reveal>…</li></ul>
//   import { reveal } from './reveal.js'; reveal();
//
// Effects (data-reveal value): fade · up (default) · scale · mask (clip from the bottom; images) · words (heading words rise in turn).
// Options per element: data-reveal-delay="ms". On a parent: data-reveal-stagger="ms" spaces its revealing children.
// Safety: content is hidden ONLY after this script runs (it adds `reveal-ready` to <html>), so no-JS visitors, crawlers and
// failed script loads see everything. Reduced motion: nothing is hidden or moved. Elements already on screen at load
// reveal at once. If IntersectionObserver is missing, everything is shown.

export function reveal({ root = document, threshold = 0.15, rootMargin = '0px 0px -8% 0px', reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const els = [...root.querySelectorAll('[data-reveal]')];
  if (reducedMotion || !('IntersectionObserver' in window) || !els.length) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return { destroy() {} };
  }
  for (const parent of root.querySelectorAll('[data-reveal-stagger]')) {
    const step = Number(parent.dataset.revealStagger) || 80;
    [...parent.querySelectorAll('[data-reveal]')].forEach((el, i) => { if (!el.dataset.revealDelay) el.dataset.revealDelay = String(i * step); });
  }
  for (const el of els) {
    if (el.dataset.reveal !== 'words' || el.dataset.revealSplit) continue;
    // Wrap each word; the words stay real text in reading order, so copy, search and screen readers are unaffected.
    el.dataset.revealSplit = '1';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    let k = 0;
    for (const n of nodes) {
      const frag = document.createDocumentFragment();
      for (const part of n.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(part); continue; }
        const w = document.createElement('span'); w.className = 'reveal-word'; w.style.setProperty('--i', String(k++)); w.textContent = part;
        frag.append(w);
      }
      n.replaceWith(frag);
    }
  }
  els.forEach((el) => { if (el.dataset.revealDelay) el.style.setProperty('--reveal-delay', `${Number(el.dataset.revealDelay)}ms`); });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); }
  }, { threshold, rootMargin });
  document.documentElement.classList.add('reveal-ready');
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-revealed'); // first screen: no waiting, no flash
    else io.observe(el);
  }
  return { destroy() { io.disconnect(); els.forEach((el) => el.classList.add('is-revealed')); } };
}

````

### `site/js/foam-wipe.js`

````js
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

````
