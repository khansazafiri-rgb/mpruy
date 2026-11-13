// Adegan di dalam tubuh: asal purin (pergantian sel tubuh dan makanan, seimbang) -> penguraian -> urat larut dalam darah -> ginjal membuang lewat urin -> urat menumpuk di darah (grafik tanpa angka).
import { FONT, MEREK } from '../tokens.mjs';
import { f1, clamp, lerp, seg, ease, mix, mulus, poli } from '../tensi/util.mjs';
import { C, GADING, EMAS, TINTA, rnd, purin, urat, selTubuh, makanan, pil, garis, esc } from './bentuk.mjs';
import { W as KATA } from './waktu.mjs';

// ---------- util jalur
function jalur(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }
function di(j, u) { const d = clamp(u) * j.L; let i = 1; while (i < j.cum.length - 1 && j.cum[i] < d) i++; const t = (d - j.cum[i - 1]) / Math.max(1e-6, j.cum[i] - j.cum[i - 1]); return [lerp(j.pts[i - 1][0], j.pts[i][0], t), lerp(j.pts[i - 1][1], j.pts[i][1], t)]; }
const smooth = (pts, n = 40) => { const r = []; for (let k = 0; k < n; k++) { const u = k / (n - 1) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(u)), t = u - i; const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; const c = (a, b, c2, d) => 0.5 * ((2 * b) + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t); r.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]); } return r; };

// ---------- pembuluh darah mendatar dengan plasma, urat larut mengalir
export function pembuluh(T, y, h, kepadatan, { x0 = -40, x1 = 1120, kec = 90, glow = 1, id = 'pb' } = {}) {
  let g = `<rect x="${x0}" y="${y - h / 2 - 12}" width="${x1 - x0}" height="${h + 24}" rx="${h / 2 + 12}" fill="${C.darahG}"/><rect x="${x0}" y="${y - h / 2}" width="${x1 - x0}" height="${h}" rx="${h / 2}" fill="${C.darah}"/>`;
  g += `<rect x="${x0}" y="${y - h / 2 + 8}" width="${x1 - x0}" height="${h * 0.22}" rx="${h * 0.11}" fill="${C.darahT}" opacity=".45"/>`;
  // sel darah merah kecil (latar), bergerak pelan
  for (let i = 0; i < 16; i++) { const x = x0 + (((i * 83 + T * kec * 0.55) % (x1 - x0 + 120)) + (x1 - x0 + 120)) % (x1 - x0 + 120) - 40, yy = y + (rnd(i, 61) - 0.5) * h * 0.62; g += `<ellipse cx="${f1(x)}" cy="${f1(yy)}" rx="22" ry="12" fill="#8E1E2B" opacity=".55"/><ellipse cx="${f1(x - 4)}" cy="${f1(yy - 3)}" rx="9" ry="4" fill="#E36A6E" opacity=".35"/>`; }
  const n = Math.round(46 * clamp(kepadatan));
  for (let i = 0; i < n; i++) { const x = x0 + (((i * 61 + T * kec) % (x1 - x0 + 120)) + (x1 - x0 + 120)) % (x1 - x0 + 120) - 40, yy = y + (rnd(i, 62) - 0.5) * h * 0.7 + Math.sin(T * 1.4 + i) * 5; g += urat(x, yy, 7, 1, glow); }
  return g;
}

