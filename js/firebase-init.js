import { firebaseConfig, FIREBASE_CONFIGURED } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, doc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

export { FIREBASE_CONFIGURED };

let app = null;
let db = null;
let storage = null;
let auth = null;
let menuDocRef = null;

if (FIREBASE_CONFIGURED) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
  menuDocRef = doc(db, 'config', 'menu');
}

export { app, db, storage, auth, menuDocRef };

export function renderConfigMissing(container) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px;background:#12151b;color:#f4ecdb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;">
      <div style="max-width:480px;">
        <h1 style="font-size:1.3rem;margin:0 0 12px;">Firebase yapılandırması eksik</h1>
        <p style="font-size:0.92rem;line-height:1.6;color:#c9c3b8;margin:0;">
          <code style="color:#f0a868;">js/firebase-config.js</code> dosyasındaki
          <code style="color:#f0a868;">firebaseConfig</code> değerlerini kendi Firebase projenizin
          bilgileriyle doldurmanız gerekiyor. Kurulum adımları için
          <code style="color:#f0a868;">README.md</code> dosyasına bakın.
        </p>
      </div>
    </div>`;
}
