// Small, pure helpers for the Exam Center and Study Planner pages (tested in studyLib.test.mjs).
export const KIND = {
  learn: { label: 'Pelajari', hint: 'Materi baru', tone: 'chip chip-brand' },
  review: { label: 'Ulas', hint: 'Pengulangan singkat', tone: 'chip chip-info' },
  practice: { label: 'Latihan soal', hint: 'Uji pemahaman', tone: 'chip chip-warn' },
  final: { label: 'Revisi akhir', hint: 'H-1: ringkas, latihan terarah, istirahat', tone: 'chip' },
};
export const WORKLOAD = [['light', 'Ringan (~45 mnt)'], ['medium', 'Sedang (~90 mnt)'], ['heavy', 'Berat (~150 mnt)']];
export const PRIORITY = [[1, 'Rendah'], [2, 'Normal'], [3, 'Tinggi']];
export const STALE = {
  missed: 'Ada sesi yang terlewat',
  exam_changed: 'Tanggal ujian berubah',
  availability_changed: 'Waktu belajarmu berubah',
  exam_deleted: 'Ujian sudah dihapus',
};

export function fmtMinutes(m) {
  const n = Math.max(0, Math.round(Number(m) || 0));
  if (n < 60) return `${n} mnt`;
  const h = Math.floor(n / 60), r = n % 60;
  return r ? `${h} j ${r} mnt` : `${h} jam`;
}

/** "H-3" relative to the exam day; both arguments are YYYY-MM-DD. */
export function hLabel(date, examDate) {
  const d = Math.round((Date.parse(examDate + 'T00:00:00Z') - Date.parse(date + 'T00:00:00Z')) / 86400000);
  return d === 0 ? 'Hari H' : d > 0 ? `H-${d}` : `H+${-d}`;
}

/** Status of a plan for the exam card: what the student should see first. */
export function planStatus(plan) {
  if (!plan) return { key: 'none', label: 'Belum ada rencana', chip: 'chip' };
  if (plan.status === 'archived') return { key: 'archived', label: 'Diarsipkan', chip: 'chip' };
  if (plan.stale?.length) return { key: 'stale', label: 'Perlu diperbarui', chip: 'chip chip-warn' };
  if (plan.shortfall?.minutes > 0) return { key: 'short', label: 'Waktu tidak cukup', chip: 'chip chip-danger' };
  return { key: 'ok', label: 'Rencana aktif', chip: 'chip chip-brand' };
}

/** Days and hours until an absolute time (for exams that are not the highlighted one). */
export function countdownText(examAt, now = Date.now()) {
  const t = Date.parse(String(examAt).replace(' ', 'T'));
  if (!Number.isFinite(t)) return '';
  const ms = t - now;
  if (ms <= 0) return 'Sudah dimulai';
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d} hari ${h} jam lagi` : h > 0 ? `${h} jam lagi` : 'Kurang dari 1 jam';
}

/** Group sessions by date (sorted), keeping each day's order. */
export function byDay(sessions) {
  const map = new Map();
  [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).forEach((s) => { if (!map.has(s.date)) map.set(s.date, []); map.get(s.date).push(s); });
  return [...map.entries()].map(([date, items]) => ({ date, items, minutes: items.reduce((a, s) => a + (s.status === 'skipped' ? 0 : s.minutes), 0) }));
}

/** New local topic row for the planner form. */
let seq = 0;
export function newTopic(fields = {}) {
  seq += 1;
  return { key: `n${Date.now().toString(36)}${seq}`, title: '', status: 'unstudied', confidence: 2, workload: 'medium', source: { type: 'custom' }, ...fields };
}
