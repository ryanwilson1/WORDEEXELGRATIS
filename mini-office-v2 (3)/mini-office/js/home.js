/**
 * MINI OFFICE — Home Controller v2
 */

const Home = (() => {

  async function show() {
    const home = document.getElementById('home');
    if (!home) return;
    home.classList.remove('hidden');
    await loadRecentFiles();
    updateOfflineStatus();
    window.addEventListener('online',  updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
  }

  function hide() {
    const home = document.getElementById('home');
    if (home) home.classList.add('hidden');
  }

  function updateOfflineStatus() {
    const badge = document.getElementById('offline-badge');
    const text  = document.getElementById('status-text');
    if (!badge || !text) return;
    if (navigator.onLine) {
      text.textContent = 'Online';
      badge.style.color = 'var(--green)';
    } else {
      text.textContent = 'Offline';
      badge.style.color = 'var(--amber)';
    }
  }

  async function loadRecentFiles() {
    const container = document.getElementById('recent-files');
    if (!container) return;

    try {
      const [docs, sheets] = await Promise.all([
        Storage.listDocuments(),
        Storage.listSheets()
      ]);

      const all = [
        ...docs.map(d => ({ ...d, fileType: 'doc' })),
        ...sheets.map(s => ({ ...s, fileType: 'sheet' }))
      ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      if (all.length === 0) {
        container.innerHTML = '<div class="no-files">Nenhum arquivo recente. Crie seu primeiro documento!</div>';
        return;
      }

      container.innerHTML = all.slice(0, 8).map(item => {
        const date = formatDate(item.updatedAt);
        const icon = item.fileType === 'doc' ? '📄' : '📊';
        const cls  = item.fileType === 'doc' ? 'docs' : 'sheets';
        return `
          <div class="recent-item" onclick="openRecent('${item.id}', '${item.fileType}')">
            <div class="recent-item-icon ${cls}">${icon}</div>
            <span class="recent-item-name">${escapeHTML(item.title)}</span>
            <span class="recent-item-date">${date}</span>
            <button class="recent-item-del" onclick="deleteRecent(event,'${item.id}','${item.fileType}')" title="Excluir">✕</button>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('[Home] loadRecentFiles error:', err);
      container.innerHTML = '<div class="no-files">Erro ao carregar arquivos.</div>';
    }
  }

  function formatDate(isoStr) {
    try {
      const d = new Date(isoStr);
      const diffMs  = Date.now() - d;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr  = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      if (diffMin < 1)  return 'Agora';
      if (diffMin < 60) return `${diffMin}min atrás`;
      if (diffHr  < 24) return `${diffHr}h atrás`;
      if (diffDay <  7) return `${diffDay}d atrás`;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  return { show, hide, loadRecentFiles };
})();

// ── Global helpers ─────────────────────────────
function openApp(type) {
  Home.hide();
  if (type === 'docs')   Docs.open();
  if (type === 'sheets') Sheets.open();
}

function openRecent(id, type) {
  Home.hide();
  if (type === 'doc')   Docs.open(id);
  if (type === 'sheet') Sheets.open(id);
}

async function deleteRecent(event, id, type) {
  event.stopPropagation();
  if (!confirm('Excluir este arquivo permanentemente?')) return;
  try {
    if (type === 'doc')   await Storage.deleteDocument(id);
    if (type === 'sheet') await Storage.deleteSheet(id);
    await Home.loadRecentFiles();
    showToast('Arquivo excluído', 'success');
  } catch (err) {
    showToast('Erro ao excluir', 'error');
  }
}

function goHome() {
  const docsWindow   = document.getElementById('app-docs');
  const sheetsWindow = document.getElementById('app-sheets');

  let hasUnsaved = false;
  if (docsWindow   && !docsWindow.classList.contains('hidden'))   hasUnsaved = Docs.hasUnsaved?.();
  if (sheetsWindow && !sheetsWindow.classList.contains('hidden')) hasUnsaved = Sheets.hasUnsaved?.();

  if (hasUnsaved) {
    if (!confirm('Você possui alterações não salvas.\nDeseja sair mesmo assim?')) return;
  }

  docsWindow?.classList.add('hidden');
  sheetsWindow?.classList.add('hidden');
  document.getElementById('home').classList.remove('hidden');
  Home.loadRecentFiles();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}
