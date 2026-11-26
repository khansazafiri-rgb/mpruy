// C. PENUTUP EDUKASI (18,2 - 29,4): "REFLEKS LUTUT" + rangkaian satu layar yang bergerak (ketuk -> sinyal ke sumsum -> sinyal kembali -> kaki bergerak),
// lalu perbandingan kedua lutut yang sedang diperiksa (tanpa hasil/diagnosis), akhir bersih sebelum master outro.
import { f1, clamp, lerp, sm, eo, eio, eob, K, T, chip, tag, op, camG, rk, rIdle, lerpState, pop, tw } from './common.js';
import { SK, rg, rp, room, chair, hammerSvg, impact, seated, withKick, kick, KNEE } from './seat.js';

// ------------------------------------------------------------------ ikon kecil untuk kartu (kotak lokal 130 x 130)
const leg = (th, acc = 0) => `<rect x="14" y="52" width="74" height="30" rx="14" fill="#212739"/><g transform="translate(78 67) rotate(${f1(-th)})"><rect x="-14" y="-6" width="28" height="64" rx="13" fill="#212739"/><rect x="-18" y="46" width="40" height="16" rx="8" fill="#F5E8D6"/></g>` + (acc ? `<path d="M118 ${f1(96 - th)}A44 44 0 0 0 100 ${f1(112 - th * 0.2)}" fill="none" stroke="${K.mot}" stroke-width="6" stroke-linecap="round" opacity="${f1(acc)}"/>` : '');
const butterfly = () => `<circle cx="65" cy="52" r="48" fill="#F1EFE6" stroke="${K.cordD}" stroke-width="4"/><ellipse cx="40" cy="52" rx="28" ry="20" fill="#A9B2D4"/><ellipse cx="90" cy="52" rx="26" ry="24" fill="#A9B2D4"/><rect x="48" y="42" width="34" height="20" rx="6" fill="#A9B2D4"/>`;
const ICONS = [
  (t) => `${leg(0)}<g transform="translate(${f1(112 - 8 * Math.abs(Math.sin(t * 7)))} 84) rotate(-30)"><rect x="0" y="-5" width="40" height="10" rx="5" fill="${K.steel}"/><path d="M-4 -16L-4 16L-22 12L-22 -12Z" fill="${K.hammer}" stroke="${K.hammerD}" stroke-width="3" stroke-linejoin="round"/></g>`,
  () => `${butterfly()}<path d="M26 128C26 108 32 94 36 70" fill="none" stroke="${K.sens}" stroke-width="9" stroke-linecap="round"/><path d="M28 72L36 62L46 74" fill="none" stroke="${K.sens}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  () => `${butterfly()}<path d="M94 70C98 94 104 108 104 126" fill="none" stroke="${K.mot}" stroke-width="9" stroke-linecap="round"/><path d="M92 118L104 130L116 118" fill="none" stroke="${K.mot}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  (t, a) => leg(26, a),
];
const LAB = [['KETUK', 'TENDON'], ['SINYAL KE', 'SUMSUM'], ['SINYAL', 'KEMBALI'], ['KAKI', 'BERGERAK']], ACC = [K.gold, K.sens, K.mot, K.gold];
const X0 = 660, W0 = 380, Y0 = 430, H0 = 170, GAP = 30, TPOP = [18.55, 18.85, 19.15, 19.45];
/** waktu kejadian satu putaran rangkaian: [kartu1, panah1(mulai, selesai), kartu2, panah2, kartu3, panah3, kartu4] */
const LOOPS = [{ c: [19.95, 20.5, 20.9, 21.3], a: [[20.0, 20.5], [20.7, 20.9], [21.0, 21.3]] }, { c: [22.5, 22.72, 22.92, 23.12], a: [[22.52, 22.7], [22.8, 22.9], [22.94, 23.1]] }];
export function sceneRecap(t, out) {
  const fade = 1 - sm((t - 23.45) / 0.35); if (t < 18.2 || fade <= 0.01) return;
  out.U += chip(['REFLEKS LUTUT'], t, 18.2, 23.7, { size: 64, bg: K.gold, fg: '#172B38' });
  let s = '';
  const glow = (i) => { let g = 0; for (const L of LOOPS) g = Math.max(g, clamp(1 - Math.abs(t - L.c[i] - 0.12) / 0.22)); return g; };
  const hl = t >= 21.4 && t < 23.5;
  for (let i = 0; i < 4; i++) {
    const y = Y0 + i * (H0 + GAP), a = clamp((t - TPOP[i]) / 0.15), k = pop(t, TPOP[i], 0.4); if (a <= 0) continue;
    const g = glow(i), on = hl && (i === 1 || i === 2);
    s += `<g opacity="${f1(a)}" transform="translate(${X0 + W0 / 2} ${y + H0 / 2}) scale(${f1((k + 0.07 * g) * 1000) / 1000}) translate(${-(X0 + W0 / 2)} ${-(y + H0 / 2)})"><rect x="${X0 + 4}" y="${y + 10}" width="${W0}" height="${H0}" rx="36" fill="rgba(10,56,48,.22)"/><rect x="${X0}" y="${y}" width="${W0}" height="${H0}" rx="36" fill="#fff" stroke="${g > 0.2 || on ? ACC[i] : '#fff'}" stroke-width="${g > 0.2 || on ? 9 : 0}"/><g transform="translate(${X0 + 14} ${y + 20})">${ICONS[i](t, i === 3 ? clamp(1 - Math.abs(t - 21.45) / 0.3) : 0)}</g><circle cx="${X0 + 30}" cy="${y + 30}" r="22" fill="${ACC[i]}" stroke="#fff" stroke-width="4"/>${T(String(i + 1), X0 + 30, y + 40, { size: 28, fill: '#172B38' })}${T(LAB[i][0], X0 + 158, y + 84, { size: 33, fill: K.forest, anchor: 'start' })}${T(LAB[i][1], X0 + 158, y + 124, { size: 33, fill: K.forest, anchor: 'start' })}</g>`;
    if (i < 3 && t >= TPOP[i] + 0.4) {
      const ax = X0 + W0 / 2, ay = y + H0 + 4, col = [K.sens, '#8FA0B3', K.mot][i], aa = clamp((t - TPOP[i] - 0.4) / 0.2);
      s += `<path d="M${ax - 22} ${ay}L${ax + 22} ${ay}L${ax} ${ay + 22}Z" fill="${col}" opacity="${f1(aa)}"/>`;
      for (const L of LOOPS) { const [t0, t1] = L.a[i], u = (t - t0) / (t1 - t0); if (u > 0 && u < 1) s += `<circle cx="${ax}" cy="${f1(ay - 22 + 52 * u)}" r="13" fill="${col}" stroke="#fff" stroke-width="5"/>`; }
    }
  }
  out.U += `<g opacity="${f1(fade)}">${s}</g>`;
  const jt = ka2(t, 21.4, 23.5);
  if (jt > 0.01) out.U += `<g opacity="${f1(jt * fade)}">${tagS('JALUR REFLEKS', 850, 396, 36)}</g>`;
  const slow = ka2(t, 19.8, 20.6);
  if (slow > 0.01) out.U += `<g opacity="${f1(slow * fade)}">${tagS('ULANGI PELAN-PELAN', 540, 392, 34)}</g>`;
}
const ka2 = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const tagS = (txt, x, y, size) => { const w = tw(txt, size) + 46, h = size + 26; return `<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="#fff"/>${T(txt, x, y + size * 0.36, { size, fill: K.forest })}`; };
// ------------------------------------------------------------------ perbandingan kedua lutut (23,9 - 29,4)
const PA = { x: 24, y: 480, w: 500, h: 660 }, PB = { x: 556, y: 480, w: 500, h: 660 }, S = 0.74, WX0 = 250, WY0 = 405;
export const TAPS_A = [24.6, 26.55], TAPS_B = [25.5, 26.55];
function panel(P, t, taps, flip, id) {
  const th = taps.reduce((a, tc) => a + kick(t, tc + 0.04, 0.28, 31), 0);
  const st = withKick(rIdle(seated('lega', { yaw: 0.35, gazeX: 0.8, gazeY: 0.7, flip: flip ? 1 : 0 }), t + (flip ? 1.3 : 0)), th);
  const r = rk(st, SK.cx, SK.ty, SK.k, 'rP' + id), mir = (x) => (flip ? `<g transform="translate(${2 * SK.cx} 0) scale(-1 1)">${x}</g>` : x);
  const chairG = rg(flip ? `<g transform="translate(400 0) scale(-1 1)">${chair()}</g>` : chair());
  const world = room() + chairG + r.svg + mir(hammerSvg(t, taps) + impact(t, taps));
  const mx = flip ? P.x + P.w - (SK.cx * 0 + 0) : 0;
  const tx = P.x - S * (flip ? (2 * SK.cx - (WX0 + P.w / S)) : WX0), ty = P.y - S * WY0;
  return `<defs><clipPath id="pc${id}"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="38"/></clipPath></defs><rect x="${P.x + 4}" y="${P.y + 12}" width="${P.w}" height="${P.h}" rx="38" fill="rgba(0,0,0,.22)"/><g clip-path="url(#pc${id})"><g transform="translate(${f1(tx)} ${f1(ty)}) scale(${S})">${world}</g></g><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="38" fill="none" stroke="#fff" stroke-width="8"/>`;
}
export function sceneCompare(t, out) {
  const a = sm((t - 23.5) / 0.4); if (a <= 0.01) return;
  out.A += `<g opacity="${f1(a)}"><rect x="-3000" y="-3000" width="8000" height="8000" fill="#E9E4D6"/>${panel(PA, t, TAPS_A, false, 'A')}${panel(PB, t, TAPS_B, true, 'B')}</g>`;
  out.U += op(a, tagS('LUTUT KANAN', PA.x + PA.w / 2, PA.y + 44, 38) + tagS('LUTUT KIRI', PB.x + PB.w / 2, PB.y + 44, 38));
  out.U += chip(['MENILAI JALUR', 'SARAF DAN OTOT'], t, 23.9, 27.7, { size: 56 });
  const bt = ka2(t, 24.3, 27.7, 0.3); if (bt > 0.01) out.U += `<g opacity="${f1(bt)}">${tagS('BANDINGKAN KIRI DAN KANAN', 540, 1222, 40)}</g>`;
}
