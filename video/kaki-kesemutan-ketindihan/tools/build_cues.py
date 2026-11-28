"""Membuat cues.json (jadwal bersama panggung + audio) dan takarir SRT/VTT.
Waktu kata = ASR faster-whisper atas narasi Google AI Studio asli (audio/asr.json). TEKS takarir = naskah pemesan
(ASR menulis "meredah" -> "mereda", "supaya darah" -> "suplai darah", "rasa" -> "terasa").
Audio asli = 47,74 dtk, seluruhnya naskah edukasi; narator selesai 47,4 dtk. Edukasi = audio utuh + ekor penutup bersih sampai EDU_DUR.
Master outro (16,20 dtk) ditempel utuh sesudahnya. Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CUT = 47.74; EDU_DUR = 49.20; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
W = {'duduk': 0.00, 'tertindih': 0.88, 'lama': 1.64, 'berdiri': 2.58, 'kebas1': 3.84, 'kesemutan1': 4.62, 'apa': 5.68,
     'normalnya': 7.12, 'saraf1': 8.14, 'sentuhan': 9.10, 'kaki1': 9.76, 'otak': 10.36,
     'saraf2': 11.20, 'suplai': 12.34, 'darah1': 12.66, 'bekerja': 13.70, 'baik': 14.24,
     'saat': 15.16, 'tertekan': 15.66, 'posisi1': 16.20, 'tubuh': 16.56,
     'saraf3': 17.22, 'aliran': 17.70, 'darah2': 17.94, 'terganggu': 19.50, 'sementara': 19.98,
     'pesan': 21.02, 'tidak': 21.82, 'terkirim': 22.18, 'biasa': 22.80,
     'itu': 23.78, 'sebabnya': 23.98, 'bagian': 24.70, 'kebas2': 26.00,
     'ketika': 27.02, 'diubah': 27.68, 'tekanan': 28.30, 'hilang': 28.62,
     'suplai2': 28.98, 'darah3': 29.68, 'fungsi': 30.42, 'saraf4': 30.72, 'mulai': 31.08, 'pulih': 31.48,
     'selama': 32.26, 'sinyal': 33.38, 'sensasi1': 33.72, 'tidakbiasa': 34.76, 'seperti': 35.78, 'ditusuk': 36.02, 'kesemutan2': 37.20,
     'biasanya': 38.20, 'mereda': 39.28, 'menit': 40.28,
     'namun': 41.14, 'kesemutan3': 41.66, 'menetap': 42.18, 'berulang': 43.10, 'posisi2': 44.68,
     'penyebabnya': 45.60, 'dinilai': 46.54, 'lanjut': 47.06}
CAP = [
 (0.00, 2.05, 'Duduk dengan kaki tertindih terlalu lama.'), (2.25, 3.30, 'Begitu berdiri,'), (3.32, 4.55, 'kaki terasa kebas'), (4.58, 5.50, 'lalu kesemutan.'), (5.64, 6.75, 'Apa yang terjadi?'),
 (7.10, 9.05, 'Normalnya, saraf membawa informasi'), (9.08, 10.85, 'sentuhan dari kaki menuju otak.'),
 (11.18, 12.62, 'Saraf juga membutuhkan suplai'), (12.64, 14.55, 'darah agar dapat bekerja dengan baik.'),
 (15.14, 16.98, 'Saat kaki tertekan oleh posisi tubuh,'),
 (17.20, 18.78, 'saraf dan aliran darah di sekitarnya'), (18.80, 20.50, 'dapat ikut terganggu sementara.'),
 (21.00, 22.55, 'Pesan dari kaki tidak terkirim'), (22.58, 23.30, 'seperti biasa.'),
 (23.76, 24.95, 'Itu sebabnya, bagian kaki'), (24.97, 26.45, 'bisa terasa kebas.'),
 (27.00, 28.10, 'Ketika posisi diubah'), (28.12, 28.95, 'dan tekanan hilang,'),
 (28.97, 30.70, 'suplai darah serta fungsi saraf'), (30.72, 31.90, 'mulai pulih.'),
 (32.24, 34.30, 'Selama proses itu, sinyal sensasi'), (34.32, 35.95, 'dapat terasa tidak biasa:'), (35.96, 37.75, 'seperti ditusuk-tusuk atau kesemutan.'),
 (38.18, 40.00, 'Biasanya sensasi ini mereda'), (40.02, 40.70, 'setelah beberapa menit.'),
 (41.12, 42.55, 'Namun, kesemutan yang menetap'), (42.58, 44.20, 'atau sering berulang tidak selalu'), (44.22, 45.42, 'disebabkan posisi duduk.'),
 (45.58, 47.50, 'Penyebabnya perlu dinilai lebih lanjut.'),
]
cues = {'dur': round(DUR, 2), 'edu_dur': EDU_DUR, 'outro_dur': OUTRO_DUR, 'cut': CUT, 'w': W, 'cap': [[a, b, t] for a, b, t in CAP]}
OUT = os.path.join(H, 'audio', 'asr-outro.json')
outro_lines = [(EDU_DUR + s['start'], EDU_DUR + s['end'], s['text']) for s in json.load(open(OUT))] if os.path.exists(OUT) else []
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
rows = [(a, b, t) for a, b, t in CAP] + outro_lines
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(rows, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in rows: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap edu', len(CAP), 'cap outro', len(outro_lines))
