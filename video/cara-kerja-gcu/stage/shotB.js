// ADEGAN B (11,4 - 31,6 dtk): potongan strip + rangkaian pembaca di latar hijau-hutan MEDCOEL (gaya potongan transparan).
// Urutan: permukaan strip memudar jadi bening (11,4-12,4) -> darah tertarik kapiler ke saluran dan ruang reaksi (12,6-14,6) -> glukosa bertemu reagen (17-18) -> elektron/sinyal di elektroda (18,8-20,6)
// -> sinyal menelusuri dua jalur ke kontak (21-22,6) -> pin kontak meter, chip pembaca, layar (22,6-25,5) -> tarik mundur: darah tetap di strip, mesin hanya membaca sinyal (26,9-31,5).
// Semua adalah SKEMA PENJELASAN (bukan skala/warna asli). Warna dan cahaya reaksi = kode infografis.
import { f1, clamp, lerp, sm, eo, ei, eio, seg, win, MC, FONT, pchip, rad } from './core.js';
import * as A from './art.js';

export const B0 = 11.4, B1 = 31.6;
const ln = Math.log;
const CAMK = [[11.4, 0, 112, ln(18)], [12.4, 0, 100, ln(6.6)], [15.0, 0, 100, ln(6.6)], [15.55, 0, 110, ln(10.5)], [18.3, 0, 108, ln(10.5)], [18.9, 0, 112, ln(8.8)], [20.6, 0, 122, ln(8.2)], [21.4, 0, 170, ln(7.2)], [22.7, 0, 290, ln(7.0)], [23.4, 0, 345, ln(4.8)], [24.1, 0, 420, ln(4.5)], [24.9, 0, 500, ln(4.2)], [25.5, 0, 545, ln(4.2)], [26.9, 0, 400, ln(2.15)], [31.6, 0, 405, ln(2.2)]];
const fcx = pchip(CAMK.map((k) => [k[0], k[1]])), fcy = pchip(CAMK.map((k) => [k[0], k[2]])), fcs = pchip(CAMK.map((k) => [k[0], k[3]]));
export const camB = (t) => ({ cx: fcx(t), cy: fcy(t), s: Math.exp(fcs(t)) });
const toScr = (c, x, y) => [540 + (x - c.cx) * c.s, 960 + (y - c.cy) * c.s];

export const coverAt = (t) => 1 - seg(t, 11.45, 12.35, eio);
export const cutAt = (t) => seg(t, 20.6, 21.7, eio);
export function fillB(t) {
  if (t < 12.25) return 1;
  if (t < 12.62) return 1 - seg(t, 12.25, 12.62, (x) => x * x);
  if (t < 12.75) return 0;
  return seg(t, 12.75, 14.6, (x) => 1 - Math.pow(1 - x, 1.7));
}
// perjalanan sinyal: u = 0..1 (0-0,45 jalur strip, 0,45-0,65 jalur meter, 0,65-0,8 chip, 0,8-1 jalur keluar)
const SIG1 = pchip([[19.9, 0], [22.6, 0.45], [23.9, 0.65], [24.5, 0.8], [25.2, 1.0], [30.0, 1.0]]);
const SIG2 = pchip([[30.2, 0], [30.55, 0.45], [30.8, 0.65], [30.95, 0.8], [31.2, 1.0], [31.6, 1.0]]);
function sigU(t) { if (t >= 30.2) return SIG2(t); if (t >= 19.9) return SIG1(t); return -1; }
const part = (u, a, b) => (u < a ? -1 : u > b ? 1.15 : (u - a) / (b - a));
// pulsa kedua (menyusul) untuk jalur strip pada putaran pertama
export function signalParts(t) {
  const u = sigU(t); if (u < 0) return { p1: -1, p2: -1, chip: 0, p4: -1, lcd: 0 };
  const lcd = (t >= 25.2 && t < 30.2) ? 1 : t >= 30.2 ? (t >= 31.2 ? 1 : 1) : 0;
  return { p1: part(u, 0, 0.45), p2: part(u, 0.45, 0.65), chip: u > 0.62 && u < 0.84 ? Math.sin(((u - 0.62) / 0.22) * Math.PI) : 0, p4: part(u, 0.8, 1.0), lcd };
}
const lcdAlpha = (t) => (t < 30.2 ? seg(t, 25.15, 25.5) : 1);

