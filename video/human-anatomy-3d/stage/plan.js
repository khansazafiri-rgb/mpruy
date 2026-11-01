// Rencana video: kapan tiap rekaman dipakai (detik video = detik narasi MP3). Satu "take" = satu sesi rekaman atlas asli.
// kind: still (keadaan awal take) | motion (bingkai 3D berurutan, 30 fps) | click (klik kontrol asli; sebelum/sesudah)
const S = (take, kind, t0, label, o = {}) => ({ take, kind, t0, label, ...o });
const FULL = [540, 960, 1];
export const PLAN = {
  takes: ['hero_layers', 'skeleton', 'vessels', 'lymph', 'explore', 'free'],
  capStart: 1.55, capEnd: 48.0,
  steps: [
    // 1.64-7.32: "Sekarang, kamu bisa menjelajahi anatomi tubuh dalam tiga dimensi, gratis di MEDCOEL"
    S('hero_layers', 'still', 1.6, 'start'),
    S('hero_layers', 'motion', 2.3, 'hero'),                                   // putar 100 bingkai (3,33 dtk)
    S('hero_layers', 'click', 7.0, 'Front', { approach: 1.2 }),              // tombol tampilan Front
    // 7.64-12.40: mulai dari otot, atur layer
    S('hero_layers', 'click', 9.15, 'Muscles', { approach: 0.9 }),            // preset "Muscles"
    // 12.82-16.52: kurangi layer otot (tiga kali)
    S('hero_layers', 'click', 13.45, 'Muscles -1', { approach: 0.8 }),
    S('hero_layers', 'click', 14.35, 'Muscles -2', { approach: 0.6 }),
    S('hero_layers', 'click', 15.25, 'Muscles -3', { approach: 0.6 }),
    S('hero_layers', 'motion', 15.75, 'peek'),                                // 40 bingkai: intip struktur di bawahnya
    // 16.96-22.10: kerangka
    S('skeleton', 'still', 16.7, 'ready', { tin: 0.3 }),
    S('skeleton', 'click', 17.75, 'Muscles off', { approach: 0.8 }),
    S('skeleton', 'motion', 18.5, 'skeleton-rot'),                            // 100 bingkai
    // 22.50-27.84: pembuluh darah
    S('vessels', 'still', 22.3, 'ready', { tin: 0.3 }),
    S('vessels', 'click', 23.2, 'Arteries on', { approach: 0.8 }),
    S('vessels', 'click', 24.75, 'Veins on', { approach: 0.6 }),
    S('vessels', 'motion', 25.6, 'vessels-rot'),                              // 60 bingkai
    // 27.84-32.60: limfatik
    S('lymph', 'still', 27.7, 'ready', { tin: 0.3 }),
    S('lymph', 'click', 28.45, 'Arteries off', { approach: 0.6 }),
    S('lymph', 'click', 29.25, 'Veins off', { approach: 0.5 }),
    S('lymph', 'click', 30.35, 'Lymphatic on', { approach: 0.7 }),
    S('lymph', 'motion', 31.0, 'lymph-rot'),                                  // 50 bingkai
    // 33.02-42.86: atur tampilan: putar, perbesar, pelajari
    S('explore', 'still', 32.85, 'ready', { tin: 0.3 }),
    S('explore', 'motion', 33.2, 'explore-rot1'),                             // 70 bingkai
    S('explore', 'motion', 36.4, 'explore-zoom'),                             // 50 bingkai
    S('explore', 'motion', 38.2, 'explore-pan'),                              // 24 bingkai
    S('explore', 'motion', 39.4, 'explore-rot2'),                             // 50 bingkai
    // 43.28-47.88: kamu yang pilih
    S('free', 'still', 43.05, 'ready', { tin: 0.3 }),
    S('free', 'click', 43.7, 'Veins on', { approach: 0.55 }),
    S('free', 'click', 44.35, 'Skeleton off', { approach: 0.4 }),
    S('free', 'click', 45.0, 'Lymphatic on', { approach: 0.4 }),
    S('free', 'click', 45.65, 'Muscles on', { approach: 0.4 }),
    S('free', 'click', 46.3, 'Muscles -1', { approach: 0.4 }),
    S('free', 'click', 46.95, 'Muscles -2', { approach: 0.4 }),
    S('free', 'motion', 47.45, 'free-rot'),                                    // 36 bingkai
  ],
  // kamera: [t, cx, cy, skala]; tampilan penuh = (540, 960, 1)
  cam: [
    [0, 540, 960, 1], [2.0, 540, 960, 1], [2.4, 540, 960, 1.0], [5.5, 545, 955, 1.04],
    [5.8, 560, 1500, 1.3], [6.5, 460, 1730, 2.0], [7.55, 460, 1730, 2.0], [8.2, 330, 700, 1.5],       // ke tombol Front
    [8.7, 150, 520, 2.4], [9.7, 150, 520, 2.4], [10.4, 190, 540, 2.3], [11.7, 190, 540, 2.3],        // ke sidebar (preset + baris otot)
    [12.6, 457, 830, 1.18], [16.6, 457, 830, 1.18],
    [17.0, 457, 840, 1.18], [22.2, 457, 840, 1.18],
    [22.6, 457, 840, 1.18], [27.8, 457, 840, 1.18], [28.1, 457, 840, 1.18], [32.6, 457, 840, 1.18],
    [33.2, 540, 960, 1.0], [36.0, 600, 930, 1.04], [38.4, 600, 930, 1.04], [42.9, 560, 940, 1.1],
    [43.3, 457, 830, 1.18], [47.9, 457, 830, 1.18], [48.6, 540, 960, 1],
    [52.9, 540, 960, 1],
  ],
  cursorOn: [[2.0, 18.6], [18.7, 18.9], [22.3, 25.6], [27.8, 31.0], [43.3, 48.0]],
  rings: [
    { take: 'hero_layers', t0: 10.0, t1: 12.2, rect: [18, 466, 263, 32] },               // baris Muscles & fascia (−, +)
    { take: 'hero_layers', t0: 10.0, t1: 12.2, rect: [192, 466, 90, 32] },
  ],
  // tombol-tombol yang tetap di atas model (UI di atas kanvas), koordinat halaman
  overlayClip: `path('M329 211h255v40h-255z M329 1798h260v46h-260z M950 1692h96v125h-96z')`,
};
export const CHIPS = [
  { t0: 2.4, t1: 7.3, text: 'JELAJAHI ANATOMI 3D · GRATIS', w: 700, fs: 34, bg: '#E8665F' },
  { t0: 9.6, t1: 12.4, text: 'ATUR LAYER SESUAI KEBUTUHAN', w: 720, fs: 30, x: 700 },
  { t0: 12.9, t1: 16.55, w: 800, fs: 28, x: 690, text: (t, h) => {
    const s = h.STEPS.filter((x) => x.kind === 'click' && /^Muscles -/.test(x.label) && x.t0 <= t).pop();
    const name = s ? s.ev.titles[0].replace(/&amp;/g, '&').split(' · ')[1] : 'Fascia & connective covering';
    return 'LAYER OTOT: ' + name.toUpperCase().replace(/&/g, '&amp;');
  } },
  { t0: 17.0, t1: 22.1, text: 'JELAJAHI KERANGKA', w: 520, fs: 36 },
  { t0: 22.5, t1: 27.8, text: 'LIHAT PEMBULUH DARAH', w: 600, fs: 36 },
  { t0: 27.9, t1: 32.6, text: 'JELAJAHI SISTEM LIMFATIK', w: 680, fs: 36 },
  { t0: 36.2, t1: 42.8, text: 'PUTAR · PERBESAR · PELAJARI', w: 700, fs: 34 },
  { t0: 43.3, t1: 48.0, text: 'PILIH SESUAI CARA BELAJARMU', w: 760, fs: 34, bg: '#E8665F' },
];

