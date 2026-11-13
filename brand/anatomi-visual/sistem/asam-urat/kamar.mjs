// Adegan kamar: Raka duduk TEGAK di tempat tidur (tampak depan, rig Raka apa adanya; tidak memakai varian berbaring), selimut, dan kaki kanan yang keluar dari selimut
// dilihat dari ujung tempat tidur (tampak atas punggung kaki, jari menghadap penonton). Sendi pangkal ibu jari (MTP pertama) memerah dan bengkak.
import { FONT, MEREK } from '../tokens.mjs';
import { raka, rakaSvg, idle, lerpState } from '../../../characters/raka/raka.js';
import { f1, clamp, lerp, seg, ease, mix, gelap, terang, mulus } from '../tensi/util.mjs';
import { C, GADING, EMAS, TINTA, rnd } from './bentuk.mjs';

export const RK = { k: 1.15, x: 540, y0: 232 };            // skala dan posisi Raka (kanvas 400 x 800 -> layar)
export const KAKI = { x: 420, y: 1170, s: 1.3 };            // pergelangan kaki kanan (layar kiri) tepat di bawah ujung selimut
export const MTP = { x: KAKI.x + 46 * KAKI.s, y: KAKI.y + 282 * KAKI.s };   // pangkal ibu jari (sendi MTP pertama) di layar

const KULIT = '#F2BF99', KULIT_G = '#E3A47C', KULIT_T = '#FFD9BB';
/** Kaki kanan, tampak atas dari ujung tempat tidur (jari menghadap penonton, sisi medial/ibu jari di kanan layar). Panjang pergelangan-ujung ibu jari 380 px, lebar bola kaki sekitar 150 px.
 *  infl 0..1: merah, bengkak, hangat di pangkal ibu jari (sendi MTP pertama). (x,y) = pergelangan, s = skala. */
