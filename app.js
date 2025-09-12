// app.js — CRUD + دعم أنواع الوسائط من داخل النموذج + أكثر من ملف + تخطيط تلقائي + تحسينات واجهة الأدمن
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy,
  serverTimestamp, setDoc, addDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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

// عناصر الصفحة
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

// formsRoot
const formsRoot = (() => {
  let el = document.getElementById('formsRoot');
  if (!el) { el = document.createElement('div'); el.id = 'formsRoot'; document.body.appendChild(el); }
  return el;
})();

const openPostFormBtn = document.getElementById('openPostForm');
const openHWFormBtn   = document.getElementById('openHWForm');
const openExamFormBtn = document.getElementById('openExamForm');

// إبقاء قائمة الاختبارات فوق الإعلان اليدوي
if (examDynEl && updatesListEl && examDynEl.previousElementSibling !== updatesListEl) {
  updatesListEl.parentNode.insertBefore(examDynEl, updatesListEl);
}

// حالة عامة
let isAdmin = false;
let postsCache = [];
let hwCache = [];
let examsCache = [];

// فحص الأدمن
async function checkAdmin(email){
  if (!email) return false;
  const d = await getDoc(doc(db,'config','admins'));
  const emails = d.exists() ? (d.data().emails||[]) : [];
  return emails.map(e=>e.toLowerCase()).includes(email.toLowerCase());
}

onAuthStateChanged(auth, async (user)=>{
  isAdmin = user ? await checkAdmin(user.email) : false;

  // شريط الأدمن + منع الحجب
  if (adminBar) {
    adminBar.style.display   = isAdmin ? 'flex' : 'none';
    adminBar.style.position  = 'fixed';
    adminBar.style.top       = '10px';
    adminBar.style.right     = '10px';
    adminBar.style.zIndex    = '3000';
    adminBar.style.borderRadius = '14px';
  }
  document.body.classList.toggle('admin-on', isAdmin);

  if (adminEmailEl) adminEmailEl.textContent = isAdmin && user ? user.email : '';
  if (user && isAdmin && loginModal) loginModal.style.display = 'none';

  // إعادة رسم لإظهار أزرار الأدمن
  renderPosts(postsCache);
  renderHomeworks(hwCache);
  renderExams(examsCache);
});

// دخول/خروج
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try{ await signInWithEmailAndPassword(auth, email, password); }
  catch(err){
    alert('فشل الدخول: '+err.message);
    const errBox = document.getElementById('loginError'); if (errBox) errBox.style.display = 'block';
  }
});
logoutBtn?.addEventListener('click', async ()=>{ await signOut(auth); alert('تم تسجيل الخروج'); });

// ======== أدوات مساعدة للعرض ========
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(d){ try{return new Intl.DateTimeFormat('ar-SA').format(d);}catch(e){return '';} }
function isYouTube(u){
  try{
    const url = new URL(u);
    return /(^|\.)youtube\.com$/.test(url.hostname) || /(^|\.)m\.youtube\.com$/.test(url.hostname) || url.hostname === 'youtu.be';
  }catch{ return false; }
}
function ytEmbed(u){
  try{
    const url = new URL(u);
    let id = '';
    if (url.hostname === 'youtu.be') {
      id = url.pathname.slice(1);
    } else {
      const path = url.pathname.replace(/\/+$/,'');
      if (path.startsWith('/watch'))      id = url.searchParams.get('v') || '';
      else if (path.startsWith('/shorts/')) id = path.split('/')[2] || '';
      else if (path.startsWith('/live/'))   id = path.split('/')[2] || '';
    }
    id = (id || '').split('?')[0].split('&')[0];
    if (!id) return null;
    const params = new URLSearchParams({ modestbranding:'1', rel:'0', controls:'1' });
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }catch{ return null; }
}

