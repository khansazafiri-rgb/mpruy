// Penampang sagital sendi metatarsofalangeal (MTP) pertama = pangkal ibu jari kaki. Punggung kaki di atas, telapak di bawah, proksimal (metatarsal) di kiri, jari di kanan.
// Anatomi (skematis, rongga sendi dan kantung digambar lebih lebar daripada aslinya agar kristal dan sel terbaca): kepala metatarsal I berujung bulat dengan tulang rawan sendi; dasar falang proksimal
// ibu jari yang cekung dengan tulang rawan; rongga sendi berisi cairan sendi; kapsul sendi dilapisi membran sinovium berkapiler; tendon ekstensor hallucis longus di punggung; tulang sesamoid di dalam plantar plate
// pada sisi telapak dengan tendon fleksor hallucis longus di bawahnya; bantalan lemak telapak dan kulit.
import { f1, clamp, lerp, seg, ease, mix, gelap, terang, mulus, poli } from '../tensi/util.mjs';
import { C, rnd, urat, jarum, sel } from './bentuk.mjs';

export const PUSAT = [540, 960];
const W = { kulit: '#E7AD8A', kulitG: '#C98A6C', lemak: '#F6E0B6', lemakG: '#E9CB97', jar: '#EEC4AE', tendon: '#F3EBDC', tendonG: '#D8C9AE', tulang: '#F4EBD7', tulangG: '#D8C8A3', rawan: '#CFE8F2', rawanG: '#98C4D6', cairan: '#FBE7B8', sinov: '#E27F8E', kapsul: '#EDC9C0', sesamoid: '#F1E5CC', plate: '#E4D4C4', edema: '#F4C8BA' };

const gauss = (x, c, w) => Math.exp(-Math.pow((x - c) / w, 2));
// bentuk tulang (koordinat layar)
const META = 'M-60 866C150 860 250 856 300 846C340 836 372 834 410 835C490 836 535 892 535 960C535 1028 490 1084 410 1085C372 1086 340 1084 300 1074C250 1064 150 1060 -60 1054Z';
const FAL = 'M590 872C700 868 900 878 1140 886L1140 1034C900 1042 700 1052 590 1048C640 1030 650 990 650 960C650 930 640 890 590 872Z';
const KAPSUL = 'M400 845C430 770 520 742 590 742C680 742 730 782 742 872L742 1048C730 1130 680 1180 590 1180C520 1180 430 1150 400 1075Z';

/** Titik acak pada permukaan: kepala metatarsal (a), cekungan falang (b), kantung dorsal/plantar (c), rongga (d). */
function posisiKristal(i) {
  const n = i % 4;
  if (n === 0) { const th = (-62 + 124 * rnd(i, 1)) * Math.PI / 180; return [410 + 142 * Math.cos(th), 960 + 142 * Math.sin(th), 90 + (th * 180 / Math.PI) + (rnd(i, 2) - 0.5) * 30]; }
  if (n === 1) { const u = rnd(i, 3); const y = 892 + u * 136, x = 632 - 10 * Math.sin(u * Math.PI) - (u < 0.15 || u > 0.85 ? -22 : 0); return [x - 4, y, 92 + (rnd(i, 4) - 0.5) * 36]; }
  if (n === 2) { const top = rnd(i, 5) < 0.45; const x = 470 + rnd(i, 6) * 220; return [x, top ? 770 + rnd(i, 7) * 26 : 1128 + rnd(i, 7) * 34, (top ? 0 : 0) + (rnd(i, 8) - 0.5) * 50]; }
  return [566 + rnd(i, 9) * 46, 905 + rnd(i, 10) * 110, (rnd(i, 11) - 0.5) * 140];
}
const N_KRISTAL = 48, N_DOT = 70;
function posisiDot(i) { // titik dalam cairan: rongga dan kantung
  const r = rnd(i, 21);
  if (r < 0.4) return [566 + rnd(i, 22) * 46, 900 + rnd(i, 23) * 120];
  if (r < 0.7) return [450 + rnd(i, 24) * 270, 760 + rnd(i, 25) * 56];
  return [450 + rnd(i, 26) * 270, 1100 + rnd(i, 27) * 56];
}

