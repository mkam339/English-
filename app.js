// ===== Firebase SDKs =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ===== Config الخاص بك =====
const firebaseConfig = {
  apiKey: "AIzaSyAWjjaE-VO_nzW3DHbdMGCwIjzq8EjexzY",
  authDomain: "english-726f0.firebaseapp.com",
  projectId: "english-726f0",
  storageBucket: "english-726f0.firebasestorage.app",
  messagingSenderId: "177682654566",
  appId: "1:177682654566:web:8683b37114f8ee3b66d4a7",
  measurementId: "G-WCJZHHSE7X"
};

// ===== Init =====
const app = initializeApp(firebaseConfig);
getAnalytics(app);
console.log("✅ Firebase تم تهيئته بنجاح:", app);

const auth = getAuth(app);
const db   = getFirestore(app);

// ===== DOM helpers =====
const qs = s => document.querySelector(s);
const ce = (tag, attrs={}) => Object.assign(document.createElement(tag), attrs);

// عناصر الواجهة الموجودة في index.html
const adminBar      = qs('#adminBar');
const adminEmailEl  = qs('#adminEmail');
const loginModal    = qs('#loginModal');
const loginForm     = qs('#loginForm');

const postsLive     = qs('#postsLive');
const hwsLive       = qs('#homeworksLive');
const examLive      = qs('#examLive');

const btnNewPost    = qs('#newPostBtn');
const btnNewHw      = qs('#newHwBtn');
const btnEditExam   = qs('#editExamBtn');
const btnLogout     = qs('#logoutBtn');

let isAdmin = false;

// ===== التحقق من الأدمن من Firestore (config/admins.emails) =====
async function checkAdmin(email){
  try{
    const ref = doc(db, 'config', 'admins');
    const snap = await getDoc(ref);
    const emails = snap.exists() ? snap.data().emails || [] : [];
    return Array.isArray(emails) && emails.includes(email);
  }catch(e){
    console.error("checkAdmin error:", e);
    return false;
  }
}

// ===== حالة تسجيل الدخول =====
onAuthStateChanged(auth, async user=>{
  try{
    if(user){
      isAdmin = await checkAdmin(user.email);
      adminBar && (adminBar.style.display = isAdmin ? 'block' : 'none');
      if (adminEmailEl) adminEmailEl.textContent = isAdmin ? user.email : '';
      if (isAdmin && loginModal) loginModal.style.display = 'none';
    }else{
      isAdmin = false;
      adminBar && (adminBar.style.display = 'none');
      if (adminEmailEl) adminEmailEl.textContent = '';
      // نظهر نافذة الدخول للزائر
      if (loginModal) loginModal.style.display = 'flex';
    }
  }catch(err){
    console.error("auth state error:", err);
  }
});

// ===== تسجيل الدخول =====
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = qs('#email')?.value.trim();
  const password = qs('#password')?.value;
  const errBox = qs('#loginError');
  try{
    errBox && (errBox.style.display = 'none');
    await signInWithEmailAndPassword(auth, email, password);
  }catch(err){
    console.error(err);
    if (errBox){
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } else {
      alert("خطأ تسجيل الدخول: " + err.message);
    }
  }
});

// ===== تسجيل الخروج =====
btnLogout?.addEventListener('click', async ()=>{
  try{
    await signOut(auth);
    location.reload();
  }catch(err){
    console.error(err);
    alert("تعذر تسجيل الخروج: " + err.message);
  }
});

// ===== عرض حقيقي (Realtime) =====
function renderPosts(snapshot){
  if (!postsLive) return;
  postsLive.innerHTML = '';
  snapshot.forEach(docSnap=>{
    const d = docSnap.data();
    const wrap = ce('div', {className:'post'});
    const title = ce('h2', {textContent: d.title || 'منشور بدون عنوان'});
    const meta  = ce('p', {className:'meta', textContent: `${d.author||''} — ${d.date||''}`});
    wrap.append(title, meta);
    if(d.text) wrap.append(ce('p', {textContent:d.text}));

    if(Array.isArray(d.images) && d.images.length){
      const grid = ce('div', {className:'media-grid'});
      d.images.forEach(u=> grid.append(ce('img', {src:u, alt:'صورة'})));
      wrap.append(grid);
    }
    if(Array.isArray(d.videos) && d.videos.length){
      const grid = ce('div', {className:'media-grid'});
      d.videos.forEach(u=> grid.append(ce('video', {src:u, controls:true})));
      wrap.append(grid);
    }

    if(isAdmin){
      const actions = ce('div', {className:'actions-inline'});
      const editBtn = ce('button', {textContent:'تعديل'});
      const delBtn  = ce('button', {textContent:'حذف'});
      editBtn.onclick = ()=> editPost(docSnap.id, d);
      delBtn.onclick  = async ()=> {
        if(confirm('حذف هذا المنشور؟')) await deleteDoc(doc(db,'posts',docSnap.id));
      };
      actions.append(editBtn, delBtn);
      wrap.append(actions);
    }

    postsLive.append(wrap);
  });
}

