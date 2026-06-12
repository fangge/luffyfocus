/**
 * Luffy Focus — Popup Entry Point
 * App initialization, screen routing, service worker communication.
 */
import { initNav, switchScreen } from './components/nav.js';
import { initTimerScreen, updateTimerScreen, getTimerButtons } from './screens/timer.js';
import { initTemplatesScreen, refreshTemplates } from './screens/templates.js';
import { initStatsScreen, refreshStats } from './screens/stats.js';
import { showSummary, showSummaryOverlay } from './screens/summary.js';
import { loadData, saveData, selectStorageFile, createStorageFile, isFileHandleValid, isFileSystemAPIAvailable } from '../lib/storage.js';
import { createTemplate, updateTemplate, deleteTemplate, setActiveTemplate } from '../lib/templates.js';
import { TIMER_STATE } from '../lib/data-model.js';

// App State
let appData = null;
let timerState = null;
let currentTemplate = null;
let pendingSummarySession = null;
let pollIntervalId = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupSettingsButton();
  startPolling();
});

async function initializeApp() {
  // Check file handle
  if (isFileSystemAPIAvailable()) {
    const handleValid = await isFileHandleValid();
    if (!handleValid) {
      showStorageSetup();
      return;
    }
  }

  await loadStateFromSW();
  renderAllScreens();
}

function renderAllScreens() {
  const timerScreen = document.getElementById('screen-timer');
  const templatesScreen = document.getElementById('screen-templates');
  const statsScreen = document.getElementById('screen-stats');

  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplayFromState(), appData, currentTemplate });
  }
  if (templatesScreen) {
    initTemplatesScreen(templatesScreen, appData, handleTemplateChange);
  }
  if (statsScreen) {
    initStatsScreen(statsScreen, appData);
  }

  initNav((screenName) => {
    if (screenName === 'stats') {
      refreshStats(statsScreen, appData);
    }
    if (screenName === 'templates') {
      refreshTemplates(templatesScreen, appData);
    }
  });

  wireTimerButtons();

  // Check if we need to show summary for a completed session
  if (timerState?.state === TIMER_STATE.DONE && timerState?.type === 'work') {
    const lastSession = appData.sessions[appData.sessions.length - 1];
    if (lastSession && !lastSession.summary && lastSession.type === 'work') {
      pendingSummarySession = lastSession;
      showSummaryOverlay();
      const summaryScreen = document.getElementById('screen-summary');
      showSummary(summaryScreen, {
        id: lastSession.id,
        templateName: currentTemplate?.name || 'Focus',
        duration: lastSession.duration,
      }, {
        onSave: handleSummarySave,
        onDiscard: handleSummaryDiscard,
      });
    }
  }
}

function getDisplayFromState() {
  if (!timerState) return { display: '00:00', minutes: 0, seconds: 0, totalSeconds: 0 };
  const remaining = timerState.remainingSeconds || 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return {
    display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    minutes: mins,
    seconds: secs,
    totalSeconds: remaining,
  };
}

// --- Service Worker Communication ---
async function loadStateFromSW() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (response) {
      timerState = response.timerState;
      appData = response.appData;
      currentTemplate = response.currentTemplate;
    }
  } catch (e) {
    console.warn('[Luffy Focus] SW not available, loading from storage directly');
    appData = await loadData();
  }
}

async function sendToSW(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (e) {
    console.error('[Luffy Focus] SW communication error:', e);
    return { success: false, error: e.message };
  }
}

// --- Polling ---
function startPolling() {
  pollIntervalId = setInterval(async () => {
    const response = await sendToSW({ type: 'GET_STATE' });
    if (response && response.timerState) {
      timerState = response.timerState;
      appData = response.appData;
      currentTemplate = response.currentTemplate;

      const display = getDisplayFromState();
      updateTimerScreen({ timerState, display: response.display || display, appData, currentTemplate });

      // Check for newly completed session
      if (timerState.state === TIMER_STATE.DONE && timerState.type === 'work' && !pendingSummarySession) {
        const lastSession = appData.sessions[appData.sessions.length - 1];
        if (lastSession && !lastSession.summary && lastSession.type === 'work') {
          pendingSummarySession = lastSession;
          showSummaryOverlay();
          const summaryScreen = document.getElementById('screen-summary');
          showSummary(summaryScreen, {
            id: lastSession.id,
            templateName: currentTemplate?.name || 'Focus',
            duration: lastSession.duration,
          }, {
            onSave: handleSummarySave,
            onDiscard: handleSummaryDiscard,
          });
        }
      }
    }
  }, 1000);
}

