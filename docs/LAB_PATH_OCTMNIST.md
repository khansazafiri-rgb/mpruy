# PathMNIST dan OCTMNIST v1 untuk MEDCOEL Lab

Status: rancangan repository, **belum diimpor ke produksi dan belum dipublikasikan**. Dua adapter memakai ingestion draft-only MedMNIST, sampler deterministik, `studyGuide` bersumber, dan validasi/publikasi admin yang sudah ada. Tidak ada pemanggilan AI atau pencarian web pada saat siswa belajar.

## Sumber, lisensi, dan batas pemakaian

| Pack | Berkas resmi MedMNIST+ 224 px | MD5 | Sumber asal dan atribusi |
|---|---|---|---|
| PathMNIST | [Zenodo 10519652](https://zenodo.org/records/10519652) · `pathmnist_224.npz` | `2c51a510bcdc9cf8ddb2af93af1eadec` | [NCT-CRC-HE-100K / CRC-VAL-HE-7K](https://zenodo.org/records/1214456), [Kather et al., PLOS Medicine 2019](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002730) |
| OCTMNIST | [Zenodo 10519652](https://zenodo.org/records/10519652) · `octmnist_224.npz` | `abc493b6d529d5de7569faaef2773ba3` | [Kermany et al. OCT dataset v2](https://data.mendeley.com/datasets/rscbjbr9sj/2), [Cell 2018](https://doi.org/10.1016/j.cell.2018.02.010) |

[Metadata resmi MedMNIST](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py) memastikan label, task multi-class, kanal Path RGB/OCT grayscale, kedua MD5, dan lisensi dataset **CC BY 4.0**. [Zenodo MedMNIST+](https://zenodo.org/records/10519652) membedakan lisensi dataset dari lisensi perangkat lunak. [Mendeley asal OCT](https://data.mendeley.com/datasets/rscbjbr9sj/2) juga mencantumkan CC BY 4.0. Atribusi Kather serta Kermany dipertahankan pada setiap aset. `license.verified` tetap `false` saat impor awal sampai pemeriksa manusia meninjau hak pakai dan materi.

Gambar siswa berasal dari MedMNIST; tautan Duke, AAO/EyeWiki, dan artikel patologi adalah **sumber pembelajaran**, bukan pemilik gambar MedMNIST. Tidak ada gambar ajar dari sumber tersebut yang disalin.

## PathMNIST

Path mengajarkan sembilan **kategori patch H&E**, bukan sembilan penyakit. Label sumber Inggris dipertahankan pada metadata aset dan manifest; siswa melihat label berikut.

| ID | Label sumber | Label siswa | Ciri umum untuk dicari |
|---:|---|---|---|
| 0 | adipose | Jaringan adiposa | Adiposit besar jernih, batas sel tipis, inti cenderung di tepi. |
| 1 | background | Latar belakang | Kategori teknis dengan sedikit/tanpa pola jaringan target bermakna; bukan jaringan biologis. |
| 2 | debris | Debris jaringan | Material jaringan/sel terfragmentasi, kurang membentuk struktur utuh; bukan sinonim nekrosis tumor. |
| 3 | lymphocytes | Limfosit | Kelompok sel kecil, inti bulat gelap, sitoplasma sedikit. |
| 4 | mucus | Mukus | Material mukus ekstraseluler yang relatif pucat; bedakan dari sel goblet dan ruang kosong. |
| 5 | smooth muscle | Otot polos | Berkas relatif teratur dari sel spindle eosinofilik dengan inti memanjang. |
| 6 | normal colon mucosa | Mukosa kolon normal | Kriptus relatif lurus/teratur, banyak sel goblet, arsitektur mukosa terjaga. |
| 7 | cancer-associated stroma | Stroma terkait kanker | Jaringan penunjang terkait kanker; sebagian contoh dapat fibroblastik/desmoplastik. Warna merah muda saja tidak cukup. |
| 8 | colorectal adenocarcinoma epithelium | Epitel adenokarsinoma kolorektal | Epitel glandular dengan arsitektur dapat tidak teratur/berdesakan dan inti atipik; label patch, bukan diagnosis lengkap. |

Semua ciri itu **tingkat kelas**, bukan observasi pada tiap gambar. Panduan per kelas memuat `Bedakan dari`, caveat, serta ID sumber di setiap pernyataan. Khusus kelompok ketiga, tabel membandingkan kriptus mukosa yang relatif teratur, stroma penunjang, dan epitel glandular atipik. Deskripsi Path bersandar pada [dataset Kather](https://zenodo.org/records/1214456), [artikel Kather](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002730), [Duke untuk kolon](https://histology.oit.duke.edu/NormalBody/GItract/GItract%20draft.html), [Duke untuk sel ikat](https://histology.oit.duke.edu/DPT/BasicTissues1/EpithCT.html), [Duke untuk adiposa](https://histology.oit.duke.edu/MoleculesCells/Review/Tissues%20Distinguishing%20Features.pdf), [Duke untuk otot polos](https://histology.oit.duke.edu/MBS/Videos/Phys/Phys%203.5%20Smooth%20Muscle/Phys%203.5%20Smooth%20Muscle.pdf), serta [pedoman patologi kolorektal](https://pmc.ncbi.nlm.nih.gov/articles/PMC6986966/) dan [ulasan stroma](https://pmc.ncbi.nlm.nih.gov/articles/PMC3418538/).

Sampler memilih 4 learning + 2 practice per kelas dari test split: **36 learning, 18 practice, 54 indeks unik, overlap 0**. Urutan jalur adalah Komponen Dasar Jaringan → Latihan 1 → Komponen Seluler & Stroma → Latihan 2 → Mukosa Kolon & Keganasan → Latihan 3. Setiap materi belajar memuat 12 gambar; setiap latihan 6 soal identifikasi, 3 opsi relevan, posisi kunci A/B/C masing-masing dua kali. Tidak ada set campuran tambahan.

Patch tunggal tidak dipakai untuk menetapkan diagnosis pasien, grade, stadium, invasi, prognosis, status molekuler, atau terapi.

## OCTMNIST

Empat kelas sumber dan label siswa: choroidal neovascularization → **Choroidal neovascularization (CNV)**; diabetic macular edema → **Diabetic macular edema (DME)**; drusen → **Drusen**; normal → **Normal**. Struktur jalur: **Dasar Interpretasi OCT Retina → Latihan OCT Retina**. Sampler memilih 5 learning + 3 practice per kelas: **20 learning, 12 practice, 32 indeks unik, overlap 0**. Dua belas soal memakai empat opsi dan posisi kunci A/B/C/D masing-masing tiga kali.

`Cara Membaca OCT` menjelaskan irisan melintang retina, susunan lapisan, kontur fovea, penebalan/ruang kistik intraretinal, elevasi RPE/Bruch, material outer retina/subretina/sub-RPE, dan perbandingan dengan arsitektur normal. Ringkasan empat kelas:

| Kategori | Lokasi utama | Ciri umum untuk dicari |
|---|---|---|
| Normal | Arsitektur retina | Lapisan dan kontur fovea relatif terjaga; tidak tampak cairan patologis jelas pada contoh khas. |
| DME | Intraretinal | Penebalan retina dan ruang kistik hiporeflektif; cairan subretinal bisa ada, tidak wajib. |
| Drusen | Kompleks RPE/Bruch | Elevasi/deposit RPE fokal; jangan samakan dengan kista intraretinal atau eksudasi aktif. |
| CNV | Outer retina, subretina, atau sub-RPE | Material hiperreflektif terkait RPE/outer retina, kadang disertai cairan; bukan penetapan subtipe CNV. |

Panduan bersumber dari [AAO/EyeWiki OCT](https://eyewiki.aao.org/Optical_Coherence_Tomography), [AAO/EyeWiki DME](https://eyewiki.aao.org/Diabetic_Macular_Edema), [AAO/EyeWiki cystoid edema](https://eyewiki.aao.org/Cystoid_Macular_Edema), dan [AAO/EyeWiki AMD/drusen](https://eyewiki.aao.org/Age-related_macular_degeneration), dengan kategori sumber dikonfirmasi oleh [MedMNIST](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py) dan [Kermany](https://data.mendeley.com/datasets/rscbjbr9sj/2).

Materi tidak menyimpulkan usia, kontrol diabetes, ketajaman penglihatan, stadium AMD, kebutuhan anti-VEGF, prognosis, atau keputusan terapi dari citra tunggal. Penilaian klinis lengkap dan pencitraan lain tetap terpisah dari latihan ini.

## Tinjauan gambar dan verifikasi

**Gambar asli Path dan OCT belum diperiksa satu per satu dalam PR ini.** Pengujian lokal menggunakan citra NPZ sintetis untuk memverifikasi pembacaan kanal RGB/grayscale, pemilihan, ekspor PNG, nama praktik opak, dan manifest. Karena itu tidak ada `observedFeatures`, koordinat, atau penjelasan yang mengklaim temuan pada gambar tertentu. Panduan kelas tidak menjamin setiap ciri muncul pada setiap gambar terpilih. Sebelum publikasi, pemeriksa manusia perlu melihat contoh sebenarnya, labelnya, mutu citra, konten, sumber, dan hak penggunaan.

Pemeriksaan lokal terarah: 7 tes adapter baru, 11 tes backend termasuk validator guide, 18 tes frontend termasuk struktur mobile card/table, 25 tes sampler/Pneumonia, 11 tes Blood, 7 tes panduan lama, dan build Vite. Dataset resmi yang besar **tidak diunduh** di lingkungan pengembangan ini; penghitungan 36/18 dan 20/12 dibuktikan memakai label sintetis yang memenuhi spesifikasi. Pemeriksaan checksum file nyata dijalankan otomatis saat dry-run operasional nanti.

## Perintah operasional nanti — dijalankan manusia setelah PR disetujui/merge

Jangan jalankan ini pada PR yang belum di-merge. Pastikan variabel `MEDCOEL_ADMIN_IDENTITY`, `MEDCOEL_ADMIN_PASSWORD`, dan `MEDCOEL_API_BASE` sudah disetel secara aman di shell; jangan tempel nilainya ke tiket atau chat.

```bash
cd /opt/medcoel
git fetch origin
git switch main
git pull --ff-only origin main
source /opt/medcoel-ai/.venv/bin/activate
python -m pip install -r tools/lab-ingest/requirements.txt

python tools/lab-ingest/import_medmnist.py --dataset pathmnist --dry-run
python tools/lab-ingest/import_medmnist.py --dataset octmnist --dry-run
```

Periksa masing-masing manifest privat dan keberadaan seluruh PNG terpilih:

```bash
python - <<'PY'
import json
from pathlib import Path
for key, learning, practice, classes, md5 in (
    ('pathmnist', 36, 18, 9, '2c51a510bcdc9cf8ddb2af93af1eadec'),
    ('octmnist', 20, 12, 4, 'abc493b6d529d5de7569faaef2773ba3'),
):
    m = json.loads(Path(f'tools/lab-ingest/cache/manifests/{key}-v1.json').read_text())
    l, p = m['learning'], m['practice']
    assert (l['total'], p['total'], m['overlap'], len(l['counts'])) == (learning, practice, 0, classes)
    assert m['source_md5'] == md5
    assert not ({r['source_sample_index'] for r in l['files']} & {r['source_sample_index'] for r in p['files']})
    assert all((Path('apps/web/public') / r['url_path'].lstrip('/')).is_file() for r in l['files'] + p['files'])
    print(key, l['counts'], p['counts'], 'overlap=0')
PY
npm run build
```

Hook berjalan dengan `hooksWatch=false`; setelah kode baru siap, pemilik server memuat ulang PocketBase sebelum impor. Endpoint kemampuan baru memverifikasi dukungan Path/OCT sebelum aset apa pun ditulis.

```bash
sudo systemctl restart pocketbase
python tools/lab-ingest/import_medmnist.py --dataset pathmnist --apply
python tools/lab-ingest/import_medmnist.py --dataset octmnist --apply
```

Semua record hasil impor masih **draft** dan lisensi aset belum diverifikasi. Setelah pemeriksaan manusia atas contoh, kunci, panduan, sumber, dan izin, tandai lisensi melalui alur update yang tetap draft. Lalu jalankan validasi admin yang tidak mengubah status:

```bash
python tools/lab-ingest/import_medmnist.py --dataset pathmnist --apply --update-existing --license-verified
python tools/lab-ingest/import_medmnist.py --dataset octmnist --apply --update-existing --license-verified
python tools/lab-ingest/publish_pack.py pathmnist --dry-run
python tools/lab-ingest/publish_pack.py octmnist --dry-run
```

Hanya setelah pratinjau dan validasi menunjukkan nol error serta reviewer menyetujui materi, publikasi manual dilakukan:

```bash
python tools/lab-ingest/publish_pack.py pathmnist --apply --confirm-reviewed
python tools/lab-ingest/publish_pack.py octmnist --apply --confirm-reviewed
```

Perintah publikasi di atas **tidak dijalankan dalam tugas ini**. `--update-existing` mengubah hanya record yang berbeda, dengan revisi API dan pemeriksaan kepemilikan pack; tidak ada delete, SQLite langsung, atau penerbitan otomatis. ChestMNIST tetap diblokir karena multi-label dan DermaMNIST tetap diblokir karena CC BY-NC.
