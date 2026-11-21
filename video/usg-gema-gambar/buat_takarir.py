#!/usr/bin/env python3
"""Takarir (SRT + VTT) dari stage/timeline.json (kata-kata dari ASR audio asli). Waktu video = detik narasi + OFF; kalimat outro = detik audio outro + waktu audio outro mulai."""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); J = json.load(open(os.path.join(H, 'stage', 'timeline.json'), encoding='utf-8')); OFF = J['OFF']; MA = J['MASTER_AT']
caps = [(a + OFF, b + OFF, t) for a, b, t in J['KAL']] + [(MA + a, MA + b, t) for a, b, t in J['OUT_CAPS']]
def ts(t, sep): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w', encoding='utf-8') as f:
    for i, (a, b, t) in enumerate(caps, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w', encoding='utf-8') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in caps: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print(len(caps), 'baris takarir')
