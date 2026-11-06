# Prompt: recreate the Ardent Build landing page 1:1

Paste everything below into a coding agent, with the input files from section 2 in the working folder.

---

You are rebuilding an existing website exactly. This is a reproduction, not a design task. Do not redesign, modernise, tidy, rename, reformat, add libraries or "improve" anything. Every design decision is already made and embedded below. If something looks odd, it is deliberate: section 6 lists the reasons.

The result is a static site with no build step and no dependencies, in a folder named `site/`.

## 1. How to work

1. Check every input in section 2. If a file is missing or its hash differs, stop and tell me which one. Do not substitute a similar file.
2. Write each file in section 5 to its stated path, byte for byte. Keep all text, comments, class names and attribute order. Do not retype from memory.
3. Save the script in section 3 as `make-assets.py` and run it from the project root. It builds the film frames and the images. It is slow, so run it in the background.
4. Serve `site/` over HTTP (for example `python -m http.server 8800 --directory site`). It will not work from `file://`, because it uses ES modules and `fetch`.
5. Run every check in section 7 and report each result. Say plainly if one fails, and never claim a check you did not run.

Use Python 3 with Pillow and numpy, and ffmpeg 7 or newer with libwebp.

## 2. Inputs

Hashes are the first 16 characters of SHA-256.

| Path | Bytes | SHA-256 | What it is | Source |
|---|---|---|---|---|
| `assets/building-video.mp4` | 14,095,615 | `0226b2195168e453` | The build film: 1916×1080, 24 fps, 241 frames, H.264 yuv420p, BT.709 limited range | Client file |
| `assets/start.png` | 1,886,549 | `f1f5c2f72c138ccc` | Stage 1 still | Client file |
| `assets/middle1.png` | 2,389,572 | `979c3fa026ec0b38` | Stage 2 still | Client file |
| `assets/middle2.png` | 2,654,792 | `42f353c336420d42` | Stage 3 still | Client file |
| `assets/end.png` | 2,369,920 | `7ac2fa7b29343acc` | Stage 4 still, and the source of the drawing | Client file |
| `assets/stock/brasov-quarter.jpg` | 3,894,185 | `a0921c08f20f14a3` | Sample photo: Pl71, CC0 | https://upload.wikimedia.org/wikipedia/commons/0/0d/Brasov_Coresi_Quarter.jpg |
| `assets/stock/bucharest-aerial.jpg` | 7,302,703 | `6eecc82c7b10cba1` | Sample photo: Atria Urban Resort, CC BY-SA 4.0 | https://upload.wikimedia.org/wikipedia/commons/5/58/Atria_Urban_Resort_vedere_de_ansamblu.jpg |
| `assets/stock/bucharest-courtyard.jpg` | 3,238,084 | `9ae25cf2544c1342` | Sample photo: SPEEDWELL Development, CC BY-SA 4.0 | https://upload.wikimedia.org/wikipedia/commons/2/27/THE-IVY-BUCURESTI-BANEASA-ANSAMBLU-VERDE.jpg |
| `assets/stock/bucharest-residential.jpg` | 8,801,477 | `63c747064fe2cf14` | Sample photo: Atria Urban Resort, CC BY-SA 4.0 | https://upload.wikimedia.org/wikipedia/commons/7/74/Atria_Urban_Resort_Faza_2.jpg |
| `assets/stock/iasi-mixed.jpg` | 4,244,416 | `81a8f31b7f7258c8` | Sample photo: Argenna, CC BY-SA 4.0 | https://upload.wikimedia.org/wikipedia/commons/a/ad/Iasi%2C_Public_Garden_Palas_14.jpg |
| `assets/stock/timisoara-offices.jpg` | 309,816 | `7da477f1d9943b85` | Sample photo: Irimia florin, CC BY-SA 4.0 | https://upload.wikimedia.org/wikipedia/commons/1/12/City_Business_Center_Timi%C8%99oara_2022.jpg |
| `site/img/projects/bucharest-aerial.webp` | 2,565,620 | `4d6e55483ca8e4b5` | Keep this exact file. No encoder setting reproduces it | Existing build |
| `site/fonts/archivo-latin.woff2` | 89,912 | `12020a6fdc33535b` | Archivo variable: weight 100 to 900, width 62 to 125 %, Latin | Existing build |
| `site/fonts/archivo-latin-ext.woff2` | 84,800 | `6d45d923963845fa` | Same, Latin Extended, needed for ă, ș, ț | Existing build |
| `site/fonts/Archivo-OFL.txt` | 4,314 | `18aabf190848725e` | SIL Open Font License text | Existing build |

## 3. Asset script

Save as `make-assets.py`. The frame recipe was tested against the original frames: the flags below give identical pixels, and other scalers do not.

`````python
"""Builds every generated asset in site/ from assets/. Run from the project root. Needs ffmpeg 7+ with libwebp, and Python with Pillow and numpy.
   Film frames: every source frame, native size, exact BT.709, full chroma, lossless WebP. Slow: expect many minutes."""
import glob, json, os, shutil, subprocess
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageFilter

VIDEO = 'assets/building-video.mp4'
W, H, FRAMES = 1916, 1080, 241
FRAME_DIR, PHONE_DIR = 'site/frames', 'site/frames/mobile'
SIDE = 1080
X0 = round(.86 * (W - SIDE))  # the slice phones show: object-position 86 %
# lanczos is required: with these flags and no resize it gives the exact pixels, the other scalers do not
VF = 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp,format=rgb24'


def lossless(a):
    i, raw = a
    p = f'{FRAME_DIR}/seq_{i + 1:04d}.webp'
    Image.frombuffer('RGB', (W, H), raw, 'raw', 'RGB', 0, 1).save(p, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    return os.path.getsize(p)


def phone(i):
    src, dst = f'{FRAME_DIR}/seq_{i + 1:04d}.webp', f'{PHONE_DIR}/seq_{i + 1:04d}.webp'
    Image.open(src).convert('RGB').crop((X0, 0, X0 + SIDE, SIDE)).save(dst, 'WEBP', quality=84, method=6, sharp_yuv=True)
    return os.path.getsize(dst)


def film():
    os.makedirs(PHONE_DIR, exist_ok=True)
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', VIDEO, '-vf', VF, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    size = W * H * 3
    jobs = ((i, proc.stdout.read(size)) for i in range(FRAMES))
    with ProcessPoolExecutor(max_workers=max(2, (os.cpu_count() or 4) // 2)) as ex:
        sizes = list(ex.map(lossless, jobs, chunksize=1))
    proc.wait()
    names = [f'seq_{i + 1:04d}.webp' for i in range(FRAMES)]
    json.dump({'schema': 'darkroom-frames-v1', 'source': VIDEO, 'engine': 'ffmpeg',
               'encoding': 'webp lossless (compression 6), native resolution, every source frame, exact BT.709 with full chroma',
               'fps': 24, 'count': FRAMES, 'width': W, 'height': H, 'format': 'webp', 'pattern': 'seq_%04d.webp', 'poster': 'seq_0001.webp',
               'totalBytes': sum(sizes), 'frames': [{'file': n, 'bytes': s} for n, s in zip(names, sizes)],
               'mobile': 'mobile/manifest.json'}, open(f'{FRAME_DIR}/manifest.json', 'w', encoding='utf8'))
    with ProcessPoolExecutor() as ex:
        small = list(ex.map(phone, range(FRAMES)))
    json.dump({'schema': 'darkroom-frames-v1', 'source': 'site/frames (lossless)', 'engine': 'pillow',
               'encoding': f'square crop at native pixels, x {X0}, no resize, webp q84', 'fps': 24, 'count': FRAMES,
               'width': SIDE, 'height': SIDE, 'format': 'webp', 'pattern': 'seq_%04d.webp', 'poster': 'seq_0001.webp',
               'totalBytes': sum(small), 'frames': [{'file': n, 'bytes': s} for n, s in zip(names, small)]},
              open(f'{PHONE_DIR}/manifest.json', 'w', encoding='utf8'))


def stills():
    os.makedirs('site/img/projects', exist_ok=True)
    for n in ('start', 'middle1', 'middle2', 'end'):
        shutil.copyfile(f'assets/{n}.png', f'site/img/{n}.png')
    # the "as drawn" plate: edges of the finished photo, ink on paper, pixel-aligned with it
    a = np.asarray(Image.open('assets/end.png').convert('L').filter(ImageFilter.GaussianBlur(.7)), float)
    gx = np.abs(np.diff(a, axis=1, prepend=a[:, :1])); gy = np.abs(np.diff(a, axis=0, prepend=a[:1]))
    e = np.clip((np.hypot(gx, gy) - 9) / 26, 0, 1)
    ink, paper = np.array([29, 32, 35.]), np.array([246, 245, 242.])
    Image.fromarray((paper + (ink - paper) * e[..., None] * .92).astype('uint8')).save('site/img/drawn.webp', quality=90, method=6)
    for src in glob.glob('assets/stock/*.jpg'):
        name = os.path.splitext(os.path.basename(src))[0]
        if name == 'bucharest-aerial':  # supplied as a finished file: no encoder setting reproduces it
            continue
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', "scale='min(2400,iw)':-2:flags=bicubic", '-c:v', 'libwebp', '-quality', '90',
                        f'site/img/projects/{name}.webp'], check=True)


if __name__ == '__main__':
    stills()
    film()
    print('assets built')
`````

## 4. Final folder

```
site/
  index.html
  css/   fonts.css  nav.css  reveal.css  site.css
  js/    main.js  nav.js  reveal.js  scrub-frames.js
  fonts/ archivo-latin.woff2  archivo-latin-ext.woff2  Archivo-OFL.txt
  frames/
    manifest.json                241 frames, lossless, 1916×1080, about 333 MB
    seq_0001.webp … seq_0241.webp
    mobile/
      manifest.json              241 frames, 1080×1080 native-pixel crop, WebP q84, about 28 MB
      seq_0001.webp … seq_0241.webp
  img/
    start.png  middle1.png  middle2.png  end.png  drawn.webp
    projects/  CREDITS.json  brasov-quarter.webp  bucharest-aerial.webp  bucharest-courtyard.webp
               bucharest-residential.webp  iasi-mixed.webp  timisoara-offices.webp
```

## 5. Files, verbatim

### FILE: site/index.html

