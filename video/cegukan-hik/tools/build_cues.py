"""Membuat cues.json (jadwal bersama panggung + audio) dan takarir SRT/VTT.
Waktu kata = ASR faster-whisper atas narasi Google AI Studio asli (audio/asr.json) ditambah pengukuran puncak energi untuk dua kata "hik".
TEKS takarir = naskah pemesan (ASR salah dengar "diafragma" -> "dia Fragma", "penyebab" -> "penjabat").
Narasi asli memuat kalimat promosi lama setelah "penyebab yang jelas."; dipotong di jeda alami (sunyi 27,78-28,77 dtk) pada CUT.
Edukasi = narasi (sampai 27,8 dtk) + ekor penutup 2,2 dtk berisi ringkasan tiga ikon, total EDU_DUR. Master outro (16,20 dtk) ditempel utuh sesudahnya.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CUT = 28.20          # narasi dipotong di sini (jeda alami sesudah "penyebab yang jelas."), fade-out 80 ms
EDU_DUR = 30.00      # narasi + ekor ringkasan visual (musik berakhir bersih)
OUTRO_DUR = 16.20
DUR = EDU_DUR + OUTRO_DUR
# waktu kata penting (detik) dari ASR + energi audio
W = {
 'baru': 0.00, 'belajar': 0.60, 'eh': 1.76, 'cegukan1': 2.42, 'kenapa': 3.56, 'bunyinya': 4.00, 'bisa': 4.36, 'hik1': 5.13,
 'dibawah': 6.60, 'paru': 6.96, 'ada': 7.82, 'otot': 8.12, 'bernama': 8.44, 'diafragma': 8.96,
 'saat': 10.06, 'cegukan2': 10.40, 'otot2': 11.16, 'berkontraksi': 11.56, 'mendadak': 12.40, 'tanpa': 12.80, 'sengaja': 13.22,
 'sesaat': 14.36, 'kemudian': 14.84, 'pita': 15.72, 'suara': 15.90, 'menutup': 16.16, 'cepat': 16.74,
 'penutupan': 17.78, 'itulah': 18.26, 'menghasilkan': 18.78, 'bunyi': 19.20, 'hik2': 19.74,
 'makan': 21.08, 'cepat2': 21.64, 'atau': 21.98, 'perut': 22.22, 'penuh': 23.00, 'bisa2': 23.28, 'memicu': 23.82, 'cegukan3': 24.14,
 'tapi': 25.02, 'kadang': 25.32, 'cegukan4': 26.00, 'muncul': 26.20, 'tanpa2': 26.48, 'penyebab': 26.76, 'jelas': 27.16, 'jelas_end': 27.62,
}
CAP = [  # (mulai, selesai, teks)
 (0.00, 1.25, 'Baru mau fokus belajar,'), (1.70, 2.85, 'eh, cegukan.'),
 (3.50, 5.55, 'Kenapa bunyinya bisa ‘hik’?'),
 (6.55, 7.72, 'Di bawah paru-paru,'), (7.78, 9.50, 'ada otot bernama diafragma.'),
 (10.02, 10.85, 'Saat cegukan,'), (11.12, 12.90, 'otot ini berkontraksi mendadak'), (12.90, 13.75, 'tanpa kita sengaja.'),
 (14.32, 15.45, 'Sesaat kemudian,'), (15.68, 17.20, 'pita suara menutup dengan cepat.'),
 (17.74, 18.74, 'Penutupan itulah'), (18.74, 20.25, 'yang menghasilkan bunyi ‘hik’.'),
 (21.04, 22.12, 'Makan terlalu cepat'), (22.12, 23.30, 'atau perut yang terlalu penuh'), (23.30, 24.65, 'bisa memicu cegukan.'),
 (24.98, 25.90, 'Tapi kadang,'), (25.96, 26.80, 'cegukan muncul'), (26.80, 27.75, 'tanpa penyebab yang jelas.'),
]
cues = {'dur': round(DUR, 2), 'edu_dur': EDU_DUR, 'outro_dur': OUTRO_DUR, 'cut': CUT, 'w': W, 'cap': [[a, b, t] for a, b, t in CAP]}
# takarir outro: waktu kata dari ASR audio master (audio/asr-outro.json), digeser EDU_DUR
OUT = os.path.join(H, 'audio', 'asr-outro.json')
outro_lines = []
if os.path.exists(OUT):
    segs = json.load(open(OUT))
    outro_lines = [(EDU_DUR + s['start'], EDU_DUR + s['end'], s['text']) for s in segs]
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
rows = [(a, b, t) for a, b, t in CAP] + outro_lines
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(rows, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in rows: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap edu', len(CAP), 'cap outro', len(outro_lines))
