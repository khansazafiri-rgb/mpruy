# Satu Kasus, Banyak yang Harus Nyambung — video promosi MEDCOEL (39,0 dtk, 1080×1920, 30 fps)

Video animasi vertikal. **Narasi memakai audio Google AI Studio dari pemesan (`audio/narasi.wav`) apa adanya**: tidak ada narator baru, suara tidak diubah (hanya diberi musik di bawahnya dan penguatan level seragam). Durasi video mengikuti audio (39,0 dtk).

Hasil: `satu-kasus-banyak-yang-harus-nyambung.mp4` (H.264 + AAC, ≈ −14,4 LUFS, puncak −1,2 dBFS). Cover: `cover/cover.png` (1080×1920; `cover-panduan-area-aman.png` memuat garis area aman; `cover-bersama-awal-video-360px.png` membandingkan cover dan bingkai awal pada 360 px). Pratinjau ponsel: `still/*-360px.png`.

## Alur, sinkron dengan kata narasi
| Detik | Narasi (ASR `audio/narasi-asr.json`) | Visual | Teks layar |
|---|---|---|---|
| 0–3,7 | "Di diskusi kasus, keluhannya cuma satu. **Pasien sesak.**" | Dibuka dengan aksi: Raka yakin, lembar kasus meluncur ke meja dan mendarat saat "pasien" (2,8 dtk); kamera menyorot "PASIEN SESAK" | (pada lembar) |
| 3,7–6,4 | "Tapi begitu mulai dibahas." | Raka berubah dari yakin → waspada → bingung; lembar kasus pindah ke sisi meja | |
| 6,4–12,3 | "Tunggu, ini masuk **anatomi paru**. Terus **fisiologi napas**. Terus aku harus mikirin **penyebabnya** juga." | Tiga kartu terbang dari lembar kasus: ANATOMI PARU (paru), FISIOLOGI NAPAS (paru + diafragma yang bergerak), PENALARAN KASUS (papan kasus + tanda tanya). Kartu bukan rintangan; memenuhi meja | judul di kartu |
| 12,3–16,6 | "Satu kasus, kok rasanya harus buka semua mata kuliah sekaligus?" | Raka membuka buku catatan dan tab, mencoba menghubungkan, lalu berhenti (keringat, bahu turun); hubungan antar-kartu berupa garis putus-putus dengan "?" | MULAI DARI MANA? |
| 16,4–17,9 | "Akhirnya aku mulai dari satu bab dulu di medkul." | Nilo (maskot "mencoba lagi") menunjuk satu kartu; tumpukan lain mereda, kamera fokus pada satu kartu BAB; musik tenang; kartu masuk ke laptop, kamera zoom, transisi pixel singkat | SATU BAB DULU. |
| 17,9–26,9 | "**Baca materinya**, coba inget lagi lewat **flashcard**, lalu **kerjakan soal**, dan **liat pembahasannya**." | **Web MEDCOEL asli** di panel besar: pilih mata kuliah → pilih BAB "Anatomi Paru & Saluran Napas" → baca materi (gulir sampai gambar "Gambar 1") → flashcard (balik kartu, Hafal) → latihan soal (jawab, Cek jawaban) → pembahasan | BACA MATERINYA. / COBA FLASHCARD. / KERJAKAN SOAL. / LIHAT PEMBAHASAN. |
| 27,0–29,6 | "Pelan-pelan bagian yang tadi berantakan mulai **nyambung**." | Kembali ke meja diskusi; kartu berantakan disusun rapi, garis putus-putus menjadi garis utuh dengan satu "ting" lembut (28,4 dtk); Kila muncul sebentar | MULAI NYAMBUNG. |
| 29,6–35,6 | "Ternyata aku gak harus memahami semuanya dalam satu malam. Aku cuma perlu tahu mulai dari mana." | Raka lega lalu senang, siap lanjut belajar; Kori menemani | TIDAK HARUS SEMUANYA SEKALIGUS. / CUKUP TAHU MULAI DARI MANA. |
| 35,7–39,0 | "Medkul, belajar FK gratis di medkul.com" | Logo MEDCOEL, "BELAJAR FK GRATIS", "MEDCOEL.COM" selama 3,3 dtk; Raka tetap terlihat | BELAJAR FK GRATIS / MEDCOEL.COM |

Raka tidak digambarkan bisa mendiagnosis pasien; MEDCOEL ditampilkan sebagai tempat mulai belajar satu BAB, bukan pemberi jawaban klinis.