`````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Ardent Build | General contractor across Romania</title>
  <meta name="description" content="Ardent Build is a general contractor for residential and mixed-use buildings across Romania. One fixed-price contract, from bare plot to keys.">
  <meta name="theme-color" content="#f6f5f2">
  <meta property="og:title" content="Ardent Build: built exactly as drawn">
  <meta property="og:description" content="One fixed-price contract, from bare plot to keys, anywhere in Romania.">
  <meta property="og:image" content="img/end.png">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231d2023'/%3E%3Cpath d='M6 25h20M16 23 9 9h14z' fill='none' stroke='%23f6f5f2' stroke-width='2.4'/%3E%3C/svg%3E">
  <script>document.documentElement.classList.add('js')</script>
  <link rel="preload" href="fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="frames/seq_0001.webp" as="image" fetchpriority="high" media="(min-width: 641px)">
  <link rel="preload" href="frames/mobile/seq_0001.webp" as="image" fetchpriority="high" media="(max-width: 640px)">
  <link rel="stylesheet" href="css/fonts.css">
  <link rel="stylesheet" href="css/nav.css">
  <link rel="stylesheet" href="css/reveal.css">
  <link rel="stylesheet" href="css/site.css">
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="i-chev" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
    <symbol id="i-chev-l" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
    <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></symbol>
    <symbol id="i-home" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></symbol>
    <symbol id="i-building" viewBox="0 0 24 24"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></symbol>
    <symbol id="i-warehouse" viewBox="0 0 24 24"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></symbol>
    <symbol id="i-layers" viewBox="0 0 24 24"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></symbol>
    <symbol id="i-ruler" viewBox="0 0 24 24"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></symbol>
    <symbol id="i-file" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></symbol>
    <symbol id="i-camera" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>
    <symbol id="i-key" viewBox="0 0 24 24"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></symbol>
    <symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></symbol>
    <symbol id="i-level" viewBox="0 0 22 18"><path d="M0 17h22M11 16 3 2h16z" fill="none" stroke="currentColor" stroke-width="2"/></symbol><symbol id="i-level-solid" viewBox="0 0 22 18"><path d="M11 16 3 2h16z" fill="currentColor"/></symbol>
  </svg>
  <a class="skip" href="#main">Skip to content</a>

  <header class="nav is-over" data-nav data-nav-style="overlay">
    <a class="nav-mark" href="#top" aria-label="Ardent Build, back to top"><svg class="mark" aria-hidden="true"><use href="#i-level"/></svg><span>Ardent</span></a>
    <nav aria-label="Main">
      <ul class="nav-links" id="nav-panel" data-nav-panel>
        <li><a href="#method">Method</a></li>
        <li><a href="#buildings">Buildings</a></li>
        <li><a href="#romania">Romania</a></li>
        <li><a href="#projects">Projects</a></li>
        <li class="nav-panel-cta"><a href="#enquire">Discuss a project</a></li>
      </ul>
    </nav>
    <a class="btn nav-cta" href="#enquire">Discuss a project</a>
    <button class="nav-burger" type="button" aria-controls="nav-panel" aria-expanded="false" data-nav-toggle hidden><span class="nav-burger-lines" aria-hidden="true"></span><span class="nav-sr">Menu</span></button>
  </header>

  <main id="main">
    <section class="film" id="top" aria-labelledby="hero-title">
      <div class="film-track" aria-hidden="true"></div><div class="film-cover" aria-hidden="true"></div>
      <div class="film-stage">
        <div class="film-frame skel">
          <picture><source media="(max-width: 640px)" srcset="frames/mobile/seq_0001.webp" width="1080" height="1080"><img class="film-poster" src="frames/seq_0001.webp" width="1916" height="1080" alt="An empty staked-out plot at sunset, the city low on the horizon." fetchpriority="high" decoding="async"></picture>
          <canvas class="film-canvas" aria-hidden="true"></canvas>
        </div>
        <div class="dim" data-dim aria-hidden="true"><b><svg class="dim-mark"><use href="#i-level-solid"/></svg><span data-level>Ground level</span></b></div>
        <div class="film-copy">
          <div class="lead">
            <h1 class="hero-title" id="hero-title"><span class="ln"><span>Built exactly</span></span> <span class="ln"><span>as drawn.</span></span></h1>
            <p>General contractor for residential and mixed-use buildings across Romania. One fixed-price contract, from bare plot to keys.</p>
          </div>
          <div class="chapter" data-chapter="1" aria-hidden="true"><h2>The ground comes first.</h2><p>Survey, permits and soil tests, set out against the approved drawings.</p></div>
          <div class="chapter" data-chapter="2" aria-hidden="true"><h2>Eight floors of frame.</h2><p>Each slab inspected and signed before the next is poured.</p></div>
          <div class="chapter" data-chapter="3" aria-hidden="true"><h2>Closed to the weather.</h2><p>Masonry, windows and roof. Then the trades move inside.</p></div>
          <div class="chapter" data-chapter="4" aria-hidden="true"><h2>Handed over, room by room.</h2><p>You walk it with us until the snag list is closed.</p><a class="btn chapter-cta" href="#enquire">Discuss a project</a></div>
        </div>
        <p class="film-status" data-status role="status" hidden>Loading full-quality frames</p>
      </div>
    </section>

    <section class="wipe" id="drawn" aria-labelledby="drawn-title">
      <div class="wipe-stage">
        <div class="wipe-plate skel">
          <img src="img/drawn.webp" width="1672" height="941" alt="A line drawing of the eight-storey residential block." loading="lazy" decoding="async">
          <img class="wipe-built" src="img/end.png" width="1672" height="941" alt="The same block finished, photographed at sunset from the same point." loading="lazy" decoding="async">
          <div class="wipe-line" aria-hidden="true"><span>As drawn</span><span>As built</span></div>
        </div>
        <div class="wipe-copy">
          <h2 id="drawn-title">The drawings you approve are the building you receive.</h2>
          <p>Every change is priced and signed before anyone on site acts on it.</p>
        </div>
      </div>
    </section>

    <section class="method" id="method" aria-labelledby="method-title">
      <div class="method-media">
        <div class="method-sticky skel">
          <img class="is-on" src="img/start.png" alt="The empty plot staked out with survey tape." width="1670" height="941" loading="lazy" decoding="async" data-stage-img="0">
          <img src="img/middle1.png" alt="The concrete frame of the block with a tower crane." width="1670" height="941" loading="lazy" decoding="async" data-stage-img="1">
          <img src="img/middle2.png" alt="The block closed in with masonry and windows, scaffolding on the facade." width="1672" height="941" loading="lazy" decoding="async" data-stage-img="2">
          <img src="img/end.png" alt="The finished block with timber-clad balconies and young trees." width="1672" height="941" loading="lazy" decoding="async" data-stage-img="3">
        </div>
      </div>
      <div class="method-body">
        <h2 class="h-l" id="method-title" data-reveal="up">You sign off every stage.</h2>
        <p class="lede" data-reveal="up">Each stage closes with a walk through the site. Nothing starts until you have seen the last one finished.</p>
        <ol class="stages">
          <li class="stage">
            <h3>Ground and permits</h3>
            <ul class="gets">
              <li><svg class="icon" aria-hidden="true"><use href="#i-ruler"/></svg>Topographic survey and soil report</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-file"/></svg>Permit file submitted in your name</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-calendar"/></svg>A fixed programme for every stage</li>
            </ul>
          </li>
          <li class="stage">
            <h3>Structure</h3>
            <ul class="gets">
              <li><svg class="icon" aria-hidden="true"><use href="#i-shield"/></svg>A signed inspection record for each slab</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-camera"/></svg>Photos of the steel before it is covered</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-layers"/></svg>A walk through the frame at topping out</li>
            </ul>
          </li>
          <li class="stage">
            <h3>Envelope</h3>
            <ul class="gets">
              <li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Weathertight sign-off before interiors</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-file"/></svg>Specs for everything as installed</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-camera"/></svg>A photo report every week</li>
            </ul>
          </li>
          <li class="stage">
            <h3>Finish and handover</h3>
            <ul class="gets">
              <li><svg class="icon" aria-hidden="true"><use href="#i-key"/></svg>Handover walk and a closed snag list</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-file"/></svg>As-built drawings, manuals, warranties</li>
              <li><svg class="icon" aria-hidden="true"><use href="#i-user"/></svg>The same site manager after you move in</li>
            </ul>
          </li>
        </ol>
      </div>
    </section>

    <section class="buildings" id="buildings" aria-labelledby="buildings-title">
      <h2 class="h-l" id="buildings-title" data-reveal="up">What we build.</h2>
      <ul class="rows">
        <li><a class="row" href="#enquire" data-type="residential"><span class="row-name">Apartment blocks</span><span class="row-text">From the permit file to the last handover walk.</span><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></a></li>
        <li><a class="row" href="#enquire" data-type="mixed"><span class="row-name">Mixed use</span><span class="row-text">Homes above shops and offices, phased so each opens on time.</span><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></a></li>
        <li><a class="row" href="#enquire" data-type="commercial"><span class="row-name">Offices and shells</span><span class="row-text">Structure and envelope, ready for your tenants&rsquo; fit-out.</span><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></a></li>
        <li><a class="row" href="#enquire" data-type="house"><span class="row-name">Private houses</span><span class="row-text">One family, one site manager, the same contract as a tower.</span><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></a></li>
      </ul>
    </section>

    <section class="romania" id="romania" aria-labelledby="romania-title">
      <div class="romania-side">
        <h2 class="h-l" id="romania-title" data-reveal="up">From Timișoara to Constanța.</h2>
        <p class="lede" data-reveal="up">Crews in ten cities, one way of building. The same contract and the same Friday report wherever your plot is.</p>
        <ul class="cities"><li data-city="Timișoara"><span>Timișoara</span><b>TM</b></li><li data-city="Oradea"><span>Oradea</span><b>BH</b></li><li data-city="Cluj-Napoca"><span>Cluj-Napoca</span><b>CJ</b></li><li data-city="Craiova"><span>Craiova</span><b>DJ</b></li><li data-city="Sibiu"><span>Sibiu</span><b>SB</b></li><li data-city="Brașov"><span>Brașov</span><b>BV</b></li><li data-city="Bucharest"><span>Bucharest</span><b>B</b></li><li data-city="Suceava"><span>Suceava</span><b>SV</b></li><li data-city="Iași"><span>Iași</span><b>IS</b></li><li data-city="Constanța"><span>Constanța</span><b>CT</b></li></ul>
      </div>
      <div class="map-box"><svg class="map" viewBox="-10 -10 1020 720" role="img" aria-label="Map of Romania with pins on ten cities: Timișoara, Oradea, Cluj-Napoca, Craiova, Sibiu, Brașov, Bucharest, Suceava, Iași, Constanța."><path class="map-land" d="M834.6 426.5L845.4 442.0L859.7 450.1L891.9 458.9L894.6 457.9L894.9 456.3L892.7 454.0L892.3 451.1L893.8 447.5L898.3 447.5L905.8 450.6L919.7 445.9L939.9 433.7L958.7 431.1L975.9 438.4L984.6 447.0L990.2 455.0L988.3 464.9L987.2 471.2L982.7 496.9L979.7 506.5L974.8 517.4L921.6 530.1L924.9 524.2L923.8 513.2L921.6 505.2L926.4 497.7L914.8 495.1L909.6 499.0L905.4 506.2L908.8 522.3L903.2 531.4L900.9 536.4L900.6 548.3L897.2 553.5L896.4 559.0L905.1 557.7L901.3 567.8L885.2 587.6L879.6 599.3L881.1 646.0L873.9 673.8L873.6 682.2L856.7 682.4L851.4 681.9L835.7 677.7L817.7 670.2L807.2 655.9L800.4 645.5L785.4 650.2L782.4 648.9L778.3 644.0L766.7 640.6L752.8 640.6L720.9 621.9L717.5 618.5L692.4 621.9L655.3 631.0L626.8 642.7L597.2 662.9L585.2 678.5L571.3 686.8L551.8 692.8L516.5 690.5L480.2 682.7L440.8 674.4L419.4 679.0L390.5 675.7L347.4 665.5L315.2 662.4L283.3 668.4L278.0 664.0L276.5 658.8L278.0 651.5L282.5 645.5L290.0 641.1L294.2 636.7L294.5 632.0L285.9 624.5L268.3 614.3L260.8 608.1L259.3 606.5L258.5 600.8L255.2 596.4L248.0 593.0L242.8 587.0L239.0 578.5L239.8 570.4L245.0 562.9L252.2 559.5L260.4 560.5L264.2 558.2L262.7 553.0L254.4 546.2L239.4 537.9L224.0 542.4L208.3 559.8L197.0 562.6L190.3 550.9L177.9 543.9L160.3 541.8L149.4 537.4L145.7 530.7L137.8 525.5L120.9 520.0L120.5 514.5L123.5 513.5L129.5 513.0L137.4 511.7L138.9 508.8L138.9 506.2L132.5 502.6L126.2 500.3L122.8 497.9L120.5 495.3L120.2 492.7L122.0 490.6L124.7 490.6L127.3 489.1L128.4 482.6L132.2 477.4L134.4 475.6L134.4 471.9L131.8 468.3L128.4 465.2L123.2 463.4L107.0 457.9L98.8 450.4L93.9 450.1L85.7 445.9L77.4 439.2L69.9 429.8L62.0 423.9L59.8 421.5L59.8 419.2L60.9 416.6L60.9 413.7L59.0 404.6L60.2 394.8L59.8 385.9L59.8 381.8L58.3 380.5L56.8 381.8L54.9 383.6L53.0 383.8L47.0 377.3L39.5 363.8L34.7 359.4L24.9 353.2L16.7 348.0L10.7 336.8L4.3 328.0L8.4 324.3L32.0 319.4L42.9 324.3L48.2 322.5L53.0 318.4L55.7 315.2L56.0 311.6L58.3 307.4L66.5 305.4L87.5 308.0L96.2 302.0L99.2 298.6L101.0 291.6L103.3 285.6L110.8 282.5L110.8 277.3L109.7 271.6L114.2 258.6L116.8 253.4L120.9 251.3L126.2 247.4L135.2 238.8L132.9 231.6L134.8 226.1L144.2 212.9L151.3 200.1L151.3 193.6L152.4 187.9L158.4 181.9L165.2 173.9L173.8 148.9L177.2 144.8L182.8 140.1L186.9 135.4L187.3 119.1L191.4 114.4L199.3 108.9L206.8 100.3L213.2 90.5L217.7 85.5L224.0 84.5L231.2 80.3L238.7 79.0L246.2 80.9L251.0 79.8L258.2 74.9L276.2 56.4L278.8 52.8L282.5 50.2L297.5 44.0L301.3 37.5L306.2 31.7L312.9 32.3L334.3 46.3L357.2 45.5L361.3 46.0L362.8 46.3L365.4 47.6L396.2 54.6L400.7 53.8L402.2 53.1L414.2 59.0L425.0 58.2L435.5 54.1L446.4 52.8L456.2 55.1L463.7 63.4L483.2 80.6L488.8 87.1L497.8 86.3L507.5 82.9L517.7 71.5L548.4 58.2L571.7 55.1L594.5 49.7L621.2 46.0L628.7 35.4L633.2 27.8L636.2 14.3L650.4 10.4L663.9 7.8L668.8 6.0L678.5 5.5L686.0 6.5L698.0 13.3L706.3 21.6L709.7 28.4L716.8 37.7L724.3 51.0L732.5 68.6L734.0 77.5L737.4 87.1L743.4 98.8L755.0 111.8L756.9 114.4L762.2 123.5L772.3 143.7L780.9 151.8L788.4 160.6L791.8 169.5L797.4 177.5L809.8 188.2L819.9 197.8L828.2 225.6L833.8 238.6L837.6 248.5L835.7 268.2L837.9 276.8L833.4 292.4L824.8 323.6L822.9 348.2L824.4 361.8L824.4 370.3L826.7 375.8L828.9 387.2L829.3 397.1L826.3 400.0L821.8 402.3L820.3 404.4L824.1 408.8L829.3 417.1L834.6 426.5Z"/><g class="pin" data-city="Timișoara" style="--i:0"><path d="M97.3 372.7h20l-10 18z"/><text x="125.3" y="389.7" text-anchor="start">Timișoara</text></g><g class="pin" data-city="Oradea" style="--i:1"><path d="M169.2 178.1h20l-10 18z"/><text x="197.2" y="195.1" text-anchor="start">Oradea</text></g><g class="pin" data-city="Cluj-Napoca" style="--i:2"><path d="M344.2 220h20l-10 18z"/><text x="372.2" y="237" text-anchor="start">Cluj-Napoca</text></g><g class="pin" data-city="Craiova" style="--i:3"><path d="M365 586.7h20l-10 18z"/><text x="393" y="603.7" text-anchor="start">Craiova</text></g><g class="pin" data-city="Sibiu" style="--i:4"><path d="M401.5 366.7h20l-10 18z"/><text x="429.5" y="383.7" text-anchor="start">Sibiu</text></g><g class="pin" data-city="Brașov" style="--i:5"><path d="M551.5 387.7h20l-10 18z"/><text x="579.5" y="404.7" text-anchor="start">Brașov</text></g><g class="pin" data-city="Bucharest" style="--i:6"><path d="M604.6 570.3h20l-10 18z"/><text x="632.6" y="587.3" text-anchor="start">Bucharest</text></g><g class="pin" data-city="Suceava" style="--i:7"><path d="M621.3 88.3h20l-10 18z"/><text x="649.3" y="105.3" text-anchor="start">Suceava</text></g><g class="pin" data-city="Iași" style="--i:8"><path d="M759.8 161.6h20l-10 18z"/><text x="751.8" y="178.6" text-anchor="end">Iași</text></g><g class="pin" data-city="Constanța" style="--i:9"><path d="M868.1 609.2h20l-10 18z"/><text x="887.1" y="660.2" text-anchor="end">Constanța</text></g></svg></div>
    </section>

    <section class="projects" id="projects" aria-labelledby="projects-title">
      <div class="projects-head">
        <h2 class="h-l" id="projects-title" data-reveal="up">Buildings of the kind we take on.</h2>
        <div class="projects-side">
          <p class="note">Sample photos of buildings by other developers, shown until our own project photography is in. Credits on each.</p>
          <div class="rail-btns">
            <button class="sq" type="button" data-rail="-1" aria-label="Previous photo"><svg class="icon" aria-hidden="true"><use href="#i-chev-l"/></svg></button>
            <button class="sq" type="button" data-rail="1" aria-label="Next photo"><svg class="icon" aria-hidden="true"><use href="#i-chev"/></svg></button>
          </div>
        </div>
      </div>
      <div class="rail" id="rail" tabindex="0" role="region" aria-label="Sample photos, scroll sideways"><figure class="card">
          <div class="media skel"><img src="img/projects/bucharest-aerial.webp" alt="Aerial view of a residential district in Bucharest, with a new phase under construction behind finished blocks." width="2400" height="1800" loading="lazy" decoding="async"></div>
          <figcaption><span class="card-city">Bucharest</span><span class="card-kind">Residential district, new phase on site</span>
            <span class="card-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:Atria_Urban_Resort_vedere_de_ansamblu.jpg">Atria Urban Resort</a>, CC BY-SA 4.0</span></figcaption>
        </figure><figure class="card">
          <div class="media skel"><img src="img/projects/brasov-quarter.webp" alt="New apartment buildings and a cycle lane in a residential quarter in Brașov, mountains behind." width="2400" height="1121" loading="lazy" decoding="async" style="object-position:58% 50%"></div>
          <figcaption><span class="card-city">Brașov</span><span class="card-kind">Residential quarter</span>
            <span class="card-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:Brasov_Coresi_Quarter.jpg">Pl71</a>, CC0</span></figcaption>
        </figure><figure class="card">
          <div class="media skel"><img src="img/projects/bucharest-courtyard.webp" alt="A green courtyard between two white apartment buildings with glass balconies in Bucharest." width="2400" height="1350" loading="lazy" decoding="async"></div>
          <figcaption><span class="card-city">Bucharest</span><span class="card-kind">Apartment blocks around a garden</span>
            <span class="card-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:THE-IVY-BUCURESTI-BANEASA-ANSAMBLU-VERDE.jpg">Speedwell Development</a>, CC BY-SA 4.0</span></figcaption>
        </figure><figure class="card">
          <div class="media skel"><img src="img/projects/timisoara-offices.webp" alt="Glass and steel office buildings of a business centre in Timișoara." width="2048" height="1536" loading="lazy" decoding="async" style="object-position:70% 50%"></div>
          <figcaption><span class="card-city">Timișoara</span><span class="card-kind">Office centre</span>
            <span class="card-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:City_Business_Center_Timi%C8%99oara_2022.jpg">Irimia Florin</a>, CC BY-SA 4.0</span></figcaption>
        </figure><figure class="card">
          <div class="media skel"><img src="img/projects/iasi-mixed.webp" alt="Office towers and a hotel beside a landscaped garden with a fountain in Iași." width="2400" height="1803" loading="lazy" decoding="async"></div>
          <figcaption><span class="card-city">Iași</span><span class="card-kind">Mixed-use district</span>
            <span class="card-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:Iasi,_Public_Garden_Palas_14.jpg">Argenna</a>, CC BY-SA 4.0</span></figcaption>
        </figure><figure class="card">
          <div class="media skel"><img src="img/projects/bucharest-residential.webp" alt="Light apartment buildings behind young trees and planted beds in Bucharest." width="1920" height="1080" loading="lazy" decoding="async"></div>
          <figcaption><span class="card-city">Bucharest</span><span class="card-kind">Apartment blocks, second phase</span>
            <span class="card-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:Atria_Urban_Resort_Faza_2.jpg">Atria Urban Resort</a>, CC BY-SA 4.0</span></figcaption>
        </figure></div>
    </section>

    <section class="promise" id="promise" aria-labelledby="promise-title">
      <h2 class="h-l" id="promise-title" data-reveal="up">The price you sign is what you pay.</h2>
      <ul class="promise-list">
        <li data-reveal="up"><h3>Fixed-price contract</h3><p>Agreed before we break ground. Changes happen only when you sign them.</p></li>
        <li data-reveal="up"><h3>One site manager</h3><p>The same person from the first stake to handover, on a direct number.</p></li>
        <li data-reveal="up"><h3>A report every Friday</h3><p>Photos, progress against the programme and next week&rsquo;s work.</p></li>
      </ul>
    </section>

    <section class="enquire" id="enquire" aria-labelledby="enquire-title">
      <div class="enquire-side">
        <h2 class="h-l" id="enquire-title">Tell us about your plot.</h2>
        <p class="lede">Send the basics. Your site manager calls back with questions and a date to walk the plot together.</p>
        <ul class="contacts">
          <li><a href="tel:+40000000000"><svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg>+40 000 000 000</a></li>
          <li><a href="mailto:office@example.com"><svg class="icon" aria-hidden="true"><use href="#i-mail"/></svg>office@example.com</a></li>
        </ul>
      </div>
      <form class="form" id="quote-form" novalidate>
        <div class="field"><label for="f-name">Your name</label><input id="f-name" name="name" type="text" autocomplete="name" required aria-describedby="e-name"><p class="field-error" id="e-name"></p></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" required aria-describedby="e-email"><p class="field-error" id="e-email"></p></div>
        <div class="field"><label for="f-phone">Phone (optional)</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel"></div>
        <div class="field"><label for="f-type">Project</label>
          <select id="f-type" name="type" required aria-describedby="e-type">
            <option value="">Choose one</option><option value="residential">Apartment block</option><option value="mixed">Mixed use</option><option value="commercial">Office or commercial shell</option><option value="house">Private house</option><option value="other">Something else</option>
          </select><p class="field-error" id="e-type"></p></div>
        <div class="field"><label for="f-where">Where is the plot?</label><input id="f-where" name="location" type="text" autocomplete="address-level2"></div>
        <div class="field"><label for="f-when">When do you want to start?</label>
          <select id="f-when" name="start"><option value="">Not sure yet</option><option>Within 3 months</option><option>In 3 to 12 months</option><option>More than a year from now</option></select></div>
        <div class="field field--full"><label for="f-msg">Anything we should know (optional)</label><textarea id="f-msg" name="message" rows="3"></textarea></div>
        <div class="form-foot"><button class="btn btn--paper" type="submit">Send project details<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button><p class="form-note">We use these details only to reply to you.</p></div>
        <p class="form-status" id="form-status" role="status" hidden></p>
      </form>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-top">
      <nav aria-label="Footer"><ul>
        <li><a href="#method">Method</a></li><li><a href="#buildings">Buildings</a></li><li><a href="#romania">Romania</a></li><li><a href="#projects">Projects</a></li><li><a href="#enquire">Contact</a></li>
      </ul></nav>
      <p class="footer-note">Ardent Build is a fictional company. Its claims and contact details are placeholders.</p>
      <details class="footer-credits"><summary>Credits</summary>
        <p>Film and stage pictures: Ardent Build. Sample photos from Wikimedia Commons: <a href="https://commons.wikimedia.org/wiki/File:Atria_Urban_Resort_vedere_de_ansamblu.jpg">Atria Urban Resort</a> (CC BY-SA 4.0), <a href="https://commons.wikimedia.org/wiki/File:Atria_Urban_Resort_Faza_2.jpg">Atria Urban Resort</a> (CC BY-SA 4.0), <a href="https://commons.wikimedia.org/wiki/File:THE-IVY-BUCURESTI-BANEASA-ANSAMBLU-VERDE.jpg">Speedwell Development</a> (CC BY-SA 4.0), <a href="https://commons.wikimedia.org/wiki/File:Brasov_Coresi_Quarter.jpg">Pl71</a> (CC0), <a href="https://commons.wikimedia.org/wiki/File:Iasi,_Public_Garden_Palas_14.jpg">Argenna</a> (CC BY-SA 4.0), <a href="https://commons.wikimedia.org/wiki/File:City_Business_Center_Timi%C8%99oara_2022.jpg">Irimia Florin</a> (CC BY-SA 4.0). Resized for the web. Map outline: Natural Earth, public domain.</p>
      </details>
    </div>
    <div class="footer-wordwrap"><p class="footer-word" aria-hidden="true">Ardent</p></div>
  </footer>

  <script type="module" src="js/main.js"></script>
</body>
</html>
`````

