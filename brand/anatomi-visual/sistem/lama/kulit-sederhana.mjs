// Klip KULIT (5 detik): potongan kulit tebal berlapis (epidermis, dermis, hipodermis) dengan folikel rambut, kelenjar sebasea, kelenjar keringat ekrin,
// otot penegak rambut, pembuluh (pleksus dalam dan superfisial, lengkung kapiler di papila dermis), saraf (ujung bebas, korpuskel Pacini), dan jaringan lemak.
// Gerak = penyingkapan bertahap: epidermis -> dermis -> hipodermis -> folikel dan kelenjar -> pembuluh -> saraf, kamera turun mengikuti kedalaman.
// Skala tebal lapisan DISEDERHANAKAN (epidermis dibuat jauh lebih tebal dari aslinya agar terbaca). Koordinat desain 700 x 960.
import { smooth, sample, ribbon } from '../../v6/geom.mjs';
import { TEMPO, EASE, seg, clamp, lerp } from '../tokens.mjs';
import { bingkai, kamera, label, proyeksi, susunLabel } from '../kerangka.mjs';

export const meta = { id: 'kulit', judul: 'Kulit', sub: 'potongan melintang · lapisan dan isinya', organ: 'kulit', durasi: TEMPO.durasi, fps: TEMPO.fps };
export const PARAM = {
  skala: 1.12, tempat: [28, 333],
  tahap: { epidermis: [0, 0.5], dermis: [0.2, 1.4], hipodermis: [1.4, 2.4], folikel: [2.4, 3.2], kelenjar: [2.7, 3.5], pembuluh: [3.2, 4.2], saraf: [3.9, 4.7] },
  awal: { dermis: 0.2 },                         // pada bingkai pertama dermis sudah terbuka sedikit
  kamera: [{ t: 0, x: 60, y: 285, s: 1.3 }, { t: 1.8, x: 20, y: 130, s: 1.18 }, { t: 3.2, x: 0, y: -20, s: 1.06 }, { t: 4.4, x: 0, y: 0, s: 1.0 }, { t: 5, x: 0, y: 0, s: 1.0 }],
};

const X0 = 30, X1 = 650, YB = 910;
const ys = (x) => 210 + 2.5 * Math.sin(x * 0.09);                // permukaan
const yb = (x) => 248 + 9 * Math.sin(x * 0.157 + 0.6);            // batas epidermis-dermis (papila dermis)
const yh = (x) => 570 + 7 * Math.sin(x * 0.05 + 1.1);             // batas dermis-hipodermis
const f = (n) => (Math.round(n * 10) / 10).toString();
const poly = (fn, a = X0, b = X1, st = 4) => { const p = []; for (let x = a; x <= b; x += st) p.push([x, fn(x)]); p.push([b, fn(b)]); return p; };
const P = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L');
function rng(seed) { let r = seed; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; }
const C = {
  kor: '#F1E2D6', spin: '#EBB5A6', bas: '#C48A6A', pap: '#F4CDBF', ret: '#E8AF9F', kol: '#FBEADF', septa: '#F3D58E', lob: '#F7D152', lobDk: '#D9A62A',
  art: '#C0262E', ven: '#3B49C8', saraf: '#F2DC8A', rambut: '#33231B', seb: '#F2DFA0', kel: '#EFB3AC', otot: '#C95B62',
};

