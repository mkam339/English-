// استيراد مكتبات Firebase الأساسية
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

// ⚡ هنا تضع إعدادات مشروعك من Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAWjjaE-VO_nzW3DHbdMGCwIjzq8EjexzY",
  authDomain: "english-726f0.firebaseapp.com",
  projectId: "english-726f0",
  storageBucket: "english-726f0.firebasestorage.app",
  messagingSenderId: "177682654566",
  appId: "1:177682654566:web:8683b37114f8ee3b66d4a7",
  measurementId: "G-WCJZHHSE7X"
};

// ✅ تهيئة Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// للتأكد أن الاتصال صحيح
console.log("✅ Firebase تم تهيئته بنجاح:", app);