### FILE: site/css/fonts.css

`````css
/* Archivo, variable in weight and width. SIL OFL 1.1 (fonts/Archivo-OFL.txt). */
@font-face { font-family: "Archivo"; src: url("../fonts/archivo-latin.woff2") format("woff2-variations"), url("../fonts/archivo-latin.woff2") format("woff2");
  font-weight: 100 900; font-stretch: 62% 125%; font-style: normal; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "Archivo"; src: url("../fonts/archivo-latin-ext.woff2") format("woff2-variations"), url("../fonts/archivo-latin-ext.woff2") format("woff2");
  font-weight: 100 900; font-stretch: 62% 125%; font-style: normal; font-display: swap;
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
`````

### FILE: site/css/nav.css

`````css
/* Navigation: a floating pill bar (or a plain bar) plus a mobile menu that doesn't have the usual bugs.
   Pairs with nav.js. Without JS the menu links are still reachable: the panel is a normal list below the bar.

   <header class="nav nav--pill" data-nav>
     <a class="nav-mark" href="/">Mark</a>
     <nav aria-label="Main"><ul class="nav-links" id="nav-panel" data-nav-panel> <li><a href="#work">Work</a></li> … </ul></nav>
     <a class="nav-cta btn" href="#contact">Contact</a>
     <button class="nav-burger" type="button" aria-controls="nav-panel" aria-expanded="false" data-nav-toggle hidden>
       <span class="nav-burger-lines" aria-hidden="true"></span><span class="nav-sr">Menu</span></button>
   </header>
   Panel styles on phones: data-nav-style="overlay" (full screen, default) · "drawer" (from the right) · "sheet" (bottom sheet). */
:root { --nav-h: 64px; --nav-bg: rgb(12 12 12 / .55); --nav-fg: #f4f2ee; --nav-panel-bg: #0c0c0c; --nav-ease: cubic-bezier(.32, .72, 0, 1); --nav-break: 860px; }

.nav { position: fixed; z-index: 50; inset: 0 0 auto 0; height: var(--nav-h); display: flex; align-items: center;
  color: var(--nav-fg); }
/* The glass sits on a pseudo-element: backdrop-filter, filter or transform on .nav itself would become the containing
   block of the fixed mobile panel and trap it inside the 64 px bar. Keep all three off .nav. */
.nav-mark { font-weight: 600; text-decoration: none; color: inherit; margin-right: auto; }
.nav-links { display: flex; list-style: none; margin: 0; padding: 0; }
.nav-links a { color: inherit; text-decoration: none; opacity: .8; transition: opacity 200ms; }
.nav-links a:hover, .nav-links a:focus-visible { opacity: 1; }
.nav-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* Burger that morphs into a cross (two lines, 280 ms). */
.nav-burger { position: relative; width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.nav-burger-lines, .nav-burger-lines::before { position: absolute; left: 12px; right: 12px; height: 1.5px; background: currentColor; transition: transform 280ms var(--nav-ease), top 280ms var(--nav-ease); }
.nav-burger-lines { top: 18px; }
.nav-burger-lines::before { content: ""; left: 0; right: 0; top: 7px; }
[aria-expanded="true"] > .nav-burger-lines { top: 21px; transform: rotate(45deg); }
[aria-expanded="true"] > .nav-burger-lines::before { top: 0; transform: rotate(-90deg); }

/* Phones: nav.js adds .nav--compact below --nav-break and un-hides the burger. */
.nav--compact .nav-cta { display: none; }
.nav--compact .nav-links { position: fixed; z-index: -1; flex-direction: column; gap: var(--space-1); padding: calc(var(--nav-h) + var(--space-5)) var(--gutter) var(--space-5);
  background: var(--nav-panel-bg); font-size: clamp(28px, 8vw, 40px); visibility: hidden; transition: transform 420ms var(--nav-ease), opacity 320ms ease, visibility 0s 420ms; }
.nav--compact[data-nav-style="overlay"] .nav-links, .nav--compact:not([data-nav-style]) .nav-links { inset: 0; opacity: 0; transform: translateY(-12px); }
.nav--compact.is-open .nav-links { visibility: visible; opacity: 1; transform: none; transition: transform 420ms var(--nav-ease), opacity 320ms ease, visibility 0s; }
.nav-scrim { position: fixed; inset: 0; z-index: 40; background: rgb(0 0 0 / .4); opacity: 0; pointer-events: none; transition: opacity 320ms; }
.nav.is-open ~ .nav-scrim, .nav-scrim.is-on { opacity: 1; pointer-events: auto; }
html.nav-locked, html.nav-locked body { overflow: hidden; }

@media (prefers-reduced-motion: reduce) { .nav *, .nav-links { transition-duration: 0s !important; } }
`````

