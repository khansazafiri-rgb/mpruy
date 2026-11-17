# Jantung berdetak, tapi pompanya melemah? — promosi MEDCOEL Live 4D Lab, skenario HFrEF (32,0 dtk, 1080×1920, 30 fps)

Video edukasi vertikal dari **empat rekaman asli Live 4D Lab** (`src/*.mp4`, 1920×1078): `00_rekaman_konteks_lengkap` (konteks), `01_pilih_skenario_hfref`, `02_bandingkan_normal_dan_hfref`, `03_probe_dan_citra_jantung`. Yang dilakukan: memotong, memperbesar (punch-in), memperlambat (0,6–0,9×), split layar, sorotan, dan teks. **Tidak ada UI, angka, hasil pemeriksaan, atau cuplikan pasien buatan.**

## Status
- **Voice-over sudah terpasang** (`audio/voiceover.wav`, Google AI Studio dari pemesan, 31,56 dtk, dipakai apa adanya; ASR kata-per-kata di `audio/voiceover-asr.json`). Video 32,0 dtk; potongan visual disinkronkan ke kata yang diucapkan (cues dari ASR). File: `jantung-hfref-live-4d-lab.mp4`.
- Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.
- Audio belum didengarkan manusia; hanya diukur (≈ −15,7 LUFS, puncak −1,5 dBFS; VO ≈ −17,6 dB RMS saat bicara, musik+efek ≈ −28,5 dB di bawahnya).

## Alur, sinkron dengan kata voice-over
| Detik | Voice-over | Visual (sumber) | Teks layar |
|---|---|---|---|
| 0–4,0 | "Jantungnya berdetak, tapi kenapa pompanya melemah?" | Citra jantung bergerak sejak frame pertama, punch-in halus (00) | JANTUNG BERDETAK, TAPI POMPANYA MELEMAH? |
| 4,0–6,6 | (jeda) lalu "Di simulasi Live 4D Lab ini…" | Panel Patologi, kartu "Fungsi sistolik LV menurun (pola HFrEF)" disorot, diperlambat (01) | Pilih skenario di panel Patologi |
| 6,6–10,1 | "…kontraksi ventrikel kiri menurun. Perhatikan geraknya." | Sorotan "Ventrikel kiri (rongga)" bawaan aplikasi diberi cincin (03) | Kontraksi ventrikel kiri menurun · VENTRIKEL KIRI → PERHATIKAN GERAKNYA (8,65) |
| 10,1–13,0 | "Lalu bandingkan dengan kondisi normal." | Tombol "Bandingkan dengan normal" ditekan (11,64: klik + ting), berubah jadi "Tampilkan patologis" (01) | Bandingkan dengan normal |
| 13,0–18,0 | "Fraksi ejeksi pada model berubah dari sekitar 58 menjadi 26 persen." | Split: NORMAL (02) di atas, SKENARIO HFrEF (00) di bawah; label "EF ≈58%" muncul tepat saat "58" (15,1) dan "EF ≈26%" saat "26" (16,5) | EF model: normal ≈58% \| skenario ≈26% · parameter simulasi, bukan angka pasien |
| 18,0–21,6 | "Artinya lebih sedikit darah terdorong keluar tiap denyut." | Citra jantung bergerak (03) | Lebih sedikit darah terdorong keluar tiap denyut |
| 21,6–26,0 | "Kondisi seperti ini dapat berkaitan dengan cepat lelah atau sesak." | Citra diredupkan, teks muncul tepat saat kata diucapkan (24,0 dan 25,25) | Kondisi seperti ini dapat berkaitan dengan: Cepat lelah · Sesak |
| 26,0–32,0 | "Ini simulasi edukatif, bukan alat diagnosis. Eksplorasi gratis di MedExpel.com" | Tampilan asli Live 4D Lab penuh (00), label disclaimer diperbesar saat diucapkan (26,2–28,4), logo, "Eksplorasi patologi gratis", medcoel.com | Eksplorasi patologi gratis · medcoel.com |

Label "Simulasi edukatif, bukan alat diagnosis" tampil di semua bagian simulasi, dan "Citra CT sintetis dari Atlas MEDCOEL · bukan citra pasien" di bagian citra jantung.

