const KEY = 'medcoel-language';
// Re-enable only when the English question bank is ready for participants.
export const ENGLISH_ENABLED = false;
const normalizeLanguage = (value) => ENGLISH_ENABLED && value === 'en' ? 'en' : 'id';
let language = 'id';
try {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(KEY);
    language = normalizeLanguage(saved);
    if (saved === 'en' && !ENGLISH_ENABLED) localStorage.setItem(KEY, language);
  }
} catch { /* Persistence is optional. */ }
const listeners = new Set();
export const getLanguage = () => language;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function setLanguage(next) {
  if (!['id', 'en'].includes(next)) return;
  language = normalizeLanguage(next);
  try { localStorage.setItem(KEY, language); } catch { /* The current session still works. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  listeners.forEach((fn) => fn());
}
if (typeof window !== 'undefined') {
  document.documentElement.lang = language;
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) {
      language = normalizeLanguage(event.newValue);
      try {
        if (event.newValue === 'en' && !ENGLISH_ENABLED) localStorage.setItem(KEY, language);
      } catch { /* Cross-tab updates must also work without persistence. */ }
      document.documentElement.lang = language;
      listeners.forEach((fn) => fn());
    }
  });
}
