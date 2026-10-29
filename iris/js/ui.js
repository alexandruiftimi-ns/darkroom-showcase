// Story scroll (native, no hijack), chapter overlays, liquid-glass controls, dialog, toast, signal feed.
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function initUI({ onRandomize, reduced }) {
  const root = document.documentElement;
  const chapters = [...document.querySelectorAll('.chapter[data-chapter]')];
  const track = document.querySelector('.track');
  const last = chapters.length - 1;
  let H = 1;
  let active = -1;

  if (navigator.userAgentData?.brands?.some((b) => /Chromium/.test(b.brand))) root.classList.add('lg-refract');

  /* ---------- story scroll ---------- */
  function layout() {
    H = innerHeight * 1.6;
    track.style.height = `${last * H + innerHeight}px`;
    render();
  }
  const progress = () => Math.max(0, scrollY / H);

  function render() {
    const x = progress();
    let best = 0, bestO = -1;
    chapters.forEach((el, i) => {
      const u = x - i;
      const inA = i === 0 ? 1 : smooth(-0.12, 0, u);
      const outA = i === last ? 1 : 1 - smooth(0.5, 0.64, u);
      const o = inA * outA;
      if (o > bestO) { bestO = o; best = i; }
      const full = o > 0.999;
      el.style.opacity = full ? '' : o.toFixed(3);
      el.style.transform = full ? '' : `translate3d(0, ${((1 - inA) * 28).toFixed(1)}px, 0) scale(${((0.95 + 0.05 * inA) * (1 + (1 - outA) * 0.14)).toFixed(4)})`;
      el.style.setProperty('--blur', `${((1 - outA) * 10 + (1 - inA) * 6).toFixed(1)}px`);
      const vis = o > 0.01;
      if (vis !== el._vis) {
        el._vis = vis;
        el.style.visibility = vis ? '' : 'hidden';
        el.inert = !vis;
      }
    });
    if (best !== active) {
      active = best;
      chapters[best].classList.add('is-seen');
      document.body.dataset.active = best;
      document.querySelectorAll('[data-goto]').forEach((a) => {
        if (+a.dataset.goto === best) a.setAttribute('aria-current', 'step');
        else a.removeAttribute('aria-current');
      });
      moveLens();
    }
    document.querySelector('.rail__fill')?.style.setProperty('--p', (x / last).toFixed(4));
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; render(); });
  }, { passive: true });
  addEventListener('resize', layout);

  function goTo(i) {
    const top = i >= last ? root.scrollHeight : (i + 0.06) * H;
    scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('[data-goto]').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); goTo(+a.dataset.goto); closeMenu(); }));

  /* ---------- nav lens (sliding glass pill) ---------- */
  const nav = document.querySelector('.nav__list');
  const lens = document.querySelector('.nav__lens');
  function moveLens() {
    if (!nav || !lens) return;
    const link = nav.querySelector(`[data-goto="${active}"]`);
    if (!link) return;
    lens.style.width = `${link.offsetWidth}px`;
    lens.style.transform = `translateX(${link.offsetLeft}px)`;
  }

  /* ---------- mobile menu ---------- */
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  function closeMenu() {
    if (!menu?.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn?.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- liquid-glass specular follows the pointer ---------- */
  addEventListener('pointermove', (e) => {
    const g = e.target.closest?.('.glass');
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    g.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  }, { passive: true });

  /* ---------- dialog + forms ---------- */
  const dialog = document.getElementById('access');
  document.querySelectorAll('[data-open-access]').forEach((b) => b.addEventListener('click', () => dialog.showModal()));
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  document.querySelectorAll('form[data-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        if (form.dataset.endpoint) {
          const res = await fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) });
          if (!res.ok) throw new Error(res.statusText);
        }
        form.reset();
        form.closest('dialog')?.close();
        toast(form.dataset.success || 'Received.');
      } catch {
        toast('That didn’t go through. Try again in a moment.');
      } finally {
        btn.disabled = false;
      }
    });
  });

  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3600);
  }

  document.querySelector('[data-randomize]')?.addEventListener('click', onRandomize);

  /* ---------- clock ---------- */
  const clock = document.querySelector('[data-clock]');
  const tick = () => { if (clock) clock.textContent = `UTC ${new Date().toISOString().slice(11, 19)}`; };
  tick(); setInterval(tick, 1000);

  /* ---------- simulated threat feed ----------
     The globe reports each arc that lands. The headline rate is a separate simulated sensor total,
     because a real feed aggregates far more events than the map can draw. */
  const feed = document.querySelector('[data-feed]');
  const rateEl = document.querySelector('[data-rate]');
  const totalEl = document.querySelector('[data-total]');
  const spark = document.querySelector('[data-spark]');
  const originsEl = document.querySelector('[data-origins]');
  const fmt = new Intl.NumberFormat('en-US');
  const history = new Array(30).fill(0);
  const sevCount = { 1: 0, 2: 0, 3: 0 };
  const origins = []; // [timestamp, country]
  const now = new Date();
  let rate = 2400, target = 2400;
  let total = Math.round(((now.getUTCHours() * 60 + now.getUTCMinutes()) * 2400) * (0.9 + Math.random() * 0.2));
  let lastListAdd = 0;

  setInterval(() => {
    if (Math.random() < 0.15) target = 1800 + Math.random() * 1800;
    rate += (target - rate) * 0.18 + (Math.random() - 0.5) * 120;
    total += rate / 60;
    history.shift(); history.push(rate);
    if (rateEl) rateEl.textContent = fmt.format(Math.round(rate));
    if (totalEl) totalEl.textContent = fmt.format(Math.round(total));
    drawSpark();
  }, 1000);

  function drawSpark() {
    if (!spark) return;
    const lo = Math.min(...history.filter(Boolean), 1500), hi = Math.max(...history, 3600);
    const pts = history.map((v, i) => `${(i / (history.length - 1)) * 100},${v ? 29 - ((v - lo) / (hi - lo)) * 26 : 29}`);
    spark.querySelector('.spark__line').setAttribute('points', pts.join(' '));
    spark.querySelector('.spark__area').setAttribute('points', `0,30 ${pts.join(' ')} 100,30`);
  }

  function countOrigin(cc, n = 1) {
    const t = Date.now();
    for (let i = 0; i < n; i++) origins.push([t, cc]);
    while (origins.length && t - origins[0][0] > 300000) origins.shift();
  }
  function drawOrigins() {
    if (!originsEl) return;
    const counts = {};
    for (const [, cc] of origins) counts[cc] = (counts[cc] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = top[0]?.[1] || 1, sum = origins.length || 1;
    originsEl.replaceChildren(...top.map(([cc, c]) => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="mono"></span><i><b></b></i><span class="mono"></span>';
      li.children[0].textContent = cc;
      li.querySelector('b').style.transform = `scaleX(${(c / max).toFixed(3)})`;
      li.children[2].textContent = `${Math.round((c / sum) * 100)}%`;
      return li;
    }));
  }
  function drawSeverity() {
    const sum = sevCount[1] + sevCount[2] + sevCount[3] || 1;
    for (const s of [1, 2, 3]) {
      document.querySelector(`[data-sev-bar="${s}"]`)?.style.setProperty('flex-grow', String(sevCount[s] / sum + 0.001));
      const el = document.querySelector(`[data-sev="${s}"]`);
      if (el) el.textContent = fmt.format(sevCount[s]);
    }
  }

  function addRow(cls, type, route, meta) {
    if (!feed) return;
    const li = document.createElement('li');
    li.className = `feed__item ${cls}`;
    li.innerHTML = '<span class="feed__dot" aria-hidden="true"></span><span class="feed__type"></span><span class="feed__route"></span><span class="feed__meta mono"></span><time></time>';
    li.querySelector('.feed__type').textContent = type;
    li.querySelector('.feed__route').textContent = route;
    li.querySelector('.feed__meta').textContent = meta;
    li.querySelector('time').textContent = new Date().toISOString().slice(11, 19);
    feed.prepend(li);
    while (feed.children.length > 6) feed.lastElementChild.remove();
  }

  // ev: { type, port, sev, src: [city, cc, ...], dst: [city, cc, ...], sector }
  function pushSignal(ev) {
    sevCount[ev.sev] += 1 + Math.floor(Math.random() * 40); // each arc stands for a cluster of sensor hits
    countOrigin(ev.src[1]);
    drawSeverity();
    drawOrigins();
    const t = performance.now();
    if (t - lastListAdd < 650) return; // keep the list readable
    lastListAdd = t;
    addRow(`sev-${ev.sev}`, ev.type, `${ev.src[1]} ${ev.src[0]} → ${ev.dst[1]} ${ev.dst[0]}`, `${ev.port} · ${ev.sector}`);
  }

  // DDoS storm: many sources converge on one target
  function pushStorm(s) {
    sevCount[3] += 200 + Math.floor(Math.random() * 400);
    countOrigin('BOTNET', s.sources);
    target = Math.min(5200, rate + 1400);
    drawSeverity();
    drawOrigins();
    lastListAdd = performance.now();
    addRow('sev-3 is-storm', `DDoS storm · ${s.gbps} Gbps`, `${s.sources} sources in ${s.countries} countries → ${s.dst[1]} ${s.dst[0]}`, s.port);
  }

  function setPalette(p) {
    root.style.setProperty('--accent', p.accent);
    root.style.setProperty('--accent-2', p.accent2);
    root.style.setProperty('--bg', p.bg[0]);
    document.querySelector('[data-palette-name]')?.replaceChildren(p.name);
  }

  layout();
  return { getProgress: progress, pushSignal, pushStorm, setPalette };
}
