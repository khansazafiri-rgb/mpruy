"""Membuat cues.json (jadwal bersama panggung + audio) dan takarir SRT/VTT.
Waktu kata = ASR faster-whisper atas narasi Google AI Studio asli (audio/asr.json). TEKS takarir = naskah pemesan
(ASR salah dengar "pisau" -> "bisa", "sel-selnya" -> "cel-celnya", "kimia" -> "skimi").
Audio asli (33,95 dtk) memuat paragraf promosi lama sesudah "respons perlindungan tubuh." (mulai 23,62 dtk); dipotong di jeda alami (sunyi 23,05-23,96) pada CUT.
Edukasi = narasi (sampai 23,1 dtk) + ekor ringkasan 2,3 dtk, total EDU_DUR. Master outro (16,20 dtk) ditempel utuh sesudahnya.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CUT = 23.50; EDU_DUR = 25.40; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
W = {
 'baru': 0.00, 'potong': 0.54, 'bawang1': 0.84, 'mata1': 1.60, 'berair': 1.94, 'apa': 3.08, 'terjadi': 3.76,
 'saat': 5.16, 'pisau': 5.46, 'memotong': 5.60, 'bawang2': 6.00, 'sel': 6.64, 'pecah': 6.98,
 'proses': 7.86, 'kimia': 8.14, 'didalamnya': 8.54, 'menghasilkan': 9.14, 'senyawa1': 9.80, 'iritan1': 10.14, 'yang': 10.50, 'mudah': 10.68, 'menguap': 10.94,
 'senyawa2': 11.88, 'itu': 12.24, 'mencapai': 12.54, 'permukaan': 13.12, 'mata2': 13.56,
 'kelenjar': 14.66, 'air': 14.96, 'mata3': 15.12, 'kemudian': 15.46, 'menghasilkan2': 15.98, 'lebih': 16.52, 'banyak': 16.68, 'air2': 16.92, 'mata4': 17.10,
 'untuk': 17.46, 'membantu': 18.00, 'membilas': 18.42, 'iritan2': 18.86, 'tersebut': 19.26,
 'jadi': 20.30, 'mata5': 20.60, 'berair2': 21.00, 'ini': 21.32, 'adalah': 21.52, 'respons': 21.78, 'perlindungan': 22.14, 'tubuh': 22.74, 'tubuh_end': 23.10,
}
CAP = [
 (0.00, 1.40, 'Baru beberapa potong bawang,'), (1.50, 2.60, 'mata sudah berair.'), (3.05, 4.30, 'Apa yang sebenarnya terjadi?'),
 (5.12, 6.58, 'Saat pisau memotong bawang,'), (6.60, 7.78, 'sel-selnya pecah.'),
 (7.84, 9.08, 'Proses kimia di dalamnya'), (9.10, 10.46, 'menghasilkan senyawa iritan'), (10.48, 11.50, 'yang mudah menguap.'),
 (11.84, 13.06, 'Senyawa itu mencapai'), (13.08, 13.95, 'permukaan mata.'),
 (14.60, 15.44, 'Kelenjar air mata'), (15.46, 16.60, 'kemudian menghasilkan'), (16.62, 17.62, 'lebih banyak air mata'),
 (17.44, 18.90, 'untuk membantu membilas'), (18.84, 19.90, 'iritan tersebut.'),
 (20.26, 21.74, 'Jadi, mata berair ini adalah'), (21.74, 23.25, 'respons perlindungan tubuh.'),
]
cues = {'dur': round(DUR, 2), 'edu_dur': EDU_DUR, 'outro_dur': OUTRO_DUR, 'cut': CUT, 'w': W, 'cap': [[a, b, t] for a, b, t in CAP]}
OUT = os.path.join(H, 'audio', 'asr-outro.json')
outro_lines = []
if os.path.exists(OUT):
    outro_lines = [(EDU_DUR + s['start'], EDU_DUR + s['end'], s['text']) for s in json.load(open(OUT))]
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
rows = [(a, b, t) for a, b, t in CAP] + outro_lines
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(rows, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in rows: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap edu', len(CAP), 'cap outro', len(outro_lines))
