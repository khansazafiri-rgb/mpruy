# Catatan materi per BAB ("Pelajari materi")

Alur siswa: **Mata kuliah → pilih BAB → pilih "Belajar materi" atau "Latihan soal"**.
Catatan materi dibaca sebagai halaman buku catatan bergambar (daftar isi, gambar yang bisa diperbesar,
kotak klinis, poin high-yield yang bisa dicentang, maskot Kori/Kila/Nilo), lalu ditutup dengan tombol
ke latihan soal BAB yang sama.

## Di mana datanya

| Apa | Di mana |
|---|---|
| Isi catatan | koleksi PocketBase `chapter_notes` (satu catatan per BAB, bidang `content`, maksimal 200.000 karakter) |
| Sumber di repo | `apps/pocketbase/content/materi/index.json` + `apps/pocketbase/content/materi/<mata-kuliah>/bab-NN-*.md` |
| Pemasangan pertama | migrasi `1800002500_seed_materi.js` (jalan otomatis saat PocketBase dijalankan ulang di `update.sh`) |
| Pembaruan isi | `apps/pocketbase/scripts/import-materi.mjs` |
| Tampilan siswa | `pages/SubjectNotes.jsx` + `components/ChapterNotes.jsx` + `styles/notes.css` |
| Pratinjau admin | `components/admin/ChapterNotesEditor.jsx` (memakai komponen yang sama dengan siswa) |
| Penguraian format | `lib/notesMarkup.js` (murni, dites di `notesMarkup.test.mjs`) |

Admin tetap bisa menulis atau mengubah catatan satu BAB lewat **Admin > Mata kuliah & BAB > Kelola BAB > Catatan**.
Catatan yang ditulis tangan seperti itu tidak pernah ditimpa oleh migrasi maupun skrip impor (kecuali `--force`).

## Format catatan (`materi:v2`)

Baris pertama harus `<!-- materi:v2 -->`. Catatan tanpa penanda ini dianggap format lama dan tetap tampil
apa adanya (HTML sederhana dan penanda ringkas, lihat `docs/FORMAT_SOAL.md`).

```markdown
<!-- materi:v2 -->

## Tujuan Belajar {tujuan}

Setelah mempelajari bab ini, mahasiswa diharapkan mampu:

- menjelaskan **posisi anatomis**;
- membedakan bidang dan potongan tubuh.

## Konsep Dasar Anatomi

Paragraf biasa. Baris yang berurutan tanpa baris kosong menjadi satu paragraf.

### Subjudul

- **Istilah**: penjelasan singkat
- butir biasa

1. langkah pertama
2. langkah kedua

![Keterangan gambar, tanpa tulisan "Gambar N".](https://lh3.googleusercontent.com/d/FILE_ID "Sumber, pembuat, lisensi")

> [!klinis] Clinical anchor
> Isi kotak: paragraf atau butir.

## Clinical Correlations {klinis}
## High-Yield & Exam Traps {highyield}
## Checklist Identifikasi Cepat untuk Praktikum {praktikum}
## Sumber & Atribusi {sumber}

# Bagian B: Genitalia Wanita
```

- `## Judul` membuka bagian. Jenis opsional di akhir judul: `{tujuan}`, `{klinis}`, `{highyield}`, `{praktikum}`, `{sumber}`.
  Bagian biasa dan `{klinis}` diberi nomor otomatis (tidak perlu menulis "1.", "2.").
- `{highyield}` dan `{praktikum}`: butir daftarnya jadi daftar centang ("sudah hafal" / "sudah dikenali"). Centang disimpan
  di peramban siswa per BAB.
- `{sumber}` tampil terlipat di akhir bab.
- `# Bagian X: Judul` adalah pembatas bagian besar untuk BAB yang sangat panjang (dipakai BAB Urogenital).
- Kotak sorot: `[!klinis]`, `[!warning]` (jebakan ujian), `[!highyield]`, `[!tip]`, `[!info]`.
- Gambar: satu baris, tautan `lh3.googleusercontent.com/d/FILE_ID` (tautan Drive biasa juga diubah otomatis). Nomor "Gambar N"
  dibuat otomatis menurut urutan kemunculan, jadi rujukan di teks harus ditulis "Gambar 3", dan nomor itu mengikuti urutan gambar di BAB.
  Teks dalam tanda kutip setelah tautan menjadi baris "Sumber: ...".
