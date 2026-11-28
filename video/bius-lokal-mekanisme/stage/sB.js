// B. proses normal (4,2 - 15,2): kulit -> ujung saraf -> kanal terbuka -> Na+ masuk -> gelombang -> sumsum tulang belakang -> otak.
// D. setelah bius lokal (19,0 - 33,45): sudut dan ukuran model SAMA (z = 1,25): obat -> menembus membran -> menghambat kanal dari dalam -> gelombang berhenti.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, rndf, T, GOLD, INK, W, chip, tag, callout, op, ka, mixc } from './common.js';
import { NK, H, MT, XL, XR, CHX, BLOCK, nerveWorld, brainWorld, probe, drugMol, naIon, waveX } from './nerve.js';
import { rakaArm } from './sA.js';

const Z = 1.25, OX = 540, OY = 840;
const cam = (cx, cy, z) => ({ z, cx, cy, tr: `translate(${OX} ${OY}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})`, S: (x, y) => [OX + (x - cx) * z, OY + (y - cy) * z] });
function legend(t, a, withDrug) {
  const it = (x, col, colD, txt) => `<circle cx="${x}" cy="1236" r="15" fill="${col}" stroke="${colD}" stroke-width="4"/>${T(txt, x + 26, 1248, { size: 26, anchor: 'start', fill: INK })}`;
  const w = withDrug ? 700 : 520;
  return `<g opacity="${f1(a)}"><rect x="${(1080 - w) / 2}" y="1200" width="${w}" height="72" rx="36" fill="rgba(255,255,255,.88)"/>${it((1080 - w) / 2 + 36, NK.na, NK.naD, 'Na+')}${it((1080 - w) / 2 + 176, NK.wave, NK.waveD, 'sinyal listrik')}${withDrug ? it((1080 - w) / 2 + 440, NK.drug, NK.drugD, 'molekul obat') : ''}</g>`;
}
// ----- proses normal
const WV_N = [{ t0: 6.0, x0: 560, v: 480, vc: 900 }, { t0: 7.7, x0: 560, v: 480, vc: 900 }];
const xwN = (t) => 560 - 480 * (t - 6.0);
export function normalCam(t) {
  const tc = 6.0 + (560 - XL) / 480;                                   // gelombang tiba di sumsum (10,9 dtk)
  let cx, cy = 140, z = Z;
  if (t < 5.6) { const u = sm((t - 4.2) / 1.4); cx = lerp(660, 560, u); cy = lerp(70, 140, u); z = lerp(1.45, Z, u); }
  else if (t < tc) { cx = Math.max(XL + 40, lerp(560, xwN(t) + 200, sm((t - 5.6) / 1.2))); }
  else { cx = XL + 40; const u = sm((t - tc) / 1.7); cy = lerp(140, -1050, u); z = lerp(Z, 0.8, u); }
  return cam(cx, cy, z);
}
export function sceneNormal(t, out) {
  const c = normalCam(t), tc = 6.0 + (560 - XL) / 480;
  const press = clamp((t - 3.4) / 0.2) * (1 - clamp((t - 6.1) / 0.6));
  const lit = seg(t, 12.1, 12.6), pain = seg(t, 13.1, 13.5);
  let world = nerveWorld(t, { waves: WV_N }) + probe(880, -232 + 18 * Math.sin(Math.min(1, press) * 1) * press, press, 240) + brainWorld(t, lit);
  // ledakan nyeri di otak (bintang kecil koral)
  if (pain > 0.01) { let st = ''; for (let i = 0; i < 10; i++) { const a = i * 0.628 + t * 0.6, r0 = 330, r1 = 330 + 90 * pain; st += `<path d="M${f1(XL + Math.cos(a) * r0)} ${f1(-1330 + Math.sin(a) * r0)}L${f1(XL + Math.cos(a) * r1)} ${f1(-1330 + Math.sin(a) * r1)}" stroke="#FF5A4D" stroke-width="16" stroke-linecap="round" opacity="${f1(pain)}"/>`; } world += st; }
  out.A += `<g transform="${c.tr}">${world}</g>`;
  const S = c.S;
  let u = chip(['KANAL TERBUKA'], t, 5.85, 7.3, { size: 62, bg: '#FFF2C7', fg: INK }) + chip(['Na+ MASUK'], t, 7.3, 9.1, { size: 66, bg: '#FFE0B3', fg: INK }) + chip(['SINYAL BERJALAN'], t, 9.1, 10.9, { size: 62, bg: '#C9F7EE', fg: INK }) + chip(['SUMSUM TULANG', 'BELAKANG'], t, 10.9, 12.1, { size: 54, bg: '#fff' }) + chip(['OTAK'], t, 12.1, 13.1, { size: 70, bg: '#fff' }) + chip(['NYERI DISADARI'], t, 13.1, 15.25, { size: 62, bg: '#FFD9D1', fg: '#8A2F22' });
  u += callout('ujung saraf', 310, 640, S(860, -80)[0], S(860, -80)[1], ka(t, 4.4, 5.8, 0.25) * (t < 5.8 ? 1 : 0), { size: 34, col: NK.mem });
  u += tag('kulit disentuh', 790, 560, ka(t, 3.6, 5.6, 0.25) * (c.z > 1.3 ? 1 : 0.0), { size: 30, bg: '#fff' });
  u += callout('kanal natrium', 760, 520, S(CHX[0], -H)[0], S(CHX[0], -H)[1], ka(t, 5.9, 7.3, 0.25), { size: 34, col: NK.gateD });
  u += legend(t, ka(t, 5.5, 12.2, 0.3), false);
  out.U += u;
}
// ----- setelah bius lokal
const idxBlock = CHX.map((x, k) => [x, k]).filter(([x]) => x >= BLOCK[0] && x <= BLOCK[1]).map(([, k]) => k);
const slots = []; for (const k of idxBlock) for (const side of [-1, 1]) slots.push([k, side]);
const slotOf = (k, side) => slots.findIndex(([kk, ss]) => kk === k && ss === side);
const T_CROSS = 23.9, T_PLUG = 25.85;
export const plugAt = (k, side) => { const i = slotOf(k, side); return i < 0 ? Infinity : T_PLUG + 0.06 * i; };
const NMOL = 40, SRC = [600, -430];
const home = (i) => { if (i < slots.length) { const [k, side] = slots[i]; return [CHX[k] + 85 + 18 * Math.sin(i * 2.1), side * (H + MT + 70 + 60 * rndf(i + 5))]; } const j = i - slots.length; return [BLOCK[0] + 40 + rndf(j + 11) * (BLOCK[1] - BLOCK[0]), (j % 2 ? 1 : -1) * (H + MT + 60 + rndf(j + 3) * 190)]; };
function drugLayer(t) {
  let s = '';
  for (let i = 0; i < NMOL; i++) {
    const tA = 19.4 + i * 0.05, h = home(i); if (t < tA) continue;
    let x, y, o = 1, rot = 20 + i * 40;
    const u = eo(clamp((t - tA) / 1.3)); x = lerp(SRC[0], h[0], u) + 12 * Math.sin(t * 1.8 + i), y = lerp(SRC[1], h[1], u) + 9 * Math.cos(t * 2.2 + i * 1.5);
    if (i < slots.length) {
      const [k, side] = slots[i], tc0 = T_CROSS + 0.075 * i, pa = plugAt(k, side), xk = CHX[k];
      const memP = [xk + 85, side * H], inP = [xk + 85, side * (H - 55)], mouth = [xk, side * H - side * (MT / 2 + 15)];
      if (t >= pa) continue;
      if (t >= tc0) { const q = (t - tc0) / 0.9; if (q < 0.45) { const a = eio(q / 0.45); x = lerp(h[0], memP[0], a); y = lerp(h[1], memP[1], a); } else if (q < 0.7) { const a = (q - 0.45) / 0.25; x = memP[0]; y = lerp(memP[1], inP[1], a); } else { const a = eio(clamp((q - 0.7) / 0.3)); x = lerp(inP[0], mouth[0], a); y = lerp(inP[1], mouth[1], a); } }
    }
    s += drugMol(x, y, clamp((t - tA) / 0.3) * o, 1, rot + 30 * Math.sin(t + i));
  }
  return s;
}
function syringe(t) {
  const a = clamp((t - 19.1) / 0.4) * (1 - clamp((t - 22.4) / 0.5)); if (a < 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(${SRC[0]} ${SRC[1]}) rotate(-35)"><path d="M0 0L0 -90" stroke="#9AA9B8" stroke-width="7"/><rect x="-30" y="-250" width="60" height="165" rx="12" fill="#F4F8FB" stroke="#9AA9B8" stroke-width="7"/><rect x="-30" y="-170" width="60" height="30" fill="${NK.drug}" opacity=".8"/><rect x="-44" y="-262" width="88" height="14" rx="7" fill="#9AA9B8"/><rect x="-6" y="-340" width="12" height="82" rx="6" fill="#9AA9B8"/><rect x="-40" y="-348" width="80" height="14" rx="7" fill="#7C8CA0"/></g>`;
}
const blockCfg = (t) => ({
  waves: [{ t0: 29.0, x0: 700, v: 480, vc: 900, amp: (x) => (x > BLOCK[1] ? 1 : clamp((x - (BLOCK[1] - 700)) / 700)) }, { t0: 31.7, x0: 700, v: 480, vc: 900, amp: (x) => (x > BLOCK[1] ? 1 : clamp((x - (BLOCK[1] - 700)) / 700)) }],
  plugAt, blockedAt: (k, side) => plugAt(k, side) + 0.1, naBounce: 27.5,
});
export function blockCam(t) { if (t < 21.8) { const u = sm((t - 19.0) / 1.0); return cam(lerp(100, 100, u), 60, 0.85); } const u = sm((t - 21.8) / 1.0); return cam(lerp(100, -40, u), lerp(60, 140, u), lerp(0.85, Z, u)); }
export function sceneBlock(t, out) {
  const c = blockCam(t);
  let world = nerveWorld(t, blockCfg(t)) + drugLayer(t) + syringe(t);
  // tepi segmen yang diberi obat (garis putus halus) agar jalur normal dan jalur terblokir dibandingkan di ruang yang sama
  const bx = (x) => x;
  out.A += `<g transform="${c.tr}">${world}</g>`;
  const S = c.S;
  let u = chip(['OBAT DI SEKITAR', 'SARAF'], t, 19.05, 22.7, { size: 58, bg: '#F8D3EC', fg: INK }) + chip(['MOLEKUL OBAT'], t, 22.7, 23.95, { size: 64, bg: '#F8D3EC', fg: INK }) + chip(['MENEMBUS MEMBRAN'], t, 23.95, 25.8, { size: 58, bg: '#F8D3EC', fg: INK }) + chip(['KANAL TERHAMBAT'], t, 25.8, 27.5, { size: 62, bg: '#F8D3EC', fg: INK }) + chip(['Na+ TIDAK MASUK'], t, 27.5, 29.2, { size: 60, bg: '#FFE0B3', fg: INK }) + chip(['SINYAL BERHENTI'], t, 29.2, 33.5, { size: 62, bg: '#FFD9D1', fg: '#8A2F22' });
  const h0 = home(slots.length + 2), mc = S(h0[0], h0[1]);
  u += callout('molekul obat', 760, 540, mc[0], mc[1], ka(t, W.molekul - 0.3, 23.9, 0.25) * (t > 22.5 ? 1 : 0), { size: 32, col: NK.drug });
  const kk = idxBlock[2], memS = S(CHX[kk] + 85, H);
  u += callout('membran sel saraf', 330, 1010, memS[0], memS[1], ka(t, W.membran - 0.2, 25.7, 0.25), { size: 32, col: NK.mem });
  const pl = S(CHX[kk], H - MT / 2 - 15);
  u += callout('dari sisi dalam', 300, 640, S(CHX[idxBlock[3]], -H + MT / 2 + 15)[0], S(CHX[idxBlock[3]], -H + MT / 2 + 15)[1], ka(t, W.sisi - 0.1, 28.6, 0.25), { size: 32, col: NK.drug });
  u += tag('hanya sebagian molekul', 540, 1130, ka(t, W.sebagian, 24.0, 0.3), { size: 28, bg: '#fff' });
  u += tag('pulsa berhenti di area obat', 540, 1130, ka(t, 30.4, 33.4, 0.3), { size: 28, bg: '#fff' });
  u += legend(t, ka(t, 22.3, 33.4, 0.3), true);
  out.U += u;
}
