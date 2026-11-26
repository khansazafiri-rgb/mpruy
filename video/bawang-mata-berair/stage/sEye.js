// B2. PENAMPANG MATA (13,1 - 19,9): tampak depan mata kanan-layar Raka (sisi dalam/hidung di KIRI, sisi luar di KANAN, atas di atas).
// Iritan datang dari kanan-bawah (arah bawang di peta dapur), mendarat di permukaan mata; kelenjar air mata (atas, sisi luar) memproduksi air mata yang menyapu permukaan
// ke sudut dalam (saluran air mata) dan menetes di tepi kelopak bawah. Ilustrasi skematis edukatif.
import { f1, clamp, lerp, sm, eo, eio, eob, track, pchip, R, C, T, K, chip, tag, callout, op, camG, ka, tw } from './common.js';
import { mol } from './sKitchen.js';
import { navyBg } from './sCellBg.js';

const ALMOND = 'M140 940C260 780 440 730 600 735C780 740 900 810 940 905C880 1010 720 1100 540 1100C340 1100 200 1030 140 940Z';
const FLOW = [[850, 835], [790, 950], [520, 1012], [196, 988]];                      // aliran air mata: dari kelenjar, menyapu permukaan, ke sudut dalam
const bz = (u, P = FLOW) => { const a = 1 - u, [p0, p1, p2, p3] = P; return [a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0], a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1]]; };
const LAND = [[780, 880], [840, 962], [722, 1012], [662, 852], [884, 904], [764, 944]];
export const blinkB = (t) => { const d = t - 16.08; return clamp(0.12 * sm((t - 13.5) / 0.8) + (d > 0 && d < 0.3 ? Math.sin(Math.PI * d / 0.3) * 0.95 : 0)); };
function eyeBg(t, bl) {
  const pink = 0.3 * sm((t - 13.6) / 1.2) * (1 - 0.6 * sm((t - 18.2) / 1.5)), film = 0.08 + 0.26 * sm((t - 15.9) / 1.6) - 0.1 * sm((t - 18.8) / 1);
    let s = `<rect x="-200" y="0" width="1480" height="1920" fill="${K.skin}"/><path d="M-200 1250C100 1300 500 1330 1300 1230L1300 1920L-200 1920Z" fill="${K.skinD}" opacity=".35"/>`;
  s += `<path d="M110 650C300 520 620 470 930 590" fill="none" stroke="#212739" stroke-width="40" stroke-linecap="round"/><path d="M150 760C330 650 700 620 960 770" fill="none" stroke="#D79670" stroke-width="12" stroke-linecap="round"/>`;
  s += `<defs><clipPath id="alm"><path d="${ALMOND}"/></clipPath></defs><path d="${ALMOND}" fill="${K.sclera}"/>`;
  s += `<g clip-path="url(#alm)"><rect x="100" y="700" width="900" height="440" fill="#E8665F" opacity="${f1(pink)}"/>`;
  s += `<circle cx="690" cy="925" r="158" fill="${K.iris}"/><circle cx="690" cy="925" r="158" fill="none" stroke="${K.irisD}" stroke-width="12"/><circle cx="690" cy="925" r="112" fill="none" stroke="#8F6A4C" stroke-width="10" opacity=".7"/><circle cx="690" cy="925" r="64" fill="#1B1B2A"/><circle cx="640" cy="872" r="24" fill="#fff" opacity=".9"/><circle cx="738" cy="982" r="11" fill="#fff" opacity=".8"/>`;
  s += `<rect x="100" y="700" width="900" height="440" fill="${K.tear}" opacity="${f1(film)}"/><path d="M240 800C420 760 640 770 860 830" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="${f1(0.25 + film * 0.5)}"/>`;
  const d = bl * 330;     // kelopak atas turun mengikuti lengkung mata (sudut mata tetap)
  const lidEdge = `M140 940C260 ${f1(780 + d)} 440 ${f1(730 + d)} 600 ${f1(735 + d)}C780 ${f1(740 + d)} 900 ${f1(810 + d * 0.6)} 940 905`;
  s += `<path d="${lidEdge}L1300 905L1300 -200L-200 -200L-200 940Z" fill="${K.skin}"/><path d="${lidEdge}" fill="none" stroke="#C98A6A" stroke-width="8" opacity="${f1(clamp(bl * 6))}"/></g>`;
  s += `<path d="${ALMOND}" fill="none" stroke="#C98A6A" stroke-width="12" stroke-linejoin="round"/>`;
  // lubang saluran air mata di sudut dalam (kiri)
  s += `<ellipse cx="186" cy="978" rx="11" ry="7" fill="#7A3B2B"/><ellipse cx="226" cy="1010" rx="10" ry="6" fill="#7A3B2B"/>`;
  return s;
}
function glandCut(t) {
  const a = sm((t - 14.62) / 0.4), glow = a * (0.55 + 0.45 * Math.sin(t * 8)) * (t < 17.5 ? 1 : 0.4), sec = sm((t - 15.95) / 0.4) * (t < 17.9 ? 1 : 0.5);
  if (a <= 0.01) return '';
  const gx = 835, gy = 690;
  let s = `<defs><clipPath id="cg"><circle cx="${gx}" cy="${gy}" r="128"/></clipPath></defs><g opacity="${f1(a)}">`;
  s += `<circle cx="${gx}" cy="${gy}" r="${f1(136 + 10 * glow)}" fill="${K.gold}" opacity="${f1(0.3 * glow)}"/><circle cx="${gx}" cy="${gy}" r="128" fill="rgba(22,34,74,.92)"/><g clip-path="url(#cg)">`;
  s += `<path d="M770 690C770 636 850 620 892 656C928 690 906 744 850 750C800 752 770 736 770 690Z" fill="${K.gland}" stroke="${K.glandD}" stroke-width="6" stroke-linejoin="round"/>`;
  [[805, 676], [840, 664], [878, 684], [826, 714], [862, 722]].forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="15" fill="#F2A58A" stroke="${K.glandD}" stroke-width="3"/>`; });
  [[804, 748, 818, 826], [840, 752, 850, 832], [878, 744, 886, 822]].forEach(([x0, y0, x1, y1]) => { s += `<path d="M${x0} ${y0}L${x1} ${y1}" stroke="#F8C7B5" stroke-width="7" stroke-linecap="round"/>`; });
  s += `</g><circle cx="${gx}" cy="${gy}" r="128" fill="none" stroke="${K.gold}" stroke-width="7" stroke-dasharray="${sec > 0.1 ? '0' : '16 12'}"/></g>`;
  return s;
}
export function sceneEye(t, out) {
  const bl = blinkB(t); let w = eyeBg(t, bl);
  // iritan datang dari kanan-bawah (arah bawang), mendarat di permukaan mata; sesudah 17,55 tersapu air mata ke sudut dalam
  LAND.forEach(([lx, ly], i) => {
    const t0 = 13.12 + 0.11 * i, u = clamp((t - t0) / 0.8), sx = 1180 + i * 40, sy = 1380 - i * 55; if (u <= 0) return;
    const e = eo(u), cxp = lerp(sx, lx, e) + 30 * Math.sin(Math.PI * e) , cyp = lerp(sy, ly, e) - 70 * Math.sin(Math.PI * e);
    const tw0 = 17.7 + 0.14 * i, v = clamp((t - tw0) / 1.2), ev = eio(v);
    let x = cxp + (t > t0 + 0.8 ? Math.sin(t * 5 + i) * 3 : 0), y = cyp + (t > t0 + 0.8 ? Math.cos(t * 4 + i) * 3 : 0), a = 1, sc = 1.35;
    if (v > 0) { const [fx, fy] = bz(ev, [[lx, ly], [lx - 80, ly + 50], [520, 1030], [i % 2 ? 540 : 196, i % 2 ? 1110 : 990]]); x = fx; y = fy; a = 1 - clamp((v - 0.7) / 0.3); sc = lerp(1.35, 0.8, v); }
    w += mol(x, y, sc, t * 60 + i * 50, a);
  });
  // tetes dari kelenjar menyapu permukaan (15,98 - 17,9) dan sedikit sesudahnya
  for (let k = 0; k < 14; k++) { const ts = 15.98 + 0.13 * k, u = (t - ts) / 1.5; if (u < 0 || u > 1) continue; const [x, y] = bz(eio(u)), r = 13 + 4 * Math.sin(k * 2.3);
    w += `<g opacity="${f1(clamp(u * 6) * (1 - clamp((u - 0.8) / 0.2)))}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${K.tear}" stroke="${K.tearD}" stroke-width="3"/><circle cx="${f1(x - 4)}" cy="${f1(y - 4)}" r="4" fill="#fff" opacity=".85"/></g>`; }
  // genangan di tepi kelopak bawah dan tetesan jatuh
  const pool = sm((t - 15.9) / 1.8) * 26;
  if (pool > 1) w += `<path d="M230 1030C330 1090 440 1100 540 1100C700 1100 820 1040 900 960C820 1020 700 1062 540 1066C430 1066 330 1056 230 1030Z" fill="${K.tear}" stroke="${K.tearD}" stroke-width="3" opacity="${f1(0.55 + pool / 60)}" transform="translate(0 ${f1(-6 + pool * 0.2)})"/>`;
  [[420, 18.25, 19.0], [640, 18.6, 19.3], [300, 18.95, 19.65]].forEach(([dx, tf, tl], i) => {
    const grow = clamp((t - tf) / 0.7), fall = t > tl ? (t - tl) : 0, y = 1096 + 70 * grow + 900 * fall * fall * 1.1, r = 6 + 20 * eo(grow);
    if (grow > 0 && y < 2100) w += `<path d="M${dx} ${f1(y - r * 2.1)}C${f1(dx + r * 0.2)} ${f1(y - r * 1.2)} ${f1(dx + r)} ${f1(y - r * 0.4)} ${f1(dx + r)} ${f1(y + r * 0.3)}C${f1(dx + r)} ${f1(y + r * 1.1)} ${f1(dx - r)} ${f1(y + r * 1.1)} ${f1(dx - r)} ${f1(y + r * 0.3)}C${f1(dx - r)} ${f1(y - r * 0.4)} ${f1(dx - r * 0.2)} ${f1(y - r * 1.2)} ${dx} ${f1(y - r * 2.1)}Z" fill="${K.tear}" stroke="${K.tearD}" stroke-width="4"/>${i === 0 && t > 18.9 ? mol(dx, y + 2, 0.8, t * 50, clamp(1 - (t - 18.9) * 1.2)) : ''}`;
  });
  w += glandCut(t);
  const z = lerp(1.32, 1.2, sm((t - 13.3) / 1.4)) + 0.05 * sm((t - 15.8) / 3.5);
  out.A += navyBg.replace('id="nbg"', 'id="nbg2"').replace('url(#nbg)', 'url(#nbg2)') + camG(w, z, 560, 900, 540, 900);
  const sc = (x, y) => [540 + (x - 560) * z, 900 + (y - 900) * z];
  // ------------- teks
  out.U += chip('IRITAN SAMPAI DI MATA', t, 13.35, 14.6, { size: 56 });
  const gp = sc(835, 690); out.U += chip('KELENJAR AIR MATA', t, 14.62, 17.4, { size: 58, bg: K.gold, fg: '#172B38' });
  out.U += tag('atas, sisi luar mata', gp[0] - 20, gp[1] - 175, ka(t, 14.85, 17.3, 0.3), { size: 34 });
  out.U += chip('AIR MATA MEMBANTU MEMBILAS', t, 17.4, 19.85, { size: 54, bg: K.tear, fg: '#0A3830' });
  return { eye: sc(690, 925) };
}
