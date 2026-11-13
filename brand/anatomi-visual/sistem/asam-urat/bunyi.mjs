// Daftar efek bunyi (waktu nyata, jenis, gain relatif) untuk audio.py: dibuat dari waktu kata narasi yang sama dengan gambar.
// Pakai: node bunyi.mjs > bunyi.json
import { W, ADEGAN, LOGO, K } from './waktu.mjs';
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7 + 7.7) * 43758.5453; return x - Math.floor(x); };
const E = [];
const tambah = (t, k, g = 1) => E.push({ t: +t.toFixed(3), k, g });
// hook: kamera menembus kulit (naik) dan pecah jadi bloom hangat
tambah(0.35, 'naik', 1); tambah(3.45, 'bloom', 1);
// purin -> urat
tambah(W.purin, 'pip', 1); tambah(W.sel, 'pip', 0.8); tambah(W.makanan, 'pip', 0.8);
for (let i = 0; i < 8; i++) tambah(7.6 + i * 0.26 + rnd(i) * 0.06, 'tetes', 0.7);
tambah(W.urat1, 'pip', 1);
// ginjal
tambah(9.45, 'whoosh', 1); tambah(W.ginjal, 'pip', 0.9); tambah(W.urin, 'pip', 0.9); tambah(11.5, 'aliran', 1);
tambah(12.3, 'naikPelan', 1);                    // nada naik pelan saat kadar naik
// ke sendi, kristal terbentuk
tambah(14.6, 'whoosh', 1);
for (let i = 0; i < 12; i++) tambah(15.3 + i * 0.14 + rnd(i, 3) * 0.08, 'kristal', 0.5 + 0.4 * rnd(i, 4));
tambah(W.kristal1, 'pip', 0.9);
// sel pertahanan mendekat
for (let i = 0; i < 6; i++) tambah(17.45 + i * 0.3, 'sel', 0.7);
tambah(W.bereaksi, 'pip', 0.8);
// radang: denyut hangat naik, lalu gejala
tambah(19.7, 'denyut', 1);
tambah(W.nyeri, 'zing', 1); tambah(W.bengkak, 'bengkak', 1); tambah(W.merah, 'hangatMerah', 1); tambah(W.hangat, 'hangat', 1);
// keluar ke kaki, gout
tambah(24.6, 'whoosh', 1); tambah(W.gout, 'pip', 1); tambah(W.asamurat, 'pip', 0.9);
tambah(W.pangkal, 'pip', 0.9); tambah(W.sendiLain, 'pip', 0.9);
// layar terbagi
tambah(33.85, 'whoosh', 0.8); tambah(36.2, 'naikPendek', 0.8); tambah(W.tidakOtomatis, 'pip', 1.1); tambah(37.5, 'zing', 0.5); tambah(W.reaksi, 'ping', 0.8);
tambah(46.2, 'whoosh', 0.7); tambah(LOGO[0], 'lonceng', 1);
const dur = 51.76; console.log(JSON.stringify({ durasi: dur, efek: E.sort((a, b) => a.t - b.t) }, null, 0));
