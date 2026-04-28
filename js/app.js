// ============================================================
//  Nails by Yadi — App Utilities
// ============================================================

// ── Language ─────────────────────────────────────────────────
let currentLang = localStorage.getItem('nby_lang') || 'es';

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('nby_lang', lang);
  document.querySelectorAll('[data-es],[data-en]').forEach(el => {
    const val = el.getAttribute('data-' + lang);
    if (!val) return;
    // Use innerHTML so <span> tags inside translations render correctly
    el.innerHTML = val;
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  document.querySelectorAll('[data-ph-es],[data-ph-en]').forEach(el => {
    el.placeholder = el.getAttribute('data-ph-' + lang) || '';
  });
}

function t(es, en) { return currentLang === 'es' ? es : en; }

// ── Navbar scroll effect ─────────────────────────────────────
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const update = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', update, { passive: true });
  update();

  // Lang buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Hamburger
  const ham = document.querySelector('.hamburger');
  const mob = document.querySelector('.mobile-menu');
  if (ham && mob) {
    ham.addEventListener('click', () => mob.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!nav.contains(e.target)) mob.classList.remove('open');
    });
  }
}

// ── Toast notifications ──────────────────────────────────────
function showToast(msg, type, duration) {
  if (type === undefined) type = 'info';
  if (duration === undefined) duration = 4000;
  var wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  var icons = { success:'OK', warning:'!!', error:'X', info:'i' };
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span class="toast-icon">' + (icons[type]||'i') + '</span><span>' + msg + '</span><button class="toast-close" onclick="this.parentElement.remove()">x</button>';
  wrap.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, duration);
}

// ── Date helpers ─────────────────────────────────────────────
function formatDate(dateStr, lang) {
  var d = new Date(dateStr + 'T12:00:00');
  var optES = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  var optEN = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  var locale = lang === 'en' ? 'en-US' : 'es-ES';
  return d.toLocaleDateString(locale, lang === 'en' ? optEN : optES);
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function addDays(dateStr, n) {
  var d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function isSunday(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay() === 0;
}

// ── Currency ─────────────────────────────────────────────────
function usd(n) { return '$' + n.toFixed(0); }

// ── Service lookup ───────────────────────────────────────────
function getServiceById(id)  { return SERVICES.find(function(s){ return s.id === id; }); }
function getServiceName(id)  { var s = getServiceById(id); return s ? s['name_' + currentLang] : id; }
function getServicePrice(id) { var s = getServiceById(id); return s ? s.price : 0; }

// ── Init on DOM ready ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initNavbar();
  setLang(currentLang);
  // Limpia citas/cola de demostraciones antiguas (una sola vez)
  if (typeof cleanupStaleDemo === 'function') cleanupStaleDemo();
  if (typeof seedDemoData === 'function') seedDemoData();
});