// molekul glukosa (skema): cincin segi enam emas; enzim/reagen: bentuk "pac-man" biru-hijau
const hex = (cx, cy, r, a = 1, rotD = 0) => `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(rotD)})" opacity="${f1(a)}"><path d="${Array.from({ length: 6 }, (_, i) => { const t = (i / 6) * Math.PI * 2 - Math.PI / 2; return `${i ? 'L' : 'M'}${f1(Math.cos(t) * r)} ${f1(Math.sin(t) * r)}`; }).join('')}Z" fill="#FFD25A" stroke="#9A6A08" stroke-width="${f1(r * 0.14)}" stroke-linejoin="round"/>${Array.from({ length: 3 }, (_, i) => { const t = ((i * 2 + 1) / 6) * Math.PI * 2 - Math.PI / 2 + 0.52; return `<circle cx="${f1(Math.cos(t) * r * 1.28)}" cy="${f1(Math.sin(t) * r * 1.28)}" r="${f1(r * 0.3)}" fill="#fff" stroke="#9A6A08" stroke-width="${f1(r * 0.1)}"/>`; }).join('')}</g>`;
const enzyme = (cx, cy, r, mouth = 0.5, a = 1, rotD = 0) => `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(rotD)})" opacity="${f1(a)}"><path d="M0 0L${f1(Math.cos(rad(-30 * mouth)) * r)} ${f1(Math.sin(rad(-30 * mouth)) * r)}A${r} ${r} 0 1 0 ${f1(Math.cos(rad(30 * mouth)) * r)} ${f1(Math.sin(rad(30 * mouth)) * r)}Z" fill="#0F8F83" stroke="#06463F" stroke-width="${f1(r * 0.12)}" stroke-linejoin="round"/><circle cx="${f1(-r * 0.2)}" cy="${f1(-r * 0.35)}" r="${f1(r * 0.12)}" fill="#fff" opacity=".6"/></g>`;
const SITES = [[-9, 98, 0], [8, 93, 1], [-2, 112, 2], [9, 122, 3], [-9, 128, 4]];       // posisi reagen (enzim) pada lapisan
const MOL0 = [[-6, 88], [7, 106], [0, 120], [10, 132], [-8, 134]];
const PAD = [-9, 112];
export function chemistry(t) {
  if (t < 15.2 || t > 20.8) return '';
  let g = '';
  const aIn = seg(t, 15.2, 15.7);
  SITES.forEach(([x, y, i]) => { g += enzyme(x + 4.5, y, 4.4, 0.55 + 0.4 * Math.sin(t * 3 + i), aIn * 0.95, i % 2 ? 160 : 20); });
  MOL0.forEach(([x, y], i) => {
    const t0 = 16.7 + i * 0.22, dock = seg(t, t0, t0 + 0.55, eio), wob = [Math.sin(t * 2.1 + i * 2) * 1.6, Math.cos(t * 1.7 + i) * 1.4];
    const sx = SITES[i][0] + 1.5, sy = SITES[i][1];
    const px = lerp(x + wob[0], sx, dock), py = lerp(y + wob[1], sy, dock);
    const gone = seg(t, t0 + 0.55, t0 + 0.95);
    if (gone < 1) g += hex(px, py, 3.6 * (1 - 0.5 * gone), aIn * (1 - gone), t * 20 + i * 40);
    // kilatan infografis saat bereaksi
    const fl = win(t, t0 + 0.5, t0 + 1.05, 0.2);
    if (fl > 0.02) g += `<circle cx="${f1(sx + 2)}" cy="${f1(sy)}" r="${f1(5 + 6 * fl)}" fill="#FFF6B8" opacity="${f1(0.7 * fl)}" filter="url(#fvGlowS)"/>`;
    // elektron meninggalkan reagen menuju elektroda
    const te = t0 + 0.9, ue = seg(t, te, te + 0.9, eio);
    if (ue > 0 && ue < 1) { const ex = lerp(sx + 3, PAD[0], ue), ey = lerp(sy, PAD[1] + (i - 2) * 5, ue) - 5 * Math.sin(ue * Math.PI); g += `<circle cx="${f1(ex)}" cy="${f1(ey)}" r="2" fill="#FFE066" stroke="#9A6A08" stroke-width=".5"/><text x="${f1(ex)}" y="${f1(ey + 0.9)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="2.6" fill="#7A4D05">e</text>`; }
  });
  return g;
}
// penanda reaksi (infografis): lapisan reagen berdenyut hangat saat reaksi berlangsung
export const glowAt = (t) => win(t, 17.2, 19.2, 0.4) * 0.8 + win(t, 19.2, 20.8, 0.4) * 0.3;

