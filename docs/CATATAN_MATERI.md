# Catatan materi per BAB ("Pelajari materi")

Alur siswa: **Mata kuliah → pilih BAB → tiga langkah: "Belajar materi" → "Flashcard" → "Latihan soal"**
(boleh loncat ke mana saja). Catatan materi dibaca sebagai halaman buku catatan bergambar (daftar isi, gambar
yang bisa diperbesar, kotak klinis, poin high-yield yang bisa dicentang, maskot Kori/Kila/Nilo), lalu ditutup
dengan tombol ke flashcard dan latihan soal BAB yang sama.

Mata kuliah yang sudah terpasang: **Anatomi** (20 BAB), **Histologi** (12 BAB), dan **Fisiologi** (20 BAB).

## Di mana datanya

| Apa | Di mana |
|---|---|
| Isi catatan | koleksi PocketBase `chapter_notes` (satu catatan per BAB, bidang `content`, maksimal 200.000 karakter) |
| Sumber di repo | `apps/pocketbase/content/materi/index.json` + `apps/pocketbase/content/materi/<mata-kuliah>/bab-NN-*.md` |
| Pemasangan pertama | migrasi `1800002500_seed_materi.js` (jalan otomatis saat PocketBase dijalankan ulang di `update.sh`) |
| Pembaruan isi | otomatis (lihat "Sinkronisasi" di bawah), atau manual lewat `apps/pocketbase/scripts/import-materi.mjs` |
| Flashcard | bagian `## Flashcard {kartu}` di dalam catatan yang sama (tidak ada koleksi baru), halaman `pages/SubjectCards.jsx` + `components/FlashcardDeck.jsx` |
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

## Flashcard {kartu}

- [Femur] Collum femoris :: bagian yang rentan fraktur pada lansia

# Bagian B: Genitalia Wanita
```

- `## Judul` membuka bagian. Jenis opsional di akhir judul: `{tujuan}`, `{klinis}`, `{highyield}`, `{praktikum}`, `{kartu}`
  (`{sumber}` masih dikenali bila ditulis admin, tetapi konverter tidak membuatnya lagi: sumber tiap gambar sudah tampil di bawah gambarnya).
  Bagian biasa dan `{klinis}` diberi nomor otomatis (tidak perlu menulis "1.", "2.").
- `{highyield}` dan `{praktikum}`: butir daftarnya jadi daftar centang ("sudah hafal" / "sudah dikenali"). Centang disimpan
  di peramban siswa per BAB.
- `{kartu}` tidak tampil di bacaan; isinya dipakai halaman flashcard. Satu kartu per butir: `Depan :: Belakang`, dengan
  `[Konteks] ` opsional di depan (ditampilkan sebagai label kecil). Baris lanjutan yang menjorok dua spasi menjadi baris berikutnya
  di sisi belakang. Butir tanpa ` :: ` diabaikan. Tanda "hafal" siswa disimpan di peramban memakai kode dari isi kartu,
  jadi tetap berlaku bila catatan diperbarui dan kartunya tidak berubah.
- `{sumber}` (bila ada) tampil terlipat di akhir bab.
- `# Bagian X: Judul` adalah pembatas bagian besar untuk BAB yang sangat panjang (dipakai BAB Urogenital).
- Kotak sorot: `[!klinis]`, `[!warning]` (jebakan ujian), `[!highyield]`, `[!tip]`, `[!praktikum]`, `[!info]`.
- Beberapa baris gambar berurutan menjadi satu **galeri** (misalnya tiga sediaan histologi); keterangan dan sumber ditulis di baris
  terakhir dan berlaku untuk semuanya. Pembaca bisa membuka lightbox dan berpindah antargambar.
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

Mata kuliah yang sudah diproses dengan cara ini: `--subject histologi --subject-name Histologi` dan `--subject fisiologi --subject-name Fisiologi`.
Setelah mengubah konverter, jalankan ulang ketiganya dan periksa `git diff content/materi` supaya perubahan tidak merusak yang lain.

