// Potongan kulit berambut (1080 x 1920) dengan sistem visual MEDCOEL: epidermis (korneum, granulosum, spinosum, basal), dermis (papilar + retikular), hipodermis (lemak),
// folikel rambut + kelenjar sebasea + otot arrector pili (unit pilosebasea), kelenjar keringat ekrin (koil di dermis dalam/hipodermis), pembuluh (pleksus subpapilar dan dalam), saraf (ujung bebas, korpuskel Pacini).
// SKEMA, TIDAK BERSKALA: tebal epidermis dibesarkan ±4x (nyata rata-rata ±0,09 mm vs dermis 1-4 mm). Kedalaman RELATIF yang dipertahankan: epidermis tanpa pembuluh; kapiler masuk papila dermis; folikel dan koil kelenjar
// keringat berakar di dermis dalam/hipodermis; kelenjar sebasea bermuara ke folikel; arrector pili menempel di tonjolan folikel; lemak berlobulus dipisah septa berisi pembuluh dan saraf.
// Bahan berbeda: epidermis = sel berlapis dengan dinding tipis; dermis = berkas kolagen bergelombang + serat elastin tipis; hipodermis = adiposit besar bening berlobulus; otot = serat polos memanjang.
// Layer: #k-hipodermis, #k-dermis, #k-epidermis, #k-pembuluh, #k-saraf, #k-keringat, #k-folikel, #k-sebasea, #k-otot, #k-kontur. Mode klip: penelusuran kedalaman (pita pemindai menurun, lapisan di bawahnya diredupkan).
import { PAL, W, H, f1, rng, mix, lighten, darken, vignette, ribbon, sampleCubic, cubicD, fx, TEMA_MEDCOEL } from './anatomi.js';
import { MC, latar, merek, labels, labelsT, peralihan, maksLabel, KONTUR, E, seg, KLIP, kam, selVoronoi, halus, clamp01 } from './medcoel.js';
export const P = 'k';
export const TEMA = TEMA_MEDCOEL;
export const FLAT = { kDerm: '#F1CDBF', kEpiG: '#E6B0A6', kFat: '#F8DF98', kAdip: '#F8DF98', kScanG: '#FFF3C4' };
export const LAYERS = [['k-hipodermis', 'Hipodermis (lemak berlobulus + septa)'], ['k-dermis', 'Dermis (papilar + retikular)'], ['k-epidermis', 'Epidermis (korneum, granulosum, spinosum, basal)'], ['k-pembuluh', 'Pembuluh'], ['k-saraf', 'Saraf'], ['k-keringat', 'Kelenjar keringat ekrin'], ['k-folikel', 'Folikel rambut + rambut'], ['k-sebasea', 'Kelenjar sebasea'], ['k-otot', 'Otot arrector pili'], ['k-kontur', 'Kontur tinta']];

