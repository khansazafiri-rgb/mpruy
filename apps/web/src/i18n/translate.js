import english from './en.js';
import { getLanguage } from './store.js';
const normalize = (s) => s.replace(/\s+/g, ' ').trim();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Full-message patterns only. No word substitution or DOM rewriting.
const patterns = Object.entries(english).filter(([s]) => /\{\d+\}/.test(s)).map(([source, target]) => {
  const ids = [...source.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
  const parts = source.split(/\{\d+\}/g).map(escape);
  return { regex: new RegExp('^' + parts.join('(.+?)') + '$'), ids, target, specificity: parts.join('').length, names: source === 'Hai, {0}! Aku Kori.' || source === 'Halo Admin MEDCOEL, saya {0}{1}.' };
}).sort((a, b) => b.specificity - a.specificity || a.ids.length - b.ids.length);
export function translate(value, locale = getLanguage(), depth = 0) {
  if (locale !== 'en' || typeof value !== 'string' || !value.trim()) return value;
  const key = normalize(value);
  let result = Object.hasOwn(english, key) ? english[key] : undefined;
  if (result === undefined && depth < 3) {
    for (const p of patterns) {
      const match = p.regex.exec(key);
      if (!match) continue;
      const params = {};
      p.ids.forEach((id, i) => { params[id] = p.names ? match[i + 1] : translate(match[i + 1], locale, depth + 1); });
      result = p.target.replace(/\{(\d+)\}/g, (_, id) => params[id]);
      break;
    }
  }
  if (result === undefined) return value;
  return (value.match(/^\s*/)?.[0] || '') + result + (value.match(/\s*$/)?.[0] || '');
}
