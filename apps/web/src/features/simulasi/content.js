// Memuat kasus dan diagnosis terbaru dari server (dikelola admin di
// /admin/simulasi). Bila gagal, mesin tetap memakai data bawaan.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { setContent } from './engine';

let loadedAt = 0;
let pending = null;
const FRESH_MS = 60 * 1000;

// preview (khusus admin): kasus nonaktif ikut dimuat supaya bisa dicoba lewat ?kasus=kode.
let loadedPreview = false;
export function loadSimContent(preview = false) {
  if (Date.now() - loadedAt < FRESH_MS && loadedPreview === preview) return Promise.resolve();
  if (!pending) {
    loadedPreview = preview;
    pending = api('doctor-sim/content', { query: preview ? { preview: 1 } : undefined })
      .then((d) => { setContent(d); loadedAt = Date.now(); })
      .catch(() => { /* tetap memakai kasus bawaan */ })
      .finally(() => { pending = null; });
  }
  return pending;
}

/** true setelah isi simulasi siap dipakai. */
/** Dipanggil setelah admin mengubah kasus supaya halaman simulasi memuat ulang. */
export function invalidateSimContent() { loadedAt = 0; }

export function useSimContent(preview = false) {
  const [ready, setReady] = useState(Date.now() - loadedAt < FRESH_MS && loadedPreview === preview);
  useEffect(() => {
    let alive = true;
    loadSimContent(preview).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [preview]);
  return ready;
}
