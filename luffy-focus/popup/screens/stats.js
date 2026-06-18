/**
 * Luffy Focus — Statistics Screen (Voyage Logs)
 */
import { getSessionsToday, getFocusTimeToday, getStreak, getLast7DaysData, getTodayLog, getDayLog, formatTime } from '../../lib/stats.js';
import { getTodayString } from '../../lib/data-model.js';
import { renderWeekChart } from '../components/chart.js';

// Module state for date selection via chart click
let statsSelectedDate = null;

/**
 * Initialize and render the stats screen.
 */
export function initStatsScreen(container, appData) {
  const sessionsToday = getSessionsToday(appData);
  const focusMinutes = getFocusTimeToday(appData);
  const streak = getStreak(appData);
  const weekData = getLast7DaysData(appData);
  const templates = appData?.templates || [];

  const today = getTodayString();
  const viewingDate = statsSelectedDate || today;
  const isViewingToday = viewingDate === today;
  const dayLog = isViewingToday ? getTodayLog(appData) : getDayLog(appData, viewingDate);

  const focusHours = Math.round((focusMinutes / 60) * 10) / 10;

  // Format the viewing date for display
  const viewingDateLabel = formatDateLabel(viewingDate);

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
        <div id="chart-tooltip-container" style="position: relative;">
          <canvas id="week-chart-canvas" style="width: 100%; height: 200px; margin-top: var(--space-md); cursor: pointer;"></canvas>
          <div id="chart-tooltip" style="display: none; position: absolute; pointer-events: none; z-index: 10;"></div>
        </div>
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
        <div class="flex items-center justify-between mb-sm" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm);">
          <h2 class="text-headline-md">${isViewingToday ? "TODAY'S LOG" : 'LOG — ' + viewingDateLabel}</h2>
          ${!isViewingToday ? `<button id="btn-back-today" class="pixel-btn" style="padding: 4px 8px; font-size: 8px;">← BACK TO TODAY</button>` : ''}
        </div>
        <div class="flex flex-col gap-sm" style="display: flex; flex-direction: column; gap: var(--space-sm);">
          ${dayLog.length === 0
            ? `<div class="pixel-card text-label-caps text-on-surface-variant" style="text-align: center; padding: var(--space-lg);">No sessions on ${viewingDateLabel}.</div>`
            : dayLog.map(s => renderLogEntry(s, templates)).join('')
          }
        </div>
      </section>
    </div>
  `;

  // Wire back-to-today button
  const backBtn = container.querySelector('#btn-back-today');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      statsSelectedDate = null;
      initStatsScreen(container, appData);
    });
  }

  // Render chart + tooltip + click handler after DOM is available
  requestAnimationFrame(() => {
    const canvas = container.querySelector('#week-chart-canvas');
    if (canvas) {
      const barRects = renderWeekChart(canvas, weekData);
      setupChartTooltip(canvas, barRects, weekData, () => {
        initStatsScreen(container, appData);
      });
    }
  });
}

/**
 * Render a single log entry with template color, name, and memo.
 */
function renderLogEntry(session, templates) {
  const isWork = session.type === 'work';
  const template = templates.find(t => t.id === session.templateId);
  const templateColor = template?.color || (isWork ? '#e41000' : '#92cc41');
  const templateName = template?.name || (isWork ? 'FOCUS' : 'BREAK');
  const borderStyle = isWork ? '' : 'border-style: dashed;';
  const timeRange = `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`;
  const memo = session.summary || (isWork ? '' : '');
  const statusLabel = isWork ? 'Completed' : 'Restored';

  return `
    <div class="pixel-card flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between; ${borderStyle} padding: var(--space-sm); gap: var(--space-sm);">
      <!-- Color indicator bar -->
      <div style="width: 4px; min-width: 4px; align-self: stretch; background: ${templateColor}; border-radius: 0;"></div>
      <div class="flex items-center gap-sm" style="display: flex; align-items: center; gap: var(--space-sm); flex: 1; min-width: 0;">
        <div class="flex flex-col" style="min-width: 0; flex: 1;">
          <div class="flex items-center gap-xs">
            <span class="text-body-bold" style="color: ${templateColor}; text-transform: uppercase;">${templateName}</span>
          </div>
          ${memo
            ? `<span class="text-label-caps text-on-surface-variant" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${memo.substring(0, 40)}${memo.length > 40 ? '...' : ''}</span>`
            : ''}
          <span class="text-label-caps text-on-surface-variant">${timeRange}</span>
        </div>
      </div>
      <div class="text-right flex flex-col items-end" style="flex-shrink: 0;">
        <span class="text-body-bold text-on-surface-variant">${session.duration} MIN</span>
        <span class="text-label-caps text-on-surface-variant">${statusLabel}</span>
      </div>
    </div>
  `;
}

/** Refresh stats when switching to this tab */
export function refreshStats(container, appData) {
  initStatsScreen(container, appData);
}

/**
 * Format a YYYY-MM-DD date for display (e.g. "Jun 17, 2026").
 */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Setup mouse hover tooltip + click handler for the chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} barRects
 * @param {Array} weekData
 * @param {Function} onDateSelect - callback when a day's bar is clicked
 */
function setupChartTooltip(canvas, barRects, weekData, onDateSelect) {
  const tooltip = document.getElementById('chart-tooltip');
  if (!canvas || !tooltip || !barRects) return;

  let currentHit = null;

  canvas.addEventListener('mousemove', (e) => {
    const currentRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / currentRect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / currentRect.height;
    const mx = (e.clientX - currentRect.left) * scaleX;
    const my = (e.clientY - currentRect.top) * scaleY;

    let hit = null;
    for (const bar of barRects) {
      // Check work bar hit
      if (mx >= bar.workX && mx <= bar.workX + bar.workW &&
          my >= bar.workY && my <= bar.workY + bar.workH && bar.workH > 0) {
        hit = { ...bar, type: 'work' };
        break;
      }
      // Check rest bar hit
      if (mx >= bar.restX && mx <= bar.restX + bar.restW &&
          my >= bar.restY && my <= bar.restY + bar.restH && bar.restH > 0) {
        hit = { ...bar, type: 'rest' };
        break;
      }
    }

    currentHit = hit;
    canvas.style.cursor = hit ? 'pointer' : 'crosshair';

    if (hit) {
      const day = weekData[hit.dayIndex];
      const isWork = hit.type === 'work';
      const color = isWork ? '#e41000' : '#92cc41';
      const label = isWork ? 'WORK' : 'REST';
      const minutes = isWork ? day.workMinutes : day.restMinutes;
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

      tooltip.style.display = 'block';
      tooltip.style.left = (hit.workX + (hit.workW || 0) / 2) + 'px';
      tooltip.style.top = (Math.min(hit.workY, hit.restY) - 8) + 'px';
      tooltip.style.transform = 'translate(-50%, -100%)';
      tooltip.innerHTML = `
        <div class="pixel-balloon" style="padding: var(--space-xs) var(--space-sm); font-size: 8px; white-space: nowrap;">
          <div style="color: ${color}; font-weight: 700;">${label}</div>
          <div>${timeStr}</div>
          <div style="color: var(--color-on-surface-variant);">${day.date}</div>
        </div>
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('click', (e) => {
    if (currentHit) {
      const day = weekData[currentHit.dayIndex];
      const today = getTodayString();
      if (day.date === today) {
        statsSelectedDate = null; // Clicking today = show today
      } else {
        statsSelectedDate = day.date;
      }
      if (onDateSelect) onDateSelect();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
    currentHit = null;
    canvas.style.cursor = 'pointer';
  });
}
