# Maison Solène — cinematic perfume landing page

*A premium, cursor-driven frame-sequence website for a Paris perfume house.*

**What you get:** a one-page site in plain HTML/CSS/JS. Its hero shows two hands from a Michelangelo-style painting reaching through golden clouds.
On desktop they move toward each other as your cursor approaches the centre; on phones they move as you scroll. When the fingertips meet, light flashes and the brand name appears.
Below the hero is a bright "gallery" where each perfume hangs beside a public-domain painting in a gilt frame. Then comes a scroll scene in which two bottles merge into a third, followed by the atelier story,
an appointment form and a discovery set.

**How to use this prompt:**
1. Drop your own media into the slots in **Part A** (any images and any video, as long as the names and folders match).
   If you don't have media yet, the **Appendix** has ready-made generation prompts that recreate the original look.
2. Open the folder in your coding agent and paste **Part B** in full. The agent cuts the frames, measures your media and builds the site around it.
3. To swap media later, replace the files in the same slots and ask the agent to "re-run the frame pipeline and update CONFIG".

---

# PART A — Asset slots (bring your own)

The site's structure is fixed; your media is not. Put files in these exact places. Formats and sizes are flexible, because the build reads them from the files.

| slot | path | what it is | requirements |
|---|---|---|---|
| Hero video | `assets/video.*` (mp4, mov, mkv or webm) | the signature moment: something moving **toward** a point (hands meeting, a product assembling, a door opening) | 2–6 s, camera static, **ends on the climax frame**, landscape preferred (any aspect works) |
| Room I painting | `assets/art/room-1.webp` (or jpg/png) | the artwork for product 1 | any aspect, ≥1400px on the long side |
| Room II painting | `assets/art/room-2.webp` | the artwork for product 2 | any aspect, ≥1200px on the long side |
| Interlude image | `assets/art/interlude.webp` | a wide panoramic image | wide (≥2:1 looks best), ≥2000px wide |
| Product 1 | `assets/bottles/product-1.webp` (or png) | product cut-out | **transparent background**, cropped tight |
| Product 2 | `assets/bottles/product-2.webp` | product cut-out | transparent background |
| Product 3 (the merge) | `assets/bottles/product-3.webp` | the product that products 1 + 2 "become" | transparent background |

Optional: `assets/keyframes/first.png` and `last.png`, the stills used to make the video (kept for reference only).

The copy in Part B (brand name, product names, paintings, prices) belongs to the original "Maison Solène" demo.
Edit the copy in Part B before pasting if you are using different media, or leave it and edit the text afterwards.

---

# PART B — Paste this into your coding agent

You are a senior creative developer building an Awwwards-level one-page site for **Maison Solène**, a fictional haute-parfumerie house in Paris founded in 1924.
The user has placed their own media in the asset slots below. Build exactly what is specified here. Every number, colour, timing and line of copy is intentional, so use them as given.
Don't add sections, features or libraries that aren't listed here, and don't leave anything out.

**The media is user-supplied and replaceable, so never hardcode its properties.** Read the frame count, video aspect ratio, image dimensions and climax point from the actual files.
Put all of them in one `CONFIG` object at the top of `main.js` so the media can be swapped later without touching the logic.
If a slot is missing, stop and tell the user which file to add. Don't invent placeholder media.

**Asset slots** (fixed paths; the content is up to the user):
- `assets/video.*`: hero video (any of mp4, mov, mkv, webm; use whichever exists)
- `assets/art/room-1.*`, `assets/art/room-2.*`, `assets/art/interlude.*`: the two room paintings and the wide interlude image
- `assets/bottles/product-1.*`, `product-2.*`, `product-3.*`: transparent product cut-outs (1 and 2 merge into 3)

If an image slot isn't WebP, convert it to WebP (quality ~80, long side capped at 2400px) next to the original and reference the WebP.
Set every `<img>`'s `width`/`height` attributes from the real file dimensions (read them with ffprobe or Python).

## 1. Stack and files

- Static **HTML + CSS + vanilla JS**: `index.html`, `styles.css`, `main.js`. No framework, no bundler, no npm.
- **GSAP 3.13.0** from cdnjs: `gsap.min.js`, `ScrollTrigger.min.js`, `ScrollToPlugin.min.js`, `SplitText.min.js`, loaded at the end of body, before `main.js`.
- Google Fonts: **Cormorant Garamond** (300, 400, 500, italic 300, 400) and **Jost** (300, 400), `display=swap`, with preconnects.
- **No smooth-scroll library, no wheel hijacking, no scroll snapping, ever.** Scrolling is always native.
- Favicon: an inline SVG data URI, a `#0b0a09` square with a `#e6cf9a` circle (r = 5 of 32) in the centre.
- `<title>`: "Maison Solène — Haute Parfumerie, Paris". Meta description: "Maison Solène, haute parfumerie, Paris. Three compositions written after three paintings. Two souls. One touch." `theme-color` #0b0a09.
- Write a short `DECISIONS.md` recording the choices below.