export function bangunKulit({ id = 'kl' } = {}) {
  const defs = [];
  const B = (b) => { usedB.add(b); return `url(#${id}-b${String(b).replace('.', '_')})`; };
  const usedB = new Set();
  defs.push(`<radialGradient id="${id}-lob" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#FFF0A8"/><stop offset=".5" stop-color="${C.lob}"/><stop offset="1" stop-color="${C.lobDk}"/></radialGradient>`);
  const clipPath = (n, d) => defs.push(`<clipPath id="${id}-${n}"><path d="${d}"/></clipPath>`);
  // wilayah
  const surf = poly(ys), bnd = poly(yb), hb = poly(yh);
  const dEpi = P([...surf, ...[...bnd].reverse()]) + 'Z';
  const dDer = P([...bnd, ...[...hb].reverse()]) + 'Z';
  const dHip = P([...hb, [X1, YB], [X0, YB]]) + 'Z';
  clipPath('epi', dEpi); clipPath('der', dDer); clipPath('hip', dHip);
  const stack = (clip, d, cx, cy, layers) => {
    let s = `<g clip-path="url(#${id}-${clip})">`;
    for (const L of layers) s += `<path d="${d}" fill="${L.fill}" transform="translate(${f(cx + (L.dx ?? 0))} ${f(cy + (L.dy ?? 0))}) scale(${L.s ?? 1}) translate(${f(-cx)} ${f(-cy)})"${L.b ? ` filter="${B(L.b)}"` : ''}${L.o != null ? ` opacity="${L.o}"` : ''}/>`;
    return s + '</g>';
  };
  const r = rng(21);

  // ---------------- EPIDERMIS: korneum, spinosum/granulosum, basal berpigmen, sel-sel kecil
  const band = (a, b) => P([...poly((x) => ys(x) + a), ...[...poly((x) => ys(x) + b)].reverse()]) + 'Z';
  const korn = band(0, 9);
  const basal = P([...poly((x) => yb(x) - 10), ...[...bnd].reverse()]) + 'Z';
  let sel = '';
  for (let i = 0; i < 150; i++) { const x = X0 + 6 + r() * (X1 - X0 - 12), y0 = ys(x) + 12, y1 = yb(x) - 12; if (y1 <= y0) continue; sel += `<ellipse cx="${f(x)}" cy="${f(y0 + r() * (y1 - y0))}" rx="${f(5 + r() * 3)}" ry="${f(4 + r() * 2.5)}"/>`; }
  const epidermis = `<g id="epidermis">${stack('epi', dEpi, 340, 230, [{ fill: '#D79A8A' }, { fill: C.spin, s: 0.99, dx: -2, dy: -3, b: 2.5 }, { fill: '#F6CBBE', s: 0.7, dx: -10, dy: -6, b: 7, o: 0.7 }])}`
    + `<g clip-path="url(#${id}-epi)"><g fill="none" stroke="#C0806E" stroke-width="1.3" opacity=".5">${sel}</g><path d="${korn}" fill="${C.kor}" opacity=".95"/><path d="${P(poly((x) => ys(x) + 9))}" stroke="#C9A99A" stroke-width="1.6" fill="none" opacity=".7"/>`
    + `<path d="${basal}" fill="${C.bas}" opacity=".9"/><path d="${P(bnd)}" stroke="#8E5C44" stroke-width="2" fill="none" opacity=".7"/><path d="${P(poly((x) => ys(x) + 1.5))}" stroke="#fff" stroke-width="2.5" opacity=".6" fill="none"/></g></g>`;

  // ---------------- DERMIS: papilar (halus) dan retikular (berkas kolagen tebal bergelombang)
  let kolagen = '';
  for (let i = 0; i < 60; i++) { const y = 340 + r() * 220, x = X0 + r() * (X1 - X0), l = 40 + r() * 70; kolagen += `<path d="M${f(x)} ${f(y)}c${f(l * 0.3)} ${f(-6 + r() * 12)} ${f(l * 0.6)} ${f(-8 + r() * 16)} ${f(l)} ${f((r() - 0.5) * 8)}" stroke-width="${f(2 + r() * 3)}"/>`; }
  let halus = '';
  for (let i = 0; i < 90; i++) { const x = X0 + r() * (X1 - X0), y = yb(x) + 8 + r() * 80; halus += `<path d="M${f(x)} ${f(y)}c6 -3 12 3 18 0"/>`; }
  const dermis = `<g id="dermis">${stack('der', dDer, 340, 420, [{ fill: '#D79C8C' }, { fill: C.ret, s: 0.99, dx: -3, dy: -5, b: 6 }, { fill: C.pap, s: 0.75, dx: -10, dy: -22, b: 22, o: 0.9 }])}`
    + `<g clip-path="url(#${id}-der)"><g fill="none" stroke="${C.kol}" stroke-linecap="round" opacity=".62">${kolagen}</g><g fill="none" stroke="#fff" stroke-width="1.6" opacity=".5">${halus}</g></g></g>`;

  // ---------------- HIPODERMIS: lobulus lemak (bulat, bervariasi) dan septa fibrosa
  let lobs = '';
  const rl = rng(8);
  for (let row = 0, y = 612; y < YB + 40; row++, y += 52 + rl() * 10) for (let x = X0 - 20 + (row % 2) * 34; x < X1 + 40; x += 70 + rl() * 12) { const rx = 29 + rl() * 12, ry = 24 + rl() * 10; lobs += `<ellipse cx="${f(x + (rl() - 0.5) * 12)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id}-lob)" stroke="#C89322" stroke-width="2.4" stroke-opacity=".55"/><ellipse cx="${f(x - rx * 0.3)}" cy="${f(y - ry * 0.4)}" rx="${f(rx * 0.28)}" ry="${f(ry * 0.2)}" fill="#fff8d0" opacity=".6"/>`; }
  const hipodermis = `<g id="hipodermis"><g clip-path="url(#${id}-hip)"><rect x="${X0}" y="560" width="${X1 - X0}" height="360" fill="${C.septa}"/>${lobs}<path d="${P(hb)}" stroke="#B98A6A" stroke-width="3" fill="none" opacity=".6"/></g></g>`;

  // ---------------- FOLIKEL RAMBUT: batang di atas kulit, folikel (selubung akar), bulbus dengan papila dermis, sebasea, otot penegak
  const fAx = sample([[402, 208, 30], [398, 262, 30], [386, 340, 30], [368, 430, 30], [348, 520, 30], [334, 592, 32]], 60);
  const hairIn = sample([[402, 208, 8], [398, 262, 8], [386, 340, 8], [368, 430, 8], [348, 520, 8], [334, 590, 8]], 60);
  const batang = sample([[402, 214, 9], [412, 170, 8], [424, 120, 6], [432, 74, 2.5]], 40);
  const tube = (smp, scale = 1, shift = 0) => ribbon(smp, { scale, shift });
  const folikel = `<g id="folikel"><path d="${tube(fAx, 1.12)}" fill="#8E5C44" opacity=".45"/><path d="${tube(fAx, 1)}" fill="#F7E3D2"/><path d="${tube(fAx, 0.7, 0.05)}" fill="#E9C3A9"/><path d="${tube(fAx, 0.3)}" fill="#C79A82" opacity=".8"/>`
    + `<path d="${tube(hairIn, 1)}" fill="${C.rambut}"/><path d="${tube(hairIn, 0.3, 0.25)}" fill="#7A5A48" opacity=".8"/>`
    + `<ellipse cx="333" cy="611" rx="27" ry="24" fill="#F7E3D2" stroke="#8E5C44" stroke-width="2" stroke-opacity=".6"/><ellipse cx="333" cy="614" rx="19" ry="17" fill="#E9C3A9"/><ellipse cx="334" cy="622" rx="11" ry="12" fill="#D9807E"/><ellipse cx="329" cy="617" rx="3.5" ry="5" fill="#fff" opacity=".4"/>`
    + `${[[318, 603], [346, 604], [322, 590], [344, 592]].map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="2.6" fill="#4A2A1C"/>`).join('')}</g>`;
  const batangSvg = `<g id="batang"><path d="${tube(batang, 1.1)}" fill="#0f0806" opacity=".5"/><path d="${tube(batang, 1)}" fill="${C.rambut}"/><path d="${tube(batang, 0.22, 0.28)}" fill="#B49A8A" opacity=".9"/></g>`;
  const sebasea = `<g id="sebasea"><path d="M424 306C438 304 444 316 438 324" stroke="#E2B97A" stroke-width="7" fill="none" stroke-linecap="round"/>${[[458, 298, 22, 15], [480, 316, 19, 13], [454, 332, 21, 14], [434, 346, 16, 11]].map((e) => `<ellipse cx="${e[0]}" cy="${e[1]}" rx="${e[2]}" ry="${e[3]}" fill="${C.seb}" stroke="#C9A25A" stroke-width="2.2"/><ellipse cx="${e[0] - e[2] * 0.3}" cy="${e[1] - e[3] * 0.3}" rx="${e[2] * 0.35}" ry="${e[3] * 0.25}" fill="#fff" opacity=".55"/>`).join('')}</g>`;
  const otot = `<g id="otot"><path d="M372 430C338 400 306 350 274 296" stroke="#8E2E36" stroke-width="15" fill="none" stroke-linecap="round" opacity=".6"/><path d="M372 430C338 400 306 350 274 296" stroke="${C.otot}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M370 427C336 397 304 347 272 293" stroke="#F0A1A5" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g>`;

  // ---------------- KELENJAR KERINGAT EKRIN: gulungan sekretorik di dermis dalam, duktus naik, spiral di epidermis, pori
  let coil = '';
  for (let i = 0; i <= 120; i++) { const th = (i / 120) * Math.PI * 7, rr = 14 + 9 * Math.sin(th * 0.9) + 6 * Math.sin(th * 2.3); coil += `${i ? 'L' : 'M'}${f(206 + rr * Math.cos(th) * 1.15)} ${f(584 + rr * Math.sin(th) * 0.85)}`; }
  const duct = 'M206 566C204 520 188 480 202 430C214 392 184 346 170 300C164 276 156 262 158 250';
  let spiral = 'M158 250';
  for (let i = 1; i <= 24; i++) { const y = 250 - (i / 24) * 42; spiral += `L${f(158 + (i % 2 ? 6 : -6))} ${f(y)}`; }
  const keringat = `<g id="keringat"><path d="${coil}" fill="none" stroke="#9C5F5A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="${coil}" fill="none" stroke="${C.kel}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="${coil}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".55" stroke-linecap="round" transform="translate(-1 -1)"/>`
    + `<path d="${duct}" fill="none" stroke="#9C5F5A" stroke-width="9" stroke-linecap="round" opacity=".7"/><path d="${duct}" fill="none" stroke="${C.kel}" stroke-width="5.5" stroke-linecap="round"/>`
    + `<path d="${spiral}" fill="none" stroke="#B9726C" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="158" cy="${f(ys(158) + 1)}" rx="6" ry="2.4" fill="#5a2a22" opacity=".8"/></g>`;

  // ---------------- PEMBULUH: pleksus dalam, arteriol dan venul naik, pleksus superfisial, lengkung kapiler di papila
  const strok = (d, w, col, dk = '#241018') => ({ d, w, col, dk });
  const pem = {
    dalamA: strok(P(poly((x) => 552 + 6 * Math.sin(x * 0.04 + 0.3), X0, X1, 12)), 11, C.art), dalamV: strok(P(poly((x) => 588 + 5 * Math.sin(x * 0.045 + 2), X0, X1, 12)), 12, C.ven),
    hipA: strok('M30 770C140 760 260 784 380 770C470 760 560 772 650 766', 15, C.art), hipV: strok('M30 806C150 818 270 796 390 812C480 822 560 804 650 812', 17, C.ven),
    naikA: strok('M250 768C246 700 256 620 242 552C236 480 254 400 246 332', 8, C.art), naikV: strok('M292 812C296 740 286 660 294 590C300 520 286 420 290 340', 9, C.ven),
    superA: strok('M214 326C240 332 280 326 320 332', 7, C.art), superV: strok('M252 340C282 346 320 338 380 346', 7, C.ven),
  };
  let kap = '';
  for (let x = 66, i = 0; x < 640; x += 40, i++) { if (i % 2) continue; const top = yb(x - 6) + 4; kap += `<path d="M${x - 3} 330C${x - 4} 300 ${x - 3} ${f(top + 6)} ${x} ${f(top)}" stroke="${C.art}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M${x + 3} ${f(top + 4)}C${x + 6} ${f(top + 14)} ${x + 4} 306 ${x + 7} 332" stroke="${C.ven}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`; }
  const vesselPaths = Object.values(pem);
  // gambar pembuluh dengan penarikan (dash) per kemajuan p: lapis gelap + warna + kilau
  const pembuluh = (p) => {
    const dash = (d, w, col, k, o = 1) => clamp(p * 1.25 - k) <= 0.002 ? '' : `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - clamp(p * 1.25 - k) / 1)}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="${col}" stroke-width="${w}" opacity="${o}"/>`;
    let s = '<g id="pembuluh">';
    const order = ['hipA', 'hipV', 'naikA', 'naikV', 'dalamA', 'dalamV', 'superA', 'superV'];
    order.forEach((k, i) => { const v = pem[k], kk = i * 0.1; s += dash(v.d, v.w + 4, '#2a0a10', kk, 0.55) + dash(v.d, v.w, v.col, kk) + dash(v.d, v.w * 0.28, '#fff', kk, 0.35); });
    return s + `<g opacity="${f(clamp((p - 0.6) * 2.5))}">${kap}</g></g>`;
  };

  // ---------------- SARAF: batang saraf di hipodermis, cabang naik, ujung bebas di epidermis, korpuskel Pacini
  const saraf = {
    batang: 'M30 722C160 712 300 734 430 720C520 712 590 724 650 720',
    naik: 'M96 722C92 640 102 560 94 480C88 420 100 360 96 300',
    pacini: 'M150 724C152 740 146 756 150 770',
  };
  let ujung = '';
  for (let i = 0; i < 6; i++) { const x = 78 + i * 8; ujung += `<path d="M96 300C${x + 4} 286 ${x} 268 ${x + 2 - (i % 2) * 4} ${f(ys(x) + 18)}" />`; }
  const sarafSvg = (p) => {
    const dash = (d, w, col, k, o = 1) => clamp(p * 1.3 - k) <= 0.002 ? '' : `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - clamp(p * 1.3 - k))}" fill="none" stroke-linecap="round" stroke="${col}" stroke-width="${w}" opacity="${o}"/>`;
    return `<g id="saraf">${dash(saraf.batang, 15, '#8A6B1C', 0, 0.8)}${dash(saraf.batang, 11, C.saraf, 0)}${dash(saraf.batang, 3, '#fff', 0, 0.5)}${dash(saraf.naik, 8, '#8A6B1C', 0.25, 0.8)}${dash(saraf.naik, 5.5, C.saraf, 0.25)}${dash(saraf.pacini, 5, C.saraf, 0.3)}`
      + `<g opacity="${f(clamp((p - 0.7) * 3.3))}" fill="none" stroke="${C.saraf}" stroke-width="2.4" stroke-linecap="round">${ujung}</g>`
      + `<g opacity="${f(clamp((p - 0.35) * 3))}">${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="150" cy="790" rx="${36 - i * 6.5}" ry="${24 - i * 4.4}" fill="${i % 2 ? '#F6EBC4' : '#E6CF86'}" stroke="#A98A36" stroke-width="1.8" stroke-opacity=".8"/>`).join('')}<ellipse cx="150" cy="790" rx="3.4" ry="9" fill="#F2DC8A" stroke="#A98A36" stroke-width="1.4"/></g></g>`;
  };

  // tepi blok (potongan): garis terang di atas/kiri, gelap di bawah/kanan
  const tepi = `<g id="tepi" fill="none"><path d="M${X0} ${f(ys(X0))}V${YB}" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M${X1} ${f(ys(X1))}V${YB}" stroke="#000" stroke-opacity=".35" stroke-width="3"/><path d="M${X0} ${YB}H${X1}" stroke="#000" stroke-opacity=".3" stroke-width="4"/></g>`;
  for (const b of usedB) defs.push(`<filter id="${id}-b${String(b).replace('.', '_')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${b}"/></filter>`);
  return { defs: defs.join(''), epidermis, dermis, hipodermis, folikel, batangSvg, sebasea, otot, keringat, pembuluh, sarafSvg, tepi, ys };
}

