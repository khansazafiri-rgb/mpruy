// Dunia luar video "Kerokan bisa menyembuhkan masuk angin?": ruang keluarga rumah Indonesia (malam), sofa, bangku, koin dan minyak kerokan,
// cermin, kaca pembesar, klinik. Semua murni: input -> string SVG (koordinat layar 1080 x 1920).
import { C, clamp, lerp, ease, r1, rnd, g, rect, circ, txt, poly } from './lib.js';
import { rakaSvg } from '../../../brand/characters/raka/raka.js';

export const W = 1080, H = 1920, FLOOR = 1330;
const P = { wall: '#4B3F6B', wain: '#3F355E', floor: '#7A5538', floorD: '#664529', base: '#2E2748', curtain: '#D17A5C', curtainD: '#B8654A', lamp: '#F6C770' };
const batik = (x, y, w, h, c1, c2) => {
  let s = rect(x, y, w, h, c1, 6);
  for (let i = 0; i < Math.floor(w / 46); i++) for (let j = 0; j < Math.floor(h / 46); j++) s += `<path d="M${x + 23 + i * 46} ${y + 6 + j * 46}l14 17l-14 17l-14 -17z" fill="${c2}" opacity="${(i + j) % 2 ? 0.9 : 0.55}"/>`;
  return s;
};

/** Ruang keluarga malam hari: dinding, jendela bergorden, lukisan batik, jam dinding, lampu lantai, lantai kayu, karpet. */
export function ruang(t, { night = 1, glow = 1 } = {}) {
  let s = rect(0, 0, W, FLOOR, P.wall) + rect(0, 860, W, FLOOR - 860, P.wain) + rect(0, 856, W, 8, 'rgba(255,255,255,.07)');
  // jendela + gorden
  s += rect(70, 300, 300, 420, '#2B2548', 28) + rect(90, 320, 260, 380, night ? '#15304A' : '#BFE3F5', 18);
  s += circ(280, 430, 38, '#F4EBD8') + circ(296, 418, 33, '#15304A');
  for (let i = 0; i < 7; i++) s += circ(120 + rnd(i) * 210, 350 + rnd(i + 4) * 260, 2.4 + rnd(i + 2) * 2.6, '#fff', `opacity="${r1(0.35 + 0.4 * Math.sin(t * 2 + i))}"`);
  s += rect(218, 320, 6, 380, '#2B2548') + rect(90, 500, 260, 6, '#2B2548');
  s += `<path d="M40 280H150V740Q100 760 40 740Z" fill="${P.curtain}"/><path d="M300 280H410V740Q360 760 300 740Z" fill="${P.curtain}"/>`;
  [70, 100, 130, 330, 360, 390].forEach((x) => { s += rect(x, 290, 6, 440, P.curtainD, 3, 'opacity=".6"'); });
  // lukisan batik dan jam dinding
  s += rect(690, 290, 290, 250, '#3A2A1E', 14) + batik(706, 306, 258, 218, '#7A3E2B', '#E0A458');
  s += circ(540, 380, 68, '#2B2548') + circ(540, 380, 58, '#F6EFE0');
  for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; s += `<line x1="${r1(540 + Math.sin(an) * 48)}" y1="${r1(380 - Math.cos(an) * 48)}" x2="${r1(540 + Math.sin(an) * 54)}" y2="${r1(380 - Math.cos(an) * 54)}" stroke="#2B2548" stroke-width="4" stroke-linecap="round"/>`; }
  s += `<line x1="540" y1="380" x2="540" y2="338" stroke="#2B2548" stroke-width="6" stroke-linecap="round"/><line x1="540" y1="380" x2="568" y2="392" stroke="#2B2548" stroke-width="6" stroke-linecap="round"/>` + circ(540, 380, 6, '#D9382F');
  // lampu lantai (kanan) dengan cahaya hangat
  if (glow > 0.02) s += `<polygon points="985,640 760,${FLOOR} 1160,${FLOOR}" fill="${P.lamp}" opacity="${r1(0.13 * glow * 100) / 100}"/>`;
  s += rect(978, 700, 14, FLOOR - 700, '#2A2540', 7) + `<path d="M930 700L950 600H1020L1040 700Z" fill="#F4D58E"/>` + rect(950, 700, 70, 10, '#C9A35A', 4);
  // lantai
  s += rect(0, FLOOR, W, H - FLOOR, P.floor) + rect(0, FLOOR - 6, W, 14, P.base);
  for (let i = 0; i < 7; i++) s += rect(0, FLOOR + 40 + i * 78, W, 4, 'rgba(0,0,0,.12)') + rect(((i * 331) % 800), FLOOR + 10 + i * 78, 160 + (i % 3) * 60, 4, 'rgba(255,255,255,.07)', 2);
  s += `<ellipse cx="540" cy="${FLOOR + 190}" rx="480" ry="96" fill="#A5524E"/><ellipse cx="540" cy="${FLOOR + 190}" rx="410" ry="74" fill="none" stroke="#E8B77D" stroke-width="6" stroke-dasharray="26 16"/>`;
  return s;
}

