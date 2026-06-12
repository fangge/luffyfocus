/**
 * Luffy Focus — Templates Screen
 */
import { DAYS, TEMPLATE_COLORS } from '../../lib/data-model.js';

let appDataRef = null;
let onDataChange = null;

/**
 * Initialize and render the templates screen.
 */
export function initTemplatesScreen(container, appData, dataChangeCallback) {
  appDataRef = appData;
  onDataChange = dataChangeCallback;
  renderTemplateList(container);
}

function renderTemplateList(container) {
  const templates = appDataRef.templates;

  container.innerHTML = `
    <div class="flex flex-col flex-1 p-gutter gap-lg overflow-y-auto" style="display: flex; flex-direction: column; flex: 1; padding: var(--space-gutter); gap: var(--space-lg); overflow-y: auto;">

      <header class="flex items-center gap-sm mt-sm">
        <span style="font-size: 24px;">📋</span>
        <h1 class="text-headline-md text-on-background">WORK TEMPLATES</h1>
      </header>

      <div class="pixel-divider"></div>

      <div id="template-cards" class="flex flex-col gap-xl" style="display: flex; flex-direction: column; gap: var(--space-xl);">
        ${templates.map(tpl => renderTemplateCard(tpl)).join('')}
      </div>

      <div style="flex: 1;"></div>

      <button id="btn-add-template" class="pixel-btn pixel-btn--primary w-full" style="padding: var(--space-md); margin-bottom: var(--space-xs);">
        + ADD NEW TEMPLATE
      </button>

      <div id="template-form-container" class="hidden"></div>
    </div>
  `;

  // Wire up card clicks
  container.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      const tplId = card.dataset.templateId;
      setActive(tplId);
    });
  });

  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTemplateForm(container, btn.dataset.templateId);
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate(btn.dataset.templateId);
    });
  });

  container.querySelector('#btn-add-template').addEventListener('click', () => {
    showTemplateForm(container, null);
  });
}

function renderTemplateCard(tpl) {
  const isActive = tpl.id === appDataRef.activeTemplateId;
  const borderStyle = isActive ? 'border-color: var(--color-primary);' : '';

  return `
    <div class="pixel-card template-card relative" data-template-id="${tpl.id}" style="cursor: pointer; ${borderStyle}">
      <div class="pixel-card__title" style="background: ${tpl.color}; color: #fff; border-color: var(--border-color);">
        ${tpl.name.toUpperCase()}
      </div>
      <div class="mt-sm flex flex-col gap-md" style="display: flex; flex-direction: column; gap: var(--space-md); margin-top: var(--space-sm);">
        <div class="text-body-bold text-on-background flex items-center gap-sm">
          <span>⏱</span>
          <span>${tpl.workDuration}M WORK / ${tpl.restDuration}M REST</span>
        </div>
        <div class="pixel-day-toggle">
          ${DAYS.map(d => `
            <div class="pixel-day-btn ${tpl.activeDays.includes(d.key) ? 'pixel-day-btn--active' : ''}" style="${tpl.activeDays.includes(d.key) ? `background: ${tpl.color};` : ''}">
              ${d.label}
            </div>
          `).join('')}
        </div>
        <div class="flex gap-sm justify-between" style="margin-top: var(--space-xs);">
          <button class="pixel-btn" data-action="edit" data-template-id="${tpl.id}" style="padding: 4px 8px; font-size: 10px; flex: 1;">✏ EDIT</button>
          <button class="pixel-btn pixel-btn--danger" data-action="delete" data-template-id="${tpl.id}" style="padding: 4px 8px; font-size: 10px; flex: 1;" ${appDataRef.templates.length <= 1 ? 'disabled' : ''}>✕ DELETE</button>
        </div>
      </div>
    </div>
  `;
}

