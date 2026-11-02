// Nama dan keterangan PDF yang dikirim ke Telegram.
// Kode pengajuan, nomor, dan jumlah berkas ditaruh di NAMA BERKAS, bukan hanya di keterangan,
// supaya tetap terbaca setelah PDF diteruskan atau diunduh. Nama asli siswa dipertahankan
// di belakangnya karena sering memuat petunjuk BAB atau topik.

const MAX_ORIGINAL = 80;

function safeName(raw) {
  const base = String(raw || '').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|\r\n\t]+/g, '_').replace(/\s+/g, ' ').trim();
  return (base.length > MAX_ORIGINAL ? base.slice(0, MAX_ORIGINAL).trim() : base) || 'tanpa-nama';
}

/**
 * index berbasis 0. Mengembalikan { filename, caption } untuk satu PDF dari `total` PDF.
 * kind: "materi" (PPT) atau "soal" (bawaan). PPT materi diberi penanda MATERI di nama berkas dan keterangan,
 * jadi jenisnya tetap terbaca setelah PDF diteruskan atau diunduh.
 */
export function describeFile(code, index, total, originalName, kind = 'soal') {
  const n = index + 1;
  const width = String(total).length;
  const num = String(n).padStart(width, '0');
  const name = safeName(originalName);
  const materi = kind === 'materi';
  return {
    filename: `${code}${materi ? '_MATERI' : ''}_PDF-${num}-dari-${total}_${name}.pdf`,
    caption: `${materi ? `📚 PPT MATERI · ${code}` : code} · PDF ${n}/${total} · ${name}`,
  };
}

/** "/files KODE" kirim semua; "/files KODE 3" hanya PDF ke-3. Mengembalikan daftar { file, index }. */
export function pickFiles(files, only) {
  const list = files.map((file, index) => ({ file, index }));
  if (only === undefined || only === null || only === '') return list;
  const n = Number.parseInt(only, 10);
  if (!Number.isInteger(n) || n < 1 || n > files.length) return null;
  return [list[n - 1]];
}
