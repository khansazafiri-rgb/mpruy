# MEDCOEL Anatomy Fidelity — fase 1: landmark tulang (pilot Humerus.r)

Tanggal audit: 9 November 2026. Sumber: `apps/anatomy/public/data/annotations/`,
`apps/anatomy/src/annotations/schema.js`, `licensing/quarantine-policy.json`,
`apps/anatomy/public/data/systems.json` dan `apps/4d-lab/src/app/atlasLayer.js`.

## Temuan terverifikasi dari kode dan metadata

- Atlas cleared mempunyai struktur `Humerus.r` sebagai **satu mesh tulang**, bukan enam mesh landmark terpisah.
- Annotator sudah memiliki dokumen pilot `data/annotations/skeletal/humerus.r.json` untuk **6 target**:
  1. Head of humerus (*Caput humeri*)
  2. Greater tubercle (*Tuberculum majus*)
  3. Lesser tubercle (*Tuberculum minus*)
  4. Deltoid tuberosity (*Tuberositas deltoidea*)
  5. Intertubercular sulcus (*Sulcus intertubercularis*)
  6. Radial groove (*Sulcus nervi radialis*)
- **Semuanya `NOT_MAPPED`, `geometry: null` dan belum mempunyai titik/region valid.**
- `spatialSource.modelSha256` dalam dokumen lama adalah `c2b70b31ddec4062cbc5ba969fc24ecfed61d00397a0bca795e2701d997200f8`. Hash yang sama tercantum sebagai file `skeletal.glb` **asal yang telah dikarantina dan diganti** dalam `licensing/quarantine-policy.json`. Jangan anggap anotasi lama kompatibel dengan file `skeletal.glb` yang sekarang hanya karena mesh humerus kemungkinan bertahan selama proses pruning; identitas geometri dan indeks faset tetap perlu dicek terhadap aset cleared.
- Metadata ini bukan bukti bahwa tuberkulum secara geometris tidak ada. Belum ada anotasi tervalidasi yang dapat dipakai menunjuknya dengan tepat.

## Hasil implementasi dalam PR ini

Buka 4D Lab → **Panel → Anatomi & Citra → Anatomi 3D → Landmark tulang**. Tombol **Pilih humerus kanan & audit landmark** memilih `Humerus.r`, menyorotnya lewat atlas, dan mengambil dokumen anotasi dari direktori shared Atlas yang sudah ada. Panel menampilkan keenam nama dan status dalam bahasa jelas.

Fitur **read-only**. Tidak membuat geometry baru, tidak menambahkan marker palsu, tidak mengubah mesh, CT, USG, kamera atau koordinat LPS. Loading error tidak mengganggu simulator. Modul `skeletalLandmarks.js` sengaja memiliki `renderableMarkers: 0` untuk semua input dan mengklasifikasikan SHA lama sebagai **source yang memerlukan remapping**. Ia tidak menampilkan anchor dari status apa pun. Unit test memastikan dokumen sumber asli masih NOT_MAPPED, hash ada dalam kebijakan karantina, path fetch terikat pada dua file publik yang diizinkan, dan tidak ada pin walaupun status diubah secara artifisial.

## Langkah agar pin landmark 3D layak dipublikasikan (PR lanjutan)

1. Ambil **hanya** mesh skeletal cleared dari `apps/anatomy/public/models/skeletal.glb`. Jaga provenance/licensing, dan jangan mengembalikan file lama yang dikarantina.
2. Di Annotator, tandai *surface_region* atau *surface_line* pada `Humerus.r` menggunakan face index dan barycentric coordinate **pada mesh baru**. Perbarui source SHA/geometry hashes, dan verifikasi bahwa permukaan bertahan dalam transformasi Atlas → pasien LPS.
3. Peninjauan **manual oleh ahli anatomi** untuk batas tiap tubercle/tuberosity/sulcus; anotasi yang hanya berbasis nama atau bounding box tidak cukup.
4. Ikuti status `NOT_MAPPED → DRAFT → ANNOTATED → REVIEWED → VERIFIED` yang sudah didefinisikan di annotator. Larang geometri yang belum VERIFIED tampil sebagai indikator lokasi anatomis.
5. Tambahkan perbandingan visual (anterior/posterior/lateral), tes face-index/hash terhadap mesh pruned terkini, dan tes browser yang memastikan marker tidak berpindah saat kamera/CT bergerak.
6. Perluas ke humerus kiri, skapula, femur, tibia, atlas/axis dan landmark tulang lain **setelah** satu pilot diterima.

## QA sebelum merge

- `npm run test:licensing`
- `npm run test:4d-lab`
- `npm run build:4d-lab`
- `node apps/4d-lab/test/e2e/atlas-e2e.mjs --shots` (membutuhkan Playwright)
- Safari: pilih pilot, pastikan terbaca **0/6 status pemetaan** serta **0 pin 3D tervalidasi**, nama-nama tampil benar, sorotan humerus tidak mengubah pose CT/USG, tombol isolasi/pulihkan tetap aman, dan error jaringan tidak membuat layar putih.

**Tidak ada klaim validasi medis penuh.** Perbaikan ini membuat ketidaklengkapan anatomi terlihat jelas dan menyiapkan jalur audit ilmiah, bukan berpura-pura menyelesaikan anotasi yang belum dilakukan.
