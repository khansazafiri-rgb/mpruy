# Pemeriksaan akhir — 18 November 2026

**Hasil: render final 79,067 detik, 1080 × 1920, 30 fps, 2.372 frame.** H.264 progressive dan AAC mono 48 kHz. File didekode sampai akhir tanpa error. Cover 1080 × 1920; SRT/VTT 32 cue, maksimal dua baris, huruf besar dan kontras.

## LOOP

1. Periksa sumber: README/manifest outro, Raka kanonik, kedua rekaman web dan logo, referensi identitas visual iklan. Hash Git blob rekaman/logo cocok dengan repo sumber. Audio yang benar adalah `Generated Audio November 18, 2026 - 1_50PM.wav`, 72,68 detik, mencakup edukasi dan promosi. Waktu kalimat/frasa ada di `sentence-timing.json` sebelum animasi dibuat.
2. Pemeriksaan frame sebelum render penuh: awal/tengah/akhir seluruh 14 shot. Perbaikan: kalender tidak menutupi wajah; bagian tubuh di bawah meja dicrop untuk medium shot; viewport SVG Raka eksplisit agar kepala tidak terpotong; perpindahan ke web dibetulkan pada frame batas shot. Palet, pakaian, sisi benda, dan anatomi memakai desain yang sama.
3. Putaran 1: render penuh dengan narasi, didekode dan diputar dari awal sampai indikator selesai pada browser. Pemeriksaan ulang memilih batas jeda promosi yang lebih tenang (67,90 s pada sumber) agar jeda berada di antara frasa.
4. Putaran 2: mux ulang dengan batas jeda tersebut, tanpa mengubah picture maupun kata. Video diputar penuh dengan audio tidak dimute sampai indikator selesai. Outro diputar terpisah dari 59,067 s hingga akhir pada video 360 × 640. Tidak ada revisi picture sesudah pemeriksaan ini.

## Waktu dan keterbacaan

- Edukasi 59,067 s. Outro tepat 20 s: materi 7,067 s, soal/pembahasan 6,5 s, simulasi 6,433 s; CTA menumpang 3,5 s terakhir.
- Rekaman web asli memenuhi 1.000 px / 92,6% lebar video. Satu tindakan membuka bab terlihat. Jawaban salah dan pembahasan ditampilkan; pembahasan terlihat sekitar empat detik. Simulasi memperlihatkan pilihan keluhan utama dan tindakan memilih pertanyaan anamnesis. Semua pada 1×.
- Tidak ada UI buatan, halaman desktop kecil dalam gambar laptop, flash transition, atau angka kemajuan/jumlah soal yang dipromosikan. Keterangan data uji lokal tampil pada rekaman.
- Teks diagram dan takarir terpisah. Label SSP 11,40 s, mekanisme kompleks 12,90 s, prostaglandin 17,88 s, kalender mulai bertambah pada “sering” 34,76 s, label hati 46,54 s.
- Sinyal bergerak kiri ke kanan; titik awal ada di area kepala, bukan klaim jaringan otak terasa sakit. Parasetamol berupa simbol diagram. Tidak ada visual penyembuhan penyebab nyeri. Hati normal, proporsional, pada kanan anatomis/kiri layar; tidak rusak mendadak setelah dosis biasa.
- Pemakaian sesekali ditampilkan sebagai satu hari; frekuensi berulang bertambah perlahan. Risiko penggunaan sering dan dosis berlebihan memakai shot terpisah. Tidak ada angka dosis.

## Audit audio

Semua sampel PCM ucapan sumber dipertahankan berurutan dan identik. Tidak ada time stretch, penggantian suara, EQ, pitch shift, fade pada ucapan, musik, SFX, atau audio dari rekaman web/iklan. Hanya tambahan hening pada 67,90 s (4,833 s), 70,00 s (0,600 s), dan ekor 0,953 s. RMS sekitar batas jeda: −60,4 dan −66,9 dBFS; puncak narasi sumber sekitar −0,6 dBFS. AAC adalah kompresi distribusi pada MP4; WAV sumber dan master timeline disertakan.

Takarir mengikuti ucapan. Kesalahan pengenal suara pada nama obat, “saraf”, “nyeri”, “per bab”, dan MEDCOEL dinormalkan ejaannya; transkrip ASR mentah tidak dipakai sebagai teks layar.

## Cakupan

Pemeriksaan ini mencakup produksi dan kecocokan isi dengan brief. Sumber farmakologi yang diperiksa dicatat pada `SOURCES.json` dan `SUMBER-ASET-DAN-AUDIO.md`. Tidak menambahkan diagnosis spesifik, dosis produk, atau klaim baru di luar naskah.