## Sumber
- **Raka:** `brand/characters/raka/raka.js` (kanonik; sweater harian, ekspresi lega/waspada/bingung/kaget/khawatir/melongo/sedih/penasaran/mengerti/senang, pose menunjuk/berpikir/pegang_buku/angkat_bahu/sapa). **Kori, Nilo, Kila:** `apps/web/src/mascots/*.svg` apa adanya (`stage/mascot.js`). Tidak ada karakter yang digambar ulang menjadi pixel; estetika pixel hanya pada lingkungan, kartu, tab, efek, dan transisi.
- **Web (17,9–26,9 dtk):** direkam dari web MEDCOEL asli di repo (`apps/web`) yang berjalan lokal + PocketBase lokal, akun demo (`rekam/siapkan.sh`, `rekam/web.cjs`). **Materi dan flashcard BAB "Anatomi Paru & Saluran Napas" adalah konten asli repo. Soalnya adalah data uji lokal** (`seed/paru-soal.mjs`, 8 soal dengan pembahasan, sudah diperiksa isinya) karena di basis data repo BAB ini bertanda "Soal segera hadir". Kursor dan ring ketukan digambar; UI tidak digambar ulang.
- **Ilustrasi kartu** (paru, gerak napas, papan kasus) digambar dari kode (`stage/scenes.js`), bukan gambar produk.
- **Font pixel:** Press Start 2P (SIL OFL 1.1, `stage/fonts/`).

## Audio dan lisensi
- **Narasi:** `audio/narasi.wav`, audio Google AI Studio dari pemesan, tidak diubah.
- Musik **"MEDCOEL Case Notes"** dan efek **"MEDCOEL Soft Pings"** (blip kartu, ting lembut): sintesis kode (`audio/audio_mix.py`), lisensi **CC0 1.0**. Musik ringan dan sedikit sibuk → lebih tenang dan teratur saat Raka mulai dari satu BAB → cerah dan rapi saat materi nyambung. Musik turun ±8 dB saat narator bicara.
- Jadwal animasi dan bunyi sama-sama dibaca dari `cues.json` (waktu kata dari ASR).

## Proyek yang bisa diedit / render ulang
- `cues.json` jadwal; `stage/` (`stage.js` adegan dan kamera, `scenes.js` ruangan dan benda, `fx.js` efek pixel, `mascot.js` pembungkus maskot kanonik); `rekam/` perekam web; `seed/` soal uji; `audio/` mix; `cover/`.
```bash
# dari akar repo (playwright harus tersedia, mis. NODE_PATH=/opt/node-tools/node_modules)
python3 -m http.server 8128 &                                         # server statis
(cd apps/web && npm run dev &)                                        # web lokal (port 3000)
bash video/satu-kasus/rekam/siapkan.sh                                # PocketBase + data uji + soal BAB paru
node video/satu-kasus/rekam/web.cjs video/satu-kasus/rekam/web        # rekam ulang web asli -> rekam/web/ (di-gitignore)
python3 video/satu-kasus/audio/audio_mix.py                           # musik + efek + campur dengan narasi -> audio/mix.wav
node video/satu-kasus/render.mjs video/satu-kasus/frames 0 1169 4     # bingkai JPEG (frames/ di-gitignore)
node video/satu-kasus/cover/render-cover.cjs                          # cover
ffmpeg -framerate 30 -i video/satu-kasus/frames/f%05d.jpg -i video/satu-kasus/audio/mix.wav \
  -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k \
  -af "volume=1.16,alimiter=limit=0.85:level=0" -shortest -movflags +faststart video/satu-kasus/satu-kasus-banyak-yang-harus-nyambung.mp4
```

## Batasan jujur
- Pemeriksaan visual dilakukan dari lembar kontak dan bingkai kunci; audio belum saya dengarkan penuh sebagai pendengar. Sinkron kata-gambar diatur dari waktu kata ASR, bukan dari mendengarkan: periksa dengan telinga.
- Narator mengucapkan "medkul", bukan "MEDCOEL"; audio dipertahankan sesuai permintaan, teks layar tetap MEDCOEL / MEDCOEL.COM.
- Soal dan pembahasan di rekaman adalah data uji lokal untuk BAB paru; di data repo saat direkam BAB itu belum punya soal.
- Rekaman web dipercepat sedikit (±1–2×) agar semua tahap (pilih BAB, materi, flashcard, soal, pembahasan) muat di jendela kalimat narasi.
- Bingkai JPEG, rekaman web mentah, dan WAV hasil sintesis tidak ikut di repo (dibuat ulang lewat perintah di atas).
