"""Linimasa dan takarir "Pasien tidak sadar di IGD?". Audio narator dipakai utuh (tidak dipotong, tidak dipercepat, tidak diubah nadanya);
hanya diberi jeda awal LEAD agar pembuka gelap dan berkedip sebelum suara, dan jeda akhir TAIL.
Pemakaian: python3 gen_data.py narator.mp3 data.json voice.wav"""
import json, os, sys, subprocess, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segments import CAPS
src, out_json, out_wav = sys.argv[1:4]
SR = 44100; FPS = 30; LEAD = 0.6; TAIL = 2.8
x = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',src,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout, dtype=np.float32)
dur = len(x) / SR
win = int(SR * 0.01); n = len(x) // win
rms = np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(1)) + 1e-9
db = 20 * np.log10(rms)
breaks = json.load(open(os.environ.get('BREAKS_JSON') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'breaks.json')))
breaks = {round(float(k), 2): v for k, v in breaks.items()}
caps = []; log = []
for s, e, ph in CAPS:
    a = max(0, int((s - 0.2) * 100)); b = min(n - 1, int((e + 0.2) * 100))
    on = [i for i in range(a, b) if db[i] > -41]
    s2, e2 = on[0] * 0.01, (on[-1] + 1) * 0.01
    edges = [s2] + (breaks[round(s, 2)]['edges'] if len(ph) > 1 else []) + [e2]
    assert len(edges) == len(ph) + 1, (s, ph)
    for k, p in enumerate(ph):
        caps.append(dict(text=p, a0=round(edges[k], 3), a1=round(edges[k + 1], 3)))
        log.append((round(edges[k], 2), round(edges[k + 1], 2), p))
for i, c in enumerate(caps):  # takarir bertahan sedikit setelah ucapan tanpa tumpang tindih
    nxt = caps[i + 1]['a0'] if i + 1 < len(caps) else 1e9
    c['a1'] = round(min(c['a1'] + 0.15, max(c['a1'], nxt - 0.03)), 3)
total = dur + LEAD + TAIL
N = int(total * SR) + SR
mix = np.zeros(N, dtype=np.float32); i0 = int(LEAD * SR); mix[i0:i0 + len(x)] = x
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-',out_wav], input=mix.tobytes(), check=True)
# envelope ucapan per frame (untuk gerak mulut tokoh yang "berbicara" mengikuti narator)
nf = int(total * FPS) + 1
env = np.zeros(nf)
for f in range(nf):
    ta = f / FPS - LEAD; i = int(ta * 100)
    if 0 <= i < len(rms) - 1: env[f] = rms[i]
p = np.percentile(env[env > 0.002], 90)
envn = [round(float(min(1, v / p)), 3) for v in env]
json.dump(dict(fps=FPS, lead=LEAD, audioDur=round(dur, 3), total=round(total, 3), caps=caps, env=envn), open(out_json, 'w'), ensure_ascii=False, indent=0)
print('total', round(total, 2))
for l in log: print(l)
