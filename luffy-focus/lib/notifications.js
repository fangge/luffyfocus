/**
 * Luffy Focus — Notification Helpers
 * For use in service worker context.
 */

const NOTIFICATION_IDS = {
  WORK_DONE: 'luffy_work_done',
  REST_DONE: 'luffy_rest_done',
};

/**
 * Show notification when a work session completes.
 * @param {string} templateName - Name of the template used
 * @param {number} durationMinutes - Duration completed
 */
export async function notifyWorkComplete(templateName, durationMinutes) {
  await clearAll();

  chrome.notifications.create(NOTIFICATION_IDS.WORK_DONE, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: '🏴‍☠️ Well Done, Captain!',
    message: `"${templateName}" completed! (${durationMinutes} min)\nClick to log your session.`,
    priority: 2,
    requireInteraction: true,
  });
}

/**
 * Show notification when a rest session completes.
 */
export async function notifyRestComplete() {
  await clearAll();

  chrome.notifications.create(NOTIFICATION_IDS.REST_DONE, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: '⚡ Break Over!',
    message: "Ready for the next voyage? Let's get back to work!",
    priority: 1,
    requireInteraction: true,
  });
}

/** Clear all Luffy Focus notifications */
async function clearAll() {
  const ids = Object.values(NOTIFICATION_IDS);
  for (const id of ids) {
    try {
      chrome.notifications.clear(id);
    } catch { /* ignore */ }
  }
}

/**
 * Update the extension badge based on timer state.
 * @param {string} state - Timer state (idle, working, resting, paused, done)
 * @param {number} remainingMinutes - Minutes remaining
 */
export function updateBadge(state, remainingMinutes) {
  switch (state) {
    case 'working':
      chrome.action.setBadgeText({ text: String(remainingMinutes) });
      chrome.action.setBadgeBackgroundColor({ color: '#e41000' });
      break;
    case 'resting':
      chrome.action.setBadgeText({ text: String(remainingMinutes) });
      chrome.action.setBadgeBackgroundColor({ color: '#92cc41' });
      break;
    case 'paused':
      chrome.action.setBadgeText({ text: '⏸' });
      chrome.action.setBadgeBackgroundColor({ color: '#f7d51d' });
      break;
    default:
      chrome.action.setBadgeText({ text: '' });
      break;
  }
}
