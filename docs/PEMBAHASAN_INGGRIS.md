# Pembahasan Inggris yang diperiksa admin

Fitur ini menerjemahkan pembahasan umum, pembahasan opsi, pembahasan subsoal,
dan poin kunci esai. Teks soal, opsi jawaban, kunci, jawaban yang diterima,
identitas soal, dan aturan penilaian tetap memakai sumber yang sama.

## Alur admin

1. Simpan soal dan pembahasan sumber lewat **Edit Soal** atau impor seperti biasa.
2. Di daftar **Edit Soal**, klik ikon bahasa **Pembahasan Inggris** pada soal.
3. Baca konteks soal dan tambahkan istilah khusus yang harus tetap persis,
   satu istilah per baris. Misalnya `nervus medianus`, `M. supraspinatus`, atau
   `curah jantung`. Kamus bersama tersedia di **Pengaturan > Umum > Istilah
   ilmiah pembahasan Inggris**. Nama anatomi berawalan Latin, singkatan huruf
   besar, dan beberapa satuan juga diperiksa otomatis; ini bukan kamus medis lengkap.
4. Tulis versi Inggris di samping sumber, atau gunakan **Buat draf Inggris**
   bila bantuan AI sudah diatur. Tombol bantuan mengirim konteks soal lengkap,
   kunci, pembahasan, dan kamus ke OpenAI setelah admin mencentang persetujuan
   pengiriman. PDF dan informasi peserta tidak dikirim oleh fitur ini.
5. **Simpan draf** boleh dilakukan meskipun ada bagian kosong atau pemeriksaan
   yang belum lolos. Draf tidak pernah dikirim ke peserta. Membuat atau menyimpan
   draf baru menggantikan versi Inggris yang sebelumnya ditayangkan.
6. Periksa semua bagian terhadap sumber. Pastikan negasi, lateralisasi,
   angka/satuan, ketidakpastian, hubungan sebab-akibat, dan alasan tiap opsi
   tidak berubah. Centang pernyataan pemeriksaan, lalu klik **Tayangkan hasil
   pemeriksaan**. Angka, istilah terlindungi, tag HTML, tautan, dan rumus yang
   berubah menghalangi penayangan. Pemeriksaan makna tetap tanggung jawab penelaah.

Peserta mendapat pilihan **Asli / English** setelah pembahasan boleh dibuka.
Preferensi bahasa disimpan di perangkat. Bila belum ada versi Inggris yang
sudah diperiksa, versi asli tetap ditampilkan. Semua pembahasan satu soal
beralih bersama, termasuk alasan per opsi dan subsoal.

## Menjaga terjemahan tetap sesuai sumber

`questions.explanationEnglish` menyimpan versi kontrak, status, sidik sumber,
istilah khusus, segmen terjemahan, catatan draf, dan identitas/waktu penelaah.
Sidik sumber mencakup konteks soal lengkap, kunci, semua pembahasan, dan kamus
bersama. Jika salah satunya berubah, versi Inggris lama langsung disembunyikan
pada respons berikutnya dan ditandai **perlu diperiksa ulang**. Peserta yang
sudah membuka halaman perlu memuat ulang untuk mengambil keadaan terbaru.

Editor memeriksa sidik sumber dan revisi draf di dalam transaksi. Perubahan
oleh admin lain selama penyuntingan atau selama permintaan AI berlangsung
ditolak agar tidak tertimpa. Tutup dan buka kembali editor untuk meninjau sumber
terbaru. Angka status penayangan tidak dapat dikirim lewat impor untuk melewati
proses pemeriksaan; hanya endpoint admin yang boleh menayangkan.

Teks kaya tetap disimpan dengan struktur sumber. Hanya teks yang terlihat
diterjemahkan; URL gambar/tautan, susunan tabel, dan blok formula dipertahankan.
HTML/markup dalam teks juga diperiksa. Draf tidak dikirim sebelum kunci boleh
dibuka, termasuk pada ujian, mode Learning, riwayat, dan hasil Drilling.

## Bantuan AI (opsional)

Isi di lingkungan server, bukan di GitHub atau browser:

```dotenv
OPENAI_API_KEY=...
MEDCOEL_TRANSLATION_MODEL=...
```

Pilih model pada akun OpenAI yang mendukung **Responses API + Structured Outputs**.
Restart PocketBase setelah mengubah lingkungan. Tanpa kedua nilai tersebut,
editor manual dan alur pemeriksaan tetap tersedia. Tidak ada pemanggilan AI
otomatis saat peserta membuka soal. Permintaan AI hanya dilakukan admin,
dibatasi 10 kali per akun per jam per proses server; batas ini kembali kosong
setelah restart. Panggilan gagal ikut dihitung. Biaya mengikuti akun API admin.

Permintaan memakai `store: false`, keluaran JSON dengan skema ketat, konteks
soal lengkap, dan instruksi agar sumber diperlakukan sebagai data. Ini bukan
jaminan retensi nol di penyedia. Refusal, respons belum selesai, JSON tidak sah,
kegagalan koneksi, atau perubahan revisi tidak menimpa draf sebelumnya.
Output yang valid secara struktur tetap berstatus **draf**, walau pemeriksaan
istilah dan angka sudah lolos. Makna medis tidak dapat dijamin oleh skema JSON.

Dokumentasi API:
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
dan [Responses](https://developers.openai.com/api/reference/resources/responses/methods/create).

## Pemasangan dan pengujian

Deploy kode, jalankan migrasi `1800001600_explanation_english.js`, build web,
dan restart PocketBase sesuai `docs/DEPLOY.md`. Pembaruan biasa melalui
`deploy/update.sh` melakukan tahap-tahap tersebut. Cadangkan database sebelum
upgrade seperti biasa. Tidak ada isi soal lama yang diterjemahkan otomatis.

Validasi lokal: `npm run lint`, `npm test`, `npm run build`, lalu `npm run
test:api` di `apps/pocketbase` pada database pengujian. Tes API meliputi hak
akses, draf, penayangan, kebocoran jawaban, perubahan konteks/kamus, dan konflik
revisi. Tes unit mencakup struktur konten kaya, istilah, angka, rumus, fallback
bahasa, serta parsing respons model. Panggilan model berbayar perlu diuji
terpisah setelah akun API dikonfigurasi.
