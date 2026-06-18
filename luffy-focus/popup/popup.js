/**
 * Luffy Focus — Popup Entry Point
 */
import { initNav, switchScreen } from './components/nav.js';
import { initTimerScreen, updateTimerScreen, getTimerButtons } from './screens/timer.js';
import { initTemplatesScreen, refreshTemplates } from './screens/templates.js';
import { initStatsScreen, refreshStats } from './screens/stats.js';
import { showSummary, showSummaryOverlay } from './screens/summary.js';
import { loadData, saveData, exportToFile, importFromFile, selectStorageFile, createStorageFile, isFileHandleValid, hasStoredData, isFileSystemAPIAvailable } from '../lib/storage.js';
import { createTemplate, updateTemplate, deleteTemplate, setActiveTemplate } from '../lib/templates.js';
import { TIMER_STATE, SESSION_TYPE } from '../lib/data-model.js';

// ── App State ──
let appData = null;
let timerState = null;
let currentTemplate = null;
let pendingSummarySession = null;
let pollIntervalId = null;
let previousTimerState = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupSettingsButton();
  startPolling();
});

async function initializeApp() {
  // If File API is available but no file handle exists, check if we have
  // data in chrome.storage.local. If we do, skip the file setup — the user
  // has already used the extension before. They can reconnect a file later
  // via Settings → Import/Export.
  if (isFileSystemAPIAvailable()) {
    const hasFile = await isFileHandleValid();
    if (!hasFile) {
      const hasData = await hasStoredData();
      if (!hasData) {
        showFileSetup();
        return; // First-time user must pick a file or skip
      }
      // Data exists in storage but file handle was lost — proceed with storage
      console.log('[LF] Using chrome.storage.local (file handle not available)');
    }
  }

  await loadStateAndRender();
}

async function loadStateAndRender() {
  await loadStateFromSW();
  previousTimerState = timerState ? { ...timerState } : null;
  renderAllScreens();
}

