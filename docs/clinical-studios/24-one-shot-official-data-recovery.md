# MEDCOEL — pulihkan dataset Clinical Studios di Mac (satu batch)

**21 November 2026. PRIVATE DATA ONLY. Tidak mengizinkan rilis publik.**

## Kenapa perlu?

Data MEDCOEL sebelumnya diunduh/diproses pada eksekusi komputer AI Cloud, bukan pada Mac ini. GitHub merekam registry, URL asli, 46 SHA-256 file sumber dan 54 hash turunannya, tetapi `local-data/` sengaja tidak di-commit. Setelah clone dan menjalankan `npm run audit:clinical-clearance-private` pada Mac, hasilnya **16 studio belum memiliki private build, 8 belum mempunyai real-data asset, 0 review package**, meskipun 24 aplikasi terdaftar.

Tidak ada bukti bahwa folder privat dari komputer cloud sebelumnya masih dapat dipulihkan. Dokumen audit lama bukan pengganti ZIP/DICOM/ECG/GLB tersebut. Pemulihan yang reproducible dimulai dari URL sumber dan hash resmi yang sudah dikunci di `licensing/resources.v1.json`.

## Perintah Mac (root repository mpruy)

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm ci
npm ci --prefix apps/studios

# offline — tidak ada transfer data
npm run plan:studio-data-recovery

# eksplisit: unduh subset lima sumber dan jalankan semua pipeline
npm run recover:studio-data

