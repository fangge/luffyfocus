/**
 * Luffy Focus — Data Model & Constants
 * Shared between service worker and popup
 */

/** Generate a unique ID with prefix */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/** Days of week mapping */
export const DAYS = [
  { key: 1, label: 'M' },
  { key: 2, label: 'T' },
  { key: 3, label: 'W' },
  { key: 4, label: 'T' },
  { key: 5, label: 'F' },
  { key: 6, label: 'S' },
  { key: 7, label: 'S' },
];

/** Timer states */
export const TIMER_STATE = {
  IDLE: 'idle',
  WORKING: 'working',
  PAUSED: 'paused',
  RESTING: 'resting',
  DONE: 'done',
};

/** Session types */
export const SESSION_TYPE = {
  WORK: 'work',
  REST: 'rest',
};

/** Session status */
export const SESSION_STATUS = {
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

/** Default template */
export const DEFAULT_TEMPLATE = {
  id: 'tpl_default',
  name: 'Default Focus',
  workDuration: 25,
  restDuration: 5,
  activeDays: [1, 2, 3, 4, 5],
  color: '#e41000',
  createdAt: new Date().toISOString(),
};

/** Template color palette */
export const TEMPLATE_COLORS = [
  '#e41000', // Red (Luffy's vest)
  '#fcbc0b', // Gold (Mugiwara)
  '#004cd9', // Blue (Grand Line)
  '#92cc41', // Green
  '#7a5900', // Brown
  '#e76e55', // Crimson
  '#2765ff', // Bright blue
  '#b60b00', // Dark red
];

/** Create a fresh data store */
export function createDefaultData() {
  const now = new Date().toISOString();
  return {
    version: 1,
    settings: {
      dailyGoal: 8,
      notificationsEnabled: true,
      autoStartRest: false,
    },
    templates: [{ ...DEFAULT_TEMPLATE, createdAt: now }],
    activeTemplateId: DEFAULT_TEMPLATE.id,
    sessions: [],
    currentTimer: {
      templateId: DEFAULT_TEMPLATE.id,
      type: SESSION_TYPE.WORK,
      endTime: null,
      pausedAt: null,
      remainingSeconds: 0,
    },
    storageFilePath: '',
  };
}

/** Get today's date string in YYYY-MM-DD format (local timezone) */
export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get the day-of-week key (1=Mon, 7=Sun) for a given date string */
export function getDayOfWeek(dateString) {
  const d = new Date(dateString);
  // JS getDay() returns 0=Sun, convert to 1=Mon..7=Sun
  return d.getDay() === 0 ? 7 : d.getDay();
}

/** Check if today is an active day for a template */
export function isTemplateActiveToday(template) {
  const todayDow = getDayOfWeek(getTodayString());
  return template.activeDays.includes(todayDow);
}
