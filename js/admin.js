import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getDoc,
  setDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';
import { FIREBASE_CONFIGURED, auth, storage, menuDocRef, renderConfigMissing } from './firebase-init.js';
import { ALLERGENS } from './allergens.js';

if (!FIREBASE_CONFIGURED) {
  renderConfigMissing(document.getElementById('configMissing'));
  document.getElementById('loginScreen').classList.add('hidden');
} else {
  initAdmin();
}

function initAdmin() {
  const loginScreen = document.getElementById('loginScreen');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  let menuData = { settings: {}, categories: [] };

  const DEFAULT_SETTINGS = {
    businessName: '',
    handle: '',
    tagline: '',
    logo: null,
    heroVideo: null,
    heroImage: null,
    accentColor: '#d97d3d',
    discountText: '',
    allergensText: '',
    currency: '₺',
    instagramUrl: '',
    mapsDirectionsUrl: '',
    mapsReviewsUrl: '',
    wifiName: '',
    wifiPassword: '',
  };

  function newId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  function buildAllergenPickerHTML(selected = []) {
    return ALLERGENS.map((a) => `
      <label class="allergen-chip-toggle">
        <input type="checkbox" value="${a.id}" ${selected.includes(a.id) ? 'checked' : ''} />
        <span>${a.emoji} ${a.label}</span>
      </label>`).join('');
  }

  function readAllergenPicker(container) {
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  }

  async function uploadFile(file, kind) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `uploads/${kind}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  async function saveSettings() {
    await updateDoc(menuDocRef, { settings: menuData.settings });
  }
  async function saveCategories() {
    await updateDoc(menuDocRef, { categories: menuData.categories });
  }

  // ---------- auth ----------
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      loginScreen.classList.add('hidden');
      adminApp.classList.remove('hidden');
      await loadAll();
    } else {
      loginScreen.classList.remove('hidden');
      adminApp.classList.add('hidden');
    }
  });

  function mapAuthError(code) {
    const map = {
      'auth/invalid-credential': 'E-posta veya şifre hatalı',
      'auth/invalid-email': 'Geçersiz e-posta adresi',
      'auth/user-not-found': 'Kullanıcı bulunamadı',
      'auth/wrong-password': 'Şifre hatalı',
      'auth/too-many-requests': 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin',
    };
    return map[code] || 'Giriş başarısız';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      document.getElementById('loginPassword').value = '';
    } catch (err) {
      loginError.textContent = mapAuthError(err.code);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

  // ---------- tabs ----------
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ---------- data loading ----------
  async function loadAll() {
    const snap = await getDoc(menuDocRef);
    if (!snap.exists()) {
      menuData = { settings: { ...DEFAULT_SETTINGS }, categories: [] };
      await setDoc(menuDocRef, menuData);
    } else {
      const data = snap.data();
      menuData = {
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
        categories: data.categories || [],
      };
    }
    fillSettingsForm(menuData.settings);
    renderCategories();
  }

  // ================= SETTINGS =================
  const settingsForm = document.getElementById('settingsForm');
  const settingsStatus = document.getElementById('settingsStatus');

  function fillSettingsForm(settings) {
    for (const [key, val] of Object.entries(settings)) {
      const el = settingsForm.elements[key];
      if (el) el.value = val ?? (key === 'currency' ? '₺' : '');
    }
    if (!settings.accentColor) settingsForm.elements.accentColor.value = '#d97d3d';

    const logoPreview = document.getElementById('logoPreview');
    if (settings.logo) { logoPreview.src = settings.logo; logoPreview.classList.remove('hidden'); }
    else logoPreview.classList.add('hidden');

    const videoPreview = document.getElementById('videoPreview');
    if (settings.heroVideo) { videoPreview.src = settings.heroVideo; videoPreview.classList.remove('hidden'); }
    else videoPreview.classList.add('hidden');
    document.getElementById('videoUrlInput').value = settings.heroVideo || '';

    const heroImagePreview = document.getElementById('heroImagePreview');
    if (settings.heroImage) { heroImagePreview.src = settings.heroImage; heroImagePreview.classList.remove('hidden'); }
    else heroImagePreview.classList.add('hidden');
  }

  let pendingClears = { logo: false, video: false, heroImage: false };

  document.getElementById('clearLogoBtn').addEventListener('click', () => {
    pendingClears.logo = true;
    document.getElementById('logoPreview').classList.add('hidden');
    document.getElementById('logoInput').value = '';
  });
  document.getElementById('clearVideoBtn').addEventListener('click', () => {
    pendingClears.video = true;
    document.getElementById('videoPreview').classList.add('hidden');
    document.getElementById('videoInput').value = '';
    document.getElementById('videoUrlInput').value = '';
  });
  document.getElementById('clearHeroImageBtn').addEventListener('click', () => {
    pendingClears.heroImage = true;
    document.getElementById('heroImagePreview').classList.add('hidden');
    document.getElementById('heroImageInput').value = '';
  });

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsStatus.textContent = 'Kaydediliyor…';
    try {
      const fd = new FormData(settingsForm);
      const fields = ['businessName', 'handle', 'tagline', 'accentColor', 'discountText', 'allergensText', 'currency', 'instagramUrl', 'mapsDirectionsUrl', 'mapsReviewsUrl', 'wifiName', 'wifiPassword'];
      fields.forEach((f) => { menuData.settings[f] = fd.get(f) ?? ''; });

      const logoFile = document.getElementById('logoInput').files[0];
      const videoFile = document.getElementById('videoInput').files[0];
      const heroImageFile = document.getElementById('heroImageInput').files[0];
      const videoUrl = document.getElementById('videoUrlInput').value.trim();

      const uploads = [];
      if (logoFile) uploads.push(uploadFile(logoFile, 'logo').then((url) => { menuData.settings.logo = url; }));
      if (videoFile) uploads.push(uploadFile(videoFile, 'video').then((url) => { menuData.settings.heroVideo = url; }));
      else if (videoUrl) menuData.settings.heroVideo = videoUrl;
      if (heroImageFile) uploads.push(uploadFile(heroImageFile, 'hero').then((url) => { menuData.settings.heroImage = url; }));
      await Promise.all(uploads);

      if (pendingClears.logo) menuData.settings.logo = null;
      if (pendingClears.video) menuData.settings.heroVideo = null;
      if (pendingClears.heroImage) menuData.settings.heroImage = null;

      await saveSettings();
      fillSettingsForm(menuData.settings);
      pendingClears = { logo: false, video: false, heroImage: false };
      settingsStatus.textContent = 'Kaydedildi ✓';
    } catch (err) {
      console.error(err);
      settingsStatus.textContent = 'Hata: ' + err.message;
    }
    setTimeout(() => (settingsStatus.textContent = ''), 3000);
  });

  const passwordForm = document.getElementById('passwordForm');
  const passwordStatus = document.getElementById('passwordStatus');
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(passwordForm);
    const currentPassword = fd.get('currentPassword');
    const newPassword = fd.get('newPassword');
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      passwordStatus.textContent = 'Şifre güncellendi ✓';
      passwordForm.reset();
    } catch (err) {
      passwordStatus.textContent = mapAuthError(err.code) || 'Hata oluştu';
    }
    setTimeout(() => (passwordStatus.textContent = ''), 3000);
  });

  // ================= MENU MANAGEMENT =================
  const categoryList = document.getElementById('categoryList');
  const emptyMenuNote = document.getElementById('emptyMenuNote');
  const tplCategory = document.getElementById('tpl-category');
  const tplSubcategory = document.getElementById('tpl-subcategory');
  const tplProductRow = document.getElementById('tpl-product-row');
  const tplPhotoRow = document.getElementById('tpl-photo-row');
  const BLANK_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const photoLinksTable = document.getElementById('photoLinksTable');
  const emptyPhotosNote = document.getElementById('emptyPhotosNote');
  const photosStatus = document.getElementById('photosStatus');

  document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newCategoryName');
    const name = input.value.trim();
    if (!name) return;
    const maxOrder = menuData.categories.reduce((m, c) => Math.max(m, c.sortOrder || 0), 0);
    menuData.categories.push({ id: newId('cat'), name, sortOrder: maxOrder + 1, subcategories: [] });
    await saveCategories();
    input.value = '';
    renderCategories();
  });

  document.getElementById('seedBtn')?.addEventListener('click', async () => {
    menuData.categories = buildSeedCategories();
    if (!menuData.settings.businessName) {
      Object.assign(menuData.settings, {
        businessName: 'Kadıköy Sokak Barı',
        handle: '@kadikoysokakbari',
        tagline: 'Ateş, İçki ve İyi Sohbet',
        discountText: "Hafta içi 17:00'a kadar tüm menüde %20 indirim geçerlidir.",
        allergensText: 'Ürünlerimiz gluten, süt ürünleri, yumurta, fındık/fıstık ve kabuklu deniz ürünleri içerebilir. Alerjiniz varsa lütfen personelimize bildirin.',
      });
      fillSettingsForm(menuData.settings);
      await saveSettings();
    }
    await saveCategories();
    renderCategories();
  });

  function renderCategories() {
    categoryList.innerHTML = '';
    const cats = [...(menuData.categories || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    cats.forEach((cat) => categoryList.appendChild(buildCategoryCard(cat)));
    emptyMenuNote.classList.toggle('hidden', cats.length > 0);
    renderPhotoLinks();
  }

  function buildCategoryCard(cat) {
    const node = tplCategory.content.firstElementChild.cloneNode(true);
    node.dataset.id = cat.id;
    node.querySelector('.cat-name-input').value = cat.name;

    const subList = node.querySelector('[data-subcategory-list]');
    const subs = [...(cat.subcategories || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    subs.forEach((sub) => subList.appendChild(buildSubcategoryCard(cat, sub)));

    node.querySelector('[data-action="toggle-category"]').addEventListener('click', () => {
      node.classList.toggle('open');
    });

    node.querySelector('[data-action="save-category"]').addEventListener('click', async () => {
      const name = node.querySelector('.cat-name-input').value.trim();
      if (!name) return;
      cat.name = name;
      await saveCategories();
    });

    node.querySelector('[data-action="delete-category"]').addEventListener('click', async () => {
      if (!confirm(`"${cat.name}" kategorisini ve içindeki tüm ürünleri silmek istediğinize emin misiniz?`)) return;
      menuData.categories = menuData.categories.filter((c) => c.id !== cat.id);
      await saveCategories();
      renderCategories();
    });

    node.querySelector('[data-add-subcategory]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const name = input.value.trim();
      if (!name) return;
      const maxOrder = cat.subcategories.reduce((m, s) => Math.max(m, s.sortOrder || 0), 0);
      cat.subcategories.push({ id: newId('sub'), name, sortOrder: maxOrder + 1, products: [] });
      await saveCategories();
      renderCategories();
      const refreshed = categoryList.querySelector(`[data-category][data-id="${cat.id}"]`);
      if (refreshed) refreshed.classList.add('open');
    });

    return node;
  }

  function buildSubcategoryCard(cat, sub) {
    const node = tplSubcategory.content.firstElementChild.cloneNode(true);
    node.dataset.id = sub.id;
    node.querySelector('.sub-name-input').value = sub.name;

    const productList = node.querySelector('[data-product-list]');
    const products = [...(sub.products || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    products.forEach((p) => productList.appendChild(buildProductRow(cat, sub, p)));

    node.querySelector('[data-action="toggle-subcategory"]').addEventListener('click', () => {
      node.classList.toggle('open');
    });

    node.querySelector('[data-action="save-subcategory"]').addEventListener('click', async () => {
      const name = node.querySelector('.sub-name-input').value.trim();
      if (!name) return;
      sub.name = name;
      await saveCategories();
    });

    node.querySelector('[data-action="delete-subcategory"]').addEventListener('click', async () => {
      if (!confirm(`"${sub.name}" alt kategorisini ve içindeki ürünleri silmek istediğinize emin misiniz?`)) return;
      cat.subcategories = cat.subcategories.filter((s) => s.id !== sub.id);
      await saveCategories();
      renderCategories();
    });

    const addForm = node.querySelector('[data-add-product]');
    const addAllergenPicker = addForm.querySelector('[data-allergen-picker]');
    addAllergenPicker.innerHTML = buildAllergenPickerHTML();
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      const name = fd.get('name')?.toString().trim();
      const price = Number(fd.get('price'));
      if (!name || !price) return;
      try {
        const file = addForm.querySelector('input[type="file"]').files[0];
        const imageUrl = fd.get('imageUrl')?.toString().trim();
        const image = file ? await uploadFile(file, 'product') : (imageUrl || null);
        const maxOrder = sub.products.reduce((m, p) => Math.max(m, p.sortOrder || 0), 0);
        sub.products.push({
          id: newId('p'),
          name,
          description: fd.get('description') || '',
          price,
          calories: fd.get('calories') ? Number(fd.get('calories')) : null,
          image,
          badge: fd.get('badge') || '',
          allergens: readAllergenPicker(addAllergenPicker),
          sortOrder: maxOrder + 1,
        });
        await saveCategories();
        addForm.reset();
        renderCategories();
        reopenCategoryAndSub(cat.id, sub.id);
      } catch (err) {
        console.error(err);
        alert('Ürün eklenemedi: ' + err.message);
      }
    });

    return node;
  }

  function reopenCategoryAndSub(catId, subId) {
    const refreshedCat = categoryList.querySelector(`[data-category][data-id="${catId}"]`);
    if (refreshedCat) {
      refreshedCat.classList.add('open');
      const refreshedSub = refreshedCat.querySelector(`[data-subcategory][data-id="${subId}"]`);
      if (refreshedSub) refreshedSub.classList.add('open');
    }
  }

  function buildProductRow(cat, sub, product) {
    const node = tplProductRow.content.firstElementChild.cloneNode(true);
    node.dataset.id = product.id;
    const img = node.querySelector('.product-row-img');
    if (product.image) img.src = product.image; else img.style.background = '#232a37';
    node.querySelector('.p-name').value = product.name;
    node.querySelector('.p-price').value = product.price;
    node.querySelector('.p-calories').value = product.calories ?? '';
    node.querySelector('.p-badge').value = product.badge || '';
    node.querySelector('.p-desc').value = product.description || '';
    node.querySelector('.p-image-url').value = product.image || '';
    const rowAllergenPicker = node.querySelector('[data-allergen-picker]');
    rowAllergenPicker.innerHTML = buildAllergenPickerHTML(product.allergens || []);

    node.querySelector('[data-action="save-product"]').addEventListener('click', async () => {
      try {
        product.name = node.querySelector('.p-name').value.trim();
        product.price = Number(node.querySelector('.p-price').value) || 0;
        const calVal = node.querySelector('.p-calories').value;
        product.calories = calVal ? Number(calVal) : null;
        product.badge = node.querySelector('.p-badge').value;
        product.description = node.querySelector('.p-desc').value;
        product.allergens = readAllergenPicker(rowAllergenPicker);

        const imageFile = node.querySelector('.p-image').files[0];
        const imageUrl = node.querySelector('.p-image-url').value.trim();
        if (imageFile) product.image = await uploadFile(imageFile, 'product');
        else product.image = imageUrl || null;
        if (node.querySelector('.p-clear-image').checked) product.image = null;

        await saveCategories();
        renderCategories();
        reopenCategoryAndSub(cat.id, sub.id);
      } catch (err) {
        console.error(err);
        alert('Kaydedilemedi: ' + err.message);
      }
    });

    node.querySelector('[data-action="delete-product"]').addEventListener('click', async () => {
      if (!confirm(`"${product.name}" ürününü silmek istediğinize emin misiniz?`)) return;
      sub.products = sub.products.filter((p) => p.id !== product.id);
      await saveCategories();
      renderCategories();
      reopenCategoryAndSub(cat.id, sub.id);
    });

    return node;
  }

  // ================= PHOTO LINKS TAB =================
  function flattenProducts() {
    const rows = [];
    for (const cat of menuData.categories || []) {
      for (const sub of cat.subcategories || []) {
        for (const product of sub.products || []) {
          rows.push({ cat, sub, product });
        }
      }
    }
    return rows;
  }

  function renderPhotoLinks() {
    if (!photoLinksTable) return;
    photoLinksTable.innerHTML = '';
    const rows = flattenProducts();
    rows.forEach(({ cat, sub, product }) => {
      const node = tplPhotoRow.content.firstElementChild.cloneNode(true);
      node.dataset.productId = product.id;
      const thumb = node.querySelector('.photo-row-thumb');
      const input = node.querySelector('.photo-row-input');
      node.querySelector('.photo-row-path').textContent = `${cat.name} › ${sub.name}`;
      node.querySelector('.photo-row-name').textContent = product.name;
      input.value = product.image || '';
      thumb.src = product.image || BLANK_PIXEL;
      thumb.style.background = '#232a37';
      input.addEventListener('input', () => {
        thumb.src = input.value.trim() || BLANK_PIXEL;
        thumb.onerror = () => { thumb.src = BLANK_PIXEL; };
      });
      photoLinksTable.appendChild(node);
    });
    emptyPhotosNote.classList.toggle('hidden', rows.length > 0);
    photoLinksTable.classList.toggle('hidden', rows.length === 0);
  }

  document.getElementById('savePhotosBtn')?.addEventListener('click', async () => {
    photosStatus.textContent = 'Kaydediliyor…';
    try {
      const rows = flattenProducts();
      photoLinksTable.querySelectorAll('[data-photo-row]').forEach((node) => {
        const id = node.dataset.productId;
        const value = node.querySelector('.photo-row-input').value.trim();
        const match = rows.find((r) => r.product.id === id);
        if (match) match.product.image = value || null;
      });
      await saveCategories();
      renderCategories();
      photosStatus.textContent = 'Kaydedildi ✓';
    } catch (err) {
      console.error(err);
      photosStatus.textContent = 'Hata: ' + err.message;
    }
    setTimeout(() => (photosStatus.textContent = ''), 3000);
  });

  function buildSeedCategories() {
    return [
      { id: newId('cat'), name: 'Kokteyl', sortOrder: 1, subcategories: [
        { id: newId('sub'), name: 'İmza Kokteyl', sortOrder: 1, products: [
          { id: newId('p'), name: 'Kor Ateşi', description: 'Mezcal, ateş eriği likörü, taze limon, tütsülenmiş biber şurubu', price: 480, calories: 210, image: null, badge: '⭐', sortOrder: 1 },
          { id: newId('p'), name: 'Nane Sisi', description: 'Votka, taze nane, elderflower, tonik köpüğü', price: 450, calories: 180, image: null, badge: '🌿', sortOrder: 2 },
        ] },
        { id: newId('sub'), name: 'Klasik Kokteyl', sortOrder: 2, products: [
          { id: newId('p'), name: 'Old Fashioned', description: 'Bourbon, şeker küpü, angostura bitters, portakal kabuğu', price: 420, calories: 200, image: null, badge: '', sortOrder: 1 },
          { id: newId('p'), name: 'Negroni', description: 'Cin, kırmızı vermut, campari', price: 420, calories: 190, image: null, badge: '', sortOrder: 2 },
        ] },
      ] },
      { id: newId('cat'), name: 'Bira', sortOrder: 2, subcategories: [
        { id: newId('sub'), name: 'Fıçı Bira', sortOrder: 1, products: [
          { id: newId('p'), name: 'Pale Ale (Fıçı)', description: 'Yerli üretim, 330 ml', price: 260, calories: 180, image: null, badge: '', sortOrder: 1 },
        ] },
        { id: newId('sub'), name: 'Şişe Bira', sortOrder: 2, products: [
          { id: newId('p'), name: 'Weissbier', description: 'Buğday birası, 500 ml', price: 280, calories: 220, image: null, badge: '', sortOrder: 1 },
        ] },
      ] },
      { id: newId('cat'), name: 'Şarap', sortOrder: 3, subcategories: [
        { id: newId('sub'), name: 'Kırmızı Şarap', sortOrder: 1, products: [
          { id: newId('p'), name: 'Öküzgözü (Kadeh)', description: 'Elazığ, 150 ml', price: 320, calories: 125, image: null, badge: '', sortOrder: 1 },
        ] },
        { id: newId('sub'), name: 'Beyaz Şarap', sortOrder: 2, products: [
          { id: newId('p'), name: 'Narince (Kadeh)', description: 'Tokat, 150 ml', price: 300, calories: 120, image: null, badge: '', sortOrder: 1 },
        ] },
      ] },
      { id: newId('cat'), name: 'Yemekler', sortOrder: 4, subcategories: [
        { id: newId('sub'), name: 'Başlangıçlar', sortOrder: 1, products: [
          { id: newId('p'), name: 'Közlenmiş Patlıcan Ezmesi', description: 'Közlenmiş patlıcan, yoğurt, sarımsak, nar ekşisi', price: 190, calories: 240, image: null, badge: '🌿', sortOrder: 1 },
        ] },
        { id: newId('sub'), name: 'Ana Yemekler', sortOrder: 2, products: [
          { id: newId('p'), name: 'Izgara Köfte', description: 'El yapımı köfte, közlenmiş biber, patates', price: 380, calories: 620, image: null, badge: '', sortOrder: 1 },
        ] },
      ] },
      { id: newId('cat'), name: 'Tatlılar', sortOrder: 5, subcategories: [
        { id: newId('sub'), name: 'Tatlılar', sortOrder: 1, products: [
          { id: newId('p'), name: 'Çikolatalı Sufle', description: 'Sıcak servis, vanilyalı dondurma ile', price: 220, calories: 480, image: null, badge: '⭐', sortOrder: 1 },
        ] },
      ] },
    ];
  }
}
