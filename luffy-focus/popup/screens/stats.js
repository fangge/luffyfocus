/**
 * Luffy Focus — Statistics Screen (Voyage Logs)
 */
import { getSessionsToday, getFocusTimeToday, getStreak, getLast7DaysData, getTodayLog, formatTime, calculateXP } from '../../lib/stats.js';
import { renderWeekChart } from '../components/chart.js';

/**
 * Initialize and render the stats screen.
 */
export function initStatsScreen(container, appData) {
  const sessionsToday = getSessionsToday(appData);
  const focusMinutes = getFocusTimeToday(appData);
  const streak = getStreak(appData);
  const weekData = getLast7DaysData(appData);
  const todayLog = getTodayLog(appData);

  const focusHours = Math.round((focusMinutes / 60) * 10) / 10;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <header class="flex items-center gap-sm mt-sm">
        <span style="font-size: 24px;">📊</span>
        <h1 class="text-headline-md text-on-background">VOYAGE LOGS</h1>
      </header>

      <div class="pixel-divider"></div>

      <section class="grid grid-cols-3 gap-sm" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-sm);">
        <div class="pixel-card" style="text-align: center;">
          <div class="text-label-caps text-on-surface-variant">SESSIONS</div>
          <div class="text-display-lg text-primary" style="margin-top: var(--space-xs);">${String(sessionsToday.length).padStart(2, '0')}</div>
        </div>
        <div class="pixel-card" style="text-align: center;">
          <div class="text-label-caps text-on-surface-variant">FOCUS</div>
          <div class="text-display-lg text-tertiary" style="margin-top: var(--space-xs);">${focusHours}<span class="text-label-caps">H</span></div>
        </div>
        <div class="pixel-card" style="text-align: center; background: var(--color-warning); border-color: var(--color-on-background);">
          <div class="text-label-caps" style="color: var(--color-on-secondary-fixed);">STREAK</div>
          <div class="text-display-lg" style="color: var(--color-on-secondary-fixed); margin-top: var(--space-xs);">${streak}<span class="text-label-caps">D</span></div>
        </div>
      </section>

      <section class="pixel-card relative" style="padding-top: var(--space-lg);">
        <div class="pixel-card__title">WORK VS REST (7D)</div>
        <canvas id="week-chart-canvas" style="width: 100%; height: 200px; margin-top: var(--space-md);"></canvas>
        <div class="flex justify-center gap-md mt-sm" style="display: flex; justify-content: center; gap: var(--space-md); margin-top: var(--space-sm);">
          <div class="flex items-center gap-xs" style="display: flex; align-items: center; gap: var(--space-xs);">
            <div style="width: 12px; height: 12px; background: #e41000; border: 2px solid var(--color-on-background);"></div>
            <span class="text-label-caps">WORK</span>
          </div>
          <div class="flex items-center gap-xs" style="display: flex; align-items: center; gap: var(--space-xs);">
            <div style="width: 12px; height: 12px; background: #92cc41; border: 2px solid var(--color-on-background);"></div>
            <span class="text-label-caps">REST</span>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-headline-md mb-sm">TODAY'S LOG</h2>
        <div class="flex flex-col gap-sm" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          ${todayLog.length === 0
            ? '<div class="pixel-card text-label-caps text-on-surface-variant" style="text-align: center; padding: var(--space-lg);">No sessions yet today. Start the timer!</div>'
            : todayLog.map(s => renderLogEntry(s)).join('')
          }
        </div>
      </section>
    </div>
  `;

  // Render chart after DOM is available
  requestAnimationFrame(() => {
    const canvas = container.querySelector('#week-chart-canvas');
    if (canvas) {
      renderWeekChart(canvas, weekData);
    }
  });
}

function renderLogEntry(session) {
  const isWork = session.type === 'work';
  const icon = isWork ? '💻' : '☕';
  const borderStyle = isWork ? '' : 'border-style: dashed;';
  const timeRange = `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;
  const xpDisplay = isWork
    ? `<span class="text-body-bold text-success">+${calculateXP(session.duration)} XP</span>`
    : `<span class="text-body-bold text-on-surface-variant">${session.duration} MIN</span>`;
  const statusLabel = isWork ? 'Completed' : 'Restored';

  return `
    <div class="pixel-card flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; ${borderStyle} padding: var(--space-sm);">
      <div class="flex items-center gap-sm" style="display: flex; align-items: center; gap: var(--space-sm);">
        <div class="pixel-border flex items-center justify-center" style="width: 32px; height: 32px; background: var(--color-surface-container);">
          <span style="font-size: 14px;">${icon}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-body-bold" style="text-transform: uppercase;">${isWork ? (session.summary ? session.summary.substring(0, 30) + (session.summary.length > 30 ? '...' : '') : 'FOCUS SESSION') : 'SHORT BREAK'}</span>
          <span class="text-label-caps text-on-surface-variant">${timeRange}</span>
        </div>
      </div>
      <div class="text-right flex flex-col items-end">
        ${xpDisplay}
        <span class="text-label-caps text-on-surface-variant">${statusLabel}</span>
      </div>
    </div>
  `;
}

/** Refresh stats when switching to this tab */
export function refreshStats(container, appData) {
  initStatsScreen(container, appData);
}