// ---------- adegan 1: purin dari dua sumber -> penguraian -> urat larut
/** kemunculan unsur dihitung dari waktu kata pada narasi */
export function adeganPurin(T, lbl = true) {
  const t = T;
  const pPurin = seg(t, KATA.purin - 0.15, KATA.purin + 0.45, ease.out), pSel = seg(t, KATA.sel - 0.2, KATA.sel + 0.45, ease.out), pMak = seg(t, KATA.makanan - 0.2, KATA.makanan + 0.45, ease.out);
  const pOut = seg(t, KATA.terbentuk - 0.1, KATA.terbentuk + 0.5, ease.out), pUrat = seg(t, KATA.urat1 - 0.1, KATA.urat1 + 0.4, ease.out);
  const SEL = [260, 600], MAK = [820, 600], DEV = [540, 990], OUT = [540, 1140];
  let g = '';
  // pembuluh di bawah (urat larut ditambahkan setelah penguraian)
  g += pembuluh(t, 1470, 150, pOut * 0.6, { kec: 110 });
  // alat penguraian: kapsul bundar dengan roda gigi berputar
  const rot = (t * 40) % 360, glow = 0.25 + 0.5 * pPurin;
  g += `<g transform="translate(${DEV[0]} ${DEV[1]}) scale(1.2)"><circle r="170" fill="${C.purin}" opacity="${f1(0.08 + 0.1 * glow)}"/><rect x="-150" y="-110" width="300" height="220" rx="70" fill="#14343F" stroke="${C.purin}" stroke-width="5" opacity=".95"/><rect x="-150" y="-110" width="300" height="220" rx="70" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>`;
  g += `<g transform="rotate(${f1(rot)})">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="-9" y="-62" width="18" height="22" rx="5" fill="${C.purin}" transform="rotate(${i * 45})" opacity=".85"/>`).join('')}<circle r="48" fill="none" stroke="${C.purin}" stroke-width="10" opacity=".85"/><circle r="14" fill="${C.purin}"/></g>`;
  g += `<g transform="rotate(${f1(-rot * 1.4)}) translate(86 40)"><g>${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="-6" y="-30" width="12" height="14" rx="4" fill="#9FE0EE" transform="rotate(${i * 60})" opacity=".7"/>`).join('')}<circle r="22" fill="none" stroke="#9FE0EE" stroke-width="6" opacity=".7"/></g></g></g>`;
  // sumber: sel tubuh (kiri) dan makanan (kanan), diperkenalkan seimbang
  if (pSel > 0.01) g += `<g opacity="${f1(pSel)}" transform="translate(${SEL[0]} ${SEL[1]}) scale(${f1(0.6 + 0.4 * pSel)}) translate(${-SEL[0]} ${-SEL[1]})">${selTubuh(SEL[0], SEL[1], 118, 0.5 * clamp((t - KATA.sel) / 3), t)}<circle cx="${SEL[0]}" cy="${SEL[1]}" r="170" fill="none" stroke="${C.purin}" stroke-opacity=".25" stroke-width="3" stroke-dasharray="6 12"/></g>`;
  if (pMak > 0.01) { g += `<g opacity="${f1(pMak)}" transform="translate(${MAK[0]} ${MAK[1]}) scale(${f1(0.6 + 0.4 * pMak)}) translate(${-MAK[0]} ${-MAK[1]})"><ellipse cx="${MAK[0]}" cy="${MAK[1] + 50}" rx="190" ry="80" fill="#E9E3D2"/><ellipse cx="${MAK[0]}" cy="${MAK[1] + 40}" rx="164" ry="62" fill="#F8F4E8"/>${makanan('ikan', MAK[0] - 84, MAK[1] + 26, 1.35)}${makanan('daging', MAK[0] + 22, MAK[1] + 2, 1.35)}${makanan('kacang', MAK[0] - 12, MAK[1] + 62, 1.2)}${makanan('roti', MAK[0] + 106, MAK[1] + 52, 1.15)}</g>`; }
  // purin besar di tengah atas (kata "purin") dengan dua panah asal
  if (pPurin > 0.01) g += `<g opacity="${f1(pPurin)}">${purin(540, 600, 3.0 * (0.7 + 0.3 * pPurin), (t * 20) % 360, 1, 1)}</g>`;
  // aliran purin dari dua sumber ke alat (laju sama)
  const flow = (src, t0, ph) => { let s = ''; const j = jalur(smooth([[src[0], src[1] + 130], [src[0] + (540 - src[0]) * 0.35, src[1] + 260], [540 + (src[0] - 540) * 0.15, 830], [540, 880]], 24)); for (let i = 0; i < 9; i++) { const u = ((t - t0) * 0.34 + i / 9 + ph) % 1; if (t < t0 || u < 0) continue; const [x, y] = di(j, u); s += purin(x, y, 0.75, (u * 400 + i * 40) % 360, Math.min(1, u * 8, (1 - u) * 6), 0.4); } return s; };
  if (t > KATA.sel + 0.1) g += flow(SEL, KATA.sel + 0.1, 0);
  if (t > KATA.makanan + 0.1) g += flow(MAK, KATA.makanan + 0.1, 0.0);
  // keluaran alat: urat emas jatuh ke pembuluh
  if (pOut > 0.01) { const j = jalur([[540, 1150], [540, 1290], [560, 1400]]); for (let i = 0; i < 10; i++) { const u = ((t - KATA.terbentuk) * 0.45 + i / 10) % 1; if (t < KATA.terbentuk) continue; const [x, y] = di(j, u); g += urat(x + Math.sin(i * 3 + t * 4) * 18 * u, y, 7, Math.min(1, u * 6, (1 - u) * 2), 1); } }
  if (lbl) {
    g += pil('PURIN', 540, 392, pPurin, { warna: C.purin, size: 36, anchor: 'middle' });
    g += pil('SEL TUBUH', SEL[0], 770, pSel, { warna: '#E7A8A2', size: 32, anchor: 'middle' });
    g += pil('MAKANAN', MAK[0], 770, pMak, { warna: '#C8624F', size: 32, anchor: 'middle' });
    g += pil('URAT', 800, 1330, pUrat, { warna: C.urat, size: 38 });
    if (pUrat > 0.01) g += garis([700, 1420], [840, 1368], pUrat);
  }
  return g;
}

