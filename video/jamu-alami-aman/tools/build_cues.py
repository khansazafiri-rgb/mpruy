"""Membuat cues.json (jadwal bersama stage dan audio) + takarir (SRT/VTT) dari narasi edukasi Google AI Studio (audio/narasi-edukasi.wav) dan outro master.
Waktu kalimat = hasil ASR faster-whisper (audio/narasi-asr.json); TEKS takarir = kata-kata yang diucapkan (ejaan ASR yang jelas keliru dibetulkan di SK di bawah; ejaan meragukan ditandai di README).
Narasi edukasi dipotong di EDU_END (kalimat "...yang memang kamu perlukan."): sisa berkas (75,3-84,2 dtk) memuat outro lama dengan lafal "med school" dan TIDAK dipakai; outro memakai medcoel-outro-master.wav apa adanya.
Pemakaian: python3 tools/build_cues.py"""
import json, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EDU_END = 74.95                      # pemotongan narasi edukasi (detik, waktu berkas) = waktu video (narasi mulai di detik 0)
T_WEB = 75.6; T_OUTRO = 78.2        # web terlihat; master outro mulai diputar (web sudah terlihat >=0,3 dtk)
OUTRO_LEN = 10.84; T_URL = T_OUTRO + 9.4; DUR = T_OUTRO + OUTRO_LEN + 3.0
SK = [  # (id, mulai, akhir, teks, [potongan takarir])
 ('s1', 0.00, 4.36, 'Kalau jamu berasal dari tanaman, berarti pasti aman dan pasti manjur.', ['Kalau jamu berasal dari tanaman,', 'berarti pasti aman dan pasti manjur.']),
 ('s2', 4.96, 8.88, 'Tunggu dulu, jamu bukan satu jenis obat dengan satu cara kerja.', ['Tunggu dulu,', 'jamu bukan satu jenis obat', 'dengan satu cara kerja.']),
 ('s3', 9.06, 11.34, 'Setiap ramuan bisa mengandung banyak senyawa.', ['Setiap ramuan bisa', 'mengandung banyak senyawa.']),
 ('s4', 11.94, 15.66, 'Setelah diminum, sebagian senyawa melewati saluran cerna, diserap,', ['Setelah diminum,', 'sebagian senyawa melewati saluran cerna,', 'diserap,']),
 ('s5', 15.92, 19.48, 'diproses oleh tubuh, lalu mungkin memengaruhi proses biologis tertentu.', ['diproses oleh tubuh,', 'lalu mungkin memengaruhi', 'proses biologis tertentu.']),
 ('s6', 19.90, 22.60, 'Tetapi senyawa dan efeknya berbeda untuk setiap bahan.', ['Tetapi senyawa dan efeknya', 'berbeda untuk setiap bahan.']),
 ('s7', 23.14, 23.88, 'Contohnya jahe.', ['Contohnya jahe.']),
 ('s8', 24.32, 27.78, 'Ada penelitian yang menunjukkan jahe mungkin membantu mual pada kehamilan.', ['Ada penelitian yang menunjukkan', 'jahe mungkin membantu', 'mual pada kehamilan.']),
 ('s9', 27.78, 32.06, 'Tapi itu tidak berarti setiap jamu jahe terbukti mengatasi semua jenis mual,', ['Tapi itu tidak berarti', 'setiap jamu jahe terbukti', 'mengatasi semua jenis mual,']),
 ('s10', 32.24, 33.62, 'apalagi semua penyakit.', ['apalagi semua penyakit.']),
 ('s11', 34.06, 36.44, 'Di Indonesia, tingkat pembuktiannya juga berbeda.', ['Di Indonesia,', 'tingkat pembuktiannya juga berbeda.']),
 ('s12', 36.92, 39.38, 'Jamu didasarkan pada penggunaan empiris.', ['Jamu didasarkan pada', 'penggunaan empiris.']),
 ('s13', 39.86, 43.58, 'Obat herbal terstandar sudah didukung uji praklinik dan standardisasi bahan.', ['Obat herbal terstandar', 'sudah didukung uji praklinik', 'dan standardisasi bahan.']),
 ('s14', 44.08, 46.92, 'Fitofarmaka memiliki bukti uji klinik pada manusia.', ['Fitofarmaka memiliki bukti', 'uji klinik pada manusia.']),
 ('s15', 47.50, 50.02, 'Dan alami bukan berarti bebas risiko.', ['Dan alami bukan', 'berarti bebas risiko.']),
 ('s16', 50.42, 54.48, 'Bahan herbal bisa menimbulkan efek samping atau berinteraksi dengan obat yang sedang diminum.', ['Bahan herbal bisa menimbulkan', 'efek samping atau berinteraksi', 'dengan obat yang sedang diminum.']),
 ('s17', 54.48, 59.86, 'BPOM juga pernah menemukan produk jamu ilegal yang diam-diam dicampur bahan kimia obat.', ['BPOM juga pernah menemukan', 'produk jamu ilegal yang diam-diam', 'dicampur bahan kimia obat.']),
 ('s18', 60.26, 65.28, 'Jadi sebelum mengonsumsi produk, cek izin edar, komposisi, aturan pakai, dan klaimnya.', ['Jadi sebelum mengonsumsi produk,', 'cek izin edar, komposisi,', 'aturan pakai, dan klaimnya.']),
 ('s19', 65.74, 69.08, 'Kalau sedang hamil, punya penyakit tertentu, atau rutin minum obat,', ['Kalau sedang hamil,', 'punya penyakit tertentu,', 'atau rutin minum obat,']),
 ('s20', 69.30, 70.92, 'tanyakan dulu kepada tenaga kesehatan.', ['tanyakan dulu kepada', 'tenaga kesehatan.']),
 ('s21', 71.36, 74.48, 'Jamu juga tidak boleh menggantikan pengobatan yang memang kamu perlukan.', ['Jamu juga tidak boleh menggantikan', 'pengobatan yang memang kamu perlukan.']),
]
OUT = [('o1', 0.00, 3.36, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.', ['Masih penasaran?', 'Lanjutkan belajarnya di MEDCOEL.']), ('o2', 3.86, 7.78, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.', ['Jelajahi materi per bab,', 'latihan soal, dan simulasi dokter.']), ('o3', 8.34, 10.46, 'Semuanya gratis di medcoel.com.', ['Semuanya gratis di medcoel.com.'])]
def chunks(t0, t1, parts):
    n = sum(len(p) for p in parts); out = []; c = 0
    for p in parts:                                   # waktu potongan sebanding jumlah huruf di dalam rentang kalimat
        a = t0 + (t1 - t0) * c / n; c += len(p); b = t0 + (t1 - t0) * c / n; out.append([round(a, 2), round(b + (0.12 if p is parts[-1] else 0), 2), p])
    return out
