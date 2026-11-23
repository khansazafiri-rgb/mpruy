// Penampang dasar kuku (ilustrasi edukatif, dibuat baru; bukan data nyata): lempeng kuku, dasar kuku dengan pembuluh kecil (kapiler), tulang ujung jari, jari pemeriksa menekan.
// Koordinat lokal: jari menghadap kanan; x 0..900, y -180..330. Semua dari fungsi waktu bersama crt(tn).
import { f1, clamp, lerp, T, INK } from './lib.js';
import { mixc, SKIN } from './hand.js';
import { pathPt } from './core.js';
const mod = (a, n) => ((a % n) + n) % n;
export const VC = { pale: '#EBCFC8', red: '#E0524B', redD: '#B5322E', bedPale: '#F4DDD7', bedPink: '#F1A39C', plate: '#DCE9EF' };
/** c = crt(tn); o: { tn, cold 0..1, labels } */
export function cross(c, o = {}) {
  const { tn = 0, cold = 0, labels = true } = o, pr = c.press, f = c.fill, dy = 24 * pr, tw = 11 * (0.3 + 0.7 * f) * (1 - 0.5 * pr) * (1 - 0.38 * cold);
  let s = '';
  // jari (kulit) dan tulang
  s += `<path d="M0 40H650C790 40 885 95 885 175C885 255 800 312 650 312H0Z" fill="${SKIN.patient[0]}" stroke="${SKIN.patient[3]}" stroke-width="4" stroke-linejoin="round" opacity="1"/><path d="M0 250H650C790 250 840 232 862 205C850 270 780 312 650 312H0Z" fill="${SKIN.patient[1]}" opacity=".55"/>`;
  s += `<path d="M40 182C40 168 52 160 66 160H575C615 160 650 178 650 215C650 252 615 272 575 272H66C52 272 40 262 40 248Z" fill="#F5EEDF" stroke="#CDBFA6" stroke-width="4"/>`;
  // lapisan atas yang ikut tertekan (lempeng kuku, dasar kuku, pembuluh)
  const bed = mixc(VC.bedPale, VC.bedPink, f), col = mixc(VC.pale, VC.red, f), ys = [76, 92, 108];
  s += `<g transform="translate(0 ${f1(dy)})"><rect x="206" y="62" width="40" height="64" rx="16" fill="${SKIN.patient[1]}"/><rect x="226" y="58" width="574" height="72" rx="14" fill="${bed}" stroke="${mixc(bed, '#7A3F3A', 0.3)}" stroke-width="3"/>`;
  s += `<path d="M230 36H800C808 36 812 46 812 54V58H230Z" fill="${VC.plate}" stroke="#9FB4BF" stroke-width="3"/><path d="M262 44H760" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  for (const y of ys) s += `<path d="M236 ${y + 12}H790" stroke="${col}" stroke-width="${f1(tw)}" stroke-linecap="round"/>`;
  // sel darah merah mengalir di pembuluh kecil (hanya saat terisi); tersingkir ke ujung-ujung saat ditekan
  const flow = c.kind === 'lambat' ? 70 : 130, a = clamp((f - 0.12) / 0.4), sp = c.running && !c.done && f < 0.995 ? flow : (f > 0.9 ? 26 : 0), ph = tn * sp;
  ys.forEach((y, k) => { for (let i = 0; i < 5; i++) { const u = mod((ph + i * 108 + k * 41) / 540, 1), x = 240 + u * 540, drift = (1 - f) * 70 * (x < 510 ? -1 : 1); s += `<ellipse cx="${f1(x + drift)}" cy="${y + 12}" rx="${f1(9 * (0.5 + 0.5 * f))}" ry="${f1(5.5 * (0.5 + 0.5 * f))}" fill="${VC.redD}" opacity="${f1(a * 0.95 * 100) / 100}"/>`; } });
  s += `</g>`;
  // pembuluh pengantar (arteriol, kiri) dan pembuangan (venula, kanan): lebih besar; ujung mengikuti lapisan yang tertekan
  const fd = `M30 262C120 262 170 ${f1(144 + dy)} 232 ${f1(88 + dy + 12)}`, dr = `M792 ${f1(88 + dy + 12)}C860 100 872 190 790 244C760 262 700 264 640 262`;
  s += `<path d="${fd}" fill="none" stroke="${col}" stroke-width="${f1(10 + 12 * (0.3 + 0.7 * f) * (1 - 0.3 * cold))}" stroke-linecap="round"/><path d="${dr}" fill="none" stroke="${mixc('#9AA8D8', '#5E83D9', f)}" stroke-width="${f1(10 + 8 * (0.3 + 0.7 * f))}" stroke-linecap="round"/>`;
  if (a > 0.02 && sp > 0) for (let i = 0; i < 6; i++) { const u = mod((ph / 420) + i / 6, 1), p = pathPt(fd, u); s += `<ellipse cx="${f1(p.x)}" cy="${f1(p.y)}" rx="8" ry="5" fill="${VC.redD}" opacity="${f1(a * 0.9 * 100) / 100}" transform="rotate(${f1(p.ang * 180 / Math.PI)} ${f1(p.x)} ${f1(p.y)})"/>`; }
  // jari pemeriksa dari atas (tampak samping: ujung jari menekan lempeng kuku)
  const away = (1 - clamp(pr)) * (40 + 330 * c.lift), cx = 560, y0 = 34 + dy - away;
  s += `<g transform="translate(${cx} ${f1(y0)})"><path d="M-96 -420V-70C-96 -22 -64 4 0 4C64 4 96 -22 96 -70V-420Z" fill="${SKIN.exam[0]}" stroke="${SKIN.exam[3]}" stroke-width="4"/><path d="M52 -420V-70C52 -30 38 -4 12 3C70 -2 96 -26 96 -70V-420Z" fill="${SKIN.exam[1]}" opacity=".7"/><path d="M-96 -170H96M-96 -130H96" stroke="${SKIN.exam[3]}" stroke-width="3" opacity=".35"/><path d="M96 -330H76C70 -330 68 -318 68 -308V-170H96Z" fill="#F7D9CE" stroke="#C9A99A" stroke-width="3"/></g>`;
  if (labels) {
    const lab = (txt, x, y, ax, ay, col = '#17303D') => `<path d="M${x} ${y}L${ax} ${ay}" stroke="${col}" stroke-width="3" opacity=".7"/><circle cx="${ax}" cy="${ay}" r="5" fill="${col}"/><text x="${x}" y="${y - 8}" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="44" fill="${col}" text-anchor="middle">${txt}</text>`;
    s += lab('lempeng kuku', 330, -14, 330, 40 + dy) + lab('pembuluh kecil', 128, 66, 300, 100 + dy + 12, '#8E2B27') + lab('tulang', 190, 296, 190, 262);
  }
  return s;
}
