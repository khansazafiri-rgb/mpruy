// B-D. PENAMPANG: normal -> tertekan -> tekanan hilang, pada titik tekanan yang sama (betis kaki R). Skala dan sudut sama di semua keadaan.
import { f1, clamp, lerp, sm, eo, K, T, tw, op, chip, tag, callout, rk } from './common.js';
import { sectionSvg, pulsesSvg, sparksSvg, touchSvg, press, Y, ZX, dent, pn } from './tissue.js';
import { seatedC, seatedU, SK } from './seat.js';
import { rakaSvg } from '../../../brand/characters/raka/raka.js';
const bg = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F7F2E4"/>`;
/** kaki penindih (celana gelap) dari atas: menekan kulit */
function topLeg(t) {
  const p = press(t); if (p <= 0.005) return '';
  const yb = Y.skin + dent(ZX, p) - 3 - (1 - eo(clamp(p * 1.6))) * 330;
  return `<defs><clipPath id="tl"><rect x="0" y="340" width="1080" height="${Math.max(0, yb + 10 - 340)}"/></clipPath></defs><g clip-path="url(#tl)"><rect x="${ZX - 205}" y="${f1(yb - 440)}" width="410" height="440" rx="120" fill="${K.pants}"/><rect x="${ZX - 170}" y="${f1(yb - 440)}" width="22" height="400" rx="11" fill="#3A4468" opacity=".7"/></g><text x="${ZX}" y="${f1(Math.max(430, yb - 235))}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="32" fill="#fff" opacity="${f1(clamp(p * 2))}">KAKI PENINDIH</text>`
    + `<g opacity="${f1(clamp(p * 2))}">${[-60, 0, 60].map((dx) => `<path d="M${ZX + dx} ${f1(yb - 150)}L${ZX + dx} ${f1(yb - 96)}" stroke="${K.press}" stroke-width="10" stroke-linecap="round"/><path d="M${ZX + dx - 16} ${f1(yb - 104)}L${ZX + dx} ${f1(yb - 78)}L${ZX + dx + 16} ${f1(yb - 104)}Z" fill="${K.press}" stroke="${K.pressD}" stroke-width="3" stroke-linejoin="round"/>`).join('')}</g>`;
}
/** kartu lokasi kecil: Raka duduk, kaki terkena (R) dan titik tekanan */
function locator(t, a) {
  if (a <= 0.01) return ''; const x = 840, y = 352, w = 200, h = 196, cross = press(t) > 0.35 || (t > 28.4 && t < 30.2);
  const st = cross ? seatedC('netral', { yaw: 0.4 }) : seatedU('netral', { yaw: 0.4 }), k = 0.62, tx = x + w / 2 - 340 * k, ty = y + h / 2 - 650 * k;
  const R = SK; void R;
  const pr = (px, py) => [tx + px * k, ty + py * k];
  const pt = pr(345, 650);
  return `<g opacity="${f1(a)}"><rect x="${x + 4}" y="${y + 10}" width="${w}" height="${h}" rx="28" fill="rgba(0,0,0,.24)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#fff"/><clipPath id="lc"><rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="22"/></clipPath><g clip-path="url(#lc)"><g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid: 'rLoc', shadow: false })}</g><circle cx="${f1(pt[0])}" cy="${f1(pt[1])}" r="22" fill="none" stroke="${K.press}" stroke-width="5" stroke-dasharray="9 6"/></g></g>`;
}
/** kartu NORMAL kecil (pembanding, sudut dan skala sama) */
function normalCard(t, a) {
  if (a <= 0.01) return ''; const x = 40, y = 352, w = 292, h = 196, k = 0.26, tb = 12.6;
  return `<g opacity="${f1(a)}"><rect x="${x + 4}" y="${y + 10}" width="${w}" height="${h}" rx="26" fill="rgba(0,0,0,.24)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="#fff"/><clipPath id="nc"><rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="20"/></clipPath><g clip-path="url(#nc)"><g transform="translate(${x + 6} ${y - 22}) scale(${k}) translate(0 -490)">${sectionSvg(tb, { p: 0, pf: 0, pn: 0 })}${pulsesSvg(tb, { pn: 0 })}</g></g>${T('NORMAL', x + w / 2, y + h - 12, { size: 28, fill: K.forest })}</g>`;
}
export function sceneTissue(t, out, inA = 1) {
  let s = bg + sectionSvg(t) + topLeg(t);
  s += touchSvg(t) + sparksSvg(t) + pulsesSvg(t);
  out.A += s;
  // keterangan tetap: arah sinyal dan arah darah
  const la = clamp((t - 9.7) / 0.4);
  let u = '';
  u += tag('◂ KE OTAK', 130, Y.nerve + 68, la, { size: 32, bg: K.sig, fg: K.navy }) + tag('DARI KAKI', 930, Y.nerve + 68, la, { size: 32, bg: '#fff', fg: K.forest });
  u += chip(['SARAF MEMBAWA SENTUHAN'], t, 7.0, 10.95, { size: 52 });
  u += chip(['SARAF BUTUH SUPLAI DARAH'], t, 11.2, 14.6, { size: 50 });
  u += chip(['KAKI TERTEKAN'], t, 15.15, 17.15, { size: 60 });
  u += chip(['TEKANAN SEMENTARA'], t, 17.2, 19.4, { size: 56, bg: K.press, fg: '#fff' });
  u += chip(['SINYAL TERGANGGU'], t, 19.45, 20.95, { size: 56, bg: K.press, fg: '#fff' });
  u += chip(['PESAN TIDAK TERKIRIM'], t, 21.0, 24.6, { size: 56, bg: K.press, fg: '#fff' });
  u += chip(['SUPLAI DAN SARAF', 'MULAI PULIH'], t, 28.95, 32.2, { size: 54 });
  u += chip(['SINYAL BELUM TERATUR'], t, 32.25, 35.7, { size: 52, bg: K.spark, fg: K.navy });
  u += chip(['SEPERTI DITUSUK-TUSUK'], t, 35.75, 38.15, { size: 52, bg: K.spark, fg: K.navy });
  u += chip(['LALU MEREDA'], t, 38.2, 40.9, { size: 58 });
  // label
  u += callout('SARAF', 180, 706, 330, Y.nerve - 24, clamp((t - 8.1) / 0.25) * clamp((10.8 - t) / 0.3), { size: 38, col: K.nerveD });
  u += callout('SINYAL SENTUHAN', 760, 700, 990, 690, clamp((t - 9.1) / 0.25) * clamp((10.9 - t) / 0.3), { size: 34, col: K.sigD, ex: 760 + tw('SINYAL SENTUHAN', 34) / 2 + 23 });
  u += callout('PEMBULUH DARAH', 330, 1150, 520, 1050, clamp((t - 12.3) / 0.25) * clamp((14.6 - t) / 0.3), { size: 36, col: K.bloodD });
  u += callout('ALIRAN BERKURANG', 820, 1150, 700, 1048, clamp((t - 17.9) / 0.25) * clamp((21.0 - t) / 0.3), { size: 34, col: K.bloodD });
  u += callout('SINYAL MELEMAH', 240, 930, 450, Y.nerve + 24, clamp((t - 19.5) / 0.25) * clamp((24.6 - t) / 0.3), { size: 34, col: K.sigD });
  u += callout('ALIRAN PULIH', 820, 1150, 700, 1048, clamp((t - 30.9) / 0.25) * clamp((32.4 - t) / 0.3), { size: 34, col: K.bloodD });
  u += callout('KESEMUTAN', 300, 930, 480, Y.nerve + 30, clamp((t - 37.2) / 0.25) * clamp((38.9 - t) / 0.3), { size: 38, col: K.sparkD });
  const legend = clamp((t - 12.0) / 0.4);
  u += op(legend, `<rect x="250" y="1226" width="580" height="54" rx="27" fill="#fff"/><circle cx="296" cy="1253" r="12" fill="${K.sig}" stroke="#fff" stroke-width="3"/>${T('SINYAL SARAF', 450, 1264, { size: 28, fill: K.forest })}<circle cx="612" cy="1253" r="12" fill="${K.blood}" stroke="${K.bloodD}" stroke-width="3"/>${T('DARAH', 700, 1264, { size: 28, fill: K.forest })}`);
  // kartu
  out.A += locator(t, clamp((t - 7.0) / 0.4));
  out.A += normalCard(t, clamp((t - 17.3) / 0.35) * clamp((24.5 - t) / 0.3));
  out.U += u;
}
