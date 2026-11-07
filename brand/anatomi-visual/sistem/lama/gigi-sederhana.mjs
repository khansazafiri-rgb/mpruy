// Klip GIGI (5 detik): potongan mesiodistal molar bawah berlapis. Lapisan: tulang alveolar, ligamen periodontal, sementum+dentin, pulpa
// (ruang + kanal), email, gusi. Gerak = pembukaan lapisan (gusi menggeser ke samping, tulang turun, email terangkat) dan pergantian fokus
// kamera (mahkota -> akar). Gigi tidak berdenyut. Gaya permukaan sama dengan jantung v7: tumpukan bentuk bergeser/menyusut yang dipotong siluetnya,
// cahaya dari kiri atas, kilau kecil di beberapa titik. Koordinat desain 600 x 900.
import { smooth, sample, ribbon } from '../../v6/geom.mjs';
import { TEMPO, EASE, seg, clamp, lerp, MEREK } from '../tokens.mjs';
import { bingkai, kamera, label, proyeksi, susunLabel } from '../kerangka.mjs';

export const meta = { id: 'gigi', judul: 'Gigi molar', sub: 'potongan memanjang · lapisan penyusun', organ: 'gigi', durasi: TEMPO.durasi, fps: TEMPO.fps };
export const PARAM = {
  skala: 1.36, tempat: [2, 184],                    // desain -> kanvas
  buka: { gusi: 40, tulang: 30, email: 30 },         // jarak pembukaan lapisan (piksel desain)
  waktu: { bukaMulai: 0.7, bukaSelesai: 2.0, tutupMulai: 3.0, tutupSelesai: 4.0 },
  kamera: [{ t: 0, x: 40, y: 150, s: 1.22 }, { t: 2.2, x: 0, y: 40, s: 1.04 }, { t: 3.4, x: -10, y: -70, s: 1.04 }, { t: 5, x: -10, y: -76, s: 1.05 }],
};

// ---------------------------------------------------------------- geometri (jangkar buatan tangan)
const ENA_OUT = [[182, 332], [168, 290], [170, 236], [190, 196], [212, 170], [236, 178], [252, 206], [272, 220], [296, 216], [312, 188], [330, 167], [354, 178], [370, 210], [388, 216], [404, 198], [420, 178], [436, 198], [446, 242], [442, 292], [432, 332]];
const EDJ = [[192, 332], [180, 292], [184, 248], [202, 214], [216, 198], [238, 208], [254, 232], [274, 246], [298, 242], [314, 216], [330, 200], [352, 210], [368, 238], [388, 244], [404, 228], [420, 212], [430, 228], [436, 264], [432, 298], [424, 332]];
const ROOT = [[182, 332], [176, 400], [168, 480], [160, 580], [158, 660], [164, 730], [172, 778], [182, 792], [194, 778], [206, 720], [222, 640], [240, 560], [262, 490], [286, 448], [300, 452, 'c'], [326, 520], [352, 600], [376, 690], [394, 764], [406, 798], [420, 786], [430, 740], [436, 680], [440, 600], [440, 520], [436, 440], [432, 332]];
const CHAMBER = [[240, 364], [236, 326], [240, 290], [252, 268], [266, 292], [298, 306], [326, 284], [344, 270], [358, 294], [376, 290], [386, 310], [388, 340], [384, 366], [356, 382], [316, 390], [276, 386]];
// kanal: sumbu [x, y, lebar]
const KANAL = {
  mb: [[250, 380, 13], [226, 450, 13], [208, 560, 11], [190, 680, 8], [180, 762, 4]],
  ml: [[274, 384, 12], [252, 450, 12], [236, 560, 10], [210, 680, 7], [188, 764, 3.5]],
  d: [[356, 384, 18], [372, 470, 18], [394, 600, 14], [412, 700, 9], [414, 780, 5]],
};
const mirror = (pts) => pts.map(([x, y]) => [614 - x, y]);

const D = {
  ena: smooth(ENA_OUT) + 'Z', edj: smooth(EDJ) + 'Z',
  root: smooth(ROOT),
};
const rev = (a) => [...a].reverse();
const join = (a, b) => a + b.replace(/^M([\d.\- ]+)/, 'L$1');
D.dentin = join(smooth(ROOT), smooth(rev(EDJ))) + 'Z';
D.tooth = join(smooth(ROOT), smooth(rev(ENA_OUT))) + 'Z';
D.chamber = smooth(CHAMBER, true);
const gumL = 'M40 280C58 264 84 256 104 262C128 270 148 290 164 306C172 312 178 316 182 322L184 334L180 370L40 374Z';
D.gumL = gumL;
D.gumR = 'M574 280C556 264 530 256 510 262C486 270 466 290 450 306C442 312 436 316 432 322L430 334L434 370L574 374Z';
D.bone = 'M40 372H574V856Q574 880 550 880H64Q40 880 40 856Z';

