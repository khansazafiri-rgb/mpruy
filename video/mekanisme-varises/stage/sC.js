// C. waktu berjalan (12,4 - 17,0): vena dekat kulit melebar dan berkelok bertahap, menonjol di bawah kulit; lalu (16,8 - 20,4) potong ke model kaki utuh: letak varises.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, R, C, P as PP, T, GOLD, INK, rndf, K, W, CREAM, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, ka } from './common.js';
import { VK, cell, flowArrow } from './vein.js';
import { LEG, legX, legModel, legVein, legValves, legCells, VALVES, RAK1 } from './sA.js';

const gauss = (y, c, s) => Math.exp(-(((y - c) / s) ** 2));
export function sceneC(t, out) {
  const u = seg(t, 12.7, 16.6, (x) => x), ue = sm(u), tw = ue;
  const bulgeC = 850, vx = (y) => 470 + lerp(8, 86, tw) * Math.sin(2 * Math.PI * (y - 380) / lerp(380, 260, tw)) + lerp(0, 255, tw) * gauss(y, bulgeC, 240);
  const rr = (y) => lerp(46, 84, tw) * (1 + 0.55 * tw * gauss(y, bulgeC, 210));
  const sx = (y) => 905 + lerp(0, 120, tw) * gauss(y, bulgeC, 210);
  let w = `<rect width="1080" height="1920" fill="#FBDCC8"/>`;
  // udara + kulit di kanan (garis kulit menonjol di atas vena yang melebar)
  let sk = `M1100 300`; for (let y = 300; y <= 1400; y += 20) sk += `L${f1(sx(y))} ${y}`; sk += 'L1100 1400Z';
  w += `<path d="${sk}" fill="#F4FAFC"/>`;
  let ep = ''; for (let y = 300; y <= 1400; y += 20) ep += `${y === 300 ? 'M' : 'L'}${f1(sx(y))} ${y}`;
  w += `<path d="${ep}" fill="none" stroke="#F2B08E" stroke-width="44"/><path d="${ep}" fill="none" stroke="#D98E6C" stroke-width="6" transform="translate(-22 0)"/>`;
  for (let i = 0; i < 40; i++) w += `<circle cx="${f1(90 + rndf(i) * 640)}" cy="${f1(330 + rndf(i + 30) * 1000)}" r="${f1(8 + rndf(i + 4) * 12)}" fill="#F0BFA8" opacity=".6"/>`;
  // vena
  let d = ''; for (let y = 260; y <= 1440; y += 10) d += `${y === 260 ? 'M' : 'L'}${f1(vx(y))} ${y}`;
  // lebar tabung berubah menurut y: gambar sebagai deretan lingkaran/kapsul agar radius bervariasi
  let wall = '', lum = ''; for (let y = 260; y <= 1440; y += 8) { const r = rr(y); wall += `<circle cx="${f1(vx(y))}" cy="${y}" r="${f1(r + 28)}"/>`; lum += `<circle cx="${f1(vx(y))}" cy="${y}" r="${f1(r)}"/>`; }
  w += `<g fill="${VK.wallD}">${wall}</g><g fill="${VK.wall}" transform="translate(0 0)">${wall.replace(/r="([\d.]+)"/g, (m, a) => `r="${f1(+a - 5)}"`)}</g><g fill="${VK.lumen}">${lum}</g>`;
  // sel: mengalir pelan naik, makin menumpuk di segmen yang melebar
  const NC = 26; for (let i = 0; i < NC; i++) {
    const L = 1300, y = 1500 - (((i * (L / NC) + t * (70 - 40 * tw)) % L)), x = vx(y) + (rndf(i + 3) - 0.5) * rr(y) * 1.1; w += cell(x, y, 22, 1, i * 40 + t * 18);
  }
  for (let i = 0; i < 14; i++) { const k = i / 14; if (k > tw * 1.05) break; const a = t * 0.5 + i * 2.4, y = bulgeC + 60 * Math.sin(a * 0.7 + i) + (i - 7) * 14, x = vx(y) + 0.45 * rr(y) * Math.cos(a); w += cell(x, y, 22, clamp((tw - k) * 5), a * 50); }
  w += flowArrow(110, 640, -90, 150, VK.up, VK.upD, 0.95, 24);
  out.A += w;
  let uu = chip(['LAMA-KELAMAAN:', 'VENA MELEBAR'], t, 12.5, 17.0, { size: 58, bg: '#fff' });
  uu += tag('KE JANTUNG ↑', 110, 820, ka(t, 12.7, 17.0, 0.3), { size: 26, bg: '#CFF5E6', fg: '#0A4A3A' });
  uu += tag('berkelok', 250, 520, ka(t, W.berkelok - 0.2, 17.0, 0.3), { size: 34, bg: '#EADFFF', fg: INK });
  uu += tag('menonjol di bawah kulit', 800, 700, ka(t, 15.7, 17.0, 0.3), { size: 30, bg: '#fff' });
  uu += tag('KULIT', 975, 1010, ka(t, 13.0, 17.0, 0.3), { size: 26, bg: '#fff' });
  // penunjuk waktu: bilah kemajuan
  const bx = 150, bw = 780, by = 1215;
  uu += `<g opacity="${f1(ka(t, 12.7, 17.0, 0.3))}"><rect x="${bx}" y="${by}" width="${bw}" height="26" rx="13" fill="rgba(255,255,255,.85)"/><rect x="${bx}" y="${by}" width="${f1(bw * u)}" height="26" rx="13" fill="${VK.wall}"/><circle cx="${f1(bx + bw * u)}" cy="${by + 13}" r="22" fill="#fff" stroke="${VK.wallD}" stroke-width="7"/>${T('waktu →', bx + bw - 6, by - 18, { size: 28, anchor: 'end', fill: INK })}${T('awal', bx + 4, by - 18, { size: 28, anchor: 'start', fill: INK })}</g>`;
  out.U += uu;
}
// potong ke model kaki utuh: letak vena yang melebar dan berkelok di betis
export function sceneC2(t, out) {
  const g = seg(t, 16.9, 18.6, (x) => x), ge = sm(g), c = LEG.cx;
  const st = rIdle(raka('menunjuk', 'menunjuk', { yaw: 0.6, gazeX: 0.9, gazeY: 0.2 }), t);
  const r = rk(st, RAK1.cx, RAK1.ty, RAK1.k, 'rC');
  let w = bgCream + r.svg + legModel() + legVein() + legValves() + legCells(t);
  // vena superfisial berkelok dan menonjol di betis (tumbuh bertahap)
  const y0 = 790, y1 = 1100; let d = '', bumps = '';
  for (let y = y0; y <= y1; y += 6) { const k = (y - y0) / (y1 - y0), amp = 30 * ge * Math.sin(Math.PI * k) ** 0.6, x = c + 64 + amp * Math.sin((y - y0) / 24) ; d += `${y === y0 ? 'M' : 'L'}${f1(x)} ${y}`; }
  for (let i = 0; i < 5; i++) { const y = y0 + 45 + i * 56, k = (y - y0) / (y1 - y0), amp = 30 * ge * Math.sin(Math.PI * k) ** 0.6; bumps += `<circle cx="${f1(c + 64 + amp * Math.sin((y - y0) / 24))}" cy="${y}" r="${f1(10 + 22 * ge * (0.7 + 0.3 * Math.sin(i * 2.1)))}" fill="${VK.wall}" stroke="${VK.wallD}" stroke-width="6"/>`; }
  w += `<path d="${d}" fill="none" stroke="${VK.wallD}" stroke-width="${f1(14 + 22 * ge)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${VK.wall}" stroke-width="${f1(8 + 16 * ge)}" stroke-linecap="round" stroke-linejoin="round"/>${bumps}`;
  for (let i = 0; i < 9; i++) { const y = y0 + ((i * 36 + t * 20) % (y1 - y0)), k = (y - y0) / (y1 - y0), amp = 30 * ge * Math.sin(Math.PI * k) ** 0.6; w += cell(c + 64 + amp * Math.sin((y - y0) / 24), y, 6 + 3 * ge, 1, i * 40); }
  const pr = ((t * 1.1) % 1), pr2 = ((t * 1.1 + 0.5) % 1); if (ge > 0.6) w += `<circle cx="${c + 64}" cy="${(y0 + y1) / 2}" r="${f1(110 + 40 * pr2)}" fill="none" stroke="${GOLD}" stroke-width="${f1(8 * (1 - pr2))}" opacity="${f1(0.6 * (1 - pr2))}"/><circle cx="${c + 64}" cy="${(y0 + y1) / 2}" r="${f1(110 + 40 * pr)}" fill="none" stroke="${GOLD}" stroke-width="${f1(8 * (1 - pr))}" opacity="${f1(0.8 * (1 - pr))}"/>`;
  out.A += w;
  let u = chip(['VARISES'], t, 17.2, 20.4, { size: 76, bg: GOLD, fg: INK });
  u += tag('vena melebar', 975, 930, ka(t, W.varises - 0.8, 20.4, 0.3), { size: 26, bg: '#EADFFF', fg: INK }) + tag('dan berkelok', 975, 985, ka(t, W.varises - 0.6, 20.4, 0.3), { size: 26, bg: '#EADFFF', fg: INK });
  out.U += u;
}
