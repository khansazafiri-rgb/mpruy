# Maskot MEDCOEL

Tiga maskot 2D yang menemani pengguna di banyak fitur web, tutorial, dan materi pemasaran.
Sumber tunggal: `apps/web/src/mascots/*.svg` (vektor) dan `apps/web/src/styles/mascot.css` (ekspresi).

| Maskot | Peran | Kapan muncul | Warna utama |
|---|---|---|---|
| **Kori** | Rasa ingin tahu | Sambutan, langkah pertama, memilih tutorial | hijau `#55C79D`, daun emas `#F8C038` |
| **Kila** | Momen paham | Jawaban benar, konsep nyambung, tutorial latihan soal | kuning `#FFD56B`, sayap mint `#B8F0D5` |
| **Nilo** | Tumbuh bersama | Meninjau ulang, mencoba lagi, tutorial simulasi dokter | biru tua `#315F73`, perut `#DDF3EA` |

Garis tepi semua maskot memakai navy MEDCOEL `#172B38`. Bentuknya sengaja tidak meniru logo.

> **Bukan maskot:** karakter manusia **Raka** (`brand/characters/raka/`) adalah aset khusus seri video, terpisah dari ketiga maskot ini dan tidak dipakai di web. Lihat `brand/video/README.md`.

## Memakai di web

```jsx
import Mascot from '@/components/Mascot';
<Mascot name="kila" mood="happy" size={140} />
```

Ekspresi (`mood`): `idle` (tenang), `wave` (menyapa), `think` (berpikir), `happy` (senang), `talk` (bicara, mulut bergerak), `cheer` (melompat senang). Semua gerak berhenti bila perangkat memakai "kurangi gerakan"; `still` menghentikannya secara paksa.

Untuk maskot dengan gelembung bicara singkat, pakai `MascotTip`:

```jsx
import MascotTip from '@/components/MascotTip';
<MascotTip mascot="kila" mood="cheer" size={64}>Mantap, jawabanmu benar!</MascotTip>
// layout="stack" (maskot di atas), layout="right", pop (muncul memantul)
```

## Di mana maskot muncul

| Tempat | Maskot dan isi |
|---|---|
| Semua keadaan kosong (`EmptyState`) dan layar memuat (`PageLoader`) | Kori berpikir (bisa diganti per halaman lewat prop `mascot` dan `mood`) |
| Beranda | Tips harian; berubah sesuai keadaan (ujian ≤ 3 hari: Nilo, latihan belum selesai: Kori, hari aktif beruntun ≥ 3: Kila) |
| Latihan soal, mode Learning | Setelah Cek jawaban: Kila bila benar (bersorak bila 3 benar beruntun), Nilo bila belum tepat |
| Hasil latihan | Kila (skor ≥ 80), Kori (≥ 55), Nilo (di bawahnya) |
| Leaderboard | Penyemangat sesuai peringkat; keadaan kosong dengan Kila |
| Chat Admin | Kori sebagai asisten (avatar, sapaan, tombol melayang, kepala panel) |
| Daftar dan Masuk | Kori memandu tiap langkah daftar; Kila/Nilo di langkah bukti; Kila menyambut akun baru |
| Progres, Jadwal ujian, Mata kuliah tanpa soal | Komentar singkat sesuai data (akurasi, hari ujian, ajakan kirim PDF) |
| Daftar BAB mata kuliah | Kori menyapa; di jendela pilihan BAB (belajar materi atau latihan soal) Kori bertanya |
| Pelajari materi | Kori melambai di kepala halaman dan setelah tujuan belajar, Nilo di tengah bacaan dan sebelum checklist praktikum, Kila sebelum poin high-yield dan bersorak di akhir |
| Halaman tidak ditemukan | Kori bingung |
| Tutorial dan Simulasi Dokter | Kila (latihan soal), Nilo (simulasi), seperti sebelumnya |

Admin bisa mematikan semua maskot di halaman pengguna lewat **Admin > Pengaturan > Umum > Tampilkan maskot** (`app_settings.showMascots`). Saat dimatikan, teks gelembung tetap tampil tanpa gambar dan Chat Admin kembali memakai logo.

## Lapisan SVG (untuk animasi dan video)

Setiap SVG memakai nama kelas yang sama, jadi satu animasi bisa dipakai untuk ketiganya:

| Kelas | Isi |
|---|---|
| `.mc-float` | seluruh badan (untuk melayang, miring, melompat) |
| `.mc-arm-right` | lengan kanan (melambai) |
| `.mc-eyes-normal` / `.mc-eyes-happy` | mata biasa (berkedip) / mata tersenyum |
| `.mc-mouth-normal` / `.mc-mouth-happy` / `.mc-mouth-think` | tiga bentuk mulut |
| `.mc-spark` | kilau/aksen kecil |

Saat menambah ekspresi baru, cukup tambahkan aturan `.mood-baru` di `mascot.css`; SVG tidak perlu diubah. Saat menambah maskot baru, pertahankan nama kelas lapisan di atas.

## Kit brand untuk pemasaran

`npm run mascots --prefix apps/web` menulis ulang `brand/mascots/`:

- `kori.svg`, `kila.svg`, `nilo.svg`: vektor siap dibuka di Figma, Illustrator, After Effects (impor SVG), Lottie (lewat plugin), atau Canva.
- `studio.html`: buka di browser untuk melihat semua ekspresi, mengganti latar (putih, hijau, transparan) dan ukuran, lalu merekam layar untuk video pendek.

Jalankan ulang perintah itu setiap kali SVG atau `mascot.css` berubah supaya kit brand ikut terbarui.
