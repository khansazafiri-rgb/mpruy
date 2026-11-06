// Klip KULIT (5,4 dtk): kulit berambut, MUTU BENTUK/TEKSTUR dari aset cabang claude/eloquent-darwin-ewtwtu (darwin/kulit.mjs, commit b3af953).
// Gerak = penelusuran kedalaman: pita pemindai menurun dari permukaan ke hipodermis; lapisan di bawah pita diredupkan, nama lapisan yang sedang dilewati ditampilkan.
// Setelah pemindai selesai, struktur diberi label. Latar, header, label, kamera, easing mengikuti sistem Atlas bersama.
import { kulit } from '../darwin/kulit.mjs';
import { defs, TEMA_MEDCOEL, f1 } from '../darwin/anatomi.mjs';
import { TEMPO, KAMERA, seg, EASE } from '../tokens.mjs';
import { bingkai, kamera, label, proyeksi, susunLabel } from '../kerangka.mjs';

export const meta = { id: 'kulit', judul: 'Kulit', sub: 'kulit berambut · potongan melintang', organ: 'kulit', durasi: TEMPO.durasi, fps: TEMPO.fps };
export const PARAM = {
  panggung: { cx: 540, cy: 965, ke: [400, 925], skala: 0.85 },
  pemindai: { mulai: 0.3, selesai: 3.5 },                          // detik Atlas; dipetakan ke jadwal bawaan aset (0,55-4,15 dtk)
  label: [['Epidermis', 3.6], ['Dermis', 3.8], ['Hipodermis\n(lemak)', 4.0], ['Folikel\nrambut', 4.1], ['Kelenjar\nsebasea', 4.2], ['Kelenjar\nkeringat', 4.3], ['Pembuluh\ndarah', 4.4], ['Saraf', 4.5]],
};
const K = kulit({ bare: true });

export function frame(t, opt = {}) {
  const P = PARAM.panggung, S = PARAM.pemindai, kam = kamera(t, KAMERA);
  const [j0, j1] = K.JADWAL.scan, tt = j0 + ((t - S.mulai) / (S.selesai - S.mulai)) * (j1 - j0);
  const pd = K.pindai(Math.max(j0, tt));
  const tf = `translate(${P.ke[0]} ${P.ke[1]}) scale(${P.skala}) translate(${-P.cx} ${-P.cy})`;
  const ke = (x, y) => proyeksi(kam, [P.ke[0] + (x - P.cx) * P.skala, P.ke[1] + (y - P.cy) * P.skala]);
  const isi = `${defs('k', TEMA_MEDCOEL)}${K.defs}<g transform="${tf}"><g>${K.sc}</g>${t >= S.selesai + 0.05 ? '' : pd.scan}</g>`;
  const A = K.A;
  const anc = {
    'Epidermis': [A.X1 - 70, A.SURF + 70], 'Dermis': [A.X1 - 60, A.PAP_BOT + 130], 'Hipodermis\n(lemak)': [A.X1 - 60, A.DERM_BOT + 210], 'Folikel\nrambut': [A.folX(900), 900],
    'Kelenjar\nsebasea': [A.SGX + 24, A.SGY + 34], 'Kelenjar\nkeringat': [A.PORE_X + 22, 1215], 'Pembuluh\ndarah': [660, A.DERM_BOT + 14], 'Saraf': [A.X1 - 20, A.HYP_BOT - 226],
  };
  const warna = { 'Epidermis': '#E6B0A6', 'Dermis': '#F1CDBF', 'Hipodermis\n(lemak)': '#F8DE8C', 'Folikel\nrambut': '#4A3328', 'Kelenjar\nsebasea': '#F6C45A', 'Kelenjar\nkeringat': '#74C9B2', 'Pembuluh\ndarah': '#B0444F', 'Saraf': '#F8C038' };
  const q = PARAM.label.map(([n, t0]) => ({ n, t0, a: ke(...anc[n]) }));
  const ys = susunLabel(q.map((o) => o.a[1]), { min: 420, max: 1640, jarak: 128 });
  let labels = q.map((o, i) => label({ a: o.a, l: [776, ys[i]], teks: o.n, warna: warna[o.n], p: seg(t, o.t0, o.t0 + TEMPO.labelMasuk) })).join('');
  // nama lapisan yang sedang dipindai: pil bergaya label bersama, mengikuti pita pemindai
  if (t >= S.mulai && t < S.selesai + 0.3) {
    const a = seg(t, S.mulai, S.mulai + 0.3) * (1 - seg(t, S.selesai, S.selesai + 0.3));
    const [sx, sy] = ke(A.X1, pd.by), nama = pd.nama.length > 22 ? pd.nama.slice(0, 22) : pd.nama;
    const teks = nama.length > 11 ? nama.replace(' (', '\n(').replace(/^([^\n(]+?) ([^\n]+)$/, (m, a, b) => (m.includes('\n') ? m : `${a}\n${b}`)) : nama;
    labels += `<g opacity="${f1(a)}">${label({ a: [sx, sy], l: [776, sy], teks, warna: '#F8C038', p: 1 })}</g>`;
  }
  return bingkai({ organ: 'kulit', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: labels, bagian: !!opt.bagian });
}
