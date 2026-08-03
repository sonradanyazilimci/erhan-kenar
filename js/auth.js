/**
 * auth.js
 * -----------------------------------------------------------------------
 * Firebase Authentication (Email/Password) tabanlı kimlik doğrulama.
 * Giriş formunda hâlâ "admin" kullanıcı adı kullanılır; bu, Firebase'in
 * zorunlu kıldığı e-posta formatına uyması için sabit bir e-postaya
 * eşlenir (kullanıcı bunu hiç görmez). Profil alanları (ad/e-posta/avatar)
 * `settings/adminProfile` Firestore dokümanında tutulur — Firebase Auth'un
 * kendi e-postası sadece giriş kimliği olarak kullanılır.
 */
(function (global) {
  'use strict';

  const USERNAME_EMAIL_MAP = { admin: 'admin@yonetim.local' };
  const REMEMBER_KEY = 'app_remember_username';
  const PROFILE_DOC = () => fb.db.collection('settings').doc('adminProfile');
  const DEFAULT_PROFILE = { name: 'Erhan Kenar', email: 'erhankenar35@gmail.com', avatar: 'assets/images/avatar.svg' };

  let profileCache = null;
  let authReadyPromise = null;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function usernameToEmail(username) {
    return USERNAME_EMAIL_MAP[String(username).trim().toLowerCase()] || null;
  }

  async function loadProfile() {
    try {
      const snap = await PROFILE_DOC().get();
      profileCache = snap.exists ? Object.assign({}, DEFAULT_PROFILE, snap.data()) : Object.assign({}, DEFAULT_PROFILE);
    } catch (err) {
      console.warn('[Auth] profil okunamadı, varsayılan kullanılıyor:', err);
      profileCache = Object.assign({}, DEFAULT_PROFILE);
    }
  }

  // Firebase, oturumu (varsa) sayfa yüklendikten kısa bir süre sonra
  // asenkron olarak geri yükler. Bu fonksiyon o ilk çözümlemeyi bekler.
  function waitForAuthReady() {
    if (!authReadyPromise) {
      authReadyPromise = new Promise((resolve) => {
        const unsubscribe = fb.auth.onAuthStateChanged(async (user) => {
          unsubscribe();
          if (user) await loadProfile();
          resolve();
        });
      });
    }
    return authReadyPromise;
  }

  async function login(username, password, remember) {
    const email = usernameToEmail(username);
    if (!email) {
      await delay(400);
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı.' };
    }

    try {
      await fb.auth.setPersistence(
        remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
      );
      await fb.auth.signInWithEmailAndPassword(email, password);
      await loadProfile();

      if (remember) {
        localStorage.setItem(REMEMBER_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      const session = getSession();
      Storage.logActivity(`${session.name} panele giriş yaptı.`, 'auth');
      return { success: true, session };
    } catch (err) {
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı.' };
    }
  }

  function logout() {
    const session = getSession();
    fb.auth.signOut();
    if (session) Storage.logActivity(`${session.name} çıkış yaptı.`, 'auth');
  }

  function getSession() {
    const user = fb.auth.currentUser;
    if (!user) return null;
    const profile = profileCache || DEFAULT_PROFILE;
    return {
      uid: user.uid,
      username: 'admin',
      name: user.displayName || profile.name,
      email: profile.email,
      avatar: user.photoURL || profile.avatar,
      loginAt: user.metadata && user.metadata.lastSignInTime
    };
  }

  function isAuthenticated() {
    return !!fb.auth.currentUser;
  }

  function getRememberedUsername() {
    return localStorage.getItem(REMEMBER_KEY) || '';
  }

  async function requestPasswordReset(email) {
    await delay(700);
    // Giriş "admin" kullanıcı adı + dahili sabit e-postayla yapıldığı için
    // gerçek bir e-posta gönderimi mümkün değil; bu demo/bilgilendirme mesajıdır.
    return {
      success: true,
      message: 'Şifrenizi unuttuysanız Yönetim Paneli > Kullanıcı Ayarları üzerinden (giriş yaptıktan sonra) değiştirebilirsiniz. (Demo modu)'
    };
  }

  async function updateCurrentUser(updates) {
    const user = fb.auth.currentUser;
    if (!user) return null;

    if (updates.name || updates.avatar) {
      await user.updateProfile({
        displayName: updates.name || user.displayName,
        photoURL: updates.avatar || user.photoURL
      }).catch((err) => console.error('[Auth] profil güncellenemedi:', err));
    }

    profileCache = Object.assign({}, profileCache || DEFAULT_PROFILE, updates);
    await PROFILE_DOC().set(profileCache).catch((err) => console.error('[Auth] profil Firestore\'a yazılamadı:', err));

    Storage.logActivity('Profil bilgileri güncellendi.', 'auth');
    return getSession();
  }

  async function updatePassword(currentPassword, newPassword) {
    const user = fb.auth.currentUser;
    if (!user) throw new Error('Oturum bulunamadı.');

    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPassword);
    Storage.logActivity('Şifre güncellendi.', 'auth');
  }

  function requireAuthOrRedirect(redirectTo = 'login.html') {
    if (!isAuthenticated()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  global.Auth = {
    login,
    logout,
    getSession,
    isAuthenticated,
    getRememberedUsername,
    requestPasswordReset,
    updateCurrentUser,
    updatePassword,
    waitForAuthReady,
    requireAuthOrRedirect
  };
})(window);
