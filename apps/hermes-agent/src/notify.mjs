// Teks notifikasi Telegram untuk pengajuan soal.
import { escapeHtml } from './telegram.mjs';

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu konfirmasi',
  antre: 'Antre',
  diproses: 'Diproses',
  perlu_perbaikan: 'Perlu perbaikan',
  selesai: 'Selesai',
};

export function statusLabel(status) {
  return STATUS_LABEL[status] || String(status || '-');
}

function scopeLabel(sub) {
  return sub.restriction === 'campus'
    ? `campus${sub.campus?.name ? ` · ${escapeHtml(sub.campus.name)}` : ''}`
    : (sub.restriction || sub.scope || '-');
}

export function queueCard(sub, queue) {
  const files = (sub.files || [])
    .map((f) => `• ${escapeHtml(f.name)}${f.driveFileId ? ' · siap dikirim dari Drive' : ''}`)
    .join('\n') || '• tidak ada file';
  const q = queue
    ? `\nAntrean PDF: ${Number(queue.totalQueuedPdf || 0)} · estimasi ${Number(queue.estimateDays || 0)} hari`
    : '';
  const who = sub.user?.name ? `Pengaju: ${escapeHtml(sub.user.name)}${sub.user.loginId ? ` (${escapeHtml(sub.user.loginId)})` : ''}\n` : '';
  return `<b>📥 ${escapeHtml(sub.code || sub.id)}</b>\n`
    + `Status: ${escapeHtml(statusLabel(sub.status))}\n`
    + who
    + `Sumber mata kuliah: ${escapeHtml(sub.subject?.name || sub.subject?.id || '-')}\n`
    + `Cakupan: ${scopeLabel(sub)}\n`
    + `Bahasa: ${escapeHtml(sub.language || '-')}\n`
    + `PDF: ${Number(sub.pdfCount || (sub.files || []).length)}\n`
    + `${files}${q}`;
}

export function compactSubmission(sub) {
  return `<b>${escapeHtml(sub.code || sub.id)}</b> · ${escapeHtml(sub.subject?.name || '-')} · ${Number(sub.pdfCount || 0)} PDF`
    + (sub.status && sub.status !== 'antre' ? ` · ${escapeHtml(statusLabel(sub.status))}` : '');
}

// Petunjuk singkat "mau mengumpulkan hasilnya, ketik apa". Kode pengajuan sudah terisi supaya
// cukup ketuk (salin) lalu kirim.
export function howToSubmit(code, status) {
  const c = escapeHtml(code);
  const lines = [];
  lines.push('<b>Cara mengumpulkan hasilnya (JSON)</b>');
  if (status === 'menunggu_konfirmasi') {
    lines.push(`1) Terima dulu pengajuannya: <code>/terima ${c}</code>`);
    lines.push(`2) Kirim JSON: <code>/put ${c}</code> lalu tempel JSON-nya di chat (boleh beberapa pesan). Atau kirim file .json dengan caption <code>/put ${c}</code>.`);
    lines.push('3) Cek rencana dengan <code>/plan</code>, lalu <code>/confirm</code> untuk mengimpor.');
    lines.push('<i>Belum dikonfirmasi: soal baru bisa diimpor setelah status Antre.</i>');
  } else {
    lines.push(`1) Kirim JSON: <code>/put ${c}</code> lalu tempel JSON-nya di chat (boleh beberapa pesan). Atau kirim file .json dengan caption <code>/put ${c}</code>.`);
    lines.push('2) Cek rencana dengan <code>/plan</code>, lalu <code>/confirm</code> untuk mengimpor.');
  }
  lines.push('Kalau JSON ditempel lewat beberapa pesan dan belum selesai otomatis, kirim <code>/selesai</code>. Batalkan dengan <code>/cancelplan</code>.');
  return lines.join('\n');
}

export function newSubmissionMessage(sub, queue) {
  const waiting = sub.status === 'menunggu_konfirmasi';
  const head = waiting
    ? '🆕 <b>Pengajuan baru masuk</b> · menunggu konfirmasi\n\n'
    : '✅ <b>Pengajuan masuk antrean</b>\n\n';
  return `${head}${queueCard(sub, queue)}\n\n${howToSubmit(sub.code || sub.id, sub.status)}`;
}

export const BOT_COMMANDS = [
  { command: 'queue', description: 'Daftar pengajuan yang menunggu' },
  { command: 'show', description: 'Detail pengajuan: /show KODE' },
  { command: 'files', description: 'Kirim PDF pengajuan: /files KODE' },
  { command: 'terima', description: 'Terima pengajuan (jadi Antre): /terima KODE' },
  { command: 'claim', description: 'Tandai Diproses: /claim KODE' },
  { command: 'put', description: 'Kirim JSON hasil: /put KODE lalu tempel JSON' },
  { command: 'selesai', description: 'Akhiri tempel JSON beberapa pesan' },
  { command: 'plan', description: 'Lihat rencana impor aktif' },
  { command: 'confirm', description: 'Impor sekarang (setelah dry-run)' },
  { command: 'cancelplan', description: 'Batalkan rencana impor / tempelan' },
  { command: 'fix', description: 'Perlu perbaikan: /fix KODE alasan' },
  { command: 'help', description: 'Bantuan' },
];
