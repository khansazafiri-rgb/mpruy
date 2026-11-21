# MEDCOEL — consolidated 24-studio clearance and review batch

**21 November 2026 · Operasional · Belum ada persetujuan legal atau medis.**

## Keputusan produk yang tidak boleh berubah

MEDCOEL Core tetap **100% gratis** untuk semua pengguna: 24 Clinical Studios, Anatomy Atlas, Anatomy Live 4D Lab, bank soal dan fitur pembelajaran inti. Video pembahasan soal boleh menjadi produk tambahan berbayar **jika kelak dirilis**, tetapi sumber gambar, model, video, audio dan teksnya harus mempunyai hak penggunaan tersendiri. Gratis untuk pengguna **bukan** pengecualian otomatis dari lisensi NonCommercial ataupun research-only.

Dokumen ini menggabungkan pekerjaan yang sebelumnya tersebar dalam PR #241–#244 menjadi **satu alur eksekusi**. Tidak perlu membuat PR baru per dataset atau per studio hanya untuk mencatat bahwa masih ada reviewer/izin yang ditunggu.

## Jalankan seluruh audit sekali jalan

Jalankan dari root repository setelah update terbaru, pada komputer pengembangan yang sah:

```bash
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm ci

# CI-safe, read-only: validasi semua studio/rights dan kebijakan gratis
node licensing/tools/clinical-clearance-batch.mjs --check

# Buat daftar tugas, evidensi SHA aset, status sumber, dan keperluan setiap reviewer
npm run audit:clinical-clearance

# Jika ZIP/GLB/MRI/CT/ECG resmi sudah ada di local-data/:
# Sekaligus membuat paket review privat untuk SEMUA studio yang memiliki real build
npm run audit:clinical-clearance-private

# Audit model BodyParts3D resmi terhadap 9 hasil studio secara terpisah
npm run audit:bodyparts3d-studios

npm run test:licensing
npm run test:studios
```

**`npm run audit:bodyparts3d-studios` membutuhkan archive/table resmi dan sembilan private builds yang ada di komputer tersebut.** Jangan menafsirkan gagal karena file belum ada sebagai penolakan izin, atau menonaktifkan tes demi memaksa hasil hijau.

File hasil **hanya** dibuat di folder yang diabaikan Git (`local-data/`):

- `local-data/studio-resources/clearance/clinical-clearance-worklist.json`: data kerja yang bisa diproses ulang, memuat kategori, sumber, lisensi, SHA-256 exact asset dan blocker masing-masing 24 studio
- `local-data/studio-resources/clearance/clinical-clearance-worklist.md`: daftar tugas siap dibaca reviewer/koordinator
- `local-data/studio-resources/clearance/source-rights-NOTICE-REVIEW-DRAFT.md`: draf atribusi awal untuk kedelapan sumber, dengan konflik lisensi dan kebutuhan pemeriksaan exact-file; **bukan NOTICE yang siap dipublikasikan**
- `local-data/studio-resources/clearance/private-package-execution.json`: hasil proses tiap studio (berhasil, belum ada build privat, atau error), **bukan** signed review
- `local-data/studio-resources/review-packages/<studio-id>/`: paket manusia berdasarkan tool existing `studio-review.mjs package`, jika data privat tersedia
- `local-data/studio-resources/evidence/bodyparts3d-nine-studios-origin-review.json`: bukti FMA/FJ OBJ-ke-GLB jika audit sumber berhasil

Jangan mengunggah paket tersebut ke public branch, VPS production, shared web folder, atau tautan siapa pun. Identitas reviewer dan hasil medis yang sensitif harus disimpan dengan kontrol akses.

## Delapan keluarga dataset yang ditangani dalam batch

| Sumber | Kondisi lisensi sumber dalam registry | Aksi manusia yang tetap diperlukan |
|---|---|---|
| PTB-XL → ECG | CC BY 4.0; sumber tercatat verified | Review exact bytes, attribusi, privasi dan label klinis |
| LIDC-IDRI → Chest CT | CC BY 3.0; sumber verified | Periksa per-series DICOM, UIDs/burned-in PHI, anotasi dan reviewer |
| SPIDER → Spine MRI | CC BY 4.0; sumber verified | Validasi label vertebra, MRI dan privasi |
| PTX-498 → Chest X-ray | CC BY 4.0; sumber verified | Lisensi file aktual, orientasi, mask dan review |
| HC18 → Pelvis/obstetric ultrasound | CC BY 4.0; sumber verified | **Hanya** fetal-head obstetrik, jangan digeneralisasi sebagai USG ginekologi |
| BodyParts3D → 9 Anatomy Studios | Arsip OBJ lama CC BY-SA 2.1 Japan versus situs kini CC BY 4.0 | Putuskan ketentuan yang berlaku untuk file persis, buat notice/ShareAlike, review model dan terminologi |
| SRI24/LPBA40 → Brain MRI | SRI24 T1/tissue CC BY-SA 3.0; LPBA40 LONI research-only **blocked** | Jangan kirim label LPBA40; review kandidat tissue-only dan Harvard–Oxford+underlay berlisensi yang sejajar |
| AMOS → Abdomen CT | Metadata Zenodo CC BY 4.0 versus `dataset.json` BY-SA 4.0 | Klarifikasi hak file image/segmentation dan penuhi notice |

