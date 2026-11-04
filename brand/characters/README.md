# Karakter video MEDCOEL

Semua tokoh seri video ada di folder ini sebagai **kode pembuat gambar** (SVG dari angka) + SVG statis + pratinjau + README. Aset produksi video, bukan fitur web.
Aturan umum: **baca README tokoh, pakai kodenya, jangan menggambar ulang**. Varian baru ditambahkan tanpa merusak yang sudah ada, lalu build, tes, dan README diperbarui.

| Tokoh | Peran | Folder | Fungsi utama |
|---|---|---|---|
| **Raka** | Mahasiswa FK, pemandu seri (pakaian: harian, demo, jas dokter, kuliah, santai, rumah; berbaring; kaki berjalan; ekspresi melongo/mengerti; pose pegang_buku; palet dosen) | [`raka/`](raka/README.md) | `rakaSvg(raka(ekspresi, pose, perubahan), { outfit })` |
| **Grelin** | Hormon lapar (ghrelin) pembawa sinyal | [`grelin/`](grelin/README.md) | `grelinSvg(grelin(ekspresi, pose, perubahan))` |
| **Jambi** | Jam biologis (jam beker bulat, cincin siang-malam) | [`jambi/`](jambi/README.md) | `jambiSvg(jambi(ekspresi, pose, { jam }))` |
| **Tala** (teman Raka) | Teman ekstrovert yang hangat; berdiri/jalan; varian **peneliti** (jas lab + kacamata) | [`teman/`](teman/README.md) | `temanSvg(teman(ekspresi, pose), { outfit, glasses, palette })` |

Maskot MEDCOEL (Kori, Kila, Nilo) ada di `brand/mascots` dan `apps/web/src/mascots`; logo asli di `apps/web/src/assets/logo-full.webp` dan `logo-mark.webp`.

## Pemakaian di render video
Semua tokoh memakai pola yang sama: `state = nama(ekspresi, pose, perubahan)`, `idle(state, t)` untuk gerak diam, `lerpState(a, b, k)` untuk peralihan, lalu `xxxSvg(state, { bare: true })` dipasang di panggung HTML/SVG yang dirender per bingkai. Contoh lengkap: `video/malam-lapar/stage/` dan `video/besok-praktikum-anatomi/stage/`.

## Pemeriksaan
```bash
node --test brand/characters/raka/raka.test.mjs brand/characters/body-characters.test.mjs brand/characters/teman/teman.test.mjs
node brand/characters/raka/build.mjs; node brand/characters/grelin/build.mjs; node brand/characters/jambi/build.mjs; node brand/characters/teman/build.mjs
```