### FILE: site/css/reveal.css

`````css
/* On-scroll reveals (pairs with reveal.js). Hidden states apply only under html.reveal-ready, which the script sets,
   so the page is complete without JavaScript. Only opacity, transform and clip-path move. Tune per style pack:
   luxury = slower and shorter travel (900 ms, 12px); bold = faster, harder (350 ms, 40px); trust = fade only. */
:root { --reveal-dur: 700ms; --reveal-ease: cubic-bezier(.22, 1, .36, 1); --reveal-travel: 24px; }

.reveal-ready [data-reveal]:not(.is-revealed) { opacity: 0; }
.reveal-ready [data-reveal=""]:not(.is-revealed),
.reveal-ready [data-reveal="up"]:not(.is-revealed) { transform: translateY(var(--reveal-travel)); }
.reveal-ready [data-reveal="scale"]:not(.is-revealed) { transform: scale(.96); }
.reveal-ready [data-reveal="mask"]:not(.is-revealed) { opacity: 1; clip-path: inset(100% 0 0 0); }
.reveal-ready [data-reveal="words"]:not(.is-revealed) { opacity: 1; }
.reveal-ready [data-reveal="words"]:not(.is-revealed) .reveal-word { opacity: 0; transform: translateY(.4em); }

[data-reveal] {
  transition: opacity var(--reveal-dur) var(--reveal-ease), transform var(--reveal-dur) var(--reveal-ease), clip-path calc(var(--reveal-dur) * 1.4) var(--reveal-ease);
  transition-delay: var(--reveal-delay, 0ms);
}
[data-reveal="mask"] { clip-path: inset(0 0 0 0); }
.reveal-word { display: inline-block; transition: opacity var(--reveal-dur) var(--reveal-ease), transform var(--reveal-dur) var(--reveal-ease); transition-delay: calc(var(--reveal-delay, 0ms) + var(--i, 0) * 60ms); }

@media (prefers-reduced-motion: reduce) {
  [data-reveal], .reveal-word { transition: none !important; opacity: 1 !important; transform: none !important; clip-path: none !important; }
}
`````

### FILE: site/css/site.css

