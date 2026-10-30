// Adegan 3 sampai 6: meja perawat (perawat dan anak), kartu penjelasan, ikon syarat, dan kartu penutup.
import { clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, rect, circ, txt, poly, g, place, blinkAt, C } from './lib.js';
import { orang, orangSvg, LOOKS, idleOrang, lerpOrang } from './orang.js';
import { pasien, pasienSvg, idlePasien } from '../../dok-saya-kenapa/stage/pasien.js';
import { consult, ICON } from './world.js';

export const talkMouth = (e, base = 3) => ({ w: 12, up: 3, lo: base + e * 20 });
const mixHex = (a, b, k) => { const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };

// ---------- latar meja perawat (tanpa kamera): dinding dan lantai ----------
export function stationBg(lit = 0) {
  const wall = mixHex('#DCEBE7', '#F3EBD8', lit), wall2 = mixHex('#CDE0DB', '#E8DCC0', lit), floor = mixHex('#BFD0CD', '#D9C9AB', lit);
  let s = rect(-20, -20, 1120, 1960, wall) + rect(-20, 1100, 1120, 100, wall2) + rect(-20, 1196, 1120, 740, floor);
  for (let i = 0; i < 6; i++) s += rect(-20, 1230 + i * 58, 1120, 3, mixHex('#AFC2BF', '#CDBB9B', lit), 0, 'opacity=".7"');
  s += rect(-20, 1190, 1120, 12, mixHex('#B4C8C4', '#D2C09E', lit));
  return s;
}

// jendela kecil ke bilik IGD (bayIn = SVG bilik, digambar kecil dan terpotong)
function windowToBay(x, y, w, h, bayIn, lit) {
  const s = 0.4;
  return rect(x - 14, y - 14, w + 28, h + 28, '#EEF4F4', 22)
    + `<clipPath id="wclip"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></clipPath>`
    + `<g clip-path="url(#wclip)"><g transform="translate(${x - 30 * s} ${y - 590 * s}) scale(${s})">${bayIn}</g></g>`
    + rect(x, y, w, h, 'none', 10, 'stroke="#C9D8DC" stroke-width="4"') + rect(x + w * 0.5 - 4, y, 8, h, '#EEF4F4') + rect(x, y + h * 0.5 - 4, w, 8, '#EEF4F4', 0, 'opacity=".0"');
}

// papan penunjuk IGD
function sign(x, y) {
  return `<path d="M${x - 70} ${y - 140}V${y - 80}M${x + 70} ${y - 140}V${y - 80}" stroke="#9FB2BF" stroke-width="6"/>`
    + rect(x - 150, y - 90, 300, 130, '#FFFFFF', 24, 'stroke="#C9D8DC" stroke-width="5"')
    + `<g transform="translate(${x - 92} ${y - 25})">${rect(-34, -12, 68, 24, '#D9382F', 6)}${rect(-12, -34, 24, 68, '#D9382F', 6)}</g>`
    + txt('IGD', x + 38, y - 4, { size: 74, fill: '#0A3830', ls: 2 });
}

/**
 * Meja perawat: perawat di balik meja, anak di depan meja, jendela ke bilik.
 * o = { t, lit, nurse (state), child (state), bayIn, cam: { k, ax, ay } }
 */
export function stationFg(o) {
  const { t, lit = 0 } = o;
  const body = (look, st, x, y, sc, uid, parts = 'all') => place(orangSvg(st, look, { bare: true, shadow: false, legs: parts !== 'body-nolegs', uid }), x, y, sc);
  let s = '';
  s += sign(300, 520);
  s += windowToBay(580, 330, 440, 380, o.bayIn || '', lit);
  // pot tanaman dan lampu agar tidak kosong
  s += rect(60, 940, 56, 60, '#C98F5B', 8) + `<path d="M88 940C60 890 70 850 82 830C84 870 94 890 100 920C108 880 122 860 140 850C132 900 116 920 88 940Z" fill="#4AA37C"/>`;
  // perawat di balik meja
  s += place(orangSvg(o.nurse, LOOKS.perawat, { bare: true, shadow: false, legs: false, uid: 'ps_n' }), o.nurseX ?? 735, 1215, 0.9);
  // meja resepsionis memanjang
  s += rect(-1400, 1000, 3900, 26, '#F6FAFA') + rect(-1400, 1026, 3900, 14, '#D9E6E8');
  s += rect(-1400, 1040, 3900, 190, mixHex('#6FB5AD', '#8CC1A4', lit)) + rect(-1400, 1040, 3900, 12, mixHex('#5AA29A', '#7DB293', lit));
  for (let x = -1380; x < 2500; x += 240) s += rect(x, 1066, 200, 120, mixHex('#78BDB5', '#95C9AB', lit), 14, 'opacity=".55"');
  // benda di meja: layar, papan catatan, lonceng
  s += rect(860, 904, 150, 100, '#25323C', 10) + rect(868, 912, 134, 78, '#9ED8E6', 6) + rect(924, 1004 - 14, 22, 14, '#25323C') + rect(890, 996, 80, 8, '#25323C', 4);
  s += `<g transform="translate(560 998)">${rect(-50, -16, 100, 16, '#FFFFFF', 5)}${rect(-44, -28, 88, 14, '#F4F8F8', 5)}</g>`;
  // anak di depan meja
  s += place(orangSvg(o.child, LOOKS.anak, { bare: true, shadow: true, uid: 'ps_c' }), o.childX ?? 380, 1292, 1.28);
  return s;
}

