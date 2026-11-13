// Token bersama sistem visual "Atlas MEDCOEL": warna merek, arah cahaya, easing, tempo, dan tata letak kanvas.
// Warna merek diambil dari apps/web/src/index.css (token --brand, --gold, --ink, --page, --academic, --coral) dan logo (siku "C" hijau + bintang emas).
// Warna JARINGAN tidak mengikuti merek; ia ditentukan strukturnya di tiap organ.

export const KANVAS = { w: 1080, h: 1920 };
export const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

export const MEREK = {
  hijau: '#007060', hijauGelap: '#00584E', emas: '#F8C038', tinta: '#172B38', gading: '#F8F7F3',
  biru: '#255F85', ungu: '#63579B', koral: '#B0444F',
};

// Palet latar per organ: tiga lapis warna dasar (atas, tengah, bawah), warna cahaya, dan warna rangka "C". Semua diturunkan dari merek.
export const LATAR = {
  jantung: { atas: '#0D1F2D', tengah: '#13303C', bawah: '#0A1822', cahaya: '#D9707A', rangka: '#1F9C86', aksen: '#F8C038' },
  gigi: { atas: '#0D1F33', tengah: '#16385A', bawah: '#0A1826', cahaya: '#7DBBE6', rangka: '#2B7FB0', aksen: '#F8C038' },
  usus: { atas: '#0F2230', tengah: '#183A3E', bawah: '#0A1A1E', cahaya: '#E9A27A', rangka: '#1F9C86', aksen: '#F8C038' },
  sendi: { atas: '#13262E', tengah: '#1D3B3A', bawah: '#0B1B20', cahaya: '#F2B36B', rangka: '#1F9C86', aksen: '#F8C038' },
  kulit: { atas: '#0E2523', tengah: '#154238', bawah: '#0A1A19', cahaya: '#F2C46B', rangka: '#1F9C86', aksen: '#F8C038' },
};

// Arah cahaya tunggal untuk semua organ: dari kiri atas (vektor ke sumber cahaya).
export const CAHAYA = { arah: [-0.55, -0.83] };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// Dua easing saja untuk semua organ: kamera/gerak struktur = inOut (lambat di ujung), penyingkapan/label = out.
export const EASE = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  lin: (t) => t,
};
/** Kemajuan 0..1 dari detik a ke b dengan easing. */
export const seg = (t, a, b, e = EASE.out) => e(clamp((t - a) / (b - a)));
export const lerp = (a, b, u) => a + (b - a) * u;

// Tempo yang sama untuk semua klip (detik)
// durasi klip 5,4 dtk = 5,0 dtk gerak + 0,4 dtk tahan; tiga klip digabung dengan transisi 0,6 dtk menjadi tepat 15 dtk
export const TEMPO = { durasi: 5.4, gerak: 5.0, tahan: 0.4, fps: 30, reveal: 0.7, labelMasuk: 0.5, jedaLabel: 0.28, transisi: 0.6 };
// kamera bersama semua organ: satu dolly masuk 4,5% dengan easing inOut + geser kecil ke atas; gerak organ berbeda-beda, kamera sama
export const KAMERA = [{ t: 0, x: 0, y: 0, s: 1.0 }, { t: 5.0, x: -6, y: -10, s: 1.045 }, { t: 5.4, x: -6, y: -10, s: 1.045 }];

// Tata letak kanvas 1080x1920 (piksel), sama untuk semua organ
export const TATA = {
  header: { y: 150 },
  panggung: { x: 90, y: 330, w: 900, h: 1180 },   // area organ
  pusat: { x: 540, y: 920 },
  footer: { y: 1790 },
};
