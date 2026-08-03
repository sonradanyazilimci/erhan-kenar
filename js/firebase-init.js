/**
 * firebase-init.js
 * -----------------------------------------------------------------------
 * Firebase compat SDK'yı (index.html/login.html/admin.html'de CDN üzerinden
 * yüklenen firebase-app/firestore/auth-compat.js) başlatır ve
 * window.fb üzerinden storage.js / auth.js'in kullanacağı referansları verir.
 *
 * Not: Firebase Storage kullanılmıyor (Blaze/faturalandırma plan gerektiriyor);
 * görseller admin.js tarafından küçültülüp Firestore dokümanlarına base64
 * olarak gömülüyor.
 */
(function (global) {
  'use strict';

  firebase.initializeApp(FIREBASE_CONFIG);

  global.fb = {
    app: firebase.app(),
    auth: firebase.auth(),
    db: firebase.firestore()
  };
})(window);