// ---------- kartu penjelasan: latar dan subadegan ----------
export const CARD = { x: 60, y: 372, w: 870, h: 486 };
const cardClip = (inner) => `<clipPath id="cardc"><rect x="${CARD.x + 14}" y="${CARD.y + 14}" width="${CARD.w - 28}" height="${CARD.h - 28}" rx="34"/></clipPath><g clip-path="url(#cardc)">${inner}</g>`;
export function cardFrame(k, inner) {
  if (k <= 0.001) return '';
  const cx = CARD.x + CARD.w / 2, cy = CARD.y;
  return `<g transform="translate(${cx} ${cy}) scale(${r1(k * 1000) / 1000}) translate(${-cx} ${-cy})" opacity="${r1(Math.min(1, k * 1.6) * 100) / 100}">`
    + rect(CARD.x, CARD.y + 12, CARD.w, CARD.h, 'rgba(8,16,28,.22)', 48)
    + rect(CARD.x, CARD.y, CARD.w, CARD.h, '#FFFFFF', 48) + cardClip(inner) + '</g>';
}

// subadegan A: ruang konsultasi, dokter menjelaskan ke Bu, lalu menyetujui (formulir tercentang)
export function subConsult(a, t, a0) {
  const k = a - a0;
  const sw = (ph, amp) => Math.sin(t * 2.6 + ph) * amp;
  const talkOn = win(a, a0 + 2.0, a0 + 4.9, 0.2, 0.3);
  const dk = idleOrang(orang('peduli', 'jelaskan', { yaw: 0.35, lean: 1, armR: { wx: 330 + sw(0, 12), wy: 440 + sw(1, 10), ex: 346, ey: 520, finger: 0, front: 1 }, mouth: { w: 12, up: 3, lo: 3 + talkOn * (0.5 + 0.5 * Math.sin(t * 13)) * 16 } }), t, 3);
  const nod = win(a, a0 + 5.0, a0 + 6.6, 0.1, 0.3) * Math.sin((k - 5.0) * 9);
  const bu = idlePasien(pasien(k > 5.0 ? 'sopan' : 'sopan', 'duduk', { yaw: -0.3, tilt: nod * 4, lean: nod * 1.2 }), t, 5);
  const dokter = place(orangSvg(dk, LOOKS.dokterPria, { bare: true, shadow: true, uid: 'cs_d' }), 250, 744, 0.82);
  const pas = place(pasienSvg(bu, { bare: true, uid: 'cs_p' }), 690, 790, 0.8);
  const check = easeOut(seg(a, a0 + 4.9, a0 + 5.5));
  return rect(CARD.x, CARD.y, CARD.w, CARD.h, '#EAF3F1') + `<g transform="translate(${CARD.x + (CARD.w - 960 * 0.906) / 2} ${CARD.y - 112 * 0.906}) scale(0.906)">${consult({ t, dokter, pasienSvg: pas, check })}</g>`;
}

