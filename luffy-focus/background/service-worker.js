/**
 * Luffy Focus — Service Worker
 * Hosts the timer engine, manages alarms, badge, notifications.
 * Communicates with popup via chrome.runtime messages.
 */
import {
  createTimerState, startWork, startRest, pauseTimer,
  resumeTimer, resetTimer, completeTimer, tickTimer, getTimerDisplay
} from '../lib/timer-engine.js';
import { getActiveTemplate } from '../lib/templates.js';
import { loadData, saveData } from '../lib/storage.js';
import { notifyWorkComplete, notifyRestComplete, updateBadge } from '../lib/notifications.js';
import { SESSION_TYPE, SESSION_STATUS } from '../lib/data-model.js';
import { generateId } from '../lib/data-model.js';

// --- State ---
let appData = null;
let timerState = null;
let tickIntervalId = null;
let currentTemplate = null;

// --- Lifecycle ---
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Luffy Focus] Extension installed');
  await initializeState();
});

// Ensure state is loaded when SW wakes up
initializeState();

async function initializeState() {
  if (!appData) {
    appData = await loadData();
  }
  currentTemplate = getActiveTemplate(appData);

  // Restore timer from persisted state
  if (appData.currentTimer && appData.currentTimer.endTime) {
    const endTime = new Date(appData.currentTimer.endTime).getTime();
    const now = Date.now();
    if (endTime > now) {
      // Timer is still running — resume
      timerState = {
        state: appData.currentTimer.type === SESSION_TYPE.WORK ? 'working' : 'resting',
        templateId: appData.currentTimer.templateId,
        type: appData.currentTimer.type,
        endTime: endTime,
        pausedAt: null,
        remainingSeconds: Math.floor((endTime - now) / 1000),
        totalSeconds: appData.currentTimer.type === SESSION_TYPE.WORK
          ? (currentTemplate?.workDuration || 25) * 60
          : (currentTemplate?.restDuration || 5) * 60,
      };
      startTickInterval();
      updateBadgeFromState();
    } else {
      // Timer expired while SW was inactive
      await handleTimerFinished();
    }
  }

  if (!timerState) {
    timerState = createTimerState(currentTemplate || { id: 'default', workDuration: 25, restDuration: 5 });
  }
}

// --- Tick Loop ---
function startTickInterval() {
  stopTickInterval();
  tickIntervalId = setInterval(onTick, 1000);
}

function stopTickInterval() {
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
}

function onTick() {
  if (!timerState) return;

  const { state, finished } = tickTimer(timerState);
  timerState = state;

  updateBadgeFromState();

  if (finished) {
    handleTimerFinished();
  }

  // Persist timer state so popup can read it even if SW restarts
  persistTimerState();
}

function updateBadgeFromState() {
  if (!timerState) return;
  const display = getTimerDisplay(timerState);
  updateBadge(timerState.state, display.minutes);
}

async function handleTimerFinished() {
  stopTickInterval();

  if (!currentTemplate) currentTemplate = getActiveTemplate(appData);

  if (timerState.type === SESSION_TYPE.WORK) {
    // Record the completed work session
    const session = {
      id: generateId('sess'),
      templateId: timerState.templateId,
      type: SESSION_TYPE.WORK,
      status: SESSION_STATUS.COMPLETED,
      startTime: new Date(Date.now() - (timerState.totalSeconds * 1000)).toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.floor(timerState.totalSeconds / 60),
      summary: '',
    };
    appData.sessions.push(session);
    timerState = completeTimer(timerState);
    updateBadge('done', 0);
    await notifyWorkComplete(currentTemplate.name, session.duration);

    // Auto-start rest if enabled
    if (appData.settings.autoStartRest && currentTemplate) {
      timerState = startRest(
        { ...createTimerState(currentTemplate), type: SESSION_TYPE.REST, totalSeconds: currentTemplate.restDuration * 60 },
        currentTemplate.restDuration * 60
      );
      startTickInterval();
    }
  } else if (timerState.type === SESSION_TYPE.REST) {
    // Record the completed rest session
    const session = {
      id: generateId('sess'),
      templateId: timerState.templateId,
      type: SESSION_TYPE.REST,
      status: SESSION_STATUS.COMPLETED,
      startTime: new Date(Date.now() - (timerState.totalSeconds * 1000)).toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.floor(timerState.totalSeconds / 60),
      summary: '',
    };
    appData.sessions.push(session);
    timerState = completeTimer(timerState);
    updateBadge('done', 0);
    await notifyRestComplete();

    // Reset to IDLE for next work session
    if (currentTemplate) {
      timerState = createTimerState(currentTemplate);
    }
  }

  await persistAll();
}

