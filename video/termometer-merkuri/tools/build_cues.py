"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 72,28 dtk).
Waktu kalimat dan kata kunci = hasil ASR faster-whisper (audio/narasi-asr.json, waktu berkas = waktu video karena narasi mulai di detik 0).
TEKS takarir = kata-kata naskah yang diberikan (ASR salah dengar "air raksa" -> "airaksa" dan "di angka tadi" -> "diangkat tadi"; takarir memakai ejaan naskah).
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_END = 72.28                                  # akhir berkas narasi (kata terakhir "hasilnya." selesai ~72,1)
T_WEB = EDU_END + 0.45; T_OUTRO = T_WEB + 1.2    # web asli terlihat 1,2 dtk sebelum master suara outro mulai (sama dengan video SpO2)
OUTRO_LEN = 10.84; DUR = T_OUTRO + OUTRO_LEN + 3.1
SK = [  # (id, mulai, akhir, teks, potongan takarir)
 ('s1', 0.00, 2.18, 'Pernah lihat termometer air raksa?', ['Pernah lihat', 'termometer air raksa?']),
 ('s2', 2.58, 5.82, 'Setelah dilepas dari tubuh, garis peraknya tetap berhenti di angka tadi.', ['Setelah dilepas dari tubuh,', 'garis peraknya tetap', 'berhenti di angka tadi.']),
 ('s3', 6.12, 6.90, 'Kok bisa?', ['Kok bisa?']),
 ('s4', 7.40, 9.46, 'Pertama, air raksa itu sebenarnya merkuri.', ['Pertama, air raksa', 'itu sebenarnya merkuri.']),
 ('s5', 9.80, 11.24, 'Logam yang cair pada suhu ruang.', ['Logam yang cair', 'pada suhu ruang.']),
 ('s6', 11.84, 14.24, 'Di ujung termometer, ada wadah kecil berisi merkuri.', ['Di ujung termometer,', 'ada wadah kecil berisi merkuri.']),
 ('s7', 14.58, 16.66, 'Tersambung ke saluran kaca yang sangat sempit.', ['Tersambung ke saluran', 'kaca yang sangat sempit.']),
 ('s8', 17.26, 20.40, 'Ketika ujungnya menerima panas dari tubuh, merkuri memuai.', ['Ketika ujungnya menerima', 'panas dari tubuh,', 'merkuri memuai.']),
 ('s9', 20.90, 24.84, 'Volumennya bertambah dan mendorong garis perak naik di saluran sempit itu.', ['Volumennya bertambah dan', 'mendorong garis perak naik', 'di saluran sempit itu.']),
 ('s10', 25.30, 27.70, 'Semakin tinggi suhu, semakin jauh garisnya bergerak.', ['Semakin tinggi suhu,', 'semakin jauh garisnya bergerak.']),
 ('s11', 28.42, 31.96, 'Angka pada kaca menunjukkan suhu berdasarkan posisi ujung garis tersebut.', ['Angka pada kaca menunjukkan suhu', 'berdasarkan posisi', 'ujung garis tersebut.']),
 ('s12', 32.86, 34.72, 'Tapi ada satu bagian kecil yang penting.', ['Tapi ada satu bagian', 'kecil yang penting.']),
 ('s13', 35.18, 37.64, 'Penyempitan saluran tepat di atas wadah merkuri.', ['Penyempitan saluran', 'tepat di atas wadah merkuri.']),
 ('s14', 38.20, 43.48, 'Saat termometer dilepas dan mulai dingin, bagian ini menahan kolom merkuri agar tidak langsung turun.', ['Saat termometer dilepas', 'dan mulai dingin,', 'bagian ini menahan kolom merkuri', 'agar tidak langsung turun.']),
 ('s15', 43.98, 46.68, 'Jadi kita masih bisa membaca suhu tertinggi yang tercapai.', ['Jadi kita masih bisa membaca', 'suhu tertinggi yang tercapai.']),
 ('s16', 47.20, 51.50, 'Itulah alasan termometer jenis ini perlu diatur ulang sebelum pengukuran berikutnya.', ['Itulah alasan termometer jenis ini', 'perlu diatur ulang', 'sebelum pengukuran berikutnya.']),
 ('s17', 52.40, 55.02, 'Lalu kenapa sekarang lebih sering terlihat termometer digital?', ['Lalu kenapa sekarang lebih sering', 'terlihat termometer digital?']),
 ('s18', 55.92, 60.26, 'Kalau kaca termometer merkuri pecah, merkurinya bisa tersebar dan uapnya berbahaya.', ['Kalau kaca termometer merkuri pecah,', 'merkurinya bisa tersebar', 'dan uapnya berbahaya.']),
 ('s19', 60.72, 64.54, 'Karena itu, banyak layanan kesehatan beralih ke alat tanpa merkuri.', ['Karena itu, banyak layanan kesehatan', 'beralih ke alat tanpa merkuri.']),
 ('s20', 65.20, 72.10, 'Jadi garis perak yang tampak sederhana itu bekerja karena pemuayan, saluran sempit, dan penyempitan kecil yang menahan hasilnya.', ['Jadi garis perak yang tampak sederhana itu', 'bekerja karena pemuayan,', 'saluran sempit,', 'dan penyempitan kecil yang menahan hasilnya.']),
]
# kata kunci (ASR, detik video) untuk menyinkronkan gambar
W = {'airRaksa': 8.18, 'merkuri': 9.08, 'logam': 9.80, 'cair': 10.28, 'ruang': 10.96, 'wadah': 13.00, 'merkuri2': 13.76, 'saluran': 15.32, 'sempit': 16.34,
     'panas': 18.48, 'tubuh': 18.94, 'memuai': 19.92, 'bertambah': 21.40, 'mendorong': 22.32, 'garis': 22.94, 'naik': 23.52, 'semakin': 25.30, 'jauh': 26.78, 'angka': 28.42, 'ujung': 31.04,
     'penting': 34.30, 'penyempitan': 35.18, 'saluran2': 35.70, 'wadah2': 37.04, 'dilepas': 38.88, 'dingin': 39.94, 'menahan': 41.18, 'kolom': 41.58, 'tidak': 42.70, 'turun': 43.14,
     'tertinggi': 45.64, 'diatur': 49.38, 'ulang': 49.80, 'digital': 54.62, 'pecah': 57.40, 'tersebar': 58.66, 'uapnya': 59.44, 'tanpa': 63.94, 'merkuri3': 64.12,
     'pemuayan': 68.06, 'saluran3': 69.10, 'penyempitan2': 70.34, 'menahan2': 71.32, 'hasilnya': 71.64}
