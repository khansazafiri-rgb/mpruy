# Reel POV 2: "Masih di lab" (MEDCOEL Live 4D Lab)

Reel vertikal 1080 x 1920, 30 fps, 13,93 dtk, tanpa narator. Leluconnya hanya lewat teks di atas rekaman ponsel asli: teman SMA mengajak nongkrong, jawabannya "masih di lab", lalu terlihat bahwa "lab"-nya adalah Live 4D Lab di laptop.

| Berkas | Isi |
|---|---|
| `medcoel-live-4d-masih-di-lab.mp4` | Hasil akhir |
| `cover/cover.png` (1080 x 1920), `cover/cover-profil-3x4.png` (1080 x 1440, potongan tengah untuk kisi profil) | Cover vertikal |
| `edl.json`, `build.py`, `overlay/`, `audio/audio_mix.py`, `cover/` | Proyek yang bisa diedit (lihat "Merender ulang") |
| `still/` | Bingkai awal/tengah/akhir, lembar kontak, pratinjau 360 px, cover vs bingkai awal |

## Alur (musik 112 BPM, potongan jatuh pada ketukan)
| Waktu | Gambar (rekaman asli) | Teks (putih tebal, tepi hitam, tanpa kotak) | Bunyi |
|---|---|---|---|
| 0,00-6,43 | `20261111_231238.mp4` dari detik 30: meja kerja malam hari, monitor kedua menampilkan CT jantung, kedua tangan sibuk mengetik di laptop. Sudah bergerak sejak bingkai pertama | 0,25-2,35 "Temen SMA: ‘Gas nongkrong?’" (atas); 2,45-6,30 "Aku: ‘Bentar, masih di lab.’" (bawah) | Pop gelembung lembut saat tiap teks muncul |
| 5,80-6,43 | (rekaman terus berjalan) | tidak ada teks baru | Jeda komedi: musik berhenti sesaat |
| 6,43-13,93 | `20261111_231920.mp4` dari detik 10: laptop lebih dekat, tangan mengeksplor Live 4D Lab (probe bergerak di pasien 3D, panel USG dan CT berubah). Di-crop 9:16 pada layar | 6,45 "Lab-nya di laptop: / lagi ngulik simulasi USG & CT gratis / di medcoel.com 🫠" (tiga baris tampil bersamaan, di bawah layar agar tidak menutupi USG/CT) | "Ting" lembut tepat saat punchline; musik kembali pada ketukan jatuh |

Perbaikan gambar seperlunya (filter di `edl.json`): `deflicker` + `hqdn3d` ringan untuk kedipan dan noise, bayangan sedikit diangkat (`eq` gamma 1,15); suasana meja malam dengan lampu hangat dipertahankan. Rekaman tidak dipercepat atau diubah isinya.

## Sumber
Folder Drive `1Nrl_Dm3y1Je-w-fuoLnZCWUle0108zHX` (rekaman ponsel 4K HEVC, 30 fps, tersimpan landscape dengan tag rotasi 90 derajat):
- `20261111_231238.mp4` (87 dtk): pembuka, meja kerja.
- `20261111_231920.mp4` (91 dtk): punchline, laptop dekat.
- `20261111_231615.mp4`: **tidak dipakai** (laptop lebih menonjolkan Atlas 3D).
Suara asli ponsel dibuang (tanpa narator, hanya musik dan efek). Rekaman mentah (sekitar 900 MB) tidak di-commit.

