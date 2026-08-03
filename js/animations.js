/**
 * animations.js
 * -----------------------------------------------------------------------
 * Sayfa genelindeki görsel efektler: yükleme ekranı, kaydırma ilerleme
 * çubuğu, scroll-reveal, sayaç animasyonu, özel imleç ve mouse parallax.
 * Performans için tüm animasyonlar requestAnimationFrame ile sürülür ve
 * yalnızca transform/opacity özellikleri değiştirilir (GPU hızlandırmalı).
 */
(function (global) {
  'use strict';

  /* --------------------------- Yükleme Ekranı --------------------------- */
  function runLoadingScreen() {
    const screen = document.getElementById('loadingScreen');
    const bar = document.getElementById('loadingBar');
    if (!screen) return;

    let progress = 0;
    const tick = () => {
      progress += (100 - progress) * 0.18 + 1;
      if (bar) bar.style.width = Math.min(progress, 100) + '%';
      if (progress < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => screen.classList.add('is-hidden'), 250);
      }
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------- Kaydırma İlerleme Çubuğu ------------------------- */
  function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');
    if (!bar) return;

    let ticking = false;
    function update() {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const percent = height > 0 ? (scrollTop / height) * 100 : 0;
      bar.style.width = percent + '%';
      if (navbar) navbar.classList.toggle('is-scrolled', scrollTop > 40);
      if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 500);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();

    if (backToTop) {
      backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }

  /* ------------------------------ Scroll Reveal ------------------------------ */
  function initScrollReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    targets.forEach((t) => observer.observe(t));
  }

  /**
   * Dinamik olarak eklenen kartlara reveal + stagger uygular.
   * Statik gözlemciye dahil olmayan (innerHTML ile sonradan eklenen) öğeler için kullanılır.
   */
  function observeNewReveals(container) {
    if (!container) return;
    const targets = container.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    targets.forEach((t) => observer.observe(t));
  }

  /* ------------------------------ Sayaçlar ------------------------------ */
  function animateCounter(el, target, duration = 1600) {
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      el.textContent = Math.floor(eased * target).toLocaleString('tr-TR');
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString('tr-TR');
      }
    }
    requestAnimationFrame(tick);
  }

  function initCounters(container) {
    const cards = (container || document).querySelectorAll('[data-counter]');
    if (!cards.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute('data-counter'), 10) || 0;
          animateCounter(entry.target, target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    cards.forEach((c) => observer.observe(c));
  }

  function animateSkillBars(container) {
    const bars = (container || document).querySelectorAll('[data-skill-fill]');
    if (!bars.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.getAttribute('data-skill-fill') + '%';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach((b) => observer.observe(b));
  }

  /* ------------------------------ Özel İmleç ------------------------------ */
  function initCustomCursor() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring || window.matchMedia('(hover: none)').matches) return;

    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function loop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    document.addEventListener('mouseover', (e) => {
      ring.classList.toggle('is-active', !!e.target.closest('a, button, .btn, [data-cursor-hover]'));
    });
  }

  /* --------------------------- Mouse Parallax (Hero) --------------------------- */
  function initHeroParallax() {
    const hero = document.getElementById('home');
    if (!hero) return;
    const blobs = hero.querySelectorAll('.hero__blob');
    const visual = hero.querySelector('.hero__visual');
    let targetX = 0, targetY = 0, curX = 0, curY = 0;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      targetX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      targetY = (e.clientY - rect.top - rect.height / 2) / rect.height;
    });

    function loop() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      blobs.forEach((blob, i) => {
        const depth = (i + 1) * 14;
        blob.style.transform = `translate(${curX * depth}px, ${curY * depth}px)`;
      });
      if (visual) visual.style.transform = `translate(${curX * -10}px, ${curY * -10}px)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ------------------------------ Sayfa Geçişi ------------------------------ */
  function pageTransitionTo(url) {
    const veil = document.createElement('div');
    veil.className = 'page-transition-veil';
    document.body.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add('is-active'));
    setTimeout(() => { window.location.href = url; }, 260);
  }

  global.Animations = {
    runLoadingScreen,
    initScrollProgress,
    initScrollReveal,
    observeNewReveals,
    initCounters,
    animateSkillBars,
    initCustomCursor,
    initHeroParallax,
    pageTransitionTo
  };
})(window);
