import { onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { FIREBASE_CONFIGURED, menuDocRef, renderConfigMissing } from './firebase-init.js';
import { getAllergen } from './allergens.js';

const app = document.getElementById('app');

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatPrice(value, currency) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('tr-TR')} ${currency || '₺'}`;
}

function renderHero(settings) {
  const initials = (settings.businessName || 'M')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  let mediaHtml = '';
  if (settings.heroVideo) {
    mediaHtml = `<video class="hero-media" autoplay muted loop playsinline src="${esc(settings.heroVideo)}"></video>
      <div class="hero-media" style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(10,12,16,.35), rgba(10,12,16,.75));"></div>`;
  } else if (settings.heroImage) {
    mediaHtml = `<img class="hero-media" src="${esc(settings.heroImage)}" alt="" />
      <div class="hero-media" style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(10,12,16,.4), rgba(10,12,16,.78));"></div>`;
  } else {
    mediaHtml = `<div class="hero-glow"></div>
      ${[1, 2, 3, 4, 5, 6].map(() => '<span class="spark"></span>').join('')}`;
  }

  return `
    <section class="hero">
      ${mediaHtml}
      <div class="hero-grain"></div>
      <div class="hero-content">
        ${settings.logo
          ? `<img class="hero-logo" src="${esc(settings.logo)}" alt="${esc(settings.businessName)}" />`
          : `<div class="hero-mark">${esc(initials)}</div>`}
        <p class="hero-eyebrow">Dijital Menü</p>
        <h1 class="hero-title">${esc(settings.businessName || 'Menü')}</h1>
        ${settings.tagline ? `<p class="hero-tagline">${esc(settings.tagline)}</p>` : ''}
      </div>
      <div class="hero-scroll"><span>Menüyü Gör</span><span class="hero-scroll-bar"></span></div>
    </section>`;
}

function renderUtilityBar(settings) {
  return `
    <div class="utility-bar">
      <span class="utility-handle">${esc(settings.handle || '')}</span>
      <div class="utility-actions">
        <button class="utility-btn" id="allergensBtn" type="button">Alerjenler</button>
      </div>
    </div>`;
}

function renderDiscount(settings) {
  if (!settings.discountText) return '';
  return `<div class="discount-strip">${esc(settings.discountText)}</div>`;
}

const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.6-4.4 4 1.2 5.8L12 16.6l-5.3 2.7 1.2-5.8-4.4-4 5.9-.6z"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5.5 12.5a10 10 0 0 1 13 0"/><path d="M9 16.3a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1"/></svg>',
};

function renderQuickLinks(settings) {
  const items = [];
  if (settings.instagramUrl) {
    items.push(`<a class="quick-link" href="${esc(settings.instagramUrl)}" target="_blank" rel="noopener">
      <span class="quick-link-icon">${ICONS.instagram}</span>
      <span class="quick-link-label">Instagram</span>
    </a>`);
  }
  if (settings.mapsDirectionsUrl) {
    items.push(`<a class="quick-link" href="${esc(settings.mapsDirectionsUrl)}" target="_blank" rel="noopener">
      <span class="quick-link-icon">${ICONS.pin}</span>
      <span class="quick-link-label">Yol Tarifi</span>
    </a>`);
  }
  if (settings.mapsReviewsUrl) {
    items.push(`<a class="quick-link" href="${esc(settings.mapsReviewsUrl)}" target="_blank" rel="noopener">
      <span class="quick-link-icon">${ICONS.star}</span>
      <span class="quick-link-label">Yorumlar</span>
    </a>`);
  }
  if (settings.wifiName) {
    items.push(`<button class="quick-link" type="button" id="wifiBtn">
      <span class="quick-link-icon">${ICONS.wifi}</span>
      <span class="quick-link-label">Wi-Fi</span>
    </button>`);
  }
  if (!items.length) return '';
  return `<section class="quick-links">${items.join('')}</section>`;
}

function renderAllergenList(product) {
  if (!product.allergens || !product.allergens.length) return '';
  const items = product.allergens.map((id) => getAllergen(id)).filter(Boolean);
  if (!items.length) return '';
  return `
    <div class="sheet-allergens">
      <p class="sheet-allergens-label">Alerjenler</p>
      <div class="sheet-allergens-list">
        ${items.map((a) => `<span class="allergen-chip">${a.emoji} ${esc(a.label)}</span>`).join('')}
      </div>
    </div>`;
}

function allergenIconsStrip(product) {
  if (!product.allergens || !product.allergens.length) return '';
  const items = product.allergens.map((id) => getAllergen(id)).filter(Boolean);
  if (!items.length) return '';
  const title = items.map((a) => a.label).join(', ');
  return `<p class="product-allergens" title="${esc(title)}">${items.map((a) => a.emoji).join(' ')}</p>`;
}

