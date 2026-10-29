# Little Gills — cozy aquarium-studio landing page

**One line:** a warm, frosted-glass landing page for a small studio selling handcrafted fantasy nano-aquariums, built around a full-bleed mascot photo that blinks at you.

**The experience.** The page opens on a full-screen photo of a smiling mascot inside an aquarium. Soft-skinned eyelids blink over its real eyes every few seconds, and it blinks back when tapped. Bubbles rise through the hero, and the photo, copy and bubbles move at three different speeds as you scroll. Below, frosted-glass cards present three habitat kits (each drawn as a glass cube in SVG), three resident species with care facts, a three-step "how it's made" strip, and a live configurator that prices a custom tank and swaps its preview as you choose. It ends in a dark "deep water" footer with bubbles, a newsletter form and social links.

**How to use**
1. Put your hero photo in the slot in Part A (`assets/hero.*`).
2. Paste **Part B** into your coding agent, opened in an empty folder that contains your `assets/` folder.
3. If you swap the hero photo later, ask the agent to re-run the media step (B4). It will re-measure the eyes and rewrite the `CONFIG` values.

---

## Part A — Asset slots (bring your own)

The structure is fixed; the content is yours. There is exactly one media slot. Every other visual (habitat cubes, resident portraits, icons, logo, bubbles) is drawn in code.

| Slot | Path | What it is | Requirements |
|---|---|---|---|
| Hero | `assets/hero.*` (png, jpg, webp) | Full-bleed hero photo and brand mascot: a friendly creature facing the camera inside a lush aquarium or terrarium | Landscape, about 16:9 (anything from 3:2 to 2:1 works). At least 1600 px wide, ideally 2400+. The face should sit **right of centre** (about 55–80% across) so the headline can sit on the left. Keep the top-left quarter calm and fairly dark (it carries white text over a teal shade). If the mascot has visible eyes facing the camera, the eyelid blink works; if not, the blink is switched off and everything else stays the same. |

**Demo-brand copy you can edit:** the brand name "Little Gills", the mascot's name "Bloop", every heading and body line, the three habitat names, descriptions and prices, the three resident species and their facts, the builder's options and prices, the newsletter text and the legal line. Keep the structure (number of cards, facts per card, steps, option groups) and the copy lengths roughly the same, or the layout will shift.

---

## Part B — Build prompt (paste this into your coding agent)

### B1. Role and goal

You are a senior front-end engineer and designer. Build a single-page marketing site for a studio called **Little Gills** that sells handcrafted fantasy nano-aquariums. Build **exactly** what this document specifies, with every value given: no extra sections, effects, libraries or copy, and nothing left out. Where this document gives a number, use that number. If something is genuinely ambiguous, choose the simplest reading and list it in your final report.

### B2. Media rules

- The only media is the hero photo in `assets/hero.*`. If it is missing, **stop and ask** for it. Don't invent or download a placeholder.
- Read the photo's real pixel width and height from the file. Never assume them. Store them in a single `CONFIG` object at the very top of the script, as `CONFIG.image = { width, height }`.
- Produce a web copy: `hero.webp` in the project root, resized to at most 2400 px wide (keep aspect), WebP quality 82. Serve it with a `picture` element: WebP source first, then the original as the `img` fallback. Set the `img` width and height attributes to the **original's** real pixel dimensions (the WebP keeps the same aspect ratio).
- **Find the mascot's eyes** (see B4) and store them in `CONFIG.eyes`. If the photo has no visible pair of eyes facing the camera, set `CONFIG.eyes` to an empty array and skip the eye markup. The rest of the page is unchanged.

### B3. Stack and files

- **Files:** one `index.html` with all CSS in a single `style` element in the head and all JS in a single `script` at the end of the body, plus `hero.webp`, `assets/hero.*` and `scripts/make-hero.sh`. Nothing else.
- **No frameworks, no libraries, no build step, no animation library, no smooth-scroll library.** Native scroll only, never hijack the wheel. Vanilla JS, CSS, inline SVG.
- **Fonts (Google Fonts):** Fredoka at weights 400, 500 and 600 (headings), Nunito at 400, 600, 700 and 800 (body), with `display=swap`. Preconnect to fonts.googleapis.com and fonts.gstatic.com (the second with crossorigin). Fallback stacks: Fredoka, then ui-rounded, system-ui, sans-serif; and the same for Nunito.
- **Head:** `lang="en"`. Viewport is `width=device-width, initial-scale=1, viewport-fit=cover`.
  - Title: "Little Gills — Handcrafted fantasy nano-aquariums"
  - Meta description: "Little Gills is a cozy studio making handcrafted fantasy nano-aquariums and terrarium kits: mossy villages, lantern-lit grottos and tumbling ruins."
  - theme-color #123A3A.
  - Preload the hero image with high fetch priority.