async function persistTimerState() {
  if (!appData || !timerState) return;
  appData.currentTimer = {
    templateId: timerState.templateId,
    type: timerState.type,
    endTime: timerState.endTime ? new Date(timerState.endTime).toISOString() : null,
    pausedAt: timerState.pausedAt ? new Date(timerState.pausedAt).toISOString() : null,
    remainingSeconds: timerState.remainingSeconds,
  };
  saveData(appData).catch(console.error);
}

async function persistAll() {
  if (!appData) return;
  appData.currentTimer = {
    templateId: timerState?.templateId || currentTemplate?.id || '',
    type: timerState?.type || SESSION_TYPE.WORK,
    endTime: timerState?.endTime ? new Date(timerState.endTime).toISOString() : null,
    pausedAt: timerState?.pausedAt ? new Date(timerState.pausedAt).toISOString() : null,
    remainingSeconds: timerState?.remainingSeconds || 0,
  };
  await saveData(appData);
}

// --- Message Handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async
});

async function handleMessage(message) {
  switch (message.type) {
    case 'GET_STATE': {
      if (!appData) await initializeState();
      const display = timerState ? getTimerDisplay(timerState) : { display: '00:00', minutes: 0, seconds: 0, totalSeconds: 0 };
      return {
        timerState: timerState ? { ...timerState } : null,
        display,
        appData: { ...appData },
        currentTemplate,
      };
    }

    case 'START': {
      if (!currentTemplate) currentTemplate = getActiveTemplate(appData);
      if (!currentTemplate) return { success: false, error: 'No active template' };
      timerState = startWork(timerState);
      timerState.totalSeconds = currentTemplate.workDuration * 60;
      timerState.remainingSeconds = currentTemplate.workDuration * 60;
      startTickInterval();
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'PAUSE': {
      timerState = pauseTimer(timerState);
      stopTickInterval();
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'RESUME': {
      timerState = resumeTimer(timerState);
      startTickInterval();
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'RESET': {
      if (!currentTemplate) currentTemplate = getActiveTemplate(appData);
      if (!currentTemplate) return { success: false, error: 'No active template' };
      timerState = resetTimer(timerState, currentTemplate);
      stopTickInterval();
      updateBadge('idle', 0);
      await persistAll();
      const display = getTimerDisplay(timerState);
      return { success: true, timerState: { ...timerState }, display };
    }

    case 'SAVE_SESSION_SUMMARY': {
      const { sessionId, summary } = message.payload;
      const session = appData.sessions.find(s => s.id === sessionId);
      if (session) {
        session.summary = summary;
        await persistAll();
      }
      return { success: true };
    }

    case 'RELOAD_APP_DATA': {
      appData = await loadData();
      currentTemplate = getActiveTemplate(appData);
      return { success: true, appData: { ...appData }, currentTemplate };
    }

    case 'UPDATE_APP_DATA': {
      const oldTemplateId = currentTemplate?.id;
      const oldWorkDuration = currentTemplate?.workDuration;
      appData = message.payload;
      currentTemplate = getActiveTemplate(appData);
      const templateChanged = oldTemplateId !== currentTemplate?.id;
      const durationChanged = oldWorkDuration !== currentTemplate?.workDuration;

      // If timer is IDLE/DONE and template/duration changed, reset timer state
      // so the countdown reflects the current template's work duration
      if (timerState && (timerState.state === 'idle' || timerState.state === 'done')) {
        if (templateChanged || durationChanged) {
          timerState = createTimerState(currentTemplate || { id: 'default', workDuration: 25, restDuration: 5 });
          console.log('[LF SW] Reset timer state for template:', currentTemplate?.name, 'duration:', currentTemplate?.workDuration + 'm');
        }
      }

      await persistAll();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// --- Notification Click ---
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'luffy_work_done' || notificationId === 'luffy_rest_done') {
    // Clicking the notification focuses the extension popup
    // The popup will check state and show summary screen if needed
  }
});
