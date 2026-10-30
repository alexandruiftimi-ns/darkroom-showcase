(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;

  /* ============================================================
     HERO — cursor-scrubbed / autoplay-loop frame sequence
     73 frames, 1-indexed, frame 37 = centered "looking at you".
     ============================================================ */
  (function hero() {
    const scene = document.getElementById("heroScene");
    const img = document.getElementById("heroFrame");
    const bg = document.getElementById("heroFrameBg");
    const hero = document.getElementById("hero");
    if (!scene || !img || !hero) return;

    const TOTAL = 179;
    const CENTER = 90;
    const folder = isCoarsePointer ? "mobile" : "desktop";
    const path = (n) => `assets/frames/${folder}/frame-${String(n).padStart(3, "0")}.webp`;

    // Reduced motion / save-data: static center frame only, nothing else to do.
    if (reducedMotion || saveData) {
      img.src = path(CENTER);
      if (bg) bg.src = path(CENTER);
      return;
    }

    const frames = new Array(TOTAL + 1); // 1-indexed
    let loadedCount = 0;

    function loadFrame(n) {
      if (frames[n]) return frames[n];
      const im = new Image();
      im.decoding = "async";
      im.src = path(n);
      im.onload = () => { loadedCount++; };
      frames[n] = im;
      return im;
    }

    // Load center first and show it immediately, then fan outward.
    loadFrame(CENTER);
    let outward = 1;
    function loadNext() {
      const left = CENTER - outward;
      const right = CENTER + outward;
      let more = false;
      if (left >= 1) { loadFrame(left); more = true; }
      if (right <= TOTAL) { loadFrame(right); more = true; }
      outward++;
      if (more) {
        (window.requestIdleCallback || window.requestAnimationFrame)(loadNext);
      }
    }
    (window.requestIdleCallback || window.requestAnimationFrame)(loadNext);

    function showFrame(n) {
      n = Math.max(1, Math.min(TOTAL, Math.round(n)));
      const im = frames[n] || loadFrame(n);
      if (im.complete && im.src) {
        img.src = im.src;
        if (bg) bg.src = im.src;
      }
    }

    if (isCoarsePointer) {
      // Mobile: gentle perfect-loop ping-pong, no pointer needed.
      let current = CENTER;
      let dir = 1;
      let last = 0;
      const FPS = 32;
      const frameTime = 1000 / FPS;

      function tick(ts) {
        if (!last) last = ts;
        if (ts - last >= frameTime) {
          last = ts;
          current += dir;
          if (current >= TOTAL) { current = TOTAL; dir = -1; }
          if (current <= 1) { current = 1; dir = 1; }
          showFrame(current);
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      return;
    }

    // Desktop: cursor-driven scrub, smoothly eased toward target.
    let target = CENTER;
    let displayed = CENTER;

    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const normalized = (x - 0.5) * 2; // -1..1
      target = CENTER + normalized * (CENTER - 1);
      target = Math.max(1, Math.min(TOTAL, target));
    });

    hero.addEventListener("pointerleave", () => {
      target = CENTER;
    });

    function raf() {
      displayed += (target - displayed) * 0.1;
      if (Math.abs(target - displayed) < 0.05) displayed = target;
      showFrame(displayed);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  })();

  /* ============================================================
     CTA BUTTON — truly unreachable. Flees the cursor, flees the
     keyboard, never activates, no matter how it's approached.
     ============================================================ */
  (function ctaButton() {
    const zone = document.getElementById("ctaZone");
    const btn = document.getElementById("ctaButton");
    const label = document.getElementById("ctaLabel");
    if (!zone || !btn || !label) return;

    const taunts = [
      "Nice try.",
      "Not today.",
      "...nope.",
      "Ask again never",
      "Productivity is cancelled",
      "Try the leaf instead →",
      "404: Motivation not found",
      "This button has quit",
      "Still no.",
      "Tab won't work either",
      "Nope, not with that key",
      "It can see your cursor coming",
      "Bold of you to assume",
      "This is a load-bearing joke",
    ];

    let attempts = 0;
    let roaming = false;
    let fleeTimer = null;
    const PROXIMITY = 170; // px — start fleeing once the pointer gets this close
    const milestones = [10, 25, 50, 100];
    const milestoneLines = {
      10: "10 attempts. The button respects the hustle. It will still not be clicked.",
      25: "25 attempts. This is now a lifestyle.",
      50: "50 attempts. Blossom is mildly impressed.",
      100: "100 attempts. There is no catch. There was never a catch.",
    };

    function setLabel() {
      attempts++;
      label.textContent = taunts[(attempts - 1) % taunts.length];
      if (milestones.includes(attempts)) {
        showToast(milestoneLines[attempts]);
      }
    }

    function enterRoamingMode() {
      if (roaming) return;
      roaming = true;
      const rect = btn.getBoundingClientRect();
      btn.classList.add("is-roaming");
      btn.style.left = `${rect.left}px`;
      btn.style.top = `${rect.top}px`;
    }

    function randomSpot(awayFrom) {
      const bw = btn.offsetWidth || 260;
      const bh = btn.offsetHeight || 64;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Allow it to dash slightly off-screen for comic effect, then it's pulled back next move.
      const minX = -bw * 0.4;
      const maxX = vw - bw * 0.6;
      const minY = -bh * 0.3;
      const maxY = vh - bh * 0.9;

      let x, y, tries = 0;
      do {
        x = minX + Math.random() * (maxX - minX);
        y = minY + Math.random() * (maxY - minY);
        tries++;
      } while (
        awayFrom &&
        tries < 8 &&
        Math.hypot(x + bw / 2 - awayFrom.x, y + bh / 2 - awayFrom.y) < PROXIMITY * 1.6
      );
      return { x, y };
    }

    function flee(awayFrom) {
      enterRoamingMode();
      btn.classList.add("is-fleeing");
      const { x, y } = randomSpot(awayFrom);
      btn.style.left = `${x}px`;
      btn.style.top = `${y}px`;
      setLabel();
      clearTimeout(fleeTimer);
      fleeTimer = setTimeout(() => btn.classList.remove("is-fleeing"), 300);
    }

    // --- Mouse / pointer: flee on proximity, anywhere on the page ---
    if (!isCoarsePointer) {
      let lastFlee = 0;
      document.addEventListener("pointermove", (e) => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const now = performance.now();
        if (dist < PROXIMITY && now - lastFlee > 260) {
          lastFlee = now;
          flee({ x: e.clientX, y: e.clientY });
        }
      });
    }

    // --- Touch: any touch near/on it sends it away instead of tapping ---
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        flee({ x: t.clientX, y: t.clientY });
      },
      { passive: false }
    );

    // --- Keyboard: tabbing to it, or pressing it, both fail ---
    btn.addEventListener("focus", () => {
      flee(null);
      label.textContent = "caught you tabbing";
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        e.stopPropagation();
        flee(null);
        btn.blur();
      }
    });

    // --- Belt and suspenders: a click should never fire, but if one
    //     somehow does (synthetic events, a11y tools), refuse it too.
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      flee(null);
    });

    // Prime the home position without roaming until first provoked.
    btn.addEventListener(
      "mouseenter",
      () => {
        flee({ x: 0, y: 0 });
      },
      { once: true }
    );
  })();

  /* ============================================================
     TIME WASTED COUNTER — nav + visitor leaderboard row
     ============================================================ */
  (function timeWasted() {
    const navValue = document.getElementById("timeWastedValue");
    const visitorStat = document.getElementById("visitorStat");
    const visitorPlace = document.getElementById("visitorPlace");
    const start = performance.now();

    function format(totalSeconds, withHours) {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = Math.floor(totalSeconds % 60);
      const pad = (n) => String(n).padStart(2, "0");
      return withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    }

    function rankFor(seconds) {
      if (seconds >= 45) return 1;
      if (seconds >= 25) return 2;
      if (seconds >= 12) return 3;
      return 5;
    }

    function tick() {
      const seconds = (performance.now() - start) / 1000;
      if (navValue) navValue.textContent = format(seconds, true);
      if (visitorStat) visitorStat.textContent = format(seconds, false);
      if (visitorPlace) visitorPlace.textContent = String(rankFor(seconds)).padStart(2, "0");
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  (function reveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reducedMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 6, 5) * 70}ms`;
      io.observe(el);
    });
  })();

  /* ============================================================
     PRODUCTIVITY DIAL — always snaps back to chaotic
     ============================================================ */
  (function dial() {
    const track = document.getElementById("dial");
    const fill = document.getElementById("dialFill");
    const handle = document.getElementById("dialHandle");
    const note = document.getElementById("dialNote");
    if (!track || !fill || !handle || !note) return;

    const notes = [
      "currently: blissfully chaotic",
      "nope, snapping back",
      "productivity rejected",
      "the dial knows what it wants",
    ];

    function nudge() {
      const target = 70 + Math.random() * 20;
      fill.style.width = `${target}%`;
      handle.style.left = `${target}%`;
      note.textContent = notes[1 + Math.floor(Math.random() * 2)];
      setTimeout(() => {
        fill.style.width = "18%";
        handle.style.left = "18%";
        note.textContent = notes[0];
      }, 550);
    }

    track.querySelector(".dial__track").addEventListener("click", nudge);
  })();

  /* ============================================================
     LEAF — draggable, drifts back to center
     ============================================================ */
  (function leaf() {
    const pond = document.getElementById("leafPond");
    const leaf = document.getElementById("leaf");
    if (!pond || !leaf) return;

    let dragging = false;
    let offsetX = 0, offsetY = 0;

    function setPos(x, y) {
      const pw = pond.clientWidth, ph = pond.clientHeight;
      const lw = leaf.offsetWidth, lh = leaf.offsetHeight;
      x = Math.max(lw / 2, Math.min(pw - lw / 2, x));
      y = Math.max(lh / 2, Math.min(ph - lh / 2, y));
      leaf.style.left = `${x}px`;
      leaf.style.top = `${y}px`;
    }

    function pointFromEvent(e) {
      const rect = pond.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    function start(e) {
      dragging = true;
      leaf.style.transition = "none";
    }
    function move(e) {
      if (!dragging) return;
      const p = pointFromEvent(e);
      setPos(p.x, p.y);
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      leaf.style.transition = "left 1.1s cubic-bezier(.22,1,.36,1), top 1.1s cubic-bezier(.22,1,.36,1)";
      setPos(pond.clientWidth / 2, pond.clientHeight / 2);
    }

    leaf.addEventListener("pointerdown", (e) => { start(e); leaf.setPointerCapture(e.pointerId); });
    leaf.addEventListener("pointermove", move);
    leaf.addEventListener("pointerup", end);
    leaf.addEventListener("pointercancel", end);
  })();

  /* ============================================================
     AFFIRMATION GENERATOR
     ============================================================ */
  (function affirmations() {
    const btn = document.getElementById("affirmButton");
    const out = document.getElementById("affirmOutput");
    if (!btn || !out) return;

    const lines = [
      "The to-do list will still be there tomorrow. So will you. Probably.",
      "Resting is just productivity with better lighting.",
      "You haven't failed to start. You've succeeded at not starting.",
      "Somewhere, a spreadsheet misses you. Let it.",
      "Doing nothing is hard work. You're killing it.",
      "Deadlines are just suggestions wearing a costume.",
      "Your inbox called. It's fine. It can wait.",
      "Greatness is 1% inspiration, 99% looking at a stream.",
    ];

    btn.addEventListener("click", () => {
      const line = lines[Math.floor(Math.random() * lines.length)];
      out.style.opacity = 0;
      setTimeout(() => {
        out.textContent = `"${line}"`;
        out.style.opacity = 1;
      }, 180);
    });
  })();

  /* ============================================================
     NEWSLETTER — joke submit
     ============================================================ */
  (function newsletter() {
    const form = document.getElementById("newsletterForm");
    const note = document.getElementById("newsletterNote");
    if (!form || !note) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.textContent = "Subscribed to absolutely nothing. Well done.";
      showToast("You're in. For updates that will never come.");
      form.reset();
    });
  })();

  /* ============================================================
     TOAST
     ============================================================ */
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }
  window.__showToast = showToast;
})();
