// Lengan atas (koordinat "S": 1080 x 1920, kulit atas y=600, bawah y=980): tampak luar dan PENAMPANG MEMANJANG yang dibuka dengan sapuan.
// Proksimal (arah jantung) di kiri, siku di kanan. Skematis: lapisan, ketebalan, dan jalur arteri disederhanakan; arteri digambar lebih besar daripada ukuran sebenarnya agar terbaca di ponsel.
import { f1, clamp, lerp, seg, ease, mix, gelap, terang, poli } from '../tensi/util.mjs';
import { EV } from './waktu.mjs';
import { PS, PD, PMAKS, tAnim, tekananManset, tekananArteri, waktuDenyut, denyutAntara, T_BEAT, DAHULU, amplitudoKetukan } from './fisika.mjs';

export const YT = 600, YB = 980, H = YB - YT;
export const CUFF = { x0: 60, x1: 560 };
export const STET = { x: 702 };
const XS = []; for (let x = -30; x <= 1110; x += 10) XS.push(x);
const sm = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };

// ---- geometri
const wc = (x) => sm((x - 40) / 70) * (1 - sm((x - 520) / 70));                          // jendela jaringan yang tertekan manset
const wcp = (x) => sm((x - 50) / 60) * (1 - 0.3 * clamp((x - 420) / 140)) * (1 - sm((x - 560) / 80)); // tekanan manset relatif di bawah manset (meruncing di tepi distal)
export const top0 = (x) => YT + 78 * sm((x - 800) / 110);
export const bot0 = () => YB;
const faA = (x) => lerp(0.47, 0.215, sm((x - 400) / 300));
export const dip = (x, Pn) => 30 * Pn * wc(x);
export const topY = (x, Pn) => top0(x) + dip(x, Pn);
export const botY = (x, Pn) => bot0(x) - dip(x, Pn) * 0.85;
export const arteriY = (x, Pn) => { const a = topY(x, Pn), b = botY(x, Pn); return a + faA(x) * (b - a); };
const R0 = 28;                                                                          // jari-jari luar arteri terbuka (skematis)

const WARNA = {
  kulit: '#E7B28C', kulitG: '#D79A72', lemak: '#F4E0B4', lemakG: '#EDCF98', otot: '#C25A5C', ototG: '#A04048', otot2: '#B4504F', fibre: '#7E2A33',
  selubung: '#EBD5C3', tulang: '#F3EAD6', tulangG: '#D9C9A6', dinding: '#962C39', lumen: '#E5484D', lumenT: '#FF8F88', vena: '#5C84C6', venaL: '#86A9E0',
  kain: '#2F6E73', kainG: '#245358', kainT: '#4E9298', udara: '#8ED4E8', velcro: '#E9E4D6', perak: '#D6DCE2', perakG: '#9CA6B2', tabung: '#1B2A3A',
};

// ---- parameter waktu: kondisi pada Ta (waktu animasi, berhenti saat beku)
export function keadaan(T) {
  const Ta = tAnim(T), P = tekananManset(Ta), Pn = P / PMAKS;
  const fl = clamp((PS + 60 - P) / 60) * seg(Ta, EV.gerak, EV.gerak + 1.6) * (Ta < EV.duk + 5 ? 1 : 0);   // getaran halus dinding yang masih terjepit
  const tutup = seg(Ta, EV.masuk[0] + 0.1, EV.masuk[1] + 0.3);                                                // penampang baru terbuka: arteri terlihat terjepit bertahap (kalimat 3)
  const perf = Ta < EV.masuk[0] ? 1 : Ta < EV.duk ? 1 - 0.85 * seg(Ta, 8.6, 9.8) : lerp(0.15, 1, seg(Ta, EV.duk, EV.hilang - 3));
  return { Ta, P, Pn, fl, tutup, perf };
}
/** Tekanan arteri pada x dan waktu Ta (gelombang merambat ke kanan 1100 px/dtk; di x = 580 sama dengan tekananArteri(Ta)). */
const pAx = (x, Ta) => tekananArteri(Ta + (580 - x) / 1100);
/** Keterbukaan arteri di x (0 terjepit .. 1 terbuka). */
export function buka(x, Ta, P) { const w = wcp(x) * P; const s = pAx(x, Ta) - w; return sm(s / 3); }

