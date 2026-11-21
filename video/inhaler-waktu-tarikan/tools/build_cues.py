"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 52,20 dtk).
Waktu kalimat/kata = ASR faster-whisper (audio/asr.json). TEKS takarir = naskah pemesan (ASR salah dengar "beta2", "selurna napas", "mengandur"; takarir memakai ejaan naskah).
Master outro (brand/video/outro/medcoel-outro-master.mp4, 16,2 dtk) ditempel UTUH sesudah edukasi; takarir outro sudah ada di dalam master, jadi tidak dibuat di sini.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_DUR = 52.20; OUTRO_DUR = 16.20; DUR = EDU_DUR + OUTRO_DUR
SK = [
 ('s1', 0.00, 4.20, 'Pernah lihat inhaler disemprot, tapi obatnya malah tidak banyak sampai ke paru?', ['Pernah lihat inhaler disemprot,', 'tapi obatnya malah tidak', 'banyak sampai ke paru?']),
 ('s2', 4.72, 5.92, 'Kuncinya ada pada waktu.', ['Kuncinya ada pada waktu.']),
 ('s3', 6.76, 11.10, 'Pada inhaler dosis terukur, menekan tabung melepaskan satu semprotan obat.', ['Pada inhaler dosis terukur,', 'menekan tabung melepaskan', 'satu semprotan obat.']),
 ('s4', 11.58, 16.38, 'Kalau ditekan terlalu awal, sebelum mulai menarik napas, lebih banyak obat bisa tertinggal di mulut.', ['Kalau ditekan terlalu awal,', 'sebelum mulai menarik napas,', 'lebih banyak obat bisa', 'tertinggal di mulut.']),
 ('s5', 17.04, 21.44, 'Sekarang lihat saat semprotan dilepas bersamaan dengan awal tarikan napas yang perlahan.', ['Sekarang lihat saat semprotan', 'dilepas bersamaan dengan', 'awal tarikan napas yang perlahan.']),
 ('s6', 22.02, 26.68, 'Partikel obat ikut aliran udara, melewati mulut, lalu masuk ke saluran napas.', ['Partikel obat ikut aliran udara,', 'melewati mulut,', 'lalu masuk ke saluran napas.']),
 ('s7', 26.68, 31.14, 'Untuk contoh ini, obat di dalam inhalernya adalah salbutamol.', ['Untuk contoh ini,', 'obat di dalam inhalernya', 'adalah salbutamol.']),
 ('s8', 31.58, 35.60, 'Obat ini bekerja pada reseptor beta dua di otot dinding saluran napas.', ['Obat ini bekerja pada', 'reseptor beta dua di otot', 'dinding saluran napas.']),
 ('s9', 36.10, 40.44, 'Ototnya mengendur, saluran napas melebar, dan udara lebih mudah lewat.', ['Ototnya mengendur,', 'saluran napas melebar,', 'dan udara lebih mudah lewat.']),
 ('s10', 41.08, 43.20, 'Jadi bukan cuma soal menekan inhaler.', ['Jadi bukan cuma soal', 'menekan inhaler.']),
 ('s11', 43.72, 46.04, 'Waktu semprotan dan tarikan napas perlu cocok.', ['Waktu semprotan dan', 'tarikan napas perlu cocok.']),
 ('s12', 46.48, 48.60, 'Inhaler punya jenis dan isi obat yang berbeda.', ['Inhaler punya jenis', 'dan isi obat yang berbeda.']),
 ('s13', 48.98, 51.94, 'Ikuti cara pakai pada alat dan petunjuk tenaga kesehatan.', ['Ikuti cara pakai pada alat', 'dan petunjuk tenaga kesehatan.']),
]
W = {'dosisTerukur': 7.56, 'menekan': 8.68, 'tabung': 9.04, 'melepaskan': 9.38, 'satu': 10.08, 'semprotan': 10.40, 'terlaluAwal': 12.24, 'sebelum': 13.24, 'mulai': 13.54, 'napas': 13.94, 'tertinggal': 15.58, 'mulut': 16.02,
     'sekarang': 17.04, 'semprotanDilepas': 18.02, 'bersamaan': 18.88, 'awal': 19.72, 'perlahan': 21.00, 'partikel': 22.02, 'aliran': 23.42, 'melewatiMulut': 24.16, 'masuk': 25.60, 'saluran': 26.00,
     'contoh': 27.90, 'salbutamol': 30.26, 'bekerja': 32.14, 'reseptor': 32.80, 'betaDua': 33.16, 'otot': 34.32, 'dinding': 34.54, 'ototnya': 36.10, 'mengendur': 36.62, 'melebar': 38.18, 'udara': 39.16, 'lewat': 40.14,
     'bukan': 41.36, 'waktu': 43.72, 'cocok': 45.64, 'jenis': 47.24, 'ikuti': 48.98, 'petunjuk': 50.66}
def chunks(t0, t1, parts):
    n = sum(len(p) for p in parts); out = []; c = 0
    for p in parts:
        a = t0 + (t1 - t0) * c / n; c += len(p); b = t0 + (t1 - t0) * c / n; out.append([round(a, 2), round(b + (0.10 if p is parts[-1] else 0), 2), p])
    return out
cap = []
for sid, a, b, txt, parts in SK: cap += chunks(a, b, parts)
cues = {'dur': round(DUR, 2), 'edu_dur': EDU_DUR, 'outro_dur': OUTRO_DUR, 'sent': {sid: [a, b] for sid, a, b, *_ in SK}, 'w': W, 'cap': cap}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap', len(cap))
