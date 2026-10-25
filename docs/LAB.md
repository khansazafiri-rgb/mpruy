# MEDCOEL Lab — fondasi MVP

## Arsitektur yang diperiksa

Basis: repository `khansazafiri-rgb/mpruy`, branch `claude/focused-wozniak-1ayrxa`, commit `3b20d99f63ae5176036ca4a88ec1efb2ca01d7f5` (25 Oktober 2026). Salinan source dicocokkan dengan hash setiap file GitHub sebelum perubahan.

Aplikasi memakai React 18, Vite 6, React Router 6, Tailwind, dan PocketBase **0.40.5**. API bisnis ada di JavaScript hooks `/api/medcoel/*`; autentikasi akun/role dan pemeriksaan akun nonaktif memakai `util.requireUser/requireAdmin`. Koleksi `questions` tertutup dari akses collection API biasa; `learn`/`attempts` menjaga kunci, pembatasan kampus, riwayat, dan poin. Admin soal lama dan Hermes tetap berjalan. Penyimpanan PDF/Drive tidak diubah.

Konfigurasi deployment repository memakai Caddy (web statis + reverse proxy `/api/*`) dan systemd untuk PocketBase di loopback. Contoh unit menunjuk `/opt/medcoel/app`, data di `/opt/medcoel/pb_data`; ada riwayat penggunaan checkout `/opt/medcoel`, sehingga lokasi aktual wajib diperiksa sebelum rollout. Hook production menggunakan `--hooksWatch=false`: kode backend baru memerlukan restart service setelah backup.

**Inspeksi live belum berhasil:** SSH key yang tersedia ditolak untuk username yang diberikan. Tidak ada konfigurasi live, database, service, atau `/opt/medcoel-ai` yang diubah. Spesifikasi CPU/RAM dalam permintaan adalah informasi pengguna, belum pengukuran ulang.

## Keputusan

Lab berada dalam aplikasi dan autentikasi yang sama. Tidak ada project/stack pengganti, Python service, inference, dependency npm baru, dataset besar, atau migrasi terhadap tabel lama. Halaman Lab dimuat sebagai chunk terpisah.

Learning object adalah konten mandiri yang dapat ditemukan langsung lewat judul, ringkasan, tag, dan modality. Domain membantu browsing: imaging, clinical pathology, microbiology, parasitology, histology. Specialty/kategori lintas domain disimpan sebagai tag. Related topics menggunakan relasi object. Jalur belajar menggunakan ordered references ke object yang sama, tanpa salinan materi atau prerequisite lock.

## Schema

Migrasi `1800001800_lab.js` menambahkan:

| Koleksi | Isi dan relasi |
| --- | --- |
| `lab_objects` | slug unik, title, domain, modality, summary, tags; relasi assets, related objects, legacyQuestions; konten terstruktur versi 1 |
| `lab_assets` | URL gambar, alt, synthetic, metadata lisensi dan sumber, anotasi normalized rectangles |
| `lab_questions` | relasi banyak objects, satu asset opsional; tipe/prompt/options/answer/region/explanation tersimpan privat |
| `lab_pathways` | identitas jalur dan ringkasan |
| `lab_path_steps` | pathway → object dengan position; unik per pasangan pathway/position dan pathway/object |

Empat koleksi konten memiliki status draft/published, revision, reviewedBy, reviewedAt, created, updated. Semua collection rules Lab terkunci (`null`); akses pengguna dan admin lewat route berotorisasi. Relasi tidak menggunakan cascade delete. Tidak ada endpoint delete di MVP.

Konten object mendukung definition, keyFindings, interpretation, diagnosis, differentials, clinicalAssociations, references, steps identifikasi yang dapat dibuka satu per satu, serta laboratory rows/rules. Aturan hanya conjunction atas flag low/normal/high, bukan JavaScript bebas. Nilai/rentang disimpan per materi; tidak ada asumsi rentang universal atau diagnosis otomatis pasien. Hasil dibentuk deterministik oleh server tanpa neural network.

Annotation `{id,label,layer,region:{x,y,width,height}}` menggunakan koordinat 0–1 terhadap gambar asli. Layer anatomy/abnormality dapat ditampilkan/disembunyikan. MVP memakai rectangle; polygon, segmentasi, DICOM, deep zoom/tile, dan multi-frame belum tersedia. Zoom memakai ukuran elemen gambar dan pan memakai scroll container; hotspot memakai bounding rect aktual sehingga zoom tidak mengubah koordinat tersimpan.

### Pertanyaan

