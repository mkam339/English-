// app.js — إدارة + عرض Realtime بدون حذف محتوى HTML اليدوي
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

// عناصر من الصفحة
const adminBar      = document.getElementById('adminBar');
const adminEmailEl  = document.getElementById('adminEmail');
const logoutBtn     = document.getElementById('logoutBtn');
const loginModal    = document.getElementById('loginModal');
const loginForm     = document.getElementById('loginForm');
const closeLogin    = document.getElementById('closeLogin');

const feedEl        = document.getElementById('projects');
const dynamicPostsEl= document.getElementById('dynamicPosts');
const hwListEl      = document.querySelector('#panel-homework .list');
const hwDynEl       = document.getElementById('homeworksDynamic');
const updatesListEl = document.getElementById('updatesList');
const examDynEl     = document.getElementById('examDynamic');

// ✅ إصلاح: إنشاء حاضنة النماذج formsRoot تلقائياً إذا لم تكن موجودة
const formsRoot = (() => {
  let el = document.getElementById('formsRoot');
  if (!el) {
    el = document.createElement('div');
    el.id = 'formsRoot';
    document.body.appendChild(el);
  }
  return el;
})();

const openPostFormBtn = document.getElementById('openPostForm');
const openHWFormBtn   = document.getElementById('openHWForm');
const openExamFormBtn = document.getElementById('openExamForm');

// فحص الأدمن من config/admins.emails
let isAdmin = false;
async function checkAdmin(email){
  if (!email) return false;
  const d = await getDoc(doc(db,'config','admins'));
  const emails = d.exists() ? (d.data().emails||[]) : [];
  return emails.map(e=>e.toLowerCase()).includes(email.toLowerCase());
}

onAuthStateChanged(auth, async (user)=>{
  isAdmin = user ? await checkAdmin(user.email) : false;
  if (adminBar) adminBar.style.display = isAdmin ? 'block' : 'none';
  if (adminEmailEl) adminEmailEl.textContent = isAdmin ? user.email : '';
  if (user && isAdmin && loginModal) loginModal.style.display = 'none';
});

// تسجيل الدخول/الخروج
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(err){
    alert('فشل الدخول: '+err.message);
    const errBox = document.getElementById('loginError');
    if (errBox) errBox.style.display = 'block';
  }
});
logoutBtn?.addEventListener('click', async ()=>{
  await signOut(auth);
  alert('تم تسجيل الخروج');
});

// ======== عرض البيانات (بدون حذف محتواك اليدوي) ========
// المشاركات: نملأ #dynamicPosts فقط
function renderPosts(list){
  if(!dynamicPostsEl) return;
  dynamicPostsEl.innerHTML = list.map(p=>`
    <div class="post">
      <h2>${esc(p.title)}</h2>
      <p class="meta">${fmt(p.created_at?.toDate?.() || new Date())}</p>
      ${p.body?`<p>${esc(p.body)}</p>`:''}
      ${Array.isArray(p.media)&&p.media.length?`
        <div class="media-grid">
          ${p.media.sort((a,b)=>(a.sort??0)-(b.sort??0)).map(m=>{
            if(m.type==='image') return `<img src="${m.url}" alt="">`;
            if(m.type==='video') return `<a href="${m.url}" target="_blank">🎬 اضغط هنا لمشاهدة الفيديو</a>`;
            return `<a href="${m.url}" target="_blank">🔗 رابط</a>`;
          }).join('')}
        </div>`:''}
    </div>
  `).join('');
}
onSnapshot(query(collection(db,'posts'), orderBy('created_at','desc')),(snap)=>{
  const posts = snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.is_published!==false);
  renderPosts(posts);
});

// الواجبات: نضيف داخل #homeworksDynamic ونترك الباقي كما كتبته
function renderHomeworks(rows){
  if(!hwDynEl) return;
  hwDynEl.innerHTML = rows.map(h=>`
    <div class="item">
      <div><strong>${h.title}</strong></div>
      <div class="due">نُشر: ${fmt(h.published_at?.toDate?.() || new Date())}</div>
    </div>`).join('');
}
onSnapshot(query(collection(db,'homeworks'), orderBy('published_at','desc')),(snap)=>{
  renderHomeworks(snap.docs.map(d=>({id:d.id,...d.data()})));
});

