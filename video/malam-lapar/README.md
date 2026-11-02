# Kenapa malam-malam lapar?

Video Reels/TikTok MEDCOEL (narasi `audio/narator.mp3`, 99,3 dtk) + cover.

- `cover/cover.html` – sumber cover (SVG di HTML, memakai `brand/characters/raka` dan `brand/characters/grelin`).
- `cover/render-cover.cjs` – render ke `cover.png` (1080×1920), `cover.jpg`, `cover-panduan-area-aman.png` (garis hijau = area aman crop profil IG 3:4, y 240–1680).
- `cover/cover-profil-3x4.png` dan `cover-pratinjau-grid-profil.png` – tampilan di grid profil.
- Jalankan: dari root repo `python3 -m http.server 8128 --bind 127.0.0.1`, lalu `node video/malam-lapar/cover/render-cover.cjs` (butuh Playwright).

Karakter yang dipakai: Raka (`lapar`, `pegang_perut`, baju `harian`), Grelin (hormon lapar). Lihat `brand/characters/README.md`.