Vocabulary schema sudah menerima 12 tipe: single_best_answer, image_identification, select_region, hotspot, describe_finding, interpretation, diagnosis, differential_diagnosis, next_investigation, next_management, structured_lab, sequential_identification.

MVP benar-benar menjalankan:

- MCQ single-best-answer dan identifikasi gambar dengan kunci dinilai server.
- Hotspot/select_region berupa satu titik di dalam rectangle, termasuk input keyboard.
- Tipe uraian lainnya sebagai **penilaian mandiri** dengan jawaban contoh; belum rubric grading, adaptive sequence, atau penilaian diagnosis otomatis.

Kunci, explanation, dan target region tidak dimasukkan dalam payload pertanyaan sebelum jawaban. Annotation juga tidak dikirim bersama gambar soal. Materi pengajaran di halaman object boleh menjelaskan temuan yang sama: ini mode belajar, bukan ujian aman. Hasil latihan Lab baru belum dipersistenkan dan tidak menambah poin. Perubahan ini tidak mengubah format atau scoring soal lama.

`legacyQuestions` menghubungkan ke bank soal lama. Tombol latihan membuat attempt melalui modul `attempts` yang sama, lalu membuka `/kerjakan/:id`. Server memeriksa status published, scope kampus, mata kuliah/BAB tidak hidden, serta relasi object sebelum membuat attempt. Kunci dan grading tetap ditangani sistem lama.

## API dan halaman

Siswa harus login dan aktif:

- `GET /api/medcoel/lab/objects?q=&domain=&page=` — 24 item/halaman.
- `GET /api/medcoel/lab/objects/{slug-or-id}` — object, approved assets, related topics, pertanyaan tanpa kunci, tautan soal lama.
- `GET /api/medcoel/lab/pathways?page=` — 24 item/halaman.
- `GET /api/medcoel/lab/pathways/{slug-or-id}` — urutan langkah, semua dapat dibuka langsung. Draft dihilangkan.
- `POST /api/medcoel/lab/questions/{id}/answer` — jawaban pilihan/titik/uraian.
- `POST /api/medcoel/lab/objects/{key}/practice` — `{question: existingQuestionId}` untuk runner lama.

Admin saja, termasuk penolakan akun role agent:

- `GET/POST /api/medcoel/admin/lab/{assets|objects|questions|pathways}`.
- `PUT /api/medcoel/admin/lab/{kind}/{id}` — revision harus cocok; selalu menjadi draft dan approval dihapus.
- `POST /api/medcoel/admin/lab/{kind}/{id}/publish` — `{revision, confirmReviewed:true}`; validasi manusia dan lisensi wajib.
- `POST /api/medcoel/admin/lab-demo` — membuat draft demo secara idempotent, tidak menimpa konten dengan slug yang sudah ada.

Frontend: `/lab`, `/lab/objek/:slug`, `/lab/jalur/:slug`, `/admin/lab`. Menu Lab tersedia pada navigasi desktop dan drawer mobile. URL search/filter/page dapat dibagikan. Semua route detail dapat dibuka langsung setelah login.

## Authoring, demo, lisensi

1. Masuk sebagai admin, buka `/admin/lab`.
2. Klik **Siapkan contoh sintetis (draft)**. Tidak ada konten otomatis dipublikasikan saat migrasi.
3. Periksa tab **Aset & lisensi**; centang konfirmasi pemeriksaan lalu terbitkan.
4. Periksa dan terbitkan kedua **Learning objects**, lalu tiga **Pertanyaan**, kemudian **Jalur belajar**.
5. Buka `/lab` dan coba Explore, pencarian ferritin, Guided, layer Temuan, dan hotspot.

Editor awal berupa JSON tervalidasi. Template dan ID relasi tersedia di UI; perlu editor visual pada fase berikutnya. Setiap edit terhadap published content menariknya ke draft. Aset yang ditarik ke draft tidak dikirim ke siswa, dan halaman object yang memerlukannya akan tidak tersedia sampai aset diterbitkan kembali. Tidak ada fallback yang membocorkan draft.

Demo berupa ilustrasi geometris original (`public/lab-demo/cells.svg`, CC0-1.0) dan nilai laboratorium fiktif. Ilustrasi bukan foto histologi/radiologi; semua konten diberi label sintetis, bukan diagnosis tervalidasi. Tidak ada data pasien atau dataset/model eksternal yang diimpor.

