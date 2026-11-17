// Pencatat waktu aktif per halaman (tanpa React, jam dan pengirim bisa disuntikkan supaya bisa dites).
//
// Aturan: sebuah halaman dihitung "dibuka" sekali, saat tab terlihat. Detik aktif hanya berjalan bila tab terlihat
// DAN siswa menyentuh halaman dalam 5 menit terakhir (gerak, ketik, gulir). Laporan dikirim saat pindah halaman,
// saat tab disembunyikan atau ditutup, dan tiap menit selama aktif. Yang dikirim hanya {key, views, seconds}.
export const HEARTBEAT_MS = 60000;
export const IDLE_MS = 5 * 60000;

export function createTracker({ send, now = () => Date.now(), isVisible = () => true, idleMs = IDLE_MS }) {
  let key = null, activeMs = 0, since = null, viewPending = false, counted = false, lastTouch = 0;

  const running = () => since !== null;
  const accumulate = () => {
    if (since === null) return;
    const t = now();
    const end = Math.min(t, lastTouch + idleMs); // setelah 5 menit tanpa sentuhan, waktu berhenti dihitung
    if (end > since) activeMs += end - since;
    since = t > lastTouch + idleMs ? null : t; // terlalu lama diam: berhenti sampai ada sentuhan lagi
  };
  const flush = () => {
    if (!key) return;
    accumulate();
    const seconds = Math.floor(activeMs / 1000);
    const views = viewPending ? 1 : 0;
    if (!views && !seconds) return;
    send({ key, views, seconds });
    activeMs -= seconds * 1000; // simpan sisa milidetik, jangan hilang
    viewPending = false; counted = true;
  };

  return {
    /** Pindah ke halaman baru (key null = halaman yang tidak dicatat). */
    enter(next) {
      if (next === key) return;
      flush();
      key = next; activeMs = 0; counted = false; viewPending = false; since = null;
      if (key && isVisible()) { lastTouch = now(); since = now(); viewPending = true; }
    },
    /** Siswa menyentuh halaman (gerak/ketik/gulir). */
    touch() {
      lastTouch = now();
      if (key && since === null && isVisible()) since = now();
    },
    /** Tab disembunyikan atau halaman ditutup: kirim yang tertunda dan berhenti menghitung. */
    hide() { flush(); since = null; },
    /** Tab terlihat lagi. */
    show() {
      if (!key) return;
      lastTouch = now(); since = now();
      if (!counted) viewPending = true;
    },
    /** Detak berkala. */
    tick() { if (isVisible()) flush(); },
    /** Keluar (logout/unmount): kirim sisa laporan. */
    leave() { flush(); key = null; since = null; },
    _state: () => ({ key, activeMs, running: running(), viewPending, counted }),
  };
}

/** Kirim ke server tanpa mengganggu halaman. Galat diabaikan: pelacakan tidak boleh merusak apa pun. */
export function sendActivity(token, payload) {
  if (!token) return;
  try {
    fetch('/api/medcoel/activity', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch { /* abaikan */ }
}