export function kaki(x, y, s = 1, infl = 0, T = 0, opt = {}) {
  const merah = mix(KULIT, '#E2493F', clamp(infl)), merahJ = mix(KULIT, '#E8715F', clamp(infl * 0.75)), merahG = mix(KULIT_G, '#B8262B', clamp(infl)), sw = 1 + 0.22 * infl;
  const bx = 46, by = 282;                                                 // pusat sendi MTP pertama
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">`;
  // bayangan lembut di selimut
  g += `<ellipse cx="0" cy="250" rx="120" ry="140" fill="#000" opacity=".08"/>`;
  // punggung kaki: pergelangan (lebar sekitar 104) melebar ke kepala metatarsal (bola kaki), tepi medial membentuk benjolan sendi MTP pertama
  g += `<path d="M-52 0C-60 70 -66 150 -74 226C-80 250 -84 262 -70 274C-40 292 20 300 84 298C${f1(98 + 18 * infl)} 284 ${f1(100 + 20 * infl)} 252 ${f1(90 + 14 * infl)} 214C78 150 68 70 52 0C30 -14 -30 -14 -52 0Z" fill="${KULIT}"/>`;
  g += `<path d="M-52 0C-60 70 -66 150 -74 226C-80 262 -84 280 -78 292L-50 292C-56 250 -52 220 -48 160C-44 90 -40 30 -34 -6Z" fill="${KULIT_G}" opacity=".5"/>`;
  g += `<path d="M20 4C44 10 62 50 70 110" fill="none" stroke="${KULIT_T}" stroke-width="12" stroke-linecap="round" opacity=".35"/>`;
  // jari-jari: ibu jari besar dan menonjol; jari kedua sampai kelima mengecil ke sisi lateral. [x, y pusat, lebar, panjang]
  const J = [[46 + 4 * infl, 344, 60, 112], [-6, 342, 42, 100], [-42, 328, 38, 88], [-70, 312, 35, 76], [-93, 292, 32, 66]];
  J.forEach(([jx, jy, w, h], i) => { const big = i === 0; g += `<rect x="${f1(jx - w / 2 * (big ? sw * 0.9 + 0.1 : 1))}" y="${f1(jy - h / 2)}" width="${f1(w * (big ? sw * 0.9 + 0.1 : 1))}" height="${h}" rx="${f1(w / 2)}" fill="${big ? merahJ : KULIT}"/>`; });
  J.forEach(([jx, jy, w, h], i) => { const nw = w * (i === 0 ? 0.62 : 0.56), ny = jy + h / 2 - 36 * (i === 0 ? 1 : 0.7); g += `<rect x="${f1(jx - nw / 2)}" y="${f1(ny)}" width="${f1(nw)}" height="${f1(28 * (i === 0 ? 1 : 0.7))}" rx="${f1(nw / 3)}" fill="#F8E7DA" opacity=".9"/>`; });
  // garis antarjari
  g += `<path d="M-26 296L-24 350M16 296L14 356M-58 290L-58 340M-82 282L-80 326" fill="none" stroke="${KULIT_G}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
  // sendi MTP pertama yang meradang: benjolan memerah di tepi medial pangkal ibu jari (kulit meregang, tepi memudar ke kulit sekitar)
  if (infl > 0.02) {
    const rx = 52 * sw, ry = 44 * (1 + 0.16 * infl), id = 'mtpg' + Math.round(infl * 100);
    g += `<defs><radialGradient id="${id}" cx=".45" cy=".42" r=".6"><stop offset="0" stop-color="#E23B35" stop-opacity="${f1(0.95 * infl)}"/><stop offset=".55" stop-color="#E8574C" stop-opacity="${f1(0.8 * infl)}"/><stop offset="1" stop-color="#EE7E6E" stop-opacity="0"/></radialGradient></defs>`;
    g += `<ellipse cx="${bx + 6}" cy="${by}" rx="${f1(rx * 1.9)}" ry="${f1(ry * 1.8)}" fill="${C.koral}" opacity="${f1(0.18 * infl)}"/>`;
    g += `<ellipse cx="${bx + 6}" cy="${by}" rx="${f1(rx * 1.22)}" ry="${f1(ry * 1.22)}" fill="url(#${id})"/>`;
    g += `<ellipse cx="${f1(bx - 8)}" cy="${f1(by - 12)}" rx="${f1(rx * 0.46)}" ry="${f1(ry * 0.3)}" fill="#FFB3A8" opacity="${f1(0.55 * infl)}"/>`;
    g += `<path d="M${f1(bx - rx * 0.7)} ${f1(by + ry * 0.55)}Q${bx} ${f1(by + ry * 1.05)} ${f1(bx + rx * 0.8)} ${f1(by + ry * 0.4)}" fill="none" stroke="${merahG}" stroke-width="3.2" opacity="${f1(0.45 * infl)}" stroke-linecap="round"/>`;
  }
  // tendon dan urat halus di punggung kaki
  g += `<path d="M-24 8C-22 80 -18 160 -10 250M4 8C6 80 12 170 14 262M30 8C34 70 44 150 48 232" fill="none" stroke="${KULIT_G}" stroke-width="3.6" stroke-linecap="round" opacity=".42"/><path d="M-6 30C-10 90 -4 150 -12 210" fill="none" stroke="#8EA6C8" stroke-width="5" stroke-linecap="round" opacity=".28"/>`;
  // gelombang panas di atas sendi
  if (infl > 0.3) for (let i = 0; i < 3; i++) { const u = ((T * 0.55 + i / 3) % 1), yy = by - 50 - u * 80, o = Math.min(1, u * 5, (1 - u) * 2.4) * infl; g += `<path d="M${bx - 34 + i * 34} ${f1(yy)}q-9 -16 0 -32t0 -32" fill="none" stroke="${C.hangat}" stroke-width="6" stroke-linecap="round" opacity="${f1(0.8 * o)}"/>`; }
  return g + `</g>`;
}

function tempatTidur(T, pagi) {
  const L = pagi ? ['#2E6F6B', '#1D4F4C'] : ['#1F4B52', '#143940'];
  let s = '';
  // dinding + jendela
  s += `<rect x="-20" y="-20" width="1120" height="1960" fill="${pagi ? '#2B4A4A' : '#15262E'}" opacity="0"/>`;
  const jx = 760, jy = 300, jw = 250, jh = 330;
  s += `<rect x="${jx - 14}" y="${jy - 14}" width="${jw + 28}" height="${jh + 28}" rx="28" fill="#0B171D" opacity=".6"/><rect x="${jx}" y="${jy}" width="${jw}" height="${jh}" rx="20" fill="${pagi ? '#F2D79A' : '#0F2036'}"/>`;
  if (pagi) { s += `<circle cx="${jx + 80}" cy="${jy + 90}" r="46" fill="#FFF1C2"/><circle cx="${jx + 80}" cy="${jy + 90}" r="74" fill="#FFE49A" opacity=".35"/>`; }
  else { s += `<circle cx="${jx + 170}" cy="${jy + 90}" r="40" fill="#F4F1DC"/><circle cx="${jx + 156}" cy="${jy + 80}" r="36" fill="#0F2036"/>`; for (let i = 0; i < 7; i++) s += `<circle cx="${f1(jx + 24 + rnd(i) * (jw - 48))}" cy="${f1(jy + 30 + rnd(i, 1) * (jh - 80))}" r="${f1(1.6 + rnd(i, 2) * 2)}" fill="#F8F1C8" opacity="${f1(0.5 + 0.4 * Math.sin(T * 2 + i))}"/>`; }
  s += `<path d="M${jx + jw / 2} ${jy}V${jy + jh}M${jx} ${jy + jh * 0.55}H${jx + jw}" stroke="#0B171D" stroke-width="10" opacity=".55"/>`;
  // kepala tempat tidur + bantal
  s += `<rect x="150" y="380" width="780" height="900" rx="70" fill="${L[1]}"/><rect x="170" y="400" width="740" height="870" rx="60" fill="${L[0]}"/>`;
  s += `<rect x="250" y="560" width="580" height="150" rx="70" fill="#E8EEF0" opacity=".92"/><rect x="250" y="560" width="580" height="60" rx="30" fill="#fff" opacity=".4"/>`;
  return s;
}
/** Selimut: menutupi badan bawah dan kedua kaki; ujungnya menutupi pergelangan kaki kanan (layar kiri), kaki kiri tertutup penuh (gundukan). */
function selimut(pagi) {
  const c1 = pagi ? '#F2B66B' : '#D99A56', c2 = pagi ? '#D9983F' : '#B97A3E';
  let s = `<path d="M110 905C300 868 780 868 970 905C992 1000 1002 1120 986 1230C976 1300 950 1330 900 1332L690 1332C640 1332 620 1316 610 1296L270 1296C226 1296 182 1318 150 1316C110 1312 92 1272 98 1220C82 1120 90 1000 110 905Z" fill="${c1}"/>`;
  s += `<path d="M130 934C300 902 780 902 950 934" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".28"/>`;
  s += `<path d="M300 1010C290 1100 286 1200 290 1296M790 1010C800 1100 806 1200 802 1330M540 1030C540 1120 540 1220 548 1316" fill="none" stroke="${c2}" stroke-width="7" stroke-linecap="round" opacity=".32"/>`;
  s += `<path d="M150 1316C190 1318 230 1296 270 1296H610" fill="none" stroke="${c2}" stroke-width="9" opacity=".55" stroke-linecap="round"/>`;
  return s;
}
function rakaDuduk(T, st) {
  const bangun = st.bangun ?? 1, pagi = !!st.pagi;
  const A0 = raka('pingsan', 'netral', { yaw: 0.05, tilt: 6, mouth: { w: 11, up: 4, lo: 10 } });
  const A1 = pagi ? raka('mengerti', 'netral', { yaw: 0, tilt: 2, gazeX: 0, gazeY: 0.1, sparkle: 0.6 }) : raka('khawatir', 'netral', { yaw: 0.1, tilt: -3, gazeX: 0.05, gazeY: 0.75, wide: 0.45, browL: { y: -5, rot: 18 }, browR: { y: -5, rot: -18 }, mouth: { w: 15, up: -7, lo: 7 }, sweat: 0.8 });
  const s0 = lerpState(A0, A1, bangun);
  s0.bob = (st.bob ?? 0) - 18 * (1 - bangun); s0.lean = (st.lean ?? 0) * 1 - 6 * (1 - bangun);
  s0.armL = { wx: 120, wy: 640, ex: 90, ey: 540, finger: 0, front: 1, roll: 0 }; s0.armR = { wx: 280, wy: 640, ex: 310, ey: 540, finger: 0, front: 1, roll: 0 };
  const sv = rakaSvg(idle(s0, T), { width: 400 * RK.k, uid: 'rk', shadow: false, dark: true, logo: true });
  return sv.replace('<svg ', `<svg x="${f1(RK.x - 200 * RK.k)}" y="${f1(RK.y0 + (st.dy ?? 0))}" width="${400 * RK.k}" height="${800 * RK.k}" style="overflow:visible" `);
}
/** Adegan kamar lengkap pada waktu T. st: keadaan Raka dan kaki. */
export function kamar(T, st = {}) {
  const pagi = !!st.pagi;
  return tempatTidur(T, pagi) + rakaDuduk(T, st) + kaki(KAKI.x, KAKI.y, KAKI.s, st.infl ?? 0, T) + `<g transform="translate(0 -100)">${selimut(pagi)}</g>`;
}
