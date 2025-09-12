// app.js — إدارة + عرض Realtime (CRUD + رفع ملفات + إصلاحات الطلبات 1..5)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy,
  serverTimestamp, setDoc, addDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// === Firebase config ===
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
const storage = getStorage(app);

// === عناصر الصفحة ===
const adminBar      = document.getElementById('adminBar');
const adminEmailEl  = document.getElementById('adminEmail');
const logoutBtn     = document.getElementById('logoutBtn');
const loginModal    = document.getElementById('loginModal');
const loginForm     = document.getElementById('loginForm');
const closeLogin    = document.getElementById('closeLogin');

const dynamicPostsEl = document.getElementById('dynamicPosts');
const hwDynEl        = document.getElementById('homeworksDynamic');
const examDynEl      = document.getElementById('examDynamic');
const updatesListEl  = document.getElementById('updatesList');

// ✅ ينشئ formsRoot تلقائيًا إذا مفقود
const formsRoot = (() => {
  let el = document.getElementById('formsRoot');
  if (!el) { el = document.createElement('div'); el.id = 'formsRoot'; document.body.appendChild(el); }
  return el;
})();

const openPostFormBtn = document.getElementById('openPostForm');
const openHWFormBtn   = document.getElementById('openHWForm');
const openExamFormBtn = document.getElementById('openExamForm');

// === تحريك الامتحان الديناميكي للأعلى (طلبك #2)
if (examDynEl && updatesListEl && examDynEl.previousElementSibling !== updatesListEl) {
  updatesListEl.parentNode.insertBefore(examDynEl, updatesListEl); // examDynamic فوق القديم اليدوي
}

// === ثوابت/حالة عامة ===
let isAdmin = false;
let postsCache = [];    // لإعادة الرسم عند تغيّر حالة الأدمن (#1)
let hwCache = [];
let examCache = null;

async function checkAdmin(email){
  if (!email) return false;
  const d = await getDoc(doc(db,'config','admins'));
  const emails = d.exists() ? (d.data().emails||[]) : [];
  return emails.map(e=>e.toLowerCase()).includes(email.toLowerCase());
}

onAuthStateChanged(auth, async (user)=>{
  isAdmin = user ? await checkAdmin(user.email) : false;

  // (#3) تثبيت شريط الأدمن بمكان ثابت من خلال CSS inline
  if (adminBar) {
    adminBar.style.display = isAdmin ? 'flex' : 'none';
    adminBar.style.position = 'fixed';
    adminBar.style.top = '10px';         // ممكن تبدّلها لـ 'auto' و adminBar.style.bottom='10px' لو تحب أسفل الصفحة
    adminBar.style.right = '10px';
    adminBar.style.left = 'auto';
    adminBar.style.zIndex = '3000';
    adminBar.style.borderRadius = '12px';
  }

  if (adminEmailEl) adminEmailEl.textContent = isAdmin && user ? user.email : '';
  if (user && isAdmin && loginModal) loginModal.style.display = 'none';

  // (#1) إعادة رسم القوائم بعد علمنا أنك أدمن لإظهار أزرار تعديل/حذف
  renderPosts(postsCache);
  renderHomeworks(hwCache);
  renderExam(examCache);
});

// === دخول/خروج ===
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(err){
    alert('فشل الدخول: '+err.message);
    const errBox = document.getElementById('loginError'); if (errBox) errBox.style.display = 'block';
  }
});
logoutBtn?.addEventListener('click', async ()=>{
  await signOut(auth);
  alert('تم تسجيل الخروج');
});

// === عرض المشاركات (مع أزرار تعديل/حذف للأدمن) ===
function renderPosts(list){
  postsCache = list || [];
  if(!dynamicPostsEl) return;
  dynamicPostsEl.innerHTML = postsCache.map(p=>{
    const mediaHtml = Array.isArray(p.media)&&p.media.length ? `
      <div class="media-grid">
        ${p.media.sort((a,b)=>(a.sort??0)-(b.sort??0)).map(m=>{
          if(m.type==='image') return `<img src="${m.url}" alt="">`;
          if(m.type==='video') return `<a href="${m.url}" target="_blank">🎬 اضغط هنا لمشاهدة الفيديو</a>`;
          return `<a href="${m.url}" target="_blank">🔗 رابط</a>`;
        }).join('')}
      </div>` : '';
    const adminBtns = isAdmin ? `
      <div style="display:flex;gap:8px;margin:0 16px 14px 16px">
        <button class="btn-edit-post" data-id="${p.id}">تعديل</button>
        <button class="btn-del-post"  data-id="${p.id}">حذف</button>
      </div>` : '';
    return `
      <div class="post" data-id="${p.id}">
        <h2>${esc(p.title||'بدون عنوان')}</h2>
        <p class="meta">${fmt(p.created_at?.toDate?.() || new Date())}</p>
        ${p.body?`<p>${esc(p.body)}</p>`:''}
        ${mediaHtml}
        ${adminBtns}
      </div>`;
  }).join('');
}
onSnapshot(query(collection(db,'posts'), orderBy('created_at','desc')),(snap)=>{
  const posts = snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.is_published!==false);
  renderPosts(posts);
});

