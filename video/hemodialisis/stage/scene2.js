// ADEGAN 2 (8,4 - 33,7 dtk): ginjal normal menyaring zat sisa, mineral, dan cairan -> urine; fungsi menurun bertahap (zat sisa dan cairan menumpuk, DIAGRAM bukan perubahan warna darah);
// penyakit berkembang lama (diabetes, tekanan darah tinggi) dan gangguan mendadak. Skema: kapiler dan nefron tidak digambar sesuai skala.
import { f1, clamp, lerp, sm, eo, ei, eio, seg, win, MC, FONT, pchip, pathPt, step } from './core.js';
import * as A from './art.js';

export const S2 = { t0: 8.4, t1: 33.7 };
const KC = [640, 990], KS = 1.55, kp = (x, y) => [KC[0] + x * KS, KC[1] + y * KS];
const pa = kp(...A.KID.arteri), pv = kp(...A.KID.vena), pel = kp(-10, 35), ure = kp(...A.KID.ureter), apex = kp(18, -10);
const PATH = {
  AORTA: 'M120 -100V2020', CAVA: 'M250 2020V-100',
  ART: `M120 ${f1(pa[1] - 140)}C230 ${f1(pa[1] - 170)} 380 ${f1(pa[1] + 20)} ${f1(pa[0] + 6)} ${f1(pa[1])}`,
  VEIN: `M${f1(pv[0] + 6)} ${f1(pv[1])}C400 ${f1(pv[1] + 30)} 320 ${f1(pv[1] + 70)} 250 ${f1(pv[1] + 40)}`,
  LOOP: `M${f1(pa[0])} ${f1(pa[1])}C${f1(pa[0] + 70)} ${f1(pa[1] - 30)} ${f1(apex[0] + 40)} ${f1(apex[1] - 10)} ${f1(apex[0] + 40)} ${f1(apex[1] + 40)}C${f1(apex[0] + 40)} ${f1(pv[1] - 60)} ${f1(pv[0] + 90)} ${f1(pv[1] + 10)} ${f1(pv[0])} ${f1(pv[1])}`,
  URINE: `M${f1(apex[0] + 40)} ${f1(apex[1] + 40)}C${f1(pel[0] - 20)} ${f1(pel[1] + 90)} ${f1(ure[0] + 40)} ${f1(ure[1] - 50)} ${f1(ure[0])} ${f1(ure[1])}C${f1(ure[0] - 20)} ${f1(ure[1] + 150)} 690 1440 690 1580`,
};
export const BLADDER = [690, 1690];
// ---- keadaan fisiologi skematis sebagai fungsi waktu (satu sumber untuk gambar)
export const fn = pchip([[8.4, 1], [16.9, 1], [17.9, 0.72], [18.9, 0.46], [20.0, 0.22], [21.2, 0.14], [24.4, 0.1], [27.4, 0.1], [27.6, 0.1], [30.5, 0.1], [33.7, 0.1]]);
const acc = (t) => seg(t, 16.9, 21.4, eio);   // penumpukan 0..1 (sesudah fungsi turun)
const FLOW = (t) => t * 0.13;
// aliran: fase px untuk selang (kecepatan turun saat fungsi turun)
let _ph = 0, _lt = -1; const phase = (t) => { // integral kecepatan (deterministik)
  let s = 0; for (let u = 8.4; u < t; u += 0.05) s += (0.45 + 0.55 * fn(u)) * 6; return s; };
