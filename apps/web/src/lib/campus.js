// Akun tanpa kampus (mis. siswa SMA) disimpan sebagai campusOther bernilai konstanta ini,
// supaya tidak perlu kolom baru dan tampil rapi di daftar pengguna. Harus sama dengan
// NO_CAMPUS di apps/pocketbase/pb_hooks/lib/util.js.
export const NO_CAMPUS = 'Tidak memiliki kampus';
export const isNoCampus = (me) => !!me && !me.campus && me.campusOther === NO_CAMPUS;

// "Tulis sendiri" di pemilih (prodi atau kampus yang belum ada di daftar).
export const OTHER = '__other__';

/**
 * Nilai awal pemilih program studi + kampus dari data akun atau draf pendaftaran.
 * Bentuk: { none, program, programOther, campus, campusOther }.
 *   program/campus berisi id, atau OTHER bila ditulis sendiri.
 */
export const placeState = (m) => {
  const none = !!m && !m.campus && m.campusOther === NO_CAMPUS;
  const typedCampus = !m?.campus && !none && !!m?.campusOther;
  return {
    none,
    program: m?.programOther ? OTHER : m?.program || '',
    programOther: m?.programOther || '',
    campus: m?.campus || (typedCampus ? OTHER : ''),
    campusOther: typedCampus ? m.campusOther : '',
  };
};

/** Isi yang dikirim ke server dari nilai pemilih (aturannya sama di pendaftaran, profil, dan admin). */
export const placePayload = (p) => {
  if (p.none) return { program: '', programOther: '', campus: '', campusOther: NO_CAMPUS };
  const progTyped = p.program === OTHER;
  const campTyped = progTyped || p.campus === OTHER;
  return {
    program: progTyped ? '' : p.program || '',
    programOther: progTyped ? p.programOther || '' : '',
    campus: campTyped ? '' : p.campus || '',
    campusOther: campTyped ? p.campusOther || '' : '',
  };
};

/** Kesalahan yang bisa dicegah di sisi layar sebelum dikirim. */
export const placeErrors = (p) => {
  if (p.none) return {};
  const out = {};
  if (!p.program) out.program = 'Pilih program studimu, atau pilih "Prodi lainnya" lalu tulis sendiri.';
  else if (p.program === OTHER && !(p.programOther || '').trim()) out.program = 'Tulis nama program studimu.';
  if (p.program && !p.campus && p.program !== OTHER) out.campus = 'Pilih kampusmu, atau pilih "Kampusku belum ada" lalu tulis namanya.';
  else if ((p.program === OTHER || p.campus === OTHER) && !(p.campusOther || '').trim()) out.campus = 'Tulis nama kampusmu.';
  return out;
};
