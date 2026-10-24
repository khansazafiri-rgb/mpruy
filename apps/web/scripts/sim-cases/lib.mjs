// Pembantu penulisan kasus Simulasi Dokter tambahan (dipakai berkas per poli di folder ini).
//   p   = jawaban pasien (ucapan, catatan, ekspresi)
//   x   = temuan pemeriksaan fisik (teks, catatan)
//   c   = kartu hasil (judul, sub, baris "nama=nilai;nama=nilai", ucapan, catatan)
//   lab, rad = kartu laboratorium dan radiologi dengan ucapan suster bawaan
//   tt  = jawaban tindakan tatalaksana (siapa menjawab: sus atau pas)
export const p = (say, note, e) => (e ? { say, note, e } : { say, note });
export const x = (t, note) => ({ t, note });
export const c = (title, sub, rows, say, note) => ({ title, sub, rows, say, note });
export const lab = (title, rows, say = 'Hasilnya sudah ada, Dok.') => c(title, 'Laboratorium', rows, say);
export const rad = (title, rows, say = 'Hasil bacaan radiologinya sudah masuk, Dok.') => c(title, 'Radiologi', rows, say);
export const tt = (say, note, who = 'sus', e) => (e ? { who, say, note, e } : { who, say, note });
export function vit(td, n, rr, t, s, extra) {
  const rows = `Tekanan darah=${td} mmHg;Nadi=${n} x/menit;Napas=${rr} x/menit;Suhu=${t} °C;SpO₂=${s}${extra ? `;${extra[0]}=${extra[1]}` : ''}`;
  return c('Tanda vital', 'Suster Ani', rows, 'Ini hasil tanda vitalnya, Dok.', `TD ${td}, N ${n}, RR ${rr}, T ${t}, SpO₂ ${s.split(' ')[0]}${extra ? `, ${extra[0]} ${extra[1]}` : ''}`);
}

export const REF = 'Acuan: disusun dari pedoman klinis umum (PNPK Kemenkes dan buku ajar standar) dan belum ditinjau dokter penguji. ';

// Bagian "bermanfaat" yang umum untuk hampir semua kasus; ditambahkan ke U tiap kasus.
const U_BASE = 'pemberat progres obat_coba harapan rpd_serupa obat_rutin pekerjaan rumah kebiasaan antro kulit edukasi monitor';
export function mk(poli, o) {
  const merge = (...a) => [...new Set(a.join(' ').split(/\s+/).filter(Boolean))].join(' ');
  const K = merge(o.K);
  const kset = new Set(K.split(' '));
  const U = merge(o.U, U_BASE).split(' ').filter((id) => !kset.has(id)).join(' ');
  return { poli, pas: o.pas, expr: o.expr, id: o.id, intro: o.intro, dxOk: o.dxOk, ddx: o.ddx, ref: o.ref, K, U, B: merge(o.B), A: o.A };
}
