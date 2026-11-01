"""Waktu kata per kata untuk takarir dari MP3 narator asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari folder video/human-anatomy-3d:  python3 audio/gen_data.py
Batas kalimat berasal dari transkripsi ASR (audio/asr.py); kata dibagi menurut bobot pada bagian yang bersuara."""
import json, subprocess, wave
import numpy as np
SR = 44100
# (mulai, selesai, [(kata, bobot), ...]); waktu detik dari ASR; teks disesuaikan dengan ejaan baku
S = [
 (0.00, 1.64, [('Feature',6),('unlocked!',8)]),
 (1.64, 7.32, [('Sekarang,',8),('kamu',4),('bisa',4),('menjelajahi',11),('anatomi',7),('tubuh',5),('dalam',5),('tiga',4),('dimensi,',8),('gratis',6),('di',2),('MEDCOEL.',8)]),
 (7.64, 12.40, [('Mulai',5),('dari',4),('tampilan',8),('otot,',5),('kamu',4),('bisa',4),('mengatur',8),('layer',5),('sesuai',6),('bagian',6),('yang',4),('ingin',5),('kamu',4),('lihat.',5)]),
 (12.82, 16.52, [('Kurangi',7),('layer',5),('ototnya,',8),('dan',3),('perhatikan',10),('struktur',8),('yang',4),('ada',3),('di',2),('bawahnya.',8)]),
 (16.96, 22.10, [('Mau',3),('fokus',5),('ke',2),('kerangka?',9),('Tampilkan',9),('sistem',6),('rangka',6),('dan',3),('lihat',5),('bentuk',6),('tulang',6),('dari',4),('berbagai',8),('sudut.',6)]),
 (22.50, 27.84, [('Sekarang,',8),('coba',4),('tampilkan',9),('pembuluh',8),('darah',5),('untuk',5),('melihat',7),('bagaimana',9),('strukturnya',11),('berada',6),('di',2),('dalam',5),('tubuh.',6)]),
 (27.84, 29.66, [('Penasaran',9),('dengan',6),('sistem',6),('limfatik?',9)]),
 (29.98, 32.60, [('Pilih',5),('layer-nya',8),('dan',3),('jelajahi',8),('tampilannya',11),('juga.',5)]),
 (33.02, 35.94, [('Kamu',4),('bisa',4),('mengatur',8),('tampilan',8),('sesuai',6),('kebutuhan',9),('belajarmu.',9)]),
 (36.24, 39.46, [('Putar',5),('modelnya,',9),('perbesar',8),('bagian',6),('yang',4),('ingin',5),('kamu',4),('perhatikan',10)]),
 (39.46, 42.86, [('dan',3),('pelajari',8),('hubungan',8),('antarstruktur',13),('dengan',6),('lebih',5),('jelas.',6)]),
 (43.28, 47.88, [('Mau',3),('mulai',5),('dari',4),('otot,',5),('tulang,',7),('pembuluh',8),('darah,',6),('atau',4),('limfatik?',9),('Kamu',4),('yang',4),('pilih.',6)]),
 (48.16, 52.50, [('Yuk,',4),('coba',4),('Human',5),('Anatomy',7),('gratis',6),('di',2),('MEDCOEL,',8),('melalui',7),('medcoel.com.',12)]),
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
