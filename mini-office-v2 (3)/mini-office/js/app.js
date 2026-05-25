/**
 * MINI OFFICE — App Controller v2
 */

// ── Toast Notifications ─────────────────────────
function showToast(message, type = 'default', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✓', error: '✕', info: 'ℹ', default: '·' };
  toast.innerHTML = `<span>${icons[type] || '·'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ── PWA / Service Worker ───────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

// ── Font Size Control for Docs ─────────────────
let currentFontSize = 11; // pt

function changeFontSize(delta) {
  const docsWindow = document.getElementById('app-docs');
  if (!docsWindow || docsWindow.classList.contains('hidden')) return;

  currentFontSize = Math.max(7, Math.min(36, currentFontSize + delta));
  const el = document.getElementById('quill-editor');
  if (el) el.style.fontSize = currentFontSize + 'pt';
  const display = document.getElementById('font-size-display');
  if (display) display.textContent = currentFontSize;
}

// ── Startup ─────────────────────────────────────
async function init() {
  try {
    await Storage.init();
    registerServiceWorker();
    Docs.setupKeyboard();
    Docs.setupUnloadWarning();
    Splash.show();
    console.log('[App] MINI OFFICE v2 initialized ✓');
  } catch (err) {
    console.error('[App] Init error:', err);
    document.getElementById('splash')?.classList.add('hidden');
    Home.show();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
