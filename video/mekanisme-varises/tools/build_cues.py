"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 29,40 dtk).
Waktu kalimat/kata = ASR faster-whisper (audio/asr.json). TEKS takarir = naskah pemesan (ASR salah dengar "varises"->"varices", "melemah"->"melema"; takarir memakai ejaan naskah).
Master outro (brand/video/outro/medcoel-outro-master.mp4, 16,2 dtk) ditempel UTUH sesudah edukasi; takarir outro sudah ada di dalam master.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_DUR = 29.40; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
SK = [
 ('s1', 0.00, 2.54, ['Perhatikan aliran darah', 'di pembuluh kaki ini.']),
 ('s2', 3.18, 6.76, ['Katup di dalam vena membantu', 'darah bergerak menuju jantung.']),
 ('s3', 7.42, 12.18, ['Ketika katup tidak menutup rapat,', 'sebagian darah mengalir', 'kembali dan berkumpul.']),
 ('s4', 12.92, 16.62, ['Lama-kelamaan, vena melebar,', 'berkelok, dan tampak menonjol.']),
 ('s5', 17.28, 19.46, ['Inilah salah satu mekanisme', 'terjadinya varises.']),
 ('s6', 20.28, 21.64, ['Sekarang lihat perbedaannya.']),
 ('s7', 22.30, 25.22, ['Katup yang menutup rapat', 'menjaga aliran tetap naik,']),
 ('s8', 25.58, 29.04, ['sementara katup yang melemah', 'membiarkan sebagian darah', 'turun lagi.']),
]
W = {'perhatikan': 0.0, 'aliran': 0.60, 'darah1': 1.00, 'pembuluh': 1.60, 'kaki': 2.04,
     'katup1': 3.18, 'vena': 4.26, 'membantu': 4.72, 'darah2': 5.32, 'menuju': 6.08, 'jantung': 6.34,
     'ketika': 7.42, 'katup2': 8.04, 'tidak': 8.34, 'rapat': 8.86, 'sebagian': 9.70, 'darah3': 10.16, 'mengalir': 10.54, 'kembali': 11.04, 'berkumpul': 11.68,
     'lama': 12.92, 'melebar': 13.92, 'berkelok': 14.76, 'menonjol': 16.16, 'inilah': 17.28, 'mekanisme': 18.06, 'varises': 19.00,
     'sekarang': 20.28, 'perbedaannya': 21.16, 'katup3': 22.30, 'menutup': 22.94, 'rapat2': 23.24, 'menjaga': 23.62, 'naik': 24.94,
     'sementara': 25.58, 'katup4': 25.98, 'melemah': 26.70, 'membiarkan': 27.32, 'turun': 28.50, 'lagi': 28.80}
def chunks(t0, t1, parts):
    n = sum(len(p) for p in parts); out = []; c = 0
    for p in parts:
        a = t0 + (t1 - t0) * c / n; c += len(p); b = t0 + (t1 - t0) * c / n; out.append([round(a, 2), round(b + (0.10 if p is parts[-1] else 0), 2), p])
    return out
cap = []
for sid, a, b, parts in SK: cap += chunks(a, b, parts)
cues = {'dur': round(DUR, 2), 'edu_dur': EDU_DUR, 'outro_dur': OUTRO_DUR, 'sent': {sid: [a, b] for sid, a, b, *_ in SK}, 'w': W, 'cap': cap}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap', len(cap))
