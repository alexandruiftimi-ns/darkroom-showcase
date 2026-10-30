# LITTLE CHAOS — build prompt

Give this file to an AI coding assistant (or a developer) as the spec, along with the **source assets** listed in
section 1 (not included — supply them separately), and it will reproduce this exact website: a one-page, vanilla
HTML/CSS/JS site called **Little Chaos**, about the art of doing absolutely nothing.

---

## 0. The brief (verbatim intent)

> **Concept: LITTLE CHAOS — A Website About Procrastination**
> The contradiction: an adorable, innocent woodland creature ("Blossom") representing humanity's worst
> productivity habits.
>
> **Landing page hero.** "Do nothing. Beautifully." — a ridiculously premium website dedicated to the art of
> doing absolutely nothing. Blossom sits in its cinematic forest. Water flows, flowers sway, and the creature
> slowly turns toward the visitor, making direct eye contact as the cursor moves.
>
> **The interaction:** a giant button says "Start being productive." Every time the visitor tries to reach it,
> it evades — the button gets more entertaining, not less.
>
> As the page scrolls, it becomes increasingly absurd: fake achievements for wasting time, beautiful interactive
> distractions, and an anti-productivity leaderboard.
>
> **Design aesthetic:** Apple product launch × Studio Ghibli × absurdist internet humor. An incredibly polished,
> almost $20,000-level cinematic website serving a completely ridiculous purpose.

Build it as a static, framework-free site: plain `index.html`, `css/style.css`, `js/main.js`, no build step,
no dependencies beyond one Google Fonts link.

---

## 1. Required source assets (not included — must be supplied)

The hero is a cursor-scrubbed frame sequence of Blossom turning its head. You need:

| Asset | Spec |
|---|---|
| A video of the character's head rotating from screen-left to screen-right, continuously, in its forest/stream setting | Highest resolution available (source used: 3840×2160, 30fps, ~3s, 91 frames). Camera, lens, light and framing must stay fixed — only the head turns. |
| (Optional) three still frames — left pose, centered/looking-at-camera pose, right pose | Used only to sanity-check the extracted frames match; not used directly on the page. |

Character description for consistency if any asset needs regenerating: a tiny, big-eyed woodland spirit made of
leaves and cherry-blossom petals — cream/beige fur, sage-green and blush-pink leaf "hair" shaped like ears, a
pink blossom flower accent above one ear, and large blue eyes. It sits on a moss-covered rock in a sunlit forest
stream with cherry blossoms and a soft waterfall in the background. Lighting is warm, golden-hour, soft-focus
background (shallow depth of field), painterly/cinematic render style (Ghibli-adjacent, not photoreal, not flat
illustration).

---

## 2. Asset processing pipeline (do this before writing any code)

The goal is a **cursor-scrubbable frame sequence**: on desktop, moving the mouse left/right within the hero swaps
in different frames so the head visually tracks the cursor; on mobile it autoplays as a gentle ping-pong loop.

### 2.1 Find the center frame
Locate the video frame where the head is most directly facing the camera (the "looking at you" pose). This is the
**center** of the sequence — scrubbing left of center turns the head left, right of center turns it right.
Verify the exact frame index by extracting a handful of sample frames and eyeballing them; don't assume it's
exactly the midpoint, though it usually is for a symmetric rotate-and-return shot.

### 2.2 Motion-interpolate for smoothness
Raw source footage (e.g. 24–30fps, ~70–90 frames) is too coarse for smooth cursor scrubbing — adjacent frames
are too far apart, causing visible jumps. Use motion-compensated frame interpolation to roughly double the frame
count:

```
ffmpeg -i source.mp4 \
  -vf "scale=1920:-2,minterpolate='fps=<2x original fps>:mi_mode=mci:mc_mode=aobmc:vsbmc=1:scd=none'" \
  -c:v libx264 -crf 0 -preset medium -pix_fmt yuv444p \
  interpolated-lossless.mp4
```

