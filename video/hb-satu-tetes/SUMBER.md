# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi Google AI Studio yang diunggah pemesan (`Generated_Audio_November_19_2026_-_9_45AM.wav`), 24 kHz mono, 85,52 dtk. Tempo dan nada tidak diubah; di-resample 24 -> 48 kHz dan diberi penguatan statis +1,9 dB agar sama keras dengan master outro (selisih LUFS terukur). | Hak pakai mengikuti ketentuan Google AI Studio / pemesan. |
| `audio/medcoel-outro-master.wav` | Master suara outro baku MEDCOEL (SHA-256 `7dabc4d7...10075`, cocok dengan `video/spo2-pulse-oximeter/audio/SHA256SUMS.txt`), tidak diubah selain resample. | Aset MEDCOEL. |
| `audio/stem-musik.wav`, `stem-sfx.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Disintesis dari kode (numpy/scipy). | CC0 1.0, tanpa sampel pihak ketiga. |
## Gambar
Semua gambar dari kode (`stage/art.js`, `stage/scenes.js`); Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`). Logo `apps/web/src/assets/logo-full.webp`. Font `video/kopi-kafein-adenosin/stage/fonts`. Outro: rekaman web asli yang sama dengan video SpO2 (`video/spo2-pulse-oximeter/rekam/outro-web.mp4`; lebih lama daripada tampilan web terkini).
## Sumber isi (dibuka 2026-11-19)
- **HemoCue Hb 201+ Product Sheet** (hemocue.com/wp-content/uploads/2024/04/MMUS-01168-Hb-201-product-sheet.pdf): "modified azidemethemoglobin reaction; dual wavelengths (570 nm and 880 nm) for compensation of turbidity"; sampel darah utuh kapiler/vena/arteri; volume sampel ~10 µL; hasil dalam 60 detik; satuan g/dL; tiga langkah: isi mikrokuvet, masukkan ke alat, baca hasil. Dipakai untuk label "contoh Hb 201+", angka 570 nm dan 880 nm, g/dL, dan alur.
- **MedlinePlus, Hemoglobin Test** (medlineplus.gov/lab-tests/hemoglobin-test/): hemoglobin = protein kaya zat besi di sel darah merah yang membawa oksigen dari paru ke seluruh tubuh; tes Hb sering dipakai memeriksa anemia.
- **WHO, teknis tentang pengukuran hemoglobin dari satu tetes darah kapiler** (who.int/publications/b/71578): hemoglobin umumnya diukur dari spesimen satu tetes darah kapiler pada survei besar, tetapi bukti baru menunjukkan satu tetes kapiler dapat menimbulkan kesalahan cukup besar; rujukan untuk kalimat "pengambilan bermasalah -> hasil kurang tepat".
Tidak dikatakan bahwa semua alat tes Hb cepat memakai reagen atau metode yang sama. Nama reagen kimia tidak disebut (lembar produk tidak merinci); peran masing-masing panjang gelombang TIDAK ditentukan di video (lembar hanya menyebut keduanya untuk kompensasi kekeruhan), sehingga "membantu koreksi kekeruhan" digambar pada blok perhitungan, bukan pada satu berkas cahaya tertentu. Nilai contoh (SpO₂ 96 %, Hb 8,2 g/dL, 14,0, 9,6, 11,0, 11,8, 7,6) adalah ilustrasi, bukan data pasien.