- Penanda ringkas di dalam teks: `**tebal**`, `*miring*`, `==sorotan==`, `~sub~`, `^sup^`, `[teks](https://tautan)`.

## Mengubah dokumen Google Docs / Word menjadi catatan

Dokumen sumber memakai Heading 1 untuk tiap "Bab N — Judul", Heading 2 untuk bagian bernomor, dan Heading 3
untuk subjudul; tautan gambar `lh3` berdiri sendiri satu baris, diikuti baris "Gambar N.M. Keterangan".

```bash
pip install python-docx
python3 tools/materi-import/docx_to_materi.py "Anatomi - Catatan Belajar.docx" --subject anatomi --subject-name Anatomi --report
```

Konverter memetakan tiap BAB di dokumen ke BAB di web lewat **judulnya** (docs/MATA_KULIAH.md), bukan nomornya,
karena urutan di dokumen (Bab 1–20) berbeda dengan urutan alfabetis di web. Bila ada judul yang tidak cocok atau ganda,
konverter berhenti dan menyebutkan yang bermasalah. `--report` mencetak:

- bagian yang sengaja dibuang (lihat di bawah),
- subjudul yang ditebak dari baris pendek tanpa gaya judul (periksa sekilas),
- gambar yang belum punya atribusi,
- paragraf sumber yang hilang dari keluaran (harus kosong).

Yang diubah konverter:

- Gaya judul di ekspor Google Docs sering "bocor" ke paragraf biasa; judul dikenali dari bentuk teksnya, bukan hanya gayanya.
- Butir `• ...` jadi daftar; label seperti `Clinical anchor:` / `Exam trap:` jadi kotak sorot; `Istilah: penjelasan` pada
  daftar dan paragraf pendek jadi **Istilah**: penjelasan.
- Nomor gambar dibuat ulang berurutan per BAB (dokumen memakai 6.4 sebelum 6.2); rujukan "Gambar 6.4" di teks ikut diganti.
- Rujukan "Bab 8" (nomor di dokumen) diganti nama BAB-nya ("bab Anatomi Paru dan Saluran Napas"), karena nomornya tidak sama
  dengan urutan di web. Rujukan ke BAB sendiri menjadi "bab ini".
- Atribusi gambar (`Sumber visual`) dipasang di bawah gambarnya, dan daftar lengkapnya tetap ada di bagian Sumber.

Yang sengaja **tidak** dimasukkan karena urusan penyusun dokumen: baris pembuka (`Sumber utama`, `STATUS`, `Aturan visual`),
bagian "Ringkasan untuk Retrieval AI MEDCOEL", "Catatan editorial", dan kalimat "master note" di sumber.
Bila ada kata yang perlu dibuang lagi, tambahkan pola di `INTERNAL_LINE` / `SCRUB` pada konverter.

Keluarannya (`content/materi`) ikut di-commit supaya migrasi bisa memasukkannya tanpa Python di server.

## Memasukkan atau memperbarui di server

Pemasangan pertama otomatis lewat migrasi. Setelah isi dokumen berubah dan konverter dijalankan ulang:

```bash
cd apps/pocketbase
PB_URL=https://medcoel.com PB_SU_EMAIL=... PB_SU_PASSWORD=... node scripts/import-materi.mjs --dry   # lihat dulu
PB_URL=https://medcoel.com PB_SU_EMAIL=... PB_SU_PASSWORD=... node scripts/import-materi.mjs         # terapkan
```

Skrip hanya membuat catatan baru atau memperbarui catatan yang berpenanda `materi:v2`; catatan tulisan admin dilewati
(`--force` untuk menimpa).

## Mata kuliah lain

Dokumen mata kuliah lain dengan susunan yang sama bisa diproses dengan perintah di atas (`--subject biokimia --subject-name "Biokimia & Biologi Molekuler"`).
Tampilan, migrasi, dan skrip impor tidak perlu diubah; migrasi `1800002500` membaca seluruh `index.json`, jadi mata kuliah
baru cukup ditambahkan ke `index.json` lalu diimpor dengan skrip (atau dibuat migrasi seed baru bernomor lebih besar).
Bila memakai migrasi baru, naikkan `REQUIRED_MIGRATION` di `apps/web/src/lib/serverVersion.js`.
Atribusi gambar yang di dokumen tidak tertulis per gambar dapat ditambahkan lewat `CREDIT_OVERRIDES` di konverter.
