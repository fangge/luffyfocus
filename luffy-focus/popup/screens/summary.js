/**
 * Luffy Focus — Session Summary Screen
 * Shown as a modal overlay when a work session completes.
 */

let currentSessionId = null;
let onSaveCallback = null;
let onDiscardCallback = null;

/**
 * Initialize and show the session summary overlay.
 */
export function showSummary(container, session, callbacks) {
  currentSessionId = session.id;
  onSaveCallback = callbacks.onSave;
  onDiscardCallback = callbacks.onDiscard;

  const displayMinutes = session.duration;
  const displayText = `${String(Math.floor(displayMinutes)).padStart(2, '0')}:00`;

  container.innerHTML = `
    <div class="flex flex-col h-full" style="display: flex; flex-direction: column; height: 100%;">
      <header class="flex justify-between items-center px-md py-sm" style="border-bottom: var(--border-width) solid var(--border-color); background: var(--color-surface-container); display: flex; justify-content: space-between; align-items: center;">
        <h1 class="text-headline-md text-on-background">LOG ENTRY</h1>
        <button id="btn-summary-close" class="pixel-btn pixel-btn--danger" style="padding: 4px 8px; font-size: 14px;">✕</button>
      </header>

      <div class="flex-1 overflow-y-auto p-md flex flex-col gap-lg" style="flex: 1; overflow-y: auto; padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-lg);">
        <section class="flex gap-sm items-center" style="display: flex; gap: var(--space-sm); align-items: flex-end;">
          <div class="pixel-border animate-bob" style="width: 64px; height: 64px; background: var(--color-secondary-container); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 32px;">🏴‍☠️</span>
          </div>
          <div class="pixel-balloon" style="flex: 1;">
            <p class="text-body-bold animate-pulse-pixel" style="color: var(--color-primary);">WELL DONE, CAPTAIN!</p>
          </div>
        </section>

        <section class="pixel-card relative" style="padding-top: var(--space-lg);">
          <div class="pixel-card__title">STATS</div>
          <div class="flex flex-col gap-sm" style="display: flex; flex-direction: column; gap: var(--space-sm);">
            <div class="flex justify-between items-end" style="display: flex; justify-content: space-between; align-items: flex-end;">
              <span class="text-label-caps text-on-surface-variant">DURATION</span>
              <span class="text-display-lg text-tertiary">${displayText}</span>
            </div>
            <div class="pixel-divider"></div>
            <div class="flex justify-between items-center" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="text-label-caps text-on-surface-variant">TASK</span>
              <span class="text-body-bold" style="background: var(--color-surface-variant); padding: 2px var(--space-xs); border: 2px solid var(--border-color);">
                ${session.templateName.toUpperCase()}
              </span>
            </div>
          </div>
        </section>

        <section class="flex flex-col gap-sm flex-1" style="display: flex; flex-direction: column; gap: var(--space-sm); flex: 1;">
          <label class="text-label-caps flex items-center gap-sm" for="summary-input">
            <span>✏</span> LOG YOUR WORK
          </label>
          <textarea id="summary-input" class="pixel-textarea" placeholder="What did you conquer today..." style="min-height: 120px; flex: 1;"></textarea>
        </section>
      </div>

      <footer class="p-md flex gap-sm" style="border-top: var(--border-width) solid var(--border-color); background: var(--color-surface); padding: var(--space-md); display: flex; gap: var(--space-sm);">
        <button id="btn-summary-discard" class="pixel-btn" style="flex: 1; padding: var(--space-sm);">DISCARD</button>
        <button id="btn-summary-save" class="pixel-btn pixel-btn--success" style="flex: 1; padding: var(--space-sm);">💾 SAVE LOG</button>
      </footer>
    </div>
  `;

  container.querySelector('#btn-summary-close').addEventListener('click', handleDiscard);
  container.querySelector('#btn-summary-discard').addEventListener('click', handleDiscard);
  container.querySelector('#btn-summary-save').addEventListener('click', handleSave);
}

function handleSave() {
  const textarea = document.querySelector('#summary-input');
  const summary = textarea ? textarea.value.trim() : '';

  if (onSaveCallback) {
    onSaveCallback(currentSessionId, summary);
  }

  hideSummary();
}

function handleDiscard() {
  if (onDiscardCallback) {
    onDiscardCallback(currentSessionId);
  }

  hideSummary();
}

function hideSummary() {
  const summaryScreen = document.getElementById('screen-summary');
  if (summaryScreen) {
    summaryScreen.classList.remove('screen--active');
    summaryScreen.innerHTML = '';
  }
  const bottomNav = document.getElementById('bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = '';
  }
  currentSessionId = null;
  onSaveCallback = null;
  onDiscardCallback = null;
}

/** Show the summary overlay */
export function showSummaryOverlay() {
  const summaryScreen = document.getElementById('screen-summary');
  const bottomNav = document.getElementById('bottom-nav');
  if (summaryScreen) {
    summaryScreen.classList.add('screen--active');
  }
  if (bottomNav) {
    bottomNav.style.display = 'none';
  }
}
