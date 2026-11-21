#!/usr/bin/env bash
# Potongan rekaman web ASLI (tanpa audio) untuk outro. Hasil: outro-web.mp4 (960x1180, 30 fps) dan bingkai JPEG di web/ (tidak di-commit).
# Urutan di berkas (bingkai): atlas 0-98 (3,3 dtk, 1x) | materi 99-143 (1,5 dtk, ~1,9x) | latihan 144-176 (1,1 dtk, ~2,5x) | simulasi 177-221 (1,5 dtk, ~2,3x).
# Sumber: video/human-anatomy-3d/medcoel-3d-anatomy.mp4 (hanya gambar; dipotong ke panel model agar judul/takarir lama tidak ikut),
#         video/masih-dua-minggu/rekam/rekaman-web.mp4 (materi, latihan soal), video/dok-saya-kenapa/rekam/rekaman-web.mp4 (Simulasi Dokter).
# Audio sumber TIDAK dipakai.
set -e
cd "$(dirname "$0")"; ROOT=$(cd ../../.. && pwd)
A=$ROOT/video/human-anatomy-3d/medcoel-3d-anatomy.mp4; M=$ROOT/video/masih-dua-minggu/rekam/rekaman-web.mp4; D=$ROOT/video/dok-saya-kenapa/rekam/rekaman-web.mp4
fl() { echo "[$1:v]trim=start=$2:duration=$3,setpts=(PTS-STARTPTS)*$4/$3,fps=30,$5scale=960:1180,format=yuv420p,setsar=1[$6]"; }
F="$(fl 0 18.0 3.3 3.3 'crop=724:890:356:340,' a);$(fl 1 1.0 2.9 1.5 '' b);$(fl 1 5.2 2.7 1.1 '' c);$(fl 2 8.5 3.5 1.5 '' d)"
ffmpeg -y -v error -i "$A" -i "$M" -i "$D" -filter_complex "$F;[a][b][c][d]concat=n=4:v=1:a=0[v]" -map "[v]" -r 30 -c:v libx264 -crf 18 -pix_fmt yuv420p outro-web.mp4
rm -rf web; mkdir -p web; ffmpeg -y -v error -i outro-web.mp4 -q:v 2 web/f%04d.jpg
echo "bingkai: $(ls web | wc -l)"