function bladder(t, level) {
  const [x, y] = BLADDER, w = 150, h = 120;
  return `<g filter="url(#fShS)"><path d="M${x - w} ${y}C${x - w} ${y - h} ${x + w} ${y - h} ${x + w} ${y}C${x + w} ${y + h * 0.9} ${x - w} ${y + h * 0.9} ${x - w} ${y}Z" fill="#E7B8A8" stroke="#7E3A30" stroke-width="4"/></g><clipPath id="bl"><path d="M${x - w + 8} ${y}C${x - w + 8} ${y - h + 10} ${x + w - 8} ${y - h + 10} ${x + w - 8} ${y}C${x + w - 8} ${y + h * 0.85} ${x - w + 8} ${y + h * 0.85} ${x - w + 8} ${y}Z"/></clipPath><g clip-path="url(#bl)"><rect x="${x - w}" y="${f1(y + h * 0.85 - (h * 1.5) * level)}" width="${2 * w}" height="${h * 1.8}" fill="#F2C24A" opacity=".85"/><rect x="${x - w}" y="${f1(y + h * 0.85 - (h * 1.5) * level)}" width="${2 * w}" height="8" fill="#FFF3B8" opacity=".7"/></g><path d="M${x - w + 22} ${y - 40}C${x - w + 40} ${y - 70} ${x - 30} ${y - 82} ${x + 10} ${y - 80}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".45"/>`;
}
const bar = (x, y, w, label, v, col, a = 1, down = false) => `<g opacity="${f1(a)}"><text x="${x}" y="${y - 12}" font-family="${FONT}" font-weight="700" font-size="30" fill="${MC.ivory}">${label}</text><rect x="${x}" y="${y}" width="${w}" height="30" rx="15" fill="#06202A" stroke="${MC.ivory}" stroke-width="2.5" opacity=".95"/><rect x="${x + 4}" y="${y + 4}" width="${f1(Math.max(22, (w - 8) * clamp(v)))}" height="22" rx="11" fill="${col}"/><path d="${down ? `M${x + w + 22} ${y + 8}v14l-8 -7M${x + w + 22} ${y + 22}l8 -7` : `M${x + w + 22} ${y + 22}v-14l-8 7M${x + w + 22} ${y + 8}l8 7`}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`;

