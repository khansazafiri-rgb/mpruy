// Penyimpanan kecil di memori untuk Chat Admin. Chat tampil di dua tempat (panel
// di pojok kanan bawah dan halaman /chat-admin). Keadaan percakapan disimpan di
// sini, bukan di komponen, supaya saat panel diperbesar menjadi halaman penuh
// (atau sebaliknya) percakapan dan unggahan yang sedang berjalan tetap lanjut.
import { useCallback, useSyncExternalStore } from 'react';

const mem = new Map();
const listeners = new Set();
let owner = null;

const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** Akun lain yang membuka chat mulai dari percakapan kosong. */
export function claimChat(userId) {
  if (owner === userId) return;
  mem.clear();
  owner = userId;
}

export function resetChat() { mem.clear(); owner = null; emit(); }

/** Seperti useState, tetapi nilainya bertahan walau komponen dilepas dan dipasang lagi. */
export function useChatState(key, init) {
  if (!mem.has(key)) mem.set(key, typeof init === 'function' ? init() : init);
  const value = useSyncExternalStore(subscribe, () => mem.get(key));
  const set = useCallback((update) => {
    const prev = mem.get(key);
    const next = typeof update === 'function' ? update(prev) : update;
    if (Object.is(next, prev)) return;
    mem.set(key, next);
    emit();
  }, [key]);
  return [value, set];
}

/** Seperti useRef: nilai yang bertahan, tanpa memicu render ulang. */
export function chatRef(key, init) {
  if (!mem.has(key)) mem.set(key, { current: typeof init === 'function' ? init() : init });
  return mem.get(key);
}
