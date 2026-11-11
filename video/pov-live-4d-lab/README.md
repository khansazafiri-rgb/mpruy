# Reel POV: "Baru nemu web belajar FK GRATIS" (Live 4D Lab) (1080 x 1920, 30 fps, 17,45 dtk)

Reel gaya POV penemuan website, dari **rekaman ponsel asli** (tangan, laptop, monitor tambahan, meja) yang memperlihatkan Live 4D Lab MEDCOEL merespons: probe USG digerakkan, citra USG/CT berubah, bidang CT tri-planar bergeser, struktur jantung tersorot di monitor. Tidak ada narator, tidak ada tangan/perangkat/layar buatan, dan tidak ada tampilan Atlas 3D, bank soal, atau catatan materi.

## Hasil
| Berkas | Isi |
|---|---|
| `medcoel-pov-live-4d-lab.mp4` | Reel jadi (H.264 + AAC, sekitar -16 LUFS) |
| `cover/cover.png` | Cover 1080 x 1920 (bingkai rekaman ponsel dengan teks pembuka dan penjelasan) |
| `cover/cover-panduan-area-aman.png`, `cover/cover-bersama-awal-video-360px.png` | Garis area aman Reels/TikTok; cover + bingkai awal 360 px |
| `still/` | 9 still, `awal-tengah-akhir-360px.png`, `lembar-360px.png` |
| `edl.json`, `build.py`, `overlay/`, `audio/audio_mix.py`, `cover/` | File proyek yang dapat diedit dan dirender ulang |

## Teks layar (putih tebal, garis tepi hitam, tanpa kotak; muncul bertahap)
| Waktu | Teks | Posisi |
|---|---|---|
| 0,15 | INDONESIAN MED STUDENTS, | atas |
| 0,65 | STOP SCROLLING‼️ | atas |
| 2,4 | Baru nemu web belajar FK GRATIS… | tengah-bawah (di bawah layar laptop) |
| 4,9 | alat USG-nya bisa digerakin, | idem |
| 7,2 | simulasi CT-nya bisa dieksplor sendiri 😭 | idem |
| 15,3 | Plus **38.000+** soal & catatan materi. | idem |
| 15,9 | medcoel.com | idem, lebih besar |
Teks pembuka berada di area dinding/atas (di atas monitor); teks penjelasan berada di bawah layar laptop (area keyboard/lengan), tidak menutupi layar. Semua teks di dalam area aman Reels (atas >= 250 px, bawah <= 1440 px, kanan <= 940 px).

## Verifikasi klaim soal (PERUBAHAN ANGKA)
Teks yang diminta: "Plus 40.000+ soal & catatan materi." Saya memeriksa produk terbaru (`https://medcoel.com/api/medcoel/stats`, 11 Nov 2026): **38.489 soal**, 32 mata kuliah. Angka itu **belum melewati 40.000**, jadi **hanya angkanya yang diganti menjadi "38.000+"** (kata lain tidak berubah). Kalau jumlah soal sudah melewati 40.000 saat Reel diunggah, ubah `c1` di `overlay/overlay.html`, jalankan `render-overlay.cjs` dan `build.py`. "Catatan materi" ada di produk (materi per BAB).

## Sumber rekaman (Drive, folder `1Nrl_Dm3y1Je-w-fuoLnZCWUle0108zHX`; HEVC 3840 x 2160 dengan rotasi -90, jadi 2160 x 3840 setelah diputar)
- Utama: `20261111_231920.mp4` (91 dtk): potongan ketika tangan memakai laptop dan Live 4D Lab merespons (detik 9, 13,5, 21, 72,5).
- Pendukung: `20261111_231238.mp4` (87 dtk): meja kerja, monitor tambahan, laptop (detik 3, 26, 40, 74).
- `20261111_231615.mp4` **tidak dipakai** (menonjolkan Atlas 3D).
- Rekaman mentah (sekitar 900 MB) tidak di-commit; unduh dari Drive dan simpan di satu folder untuk merender ulang.

## Edit
Delapan potongan sepanjang satu bar (4 ketukan pada 110 BPM = 2,18 dtk), sehingga potongan jatuh pada ketukan musik. Pendukung (monitor + laptop + tangan) untuk pembuka dan penutup; utama diperbesar ke area laptop (crop 1800 x 3200 dari 2160 x 3840, sekitar 1,2x, citra layar tetap tajam). Bagian menunggu, layar diam, dan gerakan kamera yang tidak membantu dibuang. Koreksi ringan untuk rekaman gelap: `deflicker` (kedipan layar), `hqdn3d` (noise), gamma 1,22 dan ketajaman ringan; suasana ruangan tetap nyata (bukan terang ala studio).

## Musik dan efek bunyi (lisensi)
Semua audio **disintesis dari kode** (`audio/audio_mix.py`), tidak memakai sampel atau musik pihak ketiga:
| Judul | Isi | Pembuat | Lisensi |
|---|---|---|---|
| **MEDCOEL Discovery Groove** | Instrumental 110 BPM: kick halus, clap tipis, pad synth cerah (C - G - Am - F), arpeggio dan melodi lead | Dibuat untuk MEDCOEL pada sesi ini | CC0 1.0 (domain publik); boleh dipakai komersial/promosi Instagram tanpa atribusi |
| **MEDCOEL UI Pings** | "ting", "blip", kilau, chime kecil yang mengikuti potongan/interaksi | idem | CC0 1.0 |
Sintesis sederhana (bukan produksi studio). Untuk trek komersial berlisensi, ganti `audio/mix.wav` dan jalankan `build.py`; sertakan judul dan sumber lisensinya.

## Batasan jujur
- Referensi Reel yang disebut "yang saya berikan" **tidak sampai ke sesi ini**; gaya teks mengikuti deskripsi (putih tebal, garis tepi hitam, tanpa kotak). Sesuaikan ukuran/posisi di `overlay/overlay.html` bila berbeda.
- Rekaman ponselnya gelap; setelah koreksi ringan layar masih tampak redup, dan layar laptop pada beberapa potongan sedikit berkedip (sebagian besar sudah dikurangi).
- Monitor tambahan di rekaman menampilkan watermark Windows ("Activate Windows"); itu ada di footage asli, tidak saya hapus.
- Efek bunyi diatur dari waktu potongan, bukan dari klik sebenarnya di rekaman.
- Belum diputar di ponsel sungguhan; pratinjau 360 px dibuat dari still.

## Merender ulang
```bash
cd <akar repo>
python3 -m http.server 8128 --bind 127.0.0.1 &
node video/pov-live-4d-lab/overlay/render-overlay.cjs        # teks (PNG transparan)
python3 video/pov-live-4d-lab/audio/audio_mix.py              # musik + efek
python3 video/pov-live-4d-lab/build.py <folder-rekaman>        # -> medcoel-pov-live-4d-lab.mp4 (butuh 20261111_231920.mp4 dan 20261111_231238.mp4)
node video/pov-live-4d-lab/cover/render-cover.cjs             # cover (bingkai latar: cover/bg.jpg, dari 231238 detik 27)
```
Mengubah potongan/waktu efek: `edl.json` (`shots`: `src`, `t` detik awal, `crop` [x, y, w, h] setelah rotasi; `teks`; `sfx`).