Metadata aset memisahkan `source`, `dataset`, `license`, `commercial_use`, `redistribution`, `modification`, `attribution_required`, `source_url`, `citation`, `verified`. Publikasi memerlukan commercial_use + redistribution + verified dan citation jika atribusi diwajibkan. `modification` dicatat untuk audit hak turunan; MVP tidak mengubah berkas sumber remote. Nilai false mencakup hak tidak tersedia/belum diverifikasi sehingga publikasi fail-closed. Software/model/dataset/individual-image licensing tidak dianggap sama. Klaim hak tetap harus diperiksa manusia; checkbox bukan pemeriksa hukum otomatis.

Aset HTTPS ditampilkan langsung tanpa proxy server atau download. URL harus stabil dan hak redistribusinya diperiksa; third-party hosting bisa gagal dan menerima request browser. Jangan memakai signed URL rahasia, data pasien, atau aset privat di field URL. Storage/upload aset terproteksi dan kontrol privasi pasien adalah pekerjaan fase berikutnya. Jangan menambahkan model berlisensi atau dataset NonCommercial secara otomatis.

## Menjalankan dan menguji

Gunakan checkout lokal dan **database uji kosong**, bukan database production:

```bash
npm ci
bash apps/pocketbase/scripts/download-pocketbase.sh
npm run lint
npm test
npm run build

cd apps/pocketbase
./pocketbase migrate up --dir=./pb_data_lab_test --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
./pocketbase superuser upsert lab-test@medcoel.test lab-test-password-123 --dir=./pb_data_lab_test
MEDCOEL_DEV_MODE=1 ./pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data_lab_test --migrationsDir=./pb_migrations --hooksDir=./pb_hooks --hooksWatch=false
```

Di terminal lain, dengan folder kerja `apps/pocketbase`:

```bash
PB_SU_EMAIL=lab-test@medcoel.test PB_SU_PASSWORD=lab-test-password-123 npm run test:api
PB_SU_EMAIL=lab-test@medcoel.test PB_SU_PASSWORD=lab-test-password-123 npm run test:lab
```

Password di atas adalah fixture lokal saja. Tes API mengisi data: `test:api` membutuhkan database awal kosong dan harus dijalankan sebelum `test:lab`; jangan arahkan ke production. Tes Lab menolak target non-localhost, tetapi localhost juga harus benar-benar database disposable. Untuk UI, jalankan `npm run dev --prefix apps/web` dari root sambil server uji hidup. Buat akun admin lokal melalui mekanisme dev yang ada. Jangan memakai token production pada environment uji.

## Hasil verifikasi

- Build production dan ESLint lulus; tidak ada TypeScript/typecheck script pada stack ini.
- 45 tes frontend lama lulus.
- 11 tes format + 26 tes backend (termasuk 6 tes unit Lab) lulus.
- 48 alur regresi API lama lulus.
- 98 pemeriksaan HTTP Lab lulus, termasuk role, draft, license gate, revision conflict, direct pathway jumps, keys/annotations hidden, MCQ, hotspot, self-assessment, rule engine, integrasi runner, dan pembatasan kampus.
- Upgrade database lokal dari migrasi lama menjaga schema dan isi **25 tabel / 706 baris lama** identik; tepat 5 tabel Lab ditambahkan. Menjalankan migrasi up kembali tidak mengubah data.
- UI browser lokal: login, Explore/search, Guided membuka langkah kedua, anotasi, MCQ dan hotspot keyboard diperiksa. Ini bukan uji pada server production atau audit aksesibilitas lengkap.

## Rollout dan rollback

Belum dideploy/merge otomatis. Sebelum rollout, pulihkan akses SSH dan baca unit/proses aktual untuk menentukan checkout, data directory, binary version, user service, dan Caddy root. Jangan menjalankan script deployment yang mengasumsikan path sebelum diverifikasi.

1. Catat commit dan binary yang sedang aktif. Buat backup konsisten database **dan storage** menggunakan fasilitas backup PocketBase/operasional yang sudah ada; pastikan backup dapat dipulihkan.
2. Uji perubahan pada salinan data di staging yang terisolasi tanpa cron/integrasi email/Drive production. Verifikasi versi binary 0.40.5 sesuai repository.
3. Build frontend, siapkan kode baru, jalankan additive migration melalui workflow deployment aktual. Restart PocketBase yang benar untuk memuat hooks, kemudian sajikan build yang sesuai.
4. Periksa `/api/health`, login, bank soal, dan `/lab`; Lab awal kosong sampai admin menerbitkan materi demo/kurasi.
5. Bila rollback aplikasi diperlukan, kembalikan kode/backend hooks dan frontend build ke commit sebelumnya, restart service. **Biarkan koleksi/data Lab tersimpan.** Migrasi `down` sengaja menolak penghapusan koleksi; jangan memakai `migrate down`, reset PocketBase, atau menghapus database sebagai rollback rutin. Backup restoration hanya untuk pemulihan operasional dengan rencana data yang jelas.

