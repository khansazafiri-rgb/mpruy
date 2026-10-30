# Raka

Karakter manusia 2D untuk **seri video MEDCOEL**. Raka adalah anak laki-laki ceria yang rasa ingin tahunya mewakili penonton: dia kaget, berpikir, menunjuk, dan senang bersama materi. Seri video lain bisa memakainya sebagai pemandu atau teman maskot.

> **Aset produksi video, bukan fitur web.** Jangan tampilkan Raka di halaman web, tutorial pendaftaran, atau aplikasi pengguna. Maskot MEDCOEL (Kori, Kila, Nilo, di `brand/mascots` dan `apps/web/src/mascots`) tetap aset terpisah. Pasien bernama "Raka" di Simulasi Dokter juga bukan aset ini (itu tokoh kasus dengan gambar sprite sendiri).

## Aturan untuk generator video

Bila prompt, naskah, atau adegan video menyebut **"Raka"**, ambil karakternya dari kode di folder ini (`raka.js`). **Jangan menciptakan desain manusia baru** dan jangan menyalin `reference/raka-referensi.jpg` sebagai gambar. Referensi itu hanya acuan desain; hasil video harus dirender dari `rakaSvg()`.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `raka.js` | **Sumber utama.** Satu fungsi `rakaSvg(state)` menggambar Raka dari angka. Tanpa dependensi, jalan di Node dan di Chromium. |
| `svg/raka-*.svg` | SVG statis hasil `build.mjs` (semua ekspresi, sapa, versi wajah saja, dan varian pakaian `raka-demo-*.svg`, `raka-jas-*.svg`). Untuk slide, thumbnail, atau alat tanpa JavaScript. |
| `build.mjs` | Membuat ulang `svg/` dari `raka.js`. |
| `preview.html` | Halaman pratinjau: semua ekspresi, menoleh, gerak langsung, filmstrip, ukuran kecil, bingkai 1080 x 1920. |
| `render-preview.mjs` | Merender `preview.html` ke `preview/*.png`. `--serve` menyalakan server lokal untuk dilihat di peramban. |
| `render-frames.mjs` | Contoh memakai Raka di render video: frame PNG 1080 x 1920 dari urutan contoh, lalu MP4. |
| `preview/` | Hasil render (PNG dan `raka-demo.mp4`, 11 detik). Untuk logo: `raka-logo-pose.png`, `raka-logo-closeup.png`, `raka-logo-kecil.png`. Untuk pakaian dan kaki: `raka-pakaian.png`, `raka-jalan.png`, `raka-demo-pose.png`. |
| `reference/raka-referensi.jpg` | Gambar acuan desain dari pemesan. Hanya referensi. |
| `raka.test.mjs` | Tes: `node --test brand/characters/raka/raka.test.mjs` (di Node 22 argumen folder saja tidak ditemukan; pakai berkas atau `node --test "brand/characters/raka/*.test.mjs"`). |

## Desain kanonik

- Kepala besar membulat (lebar ±260 dari 400), rambut navy satu bentuk dengan satu jambul melengkung dan satu ikal kecil di sisi kiri, telinga terlihat.
- Mata titik, alis lengkung kecil, mulut yang berubah bentuk. Tidak ada garis tepi, tekstur, gradasi, atau lipatan baju.
- Sweater teal baggy dengan **patch logo MEDCOEL** di dada kiri pemakai (kanan layar), celana navy, sepatu krem. Lengan satu bentuk meruncing dari bahu ke tangan (tangan bulat, telunjuk kapsul), digambar ulang tiap frame, jadi tanpa sendi.
- Satu proporsi untuk semua varian: canvas `viewBox 0 0 400 800`, tengah badan x = 200, lantai y = 778. Kepala tanpa jambul ±1/3 tinggi total, dengan rambut ±45%.

| Bagian | Warna |
|---|---|
| Kulit / bayangan leher | `#F7BC8E` / `#EAA676` |
| Rambut, mata, alis | `#212739` (navy) |
| Sweater / lengan di depan badan | `#1D7B75` / `#19726D` |
| Celana | `#212739` |
| Sepatu | `#F5E8D6` |
| Mulut, dalam mulut, lidah | `#8B3F37`, `#7A2D2E`, `#EE7A7A` |
| Patch (kain) / tepinya | `#F5E8D6` / `#E4D2B4` |
| Simbol logo: hijau / emas | `#017162` / `#FBC23A` |
| Tanda kaget / tanda menunjuk | `#F2735E` / `#6DBBA8` |

