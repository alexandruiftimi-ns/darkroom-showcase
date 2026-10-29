(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  // Hero: stagger words and lines in
  const hero = document.querySelector('.hero__inner');
  hero.querySelectorAll('[data-word], [data-rise]').forEach((el, i) => el.style.setProperty('--i', i));
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));

  // Scroll reveals, staggered within each row
  const reveal = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', `${i * 90}ms`);
      e.target.classList.add('is-in');
      reveal.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

  // Nav gets a backdrop once the hero is behind it
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Previews: load only when near the viewport, play only while visible.
  // Reduced motion and Save-Data keep the poster still.
  if (!reduce && !saveData) {
    const small = matchMedia('(max-width: 760px)').matches;
    const videos = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.src) v.src = `${v.dataset.src}${small ? '-m' : ''}.mp4`;
          v.play().catch(() => {});
        } else if (v.src) {
          v.pause();
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('video[data-src]').forEach((v) => videos.observe(v));
  }

  // Darkroom star count from the GitHub API; the buttons work without it
  const stars = document.querySelectorAll('[data-stars]');
  fetch('https://api.github.com/repos/alexandruiftimi-ns/darkroom')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then(({ stargazers_count: n }) => {
      const label = n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
      stars.forEach((s) => {
        s.querySelector('[data-stars-count]').textContent = label;
        s.hidden = false;
      });
    })
    .catch(() => {});

  // Filters
  const chips = document.querySelectorAll('.chip');
  const cards = document.querySelectorAll('.card');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => {
      c.classList.toggle('is-on', c === chip);
      c.setAttribute('aria-pressed', c === chip);
    });
    cards.forEach((card) => {
      card.hidden = f !== 'all' && !card.dataset.kind.split(' ').includes(f);
    });
  }));
})();