## AI dan fase berikutnya

MONAI, PyTorch, TorchXRayVision, dan MedMNIST **tidak diperlukan sekarang**. Tidak dipasang, tidak diunduh, dan tidak ada model weights. Gambar, annotations, rule engine, dan jawaban kurasi bekerja tanpa AI realtime. Tambahan model inference RAM/CPU/storage/latency dari MVP ini nol; biaya aplikasi biasa belum dibenchmark pada VPS.

Fase berikutnya: perbaiki akses/deployment staging; review materi medis dan lisensi; editor visual dan preview draft; storage/provenance aset terproteksi; audit log/version history penuh dan autosave; progres/self-assessment tersimpan; taxonomy terkelola; polygon/deep zoom bila diperlukan. Batas MVP: sampai 20 aset/object, 30 related objects, 50 soal lama/object, 100 pertanyaan/object, 100 langkah/pathway, JSON 128 KiB. Untuk skala besar ukur query/index dan buat pagination soal serta taxonomy/index pencarian khusus.

AI authoring hanya dipertimbangkan setelah kebutuhan nyata terukur: source/ground truth → optional preprocessing → human validation → saved curated result. Bila dipilih, isolasikan di `/opt/medcoel-ai`, audit terpisah license software/weights/data, batasi job concurrency dan memori, serta evaluasi sensitivity/specificity/FP/FN/calibration sesuai tugas. Jangan memasang semua library karena tersedia.

Rujukan teknis: [PocketBase migrations](https://pocketbase.io/docs/js-migrations/) dan [collection operations](https://pocketbase.io/docs/js-collections/). Rujukan konteks contoh anemia: [Merck Manual, Evaluation of Anemia](https://www.merckmanuals.com/professional/hematology/approach-to-the-patient-with-anemia/evaluation-of-anemia); nilai/rentang pada demo adalah data sintetis penulis, bukan kutipan rentang universal.

## Lab V2, Fase 1 (UX siswa)

- Pembaca gambar mempertahankan rasio asli (maks ~900px, ~70% tinggi layar, tidak diperbesar lebih dari 2,5× ukuran asli). Zoom, reset, seret, tombol panah, dan `+`/`-`/`0` dari keyboard. Catatan "Image classification training image · W×H" muncul untuk gambar kecil (≤300px).
- Kontrol overlay hanya muncul untuk lapisan anotasi yang ada; tanpa anotasi muncul "Tidak tersedia anotasi lokasi untuk gambar ini."
- Aset dengan label (`· normal` di judul, atau field `label`, atau alt "label dataset 'x'") ditampilkan sebagai galeri horizontal per kelas + pembaca kasus + mode Bandingkan. Aset yang juga dipakai sebagai gambar soal latihan disembunyikan di balik pilihan "Buka contoh berlabel" agar latihan tidak terbongkar.
- Latihan: satu kasus per layar (`Mulai latihan`), progres, sebelumnya/berikutnya, ringkasan, dan tinjau soal salah. Label benchmark baru tampil setelah jawaban dikirim.
- Navigasi: materi yang dibuka dari jalur memakai `/lab/objek/<slug>?jalur=<slug-jalur>` sehingga breadcrumb, tombol kembali, dan "Sebelumnya / n dari m / Berikutnya" tetap di dalam jalur. Tanpa `?jalur`, konteksnya Explore.
- Materi disusun dari daftar blok (`features/lab/LabLesson.jsx`, registry `LAB_BLOCKS`): objectives, text, image_gallery, steps, list, lab_table, practice, about. Blok baru (comparison, layer_explorer, exploded_view) tinggal didaftarkan di sana.
- Field opsional baru `data.objectives` (daftar teks, maks 10) pada objek. Tambahan ini kompatibel mundur; tanpa field itu blok tujuan tidak tampil. Perlu restart PocketBase agar admin bisa menyimpannya.
- Importer (`tools/lab-ingest/import_medmnist.py`) untuk instalasi baru: materi pertama berjudul "Chest X-Ray: Normal vs Pneumonia" membawa 20 aset + tujuan belajar; objek latihan tidak lagi melampirkan galeri. Data yang sudah ada di produksi tidak diubah (importer melewati slug yang sudah ada); ubah lewat JSON editor di `/admin/lab`.
