# Video edukasi "Kenapa ada jeda setelah gelombang P?" (Reels/TikTok 1080 x 1920, 30 fps, 43,80 dtk)

Satu momen EKG: **gelombang P selesai -> garis datar sebentar (segmen PR) -> kompleks QRS**. Penonton melihat apa yang terjadi di jantung selama garis datar: impuls **melambat dan tertahan di nodus AV** sementara penunjuk waktu EKG terus melaju, bilik **terisi darah**, lalu impuls menyebar ke bilik dan QRS muncul. Bagian edukasi 27,6 dtk (narasi Google AI Studio 26,68 dtk mulai 0,3 dtk) + **master outro MEDCOEL 16,2 dtk ditempel utuh**.

> **Batas pemeriksaan (jujur):** lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. Hasil diperiksa lewat bingkai dari MP4 akhir (rapat), ASR audio akhir, kenyaringan, deteksi hitam/beku, dan kesamaan master; sinkron jantung-EKG terjamin secara struktur (satu fungsi waktu), tetapi **belum ada orang yang menonton video ini dengan suara pada kecepatan normal**. Lihat `QA.md`. Ilustrasi pendidikan, bukan diagnosis.

## Hasil
| Berkas | Isi |
|---|---|
| `ekg-jeda-pr_final.mp4` | Video jadi (H.264 + AAC 48 kHz, 43,80 dtk, 1314 bingkai, -14,3 LUFS, puncak sejati -0,9 dBFS) |
| `cover/` | `cover.png` (1080 x 1920), area aman, potongan 3:4, pratinjau 360 px, `render-cover.cjs` |
| `takarir.srt/.vtt` | Takarir bagian edukasi (naskah apa adanya) |
| `still/` | 22 still dari MP4 akhir + `lembar-270px.png` |
| `NASKAH.md`, `SUMBER.md`, `QA.md` | Naskah, sumber/aset/lisensi, laporan pemeriksaan |
| `stage/`, `audio/`, `render.mjs`, `shot.cjs`, `gabung.sh`, `buat_takarir.py` | Proyek yang bisa diedit |

## Satu acuan waktu (jantung dan EKG)
`stage/timeline.js` -> `sOf(tn)` memetakan detik narasi ke "waktu lambat" `s` milik `heart.js`. **Jantung** (`heartSvg(s)`) dan **garis EKG** (`ecgSlow(s)`) dipanggil dengan `s` yang sama pada setiap bingkai, jadi: P terbentuk saat serambi menyala kuning (tn 5,2 - 7,5); segmen PR = penunjuk bergerak di garis datar (tn 7,5 - 19,6, kecepatan tetap) sementara titik impuls tertahan dan berdenyut di nodus AV (s 21,0 - 23,3 -> tn ± 10,0 - 14,7) lalu melanjutkan ke berkas His; bilik terisi darah (tn 12,4 - 18,4); aktivasi bilik jingga dan QRS pada grafik mulai bersamaan (tn 19,6 - 21,4, puncak R di tn 20,4); kontraksi mekanis bilik menyusul sesudahnya (tn 21,5+).

## Alur adegan (detik video = detik narasi + 0,3)
| Detik | Adegan |
|---|---|
| 0 - 3,9 | **Hook:** garis EKG sudah terbentuk, P selesai, penunjuk terus bergerak di ruas datar; jantung kecil dengan impuls; Raka di depan monitor mengikuti garis dengan jarinya, lalu berpikir. "KOK SETELAH P GARISNYA DATAR?" |
| 3,9 - 8,1 | Jantung besar; nodus sinus menyala, impuls menyebar di serambi (kuning) dan P digambar bersamaan. "SERAMBI -> P" |
| 8,1 - 14,7 | Kamera mendekat ke nodus AV (lingkaran halus); impuls melambat dan berdenyut di sana; pita "SEGMEN PR" pada grafik; penunjuk terus melaju. "IMPULS MELAMBAT DI NODUS AV", "SEGMEN PR = JEDA", catatan "impuls masih bergerak, hanya tertahan sejenak". |
| 14,6 - 18,5 | Serambi menyelesaikan kontraksinya, titik darah mengalir ke bilik, tingkat darah di bilik naik; label "GERAK DIPERLAMBAT". "JEDA = BILIK TERISI DARAH" |
| 18,6 - 22,0 | Impuls menyebar lewat berkas ke bilik (jingga) dan QRS muncul sinkron; kontraksi menyusul. "BILIK -> QRS" |
| 22,0 - 27,6 | Putar ulang singkat P -> segmen PR -> QRS dengan pita PR disorot; Raka kembali dan menunjuk ruas datar, lalu tersenyum; "DATAR ≠ JANTUNG BERHENTI". |
| 27,6 - 43,8 | **Master outro MEDCOEL, utuh.** |

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8140 --bind 127.0.0.1 &
node -e "import('./video/ekg-jeda-pr/stage/timeline.js').then(T=>require('fs').writeFileSync('video/ekg-jeda-pr/stage/timeline.json',JSON.stringify({OFF:T.OFF,NAR:T.NAR,EDU:T.EDU,OUT:T.OUT,DUR:T.DUR,A:T.A,KAL:T.KAL},null,1)))"
python3 video/ekg-jeda-pr/audio/build_audio.py
node video/ekg-jeda-pr/render.mjs video/ekg-jeda-pr/frames 0 827 4
bash video/ekg-jeda-pr/gabung.sh video/ekg-jeda-pr/frames
python3 video/ekg-jeda-pr/buat_takarir.py; node video/ekg-jeda-pr/cover/render-cover.cjs video/ekg-jeda-pr/cover/cover.png
```
## Struktur kode (`stage/`)
`timeline.js/.json` (jangkar kata ASR, takarir, `sOf`) · `heart.js` (salinan aset jantung/EKG + tambahan) · `scenes.js` (hook, utama, penutup, `ecgPanel`, `heartCard`, `cover()`) · `raka.js` tidak disalin: dipanggil langsung dari `brand/characters/raka/raka.js` · `lib.js`/`core.js`.
