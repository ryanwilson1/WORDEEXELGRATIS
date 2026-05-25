/**
 * MINI OFFICE — MINI DOCS v2.2
 * Multi-page support, font size control, proper Quill config
 */

const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = ['8pt','9pt','10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt','28pt','32pt','36pt','48pt','72pt'];
Quill.register(SizeStyle, true);

const Docs = (() => {
  let quill = null;
  let currentDocId = null;
  let autosaveTimer = null;
  let isDirty = false;
  let isInitialized = false;
  let pageObserver = null;

  const DEFAULT_SIZE = '12pt';
  const PAGE_HEIGHT_PX = 970; // A4 content area ~257mm at 96dpi

  // ── Multi-page ────────────────────────────────
  function updatePages() {
    const editor = document.getElementById('quill-editor');
    const container = document.getElementById('pages-container');
    if (!editor || !container) return;

    const contentHeight = editor.scrollHeight;
    const pagesNeeded = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT_PX));
    const existing = container.querySelectorAll('.a4-page').length;

    if (pagesNeeded > existing) {
      for (let i = existing + 1; i <= pagesNeeded; i++) {
        const page = document.createElement('div');
        page.className = 'a4-page a4-page--ghost';
        page.id = 'page-' + i;
        page.setAttribute('data-page', i);
        container.appendChild(page);
      }
    } else if (pagesNeeded < existing) {
      container.querySelectorAll('.a4-page--ghost').forEach((p, idx) => {
        if (idx >= pagesNeeded - 1) p.remove();
      });
    }

    const page1 = document.getElementById('page-1');
    if (page1) page1.style.height = Math.max(PAGE_HEIGHT_PX, contentHeight + 60) + 'px';

    const badge = document.getElementById('page-count');
    if (badge) badge.textContent = pagesNeeded + (pagesNeeded === 1 ? ' página' : ' páginas');
  }

  function startPageObserver() {
    const editor = document.getElementById('quill-editor');
    if (!editor || pageObserver) return;
    pageObserver = new ResizeObserver(() => updatePages());
    pageObserver.observe(editor);
    updatePages();
  }

  // ── Initialize Quill ──────────────────────────
  function initQuill() {
    if (isInitialized) return;

    quill = new Quill('#quill-editor', {
      theme: 'snow',
      modules: {
        toolbar: { container: '#quill-toolbar' },
        history: { delay: 800, maxStack: 500, userOnly: true },
      },
      placeholder: 'Comece a digitar seu documento...',
    });

    quill.root.style.fontSize     = DEFAULT_SIZE;
    quill.root.style.lineHeight   = '1.75';
    quill.root.style.fontFamily   = 'Nunito, sans-serif';
    quill.root.style.whiteSpace   = 'pre-wrap';
    quill.root.style.wordBreak    = 'break-word';
    quill.root.style.overflowWrap = 'break-word';

    quill.on('text-change', () => {
      markDirty();
      scheduleAutosave();
      updateSaveStatus('pending');
      updatePages();
    });

    quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
      delta.ops = delta.ops.map(op => {
        if (op.attributes) {
          delete op.attributes.script;
          delete op.attributes.onclick;
          delete op.attributes.onerror;
        }
        return op;
      });
      return delta;
    });

    quill.on('selection-change', (range) => {
      if (!range) return;
      updateSizeDisplay(quill.getFormat(range).size || DEFAULT_SIZE);
    });

    startPageObserver();
    isInitialized = true;
  }

  // ── Font Size ─────────────────────────────────
  const SIZES = ['8pt','9pt','10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt','28pt','32pt','36pt','48pt','72pt'];

  function updateSizeDisplay(size) {
    const el = document.getElementById('font-size-display');
    if (el) el.textContent = (size || DEFAULT_SIZE).replace('pt', '');
  }

  window.changeFontSize = function(delta) {
    if (!quill) return;
    const range = quill.getSelection(true);
    if (!range) return;
    const cur = quill.getFormat(range).size || DEFAULT_SIZE;
    const idx = SIZES.indexOf(cur);
    const newIdx = Math.max(0, Math.min(SIZES.length - 1, (idx === -1 ? SIZES.indexOf(DEFAULT_SIZE) : idx) + delta));
    quill.format('size', SIZES[newIdx], 'user');
    updateSizeDisplay(SIZES[newIdx]);
  };

  // ── Open ──────────────────────────────────────
  async function open(docId = null) {
    const appWindow = document.getElementById('app-docs');
    if (!appWindow) return;
    appWindow.classList.remove('hidden');

    requestAnimationFrame(() => initQuill());

    setTimeout(async () => {
      if (docId) {
        await loadDoc(docId);
      } else {
        const lastId = await Storage.getSetting('lastDocId');
        if (lastId) await loadDoc(lastId);
        else newDoc();
      }
    }, 60);

    setTimeout(() => {
      const banner = document.getElementById('docs-security-banner');
      if (banner) banner.style.display = 'none';
    }, 5000);
  }

  // ── New ───────────────────────────────────────
  function newDoc() {
    if (isDirty && !confirm('Você tem alterações não salvas. Criar novo documento mesmo assim?')) return;
    currentDocId = null;
    isDirty = false;
    if (quill) { quill.setText(''); quill.root.style.fontSize = DEFAULT_SIZE; }
    // Reset to single page
    const container = document.getElementById('pages-container');
    if (container) {
      container.querySelectorAll('.a4-page--ghost').forEach(p => p.remove());
      const p1 = document.getElementById('page-1');
      if (p1) p1.style.height = PAGE_HEIGHT_PX + 'px';
    }
    setTitle('Documento sem título');
    updateSaveStatus('saved');
    updateSizeDisplay(DEFAULT_SIZE);
    const badge = document.getElementById('page-count');
    if (badge) badge.textContent = '1 página';
    setTimeout(() => quill?.focus(), 80);
  }

  // ── Load ──────────────────────────────────────
  async function loadDoc(id) {
    try {
      const doc = await Storage.loadDocument(id);
      if (!doc) { showToast('Documento não encontrado', 'error'); newDoc(); return; }
      currentDocId = doc.id;
      setTitle(doc.title);
      if (quill) {
        quill.root.innerHTML = sanitizeContent(doc.content);
        quill.setSelection(quill.getLength(), 0);
        setTimeout(() => updatePages(), 120);
      }
      isDirty = false;
      updateSaveStatus('saved');
      await Storage.setSetting('lastDocId', id);
      showToast('Documento carregado', 'success');
    } catch (err) {
      console.error('[Docs] loadDoc:', err);
      showToast('Erro ao carregar documento', 'error');
    }
  }

  // ── Save ──────────────────────────────────────
  async function save() {
    if (!quill) return;
    updateSaveStatus('saving');
    try {
      const doc = await Storage.saveDocument({
        id: currentDocId, title: getTitle(),
        content: quill.root.innerHTML,
        createdAt: currentDocId ? undefined : new Date().toISOString()
      });
      currentDocId = doc.id;
      isDirty = false;
      updateSaveStatus('saved');
      await Storage.setSetting('lastDocId', currentDocId);
      showToast('Documento salvo!', 'success');
    } catch (err) {
      console.error('[Docs] save:', err);
      updateSaveStatus('pending');
      showToast('Erro ao salvar', 'error');
    }
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => { if (isDirty && quill) save(); }, 2500);
  }

  // ── Export PDF ────────────────────────────────
  async function exportPDF() {
    if (!quill) return;
    showToast('Gerando PDF...', 'info');
    try {
      const { jsPDF } = window.jspdf;
      const page1 = document.getElementById('page-1');
      const canvas = await html2canvas(page1, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const imgH = pW / (canvas.width / canvas.height);
      let left = imgH, pos = 0;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, pos, pW, imgH);
      left -= pH;
      while (left > 0) {
        pos = left - imgH; pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, pos, pW, imgH);
        left -= pH;
      }
      pdf.save((getTitle().replace(/[^a-z0-9\s]/gi, '_') || 'documento') + '.pdf');
      showToast('PDF exportado!', 'success');
    } catch (err) { console.error(err); showToast('Erro ao gerar PDF', 'error'); }
  }

  function exportTXT() {
    if (!quill) return;
    const blob = new Blob([quill.getText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (getTitle() || 'documento') + '.txt';
    a.click(); URL.revokeObjectURL(url);
    showToast('TXT exportado!', 'success');
  }

  function doPrint() { window.print(); }

  // ── Open Modal ────────────────────────────────
  async function openModal() {
    const modal = document.getElementById('modal-open');
    const list  = document.getElementById('saved-docs-list');
    if (!modal || !list) return;
    try {
      const docs = await Storage.listDocuments();
      if (docs.length === 0) {
        list.innerHTML = '<p style="color:var(--ink-muted);text-align:center;padding:1.5rem">Nenhum documento salvo.</p>';
      } else {
        list.innerHTML = docs.map(doc => {
          const date = new Date(doc.updatedAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
          return `<div class="saved-doc-item" onclick="Docs.loadFromModal('${doc.id}')">
            <span>📄</span>
            <span class="saved-doc-name">${escapeHTML(doc.title)}</span>
            <span class="saved-doc-date">${date}</span>
          </div>`;
        }).join('');
      }
    } catch {
      list.innerHTML = '<p style="color:var(--ink-muted)">Erro ao carregar documentos.</p>';
    }
    modal.classList.remove('hidden');
  }

  async function loadFromModal(id) { closeModal('modal-open'); await loadDoc(id); }

  async function openFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Arquivo muito grande (máx 10MB)', 'error'); return; }
    try {
      const text = await file.text();
      if (quill) {
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) quill.root.innerHTML = sanitizeContent(text);
        else quill.setText(text);
        setTitle(file.name.replace(/\.[^.]+$/, ''));
        currentDocId = null; markDirty();
        setTimeout(() => updatePages(), 120);
        showToast('Arquivo carregado', 'success');
      }
    } catch { showToast('Erro ao abrir arquivo', 'error'); }
    event.target.value = '';
  }

  // ── Helpers ───────────────────────────────────
  function markDirty() { isDirty = true; }
  function hasUnsaved() { return isDirty; }

  function setTitle(t) {
    const i = document.getElementById('doc-title');
    if (i) i.value = t || 'Documento sem título';
  }

  function getTitle() {
    return (document.getElementById('doc-title')?.value || '').trim() || 'Documento sem título';
  }

  function updateSaveStatus(state) {
    const dot  = document.querySelector('#save-status .status-dot');
    const text = document.querySelector('#save-status .status-text');
    if (!dot || !text) return;
    dot.className = 'status-dot ' + state;
    text.textContent = { saved: 'Salvo', pending: 'Não salvo', saving: 'Salvando...' }[state] || state;
  }

  function sanitizeContent(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script,iframe,object,embed,form,style').forEach(el => el.remove());
    div.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.startsWith('javascript:')))
          el.removeAttribute(attr.name);
      });
    });
    return div.innerHTML;
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  // ── Keyboard Shortcuts ────────────────────────
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const w = document.getElementById('app-docs');
      if (!w || w.classList.contains('hidden')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); doPrint(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newDoc(); }
      if ((e.ctrlKey || e.metaKey) && e.key === ']') { e.preventDefault(); window.changeFontSize(1); }
      if ((e.ctrlKey || e.metaKey) && e.key === '[') { e.preventDefault(); window.changeFontSize(-1); }
    });
  }

  function setupUnloadWarning() {
    window.addEventListener('beforeunload', (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  return {
    open, newDoc, loadDoc, save, exportPDF, exportTXT,
    print: doPrint, openModal, loadFromModal, openFile,
    hasUnsaved, setupKeyboard, setupUnloadWarning
  };
})();

// Global aliases
function docsNew()       { Docs.newDoc(); }
function docsSave()      { Docs.save(); }
function docsExportPDF() { Docs.exportPDF(); }
function docsExportTXT() { Docs.exportTXT(); }
function docsPrint()     { Docs.print(); }
function docsOpen()      { Docs.openModal(); }
function docsOpenFile(e) { Docs.openFile(e); }
