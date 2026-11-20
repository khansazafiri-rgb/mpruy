// Objek flat vector MEDCOEL untuk video "Jamu bekerja bagaimana, dan apakah alami berarti aman?". Semua dari kode (SVG). Tanpa merek atau kemasan produk nyata.
// Bahasa visual: teal / navy / krem + aksen emas dan koral. Partikel senyawa KONSISTEN di seluruh video: A = lingkaran teal, B = segi enam emas, C = segitiga koral, D = belah ketupat ungu.
import { C as BC, r1, g, rect, circ, txt, lerp } from './core.js';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const P = { navy: '#0B2A3A', navy2: '#0F4C5C', teal: '#1D7B75', mint: '#9DE0BD', cream: '#F7F2E4', cream2: '#EADFC4', gold: '#F8C038', coral: '#F2735E', red: '#D9382F', ink: '#172B38', violet: '#8F7BE0', green: '#2BA676', pillGrey: '#C9D3DB', wood: '#8A6240' };
export const SHAPE_COL = { A: '#2BB3A0', B: '#F8C038', C: '#F2735E', D: '#8F7BE0' };
/** satu partikel senyawa; kind A-D, pusat (x,y), jari-jari r, rotasi derajat */
export function part(kind, x, y, r = 16, rot = 0, o = 1) {
  const c = SHAPE_COL[kind], tr = `transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})" opacity="${r1(o * 100) / 100}"`;
  if (kind === 'A') return `<g ${tr}><circle r="${r}" fill="${c}"/><circle cx="${-r * 0.3}" cy="${-r * 0.3}" r="${r * 0.3}" fill="#fff" opacity=".45"/></g>`;
  if (kind === 'B') { const p = Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * r * 1.05, Math.sin(i * Math.PI / 3) * r * 1.05].map(r1).join(',')).join(' '); return `<g ${tr}><polygon points="${p}" fill="${c}"/><polygon points="${p}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2.5"/></g>`; }
  if (kind === 'C') return `<g ${tr}><polygon points="0,${-r * 1.15} ${r * 1.05},${r * 0.8} ${-r * 1.05},${r * 0.8}" fill="${c}"/></g>`;
  return `<g ${tr}><polygon points="0,${-r * 1.25} ${r * 0.95},0 0,${r * 1.25} ${-r * 0.95},0" fill="${c}"/></g>`;
}
/** tablet obat (kapsul abu-putih dengan garis tengah), berbeda jelas dari senyawa herbal */
export function pill(x, y, s = 1, rot = 0, o = 1, tint = '#F4F7FA') {
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${s})" opacity="${r1(o * 100) / 100}"><rect x="-34" y="-15" width="68" height="30" rx="15" fill="${tint}" stroke="#7E8FA0" stroke-width="3"/><path d="M0 -15V15" stroke="#7E8FA0" stroke-width="3"/><rect x="-30" y="-9" width="26" height="6" rx="3" fill="#fff" opacity=".7"/></g>`;
}
/** tanaman: 'jahe' | 'kunyit' | 'daun' */
export function plant(kind, x, y, s = 1, rot = 0, o = 1) {
  const tr = `transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${s})" opacity="${r1(o * 100) / 100}"`;
  if (kind === 'daun') return `<g ${tr}><path d="M0 40C-60 10 -50 -60 0 -80C50 -60 60 10 0 40Z" fill="#2BA676"/><path d="M0 40V-70M0 -10L-24 -34M0 10L24 -14M0 -28L22 -50" stroke="#1B7F58" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  const col = kind === 'jahe' ? ['#E3C58E', '#C9A25F', '#6AAE4A'] : ['#F29A2E', '#D67C14', '#6AAE4A'];
  return `<g ${tr}><path d="M-70 10C-80 -20 -40 -34 -20 -22C-10 -48 30 -46 36 -20C70 -30 90 0 74 20C80 40 40 50 20 40C0 54 -40 52 -50 36C-66 40 -78 28 -70 10Z" fill="${col[0]}"/><path d="M-50 12C-30 4 -20 14 0 6M20 22C40 14 50 22 62 12" stroke="${col[1]}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="-52" cy="-6" r="7" fill="${col[1]}"/><path d="M34 -22C40 -52 56 -62 70 -58" stroke="${col[2]}" stroke-width="7" fill="none" stroke-linecap="round"/></g>`;
}
/** mortir (wadah) + alu; pestleDy menggerakkan alu naik-turun */
export function bowl(x, y, s = 1, pestleDy = 0, pestleRot = 0, fillColor = null) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">`
    + `<ellipse cx="0" cy="118" rx="150" ry="16" fill="#000" opacity=".16"/>`
    + `<path d="M-170 -30H170C170 70 110 120 0 120C-110 120 -170 70 -170 -30Z" fill="#F2E6CC"/><path d="M-170 -30H170" stroke="#D7C7A0" stroke-width="10" stroke-linecap="round"/>`
    + (fillColor ? `<path d="M-150 -10H150C146 62 100 100 0 100C-100 100 -146 62 -150 -10Z" fill="${fillColor}" opacity=".9"/>` : '')
    + `<path d="M-120 20Q-90 90 0 106" stroke="#fff" stroke-opacity=".4" stroke-width="8" fill="none" stroke-linecap="round"/>`
    + `<g transform="translate(60 ${-120 + pestleDy}) rotate(${pestleRot} 0 140)"><rect x="-22" y="-60" width="44" height="220" rx="22" fill="${P.wood}"/><rect x="-22" y="120" width="44" height="40" rx="20" fill="#A67C52"/></g></g>`;
}
/** kemasan jamu generik (sachet krem + pita "ALAMI" + ikon daun); tanpa merek */
export function jamuPack(x, y, s = 1, rot = 0, o = 1, label = 'ALAMI', open = 0) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${s})" opacity="${r1(o * 100) / 100}">`
    + `<rect x="-100" y="-140" width="200" height="280" rx="22" fill="#F7EBC8" stroke="#D2BC83" stroke-width="5"/>`
    + `<path d="M-100 -140h200v58h-200z" fill="#2BA676"/><path d="M-70 -108l16 -14l16 14l16 -14l16 14l16 -14l16 14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-opacity=".5"/>`
    + `<g transform="translate(0 -4) scale(.9)">${plant('daun', 0, 10, 0.9)}</g>`
    + `<rect x="-86" y="76" width="172" height="44" rx="22" fill="${P.gold}"/>` + txt(label, 0, 108, { size: 28, fill: P.ink, weight: 800, ls: 2 })
    + (open ? `<path d="M-100 -140l${100 * open} ${-30 * open}l${100 * open} ${30 * open}" fill="#EDD9A0"/>` : '') + `</g>`;
}
/** botol ramuan generik (tutup + label kosong dengan ikon) */
export function jamuBottle(x, y, s = 1, rot = 0, o = 1, tint = '#C98A3C', icon = 'jahe') {
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${s})" opacity="${r1(o * 100) / 100}"><rect x="-46" y="-150" width="92" height="40" rx="10" fill="${P.wood}"/><rect x="-34" y="-112" width="68" height="30" fill="${tint}" opacity=".8"/><rect x="-74" y="-90" width="148" height="230" rx="34" fill="${tint}"/><rect x="-74" y="-90" width="40" height="230" rx="20" fill="#fff" opacity=".18"/><rect x="-60" y="-30" width="120" height="100" rx="14" fill="#FFF8E6"/><g transform="translate(0 20) scale(.45)">${plant(icon, 0, 0, 1)}</g></g>`;
}
/** strip tablet ("obat rutin"): foil perak dengan tablet putih */
export function pillStrip(x, y, s = 1, rot = 0, o = 1) {
  let d = ''; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) d += `<ellipse cx="${-62 + i * 62}" cy="${-26 + j * 52}" rx="22" ry="20" fill="#F4F7FA" stroke="#7E8FA0" stroke-width="3"/>`;
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${s})" opacity="${r1(o * 100) / 100}"><rect x="-110" y="-70" width="220" height="140" rx="18" fill="#C9D3DB" stroke="#8798A8" stroke-width="5"/>${d}<rect x="76" y="-60" width="26" height="120" rx="8" fill="#5C7790" opacity=".55"/></g>`;
}
/** tanda cek / silang / peringatan / tanda tanya */
export const tick = (x, y, s = 1, col = P.green) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><circle r="26" fill="${col}"/><path d="M-11 0l8 9l15 -19" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
export const cross = (x, y, s = 1, col = P.coral) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})"><circle r="26" fill="${col}"/><path d="M-10 -10l20 20M10 -10l-20 20" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>`;
export const warnTri = (x, y, s = 1, o = 1) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})" opacity="${r1(o * 100) / 100}"><path d="M0 -58L56 40H-56Z" fill="${P.gold}" stroke="${P.ink}" stroke-width="6" stroke-linejoin="round"/>${txt('!', 0, 26, { size: 64, fill: P.ink, weight: 800 })}</g>`;
/** kartu/label bergaya MEDCOEL (bidang putih bundar, bayangan tipis) dengan teks satu-dua baris */
export function card(x, y, w, h, lines, { fill = '#fff', ink = P.ink, size = 34, rx = 28, stroke = null, sub = null, subInk = '#4d6b66' } = {}) {
  const n = lines.length, ty0 = y + (sub ? h * 0.42 : h / 2) - ((n - 1) * size * 0.62) + size * 0.34;
  return `<g><rect x="${r1(x + 5)}" y="${r1(y + 9)}" width="${w}" height="${h}" rx="${rx}" fill="#000" opacity=".16"/><rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="5"` : ''}/>`
    + lines.map((l, i) => txt(l, x + w / 2, ty0 + i * size * 1.24, { size, fill: ink, weight: 800 })).join('') + (sub ? txt(sub, x + w / 2, y + h - 30, { size: Math.round(size * 0.62), fill: subInk, weight: 700 }) : '') + `</g>`;
}
/** lingkaran sel generik (garis putus-putus) untuk "proses biologis tertentu"; bukan reseptor spesifik */
export function cell(x, y, r, o = 1, glow = 0) {
  return `<g opacity="${r1(o * 100) / 100}">${glow > 0 ? `<circle cx="${x}" cy="${y}" r="${r + 26}" fill="${P.gold}" opacity="${r1(0.2 * glow * 100) / 100}"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="#1B6F7E" stroke="#9DE0BD" stroke-width="6" stroke-dasharray="18 12"/><circle cx="${x + r * 0.2}" cy="${y - r * 0.1}" r="${r * 0.34}" fill="#14566A"/></g>`;
}
/** hati generik (bentuk sederhana) tanpa detail anatomi */
export function liver(x, y, s = 1, o = 1) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})" opacity="${r1(o * 100) / 100}"><path d="M-130 -20C-120 -80 40 -100 120 -50C150 -30 130 30 80 50C20 70 -80 70 -120 30C-136 14 -134 -4 -130 -20Z" fill="#B5603E"/><path d="M-100 -10C-60 -40 20 -50 90 -26" stroke="#D68863" stroke-width="8" fill="none" stroke-linecap="round" opacity=".7"/></g>`;
}
/** roda gigi kecil (penanda "diproses") */
export function gear(x, y, r = 22, rot = 0, col = P.gold) {
  let d = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; d += `<rect x="${-r * 0.2}" y="${-r * 1.35}" width="${r * 0.4}" height="${r * 0.5}" fill="${col}" transform="rotate(${a * 180 / Math.PI})"/>`; }
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})">${d}<circle r="${r}" fill="${col}"/><circle r="${r * 0.42}" fill="${P.navy}"/></g>`;
}
/** latar dalam tubuh: gradien navy-teal + gelembung samar */
export function bioBg(t, h = 1920) {
  let s = `<defs><linearGradient id="bioG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.navy}"/><stop offset="1" stop-color="${P.navy2}"/></linearGradient></defs><rect width="1080" height="${h}" fill="url(#bioG)"/>`;
  for (let i = 0; i < 9; i++) s += circ(((i * 337 + 90) % 1080), ((i * 531 + 200 + Math.sin(t * 0.3 + i) * 14) % h), 70 + (i % 4) * 34, '#fff', 'opacity=".035"');
  return s;
}
/** latar ruangan (krem) + meja navy; tableY = tinggi permukaan meja */
export function room(tableY = 1130) {
  return rect(0, 0, 1080, 1920, '#F4ECDA') + circ(130, 420, 190, '#EADFC4') + circ(960, 1020, 230, '#EADFC4', 'opacity=".7"')
    + rect(0, tableY - 8, 1080, 16, P.gold) + rect(0, tableY, 1080, 1920 - tableY, '#1B3A4B') + rect(0, tableY + 10, 1080, 80, 'rgba(0,0,0,.14)');
}
export const kindAt = (i) => 'ABCD'[i % 4];
