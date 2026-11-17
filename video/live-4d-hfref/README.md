# Jantung berdetak, tapi pompanya melemah? — promosi MEDCOEL Live 4D Lab, skenario HFrEF (28,0 dtk, 1080×1920, 30 fps)

Video edukasi vertikal dari **empat rekaman asli Live 4D Lab** (`src/*.mp4`, 1920×1078): `00_rekaman_konteks_lengkap` (konteks), `01_pilih_skenario_hfref`, `02_bandingkan_normal_dan_hfref`, `03_probe_dan_citra_jantung`. Yang dilakukan: memotong, memperbesar (punch-in), memperlambat (0,6–0,9×), split layar, sorotan, dan teks. **Tidak ada UI, angka, hasil pemeriksaan, atau cuplikan pasien buatan.**

## Status
- **Voice-over belum ada** (file Google AI Studio akan kamu unggah terpisah), dan saya tidak membuat TTS. Jadi file utama = **rough cut tanpa narator**: `jantung-hfref-live-4d-lab_rough-cut.mp4`. Versi dengan bilah penanda posisi VO: `jantung-hfref-live-4d-lab_rough-cut_penanda-VO.mp4`. Posisi dan teks usulan: [`vo-posisi.md`](vo-posisi.md) dan `cues.json["vo"]`.
- Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.
- Audio belum didengarkan manusia; hanya diukur (≈ −15,7 LUFS tanpa narasi, puncak −1,8 dBFS).

## Alur
| Detik | Visual (sumber) | Teks layar |
|---|---|---|
| 0–3,6 | Citra jantung bergerak langsung dari frame pertama, punch-in halus (00, t 0,8–4,4) | JANTUNG BERDETAK, TAPI POMPANYA MELEMAH? |
| 3,6–7,4 | Panel Patologi dengan kursor di kartu "Fungsi sistolik LV menurun (pola HFrEF)", kartu disorot (01, diperlambat) | Pilih skenario di panel Patologi · label antarmuka asli |
| 7,4–11,4 | Citra jantung; sorotan struktur "Ventrikel kiri (rongga)" bawaan aplikasi diberi cincin (03, 0,3–2,0 lalu 2,0–3,4) | Kontraksi ventrikel kiri menurun · VENTRIKEL KIRI |
| 11,4–14,8 | Tombol "Bandingkan dengan normal" ditekan dan berubah jadi "Tampilkan patologis", tabel Normal vs Skenario terlihat (01); klik + ting di 13,2 | Bandingkan dengan normal |
| 14,8–19,6 | Split: NORMAL (02) di atas, SKENARIO HFrEF (00) di bawah | EF model: normal ≈58% \| skenario ≈26% · parameter simulasi, bukan angka pasien |
| 19,6–23,6 | Citra jantung diredupkan, teks muncul bertahap (03) | Gejala yang dapat muncul pada gagal jantung: Cepat lelah · Sesak (rujukan AHA) |
| 23,6–28,0 | Tampilan asli Live 4D Lab penuh dengan header MEDCOEL (00), logo | Eksplorasi patologi gratis · medcoel.com |

Label "Simulasi edukatif, bukan alat diagnosis" tampil di semua bagian simulasi, dan "Citra CT sintetis dari Atlas MEDCOEL · bukan citra pasien" (mengutip label aplikasi) di bagian citra jantung.

## Pemeriksaan fakta (sumber → layar)
- **EF 58% vs 26%:** dibaca dari tabel panel Patologi pada rekaman (`EF model | Normal 58% | Skenario 26%`). Teks deskripsi aplikasi menyebut "≈25%"; video memakai angka tabel (26%) karena paling jelas terbaca dan sesuai permintaanmu. Selalu dilabeli parameter simulasi.
- **Bukan USG:** panel citra di aplikasi berjudul "CT REFORMAT" dan "CT sintetis dari Atlas MEDCOEL"; video **tidak** menyebutnya USG atau ekokardiografi, dan tidak menyimpulkan diagnosis dari gambar. Perbedaan normal vs skenario pada citra sulit dilihat mata; angka EF ditunjukkan dari tabel, bukan dari gambar.
- **Tombol pembanding:** pada rekaman, setelah ditekan teksnya berganti dari "Bandingkan dengan normal" menjadi "Tampilkan patologis" (≈3,1 dtk pada klip 01); urutan di video mengikuti itu.
- **Gejala:** "kelelahan dan sesak dapat terjadi pada gagal jantung" mengacu American Heart Association ([Heart Failure Signs and Symptoms](https://www.heart.org/en/health-topics/heart-failure/warning-signs-of-heart-failure)); EF = proporsi darah yang keluar dari ventrikel kiri tiap denyut ([AHA, Ejection Fraction](https://www.heart.org/en/health-topics/heart-failure/diagnosing-heart-failure/ejection-fraction-heart-failure-measurement)). Gejala ditampilkan sebagai teks umum di atas rekaman, tanpa adegan klinis dan tanpa mengaitkannya dengan hasil gambar.
- Label skenario berbahasa campuran dibiarkan seperti aslinya; teks Indonesia ditambahkan terpisah.

## Audio dan lisensi
Musik instrumental **"MEDCOEL Soft Pulse"** (pad hangat, bel lembut 84 BPM, denyut sub pelan) dan klik/ting kecil saat tombol pembanding ditekan: sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0** (dibuat sendiri, tidak ada sampel atau musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik berada di bawah suara: bila `audio/voiceover.wav` ada, musik turun otomatis ±10 dB saat narasi. Font Plus Jakarta Sans (SIL OFL 1.1). Logo: `apps/web/src/assets/logo-full.webp`.

## Batasan jujur
- Sumber 1920×1078 diperbesar sampai ±1,9× untuk layout vertikal, jadi teks panel sedikit lembut; label penting diulang sebagai teks tajam. Layar desktop tidak dikecilkan penuh kecuali penutup (agar tampilan MEDCOEL dikenali).
- Slow-motion memakai pengulangan bingkai 30 fps (tanpa interpolasi), sehingga gerak jantung pada 0,6–0,9× terlihat sedikit bertahap.
- Citra sintetis normal dan skenario tidak berasal dari jam fase jantung yang sama pada split layar.
- Bingkai hasil ekstraksi tidak ikut di repo; klip sumber (±2 MB) ikut di `src/`.

## Proyek yang bisa diedit / render ulang
`cues.json` (batas shot, teks, posisi VO), `stage/` (`stage.js`), `audio/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`, `vo-posisi.md`.
```bash
cd video/live-4d-hfref && ./extract.sh /tmp/live4d-frames            # bingkai 30 fps dari src/ (symlink rekam/frames)
cd ../.. && python3 -m http.server 8133 --bind 127.0.0.1 &            # server statis dari akar repo
python3 video/live-4d-hfref/audio/audio_mix.py                         # musik + klik (+ voiceover.wav bila ada) -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/live-4d-hfref/render.mjs /tmp/l4-out 0 839 4        # VO=1 untuk versi penanda VO
ffmpeg -framerate 30 -i /tmp/l4-out/f%05d.jpg -i video/live-4d-hfref/audio/mix.wav -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 28 video/live-4d-hfref/jantung-hfref-live-4d-lab_rough-cut.mp4
```
