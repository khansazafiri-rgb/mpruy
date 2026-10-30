#!/usr/bin/env bash
# Voice asli (tidak diubah) + musik tenang dan ambien tipis di bawah dialog (sidechain), lalu normalisasi sekitar -14 LUFS.
# Pemakaian: bash mix.sh voice.wav music.wav sfx.wav out.wav
set -e
ffmpeg -v error -y -i "$1" -i "$2" -i "$3" -filter_complex "
[0:a]aformat=channel_layouts=stereo,asplit=2[v][vsc];
[1:a]volume=0.17[m];
[m][vsc]sidechaincompress=threshold=0.015:ratio=9:attack=30:release=450:makeup=1[md];
[2:a]volume=0.34[sx];
[v][md][sx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=9[o]" -map "[o]" -ar 44100 -ac 2 "$4"
