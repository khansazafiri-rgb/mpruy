# Tala (teman Raka)

Mahasiswi FK seumuran Raka, **teman ekstrovert yang hangat dan ramai** di seri video MEDCOEL. Asal: video "Masih Dua Minggu" (versi duduk setengah badan). Dikembangkan untuk video "Apa bedanya introvert & ekstrovert?"
menjadi versi **berdiri / jalan** dengan ekspresi dan pose baru, plus varian **peneliti**. Aset produksi video, **bukan fitur web**.

## Cepat pakai
```js
import { teman, temanSvg, lerpTeman, idleTeman, walkCycle, PENELITI } from './teman.js';   // brand/characters/teman/teman.js
temanSvg(idleTeman(teman('semangat', 'ajak'), t), { uid: 't1' });         // string SVG, viewBox 400 x 800, tengah x = 200, lantai y = 778
temanSvg(state, { bare: true })                                           // hanya isi gambar; pasang dalam <g transform="translate(x y) scale(k)">
temanSvg(teman('fokus', 'catat'), { outfit: 'jas', glasses: true, palette: PENELITI })   // varian PENELITI (jas lab + kacamata + palet kulit/rambut lain)
teman('tertawa', 'berdiri', walkCycle(t * 1.6, { dir: 1 }))               // jalan memakai siklus jalan Raka (kaki tetap tersambung)
```
Animasi = `lerpTeman(a, b, k)` lalu gambar ulang (sama dengan Raka). `idleTeman(state, t, offset)` menambah napas dan kedip.

## Identitas
| | |
|---|---|
| Peran | Teman Raka; di video introvert/ekstrovert: teman yang bersemangat di keramaian (ekstrovert yang tetap bisa lelah dan butuh waktu sendiri). Bukan karikatur: ia tidak "selalu percaya diri". |
| Tampilan | Rambut bob cokelat tua, poni miring, jepit emas; hoodie lilac `#8B7BE0`; jins `#4E6AA8`; sneakers krem. Kepala besar membulat, bentuk datar, tanpa garis tepi. |
| Proporsi | Sama dengan Raka: `viewBox 0 0 400 800`, lantai y = 778, pinggul y = 566. Hoodie berakhir di pinggul, kaki dari rig Raka (`legShape`), satu bentuk meruncing + sepatu. |
| Ekspresi | `santai` `jahil` `geli` `heran` `datar` (lama) · `semangat` `tertawa` `lelah` `fokus` `senang` (baru). |
| Pose | `duduk` `dagu` (lama, setengah badan) · `berdiri` `ajak` (melambai) `hore` (dua tangan naik) `tunjuk` `catat` (memegang papan catatan) (baru, berkaki). |
| Varian peneliti | `{ outfit: 'jas', glasses: true, palette: PENELITI }`: jas lab putih, rambut hitam, kulit sawo matang, kacamata bulat. Pakai di samping meja lab bila hanya perlu setengah badan. |

Kendali di state: `yaw tilt gazeX gazeY blink lid squint blush browL browR mouth lean bob breath armL armR flip legs`. Lengan = satu bentuk meruncing yang menempel di bahu; kaki selalu tersambung ke pinggul (diuji).

## Berkas
`teman.js` (sumber), `build.mjs` (membuat `svg/`), `svg/` (SVG statis), `render-preview.mjs` + `preview/tala-lembar.png`, tes `teman.test.mjs`.
Membuat ulang: `node brand/characters/teman/build.mjs && node brand/characters/teman/render-preview.mjs` (butuh Playwright untuk pratinjau).
Tes: `node --test brand/characters/teman/teman.test.mjs`.

## Aturan
Pakai kode ini; jangan menggambar teman Raka baru. Varian baru (ekspresi/pose/palet) ditambahkan di `teman.js` tanpa mengubah yang sudah ada, lalu jalankan build, tes, dan perbarui README ini.
Salinan lama `video/*/stage/teman.js` (versi duduk) tidak diubah supaya video lama tetap bisa dibuat ulang.