Konverter memetakan tiap BAB di dokumen ke BAB di web lewat **judulnya** (docs/MATA_KULIAH.md), bukan nomornya,
karena nomor di dokumen tidak selalu sama dengan nomor BAB di web (BAB di web mengikuti Google Doc "Rekap Bab per Mata Kuliah", lihat docs/MATA_KULIAH.md). Bila ada judul yang tidak cocok atau ganda,
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
- Atribusi gambar (`Sumber visual`, atau "Sumber:" di keterangannya) dipasang di bawah gambarnya. Bagian "Sumber & Atribusi"
  di akhir dokumen **tidak dimasukkan** ke catatan (supaya pembaca tidak bingung); `--report` tetap menyebut gambar yang belum
  punya atribusi.
- Alur atau rincian yang ditulis per baris tanpa baris kosong (baris berakhiran `→`, `=`, `+`, `;` atau berawalan `+ `/`→`) disambung
  menjadi satu paragraf; keterangan `Gambar Bab N — ...` (Fisiologi) dikenali seperti `Gambar N.M. ...`.
- Gambar yang ditaruh sebelum bagian pertama (Fisiologi: satu gambar di bawah judul tiap BAB) tampil sebagai pembuka di atas bacaan
  (tidak masuk daftar isi).
- Dokumen yang memecah satu paragraf atau keterangan gambar menjadi beberapa paragraf (sering di Histologi) disambung lagi otomatis;
  keterangan dipasangkan ke gambar menurut urutan, dan beberapa gambar dengan satu keterangan menjadi galeri.
- Flashcard dibuat otomatis oleh `tools/materi-import/flashcards.py` **hanya dari teks catatan itu sendiri**
  (definisi "Istilah: penjelasan" / "X = Y" / "X adalah Y", poin high-yield, daftar ciri, kotak klinis dan praktikum),
  tanpa menambah isi baru. BAB yang sangat ringkas (kartu < 12, mis. beberapa BAB Fisiologi) juga memakai judul bagian + paragraf
  pertamanya sebagai kartu. Kualitasnya berbasis aturan, jadi kartu yang janggal cukup diedit atau dihapus langsung di
  bagian `## Flashcard {kartu}` lewat editor catatan admin (catatan yang disunting admin tidak ditimpa sinkronisasi).

Yang sengaja **tidak** dimasukkan karena urusan penyusun dokumen: baris pembuka (`Sumber utama`, `STATUS`, `Aturan visual`),
bagian "Ringkasan untuk Retrieval AI MEDCOEL", "Catatan editorial", dan kalimat "master note" di sumber.
Bila ada kata yang perlu dibuang lagi, tambahkan pola di `INTERNAL_LINE` / `SCRUB` pada konverter.

Keluarannya (`content/materi`) ikut di-commit supaya migrasi bisa memasukkannya tanpa Python di server.

## Sinkronisasi otomatis

Setelah `deploy/update.sh` (git pull, build, restart), PocketBase menjalankan migrasi `1800002500`/`1800002600` dan
`pb_hooks/materi.pb.js` menyinkronkan `content/materi` ke koleksi `chapter_notes` satu kali per start (lewat cron, sekitar satu menit
setelah server hidup). Aturannya (`pb_hooks/lib/materiSync.js`), memakai `seedHash` (sha256 isi bawaan) di tiap catatan:

- BAB belum punya catatan → dibuat.
- Catatan masih sama dengan isi bawaan sebelumnya (hash cocok) → diperbarui ke versi terbaru.
- Catatan disunting admin atau ditulis tangan (hash tidak cocok / tanpa penanda `materi:v2`) → dilewati, tidak ditimpa.
- BAB tidak ditemukan di web → dilewati dan dicatat di log (`[materi] ...`).

## Memasukkan atau memperbarui manual

Skrip yang sama aturannya, bila ingin menjalankannya dari luar server. Setelah isi dokumen berubah dan konverter dijalankan ulang:

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
Mata kuliah baru tanpa migrasi pun akan terpasang oleh sinkronisasi otomatis di atas selama ada di `index.json`.
Atribusi gambar yang di dokumen tidak tertulis per gambar dapat ditambahkan lewat `CREDIT_OVERRIDES` di konverter.