- **Favicon:** an inline SVG data URI on a 40×40 viewBox: a coral (#F48A8A) circle of radius 13 at (20, 22) with two deep-teal (#123A3A) dots of radius 2.6 at (15, 20) and (25, 20).
- A tiny inline script in the head adds the class `js` to the html element. Reveal animations only hide content when that class is present.

### B4. Media step (hero photo and eye measurement)

Save these commands as `scripts/make-hero.sh` so the buyer can re-run them.

```sh
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 assets/hero.*
ffmpeg -y -i assets/hero.<ext> -vf "scale='min(2400,iw)':-2" -c:v libwebp -quality 82 hero.webp
```

**Eye measurement** (only if the mascot has eyes):
1. Crop each eye at 2× zoom with ffmpeg (a 200×200 px crop around your estimate, scaled to 400×400) and look at the crop.
2. For each eye, record in **source-image pixels**:
   - `cx`, `cy`: the centre of the visible eye opening.
   - `w`, `h`: the size of the lid. Make it the eye opening plus about 12–15% on each axis, so the closed lid fully covers the painted eye and its dark rim.
   - `rot`: the tilt of the eye's long axis in degrees. Clockwise is positive.
3. Order the eyes as viewer's-left first. Give each one a `name` ("left (viewer)", "right (viewer)").
4. Verify in the browser with debug mode (B7.2): open, half-closed and fully closed. No dark sliver of the original eye may show around a closed lid.

Reference only, for the demo image (1672×941): left eye at 969, 361 (116 × 96, −12°), right eye at 1305, 499 (98 × 122, +6°). **Never copy these numbers.** Measure the buyer's image.

### B5. Design tokens

**Colours**

| Token | Value | Use |
|---|---|---|
| coral | #F48A8A | Primary buttons, checked option ring, logo, accents |
| coral-deep | #E26D6D | Second mushroom cap, shrimp antennae |
| aqua | #7FCFCB | Water tints, section tints, newsletter message text, blobs |
| aqua-soft | #DDF2EF | Ends of the section tint gradient |
| moss | #5E8B4A | Kickers, step labels, checkbox fill, plants |
| amber | #F2B45C | Hover glows, focus ring, lantern, eyebrow dot |
| cream | #FFF6EC | Page background, footer text |
| teal | #123A3A | Text, hero background, footer |
| teal-2 | #0C2B2B | Bottom of the footer gradient, phone hero gradient |
| teal-soft | #2C5352 | Secondary text |
| lid | #F3C6C0 | Eyelid skin |
| Button text | #3a1414 | Text on coral buttons |
| Headline accent | #FFD9C9 | Second line of the hero headline |

**Shared values**

| Name | Value |
|---|---|
| Radii | sm 14px, md 22px, lg 32px, pill 999px |
| Gutter | clamp(16px, 5vw, 72px) |
| Content width | max 1200px, centred, horizontal padding = gutter |
| Easing ("ease-out") | cubic-bezier(.22, 1, .36, 1) |
| Glass background | rgba(255,255,255,.46) |
| Glass line | rgba(255,255,255,.75) |
| Soft shadow | inset 0 1px 0 rgba(255,255,255,.7) plus 0 18px 40px −18px rgba(18,58,58,.28) |
| Amber glow | 0 0 0 1px rgba(242,180,92,.55) plus 0 14px 46px −6px rgba(242,180,92,.55) |

**Type**
- **Body:** Nunito 400, 17px, line-height 1.6, colour teal, antialiased. Below 680px wide the body size is 16px.
- **Headings (h1–h3):** Fredoka 600, line-height 1.08, letter-spacing −.01em, no margin.
- **Kicker:** Fredoka 600, .85rem, line-height 1, letter-spacing .12em, uppercase, moss, 14px below it, inline-block.
- **Section h2:** clamp(2.1rem, 4.2vw, 3.4rem).
- **Section intro paragraph:** 1.08rem, teal-soft, 16px above it.
- **Section head block:** max-width 640px, margin-bottom clamp(36px, 5vw, 60px).

**Global rules**
- Box-sizing is border-box everywhere. The body has `overflow-x: clip`, and so does `main`; there must never be horizontal scroll.
- `html` has smooth scroll behaviour, set to auto under reduced motion.
- Images and SVGs are block-level with max-width 100%. Links inherit colour.
- **Focus-visible:** 3px solid amber outline, 3px offset, 10px radius.

**Buttons (`.btn`)**
- Inline-flex with a .55em gap, padding .95em 1.5em, no border, pill radius.
- Coral background, #3a1414 text, Fredoka 600 1rem, line-height 1, letter-spacing .01em, no underline.
- Transform transition .25s ease-out; transparent tap highlight.
- A pseudo-element covers the button with the amber glow at opacity 0 and fades to 1 on hover (.3s ease-out). Only opacity animates.
- Hover (only on hover-capable devices): the button rises 2px, the glow fades in, and the trailing arrow icon (18×18) shifts 3px right over .3s.
- Active: scale .97.
- **Ghost variant:** background rgba(255,255,255,.14), white text, inset 1.5px rgba(255,255,255,.55) ring, 8px backdrop blur.

**Glass card (`.glass`)**
- 32px radius, glass background, backdrop blur 16px with saturate 1.4, soft shadow plus an inset 1px glass-line ring.
- A pseudo-element carries the amber glow at opacity 0 (.35s ease-out).
- **Lift (`.lift`):** transform transition .4s ease-out. On hover the card rises 6px and its glow fades in.

**Chips**
- Inline-block, padding .35em .75em, pill radius, weight 800, .75rem, letter-spacing .02em.
- moss chip: rgba(94,139,74,.16) background, #3e6430 text.
- amber chip: rgba(242,180,92,.24) background, #8a5a12 text.
- aqua chip: rgba(127,207,203,.3) background, #1d5f5b text.

**Blobs**
- Absolutely placed circles, blur 60px, z-index −1, default opacity .55, no pointer events.
- They decorate sections and give the glass something to blur.

**Section tint (`.tint-aqua`)**
- A vertical gradient: rgba(221,242,239,0) at 0%, rgba(127,207,203,.28) at 18%, rgba(127,207,203,.22) at 82%, rgba(221,242,239,0) at 100%.

**Section padding:** clamp(80px, 11vw, 150px) top and bottom.

### B6. Sections, in page order

#### 0. Fixed layers

**Hidden SVG definitions** come first in the body: an SVG with width and height 0, absolutely positioned, aria-hidden. Don't use display:none, because the gradients must render. Every habitat drawing reuses these with `use` references.

Gradients:
- **water:** vertical, #9fe0da at opacity .75 to #4fa9a4 at .85.
- **water-side:** vertical, #7fcfcb at .7 to #2f7f7b at .9.
- **sand:** vertical, #ead2a8 to #c9a878.
- **glass:** diagonal top-left to bottom-right, white at .55, then .08 at the midpoint, then .3.
- **lantern:** radial, #fff2c9, then #F2B45C at .85 at 35%, then #F2B45C at 0.
- **moss:** radial centred at 40%, 30%; #8fbf6a to #4b7a3a.

Clip path **tank:** the polygon (30,60), (170,60), (210,30), (210,170), (170,200), (30,200).

Every symbol uses viewBox 0 0 240 230.

**Tank back**
- A ground shadow ellipse at (122, 212), radii 104 × 11, teal at opacity .14.
- Inside the tank clip:
  - Water body: the polygon (30,92), (170,92), (210,62), (210,170), (170,200), (30,200) in water.
  - Right side face: (170,92), (210,62), (210,170), (170,200) in water-side.
  - Sand band: (30,182), (170,182), (210,152), (210,170), (170,200), (30,200) in sand.
  - Sand top: (30,182), (70,152), (210,152), (170,182) in #f3e0bd.
- Back edges: white lines at opacity .45, width 1.5, from (70,30) down to (70,152), from (70,152) to (30,182), and from (70,152) to (210,152).

**Tank front**
- Water surface: (30,92), (170,92), (210,62), (70,62) in #c8f0ec at opacity .55, with its front and right edges stroked white (opacity .9, width 1.6).
- A front glass pane: rectangle at (30,60), 140 × 140, radius 4, filled with glass at opacity .55.
- A highlight triangle (44,74), (58,74), (44,150), white at opacity .35.
- The cube outline in white, width 2.4, round joins:
  - Top face: (30,60), (170,60), (210,30), (70,30).
  - Front square: (30,60) down to (30,200), across to (170,200), up to (170,60).
  - Right edges: (170,200) to (210,170) to (210,30).
- The same outline repeated in teal at opacity .18, width 1, for definition.

**Scene: moss village** (inside the tank clip)
- Moss mounds: ellipses at (66,182) 44 × 20 and (150,176) 50 × 22 in moss gradient, and (190,160) 26 × 14 in #5E8B4A.
- **Cottage 1:**
  - Stem: rect (56,140), 22 × 30, radius 6, #fbecd7.
  - Door: rect (63,154), 8 × 14, radius 4, #8a5a3a.
  - Cap: dome from (46,146) curving up through control point (67,112) to (88,146), coral.
  - Cap dots: white, at (60,134) r 3, (74,130) r 2.4 and (80,140) r 2.
- **Cottage 2:**
  - Stem: rect (128,134), 26 × 36, radius 7, #fbecd7.
  - Door: rect (136,150), 10 × 17, radius 5, #8a5a3a.
  - Window: an amber dot at (149,145), r 3.2.
  - Cap: dome from (116,140) via control point (141,98) to (166,140), #E26D6D.
  - Cap dots: white, at (132,126) r 3.2, (148,118) r 2.6 and (156,132) r 2.2.
- **Grass blades:** round-capped strokes, width 3.
  - Three in #5E8B4A rising from x 96, 102 and 108 near y 182, curving up to about 30–40 units tall.
  - Two in #4b7a3a rising from x 186 and 194 at y 158.
- **Bubbles:** white at opacity .7, at (96,110) r 3 and (104,98) r 2.

**Scene: lantern grotto** (inside the tank clip)
- A glow circle at (112,150), r 58, lantern gradient, opacity .75.
- **Rock arch:** a shape in #6f7b7a.
  - Outer curve: from (34,192) up through (34,110) and (70,92) to (110,92), then via (160,92) and (196,110) down to (200,170), then straight to (200,192).
  - Inner opening, back along the bottom: across to (160,192), up via (160,150) and (140,132) to (112,132), then via (86,132) and (70,150) down to (70,192).
- **Arch highlight:** a stroke in #8d9a98, width 5, round cap, from (48,192) via (50,128) and (78,104) to (110,104).
- **Cave interior:** the inner opening filled with #2c3e3e at opacity .55.
- **Lantern:**
  - Hanging wire: from (114,132) to (114,146), #3b2a1a, width 2.
  - Glow: a circle at (114,162), r 26, lantern gradient.
  - Body: an octagon from x 100 to 128 and y 148 to 178, amber, with a #7a4d17 outline of width 2.
  - Window: rect (108,156), 12 × 16, #fff2c9.
  - Top bar: from (102,148) to (126,148), #7a4d17, width 3, round caps.
- **Moss tufts:** ellipses at (60,102) 26 × 9 and (170,104) 30 × 10 in moss gradient.
- **Fern strokes:** in moss, from (184,190) and (176,190).
- **Bubbles:** white at opacity .8, at (140,122) r 2.5 and (146,110) r 1.8.

**Scene: waterfall ruins** (inside the tank clip)
- **Rock ledge:** top-left, #8d9a98, from (30,60) across to (96,60), bulging out to around x 104 and down to (84,86), then back to (30,86). Mossy top: an ellipse at (60,62), 34 × 8, moss gradient.
- **Waterfall:**
  - A white stroke, width 10, opacity .75, from (84,82) curving down to (92,190).
  - A #d8f5f2 stroke, width 5, opacity .9, from (80,84) down to (84,190).
  - A splash ellipse at (90,186), 22 × 5, white at opacity .55.
- **Columns**, in #efe4d2:
  - Column 1: rect (118,112), 18 × 70, radius 3, with a broken jagged top. Three flute lines at x 122, 128 and 132 (from y 118 to 176), #cdbfa8, width 1.5. Base: rect (114,176), 26 × 8, #d9c9ae.
  - Column 2: rect (150,136), 18 × 46, with a jagged top. Base: rect (146,176), 26 × 8, #d9c9ae.
  - A fallen block: rect (174,168), 30 × 10, rotated −10° around (189,173), #d9c9ae.
- **Moss caps:** ellipses at (127,106) 12 × 5 and (160,132) 10 × 4 in #5E8B4A.
- **Grass:** two strokes in moss from (44,190) and (52,190).
- **Bubbles:** white at opacity .8, at (108,140) r 2.4 and (112,126) r 1.8.

**Habitat drawings:** each one is an SVG (viewBox 0 0 240 230) that stacks `use` references in the order tank back, scene, tank front.

**Scroll-bubble layer:** a fixed, full-viewport, aria-hidden layer at z-index 0 with no pointer events and overflow hidden. It holds JS-created bubbles (B7.4).

#### 1. Navigation (header, id `nav`)

**Container**
- Fixed, 12px from the top, inset left and right by the gutter, z-index 50.
- Flex row with space-between and a 16px gap. Padding 8px 8px 8px 18px, pill radius.
- Background rgba(18,58,58,.28), white text, backdrop blur 14px with saturate 1.3, inset 1px rgba(255,255,255,.18) ring.
- Background and colour transition over .35s.

**Solid state** (class `is-solid`, once the hero leaves view)
- Background rgba(255,246,236,.72), teal text.
- Inset 1px rgba(18,58,58,.08) ring plus 0 10px 30px −18px rgba(18,58,58,.4).

**Logo** (link to `#top`, aria-label "Little Gills home")
- A flex row with a 10px gap: a 30×30 SVG mascot head, then the text "Little Gills" in Fredoka 600, 1.2rem.
- Mascot head, on a 40×40 viewBox:
  - A coral circle, r 13, at (20,22).
  - Six coral gill strokes (width 3, round caps), three fanning out on each side of the head.
  - Teal dot eyes, r 2.4, at (15,20) and (25,20).
  - A teal smile curve from (15,26) to (25,26).

**Links**
- A `nav` with aria-label "Main" holding a list of three links: "Habitats" (`#habitats`), "Residents" (`#residents`), "How it's made" (`#made`).
- Each link: weight 700, .95rem, padding .55em .9em, pill radius, opacity .9.
- Hover: background rgba(255,255,255,.16), or rgba(18,58,58,.07) in the solid state.
- The list is hidden below 860px wide.

**Button**
- A coral `.btn` linking to `#build`, with padding .75em 1.15em and .95rem text.
- Content: a plus icon (width 2.2 strokes), then a span "Build yours".
- Below 680px the span is hidden, leaving the plus only, and the nav's left padding becomes 14px.

#### 2. Hero (section, id `top`, aria-label "Little Gills")

**Container**
- Relative, height 100svh (100vh fallback), min 560px, max 1100px.
- Overflow hidden, teal background, `isolation: isolate`.

**Media wrapper** (absolute, fills the hero, overflow hidden, will-change transform) contains:
1. **The hero image**
   - Absolutely fills the wrapper with object-fit cover and object-position **62% 50%** (desktop).
   - Alt text: "A pink axolotl smiling and waving from inside a mossy, lantern-lit aquarium." Rewrite this to describe the buyer's photo.
2. **The eyes layer**
   - Absolute, fills the wrapper, z-index 2, no pointer events, aria-hidden.
   - One `.eye` element per CONFIG eye. Each is absolutely positioned at 0,0 with its centre as the transform origin.
   - Inside each eye, a "ball": absolute, fills the eye, 50% radius, overflow hidden. It is a transparent window over the painted eye, with a mask of a closest-side radial gradient (black to 84%, transparent at 100%) to feather its edge.
   - Inside the ball, the **lid**: absolute, fills the ball. Its bottom corners are rounded 50% horizontally and 26% vertically (top corners square). Background, three layers from top to bottom:
     - a soft highlight: a radial gradient 60% × 34% at 46% 40%, from rgba(255,240,236,.75) to transparent;
     - skin shading: a closest-side radial gradient at 50% 44%, from lid colour at 0%, to #efbcb5 at 62%, #d99a94 at 88% and #b97c77 at 100%;
     - a flat lid-colour base.
   - Lid shadows, in em units so they scale with the eye:
     - an inset lash line: 0 −.22em .18em −.06em rgba(110,58,56,.75);
     - a cast shadow on the eye below: 0 .25em .4em rgba(60,20,24,.45).
   - At rest the lid is translated −104% on Y (fully hidden above the eye).
3. **The shade**
   - Absolute, fills the wrapper, no pointer events. Two background layers:
     - linear 180°, rgba(18,58,58,.55) at 0 to transparent at 22%;
     - radial 120% × 90% anchored at the top-left corner: rgba(12,43,43,.9) at 0%, rgba(18,58,58,.62) at 32%, transparent at 60%.

**Hero bubbles layer**
- Absolute, fills the hero, z-index 3, no pointer events, overflow hidden, aria-hidden.
- It is a sibling of the media wrapper, not inside it.

**Copy block**
- Absolute, z-index 4, left = gutter, top = clamp(108px, 17vh, 170px).
- Width min(520px, 44vw), white text.

Copy block contents, in order:
- **Eyebrow pill:** inline-flex with an 8px gap, margin-bottom 18px, padding .45em .9em .45em .6em, pill radius. Background rgba(255,255,255,.14) with 8px blur. Weight 700, .82rem, letter-spacing .04em.
  - It starts with an 8px amber dot glowing 0 0 10px 2px rgba(242,180,92,.8).
  - Text: "Handmade in our little studio".
- **h1:** clamp(2.6rem, 5.4vw, 4.9rem), weight 600, text-shadow 0 2px 24px rgba(12,43,43,.4).
  - Text: "Tiny worlds," then a line break, then "big hellos." in a non-italic `em` coloured #FFD9C9.
- **Subline:** 18px above it, clamp(1.02rem, 1.3vw, 1.18rem), max-width 30em, opacity .94, text-shadow 0 1px 12px rgba(12,43,43,.5).
  - Text: "Handcrafted miniature aquatic habitats: mossy villages, lantern-lit grottos and tumbling ruins, each one built by hand and ready for someone small to move in."
- **Buttons row:** flex, wrapping, 12px gap, 28px above it.
  - A coral button "Explore the habitats" with a right-arrow icon (width 2.4 strokes), linking to `#habitats`.
  - A ghost button "Build your own" linking to `#build`.

**Hint**
- Absolute, z-index 4, right = gutter, bottom 26px.
- rgba(255,255,255,.85) text, .85rem, weight 700, flex with an 8px gap, text-shadow 0 1px 8px rgba(0,0,0,.4).
- An 18px cursor-arrow outline icon, then "Psst. Say hi to Bloop."

**Phone and portrait layout** (max-width 900px, or portrait orientation up to max-width 1100px)
- **Hero:** auto height with no min or max. Background: a vertical gradient from teal to teal-2.
- **Media wrapper:** becomes relative (in flow), height 56svh (56vh fallback), min 360px, max 640px.
- **Image:** object-position **79% 50%**.
- **Shade:**
  - linear 180°, rgba(18,58,58,.6) at 0 to transparent at 22%;
  - linear 0° (rising from the bottom): #123A3A at 0%, rgba(18,58,58,.55) at 14%, transparent at 34%.
- **Copy:** becomes relative (in flow, below the photo). Width auto, max 620px, margin-top −34px. Padding 0, gutter left and right, and calc(48px + safe-area-inset-bottom) at the bottom.
- **Hint:** hidden.
- **Below 420px:** the two hero buttons each grow to fill the row, with centred content.

Both object-position values are part of the design. The eye script reads the computed value back (B7.1). For the buyer's photo, adjust both percentages so the face is fully visible and centred-right on desktop and centred on phones, then re-check eye alignment.

#### 3. The habitats (section, id `habitats`, aqua tint)

**Blobs**
- 420px aqua circle at left −120px, top 120px.
- 360px amber circle at right −80px, bottom 60px, opacity .35.

**Head**
- Kicker: "The habitats"
- h2: "Three little worlds, ready to fill."
- Intro: "Every kit arrives aquascaped by hand: rocks set, moss tied, lights wired. Add water, wait a few weeks for it to settle, then welcome your residents."

**Card grid:** 3 equal columns, gap clamp(16px, 2.2vw, 28px).

**Each card**
- An `article`: glass + lift + reveal.
- Padding 18px 18px 26px, flex column.

Card contents, in order:
1. **Art panel:** radius 22px (lg − 10px), vertical gradient #fdf1e4 to #f6e3cf, aspect ratio 1.12, centred content, overflow hidden.
   - The habitat SVG at 86% width, role img with an aria-label.
   - On card hover the SVG moves up 4px and scales to 1.03 (.6s ease-out).
2. **Tags row:** flex, wrapping, 6px gap, margin 16px 8px 0.
3. **h3:** 1.6rem, margin 22px 8px 8px.
4. **Description:** margin 0 8px 22px, teal-soft.
5. **Meta row:**
   - Flex with space-between, items centred, 12px gap. `margin-top: auto` (with 8px side margins) so the price rows of all three cards line up at the bottom.
   - Padding-top 18px, 1px dashed rgba(18,58,58,.18) top border.
   - Left: the price in Fredoka 600 1.5rem, followed by a small "kit" in Nunito 700 .78rem, teal-soft, 4px left margin.
   - Right: a "Customise →" pill link to `#build`. Fredoka 600 .95rem, teal, padding .7em 1em, background rgba(244,138,138,.18), turning rgba(242,180,92,.35) on hover over .25s.

**Cards** (reveal delays 0s, .08s, .16s)

1. **Moss Village**
   - Scene: moss.
   - aria-label "Glass cube with moss mounds and two mushroom cottages".
   - Chips: moss "Beginner-friendly", aqua "20 L".
   - Description: "Two mushroom cottages on soft moss hills, with a winding path for shrimp to patrol. Our coziest starter world."
   - Price: $68. The link preselects theme `moss`.
2. **Lantern Grotto**
   - Scene: lantern.
   - aria-label "Glass cube with a rock arch and a glowing amber lantern".
   - Chips: amber "Warm LED lantern", aqua "20 L".
   - Description: "A hand-carved stone arch hiding a warm little lantern that glows at dusk. Snails love the shady corners."
   - Price: $84. The link preselects `lantern`.
3. **Waterfall Ruins**
   - Scene: ruins.
   - aria-label "Glass cube with a small waterfall and broken stone columns".
   - Chips: aqua "Quiet pump", moss "Showpiece".
   - Description: "Mossy columns from a long-lost temple and a gentle waterfall that keeps the water moving and the bubbles coming."
   - Price: $96. The link preselects `ruins`.

#### 4. Meet the residents (section, id `residents`, no tint)

**Blobs**
- 380px coral circle at right 5%, top 80px, opacity .3.
- 340px aqua circle at left 10%, bottom 40px, opacity .4.

**Head**
- Kicker: "Meet the residents"
- h2: "Who's moving in?"
- Intro: "Every habitat is designed around the creature that will call it home. Here are the quick facts we tell every new keeper."

**Card grid:** 3 columns, same gap as the habitats.

**Each card**
- glass + lift + reveal, padding 30px 28px.
- **Portrait disc:** 108px circle with centred content and 22px below it. Background: a radial gradient at 35% 30% from white to rgba(255,255,255,.4) at 70%. Shadows: an inset 1px rgba(255,255,255,.9) ring plus 0 10px 24px −14px rgba(18,58,58,.4).
- An 80×80 SVG portrait sits on the disc. On card hover it rotates −6° and scales 1.06 (.5s ease-out).
- **h3:** 1.55rem. Then the Latin name in italics, teal-soft, .92rem, 4px above it.

**Fact list**
- No bullets, 20px above it, grid with a 12px gap.
- Each item is a two-column grid (30px icon, then the text) with a 10px gap, top-aligned, .98rem.
- **Icon tile:** 30px, 10px radius, rgba(255,255,255,.7) background, holding an 18px line icon stroked #2f7f7b at width 2.
- Each fact opens with a bold (800) lead phrase, followed by a plain sentence.

**Portraits** (all on an 80×80 viewBox)
- **Axolotl:**
  - Head: an ellipse at (40,44), 23 × 20, #F9C9C3.
  - Gills: three coral strokes per side, width 4, round caps.
  - Eyes: teal, r 3.6, at (31,40) and (49,40), each with a white glint of r 1.2.
  - A teal smile, width 2.4.
  - Cheek blush: coral dots of r 3 at opacity .5, at (25,48) and (55,48).
- **Cherry shrimp:**
  - Body: a thick curved C-shaped stroke in #E5534B, width 13, round caps, from (26,30) arcing round to (50,64).
  - A lighter #F48A8A stroke along its back, width 5, opacity .7.
  - A tail fan in #E5534B.
  - Three short legs in #C9403A.
  - Two antennae in #E26D6D sweeping up from the head.
  - A teal eye of r 3 at (27,30) with a white glint.
- **Nerite snail:**
  - Foot: a long, low shape in #E8C9A6 along the bottom.
  - Two tentacles in #C9A578, each tipped with a teal dot.
  - Shell: a moss circle of r 20 at (36,38) with an amber spiral stroke (width 3) and three dark #2f4f25 stripe marks.

**Cards** (reveal delays 0s, .08s, .16s)

1. **Axolotls**, *Ambystoma mexicanum*
   - Thermometer icon. "**Cool water, 16–20 °C.** Warm rooms stress them; a small fan helps in summer."
   - Tank icon (rounded rectangle with a line). "**Room to roam: 75 L+.** They need our Grand size, never a nano tank."
   - Pebbles icon (three circles). "**Fine sand or bare floor.** They gulp gravel while feeding."
2. **Cherry shrimp**, *Neocaridina davidi*
   - Thermometer icon. "**Happy at 20–26 °C.** A stable room temperature is plenty."
   - Leaf/drop icon. "**Busy grazers.** They snack on algae and biofilm all day long."
   - Flask icon. "**No copper, ever.** Check plant fertilisers and meds first."
3. **Nerite snails**, *Neritina spp.*
   - Diagonal arrow icon. "**Algae cleaners.** They polish glass and rocks without touching plants."
   - Arrow-in-box icon. "**Keep the lid on.** They like to go exploring outside the tank."
   - Three-dots icon. "**No population boom.** Eggs need brackish water to hatch."

**Note under the grid** (reveal)
- 28px above it, .95rem, teal-soft, flex with a 10px gap, items centred.
- A 20px moss info-circle icon, then: "Axolotls see shrimp and snails as snacks, so they get a habitat of their own."

#### 5. How it's made (section, id `made`, aqua tint)

**Head:** kicker "How it's made", h2 "From sketchbook to your shelf." (no intro).

**Steps list**
- An ordered list with no markers: 3 equal columns, same gap as the card grids, relative.
- A connector line runs behind the steps: a 2px dashed rgba(94,139,74,.4) top border from 12% to 88% of the width, 62px from the top, z-index −1.

**Each step**
- Centred text, padding 0 12px, reveal (delays 0s, .1s, .2s).
- **Icon tile:** glass, 124px square, 38px radius, centred, 22px below it. It holds a 58px icon (64×64 viewBox, teal strokes, width 3, round caps and joins).
- **Label:** "Step N" in Fredoka 600 .85rem, letter-spacing .12em, uppercase, moss.
- **h3:** 1.6rem, margin 8px 0 10px.
- **Paragraph:** teal-soft, max-width 30ch, centred.

**Step content**
1. **Design**
   - Icon: a cream sketch card (rounded rectangle) with three text lines and a coral pencil across its corner.
   - Text: "Every world starts as a sketch: a story, a creature in mind, and a layout that leaves room to swim."
2. **Build**
   - Icon: a mound with a sprouting stem and two moss-filled leaves, over a ground line.
   - Text: "We set the stone, tie the moss and plant every stem by hand, then let each tank settle for a week."
3. **Ship**
   - Icon: an isometric box with an amber fill at opacity .35 and a small coral heart on its top.
   - Text: "Packed in recyclable padding with live plants kept moist, plus a care card in the box."

#### 6. Build your own (section, id `build`, no tint)

**Blobs**
- 420px amber circle at left −100px, top 200px, opacity .32.
- 400px aqua circle at right −60px, top 40px, opacity .4.

**Head**
- Kicker: "Build your own"
- h2: "Design a world, one choice at a time."
- Intro: "Pick a size, a story and some greenery. Your estimate updates as you go."

**Form** (id `builder`)
- A two-column grid at 1.25fr and .9fr, gap clamp(18px, 3vw, 40px), items aligned to the start.

**Left: the picker** (glass, reveal)
- Padding clamp(22px, 3vw, 36px), a grid with 30px gaps, holding three fieldsets (no border, margin or padding, min-width 0).
- **Legends:** Fredoka 600 1.2rem, 14px below. The plants legend adds a small "pick any" in Nunito 700 .8rem, teal-soft, baseline-aligned with a 10px gap.
- **Option grids:** 3 columns with 10px gaps; the plants grid has 2 columns.

**Option element**
- A relative wrapper holding an input and its label.
- **Input:** absolutely fills the wrapper with z-index 2, opacity 0, 100% width and height, pointer cursor.
  - **Critical:** the input must stay above the label. The label scales on press, and if the label rises above the input, the press starts on one element and ends on another, and the click is lost.
- **Label:** a flex column with a 4px gap, full height, padding 14px 14px 13px, 22px radius.
  - Background rgba(255,255,255,.6), inset 1.5px rgba(18,58,58,.1) ring.
  - Transitions: box-shadow and background .2s, transform .2s ease-out.
- **Label contents:**
  - Name: a bold line in Fredoka 600 1.05rem, line-height 1.15.
  - Note: .85rem, teal-soft, line-height 1.35.
  - Price: weight 800, .85rem, pushed to the bottom with auto top margin and 6px top padding. Shown as "$48" for sizes and "+$20" for themes and plants.
- **Checked:** white background, an inset 2px coral ring and 0 8px 22px −12px rgba(244,138,138,.8).
- **Hover (hover-capable devices only):** an inset 1.5px amber ring and 0 0 22px −6px rgba(242,180,92,.6).
- **Keyboard focus:** a 3px amber outline at 2px offset on the label.
- **Pressed:** the label scales to .98.

**Plant options**
- The label becomes a row, items centred, 12px gap, with the price pushed to the far right.
- It starts with a 22px checkbox square: 8px radius, inset 1.5px rgba(18,58,58,.25) ring.
- The square holds a 14px white tick (stroke width 2.6) at opacity 0 and scale .6.
- When checked, the square fills moss with no ring, and the tick fades in (.2s) and scales to 1 (.25s ease-out).

**Options** (render them from JS data arrays)

Sizes (radio `size`):

| id | Name | Note | Price | Preview scale |
|---|---|---|---|---|
| nano | Nano | 10 L · shrimp & snails | 48 | .8 |
| cozy | Cozy | 30 L · a busy colony | 78 | .9 |
| grand | Grand | 80 L · axolotl-ready | 148 | 1 |

Cozy is selected by default.

Themes (radio `theme`):

| id | Name | Note | Price |
|---|---|---|---|
| moss | Moss Village | Mushroom cottages | +20 |
| lantern | Lantern Grotto | Stone arch + LED glow | +36 |
| ruins | Waterfall Ruins | Columns + quiet pump | +48 |

Moss Village is selected by default.

Plants (checkbox `plants`, no notes):

| id | Name | Price |
|---|---|---|
| javamoss | Java moss | +6 |
| anubias | Anubias nana | +9 |
| frogbit | Floating frogbit | +5 |
| crypt | Cryptocoryne | +8 |

Java moss is ticked by default.

Input ids follow the pattern group-id, for example `size-grand`, `theme-lantern`, `plants-crypt`.

**Right: the summary** (an `aside`, glass, reveal delay .1s, aria-live polite)
- Padding clamp(22px, 3vw, 32px). Sticky at top 96px.
- **Preview panel:** 22px radius, vertical gradient #fdf1e4 to #f3dcc4, aspect ratio 1.35, centred, overflow hidden, 22px below it.
  - It holds the habitat SVG at 62% width, role img, aria-label "Preview of your habitat". The scene `use` element can be swapped.
  - Transform transition .5s ease-out.
- **h3:** "Your habitat", 1.4rem, 12px below.
- **Description list:** a grid with 8px gaps. Each row is flex with space-between, a 12px gap and .96rem text; the term is in teal-soft and the value is weight 700 and right-aligned.
- **Total row:**
  - Flex with space-between, baseline-aligned. Margin 18px 0 20px, padding-top 16px, 1px dashed rgba(18,58,58,.2) top border.
  - "Estimated total" in weight 800, then an `output` in Fredoka 600 2.2rem.
  - **Bump animation:** .35s ease-out, scaling to 1.08 at 40% and back.
- **Submit button:** a full-width coral button, centred content: "Request this build" with an arrow icon.
- **Message paragraph** below it: 12px above, .9rem, teal-soft, min-height 1.4em.

#### 7. Footer (id-less `footer`, "deep water")

**Container**
- Relative, overflow hidden, cream text.
- Padding clamp(80px, 10vw, 130px) at the top and 36px at the bottom; margin-top clamp(40px, 6vw, 80px).
- Top corners rounded clamp(32px, 5vw, 64px); bottom corners square.
- Background, two layers:
  - a radial glow 90% × 60% at 20% 0%, rgba(127,207,203,.18) fading to transparent at 60%;
  - a linear 180° gradient: #164646 at 0%, teal at 40%, teal-2 at 100%.
- **Bubble layer:** absolute, fills the footer, no pointer events, aria-hidden.

**Grid**
- Two columns at 1.3fr and 1fr, gap clamp(36px, 6vw, 80px), items aligned to the end (bottom).

**Left column**
- **h2:** "Letters from the deep end." at clamp(2rem, 4vw, 3.1rem).
- **Paragraph:** rgba(255,246,236,.78), 14px above, max-width 34em: "New habitats, care tips and the occasional photo of a very smug axolotl. One email a month, no more."
- **Newsletter form** (no native validation popups):
  - A pill row with an 8px gap, 26px above it, 6px padding, max-width 480px.
  - Background rgba(255,255,255,.08), inset 1px rgba(255,255,255,.16) ring. When anything inside has focus, the ring becomes inset 2px amber.
  - A visually hidden label: "Email address".
  - **Email input:** required, type email, autocomplete email, placeholder "you@example.com".
    - Transparent, no border or outline, white text in Nunito 600 1rem, padding 0 16px. It grows to fill the row (min-width 0).
    - Placeholder colour rgba(255,246,236,.55).
  - A coral "Subscribe" button that does not shrink.
- **Status paragraph:** role status, min-height 1.5em, 10px above, .92rem, aqua.

**Right column**
- A grid with a 22px gap, items aligned to the start.
- **Social links:** a row of four, 10px gap, wrapping. Each is a 48px square with a 16px radius.
  - Background rgba(255,255,255,.08), inset 1px rgba(255,255,255,.14) ring.
  - Transitions over .3s: transform (ease-out), background and shadow.
  - Hover: background rgba(242,180,92,.18), inset 1px rgba(242,180,92,.6) ring plus 0 0 24px −4px rgba(242,180,92,.55), and a 3px rise.
  - Each holds a 22px outline icon (stroke width 1.8, currentColor). In order:
    - Photos: a rounded square, a circle and a dot.
    - Music: a note shape.
    - Video: a rounded rectangle with a filled play triangle.
    - Ideas: a circle with a pin.
  - The aria-labels are the buyer's social networks (Photos, Music, Video, Ideas as placeholders). The hrefs are `#` placeholders.
- **Footer nav** (aria-label "Footer"):
  - Flex, wrapping, gaps 6px by 22px. Links in weight 700, opacity .85; on hover, opacity 1 and amber.
  - Links: "Habitats", "Residents", "How it's made", "Build your own" (to the four section anchors).

**Legal row**
- Flex with space-between, wrapping, 12px gap. margin-top clamp(56px, 8vw, 96px), padding-top 22px, 1px rgba(255,255,255,.1) top border, .85rem, rgba(255,246,236,.6).
- Left: "© 2026 Little Gills Studio. A fictional brand."
- Right: "Made with moss, glass and a lot of patience."

**Debug panel**
- At the end of the body, aria-hidden. Fixed at left 12px and bottom 12px, z-index 100.
- max-width min(420px, 100vw − 24px), padding 12px 14px, 12px radius.
- Background rgba(0,0,0,.82), text #c8ffd9, 12px monospace at line-height 1.5, pre-wrap.
- Shown only in debug mode.

### B7. Behaviour

All script runs in one immediately-invoked function after the `CONFIG` object. One media query object tracks `prefers-reduced-motion: reduce`. `rand(a, b)` returns a uniform random number between a and b.

**CONFIG** (the top of the script, under a clear comment banner that explains debug mode and its keys):
- `image`: `{ width, height }`, read from the buyer's file.
- `eyes`: a list of `{ name, cx, cy, w, h, rot }`, measured in B4.
- `blinkEvery`: [2600, 6000] ms
- `doubleBlink`: 0.18
- `blinkClose`: 120 ms
- `blinkOpen`: 150 ms

#### B7.1 Eye placement (object-fit cover maths)

Run on image load and whenever the image box resizes (a ResizeObserver on the image).
1. Let W and H be the image element's client size; return if either is 0.
2. The scale is s = max(W ÷ image width, H ÷ image height).
3. Read the image's **computed** object-position. Split it into two percentages and divide each by 100 to get px and py (use .5 if a value doesn't parse).
4. Offsets: ox = (W − width × s) × px and oy = (H − height × s) × py.
5. For each eye:
   - The rendered width is w × s and the height is h × s.
   - The rendered centre is (ox + cx × s, oy + cy × s), relative to the image box.
   - Set the eye element's width and height to the rendered size.
   - Set its font-size to min(rendered w, rendered h) ÷ 10 px. This scales the em-based lid shadows.
   - Set its transform to a translate of (centre x − w/2, centre y − h/2), then rotate(rot degrees).
   - Set a data label: the name, cx, cy, w, h and rot. Debug mode shows it.
