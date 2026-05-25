/**
 * MINI OFFICE — Storage Module
 * IndexedDB wrapper for persistent offline storage
 */

const Storage = (() => {
  const DB_NAME = 'mini-office-db';
  const DB_VERSION = 1;
  let db = null;

  // ── Open / Init DB ──────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        // Documents store
        if (!database.objectStoreNames.contains('documents')) {
          const docStore = database.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Sheets store
        if (!database.objectStoreNames.contains('sheets')) {
          const sheetStore = database.createObjectStore('sheets', { keyPath: 'id' });
          sheetStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Settings store
        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ── Generic CRUD ────────────────────────────────
  async function put(storeName, data) {
    try {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[Storage] put error:', err);
      throw err;
    }
  }

  async function get(storeName, id) {
    try {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[Storage] get error:', err);
      return null;
    }
  }

  async function getAll(storeName) {
    try {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[Storage] getAll error:', err);
      return [];
    }
  }

  async function remove(storeName, id) {
    try {
      const database = await openDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[Storage] remove error:', err);
      return false;
    }
  }

  // ── Document helpers ─────────────────────────────
  async function saveDocument(doc) {
    const id = doc.id || ('doc_' + Date.now());
    const record = {
      id,
      title: doc.title || 'Sem título',
      content: doc.content || '',
      updatedAt: new Date().toISOString(),
      createdAt: doc.createdAt || new Date().toISOString(),
      type: 'doc'
    };
    await put('documents', record);
    return record;
  }

  async function loadDocument(id) {
    return await get('documents', id);
  }

  async function listDocuments() {
    const docs = await getAll('documents');
    return docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async function deleteDocument(id) {
    return await remove('documents', id);
  }

  // ── Sheet helpers ────────────────────────────────
  async function saveSheet(sheet) {
    const id = sheet.id || ('sheet_' + Date.now());
    const record = {
      id,
      title: sheet.title || 'Sem título',
      data: sheet.data || [],
      updatedAt: new Date().toISOString(),
      createdAt: sheet.createdAt || new Date().toISOString(),
      type: 'sheet'
    };
    await put('sheets', record);
    return record;
  }

  async function loadSheet(id) {
    return await get('sheets', id);
  }

  async function listSheets() {
    const sheets = await getAll('sheets');
    return sheets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async function deleteSheet(id) {
    return await remove('sheets', id);
  }

  // ── Settings ─────────────────────────────────────
  async function setSetting(key, value) {
    return await put('settings', { key, value });
  }

  async function getSetting(key) {
    const record = await get('settings', key);
    return record ? record.value : null;
  }

  // ── Init ─────────────────────────────────────────
  async function init() {
    try {
      await openDB();
      console.log('[Storage] IndexedDB ready');
      return true;
    } catch (err) {
      console.error('[Storage] Failed to init:', err);
      return false;
    }
  }

  return {
    init,
    saveDocument, loadDocument, listDocuments, deleteDocument,
    saveSheet, loadSheet, listSheets, deleteSheet,
    setSetting, getSetting
  };
})();
