#!/usr/bin/env bash
# Menyusun brand/video/outro/medcoel-outro-master.mp4 dari bingkai (render.mjs) + audio/mix.wav. Dua langkah loudnorm (linear) ke -14 LUFS / TP -1,5; video dan audio tepat 16,2 dtk (486 bingkai).
# pemakaian: bash video/outro-master/encode.sh <folder-bingkai>
set -e
cd "$(dirname "$0")/../.."; FR=${1:?folder bingkai}; DUR=16.2
M=$(ffmpeg -hide_banner -i video/outro-master/audio/mix.wav -af "alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | python3 -c "
import sys,json,re; t=sys.stdin.read(); j=json.loads(re.search(r'\{[^{}]*\"input_i\"[^{}]*\}',t,re.S).group(0)); print(j['input_i'],j['input_tp'],j['input_lra'],j['input_thresh'],j['target_offset'])"); set -- $M
mkdir -p brand/video/outro
ffmpeg -y -v error -framerate 30 -start_number 0 -i "$FR/f%05d.jpg" -i video/outro-master/audio/mix.wav \
  -af "alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$1:measured_TP=$2:measured_LRA=$3:measured_thresh=$4:offset=$5:linear=true,aresample=48000,apad=whole_dur=$DUR,atrim=0:$DUR" \
  -c:v libx264 -profile:v high -preset slow -crf 17 -pix_fmt yuv420p -r 30 -g 30 -keyint_min 30 -sc_threshold 0 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart -frames:v 486 brand/video/outro/medcoel-outro-master.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels -of csv=p=0 brand/video/outro/medcoel-outro-master.mp4