export function sceneKidney(t) {
  const f = fn(t), a = acc(t), ph = phase(t), w = 26;
  let g = '';
  // pembuluh besar (kiri) dan cabang ke ginjal
  g += A.tube(PATH.AORTA, 62, { ph: ph }) + A.tube(PATH.CAVA, 52, { ph });
  g += A.tube(PATH.ART, 28, { ph }) + A.tube(PATH.VEIN, 26, { ph });
  // ureter (urine, kuning) mengalir hanya bila ada urine; makin tipis bila fungsi turun
  const uw = 6 + 16 * f;
  g += A.tube(PATH.URINE, uw, { kind: 'urine', ph, wall: f > 0.2 });
  g += bladder(t, clamp(seg(t, 9.6, 16.2, eo) * 0.55 + seg(t, 16.9, 21.4, eio) * 0.04 + 0.05));
  // ginjal (di atas selang agar pembuluh masuk di hilus)
  g += `<g transform="translate(${KC[0]} ${KC[1]}) scale(${KS})">${A.kidney({ fn: f, cut: 1, id: 'kd', glow: win(t, 9.3, 10.9, 0.3) * 0.7 })}</g>`;
  // aliran darah di dalam ginjal (loop) tampak di atas ginjal
  g += A.tube(PATH.LOOP, 12, { ph, wall: false, a: 0.95 });
  // partikel: zat sisa (ambar), mineral (ungu), cairan (biru)
  const nIn = Math.round(lerp(6, 22, a)), sp = 0.12 * (0.4 + 0.6 * f);
  g += A.along(PATH.ART, Math.round(nIn * 0.6), t, 0.1, (x, y, i) => A.ureaP(x, y, 8.5, 1, i * 37), { seed: 1, spread: 6 });
  g += A.along(PATH.AORTA, nIn, t, 0.06, (x, y, i) => A.ureaP(x + 0, y, 9, 1, i * 41), { seed: 3, spread: 18 });
  g += A.along(PATH.VEIN, 2, t, 0.1, (x, y, i) => A.ureaP(x, y, 7.5, 0.9, i * 37), { seed: 4, spread: 4 });
  g += A.along(PATH.CAVA, Math.round(lerp(2, 9, a)), t, 0.06, (x, y, i) => A.ureaP(x, y, 8.5, 1, i * 29), { seed: 5, spread: 14 });
  g += A.along(PATH.LOOP, 4, t, 0.1, (x, y, i) => A.ureaP(x, y, 7, 1, i * 37), { seed: 6, spread: 3 });
  const urate = f;   // zat sisa keluar lewat urine sebanding fungsi
  g += A.along(PATH.URINE, Math.round(7 * urate), t, 0.075 * (0.4 + f), (x, y, i) => A.ureaP(x, y, 8, 1, i * 37), { seed: 7, spread: 3 });
  const m = win(t, 12.0, 16.4, 0.4);
  if (m > 0.02) { g += A.along(PATH.LOOP, 5, t, 0.1, (x, y, i) => A.ionP(x, y, 7, m), { seed: 8, spread: 3 }) + A.along(PATH.VEIN, 4, t, 0.1, (x, y, i) => A.ionP(x, y, 7, m), { seed: 9, spread: 3 }) + A.along(PATH.ART, 4, t, 0.1, (x, y, i) => A.ionP(x, y, 7, m), { seed: 10, spread: 4 }); }
  const wa = win(t, 14.0, 20.0, 0.5) * (0.35 + 0.65 * f);
  if (wa > 0.02) g += A.along(PATH.URINE, Math.round(8 * f) + 1, t, 0.09, (x, y, i) => A.waterP(x, y, 8, wa), { seed: 11, spread: 4 });
  return g;
}
// kartu indikator (16,9 - 22,6): fungsi ginjal turun; zat sisa dan cairan naik (diagram)
export function gauges(t) {
  const al = seg(t, 16.9, 17.3) * (1 - seg(t, 22.0, 22.6)); if (al <= 0.01) return '';
  const f = fn(t), a = acc(t);
  return `<g opacity="${f1(al)}"><rect x="80" y="250" width="920" height="300" rx="36" fill="#06202A" opacity=".82" stroke="${MC.ivory}" stroke-width="3"/>${bar(130, 330, 640, 'Fungsi ginjal', f, '#6EE0B8', 1, true)}${bar(130, 420, 640, 'Zat sisa', 0.2 + 0.78 * a, COL_URE, 1)}${bar(130, 510, 640, 'Cairan', 0.2 + 0.7 * a, '#7CC8FF', 1)}</g>`;
}
const COL_URE = '#F2A33A';
// lensa penyebab (24,7 - 27,5): diabetes (glukosa menumpuk di dinding kapiler) dan tekanan darah tinggi (tekanan mendorong dinding)
function lens(cx, cy, r, inner, a) { return `<g opacity="${f1(a)}"><circle cx="${cx}" cy="${cy + 8}" r="${r + 12}" fill="rgba(0,0,0,.3)"/><circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="#F7F2E4" stroke="${MC.ink}" stroke-width="6"/><clipPath id="ln${cx}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><g clip-path="url(#ln${cx})"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#0F3F46"/>${inner}</g></g>`; }
export function causes(t) {
  const aA = seg(t, 24.7, 25.2, eo) * (1 - seg(t, 27.1, 27.5)), aB = seg(t, 25.9, 26.4, eo) * (1 - seg(t, 27.1, 27.5)); let g = '';
  if (aA > 0.01 || aB > 0.01) {
    const r = 185, cA = [330, 520], cB = [750, 520], ph = t * 90;
    const cap = (cx, cy, thick) => A.tube(`M${cx - r - 20} ${cy}H${cx + r + 20}`, 70 - thick, { ph, wall: false }) + `<path d="M${cx - r - 20} ${cy - 35 + thick / 2}H${cx + r + 20}M${cx - r - 20} ${cy + 35 - thick / 2}H${cx + r + 20}" stroke="#E9C7A0" stroke-width="${6 + thick}" stroke-linecap="round" opacity=".95"/>`;
    // A: glukosa
    let ia = cap(cA[0], cA[1], 6 * seg(t, 24.9, 27.0)); for (let i = 0; i < 9; i++) { const x = cA[0] - 150 + i * 38 + Math.sin(t * 2 + i) * 4, y = cA[1] + (i % 2 ? 62 : -62) + Math.cos(t * 2.3 + i) * 5; ia += hexG(x, y, 11 + 2 * (i % 3)); }
    // B: tekanan
    let ib = cap(cB[0], cB[1], 12 * seg(t, 26.1, 27.0)); for (let i = 0; i < 5; i++) { const x = cB[0] - 120 + i * 60, p = (Math.sin(t * 6 + i) + 1) / 2; ib += `<g opacity=".9"><path d="M${x} ${cB[1] - 50 - p * 26}V${cB[1] - 98}M${x - 12} ${cB[1] - 86}L${x} ${cB[1] - 100}L${x + 12} ${cB[1] - 86}" stroke="#FFB38A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${x} ${cB[1] + 50 + p * 26}V${cB[1] + 98}M${x - 12} ${cB[1] + 86}L${x} ${cB[1] + 100}L${x + 12} ${cB[1] + 86}" stroke="#FFB38A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`; }
    g += lens(cA[0], cA[1], r, ia, aA) + lens(cB[0], cB[1], r, ib, aB);
    g += `<g opacity="${f1(Math.min(aA, aB))}"><path d="M330 735C400 810 500 840 560 900M750 735C720 810 700 850 690 910" fill="none" stroke="${MC.gold}" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 18"/></g>`;
  }
  return g;
}
const hexG = (x, y, r) => `<g transform="translate(${f1(x)} ${f1(y)})"><path d="${Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return `${i ? 'L' : 'M'}${f1(Math.cos(a) * r)} ${f1(Math.sin(a) * r)}`; }).join('')}Z" fill="#FFD25A" stroke="#9A6A08" stroke-width="${f1(r * 0.16)}" stroke-linejoin="round"/></g>`;
// grafik "berkembang lama" vs "mendadak" (21,6 - 33,0)
export function chart(t) {
  const aL = seg(t, 21.6, 22.2) * (1 - seg(t, 24.6, 25.2)), aM = seg(t, 27.6, 28.2) * (1 - seg(t, 32.6, 33.6)); let g = '';
  const x0 = 130, y0 = 700, W = 820, H = 380;
  const frame = (a) => `<g opacity="${f1(a)}"><rect x="80" y="260" width="920" height="560" rx="36" fill="#06202A" opacity=".82" stroke="${MC.ivory}" stroke-width="3"/><path d="M${x0} 320V${y0}H${x0 + W}" stroke="${MC.ivory}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/><text x="${x0}" y="305" font-family="${FONT}" font-weight="700" font-size="28" fill="${MC.ivory}" opacity=".9">fungsi ginjal</text><text x="${x0 + W}" y="${y0 + 44}" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="28" fill="${MC.ivory}" opacity=".9">waktu</text></g>`;
  if (aL > 0.01) { const u = seg(t, 21.8, 24.3, eio), px = (k) => x0 + 30 + k * (W - 60), py = (v) => y0 - 40 - v * (y0 - 380); const d = `M${px(0)} ${py(1)}C${px(0.3)} ${py(0.96)} ${px(0.6)} ${py(0.5)} ${px(1)} ${py(0.12)}`; g += frame(aL) + `<g opacity="${f1(aL)}"><clipPath id="chk"><rect x="${x0}" y="300" width="${f1(60 + (W - 30) * u)}" height="440"/></clipPath><path d="${d}" fill="none" stroke="#6EE0B8" stroke-width="12" stroke-linecap="round" clip-path="url(#chk)"/></g>`; }
  if (aM > 0.01) { const px = (k) => x0 + 30 + k * (W - 60), py = (v) => y0 - 40 - v * (y0 - 380), u = seg(t, 27.9, 29.2, eio), v = seg(t, 29.2, 29.9, ei); const d1 = `M${px(0)} ${py(0.95)}C${px(0.3)} ${py(0.93)} ${px(0.5)} ${py(0.9)} ${px(0.58)} ${py(0.88)}`; const x1 = px(0.58), yA = py(0.88), yB = py(0.2); g += frame(aM) + `<g opacity="${f1(aM)}"><path d="${d1}" fill="none" stroke="#6EE0B8" stroke-width="12" stroke-linecap="round" stroke-dasharray="1200" stroke-dashoffset="${f1(1200 * (1 - u))}"/><path d="M${f1(x1)} ${f1(yA)}V${f1(lerp(yA, yB, v))}" stroke="${MC.coral ?? '#E8665F'}" stroke-width="12" stroke-linecap="round"/>${v > 0.9 ? `<path d="M${f1(x1)} ${f1(yB)}H${f1(px(0.98))}" stroke="${'#E8665F'}" stroke-width="12" stroke-linecap="round" opacity="${f1(seg(t, 29.9, 30.4))}"/>` : ''}</g>`; }
  return g;
}
// label berjadwal [t0, t1, teks, jangkar(layar), pos(cx, cy)]
const BL = (u) => { const p = pathPt(PATH.URINE, u); return [p.x, p.y]; };
export const LABELS2 = [
  [9.3, 11.0, 'Ginjal', () => kp(110, -190), [840, 470]],
  [10.3, 12.1, 'Zat sisa', () => BL(0.12), [850, 700]],
  [13.0, 14.9, 'Mineral', () => kp(30, -30), [855, 640]],
  [14.9, 16.7, 'Urin', () => [690, 1500], [880, 1480]],
  [19.6, 21.3, 'Fungsi\nturun', () => kp(120, 40), [880, 1200]],
  [24.8, 26.8, 'Diabetes', () => [330, 705], [200, 820]],
  [25.9, 27.2, 'Tekanan\ndarah tinggi', () => [750, 705], [870, 840]],
  [22.5, 24.4, 'Berkembang lama', () => [800, 640], [650, 880]],
  [29.4, 31.4, 'Mendadak', () => [725, 560], [820, 880]],
];
const KC2 = [[8.4, 540, 960, 0], [9.1, 600, 900, Math.log(1.16)], [11.9, 570, 1010, Math.log(1.28)], [13.5, 640, 1140, Math.log(1.2)], [15.0, 650, 1380, Math.log(1.32)], [16.5, 590, 1100, Math.log(1.08)], [17.0, 540, 960, 0]];
const kcx = pchip(KC2.map((k) => [k[0], k[1]])), kcy = pchip(KC2.map((k) => [k[0], k[2]])), kcs = pchip(KC2.map((k) => [k[0], k[3]]));
export const camK = (t) => (t >= 17.0 ? { cx: 540, cy: 960, s: 1 } : { cx: kcx(t), cy: kcy(t), s: Math.exp(kcs(t)) });
export const camKTf = (c) => `translate(540 960) scale(${c.s.toFixed(4)}) translate(${f1(-c.cx)} ${f1(-c.cy)})`;
export function labels2(t) {
  const c = camK(t), m = (x, y) => [540 + (x - c.cx) * c.s, 960 + (y - c.cy) * c.s];
  let s = ''; LABELS2.forEach(([t0, t1, txt, anc, pos]) => { const a = seg(t, t0, t0 + 0.3, eo) * (1 - seg(t, t1 - 0.3, t1)); if (a <= 0.01) return; const [ax, ay] = anc(), [x, y] = t < 17 ? m(ax, ay) : [ax, ay]; s += A.chip(x, y, txt, { cx: pos[0], cy: pos[1], a }); }); return s;
}