// ---- penampang
export function penampang(T, opt = {}) {
  const S = keadaan(T), { Ta, P, Pn, fl, tutup, perf } = S;
  const top = XS.map((x) => topY(x, Pn)), bot = XS.map((x) => botY(x, Pn));
  const yAt = (f) => XS.map((x, i) => top[i] + f * (bot[i] - top[i]));
  const band = (f0, f1, fill, extra = '') => { const a = yAt(f0), b = yAt(f1); return `<path d="${poli(XS.map((x, i) => [x, a[i]]))}${poli(XS.map((x, i) => [XS[XS.length - 1 - i], b[XS.length - 1 - i]])).replace('M', 'L')}Z" fill="${fill}"${extra}/>`; };
  const info = { Ta, P };
  let g = `<defs>
    <linearGradient id="gO" gradientUnits="userSpaceOnUse" x1="0" y1="${YT}" x2="0" y2="${YB}"><stop offset="0" stop-color="${WARNA.otot}"/><stop offset=".5" stop-color="${WARNA.otot2}"/><stop offset="1" stop-color="${WARNA.ototG}"/></linearGradient>
    <linearGradient id="gF" gradientUnits="userSpaceOnUse" x1="0" y1="${YT}" x2="0" y2="${YT + 60}"><stop offset="0" stop-color="${WARNA.lemak}"/><stop offset="1" stop-color="${WARNA.lemakG}"/></linearGradient>
  </defs>`;
  // lapisan: kulit, lemak, otot (biseps), otot dalam, tulang, otot belakang, lemak, kulit
  g += band(0, 1, WARNA.kulit);
  g += band(0.032, 0.15, 'url(#gF)');
  g += band(0.15, 0.945, 'url(#gO)');
  g += band(0.945, 0.98, WARNA.lemak);
  // serat otot
  for (const f of [0.2, 0.26, 0.32, 0.37, 0.58, 0.63, 0.855, 0.9]) { const y = yAt(f); g += `<path d="${poli(XS.map((x, i) => [x, y[i] + Math.sin(x * 0.03 + f * 40) * 2.2]))}" fill="none" stroke="${WARNA.fibre}" stroke-opacity=".22" stroke-width="2.2" stroke-linecap="round"/>`; }
  // tulang lengan atas (humerus) berhenti di dekat siku; tulang lengan bawah dimulai setelah sendi
  { const xe = XS.findIndex((x) => x > 735), y0 = yAt(0.7), y1 = yAt(0.82);
    const tp = XS.slice(0, xe).map((x, i) => [x, y0[i]]), bt = XS.slice(0, xe).map((x, i) => [x, y1[i]]).reverse();
    g += `<path d="${poli(tp)}L${f1(XS[xe - 1] + 18)} ${f1(y0[xe - 1] + 4)}Q${f1(XS[xe - 1] + 34)} ${f1((y0[xe - 1] + y1[xe - 1]) / 2)} ${f1(XS[xe - 1] + 18)} ${f1(y1[xe - 1] - 4)}${poli(bt).replace('M', 'L')}Z" fill="${WARNA.tulang}" stroke="${WARNA.tulangG}" stroke-width="2.5" stroke-linejoin="round"/>`;
    const a0 = yAt(0.54), a1 = yAt(0.66); const xi = XS.findIndex((x) => x > 790);
    g += `<path d="${poli(XS.slice(xi).map((x, i) => [x, a0[xi + i]]))}${poli(XS.slice(xi).map((x, i) => [XS[XS.length - 1 - i], a1[XS.length - 1 - i]]).filter((p) => p[0] >= XS[xi])).replace('M', 'L')}Z" fill="${WARNA.tulang}" stroke="${WARNA.tulangG}" stroke-width="2.5" stroke-linejoin="round"/>`; }
  // selubung jaringan ikat + vena + arteri
  const yc = XS.map((x, i) => top[i] + faA(x) * (bot[i] - top[i]));
  g += `<path d="${poli(XS.map((x, i) => [x, yc[i]]))}" fill="none" stroke="${WARNA.selubung}" stroke-opacity=".6" stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/>`;
  { const vy = XS.map((x, i) => yc[i] + 40 * (bot[i] - top[i]) / H + 22); const rv = XS.map((x) => 11 * (1 - 0.78 * wc(x) * Pn));
    const up = XS.map((x, i) => [x, vy[i] - rv[i]]), lo = XS.map((x, i) => [XS[XS.length - 1 - i], vy[XS.length - 1 - i] + rv[XS.length - 1 - i]]);
    g += `<path d="${poli(up)}${poli(lo).replace('M', 'L')}Z" fill="${WARNA.vena}" stroke="${gelap(WARNA.vena, 0.3)}" stroke-width="1.5"/><path d="${poli(XS.map((x, i) => [x, vy[i] - rv[i] * 0.3]))}" fill="none" stroke="${WARNA.venaL}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`; }
  // arteri
  const dens = XS.map((x) => buka(x, Ta, P));
  const pulsa = (x) => clamp((pAx(x, Ta) - PD) / (PS - PD));
  const rO = XS.map((x, i) => {
    const o = dens[i], w = wcp(x);
    let r = lerp(2.4, R0, o) + fl * 3.6 * w * pulsa(x) * (1 - o) * (x > 100 ? 1 : 0.2);
    const bu = (1 - w * (1 - o)) * (x < 640 ? 1 : 0.35 + 0.65 * perf);                    // denyut hanya melebarkan bagian yang masih berhubungan dengan jantung
    r *= 1 + 0.2 * pulsa(x) * bu * (x < 640 || perf > 0.5 ? 1 : 0.2);
    // arteri belum terjepit sebelum penampang terbuka: kalimat 3 ("arteri di lengan tertekan") memperlihatkan penjepitan
    r = lerp(r, R0 * (1 + 0.12 * pulsa(x)), (1 - tutup) * w);
    return r; });
  const rL = rO.map((r) => Math.max(0, r - 9.5 * Math.min(1, (r - 2) / 12)));
  const edge = (R, s) => XS.map((x, i) => [x, yc[i] + s * R[i]]);
  g += `<path d="${poli(edge(rO, -1))}${poli(edge(rO, 1).reverse()).replace('M', 'L')}Z" fill="${WARNA.dinding}" stroke="${gelap(WARNA.dinding, 0.35)}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const lumenFill = mix('#6F3D5B', WARNA.lumen, perf);
  g += `<path id="lumen" d="${poli(edge(rL, -1))}${poli(edge(rL, 1).reverse()).replace('M', 'L')}Z" fill="${lumenFill}"/>`;
  g += `<path d="${poli(XS.map((x, i) => [x, yc[i] - rL[i] * 0.45]))}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="${f1(2)}" stroke-linecap="round"/>`;
  // sorot gelombang denyut yang merambat di lumen
  let defs2 = '', glow = '';
  for (const tb of denyutAntara(Ta - 1.0, Ta + 0.7)) {
    const xf = 580 + 1100 * (Ta - (tb - DAHULU - 0.04));
    if (xf < -150 || xf > 800) continue;
    const id = 'gw' + Math.round(tb * 10); defs2 += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(xf - 110)}" y1="0" x2="${f1(xf + 110)}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#FFD9CF" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    glow += `<path d="${poli(edge(rL, -1))}${poli(edge(rL, 1).reverse()).replace('M', 'L')}Z" fill="url(#${id})"/>`;
  }
  g += `<defs>${defs2}</defs>${glow}`;
  // aliran darah terus-menerus (hanya bila arteri terbuka sepanjang siklus): garis putus-putus bergerak
  const fullOpen = seg(P, PD + 3, PD - 1) * (P < PD + 3 ? 1 : 0);
  if (fullOpen > 0.02) { const sh = (Ta * 150) % 64; let d = ''; for (let x = -60 + sh; x < 1100; x += 64) { const i = Math.max(0, Math.min(XS.length - 1, Math.round((x + 30) / 10))); d += `M${f1(x)} ${f1(yc[i])}h24`; } g += `<path d="${d}" stroke="#FFC4BC" stroke-opacity="${f1(0.5 * fullOpen)}" stroke-width="5" stroke-linecap="round" fill="none"/>`; }
  // ---- getaran yang merambat di jaringan (riak) dari tepi distal manset menuju diafragma
  const sx = 588, sy = yc[XS.findIndex((x) => x >= sx)], dx = STET.x, dy = YT;
  const clipPoly = `<clipPath id="jar"><path d="${poli(XS.map((x, i) => [x, top[i] + 2]))}${poli(XS.map((x, i) => [XS[XS.length - 1 - i], bot[XS.length - 1 - i]])).replace('M', 'L')}Z"/></clipPath>`;
  let riak = '', diafragma = 0;
  const beats = denyutAntara(Ta - 0.6, Ta + 0.15);
  for (const tb of beats) {
    const Pk = tekananManset(tb), ak = amplitudoKetukan(Pk), fk = clamp((PS + 60 - Pk) / 60) * seg(tb, EV.gerak, EV.gerak + 1.6) * (tb < EV.duk - 0.05 ? 1 : 0);
    const amp = tb >= EV.duk - 0.05 ? ak : 0.5 * fk * fk;
    if (amp < 0.02) continue;
    const age = Ta - (tb - 0.1);                                                           // riak mulai saat arteri membuka, tiba di diafragma 0,1 dtk kemudian
    if (age < 0 || age > 0.5) continue;
    const r = age * 1700, reach = tb >= EV.duk - 0.05 ? 1 : 0.18 * fk;                      // getaran lemah sebelum ketukan pertama mereda sebelum sampai diafragma
    for (let j = 0; j < 3; j++) { const rr = r - j * 34; if (rr < 8) continue; const fade = clamp(1 - rr / (190 + 80 * reach)) * clamp(1 - Math.max(0, age - 0.28) / 0.22); riak += `<circle cx="${sx}" cy="${f1(sy)}" r="${f1(rr)}" fill="none" stroke="#F8C038" stroke-width="${f1(11 - j * 2.4)}" stroke-opacity="${f1(fade * Math.min(1, amp * 1.5) * (j === 0 ? 1 : 0.7))}"/>`; }
    if (tb >= EV.duk - 0.05) diafragma = Math.max(diafragma, ak * clamp(1 - Math.abs(Ta - tb) / 0.16) * (Ta >= tb - 0.02 ? 1 : 0));
  }
  g += `${clipPoly}<g clip-path="url(#jar)">${riak}</g>`;
  info.diafragma = diafragma; info.sx = sx; info.sy = sy; info.top = top; info.bot = bot; info.yc = yc; info.P = P; info.Pn = Pn;
  return { svg: g, info, S };
}