6. If debug mode is on, refresh the panel.

#### B7.2 Blink

- **One blink** animates every lid at once, using the Web Animations API (transform only).
  - The total duration is blinkClose + blinkOpen, 270 ms.
  - Keyframe 1: translateY(−104%), easing cubic-bezier(.5, 0, .9, .6).
  - Keyframe 2: translateY(0), at offset blinkClose ÷ total (≈ .444), easing cubic-bezier(.2, .4, .4, 1).
  - Keyframe 3: translateY(−104%).
- **Schedule:**
  - Each scheduling call first clears the pending timer.
  - If the hero is visible (an IntersectionObserver on the hero section) and reduced motion is off, set a timeout for rand(2600, 6000) ms. When it fires, blink. With probability doubleBlink, blink again after (total + 90) ms. Then schedule the next one.
  - Re-schedule when the hero's visibility changes and when the reduced-motion preference changes.
- **On pointerdown** on the hero media wrapper (unless reduced motion): blink at once, then re-schedule.
- **Debug mode:**
  - Toggle the class `is-debug` on the body with D or d. Ignore keys typed in inputs, textareas, selects or contenteditable elements, and keys pressed with meta, ctrl or alt.
  - In debug mode, each eye gets a 1.5px dashed #39ff88 outline at a 2px offset, and a 14px green crosshair at its centre.
  - Its label appears to the right of the eye: 11px bold monospace, #39ff88 on rgba(0,0,0,.7), padding 3px 6px, 6px radius.
  - The panel shows:
    - "EYE DEBUG  (D to close)";
    - the selected eye's number and name;
    - its cx, cy, w, h and rot;
    - its rendered centre and radii in px, to 1 decimal;
    - the key legend.
  - **Keys:**
    - 1 or 2 select an eye.
    - Arrow keys move cx and cy by 1 (10 with Shift).
    - [ and ] change w; ; and ' change h; , and . change rot.
    - B blinks.
    - C logs the eyes array as formatted JSON to the console.
  - Every handled key prevents the default action, re-runs the layout and refreshes the panel.

