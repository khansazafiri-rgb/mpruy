# Bagaimana satu tetes darah bisa menghasilkan angka Hb?
Video edukasi vertikal MEDCOEL (1080x1920, 30 fps, 101,1 dtk): SpO₂ normal tetapi Hb rendah -> proporsi vs kadar hemoglobin -> tetes darah masuk mikrokuvet (kapiler) -> reagen membuka sel dan mengubah Hb -> cahaya melewati SAMPEL (bukan jari) pada dua panjang gelombang -> kadar Hb g/dL -> kegunaan dan batas -> ringkasan "PROPORSI ≠ KADAR". Contoh alat: HemoCue Hb 201+ (bukan semua alat). Narasi Google AI Studio asli (85,52 dtk) + outro baku SpO₂ (web asli + master suara yang sama persis).

**Hasil**: `hb-satu-tetes_final.mp4` · cover `cover/cover.png` · takarir `takarir.srt/.vtt` · `NASKAH.md` · `SUMBER.md` · `QA.md` · cuplikan `still/`.

## Struktur (dapat diedit)
- `stage/art.js` — hemoglobin (tetramer), sel darah merah, tetes, mikrokuvet (satu geometri), alat pembaca, kartu hasil. Kode warna tetap: SDM koral, Hb merah tua, Hb+O₂ merah cerah, tanpa O₂ ungu, reagen 1 mint, reagen 2 biru, bentuk terukur ambar, cahaya panjang gelombang 1 kuning-hijau dan 2 ungu (warna cahaya ilustratif).
- `stage/scenes.js` — adegan A-I + outro. `tools/build_cues.py` -> `cues.json`. `audio/audio_mix.py` — suara/musik/SFX tiga jalur.
## Membuat ulang
```
python3 -m http.server 8135   # dari akar repo
bash video/hb-satu-tetes/rekam/siapkan-outro.sh
python3 video/hb-satu-tetes/tools/build_cues.py && python3 video/hb-satu-tetes/audio/audio_mix.py
node video/hb-satu-tetes/render.mjs video/hb-satu-tetes/out/fr 0 3032 4
ffmpeg -framerate 30 -i out/fr/f%05d.jpg -i audio/mix.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest hb-satu-tetes_final.mp4
```
