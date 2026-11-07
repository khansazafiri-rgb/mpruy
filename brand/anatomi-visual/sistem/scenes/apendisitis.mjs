// Video "Kenapa usus buntu diangkat?" (75,2 dtk, 1080x1920, 30 fps). Narasi Gemini TTS yang diberikan (73,0 dtk) + kartu penutup 2,2 dtk.
// Alur: pandangan laparoskopi aktif sejak bingkai pertama -> kamera mundur ke peta perut (lokasi apendiks, tersambung ke sekum) -> pembesaran skematik potongan apendiks
// (sumbatan, lendir tertahan, tekanan, aliran darah terganggu, bakteri) -> tubuh utuh (pola nyeri) -> pemeriksaan -> penanganan -> pencegahan dan kapan memeriksakan diri.
import { FONT, MEREK } from '../tokens.mjs';
import { latar } from '../latar.mjs';
import { labelFase } from '../kerangka.mjs';
import { f1, clamp, lerp, seg, ease, jendela, kf, mix, B, BLUR_DEFS, mulus, poli } from '../tensi/util.mjs';
import * as U from '../tensi/ui.mjs';
import { KALIMAT, M, DURASI, kalimatAktif } from '../apendisitis/waktu.mjs';
import { lapDunia, AP_ANCHOR } from '../apendisitis/art-lap.mjs';
import { petaPerut, JANGKAR as JP } from '../apendisitis/art-peta.mjs';
import { penampang, PC, JANGKAR as JC } from '../apendisitis/art-penampang.mjs';
import { ikn } from '../apendisitis/ikon.mjs';
import { raka, rakaSvg, idle, lerpState } from '../../../characters/raka/raka.js';
import { teman, temanSvg, idleTeman, PENELITI } from '../../../characters/teman/teman.js';

export const meta = { id: 'apendisitis', judul: 'Apendisitis', sub: 'kenapa usus buntu diangkat', organ: 'usus', durasi: DURASI, fps: 30 };
const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta;
const K = (t, ks) => kf(t, ks, ease.sm);

