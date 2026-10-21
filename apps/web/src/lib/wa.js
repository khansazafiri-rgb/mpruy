// Tautan WhatsApp dengan pesan yang sudah terisi.

export function waLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
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
