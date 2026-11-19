# Sumber, lisensi, dan bahan

## Sumber fisika dan keselamatan (dibuka sesi ini lewat `curl`; host EPA, Purdue, dan WHO ditambahkan ke jaringan sesi atas izin pemilik)
1. **EPA, "Mercury Thermometers"** (https://www.epa.gov/mercury/mercury-thermometers): pada termometer merkuri "a glass tube is filled with mercury and a standard temperature scale is marked on the tube. With changes in temperature, the mercury expands and contracts, and the temperature can be read from the scale"; pemakaian rumah tangga mencakup termometer demam; alternatif terdekat adalah termometer digital berbaterai atau bertenaga surya yang serupa dalam harga dan pemakaian.
2. **Purdue University, Chemical Safety, "Mercury FAQ"** (https://www.chem.purdue.edu/chemsafety/chem/HgFAQ.html): merkuri "has a linear coefficient of expansion" dan paling andal dan dapat diulang di antara cairan termometer; **tidak semua termometer kaca memakai merkuri**: ada cairan organik berwarna (spiritus mineral, dst.) yang "less toxic than mercury" tetapi membasahi dinding lubang sehingga mengurangi keterulangan dan koefisien muainya tidak linear.
3. **WHO, "Nations unite to eliminate mercury-containing medical devices"** (15 Mei 2024; https://www.who.int/news/item/15-05-2024-nations-unite-to-eliminate-mercury-containing-medical-devices): perangkat yang secara historis berisi merkuri "harmless as long as they remain intact. However, breakages of thermometers are common"; proyek bernilai US$ 134 juta untuk menghapus merkuri dalam alat medis (termometer dan tensimeter), alih-alih ke alat tanpa merkuri.

**Yang tidak tercantum langsung di sumber di atas:** penyempitan (konstriksi) pada termometer klinis yang menahan pembacaan maksimum berasal dari naskah/brief pemesan dan pengetahuan umum tentang desain termometer klinis; halaman EPA yang terbaca tidak menyebut konstriksi. Kenaikan uap merkuri saat tumpah digambar sebagai ilustrasi umum ("uapnya berbahaya" ada pada naskah).

## Bahan repo
- Branch dasar `claude/focused-wozniak-1ayrxa` (ref 10a1c07 saat dikerjakan); `docs/VIDEO_KATALOG.md`; `brand/video/outro/README.md` + `assets.json`.
- Contoh yang dipelajari: `video/kopi-kafein-adenosin/` (kamera dari Raka ke mekanisme yang bergerak, pil putih, takarir) dan `video/spo2-pulse-oximeter/` (hook, outro 84,65 - 99,80, komposisi, tempo, audio).
- Raka: `brand/characters/raka/raka.js` (`rakaSvg()`), tidak digambar ulang. Font Plus Jakarta Sans. Logo `apps/web/src/assets/logo-full.webp`.
- Outro: `rekam/outro-web.mp4` dan `rekam/siapkan-outro.sh` (salinan dari proyek SpO₂; sumber `video/masih-dua-minggu/rekam/rekaman-web.mp4` dan `video/dok-saya-kenapa/rekam/rekaman-web.mp4`, data uji lokal).

## Audio
- `audio/medcoel-outro-master.wav`: master outro MEDCOEL dari pemesan, SHA-256 `7dabc4d7da8059473ba0c4ddbd34b9b70ea48e0709f4e4d7c3f7bd9902b10075`, **byte-identik** dengan `video/spo2-pulse-oximeter/audio/medcoel-outro-master.wav` dan `video/jamu-alami-aman/audio/medcoel-outro-master.wav` (diverifikasi dengan `cmp` sebelum dipakai). Di mix hanya di-resample 24 -> 48 kHz dan dimulai 1,2 dtk setelah web terlihat.
- **Narasi edukasi: belum tersedia.** Berkas lampiran 9:45AM berisi narasi video SpO₂/Hb (SHA-256 `75dac4c5caac4723d7d4b50f8753c385d0d10e4375f2c95206b555834e15949d`), tidak cocok dengan naskah (kemiripan kata 0,09), tidak dipakai dan tidak di-commit.
- Musik pelan (pad + pluck, 72 BPM) dan efek (angkat termometer, pelan "wadah"/"saluran", tik halus tiap kali ujung kolom naik, klik penyempitan, kaca retak, tetes, uap, desis, ringkasan) **disintesis sendiri dengan numpy/scipy (CC0)**, tanpa sampel pihak ketiga; tidak ada alarm. Daftar efek bertanda waktu: `audio/events.json` (`draf_tanpa_narasi: true`).
