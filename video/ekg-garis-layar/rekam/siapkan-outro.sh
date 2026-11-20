#!/usr/bin/env bash
# Menyusun potongan rekaman ASLI untuk outro (960x1180, 30 fps, 14,4 dtk), tanpa audio, lalu bingkai JPEG ke rekam/web/ (tidak di-commit).
# Sumber: (1) Atlas 3D dan (2) Live 4D Lab = rekaman layar asli di folder Drive MEDCOEL (diunduh ke $DRIVE: 23.53.24.mov = Atlas 3D, 23.58.43.mov = Live 4D Lab);
# (3) materi + latihan soal = video/masih-dua-minggu/rekam/rekaman-web.mp4; (4) Simulasi Dokter = video/dok-saya-kenapa/rekam/rekaman-web.mp4.
# Layar lebar (2816x1582) dipotong/disusun ulang menjadi potret tanpa menggambar UI baru. Pemakaian: DRIVE=/jalur/klip bash siapkan-outro.sh [folder-bingkai]
set -e
cd "$(dirname "$0")"; ROOT=$(cd ../../.. && pwd); DRIVE=${DRIVE:-/tmp/claude-0/pc/ekg/drive}
M=$ROOT/video/masih-dua-minggu/rekam/rekaman-web.mp4; D=$ROOT/video/dok-saya-kenapa/rekam/rekaman-web.mp4
A=$DRIVE/23.53.24.mov; L=$DRIVE/23.58.43.mov
if [ -f "$A" ] && [ -f "$L" ]; then
ffmpeg -y -v error -ss 29 -t 2.9 -i "$A" -ss 17 -t 2.4 -i "$L" -ss 3.0 -t 1.6 -i "$M" -ss 8.0 -t 1.4 -i "$M" -ss 3.2 -t 6.1 -i "$D" -filter_complex "
[0:v]fps=30,crop=1000:1229:1000:60,scale=960:1180,setsar=1,format=yuv420p[a];
[1:v]fps=30,split=2[l1][l2];[l1]crop=1200:737:250:380,scale=960:590[lt];[l2]crop=1240:762:1576:440,scale=960:590[lb];[lt][lb]vstack,setsar=1,format=yuv420p[l];
[2:v]fps=30,scale=960:1180,setsar=1,format=yuv420p[m];[3:v]fps=30,scale=960:1180,setsar=1,format=yuv420p[s];[4:v]fps=30,scale=960:1180,setsar=1,format=yuv420p[d];
[a][l][m][s][d]concat=n=5:v=1:a=0[v]" -map "[v]" -r 30 -c:v libx264 -crf 18 -pix_fmt yuv420p outro-web.mp4
fi
F=${1:-/tmp/ekg-web}; rm -rf "$F"; mkdir -p "$F"; ffmpeg -y -v error -i outro-web.mp4 -q:v 2 "$F/f%04d.jpg"; ln -sfn "$F" web
echo "bingkai: $(ls "$F" | wc -l)"; ffprobe -v error -show_entries format=duration -of csv=p=0 outro-web.mp4
