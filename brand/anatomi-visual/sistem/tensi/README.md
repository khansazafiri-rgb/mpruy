# Video "Tensi rendah, terutama pada perempuan" (80,6 dtk, 1080 x 1920, 30 fps)

Animasi dihasilkan dari kode (SVG per bingkai, dirender Chromium, dienkode ffmpeg). Narasi: berkas WAV Google AI Studio yang diberikan pemesan (78,4 dtk), tidak dipercepat; naskah tidak diubah (kata dan urutan sama, takarir di layar = naskah persis).

## Tokoh
**Tala** (`brand/characters/teman/teman.js`, `temanSvg`), mahasiswi teman Raka, dipakai apa adanya (README tokoh melarang menggambar manusia baru; Raka tidak diubah menjadi perempuan). Hanya gerak yang disusun di sini (`tala.mjs`: kunci pose, `lerpTeman`, lengan menuju meja dengan perhitungan balik bob/condong). Kaki memakai `legs.sit` dari rig Raka untuk duduk tampak depan.

## Alur (satu peristiwa, kamera mengikuti)
| Waktu | Isi |
|---|---|
| 0-7 | Tala sudah bergerak di bingkai pertama: bangkit dari kursi, pandangan menggelap (POV kabur beberapa detik lalu menggelap), goyah, berpegangan pada meja. |
| 7-12 | Badan menjadi tembus pandang; darah berkumpul di kaki dan perut (vena melebar dan gelap, aliran melambat, panah gravitasi). |
| 12-19 | Aliran balik ke jantung turun (vena kava bawah jarang), tekanan turun, aliran karotis ke otak turun (otak memudar, bintang pusing). |
| 19-30 | Sensor di sinus karotis dan lengkung aorta menyala, sinyal saraf ke batang otak, lalu ke jantung dan pembuluh: denyut lebih cepat, pembuluh menyempit, pooling berkurang, aliran otak pulih. |
| 30-34 | Respons terlambat: sinyal lambat, pooling dan penurunan aliran otak kambuh, Tala goyah dan mata menutup. |
| 34-40 | Penyebab sebagai perubahan pada sistem yang sama: volume darah turun (kurang cairan), tonus pembuluh turun (obat), darah keluar (kehilangan darah). Indikator volume muncul. |
| 40-55 | Perempuan: rahim; kehamilan (rahim membesar, pembuluh melebar/rileks, kartu penampang pembuluh + dial tekanan lebih rendah); haid sangat banyak (tetes keluar, volume darah turun, tekanan turun). |
| 55-63 | Kartu terpisah: tekanan rendah (volume darah berkurang) tidak sama dengan anemia (sel darah merah berkurang, tekanan normal, Tala pusing). |
| 63-69 | Tala duduk kembali; tensimeter hanya 64,25-68,5 dtk (4,25 dtk); angka kecil di layar alat disertai catatan "Satu angka belum menentukan penyebab atau tingkat keparahan". |
| 69-72 | Gejala (bintang pusing) dan penyebab (ikon cairan, obat, darah). |
| 72-78 | Tala aman duduk; tanda bahaya satu per satu: pingsan, perdarahan banyak, pusing berat dan menetap, lalu "Segera cari pertolongan medis". |
| 78,4-80,6 | Kartu penutup: logo MEDCOEL (hanya di sini; tidak ada logo di bagian lain). |

## Berkas
| Berkas | Fungsi |
|---|---|
| `../scenes/tensi.mjs` | Adegan: kamera, koreografi, label per fase, kartu, tensimeter, penutup. `frame(t)` menghasilkan SVG. |
| `waktu.mjs` | Waktu kalimat narasi (diselaraskan dari jeda senyap dan jumlah suku kata, ketelitian sekitar 0,2 dtk; batas frasa di dalam kalimat diperkirakan) dan teks takarir. `selaraskan-narasi.py`, `waktu-narasi.json` = keluaran penyelarasan. |
| `negara.mjs` | Keadaan fisiologi skematis sebagai fungsi waktu (pooling, aliran balik, tekanan, aliran otak, volume, tonus, sensor, sinyal, denyut, rahim, kehamilan, haid). Satu sumber untuk gambar dan audio. Fase aliran diintegralkan sehingga kecepatan berubah mulus. |
| `anatomi.mjs` | Anatomi di dalam tubuh Tala (jantung v7 tidak diubah; pembuluh, otak, sensor, saraf, rahim digambar di sini). Arah aliran: arteri meninggalkan jantung, vena menuju jantung. |
| `tala.mjs`, `ruang.mjs`, `ui.mjs`, `util.mjs` | Gerak Tala, meja dan kursi, unsur layar (chip, takarir, indikator, dial, kartu), alat gambar. |
| `audio.py`, `denyut.json` | Musik pelan (60 bpm), SFX (hanya perubahan posisi/aliran dan saat pandangan menggelap, manset), denyut jantung mengikuti `negara`, narasi dominan dengan ducking. |
| `render.mjs`, `periksa-label.mjs` | Render bingkai (`still`, `bingkai`), pemeriksaan label (maks 3 serempak, tidak keluar layar, tidak saling menimpa). |