// ======== المشاركات ========
function renderPosts(list){
  postsCache = list || [];
  if(!dynamicPostsEl) return;
  dynamicPostsEl.innerHTML = postsCache.map(p=>{
    const media = Array.isArray(p.media) ? p.media.sort((a,b)=>(a.sort??0)-(b.sort??0)) : [];
    const gridClass = `media-grid n${Math.min(media.length,3) || 1}`;
    const mediaHtml = media.length ? `
      <div class="${gridClass}">
        ${media.map(m=>{
          const url = m.url || '';
          if(m.type==='image'){
            return `<div class="media image"><img src="${url}" loading="lazy" alt=""></div>`;
          }
          if(m.type==='video'){
            if (isYouTube(url)) {
              const e = ytEmbed(url);
              if (e) return `<div class="media video"><iframe src="${e}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
            }
            return `<div class="media video"><video controls src="${url}"></video></div>`;
          }
          return `<div class="media link" style="background:#fff;padding:12px"><a href="${url}" target="_blank">🔗 فتح الرابط</a></div>`;
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

// ======== الواجبات ========
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

// ======== الاختبارات (مجموعة متعددة) ========
function renderExams(rows){
  examsCache = rows || [];
  if(!examDynEl) return;
  examDynEl.innerHTML = examsCache.map(ex=>`
    <div class="item" data-id="${ex.id}">
      <div><span class="badge badge-amber">امتحان</span> ${esc(ex.title||'')}</div>
      <div class="due">نُشر: ${fmt(ex.published_at?.toDate?.() || new Date())}</div>
      ${isAdmin?`
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-edit-exam" data-id="${ex.id}">تعديل</button>
          <button class="btn-del-exam"  data-id="${ex.id}">حذف</button>
        </div>`:''}
    </div>`).join('');
}
onSnapshot(query(collection(db,'exam'), orderBy('published_at','desc')),(snap)=>{
  renderExams(snap.docs.map(d=>({id:d.id,...d.data()})));
});

// ======== فتح النماذج (إضافة) ========
openPostFormBtn?.addEventListener('click', ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountPostForm(); });
openHWFormBtn?.addEventListener('click',   ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountHWForm(); });
openExamFormBtn?.addEventListener('click', ()=>{ if(!isAdmin) return alert('للمدراء فقط'); mountExamForm(); });

// ======== تفويض أحداث التعديل/الحذف ========
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
    if (confirm('حذف هذا المنشور؟')) {
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
  const editBtn = e.target.closest('.btn-edit-exam');
  const delBtn  = e.target.closest('.btn-del-exam');
  if (editBtn){
    if(!isAdmin) return alert('للمدراء فقط');
    const id = editBtn.dataset.id;
    const d = await getDoc(doc(db,'exam',id));
    if (d.exists()) mountExamForm({id, ...d.data()});
  }
  if (delBtn){
    if(!isAdmin) return alert('للمدراء فقط');
    const id = delBtn.dataset.id;
    if (confirm('حذف هذا الاختبار؟')) {
      try { await deleteDoc(doc(db,'exam',id)); alert('تم الحذف'); }
      catch(err){ alert('تعذّر الحذف: '+err.message); }
    }
  }
});

// ======== النماذج ========

