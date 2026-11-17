# Konsep video: PPGD, seseorang kolaps di kampus

**Format:** 9:16, 1080×1920, 30 fps, sekitar 35–45 detik. Cerita awal tanpa narator; teks layar pendek, aksi jelas, musik dan efek bunyi pixel modern. Audio penjelasan MEDCOEL hanya pada outro. Video ini mengambil **satu situasi orang dewasa kolaps**, bukan seluruh cakupan PPGD.

## Script layar

| Waktu perkiraan | Aksi visual | Teks layar |
| --- | --- | --- |
| 0–3 dtk | Seorang dewasa tiba-tiba kolaps di koridor kampus; Raka menoleh. Gerak tampak sejak frame pertama. | **“Kalau seseorang tiba-tiba kolaps?”** |
| 3–6 dtk | Raka berhenti sebelum mendekat, memeriksa apakah area aman. | **“1. Pastikan aman”** |
| 6–10 dtk | Raka memanggil dan mengetuk bahu korban. Tidak ada respons. | **“2. Cek respons”** |
| 10–14 dtk | Raka menunjuk satu teman untuk menghubungi PSC 119 dan satu lagi mengambil AED. | **“3. Panggil bantuan · 119 · minta AED”** |
| 14–18 dtk | Raka menilai apakah korban bernapas normal; napas megap-megap diberi tanda **bukan napas normal**. | **“4. Napas normal?”** |
| 18–27 dtk | Jika korban tidak respons dan tidak bernapas normal, Raka mulai kompresi dada; close-up posisi tangan di tengah dada, ritme sesuai panduan. | **“Tidak respons + tidak bernapas normal → mulai RJP”** |
| 27–31 dtk | AED tiba; dinyalakan dan instruksinya diikuti. Jangan menampilkan kejutan listrik otomatis pada semua korban. | **“AED: nyalakan, ikuti instruksinya”** |
| 31–43 dtk | Kamera masuk ke web MEDCOEL asli. Tunjukkan pilih bab, soal + pembahasan, dan Simulasi Dokter dari [paket outro](../brand/video/outro/README.md). | **“Belajar FK gratis di MEDCOEL · medcoel.com”** |

## Satu-satunya narasi (outro)

> Mau lanjut belajar? Di MEDCOEL, kamu bisa buka materi per bab, latihan soal, dan Simulasi Dokter. Gratis di medcoel.com.

Buat audio di Google AI Studio dengan suara natural, tenang, dan singkat. Jangan meminta penyunting video membuat narator baru. Jika memakai potongan suara lama, pastikan kalimat cocok secara utuh dan hak pakainya jelas.

## Arahan animasi

- Dunia pixel boleh dipakai untuk koridor, agenda, teks dan efek transisi. Jika memakai Raka, render dari `brand/characters/raka/raka.js`; jangan menggambar ulang karakternya. Kori/Kila/Nilo juga memakai SVG asli.
- Hindari efek game yang membuat tindakan darurat tampak seperti permainan. Gunakan bunyi digital singkat untuk pergantian langkah, bukan suara kemenangan saat orang kolaps.
- Untuk adegan RJP, tunjukkan tangan di tengah dada, lengan lurus, dan kompresi pada permukaan kokoh. Bila gerak tidak bisa dianimasikan dengan benar, gunakan shot lebih sederhana; jangan tampilkan teknik yang salah.
- Jangan menambahkan pemeriksaan nadi untuk penolong awam, memindahkan korban tanpa alasan, memberi minum, atau memaksa AED memberi kejut. Label kecil: **“Ringkasan edukatif; pelatihan praktik tetap diperlukan.”**
- Sumber outro adalah rekaman aplikasi dengan data uji. Jangan menampilkan pasien simulasi sebagai pasien nyata.

## Rujukan

- [AHA 2025 Adult Basic Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support): respons, napas tidak normal, bantuan, RJP, AED.
- [Kementerian Kesehatan: PSC 119](https://kemkes.go.id/id/layanan/psc-119): layanan kegawatdaruratan medis Indonesia.

Sebelum tayang, minta peninjauan langkah PPGD oleh orang yang kompeten dalam pelatihan RJP/AED dan tonton hasil penuh untuk memastikan teks, urutan, dan gerak sesuai.
