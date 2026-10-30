"""Linimasa dan takarir "Bangun, tapi tak bisa bergerak". Audio narator dipakai utuh (tidak dipotong, tidak dipercepat);
hanya diberi jeda awal LEAD detik agar mata tokoh sempat terbuka sebelum suara. Waktu takarir diambil dari jeda ucapan nyata.
Pemakaian: python3 gen_data.py narator.mp3 data.json voice.wav"""
import json, sys, subprocess, numpy as np
src, out_json, out_wav = sys.argv[1], sys.argv[2], sys.argv[3]
SR = 44100; FPS = 30; LEAD = 0.8; TAIL = 2.6
x = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',src,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout, dtype=np.float32)
dur = len(x) / SR
win = int(SR * 0.01); n = len(x) // win
db = 20 * np.log10(np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(1)) + 1e-9)
# Teks per ucapan: (mulai, selesai dalam detik audio asli, [frasa takarir]). Teks dikoreksi dari pengenalan suara (Whisper small + medium).
CAPS = [
 (0.05, 2.51, ["Bayangin kamu terbangun tengah malam."]),
 (3.10, 4.33, ["Kamu bisa melihat kamar."]),
 (4.80, 5.61, ["Jam di meja."]),
 (6.03, 7.60, ["Cahaya kecil di balik pintu."]),
 (8.07, 10.02, ["Lalu, kamu ingin menggerakkan badan."]),
 (10.52, 11.23, ["Tidak bisa."]),
 (11.73, 13.44, ["Kamu mencoba memanggil seseorang."]),
 (13.84, 15.29, ["Suaramu juga tidak keluar."]),
 (15.73, 18.08, ["Beberapa detik terasa panjang sekali."]),
 (18.50, 23.83, ["Bahkan bayangan di sudut kamar", "mulai terlihat seperti sesuatu", "yang sedang memperhatikanmu."]),
 (24.29, 26.31, ["Tapi apa yang sebenarnya terjadi?"]),
 (26.95, 31.92, ["Saat kita bermimpi dalam fase tidur REM,", "gerak otot tubuh untuk sementara ditahan."]),
 (32.32, 34.41, ["Kadang kesadaran muncul lebih dulu,"]),
 (34.71, 38.35, ["sementara tubuh belum sepenuhnya", "keluar dari keadaan tidur itu."]),
 (38.77, 42.34, ["Kamu merasa sudah bangun,", "tetapi belum bisa bergerak atau bicara."]),
 (42.72, 46.83, ["Pengalaman ini disebut sleep paralysis,", "atau kelumpuhan tidur."]),
 (47.24, 54.76, ["Pada sebagian orang, sensasi mirip mimpi masih terbawa,", "sehingga kamar terasa jauh lebih menyeramkan", "daripada biasanya."]),
 (55.17, 57.26, ["Episode seperti ini umumnya singkat."]),
 (57.58, 61.66, ["Jadi, bagian paling menakutkan dari kamar tadi", "bukan bayangannya,"]),
 (61.98, 66.24, ["tapi beberapa detik ketika kamu", "tidak tahu apa yang sedang terjadi."]),
 (66.68, 72.21, ["Kalau pengalaman seperti ini sering berulang", "atau mengganggu tidurmu,", "ceritakan kepada tenaga kesehatan."]),
 (72.60, 75.53, ["Tadi kamu takut karena belum tahu apa yang terjadi."]),
 (75.86, 79.76, ["Sekarang malah penasaran bagaimana", "tubuh bisa bekerja seperti itu, kan?"]),
 (80.10, 90.50, ["Buat kamu yang belajar kedokteran,", "lanjutkan rasa penasaran itu di MEDCOEL.", "Ada 38.400 soal dan pembahasan,", "gratis di medcoel.com."]),
]
# Titik potong takarir (detik audio asli) hasil pencocokan pengenalan suara (align_breaks.py), dikoreksi manual untuk kalimat penutup.
BREAKS = {18.50: [20.30, 22.12], 26.95: [29.41], 34.71: [36.57], 38.77: [40.16], 42.72: [45.25], 47.24: [50.90, 53.55], 57.58: [60.55],
          61.98: [64.11], 66.68: [68.90, 70.30], 75.86: [78.02], 80.10: [82.24, 84.75, 88.07]}
def silences(s, e, thr=-41, mind=0.09):
    i = int(s * 100) + 4; end = int(e * 100) - 4; st = None; res = []
    while i < end:
        if db[i] < thr:
            if st is None: st = i
        else:
            if st is not None and (i - st) * 0.01 >= mind: res.append(((st + i) / 2) * 0.01)
            st = None
        i += 1
    return res
caps = []; log = []
for s, e, ph in CAPS:
    # batas ucapan nyata: cari awal dan akhir energi di sekitar perkiraan
    a = max(0, int((s - 0.2) * 100)); b = min(n - 1, int((e + 0.2) * 100))
    on = [i for i in range(a, b) if db[i] > -41]
    s2, e2 = on[0] * 0.01, (on[-1] + 1) * 0.01
    edges = [s2]
    if len(ph) > 1 and s in BREAKS:
        edges += BREAKS[s]
    elif len(ph) > 1:
        cands = silences(s2, e2); w = [len(p) for p in ph]; tot = sum(w); cum = 0; last = s2
        for k in range(len(ph) - 1):
            cum += w[k]; exp = s2 + (e2 - s2) * cum / tot
            c = [t for t in cands if t > last + 0.3 and t < e2 - 0.3]
            t = min(c, key=lambda t: abs(t - exp)) if c and min(abs(t - exp) for t in c) < 1.0 else exp
            edges.append(t); last = t
    edges.append(e2)
    for k, p in enumerate(ph):
        caps.append(dict(text=p, t0=round(edges[k] + LEAD, 3), t1=round(edges[k + 1] + LEAD, 3)))
        log.append((round(edges[k], 2), round(edges[k + 1], 2), p))
for i, c in enumerate(caps):  # takarir bertahan sedikit setelah ucapan, tanpa tumpang tindih
    nxt = caps[i + 1]['t0'] if i + 1 < len(caps) else 1e9
    c['t1'] = round(min(c['t1'] + 0.18, max(c['t1'], nxt - 0.03)), 3)
total = dur + LEAD + TAIL
N = int(total * SR) + SR
mix = np.zeros(N, dtype=np.float32); i0 = int(LEAD * SR); mix[i0:i0 + len(x)] = x
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-',out_wav], input=mix.tobytes(), check=True)
json.dump(dict(fps=FPS, lead=LEAD, audioDur=round(dur, 3), total=round(total, 3), caps=caps), open(out_json, 'w'), ensure_ascii=False, indent=1)
print('total', total)
for l in log: print(l)
