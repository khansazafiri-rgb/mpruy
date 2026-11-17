// Outro MEDCOEL (31-43,6 dtk): rekaman web ASLI dari paket outro (video/masih-dua-minggu/rekam/rekaman-web.mp4 untuk pilih bab, latihan soal, pembahasan;
// video/dok-saya-kenapa/rekam/rekaman-web.mp4 untuk Simulasi Dokter). Bingkai diekstrak 15 fps ke rekam/web/. Tidak ada UI buatan: panel hanya membingkai rekaman.
import { f1, clamp, lerp, sm } from './core.js';
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif", PX = "'Press Start 2P', monospace";
const R = (x, y, w, h, f, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${f}" ${e}/>`;
const pxt = (x, y, txt, fill, size, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${PX}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${txt}</text>`;
const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const WEB = '../rekam/web';
export const SEGS = (O) => [
  [O.bab[0], O.bab[1], 'bab', 77, 5.0], [O.soal[0], O.soal[1], 'soal', 125, 8.2], [O.sim[0], O.sim[1], 'sim', 217, 14.4],
];
const NAMES = { bab: ['1', 'PILIH BAB'], soal: ['2', 'LATIHAN SOAL + PEMBAHASAN'], sim: ['3', 'SIMULASI DOKTER'] };
export function frameAt(t, O) {
  const segs = SEGS(O); const s = segs.find((x) => t >= x[0] && t < x[1]) || (t < segs[0][0] ? segs[0] : segs[segs.length - 1]);
  const u = clamp((t - s[0]) / (s[1] - s[0])), idx = Math.min(s[3], Math.round(u * s[4] * 15));
  return { clip: s[2], url: `${WEB}/${s[2]}/f${String(idx).padStart(4, '0')}.jpg` };
}
export const outroNeeds = (t, O) => [frameAt(t, O).url];
function cells(p, seed = 5) {   // peralihan blok piksel dari cerita ke outro
  let s = ''; const cell = 72; let k = seed * 9301 + 49297;
  for (let j = 0; j < 27; j++) for (let i = 0; i < 15; i++) { k = (k * 9301 + 49297) % 233280; const th = (k / 233280) * 0.82 + (i / 15) * 0.18; if (th < p) s += `<rect x="${i * cell}" y="${j * cell}" width="${cell}" height="${cell}"/>`; }
  return s;
}
export function outroUI(t, C, need) {
  const O = C.outro, t0 = O.bab[0] - 0.55; if (t < t0) return '';
  const p = clamp((t - t0) / 0.9), f = frameAt(t, O), end = sm((t - O.akhir) / 0.5);
  const P = { x: 90, y: 322, w: 900, h: 1100 };
  let s = `<defs><clipPath id="clipX">${cells(p)}</clipPath><clipPath id="clipPanel"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}"/></clipPath><linearGradient id="oBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B2A33"/><stop offset="1" stop-color="#0E4048"/></linearGradient></defs><g clip-path="url(#clipX)">`;
  s += `<rect width="1080" height="1920" fill="url(#oBg)"/>`;
  for (let j = 0; j < 14; j++) for (let i = 0; i < 8; i++) s += R(i * 144 + 36 + (j % 2) * 72, j * 144 + 30, 12, 12, 'rgba(127,231,238,.10)');
  // panel rekaman web asli (bingkai piksel emas)
  s += R(P.x - 12, P.y - 12, P.w + 24, P.h + 24, '#F8C038') + R(P.x - 6, P.y - 6, P.w + 12, P.h + 12, '#0B1F26');
  s += `<g clip-path="url(#clipPanel)"><image href="${need(f.url)}" x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" preserveAspectRatio="xMidYMin slice"/></g>`;
  // penanda: nama fitur yang sedang ditampilkan (atas) dan titik kemajuan
  const [n, name] = NAMES[f.clip], a = 1 - end;
  if (a > 0.01) {
    const w = name.length * 24 + 100;
    s += `<g opacity="${f1(a)}">${R(540 - w / 2 - 6, 262, w + 12, 62, '#F8C038')}${R(540 - w / 2, 268, w, 50, '#0B1F26')}${pxt(540 - w / 2 + 30, 304, n, '#F8C038', 24, 'start')}${pxt(540 + 20, 304, name, '#F5F1E6', 24)}</g>`;
  }
  // teks narasi (takarir) selama narasi outro
  O.sub.forEach(([a0, a1, txt]) => { const al = win(t, a0, a1, 0.2) * (1 - end); if (al > 0.01) s += `<g opacity="${f1(al)}">${R(90, 1328, 900, 80, 'rgba(8,24,34,.9)')}<text x="540" y="1382" font-family="${FONT}" font-weight="800" font-size="38" fill="#F5F1E6" text-anchor="middle">${txt}</text></g>`; });
  // penutup: logo + teks; rekaman web tetap bergerak di belakang
  if (end > 0.01) {
    s += `<g opacity="${f1(end)}" transform="translate(0 ${f1((1 - end) * 24)})">${R(190, 252, 700, 96, '#0B1F26')}${R(196, 258, 688, 84, '#F8F7F3')}<image href="${need('../stage/logo-full.webp')}" x="290" y="262" width="500" height="76" preserveAspectRatio="xMidYMid meet"/></g>`;
    s += `<g opacity="${f1(end)}" transform="translate(0 ${f1((1 - end) * 30)})">${R(54, 1326, 972, 104, '#0B1F26')}${R(60, 1332, 960, 92, '#F8C038')}<text x="540" y="${1332 + 64}" font-family="${FONT}" font-weight="800" font-size="46" fill="#0B1F26" text-anchor="middle">BELAJAR FK GRATIS · MEDCOEL.COM</text></g>`;
  }
  s += `</g>`;
  return s;
}
