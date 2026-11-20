"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT).
Audio: audio/narasi-edukasi.wav (Google AI Studio, 24 kHz mono, 44,92 dtk) dan audio/narasi-outro.wav (audio outro BARU dari Google AI Studio, 10,36 dtk).
Waktu kalimat/kata = ASR faster-whisper (audio/asr.json); TEKS takarir = naskah pemesan (ASR mengeja "MedCoal", "glombang", "memulikan" dst.; takarir memakai ejaan naskah: MEDCOEL, gelombang, memulihkan).
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_END = 44.92                                  # akhir berkas narasi edukasi
O0 = EDU_END + 0.5                               # rekaman web asli outro terlihat (jeda transisi 0,5 dtk setelah kalimat terakhir)
MASTER_AT = O0 + 1.0                             # suara outro baru mulai 1,0 dtk setelah web terlihat
OUTRO_LEN = 10.36; DUR = MASTER_AT + OUTRO_LEN + 3.0
SK = [  # (id, mulai, akhir, teks, potongan takarir)
 ('s1', 0.00, 4.08, 'Kok stiker yang ditempel di kulit bisa menghasilkan garis seperti ini?', ['Kok stiker yang ditempel', 'di kulit bisa menghasilkan', 'garis seperti ini?']),
 ('s2', 4.72, 6.90, 'Stiker itu adalah elektroda.', ['Stiker itu adalah elektroda.']),
 ('s3', 7.48, 8.80, 'Mereka tidak menyetrum tubuh.', ['Mereka tidak menyetrum tubuh.']),
 ('s4', 9.08, 12.88, 'Mereka menangkap perubahan listrik yang muncul saat jantung bekerja.', ['Mereka menangkap perubahan listrik', 'yang muncul saat jantung bekerja.']),
 ('s5', 13.52, 14.72, 'Lihat dari dalam.', ['Lihat dari dalam.']),
 ('s6', 14.96, 18.32, 'Sinyal dimulai di nodus sinus, lalu menyebar ke serambi.', ['Sinyal dimulai di nodus sinus,', 'lalu menyebar ke serambi.']),
 ('s7', 18.90, 20.90, 'Di layar, muncul gelombang P.', ['Di layar, muncul gelombang P.']),
 ('s8', 21.00, 24.46, 'Sinyal sempat melewati nodus AV, lalu menyebar cepat ke bilik.', ['Sinyal sempat melewati nodus AV,', 'lalu menyebar cepat ke bilik.']),
 ('s9', 24.80, 26.60, 'Muncullah kompleks QRS.', ['Muncullah kompleks QRS.']),
 ('s10', 27.20, 28.85, 'Sesudahnya, bilik berkontraksi.', ['Sesudahnya, bilik berkontraksi.']),
 ('s11', 28.90, 32.74, 'Ketika bilik memulihkan keadaan listriknya, muncul gelombang T.', ['Ketika bilik memulihkan', 'keadaan listriknya,', 'muncul gelombang T.']),
 ('s12', 33.44, 38.62, 'Jadi garis EKG bukan gambar jantung yang bergerak. Itu jejak aktivitas listriknya.', ['Jadi garis EKG bukan gambar', 'jantung yang bergerak.', 'Itu jejak aktivitas listriknya.']),
 ('s13', 39.18, 44.80, 'Dari sini, tenaga kesehatan bisa menilai laju dan irama jantung, lalu membacanya bersama kondisi pasien.', ['Dari sini, tenaga kesehatan', 'bisa menilai laju dan irama jantung,', 'lalu membacanya bersama', 'kondisi pasien.']),
]
W = {'elektroda': 6.34, 'menyetrum': 8.00, 'perubahan': 9.98, 'listrik': 10.42, 'jantung': 11.98, 'lihat': 13.52, 'sinus': 16.02, 'serambi': 17.82, 'muncul': 19.46, 'P': 20.28,
     'nodusAV': 22.08, 'bilik': 24.12, 'QRS': 25.88, 'berkontraksi': 28.32, 'memulihkan': 30.32, 'T': 32.58, 'EKG': 34.68, 'bergerak': 36.14, 'jejak': 37.30, 'laju': 41.28, 'irama': 41.76, 'kondisi': 43.48}
# outro baru: kata kunci (waktu berkas audio outro, ASR); waktu video = MASTER_AT + a
OW = {'atlas': 1.56, 'live4d': 2.58, 'materi': 5.14, 'latihan': 5.86, 'simulasi': 6.92, 'gratis': 8.14, 'medcoel': 9.06}
OUT = [('o1', 0.00, 3.70, 'Di MEDCOEL, jelajahi Atlas 3D dan Live 4D Lab.', ['Di MEDCOEL, jelajahi', 'Atlas 3D dan Live 4D Lab.']), ('o2', 4.10, 7.72, 'Lanjut belajar lewat materi, latihan soal, dan Simulasi Dokter.', ['Lanjut belajar lewat materi,', 'latihan soal, dan Simulasi Dokter.']), ('o3', 8.14, 9.98, 'Gratis di medcoel.com.', ['Gratis di medcoel.com.'])]
def chunks(t0, t1, parts):
    n = sum(len(p) for p in parts); out = []; c = 0
    for p in parts:
        a = t0 + (t1 - t0) * c / n; c += len(p); b = t0 + (t1 - t0) * c / n; out.append([round(a, 2), round(b + (0.10 if p is parts[-1] else 0), 2), p])
    return out
cap = []
for sid, a, b, txt, parts in SK: cap += chunks(a, b, parts)
for sid, a, b, txt, parts in OUT: cap += [[round(MASTER_AT + x, 2), round(MASTER_AT + y, 2), t] for x, y, t in chunks(a, b, parts)]
cues = {'dur': round(DUR, 2), 'edu_end': EDU_END, 't_web': round(O0, 2), 't_master': round(MASTER_AT, 2), 'outro_len': OUTRO_LEN,
        'sent': {sid: [a, b] for sid, a, b, *_ in SK}, 'w': W, 'ow': OW, 'cap': cap}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap', len(cap), 'O0', cues['t_web'], 'master', cues['t_master'])
