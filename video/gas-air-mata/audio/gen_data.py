"""Waktu kata per kata untuk takarir dari MP3 narator asli (tidak diubah) -> stage/data.json dan dialog.wav.
Jalankan dari folder video/gas-air-mata:  python3 audio/gen_data.py
Batas kalimat berasal dari transkripsi ASR (audio/asr.py); kata dibagi menurut bobot pada bagian yang bersuara."""
import json, subprocess, wave
import numpy as np
SR = 44100
# (mulai, selesai, [(kata, bobot), ...]); waktu detik dari ASR; teks disesuaikan dengan ejaan baku
S = [
 (0.00, 1.76, [('Kena',4),('gas',3),('air',3),('mata',4),('saat',4),('demo.',4)]),
 (2.28, 3.70, [('Apa',3),('yang',4),('terjadi',7),('di',2),('tubuhmu?',8)]),
 (4.28, 6.72, [('Bayangkan,',10),('kamu',4),('lagi',4),('di',2),('tengah',6),('kerumunan.',10)]),
 (7.14, 9.20, [('Tiba-tiba',9),('gas',3),('air',3),('mata',4),('menyebar.',8)]),
 (9.68, 13.70, [('Matamu',6),('perih,',6),('pandanganmu',11),('kabur',5),('dan',3),('kamu',4),('mulai',5),('batuk.',6)]),
 (14.18, 17.08, [('Di',2),('sebelahmu,',10),('seseorang',9),('buru-buru',9),('menyodorkan',11),('odol.',5)]),
 (17.50, 20.44, [('Katanya,',8),('oleskan',7),('di',2),('bawah',5),('mata',4),('biar',4),('nggak',5),('perih.',6)]),
 (20.82, 23.48, [('Tapi',4),('tunggu,',7),('odol',4),('itu',3),('benar-benar',10),('membantu?',9)]),
 (23.86, 26.24, [('Atau',4),('justru',6),('bisa',4),('bikin',5),('keadaan',7),('makin',5),('buruk?',6)]),
 (26.24, 30.12, [('Odol',4),('belum',5),('terbukti',8),('bisa',4),('melindungi',10),('mata',4),('dari',4),('gas',3),('air',3),('mata.',4)]),
 (30.68, 35.46, [('Kalau',5),('terkena',7),('mata',4),('atau',4),('kulit',5),('yang',4),('sensitif,',9),('odol',4),('malah',5),('bisa',4),('menambah',8),('iritasi.',7)]),
 (35.92, 39.70, [('Soalnya',7),('gas',3),('air',3),('mata',4),('tidak',5),('cuma',4),('mengenai',8),('area',4),('di',2),('bawah',5),('mata.',4)]),
 (40.22, 44.28, [('Zat',3),('iritannya',9),('juga',4),('bisa',4),('masuk',5),('ke',2),('mata',4),('dan',3),('terhirup',8),('ke',2),('saluran',7),('napas.',6)]),
 (44.72, 51.02, [('Itulah',6),('kenapa',6),('kamu',4),('bisa',4),('mengalami',9),('mata',4),('berair,',7),('hidung',6),('berair,',7),('batuk,',6),('sampai',6),('dada',4),('terasa',6),('sesak.',6)]),
 (51.40, 54.66, [('Setelah',7),('kamu',4),('menjauh',7),('dari',4),('sumber',6),('paparan',7),('dan',3),('membersihkan',12),('diri,',5)]),
 (54.66, 56.88, [('Gejalanya',9),('sering',6),('kali',4),('mulai',5),('membaik.',8)]),
 (57.12, 61.68, [('Tapi',4),('bagaimana',9),('kalau',5),('besoknya',8),('kamu',4),('masih',5),('batuk',5),('atau',4),('dadamu',6),('masih',5),('terasa',6),('tidak',5),('nyaman?',7)]),
 (62.24, 64.64, [('Dalam',5),('sebuah',6),('survei',6),('di',2),('Portland,',9),('Amerika',7),('Serikat,',8)]),
 (65.10, 70.72, [('lebih',5),('dari',4),('2',4),('ribu',4),('orang',5),('yang',4),('melaporkan',10),('paparan',7),('gas',3),('air',3),('mata',4),('ditanya',7),('tentang',7),('kondisi',7),('mereka',6),('setelahnya.',10)]),
 (71.14, 77.80, [('Sekitar',7),('47',9),('persen',6),('responden',9),('melaporkan',10),('masalah',7),('paru-paru',9),('atau',4),('dada',4),('satu',4),('sampai',6),('dua',3),('hari',4),('setelah',7),('paparan.',7)]),
 (78.28, 82.60, [('Tapi',4),('perlu',5),('diingat,',8),('angka',5),('ini',3),('berasal',7),('dari',4),('laporan',7),('peserta',7),('survei,',7)]),
 (82.60, 86.80, [('jadi',4),('tidak',5),('bisa',4),('dianggap',8),('berlaku',7),('untuk',5),('semua',5),('orang',5),('yang',4),('terkena',7),('gas',3),('air',3),('mata.',4)]),
 (87.38, 89.96, [('Lalu',4),('apa',3),('yang',4),('harus',5),('kamu',4),('lakukan',7),('kalau',5),('terkena?',8)]),
 (90.28, 93.72, [('Segera',6),('menjauh',7),('dari',4),('sumber',6),('paparan',7),('dan',3),('cari',4),('udara',5),('segar.',6)]),
 (94.10, 96.62, [('Jika',4),('matamu',6),('perih',5),('atau',4),('penglihatanmu',13),('kabur,',6)]),
 (96.86, 100.16, [('bilas',5),('dengan',6),('air',3),('bersih',6),('selama',6),('10-15',9),('menit.',6)]),
 (100.44, 102.06, [('Kalau',5),('kamu',4),('kesulitan',9),('bernapas,',9)]),
 (102.34, 105.54, [('penglihatan',11),('tetap',5),('terganggu',9),('atau',4),('gejalanya',9),('tidak',5),('membaik,',8)]),
 (105.76, 107.28, [('segera',6),('cari',4),('bantuan',7),('medis.',6)]),
 (107.70, 111.02, [('Penasaran',9),('bagaimana',9),('tubuh',5),('bereaksi',8),('terhadap',8),('hal-hal',7),('di',2),('sekitarmu?',10)]),
 (111.02, 115.26, [('Belajar',7),('kedokteran',10),('gratis',6),('di',2),('MEDCOEL',7),('lewat',5),('medcoel.com.',12)]),
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
