# Jambi (jam biologis)

Tokoh **jam bundar** untuk menjelaskan irama tubuh sepanjang hari (jam biologis). Dibuat untuk video "Kenapa malam-malam lapar?"; cocok untuk tidur, begadang, dan ritme harian.
Aset produksi video, **bukan fitur web**. Jangan dipakai untuk mengklaim hal medis yang tidak ada di naskah.

## Cepat pakai
```js
import { jambi, jambiSvg, idle, lerpState } from './jambi.js';   // brand/characters/jambi/jambi.js
jambiSvg(idle(jambi('ngantuk', 'berdiri', { jam: 23.5 }), t), { uid: 'j1' });   // string SVG (viewBox 220 x 280)
```
`jam` (0 sampai 24) menggerakkan jarum: jarum jam dan menit mengikuti angka. Cincin tepi setengah kuning (siang) dan setengah indigo (malam), dengan ikon matahari di atas dan bulan di bawah.

## Identitas
| | |
|---|---|
| Peran | Jam biologis tubuh; pengatur irama bangun, lapar, dan tidur. |
| Bentuk | Jam beker bulat dengan dua lonceng di atas, wajah di piringan, lengan dan kaki satu bentuk indigo yang menyatu dengan badan. |
| Warna | Siang `#F8C038`, malam `#3B4A8C`, piringan `#FFF9EA`, jarum jam `#172B38`, jarum menit `#E8665F`, lonceng `#C98F00`, huruf Z `#8E7CE8`. Semua di `PALETTE`. |
| Proporsi | `viewBox 0 0 220 280`, pusat jam (110, 128), lantai y = 270. |
| Ekspresi | `netral`, `semangat`, `ngantuk` (huruf Z melayang), `bingung`, `kaget`. |
| Pose | `berdiri`, `sapa`, `menunjuk`, `hore`, `pegang`. |

Kendali di `NEUTRAL`: `jam tilt bob shake blink happyEyes wide gazeX gazeY brow mouth blush armL armR legs zzz ring flip`. Kaki tersambung ke badan (diuji).

## Berkas
`jambi.js`, `build.mjs`, `svg/`, `render-preview.mjs`, `preview/jambi-lembar.png`; tes di `../body-characters.test.mjs`.
Membuat ulang: `node brand/characters/jambi/build.mjs && node brand/characters/jambi/render-preview.mjs`.
