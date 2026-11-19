# MEDCOEL Anatomy 3D — audit cakupan dan pengungkapan detail (9 November 2026)

## Sumber dan batas audit

Audit ini menginventarisasi **struktur yang tercantum dalam katalog**, bukan menilai fidelitas geometris setiap mesh. Data berasal dari `apps/anatomy/public/data/systems.json`, `atlas-catalog.json`, serta kebijakan `licensing/quarantine-policy.json` pada branch pengembangan. Katalog tidak menjamin bahwa setiap landmark anatomis dimodelkan sebagai struktur mandiri. Dataset CT 4D Lab tetap sintetis; **bukan** CT pasien.

| Sistem di Atlas | Struktur tersedia di katalog |
|---|---:|
| Rangka (`skeletal`) | 271 |
| Sendi/ligamen (`joints`) | 349 |
| Otot (`muscular`) | 669 |
| Kardiovaskular (`cardiovascular`) | 676 |
| Limfatik (`lymphatic`) | 158 |
| Visceral (`visceral`) | 114 |
| Saraf (`nervous`) | **0; dikarantina** |
| **Total** | **2.237** |

Dari 114 struktur visceral, kategori katalog: 49 pencernaan, 37 respirasi, 14 reproduksi, 10 endokrin, 4 urinaria. Sistem yang tampil di 4D Lab menggunakan **subset** dari katalog: `AtlasLayer.keep()` menyaring jaringan yang jauh dari fokus 4D Lab dan beberapa sistem dimuat secara *on demand*, sehingga jumlah struktur di panel 4D Lab dapat lebih sedikit daripada 2.237.

## Bukti detail yang sudah ada (tetapi belum selalu tampak)

- Paru kanan: `Superior lobe of right lung`, `Middle lobe of right lung`, `Inferior lobe of right lung` (tiga lobus).
- Paru kiri: `Superior lobe of left lung`, `Inferior lobe of left lung` (dua lobus).
- Pleura: satu entri `Pleura` dalam katalog; **tidak dapat disimpulkan** bahwa seluruh lapisan/ruang pleura terpisah tersedia.
- Saluran napas: trakea, bronkus utama/lobar dan sejumlah cabang segmental tersedia sebagai entri katalog.
- `atlasLayer.js` menyembunyikan pleura serta sejumlah bronkus saat pertama dibuka untuk mencegah menutupi paru. **PR ini menambahkan tombol opsional untuk menampilkannya tanpa membuat geometri baru.**
- Katalog yang diaudit tidak memiliki entri bernama `tubercle`; hal ini **bukan bukti bahwa tonjolan tulang tidak tergambar pada mesh**. Sebaliknya, tidak ada penanda tersendiri untuk memilih/menilai tuberkulum sebagai objek.

## Gap anatomi yang harus tetap jujur

1. **Lisensi:** `nervous.glb` (seluruh sistem saraf), ginjal/pelvis renalis, dan ossicles tertentu ditahan oleh kebijakan karantina. Jangan memuat model dari Git history, folder lokal karantina, situs lain, atau membuat turunan tanpa audit lisensi dan provenance.
2. **Fidelitas geometri:** Katalog/metadata hanya membuktikan keberadaan entri, bukan kualitas atau ketepatan landmark mikroskopik. Validasi verteks/permukaan, ukuran dan segmentasi perlu dilakukan terhadap referensi anatomi kredibel.
3. **Fidelitas citra:** CT/USG simulasi menggunakan label jaringan sintetis; banyak struktur 3D tidak memiliki label CT tersendiri. Jangan menyebut visualisasi sebagai CT klinis atau menganalogikan semua mesh sebagai segmen CT tersendiri.
4. **Kinerja:** MacBook Safari 8 GB memerlukan pemuatan bertahap. Hindari menjadikan seluruh 2.237 mesh otomatis terlihat di 4D Lab saat pertama kali dibuka.

## Perubahan konkret fase ini

- Tombol `Tampilkan pleura & cabang bronkus` di **Panel → Anatomi 3D → Detail saluran napas**. Tombol mengubah `hiddenByUser` hanya untuk `respiratory` dan nama berisi `Pleura` atau `bronchus`.
- Tampilan awal tidak berubah. Tombol dapat dimatikan kembali; `Pulihkan tampilan` mengembalikan kondisi awal.
- Tidak menambah, mengunduh, atau memodifikasi aset mesh; semua tetap dalam registrasi LPS yang sama dengan CT atlas.
- Panel mengingatkan cara memakai slider transparansi saluran napas saat pleura menutupi organ.
- Unit test membuktikan liver, lobus paru, tulang, dan struktur urinaria tidak berubah secara keliru.

## Roadmap selanjutnya (PR terpisah)

1. Audit landmark anatomi sistem rangka secara eksplisit (tubercle/tuberosity/foramen/processus) terhadap referensi Terminologia Anatomica dan atlas institusi berlisensi.
2. Inventarisasi struktur yang tersedia di katalog tetapi terfilter di 4D Lab, sehingga pembelajaran bisa mengaktifkan detail secara bertahap tanpa memuat semua mesh.
3. Untuk tiap aset anatomi baru: simpan sumber, lisensi, atribusi, versi, daftar struktur dan uji koordinat/registrasi terhadap LPS serta validasi ketepatan klinis sebelum tampil ke mahasiswa.
4. QA visual di Safari: pleura dan percabangan bronkus terlihat saat diminta, paru kanan/kiri tetap bisa dibaca, tombol pulih bekerja dan responsivitas tetap baik.

**Catatan:** Ini adalah audit awal cakupan katalog untuk prioritas pengembangan, bukan sertifikasi akurasi medis ataupun lisensi secara hukum.
