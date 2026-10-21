// Tautan WhatsApp dengan pesan yang sudah terisi.

// wa.me butuh kode negara tanpa "+" atau 0 di depan: "0851..." -> "62851...".
export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = `62${d.slice(1)}`;
  else if (d.startsWith('8')) d = `62${d}`;
  return d;
}

export function waLink(phone, text) {
  const digits = waNumber(phone);
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

const BAHASA = { id: 'Indonesia', en: 'Inggris', both: 'Indonesia dan Inggris' };

export function confirmMessage(sub, user) {
  return [
    'Halo Admin MEDCOEL, saya ingin mengonfirmasi pengajuan soal.',
    '',
    `Kode pengajuan: ${sub.code}`,
    `Nama: ${user?.name || '-'} (${user?.loginId || '-'})`,
    `Kampus: ${user?.campusName || '-'}`,
    `Mata kuliah: ${sub.subjectName}`,
    `Jumlah PDF: ${sub.pdfCount}`,
    `Pembahasan & kunci di PDF: ${sub.hasKey ? 'Ada' : 'Belum ada'}`,
    `Bahasa: ${BAHASA[sub.language] || '-'}`,
    `Dilihat oleh: ${sub.scope === 'campus' ? 'Hanya kampus saya' : 'Semua kampus'}`,
  ].join('\n');
}

export function manyPdfMessage(a, user) {
  return [
    'Halo Admin MEDCOEL, saya ingin mengajukan soal lebih dari 5 PDF lewat WhatsApp.',
    '',
    `Nama: ${user?.name || '-'} (${user?.loginId || '-'})`,
    `Kampus: ${user?.campusName || '-'}`,
    `Mata kuliah: ${a.subjectName}`,
    `Pembahasan & kunci di PDF: ${a.hasKey ? 'Ada' : 'Belum ada'}`,
    `Bahasa: ${BAHASA[a.language] || '-'}`,
    `Dilihat oleh: ${a.scope === 'campus' ? 'Hanya kampus saya' : 'Semua kampus'}`,
    'Jumlah PDF: lebih dari 5',
    '',
    'File PDF-nya saya kirim di chat ini.',
  ].join('\n');
}
