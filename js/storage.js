/**
 * storage.js
 * -----------------------------------------------------------------------
 * Tüm veri okuma/yazma işlemlerinin tek geçiş noktası (Data Access Layer).
 * Firestore üzerinde çalışır: `init()` sırasında tüm koleksiyonlar bellek
 * içi `cache`'e çekilir; okuma fonksiyonları (getPages/getBlogPosts/...)
 * senkron olarak bu cache'ten okur, yazma fonksiyonları (addBlogPost/...)
 * önce cache'i güncelleyip arayüzü anında yansıtır, ardından Firestore'a
 * arka planda yazar. Böylece admin.js/app.js/blog.js/gallery.js içindeki
 * hiçbir çağrı noktası değişmeden çalışmaya devam eder.
 *
 * Firestore'a hiç ulaşılamazsa (offline, henüz kurulmamış proje vb.) ya da
 * doküman/koleksiyon boşsa aşağıdaki *_FALLBACK sabitleri devreye girer.
 * Doküman boşsa ve giriş yapan admin ise bu yedek veri Firestore'a tek
 * seferlik "seed" olarak yazılır.
 */
(function (global) {
  'use strict';

  const ACTIVITY_KEY = 'app_activity_log';

  /* ---------------------------------------------------------------------
   * Varsayılan (seed) veriler - data/*.json dosyalarıyla birebir aynıdır.
   * ------------------------------------------------------------------- */
  const PAGES_FALLBACK = {
    site: {
      title: 'Erhan Kenar | Front-End Developer & UI/UX Designer',
      logoText: 'EK.',
      favicon: 'assets/icons/favicon.svg',
      themeMode: 'auto',
      accentColor: '#7c5cff',
      font: 'Inter',
      animationSpeed: 'normal',
      backgroundStyle: 'blobs'
    },
    navbar: {
      menu: [
        { id: 'm1', label: 'Anasayfa', target: '#home', order: 1 },
        { id: 'm2', label: 'Hakkımda', target: '#about', order: 2 },
        { id: 'm3', label: 'Projelerim', target: '#projects', order: 3 },
        { id: 'm4', label: 'Blog', target: '#blog', order: 4 },
        { id: 'm5', label: 'Galeri', target: '#gallery', order: 5 },
        { id: 'm6', label: 'Hizmetler', target: '#services', order: 6 },
        { id: 'm7', label: 'İletişim', target: '#contact', order: 7 }
      ]
    },
    hero: {
      greeting: 'Merhaba, ben',
      name: 'Erhan Kenar',
      title: 'Front-End Developer & UI/UX Designer',
      description: 'Modern, performanslı ve etkileyici dijital deneyimler tasarlıyor, hayata geçiriyorum. Detaylara önem veren, kullanıcı odaklı bir yaklaşımla çalışıyorum.',
      cvUrl: 'assets/files/cv.pdf',
      avatar: 'assets/images/avatar-hero.svg',
      buttons: { cv: 'CV İndir', contact: 'İletişime Geç', portfolio: 'Projeleri İncele' }
    },
    about: {
      heading: 'Hakkımda',
      bio: '5+ yıllık deneyime sahip bir front-end geliştirici ve UI/UX tasarımcısıyım. Kullanıcı deneyimini merkeze alan, performanstan ödün vermeyen arayüzler tasarlıyorum. Kariyerim boyunca kurumsal projelerden startup ürünlerine kadar geniş bir yelpazede çalıştım.',
      experiences: [
        { role: 'Kıdemli Front-End Developer', company: 'Nova Digital', period: '2023 - Günümüz' },
        { role: 'UI/UX Tasarımcı', company: 'Pixelworks Studio', period: '2021 - 2023' },
        { role: 'Front-End Developer', company: 'Freelance', period: '2019 - 2021' }
      ],
      hobbies: ['Fotoğrafçılık', 'Satranç', 'Motosiklet', 'Uzun Yürüyüşler'],
      interests: ['Minimal Tasarım', 'Yapay Zeka', 'Tipografi', 'Açık Kaynak'],
      skills: [
        { name: 'HTML / CSS', level: 98 },
        { name: 'JavaScript (ES6+)', level: 95 },
        { name: 'UI/UX Tasarım', level: 90 },
        { name: 'Performans Optimizasyonu', level: 88 },
        { name: 'Animasyon & Motion', level: 85 }
      ],
      stats: [
        { label: 'Tamamlanan Proje', value: 120 },
        { label: 'Mutlu Müşteri', value: 80 },
        { label: 'Yıllık Deneyim', value: 5 },
        { label: 'Fincan Kahve', value: 1500 }
      ]
    },
    projects: [
      { id: 'p1', title: 'Finexa Banka Paneli', category: 'Web Uygulaması', image: 'assets/images/portfolio-1.svg', description: 'Kurumsal bankacılık paneli için kapsamlı arayüz tasarımı ve geliştirmesi.', link: '#', githubLink: 'https://github.com/', tech: ['React', 'TypeScript', 'Node.js'], features: ['Gerçek zamanlı bakiye takibi', 'Rol bazlı yetkilendirme', 'Çoklu dil desteği'] },
      { id: 'p2', title: 'Loop Müzik Platformu', category: 'UI/UX', image: 'assets/images/portfolio-2.svg', description: 'Müzik akış platformu için kullanıcı deneyimi tasarımı.', link: '#', githubLink: 'https://github.com/', tech: ['Figma', 'Vue.js', 'Tailwind CSS'], features: ['Kişiselleştirilmiş çalma listeleri', 'Karanlık mod', 'Sürükle-bırak playlist düzenleme'] },
      { id: 'p3', title: 'Orbit E-ticaret', category: 'E-ticaret', image: 'assets/images/portfolio-3.svg', description: 'Yüksek dönüşüm odaklı e-ticaret arayüzü.', link: '#', githubLink: 'https://github.com/', tech: ['Next.js', 'Stripe', 'PostgreSQL'], features: ['Tek sayfa ödeme akışı', 'Ürün karşılaştırma', 'Stok bazlı öneri motoru'] },
      { id: 'p4', title: 'Nimbus Hava Durumu', category: 'Mobil Uygulama', image: 'assets/images/portfolio-4.svg', description: 'Minimal ve akıcı bir hava durumu uygulaması tasarımı.', link: '#', githubLink: 'https://github.com/', tech: ['React Native', 'OpenWeather API'], features: ['Saatlik ve haftalık tahmin', 'Konum bazlı bildirimler', 'Offline önbellekleme'] },
      { id: 'p5', title: 'Vantage Analitik', category: 'Web Uygulaması', image: 'assets/images/portfolio-5.svg', description: 'Veri odaklı analitik dashboard tasarımı ve geliştirmesi.', link: '#', githubLink: 'https://github.com/', tech: ['React', 'D3.js', 'Express'], features: ["Özelleştirilebilir grafik widget'ları", 'PDF/Excel dışa aktarma', 'Rol bazlı raporlama'] },
      { id: 'p6', title: 'Aurora Marka Kimliği', category: 'Tasarım', image: 'assets/images/portfolio-6.svg', description: 'Uçtan uca marka kimliği ve dijital varlık tasarımı.', link: '#', githubLink: 'https://github.com/', tech: ['Illustrator', 'Figma', 'After Effects'], features: ['Logo & tipografi sistemi', 'Marka kılavuzu', 'Sosyal medya şablonları'] }
    ],
    testimonials: [
      { id: 't1', name: 'Selin Kaya', role: 'Ürün Müdürü, Nova Digital', avatar: 'assets/images/client-1.svg', rating: 5, message: 'Erhan ile çalışmak proje sürecimizi tamamen değiştirdi. Detaylara gösterdiği özen inanılmaz.' },
      { id: 't2', name: 'Burak Aksoy', role: 'Kurucu, Pixelworks', avatar: 'assets/images/client-2.svg', rating: 5, message: 'Hem tasarım hem geliştirme tarafında gösterdiği performans beklentilerimizin üzerindeydi.' },
      { id: 't3', name: 'Elif Şahin', role: 'Pazarlama Direktörü, Orbit', avatar: 'assets/images/client-3.svg', rating: 4, message: 'Zamanında teslimat ve yüksek kalite bir arada. Kesinlikle tekrar çalışırız.' }
    ],
    clients: [
      { id: 'c1', name: 'Nova Digital', logo: 'assets/images/logo-1.svg' },
      { id: 'c2', name: 'Pixelworks', logo: 'assets/images/logo-2.svg' },
      { id: 'c3', name: 'Orbit', logo: 'assets/images/logo-3.svg' },
      { id: 'c4', name: 'Finexa', logo: 'assets/images/logo-4.svg' },
      { id: 'c5', name: 'Vantage', logo: 'assets/images/logo-5.svg' },
      { id: 'c6', name: 'Aurora', logo: 'assets/images/logo-6.svg' }
    ],
    services: [
      { id: 's1', icon: 'layout', title: 'UI/UX Tasarım', description: 'Kullanıcı odaklı, estetik ve işlevsel arayüz tasarımları.' },
      { id: 's2', icon: 'code', title: 'Front-End Geliştirme', description: 'Modern, performanslı ve erişilebilir web uygulamaları geliştirme.' },
      { id: 's3', icon: 'layers', title: 'Marka Kimliği', description: 'Logo, renk paleti ve tipografi ile bütünsel marka kimliği oluşturma.' },
      { id: 's4', icon: 'zap', title: 'Performans Optimizasyonu', description: 'Hızlı yüklenen, SEO dostu ve ölçeklenebilir web siteleri.' }
    ],
    faq: [
      { id: 'f1', question: 'Proje süreciniz nasıl işliyor?', answer: 'Keşif görüşmesi, wireframe, tasarım, geliştirme ve test aşamalarından oluşan şeffaf bir süreç izliyorum.' },
      { id: 'f2', question: 'Ortalama teslim süreniz nedir?', answer: 'Proje kapsamına bağlı olarak 2-6 hafta arasında değişmektedir.' },
      { id: 'f3', question: 'Revizyon hakkı sunuyor musunuz?', answer: 'Her proje paketinde belirli sayıda revizyon hakkı standart olarak sunulmaktadır.' },
      { id: 'f4', question: 'Uzaktan çalışıyor musunuz?', answer: 'Evet, dünyanın her yerinden müşterilerle uzaktan çalışabiliyorum.' }
    ],
    contact: {
      email: 'erhankenar35@gmail.com',
      phone: '+90 555 123 45 67',
      address: 'İstanbul, Türkiye',
      mapEmbed: 'https://www.google.com/maps',
      social: {
        instagram: 'https://instagram.com/',
        linkedin: 'https://linkedin.com/',
        github: 'https://github.com/',
        youtube: 'https://youtube.com/',
        x: 'https://x.com/',
        facebook: 'https://facebook.com/',
        tiktok: 'https://tiktok.com/'
      }
    },
    footer: {
      text: 'Modern dijital deneyimler tasarlıyor ve geliştiriyorum.',
      copyright: '© 2026 Erhan Kenar. Tüm hakları saklıdır.'
    },
    seo: {
      siteTitle: 'Erhan Kenar | Front-End Developer & UI/UX Designer',
      metaDescription: 'Modern, performanslı ve premium web deneyimleri tasarlayan front-end developer ve UI/UX tasarımcısı.',
      keywords: 'front-end developer, ui ux tasarımcı, web tasarım, portföy',
      ogTitle: 'Erhan Kenar | Portföy',
      ogDescription: 'Modern ve premium web deneyimleri.',
      ogImage: 'assets/images/og-cover.svg',
      robots: 'User-agent: *\nAllow: /',
      sitemap: 'https://example.com/sitemap.xml'
    }
  };

  const BLOG_FALLBACK = [
    { id: 'post-1', title: 'Modern Web Tasarımında Glassmorphism Kullanımı', slug: 'modern-web-tasariminda-glassmorphism', excerpt: 'Cam efektli arayüzler neden bu kadar popüler? Glassmorphism\'in doğru kullanımı ve dikkat edilmesi gereken noktalar.', content: '<p>Glassmorphism, bulanıklık (blur), saydamlık ve ince kenarlıkların bir araya gelmesiyle oluşan modern bir tasarım dilidir. Doğru kullanıldığında arayüze derinlik ve premium bir his katar.</p><h3>Neden Kullanılır?</h3><p>Kullanıcının odağını dağıtmadan katmanlı bir hiyerarşi oluşturmak, özellikle dashboard ve landing page tasarımlarında oldukça etkilidir.</p>', coverImage: 'assets/images/blog-1.svg', category: 'Tasarım', tags: ['UI/UX', 'CSS', 'Trend'], author: 'Erhan Kenar', authorAvatar: 'assets/images/avatar.svg', date: '2026-05-12', readingTime: 6, status: 'published', featured: true, views: 1240, comments: [{ name: 'Ayşe Yılmaz', date: '2026-05-13', message: 'Harika bir özet olmuş, teşekkürler!' }], seoTitle: 'Glassmorphism Nedir?', seoDescription: 'Glassmorphism tasarım dili rehberi.' },
    { id: 'post-2', title: 'Vanilla JavaScript ile Performanslı Animasyonlar', slug: 'vanilla-js-performansli-animasyonlar', excerpt: 'Framework kullanmadan requestAnimationFrame ve CSS transform ile akıcı animasyonlar nasıl üretilir?', content: '<p>Performanslı animasyonların sırrı, tarayıcının layout ve paint aşamalarını tetiklememektir.</p><h3>requestAnimationFrame Kullanımı</h3><p>Zamanlayıcı tabanlı animasyonlar yerine requestAnimationFrame kullanmak daha pürüzsüz bir deneyim sağlar.</p>', coverImage: 'assets/images/blog-2.svg', category: 'Geliştirme', tags: ['JavaScript', 'Performans'], author: 'Erhan Kenar', authorAvatar: 'assets/images/avatar.svg', date: '2026-04-28', readingTime: 8, status: 'published', featured: true, views: 980, comments: [], seoTitle: 'Vanilla JS Animasyon Rehberi', seoDescription: 'Performanslı animasyon oluşturma.' },
    { id: 'post-3', title: 'Kişisel Portföy Sitesi İçin 10 Tasarım İpucu', slug: 'kisisel-portfoy-sitesi-tasarim-ipuclari', excerpt: 'İşe alım uzmanlarının dikkatini çeken portföy siteleri hangi ortak özelliklere sahip?', content: '<p>Güçlü bir portföy sitesi; net bir mesaj, hızlı yükleme süresi ve güçlü görsel hiyerarşi ile öne çıkar.</p>', coverImage: 'assets/images/blog-3.svg', category: 'Kariyer', tags: ['Portföy', 'Kariyer'], author: 'Erhan Kenar', authorAvatar: 'assets/images/avatar.svg', date: '2026-03-15', readingTime: 5, status: 'published', featured: false, views: 640, comments: [], seoTitle: 'Portföy Tasarım İpuçları', seoDescription: '10 pratik ipucu.' },
    { id: 'post-4', title: 'CMS Mimarisi: Statik Siteden Yönetilebilir Panele', slug: 'cms-mimarisi-statik-siteden-yonetilebilir-panele', excerpt: 'Firestore tabanlı bir yapıdan gerçek bir backend\'e geçiş yaparken dikkat edilmesi gerekenler.', content: '<p>Modüler bir veri katmanı tasarlamak, ileride API entegrasyonunu kolaylaştırır.</p>', coverImage: 'assets/images/blog-4.svg', category: 'Geliştirme', tags: ['CMS', 'Mimari'], author: 'Erhan Kenar', authorAvatar: 'assets/images/avatar.svg', date: '2026-02-02', readingTime: 7, status: 'draft', featured: false, views: 120, comments: [], seoTitle: 'CMS Mimarisi Rehberi', seoDescription: 'Yönetilebilir CMS mimarisi.' }
  ];

  const GALLERY_FALLBACK = [
    { id: 'g1', type: 'image', src: 'assets/images/gallery-1.svg', thumb: 'assets/images/gallery-1.svg', title: 'Marka Kimliği Çalışması', category: 'Tasarım' },
    { id: 'g2', type: 'image', src: 'assets/images/gallery-2.svg', thumb: 'assets/images/gallery-2.svg', title: 'Mobil Uygulama Arayüzü', category: 'UI/UX' },
    { id: 'g3', type: 'video', src: 'assets/videos/demo-1.mp4', thumb: 'assets/images/gallery-3.svg', title: 'Ürün Tanıtım Videosu', category: 'Video' },
    { id: 'g4', type: 'image', src: 'assets/images/gallery-4.svg', thumb: 'assets/images/gallery-4.svg', title: 'Dashboard Konsepti', category: 'UI/UX' },
    { id: 'g5', type: 'image', src: 'assets/images/gallery-5.svg', thumb: 'assets/images/gallery-5.svg', title: 'Etkinlik Fotoğrafları', category: 'Fotoğraf' },
    { id: 'g6', type: 'image', src: 'assets/images/gallery-6.svg', thumb: 'assets/images/gallery-6.svg', title: 'E-ticaret Arayüzü', category: 'UI/UX' },
    { id: 'g7', type: 'image', src: 'assets/images/gallery-7.svg', thumb: 'assets/images/gallery-7.svg', title: 'İllüstrasyon Serisi', category: 'Tasarım' },
    { id: 'g8', type: 'video', src: 'assets/videos/demo-2.mp4', thumb: 'assets/images/gallery-8.svg', title: 'Motion Design Örneği', category: 'Video' },
    { id: 'g9', type: 'image', src: 'assets/images/gallery-9.svg', thumb: 'assets/images/gallery-9.svg', title: 'Ofis Çekimi', category: 'Fotoğraf' }
  ];

  /* ---------------------------------------------------------------------
   * Bellek içi cache — okuma fonksiyonları buradan senkron okur.
   * ------------------------------------------------------------------- */
  const cache = { pages: null, blog: [], gallery: [] };

  function generateId(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  }

  function notifyWriteError(err) {
    // Ziyaretçileri (girişsiz kullanıcıları) korkutmamak için sadece konsola yazılır;
    // Firestore kuralları gereği girişsiz yazma denemeleri zaten normalde reddedilir
    // (örn. herkese açık blog görüntülenme sayacı) - bu beklenen bir durumdur.
    console.error('[Storage] Firestore yazma hatası:', err);
  }

  /* ---------------------------------------------------------------------
   * Aktivite akışı — kasıtlı olarak Firestore'a taşınmadı, tarayıcı-lokal
   * kalır (bildirim zili sadece o an panelde olan admin için bir kolaylık).
   * ------------------------------------------------------------------- */
  function readActivity() {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function writeActivity(log) {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log));
    } catch (err) {
      console.warn('[Storage] aktivite yazılamadı:', err);
    }
  }

  function logActivity(message, type = 'info') {
    const log = readActivity();
    log.unshift({ id: generateId('act'), type, message, date: new Date().toISOString() });
    const trimmed = log.slice(0, 50);
    writeActivity(trimmed);
    return trimmed;
  }

  /* ---------------------------------------------------------------------
   * Eski localStorage kayıtlarını yeni şemaya taşır (örn. portfolio -> projects).
   * ------------------------------------------------------------------- */
  function migratePages(pages) {
    if (!pages) return pages;
    if (!Array.isArray(pages.projects)) {
      pages.projects = Array.isArray(pages.portfolio) ? pages.portfolio : PAGES_FALLBACK.projects;
    }
    if (pages.navbar && Array.isArray(pages.navbar.menu)) {
      pages.navbar.menu.forEach((item) => {
        if (item.target === '#portfolio') item.target = '#projects';
        if (item.label === 'Portföy') item.label = 'Projelerim';
      });
    }
    return pages;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* ---------------------------------------------------------------------
   * Firestore'dan ilk yükleme + (gerekirse) tek seferlik seed
   * ------------------------------------------------------------------- */
  async function loadPages(db, canSeed) {
    try {
      const snap = await db.collection('pages').doc('main').get();
      if (snap.exists) {
        cache.pages = migratePages(snap.data());
      } else {
        cache.pages = migratePages(clone(PAGES_FALLBACK));
        if (canSeed) db.collection('pages').doc('main').set(cache.pages).catch(notifyWriteError);
      }
    } catch (err) {
      console.warn('[Storage] pages okunamadı, yedek veri kullanılıyor:', err);
      cache.pages = migratePages(clone(PAGES_FALLBACK));
    }
  }

  async function loadBlog(db, canSeed) {
    try {
      const snap = await db.collection('blog').get();
      if (!snap.empty) {
        cache.blog = snap.docs.map((d) => d.data());
      } else {
        cache.blog = clone(BLOG_FALLBACK);
        if (canSeed) {
          const batch = db.batch();
          cache.blog.forEach((post) => batch.set(db.collection('blog').doc(post.id), post));
          batch.commit().catch(notifyWriteError);
        }
      }
    } catch (err) {
      console.warn('[Storage] blog okunamadı, yedek veri kullanılıyor:', err);
      cache.blog = clone(BLOG_FALLBACK);
    }
  }

  async function loadGallery(db, canSeed) {
    try {
      const snap = await db.collection('gallery').get();
      if (!snap.empty) {
        cache.gallery = snap.docs.map((d) => d.data());
      } else {
        cache.gallery = clone(GALLERY_FALLBACK);
        if (canSeed) {
          const batch = db.batch();
          cache.gallery.forEach((item) => batch.set(db.collection('gallery').doc(item.id), item));
          batch.commit().catch(notifyWriteError);
        }
      }
    } catch (err) {
      console.warn('[Storage] gallery okunamadı, yedek veri kullanılıyor:', err);
      cache.gallery = clone(GALLERY_FALLBACK);
    }
  }

  async function init() {
    const db = fb.db;
    const canSeed = !!(global.Auth && global.Auth.isAuthenticated());

    // Üç koleksiyon birbirinden bağımsız olduğu için paralel okunur
    // (sayfa yüklenme süresini ~3 kat kısaltır).
    await Promise.all([
      loadPages(db, canSeed),
      loadBlog(db, canSeed),
      loadGallery(db, canSeed)
    ]);
  }

  function persistPages() {
    fb.db.collection('pages').doc('main').set(cache.pages).catch(notifyWriteError);
  }

  /* ---------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------- */
  const Storage = {
    init,
    generateId,
    logActivity,

    getActivity: () => readActivity(),

    getPages: () => migratePages(cache.pages),
    setPages: (pages) => {
      cache.pages = pages;
      persistPages();
      return true;
    },
    updatePagesSection: (section, data) => {
      cache.pages[section] = data;
      persistPages();
      return true;
    },

    getBlogPosts: () => cache.blog,
    setBlogPosts: (posts) => {
      cache.blog = posts;
      const batch = fb.db.batch();
      posts.forEach((post) => batch.set(fb.db.collection('blog').doc(post.id), post));
      batch.commit().catch(notifyWriteError);
      return true;
    },
    getBlogPostById: (id) => cache.blog.find((p) => p.id === id) || null,
    getBlogPostBySlug: (slug) => cache.blog.find((p) => p.slug === slug) || null,
    addBlogPost: (post) => {
      const newPost = Object.assign({
        id: generateId('post'),
        views: 0,
        comments: [],
        date: new Date().toISOString().slice(0, 10)
      }, post);
      cache.blog.unshift(newPost);
      fb.db.collection('blog').doc(newPost.id).set(newPost).catch(notifyWriteError);
      logActivity(`Yeni yazı eklendi: "${newPost.title}"`, 'blog');
      return newPost;
    },
    updateBlogPost: (id, updates) => {
      const idx = cache.blog.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      cache.blog[idx] = Object.assign({}, cache.blog[idx], updates);
      fb.db.collection('blog').doc(id).set(cache.blog[idx]).catch(notifyWriteError);
      logActivity(`Yazı güncellendi: "${cache.blog[idx].title}"`, 'blog');
      return cache.blog[idx];
    },
    deleteBlogPost: (id) => {
      const target = cache.blog.find((p) => p.id === id);
      cache.blog = cache.blog.filter((p) => p.id !== id);
      fb.db.collection('blog').doc(id).delete().catch(notifyWriteError);
      if (target) logActivity(`Yazı silindi: "${target.title}"`, 'blog');
      return cache.blog;
    },

    getProjects: () => cache.pages.projects,
    addProject: (project) => {
      const newProject = Object.assign({ id: generateId('proj') }, project);
      cache.pages.projects.unshift(newProject);
      persistPages();
      logActivity(`Yeni proje eklendi: "${newProject.title}"`, 'projects');
      return newProject;
    },
    updateProject: (id, updates) => {
      const idx = cache.pages.projects.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      cache.pages.projects[idx] = Object.assign({}, cache.pages.projects[idx], updates);
      persistPages();
      logActivity(`Proje güncellendi: "${cache.pages.projects[idx].title}"`, 'projects');
      return cache.pages.projects[idx];
    },
    deleteProject: (id) => {
      const target = cache.pages.projects.find((p) => p.id === id);
      cache.pages.projects = cache.pages.projects.filter((p) => p.id !== id);
      persistPages();
      if (target) logActivity(`Proje silindi: "${target.title}"`, 'projects');
      return cache.pages.projects;
    },

    getGalleryItems: () => cache.gallery,
    setGalleryItems: (items) => {
      cache.gallery = items;
      const batch = fb.db.batch();
      items.forEach((item) => batch.set(fb.db.collection('gallery').doc(item.id), item));
      batch.commit().catch(notifyWriteError);
      return true;
    },
    addGalleryItem: (item) => {
      const newItem = Object.assign({ id: generateId('g') }, item);
      cache.gallery.unshift(newItem);
      fb.db.collection('gallery').doc(newItem.id).set(newItem).catch(notifyWriteError);
      logActivity(`Galeriye yeni öğe eklendi: "${newItem.title}"`, 'media');
      return newItem;
    },
    deleteGalleryItem: (id) => {
      cache.gallery = cache.gallery.filter((i) => i.id !== id);
      fb.db.collection('gallery').doc(id).delete().catch(notifyWriteError);
      return cache.gallery;
    }
  };

  global.Storage = Storage;
})(window);
