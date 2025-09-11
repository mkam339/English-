// app.js — ربط موقع الإنجليزي بـ Firebase (إدارة + عرض Realtime)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy,
  serverTimestamp, setDoc, addDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// مفاتيح مشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAWjjaE-VO_nzW3DHbdMGCwIjzq8EjexzY",
  authDomain: "english-726f0.firebaseapp.com",
  projectId: "english-726f0",
  storageBucket: "english-726f0.firebasestorage.app",
  messagingSenderId: "177682654566",
  appId: "1:177682654566:web:8683b37114f8ee3b66d4a7",
  measurementId: "G-WCJZHHSE7X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// … (بقية الكود كما أرسلته لك من قبل لإدارة الأدمن + المشاركات + الواجبات + الامتحانات)

// ========== إضافة إغلاق دفاعي ==========
function hideLogin() {
  const el = document.getElementById('loginModal');
  if (el) el.style.display = 'none';
}

// لو الزر موجود، اربطه
document.getElementById('closeLogin')?.addEventListener('click', hideLogin);

// إغلاق بالضغط على الخلفية
document.getElementById('loginModal')?.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'loginModal') hideLogin();
});

// إغلاق بزر Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideLogin();
});
