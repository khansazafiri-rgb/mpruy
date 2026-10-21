// Label tampilan yang dipakai di banyak halaman.

export const DIFF = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const DIFF_CLASS = {
  easy: 'bg-brand-soft text-brand-dark',
  medium: 'bg-gold-soft text-[#7a5a00]',
  hard: 'bg-coral-soft text-coral',
};
export const QTYPE = { A: 'Tipe A', K: 'Tipe K', isian: 'Isian singkat', esai: 'Esai' };
export const KIND = { practice: 'Latihan topik', simulation: 'Simulasi', package: 'Paket soal' };

export const SUB_STATUS = {
  draft: 'Draf',
  menunggu_konfirmasi: 'Menunggu konfirmasi',
  antre: 'Antre',
  diproses: 'Diproses',
  selesai: 'Selesai',
  perlu_perbaikan: 'Perlu perbaikan',
  dibatalkan: 'Dibatalkan',
  kedaluwarsa: 'Kedaluwarsa',
};
export const SUB_STATUS_CLASS = {
  draft: 'bg-page text-ink-muted',
  menunggu_konfirmasi: 'bg-gold-soft text-[#7a5a00]',
  antre: 'bg-academic-soft text-academic',
  diproses: 'bg-progress-soft text-progress',
  selesai: 'bg-brand-soft text-brand-dark',
  perlu_perbaikan: 'bg-coral-soft text-coral',
  dibatalkan: 'bg-page text-ink-muted',
  kedaluwarsa: 'bg-page text-ink-muted',
};

export const REPORT_REASON = {
  kunci_salah: 'Kunci jawaban salah',
  salah_ketik: 'Salah ketik',
  gambar_tidak_muncul: 'Gambar tidak muncul',
  pembahasan_keliru: 'Pembahasan keliru',
  lainnya: 'Lainnya',
};
export const REPORT_STATUS = { baru: 'Baru', ditangani: 'Ditangani', selesai: 'Selesai' };

export const LANG = { id: 'Indonesia', en: 'Inggris', both: 'Keduanya' };

export function scoreText(score) {
  return typeof score === 'number' && score >= 0 ? `${Math.round(score * 10) / 10}` : '-';
}
