// Waktu kata dari ASR audio asli (audio/asr.json). tn = detik narasi; t video = tn + OFF.
export const OFF = 0.3;
export const NAR = 38.72;                                      // panjang narasi-edukasi.wav
export const EDU = Math.ceil((OFF + NAR + 0.6) * 30) / 30;     // bagian edukasi; jeda ± 0,6 dtk sebelum outro
export const OUT = 16.2;                                       // master outro
export const DUR = EDU + OUT;
export const A = {
  coba: 0, tekan: 0.34, kuku: 0.60, warnanya: 1.80, memutih: 2.42, setelah: 3.32, dilepas: 3.72, berapa: 4.56, merah: 5.28, lagi: 5.74,
  ini: 6.68, disebut: 7.10, capillary: 7.50, crt: 9.32,
  saat: 10.68, ditekan: 11.18, darah: 12.20, pembuluh: 12.46, terdorong: 13.48, pucat: 15.02,
  begitu: 15.96, tekanan: 16.32, dilepas2: 16.64, mengalir: 17.70, warnanya2: 18.82, muncul: 19.26, lagi2: 19.70,
  warna: 20.62, biasanya: 21.02, sekitar: 21.84, dua: 22.12, detik: 22.36, kurang: 22.86,
  kalau: 23.58, lambat: 24.00, aliran: 24.76, jaringan: 25.28, berkurang: 26.16,
  tapi: 26.62, suhu: 27.80, dingin: 28.06, usia: 28.84, cara: 29.56, pemeriksaan: 29.76, waktunya: 31.44,
  jadi: 32.32, dua2: 33.22, petunjuk: 33.92, awal: 34.28, hasil: 35.12, crt2: 35.44, klinis: 37.70, end: 38.40,
};
export const KAL = [
  [0.0, 2.95, 'Coba tekan kuku sebentar. Warnanya memutih.'],
  [3.32, 6.0, 'Setelah dilepas, berapa detik sampai merah muda lagi?'],
  [6.68, 10.1, 'Ini disebut capillary refill time, atau CRT.'],
  [10.68, 15.4, 'Saat kuku ditekan, darah di pembuluh kecil bawahnya terdorong keluar sehingga terlihat pucat.'],
  [15.96, 20.0, 'Begitu tekanan dilepas, darah mengalir kembali dan warnanya muncul lagi.'],
  [20.62, 23.3, 'Warna biasanya kembali dalam sekitar dua detik atau kurang.'],
  [23.58, 26.7, 'Kalau lebih lambat, aliran darah ke jaringan bisa sedang berkurang.'],
  [26.62, 32.0, 'Tapi suhu dingin, usia, dan cara pemeriksaan juga dapat memengaruhi waktunya.'],
  [32.32, 34.8, 'Jadi, angka dua detik itu petunjuk awal.'],
  [35.12, 38.5, 'Hasil CRT harus dilihat bersama kondisi dan tanda klinis lainnya.'],
];
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const eo = (x) => { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); };
/** SATU urutan waktu untuk tekanan, pengisian darah (warna kuku), dan timer (semua tampilan memakai fungsi ini).
 *  press 0..1: tekanan jari pemeriksa (0 = kontak BENAR-BENAR lepas); lift 0..1: jari terangkat menjauh; fill 0..1: pengisian kapiler = warna kuku; timer: {start, stop} detik narasi.
 *  Timer mulai pada bingkai ketika press mencapai 0 (jari lepas), berhenti pada bingkai ketika fill mencapai 1. */
const EVS = [
  // [tekan mulai, tekan penuh, mulai pucat, pucat penuh, lepas (kontak habis), durasi isi, jenis]
  { p0: 0.30, p1: 1.30, b0: 0.90, b1: 2.40, rel: 3.80, dur: 2.0, kind: 'normal' },       // hook (mulai timer 3,80)
  { p0: 10.90, p1: 11.70, b0: 12.20, b1: 15.00, rel: 16.64, dur: 2.0, kind: 'normal' },   // mekanisme (lepas 16,64 = "dilepas")
  { p0: 20.10, p1: 20.40, b0: 20.25, b1: 20.70, rel: 20.70, dur: 1.7, kind: 'normal' },  // demonstrasi: pulih dalam ~1,7 dtk ("sekitar dua detik atau kurang")
  { p0: 23.65, p1: 23.95, b0: 23.80, b1: 24.15, rel: 24.25, dur: 4.4, kind: 'lambat' },   // contoh lebih lambat
];
const LOWF = 0.06;
export function crt(tn) {
  let press = 0, lift = 0, fill = 1, tStart = null, tStop = null, kind = 'normal', ev = -1;
  for (let i = 0; i < EVS.length; i++) {
    const e = EVS[i]; if (tn < e.p0 - 0.7) break; ev = i; kind = e.kind;
    const end = e.rel + e.dur, nxt = EVS[i + 1] ? EVS[i + 1].p0 - 0.7 : 1e9; if (tn >= nxt) continue;
    const rise = sm((tn - e.p0) / (e.p1 - e.p0)), rel = sm((tn - (e.rel - 0.28)) / 0.28);                    // lepas: tekanan turun ke 0 tepat di e.rel
    press = tn < e.rel ? Math.max(0, rise * (1 - rel)) : 0;
    lift = tn < e.p0 ? 1 - sm((tn - (e.p0 - 0.6)) / 0.6) : tn < e.rel ? 0 : sm((tn - e.rel) / 0.55);
    if (tn < e.b0) fill = 1; else if (tn < e.rel) fill = 1 - (1 - LOWF) * sm((tn - e.b0) / (e.b1 - e.b0)); else { const u = Math.min(1, (tn - e.rel) / e.dur); fill = LOWF + (1 - LOWF) * (e.kind === 'lambat' ? sm(u) * 0.85 + 0.15 * u * u * (3 - 2 * u) : 1 - Math.pow(1 - u, 2.2)); if (u >= 1) fill = 1; }
    tStart = e.rel; tStop = end;
    if (tn >= end + 0.6 && !EVS[i + 1]) lift = 1;
  }
  const running = tStart != null && tn >= tStart, tVal = running ? Math.min(tn, tStop) - tStart : 0;
  return { press, lift, fill, kind, ev, tStart, tStop, running, tVal, done: running && tn >= tStop };
}
