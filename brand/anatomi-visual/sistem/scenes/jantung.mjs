// Klip JANTUNG (5 detik): v7 dengan latar Atlas MEDCOEL. Gerak lokal: massa jantung (badan, aurikula, alur, lemak, koroner) berkontraksi
// terhadap titik tambat di dasar jantung (dekat pangkal pembuluh), sedangkan pembuluh besar tidak bergerak, jadi sambungan tetap utuh.
// Penanda aliran cahaya koroner = infografis (bukan rekaman aliran darah). Kamera: satu dolly pelan masuk.
import { buildSvg } from '../../v6/heart7.mjs';
import { TEMPO, EASE, seg, clamp, MEREK, TATA } from '../tokens.mjs';
import { bingkai, kamera, label, proyeksi } from '../kerangka.mjs';

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

export function frame(t) {
  const P = PARAM, e = amplop(t), tw = P.tambat;
  const flow = clamp(((t - P.aliran.awal) % P.aliran.periode) / (P.aliran.periode * 0.62));
  const flowO = Math.min(1, flow * 6, (1 - flow) * 5 + 0.3);
  const h = buildSvg({ layers: true, bg: false, anim: { flow: t >= P.aliran.awal ? flow : 0, flowO }, id: 'jt' });
  const sy = 1 - P.amplitudo.sy * e.s + 0.01 * e.a, sx = 1 - P.amplitudo.sx * e.s + 0.012 * e.a;
  const tfBody = `translate(${tw[0]} ${tw[1]}) rotate(${(P.amplitudo.putar * e.s).toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-tw[0]} ${-tw[1]})`;
  const k = P.skala, [ox, oy] = P.tempat;
  const gambar = (x, y) => [ox + x * k, oy + (y - 200) * k];       // koordinat gambar -> kanvas (sebelum kamera)
  // label: jangkar di organ (diam kecuali massa jantung; jangkar massa diikutkan denyut ringan lewat transform yang sama)
  const kam = kamera(t, [{ t: 0, x: 0, y: 0, s: 1.0 }, { t: TEMPO.durasi, x: -8, y: -14, s: 1.055 }]);
  const L = (i, a, l, teks, warna) => label({ a: proyeksi(kam, gambar(a[0], a[1])), l, teks, warna, sisi: 'kanan', p: seg(t, 0.9 + i * TEMPO.jedaLabel, 0.9 + i * TEMPO.jedaLabel + TEMPO.labelMasuk) });
  // semua label di kolom kanan (aturan seri): urut dari atas ke bawah mengikuti letak struktur
  const labels = [
    L(0, [466, 408], [800, 470], 'Lengkung\naorta', '#E0503C'),
    L(1, [505, 484], [800, 650], 'Batang\npulmonalis', '#4A56E0'),
    L(2, [470, 650], [800, 840], 'Aurikula\nkiri', '#B02A44'),
    L(3, [398, 850], [800, 1040], 'Arteri\nkoroner', '#F0B42A'),
    L(4, [480, 880], [800, 1240], 'Ventrikel\nkiri', '#C8222E'),
  ].join('');
  const isi = `<defs>${h.defs}</defs><g transform="translate(${ox} ${oy}) scale(${k}) translate(0 -200)">
<g>${h.back}</g><g transform="${tfBody}">${h.body}</g><g>${h.trunk}</g><g transform="${tfBody}">${h.hi}</g></g>`;
  return bingkai({ organ: 'jantung', t, judul: meta.judul, sub: meta.sub, isi, kam, overlay: labels });
}
