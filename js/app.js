/**
 * app.js
 * -----------------------------------------------------------------------
 * Ana site (index.html) için render orkestrasyonu. Storage katmanından
 * gelen veriyi DOM'a basar ve genel etkileşimleri (form, filtre, slider,
 * lightbox) bağlar. Admin panelinde yapılan her değişiklik burada okunan
 * aynı Storage anahtarlarını kullandığı için otomatik olarak yansır.
 */
(function () {
  'use strict';

  const ICONS = {
    layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6 2 12l6 6M16 6l6 6-6 6"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>'
  };

  const SOCIAL_ICONS = {
    instagram: '📷', linkedin: '💼', github: '🐙', youtube: '▶️', x: '✕', facebook: 'f', tiktok: '🎵'
  };

  let PAGES = null;

  /* ------------------------------- Navbar ------------------------------- */
  function renderNavbar() {
    const menu = document.getElementById('navMenu');
    const logo = document.getElementById('navLogo');
    if (logo) logo.textContent = PAGES.site.logoText;
    if (!menu) return;
    const items = [...PAGES.navbar.menu].sort((a, b) => a.order - b.order);
    menu.innerHTML = items
      .map((item) => `<a href="${item.target}" class="navbar__link">${UI.escapeHtml(item.label)}</a>`)
      .join('');
  }

  /* -------------------------------- Hero -------------------------------- */
  function renderHero() {
    const h = PAGES.hero;
    document.getElementById('heroGreeting').textContent = h.greeting;
    document.getElementById('heroName').textContent = h.name;
    document.getElementById('heroDesc').textContent = h.description;
    document.getElementById('heroAvatar').src = h.avatar;
    document.getElementById('heroAvatar').alt = h.name;
    const cvBtn = document.getElementById('heroCvBtn');
    cvBtn.href = h.cvUrl;
    cvBtn.setAttribute('download', '');
    if (h.buttons) {
      cvBtn.textContent = h.buttons.cv;
      document.getElementById('heroContactBtn').textContent = h.buttons.contact;
      document.getElementById('heroPortfolioBtn').textContent = h.buttons.portfolio;
    }
  }

  /* -------------------------------- About -------------------------------- */
  function renderAbout() {
    const a = PAGES.about;
    document.getElementById('aboutHeading').textContent = a.heading;
    document.getElementById('aboutBio').textContent = a.bio;

    document.getElementById('aboutHobbies').innerHTML = a.hobbies
      .map((h) => `<span class="tag">${UI.escapeHtml(h)}</span>`).join('');
    document.getElementById('aboutInterests').innerHTML = a.interests
      .map((i) => `<span class="tag">${UI.escapeHtml(i)}</span>`).join('');

    document.getElementById('aboutTimeline').innerHTML = a.experiences.map((exp) => `
      <div class="timeline__item">
        <div class="timeline__role">${UI.escapeHtml(exp.role)}</div>
        <div class="timeline__meta">${UI.escapeHtml(exp.company)} · ${UI.escapeHtml(exp.period)}</div>
      </div>`).join('');

    document.getElementById('aboutSkills').innerHTML = a.skills.map((skill) => `
      <div class="skill-card">
        <div class="skill-card__top"><span>${UI.escapeHtml(skill.name)}</span><span>${skill.level}%</span></div>
        <div class="skill-card__bar"><div class="skill-card__fill" data-skill-fill="${skill.level}"></div></div>
      </div>`).join('');

    document.getElementById('aboutStats').innerHTML = a.stats.map((stat, i) => `
      <div class="stat-card" data-reveal="up" data-reveal-delay="${(i % 4) + 1}">
        <div class="stat-card__value" data-counter="${stat.value}">0</div>
        <div class="stat-card__label">${UI.escapeHtml(stat.label)}</div>
      </div>`).join('');

    Animations.observeNewReveals(document.getElementById('aboutStats'));
    Animations.initCounters(document.getElementById('aboutStats'));
    Animations.animateSkillBars(document.getElementById('aboutSkills'));
  }

  /* ------------------------------ Projelerim ------------------------------ */
  let activeProjectFilter = 'Tümü';

  function renderProjectsFilters() {
    const cats = ['Tümü', ...new Set(PAGES.projects.map((p) => p.category))];
    document.getElementById('projectsFilters').innerHTML = cats.map((c) => `
      <button class="filter-btn ${c === activeProjectFilter ? 'is-active' : ''}" data-filter="${UI.escapeHtml(c)}">${UI.escapeHtml(c)}</button>
    `).join('');
  }

  function renderProjectsGrid() {
    const grid = document.getElementById('projectsGrid');
    const items = PAGES.projects.filter((p) => activeProjectFilter === 'Tümü' || p.category === activeProjectFilter);
    grid.innerHTML = items.map((p, i) => `
      <div class="project-card" data-reveal="up" data-reveal-delay="${(i % 6) + 1}" data-project-id="${p.id}">
        <img src="${p.image}" alt="${UI.escapeHtml(p.title)}" loading="lazy">
        <div class="project-card__overlay">
          <span class="project-card__category">${UI.escapeHtml(p.category)}</span>
          <h3 class="project-card__title">${UI.escapeHtml(p.title)}</h3>
          <span class="project-card__link">Detayları Gör →</span>
        </div>
      </div>`).join('');
    Animations.observeNewReveals(grid);

    grid.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('click', () => {
        const project = PAGES.projects.find((p) => p.id === card.getAttribute('data-project-id'));
        if (project) window.ProjectModalCtrl.open(project);
      });
    });
  }

  function renderProjects() {
    renderProjectsFilters();
    renderProjectsGrid();
    document.getElementById('projectsFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      activeProjectFilter = btn.getAttribute('data-filter');
      renderProjectsFilters();
      renderProjectsGrid();
    });
  }

  /* --------------------------- Proje Detay Modalı --------------------------- */
  function initProjectModal() {
    const overlay = document.getElementById('projectModal');
    if (!overlay) return;

    function close() { overlay.classList.remove('is-open'); }

    function open(project) {
      document.getElementById('pmImage').src = project.image;
      document.getElementById('pmImage').alt = project.title;
      document.getElementById('pmCategory').textContent = project.category;
      document.getElementById('pmTitle').textContent = project.title;
      document.getElementById('pmDesc').textContent = project.description;

      const tech = project.tech || [];
      document.getElementById('pmTechHeading').style.display = tech.length ? '' : 'none';
      document.getElementById('pmTech').innerHTML = tech.map((t) => `<span class="tag">${UI.escapeHtml(t)}</span>`).join('');

      const features = project.features || [];
      document.getElementById('pmFeaturesHeading').style.display = features.length ? '' : 'none';
      document.getElementById('pmFeatures').innerHTML = features.map((f) => `<li>${UI.escapeHtml(f)}</li>`).join('');

      const actions = [];
      if (project.link && project.link !== '#') actions.push(`<a href="${project.link}" target="_blank" rel="noopener" class="btn btn--primary btn--sm">Canlı Siteyi Gör</a>`);
      if (project.githubLink) actions.push(`<a href="${project.githubLink}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">GitHub</a>`);
      document.getElementById('pmActions').innerHTML = actions.join('');

      overlay.classList.add('is-open');
    }

    document.getElementById('projectModalClose').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });

    window.ProjectModalCtrl = { open, close };
  }

  /* ---------------------------- Testimonials ---------------------------- */
  let testimonialIndex = 0;
  function renderTestimonials() {
    const track = document.getElementById('testimonialTrack');
    const dots = document.getElementById('testimonialDots');
    const list = PAGES.testimonials;

    track.innerHTML = list.map((t) => `
      <div class="testimonial-card">
        <img class="testimonial-card__avatar" src="${t.avatar}" alt="${UI.escapeHtml(t.name)}">
        <div class="testimonial-card__stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
        <p class="testimonial-card__message">"${UI.escapeHtml(t.message)}"</p>
        <div class="testimonial-card__name">${UI.escapeHtml(t.name)}</div>
        <div class="testimonial-card__role">${UI.escapeHtml(t.role)}</div>
      </div>`).join('');

    dots.innerHTML = list.map((_, i) => `<button data-index="${i}" class="${i === 0 ? 'is-active' : ''}"></button>`).join('');

    function goTo(i) {
      testimonialIndex = (i + list.length) % list.length;
      track.style.transform = `translateX(-${testimonialIndex * 100}%)`;
      dots.querySelectorAll('button').forEach((d, idx) => d.classList.toggle('is-active', idx === testimonialIndex));
    }

    dots.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) goTo(parseInt(btn.getAttribute('data-index'), 10));
    });

    let autoplay = setInterval(() => goTo(testimonialIndex + 1), 5000);
    track.closest('.testimonial-slider').addEventListener('mouseenter', () => clearInterval(autoplay));
    track.closest('.testimonial-slider').addEventListener('mouseleave', () => { autoplay = setInterval(() => goTo(testimonialIndex + 1), 5000); });

    document.getElementById('clientsTrack').innerHTML = [...PAGES.clients, ...PAGES.clients]
      .map((c) => `<img src="${c.logo}" alt="${UI.escapeHtml(c.name)}" loading="lazy">`).join('');
  }

  /* ------------------------------- Services ------------------------------- */
  function renderServices() {
    document.getElementById('servicesGrid').innerHTML = PAGES.services.map((s, i) => `
      <div class="service-card" data-reveal="up" data-reveal-delay="${(i % 4) + 1}">
        <div class="service-card__icon">${ICONS[s.icon] || ''}</div>
        <h3 class="service-card__title">${UI.escapeHtml(s.title)}</h3>
        <p class="service-card__desc">${UI.escapeHtml(s.description)}</p>
      </div>`).join('');
    Animations.observeNewReveals(document.getElementById('servicesGrid'));
  }

  /* --------------------------------- FAQ --------------------------------- */
  function renderFAQ() {
    const wrap = document.getElementById('faqAccordion');
    wrap.innerHTML = PAGES.faq.map((f) => `
      <div class="accordion-item">
        <button class="accordion-item__head" type="button">
          <span>${UI.escapeHtml(f.question)}</span>
          <span class="accordion-item__icon">+</span>
        </button>
        <div class="accordion-item__body"><div class="accordion-item__body-inner">${UI.escapeHtml(f.answer)}</div></div>
      </div>`).join('');
    UI.initAccordion(wrap);
  }

  /* ------------------------------- Contact ------------------------------- */
  function renderContact() {
    const c = PAGES.contact;
    document.getElementById('contactEmail').textContent = c.email;
    document.getElementById('contactPhone').textContent = c.phone;
    document.getElementById('contactAddress').textContent = c.address;
    document.getElementById('contactSocial').innerHTML = Object.entries(c.social)
      .map(([key, url]) => `<a href="${url}" target="_blank" rel="noopener">${SOCIAL_ICONS[key] || '🔗'}</a>`).join('');

    const form = document.getElementById('contactForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cName');
      const email = document.getElementById('cEmail');
      const subject = document.getElementById('cSubject');
      const message = document.getElementById('cMessage');

      const validName = UI.validateField(name, { required: true });
      const validEmail = UI.validateField(email, { required: true, email: true });
      const validSubject = UI.validateField(subject, { required: true });
      const validMessage = UI.validateField(message, { required: true, minLength: 10 });

      if (!(validName && validEmail && validSubject && validMessage)) return;

      Storage.logActivity(`Yeni iletişim mesajı: ${name.value} (${subject.value})`, 'contact');
      document.getElementById('contactSuccess').style.display = 'flex';
      form.reset();
      UI.toast('Mesajınız başarıyla gönderildi!', 'success');
      setTimeout(() => { document.getElementById('contactSuccess').style.display = 'none'; }, 4000);
    });
  }

  /* -------------------------------- Footer -------------------------------- */
  function renderFooter() {
    document.getElementById('footerLogo').textContent = PAGES.site.logoText;
    document.getElementById('footerDesc').textContent = PAGES.footer.text;
    document.getElementById('footerCopyright').textContent = PAGES.footer.copyright;
    document.getElementById('footerEmail').textContent = PAGES.contact.email;
    document.getElementById('footerPhone').textContent = PAGES.contact.phone;

    document.getElementById('footerMenu').innerHTML = [...PAGES.navbar.menu]
      .sort((a, b) => a.order - b.order)
      .map((m) => `<a href="${m.target}">${UI.escapeHtml(m.label)}</a>`).join('');

    document.getElementById('footerSocial').innerHTML = Object.entries(PAGES.contact.social)
      .map(([key, url]) => `<a href="${url}" target="_blank" rel="noopener">${key.charAt(0).toUpperCase() + key.slice(1)}</a>`).join('');
  }

  /* -------------------------------- Lightbox -------------------------------- */
  function initLightbox() {
    const overlay = document.getElementById('lightbox');
    const media = document.getElementById('lightboxMedia');
    const caption = document.getElementById('lightboxCaption');
    let items = [];
    let index = 0;

    function render() {
      const item = items[index];
      if (!item) return;
      media.innerHTML = item.type === 'video'
        ? `<video src="${item.src}" controls autoplay></video>`
        : `<img src="${item.src}" alt="${UI.escapeHtml(item.caption || '')}">`;
      caption.textContent = item.caption || '';
    }

    function open(list, startIndex) {
      items = list;
      index = startIndex || 0;
      render();
      overlay.classList.add('is-open');
    }
    function close() {
      overlay.classList.remove('is-open');
      media.innerHTML = '';
    }
    function next() { index = (index + 1) % items.length; render(); }
    function prev() { index = (index - 1 + items.length) % items.length; render(); }

    document.getElementById('lightboxClose').addEventListener('click', close);
    document.getElementById('lightboxNext').addEventListener('click', next);
    document.getElementById('lightboxPrev').addEventListener('click', prev);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    window.LightboxCtrl = { open, close, next, prev };
  }

  /* --------------------------- Tema / Görsel Ayarlar --------------------------- */
  function applySiteThemeSettings() {
    const site = PAGES.site;
    if (site.accentColor) document.documentElement.style.setProperty('--accent', site.accentColor);

    const speedMap = { slow: { base: '0.7s', slow: '1.3s' }, normal: { base: '0.45s', slow: '0.9s' }, fast: { base: '0.25s', slow: '0.5s' } };
    const speed = speedMap[site.animationSpeed] || speedMap.normal;
    document.documentElement.style.setProperty('--speed-base', speed.base);
    document.documentElement.style.setProperty('--speed-slow', speed.slow);

    const heroBg = document.querySelector('.hero__bg');
    if (heroBg) heroBg.style.display = site.backgroundStyle === 'none' ? 'none' : '';
  }

  /* -------------------------------- Init -------------------------------- */
  async function init() {
    await Auth.waitForAuthReady();
    await Storage.init();
    PAGES = Storage.getPages();
    applySiteThemeSettings();

    renderNavbar();
    renderHero();
    renderAbout();
    renderProjects();
    renderTestimonials();
    renderServices();
    renderFAQ();
    renderContact();
    renderFooter();
    initLightbox();
    initProjectModal();

    if (window.Blog) Blog.init(PAGES);
    if (window.Gallery) Gallery.init();

    UI.initTheme();
    UI.attachRipple();
    UI.initMobileMenu();
    UI.initPasswordToggles();
    UI.initModalCloseHandlers();

    Animations.initScrollProgress();
    Animations.initScrollReveal();
    Animations.initCustomCursor();
    Animations.initHeroParallax();
    Animations.runLoadingScreen();

    Router.init();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
