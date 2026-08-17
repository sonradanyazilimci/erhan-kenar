// Firebase Console > Project settings > General > "Your apps" > Web app
// bölümünden aldığınız yapılandırma bilgilerini aşağıya yapıştırın.
//
// Bu değerler "gizli" değildir — Firebase web uygulamalarında herkese açık
// olarak yayınlanır. Güvenlik, Firestore ve Storage "Rules" dosyalarıyla
// sağlanır (bkz. README.md), API anahtarıyla değil.

export const firebaseConfig = {
  apiKey: "AIzaSyBRW7oKv-TCQ9xCQn8j_qFq-NmDQjOkiFk",
  authDomain: "sosyal-qr.firebaseapp.com",
  projectId: "sosyal-qr",
  storageBucket: "sosyal-qr.firebasestorage.app",
  messagingSenderId: "267469746718",
  appId: "1:267469746718:web:e080c4abedbbcc44b8f40f",
};

export const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "BURAYA_API_KEY";
