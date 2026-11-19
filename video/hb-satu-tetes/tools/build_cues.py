"""Membuat cues.json (jadwal bersama stage + audio) dan takarir (SRT/VTT) dari narasi Google AI Studio (audio/narasi-edukasi.wav, 85,52 dtk).
Waktu kalimat dan kata kunci = hasil ASR faster-whisper (audio/narasi-asr.json, waktu berkas = waktu video karena narasi mulai di detik 0).
TEKS takarir = kata-kata naskah yang diberikan (ASR salah dengar mis. "tetes"->"tes", "sel"->"sial", "memecah"->"memecak", "diukur"->"yukur", "dua"->"2"; takarir memakai ejaan naskah).
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_END = 85.52                                  # akhir berkas narasi ("...yang tersedia." selesai ~85,3); tidak ada kalimat promo di berkas
T_WEB = EDU_END + 0.45; T_OUTRO = T_WEB + 1.2    # web asli terlihat 1,2 dtk sebelum master suara outro mulai (sama dengan video SpO2)
OUTRO_LEN = 10.84; DUR = T_OUTRO + OUTRO_LEN + 3.1
SK = [  # (id, mulai, akhir, teks, potongan takarir)
 ('s1', 0.00, 3.32, 'SpO₂ bisa terlihat normal, tapi Hb ternyata rendah.', ['SpO₂ bisa terlihat normal,', 'tapi Hb ternyata rendah.']),
 ('s2', 3.72, 4.30, 'Kok bisa?', ['Kok bisa?']),
 ('s3', 4.86, 6.88, 'Dua angka ini mengukur hal yang berbeda.', ['Dua angka ini mengukur', 'hal yang berbeda.']),
 ('s4', 7.44, 11.52, 'SpO₂ memperkirakan persentase hemoglobin yang sedang membawa oksigen.', ['SpO₂ memperkirakan persentase', 'hemoglobin yang sedang', 'membawa oksigen.']),
 ('s5', 12.28, 15.18, 'Tes Hb mengukur banyaknya hemoglobin di dalam darah.', ['Tes Hb mengukur banyaknya', 'hemoglobin di dalam darah.']),
 ('s6', 15.92, 19.60, 'Hemoglobin adalah protein dalam sel darah merah yang membawa oksigen ke jaringan.', ['Hemoglobin adalah protein', 'dalam sel darah merah', 'yang membawa oksigen ke jaringan.']),
 ('s7', 20.38, 26.26, 'Pada tes Hb cepat tertentu, satu tetes darah dari ujung jari masuk ke wadah kecil bernama mikrokuvet.', ['Pada tes Hb cepat tertentu,', 'satu tetes darah dari ujung jari', 'masuk ke wadah kecil', 'bernama mikrokuvet.']),
 ('s8', 26.26, 30.46, 'Salurannya sangat sempit, sehingga darah tertarik masuk oleh gaya kapiler.', ['Salurannya sangat sempit,', 'sehingga darah tertarik masuk', 'oleh gaya kapiler.']),
 ('s9', 31.12, 33.94, 'Di dalam mikrokuvet contoh alat ini sudah ada reagen.', ['Di dalam mikrokuvet', 'contoh alat ini sudah ada reagen.']),
 ('s10', 34.34, 38.08, 'Reagen pertama memecah sel darah merah dan melepaskan hemoglobinnya.', ['Reagen pertama memecah', 'sel darah merah dan', 'melepaskan hemoglobinnya.']),
 ('s11', 38.70, 42.62, 'Reagen berikutnya mengubah hemoglobin menjadi bentuk yang dapat diukur dengan cahaya.', ['Reagen berikutnya mengubah', 'hemoglobin menjadi bentuk', 'yang dapat diukur dengan cahaya.']),
 ('s12', 43.44, 45.34, 'Mikrokuvet lalu dimasukkan ke alat.', ['Mikrokuvet lalu', 'dimasukkan ke alat.']),
 ('s13', 45.90, 49.66, 'Cahaya melewati sampel, dan sensor membaca berapa banyak cahaya yang diserap.', ['Cahaya melewati sampel,', 'dan sensor membaca berapa banyak', 'cahaya yang diserap.']),
 ('s14', 50.40, 52.20, 'Alat memakai dua panjang gelombang.', ['Alat memakai', 'dua panjang gelombang.']),
 ('s15', 52.54, 55.20, 'Salah satunya membantu mengoreksi gangguan karena sampel keruh.', ['Salah satunya membantu mengoreksi', 'gangguan karena sampel keruh.']),
 ('s16', 55.20, 60.42, 'Hasilnya dihitung dan ditampilkan sebagai kadar Hb, biasanya dalam gram per desiliter.', ['Hasilnya dihitung dan', 'ditampilkan sebagai kadar Hb,', 'biasanya dalam gram per desiliter.']),
 ('s17', 61.16, 64.74, 'Tes ini membantu menilai kemungkinan anemia atau memantau perubahannya.', ['Tes ini membantu menilai', 'kemungkinan anemia', 'atau memantau perubahannya.']),
 ('s18', 65.36, 67.98, 'Tapi satu angka Hb belum memberi tahu penyebabnya.', ['Tapi satu angka Hb', 'belum memberi tahu penyebabnya.']),
 ('s19', 68.58, 73.10, 'Sampel dari ujung jari juga bisa menghasilkan hasil yang kurang tepat bila pengambilannya bermasalah.', ['Sampel dari ujung jari juga', 'bisa menghasilkan hasil yang kurang tepat', 'bila pengambilannya bermasalah.']),
 ('s20', 73.80, 77.44, 'Kalau angka tidak cocok dengan gejala, pemeriksaan lanjutan mungkin diperlukan.', ['Kalau angka tidak cocok dengan gejala,', 'pemeriksaan lanjutan', 'mungkin diperlukan.']),
 ('s21', 78.22, 81.92, 'Jadi, SpO₂ menunjukkan proporsi hemoglobin yang membawa oksigen,', ['Jadi, SpO₂ menunjukkan proporsi', 'hemoglobin yang membawa oksigen,']),
 ('s22', 81.92, 85.30, 'tes Hb menunjukkan berapa banyak hemoglobin yang tersedia.', ['tes Hb menunjukkan', 'berapa banyak hemoglobin', 'yang tersedia.']),
]
# kata kunci (ASR, detik video) untuk menyinkronkan gambar
W = {'spo2': 0.00, 'normal': 1.30, 'hb': 2.24, 'rendah': 2.90, 'kokbisa': 3.72, 'dua': 4.86, 'berbeda': 6.46,
     'persentase': 8.92, 'hemoglobin': 9.50, 'membawa': 10.78, 'oksigen': 11.06,
     'tesHb': 12.28, 'banyaknya': 13.52, 'hemoglobin2': 13.90, 'darah': 14.84,
     'protein': 16.74, 'sel': 17.42, 'jaringan': 19.22,
     'tetes': 22.56, 'ujungJari': 23.36, 'wadah': 24.60, 'mikrokuvet': 25.52,
     'sempit': 27.70, 'tertarik': 28.90, 'kapiler': 30.06,
     'reagen': 33.54, 'memecah': 35.50, 'melepaskan': 36.84, 'mengubah': 39.64, 'bentuk': 40.84, 'cahaya': 42.24,
     'dimasukkan': 44.48, 'alat': 45.04, 'cahaya2': 45.90, 'sampel': 46.64, 'sensor': 47.52, 'diserap': 49.38,
     'duaPG': 51.16, 'salah': 52.54, 'keruh': 54.92,
     'dihitung': 56.30, 'ditampilkan': 56.90, 'kadar': 57.64, 'gram': 59.42, 'desiliter': 59.96,
     'anemia': 62.82, 'memantau': 63.74, 'penyebab': 67.44, 'kurangTepat': 71.16, 'bermasalah': 72.58, 'gejala': 75.02, 'lanjutan': 76.38,
     'proporsi': 79.94, 'oksigen2': 81.52, 'banyak': 83.74, 'tersedia': 84.74}
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
        'sent': {sid: [a, b] for sid, a, b, *_ in SK}, 'sent_text': {sid: txt for sid, a, b, txt, _ in SK}, 'w': W, 'cap': cap}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap', len(cap), 't_web', cues['t_web'], 't_outro', cues['t_outro'])
