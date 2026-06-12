/**
 * Luffy Focus — Stats Calculations
 */
import { getTodayString, SESSION_TYPE, SESSION_STATUS } from './data-model.js';

/** Calculate XP for a session duration in minutes */
export function calculateXP(durationMinutes) {
  return Math.floor(durationMinutes / 5) * 5;
}

/** Get total completed sessions today */
export function getSessionsToday(data) {
  const today = getTodayString();
  return data.sessions.filter(s =>
    s.type === SESSION_TYPE.WORK &&
    s.status === SESSION_STATUS.COMPLETED &&
    s.startTime.startsWith(today)
  );
}

/** Get total focus time today (in minutes) */
export function getFocusTimeToday(data) {
  return getSessionsToday(data).reduce((sum, s) => sum + s.duration, 0);
}

/** Get current streak (consecutive days with at least 1 completed session) */
export function getStreak(data) {
  if (!data.sessions || data.sessions.length === 0) return 0;

  const workDates = new Set();
  data.sessions.forEach(s => {
    if (s.type === SESSION_TYPE.WORK && s.status === SESSION_STATUS.COMPLETED) {
      workDates.add(s.startTime.substring(0, 10));
    }
  });

  let streak = 0;
  const today = getTodayString();
  const checkDate = new Date(today);

  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (workDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** Get daily work/rest totals for the last 7 days */
export function getLast7DaysData(data) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const daySessions = data.sessions.filter(s => s.startTime.startsWith(dateStr));
    const workMinutes = daySessions
      .filter(s => s.type === SESSION_TYPE.WORK && s.status === SESSION_STATUS.COMPLETED)
      .reduce((sum, s) => sum + s.duration, 0);
    const restMinutes = daySessions
      .filter(s => s.type === SESSION_TYPE.REST && s.status === SESSION_STATUS.COMPLETED)
      .reduce((sum, s) => sum + s.duration, 0);

    const dow = d.getDay();
    const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    days.push({
      date: dateStr,
      label: labels[dow],
      workHours: Math.round((workMinutes / 60) * 10) / 10,
      restHours: Math.round((restMinutes / 60) * 10) / 10,
      workMinutes,
      restMinutes,
      isToday: dateStr === getTodayString(),
    });
  }
  return days;
}

/** Get today's session log sorted by time */
export function getTodayLog(data) {
  const today = getTodayString();
  return data.sessions
    .filter(s => s.startTime.startsWith(today))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(s => ({
      ...s,
      xp: s.type === SESSION_TYPE.WORK ? calculateXP(s.duration) : 0,
    }));
}

/** Format minutes to a human-readable string */
export function formatMinutes(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}.${Math.round(m / 6)}H` : `${h}H`;
  }
  return `${minutes}M`;
}

/** Format time for display (e.g., "09:00 AM") */
export function formatTime(isoString) {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
}
