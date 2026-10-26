# Panduan identifikasi BloodMNIST dan PneumoniaMNIST

Perubahan berangkat dari main `a127a80166f33e73bc90441853e6cde2d02ac70e` (PR Blood #30 sudah merged). Scope: isi materi belajar dan penyajian panduan di dalam lesson yang sudah ada. Tidak ada perubahan navigasi Lab, admin UX, 3D, atau penambahan dataset lain.

## BloodMNIST — panduan final

Tabel berikut dibagi sesuai object yang sudah ada: Granulosit (Neutrofil, Eosinofil, Basofil, Granulosit imatur), lalu Limfosit/Monosit/Eritroblas/Trombosit. Di galeri, setiap kelas memperoleh kotak **Ciri yang perlu dicari**, perbandingan singkat, dan sumber pembelajaran.

| Sel | Nukleus | Sitoplasma / granula | Kunci identifikasi |
| --- | --- | --- | --- |
| Neutrofil | Nukleus matang bersegmen; lobus dihubungkan jembatan tipis. | Sitoplasma pucat dengan granula halus. | Cari gabungan segmentasi nukleus dan granula yang tidak terlalu mencolok. [ASH Image Bank · Segmented neutrophil](https://imagebank.hematology.org/image/60395/segmented-neutrophil) [Histology Atlas · Leukocytes](https://audilab.bme.mcgill.ca/HA/html/blood_T1_E.html) |
| Eosinofil | Nukleus umumnya bilobus, tetapi bentuknya dapat bervariasi. | Granula kasar merah-oranye banyak mengisi sitoplasma. | Gabungkan warna dan ukuran granula dengan bentuk nukleus; jangan memakai satu ciri saja. [ASH Image Bank · Eosinophil](https://imagebank.hematology.org/image/60934/eosinophil) |
| Basofil | Kontur nukleus dapat tersamar oleh granula. | Granula besar dan gelap berwarna biru-ungu. | Granula kasar yang menutupi sebagian nukleus menjadi petunjuk penting. [ASH Image Bank · Basophil](https://imagebank.hematology.org/image/1590/basophil--1) |
| Granulosit imatur | Bentuk nukleus dan kepadatan kromatin berubah menurut maturasi. | Jenis dan jumlah granula bervariasi menurut tahap maturasi. | Kenali sebagai kelompok granulosit yang belum matang; tidak ada satu pola morfologi tunggal. [ASH Image Bank · Promyelocyte](https://imagebank.hematology.org/image/60399/promyelocyte) [ASH Image Bank · Myelocyte](https://imagebank.hematology.org/image/60507/myelocyte) [ASH Image Bank · Metamyelocyte](https://imagebank.hematology.org/image/60398/metamyelocytes) |
| Limfosit | Nukleus umumnya bulat dengan kromatin padat; pada limfosit kecil, nukleus mendominasi sel. | Sitoplasma relatif sedikit, berupa tepi biru pucat pada limfosit kecil yang istirahat. | Cari dominasi nukleus padat dan tepi sitoplasma yang tipis; bentuk limfosit dapat bervariasi. [ASH Image Bank · Lymphocyte](https://imagebank.hematology.org/image/60511/lymphocyte) [Histology Atlas · Leukocytes](https://audilab.bme.mcgill.ca/HA/html/blood_T1_E.html) |
| Monosit | Nukleus tidak teratur, berlekuk atau menyerupai ginjal; kromatin relatif lebih halus. | Sitoplasma luas berwarna abu-biru; vakuola dapat terlihat. | Gabungkan ukuran sel relatif besar, lekukan nukleus, dan sitoplasma yang luas. [ASH Image Bank · Monocyte](https://imagebank.hematology.org/image/60935/monocyte) |
| Eritroblas | Prekursor eritroid berinti; kromatin makin padat selama maturasi. | Warna sitoplasma berubah dari biru menuju abu-merah muda seiring bertambahnya hemoglobin. | Ukuran sel dan rasio nukleus:sitoplasma umumnya berkurang selama maturasi; nilai ciri sebagai rangkaian. [ASH Image Bank · Erythroid Precursors](https://imagebank.hematology.org/image/60292/erythroid-precursors) |
| Trombosit | Tidak memiliki nukleus. | Fragmen sitoplasma sangat kecil dengan granula ungu dan bagian sitoplasma biru pucat. | Cari fragmen kecil tanpa inti; jangan menyimpulkan ukuran absolut dari pembesaran crop gambar. [ASH Image Bank · Normal platelet](https://imagebank.hematology.org/image/60932/normal-platelet) |

**Neutrofil — pembeda dan batas:**

- Eosinofil: granula lebih kasar dan merah-oranye; basofil: granula gelap dapat menutupi nukleus. [ASH Image Bank · Eosinophil](https://imagebank.hematology.org/image/60934/eosinophil) [ASH Image Bank · Basophil](https://imagebank.hematology.org/image/1590/basophil--1)

**Eosinofil — pembeda dan batas:**

- Neutrofil: granula lebih halus; basofil: granula biru-ungu sangat gelap. [Histology Atlas · Leukocytes](https://audilab.bme.mcgill.ca/HA/html/blood_T1_E.html) [ASH Image Bank · Basophil](https://imagebank.hematology.org/image/1590/basophil--1)

**Basofil — pembeda dan batas:**

- Eosinofil: granula cenderung merah-oranye, bukan biru-ungu gelap. [ASH Image Bank · Eosinophil](https://imagebank.hematology.org/image/60934/eosinophil)

**Granulosit imatur — pembeda dan batas:**

- Neutrofil matang umumnya memiliki nukleus bersegmen. [ASH Image Bank · Segmented neutrophil](https://imagebank.hematology.org/image/60395/segmented-neutrophil)
- BloodMNIST mengelompokkan beberapa tahap maturasi granulosit dalam satu kategori Granulosit Imatur, sehingga morfologinya dapat bervariasi. [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py)
- Label ini tidak cukup untuk menetapkan subtipe maturasi pada satu citra. [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py)

**Limfosit — pembeda dan batas:**

- Monosit: umumnya lebih besar dengan nukleus berlekuk dan sitoplasma lebih luas. [ASH Image Bank · Monocyte](https://imagebank.hematology.org/image/60935/monocyte)

**Monosit — pembeda dan batas:**

- Limfosit kecil: kromatin lebih padat dan sitoplasma lebih sedikit. [ASH Image Bank · Lymphocyte](https://imagebank.hematology.org/image/60511/lymphocyte) [ASH Image Bank · Monocyte](https://imagebank.hematology.org/image/60935/monocyte)

**Eritroblas — pembeda dan batas:**

- Label Eritroblas pada pack ini tetap luas; tahap maturasi tiap citra belum ditetapkan melalui anotasi tersendiri. [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py) [ASH Image Bank · Erythroid Precursors](https://imagebank.hematology.org/image/60292/erythroid-precursors)

**Trombosit — pembeda dan batas:**

- Sel darah putih memiliki nukleus; bandingkan keberadaan inti dan struktur sitoplasma. [ASH Image Bank · Normal platelet](https://imagebank.hematology.org/image/60932/normal-platelet) [Histology Atlas · Leukocytes](https://audilab.bme.mcgill.ca/HA/html/blood_T1_E.html)

Sumber ASH digunakan untuk keterangan morfologi umum; ASH tidak diklaim sebagai pembuat citra MedMNIST. Rujukan McGill hanya mendukung fakta morfologi, bukan gambar yang ditampilkan. Tidak ada gambar atau paragraf panjang dari sumber pengajaran yang disalin.

## PneumoniaMNIST — panduan final

**Cara Membaca Pola Dasar**

Mulai dengan kualitas dan aerasi citra, lalu bandingkan opasitas. Ini latihan interpretasi gambar, bukan pemeriksaan klinis lengkap. [WHO standardised definitions · clarified radiographic terminology](https://who-cres.mcri.edu.au/who-methodology/definitions/) [Pneumonia in the Immunocompetent Child · reviewed 2021](https://www.radiologyinfo.org/en/info/acs-pneumonia-immunocompetent-child)

**Normal vs Pneumonia**

| Aspek | Normal | Pneumonia / opasitas abnormal |
| --- | --- | --- |
| Lapang paru | Relatif teraerasi; cari ketiadaan opasitas fokal yang jelas. | Dapat terdapat peningkatan opasitas dengan distribusi yang bervariasi. |
| Konsolidasi | Tidak dicari sebagai temuan normal; periksa adanya opasitas air-space yang jelas. | Dapat berupa opasitas padat atau saling menyatu; bukan ciri wajib setiap citra. |
| Air bronchogram | Bukan temuan abnormal yang diharapkan pada paru teraerasi tanpa konsolidasi. | Bronkus berisi udara dapat tampak di dalam daerah konsolidasi. |
| Infiltrat lain | Cari ketiadaan pola infiltrat patologis yang jelas. | Dapat berupa opasitas linier atau bercak; istilah ini tidak menentukan penyebab. |
| Efusi pleura | Cari ketiadaan cairan pleura yang jelas. | Dapat berupa cairan di ruang pleura lateral; hanya pada sebagian kasus. |

Terminologi tabel diparafrasekan dari [WHO/Cherian et al. (2005)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2626240/) dan [klarifikasi WHO CRES](https://who-cres.mcri.edu.au/who-methodology/definitions/). Bahasa “padat atau menyatu” mengikuti klarifikasi terminologi; tabel tidak mengklaim setiap citra Pneumonia memenuhi definisi end-point WHO.

**Normal — Ciri yang perlu dicari**

- Cari lapang paru yang relatif teraerasi, tanpa opasitas air-space fokal yang jelas. [WHO standardised definitions · clarified radiographic terminology](https://who-cres.mcri.edu.au/who-methodology/definitions/)
- Periksa apakah ada konsolidasi, infiltrat lain, atau efusi yang jelas. [WHO standardised definitions · clarified radiographic terminology](https://who-cres.mcri.edu.au/who-methodology/definitions/)
- Label Normal bukan jaminan tidak adanya semua kelainan atau temuan insidental. [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py) [O’Grady et al. · The radiological diagnosis of pneumonia in children (2014)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5922330/)

**Pneumonia — Ciri yang perlu dicari**

- Cari area opasitas yang meningkat; distribusinya dapat fokal atau berupa bercak. [Cherian et al. · Standardized interpretation of paediatric chest radiographs (2005)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2626240/) [O’Grady et al. · The radiological diagnosis of pneumonia in children (2014)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5922330/)
- Konsolidasi dan air bronchogram dapat terlihat pada sebagian gambar. [Cherian et al. · Standardized interpretation of paediatric chest radiographs (2005)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2626240/)
- Pola infiltrat dapat bervariasi; efusi mungkin menyertai sebagian kasus dan bukan syarat semua citra. [WHO standardised definitions · clarified radiographic terminology](https://who-cres.mcri.edu.au/who-methodology/definitions/)
- Tidak semua gambar berlabel Pneumonia menunjukkan semua ciri di atas. [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py)

**Apa yang harus dilihat?**

1. Bagaimana kualitas citra dan aerasi kedua lapang paru?
2. Adakah area opasitas yang meningkat?
3. Apakah pola opasitas tampak fokal, bercak, atau lebih menyebar?
4. Adakah pola konsolidasi?
5. Adakah kemungkinan air bronchogram di dalam opasitas?
6. Adakah tanda cairan pleura yang perlu diperhatikan?

Checklist memakai kerangka observasi [WHO CRES](https://who-cres.mcri.edu.au/who-methodology/definitions/), bukan kesimpulan hasil review citra individual.

**Batas dan konteks yang ditampilkan:**

- Kerangka WHO menstandarkan pembacaan radiograf anak untuk penelitian epidemiologi; tabel ini bukan algoritme diagnosis klinis. [Cherian et al. · Standardized interpretation of paediatric chest radiographs (2005)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2626240/)
- Label MedMNIST hanya Normal/Pneumonia pada tingkat gambar. Label ini tidak memberi lokasi lesi, lobus, organisme, atau etiologi. [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py)
- Pola radiograf tidak cukup spesifik untuk menetapkan etiologi bakteri atau virus. [O’Grady et al. · The radiological diagnosis of pneumonia in children (2014)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5922330/)
- Foto toraks tidak rutin diperlukan pada anak dengan pneumonia komunitas tanpa komplikasi yang tampak baik dan tidak memerlukan rawat inap. Modul ini melatih interpretasi citra yang sudah tersedia. [Pneumonia in the Immunocompetent Child · reviewed 2021](https://www.radiologyinfo.org/en/info/acs-pneumonia-immunocompetent-child)

## Sumber dan proses authoring

Riset dilakukan saat authoring, lalu disimpan sebagai JSON terkurasi. Setiap pernyataan memiliki ID sumber, yang merujuk organisasi, judul resource, URL, dan tanggal akses 26 Oktober 2026. Detail pernyataan bukan hasil pencarian/LLM saat siswa membuka halaman. Sumber gambar/lisensinya tetap ditampilkan terpisah dari sumber morfologi/radiologi.

Pernyataan disusun ulang dalam bahasa Indonesia. Sintesis pengenalan (“gabungkan ciri”) adalah petunjuk belajar yang diturunkan dari ciri-ciri rujukan, bukan diagnosis atau temuan terverifikasi pada suatu gambar.

Rujukan pendidikan yang digunakan:

- American Society of Hematology: [ASH Image Bank · Segmented neutrophil](https://imagebank.hematology.org/image/60395/segmented-neutrophil).
- American Society of Hematology: [ASH Image Bank · Eosinophil](https://imagebank.hematology.org/image/60934/eosinophil).
- American Society of Hematology: [ASH Image Bank · Basophil](https://imagebank.hematology.org/image/1590/basophil--1).
- American Society of Hematology: [ASH Image Bank · Lymphocyte](https://imagebank.hematology.org/image/60511/lymphocyte).
- American Society of Hematology: [ASH Image Bank · Monocyte](https://imagebank.hematology.org/image/60935/monocyte).
- American Society of Hematology: [ASH Image Bank · Normal platelet](https://imagebank.hematology.org/image/60932/normal-platelet).
- American Society of Hematology: [ASH Image Bank · Erythroid Precursors](https://imagebank.hematology.org/image/60292/erythroid-precursors).
- American Society of Hematology: [ASH Image Bank · Myelocyte](https://imagebank.hematology.org/image/60507/myelocyte).
- American Society of Hematology: [ASH Image Bank · Metamyelocyte](https://imagebank.hematology.org/image/60398/metamyelocytes).
- American Society of Hematology: [ASH Image Bank · Promyelocyte](https://imagebank.hematology.org/image/60399/promyelocyte).
- McGill University: [Histology Atlas · Leukocytes](https://audilab.bme.mcgill.ca/HA/html/blood_T1_E.html).
- MedMNIST: [MedMNIST · source label definitions](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py).
- World Health Organization: [Cherian et al. · Standardized interpretation of paediatric chest radiographs (2005)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2626240/).
- WHO CRES / Murdoch Children’s Research Institute: [WHO standardised definitions · clarified radiographic terminology](https://who-cres.mcri.edu.au/who-methodology/definitions/).
- American College of Radiology / RSNA: [Pneumonia in the Immunocompetent Child · reviewed 2021](https://www.radiologyinfo.org/en/info/acs-pneumonia-immunocompetent-child).
- Pneumonia journal: [O’Grady et al. · The radiological diagnosis of pneumonia in children (2014)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5922330/).

ICSH overview/DOI 10.1111/ijlh.12327 turut diperiksa untuk konteks standardisasi nomenklatur; tidak digunakan untuk mengklaim rincian morfologi yang tidak dibaca dari sumber tersebut. Klaim spesifik pada payload mengacu ke sumber yang benar-benar menopang pernyataannya.

## Review gambar dan keselamatan medis

**Tidak ada gambar MedMNIST individual yang direview secara visual dalam perubahan ini.** Pengujian tampilan menggunakan ilustrasi sintetis lokal. Tidak ada `observedFeatures`, anotasi baru, koordinat, bounding box, panah, heatmap, atau label lobus yang dibuat. Seluruh materi baru adalah **class-level educational features**; tidak ada **verified image-specific observations** baru.

Riset sumber bukan pengganti review klinisi. Review klinis/editorial materi baru masih pending. Approval memakai status/revision/reviewedBy/reviewedAt learning object yang sudah ada; tidak ditambahkan database review kedua. Impor pembaruan melalui API mengembalikan record yang berubah menjadi draft, dan tidak menandainya sudah direview.

Tidak ada inferensi penyakit dari sel darah, penetapan subtipe eritroblas, atau pemecahan label granulosit imatur menjadi soal tahap maturasi. Pada CXR tidak ada etiologi bakteri/virus yang disimpulkan atau lokalisasi lesi yang dibuat dari label. Panduan menyebut batas radiografi dan bahwa foto toraks tidak rutin dibutuhkan untuk semua pneumonia anak tanpa komplikasi.

## Implementasi dan dampak operasional

- Konten terkurasi: `tools/lab-ingest/content/identification-guides.json`; loader authoring: `identification_guides.py`.
- Data learning object: `data.studyGuide`, schema versi 1, scope `class`. Validator PocketBase membatasi struktur, sumber HTTPS, panjang teks, kunci unik, referensi sumber yang valid, dan menolak HTML maupun guide pada object practice. Field observasi/koordinat tidak diteruskan.
- `LabStudyGuide` menyajikan tabel desktop dan kartu mobile; `LabImageGallery` menaruh petunjuk kelas tepat di dekat gambar kelas terkait. Lesson lama tanpa guide tetap dapat dibuka. Guide tidak dikirim sebagai bagian payload soal.
- Gallery tidak diubah menjadi visual engine baru. UI sumber gambar tetap dipakai; disclosure pendidikan memiliki label berbeda.
- Importer kedua dataset menyertakan guide hanya pada lesson. Blood tetap learning 40/practice 24; Pneumonia learning 20/practice 10 dengan arsip legacy tetap aman. Sampler, seed, pilihan, posisi kunci, filename, dan pemisahan gambar tidak berubah.
- Prompt Pneumonia disederhanakan menjadi **Foto toraks ini termasuk kategori mana?** tanpa kata “benchmark”. Tipe visual, pilihan Normal/Pneumonia, dan feedback label-only tidak berubah.
- Endpoint admin read-only `/api/medcoel/admin/lab-capabilities` mengiklankan `studyGuide: 1`. Importer mengeceknya sebelum menulis supaya backend lama tidak diam-diam membuang metadata baru.

Saat operator kelak memperbarui sistem setelah review/merge, backend hook yang mendukung schema harus dimuat sebelum mengimpor panduan. Tidak diperlukan migrasi collection/database. Dengan dataset/cache yang sama, pembaruan Blood mengubah dua lesson; pembaruan Pneumonia mengubah lesson dan prompt sepuluh soal. Record berubah kembali ke draft dan perlu review ulang; yang identik tidak diubah. Catatan ini adalah rencana operasi, bukan deployment yang sudah dilakukan.

## Pengujian terfokus

- 7 tes baru authoring/provenance lulus: cakupan kelas, sumber tiap pernyataan, caveat maturasi, guide CXR, batas lokalisasi, jumlah latihan, kapabilitas backend, dan no-op/update draft.
- 11 tes offline Blood serta 25 tes sampling/resolusi pack Pneumonia lulus.
- 10 tes unit backend lulus, termasuk schema panduan, sumber/HTML tidak valid, dan kompatibilitas konten lama.
- 3 tes render frontend lulus: kedua lesson, guide opsional/tersembunyi pada practice, dan tidak ada dependency live-search/LLM pada renderer. React memberi warning SSR dari useLayoutEffect viewer lama; render assertions tetap lulus.
- 32 pemeriksaan HTTP migrasi Pneumonia dan 177 pemeriksaan HTTP Blood lulus pada PocketBase localhost disposable.
- Pemeriksaan tambahan: panduan ketiga lesson sama setelah storage → preview → API siswa; endpoint capability menolak akun siswa.
- Browser lokal: dua dataset × lebar iframe 360/768/1280 px, enam kasus lulus; scrollWidth sama dengan viewport, kartu aktif pada 360 px, tabel pada 768/1280 px, semua petunjuk kelas muncul. Fixture menguji lesson tanpa shell navigasi aplikasi; shell global tidak diubah.
- ESLint file frontend yang berubah lulus; build Vite production lulus (3,73 detik). Tidak ada dependency baru.

Production tidak diakses, tidak di-deploy, tidak di-restart, dan konten production tidak diterbitkan. PathMNIST/OCTMNIST tetap tidak dimulai.
