// Properti datar untuk "Soal kakak tingkat". Koordinat kanvas 1080 x 1920. Semua ilustrasi buatan (bukan data, bukan UI produk).
// Tampilan MEDCOEL (Chat Admin, latihan soal, pembahasan) TIDAK digambar di sini: semuanya rekaman layar asli (panels.js).
import { R, C, E, P, L, T, f1, clamp, COL } from './art.js';

export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const SEED = (n) => { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

// ---------------------------------------------------------------- dokumen PDF
export const pdfIcon = (x, y, s = 1, o = {}) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${o.rot ?? 0}) scale(${s})" opacity="${o.a ?? 1}">${R(-48, -60, 100, 128, 'rgba(0,0,0,.2)', 10)}${R(-52, -64, 100, 128, '#fff', 10)}${P('M20 -64L48 -36H20Z', '#DDE5E9')}${R(-52, -22, 100, 34, o.tag ?? '#E8665F', 6)}${T(-2, 3, 'PDF', '#fff', 26)}${R(-36, 26, 70, 6, '#C9D4D9', 3)}${R(-36, 40, 50, 6, '#C9D4D9', 3)}${o.label ? T(0, 94, o.label, o.fg ?? '#172B38', o.fs ?? 18) : ''}</g>`;
// halaman soal (tanpa kunci jawaban bila key = false). Koordinat lokal pusat atas halaman.
export function pdfPage(x, y, w, h, o = {}) {
  const q = (i, yy) => `${T(-w / 2 + 30, yy, `${i}.`, '#172B38', 22, '', 'start')}${R(-w / 2 + 62, yy - 18, w * 0.62, 8, '#9AA9B0', 4)}${R(-w / 2 + 62, yy - 2, w * 0.45, 8, '#C9D4D9', 4)}${['A', 'B', 'C', 'D'].map((c, k) => `${C(-w / 2 + 74 + k * (w * 0.2), yy + 28, 9, 'none', 'stroke="#9AA9B0" stroke-width="3"')}${R(-w / 2 + 90 + k * (w * 0.2), yy + 24, w * 0.11, 7, '#C9D4D9', 3)}`).join('')}`;
  const key = o.key === false ? `<g opacity="${o.keyA ?? 1}">${R(-w / 2 + 24, h - 120, w - 48, 86, 'rgba(232,102,95,.10)', 14, 'stroke="#E8665F" stroke-width="4" stroke-dasharray="12 9"')}${T(0, h - 70, 'KUNCI & PEMBAHASAN: —', '#E8665F', 24)}</g>` : '';
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${o.rot ?? 0}) scale(${o.s ?? 1})" opacity="${o.a ?? 1}">${R(-w / 2 + 8, 14, w, h, 'rgba(0,0,0,.22)', 18)}${R(-w / 2, 0, w, h, '#fff', 18)}${R(-w / 2, 0, w, 54, '#E8665F', 18)}${R(-w / 2, 30, w, 24, '#E8665F')}${T(0, 38, o.title ?? 'UTS ANATOMI', '#fff', 26)}${q(1, 100)}${q(2, 190)}${q(3, 280)}${key}</g>`;
}

