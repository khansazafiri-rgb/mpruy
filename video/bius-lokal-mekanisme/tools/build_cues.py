"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 59,52 dtk).
Waktu kalimat/kata = ASR faster-whisper (audio/asr.json). TEKS takarir = naskah pemesan (ASR salah dengar "bius"->"bis", "kebas"->"ke bas", "membran"->"memberan", "menghambat"->"menghabat", "memblok"->"memblock", "regional"->"biosregional"; takarir memakai ejaan naskah).
Master outro (brand/video/outro/medcoel-outro-master.mp4, 16,2 dtk) ditempel UTUH sesudah edukasi; takarir outro sudah ada di dalam master.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_DUR = 59.52; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
SK = [
 ('s1', 0.00, 3.68, ['Saat kulit terluka,', 'ujung saraf pendeteksi nyeri', 'menerima rangsangan.']),
 ('s2', 4.26, 6.54, ['Di sepanjang saraf,', 'kanal natrium membuka.']),
 ('s3', 7.34, 12.48, ['Natrium masuk ke sel saraf,', 'membentuk sinyal listrik', 'yang merambat menuju', 'sumsum tulang belakang dan otak.']),
 ('s4', 13.10, 14.76, ['Di sanalah nyeri disadari.']),
 ('s5', 15.98, 18.32, ['Lalu bagaimana obat bius lokal', 'menghentikannya?']),
 ('s6', 19.22, 22.26, ['Obat diberikan di sekitar area', 'atau saraf yang akan dibuat kebas.']),
 ('s7', 22.80, 27.50, ['Sebagian molekul obat masuk', 'menembus membran saraf,', 'lalu menghambat kanal natrium', 'dari sisi dalam.']),
 ('s8', 27.50, 32.56, ['Tanpa aliran natrium yang cukup,', 'sinyal nyeri tidak dapat', 'terus merambat melewati', 'bagian saraf itu.']),
 ('s9', 33.34, 37.34, ['Karena kerjanya terbatas', 'pada area tertentu,', 'orangnya biasanya tetap sadar.']),
 ('s10', 38.10, 41.64, ['Obat bisa diberikan', 'pada permukaan kulit,', 'disuntikkan di sekitar', 'area tindakan,']),
 ('s11', 42.00, 45.28, ['atau dipakai untuk memblok saraf', 'yang melayani area lebih luas.']),
 ('s12', 45.76, 47.76, ['Yang terakhir sering', 'disebut bius regional.']),
 ('s13', 48.52, 49.62, ['Bius total berbeda.']),
 ('s14', 50.04, 53.86, ['Obat bekerja pada', 'sistem saraf pusat sehingga', 'pasien tidak sadar selama prosedur.']),
 ('s15', 53.86, 59.08, ['Jadi perbedaannya bukan', 'sekadar jumlah obat,', 'tetapi area kerja dan', 'keadaan sadar pasien.']),
]
W = {'kulit': 0.32, 'terluka': 0.56, 'ujung': 1.42, 'saraf1': 1.74, 'nyeri1': 2.54, 'menerima': 2.76, 'rangsangan': 3.20,
     'disepanjang': 4.26, 'kanal1': 5.64, 'natrium1': 5.86, 'membuka': 6.16,
     'natrium2': 7.34, 'masuk': 7.78, 'sel': 8.14, 'membentuk': 9.14, 'sinyal1': 9.50, 'merambat': 10.30, 'sumsum': 11.16, 'tulang': 11.48, 'otak': 12.14,
     'disanalah': 13.10, 'nyeri2': 13.76, 'disadari': 14.26,
     'lalu': 15.98, 'bagaimana': 16.48, 'obat1': 17.14, 'bius': 17.38, 'menghentikannya': 17.80,
     'obat2': 19.22, 'diberikan': 19.62, 'sekitar': 20.14, 'area1': 20.48, 'saraf2': 21.00, 'kebas': 21.90,
     'sebagian': 22.80, 'molekul': 23.14, 'masuk2': 24.10, 'menembus': 24.34, 'membran': 24.64, 'menghambat': 25.90, 'kanal2': 26.30, 'natrium3': 26.54, 'sisi': 27.06, 'dalam': 27.26,
     'tanpa': 27.50, 'aliran': 28.64, 'natrium4': 28.88, 'cukup': 29.28, 'sinyal2': 30.04, 'nyeri3': 30.28, 'tidak': 30.46, 'merambat2': 31.06, 'melewati': 31.46, 'bagian': 31.86,
     'karena': 33.34, 'kerjanya': 33.88, 'terbatas': 34.22, 'area2': 34.96, 'tertentu': 35.18, 'orangnya': 36.06, 'sadar1': 37.00,
     'obat3': 38.10, 'diberikan2': 38.48, 'permukaan': 39.04, 'kulit2': 39.48, 'disuntik': 40.14, 'sekitar2': 40.72, 'tindakan': 41.18,
     'atau': 42.00, 'dipakai': 42.28, 'memblok': 43.10, 'saraf3': 43.52, 'melayani': 44.06, 'luas': 44.92,
     'terakhir': 45.92, 'regional': 47.12, 'bius2': 48.52, 'total': 48.94, 'berbeda': 49.12,
     'obat4': 50.04, 'bekerja': 50.38, 'sistem': 50.92, 'pusat': 51.48, 'sehingga': 51.88, 'pasien1': 52.32, 'tidak2': 52.62, 'sadar2': 52.82, 'prosedur': 53.36,
     'jadi': 53.86, 'perbedaannya': 54.54, 'jumlah': 55.60, 'obat5': 55.84, 'tetapi': 56.42, 'area3': 56.74, 'kerja': 57.10, 'keadaan': 57.98, 'sadar3': 58.46, 'pasien2': 58.72}
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
