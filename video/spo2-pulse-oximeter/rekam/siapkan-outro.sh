#!/usr/bin/env bash
# Menyusun potongan rekaman web ASLI (tanpa audio) untuk outro. Sumber: video/masih-dua-minggu/rekam/rekaman-web.mp4 dan video/dok-saya-kenapa/rekam/rekaman-web.mp4.
# Tiap potongan: [detik sumber awal, panjang sumber, durasi keluaran] diatur agar sinkron dengan medcoel-outro-master.wav (mulai 1,2 dtk setelah web terlihat).
# Hasil: outro-web.mp4 (960x1180, 30 fps, 15,14 dtk) dan frame JPEG di web/ (tidak di-commit).
set -e
cd "$(dirname "$0")"; ROOT=$(cd ../../.. && pwd)
M=$ROOT/video/masih-dua-minggu/rekam/rekaman-web.mp4; D=$ROOT/video/dok-saya-kenapa/rekam/rekaman-web.mp4
seg() { # file ss tt out label
  echo "[$1:v]trim=start=$2:duration=$3,setpts=(PTS-STARTPTS)*$4/$3,fps=30,format=yuv420p[$5]"; }
F=$(
seg 0 0.0 1.2 1.2 a; seg 0 1.2 1.8 1.8 b; seg 0 3.0 1.6 2.06 c; seg 0 4.6 0.9 1.34 d; seg 0 5.5 2.5 0.6 e; seg 0 9.0 3.5 0.7 f; seg 1 0.0 3.2 1.6 g; seg 1 3.2 5.84 5.84 h)
ffmpeg -y -v error -i "$M" -i "$D" -filter_complex "$(echo "$F" | tr '\n' ';')[a][b][c][d][e][f][g][h]concat=n=8:v=1:a=0[v]" -map "[v]" -r 30 -c:v libx264 -crf 18 -pix_fmt yuv420p outro-web.mp4
rm -rf web; mkdir -p web; ffmpeg -y -v error -i outro-web.mp4 -q:v 2 web/f%04d.jpg
echo "frame: $(ls web | wc -l)"; ffprobe -v error -show_entries format=duration -of csv=p=0 outro-web.mp4
