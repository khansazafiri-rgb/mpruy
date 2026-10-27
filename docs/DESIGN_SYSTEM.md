# MEDCOEL Design System

Satu bahasa visual untuk seluruh web. Sumber kebenaran tetap di kode: token warna di `apps/web/src/index.css`,
komponen bersama di `apps/web/src/components/ui.jsx`, bahan dekoratif di `apps/web/src/styles/`.

## Dua register, satu bahasa

| Register | Dipakai untuk | Ciri |
|---|---|---|
| **Tenang** (bawaan) | Belajar dan bekerja: Lab, soal, hasil, formulir, profil, seluruh admin | `.card`: garis 1px, bayangan lembut, latar kertas |
| **Ilustratif** | Momen merek di Beranda dan Mata kuliah, tempat maskot tampil | `.card-chunky` + `.tone-*`, stiker, catatan tulisan tangan |

Aturan praktis: kalau halaman itu dibaca lama atau dipakai bekerja, pakai register tenang. Jangan memberi
`.card-chunky` pada kartu di dalam alur belajar atau admin.

## Tipografi

Satu tangga ukuran, tersedia sebagai kelas:

| Peran | Kelas | Ukuran |
|---|---|---|
| Eyebrow | `.eyebrow` | 12px, huruf kapital, hanya satu per halaman |
| Judul halaman | `.page-title` | 28px, 34px di md ke atas |
| Pengantar | `.page-lead` | 16–17px, maksimal ±65 karakter |
| Judul bagian | `.section-title` | 20–22px |
| Judul kartu | `.card-title` | 17px |
| Isi | (bawaan) | 16px |
| Metadata, keterangan | `.meta` | 13px |

Tidak ada teks di bawah 12px. Judul admin lebih kecil (24/28px) lewat scope `.admin-main`.

## Kartu dan varian fungsi

`.card` (dasar), `.card-link` (bisa diklik), `.card-resume` (lanjutkan belajar), `.card-practice` (latihan / perlu perhatian),
`.card-callout` (catatan informatif), `.card-source` (sumber, lisensi, rujukan), `.card-quiet` (kelompok di dalam kartu).
Hindari kartu di dalam kartu; pakai garis pemisah atau `.card-quiet`.

## Tombol dan kontrol

`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-icon`, `.btn-sm`.
Tinggi minimum 44px pada layar sentuh (40px dengan penunjuk presisi). Memuat: pasang `aria-busy="true"`.
Pilihan mode berdampingan memakai `<Segmented>` (bukan tab buatan sendiri).
Label status memakai `.chip` dengan `.chip-brand` (sukses/terbit), `.chip-warn` (draf/perhatian), `.chip-danger`, `.chip-info`.
Fokus keyboard: garis 2px warna merek di semua elemen interaktif.

## Komponen bersama (`components/ui.jsx`)

`Segmented`, `SectionHeader`, `EmptyState`, `ErrorState` (dengan coba lagi), `Skeleton` / `CardSkeleton`, `Alert`, `Modal`,
`ProgressBar`, `Stat`, `Tabs`. Admin: `components/admin/AdminHeader`.

## Lab: urutan akademik

Disiplin → topik → modul, dengan urutan tetap: Pencitraan Medis, Oftalmologi, Histologi & Histopatologi, Patologi Klinik,
Mikrobiologi, Parasitologi, Anatomi (`features/lab/labTaxonomy.js`). Nama dataset tidak menjadi navigasi; ia muncul di
"Sumber & lisensi". Konten lama dipetakan ke nama kanonik; disiplin tak dikenal tetap ditampilkan setelah yang kanonik.

Contoh gambar berlabel: **judul kategori → gambar → "Ciri yang perlu dicari" → sitasi → sumber/lisensi**. Penjelasan di bawah gambar,
bersifat umum per kelas, tidak mengklaim temuan pada gambar tertentu. Gambar latihan tidak pernah menampilkan label sebelum dijawab.

## Admin

Menu dikelompokkan menurut tugas (Perlu ditangani, Konten belajar, Komunitas & sistem). Tiap halaman dibuka dengan `AdminHeader`:
judul + satu kalimat tentang apa yang bisa dilakukan. Kelola Lab terdiri dari **Konten Lab** (apa yang ada dan perlu ditinjau),
**Impor JSON** (tempel → validasi → pratinjau → draf → terbitkan), dan **Alat lanjutan**.
