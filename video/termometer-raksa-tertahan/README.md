# Video edukasi "Kenapa angka termometer air raksa tidak langsung turun?" (Reels/TikTok 1080 x 1920, 30 fps, 88,37 dtk)

> **Status:** narasi edukasi Google AI Studio (`audio/narasi-edukasi.wav`, 72,28 dtk, SHA-256 `be69e6b0...2aa0fd`) sudah dipasang dan diverifikasi terhadap naskah (kemiripan kata ASR 0,95); seluruh aksi dan label mengikuti waktu kata sebenarnya (`stage/timeline.json`, `estimated: false`). Narasi **tidak dipercepat atau diubah nadanya**. Satu catatan: ASR membaca "air raksa" sebagai "airaksa", "angka" sebagai "diangkat", "pemuaian" sebagai "pemuayan", dan "alat" sebagai "ala"; ini kesalahan pengenalan, bukan perubahan naskah. Pemeriksaan dilakukan secara terprogram; **belum ada tontonan dan dengar oleh manusia** (lihat QA.md).

Video edukasi MEDCOEL tentang mengapa termometer klinis merkuri menahan angka setelah dilepas. Fokus: panas berpindah ke wadah merkuri -> merkuri memuai -> kolom perak naik di saluran sempit -> penyempitan di atas wadah menahan hasil saat alat dilepas. Naskah dari pemesan (`stage/skrip.json`) dipertahankan kata dan urutannya sebagai takarir.

## Hasil
| Berkas | Isi |
|---|---|
| `termometer-raksa-tertahan_final.mp4` | Video jadi (H.264 + AAC, -14,3 LUFS, puncak -1,2 dBFS) |
| `cover/` | `cover.png`, area aman, potongan 3:4, pratinjau 360 px |
| `takarir.srt/.vtt` | Takarir (naskah apa adanya, waktu dari ASR; kalimat outro dari master) |
| `still/` | 24 still, `lembar-270px.png`, `awal-tengah-akhir-360px.png` |
| `SUMBER.md`, `QA.md` | Sumber fisika dan keselamatan, lisensi audio; laporan pemeriksaan |
| `stage/`, `audio/`, `rekam/`, `render.mjs`, `shot.cjs`, `buat_takarir.py`, `cover/render-cover.cjs` | Proyek yang bisa diedit |

## Peta ruang termometer (satu bentuk di semua adegan)
Wadah merkuri di **kiri**, saluran sempit ke **kanan**, penyempitan tepat di sisi kanan wadah (x = 285 di koordinat penampang), skala di sisi **atas** saluran, kolom perak naik ke **kanan**. Tampilan luar (pelat email di belakang kaca) dan penampang (kaca tembus pandang) menggambar geometri yang sama dari satu fungsi (`stage/thermo.js`); penampang hanya menampakkan interior. Merkuri digambar sebagai **perak** dalam kaca tertutup (bukan merah). Posisi ujung kolom, celah di penyempitan, dan suhu wadah berasal dari satu model (`stage/physics.js`) yang dipakai juga oleh label, skala, dan efek bunyi.

## Alur adegan (detik video = detik narasi + 0,3; waktu kata dari ASR)
| Waktu (estimasi) | Adegan |
|---|---|
| 0,0 - 7,4 | Hook: bingkai pertama = tangan Raka mengangkat termometer dari area kontak tubuh; udara sekitar mendingin (garis sejuk biru) tetapi ujung kolom perak tetap di 37,6 °C (penanda emas "angka tetap"); Raka memiringkan kepala; "SUDAH DILEPAS, KOK ANGKANYA TETAP?" |
| 7,4 - 18,0 | Termometer berputar pelan (kilau menyapu), kamera masuk ke penampang; "Dari awal: belum dipakai" (kolom di dasar skala); tetes merkuri "logam cair pada suhu ruang"; label "wadah merkuri" dan "saluran sempit" dalam satu frame |
| 18,0 - 33,0 | Area kontak tubuh menempel di wadah, panah panas; wadah menghangat (cahaya jingga), partikel merkuri bergetar lebih kuat, volume bertambah (panah mengembang), kolom didorong naik; kamera mengikuti ujung kolom; "PANAS -> MERKURI MEMUAI -> KOLOM NAIK"; garis bayangan "suhu lebih tinggi -> garis lebih jauh"; "angka = posisi ujung garis" |
| 33,0 - 46,0 | Kamera merapat ke penyempitan (3,4x): saat hangat tetes merkuri masih terdorong melewatinya; saat dilepas tubuh menjauh, wadah mendingin (meter wadah), bagian bawah kolom menyusut dan **terputus di penyempitan** sementara kolom di atas **tertahan** di 37,6 °C; "suhu tertinggi tetap bisa dibaca" |
| 46,0 - 52,0 | "Perlu diatur ulang": kolom kembali ke wadah (ilustrasi alat historis, tanpa gerak mengayun) |
| 52,0 - 65,0 | Termometer digital sebagai alternatif; kaca merkuri retak, tetesan perak jatuh dan menyebar di lantai, uap (garis abu-abu) naik, tanda bahaya; "Merkuri berbahaya jika terlepas"; Raka memilih alat bebas merkuri; "Kini ada alternatif bebas merkuri" |
| 65,0 - 72,7 | Ringkasan bergerak: tiga komponen terbang dari termometer ke tiga kartu ("MEMUAI", "NAIK", "TERTAHAN") -> "MEMUAI -> NAIK -> TERTAHAN" |
| 73,2 - 88,4 | Outro SpO₂ (komposisi, urutan web, tempo, panel, logo, URL sama): rekaman web asli `rekam/outro-web.mp4`; `medcoel-outro-master.wav` mulai 1,2 dtk setelah web terlihat; logo + "Belajar FK gratis di MEDCOEL" + medcoel.com ditahan |