# suhu kolom di tabung (derajat C) terhadap waktu video: kunci interpolasi monoton (pchip) yang DIPAKAI SAMA oleh stage (stage/scenes.js) dan audio (audio/audio_mix.py)
COL_KEYS = [[17.26, 34.5], [18.50, 34.5], [19.60, 34.7], [21.40, 35.7], [23.40, 37.0], [24.80, 37.5]]
T_SEP = 40.35            # kolom terputus di penyempitan saat dingin; ujung atas TIDAK bergerak
OUT = [('o1', 1.2, 4.56, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.', ['Masih penasaran?', 'Lanjutkan belajarnya di MEDCOEL.']), ('o2', 5.06, 8.98, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.', ['Jelajahi materi per bab,', 'latihan soal, dan simulasi dokter.']), ('o3', 9.54, 11.7, 'Semuanya gratis di medcoel.com.', ['Semuanya gratis di medcoel.com.'])]
def chunks(t0, t1, parts):
    n = sum(len(p) for p in parts); out = []; c = 0
    for p in parts:                                   # waktu potongan sebanding jumlah huruf di dalam rentang kalimat
        a = t0 + (t1 - t0) * c / n; c += len(p); b = t0 + (t1 - t0) * c / n; out.append([round(a, 2), round(b + (0.10 if p is parts[-1] else 0), 2), p])
    return out
cap = []
for sid, a, b, txt, parts in SK: cap += chunks(a, b, parts)
for sid, a, b, txt, parts in OUT: cap += [[round(T_WEB + x, 2), round(T_WEB + y, 2), t] for x, y, t in chunks(a, b, parts)]
cues = {'dur': round(DUR, 2), 'edu_end': EDU_END, 't_web': round(T_WEB, 2), 't_outro': round(T_OUTRO, 2), 'outro_len': OUTRO_LEN,
        'sent': {sid: [a, b] for sid, a, b, *_ in SK}, 'sent_text': {sid: txt for sid, a, b, txt, _ in SK}, 'w': W, 'colKeys': COL_KEYS, 't_sep': T_SEP, 'cap': cap}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap', len(cap), 't_web', cues['t_web'], 't_outro', cues['t_outro'])
