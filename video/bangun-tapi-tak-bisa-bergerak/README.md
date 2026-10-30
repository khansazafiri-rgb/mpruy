# Video "Bangun, tapi tak bisa bergerak"

- `bangun-tapi-tak-bisa-bergerak_final.mp4`: 1080×1920, 30 fps, 94,15 detik (narasi 90,75 detik + jeda awal 0,8 dan akhir 2,6).
- `bangun-tapi-tak-bisa-bergerak_pratinjau.mp4`: 540×960 untuk tinjau cepat.
- `NASKAH.md`: teks narasi per waktu, adegan, catatan akurasi, dan deskripsi produksi dengan sumber.

## Cara membuatnya
- Suara: MP3 narator ElevenLabs dipakai utuh. `audio/gen_data.py` hanya menambah jeda awal dan menyusun takarir. Titik potong takarir di dalam kalimat panjang dicocokkan lewat pengenalan suara (`audio/align_breaks.py`, hasil di `audio/breaks.json`); teks narasi dikoreksi dari hasil Whisper (kecil dan menengah).
- Audio: `audio/music.py` membuat ambien tipis (detak jam, napas, detak jantung yang naik lalu berhenti mendadak), musik tenang setelah pertanyaan, dan efek, semuanya sintesis. `audio/mix.sh` menaruhnya di bawah narator (sidechain, sekitar -14 LUFS). `audio/check_mix.py` mengukur kejernihan narator pada pita speaker ponsel (rata-rata sekitar 25 dB lebih keras dari latar).
- Visual: panggung HTML/SVG per frame di `stage/`. `rig.js` karakter 2D datar (lengan dan kaki satu pita lengkung, tanpa lingkaran sendi), `pov.js` pandangan orang pertama dengan fokus berpindah, `topdown.js` kamar dari atas, `explain.js` visual penjelasan, `room.js` kamar yang menyala, `stage.js` linimasa dan transisi.
- Membuat ulang: `bash build.sh` (butuh ffmpeg, numpy, node + playwright).

Maskot Kori dari `brand/mascots/kori.svg`, logo dari `video/masih-dua-minggu/stage/logo-full.webp`.
