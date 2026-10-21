# Format soal MEDCOEL (schemaVersion 1)

Satu format untuk tiga jalan masuk: form Edit Soal, tempel/unggah JSON di
dashboard, dan impor Hermes. Pengurai ada di
`apps/pocketbase/pb_hooks/lib/format.js` dan dites di `test/format.test.mjs`.

## Prinsip penerimaan

- JSON murni **atau** array JavaScript: kunci tanpa tanda kutip, kutip tunggal,
  koma di akhir, komentar `//`, awalan `const soal =`, dan pagar ```` ``` ````
  diterima. Teks diurai, tidak pernah dijalankan sebagai kode.
- Bentuk atas: `[ ...soal ]`, `{ schemaVersion, chapter, questions: [...] }`,
  atau `{ chapters: [{ title, questions: [...] }] }`.
- Field wajib seminimal mungkin: **teks soal**, **opsi atau jawaban**, dan
  **kunci**. Tipe ditebak bila tidak ditulis.
- Field tidak dikenal diabaikan dan dicatat sebagai peringatan.
- Teks rusak karena salah encoding (`tersebutâ€¦`) diperbaiki otomatis (port
  dari web lama), dan tautan Google Drive diubah ke format lh3.
- Pembatasan kampus di file **diabaikan**; kampus ditentukan pengajuan atau
  pilihan admin saat impor.
- Pratinjau menampilkan tiap soal dengan nomor, galat, dan peringatannya. Soal
  bermasalah tidak dibuang diam-diam: impor diblokir kecuali admin memilih
  "Lewati soal bermasalah".
- Kode soal (`code`) yang sudah ada di mata kuliah yang sama dilewati supaya
  impor ulang tidak membuat soal dobel.

## Field satu soal

| Field | Alias yang diterima | Keterangan |
|---|---|---|
| `type` | `qtype`, `tipe`, `jenis` | `A`, `K`, `isian`, `esai`. Juga `mcq`, `mcq_img`, `isian_img`, `esai_img`, `pg`. Bila kosong: ada `statements` = K, ada `subQuestions` = isian, selain itu A |
| `text` | `questionText`, `stem`, `soal`, `pertanyaan`, `question`, `vignette` | Konten (teks atau blok) |
| `difficulty` | `tingkat`, `level`, `kesulitan` | `easy`/`mudah`/1, `medium`/`sedang`/2, `hard`/`sulit`/3. Bawaan `medium` dengan peringatan |
| `chapter` | `bab`, `chapterTitle`, `topic`, `topik` | Judul BAB. Wajib bila BAB tidak dipilih saat impor |
| `imageUrl` | `image`, `gambar`, `img` | Tautan gambar; Drive diubah ke lh3 |
| `options` | `choices`, `opsi`, `pilihan` | Tipe A/K. Array berisi string atau `{ text, correct, explanation }`, atau objek `{ A: "...", B: "..." }` |
| `optionA`..`optionE` | `a`..`e` | Bentuk Web Olimp / Event |
| `correctAnswer` | `answer`, `kunci`, `jawaban`, `key` | Huruf A-E, angka 1-5, atau teks opsinya. Tidak perlu bila salah satu opsi `correct: true` |
| `statements` | `pernyataan` | Tipe K: tepat 4 pernyataan |
| `trueStatements` | `benar` | Tipe K: nomor pernyataan yang benar, misalnya `[1, 3]` atau `"1,3"` |
| `subQuestions` | `subquestions`, `sub`, `isian` | Isian/esai: `[{ label, question, validAnswers, answerCount, explanation, keyPoints, keyPointsTitle }]` |
| `explanation` | `pembahasan`, `penjelasan` | Konten, atau objek Web Olimp `{ reasoning, distractors: { A: ... }, pearl }` |
| `hint` | `petunjuk` | Teks |
| `code` | `kode`, `id` | Pengenal untuk mencegah dobel |
| `schemaVersion` | | Bawaan 1. Versi lebih baru diterima dengan peringatan |

### Tipe K

Kombinasi baku:

| Huruf | Pernyataan benar |
|---|---|
| A | (1), (2), dan (3) |
| B | (1) dan (3) |
| C | (2) dan (4) |
| D | hanya (4) |
| E | semua |

Tulis `trueStatements` dan opsinya dibuat otomatis, atau tulis `options` dan
kuncinya sendiri bila memakai kombinasi lain.

### Isian dan esai

Penilaian isian sama persis dengan web lama (`lib/isian.js`): toleransi salah
ketik, ejaan Inggris/Latin, imbuhan, padanan istilah medis; `/` memisahkan
ejaan lain dari jawaban yang sama; butir diawali `=` wajib persis;
`answerCount: N` berarti N kotak dan N jawaban berbeda. Esai tidak dinilai.
Isian dan esai dipakai di latihan per topik; simulasi dan paket bawaannya hanya
tipe A dan K (bisa diubah di Pengaturan).

## Konten kaya

Setiap bidang konten (teks soal, opsi, pernyataan, pembahasan) boleh berupa:

1. **Teks biasa** (file lama tetap valid), dengan penanda ringkas:
   `**tebal**`, `*miring*`, `~subskrip~` (H~2~O), `^superskrip^` (x^2^),
   `==sorotan==`, `[teks](https://tautan)`. HTML sederhana dari web lama
   (`<b>`, `<sub>`, `<table>`, `<img>`) juga ditampilkan, setelah disaring.
2. **Daftar blok**:

```js
[
  { type: "paragraph", text: "Lihat tabel berikut. Kadar **HbA1c** normal < 5,7%." },
  { type: "heading", text: "Kriteria diagnosis" },
  { type: "list", ordered: true, items: ["Poliuria", "Polidipsia", [{ type: "paragraph", text: "Blok di dalam butir" }]] },
  { type: "table", header: "row", caption: "Opsional", rows: [
      ["Parameter", "Nilai"],
      ["GDP", "≥ 126 mg/dL"],
      [{ text: "Gambar dalam sel" , image: "https://drive.google.com/file/d/ID/view" }, "keterangan"],
  ] },
  { type: "image", url: "https://drive.google.com/file/d/ID/view", caption: "Preparat HE", width: 70 },
  { type: "note", variant: "highyield", title: "High-yield", text: "Poin penting." },
  { type: "formula", text: "CO~2~ + H~2~O ⇌ H~2~CO~3~" },
  { type: "link", url: "https://...", text: "Bacaan lanjut" },
]
```

| Blok | Alias | Field |
|---|---|---|
| `paragraph` | `p`, `text`, `paragraf` | `text` |
| `heading` | `h`, `judul` | `text` |
| `list` | `ul`, `ol`, `bullets`, `numbered`, `daftar` | `items` (tiap butir konten), `ordered` |
| `table` | `tabel` | `rows` (array baris, sel = teks atau `{ text, image, caption }`), `header`: `row`/`column`/`both`/`none`, atau `header: [..]` sebagai baris judul, `caption` |
| `image` | `img`, `gambar` | `url`, `caption`, `width` (10-100 persen, atau `small`/`medium`/`full`) |
| `note` | `callout`, `catatan`, `highyield`, `warning` | `variant`: `highyield`/`warning`/`info`/`tip`, `title`, `text` atau `content` |
| `formula` | `math`, `rumus` | `text` dengan ~sub~ dan ^sup^ (LaTeX belum didukung) |
| `link` | `tautan` | `url`, `text` |

Blok yang tidak dikenal ditampilkan sebagai paragraf bila punya teks, dan
dicatat sebagai peringatan. Di HP, tabel bisa digeser ke samping.

## Contoh lengkap

```js
{
  schemaVersion: 1,
  chapters: [
    { title: "Nematoda usus", questions: [
      { type: "A", difficulty: "medium", code: "PARA-NU-001",
        text: "Telur berbentuk tong dengan sumbat di kedua kutub adalah telur",
        options: ["Ascaris lumbricoides", { text: "Trichuris trichiura", correct: true, explanation: "Ciri khas: *barrel shape* dengan *bipolar plugs*." }, "Ancylostoma duodenale", "Enterobius vermicularis", "Strongyloides stercoralis"],
        explanation: [{ type: "note", variant: "highyield", text: "Trichuriasis berat: prolaps rekti." }] },
      { type: "isian", difficulty: "easy",
        text: "Sebutkan obat pilihan untuk askariasis.",
        subQuestions: [{ label: "A", question: "Obat", validAnswers: ["Albendazol / Albendazole", "Mebendazol"] }] },
    ] },
  ],
}
```
