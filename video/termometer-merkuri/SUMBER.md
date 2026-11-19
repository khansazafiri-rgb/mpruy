# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi Google AI Studio yang diunggah pemesan (`Generated_Audio_November_19_2026_-_9_43AM.wav`), 24 kHz mono, 72,28 dtk. Tidak dipercepat, nada tidak diubah; hanya di-resample 24 -> 48 kHz saat mix. | Hak pakai mengikuti ketentuan Google AI Studio / pemesan. |
| `audio/medcoel-outro-master.wav` | Master suara outro baku MEDCOEL (salinan `brand/video/outro/`, SHA-256 `7dabc4d7...10075` cocok dengan `video/spo2-pulse-oximeter/audio/SHA256SUMS.txt`). Tidak ada suara promo baru. | Aset MEDCOEL. |
| `audio/stem-musik.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Disintesis dari kode (pad + pluck, 72 BPM). | CC0 1.0, tanpa sampel pihak ketiga. |
| `audio/stem-sfx.wav` (idem) | Disintesis dari kode: tik kolom (waktu dari `cues.json` colKeys), tok putus, klik penahan, beep digital, kaca retak kecil, butir, uap, chime. | CC0 1.0. |
## Gambar
Termometer, penampang, tubuh, alat digital, ikon: kode (`stage/art.js`, `stage/scenes.js`), tanpa gambar pihak ketiga. Raka: hanya `rakaSvg()` dari `brand/characters/raka/raka.js` (rig, wajah, proporsi, baju, patch logo tidak diubah). Logo: `apps/web/src/assets/logo-full.webp` (salinan di `stage/`). Font: `video/kopi-kafein-adenosin/stage/fonts`.
Outro: rekaman web asli yang sama dengan video SpO2 (`video/masih-dua-minggu/rekam/rekaman-web.mp4`, `video/dok-saya-kenapa/rekam/rekaman-web.mp4`; potongan `video/spo2-pulse-oximeter/rekam/outro-web.mp4`). Rekaman itu lebih lama daripada tampilan web terkini.
## Sumber fisika dan keselamatan (dibuka 2026-11-19)
- Purdue Chem Safety, FAQ termometer (chem.purdue.edu/chemsafety/chem/HgFAQ.html): "Capillary constriction allows mercury to rise when heated, but prevents it from receding until shaken down"; termometer maksimum tampak terputus di bawah penyempitan. Mendukung mekanisme penahan hasil dan celah di bawah penyempitan.
- US EPA, Mercury Thermometers (epa.gov/mercury/mercury-thermometers): merkuri memuai dan menyusut terhadap suhu sehingga suhu terbaca dari skala; uap merkuri saat pecah; alternatif bebas merkuri (termometer digital) tersedia.
- WHO, 15 Mei 2024 (who.int/news/item/15-05-2024-nations-unite-to-eliminate-mercury-containing-medical-devices): perangkat merkuri aman selama utuh, tetapi saat pecah merkuri menguap dan menimbulkan uap berbahaya; proyek pengurangan termometer dan tensimeter merkuri di fasilitas kesehatan. Mendukung klaim "banyak layanan kesehatan beralih"; angka kuantitatif tidak dipakai di video.
Tidak dikatakan bahwa semua termometer kaca berisi merkuri. Cara "diatur ulang" hanya digambar sebagai pergeseran kolom yang tenang dengan label "ilustrasi alat lama · bukan anjuran memakai"; tanpa gerakan mengayun.