Kategori sumber **VERIFIED_SOURCE** bukan berarti model/turunannya sudah legal untuk publik, telah disetujui reviewer, atau memenuhi privasi.

## Tiga kelompok pekerjaan yang bisa berjalan paralel

### A. Bukti teknis (dapat dikerjakan tanpa surat)

**Sudah didukung oleh repo:** SHA-256, provenance, registrasi sumber, audit sembilan studio BodyParts3D, Brain MRI SRI24 tissue-only dan kandidat Harvard–Oxford, scanner privasi dan paket review per studio. Jalankan batch di atas pada mesin yang memiliki `local-data/`, catat *gagal/lulus* terhadap arsip aktual, perbaiki pipeline jika benar-benar ada bug, dan jangan mengubah `needs-review` menjadi `verified` hanya karena build berhasil.

### B. Keputusan hak penggunaan (manusia; masih diperlukan)

- DBCLS: permohonan pertama sudah terkirim. Konfirmasi lisensi CC yang tepat untuk 2013 OBJ Release 4.0. Selama belum jelas, pertahankan status yang ada; lisensi BY-SA 2.1 Japan memang memuat hak adaptasi, tetapi ShareAlike/atribusi dan bukti kepemilikan setiap file tetap harus dipenuhi.
- AMOS: tunggu balasan mengenai ketidaksesuaian notice arsip versus Zenodo. Jangan menukar `dataset.json` menjadi CC BY 4.0 hanya karena metadata lebih permisif.
- LONI: permintaan pengecualian LPBA40 ditolak; tidak boleh dipakai publik tanpa hak tertulis yang sesuai. SRI24 tissue-only dan Harvard–Oxford adalah dua pipeline kandidat berbeda, **bukan** izin memakai LPBA40.
- Atlas frontend lama yang mencantumkan CC BY-NC-SA 4.0: hak kode perlu diselesaikan independen dari hak model BodyParts3D; sembilan Anatomy Studios yang memiliki engine sendiri bukan bukti legalitas semua modul Atlas dan 4D Lab.

Simpan balasan **asli** beserta tanggal, pengirim, cakupan, syarat distribusi, dan file/versi yang disebut. Tidak ada tindakan kirim ulang surat otomatis.

### C. Reviewer dan pengujian sebelum rilis (manusia)

Pemilik MEDCOEL harus menghubungi reviewer medis/anatomi, privasi, dan terminologi yang benar-benar memenuhi kualifikasi. Reviewer ditambahkan hanya dengan identitas/credential yang benar melalui `licensing/reviews/reviewers.v1.json` (jangan masukkan data kredensial rahasia ke GitHub). Gunakan paket private yang dihasilkan untuk memeriksa contoh, kunci jawaban, laterality, interpretasi serta PHI; keputusan harus ditandatangani mengikuti [human review workflow](15-human-review-workflow.md), terikat SHA-256 asset.

**CI hijau ≠ dokumen perizinan disetujui ≠ model medis benar ≠ izin rilis.** Sebelum akses mahasiswa, gunakan B1 inspector, signed receipt dan attestation, kemudian staging terisolasi sesuai [staging/QA runbook](17-staging-qa-security.md). Tidak ada bypass, owner override baru, atau deployment dari batch ini.

## Hasil yang diharapkan setelah menjalankan batch

- Satu dokumen tindakan untuk semua 24 studio, bukan PR berulang hanya untuk mengumpulkan daftar.
- Bukti file spesifik pada workstation yang menyimpan ZIP / GLB / NIfTI legal.
- Paket reviewer untuk setiap real build yang tersedia, dengan daftar mana yang masih tertunda.
- Daftar gap *yang benar-benar memerlukan* jawaban pemegang hak, reviewer atau penggantian dataset.
- Tidak ada promosi legalitas palsu dan tidak ada konten medis terlarang yang dikirim ke public release.

Jika reviewer nanti memberi persetujuan berdasarkan bukti nyata, buat **satu integration PR final** untuk perubahan sumber/notice/registrasi yang telah disahkan. Tidak perlu membuat satu PR untuk setiap satu studio, dan **jangan** memasukkan keputusan tanpa identitas reviewer atau tanda tangan yang sah.
