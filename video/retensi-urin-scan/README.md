# Kantong gelap besar di panggul ini apa? — scan USG + CT sintetis skenario retensi urin di Live 4D Lab (41,3 dtk, 1080×1920, 30 fps)

Video edukasi vertikal. Visual utama adalah **rekaman asli Live 4D Lab MEDCOEL** dari paket aset retensi urin (`src/`): `01_scan_usg_ct_medcoel` (dipakai untuk pembuka dan zoom) dan `02_perbandingan_normal_patologi` (skenario "Kandung kemih penuh (retensi urin)", drawer Patologi, tombol "Bandingkan dengan normal", tampilan normal, antarmuka penuh). Hanya dipotong, diperbesar, diberi sorotan dan teks. **Tidak ada UI, organ, atau hasil scan buatan di atas rekaman.** Ilustrasi mekanisme (kode SVG, berlabel "Ilustrasi mekanisme") hanya membantu memahami mekanismenya.

Hasil: `kantong-gelap-retensi-urin.mp4` (H.264 + AAC, ≈ −15,0 LUFS, puncak −0,5 dBFS). Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.

## Voice-over
Voice-over Google AI Studio dari pemesan (`audio/voiceover.wav`, 43,7 dtk) dipakai apa adanya; tidak ada TTS buatan. Suaranya tidak diubah; `tools/susun_linimasa.py` hanya memotong per kalimat (ASR: `audio/voiceover-asr.json`) dan membatasi jeda antarkalimat menjadi ≤0,26 dtk, sehingga durasi video 41,3 dtk (panjang naskah sendiri 43,7 dtk; "sekitar 35–40 dtk" tidak bisa dicapai tanpa memotong kata). Hasil susunan: `audio/voiceover-susun.wav`; semua waktu visual di `cues.json`. Di audio "MEDCOEL" terdengar seperti "Medcoil"; teks layar memakai ejaan benar.

## Alur, sinkron dengan kata voice-over (waktu video)
| Detik | Voice-over | Visual | Teks / label |
|---|---|---|---|
| 0–3,9 | "Lihat kantong gelap besar di panggul pada scan MEDCOEL ini." | Dari bingkai pertama: scan USG + CT sintetis (01) + potongan bar atas antarmuka asli (nama MEDCOEL, skenario "Kandung kemih penuh (retensi urin)"); penanda emas tipis muncul pada kata "gelap"; zoom ke USG | KANTONG GELAP BESAR DI PANGGUL INI APA? · pada 1,7 dtk: **KANDUNG KEMIH PADA SKENARIO RETENSI URIN** · KANTONG GELAP DI USG |
| 3,9–7,7 | "Itu kandung kemih yang terisi pada skenario retensi urin." | Zoom ke CT sintetis dengan penanda yang sama | KANDUNG KEMIH YANG TERISI · CT sintetis: lumen kandung kemih (abu-abu seragam) |
| 7,7–11,8 | "Tapi kandung kemih yang penuh saja belum tentu berarti retensi." | Scan lebar dengan penanda | **KANDUNG KEMIH PENUH ≠ OTOMATIS RETENSI** |
| 11,8–19,8 | "Sebelum buang air kecil, kandung kemih memang menyimpan urin. Normalnya otot kandung kemih berkontraksi dan jalan keluarnya membuka." | **Animasi layar penuh (8,0 dtk)**: kandung kemih terisi, otot berkontraksi (panah ke dalam), jalan keluar membuka, urin mengalir | URIN · OTOT KANDUNG KEMIH · JALAN KELUAR · Ilustrasi mekanisme |
| 19,8–26,4 | "Kalau aliran keluar terhambat atau kontraksinya tidak cukup kuat, urin bisa tetap tertahan dan kandung kemih meregang." | **Layar terbagi**: scan dengan penanda tetap di atas; dua panel ilustrasi di bawah: A (jalan keluar menyempit, otot berkontraksi) dan B (jalan keluar terbuka, kontraksi lemah); keduanya: urin tertahan, dinding meregang | A. ALIRAN KELUAR TERHAMBAT · B. KONTRAKSI KURANG KUAT · "Penyebab di skenario ini tidak ditentukan model web" |
| 26,4–28,9 | "Sekarang, bandingkan model normal dengan skenario patologinya di Live 4D Lab." | Scan skenario + drawer Patologi asli: klik "Bandingkan dengan normal" (klik asli pada 7,77 dtk klip 02; klik kecil di 27,7), tombol berganti "Tampilkan patologis", citra berganti ke normal (8,6 dtk klip 02); baris tabel "Lapisan cairan model 0 mL → ≈234 mL" disorot | SKENARIO RETENSI → NORMAL |
| 28,9–35,8 | "… Pada pasien sungguhan, retensi tidak ditentukan dari satu gambar saja." | Dua scan bertumpuk (skenario di atas, normal di bawah) dengan penanda kandung kemih masing-masing | Kandung kemih normal vs skenario · Teks aplikasi: lumen skenario membesar ±30 mm ke segala arah · **KANDUNG KEMIH PENUH ≠ OTOMATIS RETENSI** · Retensi tidak ditentukan dari satu gambar saja |
| 35,9–38,7 | "Ini simulasi edukatif, bukan alat diagnosis." | Scan diredupkan + pernyataan besar | SIMULASI EDUKATIF / USG/CT SINTETIS / BUKAN ALAT DIAGNOSIS |
| 38,7–41,3 | "Eksplorasi gratis di MEDCOEL.com" | Antarmuka Live 4D Lab asli penuh + logo | **Eksplorasi gratis di medcoel.com** |

