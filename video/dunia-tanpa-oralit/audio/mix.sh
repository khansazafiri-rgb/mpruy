#!/usr/bin/env bash
# Campur suara (asli, tidak diubah kecepatannya) + musik di bawah dialog (sidechain) + efek, lalu normalisasi ke sekitar -16 LUFS.
# Pemakaian: bash mix.sh voice.wav music.wav sfx.wav out.wav
set -e
ffmpeg -v error -y -i "$1" -i "$2" -i "$3" -filter_complex "
[0:a]aformat=channel_layouts=stereo,asplit=2[v][vsc];
[1:a]volume=0.10[m];
[m][vsc]sidechaincompress=threshold=0.015:ratio=10:attack=30:release=500:makeup=1[md];
[2:a]volume=0.42[sx];
[v][md][sx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=9[o]" -map "[o]" -ar 44100 -ac 2 "$4"
