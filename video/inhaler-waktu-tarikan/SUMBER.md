# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi Google AI Studio yang diunggah pemesan (`Generated_Audio_November_21_2026_-_9_28AM.wav`), 24 kHz mono, 52,20 dtk. Tempo dan nada tidak diubah; di-resample ke 48 kHz stereo dan dinormalkan statis. | Dari pemesan. |
| `brand/video/outro/medcoel-outro-master.mp4` | Master outro baku MEDCOEL di repo (16,20 dtk; gambar, suara, musik, logo, URL sudah termasuk). Ditempel utuh (re-encode sesuai README master), tanpa tambahan. | Aset MEDCOEL. |
| `audio/stem-musik.wav`, `stem-sfx.wav`, `stem-suara.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Musik (pad + pluck, 100 BPM) dan SFX (desis semprotan, klik, pop label, tik partikel) disintesis dari kode (numpy/scipy). | **CC0 1.0**, tanpa sampel/musik pihak ketiga; aman untuk promosi Instagram/TikTok. Daftar efek+waktu: `audio/events.json`. |
## Gambar
Semua dari kode (`stage/scenes.js`). Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`); inhaler, jari, saluran napas, otot, reseptor digambar skematis. Logo `apps/web/src/assets/logo-full.webp`. Font `video/kopi-kafein-adenosin/stage/fonts`.
## Sumber isi
- **NHLBI/NIH, cara memakai inhaler dosis terukur (PDF)** dan **MedlinePlus a601172 (albuterol inhalation)**, **DailyMed albuterol (setid 489201d2-…)**: dipakai untuk urutan umum MDI (tabung ditekan melepas satu dosis terukur, tarik napas perlahan), salbutamol/albuterol sebagai agonis beta-2 yang melemaskan otot saluran napas, dan pesan "ikuti petunjuk pada alat dan tenaga kesehatan".
- Hanya inhaler dosis terukur TANPA spacer yang digambar sebagai prosedur. Bubuk kering dan spacer hanya muncul sebagai kartu "cara pakai berbeda", tanpa generalisasi teknik.