// --- Timer Button Wiring ---
function wireTimerButtons() {
  const buttons = getTimerButtons();
  if (!buttons.main || !buttons.reset) {
    setTimeout(wireTimerButtons, 100);
    return;
  }

  buttons.main.addEventListener('click', async () => {
    let response;
    switch (timerState?.state) {
      case TIMER_STATE.IDLE:
      case TIMER_STATE.DONE:
        response = await sendToSW({ type: 'START' });
        break;
      case TIMER_STATE.WORKING:
      case TIMER_STATE.RESTING:
        response = await sendToSW({ type: 'PAUSE' });
        break;
      case TIMER_STATE.PAUSED:
        response = await sendToSW({ type: 'RESUME' });
        break;
      default:
        response = await sendToSW({ type: 'START' });
    }

    if (response?.success) {
      timerState = response.timerState;
      updateTimerScreen({ timerState, display: response.display, appData, currentTemplate });
    }
  });

  buttons.reset.addEventListener('click', async () => {
    const response = await sendToSW({ type: 'RESET' });
    if (response?.success) {
      timerState = response.timerState;
      updateTimerScreen({ timerState, display: response.display, appData, currentTemplate });
    }
  });
}

// --- Template Change Handler ---
async function handleTemplateChange(action, payload) {
  switch (action) {
    case 'createTemplate':
      appData = createTemplate(appData, payload);
      break;
    case 'updateTemplate':
      appData = updateTemplate(appData, payload.templateId, payload.updates);
      break;
    case 'deleteTemplate':
      appData = deleteTemplate(appData, payload.templateId);
      break;
    case 'setActiveTemplate':
      appData = setActiveTemplate(appData, payload.templateId);
      break;
  }

  // Update current template reference from changed data
  currentTemplate = appData.templates.find(t => t.id === appData.activeTemplateId) || appData.templates[0] || null;

  // Sync full data to service worker so timer engine uses updated template
  await sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });

  // Refresh templates screen
  const templatesScreen = document.getElementById('screen-templates');
  if (templatesScreen) {
    refreshTemplates(templatesScreen, appData);
  }

  // Also update the timer screen to reflect template changes (name, durations, etc.)
  updateTimerScreen({ timerState, display: getDisplayFromState(), appData, currentTemplate });
}

// --- Summary Handlers ---
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

// --- Storage Setup ---
function showStorageSetup() {
  const timerScreen = document.getElementById('screen-timer');
  if (!timerScreen) return;

  timerScreen.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-lg p-gutter" style="height: 100%; text-align: center;">
      <span style="font-size: 48px;">🏴‍☠️</span>
      <h2 class="text-headline-md">WELCOME, CAPTAIN!</h2>
      <p class="text-body-base text-on-surface-variant">Choose where to store your voyage data.</p>
      <button id="btn-select-file" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md);">
        📂 SELECT EXISTING FILE
      </button>
      <button id="btn-create-file" class="pixel-btn w-full" style="padding: var(--space-md);">
        ✨ CREATE NEW FILE
      </button>
      <button id="btn-skip-storage" class="pixel-btn" style="padding: var(--space-sm); font-size: var(--fs-label-caps);">
        SKIP (use browser storage)
      </button>
    </div>
  `;

  timerScreen.querySelector('#btn-select-file').addEventListener('click', async () => {
    const success = await selectStorageFile();
    if (success) {
      await loadStateFromSW();
      renderAllScreens();
    }
  });

  timerScreen.querySelector('#btn-create-file').addEventListener('click', async () => {
    const success = await createStorageFile();
    if (success) {
      await loadStateFromSW();
      renderAllScreens();
    }
  });

  timerScreen.querySelector('#btn-skip-storage').addEventListener('click', async () => {
    appData = await loadData();
    await saveData(appData);
    await loadStateFromSW();
    renderAllScreens();
  });
}

// --- Settings Button ---
function setupSettingsButton() {
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const newGoal = prompt('Daily session goal:', appData?.settings?.dailyGoal || 8);
      if (newGoal && !isNaN(parseInt(newGoal)) && parseInt(newGoal) > 0) {
        appData.settings.dailyGoal = parseInt(newGoal);
        sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });
        updateTimerScreen({ timerState, display: getDisplayFromState(), appData, currentTemplate });
      }
    });
  }
}
