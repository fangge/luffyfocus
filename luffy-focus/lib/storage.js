/**
 * Luffy Focus — Storage
 *
 * Primary: chrome.storage.local (always available)
 * File sync: user-chosen JSON file, auto read/write when handle available.
 * Handle is persisted via IndexedDB (supports structured cloning of
 * FileSystemFileHandle, unlike chrome.storage.local which JSON-serializes).
 * Falls back gracefully if handle is lost (Chrome version dependent).
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';
const IDB_NAME = 'luffy_focus_handles';
const IDB_STORE = 'handles';
const IDB_KEY = 'file_handle';
const IDB_VERSION = 1;

export function isFileSystemAPIAvailable() {
  try {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  } catch { return false; }
}

// ── IndexedDB helper for FileSystemFileHandle ──
// chrome.storage.local JSON-serializes values, which strips methods from
// FileSystemFileHandle. IndexedDB uses structured cloning and preserves them.

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── File Handle Persistence ──

/** Persist the file handle to IndexedDB (and chrome.storage.local as backup) */
async function persistHandle(handle) {
  if (!handle) return;
  // Primary: IndexedDB (preserves FileSystemFileHandle methods via structured clone)
  try {
    const db = await openHandleDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    console.log('[LF] ✓ File handle persisted to IndexedDB');
  } catch (e) {
    console.warn('[LF] IndexedDB handle persistence failed:', e.message);
  }

  // Backup: chrome.storage.local (may work in some Chrome versions that
  // support structured-cloning FSH in extension storage)
  try {
    await chrome.storage.local.set({ luffy_focus_fh: handle });
  } catch {
    // Expected to fail in most versions — IndexedDB is the canonical store
  }
}

/** Try to load a previously persisted file handle */
async function loadPersistedHandle() {
  // Primary: try IndexedDB (can preserve FileSystemFileHandle via structured clone)
  try {
    const db = await openHandleDB();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (handle && typeof handle.queryPermission === 'function' && typeof handle.getFile === 'function') {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return handle;
      const req = await handle.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') return handle;
      // Permission denied — clean up stale handle
      await removePersistedHandle();
    }
  } catch (e) {
    console.warn('[LF] IndexedDB handle load failed:', e.message);
  }

  // Fallback: try chrome.storage.local (older Chrome versions)
  try {
    const result = await chrome.storage.local.get('luffy_focus_fh');
    const raw = result.luffy_focus_fh;
    if (raw && typeof raw.queryPermission === 'function' && typeof raw.getFile === 'function') {
      const perm = await raw.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return raw;
      const req = await raw.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') {
        // Also persist to IndexedDB for next time
        await persistHandle(raw);
        return raw;
      }
    }
  } catch {
    // Ignore — IndexedDB is the canonical store
  }

  return null;
}

/** Remove persisted handle from both stores */
async function removePersistedHandle() {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    db.close();
  } catch {}
  try { await chrome.storage.local.remove('luffy_focus_fh'); } catch {}
}

// ── Primary API ──

/**
 * Load data. Priority: user's JSON file → chrome.storage.local → defaults.
 */
export async function loadData() {
  // Try loading from user's JSON file (if handle is valid)
  if (isFileSystemAPIAvailable()) {
    const handle = await loadPersistedHandle();
    if (handle) {
      try {
        const file = await handle.getFile();
        const text = await file.text();
        if (text.trim()) {
          const data = JSON.parse(text);
          console.log('[LF] ✓ Loaded from user JSON file');
          // Also cache in chrome.storage.local
          await chrome.storage.local.set({ [STORAGE_KEY]: data });
          return migrateData(data);
        }
      } catch (e) {
        console.warn('[LF] File read failed, falling back:', e.message);
      }
    }
  }

  // Fallback: chrome.storage.local
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    console.log('[LF] ✓ Loaded from chrome.storage.local');
    return migrateData(result[STORAGE_KEY]);
  }

  console.log('[LF] No data found, creating defaults');
  return createDefaultData();
}

/**
 * Save data. Writes to chrome.storage.local AND user's JSON file (if handle valid).
 */
export async function saveData(data) {
  // Always save to chrome.storage.local (reliable)
  await chrome.storage.local.set({ [STORAGE_KEY]: data });

  // Try writing to user's JSON file
  if (isFileSystemAPIAvailable()) {
    const handle = await loadPersistedHandle();
    if (handle) {
      try {
        let perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          perm = await handle.requestPermission({ mode: 'readwrite' });
        }
        if (perm === 'granted') {
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          console.log('[LF] ✓ Saved to user JSON file');
        }
      } catch (e) {
        console.warn('[LF] File write failed (data safe in chrome.storage):', e.message);
      }
    }
  }
}

// ── User-Initiated File Operations ──

/**
 * Select an existing JSON file to use for storage.
 * Persists the handle for future automatic read/write.
 */
export async function selectStorageFile() {
  if (!isFileSystemAPIAvailable()) return false;
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    });

    await persistHandle(fileHandle);

    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = text.trim() ? JSON.parse(text) : createDefaultData();
    await saveData(migrateData(data));

    console.log('[LF] File selected for auto read/write');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[LF] Select error:', e);
    return false;
  }
}

/**
 * Create a new JSON file for storage.
 */
export async function createStorageFile() {
  if (!isFileSystemAPIAvailable()) return false;
  try {
    const fileHandle = await window.showSaveFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      suggestedName: 'luffy-focus-data.json',
    });

    await persistHandle(fileHandle);

    const data = createDefaultData();
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });

    console.log('[LF] New file created for auto read/write');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[LF] Create error:', e);
    return false;
  }
}

/**
 * Export data to a one-shot file (does NOT change the auto-save target).
 */
export async function exportToFile(data) {
  if (!isFileSystemAPIAvailable()) return false;
  try {
    const fileHandle = await window.showSaveFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      suggestedName: 'luffy-focus-data.json',
    });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    // Also persist this handle for future auto-saves (user may want this)
    await persistHandle(fileHandle);

    console.log('[LF] Exported to file');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[LF] Export error:', e);
    return false;
  }
}

/**
 * Import data from a file (also sets it as the auto-save target).
 */
export async function importFromFile() {
  if (!isFileSystemAPIAvailable()) return null;
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    });

    await persistHandle(fileHandle);

    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;

    const data = JSON.parse(text);
    const migrated = migrateData(data);
    await saveData(migrated);

    console.log('[LF] Imported from file');
    return migrated;
  } catch (e) {
    if (e.name === 'AbortError') return null;
    if (e instanceof SyntaxError) console.error('[LF] Invalid JSON');
    else console.error('[LF] Import error:', e);
    return null;
  }
}

/** Check if a persisted file handle is available and valid */
export async function isFileHandleValid() {
  if (!isFileSystemAPIAvailable()) return false;
  const handle = await loadPersistedHandle();
  return handle !== null;
}

/** Check if data already exists in chrome.storage.local (skip file setup if so) */
export async function hasStoredData() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return !!result[STORAGE_KEY];
  } catch { return false; }
}

// ── Migration ──

function migrateData(data) {
  if (!data || typeof data !== 'object') return createDefaultData();
  if (!data.version) data.version = 1;
  if (!data.settings) data.settings = createDefaultData().settings;
  if (!data.sessions) data.sessions = [];
  if (!data.currentTimer) data.currentTimer = createDefaultData().currentTimer;
  if (!data.storageFilePath) data.storageFilePath = '';
  if (!data.templates || data.templates.length === 0) {
    data.templates = [createDefaultData().templates[0]];
    data.activeTemplateId = data.templates[0].id;
  }
  return data;
}
