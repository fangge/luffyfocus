/**
 * Luffy Focus — Storage
 *
 * Primary: chrome.storage.local (always reliable)
 * Best-effort file sync: if user exported/selected a file this session,
 * auto-write to it on every save. Handle is NOT persisted across
 * sessions (no IndexedDB), but on next Export, the handle is restored.
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';

// Session-level file handle (lives as long as the popup is open)
let _sessionFileHandle = null;

/** Check if File System Access API is available */
export function isFileSystemAPIAvailable() {
  try {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  } catch {
    return false;
  }
}

// ── Primary Storage (chrome.storage.local) ──

export async function loadData() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return migrateData(result[STORAGE_KEY]);
    }
  } catch (e) {
    console.warn('[Luffy Focus] Load error:', e.message);
  }
  return createDefaultData();
}

export async function saveData(data) {
  // 1. Always save to chrome.storage.local (reliable)
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch (e) {
    console.error('[Luffy Focus] Storage save error:', e.message);
  }

  // 2. Best-effort: write to session file handle if available
  if (_sessionFileHandle && isFileSystemAPIAvailable()) {
    try {
      const permission = await _sessionFileHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        const writable = await _sessionFileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
      }
    } catch {
      // File write failed — data is safe in chrome.storage.local
      _sessionFileHandle = null;
    }
  }
}

// ── File Export/Import (user-initiated) ──

/**
 * Export data to a user-chosen JSON file.
 * Also remembers the handle for future auto-saves during this session.
 */
export async function exportToFile(data) {
  if (!isFileSystemAPIAvailable()) return false;

  try {
    const fileHandle = await window.showSaveFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      suggestedName: 'luffy-focus-data.json',
    });

    // Remember this handle for future auto-saves
    _sessionFileHandle = fileHandle;

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    console.log('[Luffy Focus] Exported to file (auto-save enabled for this session)');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[Luffy Focus] Export error:', e);
    return false;
  }
}

/**
 * Import data from a user-chosen JSON file.
 * Also remembers the handle for future auto-saves during this session.
 */
export async function importFromFile() {
  if (!isFileSystemAPIAvailable()) return null;

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    });

    // Remember this handle for future auto-saves
    _sessionFileHandle = fileHandle;

    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;

    const data = JSON.parse(text);
    const migrated = migrateData(data);
    await saveData(migrated);

    console.log('[Luffy Focus] Imported from file (auto-save enabled for this session)');
    return migrated;
  } catch (e) {
    if (e.name === 'AbortError') return null;
    if (e instanceof SyntaxError) {
      console.error('[Luffy Focus] Invalid JSON file');
    } else {
      console.error('[Luffy Focus] Import error:', e);
    }
    return null;
  }
}

// Legacy stubs
export async function isFileHandleValid() { return false; }
export async function selectStorageFile() { return false; }
export async function createStorageFile() { return false; }

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