Label "Simulasi edukatif • USG/CT sintetis • bukan alat diagnosis" tampil di setiap adegan yang memuat scan, drawer atau antarmuka. Selama animasi tampil "Ilustrasi mekanisme" (juga pada panel ilustrasi layar terbagi).

## Penanda kandung kemih: dari piksel, bukan gambar organ baru
`tools/mask_kandung_kemih.py`: pada CT sintetis, lumen kandung kemih bernilai abu-abu seragam (107±1 dari 255). Bingkai skenario (klip 02, t=3 dtk) dan bingkai normal (t=11,5 dtk, setelah tombol Bandingkan) disegmentasi: ambang → komponen terhubung dari titik tengah → isi lubang → buka morfologi → `data/mask_scen_*.png`, `data/mask_norm_*.png`. Panel USG dan CT memakai geometri sama (huruf A/P/R/L dan skala cm bergeser tepat 425 px), jadi penanda USG = penanda CT digeser; hasilnya menutupi area gelap (anechoic) di USG pada kedua keadaan. Penanda hanya garis tipis emas + isian 10%; citra di bawahnya tidak diubah. Ukuran relatif pada CT (piksel sumber): lebar ±151 vs ±72, luas ±4,8× (`data/ukuran.json`); angka ini hanya hasil ukur gambar dan tidak ditampilkan di video. Yang ditampilkan adalah teks asli aplikasi ("enlarged by about 30 mm in every direction") dan baris tabel aplikasi.

## Pemeriksaan fakta dan batas klaim
- **Penyebab tidak ditentukan:** video tidak menyebut pembesaran prostat, batu, penyakit saraf, atau penyebab pasti lain. Penghalang pada panel A hanya penyempitan generik abu-abu (label "TERHAMBAT"); model web menyebut "Distended bladder (urinary retention)" tanpa penyebab, dan video menyatakan itu.
- **"Kandung kemih penuh ≠ otomatis retensi"** adalah teks dari pemesan dan sejalan dengan narasi; video tidak menyatakan skenario ini sebagai diagnosis pasien.
- **Ilustrasi:** skematik (penampang samping tidak berskala): kandung kemih (dinding otot + urin), sfingter, uretra. Volume, tebal dinding dan pembukaan diatur parameter (`stage/anim.js`), bukan hasil simulasi aplikasi. Tidak ada suara jantung atau suara organ.
- **Klip 01 dan 03:** 01 dipakai untuk pembuka dan zoom (sekitar 2–7 dtk klip; bingkai awal klip masih menampilkan jendela jantung sebelum skenario berpindah, sehingga tidak dipakai). 03 (kloseup scan tanpa bar antarmuka) tidak dipakai karena pembuka perlu menampilkan bagian antarmuka dan nama MEDCOEL.
- Label bahasa campuran di antarmuka dibiarkan; teks Indonesia ditambahkan terpisah.

## Audio dan lisensi
Musik instrumental **"MEDCOEL Soft Pulse (varian retensi urin)"** (pad hangat, bel lembut 84 BPM; tanpa alarm, tanpa suara jantung/organ) dan klik kecil saat berpindah tampilan (mulai animasi, layar terbagi, kembali ke rekaman, tombol Bandingkan, tampilan perbandingan, penutup): sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0** (dibuat sendiri, tanpa sampel/musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik turun di bawah narator. Font Plus Jakarta Sans (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.

## Batasan jujur
- Audio belum didengarkan manusia; hanya diukur (loudness, puncak) dan dicocokkan dengan ASR/linimasa.
- Durasi 41,3 dtk (bukan 35–40) karena panjang voice-over; animasi layar penuh 8,0 dtk (batas atas permintaan 6–8 dtk); mekanisme retensi (A/B) tampil di layar terbagi dengan scan tetap di atas.
- Sumber 1920×1080 diperbesar ±1,2–1,9× untuk scan; teks kecil panel asli agak lembut. Scan asli hanya bergerak halus; bingkai diputar bolak-balik (bukan loop mendadak).
- Bagian bawah layar (±25%) sengaja dikosongkan untuk area UI Reels/TikTok.

## Proyek yang bisa diedit / render ulang
`cues.json` (waktu), `stage/` (`anim.js` ilustrasi, `stage.js` komposisi), `tools/` (`susun_linimasa.py`, `mask_kandung_kemih.py`), `data/` (mask, `ukuran.json`), `audio/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`, `src/`.
```bash
cd video/retensi-urin-scan && ./extract.sh /tmp/urin-frames                     # bingkai 30 fps dari src/ (symlink rekam/frames)
python3 tools/susun_linimasa.py                                                # voiceover-susun.wav, cues.json
python3 tools/mask_kandung_kemih.py rekam/frames/02 data                       # penanda (opsional; sudah disertakan; butuh scipy)
cd ../.. && python3 -m http.server 8135 --bind 127.0.0.1 &
python3 video/retensi-urin-scan/audio/audio_mix.py                             # musik + klik + voice-over -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/retensi-urin-scan/render.mjs /tmp/ur-out 0 1239 4
ffmpeg -framerate 30 -i /tmp/ur-out/f%05d.jpg -i video/retensi-urin-scan/audio/mix.wav -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 41.3 video/retensi-urin-scan/kantong-gelap-retensi-urin.mp4
```
