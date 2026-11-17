// Halaman yang dicatat sebagai aktivitas siswa. Daftar ini HARUS sama dengan PAGES di
// apps/pocketbase/pb_hooks/lib/activity.js (activityMap.test.mjs menjaganya).
//
// PRIVASI: yang dikirim ke server hanya POLA halaman ("/mata-kuliah/:slug"), tidak pernah alamat aslinya, ID,
// kata pencarian, atau query. Halaman yang tidak ada di daftar (login, admin, halaman 404) tidak dicatat.
export const ACTIVITY_PAGES = [
  ["/beranda", "beranda", "Beranda"],
  ["/mata-kuliah", "soal", "Daftar mata kuliah"],
  ["/mata-kuliah/:slug", "soal", "Halaman mata kuliah"],
  ["/kerjakan/:id", "soal", "Mengerjakan soal"],
  ["/tutorial/latihan-soal", "soal", "Tutorial latihan soal"],
  ["/mata-kuliah/:slug/materi/:chapterId", "materi", "Materi BAB"],
  ["/mata-kuliah/:slug/flashcard/:chapterId", "materi", "Flashcard BAB"],
  ["/drilling", "drilling", "Kampusmu (daftar)"],
  ["/drilling/:slug", "drilling", "Kampusmu per mata kuliah"],
  ["/drilling/materi/:id", "drilling", "Materi kampus"],
  ["/simulasi-dokter", "simulasi", "Simulasi Dokter"],
  ["/lab", "lab", "MEDCOEL Lab"],
  ["/lab/objek/:slug", "lab", "Lab: objek"],
  ["/lab/jalur/:slug", "lab", "Lab: jalur belajar"],
  ["/lab/modul/:key", "lab", "Lab: modul"],
  ["/anatomy", "anatomi", "Anatomi: ringkasan"],
  ["/anatomy/library", "anatomi", "Anatomi: pustaka"],
  ["/anatomy/structure/:id", "anatomi", "Anatomi: halaman struktur"],
  ["/anatomy/region/:id", "anatomi", "Anatomi: per regio"],
  ["/anatomy/system/:id", "anatomi", "Anatomi: per sistem"],
  ["/anatomy/study", "anatomi", "Anatomi: kuis 3D"],
  ["/anatomy/explore", "anatomi", "Atlas 3D"],
  ["/anatomy/live", "anatomi", "Live 4D Lab"],
  ["/riwayat", "progres", "Riwayat"],
  ["/progres", "progres", "Progres"],
  ["/leaderboard", "progres", "Leaderboard"],
  ["/jadwal", "progres", "Jadwal ujian"],
  ["/profil", "akun", "Profil"],
  ["/notifikasi", "akun", "Notifikasi"],
  ["/chat-admin", "akun", "Chat admin"],
];

const compiled = ACTIVITY_PAGES.map(([key]) => ({ key, re: new RegExp('^' + key.split('/').map((s) => (s.startsWith(':') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$') }));

/** "/mata-kuliah/anatomi/materi/abc" -> "/mata-kuliah/:slug/materi/:chapterId"; null bila halaman tidak dicatat. */
export function activityKey(pathname) {
  const path = String(pathname || '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const hit = compiled.find((c) => c.re.test(path));
  return hit ? hit.key : null;
}