## Membuat ulang
```bash
node brand/anatomi-visual/sistem/tensi/render.mjs bingkai <dir> 0 605 &   # bagi 0-2418 menjadi 4 potong paralel
python3 brand/anatomi-visual/sistem/tensi/audio.py <narasi.wav> <campur.wav>
ffmpeg -framerate 30 -i <dir>/f%05d.png -i <campur.wav> -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -shortest -movflags +faststart tensi-rendah.mp4
```

## Yang skematis atau belum tervalidasi
- Semua anatomi di luar jantung v7 adalah skema dalam badan kartun Tala (proporsi kepala besar): letak sinus karotis, lengkung aorta, saraf, vena, usus, rahim, janin, dan jarak antarstruktur tidak diukur dari atlas dan belum diverifikasi. Jantung v7 tampak depan dipakai kecil di dada; kecocokan dengan tubuh hanya skematis.
- Kurva fisiologi (`negara.mjs`) menggambarkan arah perubahan, bukan data pengukuran. Aliran otak "turun" digambarkan sebagai perubahan kepadatan dan kecepatan partikel, bukan seluruh darah meninggalkan otak.
- Pemisahan "tekanan rendah" dan "anemia" adalah ilustrasi konsep; tidak semua yang haid digambarkan bertekanan rendah (hanya haid sangat banyak, dan kartu anemia menegaskan tekanan bisa normal).
- Tidak ada sumber literatur yang dibuka untuk video ini; isi mengikuti naskah yang diberikan. Naskah belum ditinjau tenaga medis.
- Penyelarasan narasi dengan visual memakai deteksi jeda senyap dan jumlah suku kata (pengenalan suara tidak tersedia di lingkungan ini); batas kalimat cukup tepat, batas frasa di dalam kalimat sekitar +-0,2 dtk.

## Hasil pemeriksaan (video `../out/tensi-rendah.mp4`, 80,6 dtk, H.264 + AAC, 30 fps)
- Bingkai pertama sudah bergerak (Tala setengah berdiri, mendorong dari kursi; selisih bingkai 0 ke 10 = 8,4 dari 255 pada skala abu-abu).
- Tensimeter tampak 64,25-68,5 dtk (4,25 dtk); angka kecil di layar alat dan disertai catatan konteks.
- Label: maksimum 3 serempak, tidak ada yang keluar layar atau saling menimpa (`node tensi/periksa-label.mjs`). Pada lebar 360 px (`../out/tensi-kontak-360px.png`) label dan takarir terbaca; teks indikator kecil (sekitar 10 px).
- Lompatan antar-bingkai: setelah perbaikan, selisih tertinggi 18 dari 255 (pembukaan pandangan setelah gelap dan gerak kamera 1 dtk), tanpa lonjakan tunggal.
- Audio: narasi dominan (sekitar -26 dBFS RMS), musik dan SFX sekitar -41 dBFS; keluaran dinormalkan ke -14 LUFS (puncak sampel sekitar -1,3 dB).
- Still: `../out/tensi-still-1..7-*.png` (pembuka, darah berkumpul, kompensasi, kehamilan, haid sangat banyak, anemia vs tensi rendah, penutup).

## Kekurangan yang diketahui
- Bingkai pertama tidak memperlihatkan gerak bangkit sejelas awal sesudahnya karena rig duduk tampak depan hanya memakai perpindahan pinggul dan kaki (tanpa condong ke depan).
- Dalam tampak tembus, wajah, otak, dan pembuluh leher saling menumpuk di kepala besar Tala; label menjaga keterbacaan tetapi anatomi kepala sangat disederhanakan.
- Bagian atas anatomi bergoyang bersama badan Tala, sedangkan pembuluh tungkai tetap; sambungan di panggul tampak menyatu hanya karena titik putar sama.
- Indikator "Tekanan" dan "Aliran ke otak" adalah batang skematis tanpa angka, bukan pengukuran.
