const KEY = 'medcoel-language';
let language = 'id';
try { if (typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'en') language = 'en'; } catch { /* Persistence is optional. */ }
const listeners = new Set();
export const getLanguage = () => language;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function setLanguage(next) {
  if (!['id', 'en'].includes(next)) return;
  language = next;
  try { localStorage.setItem(KEY, next); } catch { /* The current session still works. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}
if (typeof window !== 'undefined') {
  document.documentElement.lang = language;
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) {
      language = event.newValue === 'en' ? 'en' : 'id';
      document.documentElement.lang = language;
      listeners.forEach((fn) => fn());
    }
  });
}
