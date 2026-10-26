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

## Lab V2 lengkap: content pack, bulk publish, blok visual, anatomi, progres

### Content pack
- Koleksi `lab_packs` (slug, title, version, description, source, licenseSummary, status draft/published/archived). Relasi **opsional** `pack` pada `lab_assets`, `lab_objects`, `lab_questions`, `lab_pathways`. Konten lama dan demo tanpa pack tetap berfungsi. Menyimpan konten tanpa field `pack` tidak melepaskannya dari pack.
- Migrasi aditif `1800001900_lab_packs.js`: `lab_packs`, relasi `pack`, nilai domain `anatomy`, dan `lab_progress`. Tidak ada tabel yang dihapus atau ditulis ulang. Rollback migrasi sengaja ditolak (kode saja yang di-revert).
- Alternatif lebih sederhana (hanya tag teks pada slug) ditolak: tidak bisa difilter andal, tidak punya status/audit, dan rawan salah ketik.

### Metadata dataset eksplisit
Aset dapat membawa `data.dataset = { name, split, sample_index, label, resolution: [w, h], task }`. UI membaca label dari sini; penguraian judul/alt tetap hanya sebagai cadangan untuk konten lama. Payload siswa hanya memuat `name, task, split, label, resolution` (tanpa `sample_index`). Gambar pada soal latihan tidak pernah membawa metadata dataset. `data.media` = `image` (bawaan) atau `model` (.glb/.gltf), dan `data.origin` mencatat asal visual.

### Validasi dan publish kanonik
`lab.checkRecord` (satu-satunya aturan) dipakai oleh publish tunggal, bulk, pack, dan CLI lewat `lab.publishSet`. Urutan selalu aset → objek → soal → jalur dalam satu transaksi; record yang sudah terbit dilewati (idempoten); versi (`revision`) yang basi menggagalkan seluruh operasi. Pemeriksaan: lisensi aset (verified, komersial, redistribusi, sitasi bila atribusi wajib), dependensi (aset/objek/jalur harus terbit atau ikut terbit pada putaran yang sama), kunci soal, soal hotspot/region tidak boleh memakai aset dataset yang hanya berlabel tingkat-gambar, skema pengembangan tidak boleh terbit, dan tautan antar materi harus terbit. Konfirmasi manusia (`confirmReviewed`) wajib untuk menerbitkan; `reviewedBy`/`reviewedAt` disimpan pada tiap record.

| Endpoint (admin) | Fungsi |
| --- | --- |
| `GET/POST /api/medcoel/admin/lab-packs`, `GET/PUT .../lab-packs/{slug}` | daftar, buat, ubah, dan lihat isi pack |
| `POST .../lab-packs/{slug}/validate` | validasi tanpa menulis; semua kesalahan per record |
| `POST .../lab-packs/{slug}/publish` | `{confirmReviewed, dryRun?, items?}`; hasil `{ok, errors, published, skipped}` (200 walau `ok:false`; tidak ada yang berubah) |
| `POST .../lab-bulk/publish` | publish/validasi item terpilih `{items:[{kind,id,revision?}], dryRun?, confirmReviewed}` |
| `GET .../lab/objects/{id}/preview` | pratinjau draft bentuk siswa (tidak diterbitkan) |

Endpoint siswa baru: `GET /api/medcoel/lab/overview` (jumlah materi per domain + "lanjutkan belajar") dan `POST /api/medcoel/lab/progress`. `GET lab/pathways/{slug}` kini menyertakan `progress`.

### Blok visual (`data.blocks` pada objek)
Hanya jenis blok yang dikenal yang diterima; semua teks adalah data biasa (tag HTML ditolak dan UI hanya merender teks). Jenis: `callout`, `comparison`, `guided_observation`, `layer_explorer`, `exploded_view`, `model_3d`, `clinical_connection`; galeri berasal dari aset objek. Blok baru cukup ditambahkan ke validator (`lab.js`) dan registri `LAB_BLOCKS` (`LabLesson.jsx`).

