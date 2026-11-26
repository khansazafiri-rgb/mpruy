# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/sumber-asli.wav` | Narasi Google AI Studio dari pemesan (`Generated_Audio_November_26_2026_-_1_00PM.wav`), 24 kHz mono, 38,79 dtk. Memuat naskah edukasi + kalimat promosi lama (28,52 dtk dst.). Header WAV tidak baku, jadi didekode lewat ffmpeg. | Dari pemesan. Tidak diubah. |
| `audio/mix.wav` (hasil `audio_mix.py`) | Suara = bagian 0 - 28,20 dtk dari berkas di atas (jeda alami sesudah "penyebab yang jelas.", sunyi 27,78 - 28,77), fade-out 80 ms, resample 24 -> 48 kHz; tempo dan nada tidak diubah, bukan TTS pengganti. Musik + efek disintesis dari kode (numpy/scipy). | Musik dan efek **CC0 1.0** (tanpa sampel pihak ketiga), aman untuk promosi Instagram/TikTok. Daftar efek + waktu: `audio/events.json`. |
| `brand/video/outro/medcoel-outro-master.mp4` | Master outro baku MEDCOEL di repo (16,20 dtk), ditempel utuh satu kali, re-encode sesuai README master. | Aset MEDCOEL. |
| `audio/asr-outro.json` | Takarir kalimat narasi master (teks dari README master; waktu dari ASR master). | Hanya untuk `takarir.srt`. |
## Gambar
Semua dari kode (`stage/*.js`). Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`) dengan ekspresi/pose bawaan dan `lerpState`; tidak ada gambar referensi Raka, tidak ada karakter baru. Penampang dada-perut, laring, pita suara, lambung, mangkuk: vektor skematis buatan sendiri (ilustrasi edukatif, bukan citra pemeriksaan; skala dan gerak disederhanakan). Logo `apps/web/src/assets/logo-full.webp` (hanya cover). Font `video/kopi-kafein-adenosin/stage/fonts`. Gaya diacu dari `video/mekanisme-varises` dan `video/spo2-pulse-oximeter` (hanya pola visualnya).
## Sumber isi (dibuka 2026-11-26)
- **MedlinePlus, Hiccups** (medlineplus.gov/hiccups.html): cegukan punya dua bagian: gerakan tak disengaja diafragma (otot di dasar paru-paru, otot utama napas), lalu penutupan cepat pita suara yang menghasilkan bunyi "hic". Cegukan bisa mulai dan berhenti tanpa sebab jelas, tetapi sering terjadi saat diafragma teriritasi, misalnya makan terlalu cepat, makan terlalu banyak, perut kembung.
- **MedlinePlus Medical Encyclopedia, Hiccups** (medlineplus.gov/ency/article/003068.htm): spasme tak disengaja diafragma diikuti penutupan cepat pita suara yang menimbulkan bunyi khas; sering mulai tanpa sebab jelas dan hilang dalam beberapa menit.
Video tidak menyebut cara menghentikan cegukan, cegukan kronis, atau penyakit penyebab; pemicu hanya "bisa memicu" (makan terlalu cepat, perut terlalu penuh) dan "kadang tanpa penyebab jelas".
Penyederhanaan yang disengaja: panah udara turun lewat trakea (diafragma berkontraksi menarik udara masuk, lalu celah pita suara tertutup) adalah gaya animasi untuk menghubungkan urutan; sumber di atas tidak menjabarkannya.
