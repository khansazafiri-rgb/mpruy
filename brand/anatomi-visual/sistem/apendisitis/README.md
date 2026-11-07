# Video "Kenapa usus buntu diangkat?" (75,2 dtk, 1080 x 1920, 30 fps)

Animasi dari kode (SVG per bingkai, Chromium + ffmpeg). Narasi: audio Gemini TTS yang diberikan pemesan (73,0 dtk, tidak dipercepat atau dipotong) + kartu penutup 2,2 dtk. Naskah tidak diubah; takarir = naskah persis (tag `<breath>` dan `<short pause>` tidak ditampilkan).

## Alur (satu rantai mekanisme)
| Waktu | Narasi (ringkas) | Visual |
|---|---|---|
| 0-7,3 | Dokter memasukkan kamera ... mengangkat satu kantong. Kenapa bagian itu harus diangkat? | Bingkai pertama sudah bergerak: pandangan laparoskopi (skematis) mendekati apendiks meradang di pangkal sekum (tiga taenia bertemu di pangkalnya); instrumen dokter masuk dan berhenti di dekat apendiks (tidak ada pengangkatan). |
| 7,3-12,6 | Kantong kecil itu bernama apendiks. Ia menempel pada bagian awal usus besar. | Kamera mundur: lingkaran laparoskop mengecil menjadi inset, peta perut muncul; apendiks di fossa iliaka kanan, tersambung ke sekum; usus besar, ileum. |
| 12,6-16,9 | Ketika meradang ... apendisitis | Apendiks pada peta membengkak dan memerah. |
| 16,9-36,9 | Penyumbatan, lendir, tekanan, aliran darah, bakteri | Lensa "pembesaran skematik" masuk ke potongan memanjang apendiks yang tersambung ke sekum lewat ostium. Contoh sumbatan: tinja mengeras lalu jaringan dinding membengkak (ditandai contoh, bukan penyebab pasti). Dinding terus mengeluarkan lendir; lendir tertahan; lumen meregang dan tekanan naik (panah ke luar, indikator); aliran darah di dinding dan mesoapendiks menurun (arteri/vena apendikularis, pembuluh dinding memucat kebiruan); bakteri bertambah. |
| 37,4-45,7 | Nyeri samar di sekitar pusar, lalu kanan bawah | Pasien (Raka) dengan pendar nyeri di pusar; inset peta perut; kartu potongan dinding perut: apendiks meradang menyentuh peritoneum, peritoneum teriritasi, nyeri bergeser ke kanan bawah (pola yang mungkin). |
| 45,9-52,4 | Mual, hilang nafsu makan, demam | Tiga kartu gejala; "Tidak selalu sama pada setiap orang". |
| 52,4-57,9 | Dokter menilai gejala ... | Tala berjas (dokter) dan Raka; tiga langkah: tanya gejala, periksa perut, tes darah atau pencitraan (bila perlu). |
| 57,9-64,1 | Pengangkatan sering menjadi penanganan; antibiotik pada kasus tertentu | Dua kartu: pengangkatan apendiks (sering dipilih; tanpa gambar tindakan) dan antibiotik (pada kasus tertentu, dokter yang menilai). |
| 64,1-67,5 | Belum ada cara pasti mencegah | Kartu "Belum ada cara yang terbukti pasti" (tidak ada klaim makanan). |
| 67,5-73,0 | Jangan menunda pemeriksaan | Raka dengan nyeri kanan bawah yang makin kuat; tanda "Nyeri makin berat", "Menetap di kanan bawah", ajakan periksa. |
| 72,95-75,2 | | Kartu penutup MEDCOEL (logo hanya di sini; logo juga ada pada cover). |

