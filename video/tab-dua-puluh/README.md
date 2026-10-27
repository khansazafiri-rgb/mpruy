# Video promo "Tab Dua Puluh"

`tab_dua_puluh_v2.mp4`: 1080x1920, 30 fps, 100,5 detik. Sinkron dengan dua audio ElevenLabs (Nadia dan Kori).

Isi folder ini adalah sumber pembuatnya. Skrip masih memakai path scratchpad sesi pembuatan, jadi sesuaikan `S=` / `OUT` sebelum menjalankan ulang.

1. `reset.sh` dan `seed/`: PocketBase lokal berisi 26 soal Anatomi, akun Nadia, dan 6 teman untuk leaderboard (data uji, bukan produksi).
2. `rekam/rec.mjs`: merekam footage web asli (viewport 600x738 pada skala 1,6) dengan kursor dan ketukan. `assemble.py` menyusun frame-nya jadi video 30 fps.
3. `stage/`: panggung HTML/SVG per frame. `chars.js` (Nadia dan maskot asli), `world.js` (kamar kos dan lorong), `stage.js` (linimasa, kartu, takarir per kata). `gen_data.py` membuat `data.json` (waktu kata dan lipsync) dari klip audio. `render.mjs` merender frame dengan 4 worker. Frame footage web (`stage/web/`) dibuat ulang dari hasil rekaman.
4. `audio/audio_mix.py`: musik lo-fi sintesis dan SFX, di-mix di bawah dialog. Hasil akhir dinormalkan ke sekitar -14 LUFS dengan ffmpeg `loudnorm`.

Catatan: layar web di video memakai data uji lokal, bukan 38.400 soal produksi. Musik dan SFX berupa placeholder sintesis.
