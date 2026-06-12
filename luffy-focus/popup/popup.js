/**
 * Luffy Focus — Popup Entry Point
 */
import { initNav, switchScreen } from './components/nav.js';
import { initTimerScreen, updateTimerScreen, getTimerButtons } from './screens/timer.js';
import { initTemplatesScreen, refreshTemplates } from './screens/templates.js';
import { initStatsScreen, refreshStats } from './screens/stats.js';
import { showSummary, showSummaryOverlay } from './screens/summary.js';
import { loadData, saveData, exportToFile, importFromFile } from '../lib/storage.js';
import { createTemplate, updateTemplate, deleteTemplate, setActiveTemplate } from '../lib/templates.js';
import { TIMER_STATE } from '../lib/data-model.js';

// ── App State ──
let appData = null;
let timerState = null;
let currentTemplate = null;
let pendingSummarySession = null;
let pollIntervalId = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupSettingsButton();
  startPolling();
});

async function initializeApp() {
  await loadStateFromSW();
  renderAllScreens();
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
    initStatsScreen(statsScreen, appData);
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
      refreshStats(statsScreen, appData);
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
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (resp && resp.appData) {
      timerState = resp.timerState;
      appData = resp.appData;
      currentTemplate = resp.currentTemplate;
      return;
    }
  } catch (e) { /* SW not ready */ }

  appData = await loadData();
  if (!currentTemplate) {
    currentTemplate = appData.templates?.find(t => t.id === appData.activeTemplateId) || appData.templates?.[0] || null;
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
      updateTimerScreen({ timerState, display: resp.display || getDisplay(), appData, currentTemplate });
      checkPendingSummary();
    }
  }, 1000);
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

// ── Template Operations (SYNCHRONOUS UI update + fire-and-forget SW sync) ──

/** Called when user edits/creates/deletes a template from the Templates screen */
function handleTemplateChange(action, payload) {
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
  currentTemplate = appData.templates.find(t => t.id === appData.activeTemplateId) || appData.templates[0] || null;

  // 3. Sync to SW (fire-and-forget — no await, UI doesn't wait for SW)
  sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });

  // 4. Refresh templates list (closes form, shows updated cards)
  const tScreen = document.getElementById('screen-templates');
  if (tScreen) refreshTemplates(tScreen, appData);

  // 5. ALWAYS re-init timer screen with latest data (regardless of active tab)
  const timerScreen = document.getElementById('screen-timer');
  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplay(), appData, currentTemplate }, handleTemplateSwitch);
    wireTimerButtons();
  }
}

/** Called when user switches template from the timer screen buttons */
function handleTemplateSwitch(templateId) {
  appData = setActiveTemplate(appData, templateId);
  currentTemplate = appData.templates.find(t => t.id === templateId) || appData.templates[0] || null;

  sendToSW({ type: 'UPDATE_APP_DATA', payload: appData });

  // Re-init both screens
  const timerScreen = document.getElementById('screen-timer');
  if (timerScreen) {
    initTimerScreen(timerScreen, { timerState, display: getDisplay(), appData, currentTemplate }, handleTemplateSwitch);
    wireTimerButtons();
  }
  const tScreen = document.getElementById('screen-templates');
  if (tScreen) refreshTemplates(tScreen, appData);
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
