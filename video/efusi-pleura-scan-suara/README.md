# Ruang gelap di atas diafragma kanan? — scan USG + CT sintetis efusi pleura di Live 4D Lab (44,9 dtk, 1080×1920, 30 fps)

Video edukasi vertikal. Visual utama adalah **rekaman asli Live 4D Lab MEDCOEL** dari paket aset efusi pleura (`src/`): `02_perbandingan_normal_patologi` (scan USG + CT sintetis skenario "Efusi pleura kanan (sedang, bebas)", drawer Patologi, tombol "Bandingkan dengan normal") dan `01_scan_usg_ct_medcoel` (saat skenario dipilih). Hanya dipotong, diperbesar, diberi sorotan dan teks. **Tidak ada UI, citra scan, atau cairan buatan di atas rekaman.** Ilustrasi mekanisme (kode SVG, berlabel "Ilustrasi mekanisme") hanya menjembatani penjelasan.

Hasil: `ruang-gelap-efusi-pleura-kanan.mp4` (H.264 + AAC, ≈ −15,2 LUFS, puncak −0,5 dBFS). Cover: `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`). Bingkai kunci 360 px: `still/`.

## Voice-over
Voice-over Google AI Studio dari pemesan (`audio/voiceover.wav`, 43,5 dtk) dipakai apa adanya; tidak ada TTS buatan. Suaranya tidak diubah; `tools/susun_linimasa.py` hanya memotong per kalimat (ASR: `audio/voiceover-asr.json`), membatasi jeda antarkalimat menjadi ≤0,36 dtk dan menyisipkan jeda 4,2 dtk setelah "Dengar bedanya." agar bunyi napas bisa diputar tanpa tertimpa suara narator. Hasil susunan: `audio/voiceover-susun.wav`; semua waktu visual ada di `cues.json`. Di audio "MEDCOEL" terdengar seperti "MedCall"; teks layar memakai ejaan benar. Ejaan transkrip otomatis ("diafrak makanan") hanya dari ASR; teks layar mengikuti naskah.

## Alur, sinkron dengan kata voice-over (waktu video)
| Detik | Voice-over | Visual | Teks / label |
|---|---|---|---|
| 0–3,4 | "Ini hasil scan dari Live 4D Lab MEDCOEL." | Dari bingkai pertama: scan USG + CT sintetis (02) dengan potongan bar atas antarmuka asli (nama MEDCOEL dan nama skenario) | RUANG GELAP DI ATAS DIAFRAGMA KANAN? · pada 1,7 dtk: **SKENARIO: EFUSI PLEURA KANAN** |
| 3,4–6,2 | "Lihat ruang gelap di atas diafragma kanan," | Zoom ke USG; penanda tipis menunjuk area cairan | RUANG GELAP DI USG · Penanda: area yang berubah dibanding normal |
| 6,2–9,4 | "pada skenario ini, itu cairan di rongga pleura." | Zoom ke CT sintetis dengan penanda yang sama | CAIRAN DI RONGGA PLEURA · CT sintetis: area abu-abu = cairan simulasi |
| 9,4–15,8 | "Normalnya hanya ada sedikit cairan di antara paru dan dinding dada. Cairan itu terus terbentuk dan diserap." | **Animasi layar penuh (±6,4 dtk)**: penampang samping rongga dada kanan, dua lapis pleura, kaca pembesar sedikit cairan, panah terbentuk (besar) dan diserap | PARU · DINDING DADA · PLEURA LUAR/DALAM · SEDIKIT CAIRAN · Ilustrasi mekanisme |
| 15,8–27,1 | "Kalau yang masuk terlalu banyak atau penyerapannya berkurang, cairan mulai menumpuk. Saat pasien terlentang, cairan bebas bergerak ke bagian belakang dan bawah. Paru di dekatnya bisa tertekan." | **Layar terbagi**: scan dengan penanda tetap di atas, ilustrasi di bawah: cairan menumpuk di dasar, gambar diputar ke posisi terlentang (cairan mengalir ke belakang), paru kehilangan ±14% luasnya (tidak kolaps) | Masuk > diserap · DEPAN/BELAKANG/GRAVITASI · Paru sedikit tertekan, tidak kolaps total |
| 27,1–31,1 | "Di simulasi ini, bunyi napas basal kanan juga lebih lemah." | Model 3D asli: saat skenario dipilih (klik kecil di 27,6; klip 01) lalu probe di punggung bawah/flank kanan (02) | BASAL KANAN |
| 31,2–32,2 | "Dengar bedanya." | Scan normal, grafik amplitudo kosong menunggu | Dengar bedanya |
| 32,2–33,8 | (bunyi napas **normal**, 04) | Scan tampilan normal (tanpa area abu-abu); musik turun ±−15 dB | **Normal** · grafik amplitudo |
| 34,0–35,6 | (bunyi napas **lebih lemah**, 05) | Scan skenario efusi dengan penanda | **Basal kanan pada model efusi** · grafik amplitudo (skala sama) |
| 35,8–39,1 | "Sekarang, bandingkan lagi, scan patologi dan normalnya." | Scan + drawer Patologi asli: klik "Bandingkan dengan normal" (klik kecil), tombol berganti "Tampilkan patologis", citra berubah ke normal; baris tabel Efusi pleura 0 mL vs 650 mL disorot | SKENARIO EFUSI → NORMAL |
| 39,5–42,3 | "Ini simulasi edukatif, bukan alat diagnosis." | Scan diredupkan + pernyataan besar | SIMULASI EDUKATIF / BUKAN CITRA ATAU SUARA PASIEN / BUKAN ALAT DIAGNOSIS |
| 42,3–44,9 | "Eksplorasi gratis di MEDCOEL.com." | Antarmuka Live 4D Lab asli penuh + logo | **Eksplorasi patologi gratis di medcoel.com** |