#### B7.3 Hero and footer bubbles (CSS keyframes)

Each bubble is a span:
- Absolute, starting 30px below the bottom of its layer, round.
- Size, left position, duration, delay and sway come from inline custom properties set by JS.
- Background: a radial gradient at 32% 30%: white at .95 to 10%, rgba(255,255,255,.18) at 24%, rgba(127,207,203,.08) at 60%, rgba(255,255,255,.45) at 100%.
- An inset 1px rgba(255,255,255,.4) ring. Starting opacity 0.
- A linear, infinite **rise** animation (transform and opacity only):
  - 0%: no offset, opacity 0.
  - 10%: opacity .85.
  - 50%: translated (sway, −55vh).
  - 90%: opacity .7.
  - 100%: translated (0, −110vh), opacity 0.

The generator takes a count and options (min and max size, min and max duration). For each bubble it sets:
- size = rand(min, max) px;
- left = rand(2, 98)%;
- duration = rand(dMin, dMax) s;
- delay = −rand(0, dMax) s (negative, so bubbles are already mid-flight on load);
- sway = rand(−28, 28) px;
- park = rand(10, 80) vh.

The values are rounded (one decimal for size, left, duration and delay; whole numbers for sway and park). Counts are decided once at load, by whether the window is narrower than 700px:
- **Hero, small:** 16 (narrow) or 34, sizes 6–30 px, durations 8–18 s.
- **Hero, big:** 3 (narrow) or 6, sizes 34–60 px, durations 14–24 s.
- **Footer:** 18 (narrow) or 34, sizes 6–40 px, durations 10–22 s.

