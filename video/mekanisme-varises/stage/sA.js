// A. hook (0 - 3,2): Raka kaget melihat model kaki transparan; sel darah naik di vena, sebagian berbalik di katup; kamera mengikuti kelompok sel ke vena.
import { f1, clamp, lerp, sm, eo, eio, seg, track, R, C, P as PP, T, GOLD, INK, rndf, K, W, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, ka, camG } from './common.js';
import { VK, cell, flowArrow } from './vein.js';

export const LEG = { cx: 745, top: 450, kneeY: 720, ankY: 1170 };
export const legX = (y) => LEG.cx + 7 * Math.sin(y / 85);               // sumbu vena dalam model kaki
// kontur kaki (tampak depan, transparan): atas = pangkal paha / jantung
export function legModel(o = {}) {
  const c = LEG.cx, E = (y, w) => [c - w, c + w];
  const pts = [[440, 152], [560, 148], [690, 122], [760, 126], [900, 136], [1010, 112], [1110, 84], [1180, 62]];
  const Ls = pts.map(([y, w]) => `${f1(c - w)} ${y}`), Rs = pts.slice().reverse().map(([y, w]) => `${f1(c + w)} ${y}`);
  const foot = `<ellipse cx="${c + 30}" cy="1240" rx="104" ry="40" fill="rgba(247,188,142,.38)" stroke="#E3A06A" stroke-width="6"/>`;
  return `<path d="M${Ls.join('L')}L${c - 62} 1215L${c + 62} 1215L${Rs.join('L')}Z" fill="rgba(247,188,142,.38)" stroke="#E3A06A" stroke-width="6" stroke-linejoin="round"/>` + foot;
}
export function legVein(o = {}) {
  const y0 = 440, y1 = 1200; let d = ''; for (let y = y1; y >= y0; y -= 20) d += `${y === y1 ? 'M' : 'L'}${f1(legX(y))} ${y}`;
  return `<path d="${d}" fill="none" stroke="${VK.wallD}" stroke-width="68" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${VK.wall}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${VK.lumen}" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>`;
}
export const VALVES = [1000, 800];
export function legValves(c = 0) { return VALVES.map((y) => { const x = legX(y); return `<path d="M${f1(x - 17)} ${y + 22}L${f1(x - 5 - c * 3)} ${y - 14}M${f1(x + 17)} ${y + 22}L${f1(x + 5 + c * 3)} ${y - 14}" stroke="${VK.leafD}" stroke-width="15" stroke-linecap="round"/><path d="M${f1(x - 17)} ${y + 22}L${f1(x - 5 - c * 3)} ${y - 14}M${f1(x + 17)} ${y + 22}L${f1(x + 5 + c * 3)} ${y - 14}" stroke="${VK.leaf}" stroke-width="9" stroke-linecap="round"/>`; }).join(''); }
// sel di vena model: sebagian bergerak naik terus, sebagian berbalik di katup (y = 800) lalu turun
export function legCells(t) {
  let s = ''; const yT = 450, yB = 1190, L = yB - yT;
  for (let i = 0; i < 16; i++) { if (i % 3 === 2) continue; const y = yT + (((yB - (i * 51 + t * 95)) - yT) % L + L) % L; s += cell(legX(y) + (rndf(i) - 0.5) * 10, y, 13, 1, i * 30); }
  for (let k = 0; k < 6; k++) {
    const per = 3.4, q = ((t + k * 0.57) % per) / per, base = 905 + 25 * rndf(k + 4);
    if (q < 0.34) { const u = eio(q / 0.34), y = lerp(1000 + 40 * rndf(k + 2), 790, u); s += cell(legX(y) + (rndf(k + 7) - 0.5) * 8, y, 13, 1, k * 50); }
    else if (q < 0.5) { const y = 790 + 4 * Math.sin(q * 40); s += cell(legX(y), y, 13, 1, k * 50); }
    else if (q < 0.9) { const u = eo((q - 0.5) / 0.4), y = lerp(790, 1010, u); s += cell(legX(y), y, 13, 1, k * 50) + flowArrow(legX(y) + 42, y - 8, 90, 34, VK.down, VK.downD, 0.95, 10); }
  }
  return s;
}
export const RAK1 = { cx: 235, ty: 440, k: 1.04 };
export function sceneA(t, out) {
  const point = clamp((t - 0.9) / 0.5);
  const st = rIdle(t < 1.0 ? raka('kaget', 'kaget', { yaw: 0.65, gazeX: 0.9, gazeY: 0.1 }) : raka('menunjuk', 'menunjuk', { yaw: 0.6, gazeX: 0.9, gazeY: 0.2 }), t);
  const r = rk(st, RAK1.cx, RAK1.ty, RAK1.k, 'rA');
  const mid = (y) => [legX(y), y];
  const zk = track([[0, 540, 960, 0], [1.6, 540, 960, 0], [2.8, legX(800) + 4, 790, Math.log(5.2)], [3.3, legX(800) + 4, 790, Math.log(5.6)]])(t);
  let w = bgCream + r.svg + legModel() + legVein() + legValves() + legCells(t);
  // panah arah: naik (teal), berbalik (jingga)
  w += flowArrow(965, 770, -90, 130, VK.up, VK.upD, 0.95, 18) + flowArrow(965, 930, 90, 110, VK.down, VK.downD, 0.95 * clamp((t - 0.4) / 0.3), 18);
  out.A += camG(w, Math.exp(zk[2]), zk[0], zk[1], 540, lerp(960, 900, sm((t - 1.6) / 1.1)));
  const a = 1 - clamp((t - 2.5) / 0.5);
  out.U += chip(['KOK DARAH DI KAKI', 'TURUN LAGI?'], t, -0.4, 3.3, { size: 62, bg: '#D9382F', fg: '#fff' });
  const sc = (x, y) => [540 + (x - zk[0]) * Math.exp(zk[2]), lerp(960, 900, sm((t - 1.6) / 1.1)) + (y - zk[1]) * Math.exp(zk[2])];
  const p1 = sc(965, 830), p2 = sc(965, 1070);
  out.U += tag('ke jantung ↑', p1[0], p1[1], a * ka(t, 0.2, 3.3, 0.3), { size: 28, bg: '#CFF5E6', fg: '#0A4A3A' }) + tag('berbalik ↓', p2[0], p2[1], a * ka(t, 0.5, 3.3, 0.3), { size: 28, bg: '#FFE1CF', fg: '#8A3F0E' });
}