// === عرض الواجبات (مع أزرار تعديل/حذف) ===
function renderHomeworks(rows){
  hwCache = rows || [];
  if(!hwDynEl) return;
  hwDynEl.innerHTML = hwCache.map(h=>`
    <div class="item" data-id="${h.id}">
      <div><strong>${h.title}</strong></div>
      <div class="due">نُشر: ${fmt(h.published_at?.toDate?.() || new Date())}</div>
      ${isAdmin?`
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-edit-hw" data-id="${h.id}">تعديل</button>
          <button class="btn-del-hw"  data-id="${h.id}">حذف</button>
        </div>`:''}
    </div>`).join('');
}
onSnapshot(query(collection(db,'homeworks'), orderBy('published_at','desc')),(snap)=>{
  renderHomeworks(snap.docs.map(d=>({id:d.id,...d.data()})));
});

// === الامتحان الحالي (أزرار تعديل/حذف) ===
function renderExam(ex){
  examCache = ex || null;
  if(!examDynEl) return;
  if(!examCache){ examDynEl.innerHTML=''; return; }
  examDynEl.innerHTML = `
    <div class="item">
      <div><span class="badge badge-amber">امتحان</span> ${esc(examCache.title||'')}</div>
      <div class="due">نُشر: ${fmt(examCache.published_at?.toDate?.() || new Date())}</div>
      ${isAdmin?`
        <div style="margin-top:8px;display:flex;gap:8px">
          <button id="btn-edit-exam">تعديل</button>
          <button id="btn-del-exam">حذف</button>
        </div>`:''}
    </div>`;
}
onSnapshot(doc(db,'exam','current'),(d)=>{
  renderExam(d.exists()? d.data(): null);
});

// === أزرار فتح النماذج (إضافة) ===
openPostFormBtn?.addEventListener('click', ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountPostForm(); });
openHWFormBtn?.addEventListener('click',   ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountHWForm(); });
openExamFormBtn?.addEventListener('click', ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountExamForm(examCache || null); });

// === تفويض أحداث للتعديل/الحذف ===
dynamicPostsEl?.addEventListener('click', async (e)=>{
  const editBtn = e.target.closest('.btn-edit-post');
  const delBtn  = e.target.closest('.btn-del-post');
  if (editBtn){ 
    if(!isAdmin) return alert('للمدراء فقط');
    const id = editBtn.dataset.id;
    const d = await getDoc(doc(db,'posts',id));
    if (d.exists()) mountPostForm({id, ...d.data()});
  }
  if (delBtn){
    if(!isAdmin) return alert('للمدراء فقط');
    const id = delBtn.dataset.id;
    if (confirm('هل تريد حذف هذا المنشور؟')) {
      try { await deleteDoc(doc(db,'posts',id)); alert('تم الحذف'); }
      catch(err){ alert('تعذّر الحذف: '+err.message); }
    }
  }
});

hwDynEl?.addEventListener('click', async (e)=>{
  const editBtn = e.target.closest('.btn-edit-hw');
  const delBtn  = e.target.closest('.btn-del-hw');
  if (editBtn){
    if(!isAdmin) return alert('للمدراء فقط');
    const id = editBtn.dataset.id;
    const d = await getDoc(doc(db,'homeworks',id));
    if (d.exists()) mountHWForm({id, ...d.data()});
  }
  if (delBtn){
    if(!isAdmin) return alert('للمدراء فقط');
    const id = delBtn.dataset.id;
    if (confirm('حذف هذا الواجب؟')) {
      try { await deleteDoc(doc(db,'homeworks',id)); alert('تم الحذف'); }
      catch(err){ alert('تعذّر الحذف: '+err.message); }
    }
  }
});

examDynEl?.addEventListener('click', async (e)=>{
  if (e.target.id === 'btn-edit-exam'){
    if(!isAdmin) return alert('للمدراء فقط');
    mountExamForm(examCache || null);
  }
  if (e.target.id === 'btn-del-exam'){
    if(!isAdmin) return alert('للمدراء فقط');
    if (confirm('حذف إعلان الامتحان الحالي؟')) {
      try { await deleteDoc(doc(db,'exam','current')); alert('تم الحذف'); }
      catch(err){ alert('تعذّر الحذف: '+err.message); }
    }
  }
});

