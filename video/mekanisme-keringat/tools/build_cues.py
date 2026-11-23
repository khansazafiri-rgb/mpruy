"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 67,00 dtk).
Waktu kalimat/kata = ASR faster-whisper (audio/asr.json). TEKS takarir = naskah pemesan (ASR salah dengar "saraf"->"sarap", "asetilkolin", "hipohidrosis"->"hiperhidrosis", "heat"->"hit"; takarir memakai ejaan naskah).
Master outro (brand/video/outro/medcoel-outro-master.mp4, 16,2 dtk) ditempel UTUH sesudah edukasi; takarir outro sudah ada di dalam master.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_DUR = 67.00; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
SK = [
 ('s1', 0.00, 3.84, ['Kenapa saat kepanasan', 'tubuh kita tiba-tiba', 'mengeluarkan keringat?']),
 ('s2', 4.64, 9.18, ['Ketika suhu tubuh naik,', 'hipotalamus di otak membantu', 'mengatur respons pendinginan.']),
 ('s3', 9.54, 13.80, ['Ia mengirim sinyal melalui', 'saraf simpatis menuju', 'kelenjar keringat ekrin di kulit.']),
 ('s4', 14.28, 18.24, ['Menariknya, saraf ini', 'menggunakan zat pembawa pesan', 'bernama asetilkolin.']),
 ('s5', 19.04, 22.96, ['Di bagian kelenjar yang', 'berbentuk gulungan,', 'cairan keringat mulai dibuat.']),
 ('s6', 23.32, 27.36, ['Saat cairan melewati saluran', 'menuju permukaan kulit,', 'sebagian garamnya diserap kembali.']),
 ('s7', 27.36, 30.38, ['Sisanya keluar melalui pori', 'sebagai keringat.']),
 ('s8', 30.92, 33.76, ['Tapi kulit yang basah saja', 'belum tentu membuat kita dingin.']),
 ('s9', 34.14, 38.34, ['Pendinginan terjadi terutama', 'ketika keringat menguap', 'dan membawa panas dari kulit.']),
 ('s10', 38.60, 43.12, ['Itu sebabnya udara yang lembap', 'bisa membuat kita tetap gerah', 'meski sudah berkeringat banyak.']),
 ('s11', 43.86, 45.40, ['Sistem ini juga bisa terganggu.']),
 ('s12', 45.82, 48.34, ['Pada hiperhidrosis,', 'keringat keluar berlebihan,']),
 ('s13', 48.50, 51.30, ['bahkan ketika tubuh tidak', 'membutuhkan pendinginan sebanyak itu.']),
 ('s14', 51.30, 54.30, ['Sebaliknya, pada hipohidrosis', 'atau anhidrosis,']),
 ('s15', 55.08, 59.20, ['keringat terlalu sedikit', 'atau tidak keluar, sehingga tubuh', 'lebih sulit membuang panas.']),
 ('s16', 59.68, 63.66, ['Dan satu hal penting:', 'kondisi panas yang berbahaya', 'tidak selalu berarti kulit kering.']),
 ('s17', 63.98, 66.90, ['Seseorang yang masih berkeringat', 'pun bisa mengalami heat stroke.']),
]
W = {'kepanasan': 1.04, 'keringat': 3.40, 'suhuNaik': 5.04, 'naik': 5.50, 'hipotalamus': 6.16, 'otak': 6.94, 'respons': 8.04, 'pendinginan1': 8.44,
     'sinyal': 10.10, 'saraf': 10.94, 'simpatis': 11.18, 'menuju': 11.86, 'ekrin': 13.08, 'kulit1': 13.56, 'saraf2': 15.20, 'zat': 16.04, 'asetilkolin': 17.48,
     'gulungan': 20.30, 'cairan': 21.60, 'dibuat': 22.56, 'saluran': 24.28, 'permukaan': 25.00, 'garam': 26.42, 'diserap': 26.74, 'sisanya': 27.36, 'pori': 29.42, 'keringat2': 29.92,
     'basah': 31.78, 'dingin': 33.36, 'pendinginan2': 34.14, 'menguap': 36.40, 'panas': 37.44, 'lembap': 39.96, 'gerah': 41.44, 'berkeringat': 42.44,
     'terganggu': 44.92, 'hiper': 46.10, 'berlebihan': 47.70, 'bahkan': 48.50, 'sebaliknya': 51.30, 'hipo': 52.72, 'anhidrosis': 53.80, 'sedikit': 55.76, 'sulit': 58.18, 'membuang': 58.48,
     'penting': 60.22, 'berbahaya': 61.70, 'kering': 63.42, 'masihBerkeringat': 64.88, 'heat': 66.38}
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
