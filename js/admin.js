/**
 * admin.js
 * -----------------------------------------------------------------------
 * Yönetim paneli (CMS) mantığı. Sidebar navigasyonu ile view değiştirme,
 * Blog/Medya/Menü/Sosyal/SEO/Tema/Kullanıcı modüllerinin CRUD işlemleri
 * burada toplanır. Tüm veri okuma/yazma `Storage` katmanı üzerinden yapılır.
 */
(function () {
  'use strict';

  let PAGES = null;
  let currentView = 'dashboard';

  const VIEW_TITLES = {
    dashboard: 'Dashboard', blog: 'Blog Yönetimi', projects: 'Projelerim', pages: 'Sayfa Yönetimi',
    media: 'Medya Yönetimi', menu: 'Menü Yönetimi', social: 'Sosyal Medya Yönetimi',
    seo: 'SEO Yönetimi', theme: 'Tema Yönetimi', user: 'Kullanıcı Ayarları'
  };

  /* ------------------------------ Genel Yardımcılar ------------------------------ */
  function $(id) { return document.getElementById(id); }

  function confirmAction(title, message, onConfirm) {
    $('confirmTitle').textContent = title;
    $('confirmMessage').textContent = message;
    UI.openModal('confirmModal');
    const okBtn = $('confirmOk');
    const fresh = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(fresh, okBtn);
    fresh.addEventListener('click', () => { onConfirm(); UI.closeModal('confirmModal'); });
  }

  function openFormModal(title, bodyHtml, onReady) {
    $('formModalTitle').textContent = title;
    $('formModalBody').innerHTML = bodyHtml;
    UI.openModal('formModal');
    if (onReady) onReady($('formModalBody'));
  }
  function closeFormModal() { UI.closeModal('formModal'); }

  // Görseller Firestore dokümanının içine base64 olarak gömülür (Storage kullanılmıyor,
  // Blaze planı gerektirmemesi için). Firestore doküman başına 1MB sınırı olduğundan
  // burada görsel, kanvas üzerinden küçültülüp JPEG'e çevrilerek boyutu düşürülür.
  const MAX_IMAGE_DIMENSION = 1280;
  const IMAGE_QUALITY = 0.8;

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Görsel okunamadı.'));
        img.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function initUploadBox(box, onLoaded) {
    const input = box.querySelector('input[type="file"]');
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;

      let img = box.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        box.insertBefore(img, input);
      }
      box.style.opacity = '0.6';

      compressImage(file)
        .then((dataUrl) => {
          img.src = dataUrl;
          box.style.opacity = '';
          onLoaded(dataUrl);
        })
        .catch((err) => {
          console.error('[Admin] görsel işlenemedi:', err);
          box.style.opacity = '';
          UI.toast('Görsel yüklenemedi. Lütfen tekrar deneyin.', 'error');
        });
    });
  }

  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'az önce';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    return Math.floor(diff / 86400) + ' gün önce';
  }

  function slugify(str) {
    const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' };
    return str.replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => map[c] || c)
      .toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  /* --------------------------------- Sidebar / Topbar --------------------------------- */
  function initChrome() {
    const session = Auth.getSession();
    $('userName').textContent = session.name;
    $('userAvatar').src = session.avatar || 'assets/images/avatar.svg';

    document.querySelectorAll('.admin-nav-link[data-view]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.getAttribute('data-view'));
        closeMobileSidebar();
      });
    });

    document.querySelectorAll('.dropdown__item[data-view]').forEach((item) => {
      item.addEventListener('click', () => { switchView(item.getAttribute('data-view')); closeAllDropdowns(); });
    });

    $('logoutBtn').addEventListener('click', handleLogout);
    $('userLogout').addEventListener('click', handleLogout);

    UI.initTheme();
    UI.initModalCloseHandlers();
    $('confirmCancel').addEventListener('click', () => UI.closeModal('confirmModal'));

    // Dropdown açma/kapama
    $('notifBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('notifPanel'); });
    $('userMenuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown('userPanel'); });
    document.addEventListener('click', closeAllDropdowns);

    // Mobil sidebar
    $('sidebarToggle').addEventListener('click', () => {
      $('adminSidebar').classList.add('is-open');
      $('sidebarOverlay').classList.add('is-open');
    });
    $('sidebarOverlay').addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    $('adminSidebar').classList.remove('is-open');
    $('sidebarOverlay').classList.remove('is-open');
  }

  function toggleDropdown(id) {
    const panel = $(id);
    const wasOpen = panel.classList.contains('is-open');
    closeAllDropdowns();
    if (!wasOpen) panel.classList.add('is-open');
  }
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown__panel').forEach((p) => p.classList.remove('is-open'));
  }

  function handleLogout(e) {
    if (e) e.preventDefault();
    Auth.logout();
    Animations.pageTransitionTo('login.html');
  }

  function renderNotifications() {
    const activity = Storage.getActivity();
    $('notifBadge').textContent = activity.length > 9 ? '9+' : activity.length;
    $('notifList').innerHTML = activity.slice(0, 6).map((a) => `
      <div class="dropdown__item"><span>🔔</span><div><div>${UI.escapeHtml(a.message)}</div><div style="color:var(--text-muted);font-size:1.1rem;">${timeAgo(a.date)}</div></div></div>
    `).join('') || '<p style="padding:1rem;color:var(--text-muted);">Bildirim yok.</p>';
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.admin-nav-link[data-view]').forEach((l) => l.classList.toggle('is-active', l.getAttribute('data-view') === view));
    $('topbarTitle').textContent = VIEW_TITLES[view];
    window.location.hash = view;
    RENDERERS[view]();
  }

  /* ===================================================================
   * DASHBOARD
   * =================================================================== */
  function renderDashboard() {
    const posts = Storage.getBlogPosts();
    const gallery = Storage.getGalleryItems();
    const activity = Storage.getActivity();
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const messages = activity.filter((a) => a.type === 'contact').length;

    const bars = Array.from({ length: 14 }, () => Math.floor(20 + Math.random() * 80));

    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="stat-grid">
          <div class="stat-tile"><div class="stat-tile__icon">📝</div><div><div class="stat-tile__value">${posts.length}</div><div class="stat-tile__label">Toplam Yazı</div></div></div>
          <div class="stat-tile"><div class="stat-tile__icon">👁️</div><div><div class="stat-tile__value">${totalViews.toLocaleString('tr-TR')}</div><div class="stat-tile__label">Toplam Görüntülenme</div></div></div>
          <div class="stat-tile"><div class="stat-tile__icon">🖼️</div><div><div class="stat-tile__value">${gallery.length}</div><div class="stat-tile__label">Galeri Öğesi</div></div></div>
          <div class="stat-tile"><div class="stat-tile__icon">✉️</div><div><div class="stat-tile__value">${messages}</div><div class="stat-tile__label">Gelen Mesaj</div></div></div>
        </div>

        <div class="dash-grid">
          <div class="admin-card">
            <h3 style="margin-bottom:var(--space-2);">Haftalık Ziyaretçi Trendi</h3>
            <p style="color:var(--text-muted);font-size:1.2rem;margin-bottom:var(--space-2);">Gerçek zamanlı analitik entegrasyonu (Google Analytics / Plausible vb.) için hazır alan.</p>
            <div class="chart-placeholder">${bars.map((h) => `<div class="chart-placeholder__bar" style="height:${h}%"></div>`).join('')}</div>
          </div>
          <div class="admin-card">
            <h3 style="margin-bottom:var(--space-2);">Son Aktiviteler</h3>
            <div class="activity-list">
              ${activity.slice(0, 8).map((a) => `<div class="activity-item"><span class="activity-item__dot"></span><div><div class="activity-item__text">${UI.escapeHtml(a.message)}</div><div class="activity-item__time">${timeAgo(a.date)}</div></div></div>`).join('') || '<p style="color:var(--text-muted);">Henüz aktivite yok.</p>'}
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h3 style="margin-bottom:var(--space-2);">Hızlı Erişim</h3>
          <div class="quick-actions">
            <button class="quick-action" data-goto="blog">📝 Yeni Yazı</button>
            <button class="quick-action" data-goto="projects">💼 Yeni Proje</button>
            <button class="quick-action" data-goto="media">🖼️ Medya Ekle</button>
            <button class="quick-action" data-goto="menu">🧭 Menü Düzenle</button>
            <button class="quick-action" data-goto="theme">🎨 Tema Ayarları</button>
          </div>
        </div>
      </div>`;

    $('adminContent').querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.getAttribute('data-goto')));
    });
    renderNotifications();
  }

  /* ===================================================================
   * BLOG YÖNETİMİ
   * =================================================================== */
  function renderBlog() {
    const posts = Storage.getBlogPosts();
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head">
          <div><h2>Blog Yönetimi</h2><p>Toplam ${posts.length} yazı</p></div>
          <button class="btn btn--primary" id="addPostBtn">+ Yeni Yazı Ekle</button>
        </div>
        <div class="admin-card admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th></th><th>Başlık</th><th>Kategori</th><th>Durum</th><th>Tarih</th><th>Görüntülenme</th><th></th></tr></thead>
            <tbody id="postsTbody"></tbody>
          </table>
        </div>
      </div>`;

    function renderRows() {
      const list = Storage.getBlogPosts();
      $('postsTbody').innerHTML = list.length ? list.map((p) => `
        <tr>
          <td><img class="admin-table__thumb" src="${p.coverImage}" alt=""></td>
          <td class="admin-table__title">${UI.escapeHtml(p.title)}</td>
          <td>${UI.escapeHtml(p.category)}</td>
          <td><span class="badge badge--${p.status === 'published' ? 'published' : 'draft'}">${p.status === 'published' ? 'Yayında' : 'Taslak'}</span></td>
          <td>${UI.formatDate(p.date)}</td>
          <td>${p.views}</td>
          <td>
            <div class="row-actions">
              <button data-action="toggle" data-id="${p.id}" title="Durumu değiştir">🔁</button>
              <button data-action="edit" data-id="${p.id}" title="Düzenle">✏️</button>
              <button data-action="delete" data-id="${p.id}" class="danger" title="Sil">🗑️</button>
            </div>
          </td>
        </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-state__icon">📝</div>Henüz yazı eklenmemiş.</div></td></tr>`;
    }
    renderRows();

    $('addPostBtn').addEventListener('click', () => openPostForm(null, renderRows));

    $('postsTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      const post = Storage.getBlogPostById(id);
      if (action === 'edit') openPostForm(post, renderRows);
      if (action === 'toggle') {
        Storage.updateBlogPost(id, { status: post.status === 'published' ? 'draft' : 'published' });
        renderRows();
        UI.toast('Yazı durumu güncellendi.', 'success');
      }
      if (action === 'delete') {
        confirmAction('Yazıyı Sil', `"${post.title}" kalıcı olarak silinecek.`, () => {
          Storage.deleteBlogPost(id);
          renderRows();
          UI.toast('Yazı silindi.', 'success');
        });
      }
    });
  }

  function openPostForm(post, onSaved) {
    const isEdit = !!post;
    const data = post || { title: '', slug: '', excerpt: '', content: '', category: '', tags: [], coverImage: '', author: Auth.getSession().name, status: 'draft', seoTitle: '', seoDescription: '' };

    openFormModal(isEdit ? 'Yazıyı Düzenle' : 'Yeni Yazı Ekle', `
      <form class="admin-form" id="postForm">
        <div class="field"><label>Başlık</label><input type="text" id="pfTitle" value="${UI.escapeHtml(data.title)}" required></div>
        <div class="field"><label>Slug (URL)</label><input type="text" id="pfSlug" value="${UI.escapeHtml(data.slug)}"></div>
        <div class="form-row">
          <div class="field"><label>Kategori</label><input type="text" id="pfCategory" value="${UI.escapeHtml(data.category)}"></div>
          <div class="field"><label>Etiketler (virgülle ayırın)</label><input type="text" id="pfTags" value="${UI.escapeHtml((data.tags || []).join(', '))}"></div>
        </div>
        <div class="field"><label>Özet</label><textarea id="pfExcerpt" rows="2">${UI.escapeHtml(data.excerpt)}</textarea></div>
        <div class="field"><label>İçerik (HTML desteklenir)</label><textarea id="pfContent" rows="6">${UI.escapeHtml(data.content)}</textarea></div>
        <div class="field">
          <label>Kapak Görseli</label>
          <div class="upload-box" id="pfCoverBox">
            ${data.coverImage ? `<img src="${data.coverImage}">` : ''}
            <div>📤 Görsel yüklemek için tıklayın</div>
            <input type="file" accept="image/*">
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label>Durum</label>
            <select id="pfStatus"><option value="draft" ${data.status === 'draft' ? 'selected' : ''}>Taslak</option><option value="published" ${data.status === 'published' ? 'selected' : ''}>Yayınla</option></select>
          </div>
          <div class="field"><label>Yazar</label><input type="text" id="pfAuthor" value="${UI.escapeHtml(data.author)}"></div>
        </div>
        <div class="field"><label>SEO Başlığı</label><input type="text" id="pfSeoTitle" value="${UI.escapeHtml(data.seoTitle)}"></div>
        <div class="field"><label>SEO Açıklaması</label><textarea id="pfSeoDesc" rows="2">${UI.escapeHtml(data.seoDescription)}</textarea></div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost btn--sm" id="pfCancel">Vazgeç</button>
          <button type="submit" class="btn btn--primary btn--sm">Kaydet</button>
        </div>
      </form>`, (body) => {
      let coverData = data.coverImage;
      initUploadBox(body.querySelector('#pfCoverBox'), (dataUrl) => { coverData = dataUrl; });
      body.querySelector('#pfCancel').addEventListener('click', closeFormModal);
      body.querySelector('#pfTitle').addEventListener('input', (e) => {
        if (!isEdit) body.querySelector('#pfSlug').value = slugify(e.target.value);
      });

      body.querySelector('#postForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
          title: body.querySelector('#pfTitle').value.trim(),
          slug: slugify(body.querySelector('#pfSlug').value || body.querySelector('#pfTitle').value),
          category: body.querySelector('#pfCategory').value.trim() || 'Genel',
          tags: body.querySelector('#pfTags').value.split(',').map((t) => t.trim()).filter(Boolean),
          excerpt: body.querySelector('#pfExcerpt').value.trim(),
          content: body.querySelector('#pfContent').value.trim(),
          coverImage: coverData || 'assets/images/blog-1.svg',
          status: body.querySelector('#pfStatus').value,
          author: body.querySelector('#pfAuthor').value.trim(),
          authorAvatar: 'assets/images/avatar.svg',
          seoTitle: body.querySelector('#pfSeoTitle').value.trim(),
          seoDescription: body.querySelector('#pfSeoDesc').value.trim(),
          readingTime: Math.max(1, Math.round(body.querySelector('#pfContent').value.split(/\s+/).length / 200))
        };
        if (!payload.title) return;

        if (isEdit) {
          Storage.updateBlogPost(data.id, payload);
          UI.toast('Yazı güncellendi.', 'success');
        } else {
          Storage.addBlogPost(payload);
          UI.toast('Yeni yazı eklendi.', 'success');
        }
        closeFormModal();
        onSaved();
      });
    });
  }

  /* ===================================================================
   * PROJELERİM YÖNETİMİ
   * =================================================================== */
  function renderProjectsView() {
    const items = Storage.getProjects();
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head">
          <div><h2>Projelerim</h2><p>Toplam ${items.length} proje</p></div>
          <button class="btn btn--primary" id="addProjectBtn">+ Yeni Proje Ekle</button>
        </div>
        <div class="admin-card admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th></th><th>Başlık</th><th>Kategori</th><th>Teknolojiler</th><th></th></tr></thead>
            <tbody id="projectsTbody"></tbody>
          </table>
        </div>
      </div>`;

    function renderRows() {
      const list = Storage.getProjects();
      $('projectsTbody').innerHTML = list.length ? list.map((p) => `
        <tr>
          <td><img class="admin-table__thumb" src="${p.image}" alt=""></td>
          <td class="admin-table__title">${UI.escapeHtml(p.title)}</td>
          <td>${UI.escapeHtml(p.category)}</td>
          <td>${(p.tech || []).map((t) => UI.escapeHtml(t)).join(', ')}</td>
          <td>
            <div class="row-actions">
              <button data-action="edit" data-id="${p.id}" title="Düzenle">✏️</button>
              <button data-action="delete" data-id="${p.id}" class="danger" title="Sil">🗑️</button>
            </div>
          </td>
        </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">💼</div>Henüz proje eklenmemiş.</div></td></tr>`;
    }
    renderRows();

    $('addProjectBtn').addEventListener('click', () => openProjectForm(null, renderRows));

    $('projectsTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if (action === 'edit') {
        const project = Storage.getProjects().find((p) => p.id === id);
        openProjectForm(project, renderRows);
      }
      if (action === 'delete') {
        const project = Storage.getProjects().find((p) => p.id === id);
        confirmAction('Projeyi Sil', `"${project.title}" kalıcı olarak silinecek.`, () => {
          Storage.deleteProject(id);
          renderRows();
          UI.toast('Proje silindi.', 'success');
        });
      }
    });
  }

  function openProjectForm(project, onSaved) {
    const isEdit = !!project;
    const data = project || { title: '', category: '', image: '', description: '', link: '', githubLink: '', tech: [], features: [] };

    openFormModal(isEdit ? 'Projeyi Düzenle' : 'Yeni Proje Ekle', `
      <form class="admin-form" id="projectForm">
        <div class="field"><label>Başlık</label><input type="text" id="prTitle" value="${UI.escapeHtml(data.title)}" required></div>
        <div class="field"><label>Kategori</label><input type="text" id="prCategory" value="${UI.escapeHtml(data.category)}" placeholder="örn. Web Uygulaması"></div>
        <div class="field">
          <label>Proje Görseli</label>
          <div class="upload-box" id="prImageBox">
            ${data.image ? `<img src="${data.image}">` : ''}
            <div>📤 Görsel yüklemek için tıklayın</div>
            <input type="file" accept="image/*">
          </div>
        </div>
        <div class="field"><label>Açıklama</label><textarea id="prDescription" rows="3">${UI.escapeHtml(data.description)}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Proje Linki (canlı site)</label><input type="text" id="prLink" value="${UI.escapeHtml(data.link)}" placeholder="https://..."></div>
          <div class="field"><label>GitHub Linki</label><input type="text" id="prGithub" value="${UI.escapeHtml(data.githubLink)}" placeholder="https://github.com/..."></div>
        </div>
        <div class="field"><label>Kullanılan Teknolojiler (virgülle ayırın)</label><input type="text" id="prTech" value="${UI.escapeHtml((data.tech || []).join(', '))}" placeholder="React, Node.js, MongoDB"></div>
        <div class="field"><label>Öne Çıkan Özellikler (her satıra bir tane)</label><textarea id="prFeatures" rows="4" placeholder="Gerçek zamanlı bildirimler&#10;Admin paneli">${UI.escapeHtml((data.features || []).join('\n'))}</textarea></div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost btn--sm" id="prCancel">Vazgeç</button>
          <button type="submit" class="btn btn--primary btn--sm">Kaydet</button>
        </div>
      </form>`, (body) => {
      let imageData = data.image;
      initUploadBox(body.querySelector('#prImageBox'), (d) => { imageData = d; });
      body.querySelector('#prCancel').addEventListener('click', closeFormModal);

      body.querySelector('#projectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
          title: body.querySelector('#prTitle').value.trim(),
          category: body.querySelector('#prCategory').value.trim() || 'Genel',
          image: imageData || 'assets/images/portfolio-1.svg',
          description: body.querySelector('#prDescription').value.trim(),
          link: body.querySelector('#prLink').value.trim(),
          githubLink: body.querySelector('#prGithub').value.trim(),
          tech: body.querySelector('#prTech').value.split(',').map((t) => t.trim()).filter(Boolean),
          features: body.querySelector('#prFeatures').value.split('\n').map((f) => f.trim()).filter(Boolean)
        };
        if (!payload.title) return;

        if (isEdit) {
          Storage.updateProject(data.id, payload);
          UI.toast('Proje güncellendi.', 'success');
        } else {
          Storage.addProject(payload);
          UI.toast('Yeni proje eklendi.', 'success');
        }
        closeFormModal();
        onSaved();
      });
    });
  }

  /* ===================================================================
   * SAYFA YÖNETİMİ
   * =================================================================== */
  const PAGE_TABS = [
    { id: 'hero', label: 'Ana Sayfa (Hero)' },
    { id: 'about', label: 'Hakkımda' },
    { id: 'testimonials', label: 'Referanslar' },
    { id: 'contact', label: 'İletişim' },
    { id: 'footer', label: 'Footer' }
  ];
  let activePageTab = 'hero';

  function renderPages() {
    PAGES = Storage.getPages();
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>Sayfa Yönetimi</h2><p>Site içeriklerini buradan güncelleyin. Değişiklikler kaydedilir kaydedilmez canlı siteye yansır.</p></div></div>
        <div class="admin-tabs" id="pageTabs">
          ${PAGE_TABS.map((t) => `<button class="admin-tab ${t.id === activePageTab ? 'is-active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
        </div>
        <div class="admin-card" id="pageTabBody"></div>
      </div>`;

    $('pageTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-tab');
      if (!btn) return;
      activePageTab = btn.getAttribute('data-tab');
      renderPages();
    });

    PAGE_TAB_RENDERERS[activePageTab]();
  }

  function saveSection(section, data, message) {
    Storage.updatePagesSection(section, data);
    UI.toast(message || 'Değişiklikler kaydedildi.', 'success');
  }

  const PAGE_TAB_RENDERERS = {
    hero() {
      const h = PAGES.hero;
      $('pageTabBody').innerHTML = `
        <form class="admin-form" id="heroForm">
          <div class="form-row">
            <div class="field"><label>Selamlama</label><input type="text" id="hGreeting" value="${UI.escapeHtml(h.greeting)}"></div>
            <div class="field"><label>İsim</label><input type="text" id="hName" value="${UI.escapeHtml(h.name)}"></div>
          </div>
          <div class="field"><label>Ünvan</label><input type="text" id="hTitle" value="${UI.escapeHtml(h.title)}"></div>
          <div class="field"><label>Kısa Açıklama</label><textarea id="hDesc" rows="3">${UI.escapeHtml(h.description)}</textarea></div>
          <div class="field"><label>CV Dosya Yolu / Linki</label><input type="text" id="hCv" value="${UI.escapeHtml(h.cvUrl)}"></div>
          <div class="field"><label>Profil Fotoğrafı</label>
            <div class="upload-box" id="hAvatarBox"><img src="${h.avatar}"><div>📤 Değiştirmek için tıklayın</div><input type="file" accept="image/*"></div>
          </div>
          <h4 style="margin-top:var(--space-2);">Buton Metinleri</h4>
          <div class="form-row">
            <div class="field"><label>CV Butonu</label><input type="text" id="hBtnCv" value="${UI.escapeHtml(h.buttons.cv)}"></div>
            <div class="field"><label>İletişim Butonu</label><input type="text" id="hBtnContact" value="${UI.escapeHtml(h.buttons.contact)}"></div>
          </div>
          <div class="field"><label>Projelerim Butonu</label><input type="text" id="hBtnPortfolio" value="${UI.escapeHtml(h.buttons.portfolio)}"></div>
          <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Kaydet</button>
        </form>`;

      let avatarData = h.avatar;
      initUploadBox($('hAvatarBox'), (d) => { avatarData = d; });

      $('heroForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSection('hero', {
          greeting: $('hGreeting').value, name: $('hName').value, title: $('hTitle').value,
          description: $('hDesc').value, cvUrl: $('hCv').value, avatar: avatarData,
          buttons: { cv: $('hBtnCv').value, contact: $('hBtnContact').value, portfolio: $('hBtnPortfolio').value }
        });
        PAGES = Storage.getPages();
      });
    },

    about() {
      const a = PAGES.about;
      $('pageTabBody').innerHTML = `
        <form class="admin-form" id="aboutForm">
          <div class="field"><label>Başlık</label><input type="text" id="aHeading" value="${UI.escapeHtml(a.heading)}"></div>
          <div class="field"><label>Biyografi</label><textarea id="aBio" rows="4">${UI.escapeHtml(a.bio)}</textarea></div>
          <div class="field"><label>Hobiler (virgülle ayırın)</label><input type="text" id="aHobbies" value="${UI.escapeHtml(a.hobbies.join(', '))}"></div>
          <div class="field"><label>İlgi Alanları (virgülle ayırın)</label><input type="text" id="aInterests" value="${UI.escapeHtml(a.interests.join(', '))}"></div>

          <h4>Deneyimler</h4>
          <div class="dnd-list" id="expList"></div>
          <button type="button" class="btn btn--ghost btn--sm" id="addExp" style="align-self:flex-start;">+ Deneyim Ekle</button>

          <h4>Yetenekler</h4>
          <div class="dnd-list" id="skillList"></div>
          <button type="button" class="btn btn--ghost btn--sm" id="addSkill" style="align-self:flex-start;">+ Yetenek Ekle</button>

          <h4>İstatistikler</h4>
          <div class="dnd-list" id="statList"></div>
          <button type="button" class="btn btn--ghost btn--sm" id="addStat" style="align-self:flex-start;">+ İstatistik Ekle</button>

          <button type="submit" class="btn btn--primary" style="align-self:flex-start;margin-top:var(--space-2);">Kaydet</button>
        </form>`;

      let experiences = JSON.parse(JSON.stringify(a.experiences));
      let skills = JSON.parse(JSON.stringify(a.skills));
      let stats = JSON.parse(JSON.stringify(a.stats));

      function renderExp() {
        $('expList').innerHTML = experiences.map((exp, i) => `
          <div class="dnd-item" style="cursor:default;">
            <input type="text" placeholder="Rol" value="${UI.escapeHtml(exp.role)}" data-i="${i}" data-f="role" style="flex:1;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <input type="text" placeholder="Şirket" value="${UI.escapeHtml(exp.company)}" data-i="${i}" data-f="company" style="flex:1;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <input type="text" placeholder="Dönem" value="${UI.escapeHtml(exp.period)}" data-i="${i}" data-f="period" style="width:140px;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <button type="button" data-remove="${i}" class="danger" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border);">✕</button>
          </div>`).join('');
        $('expList').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { experiences[inp.dataset.i][inp.dataset.f] = inp.value; }));
        $('expList').querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => { experiences.splice(btn.dataset.remove, 1); renderExp(); }));
      }
      function renderSkills() {
        $('skillList').innerHTML = skills.map((sk, i) => `
          <div class="dnd-item" style="cursor:default;">
            <input type="text" placeholder="Yetenek" value="${UI.escapeHtml(sk.name)}" data-i="${i}" data-f="name" style="flex:1;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <input type="number" min="0" max="100" placeholder="Seviye %" value="${sk.level}" data-i="${i}" data-f="level" style="width:100px;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <button type="button" data-remove="${i}" class="danger" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border);">✕</button>
          </div>`).join('');
        $('skillList').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => {
          skills[inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'level' ? parseInt(inp.value, 10) || 0 : inp.value;
        }));
        $('skillList').querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => { skills.splice(btn.dataset.remove, 1); renderSkills(); }));
      }
      function renderStats() {
        $('statList').innerHTML = stats.map((st, i) => `
          <div class="dnd-item" style="cursor:default;">
            <input type="text" placeholder="Etiket" value="${UI.escapeHtml(st.label)}" data-i="${i}" data-f="label" style="flex:1;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <input type="number" placeholder="Değer" value="${st.value}" data-i="${i}" data-f="value" style="width:100px;padding:.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);">
            <button type="button" data-remove="${i}" class="danger" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border);">✕</button>
          </div>`).join('');
        $('statList').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => {
          stats[inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'value' ? parseInt(inp.value, 10) || 0 : inp.value;
        }));
        $('statList').querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => { stats.splice(btn.dataset.remove, 1); renderStats(); }));
      }
      renderExp(); renderSkills(); renderStats();

      $('addExp').addEventListener('click', () => { experiences.push({ role: '', company: '', period: '' }); renderExp(); });
      $('addSkill').addEventListener('click', () => { skills.push({ name: '', level: 50 }); renderSkills(); });
      $('addStat').addEventListener('click', () => { stats.push({ label: '', value: 0 }); renderStats(); });

      $('aboutForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSection('about', {
          heading: $('aHeading').value, bio: $('aBio').value,
          hobbies: $('aHobbies').value.split(',').map((s) => s.trim()).filter(Boolean),
          interests: $('aInterests').value.split(',').map((s) => s.trim()).filter(Boolean),
          experiences, skills, stats
        });
        PAGES = Storage.getPages();
      });
    },

    testimonials() {
      let list = JSON.parse(JSON.stringify(PAGES.testimonials));
      $('pageTabBody').innerHTML = `<div id="testiList" class="dnd-list"></div><button type="button" class="btn btn--ghost btn--sm" id="addTesti" style="margin-top:var(--space-2);">+ Referans Ekle</button><button type="button" class="btn btn--primary" id="saveTesti" style="margin-top:var(--space-2);margin-left:var(--space-1);">Kaydet</button>`;

      function render() {
        $('testiList').innerHTML = list.map((t, i) => `
          <div class="admin-card" style="display:flex;flex-direction:column;gap:.6rem;">
            <div class="form-row">
              <input type="text" placeholder="İsim" value="${UI.escapeHtml(t.name)}" data-i="${i}" data-f="name">
              <input type="text" placeholder="Rol / Firma" value="${UI.escapeHtml(t.role)}" data-i="${i}" data-f="role">
            </div>
            <textarea placeholder="Yorum" data-i="${i}" data-f="message" rows="2">${UI.escapeHtml(t.message)}</textarea>
            <div style="display:flex;gap:1rem;align-items:center;">
              <label>Puan: </label><input type="number" min="1" max="5" value="${t.rating}" data-i="${i}" data-f="rating" style="width:70px;">
              <button type="button" class="danger" data-remove="${i}" style="margin-left:auto;">Sil</button>
            </div>
          </div>`).join('');
        $('testiList').querySelectorAll('input,textarea').forEach((inp) => inp.addEventListener('input', () => {
          list[inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'rating' ? parseInt(inp.value, 10) || 5 : inp.value;
        }));
        $('testiList').querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => { list.splice(btn.dataset.remove, 1); render(); }));
      }
      render();
      $('addTesti').addEventListener('click', () => { list.push({ id: Storage.generateId('t'), name: '', role: '', avatar: 'assets/images/client-1.svg', rating: 5, message: '' }); render(); });
      $('saveTesti').addEventListener('click', () => { saveSection('testimonials', list); PAGES = Storage.getPages(); });
    },

    contact() {
      const c = PAGES.contact;
      $('pageTabBody').innerHTML = `
        <form class="admin-form" id="contactAdminForm">
          <div class="form-row">
            <div class="field"><label>E-posta</label><input type="email" id="cnEmail" value="${UI.escapeHtml(c.email)}"></div>
            <div class="field"><label>Telefon</label><input type="text" id="cnPhone" value="${UI.escapeHtml(c.phone)}"></div>
          </div>
          <div class="field"><label>Adres</label><input type="text" id="cnAddress" value="${UI.escapeHtml(c.address)}"></div>
          <div class="field"><label>Harita Linki</label><input type="text" id="cnMap" value="${UI.escapeHtml(c.mapEmbed)}"></div>
          <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Kaydet</button>
        </form>`;
      $('contactAdminForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSection('contact', Object.assign({}, c, { email: $('cnEmail').value, phone: $('cnPhone').value, address: $('cnAddress').value, mapEmbed: $('cnMap').value }));
        PAGES = Storage.getPages();
      });
    },

    footer() {
      const f = PAGES.footer;
      $('pageTabBody').innerHTML = `
        <form class="admin-form" id="footerForm">
          <div class="field"><label>Footer Açıklaması</label><textarea id="ftText" rows="2">${UI.escapeHtml(f.text)}</textarea></div>
          <div class="field"><label>Telif Hakkı Metni</label><input type="text" id="ftCopy" value="${UI.escapeHtml(f.copyright)}"></div>
          <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Kaydet</button>
        </form>`;
      $('footerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSection('footer', { text: $('ftText').value, copyright: $('ftCopy').value });
        PAGES = Storage.getPages();
      });
    }
  };

  /* ===================================================================
   * MEDYA YÖNETİMİ
   * =================================================================== */
  function renderMedia() {
    PAGES = Storage.getPages();
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>Medya Yönetimi</h2><p>Galeri, logo ve favicon yönetimi.</p></div>
          <button class="btn btn--primary" id="addMediaBtn">+ Medya Ekle</button>
        </div>
        <div class="admin-card">
          <div class="media-grid" id="mediaGrid"></div>
        </div>
        <div class="admin-card">
          <h3 style="margin-bottom:var(--space-2);">Logo &amp; Favicon</h3>
          <div class="form-row">
            <div class="field"><label>Logo Metni</label><input type="text" id="logoText" value="${UI.escapeHtml(PAGES.site.logoText)}"></div>
            <div class="field"><label>Favicon</label>
              <div class="upload-box" id="faviconBox" style="padding:1rem;"><img src="${PAGES.site.favicon}" style="max-height:48px;"><div>📤 Değiştir</div><input type="file" accept="image/*"></div>
            </div>
          </div>
          <button class="btn btn--primary" id="saveSiteAssets" style="align-self:flex-start;">Kaydet</button>
        </div>
      </div>`;

    function renderGrid() {
      const items = Storage.getGalleryItems();
      $('mediaGrid').innerHTML = items.map((item) => `
        <div class="media-tile"><img src="${item.thumb}" alt="${UI.escapeHtml(item.title)}"><button class="media-tile__remove" data-id="${item.id}">✕</button></div>
      `).join('') || '<div class="empty-state"><div class="empty-state__icon">🖼️</div>Galeri boş.</div>';
      $('mediaGrid').querySelectorAll('.media-tile__remove').forEach((btn) => btn.addEventListener('click', () => {
        confirmAction('Öğeyi Sil', 'Bu galeri öğesi silinecek.', () => { Storage.deleteGalleryItem(btn.dataset.id); renderGrid(); UI.toast('Silindi.', 'success'); });
      }));
    }
    renderGrid();

    $('addMediaBtn').addEventListener('click', () => {
      openFormModal('Yeni Medya Ekle', `
        <form class="admin-form" id="mediaForm">
          <div class="field"><label>Başlık</label><input type="text" id="mTitle" required></div>
          <div class="form-row">
            <div class="field"><label>Kategori</label><input type="text" id="mCategory" value="Tasarım"></div>
            <div class="field"><label>Tür</label><select id="mType"><option value="image">Görsel</option><option value="video">Video</option></select></div>
          </div>
          <div class="field" id="mUploadWrap"><label>Görsel Yükle</label>
            <div class="upload-box" id="mUploadBox"><div>📤 Görsel yüklemek için tıklayın</div><input type="file" accept="image/*"></div>
          </div>
          <div class="field" id="mVideoWrap" style="display:none;"><label>Video URL</label><input type="text" id="mVideoUrl" placeholder="assets/videos/ornek.mp4"></div>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost btn--sm" id="mCancel">Vazgeç</button>
            <button type="submit" class="btn btn--primary btn--sm">Ekle</button>
          </div>
        </form>`, (body) => {
        let imageData = '';
        initUploadBox(body.querySelector('#mUploadBox'), (d) => { imageData = d; });
        body.querySelector('#mType').addEventListener('change', (e) => {
          const isVideo = e.target.value === 'video';
          body.querySelector('#mUploadWrap').style.display = isVideo ? 'none' : '';
          body.querySelector('#mVideoWrap').style.display = isVideo ? '' : 'none';
        });
        body.querySelector('#mCancel').addEventListener('click', closeFormModal);
        body.querySelector('#mediaForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const type = body.querySelector('#mType').value;
          const item = {
            type, title: body.querySelector('#mTitle').value.trim(), category: body.querySelector('#mCategory').value.trim() || 'Genel',
            thumb: type === 'video' ? 'assets/images/gallery-3.svg' : (imageData || 'assets/images/gallery-1.svg'),
            src: type === 'video' ? (body.querySelector('#mVideoUrl').value.trim() || 'assets/videos/demo-1.mp4') : (imageData || 'assets/images/gallery-1.svg')
          };
          Storage.addGalleryItem(item);
          UI.toast('Medya eklendi.', 'success');
          closeFormModal();
          renderGrid();
        });
      });
    });

    let faviconData = PAGES.site.favicon;
    initUploadBox($('faviconBox'), (d) => { faviconData = d; });
    $('saveSiteAssets').addEventListener('click', () => {
      saveSection('site', Object.assign({}, PAGES.site, { logoText: $('logoText').value, favicon: faviconData }), 'Logo ve favicon güncellendi.');
      PAGES = Storage.getPages();
    });
  }

  /* ===================================================================
   * MENÜ YÖNETİMİ (Drag & Drop)
   * =================================================================== */
  function renderMenu() {
    PAGES = Storage.getPages();
    let menu = JSON.parse(JSON.stringify(PAGES.navbar.menu)).sort((a, b) => a.order - b.order);
    let dragIndex = null;

    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>Menü Yönetimi</h2><p>Sürükleyerek sıralayın, ekleyin veya silin.</p></div></div>
        <div class="admin-card">
          <div class="dnd-list" id="menuList"></div>
          <div class="form-row" style="margin-top:var(--space-3);">
            <input type="text" id="newMenuLabel" placeholder="Menü Etiketi (örn. Hizmetler)">
            <input type="text" id="newMenuTarget" placeholder="Hedef (örn. #services)">
          </div>
          <button class="btn btn--ghost btn--sm" id="addMenuItem" style="align-self:flex-start;margin-top:var(--space-2);">+ Menü Öğesi Ekle</button>
          <button class="btn btn--primary" id="saveMenu" style="align-self:flex-start;margin-top:var(--space-2);margin-left:var(--space-1);">Kaydet</button>
        </div>
      </div>`;

    function render() {
      $('menuList').innerHTML = menu.map((item, i) => `
        <div class="dnd-item" draggable="true" data-index="${i}">
          <span class="dnd-item__handle">⠿</span>
          <span class="dnd-item__label">${UI.escapeHtml(item.label)} <small style="color:var(--text-muted);">(${UI.escapeHtml(item.target)})</small></span>
          <button type="button" class="danger" data-remove="${i}" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--border);">✕</button>
        </div>`).join('');

      const items = $('menuList').querySelectorAll('.dnd-item');
      items.forEach((item) => {
        item.addEventListener('dragstart', () => { dragIndex = parseInt(item.dataset.index, 10); item.classList.add('is-dragging'); });
        item.addEventListener('dragend', () => item.classList.remove('is-dragging'));
        item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          item.classList.remove('drag-over');
          const dropIndex = parseInt(item.dataset.index, 10);
          if (dragIndex === null || dragIndex === dropIndex) return;
          const moved = menu.splice(dragIndex, 1)[0];
          menu.splice(dropIndex, 0, moved);
          render();
        });
      });
      $('menuList').querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => { menu.splice(btn.dataset.remove, 1); render(); }));
    }
    render();

    $('addMenuItem').addEventListener('click', () => {
      const label = $('newMenuLabel').value.trim();
      const target = $('newMenuTarget').value.trim();
      if (!label || !target) { UI.toast('Etiket ve hedef alanı zorunludur.', 'error'); return; }
      menu.push({ id: Storage.generateId('m'), label, target, order: menu.length + 1 });
      $('newMenuLabel').value = ''; $('newMenuTarget').value = '';
      render();
    });

    $('saveMenu').addEventListener('click', () => {
      const ordered = menu.map((item, i) => Object.assign({}, item, { order: i + 1 }));
      saveSection('navbar', { menu: ordered }, 'Menü güncellendi.');
    });
  }

  /* ===================================================================
   * SOSYAL MEDYA YÖNETİMİ
   * =================================================================== */
  const SOCIAL_LABELS = { instagram: 'Instagram', linkedin: 'LinkedIn', github: 'GitHub', youtube: 'YouTube', x: 'X (Twitter)', facebook: 'Facebook', tiktok: 'TikTok' };

  function renderSocial() {
    PAGES = Storage.getPages();
    const social = PAGES.contact.social;
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>Sosyal Medya Yönetimi</h2><p>Tüm sosyal medya bağlantılarını buradan yönetin.</p></div></div>
        <div class="admin-card">
          <form class="admin-form" id="socialForm">
            <div class="social-manage-grid">
              ${Object.keys(SOCIAL_LABELS).map((key) => `
                <div class="field"><label>${SOCIAL_LABELS[key]}</label><input type="url" id="soc_${key}" value="${UI.escapeHtml(social[key] || '')}" placeholder="https://..."></div>
              `).join('')}
            </div>
            <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Kaydet</button>
          </form>
        </div>
      </div>`;

    $('socialForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {};
      Object.keys(SOCIAL_LABELS).forEach((key) => { updated[key] = $(`soc_${key}`).value.trim(); });
      saveSection('contact', Object.assign({}, PAGES.contact, { social: updated }), 'Sosyal medya bağlantıları güncellendi.');
      PAGES = Storage.getPages();
    });
  }

  /* ===================================================================
   * SEO YÖNETİMİ
   * =================================================================== */
  function renderSeo() {
    PAGES = Storage.getPages();
    const s = PAGES.seo;
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>SEO Yönetimi</h2><p>Arama motoru ve sosyal paylaşım ayarları.</p></div></div>
        <div class="admin-card">
          <form class="admin-form" id="seoForm">
            <div class="field"><label>Site Başlığı</label><input type="text" id="seoTitle" value="${UI.escapeHtml(s.siteTitle)}"></div>
            <div class="field"><label>Meta Açıklama</label><textarea id="seoDesc" rows="2">${UI.escapeHtml(s.metaDescription)}</textarea></div>
            <div class="field"><label>Anahtar Kelimeler</label><input type="text" id="seoKeywords" value="${UI.escapeHtml(s.keywords)}"></div>
            <h4>Open Graph</h4>
            <div class="form-row">
              <div class="field"><label>OG Başlık</label><input type="text" id="ogTitle" value="${UI.escapeHtml(s.ogTitle)}"></div>
              <div class="field"><label>OG Açıklama</label><input type="text" id="ogDesc" value="${UI.escapeHtml(s.ogDescription)}"></div>
            </div>
            <div class="field"><label>OG Görseli</label>
              <div class="upload-box" id="ogImageBox"><img src="${s.ogImage}"><div>📤 Değiştir</div><input type="file" accept="image/*"></div>
            </div>
            <h4>robots.txt</h4>
            <div class="field"><textarea id="seoRobots" rows="3">${UI.escapeHtml(s.robots)}</textarea></div>
            <h4>sitemap.xml Adresi</h4>
            <div class="field"><input type="text" id="seoSitemap" value="${UI.escapeHtml(s.sitemap)}"></div>
            <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Kaydet</button>
          </form>
        </div>
      </div>`;

    let ogImageData = s.ogImage;
    initUploadBox($('ogImageBox'), (d) => { ogImageData = d; });

    $('seoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveSection('seo', {
        siteTitle: $('seoTitle').value, metaDescription: $('seoDesc').value, keywords: $('seoKeywords').value,
        ogTitle: $('ogTitle').value, ogDescription: $('ogDesc').value, ogImage: ogImageData,
        robots: $('seoRobots').value, sitemap: $('seoSitemap').value
      }, 'SEO ayarları güncellendi.');
      PAGES = Storage.getPages();
    });
  }

  /* ===================================================================
   * TEMA YÖNETİMİ
   * =================================================================== */
  function renderTheme() {
    PAGES = Storage.getPages();
    const s = PAGES.site;
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>Tema Yönetimi</h2><p>Sitenin görsel kimliğini özelleştirin.</p></div></div>
        <div class="admin-card">
          <form class="admin-form" id="themeForm">
            <div class="field"><label>Vurgu Rengi</label>
              <div class="color-swatch-row"><input type="color" id="thAccent" value="${s.accentColor}"><span id="thAccentPreview">${s.accentColor}</span></div>
            </div>
            <div class="field"><label>Font</label>
              <select id="thFont">
                ${['Inter', 'Poppins', 'System UI', 'Georgia'].map((f) => `<option ${f === s.font ? 'selected' : ''}>${f}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Animasyon Hızı</label>
              <select id="thSpeed">
                <option value="slow" ${s.animationSpeed === 'slow' ? 'selected' : ''}>Yavaş</option>
                <option value="normal" ${s.animationSpeed === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="fast" ${s.animationSpeed === 'fast' ? 'selected' : ''}>Hızlı</option>
              </select>
            </div>
            <div class="field"><label>Arka Plan Stili</label>
              <select id="thBg">
                <option value="blobs" ${s.backgroundStyle === 'blobs' ? 'selected' : ''}>Animasyonlu Bloblar</option>
                <option value="none" ${s.backgroundStyle === 'none' ? 'selected' : ''}>Sade (Efektsiz)</option>
              </select>
            </div>
            <div class="field"><label>Varsayılan Tema Modu</label>
              <select id="thMode">
                <option value="auto" ${s.themeMode === 'auto' ? 'selected' : ''}>Otomatik (Sistem)</option>
                <option value="light" ${s.themeMode === 'light' ? 'selected' : ''}>Açık</option>
                <option value="dark" ${s.themeMode === 'dark' ? 'selected' : ''}>Koyu</option>
              </select>
            </div>
            <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Kaydet</button>
          </form>
        </div>
      </div>`;

    $('thAccent').addEventListener('input', (e) => {
      $('thAccentPreview').textContent = e.target.value;
      document.documentElement.style.setProperty('--accent', e.target.value);
    });

    $('themeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveSection('site', Object.assign({}, s, {
        accentColor: $('thAccent').value, font: $('thFont').value,
        animationSpeed: $('thSpeed').value, backgroundStyle: $('thBg').value, themeMode: $('thMode').value
      }), 'Tema ayarları güncellendi. Değişiklikler canlı sitede geçerli olacaktır.');
      PAGES = Storage.getPages();
    });
  }

  /* ===================================================================
   * KULLANICI AYARLARI
   * =================================================================== */
  function renderUser() {
    const session = Auth.getSession();
    $('adminContent').innerHTML = `
      <div class="admin-view">
        <div class="admin-view-head"><div><h2>Kullanıcı Ayarları</h2><p>Profil bilgilerinizi ve şifrenizi yönetin.</p></div></div>
        <div class="dash-grid">
          <div class="admin-card">
            <h3 style="margin-bottom:var(--space-2);">Profil Bilgileri</h3>
            <form class="admin-form" id="profileForm">
              <div class="field"><label>Avatar</label>
                <div class="upload-box" id="avatarBox"><img src="${session.avatar}"><div>📤 Değiştir</div><input type="file" accept="image/*"></div>
              </div>
              <div class="field"><label>Ad Soyad</label><input type="text" id="pName" value="${UI.escapeHtml(session.name)}"></div>
              <div class="field"><label>E-posta</label><input type="email" id="pEmail" value="${UI.escapeHtml(session.email)}"></div>
              <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Profili Güncelle</button>
            </form>
          </div>
          <div class="admin-card">
            <h3 style="margin-bottom:var(--space-2);">Şifre Değiştir</h3>
            <form class="admin-form" id="passwordForm">
              <div class="field"><label>Mevcut Şifre</label><input type="password" id="curPass" required></div>
              <div class="field"><label>Yeni Şifre</label><input type="password" id="newPass" required></div>
              <div class="field"><label>Yeni Şifre (Tekrar)</label><input type="password" id="confirmPass" required></div>
              <button type="submit" class="btn btn--primary" style="align-self:flex-start;">Şifreyi Güncelle</button>
            </form>
          </div>
        </div>
      </div>`;

    let avatarData = session.avatar;
    initUploadBox($('avatarBox'), (d) => { avatarData = d; });

    $('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await Auth.updateCurrentUser({ name: $('pName').value, email: $('pEmail').value, avatar: avatarData });
      $('userName').textContent = $('pName').value;
      $('userAvatar').src = avatarData;
      UI.toast('Profil güncellendi.', 'success');
    });

    $('passwordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const curPass = $('curPass').value;
      const newPass = $('newPass').value;
      const confirmPass = $('confirmPass').value;
      if (newPass.length < 4) { UI.toast('Yeni şifre en az 4 karakter olmalı.', 'error'); return; }
      if (newPass !== confirmPass) { UI.toast('Şifreler eşleşmiyor.', 'error'); return; }
      try {
        await Auth.updatePassword(curPass, newPass);
        UI.toast('Şifre başarıyla güncellendi.', 'success');
        e.target.reset();
      } catch (err) {
        UI.toast('Mevcut şifre hatalı.', 'error');
      }
    });
  }

  /* ------------------------------------------------------------------- */
  const RENDERERS = {
    dashboard: renderDashboard, blog: renderBlog, projects: renderProjectsView, pages: renderPages, media: renderMedia,
    menu: renderMenu, social: renderSocial, seo: renderSeo, theme: renderTheme, user: renderUser
  };

  async function init() {
    await Auth.waitForAuthReady();
    if (!Auth.requireAuthOrRedirect('login.html')) return;
    await Storage.init();
    PAGES = Storage.getPages();
    initChrome();
    const startView = (window.location.hash || '').replace('#', '') || 'dashboard';
    switchView(VIEW_TITLES[startView] ? startView : 'dashboard');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
