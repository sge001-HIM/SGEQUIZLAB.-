import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getFirestore, collection, query, where,
  getDocs, deleteDoc, doc, orderBy
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db, auth } from "./firebase.js";

// ── STATE ─────────────────────────────────────────────────────
let currentUser = null;
let myQuizzes   = [];
let publicQuizzes = [];
let pendingDeleteId = null;

// ── INIT ──────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  initDashboard();
});

function initDashboard() {
  setUserInfo();
  loadAll();
  bindNav();
  bindSearch();
  bindSidebar();
}

// ── USER INFO ─────────────────────────────────────────────────
function setUserInfo() {
  const email     = currentUser.email || "";
  const name      = currentUser.displayName || email.split("@")[0];
  const initials  = name.slice(0, 2).toUpperCase();

  qsa(".user-name").forEach(el => el.textContent = name);
  qsa(".user-email").forEach(el => el.textContent = email);
  qsa(".user-avatar").forEach(el => el.textContent = initials);
  qs("#welcome-name") && (qs("#welcome-name").textContent = name);
}

// ── NAV ───────────────────────────────────────────────────────
function bindNav() {
  qsa(".nav-item[data-panel]").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.panel;
      switchPanel(target);
      qsa(".nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      closeSidebar();
    });
  });

  qs("#btn-logout") && qs("#btn-logout").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

function switchPanel(name) {
  qsa(".panel").forEach(p => p.classList.remove("active"));
  const target = qs("#panel-" + name);
  if (target) target.classList.add("active");
  qs("#topbar-title") && (qs("#topbar-title").textContent = {
    overview:  "Overview",
    myquizzes: "My Quizzes",
    public:    "Public Quizzes"
  }[name] || "Dashboard");
}

// ── SIDEBAR MOBILE ────────────────────────────────────────────
function bindSidebar() {
  qs("#mobile-toggle") && qs("#mobile-toggle").addEventListener("click", () => {
    qs(".sidebar").classList.toggle("open");
  });
  qs("#sidebar-backdrop") && qs("#sidebar-backdrop").addEventListener("click", closeSidebar);
}

function closeSidebar() {
  qs(".sidebar") && qs(".sidebar").classList.remove("open");
}

// ── LOAD ALL DATA ─────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadMyQuizzes(), loadPublicQuizzes()]);
  await loadStats();
}

// ── MY QUIZZES ────────────────────────────────────────────────
async function loadMyQuizzes() {
  const container = qs("#my-quizzes-grid");
  const countEl   = qs("#my-quizzes-count");
  if (!container) return;

  container.innerHTML = loadingHTML();

  try {
    const snap = await getDocs(
      query(collection(db, "quizzes"), where("createdBy", "==", currentUser.uid))
    );

    myQuizzes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    myQuizzes.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

    if (countEl) countEl.textContent = myQuizzes.length;
    renderMyQuizzes(myQuizzes, container);
  } catch (e) {
    container.innerHTML = errorHTML("Failed to load your quizzes: " + e.message);
  }
}

function renderMyQuizzes(list, container) {
  if (!list.length) {
    container.innerHTML = emptyHTML(
      svgBook(),
      "No quizzes yet",
      "Create your first quiz using the quiz creator."
    );
    return;
  }

  container.innerHTML = "";
  list.forEach((quiz, i) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.style.animationDelay = (i * 0.04) + "s";

    const date       = quiz.createdAt ? fmtDate(quiz.createdAt.toDate()) : "Unknown date";
    const qCount     = quiz.questions?.length || 0;
    const attempts   = quiz.attemptCount || 0;
    const visibility = quiz.visibility === "public" ? "public" : "private";

    card.innerHTML = `
      <div class="quiz-card-header">
        <div class="quiz-icon">${svgDoc()}</div>
        <div class="quiz-title-block">
          <div class="quiz-title" title="${esc(quiz.title)}">${esc(quiz.title)}</div>
          <div class="quiz-meta">
            <span>${qCount} question${qCount !== 1 ? "s" : ""}</span>
            <span class="meta-dot">${attempts} attempt${attempts !== 1 ? "s" : ""}</span>
            <span class="meta-dot">${date}</span>
          </div>
        </div>
      </div>
      <div class="quiz-badges">
        <span class="badge badge-blue">${qCount} Qs</span>
        <span class="badge ${visibility === "public" ? "badge-green" : "badge-gray"}">${visibility}</span>
      </div>
      <div class="quiz-actions">
        <a href="quiz.html?id=${quiz.id}" class="btn btn-primary btn-sm" target="_blank">Start</a>
        <button class="btn btn-ghost btn-sm" onclick="copyQuizLink('${quiz.id}')">Copy Link</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete('${quiz.id}', '${esc(quiz.title).replace(/'/g, "\\'")}')">Delete</button>
      </div>`;

    container.appendChild(card);
  });
}

// ── PUBLIC QUIZZES ────────────────────────────────────────────
async function loadPublicQuizzes() {
  const container = qs("#public-quizzes-grid");
  const countEl   = qs("#public-quizzes-count");
  if (!container) return;

  container.innerHTML = loadingHTML();

  try {
    const snap = await getDocs(
      query(collection(db, "quizzes"), where("visibility", "==", "public"))
    );

    publicQuizzes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    publicQuizzes.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

    if (countEl) countEl.textContent = publicQuizzes.length;
    renderPublicQuizzes(publicQuizzes, container);
  } catch (e) {
    container.innerHTML = errorHTML("Failed to load public quizzes: " + e.message);
  }
}