export function bgDark(t, c) {
  let g = `<defs><linearGradient id="bgD" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#0F4D42"/><stop offset=".55" stop-color="#0A3830"/><stop offset="1" stop-color="#051F1B"/></linearGradient><radialGradient id="bgDg" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#00A58A" stop-opacity=".45"/><stop offset="1" stop-color="#00A58A" stop-opacity="0"/></radialGradient><radialGradient id="bgDv" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#031512" stop-opacity=".55"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#bgD)"/><rect width="1080" height="1920" fill="url(#bgDg)"/>`;
  const dy = -c.cy * 0.35, dx = -c.cx * 0.2;
  let gr = ''; for (let x = 0; x <= 1080; x += 90) gr += `<line x1="${x}" y1="0" x2="${x}" y2="1920" stroke="${MC.mint}" stroke-width="${x % 360 ? 1.4 : 2.6}" opacity="${x % 360 ? 0.07 : 0.12}"/>`;
  for (let y = -90; y <= 2010; y += 90) { const yy = y + ((dy % 90) + 90) % 90; gr += `<line x1="0" y1="${yy}" x2="1080" y2="${yy}" stroke="${MC.mint}" stroke-width="1.4" opacity=".07"/>`; }
  const arc = (x, y, w, h, rx, sw, op, col) => `<path d="M${x + w} ${y}H${x + rx}A${rx} ${rx} 0 0 0 ${x} ${y + rx}V${y + h - rx}A${rx} ${rx} 0 0 0 ${x + rx} ${y + h}H${x + w}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/>`;
  g += gr + arc(-480 + dx, 120 + dy, 1180, 1500, 220, 30, 0.08, MC.brand) + arc(-420 + dx, 250 + dy, 1000, 1240, 180, 26, 0.1, MC.mint3) + arc(-360 + dx, 370 + dy, 820, 1000, 140, 22, 0.12, MC.mint);
  const star = (sz) => `M0 ${-sz}C${sz * 0.1} ${-sz * 0.22} ${sz * 0.22} ${-sz * 0.1} ${sz} 0C${sz * 0.22} ${sz * 0.1} ${sz * 0.1} ${sz * 0.22} 0 ${sz}C${-sz * 0.1} ${sz * 0.22} ${-sz * 0.22} ${sz * 0.1} ${-sz} 0C${-sz * 0.22} ${-sz * 0.1} ${-sz * 0.1} ${-sz * 0.22} 0 ${-sz}Z`;
  [[100, 360, 24], [985, 300, 18], [1010, 1620, 28], [80, 1700, 18], [900, 1810, 16]].forEach(([x, y, sz], i) => { const tw = 0.62 + 0.38 * Math.sin(t * 1.7 + i * 1.9); g += `<g transform="translate(${x} ${f1(y + dy * 0.2)}) scale(${f1(0.9 + 0.12 * tw)})" opacity="${f1(0.5 * tw + 0.25)}"><path d="${star(sz)}" fill="${MC.gold}"/></g>`; });
  return g + `<rect width="1080" height="1920" fill="url(#bgDv)"/>`;
}

// jadwal label (waktu, kunci, teks, sisi, [x, y] su, w, maks lebar)
const L = [
  [12.95, 14.7, 'Saluran sempit', 1, [6, 52]], [13.7, 15.5, 'Ruang reaksi', 1, [17, 110]],
  [16.5, 18.5, 'Lapisan reagen', -1, [-16, 100]], [17.4, 19.1, 'Glukosa', 1, [8, 100]],
  [19.95, 21.7, 'Sinyal listrik', 1, [-4, 118]],
  [21.35, 23.2, 'Dua elektroda', -1, [-13, 235]], [22.5, 24.3, 'Kontak strip', 1, [13, 296]],
  [23.7, 25.7, 'Rangkaian pembaca', -1, [-44, 420]], [25.3, 27.3, 'Contoh hasil\n(ilustrasi)', 1, [0, 640], [540, 1700]],
  [27.0, 28.5, 'Darah tetap\ndi strip', -1, [-17, 108]], [28.7, 30.2, 'Reaksi\ndi strip', 1, [17, 100]], [30.35, 31.55, 'Mesin membaca\nsinyal', 1, [44, 420]],
];
export const LABELS_B = L;
export function maxLabelsB(dt = 0.02) { let mx = 0, at = 0; for (let t = B0; t < B1; t += dt) { const n = L.filter(([a, b]) => t >= a + 0.05 && t < b - 0.05).length + (t >= 12.3 && t < 13.4 ? 1 : 0); if (n > mx) { mx = n; at = t; } } return { mx, at }; }

