/**
 * Luffy Focus — Hybrid Storage
 * Primary: chrome.storage.local (always works, fast, reliable)
 * Optional: File System Access API JSON file (user-chosen path, auto-sync)
 * Handle storage: IndexedDB with proper connection lifecycle
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';
const DB_NAME = 'luffy-focus-handles';
const DB_VERSION = 1;
const HANDLE_KEY = 'primary-file-handle';

/** Check if File System Access API is available (only in popup/window context) */
export function isFileSystemAPIAvailable() {
  try {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  } catch {
    return false;
  }
}

// ─── IndexedDB (single-connection, properly managed) ───

let _dbPromise = null;

function getDB() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        _dbPromise = null;
        reject(request.error);
      };
    });
  }
  return _dbPromise;
}

function closeDB() {
  if (_dbPromise) {
    _dbPromise.then(db => {
      try { db.close(); } catch {}
    }).catch(() => {});
    _dbPromise = null;
  }
}

async function storeHandle(handle) {
  if (!handle || typeof handle.queryPermission !== 'function') return false;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('handles', 'readwrite');
        const store = tx.objectStore('handles');
        store.put(handle, HANDLE_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      } catch (e) {
        reject(e);
      }
    });
  } catch (e) {
    console.warn('[Luffy Focus] IndexedDB store failed:', e.message);
    return false;
  }
}

async function retrieveHandle() {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const request = store.get(HANDLE_KEY);
        request.onsuccess = () => {
          const result = request.result;
          // Verify the result is a real FileSystemFileHandle with expected methods
          if (result && typeof result === 'object' && typeof result.queryPermission === 'function') {
            resolve(result);
          } else {
            // Got back a dead object — clear it
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

// ─── Public API ───

/**
 * Load all data.
 * Priority: File API (if handle valid) → chrome.storage.local → defaults
 */
export async function loadData() {
  // Try File API from persisted handle
  if (isFileSystemAPIAvailable()) {
    const handle = await retrieveHandle();
    if (handle) {
      try {
        let permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          permission = await handle.requestPermission({ mode: 'readwrite' });
        }
        if (permission === 'granted') {
          const file = await handle.getFile();
          const text = await file.text();
          if (text.trim()) {
            const data = JSON.parse(text);
            console.log('[Luffy Focus] ✓ Loaded from user JSON file');
            return migrateData(data);
          }
        }
      } catch (e) {
        console.warn('[Luffy Focus] File read error, falling back:', e.message);
      }
    }
  }

  // Fallback: chrome.storage.local
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    console.log('[Luffy Focus] ✓ Loaded from chrome.storage.local');
    return migrateData(result[STORAGE_KEY]);
  }

  console.log('[Luffy Focus] No data found, creating defaults');
  return createDefaultData();
}

/**
 * Save all data. Writes to File API + chrome.storage.local.
 */
export async function saveData(data) {
  // Always save to chrome.storage.local first (reliable)
  await chrome.storage.local.set({ [STORAGE_KEY]: data });

  // Try writing to File API
  if (isFileSystemAPIAvailable()) {
    const handle = await retrieveHandle();
    if (handle) {
      try {
        let permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
        }
      } catch (e) {
        // Silently skip — data is safe in chrome.storage.local
      }
    }
  }
}

/**
 * Prompt user to select an existing JSON file for storage.
 * Must be called from a user gesture context.
 */
export async function selectStorageFile() {
  if (!isFileSystemAPIAvailable()) return false;

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    });

    // Request and persist permission immediately
    await fileHandle.requestPermission({ mode: 'readwrite' });
    const stored = await storeHandle(fileHandle);

    if (!stored) {
      console.warn('[Luffy Focus] Could not persist handle — data will use chrome.storage only');
    }

    // Read existing data
    let data;
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      data = text.trim() ? JSON.parse(text) : createDefaultData();
    } catch {
      data = createDefaultData();
    }

    await saveData(data);
    console.log('[Luffy Focus] File selected' + (stored ? ' (handle persisted)' : ''));
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[Luffy Focus] Select error:', e);
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

    await fileHandle.requestPermission({ mode: 'readwrite' });
    const stored = await storeHandle(fileHandle);

    const data = createDefaultData();
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    console.log('[Luffy Focus] New file created' + (stored ? ' (handle persisted)' : ''));
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[Luffy Focus] Create error:', e);
    return false;
  }
}

/**
 * Check if a previously saved file handle exists and has valid permission.
 */
export async function isFileHandleValid() {
  if (!isFileSystemAPIAvailable()) return false;
  try {
    const handle = await retrieveHandle();
    if (!handle) return false;
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Migrate old data formats to current version.
 */
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
