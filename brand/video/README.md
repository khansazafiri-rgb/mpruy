# Kit video MEDCOEL

Membuat video bermaskot (Kori, Kila, Nilo) dengan suara dari **server sendiri**, tanpa biaya per token:

```
naskah (scenes.json) -> suara (Piper, lokal) -> animasi (Chromium) -> MP4 (ffmpeg) + .srt + thumbnail
```

Panduan lengkap (PDF): `docs/panduan/02-video-maskot.pdf`.

## Mulai cepat

```bash
cd brand/video
bash scripts/setup.sh            # sekali: ffmpeg, Piper, suara Indonesia, Playwright
npm run check                    # semua prasyarat
npm run say -- "Halo, aku Kori." # dengar satu kalimat
npm run video -- scenes/kenalan-kori.json --draft          # cepat, setengah resolusi
npm run video -- scenes/kenalan-kori.json --format 9:16    # versi vertikal penuh
```

Hasil ada di `out/`: `.mp4`, `.srt`, `.jpg` (thumbnail). Lihat `lexicon.json` untuk mengatur cara
mesin melafalkan nama seperti MEDCOEL (`npm run lab` membuat beberapa varian ejaan untuk didengar).

Untuk suara rekaman sendiri atau mesin lain, lihat bagian "Mesin suara" di `src/tts.mjs`.

## Karakter manusia: Raka

Selain maskot Kori, Kila, dan Nilo, seri video punya satu karakter manusia 2D bernama **Raka**, dibuat sebagai kode (SVG yang dikendalikan angka) di `brand/characters/raka/`. Bila naskah atau prompt video menyebut "Raka", generator **wajib memakai aset itu** (`raka.js`, `rakaSvg()`), bukan menciptakan desain manusia baru. Raka hanya untuk video, tidak untuk web. Panduan ekspresi, animasi, dan render ada di `brand/characters/raka/README.md`.

## Iklan 75 detik "Kirim PDF soalmu" (contoh pemakaian penuh)

Folder `ad/` berisi iklan 9:16 (1080x1920, 30 fps, 75 detik): 16 shot, cuplikan layar aplikasi
sungguhan, maskot Kori apa adanya (SVG di `apps/web/src/mascots`), teks dan takarir dari `ad/ad.json`.

```bash
# 1. Jalankan web + PocketBase dev dengan data contoh (scripts/seed-demo.mjs), lalu rekam layar
MEDCOEL_USER_PW=... MEDCOEL_ADMIN_PW=... npm run ad:record     # ad/clips/*.mp4 + clips.json
npm run ad:frames                                              # pecah klip -> ad/build/frames
npm run ad:voice                                               # suara draf dipas ke tiap shot (+ .srt)
npm run ad:audio                                               # efek suara + musik buatan sendiri
npm run ad:render                                              # video tanpa suara 1080x1920
npm run ad:mux                                                 # gabung -> ad/out/medcoel-iklan-75s.mp4 + stems
```

Suara dari `ad:voice` hanyalah draf/penanda waktu. Untuk tayang, buat suara terpisah per shot
(`s01.wav` ... `s16.wav`) lalu jalankan `node ad/voice.mjs --use folder-rekaman/` dan ulangi `ad:mux`.
Semua teks di layar (judul, takarir, label) adalah teks HTML yang ditambahkan saat penyuntingan,
bukan hasil generator gambar. Rekaman layar memakai data contoh lokal, jangan dari server produksi.
