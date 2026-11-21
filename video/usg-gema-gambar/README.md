# Video edukasi "Bagaimana USG membentuk gambar dari pantulan suara?" (Reels/TikTok 1080 x 1920, 30 fps, 67,20 dtk)

Video edukasi + promosi MEDCOEL. Pesan utama: **menggeser probe mengubah bidang yang dipindai; USG sungguhan menyusun gambar dari gema suara (bukan kamera, bukan sinar X)**.
Penonton melihat urutan **probe -> pulsa -> gema -> gambar** dengan arah tetap: probe di atas, gel di antara probe dan kulit, jaringan makin dalam ke bawah, pulsa keluar **emas ke bawah**, gema kembali **sian ke atas**.

> **Batas pemeriksaan (jujur):** lingkungan pembuat video ini tidak bisa memutar video bersuara pada kecepatan normal. Hasil diperiksa lewat bingkai (still dari berkas MP4 akhir, bukan bingkai sumber), kontak sheet, ASR audio akhir, ukuran kenyaringan, dan deteksi hitam/beku. Lihat `QA.md`. **Belum ada orang yang menonton video ini dengan suara pada kecepatan normal.**

## Hasil
| Berkas | Isi |
|---|---|
| `usg-gema-gambar_final.mp4` | Video jadi (H.264 + AAC 48 kHz, 67,20 dtk, -14,2 LUFS, puncak sejati -1,3 dBFS) |
| `cover/` | `cover.png` (1080 x 1920), `cover-panduan-area-aman.png`, `cover-potong-3x4.png`, `cover-pratinjau-360px.png`, `render-cover.cjs` |
| `takarir.srt/.vtt` | Takarir (naskah apa adanya; waktu kata dari ASR audio asli) |
| `still/` | 22 still dari MP4 akhir + `lembar-270px.png` |
| `NASKAH.md`, `SUMBER.md`, `QA.md` | Naskah, sumber/lisensi/bahan, laporan pemeriksaan |
| `stage/`, `audio/`, `rekam/`, `render.mjs`, `shot.cjs`, `buat_takarir.py`, `cover/render-cover.cjs` | Proyek yang bisa diedit (panggung SVG + kanvas, pembuat audio, perekam Live 4D Lab, pengolah outro) |

Durasi mengikuti audio akhir: narasi edukasi 50,76 dtk (mulai 0,3 dtk) + jeda + audio outro baru 10,36 dtk (mulai di 52,5 dtk) + logo/URL ditahan sampai 67,2 dtk. Tidak ada audio yang dipercepat, diperlambat, atau dipotong.

## Alur adegan (detik video = detik narasi + 0,3; waktu kata dari ASR, lihat `stage/timeline.js`)
| Waktu | Adegan |
|---|---|
| 0,0 - 7,8 | **Hook, rekaman ASLI Live 4D Lab:** probe digeser/dimiringkan dengan klik sungguhan pada kontrol "Gerakkan probe"; kanvas pasien 3D (probe di tubuh) dan kanvas monitor USG tampil besar bersamaan; teks "KOK GESER PROBE, GAMBARNYA BERUBAH?"; label "Simulasi edukatif, bukan alat diagnosis". Gerak dimulai dari bingkai pertama. |
| 7,7 - 10,7 | Transisi: rekaman web memudar, label "ILUSTRASI: ALAT USG SUNGGUHAN", Raka (asli, tegak) mengamati. Jelas bahwa yang berikut adalah ilustrasi mekanisme, bukan ujian nyata. |
| 8,7 - 14,8 | **Gel:** penampang mikro di titik kontak; udara menahan gelombang di celah; gel mengisi celah tepat di titik kontak; kamera mengikuti jalur gelombang ke bawah. Teks "GEL MEMBANTU SUARA MASUK". |
| 14,9 - 25,2 | **Pulsa -> gema:** SATU pulsa meninggalkan probe, mencapai SATU batas jaringan, sebagian memantul, kamera ikut keluar-pulang; probe yang sama menangkap gema (probe berpendar); lalu beberapa pulsa lain. Legenda panah: pulsa keluar (bawah), gema kembali (atas). |
| 25,2 - 31,5 | **Waktu gema = kedalaman:** penampang di atas, hasil USG di bawah; gema dari batas dekat kembali lebih cepat -> titik dangkal; gema dari batas dalam lebih lama -> titik lebih dalam; kekuatan -> kecerahan. |
| 31,5 - 36,0 | **Banyak garis -> satu gambar:** garis pemindaian menyapu sektor; B-mode tersusun garis demi garis. |
| 36,8 - 46,8 | **Geser/miring:** probe bergeser dan dimiringkan; irisan di penampang dan gambar di layar berubah BERSAMAAN. "BUKAN KAMERA". |
| 46,8 - 51,5 | **Kembali ke Live 4D Lab asli:** probe dan gambar bergerak bersama; "SUARA -> GEMA -> GAMBAR"; label simulasi tetap; keterangan "kembali ke simulasi MEDCOEL". |
| 51,5 - 67,2 | **Outro baru** (audio `outro-baru.wav`): Atlas 3D (rekaman asli) -> Live 4D Lab (rekaman asli saya, probe bergerak, gambar berubah, label simulasi) -> materi per bab -> latihan soal + pembahasan -> Simulasi Dokter (rekaman web asli, "tampilan dipercepat") -> logo asli + "BELAJAR FK GRATIS" + "medcoel.com" + Raka, ditahan. |