`````css
/* Ardent Build, redesign v3: "Built exactly as drawn".
   60-30-10: paper and concrete · graphite from the roof band · timber from the facade fins.
   The one repeating device is the dimension rule: a 1 px line with end ticks. */
:root {
  --paper: #f6f5f2; --concrete: #e7e5e0; --ink: #1d2023; --ink-2: #55585a; --timber: #a5602b;
  --hair: rgb(29 32 35 / .18); --on-ink: #f6f5f2; --on-ink-2: #c3c4c2; --hair-on-ink: rgb(246 245 242 / .28); --error-on-ink: #ffc29a;
  --font: Archivo, system-ui, sans-serif; --wide: 116%;
  --space-half: 4px; --space-1: 8px; --space-1h: 12px; --space-2: 16px; --space-3: 24px; --space-4: 32px; --space-5: 48px; --space-6: 80px;
  --col-gap: clamp(32px, 5vw, 120px); --nav-gap: clamp(32px, 4vw, 80px); --links-gap: clamp(24px, 2.4vw, 48px);
  --gutter: max(clamp(20px, 3vw, 48px), calc((100vw - 1520px) / 2)); --gap: clamp(16px, 1.6vw, 32px); --section: clamp(96px, 11vw, 216px);
  --t-hero: min(5.6vw, 12.4svh); --t-chapter: min(3.4vw, 7.4svh); --t-l: clamp(34px, 4.2vw, 88px); --t-m: clamp(22px, 1.9vw, 38px);
  --t-body: clamp(17px, 1.1vw, 21px); --t-small: 15px;
  --ease-out: cubic-bezier(.22, 1, .36, 1); --ease-state: cubic-bezier(.4, 0, .2, 1);
  --nav-h: 80px; --nav-fg: var(--ink); --nav-panel-bg: var(--paper); --nav-break: 1024px;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: var(--nav-h); scrollbar-color: var(--ink-2) var(--paper); }
body { margin: 0; background: var(--paper); color: var(--ink); font: 400 var(--t-body)/1.5 var(--font); -webkit-font-smoothing: antialiased; overflow-x: clip; }
h1, h2, h3, p, ul, ol, dl, figure { margin: 0; padding: 0; }
ul, ol { list-style: none; }
a { color: inherit; text-decoration: none; }
img, canvas, svg { display: block; }
img { max-width: 100%; height: auto; }
button, input, select, textarea { font: inherit; color: inherit; }
::selection { background: var(--ink); color: var(--paper); }
:focus-visible { outline: 2px solid var(--timber); outline-offset: 3px; }
.sr-defs, svg[style*="display:none"] { position: absolute; }
.icon { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }

.skip { position: fixed; left: var(--space-2); top: -64px; z-index: 90; height: 48px; display: flex; align-items: center; padding-inline: var(--space-2); background: var(--ink); color: var(--paper); font-weight: 600; }
.skip:focus { top: 12px; }

.h-l { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-l); line-height: 1.04; letter-spacing: -.03em; text-wrap: balance; }
.lede { max-width: 32em; text-wrap: pretty; }
.note { font-size: var(--t-small); color: var(--ink-2); max-width: 34em; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-1); height: 48px; padding-inline: var(--space-3); line-height: 1; border: 0; background: var(--ink); color: var(--paper); font-size: var(--t-small); font-weight: 600; white-space: nowrap; cursor: pointer; transition: background-color 200ms var(--ease-state), color 200ms var(--ease-state); }
.btn:hover { background: var(--timber); }
.btn:active { transform: translateY(1px); }
.btn--paper { background: var(--paper); color: var(--ink); }
.btn--paper:hover { background: var(--concrete); }

/* Skeletons */
.skel { position: relative; overflow: hidden; background: var(--concrete); }
.skel::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / .5) 50%, transparent 70%) 130% 0 / 220% 100%; animation: shimmer 1.4s linear infinite; transition: opacity 250ms linear; }
@keyframes shimmer { from { background-position: 130% 0; } to { background-position: -30% 0; } }
.skel.is-loaded::after { opacity: 0; animation: none; }
.js .skel > img { opacity: 0; transition: opacity 250ms linear; }
.js .skel.is-loaded > img { opacity: 1; }
html:not(.js) .skel::after { display: none; }

/* ---------------- Nav ---------------- */
.nav { gap: var(--nav-gap); padding-inline: var(--gutter); background: var(--paper); box-shadow: 0 1px 0 var(--hair); transition: background-color 240ms var(--ease-state), box-shadow 240ms var(--ease-state); }
.nav.is-over:not(.is-open) { background: transparent; box-shadow: none; }
.nav-mark { display: flex; align-items: center; gap: var(--space-1h); margin: 0; font-stretch: 125%; font-weight: 600; font-size: 19px; letter-spacing: .02em; text-transform: uppercase; }
.mark { width: 22px; height: 18px; }
.nav-links { gap: var(--links-gap); font-size: var(--t-small); font-weight: 500; }
.nav-links a { opacity: 1; padding-block: var(--space-1); background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat; transition: background-size 240ms var(--ease-out); }
.nav-links a:hover, .nav-links a[aria-current] { background-size: 100% 1px; }
.nav-panel-cta { display: none; }
.nav-cta { margin-left: auto; }
.nav-burger { margin-left: auto; border-radius: 0; }

/* ---------------- Film ---------------- */
.film { position: relative; height: 580vh; }
.film-track { position: absolute; inset: 0 0 auto; height: 480vh; pointer-events: none; }
.film-cover { position: absolute; inset: 0 0 100vh; pointer-events: none; }
.film-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; background: var(--concrete); }
.film-frame { position: absolute; inset: 0; }
.film-poster, .film-canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 100% 0; }
.js .film-frame.skel > img { opacity: 1; }
.film-canvas { opacity: 0; }
.film.is-live .film-canvas { opacity: 1; }

.film-copy { position: absolute; left: var(--gutter); top: calc(var(--nav-h) + clamp(16px, 3svh, 40px)); width: min(46vw, 780px); }
.hero-title { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-hero); line-height: 1; letter-spacing: -.03em; }
.ln { display: block; overflow: hidden; padding-bottom: .1em; margin-bottom: -.1em; }
.ln > span { display: block; animation: rise 800ms var(--ease-out) both; }
.ln + .ln > span { animation-delay: 90ms; }
@keyframes rise { from { transform: translateY(106%); } }
.lead p { margin-top: var(--space-3); max-width: 30em; font-weight: 500; text-wrap: pretty; }
.lead, .chapter { transition: opacity 350ms var(--ease-state), transform 350ms var(--ease-state), visibility 0s 350ms; }
.film[data-stage] .lead { opacity: 0; visibility: hidden; transform: translateY(-16px); }
.chapter { position: absolute; inset: 0 auto auto 0; width: max-content; max-width: 64vw; opacity: 0; visibility: hidden; transform: translateY(16px); }
.chapter[aria-hidden="false"] { opacity: 1; visibility: visible; transform: none; transition-delay: 0s; }
.chapter h2 { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-chapter); line-height: 1.05; letter-spacing: -.025em; }
.chapter p { margin-top: var(--space-1h); max-width: 27em; font-weight: 500; }
.chapter-cta { position: absolute; left: calc(100% + var(--space-4)); top: 4px; }

/* The survey line: follows the measured roofline, ends on the building's corner. A line, never a scrim */
.dim { position: absolute; inset: 0 0 auto; height: 0; pointer-events: none; opacity: 0; transition: opacity 300ms linear; will-change: transform; }
.dim.is-on { opacity: 1; }
.dim::before { content: ""; position: absolute; left: var(--gutter); width: calc(var(--end, 30vw) - var(--gutter)); top: 0; height: 1px; background: var(--ink); }
.dim::after { content: ""; position: absolute; left: var(--end, 30vw); top: -7px; width: 1px; height: 15px; background: var(--ink); }
.dim b { position: absolute; left: var(--gutter); bottom: var(--space-1); display: flex; align-items: center; gap: var(--space-1); font-size: var(--t-small); font-weight: 600; font-stretch: 88%; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dim-mark { width: 13px; height: 10px; }
.film-status { position: absolute; left: var(--gutter); bottom: var(--space-3); padding: var(--space-1) var(--space-1h); background: var(--paper); font-size: var(--t-small); font-weight: 500; }
.film-status[hidden] { display: none; }

/* ---------------- As drawn, as built ---------------- */
.wipe { position: relative; height: 280vh; background: var(--paper); }
.wipe-stage { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.wipe-plate { position: absolute; inset: 0; }
.wipe-plate img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 100% 0; }
.wipe-built { clip-path: inset(0 0 0 calc((1 - var(--p, 0)) * 100%)); }
.wipe-line { position: absolute; inset: 0 auto 0 calc((1 - var(--p, 0)) * 100%); width: 1px; background: var(--ink); z-index: 2; display: none; }
.wipe.is-moving .wipe-line { display: block; }
.wipe-line span { position: absolute; bottom: var(--space-3); padding: var(--space-1) var(--space-1h); background: var(--paper); font-size: var(--t-small); font-weight: 600; white-space: nowrap; }
.wipe-line span:first-child { right: 0; }
.wipe-line span:last-child { left: 1px; background: var(--ink); color: var(--paper); }
.wipe-copy { position: absolute; left: var(--gutter); top: calc(var(--nav-h) + clamp(16px, 3svh, 40px)); width: min(42vw, 720px); }
.wipe-copy h2 { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-chapter); line-height: 1.08; letter-spacing: -.025em; }
.wipe-copy p { margin-top: var(--space-2); max-width: max(20vw, 15em); font-weight: 500; }

/* ---------------- Method ---------------- */
.method { display: grid; grid-template-columns: 7fr 5fr; gap: var(--col-gap); padding: var(--section) var(--gutter); background: var(--paper); }
.method-sticky { position: sticky; top: calc(var(--nav-h) + var(--space-3)); aspect-ratio: 16 / 9; }
.method-sticky img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.js .method-sticky.skel > img { opacity: 0; transition: opacity 400ms var(--ease-state); }
.js .method-sticky.skel > img.is-on { opacity: 1; }
.method-body .lede { margin-top: var(--space-3); }
.stages { margin-top: var(--space-6); }
.stage { position: relative; padding-block: var(--space-3) var(--space-6); border-top: 1px solid var(--ink); min-height: 44svh; }
.stage::before, .stage::after, .tick::before, .tick::after { content: ""; position: absolute; top: -7px; width: 1px; height: 14px; background: var(--ink); }
.stage::before, .tick::before { left: 0; }
.stage::after, .tick::after { right: 0; }
.stage h3, .promise-list h3 { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-m); line-height: 1.15; letter-spacing: -.02em; }
.gets { margin-top: var(--space-3); display: grid; gap: var(--space-1h); }
.gets li { display: flex; gap: var(--space-1h); align-items: flex-start; }
.gets .icon { margin-top: var(--space-half); color: var(--timber); }

/* ---------------- Buildings ---------------- */
.buildings { padding: var(--section) var(--gutter); background: var(--concrete); }
.rows { margin-top: var(--space-5); }
.row { display: grid; grid-template-columns: 6fr 5fr 24px; gap: var(--gap); align-items: baseline; padding-block: var(--space-3); border-top: 1px solid var(--ink); }
.rows li:last-child .row { border-bottom: 1px solid var(--ink); }
.row-name { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-m); line-height: 1.15; letter-spacing: -.02em; transition: transform 300ms var(--ease-out); }
.row .icon { align-self: center; transition: transform 300ms var(--ease-out); }
.row:hover .row-name { transform: translateX(var(--space-1)); }
.row:hover .icon { transform: translateX(4px); color: var(--timber); }

/* ---------------- Romania ---------------- */
.romania { display: grid; grid-template-columns: 5fr 7fr; gap: var(--col-gap); padding: var(--section) var(--gutter); background: var(--paper); align-items: start; }
.romania .lede { margin-top: var(--space-3); }
.cities { margin-top: var(--space-5); display: grid; grid-template-columns: 1fr 1fr; column-gap: var(--gap); border-top: 1px solid var(--ink); }
.cities li { display: flex; justify-content: space-between; padding-block: var(--space-1h); border-bottom: 1px solid var(--hair); font-weight: 500; transition: color 160ms linear; }
.cities li.is-on { color: var(--timber); }
.cities b { font-weight: 500; font-stretch: 88%; color: var(--ink-2); }
.map { width: 100%; height: auto; overflow: visible; }
.map-land { fill: var(--concrete); stroke: var(--ink); stroke-width: 1; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.pin path { fill: var(--ink); transform-box: fill-box; transform-origin: center; transition: transform 300ms var(--ease-out), fill 160ms linear; transition-delay: calc(var(--i) * 90ms); }
.pin text { font-family: var(--font); font-weight: 500; font-size: 24px; fill: var(--ink); transition: opacity 300ms linear; transition-delay: calc(var(--i) * 90ms); }
.js .map:not(.is-in) .pin path { transform: scale(0); }
.js .map:not(.is-in) .pin text { opacity: 0; }
.pin.is-on path { fill: var(--timber); transform: scale(1.5); transition-delay: 0ms; }
.map.is-done .pin path { transition-delay: 0ms; }

/* ---------------- Projects ---------------- */
.projects { padding-block: 0 var(--section); background: var(--paper); }
.projects-head { display: grid; grid-template-columns: 7fr 5fr; gap: var(--gap); align-items: end; padding-inline: var(--gutter); }
.projects-side { display: flex; justify-content: space-between; gap: var(--space-3); align-items: end; }
.rail-btns { display: flex; gap: var(--space-1); }
.sq { width: 48px; height: 48px; display: grid; place-items: center; border: 1px solid var(--ink); background: transparent; cursor: pointer; transition: background-color 200ms var(--ease-state), color 200ms var(--ease-state), opacity 200ms linear; }
.sq:hover:not(:disabled) { background: var(--ink); color: var(--paper); }
.sq:disabled { opacity: .35; cursor: default; }
.rail { --card: calc((100vw - 2 * var(--gutter)) * .46); display: flex; gap: var(--gap); margin-top: var(--space-5); padding-inline: var(--gutter); overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--gutter); scrollbar-width: none; }
.rail::-webkit-scrollbar { display: none; }
.card { flex: 0 0 var(--card); scroll-snap-align: start; }
.card .media { aspect-ratio: 3 / 2; }
.card .media img { width: 100%; height: 100%; object-fit: cover; }
.card figcaption { display: grid; grid-template-columns: 1fr auto; gap: 2px var(--space-2); margin-top: var(--space-1h); }
.card-city { font-stretch: var(--wide); font-weight: 500; font-size: var(--t-m); line-height: 1.15; letter-spacing: -.02em; }
.card-kind { grid-column: 1; font-size: var(--t-small); }
.card-credit { grid-column: 2; grid-row: 1 / span 2; align-self: start; max-width: 24ch; text-align: right; font-size: 14px; line-height: 1.3; color: var(--ink-2); }

/* ---------------- Promise ---------------- */
.promise { display: grid; grid-template-columns: 6fr 6fr; gap: var(--col-gap); padding: var(--section) var(--gutter); background: var(--concrete); }
.promise-list li { padding-block: var(--space-3); border-top: 1px solid var(--ink); }
.promise-list li:last-child { border-bottom: 1px solid var(--ink); }
.promise-list p { margin-top: var(--space-1); max-width: 30em; }

/* ---------------- Enquire ---------------- */
.enquire { display: grid; grid-template-columns: 5fr 7fr; gap: var(--col-gap); padding: var(--section) var(--gutter); background: var(--ink); color: var(--on-ink); }
.enquire .lede { margin-top: var(--space-3); color: var(--on-ink-2); }
.contacts { margin-top: var(--space-5); display: grid; gap: var(--space-1); }
.contacts a { display: inline-flex; gap: var(--space-1h); align-items: center; padding-block: var(--space-half); font-weight: 500; }
.contacts a:hover { text-decoration: underline; text-underline-offset: 4px; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3) var(--gap); }
.field { display: grid; gap: var(--space-half); align-content: start; min-width: 0; }
.field--full, .form-foot, .form-status { grid-column: 1 / -1; }
.field label { font-size: var(--t-small); color: var(--on-ink-2); }
.field input, .field select, .field textarea { width: 100%; min-height: 48px; padding: var(--space-1h) 0; border: 0; border-bottom: 1px solid var(--hair-on-ink); border-radius: 0; background: transparent; color: var(--on-ink); font-size: max(16px, 1em); transition: border-color 160ms linear; }
.field select { appearance: none; padding-right: var(--space-3); background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f6f5f2' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 0 center / 20px; }
.field select option { color: var(--ink); background: var(--paper); }
.field textarea { resize: vertical; }
.field input:hover, .field select:hover, .field textarea:hover { border-color: var(--on-ink-2); }
.enquire :focus-visible { outline-color: var(--on-ink); }
.field [aria-invalid="true"] { border-color: var(--error-on-ink); }
.field-error { font-size: var(--t-small); color: var(--error-on-ink); }
.field-error:empty { display: none; }
.form-foot { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-1); }
.form-note { font-size: var(--t-small); color: var(--on-ink-2); }
.form-status { padding: var(--space-2); border: 1px solid var(--hair-on-ink); }

/* ---------------- Footer ---------------- */
.footer { background: var(--ink); color: var(--on-ink); padding-top: 0; }
.footer-top { display: grid; grid-template-columns: 5fr 4fr 3fr; gap: var(--gap); padding: var(--space-4) var(--gutter); margin-inline: 0; border-top: 1px solid var(--hair-on-ink); font-size: var(--t-small); }
.footer-top ul { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); }
.footer-top a:hover { text-decoration: underline; text-underline-offset: 4px; }
.footer-note { color: var(--on-ink-2); }
.footer-credits summary { cursor: pointer; padding-block: 2px; }
.footer-credits p { margin-top: var(--space-1); color: var(--on-ink-2); }
.footer-credits a { text-decoration: underline; }
.footer-wordwrap { padding: var(--space-3) var(--gutter) var(--space-3); overflow: hidden; }
.footer-word { width: max-content; font-stretch: 125%; font-weight: 500; line-height: .86; letter-spacing: -.02em; text-transform: uppercase; }

/* ---------------- Tablet and phone ---------------- */
@media (max-width: 1023px) {
  :root { --nav-h: 68px; --t-hero: 44px; --t-chapter: 30px; }
  .nav-panel-cta { display: block; }
  .nav.nav--compact .nav-links { font-stretch: var(--wide); font-weight: 500; }
  .nav--compact .nav-links a { background: none; }

  .film { height: 500vh; }
  .film-track { height: 400vh; }
  .film-stage { display: flex; flex-direction: column; background: var(--paper); }
  .film-frame { position: relative; inset: auto; flex: none; aspect-ratio: 1; max-height: 54svh; width: 100%; }
  .film-poster, .film-canvas { object-position: 86% 50%; }
  .dim { display: none; }
  .lead p { max-width: none; }
  .film-copy { position: relative; left: auto; top: auto; width: auto; flex: 1; padding: var(--space-3) var(--gutter); min-height: 0; }
  .chapter { inset: var(--space-3) var(--gutter) auto; width: auto; max-width: none; }
  .chapter-cta { position: static; margin-top: var(--space-2); }
  .film-status { bottom: var(--space-2); }

  .wipe-stage { display: flex; flex-direction: column; background: var(--paper); }
  .wipe-plate { position: relative; inset: auto; flex: none; aspect-ratio: 1; max-height: 54svh; width: 100%; margin-top: var(--nav-h); }
  .wipe-plate img { object-position: 86% 50%; }
  .wipe-copy { position: relative; left: auto; top: auto; width: auto; padding: var(--space-3) var(--gutter); }
  .wipe-copy p { max-width: 30em; }

  .method, .romania, .promise, .enquire { grid-template-columns: 1fr; }
  .method { gap: var(--space-3); padding-top: 0; }
  .method-media { position: sticky; top: var(--nav-h); z-index: 1; align-self: start; margin-inline: calc(var(--gutter) * -1); background: var(--paper); padding-bottom: var(--space-2); }
  .method-sticky { position: relative; top: 0; }
  .stage { min-height: 0; }
  .stages { margin-top: var(--space-5); }
  .map-box { order: -1; }
  .projects-head { grid-template-columns: 1fr; }
  .rail { --card: 70vw; }
  .row { grid-template-columns: 1fr 24px; }
  .row-text { grid-row: 2; grid-column: 1 / -1; }
  .row .icon { grid-row: 1; grid-column: 2; }
  .footer-top { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .film-poster, .film-canvas { object-position: 50% 0; } /* square phone frames: a short screen trims the road, never the building */
  .rail { --card: 86vw; }
  .cities { grid-template-columns: 1fr; }
  .pin text { font-size: 34px; }
  .form { grid-template-columns: 1fr; }
  .card figcaption { grid-template-columns: 1fr; }
  .card-credit { grid-column: 1; grid-row: auto; max-width: none; text-align: left; margin-top: var(--space-half); }
}

@media (prefers-reduced-motion: reduce) {
  .ln > span { animation: none; }
  .skel::after { animation: none; }
  .film { height: auto; }
  .film-track { display: none; }
  .film-cover { inset: 0; }
  .film-stage { position: relative; }
  .chapter, .dim { display: none; }
  .lead p { max-width: 20vw; }
  .wipe { height: auto; }
  .wipe-stage { position: relative; }
  .btn, .sq, .row-name, .row .icon, .lead, .pin path, .pin text, .method-sticky img { transition: none; }
}
html:not(.js) .film, html:not(.js) .wipe { height: auto; }
html:not(.js) .film-track, html:not(.js) .chapter, html:not(.js) .dim { display: none; }
html:not(.js) .film-cover { inset: 0; }
html:not(.js) .film-stage, html:not(.js) .wipe-stage { position: relative; }
`````

