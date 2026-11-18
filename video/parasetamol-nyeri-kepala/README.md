# Parasetamol untuk nyeri kepala — proyek MEDCOEL

**Status: draf visual; video edukasi final belum dibuat.** Audio lampiran berdurasi 42,64 detik, tetapi membahas kandung kemih dan retensi urin. Audio ini tidak cocok dengan brief parasetamol dan tidak dipasang ke render. Naskah final parasetamol juga belum tersedia dalam bentuk teks.

## Yang tersedia

- `out/outro-20s-DRAF-tanpa-narasi.mp4`: 1080×1920, 30 fps, 20 detik, sengaja tanpa audio. Tiga rekaman web asli, tanpa percepatan: materi 6,5 s, soal/pembahasan 6,5 s, simulasi 7 s. Logo/URL menumpang 3,5 s terakhir.
- `out/cover-DRAF.png`: cover vertikal, karakter Raka dirender dari kode kanonik.
- `render-outro.mjs`, `timeline.json`, `STYLE.md`: proyek animasi parametrik yang dapat diedit dan dirender ulang.
- `out/qa-*.png`: awal, tengah, akhir masing-masing shot. `QA.md` mencatat batas pemeriksaan.
- `SOURCES.json`: asal aset dan checksum blob GitHub.

## Render ulang

Node 22+, FFmpeg dengan encoder libx264, dan `npm install`. Jalankan `npm run render:outro`. Bila FFmpeg di luar PATH: `FFMPEG=/path/to/ffmpeg npm run render:outro`. `npm run cover` membuat cover saja. Cache JPEG di `.cache/` boleh dihapus setelah encode.

Untuk menonton pada ukuran ponsel: `python3 -m http.server 8765`, lalu buka `http://localhost:8765/preview.html`. Skrip ini tidak merekam web ulang dan tidak mengubah aset video lama.

## Masukan yang masih diperlukan

1. Audio final Google AI Studio **tentang parasetamol untuk nyeri kepala**, termasuk narasi outro bila harus bersuara.
2. Naskah final yang sama persis dengan ucapan. Panduan shot pada brief bukan naskah narasi utuh.

Setelah masukan benar tersedia: ukur setiap kalimat dan istilah, isi `education.shots`, buat animasi dan takarir, gabungkan outro pada awal narasi promosi, render penuh, lalu lakukan LOOP hingga maksimal tiga putaran. Jangan menandai PR siap ditinjau atau hasil final sebelum pemeriksaan video lengkap dengan audio selesai.

Rekomendasi outro 8–12 detik di panduan repo diganti oleh instruksi pengguna yang meminta 18–22 detik. Proyek ini memakai 20 detik dengan CTA tumpang tindih, sehingga total outro tidak menjadi 24 detik.

## Audio yang dipakai

Tidak ada audio dalam draf outro ini. Tidak memakai suara rekaman web, iklan lama, narasi lain, musik, atau TTS pengganti.
