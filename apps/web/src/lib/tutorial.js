// Status tutorial per pengguna, disimpan di server (users.tutorials) supaya
// sama di semua perangkat. Kunci: 'fk' (latihan soal) dan 'dokter' (simulasi dokter).
// Status: 'done' (selesai) atau 'skipped' (dilewati). Kosong = belum pernah.
import { api } from '@/lib/api';

export const TUTORIALS = ['fk', 'dokter'];

export function tutorialStatus(me, key) {
  return me?.tutorials?.[key] || '';
}

export function pendingTutorials(me) {
  return TUTORIALS.filter((k) => tutorialStatus(me, k) !== 'done');
}

/** Simpan status tutorial. Mengembalikan objek tutorials terbaru dari server. */
export async function markTutorial(key, status) {
  const r = await api('me/tutorial', { method: 'POST', body: { key, status } });
  return r.tutorials;
}