## Aturan akurasi yang dijaga
- Live 4D Lab adalah **simulasi edukatif**, bukan data pasien dan bukan alat diagnosis (`apps/4d-lab/README.md`); label itu terlihat setiap kali rekaman web tampil, dan bagian ilustrasi bertanda "Ilustrasi cara kerja USG · bukan citra pasien". Video tidak mengklaim gambar di web dibuat oleh probe fisik.
- Fisika klinis mengikuti NIBIB dan RadiologyInfo (SUMBER.md): probe memancar dan menerima, gema dari batas jaringan, jarak dihitung dari waktu gema dan kecepatan suara, gel menyingkirkan kantong udara, tanpa radiasi.
- Kecepatan pulsa di animasi **diperlambat secara ilustratif** (agar bisa diikuti mata); kedalaman, jarak, dan bentuk irisan ilustratif. Model penampang dan citra B-mode di animasi memakai model jaringan yang sama (impedans -> pantulan, speckle, pelemahan terhadap kedalaman).
- Tidak ada kamera di ujung probe dan tidak ada klaim sinar X. "Ping" pada audio hanya gaya.

## Merender ulang
```bash
cd <akar repo>
bash video/usg-gema-gambar/rekam/siapkan-outro.sh                 # potongan web asli outro -> rekam/outro-web.mp4 + rekam/web/ (web/ tidak di-commit)
# Rekaman Live 4D Lab asli (butuh: npm ci && npm run build --prefix apps/4d-lab):
node video/usg-gema-gambar/rekam/serve-lab.mjs &                   # server statis 4190
for t in hook akhir outro; do node video/usg-gema-gambar/rekam/lab.cjs $t video/usg-gema-gambar/rekam/lab/$t; done   # ~3 dtk per bingkai; lab/ tidak di-commit
python3 -m http.server 8140 --bind 127.0.0.1 &
node -e "import('./video/usg-gema-gambar/stage/timeline.js').then(T=>require('fs').writeFileSync('video/usg-gema-gambar/stage/timeline.json',JSON.stringify({OFF:T.OFF,EDU_END:T.EDU_END,O0:T.O0,MASTER_AT:T.MASTER_AT,MASTER_LEN:T.MASTER_LEN,DUR:T.DUR,A:T.A,KAL:T.KAL,OUT_CAPS:T.OUT_CAPS},null,1)))"
python3 video/usg-gema-gambar/audio/build_audio.py                  # mix.wav + events.json
node video/usg-gema-gambar/render.mjs video/usg-gema-gambar/frames 0 2015 4
ffmpeg -y -framerate 30 -i video/usg-gema-gambar/frames/f%05d.jpg -i video/usg-gema-gambar/audio/mix.wav -af "alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11" \
  -ar 48000 -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest -movflags +faststart video/usg-gema-gambar/usg-gema-gambar_final.mp4
python3 video/usg-gema-gambar/buat_takarir.py; node video/usg-gema-gambar/cover/render-cover.cjs
```
Memeriksa satu bingkai: `node video/usg-gema-gambar/shot.cjs "9.0,28.3" <folder>`. Bingkai mentah, rekaman kanvas Live 4D Lab, dan `mix.wav` tidak di-commit (besar; bisa dibuat ulang). Manifes klik tiap take ada di `rekam/manifes/`.

## Struktur kode (`stage/`)
`timeline.js/.json` (jangkar kata dari ASR, takarir, kata outro) · `scenes.js` (semua adegan, `frame(t)`, `cover()`) · `body.js` (model jaringan + penampang + renderer B-mode) · `stage.js` (menggambar SVG, kanvas B-mode, kanvas web) · `raka.js` (pembungkus `brand/characters/raka/raka.js`, tidak digambar ulang) · `lib.js`/`core.js` (utilitas).
