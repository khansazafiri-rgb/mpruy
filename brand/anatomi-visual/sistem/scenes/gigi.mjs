// Klip GIGI (5,4 dtk): molar pertama rahang bawah, potongan mesiodistal, MUTU BENTUK/TEKSTUR dari aset cabang claude/eloquent-darwin-ewtwtu (darwin/gigi.mjs, commit b3af953).
// Gerak = pembukaan lapisan (jadwal reveal bawaan aset: tulang naik, ligamen memudar, dentin naik, sementum, pulpa, saraf-pembuluh, email turun, gusi naik) tanpa denyut;
// aliran partikel kecil di kanal pulpa adalah penanda, bukan rekaman aliran. Latar, header, label, kamera, easing mengikuti sistem Atlas bersama.
import { gigi } from '../darwin/gigi.mjs';
import { defs, TEMA_MEDCOEL, f1 } from '../darwin/anatomi.mjs';
import { seg as segD, E } from '../darwin/medcoel.mjs';
import { TEMPO, KAMERA, seg, EASE } from '../tokens.mjs';
import { bingkai, kamera, label, proyeksi, susunLabel } from '../kerangka.mjs';

export const meta = { id: 'gigi', judul: 'Gigi molar', sub: 'molar 1 bawah · potongan mesiodistal', organ: 'gigi', durasi: TEMPO.durasi, fps: TEMPO.fps };
// parameter animasi/penempatan (aset yang dipakai ulang)
export const PARAM = {
  panggung: { cx: 510, cy: 920, ke: [415, 925], skala: 0.74 },   // titik pusat konten aset (koordinat aset) -> pusat panggung Atlas
  waktuAset: { offset: 0.5, laju: 1.0 },                         // t aset = offset + laju * t (reveal bawaan 0,15-4,05 dtk selesai pada ~3,55 dtk)
  label: [['Tulang\nalveolar', 1.5], ['Ligamen\nperiodontal', 1.9], ['Dentin', 2.4], ['Kanal\nakar', 2.9], ['Pulpa', 3.0], ['Email', 3.5], ['Gusi', 3.8]],
};
const G = gigi({ bare: true });

function reveal(id, inner, tt) {
  const [a, b, dir] = G.JADWAL[id], u = segD(tt, a, b, E.out);
  if (u >= 1) return inner; if (u <= 0.001) return '';
  if (dir === 'pudar') return `<g opacity="${f1(u)}">${inner}</g>`;
  const Y0 = 100, Y1 = 1900, h = (Y1 - Y0) * u, y = dir === 'naik' ? Y1 - h : Y0;
  return `<clipPath id="gRv${id}"><rect x="-200" y="${f1(y)}" width="1500" height="${f1(h)}"/></clipPath><g opacity="${f1(Math.min(1, u * 2.5))}" clip-path="url(#gRv${id})">${inner}</g>`;
}

export function frame(t, opt = {}) {
  const P = PARAM.panggung, tt = PARAM.waktuAset.offset + PARAM.waktuAset.laju * t, kam = kamera(t, KAMERA);
  const tf = `translate(${P.ke[0]} ${P.ke[1]}) scale(${P.skala}) translate(${-P.cx} ${-P.cy})`;
  const ke = (x, y) => proyeksi(kam, [P.ke[0] + (x - P.cx) * P.skala, P.ke[1] + (y - P.cy) * P.skala]);
  let sc = '';
  for (const id of Object.keys(G.LAY)) sc += reveal(id, G.LAY[id], tt);
  sc += G.aliran(tt);
  const isi = `${defs('g', TEMA_MEDCOEL)}${G.defs}<g transform="${tf}">${sc}</g>`;
  const { MX, MY, tipR } = G;
  const A = {
    'Tulang\nalveolar': [880, 1400], 'Ligamen\nperiodontal': [MX(746), MY(1000)], 'Dentin': [MX(700), MY(742)], 'Kanal\nakar': [MX(650), MY(1070)],
    'Pulpa': [MX(600), MY(790)], 'Email': [MX(716), MY(572)], 'Gusi': [tipR[0] + 70, tipR[1] + 62],
  };
  const q = PARAM.label.map(([n, t0]) => ({ n, t0, a: ke(...A[n]) }));
  const ys = susunLabel(q.map((o) => o.a[1]), { min: 420, max: 1640, jarak: 128 });
  const labels = q.map((o, i) => label({ a: o.a, l: [776, ys[i]], teks: o.n, warna: { Email: '#DCE6F0', Dentin: '#E8B66E', Pulpa: '#D0425A', Gusi: '#E0768A' }[o.n] || (o.n.startsWith('Tulang') ? '#E6CF9C' : o.n.startsWith('Lig') ? '#E58E78' : '#F28A98'), p: seg(t, o.t0, o.t0 + TEMPO.labelMasuk) })).join('');
  return bingkai({ organ: 'gigi', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: labels, bagian: !!opt.bagian });
}
