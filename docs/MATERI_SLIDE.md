# Materi slide (PPT) di Drilling

Drilling berisi "file kampusmu" per mata kuliah: **materi** (slide PPT yang sudah menjadi gambar, lengkap dengan penjelasan per slide) dan **soal**. Dokumen ini menjelaskan alur materi dan format JSON-nya.

## Alurnya

1. **Pengaju** (Chat Admin > Upload soal atau PPT materi) memilih mata kuliah, lalu **isi PDF-nya: Soal atau PPT materi**. PPT diekspor dulu ke PDF (satu PDF per PPT). Untuk PPT materi pertanyaan kunci jawaban dan bahasa dilewati.
2. **Hermes** (Telegram) memberi tahu admin dengan jelas jenisnya: judul pesan `📚 PPT MATERI` atau `📝 SOAL`, baris `Isi PDF`, dan PDF yang dikirim memakai nama `KODE_MATERI_PDF-1-dari-2_...pdf` dengan keterangan `📚 PPT MATERI · KODE · ...`. Di API, jenisnya ada di `contentKind` (`soal` | `materi`) dan `kindLabel`.
3. **Admin** mengubah tiap slide jadi gambar `lh3` (tautan Google Drive diubah ke `lh3.googleusercontent.com/d/FILE_ID`), lalu meminta GPT atau Claude menulis penjelasan tiap slide dalam satu JSON (skill `medcoel-materi-slide-json`).
4. **Impor**: kirim JSON ke Hermes dengan `/put KODE` lalu `/plan` dan `/confirm` (untuk pengajuan PPT materi tujuannya otomatis Drilling > materi), atau tempel di **Admin > Drilling > Materi > Impor materi (JSON)**.
5. **Siswa** membuka **Drilling > mata kuliah > Materi**: slide di kiri, penjelasan di kanan (di bawah pada layar sempit), panah kiri/kanan untuk berpindah, deretan slide di bawah, gambar bisa diperbesar. Slide terakhir yang dibuka diingat.

**Judul di web = judul PDF.** Judul materi (dan bagian soal) yang dilihat siswa diambil otomatis dari nama PDF yang dikirim pengaju, dirapikan: `Histologi_Epitel Kuliah1.pptx.pdf` menjadi **Histologi Epitel Kuliah1** (".pdf", sisa ekstensi dokumen asal, akhiran "compressed" dibuang, garis bawah jadi spasi). Aturannya:

- **Satu PDF** di pengajuan: judulnya otomatis dari PDF itu. Judul di JSON tidak dipakai (judul PDF menang).
- **Beberapa PDF**: sebut nomor PDF-nya saat mengimpor, supaya judul diambil dari PDF itu: di Hermes `/put KODE 2` (nomornya sama dengan `/files KODE 2`), atau beri nama file JSON seperti nama PDF kiriman Hermes (`KODE_PDF-02-dari-3_nama.json`). Di API: field `pdf`.
- Beberapa PDF **tanpa nomor**: materi memakai `title` di JSON bila ada; bila tidak ada, impor ditolak dengan pesan yang menyebut cara memilih nomor PDF. Soal Drilling tanpa nomor masuk bagian "Soal lainnya".
- Judul bisa dipaksa lewat field `title` di permintaan (mengalahkan semuanya). Respons impor memuat `title`, `titleSource` (`pdf` | `json` | `request` | `default`), dan `pdf`.
- Judul sama di mata kuliah dan cakupan yang sama berarti memperbarui materi yang ada, jadi mengirim ulang PDF yang sama memperbarui, bukan menggandakan.

Materi mengikuti hak lihat yang sama dengan soal Drilling: **General** (semua pengguna) atau **khusus kampus** (pengajuan "hanya prodi dan kampus saya" hanya terlihat pengguna kampus itu). Menu Drilling terbuka bila ada materi atau soal yang bisa dilihat pengguna dan sakelar admin menyala.

