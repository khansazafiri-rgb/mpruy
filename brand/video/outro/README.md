# Outro MEDCOEL untuk video edukasi

Paket ini menunjuk **rekaman web asli yang sudah ada di repo** agar pembuat video (termasuk Claude) bisa menyusun outro MEDCOEL tanpa menggambar ulang antarmuka. Lihat [`assets.json`](assets.json) untuk daftar yang mudah dibaca mesin. Rekaman sumber belum dipotong menjadi shot final; pilih bagian yang benar-benar menampilkan tindakan yang disebut pada audio.

## Sumber video yang bisa dipakai ulang

| Kebutuhan | Berkas sumber | Isi yang sudah didokumentasikan |
| --- | --- | --- |
| Pilih mata kuliah dan bab; latihan soal; jawaban dan pembahasan | [rekaman-web.mp4](../../../video/masih-dua-minggu/rekam/rekaman-web.mp4) | Rekaman aplikasi MEDCOEL asli dengan data uji lokal. |
| Simulasi jadi dokter | [rekaman-web.mp4](../../../video/dok-saya-kenapa/rekam/rekaman-web.mp4) | Pilih poli/pasien, anamnesis, pemeriksaan, laporan, coba lagi; data uji lokal. |

Aset merek: [logo lengkap](../../../apps/web/src/assets/logo-full.webp), [logo simbol](../../../apps/web/src/assets/logo-mark.webp), [Kori](../../mascots/kori.svg), [Kila](../../mascots/kila.svg), [Nilo](../../mascots/nilo.svg), dan [Raka](../../characters/raka/README.md). Raka harus dirender dari `brand/characters/raka/raka.js`, bukan dibuat ulang.

## Format outro bersama

Durasi rekomendasi 8–12 detik di akhir video. Tunjukkan tindakan nyata pada web, lalu tahan URL cukup lama untuk dibaca.

1. Buka halaman belajar/pilih bab dari rekaman asli.
2. Perlihatkan satu jawaban soal dan pembahasannya. Jika waktunya cukup, sisipkan Simulasi Dokter dari rekaman kedua.
3. Akhiri dengan logo, teks **“Belajar FK gratis di MEDCOEL”** dan **“medcoel.com”** di atas rekaman web yang masih bergerak.

Naskah narasi pilihan (buat audio di Google AI Studio atau gunakan rekaman milik MEDCOEL yang cocok secara utuh):

> Mau lanjut belajar? Di MEDCOEL, kamu bisa buka materi per bab, latihan soal, dan Simulasi Dokter. Gratis di medcoel.com.

**Periksa kecocokan visual:** rekaman `masih-dua-minggu` mendokumentasikan pilihan bab, latihan soal dan pembahasan, tetapi README-nya tidak menjamin shot flashcard. Jangan menyebut atau menampilkan flashcard dari sumber ini tanpa rekaman yang sesuai. Rekaman memakai data uji; jangan menyajikan angka atau kemajuan akun sebagai data produksi. Jika UI saat ini berbeda, rekam ulang web terbaru sebelum tayang.

Gunakan video sumber tanpa audio campuran dari iklan lama; beri narasi final dan musik yang izin pakainya mencakup promosi. Jangan mengambil suara dari video lama hanya karena filenya ada. Outro ini menjelaskan MEDCOEL sebagai tempat belajar FK, bukan sertifikasi PPGD atau alat penanganan darurat.
