// Penentu kapan pemilih tutorial dan pengingat muncul.
// Pemilih: saat pengguna belum pernah memilih apa pun (kedua tutorial kosong),
// paling banyak sekali per sesi. Pengingat: bila masih ada tutorial yang belum
// selesai, sekali per sesi (setiap kali masuk).
import { pendingTutorials, tutorialStatus } from '@/lib/tutorial';

export const CHOOSER_EVENT = 'medcoel:tutorial-chooser';
export const TUTORIAL_ROUTES = { fk: '/tutorial/latihan-soal', dokter: '/simulasi-dokter?tutorial=1' };
export const TUTORIAL_NAMES = { fk: 'Belajar dan latihan soal FK', dokter: 'Simulasi jadi dokter' };

/** Buka pemilih tutorial dari mana saja (kartu beranda, profil, pengingat). */
export function openTutorialChooser() {
  window.dispatchEvent(new CustomEvent(CHOOSER_EVENT));
}

export function neverChosen(me) {
  return !!me && !tutorialStatus(me, 'fk') && !tutorialStatus(me, 'dokter');
}

export { pendingTutorials };

const key = (kind, me) => `medcoel_tut_${kind}_${me?.id || ''}`;
export function seenThisSession(kind, me) {
  try { return sessionStorage.getItem(key(kind, me)) === '1'; } catch { return false; }
}
export function markSeenThisSession(kind, me) {
  try { sessionStorage.setItem(key(kind, me), '1'); } catch { /* mode privat: abaikan */ }
}

// Halaman yang tidak boleh ditimpa pemilih/pengingat.
export function quietPath(pathname) {
  return pathname.startsWith('/kerjakan') || pathname.startsWith('/simulasi-dokter') || pathname.startsWith('/tutorial');
}