### FILE: site/js/main.js

`````js
import { createFrameScrubber, holdAt } from './scrub-frames.js';
import { reveal } from './reveal.js';
import { nav } from './nav.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = '(max-width: 640px)'; // phones get frames/mobile: the square slice they show, native pixels, about 110 KB a frame
const slowLink = /2g|3g/.test(navigator.connection?.effectiveType || ''); // Data Saver is handled inside the scrubber
nav();
reveal();

/* ---------- Skeletons: each media box shimmers until its picture has decoded ---------- */
function settle(box) {
  const img = box.querySelector('img');
  const done = () => box.classList.add('is-loaded');
  if (!img) return done();
  const ready = () => (img.decode ? img.decode().catch(() => {}).then(done) : done());
  if (img.complete) { if (img.naturalWidth) ready(); else done(); return; }
  img.addEventListener('load', ready, { once: true });
  img.addEventListener('error', done, { once: true });
}
document.querySelectorAll('.skel').forEach(settle);

/* ---------- Hero film ---------- */
const film = document.getElementById('top');
const stageEl = film.querySelector('.film-stage');
const canvas = film.querySelector('.film-canvas');
const chapters = [...film.querySelectorAll('[data-chapter]')];
const statusEl = film.querySelector('[data-status]');
const track = film.querySelector('.film-track');

// the nav is transparent while it sits over the film, solid paper after it
const navBar = document.querySelector('.nav');
new IntersectionObserver(([e]) => navBar.classList.toggle('is-over', e.isIntersecting), { rootMargin: '0px 0px -100% 0px' }).observe(film.querySelector('.film-cover'));

// stage ranges measured on the source film (24 fps, 241 frames); the intro owns the first few frames
const RANGES = [[6, 20], [21, 92], [93, 175], [176, 240]];
const mapFrame = holdAt([0, 12, 84, 156, 240], 0.055);

/* The survey line. ROOF is the building's left corner, measured on the film: [frame, height from the frame's top, 0 to 1].
   CORNER is that corner's position across the frame. The frame is fitted by cover and anchored top right, as in the CSS. */
const ROOF = [[0, .778], [22, .76], [40, .6], [60, .45], [84, .4], [240, .392]];
const CORNER = .307;
const roofAt = (f) => {
  for (let i = 1; i < ROOF.length; i++) {
    const [a, y0] = ROOF[i - 1], [b, y1] = ROOF[i];
    if (f <= b) return y0 + (y1 - y0) * ((f - a) / (b - a));
  }
  return ROOF.at(-1)[1];
};
const dim = film.querySelector('[data-dim]');
const dimLabel = film.querySelector('[data-level]');
const desktop = matchMedia('(min-width: 1024px)');
let shownFrame = 0;
function placeDim(f) {
  if (!desktop.matches) return;
  const vw = stageEl.clientWidth, vh = stageEl.clientHeight, s = Math.max(vw / 1916, vh / 1080);
  const w = 1916 * s, y = roofAt(f);
  dim.style.transform = `translateY(${(y * 1080 * s).toFixed(1)}px)`;
  dim.style.setProperty('--end', `${(vw - w + CORNER * w).toFixed(1)}px`);
  const level = Math.max(0, Math.min(8, Math.round(((.778 - y) / (.778 - .4)) * 8)));
  const text = f > 150 ? 'Roof, level 8' : level ? `Level ${level}` : 'Ground level';
  if (dimLabel.textContent !== text) dimLabel.textContent = text;
  dim.classList.toggle('is-on', f >= RANGES[0][0]);
}
addEventListener('resize', () => placeDim(shownFrame));

let stage = -1;
function showFrame(f) {
  shownFrame = f;
  placeDim(f);
  const s = f < RANGES[0][0] ? 0 : RANGES.findIndex(([a, b]) => f >= a && f <= b) + 1;
  if (s === stage) return;
  stage = s;
  if (s) film.dataset.stage = String(s); else delete film.dataset.stage;
  chapters.forEach((c) => c.setAttribute('aria-hidden', String(c.dataset.chapter !== String(s))));
}

if (reduced) {
  const poster = film.querySelector('.film-poster');
  film.querySelector('.film-frame source')?.remove(); // the phone first frame must not win over the last frame
  poster.src = 'frames/seq_0241.webp';
  poster.alt = 'The finished residential block at sunset, with young trees and a playground in front.';
} else {
  showFrame(0);
  // the frames are lossless (about 1.3 MB each): they start once the page itself has loaded, and arrive as the visitor nears them
  const start = () => createFrameScrubber({
    canvas, scene: track, stage: stageEl, manifestUrl: 'frames/manifest.json', mapFrame, mobileQuery: PHONE,
    ...(matchMedia(PHONE).matches ? { ahead: 120, behind: 30, startFrames: 12, warm: slowLink ? 0 : 241 } : {}),
    onFrame: (i) => showFrame(i),
    onWait: (late) => { statusEl.hidden = !late; },
  }).then(() => film.classList.add('is-live')).catch(() => { statusEl.hidden = true; /* the poster stays: the page still works */ });
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
}

/* ---------- As drawn, as built: scroll moves the wipe. Without motion it rests half and half ---------- */
const wipe = document.getElementById('drawn');
const wipeStage = wipe.querySelector('.wipe-stage');
const plate = wipe.querySelector('.wipe-plate');
plate.style.setProperty('--p', reduced ? '.5' : '0');
if (reduced) wipe.classList.add('is-moving');
else {
  let queued = false;
  const update = () => {
    queued = false;
    const r = wipe.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - wipeStage.offsetHeight)));
    const p = Math.min(1, Math.max(0, (t - .08) / .84)); // rests a moment on the drawing and on the photo
    plate.style.setProperty('--p', p.toFixed(4));
    wipe.classList.toggle('is-moving', p > .015 && p < .985);
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- Method: the picture follows the stage being read ---------- */
const stageImgs = [...document.querySelectorAll('[data-stage-img]')];
const stageIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const k = [...e.target.parentElement.children].indexOf(e.target);
    stageImgs.forEach((img, i) => img.classList.toggle('is-on', i === k));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('.stage').forEach((el) => stageIo.observe(el));

/* ---------- Map: pins stamp in west to east; a city and its pin mark each other ---------- */
const map = document.querySelector('.map');
const mapIo = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  mapIo.disconnect();
  map.classList.add('is-in');
  setTimeout(() => map.classList.add('is-done'), reduced ? 0 : 1300);
}, { threshold: 0.3 });
mapIo.observe(map);
const cityEls = (name) => document.querySelectorAll(`[data-city="${name}"]`);
document.querySelectorAll('[data-city]').forEach((el) => {
  el.addEventListener('pointerenter', () => cityEls(el.dataset.city).forEach((x) => x.classList.add('is-on')));
  el.addEventListener('pointerleave', () => cityEls(el.dataset.city).forEach((x) => x.classList.remove('is-on')));
});

/* ---------- Nav: mark the section in view ---------- */
const navLinks = [...document.querySelectorAll('.nav-links a')];
const navIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    navLinks.forEach((a) => (a.hash === `#${e.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
navLinks.forEach((a) => { const t = document.querySelector(a.hash); if (t) navIo.observe(t); });

/* ---------- Project rail ---------- */
const rail = document.getElementById('rail');
const railBtns = [...document.querySelectorAll('[data-rail]')];
function railState() {
  railBtns[0].disabled = rail.scrollLeft <= 2;
  railBtns[1].disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
}
railBtns.forEach((b) => b.addEventListener('click', () => {
  const step = rail.querySelector('.card').getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap);
  rail.scrollBy({ left: Number(b.dataset.rail) * step, behavior: reduced ? 'auto' : 'smooth' });
}));
rail.addEventListener('scroll', railState, { passive: true });
addEventListener('resize', railState);
railState();

/* ---------- Footer wordmark: fit the line exactly ---------- */
const word = document.querySelector('.footer-word');
function fitWord() {
  word.style.fontSize = '100px';
  const box = word.parentElement, cs = getComputedStyle(box);
  const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  word.style.fontSize = `${(100 * avail) / word.getBoundingClientRect().width}px`;
}
fitWord();
addEventListener('resize', fitWord);
document.fonts?.ready.then(fitWord);

/* ---------- Building rows preselect the project type ---------- */
const typeSelect = document.getElementById('f-type');
document.querySelectorAll('[data-type]').forEach((a) => a.addEventListener('click', () => { typeSelect.value = a.dataset.type; }));