Latar yang sudah diperiksa di `preview/raka-ukuran-kecil.png`: krem, putih, biru muda, dan gelap (**pakai `PALETTE_ON_DARK` di latar gelap**, rambut dan celana diangkat sedikit). Hindari latar teal pekat karena sweater ikut lebur.

## Patch logo MEDCOEL

Simbol logo (dua huruf C bersarang dan bintang emas) dipasang sebagai patch krem berbentuk kotak membulat di **dada kiri pemakai**, yaitu sisi kanan layar. Bentuknya digambar ulang sebagai vektor dari `apps/web/src/assets/logo-mark.webp` (kecocokan bentuk ±92% terhadap logo asli); bukan logo lengkap karena tulisannya akan terlalu kecil.

- Patch berada **di dalam grup badan** (`raka-body`, di atas sweater dan di bawah kepala dan lengan di depan). Karena itu ikut condong (`lean`), naik-turun (`bob`), dan bernapas (`breath`), tetapi **ukurannya tetap** di semua frame. Menoleh hanya menggerakkan kepala, jadi patch tetap di badan.
- Saat gambar dicerminkan (`flip: 1`) patch pindah ke sisi lain bersama badan, **sedangkan simbolnya dibalik lagi** sehingga tidak terbaca terbalik.
- Posisi dan ukuran ada di `PATCH` (`x y size mark`). Opsi gambar: `rakaSvg(state, { logo: false })` tanpa patch, `{ logo: 'kanan' }` di dada kanan pemakai (kiri layar).
- Patch tidak boleh tertutup tangan. Untuk itu pose **kaget** (kepalan sedikit lebih rendah dan ke tengah) dan **berpikir** (dicerminkan: tangan ke dagu dari lengan kiri layar, lengan kanan layar melintang di perut) disesuaikan. Tes `patch logo tidak tertutup tangan di pose mana pun` menjaganya bila pose diubah.
- Keterbacaan: pada Raka setinggi 320 px simbolnya jelas, di 180 px masih terbaca sebagai logo, di 110 px dan 64 px tampak sebagai patch krem berlogo kecil. Di video potret 1080 x 1920 (Raka ±1000 px) simbol setinggi sekitar 60 px. Lihat `preview/raka-logo-kecil.png`.

## Memanggil ekspresi dan pose

```js
import { raka, rakaSvg } from './raka.js';

rakaSvg(raka('netral'));      // ekspresi + pose bawaannya
rakaSvg(raka('kaget'));       // mata dan mulut membesar, dua kepalan di dada, tanda seru
rakaSvg(raka('berpikir'));    // tangan kiri layar di dagu, alis miring
rakaSvg(raka('menunjuk'));    // satu telunjuk terangkat
rakaSvg(raka('senang'));      // mata "^ ^", mulut terbuka, dua tangan terkepal
rakaSvg(raka('sedih'));       // alis turun, mulut cemberut
```

`raka(ekspresi, pose, perubahan)` menggabungkan **ekspresi wajah** (`netral kaget berpikir senang menunjuk sedih perih batuk khawatir lega`) dan **pose** (`netral kaget berpikir menunjuk senang sapa batuk usap_mata jalan berhenti jongkok`). Keduanya bisa dicampur dan setiap nilai bisa diganti:

```js
raka('senang', 'sapa');                              // senang sambil melambai
raka('netral', null, { yaw: -0.8, gazeX: -0.9 });    // menoleh ke kiri layar
raka('menunjuk', null, { flip: 1 });                 // dicerminkan, menunjuk ke kiri
```

Kontrol yang tersedia (semua angka): `yaw` (-1..1, menoleh), `tilt` (derajat), `gazeX`/`gazeY` (-1..1, arah pandang), `blink` (0..1), `happyEyes`, `wide`, `browL`/`browR` (`y`, `rot`), `mouth` (`w`, `up`, `lo`), `lean`, `bob`, `armL`/`armR` (`wx wy` pergelangan, `ex ey` siku, `finger`, `fa`, `front`), `fxBurst`, `fxSpark`, `flip`, serta efek dan aksesori (semua 0 = tidak tampak): `tears` (air mata, `tearsT` = fase tetesan), `fxCough`, `sweat`, `sparkle`, `shades`, `bags` (kantung mata), `dizzy` (mata berputar, `dizzyT`), `slump` (bahu turun), dan `legs` (kaki berengsel, lihat di bawah). Opsi gambar: `rakaSvg(state, { uid, shadow: false, background, palette, width, bare, logo, outfit, dark })`; beri `uid` berbeda bila ada beberapa Raka dalam satu halaman.

## Pakaian (varian yang bisa dipakai ulang)

Pakaian dipilih lewat opsi gambar `outfit`; bawaannya `harian` (tampilan kanonik, tidak berubah). Definisinya ada di `OUTFITS` di `raka.js`.