## Format JSON (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "title": "Sistem Muskuloskeletal – Kuliah 1",
  "description": "Opsional, ringkasan satu kalimat.",
  "slides": [
    {
      "title": "Fungsi tulang",
      "image": "https://lh3.googleusercontent.com/d/FILE_ID",
      "explanation": "Tulang punya **empat fungsi** utama:\n1. Penyokong tubuh\n\t- rangka aksial\n\t- rangka apendikular\n2. Pelindung organ 🛡️\n3. Tempat melekat otot"
    }
  ]
}
```

Bentuk atas boleh objek `{ title, slides }`, array slide, atau teks JavaScript longgar (kunci tanpa kutip, kutip tunggal, koma di akhir). Teks diurai, tidak pernah dijalankan.

### Slide

| Field | Isi |
|---|---|
| `image` | Tautan gambar slide: `lh3.googleusercontent.com/d/FILE_ID`, tautan berbagi Drive, atau FILE_ID mentah (diubah otomatis). Gambar dari domain lain ditolak. Alias: `gambar`, `imageUrl`, `url`, `link`. |
| `images` | Beberapa gambar untuk satu slide (maksimal 4). |
| `title` | Judul slide, opsional. Alias: `judul`. |
| `explanation` | Penjelasan sebagai **teks mini-markdown** (di bawah). Alias: `penjelasan`, `text`, `keterangan`, `pembahasan`. |
| `blocks` | Penjelasan sebagai **blok terstruktur** (di bawah). Boleh dipakai bersama `explanation`; blok dulu, lalu teks. |

Slide harus punya gambar atau penjelasan. Slide dengan gambar tapi tanpa penjelasan tetap diterima dengan peringatan.

### Teks mini-markdown (`explanation`)

| Tulisan | Hasil |
|---|---|
| baris biasa; baris kosong memisahkan paragraf | paragraf (baris baru dalam paragraf dipertahankan) |
| `## Judul` | judul kecil (`#`, `##`, `###`) |
| `- butir`, `* butir`, `• butir` | daftar bertitik |
| `1. butir`, `1) butir` | daftar bernomor, nomor di kiri dengan **jorokan gantung** |
| `a. butir` (huruf kecil) | daftar huruf |
| `- [ ] butir`, `- [x] butir` | daftar centang |
| **Tab atau spasi di depan butir** | **butir anak** (satu Tab, atau 2 sampai 4 spasi, = satu tingkat; sampai 5 tingkat). Gaya anak mengikuti penandanya sendiri: `-` titik, `1.` angka, `a.` huruf (huruf di dalam huruf menjadi angka romawi) |
| baris menjorok tanpa tanda di bawah butir | lanjutan teks butir itu |
| baris menjorok tanpa tanda di luar daftar | paragraf dengan jorokan (Tab = satu tingkat, sampai 3 tingkat) |
| `> [!klinis] Judul` lalu baris `> isi` | kotak sorot; jenis: `klinis`, `warning`, `highyield`, `tip`, `praktikum`, `info` |
| `> kutipan` (tanpa `[!jenis]`) | kutipan |
| `\| A \| B \|` + `\|---\|---\|` | tabel |
| `---` | garis pemisah |
| `**tebal**`, `*miring*`, `==sorotan==`, `~sub~`, `^sup^`, `[teks](https://tautan)` | penanda dalam teks |
| emoji | ditulis apa adanya |

Di dalam string JSON, baris baru ditulis `\n` dan Tab ditulis `\t` (Tab mentah tidak sah di JSON). Dua spasi per tingkat juga diterima.

### Blok terstruktur (`blocks`)

```json
"blocks": [
  { "type": "heading", "level": 2, "text": "Fungsi" },
  { "type": "paragraph", "text": "Teks dengan **penanda**.", "indent": 1 },
  { "type": "list", "style": "number", "items": [
      "Langkah satu",
      ["anak a", "anak b"],
      { "text": "Langkah dua", "children": ["anak c"] }
  ]},
  { "type": "callout", "kind": "klinis", "title": "Klinis", "icon": "🩺", "text": "Isi kotak" },
  { "type": "table", "headers": ["Otot", "Aksi"], "rows": [["Biseps", "Fleksi siku"]] },
  { "type": "quote", "text": "Kutipan" },
  { "type": "divider" },
  { "type": "markdown", "text": "bebas pakai sintaks teks di atas" }
]
```

