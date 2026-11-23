# Sumber, bahan, dan lisensi

## Dasar medis (hanya yang benar-benar dibaca saat pembuatan)
- **MedlinePlus (NLM), "Capillary nail refill test"** (https://medlineplus.gov/ency/article/003394.htm; ditinjau 19/05/2025; dibaca lewat salinan halaman penuh). Dipakai untuk: tekanan pada dasar kuku sampai putih (blanching) menandakan darah terdorong keluar dari jaringan di bawah kuku; setelah tekanan **dilepas** dihitung waktu sampai darah kembali, ditandai kuku kembali merah muda; hasil normal: warna merah muda kembali **kurang dari 2 detik** setelah tekanan dilepas; waktu > 2 detik "dapat menunjukkan" beberapa keadaan (halaman mencantumkan dehidrasi, hipotermia, tekanan darah rendah, penyakit pembuluh perifer, syok). **Video sengaja tidak menyebut daftar penyakit itu** dan tidak mengklaim satu hasil CRT memastikan salah satunya.
- **Gorelick MH, Shaw KN, Baker MD. Effect of ambient temperature on capillary refill in healthy children. Pediatrics 1993;92(5):699-702. PMID 8414858** (https://pubmed.ncbi.nlm.nih.gov/8414858/; dibaca lewat abstrak PubMed, **bukan** teks lengkap). Dipakai untuk: pada 32 anak sehat usia 1 bulan - 12 tahun, waktu isi ulang kapiler ujung jari rata-rata 0,85 dtk di ruangan hangat (25,7 °C) vs 2,39 dtk di ruangan dingin (19,4 °C); hanya 31% dianggap normal (< 2 dtk) di ruangan dingin; keandalan antarpengamat hanya sedang. Kesimpulan penulis: penurunan suhu ruangan dapat memperpanjang CRT pada anak dengan sirkulasi normal, dan ada keterbatasan penggunaan CRT. Video hanya memakai arah umum (dingin dan cara periksa dapat memengaruhi waktu), **tanpa angka dari studi ini**.
- **Batas:** kedua sumber di atas tidak saya baca sebagai pendukung klaim bahwa **usia** memengaruhi CRT; kata "usia" datang dari naskah pemesan (abstrak PubMed hanya menyebut selisih suhu signifikan "regardless of age"). Bila ingin dipertahankan sebagai klaim bersumber, tambahkan rujukan khusus. Angka "sekitar 2 detik atau kurang" adalah acuan umum, bukan jaminan untuk semua usia, lokasi, dan kondisi (tertulis di layar).
- Video tidak memuat dosis, nilai ambang untuk keputusan klinis, atau nama penyakit. Penutup: "SATU PETUNJUK, BUKAN DIAGNOSIS". Ini ilustrasi edukasi, bukan pengganti penilaian tenaga kesehatan.
- Detail teknik yang tidak ditampilkan: MedlinePlus menyebut tangan dipegang di atas level jantung dan kuku dibersihkan dari cat kuku saat pemeriksaan sungguhan; naskah pemesan tidak memuatnya.

## Bahan
| Bahan | Hasil |
|---|---|
| Audio narasi | `audio/narasi-edukasi.wav` dari pemesan (Google AI Studio, 24 kHz mono, 38,72 dtk), SHA-256 `7324052bcc3ec23102bce0560b1340c5fb8527df27feeaaf0eb9533a0ab33dee` (`audio/SHA256SUMS.txt`). Dipakai apa adanya (hanya di-resample 24 -> 48 kHz); tidak ada narator pengganti. ASR hanya menunjukkan variasi ejaan; tidak ada kata hilang/tambah/tertukar. |
| Outro | `brand/video/outro/medcoel-outro-master.mp4` (16,2 dtk) ditempel utuh setelah bagian edukasi; README/`assets.json` outro dibaca. Tidak ada suara, musik, logo, atau CTA tambahan di atasnya dan audio master tidak dinormalkan ulang. |
| Raka | `brand/characters/raka/raka.js` lewat `rakaSvg()` / `raka()` (README karakter dibaca): tegak, tidak digambar ulang. Tampil di hook (mendemonstrasikan menekan kuku), penutup, dan cover. |
| Jari / kuku | Digambar dari kode (`stage/hand.js`, SVG): jari kartun sebagai **ilustrasi anatomi terpisah** (diberi label "ilustrasi edukatif (perbesaran)"), bukan tangan kartun Raka yang diperbesar. Warna kulit disamakan dengan Raka. |
| Penampang | `stage/anat.js`: penampang samping dasar kuku (lempeng kuku, pembuluh kecil, tulang) digambar baru; skema, bukan data nyata. Hanya jaringan di bawah kuku yang ditekan yang kehilangan darah; warna kuku, lebar/aliran pembuluh, dan timer semuanya dari satu fungsi waktu `crt(tn)` (`stage/timeline.js`). |
| Logo | `apps/web/src/assets/logo-full.webp` (salinan `stage/logo-full.webp`), hanya sebagai aset proyek. |
| Gaya | Acuan gaya: `video/kopi-kafein-adenosin` (Raka -> mekanisme di dalam tubuh, vektor 2D datar, warna konsisten). Tidak ada objek/adegan/audio yang disalin. |

## Musik dan efek (lisensi)
Musik latar (pad hangat + pluck lembut, 88 BPM, Am-F-C-G) dan semua aksen (judul, tekan, lepas "klik", tik timer, darah keluar/kembali, chime warna pulih, dingin, penutup) **disintesis sendiri** dengan numpy/scipy di `audio/build_audio.py`: tanpa sampel pihak ketiga, **CC0 / domain publik**, aman untuk promosi Instagram/TikTok. Klik dibunyikan tepat saat jari lepas; tik berhenti tepat saat warna pulih. Musik dan aksen turun otomatis di bawah suara. Bagian edukasi dinormalkan ke -14 LUFS sebelum digabung dengan master.

_Salinan mentah halaman/PDF yang dibaca disimpan lokal di `sumber/` dan tidak di-commit._