## Pemeriksaan fakta (sumber → layar)
- **EF 58% vs 26%:** dibaca dari tabel panel Patologi pada rekaman (`EF model | Normal 58% | Skenario 26%`). Teks deskripsi aplikasi menyebut "≈25%"; video memakai angka tabel (26%) karena paling jelas terbaca dan sesuai permintaanmu. Selalu dilabeli parameter simulasi.
- **Bukan USG:** panel citra di aplikasi berjudul "CT REFORMAT" dan "CT sintetis dari Atlas MEDCOEL"; video **tidak** menyebutnya USG atau ekokardiografi, dan tidak menyimpulkan diagnosis dari gambar. Perbedaan normal vs skenario pada citra sulit dilihat mata; angka EF ditunjukkan dari tabel, bukan dari gambar.
- **Tombol pembanding:** pada rekaman, setelah ditekan teksnya berganti dari "Bandingkan dengan normal" menjadi "Tampilkan patologis" (≈3,1 dtk pada klip 01); urutan di video mengikuti itu.
- **Gejala:** "kelelahan dan sesak dapat terjadi pada gagal jantung" mengacu American Heart Association ([Heart Failure Signs and Symptoms](https://www.heart.org/en/health-topics/heart-failure/warning-signs-of-heart-failure)); EF = proporsi darah yang keluar dari ventrikel kiri tiap denyut ([AHA, Ejection Fraction](https://www.heart.org/en/health-topics/heart-failure/diagnosing-heart-failure/ejection-fraction-heart-failure-measurement)). Gejala ditampilkan sebagai teks umum di atas rekaman, tanpa adegan klinis dan tanpa mengaitkannya dengan hasil gambar.
- Label skenario berbahasa campuran dibiarkan seperti aslinya; teks Indonesia ditambahkan terpisah.

## Audio dan lisensi
Musik instrumental **"MEDCOEL Soft Pulse"** (pad hangat, bel lembut 84 BPM, denyut sub pelan) dan klik/ting kecil saat tombol pembanding ditekan: sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0** (dibuat sendiri, tidak ada sampel atau musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik dan efek turun otomatis di bawah voice-over. Font Plus Jakarta Sans (SIL OFL 1.1). Logo: `apps/web/src/assets/logo-full.webp`.

## Batasan jujur
- **Pelafalan voice-over (audio pemesan, tidak diubah):** "Jantungnya" (bukan "Jantung"), "ventricle", "ejeksi" terdengar seperti "ejecti", "denyut" seperti "dengut", dan "MedExpel.com" untuk medcoel.com. Teks layar memakai ejaan benar: "ventrikel", "medcoel.com". Perbedaan ini sebaiknya dipertimbangkan bila ingin merekam ulang di AI Studio. Pada ASR, kalimat 2 terdengar "Disimulasi live 4D lab ini"; saya menulis jendelanya sebagai "Di simulasi".
- Voice-over menyebut "fraksi ejeksi", sedangkan label layar memakai "EF model" (nama di aplikasi); keduanya dikaitkan dengan label parameter simulasi.
- Sumber 1920×1078 diperbesar sampai ±1,9× untuk layout vertikal, jadi teks panel sedikit lembut; label penting diulang sebagai teks tajam. Tampilan desktop penuh hanya di penutup.
- Slow-motion memakai pengulangan bingkai 30 fps (tanpa interpolasi). Pada split layar, fase jantung NORMAL dan SKENARIO tidak sama.
- Perbedaan normal vs skenario pada citra sulit terlihat mata; angka EF diambil dari tabel aplikasi.
- Bingkai hasil ekstraksi tidak ikut di repo; klip sumber (±2 MB) ikut di `src/`.

## Proyek yang bisa diedit / render ulang
`cues.json` (batas shot dan teks dari ASR voice-over), `stage/` (`stage.js`), `audio/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`.
```bash
cd video/live-4d-hfref && ./extract.sh /tmp/live4d-frames            # bingkai 30 fps dari src/ (symlink rekam/frames)
cd ../.. && python3 -m http.server 8133 --bind 127.0.0.1 &            # server statis dari akar repo
python3 video/live-4d-hfref/audio/audio_mix.py                         # musik + klik (+ voiceover.wav bila ada) -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/live-4d-hfref/render.mjs /tmp/l4-out 0 959 4        
ffmpeg -framerate 30 -i /tmp/l4-out/f%05d.jpg -i video/live-4d-hfref/audio/mix.wav -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 32 video/live-4d-hfref/jantung-hfref-live-4d-lab.mp4
```