Label "Simulasi edukatif • bukan citra atau suara pasien • bukan alat diagnosis" tampil di setiap adegan yang memuat scan, model 3D, drawer atau bunyi napas. Selama animasi layar penuh tampil "Ilustrasi mekanisme".

## Penanda cairan: dari piksel, bukan gambar baru
`tools/mask_dari_selisih.py`: klip 02 memuat skenario efusi (0–10,9 dtk) lalu tombol "Bandingkan dengan normal" mengganti citra ke normal (11,67 dtk). Area CT yang **berubah** (hitam di normal → abu-abu di skenario) = cairan yang disimulasikan aplikasi; selisih bingkai → ambang → penutupan morfologi → isi lubang → komponen terbesar → `data/mask_ct.png`. Panel USG dan CT memakai geometri sama (huruf R/I/S/L dan skala cm bergeser tepat 425 px), sehingga penanda USG = penanda CT digeser. Penanda hanya garis tipis emas + isian 10%; citra di bawahnya tidak diubah. Penanda di USG sedikit tidak seragam dengan tepi gelap karena speckle USG simulasi.

## Pemeriksaan fakta dan batas klaim
- **Cairan "di atas diafragma kanan":** mengikuti pernyataan pemesan. Dari piksel, cairan berada di sisi **S (superior, kanan gambar)** area hati/dinding; teks asli aplikasi: "free fluid lies in the dependent (posterior and basal...) right pleural space". Diafragma tidak diberi penanda sendiri karena tidak ada raster strukturnya di klip ini.
- **Ilustrasi:** skematik (penampang samping, tidak berskala). Cairan berada di ruang antara dua lapis pleura, tidak pernah di dalam paru; paru hanya kehilangan sebagian luas (±14% pada akhir), bukan kolaps total. Garis air selalu tegak lurus gravitasi dan dihitung tiap bingkai (`stage/anim.js`).
- **Bunyi napas:** 04 dan 05 diputar apa adanya (1,6 dtk pertama, **gain sama** sehingga selisih level tidak diubah; beda ±13 dB di berkas asli). Keduanya sintesis edukatif dari mesin simulasi MEDCOEL, bukan rekaman pasien; teks "bukan citra atau suara pasien" tampil. Grafik amplitudo dihitung dari berkas yang sama (`data/env.json`) dengan skala sama.
- **Klip 01 dan 03:** keduanya hanya menampilkan jendela jantung (skenario Normal, probe phased array) dan baru berpindah ke efusi pleura di detik terakhir (scan belum diperbarui). Karena itu pembuka **tidak** memakai 01/03 (tidak ada "ruang gelap di atas diafragma" di sana; teks pembuka akan menyesatkan). Pembuka memakai scan dari klip 02. Klip 01 dipakai untuk saat skenario dipilih dan probe berpindah ke basal kanan (1,4 dtk); klip 03 tidak dipakai.
- Orientasi citra apa adanya dari aplikasi (R atas, L bawah, I kiri, S kanan).
- Label antarmuka bahasa campuran dibiarkan; teks Indonesia ditambahkan terpisah.

