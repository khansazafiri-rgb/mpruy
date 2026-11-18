# Asal aset dan audio

## Audio yang dipakai

1. **Narasi utama:** `Generated Audio November 18, 2026 - 1_50PM.wav`, Google AI Studio, diserahkan langsung oleh pengguna pada 18 November 2026. Salinan asli: `audio/narasi-google-ai-studio.wav` (72,68 detik).
2. **Master linimasa:** `audio/narasi-timeline.wav` (79,067 detik), diturunkan hanya dengan tambahan hening antarfrasa promosi dan di akhir. Kecepatan 1×; seluruh sampel ucapan asli dipertahankan. Rincian `audio-edits.json`.

Tidak ada musik, SFX, narasi lain, suara rekaman web, atau suara campuran iklan lama.

## Rekaman web dan merek

Repo: [khansazafiri-rgb/mpruy](https://github.com/khansazafiri-rgb/mpruy), acuan commit `eac0862c4021b8bda25505b448c4151845ffff8d`.

- Materi, pilihan bab, jawaban dan pembahasan: `video/masih-dua-minggu/rekam/rekaman-web.mp4` → `assets/materi-soal.mp4`. Potongan 0–7,067 s dan 7–13,5 s; kecepatan asli.
- Simulasi Dokter: `video/dok-saya-kenapa/rekam/rekaman-web.mp4` → `assets/simulasi-dokter.mp4`. Potongan 6–12,433 s; kecepatan asli.
- Logo: `apps/web/src/assets/logo-full.webp` → `assets/logo-full.webp`.
- Karakter Raka: `brand/characters/raka/raka.js`, dirender melalui `rakaSvg()`, pakaian `harian`. README kanonik disertakan.
- Panduan sumber: `brand/video/outro/README.md` dan `assets.json`. Durasi outro mengikuti permintaan pengguna 20 detik.
- Referensi visual saja: `brand/video/ad/out/medcoel-iklan-75s-v2-FINAL.mp4`; tidak ada audio atau picture dari iklan ini yang dipasang ke video final.

Rekaman memakai data uji lokal. Tidak menampilkan angka fixture sebagai klaim publik. Aset MEDCOEL digunakan sesuai permintaan pemilik repo. Tidak ada gambar stok atau musik pihak ketiga.

## Aset baru

Panggung, diagram kepala/SSP/hati, kalender, kemasan generik, kartu, animasi dan lapisan teks dibuat sebagai kode vektor di `render.mjs`. Font Arial/Arial Bold berasal dari sistem yang tersedia dan tidak dibundel ulang. Cover dirender dari Raka kanonik dan lapisan teks yang sama.

## Rujukan pemeriksaan isi

- [Medsafe — Six Plus Parapaed data sheet, farmakodinamik dan peringatan](https://www.medsafe.govt.nz/profs/Datasheet/s/SixPlusParapaedSusp.pdf).
- [NHS — Paracetamol for adults](https://www.nhs.uk/medicines/paracetamol-for-adults/).
- [NHS — Headaches](https://www.nhs.uk/symptoms/headaches/).
- [NICE CG150 — panduan sakit kepala dan penggunaan obat berlebihan](https://www.nice.org.uk/guidance/cg150/evidence/full-guideline-pdf-188258224).

Checksum Git aset dan SHA-256 narasi ada pada `SOURCES.json`.
