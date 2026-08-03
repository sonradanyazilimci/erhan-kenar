/**
 * router.js
 * -----------------------------------------------------------------------
 * Tek sayfalık site içinde hafif bir "hash routing" katmanı.
 * - Normal sayfa: navbar bölümlerini (#home, #about, ...) gösterir.
 * - #post/<slug>: Blog detay görünümüne geçer (postDetail bölümü).
 * Ayrıca kaydırma sırasında aktif navbar linkini günceller.
 */
(function (global) {
  'use strict';

  const SECTION_IDS = ['home', 'about', 'projects', 'blog', 'gallery', 'testimonials', 'services', 'faq', 'contact'];

  function showHome() {
    const main = document.getElementById('mainContent');
    const detail = document.getElementById('postDetail');
    if (!main || !detail) return;
    Array.from(main.children).forEach((child) => {
      if (child.id !== 'postDetail') child.style.display = '';
    });
    detail.style.display = 'none';
  }

  function showPostDetail() {
    const main = document.getElementById('mainContent');
    const detail = document.getElementById('postDetail');
    if (!main || !detail) return;
    Array.from(main.children).forEach((child) => {
      if (child.id !== 'postDetail') child.style.display = 'none';
    });
    detail.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function navigateToPost(slug) {
    window.location.hash = `post/${slug}`;
  }

  function navigateHome() {
    history.pushState('', document.title, window.location.pathname + window.location.search);
    showHome();
  }

  function handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('post/')) {
      const slug = hash.split('/')[1];
      if (global.Blog && typeof global.Blog.renderPostDetail === 'function') {
        const found = global.Blog.renderPostDetail(slug);
        if (found) {
          showPostDetail();
          return;
        }
      }
    }
    showHome();
  }

  /* ---------------------- Aktif Navbar Linki Takibi ---------------------- */
  function initActiveLinkTracking() {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          document.querySelectorAll('.navbar__link').forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    sections.forEach((s) => observer.observe(s));
  }

  function init() {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    initActiveLinkTracking();
  }

  global.Router = {
    init,
    navigateToPost,
    navigateHome,
    showHome,
    showPostDetail
  };
})(window);
