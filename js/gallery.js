/**
 * gallery.js
 * -----------------------------------------------------------------------
 * Galeri bölümü: kategori filtreleme, lazy loading ve lightbox entegrasyonu.
 * Video öğeleri kapak görseliyle önizlenir, tıklanınca lightbox içinde oynatılır.
 */
(function (global) {
  'use strict';

  let activeFilter = 'Tümü';

  function items() {
    return Storage.getGalleryItems();
  }

  function renderFilters() {
    const bar = document.getElementById('galleryFilters');
    const cats = ['Tümü', ...new Set(items().map((i) => i.category))];
    bar.innerHTML = cats.map((c) => `<button class="filter-btn ${c === activeFilter ? 'is-active' : ''}" data-cat="${UI.escapeHtml(c)}">${UI.escapeHtml(c)}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      activeFilter = btn.getAttribute('data-cat');
      renderFilters();
      renderGrid();
    });
  }

  function renderGrid() {
    const grid = document.getElementById('galleryGrid');
    const list = items().filter((i) => activeFilter === 'Tümü' || i.category === activeFilter);

    grid.innerHTML = list.map((item, i) => `
      <div class="gallery-item" data-reveal="scale" data-reveal-delay="${(i % 6) + 1}" data-index="${i}">
        <img src="${item.thumb}" alt="${UI.escapeHtml(item.title)}" loading="lazy">
        <div class="gallery-item__overlay">
          ${item.type === 'video' ? '<span class="gallery-item__play">▶</span>' : ''}
          <span style="position:absolute;bottom:1rem;left:1rem;font-size:1.3rem;font-weight:600;">${UI.escapeHtml(item.title)}</span>
        </div>
      </div>`).join('');

    Animations.observeNewReveals(grid);

    grid.querySelectorAll('.gallery-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        const lightboxItems = list.map((g) => ({ type: g.type, src: g.src, caption: g.title }));
        window.LightboxCtrl.open(lightboxItems, i);
      });
    });
  }

  function init() {
    renderFilters();
    renderGrid();
  }

  global.Gallery = { init };
})(window);