- `list.style`: `bullet` (bawaan), `number`, `alpha`, `check`. Array di dalam `items` menjadi anak dari butir sebelumnya (di bawah daftar bernomor anaknya berhuruf, selain itu bertitik); atau pakai `children` dan beri `style` sendiri.
- `paragraph.indent`: 0 sampai 3.
- `callout.kind`: `klinis`, `warning`, `highyield`, `tip`, `praktikum`, `info` (alias umum seperti `penting` diterima).
- Nama jenis lain yang dikenal sebagai alias: `p`, `paragraf`, `h`, `judul`, `ul`, `ol`, `steps`, `kotak`, `tabel`, `hr`, `md`. Jenis yang tidak dikenal diabaikan dengan peringatan.

### Batas

Paling banyak 300 slide per berkas, 4 gambar per slide, 80 blok per slide, 4.000 karakter per butir atau paragraf, 24.000 karakter penjelasan per slide, 5 tingkat daftar. Satu berkas di bawah sekitar 3,8 MB setelah diurai; yang lebih besar dipecah menjadi beberapa berkas materi.

### Impor ulang

Berkas dengan **judul, mata kuliah, dan cakupan yang sama diperbarui**, bukan digandakan. Jadi memperbaiki penjelasan cukup dengan mengirim ulang JSON dengan judul yang sama.

## Endpoint

Pengguna (butuh login; materi hanya yang boleh dilihat kampusnya):

- `GET /api/medcoel/drilling` memuat per mata kuliah `deckCount`, `slideCount`, `campusDeckCount` (selain `questionCount`).
- `GET /api/medcoel/drilling/subject/{id atau slug}` berkas materi (tanpa slide) + jumlah soal.
- `GET /api/medcoel/drilling/deck/{id}` satu berkas lengkap dengan slide.

Admin:

- `GET /api/medcoel/admin/drilling/decks?subject=ID`, `GET /api/medcoel/admin/drilling/decks/{id}`.
- `POST /api/medcoel/admin/drilling/decks` impor `{ subject, scope: all|campus, campuses, status: published|draft, title?, text | deck | slides, dryRun? }`.
- `POST /api/medcoel/admin/drilling/decks/{id}` ubah `{ title, description, status, scope, campuses, sortOrder }`; `POST .../{id}/delete` hapus.

Hermes Agent:

- `POST /api/medcoel/agent/submissions/{id atau kode}/materi-import` `{ text | deck | slides, pdf?, title?, status?, dryRun? }`. Hanya untuk pengajuan `contentKind: "materi"` berstatus antre, diproses, atau perlu_perbaikan; cakupan dan kampus selalu dari pengajuan. Berhasil: berkas tayang, pengajuan selesai (`importedCount` = jumlah slide), pengaju mendapat notifikasi dengan tautan ke Drilling. Pengajuan soal ditolak di sini, dan pengajuan materi ditolak di `/import` dan `/drilling-import`.
- `POST /api/medcoel/agent/materi-import` `{ subject, scope, campuses, ... }` materi tambahan dari admin tanpa pengajuan.

Respons impor: `{ blocked, created, updated, replaced, title, scope, slideCount, warnings, items }`. Bila `blocked: true` (status 400), `items[]` berisi `{ index, errors }` per nomor slide dan tidak ada yang tersimpan.

## Data

Koleksi `drilling_decks` (migrasi `1800002900_drilling_decks.js`): `subject`, `title`, `description`, `language`, `scope`, `campuses`, `status`, `slideCount`, `cover`, `slides` (JSON, bentuk blok), `source`, `submission`, `sortOrder`. Tanpa aturan API publik; semua akses lewat endpoint di atas. `submissions.contentKind` (`soal` | `materi`) menyimpan pilihan pengaju. Parser dan penormalan: `apps/pocketbase/pb_hooks/lib/slides.js` (dites di `test/slides.test.mjs`), akses data: `lib/decks.js`.

Setelah pembaruan ini produksi harus di-restart supaya migrasi `1800002900` terpasang (lihat `docs/DEPLOY.md`).
