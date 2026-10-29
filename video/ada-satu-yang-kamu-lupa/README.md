# Video "Ada Satu yang Kamu Lupa" (Reels dan TikTok)

`ada_satu_yang_kamu_lupa.mp4`: 1080x1920, 30 fps tetap (3210 frame), 107,0 detik, H.264 + AAC, sekitar -14,6 LUFS.
Pratinjau resolusi rendah (360x640): `preview/pratinjau_ada_satu_yang_kamu_lupa.mp4`.
Tidak diunggah ke media sosial. Tidak menampilkan UI web; hanya Raka dan logo MEDCOEL.

## Sumber
- Audio: satu berkas ElevenLabs (`audio/sumber-baru.mp3`, 102,2 dtk) berisi seluruh narasi lalu tiga dialog Raka berurutan di ujung berkas. `audio/cut.py` memotongnya di jeda antarucapan (titik potong di -63 sampai -90 dB, fade 15 ms) menjadi N1-N9 dan R1-R3. Klip dipakai apa adanya: tidak diganti suara, tidak dipercepat, tidak ada kata yang dipotong. `audio/compose.py` menyusun urutan N1, N2, R1, N3, N4, R2, N5, N6, N7, N8, R3, N9, menyejajarkan kata naskah dengan hasil ASR (`audio/asr.json`), dan menulis `stage/data.json`. Takarir memakai teks naskah; "Med-koel" tertulis MEDCOEL.
- Raka: kanonik dari `brand/characters/raka/raka.js` (patch logo dari `apps/web/src/assets/logo-mark.webp`). Logo MEDCOEL di penutup: `apps/web/src/assets/logo-full.webp`.
- Musik, ambience, dan SFX: disintesis di `audio/mix.py` (numpy), tanpa lisensi pihak ketiga. Musik berhenti sebelum dialog Raka kedua, ada hening penuh 52,8-54,4 dtk, lalu kembali pelan setelah reveal. Ducking dengan `sidechaincompress`; loudnorm dua lintasan.

## Area aman platform
Takarir di y 1196-1446 dan x 56-920; teks penting lain di y 262-1180, x 40-920 (menghindari bilah atas, deskripsi bawah, dan tombol aksi di kanan).

## Menjalankan ulang
```bash
python3 audio/cut.py && python3 audio/compose.py && python3 audio/mix.py
python3 -m http.server 8124 --directory <akar-repo> &
node stage/render.mjs <folder_frame> 0 3209 4
ffmpeg -framerate 30 -i <folder_frame>/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart ada_satu_yang_kamu_lupa.mp4
```

## Pemeriksaan fakta
- Penelitian: Crowley R, Alderman E, Javadi AH, Tamminen J. A systematic and meta-analytic review of the impact of sleep restriction on memory formation. Neurosci Biobehav Rev 2024;167:105929 (PMID 39427809): 125 ukuran efek dari 39 laporan dengan 1.234 peserta; pembatasan tidur berdampak negatif kecil pada pembentukan memori (Hedges g = 0,29). Video menyebut "39 laporan" dan "lebih dari 1.200 peserta", kartu sumber menulis 1.234. Video tidak menyebut persentase dan tidak menyatakan satu malam pasti membuat ujian gagal. (Newbury dkk. adalah ulasan 2021 tentang kurang tidur total, bukan penelitian ini.)
- NHLBI (Health Effects of Sleep Deficiency): kurang tidur memengaruhi belajar, fokus, dan daya ingat; dipakai untuk kalimat "fokus bisa terganggu dan materi baru lebih sulit melekat".
- Raka adalah tokoh fiksi; ada keterangan di layar selama bagian penelitian.
- Klaim "lebih dari 38 ribu soal dan pembahasan gratis": "gratis" sesuai `Landing.jsx`. Jumlah soal produksi tidak ada di repo (landing mengambilnya dari API `stats.questions`). Angka 38.400 yang dipakai materi proyek sebelumnya (`brand/video/ad`, video "Tab Dua Puluh") konsisten dengan "38 ribu+", tetapi belum bisa diverifikasi terhadap database produksi saat ini.
