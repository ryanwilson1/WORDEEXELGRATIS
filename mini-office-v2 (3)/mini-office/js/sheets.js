/**
 * MINI OFFICE — MINI SHEETS v2
 * Fixed: cell selection, row highlighting, navigation, touch support
 */

const Sheets = (() => {
  const ROWS = 50;
  const COLS = 26;
  const COL_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  let gridData = {};
  let cellElements = {};
  let tdElements = {};
  let selectedCell = 'A1';
  let currentSheetId = null;
  let isDirty = false;
  let autosaveTimer = null;
  let isInitialized = false;

  // ── Open ──────────────────────────────────────
  async function open(sheetId = null) {
    const appWindow = document.getElementById('app-sheets');
    if (!appWindow) return;
    appWindow.classList.remove('hidden');

    if (!isInitialized) {
      buildGrid();
      setupFormulaBar();
      setupKeyboard();
      isInitialized = true;
    }

    if (sheetId) {
      await loadSheet(sheetId);
    } else {
      const lastId = await Storage.getSetting('lastSheetId');
      if (lastId) {
        await loadSheet(lastId);
      } else {
        newSheet();
      }
    }

    setTimeout(() => {
      const banner = document.getElementById('sheets-security-banner');
      if (banner) banner.style.display = 'none';
    }, 5000);
  }

  // ── Build Grid ────────────────────────────────
  function buildGrid() {
    const container = document.getElementById('spreadsheet-container');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'grid-wrapper';

    const table = document.createElement('table');
    table.className = 'spreadsheet-grid';

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const cornerTh = document.createElement('th');
    cornerTh.className = 'row-header';
    headerRow.appendChild(cornerTh);

    COL_LABELS.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      th.dataset.col = col;
      // Click col header to select whole column
      th.addEventListener('click', () => selectColHeader(col));
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    for (let r = 1; r <= ROWS; r++) {
      const row = document.createElement('tr');

      const rowHeader = document.createElement('td');
      rowHeader.className = 'row-header';
      rowHeader.textContent = r;
      row.appendChild(rowHeader);

      COL_LABELS.forEach(col => {
        const td = document.createElement('td');
        const cellId = col + r;
        td.dataset.cell = cellId;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.dataset.cell = cellId;
        input.autocomplete = 'off';
        input.spellcheck = false;

        input.addEventListener('focus', () => onCellFocus(cellId, input));
        input.addEventListener('blur',  () => onCellBlur(cellId, input));
        input.addEventListener('input', () => onCellInput(cellId, input));
        input.addEventListener('keydown', (e) => onCellKeydown(e, cellId));
        // Touch: single tap focuses
        td.addEventListener('click', () => {
          if (document.activeElement !== input) input.focus();
        });

        td.appendChild(input);
        row.appendChild(td);

        cellElements[cellId] = input;
        tdElements[cellId] = td;
      });

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  function selectColHeader(col) {
    const firstCell = col + '1';
    cellElements[firstCell]?.focus();
  }

  // ── Cell Events ───────────────────────────────
  function onCellFocus(cellId, input) {
    selectedCell = cellId;
    setActiveCell(cellId);
    updateFormulaBar(cellId);
    input.value = gridData[cellId] || '';
    // Select text so user can type over immediately
    input.select();
  }

  function onCellBlur(cellId, input) {
    const raw = input.value;
    if (raw !== (gridData[cellId] || '')) {
      gridData[cellId] = raw;
      markDirty();
    }
    renderCell(cellId);
  }

  function onCellInput(cellId, input) {
    updateFormulaBarText(input.value);
  }

  function onCellKeydown(e, cellId) {
    const [col, row] = parseCell(cellId);
    const colIdx = COL_LABELS.indexOf(col);
    const rowNum = parseInt(row);

    let nextCell = null;
    let shouldSave = false;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        shouldSave = true;
        if (e.shiftKey) {
          if (rowNum > 1) nextCell = COL_LABELS[colIdx] + (rowNum - 1);
        } else {
          if (rowNum < ROWS) nextCell = COL_LABELS[colIdx] + (rowNum + 1);
        }
        break;

      case 'Tab':
        e.preventDefault();
        shouldSave = true;
        if (e.shiftKey) {
          if (colIdx > 0) nextCell = COL_LABELS[colIdx - 1] + rowNum;
        } else {
          if (colIdx < COLS - 1) nextCell = COL_LABELS[colIdx + 1] + rowNum;
        }
        break;

      case 'ArrowUp':
        if (e.target.selectionStart === 0 || e.target.value === '') {
          e.preventDefault();
          shouldSave = true;
          if (rowNum > 1) nextCell = COL_LABELS[colIdx] + (rowNum - 1);
        }
        break;

      case 'ArrowDown':
        if (e.target.selectionEnd === e.target.value.length || e.target.value === '') {
          e.preventDefault();
          shouldSave = true;
          if (rowNum < ROWS) nextCell = COL_LABELS[colIdx] + (rowNum + 1);
        }
        break;

      case 'ArrowLeft':
        if (e.target.selectionStart === 0) {
          e.preventDefault();
          shouldSave = true;
          if (colIdx > 0) nextCell = COL_LABELS[colIdx - 1] + rowNum;
        }
        break;

      case 'ArrowRight':
        if (e.target.selectionEnd === e.target.value.length) {
          e.preventDefault();
          shouldSave = true;
          if (colIdx < COLS - 1) nextCell = COL_LABELS[colIdx + 1] + rowNum;
        }
        break;

      case 'Escape':
        e.target.value = gridData[cellId] || '';
        renderCell(cellId);
        e.target.blur();
        return;

      case 'Delete':
      case 'Backspace':
        // If cell is not being edited (via click), clear it
        if (document.activeElement !== e.target) {
          e.preventDefault();
          gridData[cellId] = '';
          e.target.value = '';
          markDirty();
        }
        break;
    }

    if (shouldSave) {
      const raw = cellElements[cellId]?.value || '';
      gridData[cellId] = raw;
      renderCell(cellId);
    }

    if (nextCell) {
      // Use requestAnimationFrame to ensure blur completes first
      requestAnimationFrame(() => {
        cellElements[nextCell]?.focus();
      });
    }
  }

  // ── Cell Rendering ─────────────────────────────
  function renderCell(cellId) {
    const input = cellElements[cellId];
    if (!input) return;
    const raw = gridData[cellId] || '';
    if (document.activeElement !== input) {
      const computed = evaluateCell(raw);
      input.value = (computed !== null && computed !== undefined) ? String(computed) : raw;
    }
  }

  function renderAll() {
    Object.keys(cellElements).forEach(cellId => renderCell(cellId));
  }

  // ── Formula Engine ─────────────────────────────
  function evaluateCell(raw) {
    if (!raw || typeof raw !== 'string') return null;
    if (!raw.startsWith('=')) return null;

    try {
      const formula = raw.substring(1).trim().toUpperCase();

      // Function with range: SOMA(A1:B5), SUM(A1:A10), etc.
      const funcRange = formula.match(/^([A-ZÁÉÍÓÚ]+)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
      if (funcRange) {
        const fn = funcRange[1];
        const values = getRangeValues(funcRange[2], funcRange[3]);
        const result = applyFunction(fn, values);
        if (typeof result === 'number') {
          return +parseFloat(result.toFixed(10)).toPrecision(12).replace(/\.?0+$/, '');
        }
        return result;
      }

      // Cell reference: =A1, =B3
      const cellRef = formula.match(/^([A-Z]+\d+)$/);
      if (cellRef) {
        const refRaw = gridData[cellRef[1]] || '';
        if (!refRaw) return 0;
        if (refRaw.startsWith('=')) return evaluateCell(refRaw);
        const num = parseFloat(refRaw);
        return isNaN(num) ? refRaw : num;
      }

      // Replace cell references in expression: =A1+B1*2
      let expr = formula.replace(/([A-Z]+\d+)/g, (match) => {
        const raw = gridData[match] || '0';
        if (raw.startsWith('=')) {
          const val = evaluateCell(raw);
          return (val !== null && !isNaN(val)) ? String(val) : '0';
        }
        const num = parseFloat(raw);
        return isNaN(num) ? '0' : String(num);
      });

      // Only safe characters
      if (/^[\d\s+\-*/().%,]+$/.test(expr)) {
        // Replace commas with dots for decimal
        expr = expr.replace(/,/g, '.');
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')();
        if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return '#ERRO!';
        return +parseFloat(result.toFixed(10)).toPrecision(12).replace(/\.?0+$/, '');
      }

      return '#ERRO!';
    } catch {
      return '#ERRO!';
    }
  }

  function getRangeValues(startCell, endCell) {
    const [startCol, startRow] = parseCell(startCell.toUpperCase());
    const [endCol, endRow]     = parseCell(endCell.toUpperCase());
    const si = COL_LABELS.indexOf(startCol);
    const ei = COL_LABELS.indexOf(endCol);
    const values = [];

    for (let ci = Math.min(si, ei); ci <= Math.max(si, ei); ci++) {
      for (let ri = Math.min(parseInt(startRow), parseInt(endRow));
               ri <= Math.max(parseInt(startRow), parseInt(endRow)); ri++) {
        const cellId = COL_LABELS[ci] + ri;
        const raw = gridData[cellId] || '';
        const val = raw.startsWith('=') ? evaluateCell(raw) : parseFloat(raw.replace(',', '.'));
        if (val !== null && val !== '' && !isNaN(Number(val))) values.push(Number(val));
      }
    }
    return values;
  }

  function applyFunction(fn, values) {
    if (values.length === 0) return 0;
    switch (fn) {
      case 'SOMA': case 'SUM':
        return values.reduce((a, b) => a + b, 0);
      case 'MÉDIA': case 'MEDIA': case 'AVERAGE':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'MAX': case 'MÁXIMO': case 'MAXIMO':
        return Math.max(...values);
      case 'MIN': case 'MÍNIMO': case 'MINIMO':
        return Math.min(...values);
      case 'CONT': case 'COUNT': case 'CONTAR':
        return values.length;
      case 'MULT': case 'PRODUCT':
        return values.reduce((a, b) => a * b, 1);
      default:
        return '#ERRO!';
    }
  }

  function parseCell(cellId) {
    const match = String(cellId).match(/^([A-Z]+)(\d+)$/);
    return match ? [match[1], match[2]] : ['A', '1'];
  }

  // ── Formula Bar ────────────────────────────────
  function setupFormulaBar() {
    const formulaInput = document.getElementById('formula-input');
    if (!formulaInput) return;

    formulaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        gridData[selectedCell] = formulaInput.value;
        renderCell(selectedCell);
        markDirty();
        cellElements[selectedCell]?.focus();
      }
      if (e.key === 'Escape') {
        updateFormulaBarText(gridData[selectedCell] || '');
        cellElements[selectedCell]?.focus();
      }
    });

    formulaInput.addEventListener('blur', () => {
      if (formulaInput.value !== (gridData[selectedCell] || '')) {
        gridData[selectedCell] = formulaInput.value;
        renderCell(selectedCell);
        markDirty();
      }
    });
  }

  function updateFormulaBar(cellId) {
    const ref = document.getElementById('cell-ref');
    if (ref) ref.textContent = cellId;
    const formulaInput = document.getElementById('formula-input');
    if (formulaInput) formulaInput.value = gridData[cellId] || '';
  }

  function updateFormulaBarText(text) {
    const formulaInput = document.getElementById('formula-input');
    if (formulaInput && document.activeElement !== formulaInput) {
      formulaInput.value = text;
    }
  }

  // ── Cell Highlighting ──────────────────────────
  function setActiveCell(cellId) {
    // Clear previous
    document.querySelectorAll('.spreadsheet-grid td.active-cell, .spreadsheet-grid td.selected')
      .forEach(td => { td.classList.remove('active-cell'); td.classList.remove('selected'); });

    const td = tdElements[cellId];
    if (td) {
      td.classList.add('active-cell');
      // Ensure visible
      const input = cellElements[cellId];
      if (input) {
        const rect = input.getBoundingClientRect();
        const canvas = document.getElementById('sheets-canvas');
        if (canvas && (rect.bottom > canvas.getBoundingClientRect().bottom ||
                       rect.top < canvas.getBoundingClientRect().top)) {
          input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }
    }
  }

  // ── New Sheet ──────────────────────────────────
  function newSheet() {
    if (isDirty) {
      if (!confirm('Você tem alterações não salvas. Criar nova planilha mesmo assim?')) return;
    }
    gridData = {};
    currentSheetId = null;
    isDirty = false;
    setTitle('Planilha sem título');
    renderAll();
    updateSaveStatus('saved');
    selectedCell = 'A1';
    requestAnimationFrame(() => cellElements['A1']?.focus());
  }

  // ── Save / Load ────────────────────────────────
  async function save() {
    updateSaveStatus('saving');
    try {
      const record = await Storage.saveSheet({
        id: currentSheetId,
        title: getTitle(),
        data: gridData
      });
      currentSheetId = record.id;
      isDirty = false;
      updateSaveStatus('saved');
      await Storage.setSetting('lastSheetId', currentSheetId);
      showToast('Planilha salva!', 'success');
    } catch (err) {
      console.error('[Sheets] save error:', err);
      updateSaveStatus('pending');
      showToast('Erro ao salvar', 'error');
    }
  }

  async function loadSheet(id) {
    try {
      const record = await Storage.loadSheet(id);
      if (!record) {
        showToast('Planilha não encontrada', 'error');
        newSheet();
        return;
      }
      currentSheetId = record.id;
      setTitle(record.title);
      gridData = record.data || {};
      renderAll();
      isDirty = false;
      updateSaveStatus('saved');
      await Storage.setSetting('lastSheetId', id);
      showToast('Planilha carregada', 'success');
    } catch (err) {
      console.error('[Sheets] loadSheet error:', err);
      showToast('Erro ao carregar planilha', 'error');
    }
  }

  // ── Export CSV ─────────────────────────────────
  function exportCSV() {
    const rows = [];
    for (let r = 1; r <= ROWS; r++) {
      const row = COL_LABELS.map(col => {
        const cellId = col + r;
        const raw = gridData[cellId] || '';
        const val = raw.startsWith('=') ? evaluateCell(raw) : raw;
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? '"' + str.replace(/"/g, '""') + '"' : str;
      });
      while (row.length > 0 && row[row.length - 1] === '') row.pop();
      rows.push(row.join(','));
    }
    while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();

    const csv = '\uFEFF' + rows.join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (getTitle() || 'planilha') + '.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('CSV exportado!', 'success');
  }

  // ── Export PDF ─────────────────────────────────
  async function exportPDF() {
    showToast('Gerando PDF...', 'info');
    try {
      const { jsPDF } = window.jspdf;
      const container = document.getElementById('spreadsheet-container');
      const canvas = await html2canvas(container, { scale: 1.5, backgroundColor: '#ffffff', logging: false });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgH = pdfW / ratio;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pdfW, Math.min(imgH, pdfH));
      pdf.save((getTitle() || 'planilha') + '.pdf');
      showToast('PDF exportado!', 'success');
    } catch (err) {
      console.error('[Sheets] exportPDF:', err);
      showToast('Erro ao gerar PDF', 'error');
    }
  }

  function print() { window.print(); }

  // ── Autosave ───────────────────────────────────
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => { if (isDirty) save(); }, 3000);
  }

  function markDirty() {
    isDirty = true;
    updateSaveStatus('pending');
    scheduleAutosave();
  }

  function hasUnsaved() { return isDirty; }

  // ── Helpers ────────────────────────────────────
  function setTitle(t) {
    const input = document.getElementById('sheet-title');
    if (input) input.value = t || 'Planilha sem título';
  }

  function getTitle() {
    const input = document.getElementById('sheet-title');
    return (input?.value || '').trim() || 'Planilha sem título';
  }

  function updateSaveStatus(state) {
    const dot  = document.querySelector('#sheet-save-status .status-dot');
    const text = document.querySelector('#sheet-save-status .status-text');
    if (!dot || !text) return;
    dot.className = 'status-dot ' + state;
    text.textContent = { saved: 'Salvo', pending: 'Não salvo', saving: 'Salvando...' }[state] || state;
  }

  // ── Keyboard shortcuts ─────────────────────────
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const w = document.getElementById('app-sheets');
      if (!w || w.classList.contains('hidden')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); print(); }
    });

    const titleInput = document.getElementById('sheet-title');
    if (titleInput) titleInput.addEventListener('input', () => markDirty());
  }

  return {
    open, newSheet, save, loadSheet, exportCSV, exportPDF, print, hasUnsaved
  };
})();

// Global aliases
function sheetsNew()       { Sheets.newSheet(); }
function sheetsSave()      { Sheets.save(); }
function sheetsExportCSV() { Sheets.exportCSV(); }
function sheetsExportPDF() { Sheets.exportPDF(); }
function sheetsPrint()     { Sheets.print(); }
