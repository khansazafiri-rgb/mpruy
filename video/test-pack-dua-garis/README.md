# Video edukasi "Kenapa test pack bisa menunjukkan dua garis?" (Reels/TikTok 1080 x 1920, 30 fps, 71,20 dtk)

Edukasi tentang prinsip test pack hCG berbasis aliran lateral: **urine merambat di strip berpori -> hCG menempel pada partikel penanda -> tertangkap di zona T (garis tes) -> cairan lanjut ke zona C (garis kontrol) -> tiga hasil -> tes terlalu dini bisa negatif**. Bagian edukasi 55,0 dtk (narasi Google AI Studio 54,12 dtk mulai 0,3 dtk) + **master outro MEDCOEL 16,2 dtk ditempel utuh** (`brand/video/outro/medcoel-outro-master.mp4`).

> **Batas pemeriksaan (jujur):** lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. Hasil diperiksa lewat bingkai dari MP4 akhir, ASR audio akhir, kenyaringan, deteksi hitam/beku, dan uji kesamaan master. **Belum ada orang yang menonton video ini dengan suara pada kecepatan normal.** Lihat `QA.md`.

## Hasil
| Berkas | Isi |
|---|---|
| `test-pack-dua-garis_final.mp4` | Video jadi (H.264 + AAC 48 kHz, 71,20 dtk, 2136 bingkai, -14,2 LUFS, puncak sejati -1,2 dBFS) |
| `cover/` | `cover.png` (1080 x 1920), area aman, potongan 3:4, pratinjau 360 px, `render-cover.cjs` |
| `takarir.srt/.vtt` | Takarir bagian edukasi (naskah apa adanya) |
| `still/` | 23 still dari MP4 akhir + `lembar-270px.png` |
| `SUMBER.md`, `QA.md` | Sumber medis/aset/lisensi; laporan pemeriksaan |
| `stage/`, `audio/`, `render.mjs`, `shot.cjs`, `gabung.sh`, `buat_takarir.py` | Proyek yang bisa diedit |

## Peta ruang yang dijaga (satu strip contoh, semua adegan)
Arah aliran **selalu kiri -> kanan**: ujung bantalan sampel -> bantalan konjugat -> membran dengan **zona T (x 1330)** lalu **zona C (x 1590)** -> bantalan penyerap. Tampak atas dan tampak samping memakai x yang sama; huruf **T** dan **C** tercetak di casing dan tidak berpindah. Pandangan mikroskopis (ilustrasi) juga mengalir kiri -> kanan dengan peta mini yang menandai zona yang diperbesar. Warna konsisten: partikel penanda merah muda, hCG ungu, antibodi di partikel krem, antibodi penangkap di T teal, di C biru.

## Alur adegan (detik video = detik narasi + 0,3)
| Detik | Adegan |
|---|---|
| 0 - 4 | Hook: jendela hasil, cairan sudah bergerak sejak bingkai pertama, garis C lalu T muncul; "DUA GARIS INI DARI MANA?" |
| 4 - 9 | Kamera mundur ke test pack utuh, ujung kena urine, masuk ke penampang; cairan merambat dengan panah arah; "CAIRAN MERAMBAT" |
| 9 - 24,7 | Mikroskopis: partikel + antibodi, hCG datang dan menempel pada ujung antibodi (objek benar-benar bergerak), kompleks tiba di zona T dan tertangkap antibodi penangkap (sandwich), partikel menumpuk; sorot huruf "T" tepat setelah "area T" |
| 24,7 - 29,2 | Kembali ke strip utuh: garis T muncul; cairan menuju C |
| 29,2 - 30,8 | Mikroskopis zona C: partikel kontrol tertangkap antibodi kontrol |
| 30,8 - 33,2 | Strip utuh: garis C; "tes berjalan" |
| 33,2 - 36,9 | Valid vs tanpa C; "TANPA C -> TIDAK VALID" (kotak putus-putus berjalan di tempat C yang kosong) |
| 36,9 - 45,0 | Tiga hasil berdampingan: C + T, hanya C, tanpa C; sorot satu per satu |
| 45,0 - 50,5 | Tes terlalu dini: grafik kadar hCG belum mencapai ambang baca; hasil pada saat itu hanya C; "negatif terlalu dini belum menyingkirkan kehamilan" |
| 50,5 - 55,0 | Baca sesuai petunjuk kemasan (ikon jam tanpa angka; tidak mengarang waktu); Raka asli |
| 55,0 - 71,2 | **Master outro MEDCOEL, utuh** (tidak ada teks, musik, atau CTA tambahan di atasnya) |

## Aturan isi yang dijaga
- Ilustrasi **prinsip** aliran lateral; bukan satu merek. Desain dan waktu baca bisa berbeda antarproduk (ditulis di layar).
- Garis T = hCG terdeteksi pada kondisi tes itu; garis C = kontrol proses; tanpa C = tidak valid. Tidak menyatakan T muncul lebih dulu daripada C (di hook garis C tampak lebih dulu; di adegan penjelasan T lebih dulu, mengikuti urutan zona).
- hCG digambar sebagai molekul yang **menempel pada partikel dan tertahan di zona T**, bukan tinta yang mengecat strip. Hasil negatif terlalu dini tidak menyingkirkan kehamilan; tidak ada satu hasil yang disebut diagnosis final.
- Skala makro -> mikro: peta mini menandai zona; ukuran molekul dan jumlah partikel adalah ilustrasi.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8140 --bind 127.0.0.1 &
node -e "import('./video/test-pack-dua-garis/stage/timeline.js').then(T=>require('fs').writeFileSync('video/test-pack-dua-garis/stage/timeline.json',JSON.stringify({OFF:T.OFF,NAR:T.NAR,EDU:T.EDU,OUT:T.OUT,DUR:T.DUR,A:T.A,KAL:T.KAL},null,1)))"
python3 video/test-pack-dua-garis/audio/build_audio.py                          # edu_mix.wav + events.json
node video/test-pack-dua-garis/render.mjs video/test-pack-dua-garis/frames 0 1649 4
bash video/test-pack-dua-garis/gabung.sh video/test-pack-dua-garis/frames       # edukasi -14 LUFS + master outro apa adanya -> _final.mp4
python3 video/test-pack-dua-garis/buat_takarir.py; node video/test-pack-dua-garis/cover/render-cover.cjs video/test-pack-dua-garis/cover/cover.png
```
Memeriksa satu bingkai: `node video/test-pack-dua-garis/shot.cjs "21.2,38.0" <folder>`. Bingkai mentah dan mix sementara tidak di-commit.

## Struktur kode (`stage/`)
`timeline.js/.json` (jangkar kata dari ASR, takarir) · `strip.js` (model strip: tampak atas, samping, antibodi, partikel, hCG, peta mini) · `micro.js` (pandangan mikroskopis) · `scenes.js` (adegan, `frame(t)`, `cover()`) · `raka.js` (pembungkus `brand/characters/raka/raka.js`) · `lib.js`/`core.js`.
