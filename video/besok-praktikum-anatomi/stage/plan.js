// Rencana video: waktu (detik) mengikuti MP3 narasi. Rekaman atlas asli dari "take" (lihat record/ di human-anatomy-3d).
// kind: still (keadaan awal) | motion (bingkai 3D berurutan, 30 fps) | click (klik kontrol asli; sebelum/sesudah)
const S = (take, kind, t0, label, o = {}) => ({ take, kind, t0, label, ...o });
export const PLAN = {
  takes: ['intro', 'hero_layers', 'skeleton', 'vessels', 'lymph'],
  atlasT0: 34.1, atlasT1: 51.9, panelT0: 51.6, panelT1: 57.05, sideCapT0: 34.4, sideCapT1: 51.7,
  steps: [
    S('intro', 'still', 34.2, 'ready', { tin: 0.01 }),
    S('intro', 'motion', 38.4, 'intro-rot'),                                  // 70 bingkai: depan -> samping
    S('intro', 'motion', 40.85, 'intro-zoom'),                                // 45 bingkai: perbesar
    S('hero_layers', 'still', 43.0, 'Muscles', { tin: 0.3 }),                 // tampilan otot (setelah preset Muscles)
    S('hero_layers', 'click', 43.7, 'Muscles -1', { approach: 0.7 }),
    S('hero_layers', 'click', 44.35, 'Muscles -2', { approach: 0.5 }),
    S('hero_layers', 'click', 45.0, 'Muscles -3', { approach: 0.5 }),
    S('skeleton', 'still', 45.2, 'ready', { tin: 0.3 }),
    S('skeleton', 'click', 45.55, 'Muscles off', { approach: 0.3 }),          // otot dimatikan: kerangka
    S('vessels', 'still', 46.0, 'ready', { tin: 0.3 }),
    S('vessels', 'click', 46.7, 'Arteries on', { approach: 0.6 }),
    S('vessels', 'click', 47.45, 'Veins on', { approach: 0.5 }),
    S('vessels', 'motion', 48.1, 'vessels-rot'),                              // 60 bingkai: hubungan dengan struktur sekitar
    S('lymph', 'still', 50.15, 'ready', { tin: 0.3 }),
    S('lymph', 'click', 50.4, 'Arteries off', { approach: 0.25 }),
    S('lymph', 'click', 50.85, 'Veins off', { approach: 0.25 }),
    S('lymph', 'click', 51.25, 'Lymphatic on', { approach: 0.25 }),
  ],
  cam: [[0, 540, 960, 1], [38.2, 540, 960, 1], [43.0, 540, 960, 1], [43.45, 457, 830, 1.18], [51.8, 457, 830, 1.18]],
  cursorOn: [[35.2, 51.7]],
  overlayClip: `path('M329 211h255v40h-255z M329 1798h260v46h-260z M950 1692h96v125h-96z')`,
  panelClips: [
    { dir: 'materi', t0: 51.7, t1: 53.85, f0: 4, f1: 100, rate: 1.6 },
    { dir: 'soal', t0: 53.85, t1: 57.2, f0: 4, f1: 150, rate: 1.65 },
  ],
};
export const CHIPS = [
  { t0: 34.4, t1: 38.3, text: '3D ANATOMY MEDCOEL', w: 620, fs: 36, bg: '#E8665F', x: 690 },
  { t0: 38.5, t1: 42.9, text: 'PUTAR · PERBESAR', w: 600, fs: 36, x: 690 },
  { t0: 43.3, t1: 45.8, text: 'KURANGI LAYER OTOT', w: 620, fs: 36, x: 690 },
  { t0: 46.2, t1: 50.2, text: 'LIHAT PEMBULUH DARAH', w: 680, fs: 36, x: 690 },
  { t0: 50.3, t1: 51.65, text: 'DAN SISTEM LAINNYA', w: 640, fs: 34, x: 690 },
  { t0: 51.9, t1: 53.8, text: 'CATATAN MATERI', w: 560, fs: 38, x: 540, y: 262, bg: '#F8C038', fg: '#0A3830' },
  { t0: 53.95, t1: 56.8, text: 'LATIHAN SOAL', w: 520, fs: 38, x: 540, y: 262, bg: '#F8C038', fg: '#0A3830' },
];
const G = (t, a) => ({ t });
export function titleCard(t, A) {
  const a = Math.max(0, Math.min(1, (t - 0.15) / 0.25)) * Math.max(0, Math.min(1, (5.35 - t) / 0.3)); if (a <= 0.01) return '';
  const k = 0.85 + 0.15 * Math.min(1, (t - 0.15) / 0.4);
  return `<g transform="translate(540 330) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="-470" y="-62" width="940" height="140" rx="70" fill="rgba(10,56,48,.3)"/><rect x="-470" y="-70" width="940" height="140" rx="70" fill="#E8665F"/>${A.T(-70, 18, 'BESOK PRAKTIKUM ANATOMI', '#fff', 46)}<g transform="translate(398 0)">${A.dizzyEmoji(t, 1.15)}</g></g>`;
}
export function labChips(t, A) {
  const L = [
    [5.85, 7.7, 'DARI DEPAN: PAHAM ✓', '#3DB46E', '#fff', 640, 40],
    [8.05, 12.7, 'DARI SAMPING: MULAI RAGU', '#F8C038', '#0A3830', 760, 38],
    [13.5, 16.3, 'TUNGGU, TADI YANG MANA?', '#E8665F', '#fff', 760, 38],
    [16.55, 19.2, 'MALAM SEBELUMNYA', '#0A3830', '#fff', 600, 40],
    [21.85, 23.9, 'BUKUNYA BERPUTAR ??', '#E8665F', '#fff', 700, 40],
    [24.4, 26.8, 'PEMAHAMANMU: TERSESAT', '#F8C038', '#0A3830', 780, 38],
    [27.0, 33.3, 'TULANG + OTOT + PEMBULUH = ?', '#8E7CE8', '#fff', 840, 38],
    [57.2, 60.9, 'PUTAR MODELNYA DULU', '#007060', '#fff', 640, 40],
  ];
  let o = '';
  for (const [a, b, txt, bg, fg, w, fs] of L) {
    const al = Math.max(0, Math.min(1, (t - a) / 0.25)) * Math.max(0, Math.min(1, (b - t) / 0.25)); if (al <= 0.01) continue;
    const k = 0.85 + 0.15 * Math.min(1, (t - a) / 0.4);
    o += `<g transform="translate(540 330) scale(${k.toFixed(3)})" opacity="${al.toFixed(3)}"><rect x="${-w / 2}" y="-34" width="${w}" height="76" rx="38" fill="rgba(10,56,48,.28)"/><rect x="${-w / 2}" y="-40" width="${w}" height="76" rx="38" fill="${bg}"/>${A.T(0, 12, txt, fg, fs)}</g>`;
  }
  return o;
}
export function outroCards(t, A, LOGO) {
  if (t < 61.4) return '';
  const ease = (x) => { x = Math.max(0, Math.min(1, x)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const pp = (t0) => 0.7 + 0.3 * ease((t - t0) / 0.38), aa = (t0) => Math.max(0, Math.min(1, (t - t0) / 0.15));
  let o = '';
  o += `<g transform="translate(540 380) scale(${pp(61.6).toFixed(3)})" opacity="${aa(61.6)}"><rect x="-290" y="-84" width="580" height="190" rx="54" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-290" y="-84" width="580" height="190" rx="54" fill="#fff"/><image href="${LOGO}" x="-230" y="-46" width="460" height="92.7"/></g>`;
  o += `<g transform="translate(540 545) scale(${pp(62.4).toFixed(3)})" opacity="${aa(62.4)}"><rect x="-470" y="-62" width="940" height="140" rx="70" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-470" y="-62" width="940" height="140" rx="70" fill="#E8665F"/>${A.T(0, 14, 'BELAJAR KEDOKTERAN GRATIS', '#fff', 52)}</g>`;
  o += `<g transform="translate(540 672) scale(${pp(63.4).toFixed(3)})" opacity="${aa(63.4)}"><rect x="-300" y="-56" width="600" height="116" rx="58" fill="rgba(10,56,48,.25)" transform="translate(0 8)"/><rect x="-300" y="-56" width="600" height="116" rx="58" fill="#0A3830"/>${A.T(0, 24, 'medcoel.com', '#F8C038', 72)}</g>`;
  return o;
}