// الامتحان: نعرض نسخة ديناميكية إضافية داخل #examDynamic فقط
onSnapshot(doc(db,'exam','current'),(d)=>{
  if(!examDynEl) return;
  if(!d.exists()){ examDynEl.innerHTML=''; return; }
  const ex = d.data();
  examDynEl.innerHTML = `
    <div class="item">
      <div><span class="badge badge-amber">امتحان</span> ${esc(ex.title)}</div>
      <div class="due">نُشر: ${fmt(ex.published_at?.toDate?.() || new Date())}</div>
    </div>`;
});

// ======== أدوات الإدارة (للأدمن) ========
openPostFormBtn?.addEventListener('click', ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountPostForm(); });
openHWFormBtn?.addEventListener('click',   ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountHWForm(); });
openExamFormBtn?.addEventListener('click', ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountExamForm(); });

// نموذج: منشور جديد
function mountPostForm(){
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="postForm" style="background:#fff;padding:16px;border-radius:12px;max-width:520px;width:90%">
      <h3>منشور جديد</h3>
      <input id="pTitle" placeholder="العنوان" required style="display:block;width:100%;margin:6px 0;padding:8px">
      <textarea id="pBody" placeholder="وصف (اختياري)" style="display:block;width:100%;margin:6px 0;padding:8px"></textarea>
      <p>وسائط (حتى 5) — كل سطر: <code>image|https://..</code> أو <code>video|https://..</code> أو <code>link|https://..</code></p>
      <textarea id="pMedia" style="display:block;width:100%;min-height:100px;margin:6px 0;padding:8px"></textarea>
      <button type="submit">حفظ</button>
      <button type="button" id="closeForms">إغلاق</button>
    </form>
  </div>`;
  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('postForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('pTitle').value.trim();
      const body =document.getElementById('pBody').value.trim();
      const mediaLines=document.getElementById('pMedia').value.split('\n').map(s=>s.trim()).filter(Boolean);
      const media=mediaLines.slice(0,5).map((line,idx)=>{
        const [type,url]=line.includes('|')?line.split('|'):[ 'link', line ];
        return { type, url, sort:idx };
      });
      await addDoc(collection(db,'posts'),{ title, body, media, created_at:serverTimestamp(), is_published:true });
      formsRoot.innerHTML='';
      alert('تم حفظ المنشور');
    }catch(err){
      alert('تعذّر حفظ المنشور: '+err.message);
    }
  };
}

// نموذج: واجب جديد
function mountHWForm(){
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="hwForm" style="background:#fff;padding:16px;border-radius:12px;max-width:520px;width:90%">
      <h3>واجب جديد</h3>
      <input id="hTitle" placeholder="مثال: &lt;span class='badge badge-amber'&gt;H,W&lt;/span&gt;p.231" required style="display:block;width:100%;margin:6px 0;padding:8px">
      <button type="submit">حفظ</button>
      <button type="button" id="closeForms">إغلاق</button>
    </form>
  </div>`;
  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('hwForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('hTitle').value.trim();
      await addDoc(collection(db,'homeworks'),{ title, published_at:serverTimestamp() });
      formsRoot.innerHTML='';
      alert('تم حفظ الواجب');
    }catch(err){
      alert('تعذّر حفظ الواجب: '+err.message);
    }
  };
}

// نموذج: تعديل إعلان الامتحان (exam/current)
function mountExamForm(){
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="exForm" style="background:#fff;padding:16px;border-radius:12px;max-width:520px;width:90%">
      <h3>تعديل إعلان الامتحان</h3>
      <input id="eTitle" placeholder="عنوان الامتحان" required style="display:block;width:100%;margin:6px 0;padding:8px">
      <button type="submit">حفظ</button>
      <button type="button" id="closeForms">إغلاق</button>
    </form>
  </div>`;
  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('exForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('eTitle').value.trim();
      await setDoc(doc(db,'exam','current'),{ title, published_at:serverTimestamp() },{ merge:true });
      formsRoot.innerHTML='';
      alert('تم تحديث إعلان الامتحان');
    }catch(err){
      alert('تعذّر تحديث الامتحان: '+err.message);
    }
  };
}

// أدوات مساعدة
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(d){ try{return new Intl.DateTimeFormat('ar-SA').format(d);}catch(e){return '';} }

// ====== إغلاق دفاعي لنافذة تسجيل الدخول ======
function hideLogin() {
  const el = document.getElementById('loginModal');
  if (el) el.style.display = 'none';
}
closeLogin?.addEventListener('click', hideLogin);
document.getElementById('loginModal')?.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'loginModal') hideLogin();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideLogin();
});
