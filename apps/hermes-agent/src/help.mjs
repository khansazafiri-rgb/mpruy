// Teks /help. Telegram menolak pesan di atas 4096 karakter, jadi dibagi per bagian.
export const TELEGRAM_LIMIT = 4096;

export function buildHelp({ retargetHelp, importHelp }) {
  const first = [
    '<b>MEDCOEL Hermes Agent</b>',
    '',
    '<b>Antrean dan status pengajuan</b>',
    '/queue — lihat pengajuan berstatus Antre',
    '/show KODE — lihat detail pengajuan',
    '/files KODE — antrekan PDF yang belum terkonfirmasi terkirim',
    '/retryfiles KODE [nomor] — ulangi file gagal setelah memeriksa chat',
    '/files KODE 3 — ulangi PDF nomor 3 yang gagal pasti',
    '/terima KODE — terima pengajuan yang Menunggu konfirmasi (jadi Antre)',
    '/claim KODE — ubah menjadi Diproses',
    '/fix KODE alasan — tandai Perlu perbaikan',
    '',
    retargetHelp,
  ].join('\n');
  const second = [
    importHelp,
    '',
    '<b>Catatan:</b> scope/kampus selalu dikunci dari submission MEDCOEL; JSON tidak boleh mengubahnya.',
  ].join('\n');
  return [first, second];
}
