# Raka

Karakter manusia 2D untuk **seri video MEDCOEL**. Raka adalah anak laki-laki ceria yang rasa ingin tahunya mewakili penonton: dia kaget, berpikir, menunjuk, dan senang bersama materi. Seri video lain bisa memakainya sebagai pemandu atau teman maskot.

> **Aset produksi video, bukan fitur web.** Jangan tampilkan Raka di halaman web, tutorial pendaftaran, atau aplikasi pengguna. Maskot MEDCOEL (Kori, Kila, Nilo, di `brand/mascots` dan `apps/web/src/mascots`) tetap aset terpisah. Pasien bernama "Raka" di Simulasi Dokter juga bukan aset ini (itu tokoh kasus dengan gambar sprite sendiri).

## Aturan untuk generator video

Bila prompt, naskah, atau adegan video menyebut **"Raka"**, ambil karakternya dari kode di folder ini (`raka.js`). **Jangan menciptakan desain manusia baru** dan jangan menyalin `reference/raka-referensi.jpg` sebagai gambar. Referensi itu hanya acuan desain; hasil video harus dirender dari `rakaSvg()`.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `raka.js` | **Sumber utama.** Satu fungsi `rakaSvg(state)` menggambar Raka dari angka. Tanpa dependensi, jalan di Node dan di Chromium. |
| `svg/raka-*.svg` | SVG statis hasil `build.mjs` (netral, kaget, berpikir, menunjuk, senang, sedih, sapa, dan versi wajah saja). Untuk slide, thumbnail, atau alat tanpa JavaScript. |
| `build.mjs` | Membuat ulang `svg/` dari `raka.js`. |
| `preview.html` | Halaman pratinjau: semua ekspresi, menoleh, gerak langsung, filmstrip, ukuran kecil, bingkai 1080 x 1920. |
| `render-preview.mjs` | Merender `preview.html` ke `preview/*.png`. `--serve` menyalakan server lokal untuk dilihat di peramban. |
| `render-frames.mjs` | Contoh memakai Raka di render video: frame PNG 1080 x 1920 dari urutan contoh, lalu MP4. |
| `preview/` | Hasil render (PNG dan `raka-demo.mp4`, 11 detik). |
| `reference/raka-referensi.jpg` | Gambar acuan desain dari pemesan. Hanya referensi. |
| `raka.test.mjs` | Tes: `node --test brand/characters/raka`. |

## Desain kanonik

- Kepala besar membulat (lebar ±260 dari 400), rambut navy satu bentuk dengan satu jambul melengkung dan satu ikal kecil di sisi kiri, telinga terlihat.
- Mata titik, alis lengkung kecil, mulut yang berubah bentuk. Tidak ada garis tepi, tekstur, gradasi, atau lipatan baju.
- Sweater teal baggy, celana navy, sepatu krem. Lengan satu bentuk meruncing dari bahu ke tangan (tangan bulat, telunjuk kapsul), digambar ulang tiap frame, jadi tanpa sendi.
- Satu proporsi untuk semua varian: canvas `viewBox 0 0 400 800`, tengah badan x = 200, lantai y = 778. Kepala tanpa jambul ±1/3 tinggi total, dengan rambut ±45%.

| Bagian | Warna |
|---|---|
| Kulit / bayangan leher | `#F7BC8E` / `#EAA676` |
| Rambut, mata, alis | `#212739` (navy) |
| Sweater / lengan di depan badan | `#1D7B75` / `#19726D` |
| Celana | `#212739` |
| Sepatu | `#F5E8D6` |
| Mulut, dalam mulut, lidah | `#8B3F37`, `#7A2D2E`, `#EE7A7A` |
| Tanda kaget / tanda menunjuk | `#F2735E` / `#6DBBA8` |

Latar yang sudah diperiksa di `preview/raka-ukuran-kecil.png`: krem, putih, biru muda, dan gelap (**pakai `PALETTE_ON_DARK` di latar gelap**, rambut dan celana diangkat sedikit). Hindari latar teal pekat karena sweater ikut lebur.

## Memanggil ekspresi dan pose

```js
import { raka, rakaSvg } from './raka.js';

rakaSvg(raka('netral'));      // ekspresi + pose bawaannya
rakaSvg(raka('kaget'));       // mata dan mulut membesar, dua kepalan di dada, tanda seru
rakaSvg(raka('berpikir'));    // tangan di dagu, alis miring
rakaSvg(raka('menunjuk'));    // satu telunjuk terangkat
rakaSvg(raka('senang'));      // mata "^ ^", mulut terbuka, dua tangan terkepal
rakaSvg(raka('sedih'));       // alis turun, mulut cemberut
```

