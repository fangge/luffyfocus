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

// Callback for template switching from timer screen
let onTemplateSwitch = null;

/**
 * Initialize and render the timer screen.
 * @param {HTMLElement} container
 * @param {object} state - { timerState, display, appData, currentTemplate }
 * @param {function} templateSwitchCallback - called when user switches template from timer
 */
export function initTimerScreen(container, state, templateSwitchCallback) {
  const { timerState, display, appData, currentTemplate } = state;
  onTemplateSwitch = templateSwitchCallback || null;

  const templates = appData?.templates || [];
  const hasMultipleTemplates = templates.length > 1;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <!-- Template Selector -->
      <div id="timer-template-selector" style="text-align: center;">
        ${hasMultipleTemplates ? `
          <div class="text-label-caps text-on-surface-variant" style="margin-bottom: 4px;">ACTIVE TEMPLATE</div>
          <div id="template-switcher" class="flex gap-xs justify-center" style="flex-wrap: wrap;">
            ${templates.map(t => {
              const isActive = t.id === appData.activeTemplateId;
              const isRunning = timerState?.state === 'working' || timerState?.state === 'resting';
              return `
                <button class="pixel-btn template-switch-btn" data-template-id="${t.id}"
                  style="padding: 4px 8px; font-size: 8px; ${isActive ? 'background: ' + t.color + '; color: #fff; border-color: var(--border-color);' : ''} ${isRunning ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                  ${isRunning ? 'disabled' : ''}>
                  ${t.name.toUpperCase()}
                </button>
              `;
            }).join('')}
          </div>
        ` : `
          <div id="timer-template-name" class="text-label-caps text-on-surface-variant">
            ${currentTemplate ? currentTemplate.name.toUpperCase() : 'NO TEMPLATE'}
          </div>
        `}
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

  // Wire template switch buttons
  container.querySelectorAll('.template-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tplId = btn.dataset.templateId;
      if (onTemplateSwitch) {
        onTemplateSwitch(tplId);
      }
    });
  });
}

/**
 * Update the timer screen with new state (countdown only — for polling).
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

  // Update template name if single template
  const templateName = document.getElementById('timer-template-name');
  if (templateName && currentTemplate) {
    templateName.textContent = currentTemplate.name.toUpperCase();
  }

  // Update active state & disabled state of multi-template switch buttons
  const isRunning = timerState?.state === 'working' || timerState?.state === 'resting';
  const switchBtns = document.querySelectorAll('.template-switch-btn');
  switchBtns.forEach(btn => {
    const isActive = btn.dataset.templateId === currentTemplate?.id;
    const tpl = appData?.templates?.find(t => t.id === btn.dataset.templateId);
    if (isActive) {
      btn.style.background = tpl?.color || '';
      btn.style.color = '#fff';
    } else {
      btn.style.background = '';
      btn.style.color = '';
    }
    // Disable template switching while timer is running
    btn.disabled = isRunning;
    btn.style.opacity = isRunning ? '0.5' : '';
    btn.style.cursor = isRunning ? 'not-allowed' : '';
  });
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

export function getTimerButtons() {
  return {
    main: document.querySelector('#btn-timer-main'),
    reset: document.querySelector('#btn-timer-reset'),
  };
}