// ---- manset (penampang): kain luar + kantung udara yang menggembung dan menekan jaringan
export function mansetPenampang(S) {
  const { Pn } = S, { x0, x1 } = CUFF, yfT = YT - 24 - 10 * Pn, yfB = YB + 24 + 10 * Pn;
  const bl = (yF, ySkin, atas) => { const a = Math.min(yF, ySkin), b = Math.max(yF, ySkin); return `<path d="M${x0 + 12} ${f1(a)}H${x1 - 12}V${f1(b)}H${x0 + 12}Z" fill="${WARNA.udara}" fill-opacity="${f1(0.45 + 0.4 * Pn)}"/>`; };
  let s = '';
  // kantung udara (antara kain dan kulit) mengikuti kulit yang tertekan: gambar sebagai poligon dari kulit ke kain
  const xs = XS.filter((x) => x >= x0 + 8 && x <= x1 - 8);
  const upper = xs.map((x) => [x, topY(x, Pn)]), lower = xs.map((x) => [x, botY(x, Pn)]);
  s += `<path d="M${x0 + 8} ${f1(yfT + 14)}H${x1 - 8}${poli(upper.slice().reverse()).replace('M', 'L')}Z" fill="${WARNA.udara}" fill-opacity="${f1(0.4 + 0.45 * Pn)}"/>`;
  s += `<path d="M${x0 + 8} ${f1(yfB - 14)}H${x1 - 8}${poli(lower.slice().reverse()).replace('M', 'L')}Z" fill="${WARNA.udara}" fill-opacity="${f1(0.4 + 0.45 * Pn)}"/>`;
  // panah tekanan ke dalam (tampak bila tekanan tinggi)
  if (Pn > 0.25) for (let x = x0 + 70; x < x1 - 40; x += 78) { const a = f1(0.65 * clamp((Pn - 0.25) / 0.5)); const yu = topY(x, Pn) - 10, yl = botY(x, Pn) + 10; s += `<path d="M${x - 11} ${f1(yu - 20)}L${x} ${f1(yu)}L${x + 11} ${f1(yu - 20)}" fill="none" stroke="#fff" stroke-opacity="${a}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x - 11} ${f1(yl + 20)}L${x} ${f1(yl)}L${x + 11} ${f1(yl + 20)}" fill="none" stroke="#fff" stroke-opacity="${a}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`; }
  // kain luar (atas dan bawah)
  s += `<path d="M${x0} ${f1(yfT + 14)}V${f1(yfT + 4)}Q${x0} ${f1(yfT - 8)} ${x0 + 12} ${f1(yfT - 8)}H${x1 - 12}Q${x1} ${f1(yfT - 8)} ${x1} ${f1(yfT + 4)}V${f1(yfT + 14)}Z" fill="${WARNA.kain}"/><path d="M${x0 + 8} ${f1(yfT - 8)}H${x1 - 8}" stroke="${WARNA.kainT}" stroke-width="3" opacity=".7"/>`;
  s += `<path d="M${x0} ${f1(yfB - 14)}V${f1(yfB - 4)}Q${x0} ${f1(yfB + 8)} ${x0 + 12} ${f1(yfB + 8)}H${x1 - 12}Q${x1} ${f1(yfB + 8)} ${x1} ${f1(yfB - 4)}V${f1(yfB - 14)}Z" fill="${WARNA.kainG}"/>`;
  // ujung kain (penampang) di kiri dan kanan
  s += `<path d="M${x0} ${f1(yfT + 14)}V${f1(yfB - 14)}" stroke="${WARNA.kainG}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${f1(yfT + 14)}V${f1(yfB - 14)}" stroke="${WARNA.kainG}" stroke-width="8" stroke-linecap="round"/>`;
  return s;
}

