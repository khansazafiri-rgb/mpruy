"""Membuat cues.json (jadwal bersama panggung + audio) dan takarir SRT/VTT.
Waktu kata = ASR faster-whisper atas narasi Google AI Studio asli (audio/asr.json). TEKS takarir = naskah pemesan
(ASR salah dengar "memengkokkan" -> "membengkokkan", "kautak" -> "ke otak", "Bagi itu kamu" -> "Begitu kamu", "meredah" -> "mereda", "putaranya" -> "putarannya").
Audio asli = 50,21 dtk, seluruhnya naskah edukasi; narator selesai 50,0 dtk. Edukasi = audio utuh + ekor penutup bersih sampai EDU_DUR.
Master outro (16,20 dtk) ditempel utuh sesudahnya.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CUT = 50.21; EDU_DUR = 51.60; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
W = {
 'kamu': 0.00, 'berputar1': 0.40, 'beberapa': 1.04, 'kali': 1.36, 'lalu': 1.94, 'berhenti1': 2.44, 'tetapi': 3.40, 'rasanya': 3.74, 'ruangan': 4.10, 'masih1': 4.54, 'berputar2': 4.80, 'kenapa': 5.56,
 'ditelinga': 6.84, 'dalam': 7.42, 'ada': 8.20, 'saluran': 8.34, 'setengah': 8.66, 'lingkaran': 9.04, 'berisi': 9.46, 'cairan1': 9.80,
 'saat': 10.70, 'kepala1': 11.02, 'mulai': 11.30, 'berputar3': 11.50, 'salurannya': 12.50, 'ikut': 12.86, 'bergerak1': 13.00, 'sementara': 13.78, 'cairannya': 14.12, 'sempat': 14.74, 'tertinggal': 15.12, 'karena': 15.62, 'inersia': 15.86,
 'gerakan': 17.14, 'relatif': 17.52, 'ini': 17.94, 'membengkokkan': 18.18, 'struktur': 18.86, 'sensorik': 19.16, 'dan': 19.78, 'sel': 20.00, 'rambut': 20.20, 'didalamnya': 20.62,
 'saraf': 21.50, 'lalu2': 22.08, 'mengirim': 22.34, 'pesan': 22.58, 'keotak': 22.86, 'bahwa': 23.26, 'kepala2': 23.62, 'sedang': 24.10, 'berputar4': 24.50,
 'kalau': 24.90, 'putaran': 25.90, 'berlangsung': 26.24, 'terus': 26.66, 'sinyal1': 27.42, 'putarannya': 27.70, 'pun': 28.12, 'bisa': 28.34, 'melemah': 28.72, 'meskipun': 29.46, 'tubuh': 29.96, 'masih2': 30.22, 'berputar5': 30.36,
 'begitu': 31.44, 'kamu2': 31.88, 'mendadak': 32.04, 'berhenti2': 32.40, 'salurannya2': 33.30, 'ikut2': 33.78, 'berhenti3': 33.94,
 'cairan2': 34.94, 'didalamnya2': 35.38, 'masih3': 35.82, 'bergerak2': 36.16, 'sesaat': 36.56, 'membengkokkan2': 37.44, 'sensor': 37.96, 'kearah': 38.26, 'sebaliknya': 38.84,
 'otak': 39.94, 'menerima': 40.32, 'sinyal2': 40.74, 'seolah': 41.16, 'kepala3': 41.46, 'masih4': 41.74, 'berputar6': 41.92, 'bahkan': 42.80, 'bisa2': 43.36, 'terasa': 43.64, 'berlawanan': 44.32,
 'setelah': 45.40, 'cairannya2': 45.86, 'tenang': 46.20, 'sinyalnya': 46.92, 'kembali': 47.34, 'seimbang': 47.60, 'sensasi': 48.40, 'berputar7': 48.70, 'mereda': 49.34,
}
CAP = [
 (0.00, 1.90, 'Kamu berputar beberapa kali,'), (1.92, 3.30, 'lalu berhenti,'), (3.36, 5.50, 'tetapi rasanya ruangan masih berputar.'), (5.52, 6.40, 'Kenapa?'),
 (6.82, 8.15, 'Di telinga dalam,'), (8.18, 9.78, 'ada saluran setengah lingkaran'), (9.80, 10.62, 'berisi cairan.'),
 (10.68, 12.42, 'Saat kepala mulai berputar,'), (12.46, 13.72, 'salurannya ikut bergerak,'), (13.76, 15.58, 'sementara cairannya sempat tertinggal'), (15.60, 16.55, 'karena inersia.'),
 (17.10, 18.78, 'Gerakan relatif ini membengkokkan'), (18.80, 19.96, 'struktur sensorik'), (19.98, 21.08, 'dan sel rambut di dalamnya.'),
 (21.46, 23.20, 'Saraf lalu mengirim pesan'), (23.22, 24.95, 'ke otak bahwa kepala sedang berputar.'),
 (24.86, 26.88, 'Kalau putaran berlangsung terus,'), (26.90, 28.92, 'sinyal putarannya pun bisa melemah,'), (28.95, 30.92, 'meskipun tubuh masih berputar.'),
 (31.40, 32.92, 'Begitu kamu mendadak berhenti,'), (32.95, 34.35, 'salurannya ikut berhenti.'),
 (34.90, 36.12, 'Cairan di dalamnya'), (36.14, 37.34, 'masih bergerak sesaat'), (37.36, 38.30, 'dan membengkokkan sensor'), (38.32, 39.32, 'ke arah sebaliknya.'),
 (39.90, 41.40, 'Otak menerima sinyal seolah'), (41.42, 42.76, 'kepala masih berputar,'), (42.78, 44.72, 'bahkan bisa terasa ke arah berlawanan.'),
 (45.36, 46.90, 'Setelah cairannya tenang'), (46.92, 48.36, 'dan sinyalnya kembali seimbang,'), (48.38, 50.25, 'sensasi berputar itu mereda.'),
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
