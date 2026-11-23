#!/usr/bin/env bash
# Gabung: bagian edukasi (bingkai + audio ternormalisasi -14 LUFS) + master outro apa adanya. Master TIDAK dinormalkan ulang.
# pemakaian: bash video/autoinjektor-anafilaksis/gabung.sh <folder-bingkai>   -> video/autoinjektor-anafilaksis/autoinjektor-anafilaksis_final.mp4
set -e
cd "$(dirname "$0")/../.."; FR=${1:?folder bingkai}; P=video/autoinjektor-anafilaksis; EDU=$(python3 -c "import json;print(json.load(open('$P/stage/timeline.json'))['EDU'])")
M=$(ffmpeg -hide_banner -i $P/audio/edu_mix.wav -af "alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | python3 -c "
import sys,json,re; t=sys.stdin.read(); j=json.loads(re.search(r'\{[^{}]*\"input_i\"[^{}]*\}',t,re.S).group(0)); print(j['input_i'],j['input_tp'],j['input_lra'],j['input_thresh'],j['target_offset'])"); set -- $M
ffmpeg -y -v error -i $P/audio/edu_mix.wav -af "alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$1:measured_TP=$2:measured_LRA=$3:measured_thresh=$4:offset=$5:linear=true,aresample=48000,apad=whole_dur=$EDU,atrim=0:$EDU" -ar 48000 -c:a pcm_s16le $P/audio/edu_norm.wav
ffmpeg -y -v error -framerate 30 -start_number 0 -i "$FR/f%05d.jpg" -i $P/audio/edu_norm.wav -i brand/video/outro/medcoel-outro-master.mp4 -filter_complex \
"[0:v]fps=30,format=yuv420p,setsar=1[v0];[2:v]fps=30,format=yuv420p,setsar=1[v1];[1:a]aresample=48000,aformat=channel_layouts=stereo[a0];[2:a]aresample=48000,aformat=channel_layouts=stereo[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -profile:v high -preset slow -crf 17 -pix_fmt yuv420p -r 30 -g 30 -sc_threshold 0 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart $P/autoinjektor-anafilaksis_final.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate -of csv=p=0 $P/autoinjektor-anafilaksis_final.mp4