Key points, learned the hard way:
- **Do not** encode the intermediate interpolation pass as `yuv420p` with a lossy `crf` (e.g. `crf 16`). 4:2:0
  chroma subsampling plus lossy block compression visibly softens and desaturates the footage — especially
  pinks/reds — *before* you ever extract a frame. Use `-crf 0 -pix_fmt yuv444p` (effectively lossless) for this
  intermediate render so no quality is lost before extraction. The intermediate file will be large (100MB+); that's
  expected and it gets deleted after frame extraction.
- Scale down from 4K to ~1920px wide *before* interpolating (not after) — interpolation is expensive and the
  final delivered frames don't need more than ~1920px anyway.
- Confirm the new center-frame index after interpolation: if the source had N frames and you doubled the fps,
  the new center index is `round((new_total_frame_count + 1) / 2)`. Verify visually, don't just trust the math.

### 2.3 Extract frames losslessly
```
ffmpeg -i interpolated-lossless.mp4 frames_src/f-%03d.png
```
This gives one PNG per frame, 1-indexed, at native resolution (e.g. 1920×1080). Keep these as PNG — lossless,
no further processing loss.

### 2.4 Encode final delivery frames (desktop + mobile sets)
**Do not ship true-lossless frames at full resolution** — at ~1920px wide, lossless WebP runs ~2MB+ per frame,
which for ~180 frames is 350MB+ and not viable for a webpage. Use high-quality **lossy** WebP instead, sized to
match real display widths so the browser never has to upscale (upscaling is the single biggest visible quality
killer — worse than compression format choice):

```
# Desktop — native width, matches typical browser viewport widths 1:1
ffmpeg -i frames_src/f-NNN.png -q:v 92 assets/frames/desktop/frame-NNN.webp

# Mobile — downscaled, still sharp on phone screens
ffmpeg -i frames_src/f-NNN.png -vf "scale=960:-1" -q:v 90 assets/frames/mobile/frame-NNN.webp
```

Run this per-frame (loop over every PNG), producing two parallel sequences: `assets/frames/desktop/frame-001.webp`
… `frame-NNN.webp` and `assets/frames/mobile/frame-001.webp` … `frame-NNN.webp`, zero-padded to 3 digits.

Rough size budget for ~180 frames at this spec: ~70-75MB desktop set + ~25-30MB mobile set. If that's too heavy
for the target deployment, drop to 1600px/q90 desktop and 800px/q88 mobile (~50-70MB combined) or 1280px/q88 and
700px/q86 (~50MB combined) — both still meaningfully sharper than any resolution below ~1200px wide, which visibly
blurs on modern screens.

Record the final **TOTAL frame count** and **CENTER frame index** — both are needed verbatim in the JS (section 5).

Delete all intermediate video files and the loose PNG folder once the WebP sequences are generated and verified.

---

## 3. Design system

60-30-10 palette, drawn directly from the character's coloring (cream fur / green foliage / pink blossom), with
a small sky-blue accent lifted from the character's eyes:

```css
/* 60% — cream/ivory canvas */
--cream-50:  #FDF8F0;
--cream-100: #FBF3E6;
--cream-200: #F3E6D3;

/* 30% — forest green */
--green-900: #22331F;
--green-700: #35512F;
--green-500: #6E8A5E;
--green-300: #AFC49B;

/* 10% — blossom pink */
--pink-600: #D9637F;
--pink-500: #E98BA4;
--pink-300: #F6C9D6;
--pink-100: #FCE9EE;

/* micro accent — sky blue, used sparingly (eyes, focus states, small glows) */
--sky-400: #6FB6C9;
--sky-300: #A9D9E2;

--ink: #2A2420;
```