// ---------------------------------------------------------------- HP: badan + isi buatan (galeri, grup chat)
export function phoneShell(x, y, w, h, inner, o = {}) { // pojok kiri-atas (x, y); inner digambar dalam koordinat layar (0,0)-(w,h)
  const id = o.id ?? 'ph' + Math.round(x + y);
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${o.rot ?? 0} ${w / 2} ${h / 2}) scale(${o.s ?? 1})" opacity="${o.a ?? 1}">${R(-8, 14, w + 16, h + 16, 'rgba(0,0,0,.28)', 58)}${R(-14, -14, w + 28, h + 28, '#1B2430', 58)}<clipPath id="${id}"><rect x="0" y="0" width="${w}" height="${h}" rx="44"/></clipPath><g clip-path="url(#${id})">${R(0, 0, w, h, '#fff')}${inner}</g>${R(w / 2 - 50, -4, 100, 18, '#1B2430', 9)}</g>`;
}
export function gallery(w, h, t, o = {}) { // layar galeri: foto dan PDF soal lama bertumpuk
  const rnd = SEED(7), cols = 3, g = 6, cw = (w - g * 4) / 3;
  const names = ['UTS Anatomi 2025', 'Soal Histo FIX', 'FINAL Fisio v2', 'Kuis Biokimia', 'Remedial IPD', 'Soal Patologi', 'UAS Farmako', 'Try Out OSCE', 'Mikro lama', 'Parasit 24'];
  let s = R(0, 0, w, h, '#F4F4F2') + R(0, 0, w, 96, '#fff') + T(28, 64, 'Galeri', '#172B38', 36, '', 'start') + T(w - 28, 64, 'PDF', '#E8665F', 28, '', 'end');
  const sc = o.scroll ?? 0; let k = 0;
  for (let r = 0; r < 12; r++) for (let c = 0; c < cols; c++) {
    const x = g + c * (cw + g), y = 110 + r * (cw + g) - sc, isPdf = (r + c) % 2 === 0 || r === 1 && c === 1;
    if (y > h || y < -cw) { k++; continue; }
    const hue = ['#F2C29B', '#9DE0BD', '#B7C6F0', '#F0B8B8', '#F6E0A0', '#BFE3EE'][Math.floor(rnd() * 6)];
    if (isPdf) { const key = r === 1 && c === 1; s += `<g transform="translate(${f1(x)} ${f1(y)})">${R(0, 0, cw, cw, '#fff', 10, key ? 'stroke="#F8C038" stroke-width="6"' : '')}${R(0, 0, cw, 28, '#E8665F', 10)}${R(0, 14, cw, 14, '#E8665F')}${T(cw / 2, 21, 'PDF', '#fff', 17)}${R(14, 44, cw - 28, 7, '#C9D4D9', 3)}${R(14, 60, cw - 50, 7, '#C9D4D9', 3)}${R(14, 76, cw - 36, 7, '#C9D4D9', 3)}${T(cw / 2, cw - 12, names[k % names.length].slice(0, 15), '#172B38', 13)}</g>`; }
    else s += `<g transform="translate(${f1(x)} ${f1(y)})">${R(0, 0, cw, cw, hue, 10)}${C(cw * 0.3, cw * 0.32, cw * 0.12, 'rgba(255,255,255,.7)')}${P(`M0 ${cw}L${cw * 0.4} ${cw * 0.55}L${cw * 0.7} ${cw * 0.8}L${cw * 0.85} ${cw * 0.65}L${cw} ${cw}Z`, 'rgba(0,0,0,.16)')}</g>`;
    k++;
  }
  return s;
}
export function chatGroup(w, h, t, o = {}) { // grup chat angkatan: pesan bertumpuk, PDF tenggelam
  const sc = o.scroll ?? 0;
  let s = R(0, 0, w, h, '#EFEAE2') + R(0, 0, w, 92, '#1D7B75') + T(w / 2, 62, 'Angkatan 2024 🎓'.replace(' 🎓', ''), '#fff', 32);
  const msgs = [['kak, ada soal tahun lalu?', 0], ['UTS Anatomi 2025.pdf', 2], ['makasih kak!!', 1], ['ada yang punya kuis histo?', 0], ['jadwal praktikum besok jam 7', 1], ['sticker', 3], ['jangan lupa jas lab', 0], ['siapa yang ke kantin?', 1], ['sticker', 3], ['rekap kuis fisio', 0], ['info beasiswa', 1], ['ada tugas apa?', 0], ['sticker', 3], ['foto catatan kemarin', 2], ['oke siap', 1]];
  msgs.forEach(([m, kind], i) => {
    const y = 130 + i * 112 - sc, mine = kind === 1;
    if (y < 80 || y > h) return;
    const bw = kind === 2 ? 330 : kind === 3 ? 110 : Math.min(w - 120, 40 + m.length * 15), x = mine ? w - bw - 24 : 24;
    if (kind === 3) { s += `<g transform="translate(${f1(x)} ${f1(y)})">${R(0, 0, 100, 90, '#F8C038', 28)}${C(34, 36, 7, '#172B38')}${C(66, 36, 7, '#172B38')}${P('M30 56Q50 76 70 56', 'none', 'stroke="#172B38" stroke-width="6" stroke-linecap="round"')}</g>`; return; }
    const pdf = kind === 2 && m.endsWith('.pdf');
    s += `<g transform="translate(${f1(x)} ${f1(y)})">${R(0, 0, bw, 84, mine ? '#DCF8C6' : '#fff', 22)}${pdf ? `${R(14, 14, 56, 56, '#E8665F', 10)}${T(42, 50, 'PDF', '#fff', 20)}${T(86, 40, m.slice(0, 15), '#172B38', 20, '', 'start')}${T(86, 64, '1,2 MB', '#6B7A83', 16, '', 'start')}` : kind === 2 ? `${R(14, 14, bw - 28, 56, '#C9D4D9', 12)}` : T(mine ? bw - 22 : 22, 52, m, '#172B38', 22, '', mine ? 'end' : 'start')}</g>`;
  });
  return s;
}

