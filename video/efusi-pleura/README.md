# Efusi pleura kanan di Live 4D Lab — video edukasi promosi MEDCOEL (52,88 dtk, 1080×1920, 30 fps)

Video vertikal yang memakai **rekaman asli Live 4D Lab MEDCOEL** (halaman produksi `https://medcoel.com/anatomy/4d-lab/`) sebagai visual utama. **Narasi memakai audio Google AI Studio dari pemesan (`audio/narasi.wav`) apa adanya**: tidak ada narator baru, naskah dan suara tidak diubah (hanya ada musik di bawahnya dan penguatan seragam).

Hasil: `efusi-pleura-kanan-live-4d-lab.mp4` (H.264 + AAC, ≈ −14,7 LUFS, puncak −1,4 dBFS). Cover: `cover/cover.png` (1080×1920; `cover-panduan-area-aman.png` memuat garis area aman Reels/TikTok; `cover-360px.png` = pratinjau 360 px). Bingkai kunci 360 px: `still/`.

> Simulasi edukatif dengan citra sintetis dari Live 4D Lab. Bukan rekaman pasien dan bukan alat diagnosis. Label kecil "Simulasi edukatif, bukan alat diagnosis" tampil selama adegan USG dan CT.

## Alur, sinkron dengan kata narasi (ASR: `audio/narasi-asr.json`)
| Detik | Narasi | Visual | Sumber |
|---|---|---|---|
| 0–5,0 | "Lihat area gelap di atas diafragma ini. Menurutmu itu apa?" | Dibuka langsung dari halaman web: citra USG berubah (probe diputar), kamera memperbesar citra. Cincin halus pada area gelap ("AREA GELAP", 0,9 dtk) lalu diafragma ("DIAFRAGMA", 1,56 dtk), tanda "?" saat "apa?". | Rekaman web asli + penanda dari raster aplikasi |
| 5,0–12,4 | "Di Live 4D Lab … kita bisa menggerakkan probe dan membandingkan tampilan normal dengan skenario efusi pleura kanan." | Probe digeser dengan tombol arah asli; drawer Panel dibuka dan jendela **"Basal kanan posterolateral (jendela efusi)"** dipilih; posisi probe terlihat di 3D dan disambungkan ke citra USG dengan garis; lalu tab Patologi → tombol **"Bandingkan dengan normal"** (tampilan normal) → kembali ke skenario efusi; baris tabel "Efusi pleura 0 mL → 650 mL" disorot. | Rekaman web asli (klik sungguhan) |
| 12,4–17,4 | "Efusi pleura terjadi ketika cairan terkumpul di ruang tipis antara paru dan dinding dada." | Sisipan penampang dada sederhana: ruang pleura disorot, cairan menumpuk di punggung (antara paru dan dinding dada), bukan di dalam paru. | **Ilustrasi SVG** (diberi label "Ilustrasi sederhana, bukan hasil simulasi") |
| 17,4–25,8 | "Pada simulasi USG ini, cairannya tampak sebagai area gelap di atas diafragma. Di tepinya, paru yang tertekan juga bisa terlihat." | Kembali ke citra asli. "CAIRAN" (area gelap) → "DIAFRAGMA" → panah "di atas diafragma (S)" → "PARU TERTEKAN" di tepi cairan. | Rekaman web asli + penanda dari raster aplikasi (`pleural_fluid`, `diaphragm`, `atelectasis`) |
| 26,3–32,4 | "Sekarang pindah ke tampilan CT. Cairan tampak berkumpul di bagian belakang dan bawah rongga dada kanan." | Perpindahan mode USG → CT dengan klik sungguhan pada tombol "CT"; kamera memperbesar area tempat simulasi menampilkan cairan; label "CAIRAN DI RONGGA PLEURA" dan kontur dari raster aplikasi. | Rekaman web asli + penanda dari raster aplikasi |
| 32,4–38,6 | "Kalau cairannya cukup banyak, paru di sekitarnya bisa tertekan dan seseorang dapat merasa sesak." | Ilustrasi 3D singkat: cairan naik di rongga, paru tertekan. Teks "cairan banyak: paru bisa tertekan" dan "dapat terasa sesak" (tanpa klaim semua efusi menyebabkan sesak). | **Ilustrasi SVG** (label "Ilustrasi sederhana, bukan hasil simulasi") |
| 38,6–49,4 | "Tapi gambar saja belum menjawab apa penyebab cairannya. Di sini, kita belajar mengenali pola dan memahami letaknya. Ini simulasi edukatif, bukan alat diagnosis." | Layar Live 4D Lab yang dikenali (pad probe + monitor USG|CT), disorot saat "mengenali pola"; pernyataan simulasi edukatif diperbesar saat diucapkan. | Rekaman web asli |
| 49,4–52,9 | "Coba jelajahi Live 4D Lab gratis di MEDCOEL.com." | Tampilan web, logo MEDCOEL, "Jelajahi Live 4D Lab gratis di medcoel.com". | Rekaman web asli + logo `apps/web/src/assets/logo-full.webp` |

