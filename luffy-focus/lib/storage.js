/**
 * Luffy Focus — Hybrid Storage
 * Primary: File System Access API (user-chosen JSON file)
 * Handle storage: IndexedDB (supports structured cloning of FileSystemFileHandle)
 * Data cache: chrome.storage.local (JSON-serializable data)
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';
const DB_NAME = 'luffy-focus-storage';
const DB_VERSION = 1;
const HANDLE_STORE = 'file-handles';
const HANDLE_KEY = 'primary';

/** Check if File System Access API is available */
export function isFileSystemAPIAvailable() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

// ─── IndexedDB helpers for FileSystemFileHandle ───

/** Open the IndexedDB database */
function openHandleDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Store the FileSystemFileHandle in IndexedDB */
async function storeHandle(handle) {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE);
    store.put(handle, HANDLE_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[Luffy Focus] Failed to store handle in IndexedDB:', e);
  }
}

/** Retrieve the FileSystemFileHandle from IndexedDB */
async function retrieveHandle() {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const store = tx.objectStore(HANDLE_STORE);
    const request = store.get(HANDLE_KEY);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[Luffy Focus] Failed to retrieve handle from IndexedDB:', e);
    return null;
  }
}

/** Remove stored handle */
async function clearHandle() {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE);
    store.delete(HANDLE_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[Luffy Focus] Failed to clear handle from IndexedDB:', e);
  }
}

// ─── Public API ───

/**
 * Load all data. Tries File API first (via IndexedDB handle), falls back to chrome.storage.local.
 * @returns {Promise<object>} The full data object
 */
export async function loadData() {
  // Try File System Access API first
  if (isFileSystemAPIAvailable()) {
    try {
      const fileHandle = await retrieveHandle();

      if (fileHandle) {
        // Check and request permission
        const opts = { mode: 'readwrite' };
        let permission = await fileHandle.queryPermission(opts);
        if (permission !== 'granted') {
          permission = await fileHandle.requestPermission(opts);
        }

        if (permission === 'granted') {
          const file = await fileHandle.getFile();
          const text = await file.text();
          if (text.trim()) {
            const data = JSON.parse(text);
            console.log('[Luffy Focus] Loaded data from user file via IndexedDB handle');
            return migrateData(data);
          }
        }
      }
    } catch (e) {
      console.warn('[Luffy Focus] File API load failed, falling back to chrome.storage:', e.message);
    }
  }

  // Fallback: chrome.storage.local
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      console.log('[Luffy Focus] Loaded data from chrome.storage.local fallback');
      return migrateData(result[STORAGE_KEY]);
    }
  } catch (e) {
    console.warn('[Luffy Focus] chrome.storage load failed:', e.message);
  }

  // Nothing found — return fresh defaults
  console.log('[Luffy Focus] No existing data found, creating defaults');
  return createDefaultData();
}

/**
 * Save all data. Writes to File API (if handle available) + chrome.storage.local.
 * @param {object} data - Full data object to persist
 */
export async function saveData(data) {
  // Always save to chrome.storage.local (fast, reliable fallback)
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch (e) {
    console.warn('[Luffy Focus] chrome.storage save failed:', e.message);
  }

  // Also write to File API if we have a handle
  if (isFileSystemAPIAvailable()) {
    try {
      const fileHandle = await retrieveHandle();
      if (fileHandle) {
        const opts = { mode: 'readwrite' };
        let permission = await fileHandle.queryPermission(opts);
        if (permission === 'granted') {
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
        }
      }
    } catch (e) {
      console.warn('[Luffy Focus] File API save failed (data safe in chrome.storage):', e.message);
    }
  }
}

/**
 * Prompt user to select an existing JSON file for storage.
 * Must be called from a user gesture context.
 * @returns {Promise<boolean>}
 */
export async function selectStorageFile() {
  if (!isFileSystemAPIAvailable()) {
    console.warn('[Luffy Focus] File System Access API not available');
    return false;
  }

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
      multiple: false,
    });

    // Store handle in IndexedDB (supports structured cloning)
    await storeHandle(fileHandle);

    // Verify permission
    const opts = { mode: 'readwrite' };
    let permission = await fileHandle.queryPermission(opts);
    if (permission !== 'granted') {
      permission = await fileHandle.requestPermission(opts);
    }

    // Read existing data or initialize
    let data;
    if (permission === 'granted') {
      try {
        const file = await fileHandle.getFile();
        const text = await file.text();
        data = text.trim() ? JSON.parse(text) : createDefaultData();
      } catch {
        data = createDefaultData();
      }
    } else {
      data = createDefaultData();
    }

    await saveData(data);
    console.log('[Luffy Focus] File selected and handle stored in IndexedDB');
    return true;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('[Luffy Focus] User cancelled file selection');
    } else {
      console.error('[Luffy Focus] File selection error:', e);
    }
    return false;
  }
}

/**
 * Create a new JSON file for storage.
 * @returns {Promise<boolean>}
 */
export async function createStorageFile() {
  if (!isFileSystemAPIAvailable()) {
    return false;
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] },
      }],
      suggestedName: 'luffy-focus-data.json',
    });

    // Store handle in IndexedDB (survives chrome.storage serialization)
    await storeHandle(fileHandle);

    const data = createDefaultData();
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    console.log('[Luffy Focus] New file created and handle stored in IndexedDB');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('[Luffy Focus] File create error:', e);
    }
    return false;
  }
}

/**
 * Check if a previously saved file handle exists and has valid permission.
 * @returns {Promise<boolean>}
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

  if (!data.version) {
    data.version = 1;
  }
  if (!data.settings) {
    data.settings = createDefaultData().settings;
  }
  if (!data.sessions) {
    data.sessions = [];
  }
  if (!data.currentTimer) {
    data.currentTimer = createDefaultData().currentTimer;
  }
  if (!data.storageFilePath) {
    data.storageFilePath = '';
  }

  if (!data.templates || data.templates.length === 0) {
    data.templates = [createDefaultData().templates[0]];
    data.activeTemplateId = data.templates[0].id;
  }

  return data;
}