export function sceneB(t) {
  const c = camB(t), cover = coverAt(t), cut = cutAt(t), fill = fillB(t), sp = signalParts(t);
  // latar: awal = warna kain (selaras akhir adegan A) -> hutan
  const bgMix = seg(t, 11.55, 12.5, eio);
  let g = `<rect width="1080" height="1920" fill="#1D7B75"/><g opacity="${f1(bgMix)}">${bgDark(t, c)}</g>`;
  const tint = A.ANALYT.glukosa;
  const glow = glowAt(t);
  const stripO = { id: 'bs', cover, fill, tint: tint.warna, tintDark: tint.gelap, glow, shadow: true };
  const asm = A.assemblySvg({ id: 'bA', cut, meter: { screen: lcdAlpha(t) > 0.02 ? { text: '92', tag: 'GLUKOSA', a: lcdAlpha(t) } : { dash: 0.8 }, sig: sp.p2, sig2: sp.p4, chip: sp.chip }, strip: stripO });
  // denyut sinyal pada dua jalur strip (di atas strip, di bawah label); terlihat setelah penutup bening
  const sig1 = sp.p1 >= 0 ? `<g transform="translate(0 0)">${A.pulse(A.TRACK_W_FULL, sp.p1, { w: 4.6 })}${A.pulse(A.TRACK_C_FULL, sp.p1, { w: 4.6 })}${sp.p1 > 0.02 && t < 22.0 ? A.pulse(A.TRACK_W_FULL, sp.p1 - 0.28, { w: 3.6, a: 0.8 }) + A.pulse(A.TRACK_C_FULL, sp.p1 - 0.28, { w: 3.6, a: 0.8 }) : ''}</g>` : '';
  // tetes di lubang masuk (mengecil saat darah ditarik)
  const dropR = 9 * (1 - 0.92 * seg(t, 12.7, 14.4));
  const drop = t > 12.6 && dropR > 0.5 ? A.blobSvg(0, -6 - dropR * 0.4, dropR, { sx: 1, sy: 0.95 }) : '';
  g += `<g transform="translate(540 960) scale(${c.s.toFixed(4)}) translate(${f1(-c.cx)} ${f1(-c.cy)})">${asm}${chemistry(t)}${sig1}${drop}${xmark(t)}</g>`;
  // label (layar)
  let lab = '';
  L.forEach(([t0, t1, txt, side, [ax, ay], pos]) => {
    const a = seg(t, t0, t0 + 0.3, eo) * (1 - seg(t, t1 - 0.3, t1)); if (a <= 0.01 || t < 11.9) return;
    const [sx, sy] = toScr(c, ax, ay); const w = A.chipW(txt.split('\n').sort((p, q) => q.length - p.length)[0], 32);
    const cx = pos ? pos[0] : side < 0 ? 24 + w / 2 : 1056 - w / 2;
    lab += A.chipSvg(sx, sy, txt, { cx, cy: pos ? pos[1] : clamp(sy, 330, 1700), a, maxw: 330 });
  });
  const rewind = win(t, 12.3, 13.4, 0.25);
  if (rewind > 0.01) lab += A.tag(540, 400, '◀◀ diputar ulang pelan', { a: rewind, fs: 30 });
  const foot = seg(t, 12.6, 13.2) * (1 - seg(t, 31.0, 31.5));
  if (foot > 0.01) lab += `<g opacity="${f1(0.92 * foot)}"><rect x="90" y="1838" width="900" height="52" rx="26" fill="${MC.ink}" opacity=".78"/><text x="540" y="1873" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="28" fill="${MC.ivory}">Skema penjelasan · bukan skala · warna dan cahaya = kode visual</text></g>`;
  return g + lab;
}
// tanda "darah tidak masuk ke mesin": panah putus-putus dari ruang reaksi ke meter, dicoret (26,9 - 28,5)
function xmark(t) {
  const a = win(t, 26.95, 28.5, 0.3); if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}"><path d="M30 118C58 150 70 210 60 262" fill="none" stroke="${MC.coral}" stroke-width="3.4" stroke-dasharray="7 6" stroke-linecap="round"/><g transform="translate(60 262)"><circle r="13" fill="${MC.ivory}" stroke="${MC.coral}" stroke-width="3.4"/><path d="M-6 -6L6 6M6 -6L-6 6" stroke="${MC.coral}" stroke-width="3.6" stroke-linecap="round"/></g></g>`;
}
