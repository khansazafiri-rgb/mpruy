# Video ke-2: "Simulasi Jadi Dokter" (75 detik, 9:16, 1080×1920, 30 fps)

Narator Nilo (SVG asli, tidak diubah). Alur: kait lucu, kenalan dengan web secara umum (gratis, 38.400 soal, latihan + pembahasan,
kirim PDF, leaderboard), baru Simulasi Jadi Dokter. Kartu web tampil **utuh** (360×640, tidak dipotong), ada kursor POV dan catatan POV di atas kartu.

## Kenapa video lama terasa nyandet, dan perbaikannya
Perekam layar bawaan (screencast) pada 1080×1920 hanya menghasilkan sekitar 6–9 gambar berbeda per detik: 70–80% frame saat ada gerakan
sama dengan frame sebelumnya. `capture.mjs` menggantinya dengan perekam per-frame: jam halaman dibekukan dan dimajukan tepat 1/30 detik per
frame (timer, ketikan, animasi ikut), animasi CSS digeser lewat Web Animations API, kursor/gulir/ketikan digerakkan skrip per frame.
Panggung (`stage-ad2.html`) juga tidak memakai animasi CSS berbasis waktu nyata: semua gerak Nilo dihitung dari waktu video.

## Berkas
- `narasi.json`: sumber tunggal naskah (teks ucapan, judul, catatan POV, potongan klip per shot, latar, suasana Nilo).
- `naskah.mjs`: membuat `naskah-elevenlabs.txt` (teks ucapan saja) dan memeriksa muat atau tidaknya tiap kalimat di jendela shotnya.
- `capture.mjs`, `record-clips.mjs`: rekam klip web (data dev lokal; `PACE=0.88 node ad2/record-clips.mjs`). Kasus simulasi dipilih dengan `CASE=dbd`.
- `stage-ad2.html|css`, `render-ad2.mjs`: panggung dan render frame demi frame.
- `audio2.mjs` (efek + musik buatan sendiri, ketukan mengikuti klik di rekaman), `voice2.mjs`, `mux2.mjs`, `final2.mjs`.

## Dari suara ElevenLabs sampai MP4 final
1. `node ad2/naskah.mjs` → tempel `naskah-elevenlabs.txt` ke ElevenLabs, buat SATU file suara, kirim lewat Google Drive.
2. `node ad2/final2.mjs --audio narasi.mp3 --python <python dengan faster-whisper>` memotong per kalimat (hanya dipotong), menempatkannya pada
   tiap shot, memeriksa kalimat yang tidak muat (berhenti sebelum membuat video), membuat efek + musik, merender panggung (takarir dan mulut
   Nilo mengikuti suara), lalu mencampur dan mengekspor `out/medcoel-video2-simulasi.mp4`.
3. Suara tidak diproses (tanpa EQ, nada, atau percepatan): hanya satu penguatan tetap ke -16 LUFS.
Rekaman web tidak diulang; hanya panggung yang dirender ulang karena takarir dan gerak mulut mengikuti waktu bicara.

## Catatan
- Pratinjau tanpa suara: `node ad2/render-ad2.mjs --provisional --out preview-silent.mp4` lalu `node ad2/mux2.mjs --video build/preview-silent.mp4 --name preview`.
- Kasus simulasi di rekaman: `dbd` (Pak Hendra, 35 th, poli umum). Pilihan alasan di rekaman memakai alasan yang benar.
