# Laporan pemeriksaan (QA)

## Batas yang jujur
Lingkungan pembuat tidak bisa memutar video bersuara pada kecepatan normal. **Saya tidak menonton video ini dengan suara dari awal sampai akhir, dan belum ada orang yang melakukannya.** Dilakukan: kontak sheet dari MP4 akhir (4 dtk pertama rapat), bingkai kunci beresolusi penuh dan 270 px untuk keterbacaan ponsel, ASR audio akhir, kenyaringan, deteksi hitam/beku, perbandingan master, dan pengecekan numerik model waktu `crt(tn)`. Kelancaran gerak jari, ritme, keseimbangan musik-narasi, sinkron kata-visual, dan **apakah jari kartun sudah terasa bagus dan tidak kaku** harus dinilai orang. Pratinjau pada ponsel nyata tidak dilakukan.

## Hasil terukur
| Pemeriksaan | Hasil |
|---|---|
| Format | H.264 1080 x 1920, 30 fps, 1675 bingkai (55,833 dtk); AAC 48 kHz stereo |
| Kenyaringan | -14,1 LUFS, LRA 3,3 LU, puncak sejati -1,2 dBFS (edukasi dinormalkan ke -14 LUFS; master tidak dinormalkan ulang) |
| Master outro utuh | Audio 39,63 - 55,83 dtk vs master: geser 2 sampel, korelasi 0,9994, gain 0,994, rasio sisa -29,3 dB; bingkai terakhir identik (selisih rata-rata 0,07 dari 255); tidak ada teks/CTA/suara tambahan di atasnya |
| Hitam / beku | Tidak ada bingkai hitam. Bagian beku >= 0,7 dtk hanya di dalam master (50,2 - 55,8 dtk: logo/URL yang ditahan sengaja). Bagian edukasi tidak ada |
| ASR audio akhir | Seluruh kalimat naskah terbaca berurutan, tanpa kata hilang. Selisih ejaan ASR: "dua detik" -> "2 detik", "ke jaringan" -> "kejaringan", "memengaruhi" -> "mempengaruhi" (kesalahan/ejaan ASR; audio sumber tidak diubah; takarir memakai naskah) |
| Frame pertama | Raka, lensa, jari pemeriksa bergerak, dan "KOK KUKU JADI PUTIH?" sejak bingkai 0; jari menyentuh kuku pada ~1,2 dtk |
| Timer = lepas | Diperiksa numerik: timer berjalan tepat saat tekanan = 0 (3,80 / 16,64 / 20,70 / 24,25 dtk narasi + 0,3), berhenti tepat di +2,0 / +2,0 / +1,7 / +4,4 dtk; klik dan tik dibuat dari waktu yang sama, chime di akhir hitung |

## Pemeriksaan visual
- **Urutan:** tekan -> kuku memutih -> lepas -> timer mulai -> warna menyapu dari pangkal kuku -> timer berhenti saat warna pulih. Muncul empat kali (hook, penampang, "sekitar 2 detik", contoh lebih lambat).
- **Penampang:** hanya jaringan di bawah kuku yang tertekan kehilangan darah (bukan seluruh jari); label hanya "DITEKAN" dan "DILEPAS"; pembuluh menyempit pada contoh dingin.
- **Contoh lebih lambat:** diberi label "contoh pengisian lebih lambat (ilustrasi)"; faktor: suhu dingin, usia, cara pemeriksaan; tidak ada nama penyakit, tidak ada klaim satu hasil CRT memastikan syok/dehidrasi/gangguan pembuluh.
- **Raka:** aset asli (hook, penutup, cover), tegak; tangan kartunnya tidak diperbesar menjadi tangan anatomis; jari anatomis diberi label "ilustrasi edukatif (perbesaran)".
- **Penutup:** tanpa angka pasien; "SATU PETUNJUK, BUKAN DIAGNOSIS".

## Putaran perbaikan terarah (maks. dua)
Sebelum putaran: jari versi pertama dinilai pemesan seperti batang kayu -> `hand.js` ditulis ulang bergaya kartun (kontur hangat, ujung bulat, tonjolan sendi, kuku besar berkilau, jari pemeriksa gepeng saat menekan dan memantul saat lepas).
**Putaran 1** (dari pemeriksaan draf penuh):
1. Kuku yang diperiksa tertutup kartu timer/takarir dan sebagian di luar bingkai -> titik bidik kamera, posisi jari pemeriksa, dan zoom kartu disetel ulang.
2. Label kartu timer saling menimpa ("WAKTU" / "MENUNGGU LEPAS") -> dipendekkan ("MENUNGGU", "LEBIH LAMBAT").
3. Chip langkah "WARNA KEMBALI" meluap -> "WARNA PULIH"; pil "SATU PETUNJUK" menutup kaki Raka -> Raka dikecilkan, pil diturunkan.
4. Bagian penutup beku 1 - 2 dtk (deteksi beku) -> kartu mengambang pelan; teks kartu 22 -> 27 px, judul 28 -> 32 px; label penampang 34 -> 44 px.
**Putaran 2:**
5. Timer contoh "sekitar 2 detik" terpotong di 1,65 dtk karena contoh lambat mengambil alih lebih awal, dan chime warna pulih terlambat 60 ms di penampang -> kejadian dijadwal ulang (pulih 1,7 dtk, hasil terbaca 0,45 dtk sebelum reset; contoh lambat mulai tepat setelah narasi "Kalau lebih lambat"), chime tepat saat timer berhenti.

## Perlu dinilai manusia / catatan
- Putar penuh dengan suara pada ponsel: sinkron kata-visual, keseimbangan musik-narasi, kekuatan klik/tik, sambungan keras ke master outro.
- Penilaian gaya: apakah jari sudah cukup "animasi tapi jelas"; saya hanya bisa memeriksa bingkai diam.
- Teks kecil (anotasi di kartu, label penampang, tag "acuan umum") sulit terbaca pada lebar 360 px; semua informasi inti ada di teks besar dan takarir.
- Kata "usia" dalam narasi tidak didukung langsung oleh dua sumber yang dibaca (lihat `SUMBER.md`).
- Angka 1,7 / 2,0 / 4,4 dtk hanya ilustrasi alur; bukan data pasien.