// ---------------------------------------------------------------- bahan bantu
const f = (n) => (Math.round(n * 10) / 10).toString();
function rng(seed) { let r = seed; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; }
const C = {
  ena: { dk: '#9FB3C6', base: '#E3ECF4', lt: '#F8FBFE', hi: '#FFFFFF' },
  den: { dk: '#B98340', base: '#E2B56E', md: '#EDC889', lt: '#F6DDAF' },
  pulp: { dk: '#8E1C34', base: '#D0425A', lt: '#F28A98' },
  pdl: { dk: '#8F6270', base: '#C99AA4', lt: '#E5BFC4' },
  gum: { dk: '#A3405A', base: '#E0768A', lt: '#F6A9B6' },
  bone: { dk: '#9C7A4C', base: '#D4B685', lt: '#EBD8AE' },
  cem: '#C79E5A',
};

export function bangunGigi({ id = 'gg' } = {}) {
  const defs = [];
  const clip = (n, inner, rule) => defs.push(`<clipPath id="${id}-${n}"><path d="${inner}"${rule ? ' clip-rule="evenodd"' : ''}/></clipPath>`);
  clip('ena', D.ena.slice(0, -1) + 'Z' + D.edj, true); clip('dentin', D.dentin); clip('chamber', D.chamber); clip('gl', D.gumL); clip('gr', D.gumR); clip('bone', D.bone);
  const usedB = new Set();
  defs.push(`<filter id="${id}-dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter>`);
  const B = (b) => { usedB.add(b); return `url(#${id}-b${String(b).replace('.', '_')})`; };
  const stack = (clipId, d, cx, cy, layers, evenodd) => {
    let s = `<g clip-path="url(#${id}-${clipId})">`;
    for (const L of layers) {
      const sc = L.s ?? 1, dx = L.dx ?? 0, dy = L.dy ?? 0;
      s += `<path d="${d}" fill="${L.fill}"${evenodd ? ' fill-rule="evenodd"' : ''} transform="translate(${f(cx + dx)} ${f(cy + dy)}) scale(${sc}) translate(${f(-cx)} ${f(-cy)})"${L.b ? ` filter="${B(L.b)}"` : ''}${L.o != null ? ` opacity="${L.o}"` : ''}/>`;
    }
    return s + '</g>';
  };

  // ---- tulang alveolar: korteks krista, trabekula (kanselosa), ruang sumsum, lamina dura dekat soket
  const r = rng(11);
  let tr = '';
  for (let i = 0; i < 150; i++) {
    const x = 50 + r() * 510, y = 384 + r() * 480, a = (r() - 0.5) * 1.6 + (r() < 0.5 ? 0.5 : -0.5), l = 16 + r() * 34;
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l * 1.2;
    tr += `<path d="M${f(x)} ${f(y)}Q${f((x + x2) / 2 + (r() - 0.5) * 14)} ${f((y + y2) / 2 + (r() - 0.5) * 14)} ${f(x2)} ${f(y2)}" stroke-width="${f(3 + r() * 3.4)}"/>`;
  }
  let sp = '';
  for (let i = 0; i < 46; i++) sp += `<ellipse cx="${f(54 + r() * 500)}" cy="${f(390 + r() * 470)}" rx="${f(6 + r() * 12)}" ry="${f(4 + r() * 9)}" transform="rotate(${f(r() * 180)} 300 600)"/>`;
  const bone = `<g id="tulang">${stack('bone', D.bone, 300, 640, [{ fill: C.bone.dk }, { fill: C.bone.base, s: 0.97, dx: -4, dy: -6, b: 7 }, { fill: C.bone.lt, s: 0.7, dx: -14, dy: -30, b: 22, o: 0.55 }])}`
    + `<g clip-path="url(#${id}-bone)"><g fill="#7A5A38" opacity=".38">${sp}</g><g fill="none" stroke="#F4E6C4" stroke-linecap="round" opacity=".55">${tr}</g>`
    + `<rect x="40" y="372" width="534" height="12" fill="#F2E3BF" opacity=".95"/></g></g>`;

  // ---- ligamen periodontal + lamina dura (garis tepi akar yang ditebalkan), dengan serat miring halus
  let fib = '';
  const rs = sample(ROOT.map((p) => [p[0], p[1], 1]), 90);
  for (let i = 4; i < rs.length - 4; i += 2) { const p = rs[i], nx = -p[4], ny = p[3]; fib += `<path d="M${f(p[0] + nx * 5)} ${f(p[1] + ny * 5)}l${f(nx * 15 + p[3] * 4)} ${f(ny * 15 + p[4] * 4)}" />`; }
  const pdl = `<g id="pdl"><path d="${D.root}" fill="none" stroke="#F1E3C0" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/><path d="${D.root}" fill="none" stroke="${C.pdl.base}" stroke-width="28" stroke-linejoin="round" stroke-linecap="round"/><path d="${D.root}" fill="none" stroke="${C.pdl.lt}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/><g stroke="${C.pdl.dk}" stroke-width="1.3" opacity=".28" fill="none">${fib}</g></g>`;

  // ---- dentin + sementum
  let tub = '';
  const rr = rng(5);
  for (let i = 0; i < 130; i++) { const x = 170 + rr() * 280, y = 220 + rr() * 560, a = (rr() - 0.5) * 0.7 + Math.PI / 2; tub += `<path d="M${f(x)} ${f(y)}l${f(Math.cos(a) * 16)} ${f(Math.sin(a) * 16)}"/>`; }
  const dentin = `<g id="dentin">${stack('dentin', D.dentin, 300, 520, [{ fill: C.den.dk }, { fill: C.den.base, s: 0.95, dx: -5, dy: -6, b: 6 }, { fill: C.den.md, s: 0.7, dx: -12, dy: -14, b: 14, o: 0.8 }, { fill: C.den.lt, s: 0.38, dx: -20, dy: -30, b: 14, o: 0.55 }])}`
    + `<g clip-path="url(#${id}-dentin)"><g stroke="#A97530" stroke-width="1.4" opacity=".22" fill="none">${tub}</g></g>`
    + `<path d="${D.root}" fill="none" stroke="${C.cem}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#${id}-dentin)" opacity=".95"/></g>`;

  // ---- pulpa: ruang + kanal (meruncing ke apeks), saraf (kuning) dan pembuluh (merah tua) halus di tengah
  const ks = Object.fromEntries(Object.entries(KANAL).map(([k, v]) => [k, sample(v, 50)]));
  let canals = '', nerve = '';
  for (const k of Object.keys(ks)) { canals += `<path d="${ribbon(ks[k])}"/>`; nerve += `<path d="${smooth(KANAL[k].map((p) => [p[0], p[1]]))}"/>`; }
  const pulp = `<g id="pulpa"><g fill="${C.pulp.dk}">${canals}<path d="${D.chamber}"/></g>`
    + `<g clip-path="url(#${id}-chamber)">${stack('chamber', D.chamber, 312, 320, [{ fill: C.pulp.dk }, { fill: C.pulp.base, s: 0.9, dx: -4, dy: -6, b: 4 }, { fill: C.pulp.lt, s: 0.5, dx: -10, dy: -14, b: 8, o: 0.8 }])}</g>`
    + `<g fill="${C.pulp.base}" transform="scale(1)">${Object.keys(ks).map((k) => `<path d="${ribbon(ks[k], { scale: 0.8, shift: 0.05 })}"/>`).join('')}</g>`
    + `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#F6D36B" stroke-width="2.4" opacity=".9">${nerve}</g><g stroke="#7A1226" stroke-width="2" opacity=".6" transform="translate(3 0)">${nerve}</g></g>`
    + `<ellipse cx="180" cy="790" rx="6" ry="3" fill="${C.pulp.dk}"/><ellipse cx="190" cy="788" rx="5" ry="3" fill="${C.pulp.dk}"/><ellipse cx="414" cy="798" rx="7" ry="3.4" fill="${C.pulp.dk}"/></g>`;

  // ---- email (cangkang tebal di ujung tonjol, tipis di leher), dengan kilau kecil
  const enamel = `<g id="email">${stack('ena', D.ena.slice(0, -1) + 'Z' + D.edj, 307, 250, [{ fill: C.ena.dk }, { fill: C.ena.base, s: 0.96, dx: -4, dy: -6, b: 3 }, { fill: C.ena.lt, s: 0.78, dx: -8, dy: -14, b: 7, o: 0.9 }], true)}`
    + `<path d="M196 262C192 236 200 214 214 200" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8" filter="${B(1.2)}"/><ellipse cx="338" cy="190" rx="9" ry="4" fill="#fff" opacity=".8" transform="rotate(-20 338 190)" filter="${B(1.2)}"/>`
    + `<path d="${D.edj.slice(0, -1)}" fill="none" stroke="#B9C9D8" stroke-width="1.6" opacity=".7"/></g>`;

  // ---- gusi: sisi kiri dan kanan (papila interdental, tepi bebas, sulkus), warna merah muda; tepi epitel lebih terang
  const gum = (cid, d, cx, side, nm) => `<g id="${nm}">${stack(cid, d, cx, 330, [{ fill: C.gum.dk }, { fill: C.gum.base, s: 0.94, dx: side * 6, dy: -7, b: 6 }, { fill: C.gum.lt, s: 0.55, dx: side * 12, dy: -16, b: 10, o: 0.6 }])}`
    + `<path d="${d.split('L')[0]}" fill="none" stroke="#F9C9D2" stroke-width="3" stroke-linecap="round" opacity=".8" transform="translate(0 -1)"/></g>`;
  const gusiL = gum('gl', D.gumL, 110, -1, 'gusiL'), gusiR = gum('gr', D.gumR, 504, 1, 'gusiR');
  const ak = `<ellipse cx="300" cy="620" rx="1" ry="1" fill="none"/>`;
  for (const b of usedB) defs.push(`<filter id="${id}-b${String(b).replace('.', '_')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${b}"/></filter>`);
  return { defs: defs.join(''), bone, pdl, dentin, pulp, enamel, gusiL, gusiR, ak, D, ks };
}