## Berkas
| Berkas | Fungsi |
|---|---|
| `../scenes/apendisitis.mjs` | Adegan dan linimasa: kamera, label per fase, kartu, pemeriksaan, penutup. `frame(t)` = SVG satu bingkai. |
| `waktu.mjs`, `selaraskan-narasi.py`, `waktu-narasi.json` | Waktu kalimat narasi (jeda senyap + suku kata; ketelitian sekitar 0,2 dtk) dan teks takarir persis. |
| `art-lap.mjs` | Pandangan laparoskopi skematis (sekum bersakulasi, taenia, apendiks meradang, mesoapendiks, instrumen). |
| `art-peta.mjs` | Peta perut: kerangka usus besar, usus halus, sekum, apendiks, pendar nyeri. |
| `art-penampang.mjs` | Potongan memanjang apendiks yang tersambung ke sekum: empat lapis dinding, lumen, lendir, penyumbat, pembuluh, tekanan, iskemia, radang, bakteri; semua parameter dinamis. |
| `ikon.mjs`, `geom.mjs` | Ikon datar dan alat geometri (spline, pita). Jantung/organ lain tidak dipakai. |
| `aset/` | **Aset berlapis yang dapat diedit**: `*.svg` gabungan dengan `<g id="nama-lapisan">`, `layer/*.svg` satu per lapisan, `ikon.svg`, `parameter-animasi.json` (linimasa, penanda frasa, daftar lapisan). Dibuat ulang: `node brand/anatomi-visual/sistem/apendisitis/ekspor-aset.mjs`. |
| `audio.py` | Musik pelan (60 bpm), SFX seperlunya, narasi dominan dengan ducking. |
| `render.mjs`, `periksa-label.mjs` | Render bingkai (`still`, `bingkai`), pemeriksaan label (maks 3 serempak, tidak keluar layar, tidak saling menimpa). |
| `cover/` | Cover PNG 1080 x 1920 (`cover.png`, `cover.jpg`, `cover-profil-3x4.png`, `cover-panduan-area-aman.png`), kode `cover.mjs`, `render-cover.mjs`. |

Tokoh: Raka (pasien) dan Tala berjas (dokter) dipakai apa adanya dari `brand/characters`. Latar, label, takarir, dan token mengikuti Atlas MEDCOEL (`sistem/`); palet latar `usus` ditambahkan di `tokens.mjs`.

## Membuat ulang
```bash
node brand/anatomi-visual/sistem/apendisitis/render.mjs bingkai <dir> 0 564 &      # bagi 0-2256 menjadi 4 potong paralel (564, 1128, 1692, 2256)
python3 brand/anatomi-visual/sistem/apendisitis/audio.py <narasi.wav> <campur.wav>
ffmpeg -framerate 30 -i <dir>/f%05d.png -i <campur.wav> -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -shortest -movflags +faststart apendisitis.mp4
node brand/anatomi-visual/sistem/apendisitis/cover/render-cover.mjs                 # cover.png dan panduan area aman
python3 brand/anatomi-visual/sistem/apendisitis/selaraskan-narasi.py <narasi.wav> waktu-narasi.json   # bila narasi diganti
```
Satu video sekitar 12 menit dirender di 4 inti CPU. `render.mjs still <dir> <t...> --scale=0.5` untuk cuplikan cepat.