## Apa yang benar-benar dari web, dan apa yang tidak
- **Citra USG/CT, probe, 3D, drawer, tombol, tabel**: semuanya rekaman halaman produksi. Tidak ada tombol, pilihan skenario, atau citra medis yang digambar sendiri. Tidak ada temuan yang tidak disimulasikan aplikasi (tanpa septasi cairan, tanpa *spine sign*).
- **Penanda (cincin)**: bukan tebakan; dibuat dari raster struktur milik aplikasi (`assist.rasters`) pada bingkai yang sama (`rekam/anchors.py` → `data/anchors.json` + `rekam/frames/<seg>/f####_<struktur>.png`). Nama "paru tertekan" mengikuti struktur `atelectasis` pada skenario ("compresses the adjacent lung, which becomes atelectatic").
- **Dua sisipan ilustrasi** (penampang dan tekanan paru) digambar dari kode SVG (`stage/stage.js`) dan diberi label; bukan keluaran simulasi.
- Orientasi citra USG/CT apa adanya dari aplikasi (huruf R/I/S/L pada citra): di citra ini arah **atas (superior) berada di kanan**, jadi "di atas diafragma" = ke kanan dari diafragma; panah "(S)" disisipkan agar jelas.
- Model 3D tubuh di aplikasi menampilkan objek biru di dekat hati; **tidak diklaim** sebagai cairan pleura karena aplikasi tidak melabelinya begitu.

## Cara merekam (jujur soal metodenya)
Aplikasi memakai WebGL perangkat lunak (SwiftShader) di server tanpa GPU sehingga lambat. `rekam/lab4d.cjs` membuka halaman produksi dan mengganti `requestAnimationFrame` dan `performance.now` dengan jam virtual yang digerakkan perekam: tiap bingkai rekaman fase jantung/napas dimajukan sesuai fisiologi aplikasi (72/mnt, 14/mnt) pada kecepatan nyata 1×, input sungguhan (klik/mouse) diberikan, pekerja pencitraan dibiarkan selesai (kualitas penuh), lalu halaman ditangkap. Kode aplikasi tidak diubah dan tidak ada citra yang digambar ulang. Rekaman 15 fps pada waktu video; tiap bingkai video 30 fps memakai bingkai rekaman terakhir (aplikasi sendiri memperbarui citra ±7–10×/detik).

## Audio dan lisensi
- **Narasi:** `audio/narasi.wav`, audio Google AI Studio dari pemesan, tidak diubah.
- Musik **"MEDCOEL Quiet Scan"** (medical-tech tenang: bel lembut berpantul, bantalan hangat, bas pelan) dan klik UI lembut: sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0**. Klik hanya pada pemilihan jendela probe (7,52), pindah tab Patologi (9,7), pilihan skenario/pembanding (10,25 dan 11,2), dan perpindahan mode USG→CT (26,75). Musik turun saat narator bicara (±−8 dB di bawah narasi).
- Jadwal animasi dan bunyi sama-sama dibaca dari `cues.json`.

## Proyek yang bisa diedit / render ulang
- `cues.json` jadwal; `stage/` (`stage.js` adegan dan kamera, `core.js` pembantu, `fonts/` Plus Jakarta Sans OFL); `rekam/` (`lab4d.cjs` perekam deterministik, `rekam.cjs` program segmen A/BC/EF/H, `anchors.py`); `data/anchors.json`; `audio/`; `cover/`; `render.mjs`; `shot.cjs`.
```bash
# dari akar repo (playwright harus tersedia, mis. NODE_PATH=/opt/node-tools/node_modules)
python3 -m http.server 8130 &                                         # server statis
export REKAM_OUT=$PWD/video/efusi-pleura/rekam/frames                 # (atau symlink rekam/frames); di-gitignore
for s in "A" "BC" "EF" "H"; do DPR=2 node video/efusi-pleura/rekam/rekam.cjs $s; done   # BC dan H cukup DPR=1; bisa dibagi per rentang bingkai: rekam.cjs EF 261 373
python3 video/efusi-pleura/rekam/anchors.py                           # penanda per bingkai -> data/anchors.json
python3 video/efusi-pleura/audio/audio_mix.py                         # musik + klik + campur dengan narasi -> audio/mix.wav
node video/efusi-pleura/render.mjs /tmp/efusi-out 0 1586 4            # bingkai JPEG 1080x1920
node video/efusi-pleura/cover/render-cover.cjs                        # cover
ffmpeg -framerate 30 -i /tmp/efusi-out/f%05d.jpg -i video/efusi-pleura/audio/mix.wav \
  -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 52.88 video/efusi-pleura/efusi-pleura-kanan-live-4d-lab.mp4
```
Perekaman ulang membutuhkan akses ke `https://medcoel.com` dan ±20–30 menit CPU (WebGL perangkat lunak); ubah `LAB_URL` untuk merekam instans lain.

## Batasan jujur
- Pemeriksaan visual dilakukan dari lembar kontak tiap 1 detik, bingkai kunci, dan pratinjau 360 px; **audio belum saya dengarkan sebagai pendengar**, hanya diukur (loudness, puncak, selisih level narasi–musik). Sinkron kata-gambar diatur dari waktu kata ASR.
- Narator (audio dari pemesan, tidak diubah) mengucapkan "Metco L" untuk MEDCOEL, "effusi peloura", "city", dan "rungga"; teks layar memakai ejaan MEDCOEL dan CTA "medcoel.com".
- Pada bidang efusi di jendela yang dipilih, perbedaan citra USG antara "tampilan normal" dan "skenario efusi" cukup halus karena sebagian besar citra gelap; karena itu baris tabel perbandingan aplikasi (0 mL vs 650 mL) ikut ditampilkan dan disorot.
- Bercak hitam di dalam area cairan pada citra CT adalah keluaran citra sintetis aplikasi; tidak diinterpretasikan di video.
- Bingkai JPEG, rekaman mentah (`rekam/frames`), dan WAV hasil sintesis tidak ikut di repo (dibuat ulang lewat perintah di atas).
- Halaman produksi dapat berubah; rekaman ini diambil 13 November 2026.