| `outfit` | Tampilan |
|---|---|
| `harian` | Sweater teal, celana navy, sepatu krem (kanonik). |
| `demo` | Kaus lengan panjang **hitam**, celana abu tua, sepatu krem. Patch logo MEDCOEL kecil tetap di dada. Dibuat untuk video "gas air mata saat demo". |
| `jas` | **Jas dokter putih** (kerah, V-leher dengan sweater teal, lapel, kancing, saku, stetoskop) di atas badan. Panjang sampai lutut; pada duduk di balik meja, bagian bawahnya tersembunyi meja. |

```js
import { raka, rakaSvg } from './raka.js';
rakaSvg(raka('kaget'), { outfit: 'demo' });              // baju demo hitam
rakaSvg(raka('netral'), { outfit: 'jas' });              // jas dokter
rakaSvg(raka('netral'), { outfit: 'demo', dark: true });  // warna diangkat sedikit untuk latar gelap
```

Menambah pakaian baru: tambahkan satu entri di `OUTFITS` (`palette` untuk warna yang diganti, `onDark` untuk latar gelap, `coat: true` bila memakai gambar jas). Wajah, rambut, proporsi, dan patch logo tidak ikut berubah. Jangan memilih warna badan yang sama dengan latar (README ini sudah mencatat teal pekat; baju demo hitam butuh latar yang lebih terang atau `dark: true` di latar gelap).

## Kaki, jalan, berhenti, jongkok

Kaki kanonik (dua celana lurus dan sepatu di sampingnya) tetap bawaan untuk berdiri. Untuk bergerak, nyalakan **kaki berengsel halus**: `state.legs.on = 1`. Setiap kaki digambar sebagai SATU bentuk celana meruncing dari pinggul ke pergelangan (lingkaran berwarna sama sepanjang kurva, seperti lengan), sepatu menumpang di pergelangan, pinggul ikut naik-turun badan (`bob`), dan pergelangan menapak di lantai. Jadi tidak ada bagian lepas atau sendi yang terlihat di frame mana pun. Tes `kaki berengsel: pinggul menempel di badan...` menjaganya.

```js
import { raka, rakaSvg, walkCycle } from './raka.js';
// satu langkah penuh = fase 0..1; di render video: fase = (waktu * langkahPerDetik) % 1
const state = raka('netral', 'jalan', walkCycle(fase, { dir: 1 }));   // jalan ke kanan layar
raka('khawatir', 'jalan', walkCycle(fase, { run: true }));            // lari kecil
raka('netral', 'jalan', walkCycle(fase, { mode: 'depan' }));          // melangkah menghadap kamera
raka('netral', 'berhenti');                                           // berhenti mendadak, condong ke belakang
raka('khawatir', 'jongkok');                                          // jongkok (bob 142, lutut keluar)
```

Peralihan berdiri -> jalan -> berhenti memakai `lerpState` seperti biasa (semua angka kaki ikut diinterpolasi). Untuk menoleh ke arah jalan, tambahkan `yaw` dan `gazeX` (mis. `{ yaw: 0.5, gazeX: 0.8 }`). `legShape('L' | 'R', state)` mengembalikan bentuk kaki (dipakai tes).

## Contoh: Raka di tengah demo (baju demo)

```js
const t = detik;                                    // waktu video
const jalan = raka('lega', 'jalan', { ...walkCycle(t * 1.7, { dir: 1 }), yaw: 0.45, gazeX: 0.7 });
rakaSvg(idle(jalan, t), { outfit: 'demo', uid: 'a' });       // berjalan menjauh
rakaSvg(idle(raka('perih', 'usap_mata', { tearsT: t * 1.4 }), t), { outfit: 'demo' });  // mata perih
rakaSvg(idle(raka('batuk', null, { tearsT: t }), t), { outfit: 'demo' });               // batuk
```

Ekspresi tambahan: `perih` (mata nyaris terpejam, air mata), `batuk` (mulut terbuka, efek batuk), `khawatir`, `lega`. Pratinjau semuanya ada di `preview/raka-demo-pose.png` (pose) dan `preview/raka-jalan.png` (siklus jalan).

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
node --test brand/characters/raka/raka.test.mjs       # tes
```

Setiap mengubah `raka.js`, jalankan `build.mjs` (juga membuat `svg/raka-demo-*.svg` dan `svg/raka-jas-*.svg`) (tes membandingkan `svg/` dengan keluaran kode) dan lihat `preview/raka-lembar.png`, `raka-ukuran-kecil.png`, dan `raka-filmstrip.png` sebelum menyimpan.
