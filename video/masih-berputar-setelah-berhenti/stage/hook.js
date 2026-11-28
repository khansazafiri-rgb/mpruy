// A. HOOK (0 - 6,9 dtk): Raka sudah berputar di frame pertama (searah jarum jam dilihat dari atas), berhenti di ~2,44 dtk (kata "berhenti"), lalu ruangan masih bergeser halus.
import { f1, clamp, lerp, sm, eo, K, T, tw, op, chip, tag, hikBubble, raka, rIdle, lerpState, camG, pop } from './common.js';
import { spinRaka } from './spin.js';
import { headGlyph, arcArrow } from './canal.js';
export const HK = { cx: 540, floor: 1280, k: 1.1 }; HK.ty = HK.floor - 778 * HK.k;
export const T_STOP_H = 2.44, TURNS = 720;
export const thetaH = (t) => (t < T_STOP_H ? 50 + (TURNS - 50) * (1 - Math.pow(1 - Math.max(0, t) / T_STOP_H, 2)) : TURNS);
const wob = (t) => (t < T_STOP_H ? 0 : 8 * Math.exp(-(t - T_STOP_H) / 1.9) * Math.sin(2 * Math.PI * 0.85 * (t - T_STOP_H)));
export function bgShift(t) { const th = thetaH(t), after = t < T_STOP_H ? 0 : 46 * Math.exp(-(t - T_STOP_H) / 2.3) * Math.sin(2 * Math.PI * 0.4 * (t - T_STOP_H) + 0.4); return th * 1.5 + after; }
function room(t) {
  const ox = bgShift(t), P = 150, off = ((ox % P) + P) % P; let s = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F2EFE6"/>`;
  for (let i = -2; i < 9; i++) if (i % 2 === 0) s += `<rect x="${f1(i * P + off)}" y="0" width="${P}" height="${HK.floor - 20}" fill="#EBE5D3"/>`;
  s += `<rect x="${f1(off - P + 40)}" y="640" width="14" height="14" rx="4" fill="#D8CFB4"/>`;
  // jendela dan lukisan ikut bergeser (acuan ruang)
  const wx = 780 + ox * 0.9, wxm = ((wx % 1500) + 1500) % 1500 - 200;
  s += `<rect x="${f1(wxm)}" y="470" width="240" height="320" rx="22" fill="#D5E6EE"/><rect x="${f1(wxm + 16)}" y="486" width="208" height="288" rx="14" fill="#EAF4F8"/><rect x="${f1(wxm + 114)}" y="486" width="12" height="288" fill="#D5E6EE"/>`;
  const px = 160 + ox * 0.9, pxm = ((px % 1500) + 1500) % 1500 - 200;
  s += `<rect x="${f1(pxm)}" y="520" width="170" height="130" rx="10" fill="#F4C9A8"/><rect x="${f1(pxm + 14)}" y="534" width="142" height="102" rx="6" fill="#9DE0BD"/>`;
  s += `<rect x="-200" y="${HK.floor - 6}" width="1500" height="1200" fill="#D9C8AC"/><rect x="-200" y="${HK.floor - 20}" width="1500" height="16" fill="#C9B796"/>`;
  const FP = 260, fo = ((ox * 1.3 % FP) + FP) % FP; for (let i = -2; i < 6; i++) s += `<path d="M${f1(i * FP + fo - 60)} ${HK.floor + 120}L${f1(i * FP + fo + 40)} ${HK.floor - 4}" stroke="#C9B796" stroke-width="5"/>`;
  return s;
}
export function hookState(t) {
  const w = wob(t), dz = clamp((t - T_STOP_H - 0.1) / 0.5), calm = 1 - sm((t - 6.0) / 0.9) * 0.0;
  let st = raka(t < T_STOP_H ? 'kaget' : 'bingung', null, { tilt: w * 0.9, lean: w * 0.35, gazeX: 0, gazeY: 0, dizzy: dz, dizzyT: t * 9, wide: t < T_STOP_H ? 0.4 : 0 });
  return st;
}
export function sceneHook(t, out) {
  const th = thetaH(t), st = hookState(t), cam = (() => { const u = sm((t - 5.9) / 1.0); return [540, lerp(960, 760, u), lerp(1, 1.5, u)]; })();
  let w = room(t);
  // cincin lantai: arah putar searah jarum jam dilihat dari atas (sisi dekat bergerak ke KIRI layar)
  const spinA = clamp(1 - (t - T_STOP_H) / 0.35) * clamp(t / 0.1 + 1);
  if (spinA > 0.01) {
    const cx = HK.cx, cy = HK.floor - 6, rx = 190, ry = 38;
    const a0 = 20 + (th * 0.5) % 40;
    w += `<g opacity="${f1(spinA * 0.9)}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${K.head}" stroke-width="9" stroke-dasharray="46 30" stroke-dashoffset="${f1(-th * 0.9)}" stroke-linecap="round"/><path d="M${cx - 40} ${cy + ry + 6}l-34 -4l22 -22Z" fill="${K.head}" stroke="${K.headD}" stroke-width="3" stroke-linejoin="round"/></g>`;
  }
  w += spinRaka(st, th, HK.cx, HK.ty, HK.k, 'hk');
  out.A += camG(w, cam[2], cam[0], cam[1], 540, 960);
  // glif "tampak atas" kecil: arah putar
  const ga = clamp((t - 0.05) / 0.2) * clamp((2.75 - t) / 0.3);
  if (ga > 0.01) {
    const cx = 160, cy = 830, c = [cx, cy];
    out.U += `<g opacity="${f1(ga)}"><circle cx="${cx}" cy="${cy}" r="112" fill="#fff" stroke="#fff" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="112" fill="rgba(0,0,0,.0)"/>${headGlyph(cx, cy, th, 0.85)}${arcArrow(c, 98, 205, 300, K.head, K.headD, 10)}</g>`;
    out.U += tag('TAMPAK ATAS', cx, cy + 150, ga, { size: 30 });
  }
  // judul
  const c1 = chip(['SUDAH BERHENTI,', 'KOK MASIH MUTER?'], t, 3.3, 6.75, { size: 58, f: 0.3 });
  out.U += c1;
  // "?" saat kata "Kenapa?"
  const q = pop(t, 5.56, 0.4), qa = clamp((6.8 - t) / 0.2);
  if (q > 0 && qa > 0) out.U += hikBubble(780, 500, q * 1.1, qa, '?', { size: 90, stroke: K.head, fg: K.head });
}