# audit hasil & paket reviewer privat
npm run audit:clinical-clearance-private
```

**Perintah `recover:studio-data` akan mengakses Internet** dan mengambil data medis asli dari penerbit. Unduhan besar seluruh koleksi tidak dilakukan. Mode `plan` tidak mengakses Internet. Proses recovery berlangsung di Mac, bukan di ChatGPT. Jangan commit/push isi folder `local-data/`, atau menyajikan data medis lewat produksi.

## Default: lima sumber, bukan seluruh dataset

| Sumber resmi dan subset | Studio | Cara |
|---|---|---|
| [PTB-XL v1.0.3](https://physionet.org/content/ptb-xl/1.0.3/), PhysioNet CC BY 4.0 | ECG | Enam pasang header/sinyal 500 Hz, `ptbxl_database.csv`, `SHA256SUMS.txt`; setiap berkas dicocokkan dengan SHA-256 resmi dan registry |
| [SPIDER](https://zenodo.org/records/10159290), Zenodo CC BY 4.0 | Spine MRI | Hanya `images/1_t2.mha` + `masks/1_t2.mha` via HTTP Range ke ZIP resmi dan CRC per-member |
| [PTX-498](https://zenodo.org/records/8266529), Zenodo CC BY 4.0 | Chest X-ray | Empat radiograf + empat mask; HTTP Range ZIP, bukan seluruh arsip ~957 MB |
| [HC18](https://zenodo.org/records/1327317), Zenodo CC BY 4.0 | Pelvis Ultrasound (obstetri) | Empat citra kepala janin + empat anotasi + pixel-spacing CSV; **bukan** data USG ginekologi |
| [LIDC-IDRI](https://www.cancerimagingarchive.net/collection/lidc-idri/), TCIA CC BY 3.0 | Chest CT | **Satu** series CT + empat DICOM SEG yang sudah pin SHA dari API resmi; DICOM diekstrak hanya di workspace privat |

Unduhan hanya dilakukan jika file lokal belum ada. Jika file lokal sudah ada dengan hash berbeda, proses **menolak menimpanya**. Kesalahan satu sumber dicatat lalu sumber berikutnya tetap dicoba. Jika URL versi sumber atau bytes sudah berubah, SHA tidak cocok, maka sumber itu **gagal tertutup**; jangan ubah hash pin agar sekadar hijau.

## Alternatif tambahan: hanya untuk review privat

Setelah memeriksa catatan hak penggunaan, dua sumber berikut dapat diikutsertakan **secara eksplisit**:

```bash
npm run recover:studio-data -- --include-bodyparts --include-sri24-tissue
```

- **BodyParts3D Release 4.0:** arsip `isa_BP3D_4.0_obj_99.zip` dan dua tabel resmi untuk sembilan Anatomy Studios. Header OBJ lama **CC BY-SA 2.1 Japan** sedangkan situs DBCLS sekarang **CC BY 4.0**. Kedua hak memiliki syarat; file, notice, turunan, dan penerapan ShareAlike tetap perlu review. Model lama milik Atlas dari sumber NC tidak diunduh/digunakan.
- **SRI24 T1 dan tissue-only:** hanya `sri24_anatomy_nifti.zip` dan `sri24_tissue_nifti.zip`; **sri24_labels_nifti.zip (LPBA40) tidak boleh diambil**. Hasilnya masuk `local-data/studio-resources/build/brain-mri-sri24-tissue-only`, bukan otomatis menggantikan canonical Brain MRI.
- **Harvard–Oxford:** tidak diunduh otomatis karena masih memerlukan underlay MRI yang berlisensi dan segrid/affine. Ikuti dokumen [21](21-harvard-oxford-private-candidate.md).
- **AMOS:** sengaja dikecualikan karena perbedaan Zenodo CC BY 4.0 versus `amos22/dataset.json` CC BY-SA 4.0 memerlukan review cakupan file.
- **Cardiac CT / NC Atlas / LONI LPBA40:** tidak ada jalur download default; hak sumber masih dibatasi.

Tidak ada `--include-amos`, `--publish`, `--force`, atau `--clearance` dalam tool ini.

## Hasil dan troubleshooting

Raw data (gitignored):
- `local-data/studio-resources/raw/ptbxl/`
- `local-data/studio-resources/raw/spider/`
- `local-data/studio-resources/raw/ptx498/`
- `local-data/studio-resources/raw/hc18/`
- `local-data/studio-resources/raw/lidc/`
- Jika opt-in: `local-data/licensing-quarantine/bp3d-4.0/` dan `raw/sri24/`

Derived private build disimpan di `local-data/studio-resources/build/<studioId>/` dengan `data/`, `server/`, dan `provenance.json`; tidak ada rilis otomatis. Catatan eksekusi:
`local-data/studio-resources/clearance/official-data-recovery.json`.

Mode `--fetch-only` mengunduh data yang SHA-nya cocok **tanpa menjalankan konversi**:

```bash
npm run recover:studio-data -- --fetch-only
```

Jika terjadi **HTTP Range/EOCD** pada arsip HC18, alat terlebih dulu memvalidasi posisi/ukuran respon 206. Jika ZIP tetap tidak bisa dibaca sebagian, alat mengambil **arsip training_set.zip resmi HC18 saja** dengan batas 260 MiB, memeriksa CRC seluruh arsip serta SHA-256 **setiap anggota yang dipakai**, lalu menghapus arsip sementara. Jalur fallback tidak berlaku untuk dataset lain dan tidak melewati integritas file. Jika **digest mismatch pada file anggota**, sumber tetap gagal; jangan abaikan mismatch.

PTB-XL membutuhkan `LICENSE.txt` asli selain 13 file yang sudah dicatat. Versi baru tool mengambilnya dari PhysioNet v1.0.3 dan memverifikasi SHA-256 terhadap `SHA256SUMS.txt` resmi. Jangan menghapus atau mengganti license text.

**TCIA/LIDC-IDRI:** API `getImage` menghasilkan arsip ZIP seri DICOM yang bisa berbeda byte container walaupun gambar klinisnya sama. Jika hash ZIP tidak cocok dengan registry, file tidak pernah disimpan sebagai raw ZIP resmi yang diverifikasi. Sebaliknya, tool menyimpan ZIP tersebut ke `local-data/studio-resources/quarantine/tcia-repacked/`, memeriksa CRC ZIP, memvalidasi/mengekstrak DICOM untuk kebutuhan privat, menjalankan konversi dan mengharuskan ketiga hasil **`data/ct.nii.gz`, `data/readers.nii.gz`, `data/annotations.json`** cocok **byte-for-byte** dengan SHA-256 turunan yang telah terdaftar. Jika cocok, status menjadi `private-derived-output-pins-match-TCIA-container-repacked`, dengan **peringatan bahwa hash parent ZIP tetap belum terverifikasi**; sumber tidak boleh dipromosikan atau dibuka publik. Jika tidak cocok, kandidat build baru dihapus dan status gagal. Tak satu pun langkah ini mengganti SHA sumber resmi pada registry.

Jika **dicom-parser missing**, jalankan `npm ci --prefix apps/studios`. Jika **existing extracted TCIA series inconsistent**, periksa dan arsipkan isi folder sebelum melakukan pemulihan ulang; script tidak menghapusnya.

Perintah batch otomatis memanggil `npm run audit:clinical-clearance-private` lewat CLI setelah persiapan untuk menyusun paket reviewer **jika output asli tersedia**. Report dapat menyebut sebagian studio gagal sehingga exit code bukan 0; jangan mengartikan keberhasilan yang lain sebagai kegagalan seluruh batch.

## Pemulihan khusus setelah audit Mac: HC18 CSV dan TCIA derivative mismatch

Reproduksi 21 Nov 2026 setelah PR #247: PTB-XL, SPIDER dan PTX-498 berhasil `prepared-for-private-review-only`; HC18 gagal `Full-ZIP fallback is authorized only for the official HC18 training_set.zip` karena CSV kalibrasi `training_set_pixel_size_and_HC.csv` keliru diarahkan ke ZIP reader. Kini CSV diunduh sebagai **file langsung dari Zenodo**, diverifikasi terhadap hash registry, sedangkan delapan PNG gambar/mask diambil dari ZIP dengan CRC dan hash per anggota. Kedua jalur tidak pernah beralih ke metadata/repository mirror yang tidak dikenal.

Untuk LIDC-IDRI, regenerasi ZIP API TCIA menghasilkan hasil turunan yang ternyata tidak cocok dengan hash sumber lama (`TCIA_DERIVED_SHA_MISMATCH`). Ini adalah **mismatch data aktual**, belum bisa disimpulkan bahwa hanya ZIP yang berbeda. Tool **tidak lagi menghapus kandidat yang perlu diselidiki**, melainkan memindahkannya ke folder karantina privat:

- `local-data/studio-resources/clearance/tcia-derived-mismatch.json` — daftar tiga file hasil dan SHA lama/baru, panjang byte, serta ringkasan hash header dan voxel NIfTI (tanpa piksel/citra medis, identitas pasien atau jawaban soal)
- `local-data/studio-resources/quarantine/tcia-repacked/ct-build-unverified-*/` — hasil turunan baru yang **tidak dipercaya**, untuk audit lokal dengan akses terbatas
- `local-data/studio-resources/clearance/official-data-recovery.json` — status semua dataset, `tciaMismatchedOutputs` dan lokasi karantina

Jika semua hasil turunan cocok **byte-for-byte** dengan hash registry yang lama, statusnya masih `private-derived-output-pins-match-TCIA-container-repacked` dan belum mendapat persetujuan hak/publikasi. Jika ada perbedaan, status tetap gagal. Pemeriksaan fitur medis seperti orientasi, deidentifikasi DICOM, burnt-in PHI, segmentasi multi-reader, dan kunci soal harus dilakukan reviewer berdasarkan bukti valid; jangan mengganti hash registry agar menerima data yang berbeda.

Setelah PR perbaikan merged, dari root repo jalankan:

```bash
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm run recover:studio-data
```

Perintah dapat dilanjutkan, dan tiga dataset yang SHA sumber/build-nya sudah tepat akan dipakai ulang. Jika Chest CT masih gagal, periksa **hanya metadata dan hash**, tanpa mengunggah gambar/DICOM atau file challenge privat:

```bash
node -e 'const f=require("./local-data/studio-resources/clearance/tcia-derived-mismatch.json"); console.table(f.outputs.map(x=>({output:x.path,matches:x.matches,expected:x.expectedSha256,observed:x.observedSha256,bytes:x.bytes})))'
```

Laporan tersebut adalah dasar investigasi, **bukan lisensi atau bukti kecukupan review klinis**. Jangan merilis hasil karantina atau menghapus datanya tanpa keputusan terkait.

## Perlu selesai sebelum release

Audit sumber/hash yang lulus **tidak** sama dengan lisensi semua turunan, atribusi/ShareAlike yang lengkap, keselamatan privasi (mis. burned-in identifiers di piksel), validasi kunci jawaban/terminologi, atau persetujuan rilis. Tetap diperlukan reviewer nyata dan keputusan bertanda tangan terhadap bytes tepat, kemudian B1 release inspection, receipt dan attestation. **Tidak ada perubahan status `verified`/`publishable`, production server, UI Atlas, 4D Lab, atau langganan berbayar.**

Tujuan batch ini adalah **menghilangkan pekerjaan pemulihan manual yang berulang**, bukan menyatakan 24 studio selesai atau menghapus kewajiban medis/legal.