## 2. Frame sequence (do this first, with ffmpeg)

Probe `assets/video.*` with ffprobe (fps, frame count, width × height). Then build the frames:
- **Interpolate for smoothness** with motion-compensated minterpolate (`mi_mode=mci`, `mc_mode=aobmc`, `me_mode=bidir`) to 2× the source fps.
  Target **120–150 frames**. If the video is long, lower the output fps rather than cut it, and never trim the end, because **the last frame must be the climax**.
  If the source already has 120+ frames, skip interpolation.
- Name the frames `f001.webp` … `fNNN.webp` (three-digit, zero-padded) and output two sets:
  - `frames/desktop/`: full frame, scaled to **1920px wide** (even height), WebP quality **78**.
  - `frames/mobile/`: **centre 60% of the width** (crop x from 20% to 80%, full height), scaled to **1080px wide**, WebP quality **74**.
    If the video is already portrait, use the full frame for both sets.
- Budget: desktop ≤ ~15 MB and mobile ≤ ~7 MB. If either is over, lower the quality a few steps and re-run.
- Save the commands as `scripts/frames.sh` (with a `.ps1` twin) so the user can re-run them after swapping the video.

Fill `CONFIG` from what you produced: `FRAMES` (the actual count), `ASPECT` (frame width / height), the mobile crop (`x0: 0.2, w: 0.6`, or `0, 1` for portrait sources), and `FOCAL`.
**FOCAL** is the climax point as a fraction of the full frame. Open the last frame, look at it, and pick the point the story converges on (where the hands touch, the product's centre, and so on).
If the frame has no clear focal point, use `{ x: 0.5, y: 0.48 }`. The glow, pulse, cursor mapping and framing all centre on FOCAL.
Preload `frames/desktop/f001.webp` and `frames/mobile/f001.webp` in the `<head>` with `media` queries matching how the set is chosen (see 5.1).

## 3. Design tokens

**Colours**
| token | value | use |
|---|---|---|
| paper | #f6f1e8 | page background, Room I, services, footer |
| paper-2 | #efe7da | interlude |
| stone | #e4dacb | Room II, Rendez-vous |
| ink | #15120e | text on light |
| ink-soft | ink at 66% | body copy |
| ink-faint | ink at 42% | captions, labels |
| gold | #9a7431 | gold text on light backgrounds |
| gold-bright | #c9a45c | gold text on night |
| gold-soft | #e6cf9a | tagline, cursor, glow |
| hair | rgba(154,116,49,.32) | all 1px hairlines |
| night | #0b0a09 | hero and Le Toucher |
| ivory | #f2ece1 | text on night |
| text-dim | ivory at 66% | secondary text on night |

**Type.** Serif = Cormorant Garamond **300** for all headings, quotes, prices and names (line-height 1.02). Sans = Jost **300**, body **15px / 1.75**, letter-spacing .01em, antialiased.
**Eyebrow** style (used everywhere): Jost 400, 10.5px, uppercase, letter-spacing .32em, colour gold (gold-bright on night).
**Easing:** main `cubic-bezier(.22,.61,.36,1)`, soft `cubic-bezier(.33,0,.2,1)`. **Gutter:** `clamp(20px, 5vw, 88px)`.
**Focus ring:** 1px gold outline, 4px offset.
**Hairline link** ("Reserve …"): 11px uppercase, .28em tracking, 6px bottom padding, with a 1px gold underline at scaleX .35 from the left that grows to 1 on hover over .9s.

## 4. Page structure and copy (in this order, with this exact copy)

### 4.0 Sticky bar (fixed, hidden until the hero is passed)
A 3-column grid (1fr auto 1fr) with padding 18px gutter, background paper at 82% with 14px backdrop blur and saturate 1.2, and a bottom hairline.
Text is 10.5px uppercase with .26em tracking in ink-soft, turning gold on hover. It starts translated −101% and slides to 0 over .9s once the hero's bottom edge is above 80px from the top of the viewport.
- Left nav: **Parfums** (#parfums) · **La Galerie** (#galerie) · **L’Atelier** (#atelier)
- Centre: **Maison Solène** (serif 17px, .34em tracking, ink), linking to #hero
- Right: **Rendez-vous** (#decouverte) · **Bag (0)** with "(0)" in gold

### 4.1 Hero (#hero, night, 100svh)
A sticky stage (100svh, overflow hidden) containing these layers, bottom to top:
1. **Canvas**, full stage (see 5.1).
2. **Glow**: a circle centred on the projected touch point (CSS vars `--tx`, `--ty`) with diameter `--gs` (= max(42% of the drawn frame width, 280px)), `mix-blend-mode: screen`,
   and a radial gradient: rgba(255,246,222,.95) at 0%, rgba(244,210,140,.55) at 12%, rgba(214,170,90,.18) at 34%, transparent at 64%. **Opacity = p² × 0.55**, where p is hero progress.
3. **Pulse**: the same circle and gradient, opacity 0. On touch it plays once over 2.2s with soft easing: scale .35 → 2.1, opacity 0 → .95 (at 12%) → 0.
4. **Shade**: a bottom gradient (rgba(8,7,6) at .82 at 0%, .42 at 22%, 0 at 46%), a top gradient (.55 at 0% to 0 at 18%) and a radial vignette (clear at 55%, black .45 at the edge).
5. **In-hero nav**: an absolute top bar, padding 28px gutter, space-between. Left: "Maison Solène" (serif 15px, .3em tracking, ivory). Right: **Les Parfums · Le Toucher · L’Atelier · Rendez-vous**
   (10.5px uppercase, .28em tracking, text-dim, gold-soft on hover, gap clamp(18px, 2.6vw, 40px)).
6. **Title block**, centred, bottom clamp(72px, 14vh, 150px):
   - `h1` **MAISON SOLÈNE**: uppercase, clamp(30px, 5.4vw, 80px), letter-spacing .3em (with matching left padding so it stays optically centred), ivory, text-shadow 0 2px 40px black at 55%.
   - Tagline **Two souls. One touch.**: serif italic 300, clamp(19px, 1.9vw, 28px), gold-soft, .04em tracking.
   - **Both start hidden**: opacity 0, translateY 12px, blur 6px. When touched, they animate to visible (opacity over 1.4s, transform over 1.5s, blur over 1.3s, all main easing with a .08s delay; the tagline is delayed .45s).
     They hide again (.9s, soft easing) when the progress drops back.
7. **Hint**, bottom clamp(24px, 4.5vh, 44px), 10.5px uppercase, .32em tracking, text-dim at 80% opacity: **"Move toward the light"** (pointer) or **"Scroll toward the light"** (touch devices).
   It fades out permanently after the first touch.

Also add a **custom cursor**: a fixed 8px gold-soft dot with glow (box-shadow 0 0 10px 2px gold-soft at 55% and 0 0 34px 8px gold-bright at 22%). It is visible only while the pointer is over the hero,
which hides the system cursor there (links included). It follows the mouse with a 0.25 lerp per frame and scales with progress to 1 + p × 0.6.

### 4.2 Intro (centred, padding clamp(120px, 20vh, 220px) top, clamp(80px, 12vh, 140px) bottom)
- Eyebrow: **Haute Parfumerie · Paris · Since 1924**
- Lede (serif 300, clamp(34px, 4.4vw, 68px), line-height 1.12, max 22ch, 30px top margin): **Three compositions, each written after a painting.** ⏎ *Light, shadow, and the moment they meet.* (the italic line in gold)
- A 1px × 84px vertical rule, 56px below, gradient from gold to transparent.

### 4.3 Room I: Lumière (#parfums wraps both rooms; background paper)
A grid of **7fr (art) / 5fr (text)**, gap clamp(48px, 7vw, 120px), padding clamp(100px, 16vh, 180px) gutter, overflow hidden.
A **picture light** sits behind it: a pseudo-element at the top-left, 70% wide and 80% tall, starting at −10% top, holding an ellipse radial gradient of rgba(255,246,225,.85) fading out by 62%.

**Art column** (padding-bottom clamp(60px, 9vh, 110px)):
- **Gilt frame** `figure` around the `room-1` painting: padding clamp(9px, 1.1vw, 16px). Background is a 135° gold gradient (#7d5d24 0%, #e6cf93 18%, #a9843f 38%, #f3e3b4 55%, #9a7535 76%, #d9be80 100%).
  Shadows: an inset 1px rgba(255,240,200,.55) line, 0 50px 90px −40px rgba(55,38,14,.55), and 0 10px 24px −10px rgba(55,38,14,.35).
  The image has a **linen liner**: a clamp(8px, 1.2vw, 18px) solid #f1e9da border with an inset 12px shadow at black 25%.
  Alt text: "J. M. W. Turner, Norham Castle, Sunrise: a pale gold sun dissolving over a blue castle and river".
- **Bottle** (`product-1`): absolute at the bottom-right (right clamp(−10px, 2vw, 40px)), height clamp(220px, 34vh, 380px), drop-shadow 0 30px 30px rgba(40,28,10,.22).
  It **floats** (translateY 0 → −14px → 0, 9s ease-in-out infinite). Under it is an oval **shadow** (86% wide, 18px tall, 26px below, radial rgba(40,28,10,.38)) that breathes in sync
  (scaleX 1 → .84, opacity 1 → .7). The bottle wrapper has **scroll parallax with factor −0.08** (see 5.3). Alt text: "Lumière, frosted ivory glass with a gold cap".

**Text column** (max 470px):
- Eyebrow: **Salle I · N° 1 · Eau de Parfum**
- Name **Lumière**: serif clamp(64px, 8.4vw, 136px), line-height .95, −.01em, 22px top margin
- **after Turner**: serif italic clamp(22px, 2vw, 30px), gold
- **Museum label** (34px top margin, padding 16px 18px, white at 55%, hairline border, 12.5px/1.6 ink-soft, soft shadow 0 6px 18px −12px):
  **J. M. W. Turner** (1775–1851) ⏎ *Norham Castle, Sunrise*, c. 1845 ⏎ Oil on canvas · Tate, London
  (the name in Jost 400 ink, the title in serif 15px italic)
- Description (serif clamp(19px, 1.45vw, 22px)/1.55, ink-soft, 30px top margin): **Turner painted the sun until only its warmth was left. Lumière does the same with jasmine: bergamot and neroli dissolve into a haze of orris and white musk, bright at first, then simply warm on the skin.**
- **Notes**, a 3-column `dl` with a hairline top border and hairline dividers between columns. The `dt` is 10px uppercase, .28em tracking, gold; the `dd` is 13px ink-soft:
  Top: Bergamot, neroli, pink pepper · Heart: Jasmine sambac, orris, white peony · Base: White musk, ambrette, cashmere wood
- **Buy row** (hairline top border, 38px margin, 24px padding, flex baseline, gap 14px 34px): **100 ml €350** · **50 ml €240** (serif 26px price, with the size as a 10.5px uppercase faint prefix), then the hairline link **Reserve Lumière** pushed right, linking to #decouverte.

### 4.4 Room II: Ombre (background stone, **mirrored**: 5fr text / 7fr art, art ordered second)
The same anatomy, with the picture light on the right at .55 strength. The painting is `room-2`. If it is portrait, use a **tall frame** (max 520px wide, aligned left); if landscape, it fills the column like Room I.
The bottle is `product-2`, placed at left clamp(220px, 26vw, 420px), with **parallax −0.12** and its float and shadow offset by −4.5s so it moves out of phase with Lumière.
- Eyebrow **Salle II · N° 2 · Eau de Parfum** · name **Ombre** · **after Whistler**
- Label: **James McNeill Whistler** (1834–1903) ⏎ *Nocturne in Black and Gold – The Falling Rocket*, 1875 ⏎ Oil on panel · Detroit Institute of Arts
- Description: **A black night, a few sparks of gold falling slowly through it. Ombre is smoke and polished wood, close and unhurried: birch tar and leather over a deep base of oud, with saffron glinting through like the last of the fireworks.**
- Notes: Top: Black pepper, cardamom, saffron · Heart: Smoked birch, leather, iris · Base: Oud, vetiver, labdanum
- €350 / €240 · **Reserve Ombre**
- Alt texts: "James McNeill Whistler, Nocturne in Black and Gold: falling sparks of gold fireworks over a black night" and "Ombre, a matte black flacon".

### 4.5 Interlude: La Galerie (#galerie, background paper-2, bottom padding clamp(90px, 14vh, 160px))
- A full-bleed band, height clamp(320px, 62vh, 640px), overflow hidden, holding `interlude` with object-fit cover at position 50% 42%, **parallax −0.06** and a **constant scale of 1.12**.
  Alt text: "Michelangelo, The Creation of Adam: two hands reaching toward each other, almost touching".
- Centred text (max 980px, padding-top clamp(60px, 10vh, 110px)):
  - Eyebrow **Salle III · The origin**
  - Quote (serif clamp(32px, 4.2vw, 64px)/1.12): **Every house has its origin.** ⏎ **Ours is the space** *between two fingertips*. (the italic part in gold)
  - Caption (12px, .06em, ink-faint): Michelangelo Buonarroti, *The Creation of Adam*, c. 1512 · Fresco · Sistine Chapel, Vatican

### 4.6 Le Toucher (#toucher, night, **340svh** tall, sticky 100svh stage)
The stage is driven by four CSS variables, `--a --b --r --t` (0 → 1), set from scroll (5.4). Bottle height `--bh` = clamp(200px, 38vh, 380px), side spread `--spread` = min(28vw, 420px), meeting offset `--meet` = bh × .345.
- Top intro eyebrow (top clamp(72px, 13vh, 130px), centred): **Lumière + Ombre** with the "+" in ivory, spaced .6em. Opacity = 1 − a × 1.4.
- **Lumière bottle** (`product-1`): centred at left 50%, top 38%, translated left by meet + (1 − a) × spread, opacity 1 − r.
- **Ombre bottle** (`product-2`): mirrored to the right, with the same opacity and a faint 1px gold-soft drop-shadow edge.
- **Le Toucher bottle** (`product-3`): centred, scale .9 + r × .1, opacity r, drop-shadow 0 20px 60px gold-bright at alpha r × .3. Alt text: "Le Toucher, clear crystal flacon with a gold cap and a red label".
- **Burst**: a 110vmin circle at the same centre with the same radial gradient as the hero glow, screen blend, scale .15 + b × 1.1, opacity b, layered above the bottles.
- **Text** (bottom clamp(30px, 7vh, 80px), centred), with opacity t and translateY (1 − t) × 16px:
  - Eyebrow **N° 3 · Extrait de Parfum** (gold-bright)
  - `h2` **Le Toucher**: clamp(40px, 5vw, 76px), .04em tracking
  - Italic serif clamp(17px, 1.35vw, 21px), text-dim, max 46ch: **Lumière’s jasmine laid over Ombre’s smoked woods, joined by a single drop of golden benzoin. Neither light nor shadow. The moment between.**
  - Notes line (10.5px uppercase, .2em tracking, gold-bright): **Neroli · Saffron — Jasmine · Iris — Oud · Benzoin · Musk**
  - Price (22px, ivory, not italic): **70 ml Extrait · €420**

### 4.7 Services (background paper, hairline bottom border, padding clamp(70px, 11vh, 120px) gutter)
Four centred columns with hairline left dividers. Each has a serif title (clamp(20px, 1.7vw, 26px)) and a 13px ink-soft line, max 26ch:
- **Engraved by hand**: Initials or a date, cut into the glass in our atelier.
- **Wrapped in linen**: Every flacon leaves Paris in a linen-bound case.
- **Refilled for life**: Bring your flacon back to the Rue de Valois, always.
- **Delivered from Paris**: Complimentary, with two samples of your choice.

### 4.8 L’Atelier (#atelier, max 1240px centred, padding clamp(120px, 20vh, 240px) gutter)
- Eyebrow **L’Atelier · Rue de Valois, Paris**
- Big quote (serif 300, clamp(44px, 7vw, 112px)/1.02): **“A perfume is not worn.** ⏎ **It is** *met*.**”** ("met" in gold italic), with the cite **Solène Arnaud, founder** below (10.5px uppercase, .3em tracking, faint, 28px gap).
- Two body columns (max 900px, **pushed to the right**, gap clamp(32px, 6vw, 96px), 15.5px/1.9 ink-soft, top margin clamp(80px, 14vh, 160px)):
  1. **Maison Solène was opened in a narrow workshop off the Palais-Royal, with one perfumer, one organ of raw materials and a belief that a scent should take its time. It still does. Each composition rests for twelve weeks before it is bottled, and nothing leaves the atelier until it has been worn for a full day.**
  2. **We work in small batches and buy from the same growers each season: jasmine picked before dawn in Grasse, iris roots aged three years in Tuscany, oud from a single family in Laos. The flacons are blown in Normandy and finished by hand in Paris, the gold applied one line at a time.**
- Small quote, **right-aligned**, serif italic gold clamp(32px, 4vw, 60px), top margin clamp(100px, 16vh, 200px): **“Light needs shadow to be seen.”**
- **Ingredients list** (an `ol` with a hairline top border and a hairline under each row, 22px vertical padding, grid 64px | 1fr | auto, baseline-aligned; on hover a row indents 12px over .8s).
  The numeral is serif 15px gold, the name serif clamp(24px, 2.4vw, 34px), the origin 10.5px uppercase, .26em tracking, faint:
  I Jasmine sambac, Grasse, France · II Orris butter, Tuscany, Italy · III Bergamot, Calabria, Italy · IV Oud, Champasak, Laos · V Vetiver, Haiti · VI Siam benzoin, Luang Prabang, Laos

### 4.9 Rendez-vous (#decouverte, background stone, centred, padding clamp(120px, 18vh, 220px) gutter)
- Eyebrow **Rendez-vous**. Title **Come and meet them.** (serif italic clamp(46px, 6vw, 96px)).
- A two-column grid (max 1120px, left-aligned text, hairline top border, hairline divider between columns):

**Offer 1:** eyebrow **In Paris**, `h3` **A private appointment** (clamp(30px, 2.8vw, 42px)), with: **One hour in our salon on the Rue de Valois with a perfumer of the house. We will wear all three with you, slowly, and find the one that is yours.**
A form (`novalidate`, 18px gaps) with the fields **Name** (autocomplete name, required), **Email** (type email, required) and **Preferred date** (type date, required).
The labels are 10px uppercase, .28em tracking, faint. The inputs are 16px, transparent, with only a 1px bottom border at ink 25%, which turns gold on focus and #a5503a when invalid. Button: **Request an appointment**.
A live status note sits below (serif italic 18px gold, `role=status`, `aria-live=polite`, reserved height).

**Offer 2:** eyebrow **Anywhere**, `h3` **The discovery set**, with: **Lumière, Ombre and Le Toucher in three 10 ml flacons, in a linen-bound case. The price is returned to you against your first full bottle.**
A row of the three products (1, 3, 2), bottom-aligned with a 22px gap (Lumière 120px, Le Toucher 142px in the middle, Ombre 120px, soft drop-shadows), then the price **3 × 10 ml · €145** (serif 24px),
the button **Order the discovery set**, and a status note.

**Button style:** 16px × 32px padding, 10.5px uppercase, .28em tracking, ivory on ink, square corners. On hover a gold fill wipes up from below (.7s) behind the label; on press it scales to .985; when disabled it sits at 50% opacity with no wipe.

### 4.10 Footer (background paper, centred, padding clamp(80px, 12vh, 130px) gutter 40px)
- **MAISON SOLÈNE** (serif clamp(26px, 3vw, 42px), uppercase, .36em tracking) · **Haute Parfumerie · Paris** (eyebrow style)
- A 3-column row (max 900px, hairlines above and below, 13px ink-soft): **12 Rue de Valois ⏎ 75001 Paris** | **salon@maisonsolene.example** (mailto) ⏎ **Tuesday to Saturday, 11h–19h** | **Journal ⏎ Mentions légales**
- Small print (10px uppercase, .24em tracking, faint): **© 2026 Maison Solène · A fictional house · Artworks in the public domain**

## 5. Behaviour (main.js, in one IIFE, strict mode)

**Modes.** `reduceMotion` = prefers-reduced-motion. `saveData` = navigator.connection.saveData. **Static mode** = either one, and it adds `is-static` to `<html>`.
**Touch mode** = `(hover: none), (pointer: coarse)`.

### 5.1 Hero canvas, the signature moment
- **Frame set:** use mobile when `innerWidth < innerHeight && innerWidth <= 900`, otherwise desktop. The mobile set covers x 0.2–0.8 of the full frame.
- **Layout** (on load and resize): the canvas is sized to the stage at DPR = min(devicePixelRatio, 1.75, 2560 / viewport width), with high-quality smoothing.
  The drawn **full-frame width S** = min(max(vw, vh × ASPECT), vw / 0.6). That covers the stage, but never zooms in so far that less than 60% of the frame width shows, which keeps both hands visible on portrait phones.
  It is also never less than vw / set width. Position it horizontally so `FOCAL.x` sits at the viewport centre, clamped so the drawn set always covers the width.
  Vertically, if the frame is taller than the stage, centre `FOCAL.y`, clamped to cover. If it is shorter (portrait), put `FOCAL.y` at **44%** of the stage height and fill the rest with night.
  Expose the projected touch point as `--tx/--ty` and the glow size as `--gs`.
- **Drawing:** fill with #0b0a09, draw frame floor(p × (N − 1)), then **crossfade the next frame** at the fractional alpha for sub-frame smoothness.
  If a frame hasn't loaded, draw the **nearest loaded neighbour**. In portrait (frame shorter than the stage), **feather the top and bottom 22%** of the frame into the night colour with gradients.
- **Desktop progress (cursor):** d = the distance from the cursor to the touch point, with dx divided by vw/2 and dy by vh/2 (so 1 = the midpoint of a viewport edge).
  t = clamp((0.90 − d) / (0.90 − 0.16), 0, 1), and target = 1 − (1 − t)^1.6. If the pointer has left the window or the window is blurred, target = 0.
- **Touch progress (scroll):** the hero becomes **250svh** with the sticky stage. target = clamp(−heroTop / ((heroHeight − vh) × 0.8), 0, 1), so the touch arrives at 80% and the last 20% holds it.
- **Glide (every rAF):** k = 1 − (1 − rate)^(dt / 16.667), where rate = 0.14 on touch, 0.09 with the pointer in, and 0.03 with the pointer out (the hands drift apart slowly).
  The step is (target − shown) × k, **capped at ±0.04 × dt/16.667** (±0.06 on touch), so a cursor jump can never make the hands lunge. Snap when within 0.0004. Clamp dt to 64ms.
  Redraw only when the value changes or the layout is dirty, and set `--p` on the stage.
- **Reveal:** when shown ≥ **0.97**, add `is-touched` (title in), restart the pulse animation, and on the first touch add `has-touched` (the hint hides for good). Remove `is-touched` when shown < **0.85** (hysteresis).
- **Loading, with no loader:** decode frame 1 and paint it immediately, then start the loop and stream the rest with **6 parallel workers** using `img.decode()`.
  The order is **the last frame first** (the touch), then coarse-to-fine: every 16th frame, then every 8th, 4th, 2nd and 1st, skipping ones already queued. Mark the canvas dirty as each frame arrives.
- **Performance:** an IntersectionObserver stops the rAF loop when the hero is off-screen and restarts it when it returns.
- **Cursor:** on pointermove (ignore touch pointers), show the gold dot and hide the system cursor only while the pointer's y is inside the hero. On pointerleave from the document or on window blur, set the pointer as out.
  On scroll, also hide the dot if the page has moved the hero out from under a still mouse.
- **Static mode:** load only the last frame, draw it at p = 1, set `is-touched` and `has-touched`, and the hero stays at 100svh.

### 5.2 Sticky bar and anchor glide
- On scroll, toggle the bar's `is-on` when the hero's bottom is < 80px.
- Intercept clicks on any `a[href^="#"]` with a target. Glide with GSAP ScrollToPlugin: duration clamp(0.9 + distance/5000, 0.9, 2.2)s (0 in static mode), ease **power3.inOut**, `autoKill: true`,
  offset = the bar height − 1 (0 for #hero). Update the URL hash with `history.replaceState`.

### 5.3 Reveals and parallax
- **CSS reveal:** `.reveal` starts at opacity 0, translateY 18px, and transitions to visible (opacity 1.4s, transform 1.6s, main easing, with a per-element delay from a `--d` custom property).
  An IntersectionObserver (threshold .15, rootMargin bottom −6%) adds `is-in` once. Apply it to the eyebrows, ledes, labels, notes, buy rows, services, columns, ingredient rows (staggered .06s),
  offers (.12s) and the intro rule (.2s).
- **Split headings (GSAP SplitText):** the intro lede, both room names, the interlude quote, the big atelier quote and the Rendez-vous title. After `document.fonts.ready`, split into **lines with line masks**,
  then animate each line from **yPercent 105** to 0 over **0.95s, power4.out, stagger 0.09**, triggered once at "top 88%". Hide these headings until they are split, so they never flash.
  Give the line masks .12em bottom padding with a matching negative margin so descenders aren't clipped.
- **Painting curtain lift:** each framed painting animates from `clip-path: inset(0 0 100% 0)` + scale 1.08 to `inset(0 0 0% 0)` + scale 1 over **1.8s power3.inOut**, triggered once at "top 82%". Call `ScrollTrigger.refresh()` afterwards.
- **Parallax:** one rAF-throttled scroll and resize handler. For each `[data-parallax]` element within 200px of the viewport,
  translateY = (element centre − viewport centre) × factor, keeping any `data-scale` value as the scale.
- Skip all GSAP motion in static mode (the reveals are simply visible).

### 5.4 Le Toucher timeline (in the same scroll handler)
p = clamp(−sectionTop / (sectionHeight − vh), 0, 1), with easeInOut = cubic in-out and easeOut = cubic out:
- a = easeInOut(seg(p, 0.06, 0.48)): the bottles slide together
- b = p < 0.56 ? easeOut(seg(p, 0.40, 0.56)) : 1 − easeInOut(seg(p, 0.56, 0.82)): the burst flares, then fades
- r = easeInOut(seg(p, 0.50, 0.70)): the two bottles cross into Le Toucher
- t = easeOut(seg(p, 0.70, 0.88)): the text arrives

Here seg(v, a, b) = clamp((v − a)/(b − a), 0, 1). In static mode, set a = 1, b = 0, r = 1, t = 1, and the section is auto-height with a relative 100svh stage.

### 5.5 Forms
- **Appointment:** on submit, preventDefault and check each input with `checkValidity()`, setting `aria-invalid` on each. If any field fails, show **"Please complete each field."** and focus the first bad field.
  Otherwise show **"Merci, {first word of name}. The salon will write to confirm your hour."** and disable the button. Leave a `// TODO: connect to the booking backend` comment.
- **Discovery set:** clicking the button disables it and shows **"The discovery set is reserved for you."** Leave a `// TODO: connect to checkout` comment.

## 6. Responsive

- **≤ 1000px:** the rooms become one column with the art first; the text is max 560px and the art max 640px; the Ombre bottle moves to the right like Lumière; services become 2 columns.
- **≤ 900px:** hide the in-hero nav links (centre the mark); the bar becomes 2 columns, mark left at 15px and right links only; the atelier columns become one, not offset; the Rendez-vous offers stack with a top hairline.
- **≤ 560px:** hide the bar's Rendez-vous link; room bottles become 190px; notes become one column with hairlines between them; the Reserve link sits left; services become 1 column;
  the ingredients grid becomes 40px | 1fr with the origin under the name; the footer becomes 1 column; in Le Toucher, `--spread` is 24vw, `--bh` is min(30vh, 52vw), and the bottles and burst sit at top 34%;
  the hero h1 is 27px with .22em tracking on one line.
- `body { overflow-x: clip }`. Use `svh` with a `vh` fallback for all full-height sections. Set `viewport-fit=cover`.

## 7. Accessibility and quality

- Semantic landmarks: `header` / `nav` (aria-labelled) / `main` / `section` (aria-labelled) / `article` / `footer`. The hero canvas, glow, pulse, shade and cursor are `aria-hidden`.
- All content images have the alt texts given above; decorative bottles (Le Toucher scene, discovery set) use `alt=""`. Give every `img` its real width and height; lazy-load everything below the hero.
- Under `prefers-reduced-motion`, kill all animations and transitions and show all reveals.
- Before finishing, serve over HTTP (`python -m http.server`) and check: the first frame paints instantly; the cursor brings the hands together smoothly and reversibly; the title reveals at the touch;
  mobile scroll drives the hero; Le Toucher merges correctly; anchor links glide; both forms work; reduced motion shows the final state; the console has no errors and nothing 404s.

---

# APPENDIX — Optional: recreate the original media

Use these prompts if you want the original Maison Solène look. Save the results into the Part A slots: the video as `assets/video.mp4`,
Lumière as `product-1`, Ombre as `product-2`, Le Toucher as `product-3`, Turner as `room-1`, Whistler as `room-2`, and Michelangelo as `interlude`.

Every image must share one art direction: **dark, low-key, Renaissance-fresco mood, warm gold light, near-black shadows (#0b0a09).**

### 1. Hero keyframe 1: hands apart → `assets/keyframes/first.png`

Generate at **16:9, at least 3840×2160** (any image model).

> Cinematic wide shot, 16:9. Two elegant human hands reach toward each other from opposite edges of the frame, in homage to Michelangelo's Creation of Adam,
> floating in a vast sky of dark, billowing cumulus clouds. Left arm wrapped in flowing translucent ivory silk with fine gold embroidery, entering from the left edge;
> right arm in sheer slate-blue silk with gold embroidery, entering from the right edge. Both index fingers extended, relaxed, graceful. The fingertips are FAR apart,
> about one third of the frame width between them, both hands at mid-height. Soft golden god-rays pour diagonally from a break in the clouds at upper left. Deep near-black shadows, warm gold
> highlights on cloud edges, gentle film grain, painterly yet photoreal, chiaroscuro, high dynamic range, 35mm lens, camera locked off, eye-level.
> No text, no faces, no bodies, only forearms and hands.

### 2. Hero keyframe 2: fingertips touching → `assets/keyframes/last.png`

Use **keyframe 1 as the image reference / start image** so the clouds, light and fabrics stay identical. Change only the hands.

> Same exact scene, camera, clouds, light rays and fabrics as the reference image. The two arms have now reached further in so that the index
> fingertips almost touch at the EXACT CENTRE of the frame (horizontal 50%, vertical 48%). A small, intense point of warm golden light glows exactly where the fingertips meet,
> with fine radiating rays. Nothing else changes.

Check before moving on: the touch point is dead centre, and the clouds and light match keyframe 1.

### 3. Hero video (any image-to-video model with start + end frame) → `assets/video.mp4`

Start frame = `first.png`, end frame = `last.png`, 16:9, highest resolution, **3–5 s**.

> The two hands drift slowly toward each other until the index fingertips meet at the centre of the frame, and a small golden light blooms at the point of touch.
> Camera completely static, no zoom, no pan, no cut. Clouds move very slightly, light rays shimmer softly, silk sleeves ripple gently. Smooth, slow, continuous motion
> with gentle ease-in and ease-out. Keep the lighting, colours, framing and cloud layout fixed.

If the model doesn't take an end frame, generate from the start frame with the same prompt and pick the take where the fingertips finish at the centre.
**The video must end on the touch.**

### 4. Three bottles (your own designs, no real brands) → `assets/bottles/`

Generate each bottle as a **portrait (about 2:3) packshot, the bottle alone, centred, on a plain light-grey background, soft studio light, front view**.
Then remove the background (with a background remover such as `rembg`). Save each as **WebP with transparency**, cropped tight to the bottle, about 700–900px wide.

- `product-1.webp` (Lumière): *Luxury perfume bottle, rectangular frosted ivory-white glass, softly rounded shoulders, polished gold rectangular cap, tiny gold engraved wordmark "LUMIÈRE", minimal, elegant.*
- `product-2.webp` (Ombre): *Luxury perfume bottle, tall matte black glass flacon, sharp facets, black-and-gold cap, subtle gold engraved wordmark "OMBRE", dark and sculptural.*
- `product-3.webp` (Le Toucher): *Luxury perfume bottle, heavy clear crystal square flacon with bevelled edges, amber-gold juice, tall polished gold square cap, a deep red rectangular label with a thin gold border
  reading "Maison Solène — Le Toucher — Extrait de Parfum" in gold serif type.*

### 5. Paintings (public domain) → `assets/art/`

Download from Wikimedia Commons (search the titles; they are all public domain) and save as WebP, quality ~80:
- `room-1.webp`: J. M. W. Turner, *Norham Castle, Sunrise* (c. 1845), ~1600px wide
- `room-2.webp`: James McNeill Whistler, *Nocturne in Black and Gold – The Falling Rocket* (1875), ~1200px wide
- `interlude.webp`: Michelangelo, *The Creation of Adam* (c. 1512), the full horizontal panel with both figures, ~2400px wide