// ---------- ginjal
function ginjalGambar(cx, cy, s, T, p) {
  const bean = 'M-40 -250C80 -270 190 -200 200 -60C208 70 150 230 20 260C-100 280 -190 200 -200 80C-205 20 -150 -20 -130 -50C-110 -80 -130 -120 -150 -160C-170 -200 -120 -240 -40 -250Z';
  let g = `<g transform="translate(${cx} ${cy}) scale(${s})" opacity="${f1(p)}"><path d="${bean}" fill="#7A2F31" transform="translate(8 12)" opacity=".5"/><path d="${bean}" fill="${C.ginjal}"/><path d="${bean}" fill="none" stroke="${C.ginjalG}" stroke-width="8" stroke-linejoin="round"/>`;
  // piramid medula (lebih gelap) mengelilingi pelvis
  for (let i = 0; i < 6; i++) { const a = (-70 + i * 40) * Math.PI / 180, x = -40 + Math.cos(a) * 118, y = 10 + Math.sin(a) * 150; g += `<path d="M${f1(x)} ${f1(y)}L${f1(x + Math.cos(a) * 60 - 16)} ${f1(y + Math.sin(a) * 60 - 16)}L${f1(x + Math.cos(a) * 60 + 16)} ${f1(y + Math.sin(a) * 60 + 16)}Z" fill="#A8493F" opacity=".75"/>`; }
  g += `<ellipse cx="-70" cy="10" rx="62" ry="96" fill="#F1C063" opacity=".92"/><ellipse cx="-86" cy="-10" rx="22" ry="40" fill="#FFE3A0" opacity=".6"/>`;
  g += `<path d="M-110 -40C-150 -34 -176 -10 -196 10" fill="none" stroke="#F1C063" stroke-width="30" stroke-linecap="round" opacity="0"/>`;
  return g + `</g>`;
}
export function adeganGinjal(T, lbl = true) {
  const t = T;
  const pK = seg(t, 9.45, 10.2, ease.out) * (1 - seg(t, 12.2, 12.9)), pG = seg(t, KATA.ginjal - 0.2, KATA.ginjal + 0.4, ease.out), pU = seg(t, KATA.urin - 0.25, KATA.urin + 0.4, ease.out);
  // jalur: arteri ginjal (dari kiri atas) -> hilus; vena keluar ke kiri bawah; ureter ke bawah menuju kandung kemih
  const cx = 600, cy = 900, sc = 1.05;
  const A = jalur(smooth([[-40, 560], [180, 610], [330, 760], [430, 860]], 30)), V = jalur(smooth([[430, 920], [330, 1000], [180, 1120], [-40, 1200]], 30)), UR = jalur(smooth([[470, 930], [520, 1060], [560, 1280], [560, 1500]], 40));
  let g = '';
  if (pK > 0.01) {
    g += `<g opacity="${f1(pK)}">`;
    // pembuluh: arteri (merah) dan vena (biru)
    const tube = (j, w, c, cg) => `<path d="M${j.pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}" fill="none" stroke="${cg}" stroke-width="${w + 10}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${j.pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    g += tube(UR, 30, '#F1C063', '#B8862E') + tube(A, 46, C.darah, C.darahG) + tube(V, 46, '#4E6FC0', '#2A3F86');
    g += `<g transform="translate(560 1600)"><path d="M-110 -70C-110 -130 110 -130 110 -70C110 30 60 80 0 80C-60 80 -110 30 -110 -70Z" fill="#E7B04E" stroke="#B8862E" stroke-width="7"/><ellipse cx="-30" cy="-70" rx="32" ry="20" fill="#FFE3A0" opacity=".55"/></g>`;
    g += ginjalGambar(cx, cy, sc, t, 1);
    // urat dalam darah: sebagian besar keluar lewat ureter (urin), sisanya tetap di vena
    for (let i = 0; i < 26; i++) {
      const u = ((t * 0.16 + i / 26) % 1), kePipa = rnd(i, 71) < 0.68;
      if (u < 0.3) { const [x, y] = di(A, u / 0.3); g += urat(x, y, 7, 1); }
      else if (kePipa) { const v = (u - 0.3) / 0.7; if (v < 0.25) { const [x, y] = di(jalur([[430, 860], [470, 930]]), v / 0.25); g += urat(x, y, 7, 1); } else { const [x, y] = di(UR, (v - 0.25) / 0.75); g += urat(x, y, 7, pU > 0.05 ? 1 : 0.2); } }
      else { const [x, y] = di(V, (u - 0.3) / 0.7); g += urat(x, y, 7, 1); }
    }
    if (lbl) { g += pil('GINJAL', 790, 740, pG, { warna: C.ginjal, size: 38 }); g += garis([740, 800], [820, 775], pG); g += pil('URIN', 700, 1380, pU, { warna: '#F1C063', size: 38 }); g += garis([560, 1400], [706, 1410], pU); }
    g += `</g>`;
  }
  return g;
}

// ---------- adegan 3: urat menumpuk di darah (grafik sederhana tanpa angka dan tanpa ambang)
export function adeganKadar(T, lbl = true) {
  const t = T, a = 12.32;
  const p = seg(t, 12.1, 12.8, ease.out), q = (1 - seg(t, 14.45, 14.95));
  const naik = seg(t, KATA.kadar, 14.5, ease.sm);                         // kadar naik mengikuti kalimat
  const o = p * q; if (o < 0.01) return '';
  let g = `<g opacity="${f1(o)}">`;
  // kartu grafik
  const x0 = 110, y0 = 400, w = 860, h = 470;
  g += `<rect x="${x0}" y="${y0 + 10}" width="${w}" height="${h}" rx="46" fill="#000" opacity=".3"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="46" fill="#0E2A33" opacity=".96"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="46" fill="none" stroke="${GADING}" stroke-opacity=".2" stroke-width="3"/>`;
  // sumbu tanpa angka: waktu ke kanan, kadar ke atas
  const ax = x0 + 80, ay = y0 + h - 70, aw = w - 150, ah = h - 190;
  g += `<path d="M${ax} ${y0 + 110}V${ay}H${ax + aw}" fill="none" stroke="${GADING}" stroke-width="5" stroke-linecap="round" stroke-opacity=".7"/><path d="M${ax - 12} ${y0 + 130}L${ax} ${y0 + 108}L${ax + 12} ${y0 + 130}M${ax + aw - 20} ${ay - 12}L${ax + aw + 2} ${ay}L${ax + aw - 20} ${ay + 12}" fill="none" stroke="${GADING}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".7"/>`;
  // garis kadar: datar rendah lalu terus naik (tanpa garis ambang)
  const N = 60, pts = []; for (let i = 0; i <= N; i++) { const u = i / N; if (u > naik + 0.001) break; const v = 0.14 + 0.78 * Math.pow(u, 1.5) + 0.02 * Math.sin(u * 20); pts.push([ax + u * aw, ay - v * ah]); }
  if (pts.length > 1) { g += `<path d="M${pts.map((q2) => `${f1(q2[0])} ${f1(q2[1])}`).join('L')}" fill="none" stroke="${C.urat}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`; const e = pts[pts.length - 1]; g += urat(e[0], e[1], 12, 1, 1); }
  g += `</g>`;
  if (lbl) g += pil('KADAR URAT DALAM DARAH', 540, 960, o * seg(t, KATA.kadar, KATA.kadar + 0.5), { warna: C.urat, size: 30, anchor: 'middle' });
  return g;
}