## Musik dan efek bunyi (lisensi)
Semua audio **disintesis dari kode** (`audio/audio_mix.py`, numpy); tidak ada sampel, rekaman, atau musik pihak ketiga, tidak ada alarm medis atau suara dramatis.
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Masih di Lab** | Instrumental ringan 112 BPM: marimba riang, bass pluck, kick dan rim lembut, shaker, pad tipis; progresi C / Am / F / G | Dibuat untuk MEDCOEL pada sesi pembuatan video ini | CC0 1.0 (domain publik): boleh dipakai komersial dan di Instagram tanpa atribusi |
| **MEDCOEL Soft Pops** | pop gelembung (saat teks muncul) dan "ting" lonceng lembut (punchline) | idem | CC0 1.0 |
Catatan: sintesis sederhana (bukan produksi studio). Untuk trek berlisensi dari pustaka lain, ganti `audio/mix.wav`, render ulang, dan cantumkan judul serta sumber lisensinya.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &                         # untuk render teks
node video/live-4d-masih-di-lab/overlay/render-overlay.cjs             # teks layar (PNG transparan)
node video/live-4d-masih-di-lab/overlay/render-overlay.cjs cover       # teks cover (posisi aman profil 3:4)
python3 video/live-4d-masih-di-lab/audio/audio_mix.py                  # musik + efek (membaca edl.json)
python3 video/live-4d-masih-di-lab/build.py <folder-rekaman>           # -> medcoel-live-4d-masih-di-lab.mp4
python3 video/live-4d-masih-di-lab/build.py <folder-rekaman> --cover   # -> cover/cover.png
python3 video/live-4d-masih-di-lab/build.py <folder-rekaman> --still 9.0  # satu bingkai uji ke still/uji-9.00.png
```
`<folder-rekaman>` berisi dua rekaman di atas dengan nama aslinya. Mengubah isi video: edit `edl.json` (potongan, `crop`, filter, jendela teks, efek bunyi, jeda) dan teks di `overlay/overlay.html`. Teks memakai font Plus Jakarta Sans dari repo; emoji 🫠 dirender dari Noto Color Emoji.

## Hasil pemeriksaan (MP4 akhir)
- ffprobe: H.264 1080 x 1920, 30 fps, 13,93 dtk, AAC; sekitar -15,5 LUFS terintegrasi, puncak sampel -1,3 dBTP (alimiter + loudnorm).
- Bingkai pertama sudah bergerak (tangan mengetik; selisih bingkai 0 ke 10 jelas terukur). Hanya satu potongan keras (6,43 dtk, jatuh pada ketukan); tidak ada lompatan lain.
- Teks tampil satu bagian pada satu waktu: pembuka (0,25-2,35), jawaban (2,45-6,30), punchline (6,45-akhir). Tidak ada kotak, panel, atau latar teks. Teks sepanjang punchline berada di bawah layar laptop sehingga USG/CT tidak tertutup.
- Diperiksa lewat lembar kontak 3 bingkai per detik dan tampilan 360 px (`still/lembar-360px.png`, `still/awal-tengah-akhir-360px.png`, `still/cover-vs-bingkai-awal-360px.png`): "masih di lab" lalu "lab-nya di laptop" terbaca jelas, USG, CT, dan probe 3D terlihat, "medcoel.com" terbaca pada 360 px.
- Jeda komedi: musik berhenti 5,80-6,43 dtk, lalu "ting" lembut bersamaan dengan potongan dan teks punchline (6,45 dtk).

## Kekurangan yang diketahui
- Belum ditonton dengan suara menyala di ponsel; bunyi diperiksa lewat pengukuran level, gambar lewat bingkai.
- Layar laptop pada rekaman ponsel agak kecil dan hanya sebagian terlihat (crop diperbesar ke sekitar 75% lebar layar, sisi kiri model 3D terpotong), jadi detail antarmuka kecil tidak terbaca; yang terbaca adalah panel USG/CT, probe, dan label tampilan.
- Pengangkatan bayangan dan peredam kedipan seperlunya: kedipan layar dari rekaman ponsel belum hilang total, dan butiran gelap pada area tangan tetap terlihat.
- Rekaman meja dan laptop berasal dari dua pengambilan yang berbeda (posisi kamera, layar, dan tampilan aplikasi tidak persis sama); potongan sengaja jatuh pada ketukan agar terasa disengaja.
- Musik sintesis sederhana (bukan produksi studio).
