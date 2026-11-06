// Klip KULIT (5,4 dtk): kulit berambut, mutu bentuk/tekstur dari aset cabang claude/eloquent-darwin-ewtwtu (darwin/kulit.mjs, commit b3af953).
// Alur (revisi keterbacaan): 0-1,1 dtk potongan kulit UTUH dan terang (0-0,6 dtk sebagian tertutup transisi masuk); pemindai kedalaman lalu turun bertahap dan berhenti di tiap lapisan:
// epidermis (label 1,3-2,2), dermis (2,3-3,2), hipodermis/lemak (3,3-4,2); lapisan di bawah pita diredupkan ringan (tidak gelap penuh), peredupan hilang 4,1-4,5;
// bila masih ada waktu, folikel rambut dan kelenjar keringat disorot (4,4 sampai akhir; label terakhir tidak keluar karena tidak ada transisi sesudah kulit). Satu label per lapisan pada pemindai; maksimal dua label di akhir.
import { kulit } from '../darwin/kulit.mjs';
import { defs, TEMA_MEDCOEL, f1 } from '../darwin/anatomi.mjs';
import { TEMPO, KAMERA, seg, EASE, lerp } from '../tokens.mjs';
import { bingkai, kamera, proyeksi, labelFase } from '../kerangka.mjs';

export const meta = { id: 'kulit', judul: 'Kulit', sub: 'kulit berambut · potongan melintang', organ: 'kulit', durasi: TEMPO.durasi, fps: TEMPO.fps };
export const PARAM = {
  panggung: { cx: 540, cy: 965, ke: [400, 925], skala: 0.85 },
  peredupan: { mulai: 1.1, penuh: 1.4, hilangMulai: 4.1, hilangSelesai: 4.5, opasitas: 0.4 },
  // kunci posisi pita pemindai (detik, y aset): berhenti di tiap lapisan, lalu pindah dengan easing inOut
  pita: [[1.2, 'SURF-30'], [1.5, 'JUNC+22'], [2.1, 'JUNC+22'], [2.45, 'DERM_BOT-24'], [3.1, 'DERM_BOT-24'], [3.45, 'HYP_BOT-70'], [4.5, 'HYP_BOT-70']],
  fase: [
    { t0: 1.3, t1: 2.2, teks: 'Epidermis' }, { t0: 2.3, t1: 3.2, teks: 'Dermis' }, { t0: 3.3, t1: 4.2, teks: 'Hipodermis\n(lemak)' },
    { t0: 4.4, t1: 5.9, teks: ['Rambut dan\nfolikel', 'Kelenjar\nkeringat'] },
  ],
};
const K = kulit({ bare: true });
const A = K.A;
const kunci = (s) => { const m = s.match(/^(\w+)([+-]\d+)$/); return A[m[1]] + parseInt(m[2]); };

function posisiPita(t) {
  const ks = PARAM.pita.map(([tt, s]) => [tt, kunci(s)]);
  if (t <= ks[0][0]) return ks[0][1]; if (t >= ks[ks.length - 1][0]) return ks[ks.length - 1][1];
  for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) return lerp(ks[i][1], ks[i + 1][1], EASE.inOut((t - ks[i][0]) / (ks[i + 1][0] - ks[i][0])));
}

export function frame(t, opt = {}) {
  const P = PARAM, S = P.panggung, kam = kamera(t, KAMERA), R = P.peredupan;
  const tf = `translate(${S.ke[0]} ${S.ke[1]}) scale(${S.skala}) translate(${-S.cx} ${-S.cy})`;
  const ke = (x, y) => proyeksi(kam, [S.ke[0] + (x - S.cx) * S.skala, S.ke[1] + (y - S.cy) * S.skala]);
  // pemindai: pita emas + peredupan ringan di bawah pita; sebelum 0,8 dtk dan sesudah 4,3 dtk tidak ada peredupan sama sekali
  const op = R.opasitas * seg(t, R.mulai, R.penuh, EASE.out) * (1 - seg(t, R.hilangMulai, R.hilangSelesai, EASE.inOut));
  let scan = '';
  if (op > 0.003) {
    const by = posisiPita(t), aktif = seg(t, R.mulai, R.penuh, EASE.out) * (1 - seg(t, R.hilangMulai, R.hilangSelesai, EASE.inOut));
    scan = `<g id="k-pemindai" clip-path="url(#kSlab)"><defs><linearGradient id="kScanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#FFF3C4" stop-opacity=".42"/></linearGradient></defs><rect x="${A.X0}" y="${f1(by)}" width="${A.X1 - A.X0}" height="1920" fill="#0A3830" opacity="${f1(op)}"/><g opacity="${f1(aktif)}"><rect x="${A.X0}" y="${f1(by - 46)}" width="${A.X1 - A.X0}" height="46" fill="url(#kScanG)"/><rect x="${A.X0}" y="${f1(by - 2)}" width="${A.X1 - A.X0}" height="5" fill="#F8C038"/></g></g>`;
  }
  const isi = `${defs('k', TEMA_MEDCOEL)}${K.defs}<g transform="${tf}"><g>${K.sc}</g>${scan}</g>`;
  const ax = A.X1 - 30, yE = (A.SURF + A.JUNC) / 2, yD = (A.JUNC + A.DERM_BOT) / 2, yH = (A.DERM_BOT + A.HYP_BOT) / 2 - 40;
  const fase = [
    { t0: P.fase[0].t0, t1: P.fase[0].t1, item: [{ teks: P.fase[0].teks, a: ke(ax, yE), warna: '#E6B0A6' }] },
    { t0: P.fase[1].t0, t1: P.fase[1].t1, item: [{ teks: P.fase[1].teks, a: ke(ax, yD), warna: '#F1CDBF' }] },
    { t0: P.fase[2].t0, t1: P.fase[2].t1, item: [{ teks: P.fase[2].teks, a: ke(ax, yH), warna: '#F8DE8C' }] },
    { t0: P.fase[3].t0, t1: P.fase[3].t1, item: [{ teks: P.fase[3].teks[0], a: ke(A.hx + 20, A.SURF - 96), warna: '#4A3328' }, { teks: P.fase[3].teks[1], a: ke(A.PORE_X + 30, 1215), warna: '#74C9B2' }] },
  ];
  return bingkai({ organ: 'kulit', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: opt.tanpaLabel ? '' : labelFase(t, fase, { min: 380 }), bagian: !!opt.bagian });
}