## Audio dan lisensi
Musik instrumental **"MEDCOEL Soft Pulse (varian pleura)"** (pad hangat, bel lembut 84 BPM, tanpa alarm/denyut rumah sakit), klik kecil pada aksi antarmuka sungguhan (skenario dipilih, tombol Bandingkan) dan "ting" lembut pada penanda, awal animasi, pemutaran ke terlentang, kembali ke rekaman dan ajakan akhir: sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0** (dibuat sendiri, tanpa sampel/musik pihak ketiga), boleh untuk promosi Instagram/TikTok tanpa atribusi. Musik turun di bawah narator dan turun ±−15 dB selama perbandingan bunyi napas. Bunyi napas 04/05 dari paket aset pemesan (sintesis MEDCOEL). Font Plus Jakarta Sans (SIL OFL 1.1); logo `apps/web/src/assets/logo-full.webp`.

## Batasan jujur
- Audio belum didengarkan manusia; hanya diukur (loudness, puncak, level bunyi napas) dan dicocokkan dengan ASR/linimasa.
- Durasi 44,9 dtk: naskah menjelaskan mekanisme ±17 dtk, jadi animasi layar penuh dibatasi ±6,4 dtk (normal + terbentuk/diserap) dan sisanya (menumpuk, terlentang, paru tertekan) tampil di layar terbagi dengan scan tetap di atas.
- Jeda antarkalimat voice-over dipersingkat (maks. 0,36 dtk) dan satu jeda 4,2 dtk disisipkan untuk bunyi napas; kata dan suara tidak diubah.
- Sumber 1920×1080 diperbesar ±1,2–1,9× untuk scan; teks kecil di panel asli agak lembut.
- Citra scan bergerak sedikit (fase jantung/napas simulasi); bila perlu bingkai diputar bolak-balik (bukan loop mendadak).
- Bagian bawah layar (±25%) sengaja dikosongkan untuk area UI Reels/TikTok.

## Proyek yang bisa diedit / render ulang
`cues.json` (waktu), `stage/` (`anim.js` ilustrasi, `stage.js` komposisi), `tools/` (`susun_linimasa.py`, `mask_dari_selisih.py`), `data/` (mask, `env.json`), `audio/`, `cover/`, `render.mjs`, `shot.cjs`, `extract.sh`, `src/`.
```bash
cd video/efusi-pleura-scan-suara && ./extract.sh /tmp/pleura-frames            # bingkai 30 fps dari src/ (symlink rekam/frames)
python3 tools/susun_linimasa.py                                                # voiceover-susun.wav, data/env.json, cues.json
python3 tools/mask_dari_selisih.py rekam/frames/02 data                        # penanda (opsional; sudah disertakan; butuh scipy)
cd ../.. && python3 -m http.server 8135 --bind 127.0.0.1 &
python3 video/efusi-pleura-scan-suara/audio/audio_mix.py                       # musik + klik + bunyi napas + voice-over -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/efusi-pleura-scan-suara/render.mjs /tmp/pl-out 0 1346 4
ffmpeg -framerate 30 -i /tmp/pl-out/f%05d.jpg -i video/efusi-pleura-scan-suara/audio/mix.wav -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 44.9 video/efusi-pleura-scan-suara/ruang-gelap-efusi-pleura-kanan.mp4
```
