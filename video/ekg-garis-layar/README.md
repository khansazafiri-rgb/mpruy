# Bagaimana EKG menghasilkan garis di layar?
Video edukasi promosi MEDCOEL (1080x1920, 30 fps, 59,78 dtk: edukasi 44,92 dtk dari narasi Google AI Studio + outro 14,4 dtk dengan audio outro baru). Pesan: elektroda menangkap perubahan listrik dari kulit; jantung (kiri atas) dan garis EKG (bawah) berdampingan dan terbentuk serentak: nodus sinus -> serambi = P; nodus AV -> bilik = QRS, baru lalu kontraksi; pemulihan listrik bilik = T. Outro: rekaman asli Atlas 3D, Live 4D Lab, materi, latihan soal, Simulasi Dokter.

**Hasil**: `ekg-garis-layar_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.
## Struktur
- `stage/heart.js` — jantung datar (satu orientasi), sistem konduksi, keadaan jantung sebagai fungsi waktu `stateAt(s)`, fungsi gelombang EKG `ecgSlow`/`ecgNormal`. Jantung dan garis EKG memakai fungsi waktu yang SAMA, jadi sinkron secara konstruksi.
- `stage/scenes.js` — adegan A hook (Raka + monitor), B elektroda, C penampang dada, D mekanisme dua panel + pengulangan P-QRS-T, E Raka dan monitor (laju, irama), outro.
- `tools/build_cues.py` -> `cues.json`; `audio/audio_mix.py` (suara/musik/SFX terpisah); `rekam/siapkan-outro.sh`.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
DRIVE=/jalur/klip-drive bash video/ekg-garis-layar/rekam/siapkan-outro.sh    # atau pakai rekam/outro-web.mp4 yang sudah ada
python3 video/ekg-garis-layar/tools/build_cues.py && python3 video/ekg-garis-layar/audio/audio_mix.py
node video/ekg-garis-layar/render.mjs video/ekg-garis-layar/out/fr 0 1793 4
ffmpeg -framerate 30 -i out/fr/f%05d.jpg -i audio/mix.wav -af "volume=2dB,alimiter=limit=0.89:level=false" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest ekg-garis-layar_final.mp4
```