## Aturan fisika dan keselamatan yang dijaga
- Merkuri memuai karena panas; saluran sempit membuat pertambahan volume terbaca sebagai gerak kolom; penyempitan menahan pembacaan maksimum setelah alat dilepas. **Kolom di atas penyempitan tidak turun** pada saat yang sama dengan klaim "hasil tertahan"; yang menyusut hanya merkuri di bawah penyempitan (digambarkan celah).
- Tidak mengklaim semua termometer kaca berisi merkuri (lihat SUMBER.md: ada cairan organik). Teks layar menyebut "termometer merkuri" untuk alat yang digambar.
- Pengaturan ulang ditampilkan singkat, berlabel "ilustrasi alat historis", tanpa gerakan mengayun dan tanpa ajakan memakai alat merkuri. Pecahnya kaca ditampilkan sebagai retak spontan pada termometer di lantai; tidak ada orang yang sengaja memecahkannya.
- Angka 37,6 °C, skala 35-42 °C, kecepatan kenaikan, dan jarak celah adalah **ilustratif**.

## Merender ulang
```bash
cd <akar repo>
bash video/termometer-raksa-tertahan/rekam/siapkan-outro.sh                  # potongan web asli -> rekam/web/ (tidak di-commit)
python3 -m http.server 8140 --bind 127.0.0.1 &
# narasi: audio/narasi-edukasi.wav (sudah dipasang)
(cd video/termometer-raksa-tertahan/audio && python3 asr.py narasi-edukasi && python3 buat_timeline.py asr.json narasi-edukasi)
(cd video/termometer-raksa-tertahan/audio && python3 build_audio.py)         # mix.wav + events.json
N=$(python3 -c "import json,math;print(math.ceil((json.load(open('video/termometer-raksa-tertahan/stage/timeline.json'))['edu_end']+0.3+0.45+1.2+10.84+3.1)*30))")
node video/termometer-raksa-tertahan/render.mjs video/termometer-raksa-tertahan/frames 0 $((N-1)) 4
ffmpeg -y -framerate 30 -i video/termometer-raksa-tertahan/frames/f%05d.jpg -i video/termometer-raksa-tertahan/audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 \
  -af "alimiter=limit=0.95:attack=2:release=50,loudnorm=I=-14:TP=-1.5:LRA=11" -shortest -movflags +faststart video/termometer-raksa-tertahan/termometer-raksa-tertahan_final.mp4
python3 video/termometer-raksa-tertahan/buat_takarir.py; node video/termometer-raksa-tertahan/cover/render-cover.cjs
```
Memeriksa bingkai: `node video/termometer-raksa-tertahan/shot.cjs "2.0,44.0" <folder>`. 

## Struktur kode (`stage/`)
`skrip.json` (naskah + jangkar kata) · `timeline.js/.json` (waktu; `audio/buat_timeline.py`) · `physics.js` (model termometer: suhu wadah, ujung kolom, celah) · `thermo.js` (gambar termometer luar/penampang) · `scenes.js` (hook, dunia termometer, label, komposisi `frame(t)`, sampul) · `scenes2.js` (perbandingan digital, ringkasan, outro) · `stage.js`. Raka dari `brand/characters/raka/raka.js` lewat `rakaSvg()`.