cap = []
for sid, a, b, txt, parts in SK: cap += chunks(a, b, parts)
for sid, a, b, txt, parts in OUT: cap += [[round(T_OUTRO + x, 2), round(T_OUTRO + y, 2), t] for x, y, t in chunks(a, b, parts)]
cues = {'dur': round(DUR, 2), 'edu_end': EDU_END, 't_web': T_WEB, 't_outro': T_OUTRO, 't_url': round(T_URL, 2), 'outro_len': OUTRO_LEN,
        'sent': {sid: [a, b] for sid, a, b, *_ in SK}, 'sent_text': {sid: txt for sid, a, b, txt, _ in SK}, 'cap': cap,
        'ev': {'plant': [9.3, 9.5, 9.7], 'pestle': [9.95, 10.25, 10.55], 'burst': 10.7, 'absorb': [13.6, 14.0, 14.4, 14.9], 'liver': 16.3, 'bio': 18.2,
               'cards': [36.95, 39.9, 44.1], 'steps': [36.9, 39.85, 44.05], 'check': [62.44, 63.32, 64.16, 64.86], 'tenaga': 69.35, 'close': 72.6,
               'web': [75.6, 78.0, 81.9, 83.7, 85.0, 86.5], 'url': round(T_URL, 2)}}
json.dump(cues, open(os.path.join(H, 'cues.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'
with open(os.path.join(H, 'takarir.srt'), 'w') as f:
    for i, (a, b, t) in enumerate(cap, 1): f.write(f'{i}\n{ts(a, ",")} --> {ts(b, ",")}\n{t}\n\n')
with open(os.path.join(H, 'takarir.vtt'), 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, t in cap: f.write(f'{ts(a, ".")} --> {ts(b, ".")}\n{t}\n\n')
print('dur', cues['dur'], 'cap', len(cap))
