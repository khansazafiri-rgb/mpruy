"""Membuat cues.json (jadwal bersama panggung + audio) dan takarir SRT/VTT.
Waktu kata = ASR faster-whisper atas narasi Google AI Studio asli (audio/asr.json). TEKS takarir = naskah pemesan
(ASR salah dengar "kebentur" -> "ke bentur", "pembuluh" -> "pembulu", "keunguan" -> "keungguan", "Saat tubuh" -> "Saatu buh").
Audio asli = 28,46 dtk, seluruhnya naskah edukasi; narator selesai 28,0 dtk. Edukasi = audio utuh + ekor penutup bersih sampai EDU_DUR.
Master outro (16,20 dtk) ditempel utuh sesudahnya.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CUT = 28.46; EDU_DUR = 30.00; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
W = {
 'baru': 0.00, 'bentur': 0.28, 'meja': 0.50, 'muncul': 1.16, 'memar': 1.46,
 'kenapa': 2.38, 'beberapa': 2.82, 'hari': 3.18, 'kemudian': 3.36, 'warnanya': 3.78, 'berubah': 4.46,
 'benturan': 5.90, 'bisa': 6.54, 'merusak': 6.76, 'pembuluh': 7.12, 'darah1': 7.38, 'kecil': 7.60, 'dibawah': 7.90, 'kulit1': 8.20,
 'darah2': 8.96, 'merembes': 9.36, 'kejaringan': 9.70, 'sementara': 10.58, 'permukaan': 11.00, 'kulit2': 11.42, 'tetap': 11.62, 'utuh': 11.86,
 'saat': 12.90, 'tubuh': 13.30, 'membersihkan': 13.44, 'darah3': 13.88, 'yang': 14.14, 'terperangkap': 14.26, 'hemoglobin': 15.16, 'didalamnya': 15.58, 'ikut': 16.12, 'diuraikan': 16.42,
 'karena': 17.50, 'proses': 17.76, 'itulah': 18.04, 'memar2': 18.70, 'bisa2': 19.02, 'berubah2': 19.26, 'dari': 19.66, 'kemerahan': 19.90, 'atau': 20.30, 'keunguan': 20.50,
 'menjadi': 21.34, 'kehijauan': 21.68, 'lalu': 22.60, 'kekuningan': 22.78, 'sebelum': 23.34, 'memudar': 23.62,
 'urutan': 24.70, 'warna': 25.10, 'dan': 25.52, 'waktu': 25.70, 'pulihnya': 25.96, 'tidak': 26.44, 'selalu': 26.86, 'sama': 27.14, 'pada': 27.36, 'setiap': 27.54, 'orang': 27.82,
}
CAP = [
 (0.00, 1.05, 'Baru kebentur meja,'), (1.10, 1.90, 'muncul memar.'), (2.34, 3.78, 'Kenapa beberapa hari kemudian'), (3.78, 5.05, 'warnanya berubah?'),
 (5.86, 7.10, 'Benturan bisa merusak'), (7.10, 8.60, 'pembuluh darah kecil di bawah kulit.'),
 (8.92, 10.52, 'Darah merembes ke jaringan,'), (10.54, 12.20, 'sementara permukaan kulit tetap utuh.'),
 (12.86, 14.22, 'Saat tubuh membersihkan'), (14.22, 15.12, 'darah yang terperangkap,'), (15.12, 16.38, 'hemoglobin di dalamnya'), (16.40, 17.20, 'ikut diuraikan.'),
 (17.46, 18.66, 'Karena proses itulah,'), (18.66, 19.86, 'memar bisa berubah dari'), (19.86, 21.20, 'kemerahan atau keunguan,'),
 (21.30, 22.56, 'menjadi kehijauan,'), (22.58, 24.12, 'lalu kekuningan sebelum memudar.'),
 (24.66, 26.40, 'Urutan warna dan waktu pulihnya'), (26.40, 28.25, 'tidak selalu sama pada setiap orang.'),
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
