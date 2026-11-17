# Seseorang kolaps di kampus: langkah awal PPGD — video edukasi promosi MEDCOEL (47,1 dtk, 1080×1920, 30 fps)

Gaya game pixel modern (koridor kampus, teks, transisi blok piksel). Raka dirender dari aset kanonik `brand/characters/raka/raka.js`; korban dewasa dan teman memakai konstruksi dan palet Raka (`PALETTE_DOSEN`, `PALETTE_KAKAK`, pose `rebah`/`jongkok`/`jalan` bawaan). Ringkasan langkah awal, **bukan pengganti pelatihan praktik** (kalimat ini tampil kecil di layar sepanjang cerita).

Hasil: `seseorang-kolaps-di-kampus.mp4` (H.264 + AAC), cover `cover/cover.png` (+ `cover-panduan-area-aman.png`, `cover-360px.png`), bingkai kunci 360 px di `still/`.

## STATUS NARASI OUTRO (PENTING)
Narasi outro **belum ada di video**. Saya tidak punya akses ke Google AI Studio dan tidak diberi berkas WAV-nya, dan saya tidak membuat suara pengganti. Yang ada sekarang: takarir layar untuk kalimat narasi persis seperti naskah, musik, dan efek. Cara memasangnya: taruh WAV hasil Google AI Studio di `audio/narasi-outro.wav` (kalimat: "Mau lanjut belajar? Di MEDCOEL, kamu bisa buka materi per bab, latihan soal, dan Simulasi Dokter. Gratis di medcoel.com."), jalankan `python3 video/ppgd-kampus/audio/audio_mix.py` (otomatis dicampur mulai 34,9 dtk dengan musik turun di bawahnya), lalu sesuaikan `outro.sub`, `outro.bab/soal/sim`, dan `dur` di `cues.json` dengan durasi audio dan render ulang (perintah di bawah). Waktu takarir dan potongan outro saat ini adalah ESTIMASI (dasar: outro mulai 34,5 dtk).

## Alur (teks layar sesuai naskah)
| Detik | Adegan | Teks |
|---|---|---|
| 0–3 | Frame pertama sudah bergerak: korban berjalan di koridor, goyah, jatuh (kepulan debu); Raka menoleh kaget | "Kalau seseorang tiba-tiba kolaps?" |
| 3–6 | Raka memindai kiri-kanan, lalu mendekat; centang "AREA AMAN" | "1. Pastikan aman" |
| 6–10 | Berlutut di sisi korban, memanggil ("Halo! Bisa dengar saya?") sambil menepuk bahu; "TIDAK ADA RESPONS" | "2. Cek respons" |
| 10–14 | Teman datang; Raka menunjuk: telepon 119 (ponsel di telinga) lalu "Ambil AED!"; teman berlari pergi | "3. Panggil bantuan · minta AED" |
| 14–18 | Raka menunduk memeriksa dada/napas; panel membandingkan gelombang napas NORMAL dengan MEGAP-MEGAP (korban megap-megap tampak di wajah) bertanda silang: "MEGAP-MEGAP = BUKAN NAPAS NORMAL" | "4. Napas normal?" |
| 18–27 | "TIDAK RESPONS + TIDAK BERNAPAS NORMAL" → RJP: tangan bertumpuk di tengah dada, lengan lurus, tubuh naik-turun dengan dada korban menekan, metronom 110/menit, "TEKAN TENGAH DADA · KUAT · CEPAT", "100–120 TEKANAN / MENIT" | "Mulai RJP" |
| 27–31 | Teman kembali membawa AED; AED menyala (lampu hijau berkedip), bantalan ditempel di dada dengan kabel, RJP dihentikan untuk mengikuti instruksi | "AED: ikuti instruksinya" |
| 31–34,5 | **Korban sadar** (tambahan atas permintaan): Raka berhenti menekan, korban membuka mata dan bertanya "Saya... kenapa?"; bantalan AED masih menempel | "Korban sadar" · "TETAP TUNGGU TENAGA MEDIS" |
| 34,5–47,1 | Transisi blok piksel ke rekaman web asli: ① pilih bab, ② latihan soal + pembahasan (jawaban salah dan penjelasan), ③ Simulasi Dokter; 43,5 dtk: logo + "BELAJAR FK GRATIS · MEDCOEL.COM" di atas rekaman web yang masih bergerak (3,6 dtk) | takarir narasi outro |

