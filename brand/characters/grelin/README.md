# Grelin

Tokoh kecil pembawa pesan **hormon lapar (ghrelin)** untuk seri video MEDCOEL. Dibuat untuk video "Kenapa malam-malam lapar?" dan boleh dipakai ulang untuk video pencernaan, nutrisi, atau tidur.
Aset produksi video, **bukan fitur web**. Penjelasan medis di video tetap harus mengikuti naskah (mis. "ghrelin ikut membantu mengirim sinyal lapar ke otak"); Grelin hanya wajah ramah untuk ide itu, bukan model fisiologi.

## Cepat pakai
```js
import { grelin, grelinSvg, idle, lerpState } from './grelin.js';   // brand/characters/grelin/grelin.js
const svg = grelinSvg(idle(grelin('lapar', 'pegang_perut'), t), { uid: 'g1' });  // string SVG (viewBox 200 x 260)
// di dalam <svg> lain: grelinSvg(state, { bare: true }) -> hanya isi gambar, dipasang dengan <g transform="translate(x y) scale(k)">
```
Satu fungsi `grelinSvg(state, opts)` menggambar tokoh dari angka; animasi = `lerpState(a, b, k)` lalu gambar ulang (sama dengan Raka).

## Identitas
| | |
|---|---|
| Peran | Hormon lapar (ghrelin) di lambung; pengantar sinyal lapar. |
| Bentuk | Badan oval seperti tetes besar, satu jambul melengkung, lengan dan kaki satu bentuk meruncing yang menyatu dengan badan (tidak ada bagian lepas). |
| Warna | Badan `#F28C38`, bayangan `#E27623`, kilau/tangan `#FFC27A`, pipi `#F8A8A0`, sepatu `#8A4A1E`, kilat sinyal `#F8C038`. Semua di `PALETTE`. |
| Proporsi | `viewBox 0 0 200 260`, tengah badan x = 100, lantai y = 250. Kepala = badan (satu bentuk). |
| Ekspresi | `netral`, `lapar` (mata lebar, mulut terbuka, liur), `semangat`, `kenyang` (puas, mengantuk), `bingung`, `serius`. |
| Pose | `berdiri`, `kirim_sinyal` (memegang amplop berkilat), `sapa`, `pegang_perut`, `hore`. |

## Kendali (angka di `NEUTRAL`)
`tilt bob squash blink happyEyes wide gazeX gazeY brow mouth blush drool armL armR legs hold spark flip`. Jalan: isi `legs: { dxL, dxR, liftL, liftR }` (kaki selalu tersambung ke badan; diuji).
Bayangan lantai bisa dimatikan dengan `{ shadow: false }`.

## Berkas
`grelin.js` (sumber), `build.mjs` (membuat `svg/`), `svg/` (SVG statis tiap ekspresi dan pose), `render-preview.mjs` + `preview/grelin-lembar.png` (lembar pratinjau), tes di `../body-characters.test.mjs`.
Membuat ulang: `node brand/characters/grelin/build.mjs && node brand/characters/grelin/render-preview.mjs`. Tes: `node --test brand/characters/body-characters.test.mjs`.

## Aturan
Pakai kode ini; jangan menggambar Grelin baru. Varian baru (ekspresi/pose/warna) ditambahkan di `grelin.js` tanpa mengubah yang sudah ada, lalu jalankan build, tes, dan perbarui README ini.