/** First-run screen: user picks or creates a JSON file for storage */
function showFileSetup() {
  const timerScreen = document.getElementById('screen-timer');
  if (!timerScreen) return;

  timerScreen.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-lg p-gutter" style="height: 100%; text-align: center;">
      <span style="font-size: 48px;">🏴‍☠️</span>
      <h2 class="text-headline-md">WELCOME, CAPTAIN!</h2>
      <p class="text-body-base text-on-surface-variant" style="line-height: 1.6;">
        Choose a JSON file to store your voyage data.<br>
        <span style="font-size: 10px;">It will auto-save every time you make changes.</span>
      </p>
      <button id="btn-select-file" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md);">
        📂 SELECT EXISTING FILE
      </button>
      <button id="btn-create-file" class="pixel-btn w-full" style="padding: var(--space-md);">
        ✨ CREATE NEW FILE
      </button>
      <button id="btn-skip-file" class="pixel-btn" style="padding: var(--space-sm); font-size: var(--fs-label-caps);">
        SKIP (browser storage only)
      </button>
    </div>
  `;

  timerScreen.querySelector('#btn-select-file').addEventListener('click', async () => {
    const ok = await selectStorageFile();
    if (ok) await loadStateAndRender();
  });
  timerScreen.querySelector('#btn-create-file').addEventListener('click', async () => {
    const ok = await createStorageFile();
    if (ok) await loadStateAndRender();
  });
  timerScreen.querySelector('#btn-skip-file').addEventListener('click', async () => {
    await loadStateAndRender();
  });
}

function renderAllScreens() {
  const timerScreen = document.getElementById('screen-timer');
  const templatesScreen = document.getElementById('screen-templates');
  const statsScreen = document.getElementById('screen-stats');

  // Timer screen (pass template switch callback)
  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplay(), appData, currentTemplate }, handleTemplateSwitch);
  }
  // Templates screen
  if (templatesScreen) {
    initTemplatesScreen(templatesScreen, appData, handleTemplateChange);
  }
  // Stats screen
  if (statsScreen) {
    initStatsScreen(statsScreen, appData, handleSessionDelete);
  }

  // Navigation: re-init screens when switching tabs
  initNav((screenName) => {
    if (screenName === 'timer') {
      const ts = document.getElementById('screen-timer');
      if (ts) {
        initTimerScreen(ts, { timerState, display: getDisplay(), appData, currentTemplate }, handleTemplateSwitch);
        wireTimerButtons();
      }
    }
    if (screenName === 'stats') {
      refreshStats(statsScreen, appData, handleSessionDelete);
    }
    if (screenName === 'templates') {
      refreshTemplates(templatesScreen, appData);
    }
  });

  wireTimerButtons();

  // Check for pending summary
  checkPendingSummary();
}

function getDisplay() {
  if (!timerState) return { display: '00:00', minutes: 0, seconds: 0, totalSeconds: 0 };
  const r = timerState.remainingSeconds || 0;
  return {
    display: `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`,
    minutes: Math.floor(r / 60),
    seconds: r % 60,
    totalSeconds: r,
  };
}

// ── SW Communication ──
async function loadStateFromSW() {
  // ALWAYS load appData from chrome.storage.local (source of truth).
  // The SW's in-memory copy can be stale if UPDATE_APP_DATA was
  // lost during SW termination. Storage is the authority.
  appData = await loadData();
  currentTemplate = appData.templates?.find(t => t.id === appData.activeTemplateId) || appData.templates?.[0] || null;
  console.log('[LF] Loaded from storage, activeTemplateId:', appData.activeTemplateId, 'template:', currentTemplate?.name);

  // Get timer state from SW (only the SW knows the running countdown)
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (resp && resp.timerState) {
      timerState = resp.timerState;
      console.log('[LF] Timer state from SW:', timerState?.state);
    }
  } catch (e) {
    console.log('[LF] SW not available, timer idle');
  }
}

function sendToSW(message) {
  return chrome.runtime.sendMessage(message).catch(e => {
    console.error('[LF] SW:', e.message);
    return { success: false, error: e.message };
  });
}

// ── Polling (countdown only) ──
function startPolling() {
  pollIntervalId = setInterval(async () => {
    const resp = await sendToSW({ type: 'GET_STATE' });
    if (resp && resp.timerState) {
      timerState = resp.timerState;
      // Detect transitions to 'done' → show toast
      if (previousTimerState &&
          previousTimerState.state !== 'done' &&
          timerState.state === 'done') {
        showCompletionToast(timerState.type);
      }
      previousTimerState = { ...timerState };
      updateTimerScreen({ timerState, display: resp.display || getDisplay(), appData, currentTemplate });
      checkPendingSummary();
    }
  }, 1000);
}

// ── Toast Notification ──
function showCompletionToast(sessionType) {
  const toast = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;

  const isWork = sessionType === 'work';
  toast.className = 'toast-notification' + (isWork ? '' : ' toast-notification--rest');
  toastText.textContent = isWork
    ? '🏴‍☠️ WORK COMPLETE! Rest session started!'
    : '⚡ REST COMPLETE! Ready for next voyage!';
  toast.classList.remove('hidden');

  // Re-add hidden after animation finishes
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// ── Timer Buttons ──
function wireTimerButtons() {
  const btns = getTimerButtons();
  if (!btns.main || !btns.reset) {
    setTimeout(wireTimerButtons, 50);
    return;
  }

  btns.main.onclick = async () => {
    let resp;
    switch (timerState?.state) {
      case TIMER_STATE.IDLE:
      case TIMER_STATE.DONE:
        resp = await sendToSW({ type: 'START' }); break;
      case TIMER_STATE.WORKING:
      case TIMER_STATE.RESTING:
        resp = await sendToSW({ type: 'PAUSE' }); break;
      case TIMER_STATE.PAUSED:
        resp = await sendToSW({ type: 'RESUME' }); break;
      default:
        resp = await sendToSW({ type: 'START' });
    }
    if (resp?.success) {
      timerState = resp.timerState;
      updateTimerScreen({ timerState, display: resp.display, appData, currentTemplate });
    }
  };

  btns.reset.onclick = async () => {
    const resp = await sendToSW({ type: 'RESET' });
    if (resp?.success) {
      timerState = resp.timerState;
      updateTimerScreen({ timerState, display: resp.display, appData, currentTemplate });
    }
  };
}

// ── Template Operations ──

/** Called when user edits/creates/deletes/switches a template */
async function handleTemplateChange(action, payload) {
  // 1. Update local data
  switch (action) {
    case 'createTemplate':
      appData = createTemplate(appData, payload); break;
    case 'updateTemplate':
      appData = updateTemplate(appData, payload.templateId, payload.updates); break;
    case 'deleteTemplate':
      appData = deleteTemplate(appData, payload.templateId); break;
    case 'setActiveTemplate':
      appData = setActiveTemplate(appData, payload.templateId); break;
  }

  // 2. Update current template reference
  const oldTemplateId = currentTemplate?.id;
  currentTemplate = appData.templates.find(t => t.id === appData.activeTemplateId) || appData.templates[0] || null;
  const templateChanged = oldTemplateId !== currentTemplate?.id;
  console.log('[LF] handleTemplateChange:', action, 'activeTemplateId:', appData.activeTemplateId, 'currentTemplate:', currentTemplate?.name);

  // 3. PERSIST to storage — MUST await to ensure data is written
  await saveData(appData);
  console.log('[LF] Data saved to chrome.storage.local');

  // 4. Sync to SW and await confirmation (SW will also update its timer state if needed)
  const swResp = await sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });
  console.log('[LF] SW sync result:', swResp?.success ? 'OK' : 'FAILED');

  // 5. Refresh templates list
  const tScreen = document.getElementById('screen-templates');
  if (tScreen) refreshTemplates(tScreen, appData);

  // 6. Update local timer state if IDLE and template changed
  // (the SW timer state holds the old template's duration until reset)
  if (timerState && (timerState.state === TIMER_STATE.IDLE || timerState.state === TIMER_STATE.DONE)) {
    if (templateChanged || action === 'updateTemplate' || action === 'createTemplate' || action === 'deleteTemplate') {
      timerState = {
        ...timerState,
        templateId: currentTemplate?.id || timerState.templateId,
        remainingSeconds: (currentTemplate?.workDuration || 25) * 60,
        totalSeconds: (currentTemplate?.workDuration || 25) * 60,
        type: SESSION_TYPE.WORK,
      };
      console.log('[LF] Updated local timerState for new template:', currentTemplate?.name, 'duration:', currentTemplate?.workDuration + 'm');
    }
  }

  // 7. ALWAYS re-init timer screen with latest data
  const timerScreen = document.getElementById('screen-timer');
  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplay(), appData, currentTemplate }, handleTemplateSwitch);
    wireTimerButtons();
    console.log('[LF] Timer screen re-initialized with template:', currentTemplate?.name);
  }
}

/** Called when user switches template from the timer screen buttons */
async function handleTemplateSwitch(templateId) {
  appData = setActiveTemplate(appData, templateId);
  currentTemplate = appData.templates.find(t => t.id === templateId) || appData.templates[0] || null;
  console.log('[LF] handleTemplateSwitch to:', currentTemplate?.name);

  await saveData(appData);
  await sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });

  const timerScreen = document.getElementById('screen-timer');
  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplay(), appData, currentTemplate }, handleTemplateSwitch);
    wireTimerButtons();
  }
  const tScreen = document.getElementById('screen-templates');
  if (tScreen) refreshTemplates(tScreen, appData);
}


// ── Session Deletion ──

/** Delete a completed session from appData, persist, and re-render stats */
async function handleSessionDelete(sessionId) {
  const idx = appData.sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  appData.sessions.splice(idx, 1);

  await saveData(appData);
  await sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });

  const statsScreen = document.getElementById('screen-stats');
  if (statsScreen) {
    initStatsScreen(statsScreen, appData, handleSessionDelete);
  }
}

// ── Summary ──
function checkPendingSummary() {
  if (timerState?.state === TIMER_STATE.DONE && timerState?.type === 'work' && !pendingSummarySession) {
    const last = appData.sessions[appData.sessions.length - 1];
    if (last && !last.summary && last.type === 'work') {
      pendingSummarySession = last;
      showSummaryOverlay();
      const ss = document.getElementById('screen-summary');
      showSummary(ss, {
        id: last.id,
        templateName: currentTemplate?.name || 'Focus',
        duration: last.duration,
      }, { onSave: handleSummarySave, onDiscard: handleSummaryDiscard });
    }
  }
}

async function handleSummarySave(sessionId, summary) {
  await sendToSW({ type: 'SAVE_SESSION_SUMMARY', payload: { sessionId, summary } });
  pendingSummarySession = null;
  await loadStateFromSW();
  switchScreen('timer');
}

async function handleSummaryDiscard(sessionId) {
  await sendToSW({ type: 'SAVE_SESSION_SUMMARY', payload: { sessionId, summary: '' } });
  pendingSummarySession = null;
  await loadStateFromSW();
  switchScreen('timer');
}

// ── Settings ──
function setupSettingsButton() {
  const btn = document.getElementById('btn-settings');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const c = prompt('⚙ SETTINGS\n\n1. Daily goal\n2. Export to JSON\n3. Import from JSON\n\nEnter 1/2/3:');
    if (!c) return;

    if (c === '1') {
      const g = prompt('Daily sessions:', appData?.settings?.dailyGoal || 8);
      if (g && parseInt(g) > 0) {
        appData.settings.dailyGoal = parseInt(g);
        saveData(appData);
        sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });
        updateTimerScreen({ timerState, display: getDisplay(), appData, currentTemplate });
      }
    } else if (c === '2') {
      exportToFile(appData).then(ok => { if (ok) alert('✅ Exported!'); });
    } else if (c === '3') {
      if (!confirm('Import replaces all data. Continue?')) return;
      importFromFile().then(async (data) => {
        if (data) {
          appData = data;
          currentTemplate = appData.templates?.find(t => t.id === appData.activeTemplateId) || appData.templates?.[0] || null;
          await sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });
          renderAllScreens();
          alert('✅ Imported!');
        } else alert('❌ Failed');
      });
    }
  });
}
