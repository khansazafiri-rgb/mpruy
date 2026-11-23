"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 33,48 dtk).
Waktu kalimat/kata = ASR faster-whisper (audio/asr.json). TEKS takarir = naskah pemesan (ASR salah dengar "balik"->"Bali", "teredam"->"terdamp", "tersumbat"->"tersembat", "nyeri"->"nyari"; takarir memakai ejaan naskah).
Master outro (brand/video/outro/medcoel-outro-master.mp4, 16,2 dtk) ditempel UTUH sesudah edukasi; takarir outro sudah ada di dalam master.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_DUR = 33.48; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
SK = [
 ('s1', 0.00, 4.16, ['Pernah merasa telinga', 'tiba-tiba penuh saat pesawat turun,', 'lalu terdengar "pop"?']),
 ('s2', 5.32, 7.56, ['Di balik gendang telinga', 'ada ruang berisi udara.']),
 ('s3', 8.26, 12.06, ['Saat tekanan kabin berubah,', 'tekanan di kedua sisi', 'gendang telinga belum seimbang.']),
 ('s4', 12.62, 17.60, ['Gendang telinga terdorong,', 'sehingga telinga terasa tidak nyaman', 'dan suara bisa terdengar teredam.']),
 ('s5', 18.62, 22.46, ['Ketika kita menelan atau menguap,', 'saluran Eustachius', 'terbuka sebentar.']),
 ('s6', 23.06, 27.16, ['Udara masuk, tekanannya', 'kembali seimbang,', 'dan muncullah sensasi "pop".']),
 ('s7', 27.76, 33.06, ['Kalau saluran ini tersumbat saat pilek,', 'tekanan lebih sulit seimbang', 'dan telinga bisa terasa lebih nyeri.']),
]
W = {'perhatikan': 0.0, 'telinga': 0.80, 'penuh': 1.62, 'pesawat': 2.12, 'turun': 2.44, 'lalu': 3.04, 'pop1': 4.00,
     'balik': 5.52, 'gendang1': 5.68, 'ruang': 6.70, 'udara1': 7.22,
     'tekanan1': 8.26, 'kabin': 8.84, 'berubah': 9.08, 'tekanan2': 9.90, 'kedua': 10.38, 'gendang2': 10.80, 'belum': 11.44, 'seimbang1': 11.62,
     'gendang3': 12.62, 'terdorong': 13.32, 'sehingga': 13.96, 'tidak': 15.26, 'nyaman': 15.46, 'suara': 16.30, 'teredam': 17.22,
     'ketika': 18.62, 'menelan': 19.20, 'menguap': 19.92, 'saluran1': 20.78, 'eustachius': 21.08, 'terbuka': 21.76, 'sebentar': 22.10,
     'udara2': 23.06, 'masuk': 23.30, 'tekanannya': 24.18, 'kembali': 24.52, 'seimbang2': 24.84, 'muncullah': 25.74, 'sensasi': 26.24, 'pop2': 26.96,
     'kalau': 27.76, 'saluran2': 28.30, 'tersumbat': 28.78, 'pilek': 29.38, 'tekanan3': 30.18, 'sulit': 30.62, 'seimbang3': 30.88, 'telinga2': 31.58, 'nyeri': 32.80}
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
