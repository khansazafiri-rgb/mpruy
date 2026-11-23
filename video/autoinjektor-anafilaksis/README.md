# Video edukasi "Cara kerja pena autoinjektor adrenalin pada anafilaksis" (Reels/TikTok 1080 x 1920, 30 fps, 76,20 dtk)

Mekanisme: anafilaksis (sel imun melepas histamin dan mediator lain) -> **pembuluh melebar dan bocor, tekanan darah turun** + **saluran napas membengkak dan otot menyempit** -> pena autoinjektor adrenalin di **sisi luar paha** -> adrenalin bekerja pada reseptor: **alfa (pembuluh), beta 2 (bronkus), beta 1 (jantung)** -> untuk anafilaksis, bukan setiap gatal/bersin; setelah dipakai tetap cari bantuan medis. Bagian edukasi 60,0 dtk (narasi Google AI Studio 59,08 dtk mulai 0,3 dtk) + **master outro MEDCOEL 16,2 dtk ditempel utuh**.

> **Batas pemeriksaan (jujur):** lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. Hasil diperiksa lewat bingkai dari MP4 akhir, ASR audio akhir, kenyaringan, deteksi hitam/beku, dan kesamaan master. **Belum ada orang yang menonton video ini dengan suara pada kecepatan normal.** Lihat `QA.md`. Ini ilustrasi fisiologi untuk edukasi, bukan panduan penggunaan, dosis, atau pengganti penilaian medis.

## Hasil
| Berkas | Isi |
|---|---|
| `autoinjektor-anafilaksis_final.mp4` | Video jadi (H.264 + AAC 48 kHz, 76,20 dtk, 2286 bingkai, -14,2 LUFS, puncak sejati -1,0 dBFS) |
| `cover/` | `cover.png` (1080 x 1920), area aman, potongan 3:4, pratinjau 360 px, `render-cover.cjs` |
| `takarir.srt/.vtt` | Takarir bagian edukasi (naskah apa adanya) |
| `still/` | 22 still dari MP4 akhir + `lembar-270px.png` |
| `NASKAH.md`, `SUMBER.md`, `QA.md` | Naskah, sumber/lisensi/peta warna, laporan pemeriksaan |
| `stage/`, `audio/`, `render.mjs`, `shot.cjs`, `gabung.sh`, `buat_takarir.py` | Proyek yang bisa diedit |

## Alur adegan (detik video = detik narasi + 0,3)
| Detik | Adegan |
|---|---|
| 0 - 7,5 | Frame pertama sudah bergerak (makan). Bentol muncul berurutan di pipi, leher, dada; gelombang suara melemah; tangan ke leher, napas cepat dan dangkal; kepala terkulai dan mata menutup; kamera mendekat. "REAKSI ALERGI BERAT?" |
| 7,5 - 16,1 | Kamera masuk ke kulit: alergen (hijau) ditangkap sel imun, butir mediator (ungu) dilepas dan bergerak ke pembuluh dan saluran napas. Legenda: bulat = histamin, belah ketupat = mediator lain. "ANAFILAKSIS", "SEL IMUN -> MEDIATOR" |
| 16,1 - 26,7 | Dua panel serentak: pembuluh melebar, sel dinding merenggang, cairan (biru muda) keluar, batang tekanan darah turun; potongan melintang saluran napas: dinding membengkak, otot menyempit, rongga mengecil, batang aliran udara turun. |
| 26,7 - 32,9 | Tubuh utuh (skala 9 px = 1 cm): pena ± 15 cm di tangan dan menyentuh sisi luar paha; sorot putus-putus di sisi luar paha; "bukan ke lengan, jantung, atau pembuluh darah". |
| 32,9 - 35,3 | Makro (diberi label "ILUSTRASI MEKANISME AUTOINJEKTOR", peta mini lokasi paha): pegas, jarum keluar otomatis, adrenalin emas masuk ke otot. |
| 35,3 - 48,3 | Tiga panel tetap: pembuluh (alfa), bronkus (beta 2), jantung (beta 1). Adrenalin emas mengalir, reseptor terisi saat disebut; satu panel menyala per efek; lalu ketiganya bersama. Keadaan awal panel = keadaan akibat di adegan sebelumnya. |
| 48,3 - 53,5 | Perbandingan: anafilaksis (napas sulit, suara berubah, hampir pingsan) vs gatal/bersin ringan (pena dicoret); "tidak semua alergi menjadi anafilaksis". |
| 53,5 - 60,0 | Bantuan medis datang; gejala mereda **bertahap** (bentol, napas, kepucatan, kepala) bukan seketika; monitor sederhana tanpa angka; "DINILAI + DIPANTAU". |
| 60,0 - 76,2 | **Master outro MEDCOEL, utuh.** |

Raka (aset asli) tampil sebagai pengamat di pita bawah layar; tokoh pasien dan petugas medis adalah tokoh lain.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8140 --bind 127.0.0.1 &
node -e "import('./video/autoinjektor-anafilaksis/stage/timeline.js').then(T=>require('fs').writeFileSync('video/autoinjektor-anafilaksis/stage/timeline.json',JSON.stringify({OFF:T.OFF,NAR:T.NAR,EDU:T.EDU,OUT:T.OUT,DUR:T.DUR,A:T.A,KAL:T.KAL},null,1)))"
python3 video/autoinjektor-anafilaksis/audio/build_audio.py
node video/autoinjektor-anafilaksis/render.mjs video/autoinjektor-anafilaksis/frames 0 1799 4
bash video/autoinjektor-anafilaksis/gabung.sh video/autoinjektor-anafilaksis/frames
python3 video/autoinjektor-anafilaksis/buat_takarir.py; node video/autoinjektor-anafilaksis/cover/render-cover.cjs video/autoinjektor-anafilaksis/cover/cover.png
```
## Struktur kode (`stage/`)
`timeline.js/.json` (jangkar kata dari ASR, takarir) · `orang.js` (tokoh orang) · `organ.js` (panel pembuluh/saluran napas/jantung + peta warna) · `scenes.js` (adegan, `frame(t)`, `cover()`) · `raka.js` (pembungkus `brand/characters/raka/raka.js`) · `lib.js`/`core.js`.
