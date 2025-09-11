// app.js
// ربط موقعك مع Firebase

// استدعاء مكتبات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAWjjaE-VO_nzW3DHbdMGCwIjzq8EjexzY",
  authDomain: "english-726f0.firebaseapp.com",
  projectId: "english-726f0",
  storageBucket: "english-726f0.firebasestorage.app",
  messagingSenderId: "177682654566",
  appId: "1:177682654566:web:8683b37114f8ee3b66d4a7",
  measurementId: "G-WCJZHHSE7X"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// اختبار جلب البيانات من Firestore
async function testFirestore() {
  const querySnapshot = await getDocs(collection(db, "config"));
  querySnapshot.forEach((doc) => {
    console.log(`${doc.id} =>`, doc.data());
  });
}

testFirestore();
