// Penampang telinga: B (5,2 - 18,7) tekanan berubah; C (20,7 - 27,1) tuba terbuka dan pop; D (28,2 - 30,3) saat pilek; E (30,2 - 33,5) perbandingan + Raka.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, T, GOLD, INK, rndf, K, W, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, ka } from './common.js';
import { EK, earWorld, earState, arrivals, gauges, TUBE_D } from './ear.js';

const OX = 540, OY = 880;
const wrap = (t, cam, world) => { const [z, cx, cy] = cam(t); return { tr: `translate(${OX} ${OY}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})`, z, cx, cy, S: (x, y) => [OX + (x - cx) * z, OY + (y - cy) * z] }; };
const bgEar = `<rect x="-100" y="-100" width="1300" height="2200" fill="${EK.tissue}"/>`;
const tagIl = (t, a) => tag('Ilustrasi edukatif', 905, 1262, a, { size: 24, bg: '#fff' });
const GA = (t) => (t < 18.7 ? ka(t, 8.2, 18.7, 0.3) : 1);
function gaugeLabels(t, a) { a = a * GA(t); return tag('LUAR', 75, 985, a, { size: 24, bg: '#FFE1CF', fg: '#8A3F0E' }) + tag('TENGAH', 161, 985, a, { size: 24, bg: '#D4EEFB', fg: '#0A4A75' }); }
const camB = track([[5.2, 1.7, -520, 0], [6.3, 1.7, -60, 0], [7.5, 1.1, 150, 300], [10.5, 1.13, 165, 306], [12.3, 1.16, 150, 300], [13.1, 1.8, 40, 10], [16.0, 1.85, 50, 14], [17.3, 1.12, 150, 300], [18.7, 1.17, 165, 308]]);
export function sceneB(t, out) {
  const st = { nOut: 10 + 20 * seg(t, 8.5, 12.9, (x) => x), arr: [], open: 0 };
  const e = earWorld(t, st), c = wrap(t, camB);
  out.A += `${bgEar}<g transform="${c.tr}">${e.svg}</g>` + gauges(75, 1010, 240, e.S, GA(t));
  const S = c.S;
  let u = chip(['TEKANAN BELUM', 'SEIMBANG'], t, 11.4, 18.7, { size: 56, bg: '#FFE1CF', fg: '#8A3F0E' });
  u += callout('liang telinga', 330, 760, S(-420, 20)[0], S(-420, 20)[1], ka(t, 5.3, 6.9, 0.25) * (c.z > 1.4 ? 1 : 0), { size: 34, col: GOLD });
  u += callout('gendang telinga', 760, 400, S(0, -90)[0], S(0, -90)[1], ka(t, W.gendang1 - 0.1, 8.3, 0.25), { size: 36, col: EK.drumD });
  u += callout('telinga tengah', 830, 1010, S(250, 100)[0], S(250, 100)[1], ka(t, 6.55, 8.3, 0.25), { size: 34, col: EK.midD }) + tag('berisi udara', 720, 770, ka(t, W.udara1 - 0.1, 8.3, 0.25), { size: 30, bg: '#D4EEFB', fg: '#0A4A75' });
  u += tag('pesawat turun ↓', 800, 340, ka(t, 8.3, 11.3, 0.3), { size: 30, bg: '#fff' }) + tag('tekanan kabin berubah', 790, 395, ka(t, W.kabin - 0.1, 11.3, 0.3), { size: 28, bg: '#fff' });
  u += tag('TEKANAN LUAR ↑', 330, 415, ka(t, W.tekanan2 - 0.1, 18.6, 0.3), { size: 32, bg: EK.out, fg: INK }) + tag('TEKANAN TELINGA TENGAH', 770, 700, ka(t, W.kedua, 18.6, 0.3) * (c.z < 1.4 ? 1 : 0), { size: 28, bg: EK.mid, fg: '#fff' });
  u += tag('GENDANG TERDORONG ke dalam →', 600, 470, ka(t, W.gendang3, 16.2, 0.3) * (c.z > 1.4 ? 1 : 0), { size: 32, bg: '#fff' });
  // suara teredam: gelombang di mulut liang telinga makin kecil
  const mu = ka(t, W.suara, 18.6, 0.4); if (mu > 0.01) { for (let i = 0; i < 3; i++) { const ph = (t * 1.2 + i / 3) % 1; u += `<path d="M${f1(120 + 80 * ph)} ${f1(S(0, 0)[1] - 40)}q${f1(28 - 14 * ph)} 40 0 80" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="${f1(mu * (1 - ph) * 0.7)}"/>`; } u += tag('suara teredam', 260, S(0, 0)[1] - 80, mu, { size: 30, bg: '#fff' }); }
  u += gaugeLabels(t, 1) + tagIl(t, 1);
  out.U += u;
}
const camC = track([[20.7, 1.1, 150, 300], [21.9, 1.45, 270, 430], [24.0, 1.45, 270, 430], [25.0, 1.5, 60, 60], [27.1, 1.6, 40, 10]]);
export const ARR_C = arrivals(23.15, 18, 0.19);
export function sceneC(t, out) {
  const open = seg(t, 21.4, 22.2) * (1 - seg(t, 26.2, 26.9));
  const st = { nOut: 30, arr: ARR_C, nMidBase: 10, open };
  const e = earWorld(t, st), c = wrap(t, camC);
  out.A += `${bgEar}<g transform="${c.tr}">${e.svg}</g>` + gauges(75, 1010, 240, e.S, GA(t));
  const S = c.S;
  // "pop": cincin lembut pada gendang saat tekanan seimbang
  const pp = (t - W.pop2) / 0.9; let pop_ = '';
  if (pp > 0 && pp < 1) { const q = S(0, 0); for (let i = 0; i < 2; i++) { const p2 = clamp(pp - i * 0.2); pop_ += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(60 + 190 * p2)}" fill="none" stroke="#fff" stroke-width="${f1(14 * (1 - p2))}" opacity="${f1((1 - p2) * 0.9)}"/>`; } }
  let u = chip(['SALURAN EUSTACHIUS', 'TERBUKA'], t, 20.75, 23.0, { size: 56, bg: '#CFF5E6', fg: '#0A4A3A' }) + chip(['UDARA MASUK'], t, 23.05, 24.2, { size: 62, bg: '#fff' }) + chip(['TEKANAN SEIMBANG'], t, 24.2, 27.15, { size: 60, bg: '#CFF5E6', fg: '#0A4A3A' });
  u += callout('saluran Eustachius', 760, 520, S(300, 480)[0], S(300, 480)[1], ka(t, W.saluran1 - 0.2, 23.0, 0.25) , { size: 34, col: EK.drumD, k: eo(clamp((t - W.saluran1 + 0.2) / 0.4)) });
  u += tag('ke belakang hidung', 800, 1130, ka(t, 21.3, 23.0, 0.3), { size: 28, bg: '#fff' });
  u += tag('udara masuk ke telinga tengah', 560, 1060, ka(t, W.masuk, 25.0, 0.3), { size: 30, bg: '#fff' });
  u += tag('gendang kembali ke posisi semula', 600, 400, ka(t, 25.0, 27.1, 0.3), { size: 30, bg: '#fff' });
  u += pop_ + chipPop(t) + gaugeLabels(t, 1) + tagIl(t, 1);
  out.U += u;
}
function chipPop(t) { const p = (t - W.pop2) / 1.0; if (p < 0 || p > 1) return ''; const k = eo(clamp(p * 4)); return `<g opacity="${f1(1 - clamp((p - 0.7) / 0.3))}" transform="translate(540 760) scale(${f1(0.7 + 0.5 * k)})"><rect x="-150" y="-80" width="300" height="140" rx="70" fill="#fff"/>${T('pop!', 0, 30, { size: 96, fill: '#0A4A3A' })}</g>`; }
const camD = track([[28.2, 1.1, 150, 300], [29.2, 1.45, 270, 430], [30.3, 1.45, 270, 430]]);
export function sceneD(t, out) {
  const swell = seg(t, 28.45, 29.5), tr_ = Math.sin(Math.PI * clamp((t - 29.7) / 0.6)), open = 0.18 * tr_;
  const st = { nOut: 30, arr: [], nMidBase: 10, open, swell };
  const e = earWorld(t, st), c = wrap(t, camD);
  out.A += `${bgEar}<g transform="${c.tr}">${e.svg}</g>` + gauges(75, 1010, 240, e.S, GA(t));
  const S = c.S;
  let u = chip(['SAAT PILEK:', 'SALURAN SEMPIT'], t, 28.3, 30.3, { size: 58, bg: '#FFD9D1', fg: '#8A2F22' });
  u += callout('saluran membengkak', 770, 560, S(300, 480)[0], S(300, 480)[1], ka(t, W.tersumbat - 0.2, 30.3, 0.25), { size: 34, col: EK.swell });
  u += tag('udara sulit lewat', 800, 1130, ka(t, 29.7, 30.3, 0.3), { size: 28, bg: '#fff' });
  u += gaugeLabels(t, 1) + tagIl(t, 1);
  out.U += u;
}
function miniEar(t, x0, y0, st) {
  const e = earWorld(t, st), id = 'mp' + (x0 > 300 ? 'R' : 'L'), s = 0.58;
  return `<defs><clipPath id="${id}"><rect x="${x0}" y="${y0}" width="510" height="580" rx="34"/></clipPath></defs><rect x="${x0}" y="${y0}" width="510" height="580" rx="34" fill="${EK.tissue}"/><g clip-path="url(#${id})"><g transform="translate(${x0 + 255} ${y0 + 296}) scale(${s}) translate(-120 -250)">${e.svg}</g></g><rect x="${x0}" y="${y0}" width="510" height="580" rx="34" fill="none" stroke="#fff" stroke-width="8"/>`;
}
export function sceneE(t, out) {
  const stL = { nOut: 30, arr: [], nMidBase: 30, open: 0.95, swell: 0 }, stR = { nOut: 30, arr: [], nMidBase: 10, open: 0.15, swell: 1 };
  const ptr = seg(t, 31.0, 31.5);
  const st = rIdle(raka('menunjuk', 'menunjuk', { yaw: 0.0, lean: 2.2 * Math.sin(t * 2.6), tilt: 3 * Math.sin(t * 1.9) }), t);
  const r = rk(st, 540, 925, 0.6, 'rE');
  const pu = 0.5 + 0.5 * Math.sin(t * 5);
  out.A += `<rect width="1080" height="1920" fill="#E3EAF1"/>` + miniEar(t, 20, 360, stL) + miniEar(t, 550, 360, stR) + r.svg + `<rect x="550" y="360" width="510" height="580" rx="34" fill="none" stroke="#FF8A3D" stroke-width="${f1(6 + 8 * pu)}" opacity="${f1(ka(t, 31.2, 33.5, 0.3) * (0.4 + 0.5 * pu))}"/><rect x="20" y="360" width="510" height="580" rx="34" fill="none" stroke="#2DD4BF" stroke-width="${f1(6 + 8 * (1 - pu))}" opacity="${f1(ka(t, 30.6, 31.3, 0.2) * (0.4 + 0.5 * (1 - pu)))}"/>`;
  let u = chip(['TERBUKA vs SEMPIT'], t, 30.25, 33.5, { size: 56, bg: '#fff' });
  u += tag('TERBUKA → SEIMBANG', 275, 395, 1, { size: 28, bg: '#CFF5E6', fg: '#0A4A3A' }) + tag('SEMPIT → BELUM SEIMBANG', 805, 395, 1, { size: 26, bg: '#FFD9D1', fg: '#8A2F22' });
  u += tag('gendang di posisi semula', 275, 905, ka(t, 30.5, 33.5, 0.3), { size: 26, bg: '#fff' }) + tag('gendang masih terdorong', 805, 905, ka(t, W.nyeri - 1.2, 33.5, 0.3), { size: 26, bg: '#fff' });
  out.U += u;
}
