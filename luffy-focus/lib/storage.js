/**
 * Luffy Focus — Storage
 *
 * Primary: chrome.storage.local (reliable, always available, ~10MB)
 * File bridge: one-shot Export/Import via File System Access API
 *
 * Why not live File API sync? FileSystemFileHandle cannot be reliably
 * persisted across popup sessions — IndexedDB structured cloning is
 * inconsistent across Chrome versions. chrome.storage.local is the
 * canonical approach for Chrome extension data.
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';

/** Check if File System Access API is available */
export function isFileSystemAPIAvailable() {
  try {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  } catch {
    return false;
  }
}

/**
 * Load all data from chrome.storage.local.
 * @returns {Promise<object>}
 */
export async function loadData() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      console.log('[Luffy Focus] Loaded from chrome.storage.local');
      return migrateData(result[STORAGE_KEY]);
    }
  } catch (e) {
    console.warn('[Luffy Focus] Storage load error:', e.message);
  }

  console.log('[Luffy Focus] No saved data, creating defaults');
  return createDefaultData();
}

/**
 * Save all data to chrome.storage.local.
 * @param {object} data
 */
export async function saveData(data) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch (e) {
    console.error('[Luffy Focus] Storage save error:', e.message);
  }
}

// ─── One-shot File Export/Import (user-initiated) ───

/**
 * Export current data to a user-chosen JSON file.
 * Must be called from a user gesture context.
 * @param {object} data - The data to export
 * @returns {Promise<boolean>}
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

    console.log('[Luffy Focus] Data exported to file');
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('[Luffy Focus] Export error:', e);
    }
    return false;
  }
}

/**
 * Import data from a user-chosen JSON file.
 * Must be called from a user gesture context.
 * @returns {Promise<object|null>} The imported data, or null if cancelled/failed
 */
export async function importFromFile() {
  if (!isFileSystemAPIAvailable()) return null;

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    });

    const file = await fileHandle.getFile();
    const text = await file.text();

    if (!text.trim()) {
      console.warn('[Luffy Focus] Selected file is empty');
      return null;
    }

    const data = JSON.parse(text);
    const migrated = migrateData(data);

    // Save imported data and return it
    await saveData(migrated);
    console.log('[Luffy Focus] Data imported from file');
    return migrated;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('[Luffy Focus] Import cancelled');
    } else if (e instanceof SyntaxError) {
      console.error('[Luffy Focus] Invalid JSON in selected file');
    } else {
      console.error('[Luffy Focus] Import error:', e);
    }
    return null;
  }
}

/**
 * Always returns false — handle persistence is not supported.
 * Kept for API compatibility with code that calls this.
 */
export async function isFileHandleValid() {
  return false;
}

// Legacy stubs (kept for API compatibility)
export async function selectStorageFile() {
  console.log('[Luffy Focus] Use exportToFile/importFromFile instead');
  return false;
}

export async function createStorageFile() {
  const data = createDefaultData();
  return exportToFile(data);
}

// ─── Migration ───

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
