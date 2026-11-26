// B. DARI KETUKAN SAMPAI TUNGKAI TERANGKAT (4,4 - 18,4): kamera mengikuti: palu -> tendon patela -> otot paha depan (regang) -> sensor regang -> saraf sensorik -> sumsum tulang belakang
// -> saraf motorik -> otot paha depan berkontraksi -> tungkai bawah terangkat. Satu ruang (peta seat.js); mode tembus pandang (x-ray) hanya menggelapkan ruang dan menampilkan anatomi di atas tubuh Raka.
import { f1, clamp, lerp, sm, eo, eio, K, chip, tag, callout, op, camG, pchip, ka, rk, rIdle, lerpState } from './common.js';
import { SK, rg, rp, room, chair, hammerSvg, impact, seated, withKick, kick, KNEE } from './seat.js';
import { legAnat, spineAnat, signalPath, spindleMark, SENS, MOT, SPINDLE, CORD } from './anat.js';
import { INSET, lensFrame, spindleInner, cordInner } from './insets.js';
import { TAPS_HOOK, thetaHook } from './sHook.js';

export const TAPS = [...TAPS_HOOK, 5.20, 19.95];
export const xr = (t) => sm((t - 4.55) / 0.5) * (1 - sm((t - 16.3) / 0.6));
export const thetaBody = (t) => thetaHook(t) + kick(t, 16.75, 0.5, 32) + kick(t, 21.3, 0.28, 30);
export const camB = (() => {
  const k = [[4.4, 540, 975, Math.log(1.0)], [5.25, 530, 1092, Math.log(3.0)], [7.4, 530, 1092, Math.log(3.0)], [8.3, 480, 1072, Math.log(3.2)], [8.8, 470, 1066, Math.log(3.2)], [10.25, 335, 1022, Math.log(2.5)], [13.2, 320, 1018, Math.log(2.5)],
    [14.4, 430, 1066, Math.log(3.0)], [16.2, 520, 1092, Math.log(3.0)], [17.3, 560, 1050, Math.log(1.45)], [18.4, 540, 960, Math.log(1.0)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
export function bodyRaka(t, th) {
  const TH = seated('berpikir', { yaw: 0.4, gazeX: 0.9, gazeY: 0.9, tilt: 4 }), KA = seated('kaget', { yaw: 0.4, gazeX: 0.9, gazeY: 0.9 }), HA = seated('senang', { yaw: 0.35, gazeX: 0.6, gazeY: 0.5 }), NE = seated('lega', { yaw: 0.3, gazeX: 0.4, gazeY: 0.3 });
  let st;
  if (t < 17.15) st = TH;
  else if (t < 17.9) st = lerpState(TH, KA, sm((t - 17.15) / 0.25));       // bereaksi SESUDAH kaki terangkat
  else if (t < 18.9) st = lerpState(KA, HA, sm((t - 17.9) / 0.5));
  else st = lerpState(HA, NE, sm((t - 18.9) / 0.6));
  return withKick(rIdle(st, t), th);
}
export function sceneBody(t, out) {
  const th = thetaBody(t), st = bodyRaka(t, th), r = rk(st, SK.cx, SK.ty, SK.k, 'rB'), X = xr(t);
  let w = room() + rg(chair()) + r.svg;
  const [cx, cy, z] = camB(t), sc = (x, y) => { const [wx, wy] = rp(x, y); return [540 + (wx - cx) * z, 960 + (wy - cy) * z]; };
  if (X > 0.01) {
    // anatomi (koordinat Raka) di atas ruang yang digelapkan
    const str = sm((t - 5.2) / 0.3) * (1 - sm((t - 6.3) / 0.7)), con = sm((t - 15.25) / 0.6) * (1 - sm((t - 17.9) / 0.6)), glow = sm((t - 14.35) / 0.4) * (1 - sm((t - 16.4) / 0.5));
    const wave = t > 5.2 && t < 6.4 ? (t - 5.2) / 1.2 : -1;
    const us = clamp((t - 8.78) / 1.57), um = clamp((t - 13.25) / 1.15), pulseM = t > 14.4 ? 0 : 0;
    const spineHi = sm((t - 10.0) / 0.4) * (1 - sm((t - 13.4) / 0.4));
    let an = legAnat({ th, str, con, glow, wave }) + spineAnat(spineHi);
    const nerveA = sm((t - 8.1) / 0.4), motA = sm((t - 11.8) / 0.4);
    an += signalPath(SENS, us, K.sens, K.sensD, nerveA) + signalPath(MOT, um, K.mot, K.motD, motA);
    an += spindleMark(sm((t - 7.2) / 0.3) * (1 - sm((t - 9.2) / 0.4)), 0.5 + 0.5 * Math.sin(t * 9));
    w += `<rect x="-3000" y="-3000" width="8000" height="8000" fill="${K.navy}" opacity="${f1(0.66 * X)}"/><g opacity="${f1(X)}">${rg(an)}</g>`;
  }
  w += hammerSvg(t, TAPS) + impact(t, TAPS);
  // sesudah tembus pandang memudar: lensa kecil di lutut tetap memperlihatkan otot berkontraksi, tendon menarik, dan tibia berputar bersama tungkai (16,2 - 18,5)
  const lensA = sm((t - 16.2) / 0.4) * (1 - sm((t - 18.0) / 0.5));
  if (lensA > 0.01) {
    const [lx, ly] = rp(322, 570), LR = 128, con2 = sm((t - 15.25) / 0.6) * (1 - sm((t - 17.9) / 0.6)), gl2 = sm((t - 14.35) / 0.4) * (1 - sm((t - 16.4) / 0.5));
    w += `<g opacity="${f1(lensA)}"><defs><clipPath id="wl"><circle cx="${f1(lx)}" cy="${f1(ly)}" r="${LR}"/></clipPath></defs><circle cx="${f1(lx)}" cy="${f1(ly + 5)}" r="${LR + 5}" fill="rgba(0,0,0,.28)"/><circle cx="${f1(lx)}" cy="${f1(ly)}" r="${LR}" fill="${K.navy}"/><g clip-path="url(#wl)">${rg(legAnat({ th, con: con2, glow: gl2 }))}</g><circle cx="${f1(lx)}" cy="${f1(ly)}" r="${LR}" fill="none" stroke="${K.gold}" stroke-width="6"/></g>`;
  }
  out.A += camG(w, z, cx, cy, 540, 960);
  // ------------- inset
  const pS = sm((t - 7.85) / 0.3) * (1 - sm((t - 9.3) / 0.25)), pC = sm((t - 10.2) / 0.35) * (1 - sm((t - 13.2) / 0.3));
  const fireS = sm((t - 8.2) / 0.3), strS = sm((t - 7.7) / 0.4) * (1 - sm((t - 9.0) / 0.5));
  const sP = sc(SPINDLE[0], SPINDLE[1]), cP = sc(CORD[0], CORD[1]);
  out.U += lensFrame(spindleInner(t, strS, fireS), pS, sP, 'lensS') + lensFrame(cordInner(t), pC, cP, 'lensC');
  // ------------- teks
  const A = (a, b, f = 0.25) => ka(t, a, b, f);
  const tp = sc(366, 602), mp = sc(262, 516);
  out.U += tag('ULANGI PELAN-PELAN', 540, 395, A(4.7, 5.5), { size: 34, bg: '#fff', fg: K.forest });
  out.U += callout('TENDON PATELA', 810, 760, tp[0], tp[1], A(4.75, 7.35), { size: 42, col: K.gold, k: sm((t - 4.75) / 0.35) });
  out.U += callout('OTOT PAHA DEPAN', 300, 640, mp[0], mp[1], A(6.05, 7.35), { size: 42, col: '#fff', k: sm((t - 6.05) / 0.35) });
  out.U += tag('SENSOR REGANG', INSET.cx, INSET.cy - INSET.r - 34, A(7.95, 9.2), { size: 44, bg: K.sens, fg: '#06302B' });
  out.U += chip('SINYAL MASUK', t, 8.7, 11.9, { size: 60, bg: K.sens, fg: '#06302B' });
  out.U += tag('SUMSUM TULANG BELAKANG', INSET.cx, INSET.cy - INSET.r - 34, A(10.3, 13.2), { size: 40 });
  out.U += chip('SINYAL KEMBALI', t, 11.95, 14.9, { size: 60, bg: K.mot, fg: '#3A1D00' });
}