// ------------------------------------------------------------------ kamera generik: [t, skala, fx, fy, sx, sy] (titik dunia (fx,fy) ke layar (sx,sy))
function kam(T, keys) {
  let a = keys[0], b = keys[keys.length - 1];
  if (T <= keys[0][0]) b = a; else if (T >= keys[keys.length - 1][0]) a = b;
  else for (let i = 0; i < keys.length - 1; i++) if (T >= keys[i][0] && T <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const u = a === b ? 0 : ease.sm(clamp((T - a[0]) / (b[0] - a[0] || 1)));
  const v = [1, 2, 3, 4, 5].map((i) => lerp(a[i], b[i], u));
  return { s: v[0], fx: v[1], fy: v[2], sx: v[3], sy: v[4], tf: `translate(${f1(v[3])} ${f1(v[4])}) scale(${f1(v[0] * 1000) / 1000}) translate(${f1(-v[1])} ${f1(-v[2])})`, p: (q) => [v[3] + (q[0] - v[1]) * v[0], v[4] + (q[1] - v[2]) * v[0]] };
}

// ------------------------------------------------------------------ parameter bagian-bagian
const LAP_KAM = [[0, 0.6, 940, 1020, 540, 900], [4.8, 1.18, 1180, 1250, 540, 900], [7.4, 1.18, 1180, 1250, 540, 900]];
const PETA_KAM = [[7.0, 0.85, 500, 650, 540, 960], [8.5, 0.85, 500, 650, 540, 960], [9.5, 1.55, 330, 1000, 470, 940], [10.2, 1.55, 330, 1000, 470, 940], [11.2, 1.1, 300, 820, 470, 960], [12.4, 1.1, 300, 820, 470, 960], [13.6, 1.85, 335, 1040, 470, 940], [17.8, 1.85, 335, 1040, 470, 940], [36.4, 1.85, 335, 1040, 470, 940], [37.4, 0.85, 500, 650, 540, 960]];
const SEK_KAM = [[16.9, 0.95, 500, 700, 540, 940], [19.6, 0.95, 500, 700, 540, 940], [20.6, 1.5, 500, 480, 540, 900], [24.9, 1.5, 500, 480, 540, 900], [26.0, 1.15, 520, 640, 540, 930], [31.0, 1.15, 520, 640, 540, 930], [32.0, 0.95, 520, 700, 540, 940], [36.6, 0.95, 520, 700, 540, 940]];

function secParam(T) {
  const kindT = T < 25.1;
  const sumbat = T < 19.6 ? null : T < 23.0 ? { kind: 'tinja', k: seg(T, 21.25, 22.3) * (1 - seg(T, 22.7, 23.0)) } : T < 25.1 ? { kind: 'limfoid', k: seg(T, 23.05, 24.2) * (1 - seg(T, 24.8, 25.1)) } : { kind: 'tinja', k: seg(T, 25.2, 26.0) };
  const bakt = seg(T, 35.35, 36.6), aliran = 1 - 0.78 * seg(T, 33.75, 35.4), iskemia = 0.85 * seg(T, 34.0, 36.2), radang = 0.12 * seg(T, 28, 31) + 0.85 * seg(T, 34.8, 36.8);
  return { sumbat, d: 0.04 + 0.06 * seg(T, 28.4, 31.3) + 0.9 * seg(T, 31.9, 34.4), tekanan: seg(T, 31.4, 32.5) * (T < 37 ? 1 : 0), aliran, iskemia, radang, bakteri: bakt, muc: 0.9 * seg(T, 28.3, 32.4), mucT0: M.s8.lendir, mucT1: 31.2 };
}
// fase aliran darah terintegrasi (kecepatan berubah mulus)
const DT = 1 / 60; const NF = Math.ceil(DURASI / DT) + 4; const FA = new Float32Array(NF);
{ let s = 0; for (let i = 1; i < NF; i++) { s += (0.25 + 0.75 * secParam(i * DT).aliran) * DT; FA[i] = s; } }
const faseAliran = (T) => { const x = Math.max(0, T) / DT, i = Math.min(NF - 2, Math.floor(x)); return FA[i] + (FA[i + 1] - FA[i]) * (x - i); };

// ------------------------------------------------------------------ adegan
function adegan(T, opt, ctx) {
  let svg = '', lab = [];
  const { sc } = ctx;
  // ============ A. LAPAROSKOP (0 - 8,6) ============
  const lapOp = 1 - seg(T, 8.2, 8.7);
  let lapSvg = '';
  if (T < 10.9) {
    const svgA = svg; svg = '';
    const kL = kam(T, LAP_KAM);
    const R = T < 7.1 ? 500 : lerp(500, 150, ease.inOut(seg(T, 7.1, 8.4, ease.lin))) * (1 - 0.0), Cx = lerp(540, 870, ease.inOut(seg(T, 7.1, 8.4, ease.lin))), Cy = lerp(900, 540, ease.inOut(seg(T, 7.1, 8.4, ease.lin)));
    const rs = R / 500, sway = [Math.sin(T * 1.9) * 7, Math.cos(T * 1.4) * 6];
    const alat = { u: seg(T, 0, 4.6, ease.inOut) * 0.92 + 0.08 * seg(T, 0, 4.6), buka: 0.85 - 0.5 * seg(T, 0.5, 4.6) };
    const L = lapDunia({ T, infl: 1, alat });
    const cx = kL.sx + 0, cy = kL.sy;
    // dunia laparoskop dalam lingkaran (dengan goyang halus), lalu bingkai skop
    svg += `<g opacity="${f1(1 - seg(T, 10.2, 10.9))}"><clipPath id="lapC"><circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(R)}"/></clipPath>`;
    svg += `<circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(R + 18)}" fill="#05090C"/>`;
    svg += `<g clip-path="url(#lapC)"><g transform="translate(${f1(Cx)} ${f1(Cy)}) scale(${f1(rs)}) translate(${f1(-540 + sway[0])} ${f1(-900 + sway[1])}) ${kL.tf}">${L.svg}`;
    // sorot pulsa pada apendiks saat pertanyaan (5,86-7,27)
    const pr = jendela(T, 5.7, 7.5, 0.3);
    if (pr > 0.01) svg += `<circle cx="1190" cy="1230" r="${f1(210 + 14 * Math.sin(T * 6))}" fill="none" stroke="${EMAS}" stroke-width="9" stroke-dasharray="26 18" opacity="${f1(pr)}"/>`;
    svg += `</g>`;
    // vinyet lensa + kilau
    svg += `<radialGradient id="lapV" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient><circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(R)}" fill="url(#lapV)"/>`;
    svg += `<ellipse cx="${f1(Cx - R * 0.45)}" cy="${f1(Cy - R * 0.55)}" rx="${f1(R * 0.34)}" ry="${f1(R * 0.12)}" fill="#fff" opacity=".07" transform="rotate(-34 ${f1(Cx - R * 0.45)} ${f1(Cy - R * 0.55)})"/></g>`;
    svg += `<circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(R + 8)}" fill="none" stroke="#3A444E" stroke-width="16"/><circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(R + 18)}" fill="none" stroke="#9AA5B1" stroke-width="3" opacity=".7"/>`;
    ctx.lapPos = { Cx, Cy, R };
    // label (proyeksi ke layar)
    const proj = (q) => { const x = (q[0] - kL.fx) * kL.s + kL.sx - 540 + sway[0] * -1, y = (q[1] - kL.fy) * kL.s + kL.sy - 900 + sway[1] * -1; return [Cx + x * rs, Cy + y * rs]; };
    const pT = (q) => { const a = proj(q); return [a[0], a[1]]; };
    const gx = lerp(-300, 1156, ease.inOut(seg(T, 0, 4.6, ease.inOut)) ), gy = lerp(1960, 1380, ease.inOut(seg(T, 0, 4.6, ease.inOut)));
    lab.push({ t0: 1.0, t1: 2.9, item: [{ teks: 'Apendiks\nmeradang', a: pT([1190, 1200]), warna: '#D94A55' }, { teks: 'Sekum', a: pT([760, 700]), warna: '#E9B9A2' }] });
    lab.push({ t0: 3.1, t1: 5.5, item: [{ teks: 'Instrumen\ndokter', a: pT([gx - 40, gy - 6]), warna: '#B9C2CC' }, { teks: 'Apendiks', a: pT([1250, 1330]), warna: '#D94A55' }] });
    lapSvg = svg; svg = svgA;
  }
  // ============ B. PETA PERUT (7 - 18, kembali 36,4 - 38) ============
  const petaOp = Math.max(seg(T, 7.4, 8.4) * (1 - seg(T, 17.0, 17.9)), seg(T, 36.3, 36.9) * (1 - seg(T, 37.6, 38.2)));
  if (petaOp > 0.01) {
    const kP = kam(T, PETA_KAM);
    const rad = 0.0 + seg(T, M.s5.meradang + 0.2, 15.2);
    const sorot = jendela(T, 8.2, 10.4, 0.4) + 0.0 * 1 + (T > 36 ? 0.6 : 0) + 0.5 * seg(T, 12.5, 13.3) * (1 - seg(T, 16.7, 17.1));
    const P = petaPerut({ T, sorot: clamp(sorot), radang: rad, kolonSorot: jendela(T, 10.3, 12.5, 0.4), redup: 0.0 });
    svg += `<g opacity="${f1(petaOp)}"><g transform="${kP.tf}">${P.svg}</g></g>`;
    ctx.pPeta = (q) => kP.p(q);
    const A = (q) => kP.p(q);
    lab.push({ t0: M.s5.meradang - 0.0 + 0.4, t1: 16.7, item: [{ teks: 'Apendisitis', a: A([360, 1060]), warna: '#D94A55' }, { teks: 'Radang\nusus buntu', a: A([300, 1000]), warna: '#F2735E' }].slice(0, 2) });
    lab.push({ t0: 8.5, t1: 10.1, item: [{ teks: 'Apendiks', a: A(JP.apendiks), warna: '#D94A55' }, { teks: 'Fossa iliaka\nkanan', a: A([230, 1100]), warna: '#F8C038' }] });
    lab.push({ t0: 10.5, t1: 12.2, item: [{ teks: 'Sekum', a: A(JP.sekum), warna: '#E9B9A2' }, { teks: 'Usus besar', a: A([250, 620]), warna: '#C99573' }, { teks: 'Ileum\n(usus halus)', a: A(JP.ileum), warna: '#D88E86' }] });
  }
  // PIP kamera laparoskop (kecil di kanan atas peta) 8,4 - 10,4
  if (T > 8.3 && T < 10.8 && ctx.lapPos == null) { /* dihapus: PIP digambar dari bagian laparoskop */ }
  // ============ C. LENSA + POTONGAN APENDIKS (16,9 - 37,3) ============
  const lens = Math.max(0, seg(T, 16.7, 17.9, ease.inOut) * (1 - seg(T, 36.5, 37.5, ease.inOut)));
  if (lens > 0.001) {
    const kS = kam(T, SEK_KAM), a0 = ctx.pPeta ? ctx.pPeta([335, 1042]) : [470, 940];
    const Rl = lerp(70, 1500, lens), Cx = lerp(a0[0], 540, lens), Cy = lerp(a0[1], 930, lens);
    const sp = secParam(T);
    const S = penampang({ T, d: sp.d, radang: sp.radang, iskemia: sp.iskemia, tekanan: sp.tekanan, aliran: sp.aliran, ph: faseAliran(T), fase: T, bakteri: sp.bakteri, muc: sp.muc, mucT0: sp.mucT0, mucT1: sp.mucT1, sumbat: sp.sumbat, sorot: { ostium: jendela(T, 17.8, 20.6, 0.4) + 0.5 * jendela(T, 19.4, 20.4, 0.2), drain: T < 19.7 ? seg(T, 17.7, 18.3) * (1 - seg(T, 19.3, 19.7)) : 0 } });
    svg += `<clipPath id="lensC"><circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(Rl)}"/></clipPath><g clip-path="url(#lensC)"><rect x="-100" y="-100" width="1300" height="2100" fill="#10282C"/><g transform="translate(540 930) scale(1.0) translate(-540 -930)">`;
    svg += `<g transform="${kS.tf}">${S.svg}${tekananPanah(T, S, sp)}${sumbatMarka(T, S)}</g></g></g>`;
    svg += `<circle cx="${f1(Cx)}" cy="${f1(Cy)}" r="${f1(Rl)}" fill="none" stroke="${EMAS}" stroke-width="${f1(10 * (1 - 0.6 * lens) + 4)}" opacity="${f1(0.95 * (1 - seg(T, 17.9, 18.3)) * 1 + 0.0)}"/>`;
    ctx.pSek = (q) => kS.p(q);
    const A = (q) => kS.p(q);
    const J = JC;
    lab.push({ t0: 17.8, t1: 19.3, item: [{ teks: 'Sekum', a: A(J.sekum), warna: '#CA6470' }, { teks: 'Apendiks', a: A(J.tengah), warna: '#DD8D95' }, { teks: 'Pintu saluran\n(ostium)', a: A(J.ostium), warna: '#F8C038' }] });
    lab.push({ t0: 19.45, t1: 20.8, item: [{ teks: 'Tersumbat', a: A(J.ostium), warna: '#E5483F' }] });
    lab.push({ t0: 21.15, t1: 22.95, item: [{ teks: 'Tinja\nmengeras', a: A([500, 420]), warna: '#8A5C34' }] });
    lab.push({ t0: 23.1, t1: 24.9, item: [{ teks: 'Jaringan\nmembengkak', a: A([440, 460]), warna: '#E3B6D2' }] });
    lab.push({ t0: 26.15, t1: 27.9, item: [{ teks: 'Lendir dari\ndinding', a: A([560, 700]), warna: '#E7D79A' }] });
    lab.push({ t0: 28.45, t1: 31.0, item: [{ teks: 'Jalan keluar\ntertutup', a: A([500, 430]), warna: '#E5483F' }, { teks: 'Lendir\ntertahan', a: A([548, 850]), warna: '#E7D79A' }] });
    lab.push({ t0: 31.45, t1: 32.5, item: [{ teks: 'Tekanan\nnaik', a: A([548, 700]), warna: '#F8C038' }] });
    lab.push({ t0: 32.6, t1: 33.7, item: [{ teks: 'Dinding\nmeregang', a: A([600, 880]), warna: '#DD8D95' }] });
    lab.push({ t0: 33.8, t1: 35.3, item: [{ teks: 'Aliran darah\nterganggu', a: A([330, 640]), warna: '#6C5A8E' }] });
    lab.push({ t0: 35.4, t1: 36.5, item: [{ teks: 'Bakteri\nberkembang', a: A([560, 1000]), warna: '#8CD64A' }, { teks: 'Peradangan', a: A([620, 1100]), warna: '#C2434F' }] });
  }

  svg += lapSvg;
  // PIP: keterangan kamera
  if (T > 8.5 && T < 10.6) svg += U.pil(700, 722, 'Pandangan kamera', { size: 28, p: jendela(T, 8.5, 10.6, 0.3) });
  // ============ D. TUBUH UTUH (37,4 - 52,2): pasien (Raka) + pola nyeri ============
  const bodyOp = seg(T, 37.3, 38.0) * (1 - seg(T, 51.9, 52.4));
  if (bodyOp > 0.01) {
    const k1 = lerp(1.25, 0.78, ease.inOut(seg(T, 40.0, 40.9))), k2 = lerp(0.78, 0.98, ease.inOut(seg(T, 45.6, 46.3)));
    const kk = T < 45.6 ? k1 : k2;
    const xx = T < 45.6 ? 540 : lerp(540, 330, ease.inOut(seg(T, 45.6, 46.3))), fy = T < 40.0 ? 1540 : lerp(1540, 1530, ease.inOut(seg(T, 40.0, 40.9)));
    const nyP = seg(T, 37.8, 38.8) * (1 - seg(T, 42.8, 44.0)), nyK = seg(T, 43.3, 44.8) * (T < 67 ? 1 : 0);
    const ex = T < 46 ? 'perih' : 'khawatir';
    svg += `<g opacity="${f1(bodyOp)}">` + pasien(T, { x: xx, fy, k: kk, ekspresi: ex, nyP, nyK }) + `</g>`;
    const ab = (u, v) => [xx + (u - 200) * kk, fy - (778 - v) * kk];
    // peta kecil sebagai inset lokasi (S11), lalu kartu peritoneum (S12)
    const inset = jendela(T, 37.9, 40.8, 0.4);
    if (inset > 0.01) { const P2 = petaPerut({ T, nyeri: { pusat: nyP, kanan: 0 }, radang: 1, sorot: 0 }); svg += `<g opacity="${f1(inset * bodyOp)}"><g transform="translate(700 330) scale(0.33)">${P2.svg}</g>${U.pil(700, 770, 'Peta perut', { size: 26 })}</g>`; }
    svg += kartuPeritoneum(T) ;
    svg += simpton(T);
    lab.push({ t0: 38.0, t1: 40.0, item: [{ teks: 'Nyeri samar\nsekitar pusar', a: ab(200, 505), warna: '#FF9A3C' }] });
    lab.push({ t0: 44.2, t1: 45.3, item: [{ teks: 'Lebih jelas\ndi kanan bawah', a: ab(165, 552), warna: '#FF4A3C' }] });
  }
  // ============ E. PEMERIKSAAN (52,3 - 57,6) ============
  const klOp = jendela(T, 52.3, 57.7, 0.5);
  if (klOp > 0.01) svg += `<g opacity="${f1(klOp)}">${pemeriksaan(T)}</g>`;
  // ============ F. PENANGANAN (57,9 - 63,9) ============
  const trOp = jendela(T, 57.9, 63.9, 0.5);
  if (trOp > 0.01) svg += `<g opacity="${f1(trOp)}">${penanganan(T)}</g>`;
  // ============ G. PENCEGAHAN (64,1 - 67,4) ============
  const prOp = jendela(T, 64.1, 67.4, 0.5);
  if (prOp > 0.01) svg += `<g opacity="${f1(prOp)}">${pencegahan(T)}</g>`;
  // ============ H. TINDAKAN (67,3 - 72,9) ============
  const acOp = jendela(T, 67.3, 72.95, 0.5);
  if (acOp > 0.01) {
    const g = seg(T, 68.3, 70.5);
    svg += `<g opacity="${f1(acOp)}">` + pasien(T, { x: 560, fy: 1540, k: 0.92, ekspresi: 'perih', nyP: 0, nyK: 0.45 + 0.55 * g }) + `</g>`;
    const P2 = petaPerut({ T, nyeri: { pusat: 0, kanan: 0.4 + 0.6 * g }, radang: 1, sorot: 0 });
    svg += `<g opacity="${f1(acOp)}"><g transform="translate(750 360) scale(0.27)">${P2.svg}</g></g>`;
    svg += pengingat(T, acOp);
  }
  // ============ I. KARTU PENUTUP ============
  svg += kartuAkhir(T);
  return { svg, lab };
}

// panah tekanan ke luar dari lumen (koordinat penampang)
function tekananPanah(T, S, sp) {
  const a = sp.tekanan; if (a < 0.02) return '';
  let s = `<g opacity="${f1(a * (T < 36.2 ? 1 : 1 - seg(T, 36.2, 36.6)))}" fill="none" stroke="${EMAS}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">`;
  for (let i = 0; i < 7; i++) { const t = 0.22 + i * 0.11, k = Math.min(PC.length - 1, Math.round(t * (PC.length - 1))), q = PC[k], q2 = PC[Math.min(PC.length - 1, k + 1)], dx = q2[0] - PC[Math.max(0, k - 1)][0], dy = q2[1] - PC[Math.max(0, k - 1)][1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; const w = S.lumW(t) + 4, pul = 6 * Math.sin(T * 5 + i);
    for (const sd of [-1, 1]) { const bx = q[0] + nx * sd * (w * 0.55), by = q[1] + ny * sd * (w * 0.55), tx = bx + nx * sd * (24 + pul), ty = by + ny * sd * (24 + pul); s += `<path d="M${f1(bx)} ${f1(by)}L${f1(tx)} ${f1(ty)}M${f1(tx - ny * sd * 9 * -1 - nx * sd * 9)} ${f1(ty - nx * sd * 9 * 1 * -1 * -1 - ny * sd * 9)}L${f1(tx)} ${f1(ty)}L${f1(tx + ny * sd * 9 * -1 * -1 - nx * sd * 9)} ${f1(ty - nx * sd * 9 * -1 - ny * sd * 9)}"/>`; } }
  return s + `</g>`;
}
// tanda "x" pada ostium saat tersumbat (jalan keluar tertutup)
function sumbatMarka(T, S) {
  const a = jendela(T, 28.4, 31.2, 0.3) + jendela(T, 19.45, 20.7, 0.2); if (a < 0.02) return '';
  const o = clamp(a);
  return `<g opacity="${f1(o)}" fill="none" stroke="#E5483F" stroke-width="9" stroke-linecap="round"><path d="M470 400l60 -50M530 400l-60 -50" transform="translate(0 10)"/></g>`;
}


function chip2(teks, p) {
  if (p <= 0.01) return '';
  const w = 84 + teks.length * 19.5;
  return `<g opacity="${f1(p)}" transform="translate(${f1((1 - p) * -24)} 0)"><rect x="64" y="104" width="${f1(w)}" height="64" rx="32" fill="#06161A" opacity=".55"/><rect x="64" y="100" width="${f1(w)}" height="64" rx="32" fill="${GADING}"/><circle cx="98" cy="132" r="11" fill="${EMAS}" stroke="${TINTA}" stroke-opacity=".35" stroke-width="2"/><text x="124" y="143" font-family="${FONT}" font-weight="800" font-size="30" fill="${TINTA}">${teks.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></g>`;
}
// ------------------------------------------------------------------ pasien (Raka) dengan pendar nyeri pada perut
function pasien(T, { x, fy, k, ekspresi = 'perih', nyP = 0, nyK = 0 }) {
  const st = idle(raka(ekspresi, 'pegang_perut', { lean: 1 }), T);
  const tf = `translate(${f1(x - 200 * k)} ${f1(fy - 778 * k)}) scale(${f1(k * 1000) / 1000})`;
  let g = `<g transform="${tf}"><ellipse cx="200" cy="782" rx="150" ry="14" fill="#02100E" opacity=".4" filter="${B(6)}"/>${rakaSvg(st, { bare: true, uid: 'pk', outfit: 'santai', dark: true })}`;
  if (nyP > 0.01) g += `<circle cx="200" cy="512" r="${f1(70 + 6 * Math.sin(T * 3))}" fill="#FF9A3C" opacity="${f1(0.55 * nyP)}" filter="${B(14)}"/><circle cx="200" cy="512" r="${f1(30)}" fill="#FFD27A" opacity="${f1(0.6 * nyP)}" filter="${B(6)}"/>`;
  if (nyK > 0.01) g += `<circle cx="160" cy="554" r="${f1(46 + 5 * Math.sin(T * 4))}" fill="#FF4A3C" opacity="${f1(0.6 * nyK)}" filter="${B(10)}"/><circle cx="160" cy="554" r="${f1(20)}" fill="#FFB07A" opacity="${f1(0.7 * nyK)}" filter="${B(5)}"/>`;
  return g + `</g>`;
}
// ------------------------------------------------------------------ kartu: potongan dinding perut (peritoneum)
function kartuPeritoneum(T) {
  const a = jendela(T, 40.5, 45.7, 0.5); if (a < 0.01) return '';
  const x0 = 64, y0 = 300, w = 952, h = 600, mv = ease.inOut(seg(T, 41.0, 43.0)), iri = seg(T, 42.9, 43.6), sp = seg(T, 43.4, 44.4);
  const cy = lerp(520, 372, mv), L = (y) => y0 + y;
  let s = `<g opacity="${f1(a)}">` + U.kartu(x0, y0, w, h, 'Potongan dinding perut (skematis)', 1);
  s += `<clipPath id="kpC"><rect x="${x0 + 18}" y="${y0 + 80}" width="${w - 36}" height="${h - 98}" rx="26"/></clipPath><g clip-path="url(#kpC)">`;
  s += `<rect x="${x0}" y="${L(80)}" width="${w}" height="26" fill="#D9A57B"/><rect x="${x0}" y="${L(106)}" width="${w}" height="66" fill="#F2C65A" opacity=".9"/><rect x="${x0}" y="${L(172)}" width="${w}" height="86" fill="#C9606A"/>`;
  for (let i = 0; i < 9; i++) s += `<path d="M${x0 + i * 120} ${L(176)}q60 40 120 0" stroke="#E9A0A6" stroke-width="5" fill="none" opacity=".5"/>`;
  s += `<rect x="${x0}" y="${L(258)}" width="${w}" height="12" fill="${mix('#F4D9D2', '#E5483F', iri)}"/><rect x="${x0}" y="${L(270)}" width="${w}" height="${h}" fill="#1B1218"/>`;
  s += `<rect x="${x0}" y="${L(256)}" width="${w}" height="16" fill="#E5483F" opacity="${f1(0.5 * iri)}" filter="${B(6)}"/>`;
  // apendiks (penampang melintang) meradang menempel pada peritoneum
  const ax = x0 + 640, ay = y0 + cy;
  s += `<circle cx="${ax}" cy="${f1(ay)}" r="88" fill="#C2243A" opacity=".95"/><circle cx="${ax}" cy="${f1(ay)}" r="64" fill="#8E1F33"/><circle cx="${ax}" cy="${f1(ay)}" r="34" fill="#E7D79A"/><circle cx="${ax - 24}" cy="${f1(ay - 26)}" r="14" fill="#fff" opacity=".35"/>`;
  s += `<ellipse cx="${ax - 40}" cy="${f1(ay - 70)}" rx="${f1(60 * mv + 4)}" ry="14" fill="#F1E3B0" opacity="${f1(0.7 * mv)}" filter="${B(4)}"/>`;
  // sinyal nyeri ke permukaan (titik emas naik dari peritoneum ke kulit)
  if (sp > 0.01) for (let i = 0; i < 6; i++) { const u = ((T * 0.8 + i / 6) % 1), yy = L(262) - u * 170; s += `<circle cx="${ax - 40 + Math.sin(u * 9 + i) * 10}" cy="${f1(yy)}" r="7" fill="${EMAS}" opacity="${f1(sp * Math.min(1, u * 6, (1 - u) * 5))}"/>`; }
  s += `</g>`;
  const tx = (y, t2) => `<text x="${x0 + 34}" y="${L(y)}" font-family="${FONT}" font-weight="700" font-size="27" fill="${GADING}">${t2}</text>`;
  s += `<g><text x="${x0 + 34}" y="${L(100)}" font-family="${FONT}" font-weight="800" font-size="28" fill="#2A1A10">Kulit</text><text x="${x0 + 34}" y="${L(146)}" font-family="${FONT}" font-weight="800" font-size="28" fill="#2A1A10">Lemak</text><text x="${x0 + 34}" y="${L(222)}" font-family="${FONT}" font-weight="800" font-size="28" fill="#fff">Otot dinding perut</text></g>`;
  s += `<text x="${x0 + 34}" y="${L(300)}" font-family="${FONT}" font-weight="800" font-size="27" fill="#FFD1CB" opacity="${f1(0.85)}">Peritoneum</text><text x="${x0 + 34}" y="${L(334)}" font-family="${FONT}" font-weight="600" font-size="23" fill="${GADING}" opacity=".8">lapisan dinding perut</text>`;
  s += `<text x="${x0 + 34}" y="${L(572)}" font-family="${FONT}" font-weight="800" font-size="28" fill="${GADING}">Apendiks meradang</text>`;
  s += `<g opacity="${f1(iri)}"><text x="${x0 + 34}" y="${L(420)}" font-family="${FONT}" font-weight="800" font-size="29" fill="${EMAS}">Peradangan mengiritasi</text><text x="${x0 + 34}" y="${L(456)}" font-family="${FONT}" font-weight="800" font-size="29" fill="${EMAS}">lapisan dinding perut</text></g>`;
  return s + `</g>`;
}
// gejala penyerta (S13)
function simpton(T) {
  const a = jendela(T, 45.9, 52.0, 0.4); if (a < 0.01) return '';
  const it = [[M.s13.mual, 'Mual', ikn.mual], [M.s13.nafsu, 'Hilang nafsu makan', ikn.makan], [M.s13.demam, 'Demam', ikn.termometer]];
  let s = `<g opacity="${f1(a)}">`;
  it.forEach(([t0, teks, ic], i) => { const p = seg(T, t0 - 0.1, t0 + 0.4, ease.out); if (p < 0.01) return; const y = 380 + i * 190, x = 600; s += `<g opacity="${f1(p)}" transform="translate(${f1((1 - p) * 40)} 0)"><rect x="${x - 40}" y="${y + 8}" width="480" height="150" rx="40" fill="#000" opacity=".3"/><rect x="${x - 40}" y="${y}" width="480" height="150" rx="40" fill="${GADING}"/>${ic(x + 36, y + 76, 1.0)}<text x="${x + 100}" y="${y + 88}" font-family="${FONT}" font-weight="800" font-size="31" fill="${TINTA}">${teks}</text></g>`; });
  const p2 = seg(T, M.s13.takSama, M.s13.takSama + 0.5, ease.out);
  if (p2 > 0.01) s += `<g opacity="${f1(p2)}"><rect x="570" y="${962}" width="470" height="110" rx="55" fill="${EMAS}"/><text x="805" y="${1007}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="31" fill="${TINTA}">Tidak selalu sama</text><text x="805" y="${1048}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="31" fill="${TINTA}">pada setiap orang</text></g>`;
  return s + `</g>`;
}
// pemeriksaan: dokter (Tala berjas) dan pasien (Raka), tiga langkah
function pemeriksaan(T) {
  const st = [[M.s14.gejala - 0.1, M.s14.periksa - 0.05, 'Tanya gejala', ikn.stetoskop], [M.s14.periksa, M.s14.tes - 0.05, 'Periksa perut', ikn.tangan], [M.s14.tes, 57.4, 'Tes darah\natau pencitraan\n(bila perlu)', null]];
  let s = '';
  st.forEach(([t0, t1, teks, ic], i) => {
    const x = 64 + i * 322, on = seg(T, t0, t0 + 0.3) * (1 - seg(T, t1 - 0.2, t1 + 0.1) * (i < 2 ? 0.6 : 0)), y = 320;
    s += `<g opacity="${f1(0.55 + 0.45 * on)}"><rect x="${x}" y="${y + 8}" width="300" height="430" rx="40" fill="#000" opacity=".3"/><rect x="${x}" y="${y}" width="300" height="430" rx="40" fill="#0B2630" opacity=".95"/><rect x="${x}" y="${y}" width="300" height="430" rx="40" fill="none" stroke="${on > 0.5 ? EMAS : '#F8F7F3'}" stroke-opacity="${on > 0.5 ? 1 : 0.2}" stroke-width="${on > 0.5 ? 6 : 2.5}"/>`;
    s += `<circle cx="${x + 150}" cy="${y + 120}" r="70" fill="${GADING}" opacity=".95"/>`;
    if (ic) s += ic(x + 150, y + 120, 1.15);
    else s += `${ikn.tabung(x + 118, y + 122, 0.95, seg(T, M.s14.tes, M.s14.tes + 0.3) * (1 - 0.5 * seg(T, M.s14.citra, M.s14.citra + 0.3)))}${ikn.scan(x + 186, y + 124, 0.8, seg(T, M.s14.citra, M.s14.citra + 0.4))}`;
    teks.split('\n').forEach((l, j) => { s += `<text x="${x + 150}" y="${y + 262 + j * 44}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${i === 2 ? 31 : 36}" fill="${GADING}">${l}</text>`; });
    s += `</g>`;
  });
  // dokter dan pasien
  const tl = idleTeman(teman('fokus', T > M.s14.tes ? 'tunjuk' : 'catat'), T), rk = idle(raka('khawatir', 'pegang_perut', { lean: 1 }), T);
  s += `<g transform="translate(${f1(300 - 200 * 0.74)} ${f1(1530 - 778 * 0.74)}) scale(0.74)">${temanSvg(tl, { bare: true, uid: 'tdk', outfit: 'jas', glasses: true, palette: PENELITI })}</g>`;
  s += `<g transform="translate(${f1(760 - 200 * 0.74)} ${f1(1530 - 778 * 0.74)}) scale(0.74)">${rakaSvg(rk, { bare: true, uid: 'rkp', outfit: 'santai', dark: true })}</g>`;
  const pk = jendela(T, M.s14.periksa, M.s14.tes - 0.1, 0.2);
  if (pk > 0.01) s += `<g opacity="${f1(pk)}">${ikn.tangan(700 + Math.sin(T * 8) * 6, 1300 + Math.cos(T * 8) * 4, 0.9)}<circle cx="700" cy="1318" r="${f1(50 + 8 * Math.sin(T * 8))}" fill="none" stroke="${EMAS}" stroke-width="5" opacity=".8"/></g>`;
  return s;
}
// penanganan: pengangkatan (sering) dan antibiotik (kasus tertentu)
function penanganan(T) {
  const aA = jendela(T, 58.0, 60.4, 0.2) + 0.5 * seg(T, 60.4, 61.0) * (1 - seg(T, 61.7, 62.2));
  const aB = seg(T, M.s15.tertentu, M.s15.tertentu + 0.5);
  let s = '';
  const card = (y, judul, tag, hi, inner) => `<g><rect x="64" y="${y + 8}" width="952" height="520" rx="48" fill="#000" opacity=".3"/><rect x="64" y="${y}" width="952" height="520" rx="48" fill="#0B2630" opacity=".95"/><rect x="64" y="${y}" width="952" height="520" rx="48" fill="none" stroke="${hi > 0.5 ? EMAS : '#F8F7F3'}" stroke-opacity="${hi > 0.5 ? 1 : 0.2}" stroke-width="${hi > 0.5 ? 6 : 2.5}"/><text x="112" y="${y + 84}" font-family="${FONT}" font-weight="800" font-size="46" fill="${GADING}">${judul}</text>${U.pil(112, y + 108, tag, { fill: hi > 0.5 ? EMAS : '#F8F7F3', size: 28 })}${inner}</g>`;
  const mini = `<g transform="translate(700 ${340}) scale(0.28)" opacity=".95">${petaPerut({ T, radang: 1, sorot: 0 }).svg}</g><circle cx="${700 + 120}" cy="${340 + 160}" r="5" fill="${EMAS}"/><circle cx="${700 + 70}" cy="${340 + 220}" r="5" fill="${EMAS}"/><circle cx="${700 + 160}" cy="${340 + 230}" r="5" fill="${EMAS}"/>`;
  s += card(330, 'Pengangkatan apendiks', 'sering menjadi penanganan', aA, `<g>${ikn.laparoskop(300, 600, 2.1)}<text x="112" y="${330 + 400}" font-family="${FONT}" font-weight="600" font-size="31" fill="${GADING}" opacity=".9">lewat sayatan kecil (laparoskopi)</text><text x="112" y="${330 + 444}" font-family="${FONT}" font-weight="600" font-size="31" fill="${GADING}" opacity=".9">atau operasi terbuka, sesuai penilaian dokter</text>${mini}</g>`);
  s += card(880 + 40, 'Antibiotik', 'pada kasus tertentu', aB, `<g>${ikn.infus(260, 1235, 1.5)}${ikn.pil(430, 1250, 1.6)}<text x="112" y="${920 + 440}" font-family="${FONT}" font-weight="600" font-size="31" fill="${GADING}" opacity=".9">dokter yang mempertimbangkan dan menilai</text><text x="112" y="${920 + 484}" font-family="${FONT}" font-weight="600" font-size="31" fill="${GADING}" opacity=".9">apakah cocok untuk pasien tertentu</text></g>`);
  return s;
}
function pencegahan(T) {
  const p = seg(T, 64.4, 65.2, ease.out);
  return `<g opacity="${f1(p)}"><circle cx="540" cy="900" r="${f1(250 + 8 * Math.sin(T * 3))}" fill="#0B2630" opacity=".9" stroke="${GADING}" stroke-opacity=".25" stroke-width="3"/>${ikn.perisai(540, 880, 4.0)}<text x="540" y="1250" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="52" fill="${GADING}">Belum ada cara</text><text x="540" y="1316" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="52" fill="${EMAS}">yang terbukti pasti</text></g>`;
}
function pengingat(T, op) {
  let s = '';
  const p1 = seg(T, 68.2, 68.8, ease.out), p2 = seg(T, 69.9, 70.5, ease.out), p3 = seg(T, M.s17.kananBawah, M.s17.kananBawah + 0.5, ease.out), p4 = seg(T, 71.7, 72.2, ease.out);
  if (p1 > 0.01) s += U.pil(64, 400, 'Nyeri makin berat', { size: 36, p: p1 * op, ikonSvg: ikn.peringatan(64 + 38, 400 + 34, 0.62) });
  if (p3 > 0.01) s += U.pil(64, 490, 'Menetap di kanan bawah', { size: 36, p: p3 * op, ikonSvg: ikn.peringatan(64 + 38, 490 + 34, 0.62) });
  if (p4 > 0.01) s += `<g opacity="${f1(p4 * op)}"><rect x="64" y="${600 + 6}" width="650" height="116" rx="58" fill="#000" opacity=".3"/><rect x="64" y="600" width="650" height="116" rx="58" fill="${EMAS}"/><text x="389" y="672" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="37" fill="${TINTA}">Jangan tunda, segera periksa</text></g>`;
  return s;
}
function kartuAkhir(T) {
  const a = seg(T, 72.95, 73.55); if (a < 0.01) return '';
  return `<g opacity="${f1(a)}"><rect x="-80" y="-80" width="1240" height="2080" fill="#06161A"/><image href="logo-mark.webp" x="400" y="720" width="280" height="280"/><text x="540" y="1100" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="76" letter-spacing="8" fill="${GADING}">MEDCOEL</text><text x="540" y="1170" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="30" fill="${GADING}" opacity=".75">Edukasi umum, bukan pengganti pemeriksaan dokter</text></g>`;
}

export function frame(T, opt = {}) {
  const ctx = { sc: null };
  const { svg: isi, lab } = adegan(T, opt, ctx);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1920" width="1080" height="1920" font-family="${FONT}">`;
  s += `<defs><clipPath id="vp"><rect width="1080" height="1920"/></clipPath></defs>${BLUR_DEFS}<g clip-path="url(#vp)">`;
  s += `<g>${latar('usus', T)}</g>`;
  s += isi;
  if (!opt.tanpaLabel) s += `<g class="lbl-wadah">${labelFase(T, lab, { kolom: 716, min: 400, max: 1480, jarak: 130 })}</g>`;
  const BAB = [[0, 7.3, 'Pandangan laparoskopi (skematis)'], [7.3, 10.4, 'Peta perut'], [10.4, 12.6, 'Sekum dan apendiks'], [12.6, 16.9, 'Apendisitis'], [16.9, 36.9, 'Pembesaran skematik: potongan apendiks'], [36.9, 40.4, 'Tubuh utuh: pola nyeri'], [40.4, 45.9, 'Nyeri mulai terlokalisasi'], [45.9, 52.4, 'Gejala penyerta'], [52.4, 57.9, 'Pemeriksaan'], [57.9, 64.1, 'Penanganan'], [64.1, 67.5, 'Pencegahan'], [67.5, 73.0, 'Kapan perlu diperiksa']];
  const bab = BAB.find(([a, b]) => T >= a && T < b);
  if (bab) s += chip2(bab[2], jendela(T, bab[0] + 0.05, bab[1], 0.3));
  const hud = jendela(T, 31.2, 36.9, 0.4);
  if (hud > 0.01) { const sp = secParam(T); s += U.batang(196, 'Tekanan dalam', 0.12 + 0.88 * sp.tekanan, hud, '#F0735E') + U.batang(256, 'Aliran darah', sp.aliran, hud); }
  const k = kalimatAktif(T);
  if (k && T < 72.9) s += U.takarir(k.teks, seg(T, k.t0 - 0.05, k.t0 + 0.2) * (1 - seg(T, k.t1 + 0.1, k.t1 + 0.35)));
  s += U.catatan();
  s += `</g></svg>`;
  return s;
}