`raka(ekspresi, pose, perubahan)` menggabungkan **ekspresi wajah** (`netral kaget berpikir senang menunjuk sedih`) dan **pose** (`netral kaget berpikir menunjuk senang sapa`). Keduanya bisa dicampur dan setiap nilai bisa diganti:

```js
raka('senang', 'sapa');                              // senang sambil melambai
raka('netral', null, { yaw: -0.8, gazeX: -0.9 });    // menoleh ke kiri layar
raka('menunjuk', null, { flip: 1 });                 // dicerminkan, menunjuk ke kiri
```

Kontrol yang tersedia (semua angka): `yaw` (-1..1, menoleh), `tilt` (derajat), `gazeX`/`gazeY` (-1..1, arah pandang), `blink` (0..1), `happyEyes`, `wide`, `browL`/`browR` (`y`, `rot`), `mouth` (`w`, `up`, `lo`), `lean`, `bob`, `armL`/`armR` (`wx wy` pergelangan, `ex ey` siku, `finger`, `fa`, `front`), `fxBurst`, `fxSpark`, `flip`. Opsi gambar: `rakaSvg(state, { uid, shadow: false, background, palette, width, bare })`; beri `uid` berbeda bila ada beberapa Raka dalam satu halaman.

## Animasi

Karena keadaan hanya angka, animasi = menginterpolasi dua keadaan lalu menggambar ulang:

```js
import { raka, lerpState, idle, ease, blinkAt, demoState } from './raka.js';

const a = raka('netral'), b = raka('kaget');
const state = idle(lerpState(a, b, ease((t - t0) / 0.3)), t);   // transisi 0,3 dtk + napas, goyang halus, kedip
```

- `lerpState(a, b, k)` transisi mulus ekspresi dan pose (lengan tidak pernah tampak bersendi).
- `idle(state, t)` menambah napas, goyang kecil, dan kedipan (`blinkAt`) supaya Raka tidak kaku. Pakai di setiap frame.
- `demoState(t)` adalah urutan contoh 11 detik (kedip, menoleh, kaget, berpikir, menunjuk, senang, netral) yang dipakai di pratinjau.
- Kaget terasa lebih hidup bila `bob` dikurangi ±10 px selama 0,3 detik pertama (lihat `demoState`).

## Memakai di render video

Pola yang sama dengan video lain di repo (halaman Chromium per frame, lalu ffmpeg):

```js
// di halaman yang dirender Playwright (script type="module")
import { mountRaka, raka, lerpState, idle } from './raka.js';
const r = mountRaka(document.getElementById('raka'));      // <div> berukuran, mis. 800 px lebar
window.drawFrame = (t) => r.set(idle(lerpState(raka('netral'), raka('kaget'), Math.min(1, t / 0.3)), t));
// di skrip render: await page.evaluate((t) => window.drawFrame(t), i / 30); await page.screenshot(...)
```

- Raka berskala vektor: render pada ukuran apa pun. Untuk video potret 1080 x 1920, lebar 700 sampai 800 px (tinggi ±55% bingkai) di atas takarir bekerja baik.
- Latar transparan (untuk ditumpuk di ffmpeg): `page.screenshot({ omitBackground: true })` dan `rakaSvg(state, { shadow: false })`.
- Contoh lengkap: `node brand/characters/raka/render-frames.mjs --mp4 raka-demo.mp4` (frame 1080 x 1920, 30 fps; `--bg transparent` untuk PNG berlatar bening).

## Pratinjau dan pemeriksaan

```bash
node brand/characters/raka/render-preview.mjs        # PNG di preview/ (butuh Playwright: npm ci di brand/video)
node brand/characters/raka/render-preview.mjs --serve  # lihat preview.html di peramban
node brand/characters/raka/build.mjs                  # perbarui svg/ setelah mengubah raka.js
node --test brand/characters/raka                     # tes
```

Setiap mengubah `raka.js`, jalankan `build.mjs` (tes membandingkan `svg/` dengan keluaran kode) dan lihat `preview/raka-lembar.png`, `raka-ukuran-kecil.png`, dan `raka-filmstrip.png` sebelum menyimpan.
