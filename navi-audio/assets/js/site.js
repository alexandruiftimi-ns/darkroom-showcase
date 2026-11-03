// Navi Audio & Retrofits Botoșani
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  root.classList.add('js');

  // apariție
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));

  // poveste
  const paras = [...document.querySelectorAll('.read p')].map((p) => {
    const words = [];
    p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span class="rw">${w}</span>`).join(' ');
    p.querySelectorAll('.rw').forEach((w) => words.push(w));
    return { el: p, words };
  });

  const nav = document.querySelector('.nav');
  const up = document.querySelector('.upgrade');

  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight;
    nav?.classList.toggle('is-scrolled', scrollY > 20);
    if (reduce) return;

    if (up) {
      const r = up.getBoundingClientRect();
      const p = clamp(-r.top / (up.offsetHeight - vh));
      const w = clamp((p - 0.22) / 0.5);
      up.style.setProperty('--sp', clamp(p / 0.22 + (vh - r.top > 0 ? 0 : 0)).toFixed(4));
      up.style.setProperty('--w', w.toFixed(4));
      up.classList.toggle('is-after', w > 0.5);
    }

    paras.forEach((p) => {
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 1.5) return;
      const lit = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.45)) * (p.words.length + 4);
      p.words.forEach((w, i) => w.style.setProperty('--o', clamp(lit - i).toFixed(2)));
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (reduce) paras.forEach((p) => p.words.forEach((w) => w.style.setProperty('--o', 1)));
  frame();

  // video
  document.querySelectorAll('.vid').forEach((box) => {
    const v = box.querySelector('video');
    const btn = box.querySelector('.sound');
    if (!reduce) {
      new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.35 }).observe(v);
    }
    btn?.addEventListener('click', () => {
      v.muted = !v.muted;
      btn.setAttribute('aria-pressed', String(!v.muted));
      if (!v.muted) v.play().catch(() => {});
    });
  });

  // meniu – hover
  const links = document.querySelector('.links');
  const lens = links?.querySelector('.lens');
  const moveLens = (a) => { lens.style.width = `${a.offsetWidth}px`; lens.style.transform = `translateX(${a.offsetLeft}px)`; };
  links?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('pointerenter', () => moveLens(a));
    a.addEventListener('focus', () => moveLens(a));
  });

  // hero
  const heroEl = document.querySelector('.hero');
  if (heroEl && !reduce) {
    const fine = matchMedia('(pointer: fine)').matches;
    if (fine) heroEl.addEventListener('pointermove', (e) => {
      const r = heroEl.getBoundingClientRect();
      heroEl.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * -18}px`);
      heroEl.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * -12}px`);
    });
    const depth = () => {
      const y = Math.min(scrollY, innerHeight);
      heroEl.style.setProperty('--hy', `${y * 0.22}px`);
      heroEl.style.setProperty('--ty', `${y * -0.12}px`);
    };
    addEventListener('scroll', () => requestAnimationFrame(depth), { passive: true });
    depth();
  }

  // proiecte
  const hlRoot = document.querySelector('.highlights');
  if (hlRoot) {
    const cards = [...hlRoot.querySelectorAll('.hl')];
    const dots = [...hlRoot.querySelectorAll('.dot')];
    const play = hlRoot.querySelector('.hl-play');
    const DUR = 6000;
    let cur = 1, t0 = performance.now(), playing = !reduce, seen = false, held = 0, holding = false, kbd = false;
    const restart = () => { t0 = performance.now(); held = 0; dots[cur]?.style.setProperty('--t', 0); };
    const set = (i) => {
      cur = (i + cards.length) % cards.length;
      hlRoot.style.setProperty('--i', cur);
      cards.forEach((c, k) => {
        c.classList.toggle('is-on', k === cur); c.setAttribute('aria-hidden', String(k !== cur));
        c.querySelectorAll('button, a').forEach((x) => { x.tabIndex = k === cur ? 0 : -1; });
      });
      dots.forEach((d, k) => { d.classList.toggle('is-on', k === cur); d.setAttribute('aria-current', String(k === cur)); d.style.setProperty('--t', 0); });
      restart();
    };
    const go = (i) => set(Math.max(0, Math.min(cards.length - 1, i)));
    const setPlaying = (on) => {
      playing = on;
      play.classList.toggle('is-paused', !on);
      play.setAttribute('aria-label', on ? 'Pauză' : 'Redă');
      if (on) t0 = performance.now() - held * DUR;
    };
    dots.forEach((d, k) => d.addEventListener('click', () => set(k)));
    cards.forEach((c, k) => c.addEventListener('click', (e) => { if (k !== cur) { e.preventDefault(); e.stopPropagation(); set(k); } }, true));
    play.addEventListener('click', () => setPlaying(!playing));
    hlRoot.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
    });
    // drag / swipe
    let x0 = null, y0 = 0, dx = 0, axis = null, moved = false, pid = null;
    const width = () => cards[0].getBoundingClientRect().width;
    hlRoot.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; axis = null; moved = false; pid = e.pointerId;
      holding = true;
    });
    hlRoot.addEventListener('pointermove', (e) => {
      if (x0 === null || e.pointerId !== pid) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (!axis) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        axis = e.pointerType === 'mouse' || Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (axis === 'y') { x0 = null; holding = false; return; }
        if (e.pointerType === 'mouse') hlRoot.setPointerCapture(pid);
        hlRoot.classList.add('is-dragging');
      }
      moved = true;
      const edge = (cur === 0 && mx > 0) || (cur === cards.length - 1 && mx < 0);
      dx = edge ? mx * 0.35 : mx;
      hlRoot.style.setProperty('--drag', `${dx}px`);
      e.preventDefault();
    });
    const end = (e) => {
      holding = false;
      if (x0 === null || (e && e.pointerId !== pid)) { t0 = performance.now() - held * DUR; return; }
      hlRoot.classList.remove('is-dragging');
      hlRoot.style.setProperty('--drag', '0px');
      if (axis === 'x') {
        const steps = Math.round(-dx / (width() * 0.5));
        const n = Math.max(-2, Math.min(2, steps || (Math.abs(dx) > 50 ? (dx < 0 ? 1 : -1) : 0)));
        if (n) go(cur + n);
      }
      restart();
      x0 = null; axis = null;
    };
    hlRoot.addEventListener('pointerup', end);
    hlRoot.addEventListener('pointercancel', end);
    hlRoot.addEventListener('click', (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; }
      if (e.target.closest('.gal__th')) restart();
    }, true);
    hlRoot.addEventListener('dragstart', (e) => e.preventDefault());
    // trackpad
    let wAcc = 0, wLock = false, wIdle;
    hlRoot.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      clearTimeout(wIdle);
      wIdle = setTimeout(() => { wLock = false; wAcc = 0; }, 220);
      if (wLock) return;
      wAcc += e.deltaX;
      if (Math.abs(wAcc) > 40) { go(cur + (wAcc > 0 ? 1 : -1)); wLock = true; wAcc = 0; }
    }, { passive: false });
    hlRoot.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) kbd = true; });
    hlRoot.addEventListener('focusout', () => { if (kbd) { kbd = false; t0 = performance.now() - held * DUR; } });
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) t0 = performance.now() - held * DUR; }, { threshold: 0.35 }).observe(hlRoot);
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (!playing || !seen || holding || kbd) { if (holding || kbd) t0 = now - held * DUR; return; }
      held = (now - t0) / DUR;
      dots[cur].style.setProperty('--t', Math.min(held, 1).toFixed(3));
      if (held >= 1) set(cur + 1);
    };
    set(cur); setPlaying(playing);
    requestAnimationFrame(tick);
  }
  // galerii
  document.querySelectorAll('.gal').forEach((g) => {
    const mains = [...g.querySelectorAll('.gal__main img')];
    const ths = [...g.querySelectorAll('.gal__th')];
    const amb = g.closest('.hl')?.querySelector('.hl__amb');
    ths.forEach((t, i) => t.addEventListener('click', () => {
      mains.forEach((m, k) => m.classList.toggle('is-on', k === i));
      ths.forEach((x, k) => x.classList.toggle('is-on', k === i));
      if (amb) amb.style.backgroundImage = `url('${mains[i].getAttribute('src')}')`;
    }));
  });

  // postare
  const dlg = document.querySelector('dialog.post');
  if (dlg) {
    const img = dlg.querySelector('img');
    document.querySelectorAll('.post-btn').forEach((b) => b.addEventListener('click', () => {
      img.src = b.dataset.post; img.alt = `Postarea originală: ${b.dataset.title}`;
      dlg.showModal();
    }));
    dlg.querySelector('.post__x').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }
  // produse – filtre
  const fl = document.querySelector('.filters');
  if (fl) {
    const lensF = fl.querySelector('.filters__lens');
    const btns = [...fl.querySelectorAll('button')];
    const grid = document.querySelector('.products');
    const prods = [...grid.querySelectorAll('.prod')];
    const place = (b) => { lensF.style.width = `${b.offsetWidth}px`; lensF.style.transform = `translateX(${b.offsetLeft}px)`; };
    const apply = (f) => prods.forEach((p) => p.classList.toggle('is-hidden', f !== 'all' && p.dataset.cat !== f));
    const ease = 'cubic-bezier(.16,1,.3,1)';
    const swap = (f) => {
      const before = new Map(prods.filter((p) => !p.classList.contains('is-hidden')).map((p) => [p, p.getBoundingClientRect()]));
      prods.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));
      apply(f);
      if (reduce) return;
      prods.forEach((p) => {
        if (p.classList.contains('is-hidden')) return;
        const now = p.getBoundingClientRect(), was = before.get(p);
        if (was) p.animate([{ transform: `translate(${was.left - now.left}px,${was.top - now.top}px)` }, { transform: 'none' }], { duration: 550, easing: ease });
        else p.animate([{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: ease });
      });
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      place(b);
      swap(b.dataset.f);
    }));
    const init = () => place(fl.querySelector('button.is-on'));
    init(); addEventListener('resize', init); document.fonts?.ready.then(init);
  }
  // temă
  const themeBtns = [...document.querySelectorAll('.theme-btn')];
  const mq = matchMedia('(prefers-color-scheme: light)');
  const mode = () => root.dataset.theme || (mq.matches ? 'light' : 'dark');
  const sync = () => {
    root.dataset.mode = mode();
    themeBtns.forEach((b) => {
      b.setAttribute('aria-label', mode() === 'light' ? 'Treci la tema întunecată' : 'Treci la tema luminoasă');
      const v = b.querySelector('.theme-row__value');
      if (v) v.textContent = mode() === 'light' ? 'Luminoasă' : 'Întunecată';
    });
  };
  let themeVT = null;
  themeBtns.forEach((tb) => tb.addEventListener('click', async () => {
    if (themeVT) { themeVT.skipTransition(); await themeVT.updateCallbackDone.catch(() => {}); }
    const next = mode() === 'light' ? 'dark' : 'light';
    const swap = () => {
      if (next === (mq.matches ? 'light' : 'dark')) delete root.dataset.theme; else root.dataset.theme = next;
      try { root.dataset.theme ? localStorage.setItem('navi-theme', next) : localStorage.removeItem('navi-theme'); } catch (e) {}
      sync();
    };
    if (document.startViewTransition && !reduce) {
      themeVT = document.startViewTransition(swap);
      themeVT.finished.finally(() => { themeVT = null; });
    } else swap();
  }));
  mq.addEventListener?.('change', sync);
  sync();
  // meniu mobil
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  if (burger && menu) {
    const setMenu = (open) => {
      menu.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Închide meniul' : 'Deschide meniul');
      nav?.classList.toggle('is-menu', open);
      if (open) menu.querySelector('a')?.focus({ preventScroll: true });
    };
    burger.addEventListener('click', () => setMenu(menu.hidden));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
    document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !burger.contains(e.target)) setMenu(false); });
    matchMedia('(min-width: 1024px)').addEventListener?.('change', (e) => { if (e.matches) setMenu(false); });
  }
  // testimoniale
  const voices = [...document.querySelectorAll('.voice')];
  const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    vio.unobserve(e.target);
    const k = voices.indexOf(e.target) % 3;
    setTimeout(() => {
      e.target.classList.add('is-typing');
      setTimeout(() => e.target.classList.add('is-in'), reduce ? 0 : 900);
    }, reduce ? 0 : k * 250);
  }), { rootMargin: '0px 0px -18% 0px' });
  voices.forEach((v) => (reduce ? v.classList.add('is-typing', 'is-in') : vio.observe(v)));
  // testimoniale – mai multe
  const more = document.querySelector('.voices__more');
  more?.addEventListener('click', () => {
    const wall = document.querySelector('.voices__wall');
    wall.classList.add('is-all');
    more.setAttribute('aria-expanded', 'true');
    wall.querySelectorAll('.voice:nth-child(n+4)').forEach((v) => v.classList.add('is-typing', 'is-in'));
  });
})();
