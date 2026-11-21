#!/usr/bin/env bash
# Potong bahan asli outro master ke deret JPEG 30 fps (kecepatan 1,0x; tidak ada percepatan). Hasil di rekam/klip/ (tidak di-commit).
# atlas   : video/human-anatomy-3d/medcoel-3d-anatomy.mp4, 13,9-16,6 dtk (otot tampil -> lapisan dibuka satu per satu -> tulang rusuk terlihat), dipotong ke panel model (356,340 724x890); hanya gambar, audio lama tidak dipakai
# materi  : video/masih-dua-minggu/rekam/rekaman-web.mp4, 2,7-4,4 dtk (kartu Anatomi -> daftar bab -> pilih bab -> pilihan belajar)
# latihan : video/masih-dua-minggu/rekam/rekaman-web.mp4, 8,3-9,8 dtk (jawaban dipilih -> Cek jawaban -> pembahasan)
# simulasi: video/dok-saya-kenapa/rekam/rekaman-web.mp4, 2,0-3,7 dtk (pilih poli -> Mulai -> pasien muncul)
set -e
cd "$(dirname "$0")"; ROOT=$(cd ../../.. && pwd)
A=$ROOT/video/human-anatomy-3d/medcoel-3d-anatomy.mp4; M=$ROOT/video/masih-dua-minggu/rekam/rekaman-web.mp4; D=$ROOT/video/dok-saya-kenapa/rekam/rekaman-web.mp4
rm -rf klip; mkdir -p klip/atlas klip/materi klip/latihan klip/simulasi
cut() { ffmpeg -y -v error -ss "$2" -t "$3" -i "$1" -vf "fps=30${5:+,$5}" -q:v 2 "klip/$4/f%04d.jpg"; echo "$4: $(ls klip/$4 | wc -l) bingkai"; }
cut "$A" 13.9 2.7 atlas "crop=724:890:356:340"
cut "$M" 2.7 1.7 materi
cut "$M" 8.3 1.5 latihan
cut "$D" 2.0 1.7 simulasi
# Live 4D Lab: take 'hook' dari video/usg-gema-gambar/rekam/lab.cjs (bingkai 100-174; tiap bingkai = satu klik sungguhan pada kontrol 'Gerakkan probe'); lihat video/usg-gema-gambar/README.md untuk merekam ulang.
