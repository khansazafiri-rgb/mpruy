"""Membuat cues.json (jadwal bersama panggung + audio) dan takarir SRT/VTT.
Waktu kata = ASR faster-whisper atas narasi Google AI Studio asli (audio/asr.json). TEKS takarir = naskah pemesan
(ASR salah dengar "Dokter" -> "Doktor", "sumsum" -> "sum-sum", "refleks" -> "reflex", "memeriksanya" -> "memberiksaannya").
Audio asli = 27,85 dtk, seluruhnya naskah edukasi (tanpa paragraf promosi); narator selesai 27,4 dtk lalu senyap. Edukasi = audio utuh + ekor penutup bersih
sampai EDU_DUR. Master outro (16,20 dtk) ditempel utuh sesudahnya.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CUT = 27.85; EDU_DUR = 29.40; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
W = {
 'doktor': 0.00, 'mengetuk': 0.42, 'tepat': 0.84, 'bawah': 1.44, 'tempurung': 1.68, 'lutut': 2.02, 'kok': 2.68, 'kaki': 3.02, 'langsung': 3.32, 'bergerak': 3.52,
 'ketukan': 4.54, 'itu': 5.18, 'meregangkan': 5.50, 'otot1': 6.10, 'pahadepan1': 6.32, 'sesaat': 6.76,
 'sensor': 7.40, 'regang': 8.04, 'diotot': 8.36, 'otot2': 8.52, 'mengirim': 8.78, 'sinyal1': 9.08, 'lewat': 9.46, 'saraf': 9.68, 'menuju': 10.08, 'sumsum': 10.38, 'tulang': 10.80, 'belakang': 11.04,
 'dari': 11.96, 'sana': 12.14, 'sinyal2': 12.78, 'dikirim': 13.04, 'kembali': 13.26, 'ke': 13.64, 'otot3': 13.76, 'pahadepan2': 13.92,
 'otot4': 15.06, 'berkontraksi': 15.36, 'lalu': 16.46, 'tungkai': 16.64, 'bawah2': 16.90, 'terangkat': 17.10, 'terangkat_end': 17.46,
 'inilah': 18.26, 'refleks1': 18.58, 'lutut2': 18.84,
 'gerakannya': 19.78, 'cepat': 20.24, 'karena': 20.68, 'memakai': 21.00, 'jalur1': 21.40, 'refleks2': 21.68, 'melalui': 22.02, 'sumsum2': 22.42, 'tulang2': 22.76, 'belakang2': 23.00,
 'doktor2': 23.94, 'memeriksa': 24.34, 'untuk': 24.96, 'membantu': 25.24, 'menilai': 25.74, 'kerja': 26.08, 'jalur2': 26.38, 'saraf2': 26.64, 'dan': 26.96, 'otot5': 27.10, 'otot5_end': 27.40,
}
CAP = [
 (0.00, 1.64, 'Dokter mengetuk tepat di bawah'), (1.66, 2.50, 'tempurung lutut,'), (2.64, 4.10, 'kok kaki langsung bergerak?'),
 (4.50, 6.05, 'Ketukan itu meregangkan'), (6.08, 7.28, 'otot paha depan sesaat.'),
 (7.36, 8.72, 'Sensor regang di otot'), (8.74, 10.05, 'mengirim sinyal lewat saraf'), (10.06, 11.50, 'menuju sumsum tulang belakang.'),
 (11.92, 12.75, 'Dari sana,'), (12.76, 13.72, 'sinyal dikirim kembali'), (13.72, 14.55, 'ke otot paha depan.'),
 (15.02, 16.42, 'Otot berkontraksi,'), (16.44, 17.62, 'lalu tungkai bawah terangkat.'),
 (18.22, 19.42, 'Inilah refleks lutut.'),
 (19.74, 21.36, 'Gerakannya cepat karena memakai'), (21.38, 22.40, 'jalur refleks melalui'), (22.42, 23.55, 'sumsum tulang belakang.'),
 (23.90, 25.22, 'Dokter memeriksanya untuk'), (25.24, 26.36, 'membantu menilai kerja'), (26.38, 27.65, 'jalur saraf dan otot.'),
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