// منشور: إضافة/تعديل — واجهة اختيار النوع + أكثر من ملف (حتى 12 عنصر افتراضياً)
function mountPostForm(post=null){
  const isEdit = !!(post && post.id);
  const title0 = esc(post?.title||'');
  const body0  = esc(post?.body||'');
  const media0 = Array.isArray(post?.media)
    ? post.media.sort((a,b)=>(a.sort??0)-(b.sort??0))
    : [];

  const maxItems = 12;
  const rowTpl = (type='image', url='') => `
    <div class="mrow" style="display:flex;gap:8px;margin:6px 0;align-items:center">
      <select class="mtype" style="padding:8px;border-radius:10px;border:1px solid #e5e7eb">
        <option value="image" ${type==='image'?'selected':''}>صورة</option>
        <option value="video" ${type==='video'?'selected':''}>فيديو</option>
        <option value="link"  ${type==='link'?'selected':''}>رابط</option>
      </select>
      <input class="murl" value="${esc(url)}" placeholder="https://..." style="flex:1;padding:8px;border-radius:10px;border:1px solid #e5e7eb">
      <button type="button" class="mremove" title="حذف" style="border:none;background:#fee2e2;color:#991b1b;padding:8px 10px;border-radius:10px;cursor:pointer">✕</button>
    </div>`;

  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="postForm" style="background:#fff;padding:16px;border-radius:16px;max-width:640px;width:92%;box-shadow:0 20px 50px rgba(0,0,0,.25)">
      <h3 style="margin:0 0 8px 0">${isEdit?'تعديل منشور':'منشور جديد'}</h3>
      <input id="pTitle" value="${title0}" placeholder="العنوان" required style="display:block;width:100%;margin:6px 0;padding:10px;border:1px solid #e5e7eb;border-radius:12px">
      <textarea id="pBody" placeholder="وصف (اختياري)" style="display:block;width:100%;margin:6px 0;padding:10px;border:1px solid #e5e7eb;border-radius:12px;min-height:80px">${body0}</textarea>

      <div style="margin:10px 0 6px;font-weight:700">الوسائط</div>
      <div id="mediaRows"></div>
      <div style="display:flex;gap:8px;margin:8px 0">
        <button type="button" id="addMedia" style="background:#0f172a;color:#fff;border:none;border-radius:12px;padding:8px 12px;cursor:pointer">+ إضافة وسيط</button>
        <span style="font-size:12px;color:#64748b">الحد الأقصى ${maxItems} عناصر</span>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px">
        <button type="submit" style="background:#0f172a;color:#fff;border:none;border-radius:12px;padding:10px 14px;cursor:pointer">${isEdit?'حفظ التعديلات':'حفظ'}</button>
        <button type="button" id="closeForms" style="background:#f1f5f9;color:#0f172a;border:none;border-radius:12px;padding:10px 14px;cursor:pointer">إغلاق</button>
      </div>
    </form>
  </div>`;

  const rowsEl = document.getElementById('mediaRows');
  const addBtn = document.getElementById('addMedia');

  const addRow = (type='image', url='')=>{
    if (rowsEl.children.length >= maxItems) return alert(`وصلت للحد (${maxItems})`);
    rowsEl.insertAdjacentHTML('beforeend', rowTpl(type, url));
  };

  // ملء الصفوف من البيانات القديمة
  if (media0.length){
    media0.forEach(m=> addRow(m.type||'link', m.url||''));
  }else{
    addRow(); // صف واحد افتراضي
  }

  // أحداث الإضافة/الحذف
  addBtn.onclick = ()=> addRow();
  rowsEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.mremove');
    if (btn){ btn.parentElement.remove(); }
  });

  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('postForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('pTitle').value.trim();
      const body =document.getElementById('pBody').value.trim();

      // قراءة الصفوف بالترتيب
      const rows = [...rowsEl.querySelectorAll('.mrow')];
      const media = rows.map((row,idx)=>{
        const type = row.querySelector('.mtype').value;
        const url  = row.querySelector('.murl').value.trim();
        return { type, url, sort: idx };
      }).filter(m=>m.url);

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

// واجبات
function mountHWForm(hw=null){
  const isEdit = !!(hw && hw.id);
  const title0 = esc(hw?.title||'');
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="hwForm" style="background:#fff;padding:16px;border-radius:16px;max-width:520px;width:92%;box-shadow:0 20px 50px rgba(0,0,0,.25)">
      <h3 style="margin:0 0 8px 0">${isEdit?'تعديل واجب':'واجب جديد'}</h3>
      <input id="hTitle" value="${title0}" placeholder="مثال: &lt;span class='badge badge-amber'&gt;H,W&lt;/span&gt;p.231" required style="display:block;width:100%;margin:6px 0;padding:10px;border:1px solid #e5e7eb;border-radius:12px">
      <div style="display:flex;gap:8px;margin-top:10px">
        <button type="submit" class="save" style="background:#0f172a;color:#fff;border:none;border-radius:12px;padding:10px 14px;cursor:pointer">${isEdit?'حفظ التعديلات':'حفظ'}</button>
        <button type="button" id="closeForms" style="background:#f1f5f9;color:#0f172a;border:none;border-radius:12px;padding:10px 14px;cursor:pointer">إغلاق</button>
      </div>
    </form>
  </div>`;
  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('hwForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('hTitle').value.trim();
      if (isEdit){ await updateDoc(doc(db,'homeworks',hw.id), { title }); }
      else { await addDoc(collection(db,'homeworks'),{ title, published_at:serverTimestamp() }); }
      formsRoot.innerHTML='';
      alert(isEdit?'تم حفظ التعديلات':'تم حفظ الواجب');
    }catch(err){ alert('تعذّر الحفظ: '+err.message); }
  };
}

/* الاختبارات: إضافة/تعديل/حذف ضمن مجموعة exam */
function mountExamForm(ex=null){
  const isEdit = !!(ex && ex.id);
  const title0 = esc(ex?.title||'');
  formsRoot.innerHTML=`
  <div style="position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center">
    <form id="exForm" style="background:#fff;padding:16px;border-radius:16px;max-width:520px;width:92%;box-shadow:0 20px 50px rgba(0,0,0,.25)">
      <h3 style="margin:0 0 8px 0">${isEdit?'تعديل اختبار':'اختبار جديد'}</h3>
      <input id="eTitle" value="${title0}" placeholder="عنوان/وصف الاختبار" required style="display:block;width:100%;margin:6px 0;padding:10px;border:1px solid #e5e7eb;border-radius:12px">
      <div style="display:flex;gap:8px;margin-top:10px">
        <button type="submit" class="save" style="background:#0f172a;color:#fff;border:none;border-radius:12px;padding:10px 14px;cursor:pointer">${isEdit?'حفظ التعديلات':'حفظ'}</button>
        <button type="button" id="closeForms" style="background:#f1f5f9;color:#0f172a;border:none;border-radius:12px;padding:10px 14px;cursor:pointer">إغلاق</button>
      </div>
    </form>
  </div>`;
  document.getElementById('closeForms').onclick=()=>formsRoot.innerHTML='';
  document.getElementById('exForm').onsubmit=async(e)=>{
    e.preventDefault();
    try{
      const title=document.getElementById('eTitle').value.trim();
      if (isEdit){
        await updateDoc(doc(db,'exam',ex.id), { title });
      }else{
        await addDoc(collection(db,'exam'),{ title, published_at:serverTimestamp() });
      }
      formsRoot.innerHTML='';
      alert('تم الحفظ');
    }catch(err){
      alert('تعذّر الحفظ: '+err.message);
    }
  };
}