function showTemplateForm(container, templateId) {
  const tpl = templateId ? appDataRef.templates.find(t => t.id === templateId) : null;
  const formContainer = container.querySelector('#template-form-container');

  formContainer.innerHTML = `
    <div class="pixel-card" style="margin-top: var(--space-md);">
      <div class="pixel-card__title">${tpl ? 'EDIT' : 'NEW'} TEMPLATE</div>
      <div class="mt-md flex flex-col gap-md">
        <div>
          <label class="text-label-caps">NAME</label>
          <input id="tpl-name" class="pixel-input" type="text" value="${tpl ? tpl.name : ''}" placeholder="e.g., Coding Sprint" maxlength="20">
        </div>
        <div>
          <label class="text-label-caps">WORK (MINUTES)</label>
          <input id="tpl-work" class="pixel-input" type="number" value="${tpl ? tpl.workDuration : 25}" min="1" max="120">
        </div>
        <div>
          <label class="text-label-caps">REST (MINUTES)</label>
          <input id="tpl-rest" class="pixel-input" type="number" value="${tpl ? tpl.restDuration : 5}" min="1" max="60">
        </div>
        <div>
          <label class="text-label-caps">ACTIVE DAYS</label>
          <div class="pixel-day-toggle" id="tpl-days" style="margin-top: var(--space-xs);">
            ${DAYS.map(d => {
              const isActive = tpl ? tpl.activeDays.includes(d.key) : [1,2,3,4,5].includes(d.key);
              return `<div class="pixel-day-btn ${isActive ? 'pixel-day-btn--active' : ''}" data-day="${d.key}">${d.label}</div>`;
            }).join('')}
          </div>
        </div>
        <div>
          <label class="text-label-caps">COLOR</label>
          <div class="flex gap-xs" style="margin-top: var(--space-xs); flex-wrap: wrap;">
            ${TEMPLATE_COLORS.map(c => `
              <div class="pixel-color-dot ${(tpl ? tpl.color === c : c === '#e41000') ? 'pixel-color-dot--selected' : ''}" data-color="${c}" style="background: ${c};"></div>
            `).join('')}
          </div>
        </div>
        <div class="flex gap-sm">
          <button id="btn-cancel-form" class="pixel-btn" style="flex: 1;">CANCEL</button>
          <button id="btn-save-template" class="pixel-btn pixel-btn--primary" style="flex: 1;" data-edit-id="${templateId || ''}">SAVE</button>
        </div>
      </div>
    </div>
  `;

  formContainer.classList.remove('hidden');

  // Wire up day toggles
  formContainer.querySelectorAll('.pixel-day-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('pixel-day-btn--active'));
  });

  // Wire up color dots
  formContainer.querySelectorAll('.pixel-color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      formContainer.querySelectorAll('.pixel-color-dot').forEach(d => d.classList.remove('pixel-color-dot--selected'));
      dot.classList.add('pixel-color-dot--selected');
    });
  });

  // Cancel
  formContainer.querySelector('#btn-cancel-form').addEventListener('click', () => {
    formContainer.classList.add('hidden');
    formContainer.innerHTML = '';
  });

  // Save
  formContainer.querySelector('#btn-save-template').addEventListener('click', () => {
    const name = formContainer.querySelector('#tpl-name').value.trim() || 'New Template';
    const workDuration = parseInt(formContainer.querySelector('#tpl-work').value) || 25;
    const restDuration = parseInt(formContainer.querySelector('#tpl-rest').value) || 5;
    const activeDays = Array.from(formContainer.querySelectorAll('#tpl-days .pixel-day-btn--active'))
      .map(b => parseInt(b.dataset.day));
    const colorEl = formContainer.querySelector('.pixel-color-dot--selected');
    const color = colorEl ? colorEl.dataset.color : '#e41000';

    if (templateId) {
      onDataChange('updateTemplate', { templateId, updates: { name, workDuration, restDuration, activeDays, color } });
    } else {
      onDataChange('createTemplate', { name, workDuration, restDuration, activeDays, color });
    }
  });
}

function setActive(templateId) {
  onDataChange('setActiveTemplate', { templateId });
}

function deleteTemplate(templateId) {
  if (confirm('Delete this template?')) {
    onDataChange('deleteTemplate', { templateId });
  }
}

/** Refresh the template list after data changes */
export function refreshTemplates(container, appData) {
  appDataRef = appData;
  renderTemplateList(container);
}
