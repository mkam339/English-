// استيراد مكتبات Firebase الأساسية
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

console.log("✅ Firebase تم تهيئته بنجاح:", app);

// 🔐 دالة تسجيل الدخول
export async function login(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ تسجيل الدخول:", userCred.user.email);

    // تحقق إذا المستخدم أدمن
    await checkIfAdmin(userCred.user.email);

  } catch (error) {
    console.error("❌ خطأ في تسجيل الدخول:", error.message);
    alert("فشل تسجيل الدخول: " + error.message);
  }
}

// 🚪 تسجيل خروج
export async function logout() {
  await signOut(auth);
  console.log("🚪 تم تسجيل الخروج");
  hideAdminButtons();
}

// 🛠️ التحقق إذا المستخدم أدمن
async function checkIfAdmin(email) {
  try {
    const docRef = doc(db, "config", "admins");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const admins = docSnap.data().emails || [];
      if (admins.includes(email)) {
        console.log("✅ المستخدم أدمن:", email);
        showAdminButtons();
      } else {
        console.log("⛔ المستخدم ليس أدمن:", email);
        hideAdminButtons();
      }
    } else {
      console.error("⚠️ لم يتم العثور على config/admins في Firestore");
    }
  } catch (err) {
    console.error("⚠️ خطأ أثناء التحقق من الأدمن:", err);
  }
}

// 🎛️ إظهار أزرار الأدمن
function showAdminButtons() {
  document.querySelectorAll(".admin-btn").forEach(btn => btn.style.display = "inline-block");
}

// 🚫 إخفاء أزرار الأدمن
function hideAdminButtons() {
  document.querySelectorAll(".admin-btn").forEach(btn => btn.style.display = "none");
}

// 🕵️‍♂️ مراقبة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("👤 المستخدم الحالي:", user.email);
    checkIfAdmin(user.email);
  } else {
    console.log("🚫 لا يوجد مستخدم مسجل دخول");
    hideAdminButtons();
  }
});
