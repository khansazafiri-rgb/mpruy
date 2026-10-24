# Revisi iklan "Kirim PDF soalmu" — versi 2 (pratinjau)

MP4 lama disimpan sebagai `out/medcoel-iklan-75s-v1.mp4`. Render 75 detik penuh versi 2 belum dibuat; menunggu pratinjau disetujui.

## Yang berubah
- Web asli memenuhi kanvas 1080×1920 pada shot 2–4, 6–9, 11–12 (tanpa bingkai ponsel). Halaman tampil dulu, lalu cincin emas menyorot tombol atau area penting.
- Kori menjadi pemandu kecil (140 px) di sudut kanan bawah. Judul kuning dan takarir diperkecil.
- Shot 7 menampilkan pilihan mata kuliah (Chat Admin) lalu asal kampus (Profil). Pilihan "kampusmu saja / semua kampus" baru muncul di shot 8.
- Warna, maskot SVG, alur pemeriksaan admin, angka 38.400, durasi 75 detik, dan CTA terakhir tidak diubah.
- Narasi dipendekkan, suara tidak dipercepat (`maxSpeedUp: 1.0`).

## Suara
Piper `id_ID-news_tts` hanya cocok sebagai draf: korpusnya kemungkinan berlisensi non-komersial. Suara sampel memakai eSpeak NG (GPL-3.0, sintesis formant tanpa rekaman manusia), jadi aman dipakai untuk promosi, tetapi kualitasnya robotik. Untuk versi final disarankan rekaman suara sendiri atau layanan TTS berlisensi komersial lewat engine `file` atau `command` di `voice.mjs`.

Tiga profil Kori ada di `voices.mjs`: `ceria`, `hangat`, `mungil`. Contohnya (narasi shot 1–3, 12 detik) dibuat dengan `node voice-samples.mjs` ke `out/voice-samples/`.

## File kode yang diubah
- `ad.json` — narasi `say` dipendekkan (`sayV1` menyimpan teks lama), `version: 2`, blok `voice`.
- `stage-ad.html`, `stage-ad.css` — komponen `webView` (web layar penuh, sorotan, label), `guide` (Kori kecil), adegan 2–4, 6–9, 11–12 ditulis ulang.
- `record-clips.mjs` — klip web direkam ulang pada 360×640 CSS × DPR 3 dengan data contoh dan mencatat posisi elemen (`rect`).
- `../src/record.mjs` — perbaikan perekaman: Chromium dijalankan dengan `--force-device-scale-factor=3` dan jendela setinggi 640 + 87 px. Sebelumnya frame screencast hanya 360×553 lalu diperbesar, sehingga klip lama buram dan terentang. `rect()` menunggu posisi elemen stabil.
- `frames.mjs` — kualitas JPG frame.
- `render-ad.mjs` — membaca `clips/clips.json`; opsi `--from/--to/--out/--stills/--sheet`.
- `voices.mjs`, `voice-samples.mjs` (baru), `voice.mjs` (ditulis ulang) — profil suara, contoh suara, dan penyusun narasi tanpa percepatan.

## Cara membuat ulang
```
npm run ad:record     # butuh web + PocketBase dev + MEDCOEL_USER_PW dan MEDCOEL_ADMIN_PW
npm run ad:frames
node ad/voice-samples.mjs
node ad/render-ad.mjs --from 3 --to 16 --out prev-3-16.mp4
```
Rekaman memakai data dev lokal; web produksi dan data pengguna tidak disentuh.
