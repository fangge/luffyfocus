/**
 * Luffy Focus — Timer Screen
 */
import { renderLuffy, updateLuffyMessage } from '../components/luffy.js';
import { renderProgress, updateProgress } from '../components/progress.js';
import { getSessionsToday } from '../../lib/stats.js';

let timerDisplay = null;
let timerLabel = null;
let btnStart = null;
let btnReset = null;

/**
 * Initialize and render the timer screen.
 */
export function initTimerScreen(container, state) {
  const { timerState, display, appData, currentTemplate } = state;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <div class="text-label-caps text-on-surface-variant" style="text-align: center;">
        ${currentTemplate ? currentTemplate.name.toUpperCase() : 'NO TEMPLATE'}
      </div>

      <section class="pixel-card flex flex-col items-center justify-center mt-sm relative" style="display: flex; flex-direction: column; align-items: center; padding: var(--space-lg);">
        <div class="pixel-card__title">POMODORO</div>
        <div id="timer-display" class="text-display-lg text-on-background mt-sm" style="font-size: 48px; line-height: 48px;">
          ${display.display}
        </div>
        <div id="timer-label" class="text-label-caps text-on-surface-variant mt-sm">
          ${timerState?.type === 'rest' ? 'REST TIME' : 'FOCUS TIME'}
        </div>
      </section>

      <div id="luffy-container"></div>

      <section class="flex flex-col gap-md mt-sm" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <button id="btn-timer-main" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md); font-size: var(--fs-headline-md);">
          ${getButtonLabel(timerState?.state || 'idle')}
        </button>
        <button id="btn-timer-reset" class="pixel-btn w-full" style="padding: var(--space-sm);" ${timerState?.state === 'idle' ? 'disabled' : ''}>
          RESET
        </button>
      </section>

      <div id="progress-container"></div>
    </div>
  `;

  timerDisplay = container.querySelector('#timer-display');
  timerLabel = container.querySelector('#timer-label');
  btnStart = container.querySelector('#btn-timer-main');
  btnReset = container.querySelector('#btn-timer-reset');

  const luffyContainer = container.querySelector('#luffy-container');
  renderLuffy(luffyContainer, timerState?.state || 'idle');

  const progressContainer = container.querySelector('#progress-container');
  const sessionsToday = getSessionsToday(appData);
  renderProgress(progressContainer, sessionsToday.length, appData.settings.dailyGoal);
}

/**
 * Update the timer screen with new state.
 */
export function updateTimerScreen(state) {
  const { timerState, display, appData, currentTemplate } = state;

  if (timerDisplay) {
    timerDisplay.textContent = display.display;
  }
  if (timerLabel) {
    timerLabel.textContent = timerState?.type === 'rest' ? 'REST TIME' : 'FOCUS TIME';
  }
  if (btnStart) {
    btnStart.textContent = getButtonLabel(timerState?.state || 'idle');
    btnStart.className = getButtonClass(timerState?.state || 'idle');
  }
  if (btnReset) {
    btnReset.disabled = timerState?.state === 'idle';
  }

  updateLuffyMessage(timerState?.state || 'idle');

  const sessionsToday = getSessionsToday(appData);
  updateProgress(sessionsToday.length, appData.settings.dailyGoal);

  const templateLabel = document.querySelector('#screen-timer .text-label-caps.text-on-surface-variant');
  if (templateLabel && currentTemplate) {
    templateLabel.textContent = currentTemplate.name.toUpperCase();
  }
}

function getButtonLabel(state) {
  switch (state) {
    case 'working': return 'PAUSE';
    case 'resting': return 'PAUSE';
    case 'paused': return 'RESUME';
    case 'done': return 'START';
    default: return 'START';
  }
}

function getButtonClass(state) {
  const base = 'pixel-btn w-full';
  if (state === 'paused') return `${base} pixel-btn--primary`;
  if (state === 'resting') return `${base} pixel-btn--success`;
  return `${base} pixel-btn--primary`;
}

/**
 * Get the timer screen action buttons.
 */
export function getTimerButtons() {
  return {
    main: document.querySelector('#btn-timer-main'),
    reset: document.querySelector('#btn-timer-reset'),
  };
}