```json
{ "type": "layer_explorer", "id": "thorax", "title": "Thorax", "goal": "…", "origin": "curated_annotation",
  "layers": [{ "id": "skin", "name": "Kulit", "asset": "<id aset>", "description": "…", "clinical": "…", "opacity": 1 }, …],
  "guided": [{ "title": "Orientasi dinding dada", "text": "…", "layer": "skin" }] }
{ "type": "exploded_view", "id": "xv", "title": "Tampilan terurai", "from": "thorax", "gap": 1 }
{ "type": "model_3d", "id": "m", "title": "…", "asset": "<id aset media=model>", "origin": "curated_annotation",
  "structures": [{ "id": "lung", "name": "Paru", "node": "nama node glTF" }], "fallback": "Teks pengganti" }
```
Aturan: ID lapisan unik, minimal dua lapisan, opasitas 0–1, tiap lapisan memakai tepat satu dari `asset` atau `schematic`, aset harus bagian dari objek, `exploded_view` memakai tepat satu dari `from` atau `layers`. `origin` ∈ `curated_annotation | illustrative_schematic | dataset_segmentation | development_schematic`, ditampilkan sebagai provenans.

**Anatomi dan kejujuran data.** Layer Explorer bekerja seperti diseksi: kedalaman *d* mengupas lapisan yang lebih superfisial; toggle manual dan opasitas per lapisan tersedia; mode terpandu opsional; semua dapat dioperasikan dengan keyboard (slider, tombol lapisan sebelumnya/berikutnya, tombol panah pada area visual). Exploded View 2.5D memisahkan lapisan sepanjang satu sumbu kedalaman (tanpa rotasi 3D palsu). Tidak ada anatomi yang diturunkan dari data CXR. Skema thorax bawaan (`dev-thorax:*`, geometri asli sederhana di `devSchematics.jsx`) hanya untuk pengembangan: diberi spanduk "DEVELOPMENT SCHEMATIC — NOT FOR MEDICAL TEACHING" dan server menolak menerbitkan objek yang memakainya. Aset anatomi nyata harus berlisensi jelas (komersial, redistribusi, modifikasi, sitasi) dan lolos pemeriksaan aset yang sama.

**3D.** `LabModel3D` memuat three.js hanya saat blok `model_3d` dirender (chunk `LabModel3DCanvas`, ±150 kB gzip, terpisah dari bundel utama); ada orbit/zoom/reset, daftar struktur (tampil/sembunyi, opasitas, label) lewat nama node glTF, dan fallback teks bila WebGL atau model gagal. Tidak ada inferensi AI atau render di server.

### Progres belajar
`lab_progress` menyimpan satu baris per (pengguna, jalur): `lastObject` dan `completed`. Pelajaran dianggap selesai **hanya** lewat sinyal eksplisit: tombol "Tandai selesai", menyelesaikan sesi latihan sampai ringkasan, atau menekan "Berikutnya" ke pelajaran selanjutnya. Sekadar membuka halaman tidak menyelesaikannya (hanya mencatat "terakhir dibuka"). Tidak ada penguncian; jalur tetap bebas melompat. Beranda `/lab` menampilkan "Lanjutkan belajar" dan bagian Visual Learning (kategori tanpa materi terbit tampil "Segera hadir").

### Alur admin dan CLI
Admin: `/admin/lab` → tab Content Pack → pilih pack → Periksa content pack → centang konfirmasi → Terbitkan content pack (atau pilih item lalu "Periksa pilihan"/"Terbitkan pilihan"). Editor JSON tetap ada di tab "Editor JSON (lanjutan)", lengkap dengan pratinjau draft.

```bash
python tools/lab-ingest/import_medmnist.py --dry-run --update-existing    # rencana, tidak menulis
python tools/lab-ingest/import_medmnist.py --apply --update-existing      # sinkronkan (record kembali ke draft)
python tools/lab-ingest/publish_pack.py pneumoniamnist --dry-run          # validasi
python tools/lab-ingest/publish_pack.py pneumoniamnist --apply --confirm-reviewed
```

