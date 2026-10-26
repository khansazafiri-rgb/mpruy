# BloodMNIST v1 — implementasi dan panduan operasi

Branch: `gpt/lab-bloodmnist-v1`, berbasis main `fd44c158c2b2b121cbf8408afb8b72b1b4ea9ff1`.
Perubahan ini hanya untuk PR. Tidak ada akses, impor, restart, deployment, atau publikasi production yang dijalankan.

## Verifikasi dataset (26 Oktober 2026)

Metadata diperiksa pada [MedMNIST info.py resmi](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py)
dan [distribusi Zenodo 10519652](https://zenodo.org/records/10519652):

- File: `bloodmnist_224.npz`, RGB 224 × 224, task `multi-class`, split yang dipilih `test`.
- MD5: `b718ff6835fcbdb22ba9eacccd7b2601`.
- Versi arsip: MedMNIST+ v3.0 / Zenodo 10519652. Versi pack MEDCOEL: v1.
- Lisensi dataset: CC BY 4.0; diperiksa pada distribusi MedMNIST dan [dataset asli Mendeley v1](https://data.mendeley.com/datasets/snkd93bnjr/1), bukan dari lisensi perangkat lunak.
- Atribusi: Yang J, Shi R, Wei D, et al. MedMNIST v2. Scientific Data. 2023;10:41. DOI: 10.1038/s41597-022-01721-8.
- Sumber asli: Acevedo A, Merino A, Alférez S, Molina Á, Boldú L, Rodellar J. A dataset of microscopic peripheral blood cell images for development of automatic recognition systems. Data in Brief. 2020;30:105474. [DOI 10.1016/j.dib.2020.105474](https://doi.org/10.1016/j.dib.2020.105474). Dataset: DOI 10.17632/snkd93bnjr.1.

| Kelas | Label sumber | Label siswa |
| --- | --- | --- |
| 0 | basophil | Basofil |
| 1 | eosinophil | Eosinofil |
| 2 | erythroblast | Eritroblas |
| 3 | immature granulocytes | Granulosit imatur |
| 4 | lymphocyte | Limfosit |
| 5 | monocyte | Monosit |
| 6 | neutrophil | Neutrofil |
| 7 | platelet | Trombosit |

Metadata resmi menambahkan rincian subtipe dalam tanda kurung pada kelas 3. String sumber lengkap disimpan dalam manifest privat; kelas tersebut tetap satu kelompok soal. Label Inggris ringkas disimpan dalam metadata operasional setiap aset.
Verifikasi sumber di atas tidak otomatis membuat `license.verified=true`: aset baru tetap memerlukan review manusia dan flag eksplisit.

## Struktur materi dan sampling

Pack `bloodmnist-v1`: **Identifikasi Sel Darah Perifer**, domain `clinical_pathology` (Patologi Klinik).

| Urutan | Object | Isi |
| --- | --- | --- |
| 1 | `bloodmnist-belajar-granulosit` — Granulosit | 20 aset: Neutrofil, Eosinofil, Basofil, Granulosit imatur; masing-masing 5 |
| 2 | `bloodmnist-latihan-granulosit` — Latihan Granulosit | 12 soal, masing-masing kelas 3 |
| 3 | `bloodmnist-belajar-sel-darah-perifer` — Limfosit, Monosit, Eritroblas & Trombosit | 20 aset; masing-masing 5 |
| 4 | `bloodmnist-latihan-sel-darah-perifer` — Latihan Sel Darah Perifer | 12 soal, masing-masing kelas 3 |

Pathway: `jalur-sel-darah-perifer-bloodmnist`, dengan empat langkah di atas. Tidak ada set campuran ketiga.
Total: 40 gambar belajar + 24 gambar latihan = 64 gambar sumber unik; overlap 0. Isi pack: 64 aset, 4 object, 24 soal, 1 pathway (93 record, di luar record pack).

Sampler lama tetap digunakan: `prefix-learning-sha256-practice-v1`, seed default `20261026`, versi seleksi memakai MD5 arsip. Blood memakai default 5/3; batas maksimum latihan tetap 5/kelas. Galeri Blood dibatasi 5/kelas agar tidak melebihi 20 aset/object.

Setiap soal memiliki empat pilihan relevan dalam kelompoknya. Posisi kunci deterministik, tanpa RNG Python:

| Set default | A | B | C | D |
| --- | --- | --- | --- | --- |
| Latihan Granulosit | 3 | 3 | 3 | 3 |
| Latihan Sel Darah Perifer | 3 | 3 | 3 | 3 |

## Batas medis, privasi, dan kompatibilitas

Materi hanya melatih pengenalan jenis sel. Tidak dibuat inferensi penyakit atau pasien, tidak ada penjelasan morfologi gambar yang dibuat otomatis. Feedback memakai label jawaban dari komponen yang sudah ada; explanation kosong. Granulosit imatur tidak dipecah menjadi subtipe.

Nama berkas latihan memakai hash identitas sumber. API soal yang sudah ada hanya mengirim gambar generik, pilihan, dan prompt; tidak mengirim label sumber, indeks, anotasi, atau kunci sebelum jawaban. Label pilihan tetap terlihat sebagaimana dibutuhkan untuk menjawab.

Semua aset menyimpan dataset, label sumber Inggris, indeks, split, lisensi, sitasi, dan kewajiban atribusi. Versi/checksum disimpan pada `license.source`, yang sudah didukung schema produksi; tidak perlu migrasi backend. Sumber/lisensi tetap tersedia melalui disclosure yang sudah ada. Metadata seleksi lengkap berada di cache privat, bukan direktori public.

Satu-satunya perubahan UI adalah pemetaan delapan judul kelompok Blood ke bahasa Indonesia dalam `groupAssets`. Tidak ada perubahan layout, navigasi, 3D, admin, atau alur latihan.

`medmnist_core.py` berbagi download/checksum, validasi label, sampling, ekspor PNG, manifest, dan penulisan draft dengan revision guard. Array gambar NPZ dibaca berurutan dan hanya gambar terpilih yang disimpan di RAM. Adapter Blood eksplisit; adapter/migrasi Pneumonia tetap di `import_medmnist.py` dengan facade helper kompatibel.

CLI tanpa `--dataset` tetap Pneumonia (10/5). Slug, galeri lama, soal, serta arsip/deprekasi legacy Pneumonia tetap sama. Blood menolak konten manual, relasi object yang tidak sesuai, atau sisa bank hasil seleksi berbeda sebelum menulis. Ini mencegah penumpukan bank saat seed/config diganti pada pack v1; perubahan seleksi setelah impor perlu review membership tersendiri. Impor API tidak transaksional lintas semua record: jika terganggu, perbaiki penyebab lalu ulangi; no-op terdeteksi dan revisi stale ditolak. Tidak ada hard delete atau akses SQLite.

Hanya Blood ditambahkan ke dataset aktif. Path/OCT tetap nonaktif; Chest tetap diblokir sebagai multilabel; Derma tetap dikecualikan karena NC.

## Hasil verifikasi lokal

- 11 tes offline Blood lulus: kelas, sampling, PNG RGB, hash filename, determinisme/keseimbangan opsi, safety medis, manifest privat, dry-run tanpa API, checksum rusak, array invalid, cap, ownership, revisi, dan idempotensi.
- 15 tes sampling/importer Pneumonia + 10 tes resolusi pack lulus.
- 32 pemeriksaan HTTP regresi Pneumonia lulus: learning 20/practice 10, overlap 0, legacy 20 dipertahankan dalam arsip draft, review/admin edits tetap aman.
- 177 pemeriksaan HTTP Blood pada PocketBase sementara lulus: 64/4/24/1 record, draft awal, license gate, preview, payload siswa, feedback, pathway, serta no-op sesudah publikasi fixture lokal.
- 13 tes frontend `labUtils` lulus; lint dua file frontend yang diubah lulus.
- Build Vite production lulus (2.347 modules, 3,83 detik) dengan dependensi dari lockfile (`npm ci`).

Tes menggunakan NPZ kecil sintetis dan server localhost disposable. Arsip resmi 1,5 GB tidak diunduh dan gambar Blood asli belum diinspeksi per aset. Checksum unduhan sungguhan tetap wajib pada dry-run operator. Tidak ada data/PNG/NPZ yang disertakan dalam Git. Review visual sumber asli masih diperlukan sebelum `--license-verified` dan publikasi.

Perintah tes offline:

```bash
python -m unittest discover -s tools/lab-ingest -p test_bloodmnist.py -v
python -m unittest discover -s tools/lab-ingest -p test_sampling.py -v
python -m unittest discover -s tools/lab-ingest -p test_pack_resolution.py -v
node --test apps/web/src/features/lab/labUtils.test.mjs
```

`test_blood_api.py` hanya menerima localhost dan memerlukan admin/student fixture dari environment. Script itu menerbitkan fixture sintetis pada server sementara untuk memeriksa payload siswa, tidak dipakai sebagai alat operasi production. Jangan jalankan unittest discovery umum atas seluruh folder karena `test_ingest.py` adalah script integrasi tersendiri.

## Perintah manual kemudian (belum dijalankan)

Jalankan hanya setelah PR direview dan di-merge. Tidak perlu restart service untuk perubahan ini. Siapkan ruang cache arsip sekitar 1,5 GB ditambah hasil ekspor/build.

1. Ambil kode terbaru dan siapkan dependensi:

```bash
cd /opt/medcoel
git fetch origin
git switch main
git pull --ff-only origin main
source /opt/medcoel-ai/.venv/bin/activate
python -m pip install -r tools/lab-ingest/requirements.txt
npm ci
```

2. Dry-run lokal, belum membutuhkan kredensial admin atau koneksi PocketBase:

```bash
python tools/lab-ingest/import_medmnist.py --dataset bloodmnist --dry-run
```

3. Periksa manifest privat dan jumlah gambar:

```bash
python - <<'PY'
import json
from pathlib import Path
m = json.loads(Path('tools/lab-ingest/cache/manifests/bloodmnist-v1.json').read_text())
l, p = m['learning'], m['practice']
assert (l['total'], p['total'], m['overlap']) == (40, 24, 0)
assert set(l['counts'].values()) == {5} and set(p['counts'].values()) == {3}
assert len(l['counts']) == len(p['counts']) == 8
assert m['source_md5'] == 'b718ff6835fcbdb22ba9eacccd7b2601'
assert not ({r['source_sample_index'] for r in l['files']} & {r['source_sample_index'] for r in p['files']})
files = l['files'] + p['files']
assert len({r['filename'] for r in files}) == 64
assert all((Path('apps/web/public') / r['url_path'].lstrip('/')).is_file() for r in files)
print('Learning:', l['counts'], '\nPractice:', p['counts'], '\nOverlap:', m['overlap'])
print('Version:', m['dataset_version'], '\nSelection:', m['selection_config'])
PY
```

4. Build setelah ekspor agar 64 gambar ikut masuk hasil build:

```bash
npm run build
```

5. Siapkan kredensial melalui prompt, lalu impor draft:

```bash
read -r -p 'Admin MEDCOEL username/email: ' MEDCOEL_ADMIN_IDENTITY
read -r -s -p 'Admin MEDCOEL password: ' MEDCOEL_ADMIN_PASSWORD
printf '\n'
export MEDCOEL_ADMIN_IDENTITY MEDCOEL_ADMIN_PASSWORD
export MEDCOEL_API_BASE=https://medcoel.com
python tools/lab-ingest/import_medmnist.py --dataset bloodmnist --apply
python tools/lab-ingest/publish_pack.py bloodmnist --dry-run
```

Validasi awal akan menolak aset yang `license.verified=false`. Ini diharapkan. Periksa contoh asli, semua pilihan/kunci, pathway, atribusi, dan hak penggunaan dalam preview admin. Gambar perlu tersedia melalui hosting static yang digunakan MEDCOEL sebelum pack diterbitkan; build di atas tidak mengubah konfigurasi hosting atau me-restart service.

6. Setelah review manusia selesai, tandai verifikasi secara eksplisit, validasi lagi, lalu terbitkan manual:

```bash
python tools/lab-ingest/import_medmnist.py --dataset bloodmnist --dry-run --update-existing --license-verified
python tools/lab-ingest/import_medmnist.py --dataset bloodmnist --apply --update-existing --license-verified
python tools/lab-ingest/publish_pack.py bloodmnist --dry-run
python tools/lab-ingest/publish_pack.py bloodmnist --apply --confirm-reviewed
unset MEDCOEL_ADMIN_PASSWORD MEDCOEL_ADMIN_IDENTITY
```

Jangan jalankan perintah publish jika validasi atau review belum selesai. Impor identik berikutnya melaporkan 93 record `UNCHANGED`, menjaga status/review record, dan tidak membuat duplikat.
