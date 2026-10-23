#!/bin/bash
# sheet.sh <dir-keluaran>: gabungkan build/sheet/*.png jadi 4 lembar kontak (4 shot per lembar)
O=${1:-build}; cd "$(dirname "$0")/build/sheet" || exit 1
for r in 0 1 2 3; do inputs=""; for s in 1 2 3 4; do n=$(printf %02d $((r*4+s))); for k in 0 1 2 3; do inputs="$inputs -i s${n}_$k.png"; done; done
ffmpeg -y -v error $inputs -filter_complex "[0:v][1:v][2:v][3:v]hstack=inputs=4[a];[4:v][5:v][6:v][7:v]hstack=inputs=4[b];[8:v][9:v][10:v][11:v]hstack=inputs=4[c];[12:v][13:v][14:v][15:v]hstack=inputs=4[d];[a][b][c][d]vstack=inputs=4,scale=iw/2:-1" "$O/ad_sheet$r.png"; done