### Pengujian
`npm test` (unit web + backend), `node apps/pocketbase/test/lab-api.test.mjs` (98 cek), `node apps/pocketbase/test/lab-pack-api.test.mjs` (pack, validasi, urutan, idempoten, bulk, blok, progres), dan `python tools/lab-ingest/test_ingest.py` (sinkronisasi + CLI). Ketiganya memakai PocketBase lokal sekali pakai, bukan produksi.

### Deploy dan rollback V2
```bash
cd /opt/medcoel && git pull
npm ci && npm run build            # three.js baru: wajib npm ci; dist memuat chunk 3D terpisah
sudo systemctl restart pocketbase  # migrasi 1800001900 + hook baru; unit di produksi bernama "pocketbase"
bash deploy/cek-server.sh
```
Sinkron konten PneumoniaMNIST (urutan: dry-run → apply → validasi → terbitkan): lihat perintah di atas (`source /opt/medcoel-ai/.venv/bin/activate` dahulu). `--update-existing` mengembalikan record yang diubah ke draft; terbitkan ulang lewat `publish_pack.py` atau UI. Rollback: *frontend* — revert commit lalu `npm ci && npm run build`; *hook backend* — revert lalu restart `pocketbase`; *migrasi* — tidak ada rollback (aditif; kolom/koleksi tambahan tidak mengganggu kode lama); *konten* — suntingan melewati revisi; pulihkan JSON record dari editor admin atau cadangan `pb_data`. Jangan menghapus koleksi Lab sebagai rollback rutin.

## Lab UX QA redesign (hardening berbasis uji nyata)

Tidak ada migrasi baru dan tidak ada perubahan skema. Perubahan data hanya lewat sinkronisasi konten yang sudah ada (`import_medmnist.py --update-existing`, opsional).

**Siswa**
- `/lab`: hero ringkas; "Lanjutkan belajar" paling atas (jalur nyata yang belum selesai dan paling baru aktif; demo sintetis dan jalur selesai tidak pernah ditawarkan); satu pengalih Explore / Guided Learning; kartu *Materi* (garis hijau) dan *Latihan · n kasus* (garis emas) berbeda; Visual Learning di bawah; tautan admin hanya untuk admin dan kecil. Konten demo (`data.demo` / slug `demo-…`) tidak ikut daftar, hitungan domain, atau Lanjutkan belajar (admin dapat memakai `?demo=1`; akses langsung lewat slug tetap berfungsi).
- Jalur sebagai perjalanan: belum mulai → **Mulai**; berjalan → progres + **Lanjutkan: <langkah>**; selesai → **✓ Jalur selesai** dengan *Lihat kembali materi* dan *Ulangi jalur* (`POST lab/progress {pathway, reset:true}`), tidak pernah "Lanjutkan" ke pelajaran 1. Langkah yang disarankan menonjol, langkah selesai dibuat tenang, tidak ada penguncian. Di dalam pelajaran hanya satu baris konteks: `CXR Dasar · Langkah 1 dari 2`.
- Galeri CXR bandingkan-dulu: Normal | Pneumonia berdampingan (bertumpuk di HP), masing-masing dengan `← 3 / 10 →` sendiri; miniatur ada di baki "Pilih contoh". Sumber dan lisensi ada di `ⓘ Sumber & lisensi` (dilipat; atribusi tetap satu ketukan).
- Latihan: objek latihan murni (`data.mode = practice`, atau objek yang aset-nya hanya gambar soalnya sendiri dan tanpa tujuan/blok/langkah) langsung membuka **Kasus 1 / n**, tanpa halaman pengantar; info singkat ada di `ⓘ Tentang latihan` (dilipat). Urutan: gambar → pertanyaan → opsi → periksa. Navigator soal (sekarang/benar/salah/dilewati/belum), *Akhiri latihan* ("Sesi diakhiri" bila belum semua dijawab; ringkasan `1 benar · 2 salah · 17 belum dijawab`), review dengan *Kembali ke ringkasan* / *Keluar review*. Umpan balik hanya `Jawaban tepat` / `Belum tepat` + `Jawaban: …`; penjelasan tampil hanya bila penulis mengisinya. Latihan selesai-penuh menandai langkah selesai; mengakhiri lebih awal tidak.
- Layer Explorer: scroll/trackpad di atas gambar berpindah lapisan (hanya saat kursor di atas gambar; dilepas di kedua ujung dan untuk ctrl/geser samping, sehingga halaman tetap bisa digulir); tombol/slider/panah tetap tersedia; kontrol manual dan opasitas dilipat. Exploded View memakai kurva ease-out dan tata letak oblik; pada 100% antar lembar tidak tumpang tindih. Penampil 3D: kanvas selalu lebar 100% kontainer, refit saat resize/orientasi, panel struktur di bawah kanvas di layar sempit, target sentuh ≥ 44 px, petunjuk berbeda untuk sentuh dan desktop, struktur terpilih disorot dan lainnya meredup.
- Tombol Chat Admin berada di atas navigasi bawah termasuk safe area dan disembunyikan selama latihan di HP; `viewport-fit=cover`.

