# Video: "Apakah makan malam bikin berat badan naik?"

Video edukasi MEDCOEL 9:16 (1080×1920, 30 fps, 85,76 detik) untuk Instagram Reels / TikTok.
Durasi mengikuti narasi (`audio/narator.wav`, tidak dipotong / dipercepat).

## Hasil
- `medcoel-makan-malam.mp4` — video final (H.264 + AAC, ±−14 LUFS, true peak ≤ −1,4 dB)
- `cover.jpg` / `cover/cover.png` — cover 9:16 (judul, wajah Raka, jam 21.00, logo di area aman crop profil 3:4)
- `cover/cover-profil-3x4.png`, `cover/cover-pratinjau-grid-profil.png`, `cover/cover-panduan-area-aman.png` — pratinjau area aman

## Sumber (bisa diedit)
- `stage/` — panggung HTML/SVG deterministik (`window.renderFrame(t)`): `scenesM1.js`, `scenesM2.js`, `timeline.js`, `art.js`, `art2.js` (properti), `mascot.js` (Kori), `data.json` (teks kata-per-kata)
- `audio/asr.py` + `audio/asr.json` — transkrip kata-per-kata untuk caption; `audio/gen_data.py` membuat `stage/data.json`
- `audio/audio_mix.py` — sintesis musik + efek (alarm sekali di pergantian jam 20.59→21.00) dan ducking terhadap narasi
- `render.mjs` — render frame (Playwright) → ffmpeg
- `cover/render-cover.cjs` + `cover/cover.html` — render cover

## Karakter baru
Raka mendapat dua pakaian: `kuliah` (sweater biru + ransel) dan `santai` (kaos koral + celana rumah).
Lokasi: `brand/characters/raka/` (`raka.js`, `README.md`, `svg/raka-kuliah-*.svg`, `svg/raka-santai-*.svg`, `preview/raka-kuliah-santai.png`).

## Catatan akurasi
Isi mengikuti narasi: tidak menyatakan jam makan otomatis menaikkan berat badan, tidak menyatakan waktu makan tak berpengaruh untuk siapa pun; berat badan bergantung pada pola/jumlah asupan dari waktu ke waktu, aktivitas, tidur, kondisi kesehatan, dan faktor lain. Tidak ada angka/hasil studi karangan.
Referensi: https://pubmed.ncbi.nlm.nih.gov/36087576/ · https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity
