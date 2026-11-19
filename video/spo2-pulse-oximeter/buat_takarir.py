#!/usr/bin/env python3
"""Membuat takarir (SRT + VTT) dari stage/timeline.js (CAPS) + kalimat master outro. Waktu video = detik narasi + OFF."""
import re, os
H = os.path.dirname(os.path.abspath(__file__))
tl = open(os.path.join(H, 'stage', 'timeline.js'), encoding='utf-8').read()
OFF = float(re.search(r'OFF = ([\d.]+)', tl).group(1)); EDU_END = float(re.search(r'EDU_END = ([\d.]+)', tl).group(1))
O0 = EDU_END + OFF + 0.45; MASTER_AT = O0 + 1.2
caps = [(float(a) + OFF, float(b) + OFF, t) for a, b, t in re.findall(r"\[([\d.]+), ([\d.]+), '([^']*)'\]", tl.split('export const CAPS')[1])]
# master outro (kata hasil ASR; nama ditulis MEDCOEL)
caps += [(MASTER_AT + 0.0, MASTER_AT + 3.36, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.'), (MASTER_AT + 3.86, MASTER_AT + 7.78, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.'), (MASTER_AT + 8.34, MASTER_AT + 10.46, 'Semuanya gratis di medcoel.com.')]
def ts(t, sep): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f'{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w', encoding='utf-8') as f:
    for i, (a, b, t) in enumerate(caps, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w', encoding='utf-8') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in caps: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print(len(caps), 'baris takarir')
