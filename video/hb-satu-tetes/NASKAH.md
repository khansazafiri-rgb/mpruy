# Naskah (kata demi kata, urutan tidak diubah)
Audio: `audio/narasi-edukasi.wav` (Google AI Studio, 24 kHz mono, 85,52 dtk; tidak ada kalimat promo di berkas). Waktu kalimat = ASR faster-whisper (`audio/narasi-asr.json`), dipakai di `tools/build_cues.py`.

| Mulai (dtk) | Kalimat |
|---|---|
| 0,00 | SpO₂ bisa terlihat normal, tapi Hb ternyata rendah. |
| 3,72 | Kok bisa? |
| 4,86 | Dua angka ini mengukur hal yang berbeda. |
| 7,44 | SpO₂ memperkirakan persentase hemoglobin yang sedang membawa oksigen. |
| 12,28 | Tes Hb mengukur banyaknya hemoglobin di dalam darah. |
| 15,92 | Hemoglobin adalah protein dalam sel darah merah yang membawa oksigen ke jaringan. |
| 20,38 | Pada tes Hb cepat tertentu, satu tetes darah dari ujung jari masuk ke wadah kecil bernama mikrokuvet. |
| 26,26 | Salurannya sangat sempit, sehingga darah tertarik masuk oleh gaya kapiler. |
| 31,12 | Di dalam mikrokuvet contoh alat ini sudah ada reagen. |
| 34,34 | Reagen pertama memecah sel darah merah dan melepaskan hemoglobinnya. |
| 38,70 | Reagen berikutnya mengubah hemoglobin menjadi bentuk yang dapat diukur dengan cahaya. |
| 43,44 | Mikrokuvet lalu dimasukkan ke alat. |
| 45,90 | Cahaya melewati sampel, dan sensor membaca berapa banyak cahaya yang diserap. |
| 50,40 | Alat memakai dua panjang gelombang. |
| 52,54 | Salah satunya membantu mengoreksi gangguan karena sampel keruh. |
| 55,20 | Hasilnya dihitung dan ditampilkan sebagai kadar Hb, biasanya dalam gram per desiliter. |
| 61,16 | Tes ini membantu menilai kemungkinan anemia atau memantau perubahannya. |
| 65,36 | Tapi satu angka Hb belum memberi tahu penyebabnya. |
| 68,58 | Sampel dari ujung jari juga bisa menghasilkan hasil yang kurang tepat bila pengambilannya bermasalah. |
| 73,80 | Kalau angka tidak cocok dengan gejala, pemeriksaan lanjutan mungkin diperlukan. |
| 78,22 | Jadi, SpO₂ menunjukkan proporsi hemoglobin yang membawa oksigen, |
| 81,92 | tes Hb menunjukkan berapa banyak hemoglobin yang tersedia. |

ASR salah dengar beberapa kata ("tetes"->"tes", "sel"->"sial", "memecah"->"memecak", "diukur"->"yukur", "dua"->"2", "Hb"->"HB"); takarir memakai ejaan naskah. Kata "dua" pada kalimat "Alat memakai dua panjang gelombang" terdengar/terbaca ASR sebagai "2"; diperlakukan sebagai "dua" sesuai naskah.
