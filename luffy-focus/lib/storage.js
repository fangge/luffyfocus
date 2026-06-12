/**
 * Luffy Focus — Storage
 *
 * Primary: chrome.storage.local (always available)
 * File sync: user-chosen JSON file, auto read/write when handle available.
 * Handle is persisted via chrome.storage.local and verified on load.
 * Falls back gracefully if handle is lost (Chrome version dependent).
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';
const HANDLE_STORAGE_KEY = 'luffy_focus_fh';

export function isFileSystemAPIAvailable() {
  try {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  } catch { return false; }
}

// ── File Handle Persistence ──

/** Try to persist the file handle to chrome.storage.local */
async function persistHandle(handle) {
  if (!handle) return;
  try {
    // chrome.storage.local uses IndexedDB internally in MV3.
    // FileSystemFileHandle serialization depends on Chrome version.
    // We wrap in try/catch because it may fail silently.
    await chrome.storage.local.set({ [HANDLE_STORAGE_KEY]: handle });
  } catch (e) {
    console.warn('[LF] Handle persistence failed (Chrome version may not support it):', e.message);
  }
}

/** Try to load a previously persisted file handle */
async function loadPersistedHandle() {
  try {
    const result = await chrome.storage.local.get(HANDLE_STORAGE_KEY);
    const raw = result[HANDLE_STORAGE_KEY];
    if (!raw) return null;

    // Verify it's a real FileSystemFileHandle with expected methods.
    // If chrome.storage.local JSON-serialized it, methods will be missing.
    if (typeof raw.queryPermission === 'function' && typeof raw.getFile === 'function') {
      // Check if permission is still valid
      const perm = await raw.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return raw;
      // Try requesting permission
      const req = await raw.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') return raw;
    }
    // Handle is dead — clean up
    await chrome.storage.local.remove(HANDLE_STORAGE_KEY);
  } catch (e) {
    // Handle retrieval failed — clean up
    try { await chrome.storage.local.remove(HANDLE_STORAGE_KEY); } catch {}
  }
  return null;
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