/* ---------- Enquiry form: validated, and honest that nothing is sent yet ---------- */
const form = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const rules = [
  ['f-name', 'e-name', (v) => v.trim().length > 1, 'Tell us who to ask for.'],
  ['f-email', 'e-email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'Enter an email address like name@company.ro.'],
  ['f-type', 'e-type', (v) => v !== '', 'Choose the closest project type.'],
];
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let first = null;
  for (const [id, errId, ok, msg] of rules) {
    const input = document.getElementById(id);
    const valid = ok(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    document.getElementById(errId).textContent = valid ? '' : msg;
    if (!valid && !first) first = input;
  }
  if (first) { first.focus(); return; }
  // TEMP: no endpoint is connected yet. Say so; never pretend it was sent.
  status.hidden = false;
  status.textContent = 'This form is not connected yet, so nothing was sent. Please call or email us directly for now.';
});
`````

### FILE: site/js/nav.js

`````js
// Mobile menu without the usual bugs (pairs with nav.css).
// Below --nav-break the bar turns compact and the burger appears. The menu: locks page scroll (and restores the
// position), closes on a link click, on Esc, on a tap outside and when the window grows past the breakpoint,
// returns focus to the burger, keeps Tab inside while open, and sets aria-expanded. Without JS the links stay a
// normal visible list. Optional: data-nav-hide-on-scroll hides the bar on scroll down and shows it on scroll up.
//
//   import { nav } from './nav.js'; nav();

export function nav({ root = document } = {}) {
  const bar = root.querySelector('[data-nav]');
  if (!bar) return null;
  const toggle = bar.querySelector('[data-nav-toggle]');
  const panel = bar.querySelector('[data-nav-panel]');
  const breakPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-break')) || 860;
  const mq = matchMedia(`(max-width: ${breakPx - 0.02}px)`);
  const scrim = Object.assign(document.createElement('div'), { className: 'nav-scrim' });
  scrim.setAttribute('aria-hidden', 'true');
  bar.after(scrim);
  let open = false; let scrollY = 0;

  const setOpen = (v, { focus = true } = {}) => {
    if (v === open) return;
    open = v;
    bar.classList.toggle('is-open', v);
    scrim.classList.toggle('is-on', v);
    toggle?.setAttribute('aria-expanded', String(v));
    if (v) {
      scrollY = window.scrollY;
      document.documentElement.classList.add('nav-locked');
      panel.querySelector('a, button')?.focus({ preventScroll: true });
    } else {
      document.documentElement.classList.remove('nav-locked');
      window.scrollTo(0, scrollY);
      if (focus) toggle?.focus({ preventScroll: true });
    }
    bar.dispatchEvent(new CustomEvent('nav:toggle', { detail: { open: v } }));
  };
  const apply = () => {
    const compact = mq.matches;
    bar.classList.toggle('nav--compact', compact);
    if (toggle) toggle.hidden = !compact;
    if (!compact) setOpen(false, { focus: false });
  };
  toggle?.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, { focus: false }); });
  const onKey = (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key !== 'Tab') return;
    const items = [toggle, ...panel.querySelectorAll('a, button')].filter(Boolean);
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items.at(-1).focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  };
  document.addEventListener('keydown', onKey);
  mq.addEventListener('change', apply);
  apply();

  if (bar.hasAttribute('data-nav-hide-on-scroll') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let last = window.scrollY;
    bar.style.transition = 'translate 320ms cubic-bezier(.32,.72,0,1)';
    addEventListener('scroll', () => {
      const y = window.scrollY;
      // '' rather than '0 0' when shown: any translate value makes the bar the containing block of the fixed panel.
      if (!open) bar.style.translate = y > last && y > 120 ? '0 calc(-100% - 24px)' : '';
      last = y;
    }, { passive: true });
  }
  return { open: () => setOpen(true), close: () => setOpen(false), get isOpen() { return open; } };
}
`````

### FILE: site/js/reveal.js

`````js
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
`````

### FILE: site/js/scrub-frames.js

`````js
// Scroll-scrubbed image sequence on a <canvas>. Framework-free ES module.
//
//   import { createFrameScrubber, holdAt } from './scrub-frames.js';
//   const s = await createFrameScrubber({ canvas, scene, manifestUrl: '/frames/manifest.json' });
//
// scene  : the tall element (e.g. height 400vh) whose scroll progress drives the sequence; the canvas sits in a sticky child.
// The HTML must already work without this script: put a real <img> poster (and the h1/copy) in the markup under the canvas.
//
// Behaviour: poster first. Frames are fetched by proximity: a few spread anchors and the opening frames on load, then
// a window around the shown frame once the visitor scrolls (desktop goes on to fill in the rest; phones and Save-Data
// stay on the sliding window and drop far-away bytes, the HTTP cache holds them). Only frames near the shown one are decoded: `window * 2` ahead in the direction of travel, `window` behind;
// bitmaps outside that are closed. The shown frame chases the scroll at a capped speed (`maxSpeed` frames per 60 Hz
// frame), so a fling plays through the film instead of skipping around. If the wanted frame isn't decoded yet it holds
// the closest decoded frame ON THE WAY there, never one from the other side (the old "nearest decoded frame anywhere"
// fallback flashed far-away frames on fast scrolls and when scrolling back up). Never draws a blank. One whole frame at
// full opacity per draw: never blend neighbours or fade a still over the film (ghosting; the audit's `frame-blend` check
// fails it). Smoother = more frames. Progress uses the sticky stage's own height, not innerHeight: on phones innerHeight
// changes whenever the address bar shows or hides, which moved the frame every time the scroll direction flipped.
// Paused off-screen and in hidden tabs; reduced motion shows one still frame and never scrubs.
// Phones: when the manifest names a `mobile` set (`darkroom media frames --mobile-width`) and `mobileQuery` matches, that
// set is used instead. Frames are never scaled down here: large ones (4K) shrink the decode window to fit `memoryMB`.
// A few `anchors` spread coarse-to-fine stay decoded once the window has room.
// Breaking points: pass `mapFrame: holdAt([...frames], 0.04)` to make the film rest on chosen frames for a stretch of
// scroll. Never snap or glide the page's scroll to a stop: it fights touch momentum and reads as a glitch.

export async function createFrameScrubber({
  canvas, scene, stage = canvas, manifestUrl, window: R = 12, ease = 0.3, maxSpeed = 4, concurrency = 4, anchors: anchorCount = 9, memoryMB = 600,
  mobileQuery = '(max-width: 1023px)', leanQuery = '(max-width: 1023px)', mapFrame, onFetched, onWait, ahead = 60, behind = 16, startFrames = 8, startAnchors = 5, warm = 0,
  restFrame = 'last', reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches, onFrame,
}) {
  let manifest = await (await fetch(manifestUrl)).json();
  if (manifest.mobile && matchMedia(mobileQuery).matches) {
    manifestUrl = new URL(manifest.mobile, new URL(manifestUrl, location.href)).href;
    manifest = await (await fetch(manifestUrl)).json();
  }
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
  // big frames (4K is ~32 MB decoded each) keep fewer decoded at once instead of being shrunk: full sharpness, bounded memory.
  // The window holds 3R + 1 frames plus the anchors; `memoryMB` caps them (1080p keeps R = 12, 4K drops to R = 3).
  const perFrameMB = (manifest.width * manifest.height * 4) / 1048576 || 8;
  R = Math.max(3, Math.min(R, Math.floor((memoryMB / perFrameMB - anchorCount - 1) / 3)));
  const n = manifest.count;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const toPos = mapFrame ? (p) => clamp(mapFrame(p, n), 0, n - 1) : (p) => p * (n - 1);
  const anchors = coarseToFine(n).slice(0, Math.min(anchorCount, n));
  const anchorSet = new Set(anchors);
  const ctx = canvas.getContext('2d', { alpha: false });
  const blobs = new Array(n).fill(null);
  const bitmaps = new Array(n).fill(null);
  const decoding = new Set();
  const fetchAc = new AbortController();
  const inflight = new Set();
  const tries = new Uint8Array(n);
  const lean = matchMedia(leanQuery).matches || navigator.connection?.saveData === true || (navigator.deviceMemory || 8) <= 4;
  const startSet = [...new Set([...Array.from({ length: Math.min(startFrames, n) }, (_, i) => i), ...anchors.slice(0, startAnchors)])];
  let engaged = false, waiting = false;
  let cur = 0, target = 0, dir = 1, shown = -1, raf = 0, last = 0, running = false, destroyed = false, active = true;

  const progress = () => {
    const r = scene.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - (stage.clientHeight || innerHeight)), 0, 1);
  };

  // The canvas always holds the frame's native pixels, drawn 1:1. Code never resamples a frame; CSS object-fit places it.
  canvas.width = manifest.width; canvas.height = manifest.height;

  function draw(i) {
    const bmp = bitmaps[i];
    if (!bmp) return false;
    ctx.drawImage(bmp, 0, 0);
    shown = i; onFrame?.(i, n);
    return true;
  }

  function nearestLoaded(i) {
    for (let d = 0; d < n; d++) { if (bitmaps[i - d]) return i - d; if (bitmaps[i + d]) return i + d; }
    return -1;
  }
  // frame i if decoded; else the decoded frame closest to i between the one on screen and i; nothing on screen: nearest
  function usable(i) {
    if (bitmaps[i]) return i;
    if (shown >= 0 && bitmaps[shown]) {
      let best = shown;
      for (let k = shown, s = Math.sign(i - shown); k !== i; k += s) if (bitmaps[k]) best = k;
      return best;
    }
    return nearestLoaded(i);
  }

  async function fetchOne(i) {
    if (blobs[i]) return;
    try { blobs[i] = await (await fetch(base + manifest.frames[i].file, { signal: fetchAc.signal })).blob(); } catch { /* aborted or failed: neighbours cover it */ }
  }
  const need = (i) => i >= 0 && i < n && !blobs[i] && !inflight.has(i) && tries[i] < 2;
  function nextFetch() {
    if (!engaged) {
      for (const i of startSet) if (need(i)) return i;
      // while the visitor reads the first screen, buffer the start of the film, so the first scroll never waits
      if (navigator.connection?.saveData !== true) for (let i = 0; i < Math.min(warm, n); i++) if (need(i)) return i;
      return -1;
    }
    const c = Math.round(cur);
    for (let d = 0; d <= ahead; d++) {
      if (need(c + dir * d)) return c + dir * d;
      if (d <= behind && need(c - dir * d)) return c - dir * d;
    }
    if (!lean) for (let d = 1; d < n; d++) { if (need(c + dir * d)) return c + dir * d; if (need(c - dir * d)) return c - dir * d; }
    return -1;
  }
  function evict() {
    if (!lean || warm >= n) return; // a fully buffered film stays in memory: its bytes are small, refetching is not
    const c = Math.round(cur), lo = c - behind - 24, hi = c + ahead + 24;
    for (let i = 0; i < n; i++) if (blobs[i] && (i < lo || i > hi) && !anchorSet.has(i) && !bitmaps[i]) blobs[i] = null;
  }
  function pump() {
    while (!destroyed && inflight.size < 6) {
      const i = nextFetch();
      if (i < 0) return;
      inflight.add(i); tries[i]++;
      fetchOne(i).then(() => { inflight.delete(i); if (blobs[i]) onFetched?.(i, n); evict(); pump(); kick(); });
    }
  }
  const decodeNow = async (i) => { await fetchOne(i); if (blobs[i] && !bitmaps[i]) bitmaps[i] = await createImageBitmap(blobs[i], { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); };

  function decode(i) {
    if (i < 0 || i >= n || bitmaps[i] || decoding.has(i) || !blobs[i]) return;
    decoding.add(i);
    createImageBitmap(blobs[i], { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }).then((bmp) => { if (destroyed) bmp.close(); else bitmaps[i] = bmp; }, () => {})
      .finally(() => { decoding.delete(i); kick(); });
  }

  // decode `R * 2` ahead in the direction of travel and `R` behind; release the rest, except anchors, the frame on
  // screen and the frames between it and the wanted one
  function manageWindow(centre) {
    const ahead = R * 2;
    const lo = dir > 0 ? centre - R : centre - ahead, hi = dir > 0 ? centre + ahead : centre + R;
    const pLo = Math.min(shown, centre), pHi = Math.max(shown, centre);
    for (let i = 0; i < n; i++) {
      if (bitmaps[i] && (i < lo - 4 || i > hi + 4) && !(i >= pLo && i <= pHi) && !anchorSet.has(i)) { bitmaps[i].close(); bitmaps[i] = null; }
    }
    const order = [];
    for (let d = 0; d <= ahead; d++) { order.push(centre + dir * d); if (d && d <= R) order.push(centre - dir * d); }
    order.push(...anchors); // window first, then any anchor still missing
    for (const i of order) { if (decoding.size >= concurrency) break; decode(i); }
  }

  function tick(now) {
    raf = 0;
    if (destroyed || !active || document.hidden) { running = false; return; }
    const dt = Math.min(64, now - (last || now - 16.667)); last = now;
    target = toPos(progress());
    // glide toward the scroll position, never faster than `maxSpeed` frames per 60 Hz frame
    const cap = maxSpeed * dt / 16.667;
    const step = clamp((target - cur) * (1 - (1 - ease) ** (dt / 16.667)), -cap, cap);
    if (step) dir = Math.sign(step);
    cur += step; if (Math.abs(target - cur) < 0.01) cur = target;
    const want = Math.round(cur);
    manageWindow(want); pump();
    const use = usable(want);
    if (use >= 0 && use !== shown) draw(use);
    const late = Math.abs(want - (use < 0 ? want : use)) > 2;
    if (late !== waiting) { waiting = late; onWait?.(late); }
    if (cur !== target || decoding.size) raf = requestAnimationFrame(tick); else running = false;
  }
  function kick() { if (!running && !destroyed && !reducedMotion) { running = true; last = 0; raf = requestAnimationFrame(tick); } }
  const onResize = () => { shown = -1; kick(); };

  const scrubber = {
    io: null, manifest, get frame() { return shown; },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); scrubber.io?.disconnect(); fetchAc.abort();
      removeEventListener('scroll', kick); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', kick);
      bitmaps.forEach((b) => b?.close());
    },
  };

  if (reducedMotion) { // one calm frame, no scrubbing
    const rest = restFrame === 'last' ? n - 1 : restFrame === 'first' ? 0 : Math.round((n - 1) / 2);
    await decodeNow(rest); draw(bitmaps[rest] ? rest : 0);
  } else {
    cur = target = toPos(progress());
    const first = Math.round(cur);
    await decodeNow(first); // the frame for where the page opened, immediately
    draw(first);
    engaged = first > 0;
    pump();
    addEventListener('scroll', () => { if (!engaged) { engaged = true; pump(); } kick(); }, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', kick);
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) kick(); }, { rootMargin: '25% 0px' });
    io.observe(scene);
    scrubber.io = io;
    kick();
  }

  return scrubber;
}