const X0 = 170, X1 = 910, SURF = 440, JUNC = 548, PAP_BOT = 650, DERM_BOT = 1130, HYP_BOT = 1640;
const surf = (x) => SURF + 2.2 * Math.sin(x / 23) + 1.8 * Math.sin(x / 61 + 1);
const ridge = (x) => 22 * Math.pow(Math.sin(Math.PI * (x - X0) / 82), 2);   // rete ridge: epidermis turun; di antaranya papila dermis naik
const junc = (x) => JUNC + ridge(x);
const FOL = [[566, SURF + 6], [548, 560], [520, 760], [492, 960], [472, 1120], [466, 1165]];   // garis tengah folikel (miring ke kiri-bawah), akar di batas dermis-hipodermis
const folX = (y) => { for (let i = 0; i < FOL.length - 1; i++) { const a = FOL[i], b = FOL[i + 1]; if (y >= a[1] && y <= b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return FOL[FOL.length - 1][0]; };
const PORE_X = 810;   // muara kelenjar keringat
const wave = (x0, y0, x1, y1, n, a, ph = 0) => { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, o = a * Math.sin(u * 9 + ph); pts.push([x + nx / l * o, y + ny / l * o]); } return pts; };
const pl = (pts) => 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
const tube = (pts, w, c, dk, op = 1) => `<path d="${pl(pts)}" fill="none" stroke="${dk}" stroke-width="${f1(w + 3)}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/><path d="${pl(pts)}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;

// jadwal klip (detik): pemindai kedalaman
export const JADWAL = { scan: [0.4, 3.7] };
// jadwal label [kunci, sisi, teks, t0, t1]; chip pemindai (lapisan yang sedang dilewati) dihitung sebagai 1 label, jadi maksimum 3 sekaligus
export const LABEL_T = [['korneum', -1, 'Korneum', 0.7, 2.0], ['epidermis', -1, 'Epidermis', 1.0, 2.3], ['folikel', 1, 'Folikel', 2.0, 3.4], ['sebasea', -1, 'Sebasea', 2.4, 3.7], ['lemak', -1, 'Lemak', 3.45, 4.7], ['keringat', 1, 'Keringat', 3.85, 5.0], ['saraf', 1, 'Saraf', 4.1, 5.0]];
export const LAPISAN = [[SURF - 40, 'Stratum korneum'], [SURF + 30, 'Epidermis hidup'], [JUNC + 28, 'Dermis papilar'], [PAP_BOT, 'Dermis retikular'], [DERM_BOT, 'Hipodermis (lemak)']];

export function kulit(o = {}) {
  const p = 'k', anim = !!o.anim, t = o.t ?? 0, r = rng(33), K = kam(anim ? t : 0, { cx: 540, cy: 1040, dy: -10 }), SH = 0;
  const KP = (x, y) => { const q = K.pt(x, y); return [q[0], q[1] + SH]; };
  let s = latar(p, { seed: 9, fokus: { x: 560, y: 1020 }, t: anim ? t : 0, kilau: [[70, 360, 26], [1010, 330, 18], [60, 1760, 20], [1000, 1700, 30], [250, 1830, 16], [840, 1840, 22]] });
  s += `<defs>
  <linearGradient id="kDerm" gradientUnits="userSpaceOnUse" x1="0" y1="${JUNC}" x2="0" y2="${DERM_BOT}"><stop offset="0" stop-color="#F8DCCF"/><stop offset=".5" stop-color="#F1CDBF"/><stop offset="1" stop-color="#E9BFB0"/></linearGradient>
  <linearGradient id="kEpiG" gradientUnits="userSpaceOnUse" x1="0" y1="${SURF}" x2="0" y2="${JUNC + 24}"><stop offset="0" stop-color="#F6DCCF"/><stop offset=".5" stop-color="#EBB7AE"/><stop offset="1" stop-color="#D68E91"/></linearGradient>
  <linearGradient id="kFat" gradientUnits="userSpaceOnUse" x1="0" y1="${DERM_BOT}" x2="0" y2="${HYP_BOT}"><stop offset="0" stop-color="#FCE8A8"/><stop offset="1" stop-color="#F3D074"/></linearGradient>
  <radialGradient id="kAdip" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#FFF7D6"/><stop offset=".6" stop-color="#FADE8C"/><stop offset="1" stop-color="#E9BA52"/></radialGradient>
  <linearGradient id="kBlockFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
  <mask id="kFade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="${X0}" y="${SURF - 60}" width="${X1 - X0}" height="${HYP_BOT + 40 - SURF + 60}" fill="url(#kBlockFade)" transform="translate(0 0)"/></mask>
  <clipPath id="kSlab"><path d="M${X0} ${f1(surf(X0))}${Array.from({ length: 46 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 46; return `L${f1(x)} ${f1(surf(x))}`; }).join('')}L${X1} ${HYP_BOT + 30}L${X0} ${HYP_BOT + 30}Z"/></clipPath>
  <clipPath id="kClipEpi"><path d="M${X0} ${f1(surf(X0))}${Array.from({ length: 80 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 80; return `L${f1(x)} ${f1(surf(x))}`; }).join('')}L${X1} ${f1(junc(X1))}${Array.from({ length: 160 }, (_, i) => { const x = X1 - (X1 - X0) * (i + 1) / 160; return `L${f1(x)} ${f1(junc(x))}`; }).join('')}Z"/></clipPath>
  </defs>`;
  let sc = '';

  // ================= HIPODERMIS: lemak berlobulus. Adiposit besar bening (sel Voronoi, dinding tipis) dikelompokkan oleh septa jaringan ikat (sel Voronoi kasar) yang dilalui pembuluh dan saraf
  const adSeeds = []; for (let y = DERM_BOT + 36; y < HYP_BOT + 30; y += 62) for (let x = X0 - 20; x < X1 + 30; x += 66) adSeeds.push([x + (r() - 0.5) * 36 + (Math.floor((y - DERM_BOT) / 62) % 2) * 28, y + (r() - 0.5) * 30]);
  const adIn = adSeeds.filter(([x, y]) => x > X0 + 2 && x < X1 - 2 && y > DERM_BOT + 20 && y < HYP_BOT + 6);
  const adGhost = adSeeds.filter(([x, y]) => !(x > X0 + 2 && x < X1 - 2 && y > DERM_BOT + 20 && y < HYP_BOT + 6));
  const adCells = selVoronoi([...adIn, ...adGhost], { R: 120, tebal: () => 5 }).filter((c) => c.i < adIn.length);
  const lobSeeds = []; for (let y = DERM_BOT - 250; y < HYP_BOT + 520; y += 230) for (let x = X0 - 400; x < X1 + 420; x += 240) lobSeeds.push([x + (r() - 0.5) * 80 + (Math.floor((y - DERM_BOT) / 230) % 2) * 110, y + (r() - 0.5) * 70]);
  const lobCells = selVoronoi(lobSeeds, { R: 330, tebal: () => 0 }).filter((c) => c.c[0] > X0 - 80 && c.c[0] < X1 + 80 && c.c[1] > DERM_BOT + 20 && c.c[1] < HYP_BOT + 10);
  let hyp = `<rect x="${X0}" y="${DERM_BOT - 40}" width="${X1 - X0}" height="${HYP_BOT - DERM_BOT + 100}" fill="#E8B9A8"/>`;   // jaringan ikat septum sebagai dasar
  hyp += `<g class="nos">${adCells.map((c) => `<path d="${halus(c.poly, 2)}" fill="url(#kAdip)"/>`).join('')}</g>`;
  hyp += fx(`<g fill="none" stroke="#fff" stroke-width="3" opacity=".42">${adCells.map((c) => { const [x, y] = c.c; return `<path d="M${f1(x - 13)} ${f1(y - 8)}Q${f1(x - 6)} ${f1(y - 16)} ${f1(x + 4)} ${f1(y - 15)}"/>`; }).join('')}</g>`);
  // septa: tepi sel lobulus kasar, dilapisi tebal; pembuluh dan saraf di sepanjang beberapa septa
  let septa = '', septVess = '';
  lobCells.forEach((c, ci) => { septa += `<path d="${halus(c.poly, 1)}" fill="none" stroke="#DFA392" stroke-width="26" stroke-linejoin="round"/><path d="${halus(c.poly, 1)}" fill="none" stroke="#F0CBBE" stroke-width="12" stroke-linejoin="round"/>`; if (ci % 2 === 0) for (let i = 0; i < c.poly.length; i++) { const a = c.poly[i], b = c.poly[(i + 1) % c.poly.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 120 || ci % 3) continue; const mid = [(a[0] + b[0]) / 2 + (r() - 0.5) * 20, (a[1] + b[1]) / 2 + (r() - 0.5) * 20]; const q = [a, mid, b]; septVess += `<path d="M${f1(a[0])} ${f1(a[1])}Q${f1(mid[0])} ${f1(mid[1])} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="#7A1E26" stroke-width="9" stroke-linecap="round" opacity=".9"/><path d="M${f1(a[0])} ${f1(a[1])}Q${f1(mid[0])} ${f1(mid[1])} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${MC.coral}" stroke-width="5.4" stroke-linecap="round"/>`; void q; } });
  hyp += septa;
  sc += `<g id="k-hipodermis" clip-path="url(#kSlab)" mask="url(#kFade)">${hyp}</g>`;

  // ================= DERMIS: papilar (serat halus, longgar) + retikular (berkas kolagen tebal bergelombang, serat elastin tipis)
  let der = `<path d="M${X0} ${f1(junc(X0))}${Array.from({ length: 160 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 160; return `L${f1(x)} ${f1(junc(x))}`; }).join('')}L${X1} ${DERM_BOT + 6}L${X0} ${DERM_BOT + 6}Z" fill="url(#kDerm)"/>`;
  let fib = '';
  const colBundle = (x, y, len, a, w, c, op) => { const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([x + len * u, y + a * Math.sin(u * 5 + x * 0.05) + (r() - 0.5) * 0.8]); } return `<path d="${pl(pts)}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" opacity="${op}"/>`; };
  for (let i = 0; i < 70; i++) { const x = X0 - 40 + r() * (X1 - X0), y = PAP_BOT + 10 + r() * (DERM_BOT - PAP_BOT - 20), c = ['#FFF3E6', '#FCE6D6', '#F9DAC8'][Math.floor(r() * 3)]; fib += colBundle(x, y, 160 + r() * 260, 5 + r() * 9, 7 + r() * 6, c, 0.9); }
  for (let i = 0; i < 40; i++) { const x = X0 + r() * (X1 - X0), y = PAP_BOT + 10 + r() * (DERM_BOT - PAP_BOT - 20); fib += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(6 + r() * 4)}" ry="${f1(3.4 + r() * 3)}" fill="#FFEFE0" opacity=".75" transform="rotate(${f1(r() * 60 - 30)} ${f1(x)} ${f1(y)})"/>`; }   // berkas kolagen terpotong melintang
  for (let i = 0; i < 90; i++) { const x = X0 + r() * (X1 - X0), y = JUNC + 26 + r() * (PAP_BOT - JUNC - 30); fib += `<path d="M${f1(x)} ${f1(y)}q${f1(6 + r() * 8)} ${f1(-10 - r() * 14)} ${f1(r() * 22 - 6)} ${f1(-26 - r() * 18)}" fill="none" stroke="#FFF1E4" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>`; }   // serat halus papilar, tegak ke papila
  for (let i = 0; i < 40; i++) { const x = X0 + r() * (X1 - X0), y = PAP_BOT + 10 + r() * (DERM_BOT - PAP_BOT - 20); fib += colBundle(x, y, 120 + r() * 160, 4 + r() * 6, 1.8, '#B8667A', 0.55); }   // elastin
  let nuc = ''; for (let i = 0; i < 70; i++) { const x = X0 + r() * (X1 - X0), y = JUNC + 40 + r() * (DERM_BOT - JUNC - 60); nuc += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(7 + r() * 3)}" ry="${f1(3 + r() * 1.4)}" fill="#8A4A5E" opacity=".6" transform="rotate(${f1(r() * 40 - 20)} ${f1(x)} ${f1(y)})"/>`; }   // inti fibroblas
  der += fib + nuc;
  // batas papilar-retikular samar
  der += `<path d="M${X0} ${PAP_BOT}Q${(X0 + X1) / 2} ${PAP_BOT + 14} ${X1} ${PAP_BOT - 4}" fill="none" stroke="#DDA595" stroke-width="3" stroke-dasharray="14 10" opacity=".6"/>`;
  sc += `<g id="k-dermis" clip-path="url(#kSlab)" mask="url(#kFade)">${der}</g>`;

  // ================= EPIDERMIS: basal (kolumnar, melanin), spinosum (poligonal, dinding tipis), granulosum (pipih, granul), korneum (lapisan pipih bertumpuk)
  let epi = `<path d="M${X0} ${f1(surf(X0))}${Array.from({ length: 80 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 80; return `L${f1(x)} ${f1(surf(x))}`; }).join('')}L${X1} ${f1(junc(X1))}${Array.from({ length: 160 }, (_, i) => { const x = X1 - (X1 - X0) * (i + 1) / 160; return `L${f1(x)} ${f1(junc(x))}`; }).join('')}Z" fill="url(#kEpiG)"/>`;
  const sp = [], rows = 5;
  for (let k = 0; k < rows; k++) for (let x = X0 - 16; x < X1 + 20; x += 24) { const f = (k + 0.5) / rows, top = SURF + 66, bot = junc(x) - 24, y = top + f * (bot - top) + (r() - 0.5) * 5; sp.push([x + (k % 2) * 12 + (r() - 0.5) * 6, y]); }
  const spIn = sp.filter(([x]) => x > X0 && x < X1), spGh = [];
  for (let x = X0 - 24; x < X1 + 30; x += 24) { spGh.push([x, SURF + 40], [x + 12, junc(x) - 6]); }
  for (let k = 0; k < rows; k++) { spGh.push([X0 - 20, SURF + 80 + k * 20], [X1 + 20, SURF + 80 + k * 20]); }
  const spCells = selVoronoi([...spIn, ...spGh], { R: 60, tebal: () => 3 }).filter((c) => c.i < spIn.length);
  epi += `<g class="nos">${spCells.map((c, i) => { const f = clamp01((c.c[1] - SURF - 66) / (junc(c.c[0]) - SURF - 90)); return `<path d="${halus(c.poly, 2)}" fill="${mix('#F3C9BE', '#D88E92', f)}"/>`; }).join('')}</g>`;
  epi += `<g class="nos" fill="#A4586E" opacity=".55">${spCells.filter((_, i) => i % 2 === 0).map((c) => `<ellipse cx="${f1(c.c[0])}" cy="${f1(c.c[1])}" rx="4.4" ry="3.6"/>`).join('')}</g>`;
  // basal: sel kolumnar sepanjang batas + butir melanin di sisi permukaan
  let bas = ''; for (let x = X0 + 4; x < X1; x += 13) { const y = junc(x), dy = (junc(x + 1) - junc(x - 1)) / 2, nx = -dy / Math.hypot(1, dy), ny = 1 / Math.hypot(1, dy); bas += `<ellipse cx="${f1(x - nx * 11)}" cy="${f1(y - 13 * ny)}" rx="5" ry="12" fill="#C9787F" stroke="#8E4A5A" stroke-width="1.2" transform="rotate(${f1(Math.atan2(dy, 1) * 57.3)} ${f1(x - nx * 11)} ${f1(y - 13 * ny)})"/>`; if (x % 26 < 13) bas += `<circle cx="${f1(x - nx * 21)}" cy="${f1(y - 22 * ny + 1)}" r="2.6" fill="#6A3A22"/>`; }
  epi += bas;
  // granulosum: dua baris sel pipih + granul keratohialin
  let gran = ''; for (let x = X0 + 6; x < X1; x += 34) for (const [dy, k] of [[36, 0], [49, 1]]) { const xx = x + k * 17, y = surf(xx) + dy; gran += `<ellipse cx="${f1(xx)}" cy="${f1(y)}" rx="16" ry="5.6" fill="#E3A0A2" stroke="#9C5A6E" stroke-width="1.4"/>`; for (let q = 0; q < 4; q++) gran += `<circle cx="${f1(xx - 9 + q * 6)}" cy="${f1(y + (q % 2) * 1.6 - 0.6)}" r="1.6" fill="#5A2A44"/>`; }
  epi += gran;
  // korneum: ±15 lapis sel mati pipih; di sini 6 lapis tipis bertumpuk, tepi atas mengelupas
  let cor = ''; for (let k = 0; k < 6; k++) for (let x = X0 - 20 + (k % 2) * 26; x < X1 + 20; x += 52) { const y = surf(x) + 3 + k * 5; cor += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(46 + (r() - 0.5) * 8)}" height="4.2" rx="2.1" fill="${k % 2 ? '#F6E7CD' : '#FBF0DC'}" stroke="#D2B58E" stroke-width=".9"/>`; }
  for (let i = 0; i < 9; i++) { const x = X0 + 40 + r() * (X1 - X0 - 80); cor += `<path d="M${f1(x)} ${f1(surf(x) + 2)}q${f1(8 + r() * 6)} ${f1(-10)} ${f1(24 + r() * 10)} ${f1(-4 - r() * 4)}" fill="none" stroke="#F2E2C4" stroke-width="3.4" stroke-linecap="round"/>`; }
  epi += cor;
  epi += fx(`<path d="M${X0} ${f1(surf(X0))}${Array.from({ length: 80 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 80; return `L${f1(x)} ${f1(surf(x))}`; }).join('')}" fill="none" stroke="#fff" stroke-width="6" opacity=".5" filter="url(#${p}blur2)"/>`);
  sc += `<g id="k-epidermis" clip-path="url(#kSlab)">${epi}</g>`;
  // bayangan lembut di bawah epidermis dan di batas dermis-hipodermis (kedalaman)
  sc += fx(`<g clip-path="url(#kSlab)"><path d="M${X0} ${JUNC + 28}H${X1}" stroke="#7A3A3A" stroke-width="20" opacity=".16" filter="url(#${p}blur8)"/><path d="M${X0} ${DERM_BOT + 4}H${X1}" stroke="#5A2A20" stroke-width="30" opacity=".22" filter="url(#${p}blur8)"/></g>`);

  // ================= PEMBULUH: pleksus subpapilar (arteriol + venula), kapiler masuk papila, pembuluh naik ke pleksus dalam, pembuluh septum
  const ART = MC.coral, ARTD = '#6A1A24', VEN = MC.academic, VEND = '#0E2A44';
  let ves = '';
  ves += tube(wave(X0, PAP_BOT - 6, X1, PAP_BOT - 4, 60, 6, 0.4), 11, ART, ARTD) + tube(wave(X0, PAP_BOT + 14, X1, PAP_BOT + 12, 60, 6, 2.2), 13, VEN, VEND);
  for (let x = X0 + 41; x < X1; x += 82) { if (Math.abs(x - folX(JUNC + 100)) < 70) continue; const ytop = junc(x) - 8 + 22, xl = x - 6, xr = x + 6; ves += `<path d="M${xl} ${PAP_BOT - 6}L${xl} ${ytop + 6}Q${x} ${ytop - 10} ${xr} ${ytop + 6}L${xr} ${PAP_BOT + 12}" fill="none" stroke="#5A1620" stroke-width="7.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M${xl} ${PAP_BOT - 6}L${xl} ${ytop + 6}Q${x} ${ytop - 10} ${x} ${ytop + 2}" fill="none" stroke="${ART}" stroke-width="3.6" stroke-linecap="round"/><path d="M${x} ${ytop + 2}Q${x} ${ytop - 10} ${xr} ${ytop + 6}L${xr} ${PAP_BOT + 12}" fill="none" stroke="${VEN}" stroke-width="3.6" stroke-linecap="round"/>`; }
  // pembuluh naik (arteriol-venula) menembus dermis retikular
  for (const x of [330, 700]) ves += tube(wave(x, PAP_BOT - 4, x + 10, DERM_BOT + 10, 40, 8, x * 0.01), 10, ART, ARTD) + tube(wave(x + 20, PAP_BOT + 14, x + 32, DERM_BOT + 10, 40, 8, x * 0.01 + 1), 12, VEN, VEND);
  // pleksus dalam (batas dermis-hipodermis)
  ves += tube(wave(X0, DERM_BOT - 4, X1, DERM_BOT - 10, 70, 8, 1.1), 15, ART, ARTD) + tube(wave(X0, DERM_BOT + 20, X1, DERM_BOT + 14, 70, 8, 3.1), 18, VEN, VEND);
  sc += `<g id="k-pembuluh" clip-path="url(#kSlab)" mask="url(#kFade)">${septVess}${ves}</g>`;

  // ================= SARAF: batang saraf di hipodermis, cabang naik lewat septa, ujung bebas masuk epidermis (sampai granulosum), korpuskel Pacini, jalinan di sekitar folikel
  const NV = MC.gold, NVD = '#6E5008';
  let nv = tube(wave(X0, HYP_BOT - 200, X1, HYP_BOT - 230, 60, 12, 0.3), 12, NV, NVD);
  for (const [x, ex] of [[300, 320], [700, 680]]) { const tr = wave(x, HYP_BOT - 210, x + 20, DERM_BOT + 6, 30, 10, x * 0.02), up = wave(x + 20, DERM_BOT + 6, ex, JUNC + 70, 40, 12, x * 0.03); nv += tube(tr, 6, NV, NVD) + tube(up, 4, NV, NVD); for (const [dx, h] of [[-34, 120], [26, 90], [70, 60]]) nv += `<path d="M${f1(ex)} ${f1(JUNC + 70)}q${dx * 0.4} -24 ${dx} ${-h * 0.5}" fill="none" stroke="#FFE08A" stroke-width="2.4" stroke-linecap="round"/>`; }
  nv += tube(wave(500, HYP_BOT - 214, 520, DERM_BOT + 6, 24, 8, 1.3), 4, NV, NVD);
  for (let x = X0 + 26; x < X1; x += 41) if (r() < 0.4) nv += `<path d="M${x} ${f1(junc(x) + 6)}q${f1(r() * 8 - 4)} -16 ${f1(r() * 10 - 5)} ${-36 - Math.round(r() * 12)}" fill="none" stroke="#FFE08A" stroke-width="1.8" stroke-linecap="round" opacity=".95"/>`;   // ujung saraf bebas menembus epidermis
  // korpuskel Pacini di dermis dalam
  const PX = 252, PY = 1040; let pac = `<ellipse cx="${PX}" cy="${PY}" rx="46" ry="74" fill="#F7DDD2" stroke="#9C5A4E" stroke-width="3"/>`; for (let i = 1; i <= 6; i++) pac += `<ellipse cx="${PX}" cy="${PY}" rx="${f1(46 - i * 6.4)}" ry="${f1(74 - i * 10.2)}" fill="${i % 2 ? '#F2D0C4' : '#FBEBE2'}" stroke="#B0786A" stroke-width="1.6"/>`; pac += `<ellipse cx="${PX}" cy="${PY}" rx="5" ry="22" fill="${NV}" stroke="${NVD}" stroke-width="1.6"/>` + tube(wave(PX, PY + 72, PX - 4, DERM_BOT + 70, 14, 5, 0.4), 5, NV, NVD);
  sc += `<g id="k-saraf" clip-path="url(#kSlab)" mask="url(#kFade)">${nv}${pac}</g>`;

  // ================= KELENJAR KERINGAT EKRIN: koil sekretori di dermis dalam/hipodermis (dikelilingi lemak), duct lurus naik, spiral di epidermis, bermuara di pori
  const SW = '#74C9B2', SWD = '#1E6A5C';
  let sw = '';
  const coil = []; for (let i = 0; i <= 300; i++) { const a2 = i / 300 * Math.PI * 2 * 5, rr = 42 + 12 * Math.sin(i * 0.09); coil.push([PORE_X + 6 + Math.cos(a2) * rr * 1.15 + 14 * Math.sin(a2 * 0.5 + 1), 1215 + Math.sin(a2) * rr * 0.85 + 10 * Math.cos(a2 * 0.5)]); }
  sw += tube(coil, 8, SW, SWD);
  const duct = [[PORE_X + 10, 1168]]; for (let i = 1; i <= 18; i++) duct.push([PORE_X + 8 * Math.sin(i * 0.8), 1168 - i * (1168 - junc(PORE_X)) / 18]);
  sw += tube(duct, 7, SW, SWD);
  const spiral = []; for (let i = 0; i <= 60; i++) { const u = i / 60, y = junc(PORE_X) - u * (junc(PORE_X) - SURF - 4); spiral.push([PORE_X + 11 * Math.sin(u * Math.PI * 9), y]); }
  sw += tube(spiral, 5, '#A8E4D2', SWD);
  sw += `<ellipse cx="${PORE_X}" cy="${f1(surf(PORE_X) + 2)}" rx="8" ry="3.6" fill="#7A3A30"/>`;
  sc += `<g id="k-keringat" clip-path="url(#kSlab)" mask="url(#kFade)">${sw}</g>`;

  // ================= OTOT ARRECTOR PILI: berkas otot polos dari tonjolan folikel menuju dermis papilar
  const AP0 = [folX(900) + 12, 900], AP1 = [folX(900) + 190, JUNC + 70];
  let ot = `<path d="M${f1(AP0[0])} ${f1(AP0[1])}C${f1(AP0[0] + 90)} ${f1(AP0[1] - 30)} ${f1(AP1[0] - 40)} ${f1(AP1[1] + 120)} ${f1(AP1[0])} ${f1(AP1[1])}" fill="none" stroke="#7A2A38" stroke-width="30" stroke-linecap="round"/><path d="M${f1(AP0[0])} ${f1(AP0[1])}C${f1(AP0[0] + 90)} ${f1(AP0[1] - 30)} ${f1(AP1[0] - 40)} ${f1(AP1[1] + 120)} ${f1(AP1[0])} ${f1(AP1[1])}" fill="none" stroke="${FLAT.kOtot}" stroke-width="24" stroke-linecap="round"/>`;
  ot += fx(`<g fill="none" stroke="#F2A0AC" stroke-width="1.8" opacity=".7">${[-8, -3, 3, 8].map((o2) => `<path d="M${f1(AP0[0])} ${f1(AP0[1] + o2)}C${f1(AP0[0] + 90)} ${f1(AP0[1] - 30 + o2)} ${f1(AP1[0] - 40 + o2)} ${f1(AP1[1] + 120)} ${f1(AP1[0] + o2)} ${f1(AP1[1])}"/>`).join('')}</g>`);
  sc += `<g id="k-otot" clip-path="url(#kSlab)" mask="url(#kFade)">${ot}</g>`;

  // ================= KELENJAR SEBASEA: asinus berlobus (kuning) mengelilingi duktus yang bermuara ke folikel (bagian atas dermis retikular)
  const SGY = 760, SGX = folX(SGY) - 108; let sg = '';
  const lobes = [[0, 0, 44], [-52, 18, 36], [46, 30, 38], [-18, 62, 34], [30, 78, 30], [-58, -34, 28]];
  sg += tube([[folX(SGY + 20) - 16, SGY + 20], [SGX + 40, SGY + 22], [SGX + 20, SGY + 36]], 12, '#F2D08A', '#8A5A10');
  for (const [dx, dy, rr] of lobes) { sg += `<circle cx="${f1(SGX + dx)}" cy="${f1(SGY + dy)}" r="${rr}" fill="#F6C45A" stroke="#9A6A10" stroke-width="3"/>`; for (let q = 0; q < 7; q++) { const a = q / 7 * 6.28, d2 = rr * 0.55; sg += `<circle cx="${f1(SGX + dx + Math.cos(a) * d2)}" cy="${f1(SGY + dy + Math.sin(a) * d2)}" r="${f1(rr * 0.2)}" fill="#FFE8A6" stroke="#C9921E" stroke-width="1.4"/>`; } }
  sc += `<g id="k-sebasea" clip-path="url(#kSlab)" mask="url(#kFade)">${sg}</g>`;

  // ================= FOLIKEL RAMBUT: batang rambut (di atas kulit sampai bulbus), selubung akar luar-dalam, bulbus dengan papila dermal (kapiler) dan matriks
  let fo = '';
  const fpts = (n) => { const a = []; for (let i = 0; i <= n; i++) { const y = FOL[0][1] + (FOL[FOL.length - 1][1] - FOL[0][1]) * i / n; a.push([folX(y), y]); } return a; };
  const fp = fpts(40);
  const wd = (i) => 36 - 4 * (i / 40) ** 2;
  fo += tube(fp, 62, '#EFD0C0', '#9A5A52');   // selubung akar luar + jaringan ikat (dermis sekitar)
  fo += `<path d="${pl(fp)}" fill="none" stroke="#FBEFE4" stroke-width="42" stroke-linecap="round"/><path d="${pl(fp)}" fill="none" stroke="#F4E0D2" stroke-width="30" stroke-linecap="round"/>`;   // selubung akar dalam
  fo += `<path d="${pl(fp)}" fill="none" stroke="#2A1E1A" stroke-width="22" stroke-linecap="round"/><path d="${pl(fp)}" fill="none" stroke="#4A3328" stroke-width="16" stroke-linecap="round"/>`;
  fo += fx(`<path d="${pl(fp.map(([x, y]) => [x - 2, y]))}" fill="none" stroke="#8A6A58" stroke-width="2.4" opacity=".7"/>`);
  // infundibulum (corong) melebar di permukaan
  fo += `<path d="M${f1(folX(SURF + 6) - 34)} ${f1(surf(folX(SURF + 6)))}Q${f1(folX(SURF + 40) - 22)} ${SURF + 60} ${f1(folX(SURF + 90) - 20)} ${SURF + 100}L${f1(folX(SURF + 90) + 20)} ${SURF + 100}Q${f1(folX(SURF + 40) + 22)} ${SURF + 60} ${f1(folX(SURF + 6) + 34)} ${f1(surf(folX(SURF + 6)))}Z" fill="#E6BFB0" opacity=".9"/><path d="${pl(fp.slice(0, 12))}" fill="none" stroke="#2A1E1A" stroke-width="15" stroke-linecap="round"/><path d="${pl(fp.slice(0, 12))}" fill="none" stroke="#4A3328" stroke-width="10.4" stroke-linecap="round"/>`;
  // batang rambut di atas permukaan (melengkung)
  const hx = folX(SURF + 6), hair = [[hx, SURF + 8], [hx + 4, SURF - 40], [hx + 20, SURF - 96], [hx + 54, SURF - 136], [hx + 98, SURF - 150]];
  fo += `<path d="M${hair.map((q) => q.join(' ')).join('L')}" fill="none" stroke="#1E1512" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hair.map((q) => q.join(' ')).join('L')}" fill="none" stroke="#4A3328" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>` + fx(`<path d="M${hair.map((q) => `${q[0] - 2.4} ${q[1]}`).join('L')}" fill="none" stroke="#A88A74" stroke-width="2.6" opacity=".8" stroke-linecap="round"/>`);
  // bulbus + papila dermal
  const BX = FOL[FOL.length - 1][0], BY = FOL[FOL.length - 1][1];
  fo += `<ellipse cx="${BX}" cy="${BY + 6}" rx="60" ry="56" fill="#E9C0B6" stroke="#8A4A48" stroke-width="3"/><ellipse cx="${BX}" cy="${BY + 6}" rx="47" ry="44" fill="#B87AA0" stroke="#6A3A62" stroke-width="2"/>`;   // matriks
  for (let q = 0; q < 14; q++) { const a = q / 14 * 6.28; fo += `<circle cx="${f1(BX + Math.cos(a) * 28)}" cy="${f1(BY + 6 + Math.sin(a) * 26)}" r="3.6" fill="#7A3A72"/>`; }
  fo += `<path d="M${BX - 22} ${BY + 52}Q${BX - 24} ${BY - 10} ${BX} ${BY - 14}Q${BX + 24} ${BY - 10} ${BX + 22} ${BY + 52}Z" fill="#F6C8B8" stroke="#9A5A52" stroke-width="2.4"/><path d="M${BX - 8} ${BY + 50}L${BX - 8} ${BY + 8}Q${BX} ${BY - 6} ${BX + 8} ${BY + 8}L${BX + 8} ${BY + 50}" fill="none" stroke="${MC.coral}" stroke-width="3.6" stroke-linecap="round"/>`;
  sc += `<g id="k-folikel" clip-path="url(#kSlab)">${fo}</g>`;
  // rambut menjulang di atas kulit tidak boleh terpotong: gambar ulang bagian atas di luar clip slab
  sc += `<g id="k-rambut-atas"><path d="M${hair.map((q) => q.join(' ')).join('L')}" fill="none" stroke="#1E1512" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hair.map((q) => q.join(' ')).join('L')}" fill="none" stroke="#4A3328" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></g>`;

  // ================= kontur tinta tepi irisan + kilau permukaan
  const slabEdge = `M${X0} ${f1(surf(X0))}${Array.from({ length: 80 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 80; return `L${f1(x)} ${f1(surf(x))}`; }).join('')}`;
  sc += `<g id="k-kontur" fill="none" stroke="${KONTUR.warna}" stroke-width="${KONTUR.lebar}" stroke-linejoin="round" opacity="${KONTUR.opasitas}"><path d="${slabEdge}"/><path d="M${X0} ${f1(surf(X0))}V${HYP_BOT - 120}"/><path d="M${X1} ${f1(surf(X1))}V${HYP_BOT - 120}"/><path d="M${X0} ${f1(junc(X0))}${Array.from({ length: 160 }, (_, i) => { const x = X0 + (X1 - X0) * (i + 1) / 160; return `L${f1(x)} ${f1(junc(x))}`; }).join('')}" opacity=".7"/></g>`;
  sc += fx(`<g clip-path="url(#kSlab)" opacity=".55"><path d="M${X0 + 6} ${SURF + 60}V${HYP_BOT - 140}" stroke="#fff" stroke-width="10" opacity=".25" filter="url(#${p}blur4)"/><rect x="${X0}" y="${SURF - 10}" width="${X1 - X0}" height="${HYP_BOT - SURF}" fill="url(#${p}glow)" opacity=".0"/></g>`);

  // ================= penelusuran kedalaman (klip): pita pemindai menurun, bagian yang belum dilewati diredupkan
  let scan = '', cur = '';
  if (anim) {
    const u = E.inout(clamp01((t - JADWAL.scan[0]) / (JADWAL.scan[1] - JADWAL.scan[0]))), by = (SURF - 30) + (HYP_BOT - 40 - (SURF - 30)) * u, act = t >= JADWAL.scan[0] && t <= JADWAL.scan[1] + 0.35;
    if (t < JADWAL.scan[1] + 0.05) scan += `<g id="k-pemindai" clip-path="url(#kSlab)"><rect x="${X0}" y="${f1(by)}" width="${X1 - X0}" height="${H}" fill="${MC.forest}" opacity=".62"/><rect x="${X0}" y="${f1(by - 46)}" width="${X1 - X0}" height="46" fill="url(#kScanG)"/><rect x="${X0}" y="${f1(by - 2)}" width="${X1 - X0}" height="5" fill="${MC.gold}"/></g><defs><linearGradient id="kScanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#FFF3C4" stop-opacity=".42"/></linearGradient></defs>`;
    let nama = LAPISAN[0][1]; for (const [yy, nm] of LAPISAN) if (by >= yy) nama = nm;
    if (act) { const a = seg(t, JADWAL.scan[0], JADWAL.scan[0] + 0.3) * (1 - seg(t, JADWAL.scan[1] + 0.05, JADWAL.scan[1] + 0.35)); cur = `<g opacity="${f1(a)}"><path d="M${X1 + 8} ${f1(by)}H${X1 - 40}" stroke="${MC.gold}" stroke-width="5" stroke-linecap="round"/><rect x="${W - 24 - nama.length * 21 - 44}" y="${f1(by - 29)}" width="${f1(nama.length * 21 + 44)}" height="58" rx="29" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="2.5" transform="translate(${-(W - 24 - X1)} 0)"/><text x="${f1(X1 + 6 - 24 - (nama.length * 21 + 44) / 2)}" y="${f1(by + 10)}" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="36" fill="${MC.ink}">${nama}</text></g>`; }
  }
  s += `<g id="mc-adegan" transform="${K.tf}"><g>${sc}</g>${scan}</g>`;
  s += vignette(p);
  s += merek({ judul: 'Kulit', sub: 'Potongan kulit berambut · skema' });
  s += cur;
  if (labels2true(o)) {
    const tl = anim ? t : 4.5, P2 = KP;
    const anc = { korneum: P2(X0 + 60, SURF + 10), epidermis: P2(X0 + 110, SURF + 70), folikel: P2(folX(900), 900), sebasea: P2(SGX - 20, SGY + 20), lemak: P2(X0 + 90, DERM_BOT + 190), keringat: P2(PORE_X + 22, 1215), saraf: P2(X1 - 20, HYP_BOT - 226) };
    s += labelsT(LABEL_T.map(([kk, sd, tx, t0, t1]) => [...anc[kk], sd, tx, t0, t1]), tl, { atas: 330 });
  }
  if (anim) s += peralihan(t);
  return s;
}
const labels2true = (o) => !!o.labels;