**Reduced motion:** no animation, opacity .5, each bubble parked at translateY(−park).

#### B7.4 Page bubbles (scroll-driven) and hero parallax

**Page bubbles**
- 14 (narrow) or 26 bubbles in the fixed scroll layer. Each has:
  - depth = rand(.15, .6);
  - size = 8 + depth × 52 px;
  - opacity = .25 + depth × .6;
  - x = rand(0, 100) (percent of viewport width), y0 = rand(0, 1), sway = rand(8, 26) px, phase = rand(0, 6.28).
- Look: a radial gradient at 32% 30%, rgba(255,255,255,.9) to 9%, rgba(127,207,203,.12) at 40%, rgba(127,207,203,.32) at 100%. An inset 1px rgba(95,175,170,.35) ring. will-change transform.

**Placement function**
- It runs on load, on resize, and on scroll, throttled to one requestAnimationFrame per frame with a "ticking" flag; the scroll listener is passive.
- **Hero parallax:**
  - hy = min(scrollY, hero height), or 0 under reduced motion.
  - The hero media wrapper moves translate3d(0, hy × .35, 0).
  - The hero bubble layer moves translate3d(0, hy × −.25, 0).
  - The hero copy moves translate3d(0, hy × .12, 0).
- **Page bubbles:**
  - vh = viewport height + 80, sy = scrollY (or 0 under reduced motion).
  - For each bubble: y = (y0 × vh − sy × depth) mod vh, made positive by adding vh if needed.
  - x = x% × viewport width + sin(sy × .004 + phase) × sway.
  - Its transform is translate3d(x, y − 40, 0).
  - Bubbles drift upward at their own depth as you scroll down and wrap around the viewport.