**Admin (`/admin/lab`)**: tiga langkah yang jelas *Preview → Validasi → Terbitkan*. "Periksa pilihan" menjadi **Validasi pilihan**; hasil menampilkan *Valid · Sudah terbit · Perlu diterbitkan · Kesalahan* (item yang sudah terbit tidak lagi dilaporkan sebagai "0 siap"). Mengganti filter mengosongkan pilihan (tidak ada pilihan tersembunyi). Preview tampil sebagai laci fokus bertanda "Preview admin · siswa tidak melihat halaman ini".

**Pengujian browser**: `apps/web/scripts/lab-qa/seed.mjs <id>` lalu `qa.mjs <id> 1280 820 390 360 320` (PocketBase dan vite lokal; layar ≤ 500 px memakai emulasi sentuh). Memeriksa overflow halaman, kontrol di dalam viewport, bertumpuk vs berdampingan, alur jalur/latihan/review, wheel Layer Explorer, jarak Exploded View, tata letak 3D dan perubahan orientasi, tombol chat vs navigasi bawah, serta alur admin. Ini pelengkap, bukan pengganti, pengecekan di perangkat nyata.

**Fixture QA di produksi** (`qa-visual-engines-dev`, `qa-dev-thorax-spatial-v1`, `qa-dev-model-3d-v1`): tetap draft; skema pengembangan tidak dapat diterbitkan oleh validator. Tidak ada yang dihapus otomatis. Bila ingin dibersihkan, hapus lewat dasbor PocketBase (akun superuser) pada koleksi `lab_objects`/`lab_assets`/`lab_packs` dengan slug tersebut, setelah memastikan tidak ada jalur yang merujuknya; atau biarkan sebagai bahan QA admin.

**Rollout**: `git pull && npm ci && npm run build`, lalu restart PocketBase (hook baru: penyaringan demo, `kind`/`cases`, status jalur, reset progres, penjelasan opsional). Agar konten PneumoniaMNIST yang sudah terbit memakai teks soal baru, penjelasan kosong, dan `mode: practice`: `import_medmnist.py --dry-run --update-existing`, lalu `--apply --update-existing`, lalu `publish_pack.py pneumoniamnist --apply --confirm-reviewed` (record yang diubah kembali ke draft). Tanpa sinkronisasi, objek latihan lama tetap terdeteksi sebagai latihan (aset-nya hanya gambar soal), tetapi penjelasan generik lama masih tampil di umpan balik. Rollback: revert PR dan build ulang; hook backend lama tetap kompatibel dengan klien lama.