Apply the ratio literally: cream backgrounds dominate (hero base, achievements section, distractions section),
forest green is the secondary mass (leaderboard section background, footer background, body text on cream), pink
is a true accent (CTA button, section eyebrows, italic title word, badges' rare/epic highlights) — never a
background mass. Sky blue appears only in small doses: nav status dot, "you" row highlight, rare-badge color,
cursor center dot, focus rings.

**Typography:**
- Display/serif: `Fraunces` (variable, optical size + weight axes), used for all headings and the hero title.
  Google Fonts: `family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500`.
- Body/sans: `Inter`, weights 400/500/600/700.
- The hero's accent line ("Beautifully.") is set in *italic* Fraunces in pink — a deliberate single flourish
  against an otherwise restrained type system.

**Easing tokens:**
```css
--ease-out:  cubic-bezier(.16,1,.3,1);
--ease-soft: cubic-bezier(.33,1,.68,1);
```
Use `--ease-out` for most reveals/entrances, `--ease-soft` for springier/toy-like motion (dial, badge icon hover).

**Motion level:** "animated" — small, purposeful motion throughout (scroll reveals, hover lifts, the hero scrub,
the button chase), never gratuitous, nothing wheel-hijacked, everything reversible, full `prefers-reduced-motion`
and `navigator.connection.saveData` fallbacks (static hero frame, no autoplay, instant reveals, no toy animation).

---

## 4. Page structure, in order, with exact copy

### 4.1 Grain overlay
A fixed, full-viewport, `pointer-events:none`, very low-opacity (~0.035) SVG fractal-noise texture at
`mix-blend-mode: overlay`, `z-index` above everything. Pure texture, no interaction.

### 4.2 Nav (fixed header)
- Fixed to the top, full width, `z-index: 50`.
- Background: a translucent dark-green gradient (`rgba(23,34,20,.52)` at top fading to `rgba(23,34,20,0)` at the
  bottom of the bar) plus `backdrop-filter: blur(14px) saturate(1.15)` — a frosted glass bar, **not**
  `mix-blend-mode: difference`. (Difference blending was tried first and produces unpredictable, often low-contrast
  text depending on what's scrolling underneath — a solid frosted scrim is the fix and reads consistently over
  every section, light or dark.)
- Text: cream-50, with a subtle `text-shadow: 0 1px 3px rgba(0,0,0,.35)` for extra legibility over busy imagery.
- Left: a small pink dot + "Little Chaos" wordmark.
- Center (hidden under 760px): nav links to `#leaderboard`, `#achievements`, `#distractions` — labels
  "Leaderboard", "Achievements", "Distractions".
- Right: a live "time wasted" counter — a small pulsing sky-blue dot + `HH:MM:SS` ticking up since page load +
  the label "wasted so far".
- Custom cursor: see section 5.6 — both the nav and the entire hero use a small flower-shaped cursor instead of
  the system pointer.

### 4.3 Hero (`<header>`, full viewport height, `100svh`)
- Background: the cursor-scrubbed frame sequence (section 5.1) filling the whole hero via `object-fit: cover`,
  plus a blurred/darkened duplicate of the same frame behind it (visible only under 760px — see 5.1) so mobile
  never shows an awkward tight crop of a landscape image on a portrait screen.
- A multi-gradient dark vignette over the image: strongest at the bottom-left (where the text sits), fading to
  nothing toward the top-right, so the overlaid text has consistent contrast without crushing the image globally.
  Roughly: bottom gradient 0→45% opacity dark fading out by 70% of the hero height, a diagonal gradient from the
  left (~28% opacity) fading out by 60% of the width, a light top gradient (~19% opacity) fading out by 24% of
  the height. (These are intentionally subtle — "felt, not noticed" — tuned down from an initial pass that was
  roughly twice as dark.)
- Content, bottom-left aligned, over the vignette:
  - Eyebrow (small caps, pink-300, tracked out): **"A portfolio of productive avoidance"**
  - H1, two lines: **"Do nothing."** (cream, serif) / **"Beautifully."** (pink-300, italic serif — the one accent
    flourish)
  - Subtext (cream-200, max-width ~540px): **"Meet Blossom — a tiny forest spirit who has never finished a to-do
    list in its life. Move your cursor. It's watching you not work."**
  - The CTA button — see section 5.2 for its behavior. Label starts as **"Start being productive"**.
  - Small hint line below it (cream-200, low opacity): **"psst — try clicking that button"**
  - All hero text gets its own `text-shadow` for legibility over the photographic background (see section 3 note
    on the vignette — shadows and scrim work together, text-shadow alone wasn't enough against bright flowers).
- A vertical "scroll cue" in the bottom-right (hidden under 760px): small rotated label **"the chaos continues"**
  above a thin fading vertical line.

### 4.4 Manifesto (centered text band)
Large centered serif statement, three lines, cream-100 background, green-700 text:
> In a world obsessed with hustle,
> one small creature chose the stream, the breeze,
> and the gentle art of *absolutely nothing*.
(The last phrase italic, pink-600.)

### 4.5 Achievements (`#achievements`)
Eyebrow **"Trophy case"**, heading **"Achievements unlocked for doing nothing at all"**. A 3-column grid
(2-col under 920px, 1-col under 580px) of badge cards, each: an emoji icon, a title, a one-line description, and
a rarity pill (Common/Rare/Epic/Legendary, each a distinct color). Cards lift and rotate very slightly on hover;
icon scales/rotates on hover. Exact six badges:

| Icon | Title | Description | Rarity |
|---|---|---|---|
| 🛋️ | Couch Fusion | Became structurally one with the sofa for 3 consecutive hours. | Common |
| 📑 | Tab Hoarder | Reorganized 47 browser tabs instead of closing a single one. | Common |
| 🎬 | Credits Connoisseur | Watched the intro credits twice. On purpose. Both times. | Rare |
| 🐌 | Snail's Pace Prodigy | Took four hours to reply "k" to a text. | Rare |
| 🌊 | Stream Whisperer | Stared at flowing water instead of opening the spreadsheet. | Epic |
| 👑 | Deadline Dodger | Postponed a task so gracefully it nearly looked intentional. | Legendary |

### 4.6 Leaderboard (`#leaderboard`, dark green-900 section)
Eyebrow **"Hall of fame"**, heading **"The anti-productivity leaderboard"**, subtext **"Ranked by hours
gracefully avoided. Updated the moment someone, somewhere, closes their laptop and doesn't."** A vertical list of
ranked rows (place number, emoji avatar, name, stat), gold-tinted top row, four fixed entries plus a live fifth
"you" row:

| Place | Avatar | Name | Stat |
|---|---|---|---|
| 01 | 🦊 | Blossom | 14h 22m avoided |
| 02 | 🦔 | A Very Tired Hedgehog | 11h 05m avoided |
| 03 | 🐢 | Steve (slow on purpose) | 9h 40m avoided |
| 04 | 🐑 | Napoleon Bunaparte | 7h 58m avoided |
| — (live) | 👁️ | You, right now | `MM:SS` and counting |

The visitor's row updates live (section 5.4): place promotes from 05 → 03 → 02 → 01 as their time-on-page
crosses 12s / 25s / 45s, and the stat ticks up in real time — a small reward loop for lingering.

### 4.7 Distractions (`#distractions`, cream background)
Eyebrow **"Interactive nonsense"**, heading **"Beautiful, pointless distractions"**. Three toy cards:

1. **The Productivity Dial** — "Try to turn it up. We dare you." A slider-styled track; clicking it jumps the
   fill/handle toward "Productive" for ~550ms, note text changes to a sarcastic line, then snaps back to 18%
   ("Chaotic") with the note reset. It never stays productive. See section 5.5.
2. **The Unbothered Leaf** — "Flick it. It has nowhere to be either." A 🍃 emoji inside a sky-blue radial-gradient
   "pond" circle; fully draggable via pointer events, and on release it glides back to the pond's center with a
   soft spring-like ease.
3. **Daily Affirmation Generator** — "Click for a dose of zero motivation." A button that, on each click,
   fades out the current line and fades in a new random unmotivational affirmation from a fixed pool of eight
   (see section 5.5 for full list).

### 4.8 Footer
Centered, green-900 background. Heading **"Still here?"**, subtext **"Good. That's the whole point."** A fake
newsletter form (email input + "Subscribe for updates" button) that, on submit, never actually sends anything —
it swaps the fine-print text to **"Subscribed to absolutely nothing. Well done."**, fires a toast
**"You're in. For updates that will never come."**, and resets the field. Original fine-print before submit:
**"There won't be any updates. We're very committed to this."** Bottom row: copyright line **"© 2026 Little
Chaos — a monument to doing nothing"** and **"🌿 Blossom was here"**.

### 4.9 Toast
A single reusable fixed-position pill at the bottom-center, hidden by default (`opacity:0`, translated down
slightly, `pointer-events:none`), shown via a shared JS helper for ~3.2s at a time, used by the button-chase
milestones and the newsletter submit.

---

## 5. Interaction specs (implement these precisely — this is what makes the site)

### 5.1 Hero cursor-scrub / mobile autoplay
Two stacked `<img>` elements in the hero background: a blurred, darkened, scaled-up "backdrop" copy
(`object-fit: cover`, `filter: blur(46px) saturate(1.15) brightness(.82)`, only visible under 760px) behind a
sharp foreground copy (`object-fit: cover` on desktop; `object-fit: contain` on mobile so the full character is
always visible instead of being cropped to a close-up by a tall phone viewport). Both images always show the
*same* frame at all times — every frame change updates both `src` attributes together.

Constants (replace with your actual measured values from section 2.4):
```js
const TOTAL = <your frame count>;   // e.g. 179
const CENTER = <your center index>; // e.g. 90
```

Behavior:
- **Reduced motion or `navigator.connection.saveData`:** show only the center frame, static, skip everything
  below.
- **Preloading:** load the center frame first (shown immediately as the poster), then fan outward from center
  (center−1, center+1, center−2, center+2, …) using `requestIdleCallback` (fallback `requestAnimationFrame`) so
  nearby frames are ready before far ones, and the page never blocks on loading all frames upfront.
- **Desktop (fine pointer, ≥760px):** on `pointermove` over the hero, compute the cursor's horizontal position as
  a fraction of the hero's width, map it to a target frame index:
  ```js
  const x = (e.clientX - heroRect.left) / heroRect.width;   // 0..1
  const normalized = (x - 0.5) * 2;                          // -1..1
  target = CENTER + normalized * (CENTER - 1);                // clamp to [1, TOTAL]
  ```
  On `pointerleave`, reset `target` back to `CENTER`. Every animation frame, ease the *displayed* (float) index
  toward `target` at a fixed rate (`displayed += (target - displayed) * 0.1`), round to the nearest integer, and
  swap both `<img>` `src`s only when that integer changes. This is what makes the turn feel smooth and weighted
  rather than snapping directly to the cursor.
- **Mobile / coarse pointer (<760px):** ignore the cursor; autoplay a ping-pong loop from frame 1 → TOTAL → 1 → …
  forever, advancing one frame roughly every `1000/32` ms (~32fps), using a `requestAnimationFrame` loop gated by
  elapsed time (not `setInterval`). This produces a seamless perfect loop since frame 1 and frame TOTAL are the
  two visual extremes and bouncing between them never jump-cuts.
- Serve a **separate, smaller image set** on mobile (the `mobile/` WebP folder) vs desktop — don't just CSS-resize
  the desktop set.

### 5.2 The CTA button — must never be activatable, by any input method
This is a running joke, not a real button, and it should be *provably* uncatchable:
- Starts in normal document flow inside a reserved-size placeholder (`position:relative` zone, fixed height/width)
  so the layout doesn't jump. The first time it's provoked, switch it to `position: fixed` (full-viewport
  roaming), computing its new `left`/`top` from its current `getBoundingClientRect()` first so the switch is
  visually seamless, then let it move freely around the entire viewport from then on (not just the hero).
- **Mouse:** listen for `pointermove` on `document` (not just the button); whenever the cursor comes within
  ~170px of the button's center, flee — jump to a new random position biased away from the cursor, picked by
  rejection-sampling a handful of candidate spots and keeping the first one far enough from the cursor. Throttle
  flees to roughly one per 260ms so it doesn't stutter. Allow the random spot to land slightly outside the
  viewport bounds (e.g. `left` can go as low as `-buttonWidth * 0.4` or as high as `viewportWidth - buttonWidth *
  0.6`) so it can comically dash half off-screen, not just bounce around visibly.
- **Touch:** any `touchstart` on the button itself (since there's no hover on touch) immediately flees instead of
  registering a tap; `preventDefault()` it.
- **Keyboard:** focusing the button (e.g. via Tab) immediately flees it too and swaps its label to something like
  "caught you tabbing". Pressing Enter or Space while it's focused must `preventDefault()` *and*
  `stopPropagation()` before the browser's default button-activation fires, then flee and call `.blur()` so the
  same key can't be replayed to land on it.
- **Click, as a last resort:** a `click` listener that always `preventDefault()`s and flees, in case anything
  (synthetic events, accessibility tooling) slips past the above.
- Each flee cycles the button's label text through a pool of taunts (e.g. "Nice try.", "...nope.", "404:
  Motivation not found", "Tab won't work either", "This is a load-bearing joke" — keep it varied, roughly a dozen
  lines) rather than always saying the same thing.
- Track total attempts; at milestone counts (10 / 25 / 50 / 100), fire a toast that acknowledges the persistence
  without ever granting a win (e.g. "100 attempts. There is no catch. There was never a catch."). There is no
  catch mechanic — it is permanently unreachable, by design.

### 5.3 Nav "time wasted" counter
On page load, record `performance.now()` as the start time. Every animation frame, compute elapsed seconds and
render `HH:MM:SS` into the nav's counter span. This is the same clock source used by the leaderboard's live row
(section 5.4) — don't run two independent timers.

### 5.4 Leaderboard "you" row
Using the same elapsed-time clock: render `MM:SS` into the visitor row's stat span every frame, and promote the
visitor's displayed place (zero-padded two digits) through this thresholding:
```js
function rankFor(seconds) {
  if (seconds >= 45) return 1;
  if (seconds >= 25) return 2;
  if (seconds >= 12) return 3;
  return 5; // starts at 5th, skips straight past 4th
}
```

### 5.5 Distraction toys
- **Dial:** clicking the track animates `width`/`left` to a random 70–90% value and swaps the note text to one of
  two "rejecting" lines, holds for ~550ms, then animates back to a fixed 18% baseline and resets the note to
  "currently: blissfully chaotic". All transitions eased, not instant.
- **Leaf:** pointer-draggable (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`, using
  `setPointerCapture`), clamped within its pond container's bounds while dragging (transitions disabled during
  drag for 1:1 tracking). On release, re-enable a ~1.1s eased transition and animate back to the exact center of
  the pond.
- **Affirmation generator:** clicking picks a random line from this exact pool and cross-fades it in (fade the
  old line out over ~180ms, swap text, fade in):
  1. "The to-do list will still be there tomorrow. So will you. Probably."
  2. "Resting is just productivity with better lighting."
  3. "You haven't failed to start. You've succeeded at not starting."
  4. "Somewhere, a spreadsheet misses you. Let it."
  5. "Doing nothing is hard work. You're killing it."
  6. "Deadlines are just suggestions wearing a costume."
  7. "Your inbox called. It's fine. It can wait."
  8. "Greatness is 1% inspiration, 99% looking at a stream."

### 5.6 Flower cursor
Replace the default cursor with a small hand-drawn flower (5 overlapping pink circles as petals around a
sky-blue center circle, each with a thin cream outline for contrast on both light and dark backgrounds) over the
nav **and** the entire hero section (not just the nav — this was a deliberate fix after first scoping it too
narrowly). Implement as a single reusable CSS custom property so it isn't duplicated:
```css
:root {
  --cursor-flower: url("data:image/svg+xml,<url-encoded 30x30 SVG, 5 petal circles r=6 around center
    (15,15), each fill #E98BA4 stroke #FDF8F0 stroke-width 1.2, plus a center circle r=4.2 fill #6FB6C9
    stroke #FDF8F0>") 15 15, auto;
}
.nav, .hero { cursor: var(--cursor-flower); }
.nav a, .nav button { cursor: inherit; }
```
Interactive elements that should still look clickable (the CTA button, the newsletter submit button, etc.) keep
their own explicit `cursor: pointer` — don't force the flower cursor onto literally everything, only the nav and
hero's ambient areas.

### 5.7 Scroll reveals
Every element meant to animate in on scroll gets a shared `.reveal` class: `opacity:0`, `translateY(28px)`,
transitioning both over ~0.8s on `--ease-out`. An `IntersectionObserver` (threshold 0.15, bottom rootMargin
`-8%`) adds `.is-visible` (opacity 1, no translate) the first time each element enters view, then unobserves it.
Stagger siblings within the same grid by giving each a small incremental `transition-delay` (e.g.
`(index % 6) * 70ms`) so grids cascade in rather than popping together. Under `prefers-reduced-motion: reduce`,
skip the observer entirely and mark everything visible immediately.

---

## 6. Technical requirements

- Plain HTML/CSS/JS. No framework, no bundler, no build step. One external dependency: the Google Fonts
  stylesheet link for Fraunces + Inter.
- All interactive JS organized as small self-invoking function scopes (one per feature: hero, CTA button, time
  counter, reveals, dial, leaf, affirmations, newsletter, toast) inside a single top-level IIFE in `js/main.js`,
  guarding every feature with `if (!el) return;` so a missing element never throws.
- Respect three degradation signals everywhere motion is involved: `prefers-reduced-motion: reduce`,
  `navigator.connection.saveData`, and `pointer: coarse` (treated as mobile/touch — also falls back for any
  viewport under 760px regardless of pointer type).
- A global reduced-motion CSS rule collapses all animations/transitions to near-zero duration as a blanket safety
  net, in addition to the feature-specific JS checks above.
- Responsive breakpoints used throughout: 920px (3-col → 2-col grids), 760px (nav links hide, hero switches to
  contain+blurred-backdrop treatment, mobile frame sequence + autoplay kicks in), 580px (2-col → 1-col), 520px
  (leaderboard row layout simplifies, footer form stacks).
- File/folder layout:
  ```
  index.html
  css/style.css
  js/main.js
  assets/
    frames/
      desktop/frame-001.webp … frame-NNN.webp
      mobile/frame-001.webp … frame-NNN.webp
  ```

---

## 7. Definition of done

A fresh build matches this spec if: the hero's head visibly and smoothly tracks the cursor left/right on desktop
and autoplays a seamless loop on mobile; the CTA button cannot be clicked, tabbed to, or Enter/Space-activated
under any circumstance and visibly flees across the whole viewport (including partially off-screen) when
approached; the nav and hero show a small pink flower in place of the cursor; all copy matches section 4 verbatim;
the palette holds to the 60-30-10 cream/green/pink ratio with blue used only as a micro-accent; reduced-motion and
save-data users get a fully static, still-readable fallback; and nothing on the page requires a server, a build
step, or JavaScript beyond vanilla browser APIs.
