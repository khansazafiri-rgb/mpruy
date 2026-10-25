import { translate } from '../i18n/translate.js';

// Use authored whole-message translations only. Unknown clinical prose stays
// in its source language until its reviewed English version is available.
const TEXT_FIELDS = new Set(['text', 'caption', 'title', 'items', 'rows', 'blocks', 'children']);

export function questionText(value, language) {
  if (language !== 'en') return value;
  if (typeof value === 'string') return translate(value, language);
  if (Array.isArray(value)) return value.map((part) => questionText(part, language));
  if (!value || typeof value !== 'object' || value.type === 'formula') return value;
  return Object.fromEntries(Object.entries(value).map(([key, part]) => [key,
    TEXT_FIELDS.has(key) ? questionText(part, language) : part,
  ]));
}
