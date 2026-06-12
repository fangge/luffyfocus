/**
 * Luffy Focus — Template Operations
 */
import { generateId, isTemplateActiveToday } from './data-model.js';

/** Create a new template */
export function createTemplate(data, { name, workDuration, restDuration, activeDays, color }) {
  const template = {
    id: generateId('tpl'),
    name: name || 'New Template',
    workDuration: workDuration || 25,
    restDuration: restDuration || 5,
    activeDays: activeDays || [1, 2, 3, 4, 5],
    color: color || '#e41000',
    createdAt: new Date().toISOString(),
  };
  return {
    ...data,
    templates: [...data.templates, template],
    activeTemplateId: data.activeTemplateId || template.id,
  };
}

/** Update an existing template */
export function updateTemplate(data, templateId, updates) {
  return {
    ...data,
    templates: data.templates.map(t =>
      t.id === templateId ? { ...t, ...updates } : t
    ),
  };
}

/** Delete a template */
export function deleteTemplate(data, templateId) {
  const templates = data.templates.filter(t => t.id !== templateId);
  const updates = { ...data, templates };
  if (data.activeTemplateId === templateId && templates.length > 0) {
    updates.activeTemplateId = templates[0].id;
  }
  return updates;
}

/** Set the active template */
export function setActiveTemplate(data, templateId) {
  const template = data.templates.find(t => t.id === templateId);
  if (!template) return data;
  return { ...data, activeTemplateId: templateId };
}

/** Get the active template, or the best template for today */
export function getActiveTemplate(data) {
  const active = data.templates.find(t => t.id === data.activeTemplateId);
  if (active && isTemplateActiveToday(active)) return active;

  const todayTemplate = data.templates.find(t => isTemplateActiveToday(t));
  if (todayTemplate) return todayTemplate;

  return data.templates[0] || null;
}