// ---------------------------------------------------------------- laptop dan bingkai
export const lapLid = (x, y, w = 360, h = 230) => `<g transform="translate(${f1(x)} ${f1(y)})">${R(-w / 2 + 6, 8, w, h, 'rgba(0,0,0,.2)', 18)}${R(-w / 2, 0, w, h, '#C9D4D9', 18)}${R(-w / 2 + 10, 10, w - 20, h - 20, '#B3C0C7', 12)}${C(0, h / 2, 26, '#E8F0F2')}${C(0, h / 2, 14, '#1D7B75')}</g>`;
export const bezelRound = (x, y, w, h, r = 44, th = 16, col = '#1B2430') => `<rect x="${f1(x - th / 2)}" y="${f1(y - th / 2)}" width="${f1(w + th)}" height="${f1(h + th)}" rx="${r + th / 2}" fill="none" stroke="${col}" stroke-width="${th}"/>`;
export const notch = (cx, y) => R(cx - 50, y - 14, 100, 18, '#1B2430', 9);
export const deskTop = (y = 1196) => R(-100, y, 1300, 96, '#C98F5E') + R(-100, y + 94, 1300, 14, '#8A5A34');
export const deskFront = (y = 1196) => R(-100, y + 108, 1300, 420, '#8A5A34') + R(80, y + 140, 340, 190, '#7A4D2C', 12) + R(660, y + 140, 340, 190, '#7A4D2C', 12);

// ---------------------------------------------------------------- latar
export function libraryBg(t) {
  let s = R(-100, -100, 1300, 1300, '#E9DFC9') + R(-100, 1000, 1300, 1000, '#B98F63') + R(-100, 992, 1300, 14, '#8A6A47');
  const book = (x, y, w, h, c) => R(x, y, w, h, c, 3);
  for (let row = 0; row < 3; row++) {
    const y0 = 300 + row * 190; s += R(40, y0 + 150, 1000, 16, '#8A5A34', 6);
    let x = 56; const r = SEED(row + 3); while (x < 1000) { const w = 30 + r() * 26, h = 90 + r() * 56; s += book(x, y0 + 150 - h, w, h, ['#E8665F', '#5BD0E6', '#F8C038', '#9DE0BD', '#8E7CE8', '#3B4A8C'][Math.floor(r() * 6)]); x += w + 4; }
  }
  s += `<g transform="translate(540 160)">${R(-170, -40, 340, 80, '#fff', 14, 'opacity=".5"')}</g>`;
  return s;
}
export function dormBg(t) { return libraryBg(t); }
export const sparkK = (x, y, s = 1, c = '#F8C038', a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${a}">${P('M0 -30Q4 -4 30 0Q4 4 0 30Q-4 4 -30 0Q-4 -4 0 -30Z', c)}</g>`;
export const qm = (x, y, t, s = 1, n = 3, c = '#3B4A8C') => Array.from({ length: n }, (_, i) => { const bob = Math.sin(t * 4 + i * 1.7) * 6; return `<g transform="translate(${f1(x + (i - (n - 1) / 2) * 62 * s)} ${f1(y + bob - (i % 2) * 22 * s)}) rotate(${(-50 + i * 50) / 3}) scale(${s})">${T(0, 0, '?', c, 70, 'stroke="#fff" stroke-width="10" paint-order="stroke"')}</g>`; }).join('');
export const magnifier = (x, y, s = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})">${R(30, 26, 14, 70, '#8A5A34', 7, 'transform="rotate(-45 37 61)"')}${C(0, 0, 44, 'rgba(190,230,245,.55)')}${C(0, 0, 44, 'none', 'stroke="#8A5A34" stroke-width="10"')}${P('M-24 -16Q-14 -30 4 -30', 'none', 'stroke="#fff" stroke-width="6" stroke-linecap="round"')}</g>`;
export const checkK = (x, y, s = 1, c = '#3DB46E') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(0, 0, 26, c)}${P('M-12 0L-3 10L13 -9', 'none', 'stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"')}</g>`;
export const arrowR = (x, y, w = 80, c = '#F8C038') => `<g transform="translate(${f1(x)} ${f1(y)})">${R(0, -8, w - 20, 16, c, 8)}${P(`M${w - 26} -26L${w} 0L${w - 26} 26Z`, c)}</g>`;
export const stepBox = (x, y, w, h, title, sub, o = {}) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${(o.k ?? 1).toFixed(3)})" opacity="${o.a ?? 1}">${R(-w / 2 + 6, -h / 2 + 12, w, h, 'rgba(0,0,0,.25)', 34)}${R(-w / 2, -h / 2, w, h, o.bg ?? '#fff', 34, o.on ? `stroke="#F8C038" stroke-width="8"` : '')}${o.icon ?? ''}${T(0, h / 2 - (sub ? 62 : 38), title, o.fg ?? '#172B38', o.fs ?? 36)}${sub ? T(0, h / 2 - 28, sub, o.sub ?? '#6B7A83', 24) : ''}</g>`;