/** S: { larut, kristal, sel, infl, bengkak, merah, hangat, nyeri, T } (semua 0..1 kecuali T). Mengembalikan svg (koordinat layar, pusat 540,960). */
export function sendi(S, opt = {}) {
  const id = opt.id || 'sd', T = S.T || 0, bk = clamp(S.bengkak || 0), mr = clamp(S.merah || 0), inf = clamp(S.infl || 0);
  const xs = []; for (let x = -60; x <= 1140; x += 20) xs.push(x);
  const top = xs.map((x) => 560 - 52 * bk * gauss(x, 520, 300)), bot = xs.map((x) => 1336 + 34 * bk * gauss(x, 520, 300));
  const band = (fa, fb, fill) => { const A = xs.map((x, i) => [x, lerp(top[i], bot[i], fa)]), B = xs.map((x, i) => [x, lerp(top[i], bot[i], fb)]); return `<path d="${poli(A)}${poli(B.slice().reverse()).replace('M', 'L')}Z" fill="${fill}"/>`; };
  let g = `<defs><clipPath id="${id}-cm"><rect x="330" y="700" width="260" height="520"/></clipPath><clipPath id="${id}-cf"><rect x="590" y="700" width="140" height="520"/></clipPath><clipPath id="${id}-cap"><path d="${KAPSUL}"/></clipPath>`
    + `<linearGradient id="${id}-fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W.lemak}"/><stop offset="1" stop-color="${W.lemakG}"/></linearGradient></defs>`;
  // ---- jaringan lunak: kulit punggung, lemak, jaringan ikat; bantalan lemak telapak, kulit telapak (dengan pembengkakan)
  g += band(0, 1, W.jar);
  g += band(0, 0.045, W.kulit) + band(0.045, 0.15, 'url(#' + id + '-fl)');
  g += band(0.8, 0.93, 'url(#' + id + '-fl)') + band(0.93, 1, W.kulit);
  g += band(0.045, 0.15, W.edema).replace('fill="' + W.edema + '"', `fill="${W.edema}" opacity="${f1(0.7 * bk)}"`);
  // titik edema (cairan jaringan) saat bengkak
  if (bk > 0.05) for (let i = 0; i < 26; i++) { const x = 40 + rnd(i, 31) * 1000, y0 = lerp(top[0], bot[0], 0.06 + 0.1 * rnd(i, 32)); g += `<circle cx="${f1(x)}" cy="${f1(y0 - 22 * bk * gauss(x, 520, 300) * rnd(i, 33))}" r="${f1(3 + 4 * rnd(i, 34))}" fill="#fff" opacity="${f1(0.32 * bk)}"/>`; }
  // tendon ekstensor di punggung
  g += `<path d="M-60 700C300 696 700 706 1140 712" stroke="${W.tendonG}" stroke-width="30" stroke-linecap="round" fill="none"/><path d="M-60 698C300 694 700 704 1140 710" stroke="${W.tendon}" stroke-width="22" stroke-linecap="round" fill="none"/><path d="M-60 694C300 690 700 700 1140 706" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".6"/>`;
  // ---- kapsul sendi + cairan + sinovium
  g += `<path d="${KAPSUL}" fill="${W.kapsul}" stroke="${W.kapsul}" stroke-width="34" stroke-linejoin="round"/>`;
  const cairanO = 0.55 + 0.3 * bk;
  g += `<path d="${KAPSUL}" fill="${W.cairan}" opacity="${f1(cairanO)}"/>`;
  g += `<path d="${KAPSUL}" fill="none" stroke="${W.sinov}" stroke-width="14" stroke-linejoin="round"/>`;
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; } // (vili digambar sebagai tonjolan kecil di bawah)
  // ---- tulang dan tulang rawan
  g += `<g clip-path="url(#${id}-cm)"><path d="${META}" fill="none" stroke="${W.rawan}" stroke-width="30"/><path d="${META}" fill="none" stroke="${W.rawanG}" stroke-width="3" transform="translate(0 0)" opacity=".6"/></g>`;
  g += `<g clip-path="url(#${id}-cf)"><path d="${FAL}" fill="none" stroke="${W.rawan}" stroke-width="30"/></g>`;
  g += `<path d="${META}" fill="${W.tulang}" stroke="${W.tulangG}" stroke-width="3"/><path d="${FAL}" fill="${W.tulang}" stroke="${W.tulangG}" stroke-width="3"/>`;
  g += `<path d="M20 900C200 894 300 886 360 872M20 1020C200 1026 300 1034 360 1048M640 910C800 904 980 914 1100 920M660 1006C800 1010 980 1008 1100 1002" fill="none" stroke="${W.tulangG}" stroke-width="3" opacity=".45" stroke-linecap="round"/>`;
  // ---- sisi telapak: sesamoid di dalam plantar plate, tendon fleksor
  g += `<path d="M520 1112C560 1104 610 1090 650 1058" fill="none" stroke="${W.plate}" stroke-width="22" stroke-linecap="round"/>`;
  g += `<ellipse cx="470" cy="1128" rx="66" ry="36" fill="${W.sesamoid}" stroke="${W.tulangG}" stroke-width="3"/><ellipse cx="454" cy="1118" rx="26" ry="10" fill="#fff" opacity=".5"/>`;
  g += `<path d="M-60 1228C300 1234 700 1236 1140 1226" stroke="${W.tendonG}" stroke-width="32" stroke-linecap="round" fill="none"/><path d="M-60 1226C300 1232 700 1234 1140 1224" stroke="${W.tendon}" stroke-width="24" stroke-linecap="round" fill="none"/>`;
  // ---- kapiler pada sinovium (melebar saat meradang)
  const kap = (d, w) => `<path d="${d}" fill="none" stroke="${mix('#8C1F2C', '#6E1824', 0)}" stroke-width="${f1(w + 5)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${mix('#C83A44', '#E8483F', inf)}" stroke-width="${f1(w)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#FF9A92" stroke-width="${f1(w * 0.3)}" stroke-linecap="round" opacity=".5" transform="translate(0 -${f1(w * 0.2)})"/>`;
  const wk = 9 + 9 * inf;
  g += kap('M452 792C500 770 600 760 700 790C730 800 742 830 748 860', wk) + kap('M452 1118C500 1160 600 1170 700 1140C730 1128 740 1100 748 1070', wk) + kap('M588 742C590 700 590 660 586 620', 7 + 6 * inf) + kap('M590 1180C592 1230 590 1262 586 1300', 7 + 6 * inf);
  // ---- saraf nyeri di dekat kapsul (punggung)
  const ny = clamp(S.nyeri || 0);
  g += `<path d="M790 640C760 700 748 760 742 800" fill="none" stroke="${C.saraf}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 0" opacity="${f1(0.55 + 0.45 * ny)}"/><circle cx="742" cy="800" r="9" fill="${C.saraf}" opacity="${f1(0.55 + 0.45 * ny)}"/>`;
  if (ny > 0.05) { const p = 0.5 + 0.5 * Math.sin(T * 14), z = `M0 -34L14 -6L2 -4L16 26L-8 -2L4 -4Z`; g += `<g transform="translate(784 650)" opacity="${f1(ny)}"><circle r="${f1(46 + 8 * p)}" fill="${C.saraf}" opacity=".22"/><path d="${z}" transform="scale(1.15)" fill="${C.uratT}" stroke="#7A4F0B" stroke-width="3" stroke-linejoin="round"/></g>`; }
  // ---- urat larut (titik emas dalam cairan)
  const larut = clamp(S.larut ?? 0), kr = clamp(S.kristal || 0);
  const nd = Math.round(N_DOT * larut * (1 - 0.55 * kr));
  for (let i = 0; i < nd; i++) { const [x, y] = posisiDot(i); const dx = Math.sin(T * 0.9 + i) * 10, dy = Math.cos(T * 0.7 + i * 1.7) * 8; g += urat(x + dx, y + dy, 5.4, 0.95); }
  // ---- kristal urat: jarum kecil yang tumbuh dan mengendap di permukaan tulang rawan, membran, dan dasar kantung
  for (let i = 0; i < N_KRISTAL; i++) {
    const gi = clamp(kr * (N_KRISTAL + 4) - i * 0.9) ; if (gi <= 0) continue;
    const [x, y, rot] = posisiKristal(i); const len = 26 + 16 * rnd(i, 41);
    g += jarum(x, y, len, 4.6, rot, ease.out(clamp(gi)), 1);
  }
  // ---- sel pertahanan keluar dari kapiler dan mendekati kristal
  const sp = clamp(S.sel || 0), NS = 11;
  for (let i = 0; i < NS; i++) {
    const p = clamp(sp * 1.3 - i * 0.07); if (p <= 0) continue;
    const top2 = i % 2 === 0, sx = top2 ? 470 + (i * 37 % 190) : 480 + (i * 53 % 190), sy = top2 ? 784 : 1136;
    const tx = 560 + 70 * rnd(i, 51), ty = 930 + 60 * rnd(i, 52) + (i % 3 - 1) * 22, e = ease.sm(p);
    const x = lerp(sx, tx, e) + Math.sin(T * 5 + i) * 3 * (1 - e * 0.5), y = lerp(sy, ty, e) + Math.cos(T * 4 + i) * 3;
    const ak = clamp((p - 0.7) / 0.3);
    g += sel(x, y, 21, Math.atan2(ty - y, tx - x) * 180 / Math.PI, 1, ak);
    if (ak > 0.1) for (let j = 0; j < 3; j++) { const a = T * 2 + j * 2.1 + i, r = 30 + 12 * ((T * 0.8 + j / 3) % 1); g += `<circle cx="${f1(x + Math.cos(a) * r)}" cy="${f1(y + Math.sin(a) * r)}" r="3.4" fill="${C.hangat}" opacity="${f1(0.6 * ak * (1 - ((T * 0.8 + j / 3) % 1)))}"/>`; }
  }
  // ---- merah: penutup warna jaringan; hangat: cahaya dan gelombang panas
  if (mr > 0.01) g += `<rect x="-60" y="${f1(top[0] - 10)}" width="1200" height="${f1(bot[0] - top[0] + 20)}" fill="#E2493F" opacity="${f1(0.2 * mr)}" style="mix-blend-mode:multiply"/>`;
  const hg = clamp(S.hangat || 0);
  if (hg > 0.01) {
    g += `<defs><radialGradient id="${id}-hg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.hangat}" stop-opacity=".55"/><stop offset="1" stop-color="${C.hangat}" stop-opacity="0"/></radialGradient></defs><ellipse cx="560" cy="${f1(top[14])}" rx="520" ry="170" fill="url(#${id}-hg)" opacity="${f1(hg)}"/>`;
    for (let i = 0; i < 5; i++) { const u = ((T * 0.5 + i / 5) % 1), yy = top[14] - 10 - u * 120, o = Math.min(1, u * 5, (1 - u) * 2.2) * hg; g += `<path d="M${200 + i * 170} ${f1(yy)}q-14 -20 0 -40t0 -40" fill="none" stroke="${C.hangat}" stroke-width="8" stroke-linecap="round" opacity="${f1(0.85 * o)}"/>`; }
  }
  return g;
}
/** Titik jangkar label di koordinat layar (pusat 540,960). */
export const JANGKAR = { larut: [596, 960], kristal: [632, 934], rawan: [548, 870], sel: [592, 1000], cairan: [612, 800], kapiler: [650, 760], saraf: [742, 800], kapsul: [742, 880] };
export const bentukTulang = { META, FAL, KAPSUL };
