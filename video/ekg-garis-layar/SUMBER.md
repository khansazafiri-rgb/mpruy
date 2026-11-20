# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi EKG Google AI Studio yang dilampirkan pemilik (`Generated_Audio_November_20_2026_-_7_19PM.wav`). Tempo/nada tidak diubah; resample 24 -> 48 kHz. | Hak pakai mengikuti ketentuan Google AI Studio / pemesan. |
| `audio/narasi-outro.wav` | Audio outro BARU dari Google AI Studio (`Generated_Audio_November_20_2026_-_7_23PM.wav`). Tidak memakai audio outro lama atau audio dari MP4 lama. Diberi penguatan statis -2,9 dB agar sama keras dengan narasi edukasi (selisih LUFS terukur). | idem |
| `audio/stem-musik.wav`, `stem-sfx.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Disintesis dari kode (numpy/scipy): pad + arpeggio 96 BPM; aksen elektroda, bip R, nodus, P/QRS/T, kontraksi, klik fitur web. | CC0 1.0, tanpa sampel pihak ketiga. |
## Gambar
Jantung, EKG, elektroda, monitor, penampang dada: kode (`stage/heart.js`, `stage/scenes.js`). Raka: hanya `rakaSvg()` (`brand/characters/raka/raka.js`, tidak diubah). Logo `apps/web/src/assets/logo-full.webp`. Font `video/kopi-kafein-adenosin/stage/fonts`.
## Rekaman outro (rekaman produk ASLI, tidak ada UI yang digambar ulang)
| Bagian outro | Sumber | Catatan |
|---|---|---|
| ATLAS 3D | Rekaman layar asli Atlas 3D di folder Drive MEDCOEL (`Perekaman Layar 2026-11-10 pukul 23.53.24.mov`, 108 dtk, 2816x1582), detik 29-31,9 dipotong ke area model (rotasi dan lapisan otot/fascia terlihat) | Isi klip dicek satu per satu (lembar kontak): 23.53.24 = Atlas 3D lalu Kuis anatomi. |
| LIVE 4D LAB | Rekaman layar asli Live 4D Lab di folder Drive yang sama (`... 23.58.43.mov`, 45,8 dtk), detik 17-19,4: probe bergerak di badan (panel atas) dan citra USG/CT simulasi + strip EKG skema (panel bawah) | Dua potongan area layar yang ditumpuk (tanpa UI baru). Aplikasi sendiri menampilkan "Simulasi edukatif · bukan alat diagnosis" dan "CT SINTETIS ... bukan citra pasien"; label itu juga ditambahkan di video. Klip 23.55.23 (185 dtk) dan 23.59.44 (94 dtk) juga Live 4D Lab; tidak dipakai. |
| MATERI PER BAB, LATIHAN SOAL | `video/masih-dua-minggu/rekam/rekaman-web.mp4` detik 3,0-4,6 (daftar bab, "Siapkan sesi belajarmu") dan 8,0-9,4 (jawaban soal) | |
| SIMULASI DOKTER | `video/dok-saya-kenapa/rekam/rekaman-web.mp4` detik 3,2-9,3 | |
Klip Drive diunduh lewat tautan folder yang diberikan (tidak di-commit karena besar); hasil potongan `rekam/outro-web.mp4` (960x1180, 14,4 dtk) di-commit. `rekam/siapkan-outro.sh` menyusunnya ulang. Rekaman web produk lebih lama daripada tampilan terkini.
## Dasar medis (dibuka 2026-11-20)
- **OpenStax Anatomy & Physiology 19.2**: elektroda permukaan merekam sinyal listrik jantung (EKG/ECG); gelombang P = depolarisasi atrium, kompleks QRS = depolarisasi ventrikel, gelombang T = repolarisasi ventrikel; atrium mulai berkontraksi ±25 ms setelah awal P; nodus SA (pacemaker) -> atrium -> nodus AV -> berkas AV/cabang -> serabut Purkinje.
- **NHLBI Heart Tests**: elektroda (plester lengket) di dada, EKG merekam aktivitas listrik jantung. **NHLBI How the Heart Beats**: sinyal mulai di nodus SA di atrium kanan, merambat lewat atrium, lalu ke nodus AV tempat sinyal melambat sedikit sebelum berkas ke bilik.
Penyederhanaan yang disengaja (dijelaskan di QA): tampilan "gerak lambat" untuk satu denyut; repolarisasi atrium (tersembunyi dalam QRS) tidak ditampilkan; arah pemulihan bilik digambar sebagai sapuan dari apeks; contoh garis EKG normal dan tidak memuat diagnosis.