// subadegan B: pasien tidak mampu menyetujui, waktu berjalan (bilik mini + jam pasir + formulir "?")
export function subCase(a, t, a0, bayIn) {
  const pop = (a1) => backOut(seg(a, a1, a1 + 0.4));
  let s = rect(CARD.x, CARD.y, CARD.w, CARD.h, '#EAF1F3');
  s += `<g transform="translate(${CARD.x - 70} ${CARD.y - 650 * 0.8}) scale(0.8)">${bayIn}</g>`;
  s += g(ICON.clipboard(0, 0, 1, 0) + txt('?', 0, 28, { size: 90, fill: '#E8665F' }), { x: CARD.x + 110, y: CARD.y + 110, s: 0.7 * pop(a0 + 0.3) });
  s += g(ICON.hourglass(0, 0, 1, t), { x: CARD.x + CARD.w - 100, y: CARD.y + 110, s: 0.75 * pop(a0 + 3.4) });
  return s;
}

// subadegan C: timbangan "pengecualian"
export function subScale(a, t, a0) {
  const k = backOut(seg(a, a0 + 0.1, a0 + 0.6));
  const tilt = Math.sin((a - a0) * 2.2) * 2.2 * ease(seg(a, a0 + 0.8, a0 + 1.8));
  let s = rect(CARD.x, CARD.y, CARD.w, CARD.h, '#FFF6DC');
  s += `<g transform="translate(${CARD.x + CARD.w / 2} ${CARD.y + 220}) rotate(${r1(tilt)}) scale(${r1(2.2 * k)})">${ICON.scale(0, 0, 1)}</g>`;
  s += txt('PENGECUALIAN', CARD.x + CARD.w / 2, CARD.y + CARD.h - 40, { size: 56, fill: '#0A3830', ls: 3, extra: `opacity="${r1(ease(seg(a, a0 + 1.2, a0 + 1.7)))}"` });
  return s;
}

// subadegan E: persetujuan pasien tetap penting (formulir dan centang besar)
export function subConsent(a, t, a0) {
  const k = backOut(seg(a, a0 + 0.1, a0 + 0.6)), ck = easeOut(seg(a, a0 + 0.7, a0 + 1.2));
  let s = rect(CARD.x, CARD.y, CARD.w, CARD.h, '#E4F4EE');
  s += `<g transform="translate(${CARD.x + CARD.w / 2} ${CARD.y + 215}) scale(${r1(2.2 * k)})">${ICON.clipboard(0, 0, 1, ck)}</g>`;
  s += txt('Persetujuan tetap penting', CARD.x + CARD.w / 2, CARD.y + CARD.h - 40, { size: 52, fill: '#0A3830', extra: `opacity="${r1(ease(seg(a, a0 + 1.0, a0 + 1.5)))}"` });
  return s;
}

// ---------- ikon kecil untuk baris syarat (HTML) ----------
export const COND_ICON = {
  pingsan: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#F3C9A5"/><path d="M20 30q8 8 16 0M44 30q8 8 16 0" fill="none" stroke="#172B38" stroke-width="5" stroke-linecap="round"/><ellipse cx="40" cy="54" rx="9" ry="6" fill="#8B3F37"/><text x="62" y="20" font-family="Plus Jakarta Sans" font-weight="800" font-size="20" fill="#0A3830">z</text><text x="52" y="30" font-family="Plus Jakarta Sans" font-weight="800" font-size="14" fill="#0A3830">z</text></svg>`,
  darurat: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#D9382F"/><path d="M12 42H27L33 28L43 56L50 40H68" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  telepon: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#E8F0F2"/><rect x="28" y="16" width="24" height="42" rx="6" fill="#2B3A44"/><rect x="31" y="21" width="18" height="28" rx="2" fill="#CFE7EF"/><path d="M14 66L66 14" stroke="#E8665F" stroke-width="7" stroke-linecap="round"/></svg>`,
  centang: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#00A383"/><path d="M24 41l11 11 21-24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  perisai: `<svg viewBox="0 0 80 80"><path d="M40 6L68 17V42C68 58 54 70 40 76C26 70 12 58 12 42V17Z" fill="#00A383"/><path d="M26 40l10 10 19-22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  jam: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#F8C038"/><circle cx="40" cy="40" r="26" fill="#fff"/><path d="M40 24V40L52 46" fill="none" stroke="#0A3830" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  buku: `<svg viewBox="0 0 80 80"><path d="M8 18q16-6 32 4v44q-16-10-32-4z" fill="#00A383"/><path d="M72 18q-16-6-32 4v44q16-10 32-4z" fill="#9DE0BD"/></svg>`,
  wakil: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#EBDDF4"/><circle cx="40" cy="30" r="12" fill="#8F6BA8"/><path d="M16 64q4-22 24-22t24 22" fill="#8F6BA8"/></svg>`,
};
