# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi Google AI Studio dari pemesan (`Generated_Audio_November_23_2026_-_7_49AM.wav`), 24 kHz mono, 29,40 dtk. Tempo dan nada tidak diubah; di-resample ke 48 kHz stereo dan dinormalkan statis. Isi cocok dengan transkrip pemesan (ASR hanya salah dengar "varises" -> "varices", "melemah" -> "melema"). | Dari pemesan. |
| `brand/video/outro/medcoel-outro-master.mp4` | Master outro baku MEDCOEL di repo (16,20 dtk), ditempel utuh dengan re-encode sesuai README master. | Aset MEDCOEL. |
| `audio/stem-*.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Musik (pad + pluck) dan efek kecil (katup menutup, aliran balik terungkap, peralihan) disintesis dari kode (numpy/scipy). Tanpa alarm atau bunyi jantung. | **CC0 1.0**; aman untuk promosi Instagram/TikTok. Daftar efek + waktu: `audio/events.json`. |
## Gambar
Semua dari kode (`stage/*.js`). Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`) dengan `raka('kaget'|'menunjuk'|'senang'|'khawatir', ...)`. Vena, katup, sel darah, model kaki digambar skematis (ilustrasi edukatif, bukan citra pemeriksaan pasien). Logo `apps/web/src/assets/logo-full.webp`. Font `video/kopi-kafein-adenosin/stage/fonts`. Gaya diacu dari `video/kopi-kafein-adenosin/kopi-kafein-adenosin_final.mp4` (frame 0, 1, 2,5, 8, 15, 25, 35, 45 dilihat).
## Sumber isi (dibuka 2026-11-23)
- **NHLBI, Varicose Veins** (nhlbi.nih.gov/health/varicose-veins): vena punya katup yang membuka dan menutup untuk menjaga darah mengalir ke jantung; bila katup lemah/rusak darah dapat mengalir mundur; vena melebar/berkelok tampak di bawah kulit.
- **MedlinePlus, Varicose Veins** (medlineplus.gov/varicoseveins.html): katup membantu menjaga aliran ke jantung; bila lemah atau rusak, darah dapat berbalik dan berkumpul di vena; vena yang berkelok terlihat tepat di bawah kulit.
Video tidak menyebut faktor risiko, gejala, atau pengobatan, dan tidak menggambar sumbatan atau bekuan darah.