function renderHomeworks(snapshot){
  if (!hwsLive) return;
  hwsLive.innerHTML = '';
  snapshot.forEach(docSnap=>{
    const d = docSnap.data();
    const item = ce('div', {className:'item'});
    const title = d.title || 'واجب';
    const due   = d.due   || '';
    item.innerHTML = `<div><span class="badge badge-amber">H,W</span> ${title}</div>
                      <div class="due">${due}</div>`;
    if(isAdmin){
      const actions = ce('div', {className:'actions-inline'});
      const editBtn = ce('button', {textContent:'تعديل'});
      const delBtn  = ce('button', {textContent:'حذف'});
      editBtn.onclick = ()=> editHomework(docSnap.id, d);
      delBtn.onclick  = async ()=> {
        if(confirm('حذف الواجب؟')) await deleteDoc(doc(db,'homeworks',docSnap.id));
      };
      actions.append(editBtn, delBtn);
      item.append(actions);
    }
    hwsLive.append(item);
  });
}

function renderExam(docSnap){
  if (!examLive) return;
  examLive.innerHTML = '';
  if(!docSnap.exists()){
    examLive.innerHTML = `<div class="item"><div><span class="badge badge-amber">امتحان</span> لا يوجد منشور امتحان بعد</div></div>`;
    return;
  }
  const d = docSnap.data();
  const item = ce('div', {className:'item'});
  item.innerHTML = `<div><span class="badge badge-amber">امتحان</span> ${d.title||'Exam'}</div>
                    <div class="due">${d.publishedAt||''}</div>`;
  examLive.append(item);
}

// اشتراكات realtime
const postsQuery = query(collection(db,'posts'), orderBy('createdAt','desc'));
onSnapshot(postsQuery, renderPosts);
const hwsQuery   = query(collection(db,'homeworks'), orderBy('createdAt','desc'));
onSnapshot(hwsQuery, renderHomeworks);
onSnapshot(doc(db,'exam','main'), renderExam);

// ===== إجراءات الأدمن (بدون أي عناصر إضافية) =====
btnNewPost?.addEventListener('click', async ()=>{
  if(!isAdmin) return alert('صلاحيات الأدمن فقط');
  const title = prompt('عنوان المنشور:');
  if(title === null) return;
  const author = prompt('اسم الطالب/المعلم (اختياري):') || '';
  const date   = prompt('التاريخ (مثال 10/09/2025):') || '';
  const text   = prompt('وصف/نص المنشور (اختياري):') || '';
  const imgs   = prompt('روابط الصور (افصل بفاصلة)، اختياري:') || '';
  const vids   = prompt('روابط الفيديو (افصل بفاصلة)، اختياري:') || '';
  try{
    await addDoc(collection(db,'posts'), {
      title, author, date, text,
      images: imgs.split(',').map(s=>s.trim()).filter(Boolean).slice(0,5),
      videos: vids.split(',').map(s=>s.trim()).filter(Boolean).slice(0,5),
      createdAt: serverTimestamp()
    });
    alert('تم إضافة المنشور ✅');
  }catch(err){
    console.error(err); alert('فشل الإضافة: ' + err.message);
  }
});

async function editPost(id, d){
  if(!isAdmin) return;
  const title = prompt('تعديل العنوان:', d.title||'');
  if(title===null) return;
  const author = prompt('تعديل الاسم:', d.author||'') ?? '';
  const date   = prompt('تعديل التاريخ:', d.date||'') ?? '';
  const text   = prompt('تعديل الوصف:', d.text||'') ?? '';
  const imgs   = prompt('تعديل روابط الصور (مفصولة بفواصل):', (d.images||[]).join(', ')) ?? '';
  const vids   = prompt('تعديل روابط الفيديو:', (d.videos||[]).join(', ')) ?? '';
  try{
    await updateDoc(doc(db,'posts',id), {
      title, author, date, text,
      images: imgs.split(',').map(s=>s.trim()).filter(Boolean).slice(0,5),
      videos: vids.split(',').map(s=>s.trim()).filter(Boolean).slice(0,5),
    });
    alert('تم التعديل ✅');
  }catch(err){
    console.error(err); alert('فشل التعديل: ' + err.message);
  }
}

btnNewHw?.addEventListener('click', async ()=>{
  if(!isAdmin) return alert('صلاحيات الأدمن فقط');
  const title = prompt('نص الواجب (مثال p.231):');
  if(title===null) return;
  const due   = prompt('تاريخ النشر/التسليم:') || '';
  try{
    await addDoc(collection(db,'homeworks'), { title, due, createdAt: serverTimestamp() });
    alert('تم إضافة الواجب ✅');
  }catch(err){
    console.error(err); alert('فشل الإضافة: ' + err.message);
  }
});

async function editHomework(id, d){
  if(!isAdmin) return;
  const title = prompt('تعديل نص الواجب:', d.title||'');
  if(title===null) return;
  const due   = prompt('تعديل التاريخ:', d.due||'') ?? '';
  try{
    await updateDoc(doc(db,'homeworks',id), { title, due });
    alert('تم التعديل ✅');
  }catch(err){
    console.error(err); alert('فشل التعديل: ' + err.message);
  }
}

btnEditExam?.addEventListener('click', async ()=>{
  if(!isAdmin) return alert('صلاحيات الأدمن فقط');
  const title = prompt('نص منشور الامتحان (مثال: اختبار مفردات يوم الأحد 9:00 صباحًا — القاعة A):');
  if(title===null) return;
  const publishedAt = prompt('تاريخ النشر:') || '';
  try{
    await setDoc(doc(db,'exam','main'), { title, publishedAt, updatedAt: serverTimestamp() });
    alert('تم حفظ/تعديل الامتحان ✅');
  }catch(err){
    console.error(err); alert('فشل حفظ الامتحان: ' + err.message);
  }
});