/** Bangku kayu pendek (tampak belakang/depan): permukaan duduk di y = seatY. */
export function bangku(x, seatY, w = 300) {
  const h = FLOOR + 90 - seatY;
  return rect(x - w / 2 + 26, seatY + 18, 20, h - 18, '#5A3B22', 8) + rect(x + w / 2 - 46, seatY + 18, 20, h - 18, '#5A3B22', 8)
    + rect(x - w / 2, seatY, w, 34, '#9A6A3E', 14) + rect(x - w / 2 + 8, seatY, w - 16, 10, 'rgba(255,255,255,.18)', 5);
}
/** Koin kerokan (uang logam perak): lingkaran dengan cincin dalam dan lambang kecil. */
export function koin(x, y, r = 26, rot = 0) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})">${circ(0, 0, r, '#C9CED6')}${circ(0, 0, r * 0.82, 'none', 'stroke="#9AA2AE" stroke-width="3"')}${circ(0, 0, r * 0.44, '#E9ECF0')}<path d="M0 ${-r * 0.3}l${r * 0.1} ${r * 0.22}h${r * 0.2}l${-r * 0.16} ${r * 0.16}l${r * 0.06} ${r * 0.24}l${-r * 0.2} ${-r * 0.14}l${-r * 0.2} ${r * 0.14}l${r * 0.06} ${-r * 0.24}l${-r * 0.16} ${-r * 0.16}h${r * 0.2}z" fill="#9AA2AE" transform="scale(.8)"/></g>`;
}
/** Botol minyak kerokan (hijau, label kuning). */
export function minyak(x, y, s = 1) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${rect(-22, -96, 44, 22, '#F8C038', 6)}${rect(-14, -112, 28, 18, '#E8665F', 6)}${rect(-34, -76, 68, 92, '#2E9C6B', 18)}${rect(-26, -50, 52, 38, '#F4EBD8', 8)}${txt('MINYAK', 0, -26, { size: 11.5, fill: '#2E6B4B', weight: 800 })}${rect(-26, -70, 10, 56, '#fff', 5, 'opacity=".22"')}</g>`;
}
/** Sofa tampak depan: sandaran (di belakang tokoh) dan bagian depan (menutupi pinggang). */
export function sofaBelakang(seatY) {
  return rect(70, seatY - 470, 940, 560, '#A24F55', 70) + rect(110, seatY - 430, 860, 480, '#B25C62', 50) + rect(40, seatY - 250, 120, 420, '#8F434A', 50) + rect(920, seatY - 250, 120, 420, '#8F434A', 50);
}
export function sofaDepan(seatY, t = 0, { blanket = 1 } = {}) {
  let s = rect(40, seatY - 6, 1000, H - seatY + 6, '#8F434A', 40) + rect(150, seatY - 6, 780, 220, '#B25C62', 40);
  if (blanket > 0.02) {
    s += `<path d="M130 ${seatY - 30}C330 ${seatY - 70} 750 ${seatY - 70} 950 ${seatY - 30}L990 ${seatY + 260}L90 ${seatY + 260}Z" fill="#E3A857" opacity="${blanket}"/>`;
    for (let i = 0; i < 6; i++) s += rect(120 + i * 150, seatY - 20, 26, 280, '#C9863A', 8, `opacity="${r1(0.55 * blanket * 100) / 100}"`);
    s += rect(100, seatY + 60, 880, 22, '#C9863A', 8, `opacity="${r1(0.55 * blanket * 100) / 100}"`);
  }
  return s;
}
/** Cangkir teh hangat berkelir (dipasang di tangan tokoh), dengan uap. */
export function cangkir(x, y, t, steam = 1) {
  let st = '';
  for (let i = 0; i < 2; i++) st += `<path d="M${-14 + i * 28} -44q-12 -20 0 -40t0 -40" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="${r1(0.5 * steam * 100) / 100}" transform="translate(0 ${r1(Math.sin(t * 2.2 + i * 2) * 5)})"/>`;
  return `<g transform="translate(${r1(x)} ${r1(y)})">${st}${rect(-38, -40, 76, 70, '#F4EBD8', 14)}<path d="M38 -22q30 0 30 24t-30 24" fill="none" stroke="#F4EBD8" stroke-width="10"/>${rect(-30, -34, 60, 14, '#B5723A', 7)}</g>`;
}
/** Cermin berdiri: bingkai kayu bulat di atas, kaca dengan kilau. Isi (refleksi) disisipkan lewat `inner` di dalam klip kaca. */
export function cermin(x, y, w, h, inner, t = 0, tint = 0.0) {
  const cid = 'cermin-clip';
  let s = rect(x - 26, y - 26, w + 52, h + 52, '#7A4A2A', 70) + rect(x - 14, y - 14, w + 28, h + 28, '#A9703F', 58);
  s += `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="46"/></clipPath><g clip-path="url(#${cid})">` + rect(x, y, w, h, '#D9E8EE') + rect(x, y, w, h, '#7A6BA8', 0, `opacity="${0.25 + tint}"`) + inner;
  const sh = (Math.sin(t * 0.8) * 0.5 + 0.5) * 40;
  s += `<polygon points="${x + 60},${y} ${x + 160},${y} ${x + 60 + sh - 120},${y + h} ${x - 40 + sh - 120},${y + h}" fill="#fff" opacity=".13"/><polygon points="${x + 200},${y} ${x + 230},${y} ${x + 120 + sh - 120},${y + h} ${x + 90 + sh - 120},${y + h}" fill="#fff" opacity=".1"/></g>`;
  return s;
}
/** Kaca pembesar: lensa bundar bening (isi di dalamnya digambar terpisah), gagang ke arah (ang) derajat. */
export function kacaPembesar(x, y, r, ang = 35, lens = '') {
  return `<g transform="translate(${r1(x)} ${r1(y)})"><g transform="rotate(${ang})">${rect(r - 6, -14, 190, 28, '#8A5A33', 14)}${rect(r + 130, -17, 74, 34, '#E8665F', 15)}</g>${circ(0, 0, r + 14, '#F8C038')}${circ(0, 0, r, '#EAF6F9')}${lens}${circ(0, 0, r - 4, 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width="8"')}<path d="M${-r * 0.62} ${-r * 0.2}A${r * 0.66} ${r * 0.66} 0 0 1 ${-r * 0.2} ${-r * 0.62}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".75"/></g>`;
}
/** Klinik: dinding mint, jendela, tanda palang hijau, poster sederhana; meja periksa di depan (digambar terpisah lewat mejaKlinik). */
export function klinik(t) {
  let s = rect(0, 0, W, 1200, '#DDF1EA') + rect(0, 860, W, 340, '#C8E7DE') + rect(0, 856, W, 8, 'rgba(255,255,255,.5)');
  s += rect(70, 300, 300, 400, '#fff', 26) + rect(90, 320, 260, 360, '#BFE3F5', 16) + circ(250, 440, 40, '#FFE08A') + rect(218, 320, 6, 360, '#fff') + rect(90, 500, 260, 6, '#fff');
  s += rect(700, 290, 260, 260, '#fff', 20) + `<path d="M800 340h60v60h60v60h-60v60h-60v-60h-60v-60h60z" fill="#00A383"/>`;
  s += rect(560, 330, 90, 120, '#F4EBD8', 10) + rect(574, 346, 62, 8, '#B9C7C2', 4) + rect(574, 370, 50, 8, '#B9C7C2', 4) + rect(574, 394, 56, 8, '#B9C7C2', 4);
  s += rect(0, 1200, W, H - 1200, '#E6DFC8');
  return s;
}
export function mejaKlinik(y) {
  return rect(0, y, W, 52, '#C9A472') + rect(0, y + 52, W, H - y - 52, '#A98655') + rect(0, y + 40, W, 12, 'rgba(0,0,0,.14)');
}
/** Bubble kata di dekat kepala (ekor ke bawah-kiri/kanan). */
export function bubble(x, y, w, h, label, { size = 40, fill = '#fff', ink = C.ink, tail = 'l', o = 1, s = 1 } = {}) {
  const tx = tail === 'l' ? x + 50 : x + w - 50;
  const body = rect(0, 0, w, h, fill, 34) + `<path d="M${tx - x} ${h - 4}l${tail === 'l' ? -22 : 22} 36l${tail === 'l' ? 52 : -52} -36z" fill="${fill}"/>` + txt(label, w / 2, h / 2 + size * 0.36, { size, fill: ink });
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})" opacity="${r1(o * 100) / 100}">${rect(0, 8, w, h, 'rgba(0,0,0,.15)', 34)}${body}</g>`;
}