// ---------------------------------------------------------------- pembuka dan penutup (lapisan di atas rekaman)
const LOGO = 'logo-full.webp';
PLAN.extra = (t, h) => {
  const { eo, eob, win, sm, f1, clamp, wd } = h;
  let o = '';
  if (h.COVER) { // sampul: judul besar di atas model (zona aman atas), logo, gratis
    const T0 = (x, y, txt, size, fill, e = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="${size}" fill="${fill}" ${e}>${txt}</text>`;
    return `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#062622" stop-opacity=".94"/><stop offset="1" stop-color="#062622" stop-opacity="0"/></linearGradient></defs><rect width="1080" height="560" fill="url(#cg)"/>${T0(540, 330, 'FEATURE', 124, '#fff')}${T0(540, 458, 'UNLOCKED!', 134, '#F8C038')}<g transform="translate(540 1470)"><rect x="-330" y="-86" width="660" height="128" rx="64" fill="#E8665F"/>${T0(0, 6, '3D ANATOMY', 88, '#fff')}</g><g transform="translate(540 1630)"><rect x="-250" y="-52" width="500" height="92" rx="46" fill="#fff"/>${T0(0, 20, 'GRATIS · MEDCOEL', 46, '#007060')}</g>`;
  }
  const T = (x, y, txt, size, fill, e = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="${size}" fill="${fill}" ${e}>${txt}</text>`;
  const pop = (a, d = 0.35) => 0.6 + 0.4 * eob((t - a) / d);
  // ---- FEATURE UNLOCKED (0 - 2,3 dtk), membuka seperti iris ke atlas pada 1,64
  if (t < 2.4) {
    const R = t < 1.64 ? 0 : 1500 * sm((t - 1.64) / 0.7);
    const rays = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2 + t * 0.25; return `<path d="M540 760L${f1(540 + Math.cos(a - 0.09) * 1500)} ${f1(760 + Math.sin(a - 0.09) * 1500)}L${f1(540 + Math.cos(a + 0.09) * 1500)} ${f1(760 + Math.sin(a + 0.09) * 1500)}Z" fill="#fff" opacity=".07"/>`; }).join('');
    const open = eob((t - 0.5) / 0.32), ang = 34 * open, lift = 22 * open;
    const burst = t > 0.52 && t < 1.1 ? Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2, u = (t - 0.52) / 0.58, r0 = 140 + 220 * eo(u); return `<path d="M${f1(540 + Math.cos(a) * r0)} ${f1(760 + Math.sin(a) * r0)}L${f1(540 + Math.cos(a) * (r0 + 60 * (1 - u)))} ${f1(760 + Math.sin(a) * (r0 + 60 * (1 - u)))}" stroke="#F8C038" stroke-width="12" stroke-linecap="round" opacity="${(1 - u).toFixed(2)}"/>`; }).join('') : '';
    const lock = `<g transform="translate(540 790) scale(${(1 + 0.08 * Math.sin(Math.max(0, t - 0.5) * 18) * Math.exp(-(t - 0.5) * 5) * (t > 0.5 ? 1 : 0)).toFixed(3)})">`
      + `<g transform="translate(60 0) rotate(${f1(-ang)}) translate(-60 0) translate(0 ${f1(-lift)})"><path d="M-62 4V-72a62 62 0 0 1 124 0V4" fill="none" stroke="#E4EBEC" stroke-width="30" stroke-linecap="round"/></g>`
      + `<rect x="-120" y="0" width="240" height="190" rx="40" fill="#C98F00"/><rect x="-120" y="-8" width="240" height="190" rx="40" fill="#F8C038"/><circle cx="0" cy="84" r="24" fill="#0A3830"/><rect x="-9" y="92" width="18" height="52" rx="8" fill="#0A3830"/></g>`;
    const splash = `<defs><mask id="spl"><rect width="1080" height="1920" fill="#fff"/><circle cx="540" cy="960" r="${f1(R)}" fill="#000"/></mask><radialGradient id="sg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#0F5F57"/><stop offset="1" stop-color="#062622"/></radialGradient></defs>`
      + `<g mask="url(#spl)"><rect width="1080" height="1920" fill="url(#sg)"/>${rays}${burst}`
      + `<g opacity="${clamp((t - 0.15) / 0.2, 0, 1)}"><image href="${LOGO}" x="${540 - 230}" y="${330}" width="460" height="92.7"/></g>`
      + lock
      + `<g transform="translate(540 1130) scale(${pop(0.1, 0.3).toFixed(3)})" opacity="${clamp((t - 0.08) / 0.1, 0, 1)}">${T(0, 0, 'FEATURE', 128, '#fff')}</g>`
      + `<g transform="translate(540 1270) scale(${pop(0.55, 0.3).toFixed(3)})" opacity="${clamp((t - 0.55) / 0.1, 0, 1)}">${T(0, 0, 'UNLOCKED!', 138, '#F8C038', 'stroke="#062622" stroke-width="2"')}</g>`
      + `<g transform="translate(540 1440) scale(${pop(1.0, 0.35).toFixed(3)})" opacity="${clamp((t - 1.0) / 0.12, 0, 1)}"><rect x="-340" y="-86" width="680" height="128" rx="64" fill="#E8665F"/>${T(0, 6, '3D ANATOMY', 92, '#fff')}</g></g>`;
    o += splash;
  }
  // ---- penutup (48,0 - 52,85): atlas diredupkan, logo + Human Anatomy + Belajar gratis + medcoel.com
  if (t > 47.9) {
    const a = 0.9 * sm((t - 48.0) / 0.5);
    const tH = wd('K13', 2) - 0.05, tG = wd('K13', 4) - 0.05, tU = wd('K13', 8) - 0.05;
    const pp = (t0, d = 0.38) => 0.7 + 0.3 * eob((t - t0) / d), aa = (t0) => clamp((t - t0) / 0.15, 0, 1);
    o += `<rect width="1080" height="1920" fill="#0A3830" opacity="${a.toFixed(3)}"/>`;
    o += `<g transform="translate(540 470) scale(${pp(48.2).toFixed(3)})" opacity="${aa(48.2)}"><rect x="-330" y="-100" width="660" height="210" rx="60" fill="rgba(0,0,0,.25)" transform="translate(0 8)"/><rect x="-330" y="-100" width="660" height="210" rx="60" fill="#fff"/><image href="${LOGO}" x="-260" y="-52" width="520" height="104.8"/></g>`;
    o += `<g transform="translate(540 770) scale(${pp(tH).toFixed(3)})" opacity="${aa(tH)}">${T(0, 0, 'HUMAN', 120, '#fff')}${T(0, 124, 'ANATOMY', 120, '#9DE0BD')}</g>`;
    o += `<g transform="translate(540 1030) scale(${pp(tG).toFixed(3)})" opacity="${aa(tG)}"><rect x="-300" y="-72" width="600" height="116" rx="58" fill="#F8C038"/>${T(0, 22, 'BELAJAR GRATIS', 62, '#0A3830')}</g>`;
    o += `<g transform="translate(540 1190) scale(${pp(tU).toFixed(3)})" opacity="${aa(tU)}"><rect x="-300" y="-64" width="600" height="116" rx="58" fill="#fff"/>${T(0, 22, 'medcoel.com', 72, '#007060')}</g>`;
    const kb = Math.sin(t * 2.4) * 8, ka = clamp((t - 49.0) / 0.3, 0, 1);
    o += `<g transform="translate(540 ${f1(1500 + kb)}) scale(${(0.85 + 0.15 * eob((t - 49.0) / 0.5)).toFixed(3)})" opacity="${ka}"><image href="kori.svg" x="-190" y="-380" width="380" height="380"/></g>`;
  }
  return o;
};
