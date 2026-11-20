/* global URLSearchParams */
// Pure helpers for the studio page (testable without React).
export const MODES = [
  { id: 'explore', label: 'Explore' },
  { id: 'guided', label: 'Guided' },
  { id: 'challenge', label: 'Challenge' },
];
export function modeFrom(search) {
  const m = new URLSearchParams(search || '').get('mode');
  return MODES.some(x => x.id === m) ? m : 'explore';
}
/** Indonesian summary lines of the learner's own progress (from GET /api/medcoel/studios/{id}/progress). */
export function progressLines(p) {
  if (!p || !Array.isArray(p.attempts)) return [];
  const lines = [];
  if (p.best) lines.push(`Skor Challenge terbaik: ${p.best.correct} / ${p.best.total}`);
  if (p.challengeAttempts) lines.push(`${p.challengeAttempts} percobaan Challenge, ${p.completedChallenges} selesai (dinilai server)`);
  if (p.guidedCompleted) lines.push('Guided pernah diselesaikan (dicatat dari perangkat Anda)');
  else if (p.attempts.some(a => a.mode === 'guided')) lines.push('Guided sudah dimulai (dicatat dari perangkat Anda)');
  return lines;
}
export function modeErrorText(code) {
  if (code === 'MODE_NOT_AVAILABLE') return 'Mode ini belum tersedia untuk studio ini.';
  return '';
}
