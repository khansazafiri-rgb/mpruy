# Sumber, bahan, dan lisensi

## Dasar medis
- **AHA, Arrhythmias and Congenital Heart Disease** (https://www.heart.org/en/health-topics/congenital-heart-defects/the-impact-of-congenital-heart-defects/arrhythmias-and-congenital-defects), berhasil dibaca: setiap denyut mulai di nodus sinoatrial (SA) yang membentuk impuls kecil; impuls menyebar ke otot serambi sehingga serambi berkontraksi dan mendorong darah ke bilik; impuls lalu mencapai nodus atrioventrikular (A-V); **"The A-V node delays the impulse briefly so the ventricles have time to fill"**; kemudian impuls masuk ke bilik dan bilik berkontraksi. Itulah dasar urutan di video: serambi -> P, nodus AV menahan sejenak, bilik terisi, bilik aktif -> QRS.
- **NCBI Bookshelf NBK555952** (https://www.ncbi.nlm.nih.gov/books/NBK555952/): **tidak bisa dibuka dari lingkungan pembuat** (halaman jawaban berupa pemeriksaan reCAPTCHA; tidak saya lewati). Isinya tidak dipakai sebagai rujukan di video ini; pemesan/pengulas perlu memeriksanya sendiri bila dikehendaki. Pengertian segmen PR (bagian datar antara akhir gelombang P dan awal kompleks QRS; mencakup penundaan di nodus AV dan konduksi berkas His-Purkinje) diambil dari naskah pemesan dan model `heart.js`.
- Tidak ada angka durasi (milidetik) di layar; hanya label "GERAK DIPERLAMBAT" karena jeda asli sangat singkat. Tidak ada diagnosis atau klaim penyakit tentang segmen PR; garis datar tidak digambarkan sebagai jantung berhenti.

## Bahan
| Bahan | Hasil |
|---|---|
| Audio narasi | `audio/narasi-edukasi.wav` dari pemesan (Google AI Studio, 24 kHz mono, 26,68 dtk), SHA-256 `9bf8554985a503aae186b0e25b2519562aaed550197ee928cbeb832bff169e5c`. Dipakai apa adanya (hanya di-resample ke 48 kHz); tidak ada narator pengganti. ASR menulis "glombang", "KRS" untuk QRS, "terkordinasi" (kesalahan ASR; takarir memakai naskah). |
| Outro | `brand/video/outro/medcoel-outro-master.mp4` (README dan assets.json outro dibaca) ditempel utuh: korelasi audio 0,9993, gambar identik; tidak ada teks/musik/CTA tambahan. Bukan dari video EKG lama. |
| Aset jantung dan EKG | `video/ekg-garis-layar/stage/heart.js` disalin ke `stage/heart.js` dengan tambahan (komentar di berkas): impuls tertahan dan berdenyut di nodus AV, serambi berkontraksi sepanjang segmen PR, bilik terisi darah (`fill`/`flow`), jalur impuls serambi -> nodus AV diperpanjang sampai akhir P. Bentuk jantung, warna (P kuning, QRS jingga), jalur konduksi, `ecgSlow` dan penanda `EV` tidak diubah. Panggung, adegan, dan pemetaan waktu adalah baru; video EKG lama tidak dipotong ulang. |
| Raka | `brand/characters/raka/raka.js` lewat `rakaSvg()` (README karakter dibaca): hook (di depan monitor, mengikuti garis dengan jari), penutup (menunjuk ruas datar, lalu tersenyum), dan cover. Tidak digambar ulang; rambut, sweater teal, patch logo, wajah, proporsi lengan/tangan mengikuti aset. |
| Logo | `apps/web/src/assets/logo-full.webp` (salinan di `stage/`), hanya di cover. |
| Gambar lain | Semua dari kode (SVG): grafik EKG, panel, label. Tanpa foto atau aset pihak ketiga. |

## Musik dan efek (lisensi)
Musik (pad + pluck lembut, 84 BPM, Am-F-C-G) dan semua aksen (bunyi halus saat P muncul, ketukan lembut di nodus AV, chime segmen PR, whoosh bilik terisi, ketukan + gumpalan rendah singkat saat QRS) **disintesis sendiri** dengan numpy/scipy di `audio/build_audio.py`: tanpa sampel pihak ketiga, **CC0 / domain publik**, aman untuk promosi Instagram/TikTok. Aksen turun otomatis di bawah suara.

_Salinan mentah halaman/PDF sumber yang saya baca saat pembuatan disimpan lokal di `sumber/` dan **tidak di-commit** (hak cipta pihak ketiga dan ukuran); tautan dan kutipan ringkas ada di atas._
