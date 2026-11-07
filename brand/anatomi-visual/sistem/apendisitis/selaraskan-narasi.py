#!/usr/bin/env python3
"""Menyelaraskan 17 kalimat naskah apendisitis dengan narasi WAV: batas kalimat dipilih dari jeda senyap (ffmpeg silencedetect) sehingga
proporsi suku kata kumulatif paling cocok dengan proporsi waktu bicara kumulatif (DP). Pengenalan suara tidak tersedia, jadi ketelitian sekitar 0,2 dtk.
Pemakaian: python3 selaraskan-narasi.py narasi.wav waktu-narasi.json"""
import re, subprocess, json, sys
import numpy as np
S = [
"Dokter memasukkan kamera lewat sayatan kecil, lalu mengangkat satu kantong di ujung usus.",
"Kenapa bagian itu harus diangkat?",
"Kantong kecil itu bernama apendiks.",
"Ia menempel pada bagian awal usus besar.",
"Ketika meradang, kondisinya disebut apendisitis, atau radang usus buntu.",
"Pada sebagian kasus, pintu saluran apendiks tersumbat.",
"Penyumbatnya bisa berupa tinja yang mengeras, atau jaringan di dinding apendiks yang membengkak.",
"Nah, dinding apendiks tetap menghasilkan lendir.",
"Karena jalan keluarnya tertutup, lendir tertahan di dalam.",
"Tekanannya meningkat, apendiks meregang, aliran darah di dindingnya terganggu, dan bakteri dapat berkembang.",
"Awalnya nyeri bisa terasa samar di sekitar pusar.",
"Ketika peradangan menjalar dan mengiritasi lapisan dinding perut, nyerinya dapat terasa lebih jelas di kanan bawah.",
"Mual, hilang nafsu makan, atau demam bisa menyertai, tetapi gejalanya tidak selalu sama pada setiap orang.",
"Dokter menilai gejala, memeriksa perut, dan bila perlu menggunakan tes darah atau pencitraan.",
"Pengangkatan apendiks sering menjadi penanganan; pada kasus tertentu, dokter dapat mempertimbangkan antibiotik.",
"Belum ada cara yang terbukti pasti mencegah apendisitis.",
"Yang penting, jangan menunda pemeriksaan saat nyeri perut makin berat, terutama bila menetap di kanan bawah.",
]
wav, out = sys.argv[1], sys.argv[2]
syl = lambda s: max(1, len(re.findall(r'[aeiou]+', s.lower())))
w = np.array([syl(s) for s in S], float)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], capture_output=True, text=True).stdout)
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.18', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
if len(en) > len(st): st = [0.0] + st
if len(st) > len(en): en = en + [dur]
sil = list(zip(st, en))
# bicara = di luar jeda
T0 = en[0] if sil and sil[0][0] < 0.05 else 0.0
spk_start = T0
seg = []; prev = T0
for a, b in sil:
    if a <= T0: continue
    seg.append((prev, a)); prev = b
if prev < dur - 0.05: seg.append((prev, dur))
tot = sum(b - a for a, b in seg)
cum = lambda t: sum(max(0, min(t, b) - a) for a, b in seg) / tot     # fraksi waktu bicara sampai t
cands = [(a, b) for a, b in sil if a > T0 + 0.3 and b < dur - 0.3]        # kandidat batas kalimat (jeda)
n = len(S); K = len(cands)
cs = np.cumsum(w) / w.sum()
INF = 1e18
dp = np.full((n, K), INF); bk = np.zeros((n, K), int)
for k in range(K):
    t = (cands[k][0] + cands[k][1]) / 2
    dp[0][k] = (cs[0] - cum(cands[k][0])) ** 2 - 0.02 * min(1.0, cands[k][1] - cands[k][0])
for i in range(1, n - 1):
    for k in range(i, K):
        for kp in range(i - 1, k):
            c = dp[i - 1][kp] + (cs[i] - cum(cands[k][0])) ** 2 - 0.02 * min(1.0, cands[k][1] - cands[k][0])
            if c < dp[i][k]: dp[i][k] = c; bk[i][k] = kp
best = min(range(n - 2, K), key=lambda k: dp[n - 2][k]); path = [best]
for i in range(n - 2, 0, -1): best = bk[i][best]; path.append(best)
path.reverse()
bounds = [(T0, cands[path[0]][0])] + [(cands[path[i - 1]][1], cands[path[i]][0]) for i in range(1, n - 1)] + [(cands[path[-1]][1], seg[-1][1])]
res = []
for i, (a, b) in enumerate(bounds):
    if i == 0:
        for x, y in sil:
            if x < 0.5 and y > a: a = y   # napas awal dibuang: kalimat 1 mulai setelah jeda awal
    inner = [(x, y) for x, y in sil if x > a + 0.1 and y < b - 0.1]
    res.append({'id': i + 1, 't0': round(a, 2), 't1': round(b, 2), 'teks': S[i], 'sukuKata': int(w[i]), 'jedaDalam': [[round(x, 2), round(y, 2)] for x, y in inner]})
json.dump({'durasi': dur, 'kalimat': res}, open(out, 'w'), ensure_ascii=False, indent=1)
for r in res: print(r['id'], r['t0'], r['t1'], round(r['t1'] - r['t0'], 2), 's', r['sukuKata'], 'suku', round((r['t1'] - r['t0']) / r['sukuKata'], 3), 'dtk/suku', r['jedaDalam'])
