"""Menyusun linimasa video dari voice-over pemesan (audio/voiceover.wav, TIDAK diubah suaranya) + dua bunyi napas simulasi.
- Memotong voice-over per kalimat (dari ASR: audio/voiceover-asr.json) dan menyusun ulang dengan jeda antarkalimat dibatasi 0,36 dtk;
  setelah kalimat "Dengar bedanya." disisipkan jeda untuk memutar bunyi napas normal lalu bunyi napas lebih lemah (1,6 dtk masing-masing).
- Menulis audio/voiceover-susun.wav, data/env.json (amplitudo bunyi napas untuk grafik) dan cues.json (semua waktu video).
Pemakaian: python3 tools/susun_linimasa.py"""
import json, subprocess, numpy as np, os
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); P = lambda *a: os.path.join(H, *a)
sr = 24000
def rd(path, sr_):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(sr_), '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)
vo = rd(P('audio', 'voiceover.wav'), sr)
S = [(0.00, 3.10), (3.36, 5.80), (6.36, 9.38), (9.98, 13.80), (14.30, 16.02), (16.42, 20.76), (21.32, 25.70), (26.04, 27.70), (28.12, 31.60), (32.24, 33.04), (33.84, 37.12), (37.78, 40.26), (40.84, 43.04)]
GAP, LEAD, BN, BW, PRE = 0.36, 0.10, 1.6, 1.6, 0.22           # batas jeda, awal, durasi bunyi napas, jeda di tepi blok bunyi
newS = []; cur = LEAD; shift = []; demo = {}
for i, (a, b) in enumerate(S):
    if i == 0: ns = LEAD
    elif i == 10:                                              # setelah "Dengar bedanya."
        dN = prevE + PRE; dW = dN + BN + 0.2; ns = dW + BW + PRE; demo = {'N': [round(dN, 3), round(dN + BN, 3)], 'W': [round(dW, 3), round(dW + BW, 3)]}
    else: ns = prevE + min(a - S[i - 1][1], GAP)
    shift.append(ns - a); newS.append((ns, ns + (b - a))); prevE = ns + (b - a)
END = prevE + 0.40; N = int(END * sr); out = np.zeros(N)
for i, (a, b) in enumerate(S):
    pre = 0.12 if i else 0.0; post = 0.14
    seg = vo[int((a - pre) * sr):int((b + post) * sr)].copy(); f = int(0.012 * sr); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    o = int((newS[i][0] - pre) * sr); out[o:o + len(seg)] += seg[:max(0, N - o)] if o + len(seg) > N else seg
import wave
w = wave.open(P('audio', 'voiceover-susun.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
# amplitudo bunyi napas (RMS 20 dtk-ms) untuk grafik; sama skala untuk keduanya
env = {}
for k, fn in [('N', '04_suara_napas_normal_simulasi.wav'), ('W', '05_suara_napas_lebih_lemah_simulasi.wav')]:
    a = rd(P('audio', fn), 22050)[:int(1.6 * 22050)]; hop = int(0.02 * 22050)
    env[k] = [round(float(np.sqrt(np.mean(a[i:i + hop] ** 2))), 5) for i in range(0, len(a) - hop, hop)]
json.dump(env, open(P('data', 'env.json'), 'w'))
words = json.load(open(P('audio', 'voiceover-asr.json')))
def nt(orig):                                                   # waktu asli -> waktu video
    for i, (a, b) in enumerate(S):
        if a - 0.2 <= orig <= b + 0.2: return round(orig + shift[i], 3)
    return round(orig + shift[-1], 3)
K = {k: nt(v) for k, v in dict(sedikitCairan=11.14, antaraParu=12.22, terbentuk=15.02, diserap=15.66, masuk=16.86, banyak=17.46, berkurang=18.26, menumpuk=20.12, terlentang=21.94, bebas=23.32, belakang=24.58, bawah=25.24, tertekan=27.14, basal=30.16, lemah=31.28, bandingkan=34.56, patologi=35.74, normalnya=36.56, simulasiEdukatif=38.08, explorasi=40.84).items()}
cues = {'dur': round(END, 3), 'vo': [{'id': f's{i+1}', 't': [round(a, 3), round(b, 3)], 'orig': list(S[i]), 'shift': round(shift[i], 3)} for i, (a, b) in enumerate(newS)], 'demo': demo, 'k': K}
json.dump(cues, open(P('cues.json'), 'w'), ensure_ascii=False, indent=1); print('dur', cues['dur']); print(json.dumps(cues['vo'])); print(demo); print(K)
