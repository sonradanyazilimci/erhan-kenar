/**
 * blog.js
 * -----------------------------------------------------------------------
 * Blog listeleme (arama, kategori filtresi), popüler yazılar, detay
 * sayfası, yorum simülasyonu ve paylaşım butonlarını yönetir.
 */
(function (global) {
  'use strict';

  let state = { search: '', category: 'Tümü' };
  let sitePages = null;

  function publishedPosts() {
    return Storage.getBlogPosts().filter((p) => p.status === 'published');
  }

  function filteredPosts() {
    return publishedPosts().filter((p) => {
      const matchCategory = state.category === 'Tümü' || p.category === state.category;
      const q = state.search.trim().toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }

  function postCardHtml(post, i) {
    return `
    <article class="blog-card" data-reveal="up" data-reveal-delay="${(i % 6) + 1}" data-slug="${post.slug}">
      <div class="blog-card__image">
        <img src="${post.coverImage}" alt="${UI.escapeHtml(post.title)}" loading="lazy">
        <span class="blog-card__category">${UI.escapeHtml(post.category)}</span>
      </div>
      <div class="blog-card__body">
        <div class="blog-card__meta"><span>📅 ${UI.formatDate(post.date)}</span><span>⏱ ${post.readingTime} dk</span></div>
        <h3 class="blog-card__title">${UI.escapeHtml(post.title)}</h3>
        <p class="blog-card__excerpt">${UI.escapeHtml(post.excerpt)}</p>
        <div class="blog-card__tags">${post.tags.map((t) => `<span class="tag">#${UI.escapeHtml(t)}</span>`).join('')}</div>
        <div class="blog-card__footer">
          <span class="blog-card__author"><img src="${post.authorAvatar}" alt="${post.author}"> ${UI.escapeHtml(post.author)}</span>
          <span style="font-size:1.2rem;color:var(--text-muted);">👁 ${post.views}</span>
        </div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    const posts = filteredPosts();
    grid.innerHTML = posts.length
      ? posts.map(postCardHtml).join('')
      : '<p style="color:var(--text-muted);">Aramanızla eşleşen bir yazı bulunamadı.</p>';

    grid.querySelectorAll('.blog-card').forEach((card) => {
      card.addEventListener('click', () => Router.navigateToPost(card.getAttribute('data-slug')));
    });
    Animations.observeNewReveals(grid);
  }

  function renderFilters() {
    const bar = document.getElementById('blogFilters');
    const cats = ['Tümü', ...new Set(publishedPosts().map((p) => p.category))];
    bar.innerHTML = cats.map((c) => `<button class="filter-btn ${c === state.category ? 'is-active' : ''}" data-cat="${UI.escapeHtml(c)}">${UI.escapeHtml(c)}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      state.category = btn.getAttribute('data-cat');
      renderFilters();
      renderGrid();
    });
  }

  function renderSidebar() {
    const popular = [...publishedPosts()].sort((a, b) => b.views - a.views).slice(0, 4);
    document.getElementById('popularPosts').innerHTML = popular.map((p) => `
      <a class="widget__post" href="#post/${p.slug}">
        <img src="${p.coverImage}" alt="${UI.escapeHtml(p.title)}">
        <div><div class="widget__post-title">${UI.escapeHtml(p.title)}</div><div class="widget__post-meta">${UI.formatDate(p.date)}</div></div>
      </a>`).join('');

    const categories = [...new Set(publishedPosts().map((p) => p.category))];
    document.getElementById('blogCategories').innerHTML = categories.map((c) => `<span class="tag">${UI.escapeHtml(c)}</span>`).join('');
  }

  function initSearch() {
    const input = document.getElementById('blogSearch');
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.search = input.value;
        renderGrid();
      }, 200);
    });
  }

  /* ------------------------------ Detay Sayfası ------------------------------ */
  function renderPostDetail(slug) {
    const post = Storage.getBlogPostBySlug(slug);
    if (!post) return false;

    Storage.updateBlogPost(post.id, { views: (post.views || 0) + 1 });

    document.getElementById('postCover').src = post.coverImage;
    document.getElementById('postCover').alt = post.title;
    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postMeta').innerHTML = `
      <span>✍️ ${UI.escapeHtml(post.author)}</span>
      <span>📅 ${UI.formatDate(post.date)}</span>
      <span>⏱ ${post.readingTime} dk okuma</span>
      <span>🏷 ${UI.escapeHtml(post.category)}</span>`;
    document.getElementById('postContent').innerHTML = post.content;

    const shareBar = document.getElementById('postShare');
    shareBar.querySelectorAll('a').forEach((a) => a.remove());
    const shareUrl = encodeURIComponent(window.location.href);
    const shareLinks = [
      { icon: '𝕏', url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodeURIComponent(post.title)}` },
      { icon: 'in', url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
      { icon: 'f', url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` }
    ];
    shareLinks.forEach((s) => {
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'share-bar__btn';
      a.textContent = s.icon;
      shareBar.appendChild(a);
    });
    const copyBtn = document.createElement('button');
    copyBtn.className = 'share-bar__btn';
    copyBtn.textContent = '🔗';
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(window.location.href);
      UI.toast('Bağlantı kopyalandı!', 'success');
    });
    shareBar.appendChild(copyBtn);

    renderComments(post);
    setupCommentForm(post);
    renderRelated(post);
    return true;
  }

  function renderComments(post) {
    const list = document.getElementById('commentsList');
    document.getElementById('commentsHeading').textContent = `Yorumlar (${post.comments.length})`;
    list.innerHTML = post.comments.map((c) => `
      <div class="comment">
        <div class="comment__avatar">${c.name.charAt(0).toUpperCase()}</div>
        <div>
          <span class="comment__name">${UI.escapeHtml(c.name)}</span><span class="comment__date">${UI.formatDate(c.date)}</span>
          <p class="comment__message">${UI.escapeHtml(c.message)}</p>
        </div>
      </div>`).join('') || '<p style="color:var(--text-muted);">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>';
  }

  function setupCommentForm(post) {
    const form = document.getElementById('commentForm');
    const freshForm = form.cloneNode(true); // önceki listener'ları temizle
    form.parentNode.replaceChild(freshForm, form);

    freshForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = freshForm.querySelector('#commentName').value.trim();
      const email = freshForm.querySelector('#commentEmail').value.trim();
      const message = freshForm.querySelector('#commentMessage').value.trim();
      if (!name || !email || !message) return;

      const updated = Storage.getBlogPostBySlug(post.slug);
      updated.comments.push({ name, date: new Date().toISOString().slice(0, 10), message });
      Storage.updateBlogPost(updated.id, { comments: updated.comments });

      renderComments(updated);
      freshForm.reset();
      UI.toast('Yorumunuz eklendi!', 'success');
    });
  }

  function renderRelated(post) {
    const related = publishedPosts()
      .filter((p) => p.id !== post.id && p.category === post.category)
      .slice(0, 3);
    const fallback = related.length ? related : publishedPosts().filter((p) => p.id !== post.id).slice(0, 3);
    document.getElementById('relatedPosts').innerHTML = fallback.map(postCardHtml).join('');
    document.getElementById('relatedPosts').querySelectorAll('.blog-card').forEach((card) => {
      card.addEventListener('click', () => Router.navigateToPost(card.getAttribute('data-slug')));
    });
  }

  document.getElementById && document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'backToBlog') Router.navigateHome();
  });

  function init(pages) {
    sitePages = pages;
    renderFilters();
    renderGrid();
    renderSidebar();
    initSearch();
  }

  global.Blog = { init, renderPostDetail };
})(window);
