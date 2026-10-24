// Akun tanpa kampus (mis. siswa SMA) disimpan sebagai campusOther bernilai konstanta ini,
// supaya tidak perlu kolom baru dan tampil rapi di daftar pengguna. Harus sama dengan
// NO_CAMPUS di apps/pocketbase/pb_hooks/lib/util.js.
export const NO_CAMPUS = 'Tidak memiliki kampus';
export const isNoCampus = (me) => !!me && !me.campus && me.campusOther === NO_CAMPUS;
/** Nilai awal pemilih kampus dari data akun atau draf. */
export const campusState = (m) => ({ campus: m?.campus || (m?.campusOther === NO_CAMPUS ? '__none__' : m?.campusOther ? '__other__' : ''), other: m?.campusOther === NO_CAMPUS ? '' : m?.campusOther || '' });
/** Isi yang dikirim ke server dari nilai pemilih kampus. */
export const campusPayload = (campus, other) => (campus === '__none__' ? { campus: '', campusOther: NO_CAMPUS } : campus === '__other__' ? { campus: '', campusOther: other } : { campus, campusOther: '' });
