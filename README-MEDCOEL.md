# MEDCOEL Anatomy v2 — revisi atlas

Paket ini adalah revisi kerja lokal dari sumber nqwrc/3d-anatomy (Z-Anatomy),
berdasarkan model yang sama dan masalah dalam riwayat terminal 31 Oktober 2026.
Ini bukan salinan langsung checkout terakhir Hermes: akses SSH ke Hermes ditolak.
Kode dan aset Elsevier tidak disertakan.

## Yang sudah bekerja

- 8 regio belajar, dengan upper limb bahu–tangan dan lower limb hip/paha–kaki.
- 13 kelompok sistem. Jantung, arteri, vena terpisah walau satu file model.
  Pernapasan, pencernaan, urinaria, reproduksi, dan endokrin juga terpisah.
- +/− per kelompok: fascia → otot superfisial → intermediate → deep.
  Contoh kepala/leher: minus pertama menghilangkan jaringan penutup;
  minus kedua menghilangkan platysma dan kelompok superfisial lainnya.
- Saraf dan pembuluh punya kelompok cabang → regional → pusat/pembuluh besar.
- Search global Inggris, Latin, dan sejumlah sinonim Indonesia. Memilih hasil
  memuat model, menyesuaikan regio/lapisan, memunculkan target, menyorot dan
  memusatkan kamera. Cari ulna dari Thorax untuk menguji.
- Isolate / Return to context, hide, transparency, restore dalam regio aktif,
  Undo, zoom, pan dengan Shift+drag atau mode Move, tampak depan/samping/belakang.
- Nama Inggris/Latin, definisi dan sumber, hubungan struktur dari model.
- Penyimpanan sesi lokal dan Share view untuk sistem/lapisan, kamera dan target.
- Sidebar yang dapat digulir, pencarian dan panel untuk layar sempit.

## Menjalankan kode sumber

Node >=22.12 diperlukan (diuji memakai Node 24).

```sh
npm ci
npm test
npm run build
npm run serve
```

Buka http://127.0.0.1:4174/. `serve` hanya melayani build `dist/`.
Untuk development gunakan `npm run dev -- --host 127.0.0.1`.
Jika perubahan file tidak terbaca oleh watcher, restart development server.

## Paket siap jalan

Arsip `medcoel-anatomy-v2-ready.zip` sudah berisi `dist/` dan `serve.mjs`.
Ekstrak lalu jalankan `node serve.mjs`: tidak perlu instal paket atau build.
Gunakan `PORT=4176 node serve.mjs` bila port 4174 terpakai.

## Mencoba di Hermes, berdampingan dengan versi lama

Unggah paket ready ke server, ekstrak ke folder baru seperti
`/opt/medcoel-anatomy/v2-review`. Jangan mengekstrak di atas `app/` lama.
Dari folder hasil ekstraksi:

```sh
node serve.mjs
```

Dari Terminal Mac yang terpisah, buka terowongan koneksi:

```sh
ssh -i ~/.ssh/tencent_automation_ed25519 -L 4174:127.0.0.1:4174 ubuntu@100.70.251.71
```

Lalu buka http://127.0.0.1:4174/ di Mac. Masukkan passphrase kunci di Terminal
jika diminta. Pemasangan service permanen/routing situs lama belum dilakukan.

## Skenario cek manual

1. Muscles → Head & neck. Minus sekali: fascia hilang, platysma tetap.
   Minus lagi: platysma hilang. Plus mengembalikan kelompok sebelumnya.
2. Thorax → search `ulna` → pilih kiri/kanan: Upper limbs dan ulna terlihat.
3. Hide ulna lalu cari kembali: target muncul kembali.
4. Isolate → Return to context: regio dan lapisan sebelumnya kembali.
5. Thorax → Organs: jantung, paru-paru dan esofagus tersedia.
   Abdomen → Organs: organ pencernaan tersedia.
6. Lower limbs → Bones: seluruh femur sampai kaki terlihat.
7. Undo mengembalikan perubahan terakhir; Restore mempertahankan regio/lapisan.
8. Bagikan link dan buka kembali: sistem, kamera, dan target pulih.
9. Ulangi pencarian melalui tombol kaca pembesar pada layar sempit.

## Batas data dan akurasi

Katalog berisi 2.827 struktur dari tujuh GLB yang tersedia. Pemetaan regio
menggabungkan nama anatomi dan bounding box nyata GLB. Regio aksial memakai
batas potongan yang dikalibrasi untuk model ini; organ memiliki penetapan regio
tersendiri agar lambung tidak berubah menjadi organ thorax hanya karena
proyeksi tingginya. Ini tetap membutuhkan review anatomi menyeluruh sebelum
menjadi atlas kurikulum yang divalidasi.

Kelompok lapisan adalah pemetaan belajar yang dikurasi dalam `src/atlas/catalog.js`,
bukan validasi semua bidang diseksi klinis. Struktur yang belum punya aturan
otot khusus berada dalam kelompok Deep. Beberapa tendo/bursa/fascia yang
berada di dalam tubuh turut dikelompokkan pada langkah connective covering.
Saraf/pembuluh dikelompokkan menurut cabang/trunk/pusat, bukan klaim bahwa
semuanya membentuk tiga bidang kedalaman fisik yang seragam.

Kulit, model perempuan lengkap, animasi kontraksi otot, radiologi sinkron,
patologi video, kuis/kursus, serta exploded skull seperti produk Elsevier
belum disediakan oleh paket/model ini. Fitur tersebut memerlukan aset,
metadata, dan validasi tambahan. Definisi bawaan terutama dari Wikipedia dan
belum diterjemahkan/review klinis oleh MEDCOEL.

## File pengembangan utama

- `src/atlas/catalog.js`: kelompok, urutan lapisan, sinonim pencarian.
- `tools/build-atlas-catalog.mjs`: menghasilkan katalog dari GLB nyata.
- `public/data/atlas-catalog.json`: nama, bounds, kelompok dan regio per struktur.
- `src/atlas/engine.js`: konteks, visibilitas, pemuatan, undo, sesi dan sharing.
- `src/atlas/ui.js`, `src/styles/atlas.css`: antarmuka atlas.
- `src/viewer/visibility.js`: visibilitas manual disusun bersama masker regio.

Jalankan `npm run catalog` jika file GLB atau aturan pemetaan berubah.

## Atribusi dan lisensi

Pertahankan `LICENSE`, `NOTICE`, dan `public/models/License.txt` dalam distribusi.
Lisensi gabungan dataset upstream adalah CC BY-NC-SA 4.0 (nonkomersial).
Paket ini tidak mengubah izin penggunaan aset upstream.

- BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan
- Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0
- Atribusi model tambahan dan definisi ada di NOTICE dan menu Help.
