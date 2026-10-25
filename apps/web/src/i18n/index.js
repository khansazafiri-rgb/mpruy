import { useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, subscribe } from './store.js';
export { translate } from './translate.js';
export { getLanguage, setLanguage } from './store.js';
export function useLanguage() {
  return { language: useSyncExternalStore(subscribe, getLanguage, () => 'id'), setLanguage };
}
