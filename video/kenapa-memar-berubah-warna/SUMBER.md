# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/sumber-asli.wav` | Narasi Google AI Studio dari pemesan (`Generated_Audio_November_26_2026_-_5_09PM.wav`), 24 kHz mono, 28,46 dtk; seluruhnya naskah edukasi (tanpa paragraf promosi). Header WAV tidak baku, jadi didekode lewat ffmpeg. | Dari pemesan. Tidak diubah. |
| `audio/mix.wav` (hasil `audio_mix.py`) | Suara = berkas di atas utuh (fade-out 80 ms di ujung, resample 24 -> 48 kHz); tempo dan nada tidak diubah, bukan TTS pengganti. Musik dan efek disintesis dari kode (numpy/scipy). | Musik dan efek **CC0 1.0** (tanpa sampel pihak ketiga), aman untuk promosi Instagram/TikTok. Daftar efek + waktu: `audio/events.json`. |
| `brand/video/outro/medcoel-outro-master.mp4` | Master outro baku MEDCOEL di repo (16,20 dtk), ditempel utuh satu kali, re-encode sesuai README master. | Aset MEDCOEL. |
| `audio/asr-outro.json` | Takarir kalimat narasi master (teks dari README master; waktu dari ASR master). | Hanya untuk `takarir.srt`. |
## Gambar
Semua dari kode (`stage/*.js`). Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`, tidak diubah) dengan `walkCycle`, ekspresi bawaan, dan `lerpState`; tidak ada gambar referensi Raka dan tidak ada karakter baru. Ruang tamu, meja, penampang kulit (epidermis, dermis, lemak, otot), pembuluh kecil, sel darah merah, sel pembersih, dan pigmen: vektor skematis buatan sendiri (ilustrasi edukatif; jumlah dan ukuran sel disederhanakan: sel darah merah sekitar sepertiga diameter pembuluh kecil). Logo `apps/web/src/assets/logo-full.webp` (hanya cover). Font `video/kopi-kafein-adenosin/stage/fonts`. Gaya diacu dari `video/spo2-pulse-oximeter` dan `video/mekanisme-varises`.
## Sumber isi (dibuka langsung 2026-11-26)
- **MedlinePlus, Bruises** (medlineplus.gov/bruises.html): memar adalah bercak pada kulit akibat darah yang terperangkap di bawah permukaan; terjadi ketika cedera meremukkan pembuluh darah kecil tanpa merobek kulit, pembuluh itu pecah dan darah merembes di bawah kulit; warna berubah (mulai kemerahan, lalu kebiruan-keunguan dan kehijauan-kekuningan, sebelum kembali normal); lama memudar bervariasi.
- **MedlinePlus Medical Encyclopedia, Bruise healing** (medlineplus.gov/ency/presentations/100207_2.htm): perubahan warna memar disebabkan penguraian biokimia hemoglobin dalam darah; ketika komponen darah diuraikan, warna berbeda muncul.
Video **tidak** menyebut jam atau jumlah hari, tidak memberi jadwal warna, tidak membahas pertolongan pertama atau kapan ke dokter, dan tidak menggambar luka terbuka.
Penyederhanaan yang disengaja: tahap kimia hemoglobin → biliverdin → bilirubin tidak diberi nama (hanya "pigmen" yang berubah warna bersama bercak); "sel pembersih" mewakili sel yang menelan dan menguraikan sel darah merah; dua kartu kulit (terang/gelap) mengilustrasikan bahwa tampilan dan lama pemulihan dapat berbeda, bukan standar tampilan memar pada warna kulit tertentu.