// ---- stetoskop (diafragma menempel di kulit; selang ke telinga di kanan atas) dengan pantulan kecil saat ketukan
export function stetoskop(info, { x = STET.x, y = YT, skala = 1, selang = true } = {}) {
  const d = (info?.diafragma || 0), dent = 3.5 * d;
  let s = '';
  if (selang) s += `<path d="M${x} ${y - 70}C${x + 40} ${y - 130} ${x + 150} ${y - 150} ${x + 230} ${y - 330}S${x + 330} ${y - 560} ${x + 420} ${y - 700}" fill="none" stroke="${WARNA.tabung}" stroke-width="15" stroke-linecap="round"/><path d="M${x + 4} ${y - 72}C${x + 44} ${y - 132} ${x + 154} ${y - 152} ${x + 234} ${y - 332}S${x + 334} ${y - 562} ${x + 424} ${y - 702}" fill="none" stroke="#3C5670" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>`;
  s += `<g transform="translate(0 ${f1(dent)})"><rect x="${x - 10}" y="${y - 70}" width="20" height="40" rx="7" fill="${WARNA.perakG}"/>`
    + `<rect x="${x - 54}" y="${y - 36}" width="108" height="34" rx="15" fill="${WARNA.perak}"/><rect x="${x - 54}" y="${y - 36}" width="108" height="12" rx="6" fill="#fff" opacity=".45"/><rect x="${x - 50}" y="${y - 8}" width="100" height="7" rx="3.5" fill="${WARNA.perakG}"/></g>`;
  if (d > 0.04) { for (let j = 0; j < 3; j++) { const r = 40 + j * 24 + d * 6; s += `<path d="M${x - r} ${y - 36}A${r} ${r} 0 0 1 ${x + r} ${y - 36}" transform="translate(0 ${f1(-2 - j * 4)})" fill="none" stroke="#F8C038" stroke-width="${f1(6 - j * 1.4)}" stroke-linecap="round" stroke-opacity="${f1((0.95 - j * 0.28) * d)}" transform-origin="${x} ${y}"/>`; } }
  return s;
}

