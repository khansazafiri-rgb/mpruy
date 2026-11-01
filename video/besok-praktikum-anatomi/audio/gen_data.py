"""Waktu kata per kata untuk takarir dari MP3 narator asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari folder video/besok-praktikum-anatomi:  python3 audio/gen_data.py
Batas kalimat berasal dari transkripsi ASR (audio/asr.py); kata dibagi menurut bobot pada bagian yang bersuara."""
import json, subprocess, wave
import numpy as np
SR = 44100
# (mulai, selesai, [(kata, bobot), ...]); waktu detik dari ASR; teks disesuaikan dengan ejaan baku
S = [
 (0.0, 5.2, [('Besok', 5), ('praktikum', 9), ('anatomi,', 8), ('tapi', 4), ('kamu', 4), ('masih', 5), ('bingung', 7), ('lihat', 5), ('tulang', 6), ('dan', 3), ('otot', 4), ('dari', 4), ('berbagai', 8), ('sisi?', 5)]),
 (5.82, 7.64, [('Dari', 4), ('depan', 5), ('kelihatannya', 12), ('paham.', 6)]),
 (7.98, 12.66, [('Begitu', 6), ('dilihat', 7), ('dari', 4), ('samping,', 8), ('kamu', 4), ('mulai', 5), ('ragu,', 5), ('diputar', 7), ('sedikit', 7), ('lagi.', 5)]),
 (13.46, 15.8, [('Tunggu,', 7), ('ini', 3), ('bagian', 6), ('yang', 4), ('tadi', 4), ('sebelah', 7), ('mana?', 5)]),
 (16.42, 21.4, [('Akhirnya', 8), ('kamu', 4), ('menatap', 7), ('atlas,', 6), ('memiringkan', 11), ('kepala,', 7), ('lalu', 4), ('memutar', 7), ('bukunya.', 8)]),
 (21.78, 23.84, [('Bukunya', 7), ('sudah', 5), ('berputar', 8), ('ke', 2), ('mana-mana.', 10)]),
 (24.34, 26.86, [('Pemahamanmu', 11), ('masih', 5), ('mencari', 7), ('jalan', 5), ('pulang.', 7)]),
 (26.86, 33.3, [('Apalagi', 7), ('waktu', 5), ('kamu', 4), ('harus', 5), ('membayangkan', 12), ('bagaimana', 9), ('tulang,', 7), ('otot,', 5), ('dan', 3), ('pembuluh', 8), ('darah', 5), ('tersusun', 8), ('di', 2), ('dalam', 5), ('tubuh.', 6)]),
 (33.58, 38.0, [('Nah,', 4), ('supaya', 6), ('lebih', 5), ('kebayang,', 9), ('coba', 4), ('buka', 4), ('3D', 2), ('Anatomy', 7), ('di', 2), ('MEDCOEL.', 8)]),
 (38.34, 43.0, [('Kamu', 4), ('bisa', 4), ('memutar', 7), ('dan', 3), ('memperbesar', 11), ('model', 5), ('tubuh', 5), ('untuk', 5), ('melihatnya', 10), ('dari', 4), ('sudut', 5), ('yang', 4), ('berbeda.', 8)]),
 (43.32, 45.8, [('Mau', 3), ('melihat', 7), ('kerangka,', 9), ('kurangi', 7), ('tampilan', 8), ('ototnya.', 8)]),
 (46.24, 47.74, [('Penasaran', 9), ('posisi', 6), ('pembuluh', 8), ('darah?', 6)]),
 (48.06, 51.68, [('Tampilkan', 9), ('sistemnya', 9), ('dan', 3), ('lihat', 5), ('hubungannya', 11), ('dengan', 6), ('struktur', 8), ('di', 2), ('sekitarnya.', 11)]),
 (51.68, 56.72, [('Setelah', 7), ('eksplorasi,', 11), ('kamu', 4), ('juga', 4), ('bisa', 4), ('lanjut', 6), ('baca', 4), ('catatan', 7), ('materi', 6), ('dan', 3), ('latihan', 7), ('soal.', 5)]),
 (57.02, 60.98, [('Jadi,', 5), ('sebelum', 7), ('kepalamu', 8), ('ikut', 4), ('berputar,', 9), ('coba', 4), ('putar', 5), ('modelnya', 8), ('dulu.', 5)]),
 (61.46, 66.86, [('Yuk,', 4), ('belajar', 7), ('kedokteran', 10), ('gratis', 6), ('di', 2), ('MEDCOEL.', 8), ('Buka', 4), ('medcoel.com', 11), ('dan', 3), ('mulai', 5), ('eksplorasi.', 11)]),
]
def load(p):
    raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
x = load('audio/narator.mp3'); dur = len(x) / SR
h = SR // 100; n = len(x) // h
e = np.sqrt((x[:n*h].reshape(n, h)**2).mean(1) + 1e-12)
thr = 0.05 * np.percentile(e, 98)
voiced = e > thr
lines = []
for i, (a, b, ws) in enumerate(S):
    gp = a - S[i-1][1] if i else 1.0; gn = S[i+1][0] - b if i + 1 < len(S) else 1.0
    i0, i1 = max(0, int((a - min(0.25, max(gp, 0) / 2)) * 100)), min(n, int((b + min(0.25, max(gn, 0) / 2)) * 100))
    idx = np.where(voiced[i0:i1])[0] + i0
    # batasi pada rentang kalimat dan tutup lubang < 0.25 dtk
    if len(idx) == 0: idx = np.arange(int(a * 100), int(b * 100))
    segs = []; s0 = p = idx[0]
    for k in idx[1:]:
        if k - p > 25: segs.append((s0, p + 1)); s0 = k
        p = k
    segs.append((s0, p + 1))
    tot = sum(q - r for r, q in segs); W = sum(w for _, w in ws)
    def pos(c):
        r = c
        for r0, r1 in segs:
            if r <= r1 - r0: return r0 + r
            r -= r1 - r0
        return segs[-1][1]
    acc = 0; words = []
    for w, wt in ws:
        s_ = pos(acc / W * tot); acc += wt; e_ = pos(acc / W * tot)
        words.append({'w': w, 's': round(s_ / 100, 3), 'e': round(e_ / 100, 3)})
    lines.append({'id': f'K{i+1:02d}', 't0': round(segs[0][0] / 100, 3), 't1': round(segs[-1][1] / 100, 3), 'asr0': a, 'asr1': b, 'words': words})
json.dump({'fps': 30, 'dur': round(dur, 3), 'lines': lines}, open('stage/data.json', 'w'), ensure_ascii=False)
w = wave.open('dialog.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('durasi MP3', round(dur, 3), 'kalimat', len(lines))
for l in lines[:3] + lines[-2:]: print(l['id'], l['t0'], l['t1'], [(w['w'], w['s']) for w in l['words']][:4])
