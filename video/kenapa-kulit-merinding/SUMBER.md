# Sumber dan asal-usul
## Audio
| Berkas | Asal | Lisensi / catatan |
|---|---|---|
| `audio/narasi-edukasi.wav` | Narasi Google AI Studio dari pemesan (`Generated_Audio_November_28_2026_-_8_18PM.wav`), 24 kHz mono, 52,94 dtk. Tempo dan nada tidak diubah; di-resample ke 48 kHz stereo dan dinormalkan statis. Berkas-berkas WAV yang dikirim lebih dulu (7_12PM dan 7_28PM) berisi narasi lain (kesemutan) dan TIDAK dipakai. ASR (faster-whisper) hanya menafsirkan "Apa ya menariknya" dan beberapa istilah ("arrector"), takarir memakai ejaan naskah. | Dari pemesan. |
| `brand/video/outro/medcoel-outro-master.mp4` | Master outro baku MEDCOEL (16,20 dtk), ditempel utuh dengan re-encode sesuai README master. | Aset MEDCOEL. |
| `audio/stem-*.wav` (tidak di-commit; dibuat ulang `audio/audio_mix.py`) | Musik (pad + pluck) dan efek halus (angin kecil di awal, denting sinyal, isyarat otot memendek, peralihan) disintesis dari kode (numpy/scipy). Daftar efek + waktu: `audio/events.json`. | **CC0 1.0**, tanpa sampel pihak ketiga; aman untuk promosi Instagram/TikTok. |
## Gambar
Semua dari kode (`stage/*.js`). Raka hanya lewat `rakaSvg()` (`brand/characters/raka/raka.js`), lengan dan tangan memakai rig asli (tidak dibesarkan; kulit lengan diperlihatkan lewat lensa karena lengan baju Raka tidak diubah). Penampang kulit, folikel, otot, saraf, kucing, panel bulu, dan inset pembuluh digambar skematis. Logo `apps/web/src/assets/logo-full.webp`. Font dari `video/kopi-kafein-adenosin/stage/fonts`.
## Sumber isi — BELUM TERVERIFIKASI
Pemesan menyebut dua rujukan:
- NIH Research Matters, "What goosebumps are" (nih.gov/news-events/nih-research-matters/what-goosebumps-are)
- StatPearls/NCBI Bookshelf NBK470321 (ncbi.nlm.nih.gov/books/NBK470321/)

**Kedua halaman TIDAK dapat dibuka** dari lingkungan pembuatan (nih.gov: diblokir Cloudflare 403; ncbi.nlm.nih.gov: tantangan reCAPTCHA; Europe PMC dan arsip web juga gagal). Isi video mengikuti naskah pemesan (rantai: dingin -> sinyal -> saraf simpatik -> otot arrector pili berkontraksi -> rambut tegak -> kulit terangkat; merinding bukan mekanisme utama penghangat pada manusia) dan pengetahuan umum fisiologi kulit, **bukan** dari pembacaan kedua halaman itu. **Mohon verifikasi manusia terhadap kedua sumber sebelum publikasi.**
