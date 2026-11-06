// Klip GIGI (5,4 dtk): molar pertama rahang bawah, potongan mesiodistal, mutu bentuk/tekstur dari aset cabang claude/eloquent-darwin-ewtwtu (darwin/gigi.mjs, commit b3af953).
// Alur (revisi keterbacaan): 0-1,1 dtk gigi UTUH dengan semua lapisan (0-0,6 dtk sebagian tertutup transisi masuk); 1,1-1,8 lapisan dibuka (gusi bergeser ke samping, email terangkat, ligamen dan tulang turun);
// tiga fase sorot, masing-masing dengan 2-3 label yang berhubungan: A email + gusi, B dentin + pulpa + kanal akar, C ligamen periodontal + tulang alveolar;
// lapisan non-fokus diredupkan; 4,4-5,1 lapisan menutup kembali sehingga segmen berakhir dengan gigi utuh. Tidak ada denyut.
import { gigi } from '../darwin/gigi.mjs';
import { defs, TEMA_MEDCOEL, f1 } from '../darwin/anatomi.mjs';
import { TEMPO, KAMERA, seg, EASE } from '../tokens.mjs';
import { bingkai, kamera, proyeksi, labelFase } from '../kerangka.mjs';

export const meta = { id: 'gigi', judul: 'Gigi molar', sub: 'molar 1 bawah · potongan mesiodistal', organ: 'gigi', durasi: TEMPO.durasi, fps: TEMPO.fps };
export const PARAM = {
  panggung: { cx: 510, cy: 920, ke: [415, 925], skala: 0.74 },     // titik pusat konten aset -> pusat panggung Atlas
  buka: { mulai: 1.1, selesai: 1.8, tutupMulai: 4.4, tutupSelesai: 5.1 },
  jarak: { tulang: 48, ligamen: 22, email: 52, gusi: 56 },         // jarak pembukaan lapisan (unit aset)
  fase: [
    { id: 'A', t0: 1.5, t1: 2.6, fokus: ['g-email', 'g-gusi'] },
    { id: 'B', t0: 2.7, t1: 3.7, fokus: ['g-dentin', 'g-sementum', 'g-pulpa', 'g-saraf-pembuluh'] },
    { id: 'C', t0: 3.8, t1: 4.8, fokus: ['g-lig-periodontal', 'g-tulang'] },
  ],
  redup: 0.62,                                                      // pengurangan opasitas lapisan non-fokus
};
const G = gigi({ bare: true });
const win = (t, a, b) => seg(t, a, a + 0.25, EASE.inOut) * (1 - seg(t, b - 0.25, b, EASE.inOut));

export function frame(t, opt = {}) {
  const P = PARAM, J = P.jarak, kam = kamera(t, KAMERA);
  const buka = seg(t, P.buka.mulai, P.buka.selesai, EASE.inOut) * (1 - seg(t, P.buka.tutupMulai, P.buka.tutupSelesai, EASE.inOut));
  const ops = (id) => { let d = 0; for (const F of P.fase) d = Math.max(d, win(t, F.t0 - 0.1, F.t1 + 0.1) * (F.fokus.includes(id) ? 0 : 1)); return 1 - P.redup * d; };
  const L = G.LAY, S = P.panggung;
  const tf = `translate(${S.ke[0]} ${S.ke[1]}) scale(${S.skala}) translate(${-S.cx} ${-S.cy})`;
  const ke = (x, y) => proyeksi(kam, [S.ke[0] + (x - S.cx) * S.skala, S.ke[1] + (y - S.cy) * S.skala]);
  const g = (id, tr, inner) => `<g opacity="${f1(ops(id))}" transform="${tr}">${inner}</g>`;
  let sc = g('g-tulang', `translate(0 ${f1(J.tulang * buka)})`, L['g-tulang']);
  sc += g('g-lig-periodontal', `translate(0 ${f1(J.ligamen * buka)})`, L['g-lig-periodontal']);
  sc += g('g-dentin', 'translate(0 0)', L['g-dentin']) + g('g-sementum', 'translate(0 0)', L['g-sementum']) + g('g-pulpa', 'translate(0 0)', L['g-pulpa']) + g('g-saraf-pembuluh', 'translate(0 0)', L['g-saraf-pembuluh']);
  sc += g('g-email', `translate(0 ${f1(-J.email * buka)})`, L['g-email']);
  const gus = L['g-gusi'];
  sc += `<defs><clipPath id="gGL"><rect x="-400" y="0" width="940" height="2000"/></clipPath><clipPath id="gGR"><rect x="540" y="0" width="940" height="2000"/></clipPath></defs>`;
  sc += `<g opacity="${f1(ops('g-gusi'))}"><g transform="translate(${f1(-J.gusi * buka)} 0)"><g clip-path="url(#gGL)">${gus}</g></g><g transform="translate(${f1(J.gusi * buka)} 0)"><g clip-path="url(#gGR)">${gus}</g></g></g>`;
  sc += `<g opacity="${f1(1 - buka)}">${L['g-kontur']}</g>` + G.aliran(t);
  const isi = `${defs('g', TEMA_MEDCOEL)}${G.defs}<g transform="${tf}">${sc}</g>`;
  const { MX, MY, tipR } = G;
  const A = {   // jangkar (koordinat aset) di sisi kanan gigi; ikut bergeser bersama lapisannya
    email: [MX(766), MY(690) - J.email * buka], gusi: [tipR[0] + 100 + J.gusi * buka, tipR[1] + 75], dentin: [MX(700), MY(742)], pulpa: [MX(644), MY(770)], kanal: [MX(650), MY(1070)],
    ligamen: [MX(746), MY(1000) + J.ligamen * buka], tulang: [880, 1400 + J.tulang * buka],
  };
  const pt = (k) => ke(...A[k]);
  const fase = [
    { t0: P.fase[0].t0, t1: P.fase[0].t1, item: [{ teks: 'Email', a: pt('email'), warna: '#DCE6F0' }, { teks: 'Gusi', a: pt('gusi'), warna: '#E0768A' }] },
    { t0: P.fase[1].t0, t1: P.fase[1].t1, item: [{ teks: 'Dentin', a: pt('dentin'), warna: '#E8B66E' }, { teks: 'Pulpa', a: pt('pulpa'), warna: '#D0425A' }, { teks: 'Kanal\nakar', a: pt('kanal'), warna: '#F28A98' }] },
    { t0: P.fase[2].t0, t1: P.fase[2].t1, item: [{ teks: 'Ligamen\nperiodontal', a: pt('ligamen'), warna: '#E58E78' }, { teks: 'Tulang\nalveolar', a: pt('tulang'), warna: '#E6CF9C' }] },
  ];
  return bingkai({ organ: 'gigi', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: opt.tanpaLabel ? '' : labelFase(t, fase), bagian: !!opt.bagian });
}
