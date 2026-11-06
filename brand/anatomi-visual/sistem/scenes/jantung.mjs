// Klip JANTUNG (5 detik): v7 dengan latar Atlas MEDCOEL. Gerak lokal: massa jantung (badan, aurikula, alur, lemak, koroner) berkontraksi
// terhadap titik tambat di dasar jantung (dekat pangkal pembuluh), sedangkan pembuluh besar tidak bergerak, jadi sambungan tetap utuh.
// Penanda aliran cahaya koroner = infografis (bukan rekaman aliran darah). Kamera: satu dolly pelan masuk.
import { buildSvg } from '../../v6/heart7.mjs';
import { TEMPO, EASE, seg, clamp, MEREK, TATA, KAMERA } from '../tokens.mjs';
import { bingkai, kamera, label, proyeksi, labelFase } from '../kerangka.mjs';

export const meta = { id: 'jantung', judul: 'Jantung', sub: 'tampak depan · ruang dan pembuluh', organ: 'jantung', durasi: TEMPO.durasi, fps: TEMPO.fps };

// parameter animasi (aset yang dipakai ulang): periode denyut, titik tambat kontraksi, amplitudo
export const PARAM = {
  periode: 1.25,           // detik per siklus (tempo tenang untuk infografis, bukan EKG)
  tambat: [350, 600],      // koordinat gambar (piksel acuan) tempat massa jantung ditahan
  amplitudo: { sy: 0.045, sx: 0.02, putar: 0.8 },  // penyusutan sumbu panjang/pendek, putaran (derajat) saat sistol
  aliran: { periode: 2.5, awal: 0.3 },
  skala: 1.36,             // piksel acuan -> kanvas
  tempat: [40, 360],       // sudut kiri-atas kotak organ pada kanvas
};

// amplop denyut: relaksasi cepat-lambat, kontraksi tajam lalu kembali (0..1), bergelombang halus agar tidak mekanis
export function amplop(t) {
  const u = (t % PARAM.periode) / PARAM.periode;
  const kontraksi = Math.exp(-Math.pow((u - 0.22) / 0.13, 2));          // sistol
  const isi = 0.35 * Math.exp(-Math.pow((u - 0.06) / 0.07, 2));         // sentakan atrium sebelum sistol
  return { s: kontraksi, a: isi };
}

export function frame(t, opt = {}) {
  const P = PARAM, e = amplop(t), tw = P.tambat;
  const flow = clamp(((t - P.aliran.awal) % P.aliran.periode) / (P.aliran.periode * 0.62));
  const flowO = Math.min(1, flow * 6, (1 - flow) * 5 + 0.3);
  const h = buildSvg({ layers: true, bg: false, anim: { flow: t >= P.aliran.awal ? flow : 0, flowO }, id: 'jt' });
  const sy = 1 - P.amplitudo.sy * e.s + 0.01 * e.a, sx = 1 - P.amplitudo.sx * e.s + 0.012 * e.a;
  const tfBody = `translate(${tw[0]} ${tw[1]}) rotate(${(P.amplitudo.putar * e.s).toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-tw[0]} ${-tw[1]})`;
  const k = P.skala, [ox, oy] = P.tempat;
  const gambar = (x, y) => [ox + x * k, oy + (y - 200) * k];       // koordinat gambar -> kanvas (sebelum kamera)
  // label per fase (maks. 2 sekaligus; label lama keluar sebelum yang baru masuk; semua keluar sebelum transisi pada detik 4,8)
  const kam = kamera(t, KAMERA);
  const A = (x, y) => proyeksi(kam, gambar(x, y));
  const fase = [
    { t0: 0.9, t1: 2.3, item: [{ teks: 'Lengkung\naorta', a: A(476, 430), warna: '#E0503C' }, { teks: 'Batang\npulmonalis', a: A(516, 490), warna: '#4A56E0' }] },
    { t0: 2.5, t1: 3.7, item: [{ teks: 'Aurikula\nkiri', a: A(503, 640), warna: '#B02A44' }, { teks: 'Arteri\nkoroner', a: A(519, 766), warna: '#F0B42A' }] },
    { t0: 3.9, t1: 4.75, item: [{ teks: 'Ventrikel\nkiri', a: A(526, 930), warna: '#C8222E' }] },
  ];
  const labels = opt.tanpaLabel ? '' : labelFase(t, fase);
  const isi = `<defs>${h.defs}</defs><g transform="translate(${ox} ${oy}) scale(${k}) translate(0 -200)">
<g>${h.back}</g><g transform="${tfBody}">${h.body}</g><g>${h.trunk}</g><g transform="${tfBody}">${h.hi}</g></g>`;
  return bingkai({ organ: 'jantung', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: labels, bagian: !!opt.bagian });
}
