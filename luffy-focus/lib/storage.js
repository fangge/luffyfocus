/**
 * Luffy Focus — Hybrid Storage
 * Primary: File System Access API (user-chosen JSON file)
 * Fallback/Cache: chrome.storage.local
 */
import { createDefaultData } from './data-model.js';

const STORAGE_KEY = 'luffy_focus_data';
const HANDLE_KEY = 'luffy_focus_file_handle';

/** Check if File System Access API is available */
export function isFileSystemAPIAvailable() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

/**
 * Load all data. Tries File API first, falls back to chrome.storage.local.
 * @returns {Promise<object>} The full data object
 */
export async function loadData() {
  // Try File System Access API first
  if (isFileSystemAPIAvailable()) {
    try {
      const handleResult = await chrome.storage.local.get(HANDLE_KEY);
      const storedHandle = handleResult[HANDLE_KEY];

      if (storedHandle) {
        const fileHandle = await storedHandle;
        const opts = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(opts)) === 'granted') {
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          return migrateData(data);
        } else if ((await fileHandle.requestPermission(opts)) === 'granted') {
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          return migrateData(data);
        }
      }
    } catch (e) {
      console.warn('[Luffy Focus] File API load failed, falling back to chrome.storage:', e.message);
    }
  }

  // Fallback: chrome.storage.local
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    return migrateData(result[STORAGE_KEY]);
  }

  // Nothing found — return fresh defaults
  return createDefaultData();
}

/**
 * Save all data. Writes to File API (if available) + chrome.storage.local.
 * @param {object} data - Full data object to persist
 */
export async function saveData(data) {
  // Always save to chrome.storage.local (fast, reliable)
  await chrome.storage.local.set({ [STORAGE_KEY]: data });

  // Also write to File API if we have a handle
  if (isFileSystemAPIAvailable()) {
    try {
      const handleResult = await chrome.storage.local.get(HANDLE_KEY);
      const storedHandle = handleResult[HANDLE_KEY];
      if (storedHandle) {
        const fileHandle = await storedHandle;
        const opts = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(opts)) === 'granted') {
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
        }
      }
    } catch (e) {
      console.warn('[Luffy Focus] File API save failed:', e.message);
    }
  }
}

/**
 * Prompt user to select/create a JSON file for storage.
 * Must be called from a user gesture context (e.g., button click).
 * @returns {Promise<boolean>} true if file was selected successfully
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

    await chrome.storage.local.set({ [HANDLE_KEY]: fileHandle });

    const file = await fileHandle.getFile();
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = createDefaultData();
    }

    await saveData(data);
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
 * @returns {Promise<boolean>} true if file was created successfully
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

    await chrome.storage.local.set({ [HANDLE_KEY]: fileHandle });

    const data = createDefaultData();
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('[Luffy Focus] File create error:', e);
    }
    return false;
  }
}

/**
 * Check if the saved file handle is still valid.
 * @returns {Promise<boolean>}
 */
export async function isFileHandleValid() {
  if (!isFileSystemAPIAvailable()) return false;
  try {
    const result = await chrome.storage.local.get(HANDLE_KEY);
    if (!result[HANDLE_KEY]) return false;
    const handle = await result[HANDLE_KEY];
    return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Migrate old data formats to current version.
 * @param {object} data
 * @returns {object}
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
