// Kamar belajar Raka (adegan cerita animasi): kalender menuju Senin, notifikasi ujian blok, PPT numpuk, soal belum disentuh, Raka bingung, lalu meraih ponsel.
// Koordinat dunia = koordinat layar 1080 x 1920. Raka memakai rakaSvg() asli (pose duduk) lewat raka.js; semua benda digambar dari kode.
import { f1, clamp, lerp, sm, eo, eio, ei, seg, win, pchip, rnd, MC, FONT } from './core.js';
import { raka, rakaBody, lerpState, rIdle, solveArm, handWorld } from './raka.js';
import * as A from './art.js';

export const DESK_Y = 1290;                      // sisi atas meja
export const PHONE = { cx: 815, base: 1318, w: 190, h: 330 };     // ponsel berdiri di meja; layar = bagian dalam bezel
export const phoneScreen = () => ({ x: PHONE.cx - PHONE.w / 2 + 12, y: PHONE.base - PHONE.h + 16, w: PHONE.w - 24, h: PHONE.h - 44 });
const K = 1.2, RX = 540, RYF = 1521.6;           // skala Raka, pusat x, garis lantai lokal (pinggul belakang meja)
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const C = (x, y, r, f, e = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, e = '', anchor = 'middle', w = 800) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;

// ---- kalender: pita hari bergeser menuju SENIN (kotak merah + "UJIAN BLOK")
const DAYS = ['SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN', 'SEN', 'SEL', 'RAB'];
export function calendar(t) {
  const CW = 150, y0 = 350;
  const off = lerp(2.15, 0, eio(clamp(t / 1.55))) * CW;      // frame pertama: pita sudah bergeser dan terus bergerak menuju SENIN
  const a = 1 - seg(t, 6.0, 6.5);
  let s = `<g opacity="${f1(a)}">${R(80, y0 - 18, 920, 122, 'rgba(2,16,20,.35)', 34, 'transform="translate(6 10)"')}${R(80, y0 - 18, 920, 122, MC.ivory, 34, `stroke="${MC.ink}" stroke-width="3"`)}<clipPath id="clipCal"><rect x="86" y="${y0 - 12}" width="908" height="110" rx="30"/></clipPath><g clip-path="url(#clipCal)">`;
  for (let i = -5; i <= 6; i += 1) {
    const day = DAYS[((i + 6) % 9 + 9) % 9], cxx = 540 + i * CW + off, hi = day === 'SEN' ? seg(t, 1.1, 1.8, eo) : 0;
    s += R(cxx - 66, y0 - 2, 132, 86, hi > 0.01 ? `rgba(232,102,95,${f1(0.18 + 0.1 * hi)})` : 'rgba(23,43,56,.06)', 22);
    s += T(cxx, y0 + 52, day, hi > 0.01 || day === 'MIN' ? '#C0342F' : MC.ink, 40, '', 'middle', 800);
    if (hi > 0.01) s += `<rect x="${f1(cxx - 66)}" y="${y0 - 2}" width="132" height="86" rx="22" fill="none" stroke="#E8433A" stroke-width="${f1(3 + 5 * hi)}"/>`;
  }
  s += '</g>';
  const tg = seg(t, 1.6, 2.0, eo); if (tg > 0.01) s += `<g opacity="${f1(tg)}" transform="translate(540 ${f1(y0 + 126 + (1 - tg) * -10)})"><rect x="-116" y="-22" width="232" height="44" rx="22" fill="#E8433A"/>${T(0, 10, 'UJIAN BLOK', '#fff', 28, '', 'middle', 800)}</g>`;
  return s + '</g>';
}
// ---- notifikasi ujian blok (turun dari atas, bergetar sebentar)
export function notification(t) {
  const a = seg(t, 0.75, 1.2, eo) * (1 - seg(t, 4.8, 5.3)); if (a <= 0.01) return '';
  const y = lerp(-100, 520, eo(clamp((t - 0.75) / 0.55))), sh = Math.sin(t * 60) * 5 * clamp(1 - (t - 1.35) * 3) * (t > 1.3 ? 1 : 0);
  return `<g transform="translate(${f1(540 + sh)} ${f1(y)})" opacity="${f1(a)}">${R(-420, 8, 840, 150, 'rgba(2,16,20,.4)', 38)}${R(-420, 0, 840, 150, MC.ivory, 38, `stroke="${MC.ink}" stroke-width="3"`)}${R(-392, 26, 100, 100, MC.brand, 26)}<path d="M-342 54a24 24 0 0 1 48 0v22l10 14h-68l10 -14z" fill="${MC.gold}"/><circle cx="-318" cy="104" r="9" fill="${MC.gold}"/>${T(-262, 64, 'Pengingat', '#6B7B88', 30, '', 'start', 700)}${T(-262, 112, 'Ujian blok besok', MC.ink, 46, '', 'start', 800)}${C(380, 76, 14, '#E8433A', `opacity="${f1(0.5 + 0.5 * Math.sin(t * 10))}"`)}</g>`;
}
// ---- jendela malam (kiri) + jam dinding (kanan)
function windowAndClock(t) {
  let s = R(70, 560, 290, 360, '#ECE6D8', 20, `stroke="${MC.ink}" stroke-width="4"`) + R(86, 576, 258, 328, 'url(#gNight)', 10);
  s += `<g transform="translate(215 700)"><circle r="46" fill="#F4EBC8"/><circle cx="20" cy="-14" r="40" fill="#1A3668"/></g>`;
  for (let i = 0; i < 9; i += 1) s += C(110 + ((i * 53) % 220), 600 + ((i * 37) % 160), 2.5 + (i % 3), '#FFF3C4', `opacity="${f1(0.5 + 0.4 * Math.sin(t * 2 + i))}"`);
  s += `<path d="M215 576V904M86 740H344" stroke="#ECE6D8" stroke-width="8"/>`;
  const cx = 880, cy = 700, ang = (t < 6.2 ? t * 220 : 6.2 * 220 + (t - 6.2) * 20);
  s += `<g transform="translate(${cx} ${cy})">${C(0, 0, 110, MC.ivory, `stroke="${MC.ink}" stroke-width="6"`)}${Array.from({ length: 12 }, (_, i) => { const an = i * Math.PI / 6; return `<path d="M${f1(Math.sin(an) * 92)} ${f1(-Math.cos(an) * 92)}L${f1(Math.sin(an) * 104)} ${f1(-Math.cos(an) * 104)}" stroke="${MC.ink}" stroke-width="${i % 3 === 0 ? 6 : 3}" stroke-linecap="round"/>`; }).join('')}<path d="M0 0L0 -60" stroke="${MC.ink}" stroke-width="8" stroke-linecap="round" transform="rotate(${f1(ang / 12)})"/><path d="M0 0L0 -86" stroke="#E8433A" stroke-width="5" stroke-linecap="round" transform="rotate(${f1(ang)})"/>${C(0, 0, 8, MC.ink)}</g>`;
  return s;
}
// ---- tumpukan PPT (kartu slide jatuh satu per satu) dan catatan tempel
const SLIDES = [[170, 1196, -5], [240, 1170, 4], [150, 1110, 7], [255, 1078, -7], [182, 1030, 3], [262, 996, -3], [160, 950, 6], [236, 912, -6]];
export function slideCard(x, y, rot, i) {
  const hue = ['#1D7B75', '#4F7FE0', '#8E7CE8', '#E59A3A'][i % 4];
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><rect x="-112" y="-72" width="224" height="144" rx="12" fill="#021014" opacity=".3" transform="translate(5 8)"/><rect x="-112" y="-72" width="224" height="144" rx="12" fill="#FFFFFF" stroke="${MC.ink}" stroke-width="3"/><rect x="-112" y="-72" width="224" height="34" rx="12" fill="${hue}"/><rect x="-112" y="-52" width="224" height="14" fill="${hue}"/><text x="-96" y="-47" font-family="${FONT}" font-weight="800" font-size="22" fill="#fff">PPT</text><rect x="-92" y="-18" width="150" height="10" rx="5" fill="#C9D4D9"/><rect x="-92" y="6" width="120" height="10" rx="5" fill="#C9D4D9"/><rect x="-92" y="30" width="170" height="10" rx="5" fill="#C9D4D9"/><rect x="62" y="-14" width="36" height="36" rx="8" fill="${hue}" opacity=".35"/></g>`;
}
export function pile(t) {
  let s = '';
  SLIDES.forEach(([x, y, rot], i) => {
    const t0 = 1.85 + i * 0.16, u = clamp((t - t0) / 0.45); if (t < t0 - 0.02 && i > 1) return;
    if (i < 2 && t < 1.85) { s += slideCard(x, y, rot, i); return; }                // dua kartu sudah ada di bingkai pertama
    const drop = (1 - ei(u)) * -520 + (u >= 1 ? 0 : 0), bounce = u >= 1 ? -Math.sin(clamp((t - t0 - 0.45) / 0.25) * Math.PI) * 10 * (1 - clamp((t - t0 - 0.45) / 0.25)) : 0;
    s += `<g opacity="${f1(clamp(u * 4))}">${slideCard(x, y + drop + bounce, rot, i)}</g>`;
  });
  return s;
}
export function notes(t) {
  const N = [[420, 1010, '#F8C038', -6], [150, 1008, '#E58FB0', 8], [345, 1245, '#7CCFA6', -10], [72, 1220, '#5BD0E6', 5], [330, 905, '#F2A07B', 9]];
  return N.map(([x, y, c, r], i) => { const u = seg(t, 2.35 + i * 0.18, 2.75 + i * 0.18, eo); if (u <= 0) return ''; return `<g transform="translate(${x} ${f1(y - (1 - u) * 60)}) rotate(${r}) scale(${f1(u * 1000) / 1000})" opacity="${f1(u)}"><rect x="-44" y="-44" width="88" height="88" rx="6" fill="${c}"/><path d="M-30 -14H26M-30 4H18M-30 22H8" stroke="${MC.ink}" stroke-width="4" opacity=".4" stroke-linecap="round"/></g>`; }).join('');
}
// ---- buku "SOAL" yang belum disentuh (terbungkus plastik, sarang laba-laba di sudut)
export function soalBook(t) {
  const x = 975, y = 1215, wob = t > 3.1 && t < 4.5 ? Math.sin(t * 9) * 2 : 0;
  const glow = win(t, 3.1, 4.6, 0.3);
  return `<g transform="translate(${x} ${y}) rotate(${f1(wob + 2)})">${glow > 0.01 ? `<ellipse cx="0" cy="0" rx="190" ry="120" fill="url(#gLamp)" opacity="${f1(glow)}"/>` : ''}<rect x="-100" y="-76" width="200" height="152" rx="12" fill="#021014" opacity=".3" transform="translate(6 9)"/><rect x="-100" y="-76" width="200" height="152" rx="12" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/><rect x="-100" y="-76" width="200" height="40" rx="12" fill="${MC.brand}"/><rect x="-100" y="-56" width="200" height="20" fill="${MC.brand}"/>${T(0, -45, 'SOAL', '#fff', 30, '', 'middle', 800)}<rect x="-74" y="-10" width="120" height="10" rx="5" fill="#C9D4D9"/><rect x="-74" y="14" width="150" height="10" rx="5" fill="#C9D4D9"/><rect x="-74" y="38" width="90" height="10" rx="5" fill="#C9D4D9"/><path d="M-100 -76C-60 -40 -40 -20 -100 20" fill="none" stroke="#fff" stroke-width="5" opacity=".5"/><path d="M-96 -72L-52 -68M-96 -72L-70 -34M-96 -72L-96 -26M-96 -72L-84 -50" stroke="#9AA6AD" stroke-width="3" fill="none" opacity=".85"/><rect x="-100" y="-76" width="200" height="152" rx="12" fill="#fff" opacity=".12"/></g>`;
}
// ---- ponsel di meja: layar menyala (logo MEDCOEL) mulai 5,9 dtk
export function phone(t, glowT = 5.9) {
  const g = seg(t, glowT, glowT + 0.5), P = PHONE, x = P.cx - P.w / 2, y = P.base - P.h, sc = phoneScreen();
  return `<g filter="url(#fShS)"><rect x="${x}" y="${y}" width="${P.w}" height="${P.h}" rx="34" fill="url(#gPhone)" stroke="#3B4D5B" stroke-width="3"/></g><rect x="${sc.x}" y="${sc.y}" width="${sc.w}" height="${sc.h}" rx="22" fill="${g > 0.01 ? MC.ivory : '#0B1218'}"/>${g > 0.01 ? `<image href="logo-full.webp" x="${sc.x + 12}" y="${sc.y + sc.h / 2 - 20}" width="${sc.w - 24}" height="${f1((sc.w - 24) * 160 / 794)}" preserveAspectRatio="xMidYMid meet" opacity="${f1(g)}"/><circle cx="${P.cx}" cy="${y - 14}" r="${f1(30 * g)}" fill="url(#gLamp)" opacity="${f1(0.9 * g * (0.6 + 0.4 * Math.sin(t * 8)))}"/>` : ''}`;
}
export const desk = () => `<rect x="-20" y="${DESK_Y}" width="1120" height="46" fill="url(#gDesk)"/><rect x="-20" y="${DESK_Y + 40}" width="1120" height="640" fill="url(#gDeskF)"/><path d="M-20 ${DESK_Y + 2}H1100" stroke="#F0C79B" stroke-width="5" opacity=".7"/><rect x="60" y="${DESK_Y + 120}" width="360" height="260" rx="14" fill="#5E3820" opacity=".7"/><rect x="660" y="${DESK_Y + 120}" width="360" height="260" rx="14" fill="#5E3820" opacity=".7"/>`;
// lampu meja (kiri) memberi cahaya hangat
const lamp = () => `<ellipse cx="300" cy="1180" rx="320" ry="250" fill="url(#gLamp)"/>`;

// ---- Raka: keadaan sesuai narasi (0 - 7,2 dtk). yaitu menoleh ke kalender, kaget (notifikasi), melihat tumpukan, soal, bingung, lalu meraih ponsel.
export function rakaState(t) {
  const base = raka('netral', 'duduk', {});
  const e = (name, ov = {}) => raka(name, 'duduk', ov);
  let st;
  if (t < 0.9) st = e('melongo', { yaw: 0.3, gazeX: 0.5, gazeY: -0.7, tilt: 3 });
  else if (t < 1.8) st = lerpState(e('melongo', { yaw: 0.3, gazeX: 0.5, gazeY: -0.7 }), e('kaget', { yaw: 0.2, gazeX: 0.2, gazeY: -0.6, tilt: -2, fxBurst: 1 }), seg(t, 0.85, 1.15));
  else if (t < 3.08) st = lerpState(e('kaget', { yaw: 0.2, gazeY: -0.6 }), e('khawatir', { yaw: -0.4, gazeX: -0.8, gazeY: 0.4, tilt: -4 }), seg(t, 1.8, 2.2));
  else if (t < 4.46) st = lerpState(e('khawatir', { yaw: -0.4, gazeX: -0.8, gazeY: 0.4 }), e('khawatir', { yaw: 0.45, gazeX: 0.9, gazeY: 0.4, tilt: 4 }), seg(t, 3.1, 3.6));
  else if (t < 6.2) { const sw = Math.sin(t * 3.4); st = e('bingung', { yaw: 0.5 * sw, gazeX: 0.9 * sw, gazeY: 0.2, tilt: 6 * sw }); st.sweat = 0.7; }
  else st = lerpState(e('bingung', { gazeX: 0.2 }), e('penasaran', { yaw: 0.35, gazeX: 0.9, gazeY: 0.3, tilt: -3 }), seg(t, 6.2, 6.7));
  // lengan: bertumpu di meja; meraih tumpukan (1,8 - 3,0), berpikir (4,5 - 6,2: tangan di pipi), meraih ponsel (6,2 - 7,0)
  const rest = { L: [150, 556], R: [250, 556] };
  const lerpArm = (a, b, k) => { const o = {}; for (const key of Object.keys(a)) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : a[key]; return o; };
  const toPile = seg(t, 1.8, 2.3, eo) * (1 - seg(t, 2.9, 3.3));
  const armL0 = solveArm(st, 'L', rest.L, { finger: 0, front: 1, len: 170 }), armL1 = solveArm(st, 'L', [-10 + Math.sin(t * 8) * 8, 520], { finger: 0, front: 1, len: 230 });
  st.armL = lerpArm(armL0, armL1, toPile);
  const think = seg(t, 4.5, 4.9, eo) * (1 - seg(t, 6.0, 6.3));
  const armR0 = solveArm(st, 'R', rest.R, { finger: 0, front: 1, len: 170 }), armR1 = solveArm(st, 'R', [236, 320 + Math.sin(t * 6) * 4], { finger: 0.6, fa: -60, front: 1, len: 170 });
  const ph = seg(t, 6.25, 6.8, eio);
  const pw = [(PHONE.cx - RX) / K + 200 - 6, (PHONE.base - 120 - RYF) / K + 778 - 70 + 0];
  const armR2 = solveArm(st, 'R', [pw[0], 590], { finger: 0, front: 1, len: 230 });
  st.armR = lerpArm(lerpArm(armR0, armR1, think), armR2, ph);
  st.bob += 0; st.breath = 0.5 + 0.5 * Math.sin(t * 2.2);
  return rIdle(st, t);
}
export function rakaDesk(t, st, o = {}) {
  const dark = true, s = o.k ?? K;
  const chair = `<g transform="translate(${f1(RX - 150 * s)} ${f1(RYF - 778 * s + 330 * s)}) scale(${s})">${R(0, 0, 300, 330, 'url(#gChair)', 40)}</g>`;
  return chair + `<g transform="translate(${f1(RX - 200 * s)} ${f1(RYF - 778 * s)}) scale(${s})">${rakaBody(st, 'rkR', { dark })}</g>`;
}
// ---- gelembung pikiran "mulai dari mana?" (4,5 - 6,3)
export function thought(t) {
  const a = seg(t, 4.55, 4.95, eo) * (1 - seg(t, 6.0, 6.4)); if (a <= 0.01) return '';
  const bob = Math.sin(t * 3) * 6;
  const q = (x, y, sz, r) => T(x, y, '?', MC.ink, sz, `transform="rotate(${r} ${x} ${y})"`, 'middle', 800);
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1(bob)})">${C(470, 700, 14, MC.ivory, `stroke="${MC.ink}" stroke-width="3"`)}${C(430, 650, 22, MC.ivory, `stroke="${MC.ink}" stroke-width="3"`)}<g transform="translate(540 540)"><ellipse rx="300" ry="130" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="4"/>${q(-170, 40, 120, -8)}${q(0, 52, 150, 4)}${q(170, 40, 120, 9)}</g><path d="M300 540L190 940M780 540L215 1020M540 660L360 880" stroke="#E8665F" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round" opacity=".0"/></g>`;
}
/** latar kamar tanpa kalender/notifikasi/pikiran: dipakai adegan "satu langkah" (PPT sudah menumpuk, soal masih utuh) */
export const roomBackdrop = (t) => windowAndClock(t) + lamp() + notes(99) + pile(99) + soalBook(99);
/** seluruh kamar (tanpa web). t = detik video. */
export function roomScene(t, o = {}) {
  const st = rakaState(t);
  return windowAndClock(t) + lamp() + calendar(t) + notes(t) + pile(t) + soalBook(t) + rakaDesk(t, st) + desk() + phone(t) + notification(t) + thought(t);
}