#### B7.5 Nav and reveals

- **Nav:** an IntersectionObserver on the hero with root margin −72px at the top adds `is-solid` to the nav while the hero is **not** intersecting.
- **Reveal:**
  - Under the `js` class, elements with `.reveal` start at opacity 0 and translateY(22px), with .8s ease-out transitions on opacity and transform and a per-element delay (the `--rd` custom property, default 0s).
  - An IntersectionObserver (threshold .12, root margin 0 0 −40px 0) adds the class `in` once (opacity 1, no transform) and then stops observing that element.
  - Reveal elements: the three section heads (habitats, residents, how it's made), the build head, the six cards, the note, the three steps, the picker and the summary.

#### B7.6 Builder

- Render the three option groups from the data arrays, with the defaults above.
- **Update** (on every form change):
  - Read the form values. total = size price + theme price + the sum of the ticked plant prices.
  - Rewrite the description list:
    - "Tank": the size name, a comma, then the part of the note before " · " (for example "Cozy, 30 L").
    - "Theme": the theme name.
    - "Plants": the ticked names joined with ", ", or "None yet".
    - "Ships in": "2–3 weeks" for grand, otherwise "5–8 days".
  - Write the total as "$" + total.
  - If the total changed since the last update (not on the first run) and reduced motion is off, restart the bump animation: remove the class, force a reflow, add it again.
  - Point the preview's scene reference at the chosen theme's scene, and set the preview SVG's transform to scale(size scale).
  - Clear the build message.
- **Submit:** prevent the default and show "Lovely choice! This is a demo studio, so no order was placed." (replace this with a real checkout or endpoint later).
- **"Customise →" links:** on click, check the matching theme radio and run update. The anchor then scrolls to `#build`.
- Run update once on load. The defaults give **$104** (78 + 20 + 6).

#### B7.7 Newsletter

- On submit, prevent the default.
- If the email field fails the browser's validity check, show "That email looks a little off. Mind checking it?" and focus the field.
- Otherwise show "You're on the list. Bloop says hi. (Demo: nothing was sent.)" and reset the form.

### B8. Responsive

| Breakpoint | Changes |
|---|---|
| ≤ 980px | Habitat and resident grids become 2 columns. The last card in each spans both columns and is centred at max-width calc(50% − 10px). The builder becomes a single column, and the summary is no longer sticky (relative, top 0). The footer grid becomes a single column with items aligned to the start. |
| ≤ 900px, or portrait ≤ 1100px | The phone hero layout from section 2. |
| ≤ 860px | The nav links are hidden. |
| ≤ 680px | Body text 16px. Habitats, residents and steps become 1 column (the last cards lose their max-width). Step gap 44px; the dashed connector is hidden. All option grids become 1 column. The nav button shows its plus icon only, and the nav's left padding becomes 14px. |
| ≤ 420px | The hero buttons stretch to fill the row. |
| hover: hover | All hover lifts and glows apply only on devices that can hover. |

### B9. Accessibility and quality

**Landmarks and labels**
- Landmarks: header (with the "Main" nav), a labelled hero section, `main`, and a `footer` with the "Footer" nav.
- Bubble layers, the eyes layer, decorative SVGs and the debug panel are aria-hidden. Each habitat SVG has role img and a descriptive aria-label.

**Forms**
- The newsletter label is visually hidden; the builder uses real fieldsets and legends.
- The summary is aria-live polite. The newsletter status has role status.

**Keyboard and screen readers**
- Options are real radios and checkboxes, so they work with the keyboard; focus is shown on their labels.
- Every icon-only link has an aria-label.

**Reduced motion**
- No blinking, no bubble animation (bubbles parked), no parallax, no scroll drift, no bump.
- Reveals appear immediately with no transition.
- No transitions on lifts, buttons or habitat art. Smooth scrolling is off.

**Performance**
- Animate only transform and opacity: bubbles, lids, parallax, reveals and glows. The glows animate the opacity of a pre-drawn shadow layer.
- Use passive scroll, touch and pointer listeners. Throttle scroll work with requestAnimationFrame.
- The blink timer only runs while the hero is visible.

**Honesty**
- The page states it is a fictional brand (legal line) and that orders and emails are demos (messages). Keep these until real endpoints exist.
- The social links are `#` placeholders, marked with a TEMP comment.

### B10. Verification checklist (check in a real browser before saying it's done)

1. **Eyes:** at 1440×900 and 375×812, turn on debug mode (D) and confirm each lid's crosshair is on the eye's centre. Force a lid to translateY(0) and confirm it fully covers the painted eye with no dark sliver. Then check it at −40% (half-closed) and −104% (fully open).
2. **Blinking:** it happens on its own every 2.6–6 s while the hero is on screen, and on a click or tap on the photo. It stops with reduced motion.
3. **Phone layout:** at 375px the whole face is visible in the top photo, and the headline sits **below** the face, never over it.
4. **No horizontal scroll** at 375, 768, 1366 and 1920: the document's scroll width equals the viewport width (blobs must be clipped).
5. **Parallax:** scrolling 350px moves the hero media by about 122px. Page bubbles drift and wrap smoothly.
6. **Builder, with real mouse clicks** (not scripted clicks): Grand, plus Cryptocoryne on top of the defaults, gives "Grand, 80 L", "Java moss, Cryptocoryne", "2–3 weeks" and **$182**. Each "Customise →" switches the theme and the preview scene.
7. **Habitat cards:** all three price rows sit at the same height whatever the length of the descriptions.
8. **Nav:** it turns cream ("solid") once you scroll past the hero.
9. **Newsletter:** an invalid email shows the error and focuses the field; a valid one shows the thanks message and clears the form.
10. **Console:** no errors and no 404s (the favicon is inline).

---

## Appendix — Optional: recreate the original hero image

Only needed if you want the demo's look. The original is the client's own image. Generate your own with these prompts, then save the result as `assets/hero.png` (Part A, hero slot).

**Shared style block**
> Photoreal, warm golden-hour light from the upper right, shallow depth of field, ultra-detailed, cozy fantasy miniature aesthetic, a 16:9 wide shot taken from just below the waterline at the front glass of a low aquarium, with the water surface line crossing the upper third of the frame. Soft bokeh lanterns and green leaves above the water. Saturated but natural colours: blush pink, aqua water, moss green, warm amber. No text, no logos, no watermark.

**Hero (slot: `assets/hero.*`)**
> [Style block] A cheerful pink leucistic axolotl, right of centre, facing the camera with a wide open-mouthed smile and one front hand raised in a wave. Feathery coral-pink gills fan out on both sides of its head. It has big glossy, dark blue, wet-looking eyes, each with a clear specular highlight; the eyes are fully open and clearly separated, the viewer's-left eye slightly higher than the right. Inside the tank: mossy driftwood on the left, a small stone hut with round windows and moss on top in the lower left, pebbles and fine sand on the floor, a moss-covered stone arch on the right, and small bubbles in the water. Above the water: a little waterfall upper-left and a glowing fairy-house lantern upper-right. The upper-left area is calm, darker foliage, leaving room for a headline.

**Tips**
- Generate at 2400×1350 or larger.
- Keep both eyes unobstructed (no gills, bubbles or hands in front of them) so the blinking lids fit.
- After saving, run the media step (B4) to re-measure the eyes.