Kepala korban kini diputar sejajar sumbu badan (tidak miring). Adegan sadar dibuat dipilih: korban tidak berdiri (setelah henti jantung tidak realistis), hanya sadar dan menunggu tenaga medis. Tidak ada adegan "menang level": tidak ada skor, bintang, atau musik kemenangan; musik serius dan tenang.

## Batasan akurasi (jujur)
- **RJP disederhanakan:** tampak samping, Raka berlutut di sisi korban dengan lengan lurus dan tangan bertumpuk di tengah dada; gerak naik-turun hanya dari badan atas. Kedalaman, rekoil, dan hitungan 30:2 **tidak** ditampilkan; tidak ada close-up teknik dan tidak ada napas buatan. Laju 110/menit hanya untuk irama visual dan metronom; angka "100–120/menit" ditulis di layar. Pelatihan praktik tetap diperlukan.
- **Megap-megap:** ditunjukkan sebagai mulut korban terbuka sesekali (14,7; 15,95; 17,2 dtk) dan grafik pembanding, bukan napas normal. Gambar karakter tidak bisa memperlihatkan gerak dada napas kecil dengan jelas.
- **AED:** perangkat generik (ikon jantung + petir, lampu status), bantalan di dada dengan kabel; tidak ada adegan kejut/"jauhkan tangan" (dianggap di luar ringkasan; baris "ikuti instruksinya" saja).
- Korban dan teman berasal dari rangka Raka (palet dan rambut berbeda); tidak ada karakter manusia baru dari awal. Logo patch dimatikan pada korban/teman.
- Urutan PPGD mengikuti naskah pemesan: aman → respons → panggil bantuan/AED → napas → RJP → AED. Video tidak menggantikan pelatihan atau pedoman resmi.
- Outro memakai rekaman web asli dari paket outro (`video/masih-dua-minggu/rekam/rekaman-web.mp4`: pilih mata kuliah/bab, latihan soal, jawaban salah, pembahasan; `video/dok-saya-kenapa/rekam/rekaman-web.mp4`: Simulasi Dokter). Data uji lokal; tidak ada UI buatan dan tidak ada audio dari rekaman lama. Karena rekaman bab/latihan lama, tampilan UI bisa sedikit berbeda dari web terbaru.
- Audio belum didengarkan manusia; hanya diukur (≈ −15,5 LUFS tanpa narasi, puncak −1,5 dBFS). Setelah narasi dipasang, mix memakai target −14 LUFS.
- Pemeriksaan visual dari lembar kontak tiap 1 detik, bingkai kunci, dan pratinjau 360 px.

## Audio dan lisensi
Musik ("MEDCOEL Hall Pulse": pad tenang + pluck persegi tipis) dan efek (klik teks, ketukan bahu, nada telepon, napas, metronom, AED menyala/instruksi, tempel bantalan) disintesis dari kode (`audio/audio_mix.py`), lisensi **CC0 1.0**, boleh untuk Instagram/TikTok tanpa atribusi. Font: Press Start 2P dan Plus Jakarta Sans (SIL OFL 1.1). Logo: `apps/web/src/assets/logo-full.webp`.

## Proyek yang bisa diedit / render ulang
`cues.json` jadwal; `stage/` (`stage.js` koreografi, `world.js` koridor/AED/ponsel, `outro.js`); `rekam/web/` bingkai outro (15 fps, diekstrak dari dua rekaman paket outro); `audio/`; `cover/`; `render.mjs`; `shot.cjs`.
```bash
python3 -m http.server 8132 --bind 127.0.0.1 &           # dari akar repo
python3 video/ppgd-kampus/audio/audio_mix.py              # musik + efek (+ narasi bila audio/narasi-outro.wav ada) -> audio/mix.wav
NODE_PATH=/opt/node-tools/node_modules node video/ppgd-kampus/render.mjs /tmp/ppgd-out 0 1412 4
ffmpeg -framerate 30 -i /tmp/ppgd-out/f%05d.jpg -i video/ppgd-kampus/audio/mix.wav -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 47.1 video/ppgd-kampus/seseorang-kolaps-di-kampus.mp4
```
Bingkai outro dibuat ulang dengan: `ffmpeg -ss 0 -t 5.2 -i video/masih-dua-minggu/rekam/rekaman-web.mp4 -vf fps=15,scale=900:-2 -start_number 0 rekam/web/bab/f%04d.jpg` (soal: `-ss 5.6 -t 8.4`; sim dari dok-saya-kenapa: `-ss 2.0 -t 14.5`).