function renderPublicQuizzes(list, container) {
  if (!list.length) {
    container.innerHTML = emptyHTML(
      svgGlobe(),
      "No public quizzes",
      "There are no public quizzes available yet."
    );
    return;
  }

  container.innerHTML = "";
  list.forEach((quiz, i) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.style.animationDelay = (i * 0.04) + "s";

    const date   = quiz.createdAt ? fmtDate(quiz.createdAt.toDate()) : "Unknown date";
    const qCount = quiz.questions?.length || 0;

    card.innerHTML = `
      <div class="quiz-card-header">
        <div class="quiz-icon public">${svgGlobe()}</div>
        <div class="quiz-title-block">
          <div class="quiz-title" title="${esc(quiz.title)}">${esc(quiz.title)}</div>
          <div class="quiz-meta">
            <span>${qCount} question${qCount !== 1 ? "s" : ""}</span>
            <span class="meta-dot">${date}</span>
          </div>
        </div>
      </div>
      <div class="quiz-badges">
        <span class="badge badge-green">Public</span>
        <span class="badge badge-blue">${qCount} Qs</span>
      </div>
      <div class="quiz-actions">
        <a href="quiz.html?id=${quiz.id}" class="btn btn-primary btn-sm" target="_blank">Start Quiz</a>
        <button class="btn btn-ghost btn-sm" onclick="copyQuizLink('${quiz.id}')">Copy Link</button>
      </div>`;

    container.appendChild(card);
  });
}

// ── STATS ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const attSnap = await getDocs(
      query(collection(db, "attempts"), where("quizId", "in",
        myQuizzes.length ? myQuizzes.map(q => q.id).slice(0, 10) : ["__none__"]
      ))
    );

    const attempts = attSnap.docs.map(d => d.data());
    const myAttempts = attempts.filter(a => a.studentName || a.userId);

    const totalAttempts  = attempts.length;
    const scores         = attempts.map(a => a.percentage || 0);
    const highestScore   = scores.length ? Math.max(...scores) : 0;
    const averageScore   = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    setStatCard("stat-total-quizzes",  myQuizzes.length);
    setStatCard("stat-total-attempts", totalAttempts);
    setStatCard("stat-highest-score",  highestScore + "%");
    setStatCard("stat-average-score",  averageScore + "%");
  } catch (e) {
    setStatCard("stat-total-quizzes",  myQuizzes.length);
    setStatCard("stat-total-attempts", "-");
    setStatCard("stat-highest-score",  "-");
    setStatCard("stat-average-score",  "-");
  }
}

function setStatCard(id, value) {
  const el = qs("#" + id);
  if (el) el.textContent = value;
}

// ── SEARCH ────────────────────────────────────────────────────
function bindSearch() {
  const mySearch     = qs("#search-my");
  const publicSearch = qs("#search-public");

  if (mySearch) {
    mySearch.addEventListener("input", () => {
      const term = mySearch.value.toLowerCase().trim();
      const filtered = term
        ? myQuizzes.filter(q => q.title.toLowerCase().includes(term))
        : myQuizzes;
      renderMyQuizzes(filtered, qs("#my-quizzes-grid"));
    });
  }

  if (publicSearch) {
    publicSearch.addEventListener("input", () => {
      const term = publicSearch.value.toLowerCase().trim();
      const filtered = term
        ? publicQuizzes.filter(q => q.title.toLowerCase().includes(term))
        : publicQuizzes;
      renderPublicQuizzes(filtered, qs("#public-quizzes-grid"));
    });
  }
}

// ── DELETE ────────────────────────────────────────────────────
window.confirmDelete = (id, title) => {
  pendingDeleteId = id;
  const modal = qs("#delete-modal");
  const body  = qs("#delete-modal-body");
  if (body)  body.textContent = `Delete "${title}"? All attempt records for this quiz will also be removed. This cannot be undone.`;
  if (modal) modal.classList.add("open");
};

qs("#btn-confirm-delete") && qs("#btn-confirm-delete").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const btn = qs("#btn-confirm-delete");
  btn.disabled = true;
  btn.textContent = "Deleting...";
  try {
    await deleteDoc(doc(db, "quizzes", pendingDeleteId));
    const attSnap = await getDocs(
      query(collection(db, "attempts"), where("quizId", "==", pendingDeleteId))
    );
    await Promise.all(attSnap.docs.map(d => deleteDoc(doc(db, "attempts", d.id))));
    closeDeleteModal();
    toast("Quiz deleted.", "success");
    await loadMyQuizzes();
    await loadStats();
  } catch (e) {
    toast("Delete failed: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete";
    pendingDeleteId = null;
  }
});

qs("#btn-cancel-delete") && qs("#btn-cancel-delete").addEventListener("click", closeDeleteModal);

function closeDeleteModal() {
  const modal = qs("#delete-modal");
  if (modal) modal.classList.remove("open");
}

// ── COPY LINK ─────────────────────────────────────────────────
window.copyQuizLink = (id) => {
  const url = location.origin + "/quiz.html?id=" + id;
  navigator.clipboard.writeText(url)
    .then(() => toast("Link copied to clipboard.", "success"))
    .catch(() => toast("Could not copy. Try manually.", "error"));
};

// ── TOAST ─────────────────────────────────────────────────────
function toast(message, type) {
  const container = qs(".toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, 2800);
  setTimeout(() => el.remove(), 3200);
}

// ── HELPERS ───────────────────────────────────────────────────
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function loadingHTML() {
  return `<div class="loading-block"><div class="spinner spinner-lg"></div><span>Loading...</span></div>`;
}

function errorHTML(msg) {
  return `<div class="empty-state"><div class="empty-title" style="color:#dc2626">Error</div><div class="empty-desc">${esc(msg)}</div></div>`;
}

function emptyHTML(icon, title, desc) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-desc">${desc}</div></div>`;
}

function svgDoc() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
}

function svgGlobe() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
}

function svgBook() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
}
