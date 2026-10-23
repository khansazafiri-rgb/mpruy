# Maskot MEDCOEL

Tiga maskot 2D yang dipakai di tutorial, notifikasi, dan materi pemasaran.
Sumber tunggal: `apps/web/src/mascots/*.svg` (vektor) dan `apps/web/src/styles/mascot.css` (ekspresi).

| Maskot | Peran | Kapan muncul | Warna utama |
|---|---|---|---|
| **Kori** | Rasa ingin tahu | Sambutan, langkah pertama, memilih tutorial | hijau `#55C79D`, daun emas `#F8C038` |
| **Kila** | Momen paham | Jawaban benar, konsep nyambung, tutorial latihan soal | kuning `#FFD56B`, sayap mint `#B8F0D5` |
| **Nilo** | Tumbuh bersama | Meninjau ulang, mencoba lagi, tutorial simulasi dokter | biru tua `#315F73`, perut `#DDF3EA` |

Garis tepi semua maskot memakai navy MEDCOEL `#172B38`. Bentuknya sengaja tidak meniru logo.

## Memakai di web

```jsx
import Mascot from '@/components/Mascot';
<Mascot name="kila" mood="happy" size={140} />
```

Ekspresi (`mood`): `idle` (tenang), `wave` (menyapa), `think` (berpikir), `happy` (senang), `talk` (bicara, mulut bergerak), `cheer` (melompat senang). Semua gerak berhenti bila perangkat memakai "kurangi gerakan"; `still` menghentikannya secara paksa.

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