// ---- tampak luar (silhouet lengan sama dengan penampang)
export function luar(S, info = {}) {
  const { Pn } = S;
  const xs = XS.filter((x) => x <= 1010), top = xs.map((x) => top0(x));
  const yE = top0(1010);
  const sil = `<path d="${poli(xs.map((x, i) => [x, top[i]]))}C1070 ${f1(yE - 6)} 1118 ${f1(yE + 24)} 1120 ${f1(yE + 90)}C1122 ${YB - 40} 1096 ${YB - 4} 1050 ${YB}H${xs[xs.length - 1]}${poli(xs.map((x) => [x, YB]).reverse()).replace('M', 'L')}Z"/>`;
  let s = `<defs><linearGradient id="gK" gradientUnits="userSpaceOnUse" x1="0" y1="${YT}" x2="0" y2="${YB}"><stop offset="0" stop-color="#F0BE98"/><stop offset=".55" stop-color="${WARNA.kulit}"/><stop offset="1" stop-color="${WARNA.kulitG}"/></linearGradient></defs>`;
  s += `<g fill="url(#gK)">${sil}</g>`;
  // jari-jari tangan yang santai (garis halus) di ujung kanan
  s += `<path d="M1040 ${f1(yE + 40)}Q1090 ${f1(yE + 36)} 1112 ${f1(yE + 62)}M1040 ${f1(yE + 76)}Q1094 ${f1(yE + 74)} 1116 ${f1(yE + 100)}" fill="none" stroke="${WARNA.kulitG}" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;
  // lipatan siku dan pangkal otot
  s += `<path d="M${STET.x - 56} ${YT + 2}Q${STET.x - 20} ${YT + 70} ${STET.x - 30} ${YT + 130}" fill="none" stroke="${WARNA.kulitG}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  s += `<path d="M${STET.x - 120} ${YT + 8}Q${STET.x - 80} ${YT + 18} ${STET.x - 40} ${YT + 10}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".16"/>`;
  // lengan baju tergulung di kiri
  s += `<path d="M-80 ${YT - 30}H44Q70 ${YT - 30} 70 ${YT - 6}V${YB + 8}H-80Z" fill="#9DB7C4"/><path d="M-80 ${YT - 30}H44Q70 ${YT - 30} 70 ${YT - 6}V${YT + 10}H-80Z" fill="#B9CEDA"/><path d="M44 ${YT - 30}Q70 ${YT - 30} 70 ${YT - 6}V${YB + 8}" fill="none" stroke="#7F9AA9" stroke-width="5"/>`;
  return s;
}
export function mansetLuar(S) {
  const { Pn } = S, { x0, x1 } = CUFF, yT = YT - 22 - 12 * Pn, yB = YB + 14 + 12 * Pn, w = x1 - x0, h = yB - yT;
  let s = `<rect x="${x0}" y="${f1(yT)}" width="${w}" height="${f1(h)}" rx="30" fill="${WARNA.kain}"/>`;
  s += `<rect x="${x0}" y="${f1(yT)}" width="${w}" height="${f1(h * 0.28)}" rx="30" fill="${WARNA.kainT}" opacity=".5"/>`;
  s += `<rect x="${x1 - 150}" y="${f1(yT + 22)}" width="124" height="${f1(h - 44)}" rx="14" fill="${WARNA.velcro}"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M${x1 - 138} ${f1(yT + 60 + i * (h - 130) / 4)}H${x1 - 38}" stroke="#B9B2A0" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M${x0 + 20} ${f1(yT + 18)}H${x1 - 160}M${x0 + 20} ${f1(yB - 18)}H${x1 - 160}" stroke="${WARNA.kainG}" stroke-width="3.5" stroke-dasharray="14 10" stroke-linecap="round" opacity=".9"/>`;
  s += `<path d="M${x0 + 4} ${f1(yT + 30)}V${f1(yB - 30)}" stroke="${WARNA.kainG}" stroke-width="6" opacity=".6" stroke-linecap="round"/>`;
  return s;
}
export { WARNA };