## Sumber
**Yang saya buka sendiri** (abstrak lewat PubMed; halaman penuh tidak dibuka):
- Penyebab utama apendisitis akut adalah sumbatan lumen proksimal apendiks, penyebab pastinya sering tidak jelas ([Palitnonkiat 2026](https://doi.org/10.1016/j.tcr.2026.101366)); sumbatan lumen nonspesifik, hiperplasia limfoid sebagai salah satu mekanisme ([Liang 2026](https://doi.org/10.1177/10935266261450264)); biji tumbuhan sebagai penyumbat pada satu kasus ([Hegedus 2026](https://doi.org/10.3390/diagnostics16060826)).
- Antibiotik sebagai alternatif pada apendisitis tanpa komplikasi terpilih, bukan pengganti umum: [Lin 2026](https://doi.org/10.1007/s00384-026-05147-1), [Hall 2026](https://doi.org/10.1002/wjs.70397), [Cummings-John 2026](https://doi.org/10.1186/s12893-026-03894-0), [Bachiri 2026](https://doi.org/10.1016/j.surg.2026.110750).
- Halaman NIDDK yang diminta (gejala/penyebab dan penanganan) **tidak dapat dibuka dari sesi ini** (host `www.niddk.nih.gov` tidak diizinkan oleh jaringan sesi); isi naskah yang merujuk ke sana tidak saya verifikasi langsung ke halaman itu. Perlu diperiksa ulang bila host sudah diizinkan.
- Video "cuci darah" yang disebut sebagai acuan gaya **tidak ditemukan di repositori** (semua cabang jarak jauh dicari); acuan seri yang dipakai: Atlas MEDCOEL (`sistem/`), video tensi rendah dan GCU.

## Skematis dan belum tervalidasi
- Anatomi **digambar sebagai skema dan belum diverifikasi atlas**: bentuk sekum dan kolon asendens, tiga taenia koli yang bertemu di pangkal apendiks, posisi apendiks pada peta perut (satu dari beberapa variasi letak), mesoapendiks dan arteri/vena apendikularis, empat lapis dinding dan folikel limfoid, proporsi dan jarak antarstruktur. Pola nyeri (periumbilikal lalu kanan bawah) disajikan sebagai pola yang mungkin, bukan aturan.
- Isi pengetahuan anatomi/patofisiologi di atas (taenia, mesoapendiks, jalur nyeri viseral lalu parietal) berasal dari pengetahuan buku ajar umum, bukan dari sumber yang saya buka pada sesi ini; sebaiknya ditinjau tenaga medis/anatomi.
- Peta perut, pandangan laparoskopi, dan potongan apendiks diberi penanda "skematis" dan "pembesaran skematik"; tidak ada tindakan pengangkatan yang digambarkan.
- Penyelarasan frasa di dalam kalimat diperkirakan (jeda senyap dan suku kata, +-0,2 dtk); pengenalan suara tidak tersedia di lingkungan ini.

## Hasil pemeriksaan (`../out/apendisitis.mp4`, H.264 + AAC, 75,2 dtk)
- Bingkai pertama sudah bergerak (laparoskop mendekat, instrumen masuk); selisih bingkai 0 ke 10 = 5,2 dari 255 (skala abu-abu).
- Label: maksimum 3 serempak, tidak keluar layar, tidak saling menimpa (`node tensi/periksa-label.mjs` versi `apendisitis/periksa-label.mjs`). Pada lebar 360 px label dan takarir terbaca (`../out/apendisitis-preview-360px.png`); teks kecil di dalam kartu dinding perut sekitar 8 px.
- Lompatan antar-bingkai tertinggi sekitar 13 dari 255, hanya pada gerak kamera dan lensa; tanpa lonjakan tunggal.
- Audio: narasi dominan (RMS sekitar -26 dBFS), musik dan SFX sekitar -41 dBFS; keluaran -14 LUFS (puncak sampel sekitar -1 dB).
- Still: `../out/apendisitis-still-1-awal.png`, `-2-tengah.png`, `-3-akhir.png`; cover: `cover/cover.png` (salinan `../out/apendisitis-cover.png`).

## Kekurangan yang diketahui
- Tidak diperiksa dengan pemutaran penuh bersuara oleh manusia; yang diperiksa: bingkai contoh tiap 2,5 dtk, selisih antar-bingkai, level audio.
- Kartu dinding perut (peritoneum) memakai teks kecil; lapisan kulit, lemak, otot hanya diberi label singkat.
- Instrumen laparoskopi dan jepitannya sederhana; tidak ada gerak menjepit (sengaja, agar tidak tampak pengangkatan).
- Gerak Raka/Tala hanya idle dan perubahan ekspresi; tidak ada gerak aksi (mis. benar-benar menekan perut); penekanan perut ditandai ikon tangan.