// anchor label (koordinat desain) per struktur; muncul bertahap
const JANGKAR = [
  { teks: 'Email', a: [424, 182], warna: '#DCE6F0', mulai: 1.0 },
  { teks: 'Dentin', a: [386, 300], warna: '#E2B56E', mulai: 1.3 },
  { teks: 'Pulpa', a: [330, 330], warna: '#D0425A', mulai: 1.6 },
  { teks: 'Gusi', a: [524, 292], warna: '#E0768A', mulai: 1.9 },
  { teks: 'Kanal\nakar', a: [396, 590], warna: '#F28A98', mulai: 3.3 },
  { teks: 'Ligamen\nperiodontal', a: [441, 660], warna: '#C99AA4', mulai: 3.6 },
  { teks: 'Tulang\nalveolar', a: [500, 760], warna: '#D4B685', mulai: 3.9 },
];

export function frame(t) {
  const P = PARAM, W = P.waktu;
  const buka = seg(t, W.bukaMulai, W.bukaSelesai, EASE.inOut) * (1 - seg(t, W.tutupMulai, W.tutupSelesai, EASE.inOut));
  const g = bangunGigi({ id: 'gg' });
  const k = P.skala, [ox, oy] = P.tempat;
  const kam = kamera(t, P.kamera);
  const fokusTulang = 1 - seg(t, 1.8, 3.0, EASE.inOut) * 1; // tulang/gusi buram saat fokus di mahkota, lalu tajam
  const dof = (g_, aktif) => (aktif > 0.01 ? `<g filter="url(#gg-dof)" opacity="${f(1 - 0.12 * aktif)}">${g_}</g>` : g_);
  const dx = P.buka;
  const isi = `<defs>${g.defs}</defs><g transform="translate(${ox} ${oy}) scale(${k})">
<g transform="translate(0 ${f(dx.tulang * buka)})">${dof(g.bone, fokusTulang * 0.55)}</g>
<g transform="translate(0 ${f(dx.tulang * buka * 0.4)})">${g.pdl}</g>
<g>${g.dentin}${g.pulp}</g>
<g transform="translate(${f(0)} ${f(-dx.email * buka)})">${g.enamel}</g>
<g transform="translate(${f(-dx.gusi * buka)} 0)">${dof(g.gusiL, fokusTulang * 0.55)}</g>
<g transform="translate(${f(dx.gusi * buka)} 0)">${dof(g.gusiR, fokusTulang * 0.55)}</g></g>`;
  const pos = (a, ti = 0) => proyeksi(kam, [ox + a[0] * k, oy + (a[1] + ti) * k]);
  const kol = 790, ys = [470, 640, 800, 960, 1120, 1290, 1470];
  const pos0 = JANGKAR.map((J, i) => {
    const geser = J.teks === 'Email' ? -dx.email * buka : J.teks === 'Gusi' ? 0 : J.teks.startsWith('Tulang') ? dx.tulang * buka : J.teks.startsWith('Ligamen') ? dx.tulang * buka * 0.4 : 0;
    const a = pos(J.a, geser);
    if (J.teks === 'Gusi') a[0] += dx.gusi * buka * k * kam.s;
    return { a, J };
  });
  const tumpuk = susunLabel(pos0.map((q) => q.a[1]));
  const labels = pos0.map((q, i) => { const J = q.J, a = q.a;
    return label({ a, l: [kol, tumpuk[i]], teks: J.teks, warna: J.warna, p: seg(t, J.mulai, J.mulai + TEMPO.labelMasuk) });
  }).join('');
  return bingkai({ organ: 'gigi', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: labels });
}
