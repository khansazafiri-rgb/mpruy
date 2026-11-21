// Komposisi outro master MEDCOEL (1080 x 1920, 30 fps). v = detik dari awal file.
// Audio (outro-baru.wav) mulai di v = A0; kata kunci (detik audio) dari ASR proyek USG: atlas 1,56 | live 2,58 | lanjut 4,10 | materi 5,14 | latihan 5,86 | simulasi 6,88 | gratis 8,14 | medcoel 9,06 | selesai 9,98.
// Semua gambar = rekaman produk ASLI (kecepatan 1,0x, tanpa percepatan): Atlas 3D, Live 4D Lab, materi per bab, latihan soal, Simulasi Dokter; logo asli; Raka dari brand/characters/raka/raka.js.
import { f1, clamp, lerp, R, T, GOLD, INK, FOREST, pill, eo, eio, sm } from '../../usg-gema-gambar/stage/lib.js';
import { raka, rakaSvg, rIdle } from '../../usg-gema-gambar/stage/raka.js';
export const FPS = 30, DUR = 16.2, N = Math.round(DUR * FPS), A0 = 0.7;
export const AW = { atlas: 1.56, live: 2.58, lanjut: 4.1, materi: 5.14, latihan: 5.86, simulasi: 6.88, gratis: 8.14, medcoel: 9.06, selesai: 9.98 };
// segmen: [mulai, selesai, label, klip, jumlah bingkai klip]
export const SEG = [
  [0.0, 2.7, 'ATLAS 3D', 'atlas', 81], [2.7, 5.2, 'LIVE 4D LAB', 'lab', 75], [5.2, 6.9, 'Materi per bab', 'materi', 51], [6.9, 8.4, 'Latihan soal + pembahasan', 'latihan', 45], [8.4, 10.1, 'Simulasi Dokter', 'simulasi', 51],
];
export const LOGO_AT = 10.15;
const CAPS = [[A0 + 0.0, A0 + 3.7, 'Di MEDCOEL, jelajahi Atlas 3D dan Live 4D Lab.'], [A0 + 4.1, A0 + 7.72, 'Lanjut belajar lewat materi, latihan soal, dan Simulasi Dokter.'], [A0 + 8.14, A0 + 10.7, 'Gratis di medcoel.com.']];
const FRAME = { x: 30, y: 262, w: 1020, h: 1254 };
// potongan (crop) rekaman web: [detik, pusatX, pusatY, zoom] pada bingkai sumber 960 x 1180 (zoom 1 = seluruh lebar)
const CROP = {
  materi: [[0, 345, 540, 1.3], [0.9, 360, 560, 1.28], [1.7, 480, 560, 1.18]],
  latihan: [[0, 470, 620, 1.12], [1.5, 470, 620, 1.12]],
  simulasi: [[0, 480, 560, 1.1], [1.7, 500, 560, 1.1]],
};
const kf = (keys, x) => { if (x <= keys[0][0]) return keys[0].slice(1); for (let i = 0; i + 1 < keys.length; i++) if (x <= keys[i + 1][0]) { const u = sm((x - keys[i][0]) / (keys[i + 1][0] - keys[i][0])); return keys[i].slice(1).map((a, j) => lerp(a, keys[i + 1][1 + j], u)); } return keys[keys.length - 1].slice(1); };
const srcRect = (clip, u) => { const [cx, cy, z] = kf(CROP[clip], u), w = 960 / z, h = w * 1254 / 1020; return { x: clamp(cx - w / 2, 0, 960 - w), y: clamp(cy - h / 2, 0, 1180 - h), w, h }; };
const four = (n) => String(n).padStart(4, '0');
const SIMLAB = 'Simulasi edukatif, bukan alat diagnosis';
const P3 = { sx: 20, sy: 110, sw: 702, sh: 330, x: FRAME.x, y: FRAME.y, w: FRAME.w, h: 480 }, PU = { x: 160, y: FRAME.y + 500, w: 760, h: 597 };
const LAB0 = 100;   // bingkai awal pada take 'hook' (100-174: citra terang dan berubah jelas saat probe digeser)
const labPath = (n) => ({ a: `../../usg-gema-gambar/rekam/lab/hook/a/f${four(n + LAB0)}.jpg`, m: `../../usg-gema-gambar/rekam/lab/hook/m/f${four(n + LAB0)}.png` });