function productCard(product, currency) {
  const media = product.image
    ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" />`
    : `<div class="ph">${esc((product.name || '?')[0])}</div>`;
  const badge = product.badge ? `<div class="product-badge">${esc(product.badge)}</div>` : '';
  return `
    <button class="product-card" type="button" data-product-id="${esc(product.id)}">
      ${media}
      ${badge}
      <div class="product-scrim">
        <p class="product-name">${esc(product.name)}</p>
        <p class="product-price">${esc(formatPrice(product.price, currency))}</p>
        ${allergenIconsStrip(product)}
      </div>
    </button>`;
}

function renderCategories(categories, currency) {
  if (!categories || !categories.length) {
    return `<p class="empty-note">Henüz menü eklenmemiş. Admin panelinden kategori ekleyebilirsiniz.</p>`;
  }
  const sorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return sorted.map((cat) => {
    const subs = [...(cat.subcategories || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const productCount = subs.reduce((n, s) => n + (s.products?.length || 0), 0);
    const subsHtml = subs.map((sub) => {
      const products = [...(sub.products || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return `
        <div class="subcategory" data-subcategory>
          <button class="subcategory-bar" type="button" data-toggle-sub>
            <span class="subcategory-name">${esc(sub.name)}</span>
            <span class="subcategory-count">${products.length} ürün</span>
          </button>
          <div class="subcategory-body">
            <div class="subcategory-body-inner">
              <div class="product-grid">
                ${products.length ? products.map((p) => productCard(p, currency)).join('') : `<p class="empty-note">Ürün yok</p>`}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="category" data-category>
        <button class="category-bar" type="button" data-toggle-cat>
          <span class="category-bar-title">
            <span class="category-name">${esc(cat.name)}</span>
          </span>
          <span class="category-bar-title">
            <span class="category-count">${productCount} ürün</span>
            <span class="chevron"></span>
          </span>
        </button>
        <div class="category-body">
          <div class="category-body-inner">
            ${subsHtml || `<p class="empty-note">Alt kategori yok</p>`}
          </div>
        </div>
      </div>`;
  }).join('');
}

function findProduct(data, id) {
  for (const cat of data.categories || []) {
    for (const sub of cat.subcategories || []) {
      const p = (sub.products || []).find((pr) => pr.id === id);
      if (p) return p;
    }
  }
  return null;
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(textarea);
  return ok;
}

function openSheet(overlayEl) {
  overlayEl.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSheet(overlayEl) {
  overlayEl.classList.remove('visible');
  document.body.style.overflow = '';
}

function renderApp(data) {
  const settings = data.settings || {};
  const categories = data.categories || [];
  app.setAttribute('aria-busy', 'false');
  app.innerHTML = `
    ${renderHero(settings)}
    ${renderUtilityBar(settings)}
    ${renderDiscount(settings)}
    <main class="menu-section">
      <p class="menu-heading">Menü</p>
      ${renderCategories(categories, settings.currency)}
    </main>
    ${renderQuickLinks(settings)}
    <footer class="menu-footer">${esc(settings.handle || '')} · dijital menü</footer>

    <div class="sheet-overlay" id="productOverlay">
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-grabber"><span></span></div>
        <div id="productSheetContent"></div>
      </div>
    </div>

    <div class="sheet-overlay" id="infoOverlay">
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-grabber"><span></span></div>
        <div class="info-sheet-body">
          <h2 class="info-sheet-title">Alerjenler</h2>
          <p class="info-sheet-text">${esc(settings.allergensText || 'Bilgi eklenmemiş.')}</p>
        </div>
      </div>
    </div>

    <div class="sheet-overlay" id="wifiOverlay">
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-grabber"><span></span></div>
        <div class="info-sheet-body">
          <h2 class="info-sheet-title">Wi-Fi</h2>
          <div class="wifi-row">
            <div>
              <p class="wifi-label">Ağ Adı</p>
              <p class="wifi-value">${esc(settings.wifiName || '')}</p>
            </div>
            <button class="wifi-copy" type="button" data-copy="${esc(settings.wifiName || '')}" aria-label="Ağ adını kopyala">${ICONS.copy}</button>
          </div>
          ${settings.wifiPassword ? `
          <div class="wifi-row">
            <div>
              <p class="wifi-label">Şifre</p>
              <p class="wifi-value">${esc(settings.wifiPassword)}</p>
            </div>
            <button class="wifi-copy" type="button" data-copy="${esc(settings.wifiPassword)}" aria-label="Şifreyi kopyala">${ICONS.copy}</button>
          </div>` : ''}
          <p class="wifi-hint" id="wifiCopyHint">Kopyalamak için ikona dokunun</p>
        </div>
      </div>
    </div>
  `;

  // accordion: categories
  app.querySelectorAll('[data-toggle-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.closest('[data-category]');
      const wasOpen = cat.classList.contains('open');
      app.querySelectorAll('[data-category]').forEach((c) => c.classList.remove('open'));
      if (!wasOpen) cat.classList.add('open');
    });
  });

  // accordion: subcategories
  app.querySelectorAll('[data-toggle-sub]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sub = btn.closest('[data-subcategory]');
      const wasOpen = sub.classList.contains('open');
      sub.closest('[data-category]').querySelectorAll('[data-subcategory]').forEach((s) => s.classList.remove('open'));
      if (!wasOpen) sub.classList.add('open');
    });
  });

  // product sheet
  const productOverlay = document.getElementById('productOverlay');
  const productSheetContent = document.getElementById('productSheetContent');
  app.querySelectorAll('[data-product-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const product = findProduct(data, card.dataset.productId);
      if (!product) return;
      const media = product.image
        ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" />`
        : `<div class="ph">${esc((product.name || '?')[0])}</div>`;
      const metaBits = [];
      if (product.calories) metaBits.push(`${product.calories} kcal`);
      if (product.badge) metaBits.push(product.badge);
      productSheetContent.innerHTML = `
        <div class="sheet-media">
          ${media}
          <button class="sheet-close" type="button" id="productSheetClose" aria-label="Kapat">✕</button>
        </div>
        <div class="sheet-body">
          <h2 class="sheet-name">${esc(product.name)}</h2>
          ${metaBits.length ? `<p class="sheet-meta">${metaBits.map(esc).join('<span>·</span>')}</p>` : ''}
          ${product.description ? `<p class="sheet-desc">${esc(product.description)}</p>` : ''}
          ${renderAllergenList(product)}
          <hr class="sheet-divider" />
          <p class="sheet-price">${esc(formatPrice(product.price, settings.currency))}</p>
        </div>`;
      document.getElementById('productSheetClose').addEventListener('click', () => closeSheet(productOverlay));
      openSheet(productOverlay);
    });
  });
  productOverlay.addEventListener('click', (e) => { if (e.target === productOverlay) closeSheet(productOverlay); });

  // allergens sheet
  const infoOverlay = document.getElementById('infoOverlay');
  document.getElementById('allergensBtn').addEventListener('click', () => openSheet(infoOverlay));
  infoOverlay.addEventListener('click', (e) => { if (e.target === infoOverlay) closeSheet(infoOverlay); });

  // wifi sheet
  const wifiOverlay = document.getElementById('wifiOverlay');
  document.getElementById('wifiBtn')?.addEventListener('click', () => openSheet(wifiOverlay));
  wifiOverlay.addEventListener('click', (e) => { if (e.target === wifiOverlay) closeSheet(wifiOverlay); });
  wifiOverlay.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.copy;
      const hint = document.getElementById('wifiCopyHint');
      const ok = copyToClipboard(value);
      if (hint) {
        hint.textContent = ok ? 'Kopyalandı ✓' : value;
        setTimeout(() => { hint.textContent = 'Kopyalamak için ikona dokunun'; }, 1800);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(productOverlay); closeSheet(infoOverlay); closeSheet(wifiOverlay); }
  });

  // smooth scroll from hero
  const scrollHint = app.querySelector('.hero-scroll');
  if (scrollHint) {
    scrollHint.style.cursor = 'pointer';
    scrollHint.addEventListener('click', () => {
      app.querySelector('.menu-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function renderEmptyState() {
  app.setAttribute('aria-busy', 'false');
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;text-align:center;">
      <p style="font-family:'IBM Plex Mono',monospace;font-size:0.85rem;color:#9a9488;max-width:360px;line-height:1.6;">
        Menü henüz oluşturulmadı. Admin panelinden giriş yapıp kategori eklemeye başlayın.
      </p>
    </div>`;
}

if (!FIREBASE_CONFIGURED) {
  renderConfigMissing(app);
} else {
  onSnapshot(
    menuDocRef,
    (snap) => {
      if (!snap.exists()) {
        renderEmptyState();
        return;
      }
      renderApp(snap.data());
    },
    (err) => {
      console.error(err);
      app.innerHTML = `<div style="padding:40px;text-align:center;font-family:sans-serif;color:#f4ecdb;">Menü yüklenirken bir hata oluştu.<br><small style="color:#9a9488">${esc(err.message)}</small></div>`;
    }
  );
}
