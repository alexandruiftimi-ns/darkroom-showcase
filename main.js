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

  // An odd card left alone on the last row spans both columns, with its title over the preview.
  // Cards without a hand-written .wide overlay get one from their title and description.
  const twoCols = matchMedia('(min-width: 901px)');
  const layout = () => {
    const cards = document.querySelectorAll('.card');
    const shown = [...cards].filter((c) => !c.hidden);
    cards.forEach((c) => c.classList.toggle('card--wide', twoCols.matches && shown.length % 2 === 1 && c === shown.at(-1)));
    const wide = document.querySelector('.card--wide');
    if (wide && !wide.querySelector('.wide')) {
      const box = document.createElement('div');
      box.className = 'wide';
      box.innerHTML = '<p class="wide__title" aria-hidden="true"></p><p class="wide__desc"></p>';
      box.firstChild.textContent = wide.querySelector('.card__title').textContent;
      box.lastChild.textContent = wide.querySelector('.card__desc').textContent;
      wide.querySelector('.card__cta').before(box);
    }
  };
  layout();
  twoCols.addEventListener('change', layout);

  // Filters
  const chips = document.querySelectorAll('.chip');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => {
      c.classList.toggle('is-on', c === chip);
      c.setAttribute('aria-pressed', c === chip);
    });
    document.querySelectorAll('.card').forEach((card) => {
      card.hidden = f !== 'all' && !card.dataset.kind.split(' ').includes(f);
    });
    layout();
  }));

  // Prompt + assets buttons, added to every card. publish.ps1 copies each project's PROMPT.md to
  // prompts/<slug>.md and lists the slugs in prompts/index.json; a card without one says so in the button.
  let prompts = null;
  fetch('prompts/index.json').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((l) => { prompts = l; });
  const announce = document.querySelector('[data-announce]');
  const modal = document.getElementById('assets-modal');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  // Swap the label and let the pill grow or shrink to fit it, then go back after a moment
  const flash = (btn, text, state) => {
    clearTimeout(btn._t);
    const swap = (label, cls) => {
      const from = btn.offsetWidth;
      btn.style.width = '';
      btn.textContent = label;
      btn.className = btn.className.replace(/ is-\w+/g, '') + (cls ? ` is-${cls}` : '');
      const to = btn.offsetWidth;
      btn.style.width = `${from}px`;
      btn.offsetWidth; // commit the start width so the change transitions
      btn.style.width = `${to}px`;
    };
    swap(text, state);
    announce.textContent = text;
    btn._t = setTimeout(() => {
      swap(btn.dataset.label, '');
      btn._t = setTimeout(() => { btn.style.width = ''; }, 500);
    }, 2400);
  };

  const copyPrompt = (slug) => {
    const text = fetch(`prompts/${slug}.md`).then((r) => (r.ok ? r.text() : Promise.reject()));
    // ClipboardItem takes the pending fetch, so Safari still counts the click as the user's gesture
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      return navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) })]);
    }
    return text.then((t) => navigator.clipboard.writeText(t));
  };

  document.querySelectorAll('.card').forEach((card) => {
    const slug = card.querySelector('.card__link').getAttribute('href').replace(/\/$/, '');
    const name = card.querySelector('.card__title').textContent;
    const row = document.createElement('div');
    row.className = 'card__actions';
    row.innerHTML = '<button class="pill pill--ghost pill--sm act" type="button" data-label="Copy prompt">Copy prompt</button>'
      + '<button class="pill pill--ghost pill--sm act" type="button" data-label="Assets">Assets</button>';
    const [promptBtn, assetsBtn] = row.children;
    promptBtn.setAttribute('aria-label', `Copy the build prompt for ${name}`);
    assetsBtn.setAttribute('aria-label', `Assets for ${name}`);
    card.append(row);

    promptBtn.addEventListener('click', () => {
      if (prompts && !prompts.includes(slug)) return flash(promptBtn, 'Prompt not yet available', 'error');
      copyPrompt(slug).then(
        () => flash(promptBtn, 'Copied', 'ok'),
        () => flash(promptBtn, 'Prompt not yet available', 'error'),
      );
    });
    assetsBtn.addEventListener('click', () => {
      modal.querySelector('[data-assets-name]').textContent = name;
      modal.showModal();
    });
  });
})();
