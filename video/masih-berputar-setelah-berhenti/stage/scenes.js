// Urutan adegan (t = detik video = detik narasi). Satu model kanalis (tampak atas, orientasi tetap), satu arah putar (searah jarum jam), warna panah tetap.
import { f1, clamp, lerp, sm, eo, K, T, tw, op, chip, tag, callout, caption, iris, camG, pop, ka, raka, rIdle, lerpState, hikBubble } from './common.js';
import { sceneHook, HK, thetaH, hookState } from './hook.js';
import { spinRaka } from './spin.js';
import { ringSvg, ampHi, panelSvg, brainSvg, nerveSvg, miniCard, RC, RM, PN, headGlyph, arcArrow } from './canal.js';
import { wallV, fluidV, wallTh, bendDeg, T_STOP, T_START } from './model.js';
const bgEar = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F7F2E4"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1100" r="230" fill="#EADFC4" opacity=".7"/>`;
const PURPLE = '#7B5CD6';
// Raka kecil (kolom kanan): berputar bersama dinding saluran, berhenti saat dinding berhenti
const RK = { cx: 880, ty: 520, k: 0.46 };
function rakaSmall(t) {
  const wth = wallTh(t), stopTh = wallTh(T_STOP + 0.2), endTh = Math.ceil(stopTh / 360) * 360;
  const th = t < T_STOP + 0.2 ? wth : lerp(stopTh, endTh, sm((t - T_STOP - 0.2) / 0.6));
  const dz = t < T_STOP ? 0 : clamp((t - T_STOP - 0.3) / 0.4) * (1 - sm((t - 45.4) / 3.6));
  const spinning = t < T_STOP + 0.2 ? wallV(t) : 0;
  const wb = t < T_STOP ? 0 : 7 * Math.exp(-(t - T_STOP) / 3) * Math.sin(2 * Math.PI * 0.8 * (t - T_STOP)) * (1 - sm((t - 45.4) / 3));
  const expr = t < T_STOP ? 'berpikir' : (t < 48.6 ? 'bingung' : 'lega');
  let st = raka(expr, null, { tilt: wb, lean: wb * 0.35, dizzy: dz, dizzyT: t * 9, happyEyes: 0 });
  st = rIdle(st, t);
  return spinRaka(st, th * (t < T_STOP + 0.2 ? 1 : 1), RK.cx, RK.ty, RK.k, 'rs');
}
function earScene(t, out) {
  const A = [];
  A.push(bgEar);
  // cincin (muncul dari 6,84; tetap)
  const ra = sm((t - 6.5) / 0.4);
  A.push(ringSvg(t, { a: ra }));
  // sorot berdenyut (tabung lalu cairan) sebelum kepala berputar: ring diam tetap "hidup"
  const pul = 0.55 + 0.45 * Math.sin(2 * Math.PI * 1.5 * t);
  const g1 = ka(t, 7.3, 9.75, 0.3), g2 = ka(t, 9.7, 11.0, 0.3);
  if (g1 > 0.01) A.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="${RM}" fill="none" stroke="${K.gold}" stroke-width="${2 * 33 + 22}" opacity="${f1(g1 * (0.25 + 0.35 * pul) * 100) / 100}"/>`);
  if (g2 > 0.01) A.push(`<circle cx="${RC[0]}" cy="${RC[1]}" r="${RM}" fill="none" stroke="${K.flow}" stroke-width="${2 * 33 - 22}" opacity="${f1(g2 * (0.2 + 0.4 * pul) * 100) / 100}"/>`);
  // sorot emas pada ampula saat membahas kupula (17,1 - 24,9) dan saat berhenti (33 - 39,6)
  A.push(ampHi(t, Math.max(ka(t, 17.0, 24.9, 0.4), ka(t, 32.8, 40.0, 0.4)) * 0.9));
  // Raka kecil: dari 11,0 sampai akhir
  const rka = sm((t - 10.8) / 0.4);
  if (rka > 0.01) A.push(`<g opacity="${f1(rka)}">${rakaSmall(t)}</g>`);
  // jalur saraf + otak (21,3 dst)
  const na = sm((t - 21.3) / 0.4);
  A.push(panelSvg(t, sm((t - 17.0) / 0.5)));
  A.push(nerveSvg(t, na)); A.push(brainSvg(t, na));
  out.A += A.join('');
  // ---- label dan teks layar
  let u = '';
  const L = [40, 175];
  u += chip(['SALURAN SETENGAH LINGKARAN'], t, 7.1, 10.5, { size: 46 });
  u += chip(['KEPALA MULAI BERPUTAR'], t, 10.8, 14.0, { size: 50 });
  u += chip(['CAIRAN SEMPAT TERTINGGAL'], t, 14.1, 15.8, { size: 50 });
  u += chip(['INERSIA'], t, 15.85, 17.0, { size: 64 });
  u += chip(['GERAKAN RELATIF'], t, 17.1, 18.7, { size: 52 });
  u += chip(['SENSOR IKUT MEMBENGKOK'], t, 18.75, 21.4, { size: 50 });
  u += chip(['SARAF KIRIM PESAN KE OTAK'], t, 21.45, 24.9, { size: 48 });
  u += chip(['KALAU TERUS BERPUTAR,', 'SINYAL BISA MELEMAH'], t, 24.95, 31.0, { size: 50 });
  u += chip(['TIBA-TIBA BERHENTI'], t, 31.4, 34.4, { size: 56 });
  u += chip(['CAIRAN MASIH BERGERAK'], t, 34.9, 39.3, { size: 54 });
  u += chip(['OTAK MENGIRA KEPALA', 'MASIH BERPUTAR'], t, 39.95, 44.8, { size: 50 });
  u += chip(['SETELAH TENANG,', 'SENSASI MEREDA'], t, 45.4, 51.5, { size: 54 });
  // callout awal (kolom kiri)
  const p1 = [RC[0] + RM * Math.cos(210 * Math.PI / 180), RC[1] + RM * Math.sin(210 * Math.PI / 180)];
  u += callout('SALURAN', 190, 520, 380, 560, ka(t, 8.3, 10.6, 0.25), { size: 36, col: K.wallD, ex: 190 + tw('SALURAN', 36) / 2 + 23 });
  u += callout('CAIRAN', 190, 760, 400, 700, ka(t, 9.7, 10.7, 0.25), { size: 36, col: K.flowD, ex: 190 + tw('CAIRAN', 36) / 2 + 23 });
  // legenda (kolom kiri) setelah panah muncul
  const la = ka(t, 11.4, 32.9, 0.4);
  if (la > 0.01) u += legend(la, t);
  // label panel
  u += callout('KUPULA', 760, 1030, 560, 1030, ka(t, 18.6, 19.95, 0.25), { size: 36, col: K.cupD, ex: 760 - tw('KUPULA', 36) / 2 - 23 });
  u += callout('SEL RAMBUT', 780, 1222, 570, 1130, ka(t, 19.95, 21.45, 0.25), { size: 34, col: K.cellD, ex: 780 - tw('SEL RAMBUT', 34) / 2 - 23 });
  u += tag('OTAK', 895, 500, ka(t, 22.6, 25.2, 0.3), { size: 34 });
  u += tag('MASIH BERPUTAR', 880, 520, ka(t, 29.5, 31.2, 0.3), { size: 30 });
  u += tag('TERASA BERPUTAR', 880, 520, ka(t, 41.3, 45.2, 0.3), { size: 30, bg: '#EFE9FF', fg: '#4D3A9A' });
  // dua gambar kecil: hanya saat fase berhenti
  const ca = ka(t, 33.0, 39.6, 0.4);
  u += miniCard(30, 410, 290, 230, ['SEBELUM', 'BERHENTI'], 'before', t, ca);
  u += miniCard(30, 660, 290, 230, ['SESUDAH', 'BERHENTI'], 'after', t, ca);
  // rasa berputar (arah berlawanan) di dekat Raka kecil
  const sa = ka(t, 41.3, 45.2, 0.4);
  if (sa > 0.01) { const rc = [RK.cx, RK.ty + 175 * 1.0]; u += `<g opacity="${f1(sa)}">${arcArrow([RK.cx, RK.ty + 190], 118, 20, -70, PURPLE, '#4D3A9A', 11, true)}</g>`; }
  out.U += u;
}
function legend(a, t) {
  const x = 30, w = 300;
  const row = (y, col, dk, txt, on) => op(on, `<rect x="${x}" y="${y}" width="${w}" height="72" rx="36" fill="#fff"/><path d="M${x + 22} ${y + 36}h50" stroke="${col}" stroke-width="12" stroke-linecap="round"/><path d="M${x + 66} ${y + 20}l22 16l-22 16Z" fill="${col}" stroke="${dk}" stroke-width="2" stroke-linejoin="round"/>${T(txt, x + 100 + (w - 100) / 2 - 10, y + 47, { size: 27, fill: dk })}`);
  return `<g opacity="${f1(a)}">${row(430, K.head, K.headD, 'GERAK KEPALA', sm((t - 11.4) / 0.3))}${row(520, K.flow, K.flowD, 'GERAK CAIRAN', sm((t - 14.1) / 0.3))}</g>`;
}
export async function frame(t) {
  const out = { A: '', U: '' };
  const hk = { A: '', U: '' }, ea = { A: '', U: '' };
  if (t < 7.2) sceneHook(t, hk);
  if (t >= 6.4) earScene(t, ea);
  let r;
  if (t < 6.4) r = hk;
  else if (t < 7.1) {
    const z = sm((t - 5.9) / 1.0), cam = [540, lerp(960, 760, z), lerp(1, 1.5, z)];
    const ex = 540 + cam[2] * (423 - cam[0]), ey = 960 + cam[2] * (HK.ty + 216 * HK.k - cam[1]);
    const p = (t - 6.4) / 0.7;
    r = { A: iris(hk.A, ea.A, ex, ey, p, 'i1'), U: p < 0.5 ? op(1 - p * 2, hk.U) : op((p - 0.5) * 2, ea.U) };
  } else r = ea;
  out.A = r.A; out.U = r.U + caption(t);
  return out;
}
