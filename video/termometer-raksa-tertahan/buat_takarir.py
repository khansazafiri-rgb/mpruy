#!/usr/bin/env python3
"""Membuat takarir (SRT + VTT) dari stage/timeline.json (naskah; waktu DIPERKIRAKAN selama narasi asli belum ada) + kalimat master outro. Waktu video = detik narasi + OFF."""
import re, os
H = os.path.dirname(os.path.abspath(__file__))
import json
J = json.load(open(os.path.join(H, 'stage', 'timeline.json'), encoding='utf-8')); OFF = 0.3; EDU_END = J['edu_end']
O0 = EDU_END + OFF + 0.45; MASTER_AT = O0 + 1.2
caps = [(k['t0'] + OFF, k['t1'] + OFF, k['text']) for k in J['kalimat']]
caps += [(MASTER_AT + 0.0, MASTER_AT + 3.36, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.'), (MASTER_AT + 3.86, MASTER_AT + 7.78, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.'), (MASTER_AT + 8.34, MASTER_AT + 10.46, 'Semuanya gratis di medcoel.com.')]
def ts(t, sep): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w', encoding='utf-8') as f:
    for i, (a, b, t) in enumerate(caps, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w', encoding='utf-8') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in caps: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print(len(caps), 'baris takarir')
