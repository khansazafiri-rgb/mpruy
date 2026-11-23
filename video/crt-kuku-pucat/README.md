# Video edukasi "Capillary refill time (CRT): kenapa kuku memutih saat ditekan?" (Reels/TikTok 1080 x 1920, 30 fps, 55,83 dtk)

Urutan yang diajarkan: **tekan -> kuku memutih (darah terdorong keluar dari jaringan di bawah kuku) -> lepas -> timer mulai tepat saat tekanan benar-benar lepas -> warna kembali (darah mengisi pembuluh kecil) -> timer berhenti**. Warna kembali sekitar 2 detik atau kurang adalah **acuan umum**; waktu lebih lambat harus dibaca bersama kondisi dan tanda klinis lain (suhu dingin, cara pemeriksaan, dst.). Penutup: "SATU PETUNJUK, BUKAN DIAGNOSIS". Bagian edukasi 39,63 dtk (narasi Google AI Studio 38,72 dtk mulai 0,3 dtk) + **master outro MEDCOEL 16,2 dtk ditempel utuh**.

> **Batas pemeriksaan (jujur):** lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. Hasil diperiksa lewat bingkai dari MP4 akhir, ASR audio akhir, kenyaringan, deteksi hitam/beku, dan kesamaan master. **Belum ada orang yang menonton video ini dengan suara pada kecepatan normal.** Lihat `QA.md`. Ini ilustrasi edukasi, bukan panduan klinis atau pengganti penilaian tenaga kesehatan.

## Hasil
| Berkas | Isi |
|---|---|
| `crt-kuku-pucat_final.mp4` | Video jadi (H.264 + AAC 48 kHz, 55,83 dtk, 1675 bingkai) |
| `cover/` | `cover.png` (1080 x 1920), area aman, potongan 3:4, pratinjau 360 px, `render-cover.cjs` |
| `takarir.srt/.vtt` | Takarir bagian edukasi (naskah apa adanya) |
| `still/` | Still dari MP4 akhir + lembar kontak |
| `NASKAH.md`, `SUMBER.md`, `QA.md` | Naskah, sumber/lisensi/batas klaim, laporan pemeriksaan |
| `stage/`, `audio/`, `render.mjs`, `shot.cjs`, `gabung.sh`, `buat_takarir.py` | Proyek yang bisa diedit |

## Alur adegan (detik video = detik narasi + 0,3)
| Detik | Adegan |
|---|---|
| 0 - 7 | Hook "KOK KUKU JADI PUTIH?" bergerak sejak bingkai 0: Raka menunjuk, jari pemeriksa menekan kuku di lensa pembesar (diberi label "ilustrasi edukatif (perbesaran)"); kamera masuk ke jari. Kuku memutih saat ditekan; "LEPAS -> MULAI HITUNG": klik tepat saat lepas, timer jalan, warna menyapu dari pangkal kuku, timer berhenti tepat saat pulih. |
| 7 - 11 | "CAPILLARY REFILL TIME" lalu "CRT = WAKTU WARNA KEMBALI SETELAH DITEKAN"; langkah TEKAN -> LEPAS -> HITUNG -> WARNA PULIH; pembuluh kecil di bawah kuku = kapiler. |
| 11 - 20 | Dua kartu serentak: kuku (tampak atas) dan penampang samping berlabel "DITEKAN" / "DILEPAS". Hanya jaringan di bawah kuku yang tertekan yang kehilangan darah; saat lepas, darah mengisi pembuluh lagi dan warna kembali. |
| 20,3 - 26,9 | "SEKITAR 2 DETIK ATAU KURANG" (acuan umum, bukan jaminan) lalu contoh pengisian lebih lambat "LEBIH LAMBAT? LIHAT KONTEKSNYA" (ilustrasi, tanpa nama penyakit). |
| 26,9 - 32,6 | "SUHU, USIA, CARA PEMERIKSAAN": dingin menyempitkan pembuluh sehingga aliran melambat; timer 4,4 dtk "LEBIH LAMBAT". |
| 32,6 - 39,6 | Raka menutup: "ANGKA 2 DETIK = PETUNJUK AWAL", kartu "KONDISI PASIEN / SUHU & LINGKUNGAN / TANDA KLINIS LAIN" (tanpa angka pasien), "SATU PETUNJUK, BUKAN DIAGNOSIS". |
| 39,6 - 55,8 | **Master outro MEDCOEL, utuh.** |

Satu fungsi waktu `crt(tn)` (`stage/timeline.js`) menggerakkan tekanan jari, lepasnya jari, pengisian pembuluh (warna kuku, lebar dan aliran sel darah), dan timer, sehingga semua tampilan selalu konsisten. Audio: musik latar lembut + klik halus saat lepas + tik timer yang berhenti tepat saat warna kembali (sintesis sendiri, CC0).

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8140 --bind 127.0.0.1 &
node -e "import('./video/crt-kuku-pucat/stage/timeline.js').then(T=>require('fs').writeFileSync('video/crt-kuku-pucat/stage/timeline.json',JSON.stringify({OFF:T.OFF,NAR:T.NAR,EDU:T.EDU,OUT:T.OUT,DUR:T.DUR,A:T.A,KAL:T.KAL},null,1)))"
python3 video/crt-kuku-pucat/audio/build_audio.py
node video/crt-kuku-pucat/render.mjs video/crt-kuku-pucat/frames 0 1188 4
bash video/crt-kuku-pucat/gabung.sh video/crt-kuku-pucat/frames
python3 video/crt-kuku-pucat/buat_takarir.py; node video/crt-kuku-pucat/cover/render-cover.cjs video/crt-kuku-pucat/cover/cover.png
```
## Struktur kode (`stage/`)
`timeline.js/.json` (jangkar kata dari ASR, takarir, model waktu `crt`) · `hand.js` (jari kartun, kuku, jari pemeriksa) · `anat.js` (penampang dasar kuku) · `scenes.js` (adegan, `frame(t)`, `cover()`) · Raka dari `brand/characters/raka/raka.js` · `lib.js`/`core.js`.
