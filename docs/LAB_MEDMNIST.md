# MEDCOEL Lab — MedMNIST content ingest

Pipeline ini menambahkan content pack chest X-ray nyata ke MEDCOEL Lab tanpa MONAI/PyTorch dan tanpa inference AI realtime.

## Content pack v1

Sumber awal: **PneumoniaMNIST 224×224**.

- Dataset resmi: MedMNIST / Zenodo record 10519652
- Task: binary image classification `normal` vs `pneumonia`
- Split yang dipakai: `test`
- Default sample: 10 normal + 10 pneumonia
- Lisensi yang dicatat MedMNIST: CC BY 4.0
- Tidak ada hotspot/lesion bounding box karena PneumoniaMNIST hanya menyediakan label tingkat gambar
- Semua record baru dibuat sebagai **draft**; tidak auto-publish

Importer membuat:

- PNG di `apps/web/public/lab-content/medmnist/pneumoniamnist/`
- 20 `lab_assets` (default)
- 2 `lab_objects`
- 20 `lab_questions` tipe `image_identification`
- 1 `lab_pathway`

Dataset mentah dan PNG hasil ingest di-ignore Git agar dataset besar tidak masuk repository.

## 1. Pull kode terbaru

```bash
cd /opt/medcoel
git pull
```

Pastikan file ada:

```bash
ls tools/lab-ingest
```

Harus terlihat `import_medmnist.py` dan `requirements.txt`.

## 2. Gunakan virtualenv AI yang sudah ada

```bash
source /opt/medcoel-ai/.venv/bin/activate
python --version
python -m pip install -r /opt/medcoel/tools/lab-ingest/requirements.txt
```

Tidak perlu menginstal MONAI, PyTorch, atau TorchXRayVision untuk importer v1.

## 3. Dry run dulu

```bash
cd /opt/medcoel
python tools/lab-ingest/import_medmnist.py --dry-run
```

Dry run akan:

1. mengunduh `pneumoniamnist_224.npz` dari Zenodo resmi;
2. memverifikasi MD5 terhadap metadata MedMNIST;
3. memilih deterministik 10 normal + 10 pneumonia dari test split;
4. mengekspor PNG;
5. membuat `manifest.json`;
6. **tidak mengubah PocketBase**.

Periksa hasil:

```bash
du -sh tools/lab-ingest/cache apps/web/public/lab-content/medmnist
find apps/web/public/lab-content/medmnist/pneumoniamnist -maxdepth 1 -type f | head
cat apps/web/public/lab-content/medmnist/pneumoniamnist/manifest.json | head -40
```

## 4. Build frontend supaya PNG tersedia dari web

```bash
cd /opt/medcoel
npm run build
```

Cek salah satu file yang tercantum pada manifest:

```bash
ls apps/web/dist/lab-content/medmnist/pneumoniamnist | head
```

Caddy production sudah menyajikan `apps/web/dist`, jadi file akan tersedia di:

`https://medcoel.com/lab-content/medmnist/pneumoniamnist/<filename>.png`

## 5. Apply ke PocketBase sebagai draft

Jangan tulis password admin langsung di command history.

```bash
cd /opt/medcoel
source /opt/medcoel-ai/.venv/bin/activate

read -r -p "Admin MEDCOEL username/email: " MEDCOEL_ADMIN_IDENTITY
read -r -s -p "Admin MEDCOEL password: " MEDCOEL_ADMIN_PASSWORD
echo
export MEDCOEL_ADMIN_IDENTITY MEDCOEL_ADMIN_PASSWORD

python tools/lab-ingest/import_medmnist.py --apply

unset MEDCOEL_ADMIN_PASSWORD MEDCOEL_ADMIN_IDENTITY
```

Importer bersifat idempotent berdasarkan slug. Menjalankannya lagi akan melewati record yang sudah ada, bukan menduplikasinya.

### Lisensi

Secara default importer menulis `verified=false` walaupun metadata MedMNIST mencatat CC BY 4.0. Ini disengaja agar publikasi tetap membutuhkan pemeriksaan manusia.

Setelah memeriksa sumber/lisensi di `/admin/lab`, set `verified=true` melalui editor admin lalu publish.

Jika lisensi sudah diperiksa secara eksplisit **sebelum import**, importer dapat dipanggil dengan:

```bash
python tools/lab-ingest/import_medmnist.py --apply --license-verified
```

Tetap review record sebelum publish.

## 6. Urutan review/publish

Buka:

`https://medcoel.com/admin/lab`

Publish dependency secara berurutan:

1. **Assets & license** — review citation/license setiap image asset.
2. **Learning objects** — `Pengenalan PneumoniaMNIST` dan `Latihan CXR: Normal vs Pneumonia`.
3. **Questions** — soal image-identification.
4. **Pathway** — `CXR Dasar: PneumoniaMNIST`.

Setelah publish, buka:

`https://medcoel.com/lab`

## 7. Batasan medis yang disengaja

PneumoniaMNIST adalah benchmark klasifikasi citra, bukan dataset lokalisasi lesi. Karena itu importer **tidak** membuat:

- hotspot kelainan;
- bounding box pneumonia;
- segmentasi;
- lokasi lobus;
- deskripsi radiologis spesifik per gambar yang tidak tersedia dari ground truth.

Soal v1 menggunakan wording `berdasarkan label benchmark PneumoniaMNIST` agar tidak menyamakan label dataset dengan diagnosis radiologis lengkap.

## 8. Mengubah jumlah sampel

Maksimum v1 adalah 10 per kelas karena schema object saat ini menerima maksimal 20 asset per learning object.

Contoh 5 normal + 5 pneumonia:

```bash
python tools/lab-ingest/import_medmnist.py --dry-run --per-class 5
```

Untuk skala lebih besar, buat shard/object tambahan alih-alih menaikkan batas schema tanpa pengukuran performa.

## 9. Sumber teknis

- MedMNIST: https://medmnist.com/
- MedMNIST repository: https://github.com/MedMNIST/MedMNIST
- Getting started: https://github.com/MedMNIST/MedMNIST/blob/main/examples/getting_started.ipynb
- MONAI tutorials (fase berikutnya, bila memang diperlukan): https://github.com/Project-MONAI/tutorials
- TorchXRayVision (fase berikutnya, bila authoring assistance diperlukan): https://github.com/mlmed/torchxrayvision

PneumoniaMNIST metadata resmi mencantumkan versi 224 px, MD5 `d6a3c71de1b945ea11211b03746c1fe1`, task normal-vs-pneumonia, dan lisensi CC BY 4.0. Importer memverifikasi checksum sebelum menggunakan data.