function caption(v, y) {
  const c = CAPS.find(([a, b]) => v >= a - 0.02 && v <= b + 0.12); if (!c) return '';
  const size = 48, words = c[2].split(' '), lines = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (cur && wd.length && t.length * 22 > 840) { lines.push(cur); cur = wd; } else cur = t; } if (cur) lines.push(cur);
  const a = clamp((v - c[0] + 0.02) / 0.15) * clamp((c[1] + 0.12 - v) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30;
  return `<g opacity="${f1(a * 100) / 100}">${R(90, y + 6, 900, h, 'rgba(0,0,0,.28)', 34)}${R(90, y, 900, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
export function frame(v) {
  const kc = clamp((v - (LOGO_AT - 0.3)) / 0.3), keep = 1 - kc;
  let A = `${R(-10, -10, 1100, 1940, '#0B2F38')}<g opacity="${f1(kc * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let U = '', web = [];
  if (keep > 0.01) {
    U += `<g opacity="${f1(keep * 100) / 100}"><rect x="${FRAME.x - 8}" y="${FRAME.y - 8}" width="${FRAME.w + 16}" height="${FRAME.h + 16}" rx="30" fill="none" stroke="${GOLD}" stroke-width="8"/></g>`;
    let cur = SEG[0];
    for (const s of SEG) {
      const [u0, u1, lab, clip, nf] = s, a = (u0 === 0 ? 1 : clamp((v - u0) / 0.25)) * keep;
      if (v < u0 || v > u1 + 0.3 || a <= 0.004) continue;
      const fi = clamp(Math.floor((v - u0) * FPS), 0, nf - 1), u = Math.min(v - u0, (nf - 1) / FPS);
      if (clip === 'lab') web.push({ kind: 'lab', ...labPath(fi), alpha: a, p3: P3, pu: PU, clip: { ...FRAME, r: 22 } });
      else if (clip === 'atlas') web.push({ kind: 'img', src: `../rekam/klip/atlas/f${four(fi + 1)}.jpg`, rect: FRAME, sc: { x: 0, y: 0, w: 724, h: 890 }, alpha: a, clip: { ...FRAME, r: 22 } });
      else web.push({ kind: 'img', src: `../rekam/klip/${clip}/f${four(fi + 1)}.jpg`, rect: FRAME, sc: srcRect(clip, u), alpha: a, clip: { ...FRAME, r: 22 } });
      if (v >= u0 && v < u1) cur = s;
    }
    // label fitur (atas) dan, untuk Live 4D Lab, bingkai monitor + label simulasi
    const [u0, u1, lab, clip] = cur, k = clamp((v - u0) / 0.25) || (u0 === 0 ? 1 : 0), ly = 120 + (u0 === 0 ? 0 : (1 - eo(clamp((v - u0) / 0.3))) * -36);
    U += pill([lab], 540, ly, { a: keep * (u0 === 0 ? 1 : Math.max(k, 0.01)), size: 60, bg: '#fff' });
    if (clip === 'lab') U += `<g opacity="${f1(keep * clamp((v - u0) / 0.25) * 100) / 100}">${R(PU.x - 3, PU.y - 3, PU.w + 6, PU.h + 6, 'none', 8, 'stroke="rgba(255,255,255,.55)" stroke-width="3"')}${pill([SIMLAB], 540, PU.y + PU.h + 22, { a: 1, size: 32, bg: GOLD, fg: INK })}</g>`;
  }
  if (kc > 0.01) {
    const ke = clamp((v - LOGO_AT) / 0.45);
    U += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="190" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('BELAJAR FK GRATIS', 540, 450, { size: 76, fill: FOREST })}${R(230, 500, 620, 140, FOREST, 70)}${T('medcoel.com', 540, 600, { size: 88, fill: GOLD })}</g>`;
    let st = raka('senang', 'netral', { yaw: -0.1, tilt: -3 }); st = rIdle(st, v);
    U += `<g opacity="${f1(ke * 100) / 100}" transform="translate(${f1(540 - 200 * 1.05)} ${f1(790 + (1 - ke) * 80)}) scale(1.05)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkO' })}</g>`;
  }
  U += caption(v, kc > 0.5 ? 1640 : 1548);
  return { A, U, web };
}
