/**
 * Luffy Focus — Pixel Progress Bar Component
 */

/**
 * Render a pixel-art progress bar.
 * @param {HTMLElement} container - Parent element
 * @param {number} current - Current value
 * @param {number} total - Total/goal value
 * @param {string} label - Label text (e.g., "DAILY GOAL")
 */
export function renderProgress(container, current, total, label = 'DAILY GOAL') {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  container.innerHTML = `
    <section class="mt-auto pt-md pb-sm" style="margin-top: auto; padding-top: var(--space-md); padding-bottom: var(--space-sm);">
      <div style="border-top: 4px dotted var(--color-on-background); padding-top: var(--space-sm);">
        <div class="flex justify-between items-center mb-xs">
          <span class="text-label-caps">${label}</span>
          <span class="text-label-caps">${current}/${total}</span>
        </div>
        <div class="pixel-progress">
          <div class="pixel-progress__fill" style="width: ${percentage}%;"></div>
        </div>
      </div>
    </section>
  `;
}

/** Update progress bar fill width */
export function updateProgress(current, total) {
  const fill = document.querySelector('.pixel-progress__fill');
  if (fill) {
    const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    fill.style.width = `${percentage}%`;
  }
  // Update the label
  const labelEl = document.querySelector('.pixel-progress')?.parentElement?.querySelector('.flex span:last-child');
  if (labelEl) {
    labelEl.textContent = `${current}/${total}`;
  }
}
