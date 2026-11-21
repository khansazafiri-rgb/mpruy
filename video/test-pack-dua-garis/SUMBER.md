# Sumber, bahan, dan lisensi

## Dasar medis (dibaca saat pembuatan)
- FDA 510(k) K210341, *One Step Pregnancy Test* (lateral flow sandwich immunoassay), https://www.accessdata.fda.gov/cdrh_docs/pdf21/K210341.pdf, bagian "Test Principle": urine diteteskan ke sumur sampel; bila hCG ada, terikat antibodi monoklonal anti-alfa-hCG terkonjugasi emas membentuk kompleks antibodi-emas-hCG; sampel ditarik melalui membran nitroselulosa secara kapiler; di garis tes (T), hCG ditangkap antibodi anti-beta-hCG yang diimobilisasi sehingga partikel emas tertahan dan membentuk garis berwarna (sandwich); tanpa hCG tidak ada ikatan dan tidak ada garis; di garis kontrol (C) partikel emas berlapis IgG kelinci ditangkap antibodi kontrol sehingga garis terbentuk sebagai tanda tes berjalan; dua garis = hamil, hanya C = tidak hamil, tanpa C = tidak valid.
- FDA, *Pregnancy Home Use Tests*, https://www.fda.gov/medical-devices/home-use-tests/pregnancy (konten per 29 April 2019): tes yang dilakukan terlalu dini mungkin memberi hasil negatif karena plasenta belum cukup menghasilkan hCG; hasil negatif sebaiknya dianggap sementara; ikuti petunjuk produk; produk berbeda dalam kemampuan mendeteksi kadar hCG rendah.
- Dari dokumen K210341 (satu produk) hanya **prinsip** yang dipakai; merek, volume sampel, sensitivitas 25 mIU/mL, dan waktu baca TIDAK ditampilkan karena berbeda antarproduk.
- Disederhanakan untuk ilustrasi: antibodi penangkap di T ditampilkan sebagai Y teal di dinding saluran pori; partikel penanda dan hCG digambar jauh lebih besar dari skala sebenarnya; "partikel kontrol" memakai penanda kotak oranye pada antibodinya agar berbeda dari penanda hCG.

## Bahan
| Bahan | Hasil |
|---|---|
| Audio narasi | `audio/narasi-edukasi.wav` dari pemesan (Google AI Studio, 24 kHz mono, 54,12 dtk), SHA-256 `965c917777ada6ecc7efb8f53b8d1ad6c0ece1f1bbccc6b8a58894507136f3d9`. Dipakai apa adanya (hanya di-resample ke 48 kHz); tidak ada narator pengganti. ASR menunjuk "tespek" untuk "test pack" dan "HCG" untuk "hCG" (kesalahan ASR; takarir memakai naskah). |
| Outro | `brand/video/outro/medcoel-outro-master.mp4` ditempel utuh (README outro dibaca): gambar, suara, musik, logo, URL tidak diubah; terbukti sama (korelasi audio 0,9994, selisih gambar < 0,1 level piksel). |
| Acuan gaya | `video/spo2-pulse-oximeter/spo2-pulse-oximeter_final.mp4` ditinjau (alat -> proses di dalam -> angka hasil lewat gerak, peta mini, label pendek); tidak ada objek/adegan/audio yang disalin. |
| Raka | `brand/characters/raka/raka.js` lewat `stage/raka.js` (tegak, tidak digambar ulang); tampil mengamati (hook alir) dan di adegan baca petunjuk, serta cover. Tidak ada tangan memegang strip, jadi tidak ada masalah skala tangan/badan; adegan strip dan mikro berdiri sendiri tanpa tubuh. |
| Logo | `apps/web/src/assets/logo-full.webp` (salinan `stage/logo-full.webp`), hanya di cover. |
| Gambar lain | Semua digambar dari kode (SVG): strip, partikel, antibodi, hCG, grafik. Tidak ada foto, merek, atau aset pihak ketiga. |

## Musik dan efek (lisensi)
Musik (pad + pluck lembut, 96 BPM, Am-F-C-G) dan semua aksen (squish ujung kena urine, whoosh transisi, snap saat hCG menempel/tertangkap, ping saat "area T" dan "area C", chime saat garis muncul, nada rendah lembut saat "tidak valid") **disintesis sendiri** dengan numpy/scipy di `audio/build_audio.py`: tanpa sampel pihak ketiga, **CC0 / domain publik**, aman untuk promosi Instagram/TikTok. Aksen adalah gaya, bukan bunyi asli strip; turun otomatis di bawah suara; bukan alarm.