const JANGKAR = [
  { teks: 'Epidermis', a: [606, 232], warna: '#EBB5A6', mulai: 0.5 },
  { teks: 'Dermis', a: [446, 470], warna: '#E8AF9F', mulai: 1.6 },
  { teks: 'Hipodermis\n(lemak)', a: [606, 840], warna: '#F7D152', mulai: 2.5 },
  { teks: 'Folikel\nrambut', a: [412, 520], warna: '#33231B', mulai: 3.3 },
  { teks: 'Kelenjar\nsebasea', a: [518, 330], warna: '#F2DFA0', mulai: 3.5 },
  { teks: 'Kelenjar\nkeringat', a: [616, 584], warna: '#EFB3AC', mulai: 3.7 },
  { teks: 'Pembuluh\ndarah', a: [640, 768], warna: '#C0262E', mulai: 4.1 },
  { teks: 'Saraf', a: [640, 722], warna: '#F2DC8A', mulai: 4.5 },
];

export function frame(t) {
  const g = bangunKulit({ id: 'kl' });
  const T = PARAM.tahap, k = PARAM.skala, [ox, oy] = PARAM.tempat;
  const p = (n) => (PARAM.awal[n] ?? 0) + (1 - (PARAM.awal[n] ?? 0)) * seg(t, T[n][0], T[n][1], EASE.out);
  const kam = kamera(t, PARAM.kamera);
  // penyingkapan lapisan: wipe dari atas ke bawah (clip persegi) agar potongan terbuka seperti dikupas
  const wipe = (name, y0, y1, pr) => ({ def: `<clipPath id="kl-w-${name}"><rect x="0" y="${y0 - 4}" width="700" height="${f((y1 - y0 + 8) * pr)}"/></clipPath>`, open: `<g clip-path="url(#kl-w-${name})">`, close: '</g>' });
  const we = wipe('epi', 150, 262, 1), wd = wipe('der', 240, 575, p('dermis')), wh = wipe('hip', 560, 912, p('hipodermis'));
  const wf = wipe('fol', 200, 640, p('folikel'));
  const wk = wipe('ker', 150, 640, p('dermis') > 0.99 ? 1 : p('dermis'));
  const bawah = 250 + (575 - 250) * p('dermis') + (912 - 575) * (p('hipodermis') > 0.001 ? seg(t, T.hipodermis[0], T.hipodermis[1], EASE.out) : 0);
  const wt = { def: `<clipPath id="kl-w-tepi"><rect x="0" y="150" width="700" height="${f(bawah - 150)}"/></clipPath>` };
  const kelO = p('kelenjar'), kelS = 0.85 + 0.15 * kelO;
  const grow = (n, cx, cy, s) => `translate(${cx} ${cy}) scale(${f(s)}) translate(${-cx} ${-cy})`;
  const isi = `<defs>${g.defs}${we.def}${wd.def}${wh.def}${wf.def}${wk.def}${wt.def}</defs><g transform="translate(${ox} ${oy}) scale(${k})">
${wh.open}${g.hipodermis}${wh.close}
${wd.open}${g.dermis}${wd.close}
${g.epidermis}<g transform="translate(60 0)">${g.batangSvg}</g>
<g transform="translate(410 0)">${wk.open}<g opacity="${f(p('dermis'))}"><g opacity="${f(kelO)}" transform="${grow('k', 206, 584, kelS)}">${g.keringat}</g></g>${wk.close}</g>
<g transform="translate(60 0)">${wf.open}${g.folikel}${wf.close}
<g opacity="${f(kelO)}" transform="${grow('s', 450, 320, kelS)}">${g.sebasea}</g>
<g opacity="${f(p('folikel'))}">${g.otot}</g></g>
${g.pembuluh(p('pembuluh'))}
${g.sarafSvg(p('saraf'))}
<g clip-path="url(#kl-w-tepi)">${g.tepi}</g></g>`;
  const pos = (a) => proyeksi(kam, [ox + a[0] * k, oy + a[1] * k]);
  const q = JANGKAR.map((J) => ({ J, a: pos(J.a) }));
  const tumpuk = susunLabel(q.map((o) => o.a[1]), { min: 420, max: 1640, jarak: 136 });
  const labels = q.map((o, i) => label({ a: o.a, l: [790, tumpuk[i]], teks: o.J.teks, warna: o.J.warna, p: seg(t, o.J.mulai, o.J.mulai + TEMPO.labelMasuk) })).join('');
  return bingkai({ organ: 'kulit', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: labels });
}