// === نماذج الإضافة/التعديل ===
// posts: إضافة/تعديل + رفع ملفات من الجهاز (طلبك #5)
function mountPostForm(post=null){
  const isEdit = !!(post && post.id);
  const title0 = esc(post?.title||'');
  const body0  = esc(post?.body||'');
  const media0 = Array.isArray(post?.media) ? post.media
                  .sort((a,b)=>(a.sort??0)-(b.sort??0))
                  .map(m=>`${m.type||'link'}|${m.url||''}`).join('\n') : '';
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="postForm" style="background:#fff;padding:16px;border-radius:12px;max-width:560px;width:92%">
      <h3>${isEdit?'تعديل منشور':'منشور جديد'}</h3>
      <input id="pTitle" value="${title0}" placeholder="العنوان" required style="display:block;width:100%;margin:6px 0;padding:8px">
      <textarea id="pBody" placeholder="وصف (اختياري)" style="display:block;width:100%;margin:6px 0;padding:8px">${body0}</textarea>

      <p>روابط وسائط (اختياري — كل سطر: <code>image|https://..</code> أو <code>video|https://..</code> أو <code>link|https://..</code>)</p>
      <textarea id="pMedia" style="display:block;width:100%;min-height:90px;margin:6px 0;padding:8px">${media0}</textarea>

      <p>أو حمِّل ملفات من جهازك (حتى 5 ملفات):</p>
      <input id="pFiles" type="file" multiple style="display:block;margin:6px 0">

      <button type="submit">${isEdit?'حفظ التعديلات':'حفظ'}</button>
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
      let media=mediaLines.slice(0,5).map((line,idx)=>{
        const [type,url]=line.includes('|')?line.split('|'):[ 'link', line ];
        return { type, url, sort:idx };
      });

      // رفع ملفات محلية (إن وجدت) — يضيف روابطها إلى media
      const files = Array.from(document.getElementById('pFiles').files||[]).slice(0, 5-media.length);
      let idx = media.length;
      for (const file of files) {
        const path = `uploads/${auth.currentUser?.uid || 'admin'}/${Date.now()}_${idx}_${file.name}`;
        const r = sRef(storage, path);
        await uploadBytes(r, file);
        const url = await getDownloadURL(r);
        // تحديد النوع من mime
        const t = file.type.startsWith('image/') ? 'image'
                : file.type.startsWith('video/') ? 'video'
                : 'link';
        media.push({ type: t, url, sort: idx++ });
      }

      if (isEdit){
        await updateDoc(doc(db,'posts',post.id), { title, body, media });
      }else{
        await addDoc(collection(db,'posts'),{ title, body, media, created_at:serverTimestamp(), is_published:true });
      }
      formsRoot.innerHTML='';
      alert(isEdit?'تم حفظ التعديلات':'تم حفظ المنشور');
    }catch(err){
      alert('تعذّر الحفظ: '+err.message);
    }
  };
}

// homeworks: إضافة/تعديل
function mountHWForm(hw=null){
  const isEdit = !!(hw && hw.id);
  const title0 = esc(hw?.title||'');
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="hwForm" style="background:#fff;padding:16px;border-radius:12px;max-width:520px;width:92%">
      <h3>${isEdit?'تعديل واجب':'واجب جديد'}</h3>
      <input id="hTitle" value="${title0}" placeholder="مثال: &lt;span class='badge badge-amber'&gt;H,W&lt;/span&gt;p.231" required style="display:block;width:100%;margin:6px 0;padding:8px">
      <button type="submit">${isEdit?'حفظ التعديلات':'حفظ'}</button>
      <button type="button" id="closeForms">إغلاق</button>
    </form>
  </div>`;
  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('hwForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('hTitle').value.trim();
      if (isEdit){
        await updateDoc(doc(db,'homeworks',hw.id), { title });
      }else{
        await addDoc(collection(db,'homeworks'),{ title, published_at:serverTimestamp() });
      }
      formsRoot.innerHTML='';
      alert(isEdit?'تم حفظ التعديلات':'تم حفظ الواجب');
    }catch(err){
      alert('تعذّر الحفظ: '+err.message);
    }
  };
}

// exam/current: إضافة/تعديل + حذف
function mountExamForm(ex=null){
  const title0 = esc(ex?.title||'');
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="exForm" style="background:#fff;padding:16px;border-radius:12px;max-width:520px;width:92%">
      <h3>${ex?'تعديل إعلان الامتحان':'إضافة إعلان الامتحان'}</h3>
      <input id="eTitle" value="${title0}" placeholder="عنوان الامتحان" required style="display:block;width:100%;margin:6px 0;padding:8px">
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
      alert('تم الحفظ');
    }catch(err){
      alert('تعذّر الحفظ: '+err.message);
    }
  };
}

// === أدوات مساعدة ===
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(d){ try{return new Intl.DateTimeFormat('ar-SA').format(d);}catch(e){return '';} }

// === إغلاق نافذة الدخول ===
function hideLogin() { const el = document.getElementById('loginModal'); if (el) el.style.display = 'none'; }
closeLogin?.addEventListener('click', hideLogin);
document.getElementById('loginModal')?.addEventListener('click', (e) => { if (e.target && e.target.id === 'loginModal') hideLogin(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideLogin(); });
