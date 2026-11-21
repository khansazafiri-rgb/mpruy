// Pandangan mikroskopis (ilustrasi): saluran pori membran dengan partikel penanda, antibodi, hCG, zona T dan zona C.
// Koordinat dunia mikro: x = arah aliran (kiri -> kanan, sama dengan sumbu strip), kamera menyusuri aliran. Semua gerak dihitung dari waktu (deterministik).
import { f1, clamp, lerp, R, T, GOLD, INK, rndf } from './lib.js';
import { CC, Y, particle, hcg, ease } from './strip.js';
const mod = (a, n) => ((a % n) + n) % n;
export const CH = { y0: 560, y1: 1060 };                 // saluran (layar)
export const V = 150;                                    // kecepatan aliran dunia (satuan/detik)
const PR = 36, YS = PR / 24;                             // jari-jari partikel dan skala antibodi
/** posisi ujung antibodi i pada partikel (rot 0): sama dengan particle() */
const tipAng = (i, rot = 0) => rot + (i * 360) / 5 + 18;
const tip = (i, rot = 0, r = PR) => { const th = tipAng(i, rot) * Math.PI / 180, d = (r - 2) + 41 * (r / 24) * 0.92; return [Math.sin(th) * d, -Math.cos(th) * d]; };
export const camBase = (tn) => 100 * (tn - 13.4);
/** latar saluran + serat membran yang ikut bergeser dengan kamera */
export function channelBg(cam, o = {}) {
  let s = `<rect x="-20" y="${CH.y0}" width="1120" height="${CH.y1 - CH.y0}" fill="#FFF0BF"/>`;
  const tileW = 540;
  for (const wall of [0, 1]) for (let k = -1; k < 4; k++) {
    const i0 = Math.floor(cam / tileW) + k, x0 = i0 * tileW - cam;
    for (let j = 0; j < 4; j++) {
      const sd = i0 * 7 + j * 13 + wall * 5, w = 90 + rndf(sd) * 90, h = 46 + rndf(sd + 1) * 52, x = x0 + j * (tileW / 4) + rndf(sd + 2) * 40;
      const y = wall ? CH.y1 - h * 0.55 : CH.y0 - h * 0.45;
      s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w)}" ry="${f1(h)}" fill="#E7D8B3" stroke="#CDBA8D" stroke-width="5"/>`;
    }
    for (let j = 0; j < 2 && !wall; j++) { const sd = i0 * 11 + j * 17 + 3, x = x0 + 120 + j * 260 + rndf(sd) * 60, y = CH.y0 + 140 + rndf(sd + 1) * 240, w = 26 + rndf(sd + 2) * 24; s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(w * 1.6)}" ry="${f1(w)}" fill="#E7D8B3" stroke="#CDBA8D" stroke-width="5" opacity=".9"/>`; }
  }
  s += `<rect x="-20" y="${CH.y0 - 14}" width="1120" height="14" fill="#CDBA8D"/><rect x="-20" y="${CH.y1}" width="1120" height="14" fill="#CDBA8D"/>`;
  return s;
}
// ---------------------------------------------------------------- aliran tunggal 8,66 - 24,6 (konjugat -> zona T)
export const BT = 1600;                                  // pusat zona T (dunia mikro)
const KTIP = 4;                                          // antibodi (indeks) pada partikel yang menangkap hCG
const tcToX0 = (tc) => BT - 100 - V * (tc - 13.4);
// kompleks = partikel yang mengikat hCG (tb) lalu tiba dan tertangkap di zona T (tc). wall 0 = dinding bawah, 1 = atas.
const CX = [
  { tb: 17.3, tc: 21.85, wall: 0, col: 0, y: 700 }, { tb: 18.1, tc: 22.15, wall: 1, col: 1, y: 900 }, { tb: 18.8, tc: 22.45, wall: 0, col: 2, y: 620 },
  { tb: 19.4, tc: 22.95, wall: 1, col: 3, y: 960 }, { tb: 20.0, tc: 23.4, wall: 0, col: 4, y: 760 }, { tb: 20.5, tc: 23.8, wall: 1, col: 0, y: 860 }, { tb: 20.9, tc: 24.2, wall: 0, col: 5, y: 660 },
].map((c, i) => { const xs = [300, 120, -60, -240, -420, -600, -780][i]; return { ...c, xs, v: (BT - 100 - xs) / (c.tc - 13.4) }; });
const ZW = 250;     // setengah lebar zona T
const colX = (c) => BT - 190 + c * 78;
const YT_LEN = 41 * (PR / 24) * 1.15, TIPD = (PR - 2) + 41 * (PR / 24) * 0.92;
const finalY = (wall) => (wall === 0 ? (CH.y1 - 2 - YT_LEN) - 22 - TIPD : (CH.y0 + 2 + YT_LEN) + 22 + TIPD);
const rotT = (wall) => (wall === 0 ? 180 - tipAng(KTIP, 0) : 0 - tipAng(KTIP, 0) + 360);
export const capturedAt = (tn) => CX.filter((c) => tn >= c.tc - 0.2).length;
/** semua benda 8,66 - 24,6. o: cam (override), zone (0..1 tampilan zona T), hcgFrom (waktu hCG mulai muncul) */
export function stream(tn, o = {}) {
  const cam = o.cam ?? camBase(tn), zone = o.zone ?? clamp((tn - 19.3) / 0.6), hcgFrom = o.hcgFrom ?? 14.2;
  let bg = '', fg = '';
  const bandX = BT - cam;
  if (zone > 0.01 && bandX > -360 && bandX < 1450) {
    const cnt = capturedAt(tn) / CX.length * clamp((tn - 21.8) / 1.0);
    bg += `<rect x="${f1(bandX - ZW)}" y="${CH.y0}" width="${2 * ZW}" height="${CH.y1 - CH.y0}" fill="${CC.line}" opacity="${f1(zone * (0.05 + 0.34 * Math.min(1, cnt * 1.1)))}"/>`;
    for (let i = 0; i < 7; i++) { const x = bandX - 190 + i * 78; fg += Y(x, CH.y1 - 2, 0, (PR / 24) * 1.15, CC.yT, { a: zone }) + Y(x, CH.y0 + 2, 180, (PR / 24) * 1.15, CC.yT, { a: zone }); }
  }
  // partikel pengisi (tidak mengikat hCG) tetap mengalir; sebagian partikel kontrol (penanda kotak)
  const fill = [[760, 640, 'det'], [980, 940, 'det'], [1160, 720, 'ctl'], [1330, 880, 'det'], [1500, 650, 'det'], [1700, 990, 'ctl'], [1900, 760, 'det'], [2100, 930, 'det'], [2250, 640, 'ctl']];
  const RL = 2300, fillA = 1 - clamp((tn - 20.4) / 0.8);
  for (let i = 0; i < fill.length; i++) {
    const [x0, y, kind] = fill[i], xw = x0 + V * (tn - 13.4) + (i % 2 ? 40 : 0), scx = mod(xw - cam + 360, RL) - 360;
    if (scx < -120 || scx > 1200 || o.noFill || fillA <= 0.01) continue;
    fg += `<g opacity="${f1(fillA * 100) / 100}">${particle(scx, y + 16 * Math.sin(tn * 1.1 + i * 2), PR, kind, { rot: 0 })}</g>`;
  }
  // hCG bebas yang tidak menempel (melintas)
  const hv = [[100, 620, 14.5], [-80, 940, 15.3], [260, 680, 16.0], [-240, 820, 16.9], [140, 1000, 18.4], [-100, 600, 19.6], [40, 1010, 20.4]];
  for (const [x0, y, te] of hv) { if (tn < Math.max(te, hcgFrom) || tn > 20.6) continue; const scx = x0 + V * 1.12 * (tn - 14.0) - cam; if (scx > -60 && scx < 1160) fg += hcg(scx, y + 14 * Math.sin(tn * 1.7 + x0), 1.4, (tn * 40 + x0) % 360); }
  // kompleks: partikel -> hCG datang dan menempel pada ujung antibodi -> tiba di zona T -> berputar menghadap dinding -> tertangkap antibodi penangkap
  for (const c of CX) {
    const xf = c.xs + c.v * (tn - 13.4) - cam, yf = c.y + 14 * Math.sin(tn * 1.1 + c.xs);
    const e = ease((tn - (c.tc - 1.0)) / 1.0), er = ease((tn - (c.tc - 1.5)) / 1.2);
    const fx = colX(c.col) - cam, fy = finalY(c.wall);
    const x = tn < c.tc - 1.0 ? xf : lerp(xf, fx, e), y = tn < c.tc - 1.0 ? yf : lerp(yf, fy, e), rot = lerp(0, rotT(c.wall), er);
    if (x < -160 || x > 1250) continue;
    fg += particle(x, y, PR, 'det', { rot });
    const [ax, ay] = tip(KTIP, rot), t0 = c.tb - 3.4, eb = ease((tn - t0) / (c.tb - t0));
    if (tn >= Math.max(hcgFrom, t0)) {
      const sxo = lerp(-760, 0, eb) * (tn < c.tb ? 1 : 0) , syo = lerp(-150 + 40 * Math.sin(tn * 2), 0, eb) * (tn < c.tb ? 1 : 0);
      fg += hcg(x + ax + sxo, y + ay + syo, 1.5, tn < c.tb ? lerp(-30, 0, eb) + ((tn * 60) % 360) * (1 - eb) : 0);
    }
  }
  return { bg, fg, bandX };
}
