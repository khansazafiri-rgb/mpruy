#!/bin/bash
# nama rec t0 durasi
ex() { rm -rf clips/$1; mkdir -p clips/$1; ffmpeg -v error -y -ss $3 -t $4 -i raw/rec$2.mov -vf "fps=30" -q:v 3 clips/$1/f%04d.jpg; echo $1 $(ls clips/$1 | wc -l); }
ex lnd 1 2.0 2.6; ex a 1 8.0 1.6; ex b 1 15.0 3.2; ex c 1 21.0 3.6; ex d 1 62.0 3.6; ex e 1 66.4 1.2; ex q1 1 77.8 5.6; ex q2 1 103.0 4.0; ex q3 1 111.2 3.6