// Breaking points without touching the scroll: the film rests on each of `frames` (0-based) for `hold` of the scroll
// (0.04 = 4 % each) and moves evenly between them. Use as `mapFrame: holdAt([0, 40, 95], 0.05)`.
export function holdAt(frames, hold = 0.04) {
  const stops = [...frames].sort((a, b) => a - b);
  return (p, n) => {
    const k = stops.length;
    if (!k) return p * (n - 1);
    const moving = Math.max(0, 1 - hold * k);
    const segs = []; let prev = 0;
    for (const f of stops) { segs.push({ from: prev, to: f }); prev = f; }
    segs.push({ from: prev, to: n - 1 });
    const total = segs.reduce((s, g) => s + Math.abs(g.to - g.from), 0) || 1;
    let at = 0;
    for (let i = 0; i < segs.length; i++) {
      const len = moving * Math.abs(segs[i].to - segs[i].from) / total;
      if (p <= at + len) return segs[i].from + (segs[i].to - segs[i].from) * (len ? (p - at) / len : 1);
      at += len;
      if (i < k) { if (p <= at + hold) return stops[i]; at += hold; }
    }
    return n - 1;
  };
}

// 0, last, middle, then the middles of each half, and so on: any prefix covers the whole range evenly.
function coarseToFine(n) {
  if (n <= 0) return [];
  const out = [0], seen = new Set([0]);
  if (n > 1) { out.push(n - 1); seen.add(n - 1); }
  let spans = [[0, n - 1]];
  while (spans.length) {
    const next = [];
    for (const [a, b] of spans) {
      if (b - a <= 1) continue;
      const m = Math.floor((a + b) / 2);
      if (!seen.has(m)) { out.push(m); seen.add(m); }
      next.push([a, m], [m, b]);
    }
    spans = next;
  }
  return out;
}
`````

### FILE: site/img/projects/CREDITS.json

`````json
[
 {
  "slug": "bucharest-aerial",
  "file": "bucharest-aerial.jpg",
  "city": "Bucharest",
  "kind": "Residential district, under construction",
  "title": "Atria Urban Resort vedere de ansamblu.jpg",
  "artist": "Atria Urban Resort",
  "licence": "CC BY-SA 4.0",
  "source": "https://commons.wikimedia.org/wiki/File:Atria_Urban_Resort_vedere_de_ansamblu.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/5/58/Atria_Urban_Resort_vedere_de_ansamblu.jpg",
  "width": 4000,
  "height": 3000,
  "read": "2026-11-06",
  "web": "site/img/projects/bucharest-aerial.webp"
 },
 {
  "slug": "bucharest-residential",
  "file": "bucharest-residential.jpg",
  "city": "Bucharest",
  "kind": "Apartment blocks",
  "title": "Atria Urban Resort Faza 2.jpg",
  "artist": "Atria Urban Resort",
  "licence": "CC BY-SA 4.0",
  "source": "https://commons.wikimedia.org/wiki/File:Atria_Urban_Resort_Faza_2.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/7/74/Atria_Urban_Resort_Faza_2.jpg",
  "width": 1920,
  "height": 1080,
  "read": "2026-11-06",
  "web": "site/img/projects/bucharest-residential.webp"
 },
 {
  "slug": "bucharest-courtyard",
  "file": "bucharest-courtyard.jpg",
  "city": "Bucharest",
  "kind": "Residential courtyard",
  "title": "THE-IVY-BUCURESTI-BANEASA-ANSAMBLU-VERDE.jpg",
  "artist": "SPEEDWELL Development",
  "licence": "CC BY-SA 4.0",
  "source": "https://commons.wikimedia.org/wiki/File:THE-IVY-BUCURESTI-BANEASA-ANSAMBLU-VERDE.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/2/27/THE-IVY-BUCURESTI-BANEASA-ANSAMBLU-VERDE.jpg",
  "width": 3000,
  "height": 1688,
  "read": "2026-11-06",
  "web": "site/img/projects/bucharest-courtyard.webp"
 },
 {
  "slug": "brasov-quarter",
  "file": "brasov-quarter.jpg",
  "city": "Brașov",
  "kind": "Residential quarter",
  "title": "Brasov Coresi Quarter.jpg",
  "artist": "Pl71",
  "licence": "CC0",
  "source": "https://commons.wikimedia.org/wiki/File:Brasov_Coresi_Quarter.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Brasov_Coresi_Quarter.jpg",
  "width": 4000,
  "height": 1868,
  "read": "2026-11-06",
  "web": "site/img/projects/brasov-quarter.webp"
 },
 {
  "slug": "iasi-mixed",
  "file": "iasi-mixed.jpg",
  "city": "Iași",
  "kind": "Mixed-use district",
  "title": "Iasi, Public Garden Palas 14.jpg",
  "artist": "Argenna",
  "licence": "CC BY-SA 4.0",
  "source": "https://commons.wikimedia.org/wiki/File:Iasi,_Public_Garden_Palas_14.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Iasi%2C_Public_Garden_Palas_14.jpg",
  "width": 4344,
  "height": 3264,
  "read": "2026-11-06",
  "web": "site/img/projects/iasi-mixed.webp"
 },
 {
  "slug": "timisoara-offices",
  "file": "timisoara-offices.jpg",
  "city": "Timișoara",
  "kind": "Office centre",
  "title": "City Business Center Timișoara 2022.jpg",
  "artist": "Irimia florin",
  "licence": "CC BY-SA 4.0",
  "source": "https://commons.wikimedia.org/wiki/File:City_Business_Center_Timi%C8%99oara_2022.jpg",
  "original": "https://upload.wikimedia.org/wikipedia/commons/1/12/City_Business_Center_Timi%C8%99oara_2022.jpg",
  "width": 2048,
  "height": 1536,
  "read": "2026-11-06",
  "web": "site/img/projects/timisoara-offices.webp"
 }
]
`````

## 6. Why it is this way (do not "fix" these)

**The brand.** Ardent Build is a fictional general contractor in Romania. The idea is "Built exactly as drawn": the architect's level mark and dimension line are the design device, and the page measures the building.

**The hero film**
- Scroll-scrubbed 241-frame film on a `<canvas>`, driven by native scroll. Never hijack the wheel or snap.
- Pinned from the first pixel of scroll to the last frame. The last frame then holds while the next section rises over it.
- Full page width, starting at the very top of the window behind a transparent nav. On short windows the road at the bottom is trimmed, never the building. It is never letterboxed.
- No scrims, gradients or shadows over the film. Text sits in the sky on the left, aligned with the logo.
- The canvas backing store stays at the frame's native size and is drawn 1:1. CSS does the fitting. Frames are never upscaled, and two frames are never blended.
- The nav links sit beside the logo because that part of the sky stays clear through the whole film.

**The survey line.** A 1 px line follows the building's measured roofline as it rises, ends with a tick on the building's corner, and reads the level. The `ROOF` table in `main.js` was measured from the film. It is hidden below 1024 px.

**"As drawn, as built".** The drawing is traced in code from `end.png`, so it aligns exactly with the photo. It is an illustration, not a real architect's drawing. Scroll wipes one into the other, resting briefly at each end.

**Frames by screen size**
- Up to 640 px: the phone set. It is the square slice phones show, cut at native pixels and never resized, then compressed at WebP q84. Lossless frames managed about 4 frames a second on a simulated phone.
- Phones buffer the whole film while the visitor reads the first screen, except on Data Saver or 2G/3G.
- 641 px and wider, including tablets: the lossless 1916×1080 set, loaded by proximity.

**Look.** Light theme, 60-30-10: paper and concrete, graphite from the roof, timber from the facade fins. Archivo only, in sentence case except the wordmark. Square corners. Lucide icons, no emoji. No labels above headings, no stat banners, no marquee. The enquiry and footer are the one dark area. Text caps at 1520 px through the gutter, while the film and pictures stay full width.

**Honesty, which must stay**
- The form validates, then says it is not connected and nothing was sent. Do not add a fake success message.
- The six project photos are other developers' buildings. They stay labelled as samples, with credits.
- The footer says the company is fictional. The phone number, the email address and all business claims are placeholders.

## 7. Checks

**Files.** Convert line endings to LF, then hash. Every file must match:

| File | SHA-256 (LF endings) |
|---|---|
| `site/index.html` | `5beee97109b2d597` |
| `site/css/fonts.css` | `ad0efbae0195d71b` |
| `site/css/nav.css` | `86cd1723992c3d93` |
| `site/css/reveal.css` | `8152f66e7ef54367` |
| `site/css/site.css` | `6a24b6588390cf73` |
| `site/js/main.js` | `0d807a5a34c1343f` |
| `site/js/nav.js` | `2480d75a46851c69` |
| `site/js/reveal.js` | `f69b38e8561f1b24` |
| `site/js/scrub-frames.js` | `7a9f27b8fa2787fa` |
| `site/img/projects/CREDITS.json` | `0ee74c14ad8a501d` |

**Images**
- `img/start.png`, `middle1.png`, `middle2.png` and `end.png` match `assets/` byte for byte.
- `frames/seq_*.webp` decode to the same pixels as the source film through the recipe in section 3. Compare at least frames 1, 101 and 241.
- `frames/manifest.json` has 241 entries and `"mobile": "mobile/manifest.json"`.

**Behaviour.** Use a real browser and scroll at each size.

| Check | 1900×942 | 1440×900 | 390×844 (touch) |
|---|---|---|---|
| Film frame top while scrolling | 0 px | 0 px | 0 px |
| Canvas backing size | 1916×1080 | 1916×1080 | 1080×1080 |
| Sideways overflow | 0 | 0 | 0 |
| Console errors or failed requests | none | none | none |
| Empty form submit | 3 field errors | 3 field errors | 3 field errors |
| Valid form submit | "This form is not connected yet, so nothing was sent…" | same | same |

**Also confirm**
- At 1440×900 before scrolling: empty plot at sunset, transparent nav, "Built exactly as drawn." and one sentence in the sky on the left, aligned with the logo.
- Mid-film on desktop: the survey line ends on the building's left corner and reads a level, finishing at "Roof, level 8".
- With reduced motion: the last frame shows as a still, nothing pins, the wipe rests half and half, and all text is readable.
- Below 1024 px: a burger menu opens a full-screen list and closes on Esc.

Report the checks when done, with anything that differs from this document.
