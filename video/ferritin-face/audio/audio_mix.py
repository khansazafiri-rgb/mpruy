"""Suara pixel 8-bit untuk "Mata panda = kurang zat besi?": efek suara + musik chiptune ringan, disintesis 100% dari kode (numpy), tanpa sampel/musik pihak ketiga.
Judul musik: "MEDCOEL Pixel Pulse". Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini; boleh untuk promosi Instagram/TikTok tanpa atribusi.
Semua waktu dibaca dari ../cues.json (sama dengan yang dipakai stage). Tidak ada narasi.
Saluran musik: bass segitiga + arpeggio pulsa 25% (Am-F-C-G, 120 BPM) + hi-hat/kick pelan di bagian akhir; efek: square/pulse/noise dengan pitch naik-turun mengikuti peristiwa (butir zat besi, slot Hb, ketukan jari, transisi, klik web, jingle penutup).
Pemakaian: python3 video/ferritin-face/audio/audio_mix.py -> music.wav, sfx.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json'))); EV = C['ev']
sr = 44100; T = C['dur']; N = int(T * sr); rng = np.random.default_rng(88)
mus = np.zeros(N); sfx = np.zeros(N)
def put(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= N: return
    j = min(N, i + len(sig)); buf[i:j] += sig[:j - i] * g
def osc(kind, f, n, duty=0.5):
    tt = np.arange(n) / sr; ph = (np.cumsum(f * np.ones(n) if np.isscalar(f) else f) / sr) % 1.0
    if kind == 'sq': return np.where(ph < duty, 1.0, -1.0)
    if kind == 'tri': return 4 * np.abs(ph - 0.5) - 1
    if kind == 'saw': return 2 * ph - 1
    return np.sin(2 * np.pi * ph)
def env(n, a=0.003, d=0.08, sus=0.0, rel=0.02):
    tt = np.arange(n) / sr; e = np.minimum(1, tt / max(a, 1e-4)) * (sus + (1 - sus) * np.exp(-tt / max(d, 1e-4)))
    r = int(rel * sr); e[-r:] *= np.linspace(1, 0, min(r, n)) if r < n else 0; return e
def blip(t, f0, f1=None, dur=0.08, vol=0.4, kind='sq', duty=0.5, d=None):
    n = int(dur * sr); f = np.linspace(f0, f1 if f1 else f0, n); put(sfx, t, osc(kind, f, n, duty) * env(n, 0.002, d or dur * 0.5) , vol)
def ding(t, f, vol=0.35, dur=0.35):
    n = int(dur * sr); put(sfx, t, (osc('sq', f, n, 0.25) * 0.6 + osc('tri', f * 2, n) * 0.4) * env(n, 0.002, dur * 0.35), vol)
def noise(t, dur, vol=0.2, lo=0.0, hi=1.0, sweep=None):
    n = int(dur * sr); x = rng.standard_normal(n)
    k = max(2, int(sr / (sweep or 4000))); x = np.convolve(x, np.ones(k) / k, mode='same') if sweep else x
    put(sfx, t, x * env(n, 0.002, dur * 0.4) * (1 - lo), vol)
def sweep(t, dur, f0, f1, vol=0.25, kind='saw', noisy=0.25):
    n = int(dur * sr); f = np.geomspace(f0, f1, n); tt = np.arange(n) / sr
    e = np.minimum(1, tt / 0.03) * np.minimum(1, (dur - tt) / 0.06); put(sfx, t, (osc(kind, f, n) * (1 - noisy) + rng.standard_normal(n) * noisy * 0.5) * e, vol)
def tick(t, vol=0.2): noise(t, 0.025, vol, sweep=2500)
def slam(t, vol=0.5):
    n = int(0.24 * sr); f = np.geomspace(260, 50, n); put(sfx, t, osc('sq', f, n, 0.5) * env(n, 0.001, 0.09), vol); noise(t, 0.08, vol * 0.5, sweep=900)
PENTA = [0, 2, 4, 7, 9]
def pent(i, base=60): return 440.0 * 2 ** ((base + PENTA[i % 5] + 12 * (i // 5) - 69) / 12)
def pop(t, vol=0.3): blip(t, 600, 1400, 0.07, vol, 'sq', 0.25)
def typing(t, vol=0.22):
    for k, f in enumerate((1318, 1568, 1976)): blip(t + k * 0.035, f, f, 0.05, vol, 'sq', 0.25, 0.03)
# ------------------------------------------------------------------ efek mengikuti peristiwa
slam(EV['slam'], 0.55); pop(EV['pop'], 0.35)
for b in EV['blink']: tick(b + 0.08, 0.16)
sweep(EV['point'], 0.28, 300, 1400, 0.16); ding(EV['burst'], 1568, 0.3); noise(EV['burst'], 0.18, 0.12, sweep=7000)
for i, tt in enumerate(EV['taps']): blip(tt, pent(i + 4, 60), pent(i + 4, 60) * 0.97, 0.09, 0.4, 'tri', 0.5, 0.06)
for c in EV['cap']: typing(c + 0.02)
for c in EV['cuts']: tick(c, 0.22); noise(c, 0.07, 0.10, sweep=1500)
blip(EV['q1'], 660, 660, 0.09, 0.3, 'sq', 0.25); blip(EV['q1'] + 0.1, 988, 988, 0.16, 0.3, 'sq', 0.25)
n = int(0.3 * sr); put(sfx, EV['buzz'], osc('sq', 140, n, 0.5) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * np.arange(n) / sr))) * 0.18, 1.0)
ding(EV['ping'], 1760, 0.3); ding(EV['ping'] + 0.09, 2349, 0.25)
pop(EV['card'], 0.3); tick(EV['thumb'], 0.3); blip(EV['thumb'], 400, 300, 0.06, 0.3, 'tri')
sweep(EV['zoom'][0], EV['zoom'][1] - EV['zoom'][0], 220, 2400, 0.2, 'saw', 0.2)
blip(EV['match'], 523, 523, 0.12, 0.35, 'tri'); ding(EV['match'] + 0.05, 1568, 0.25)
# diagram: butir zat besi (pitch naik tiap butir = rasa kemajuan) dan slot Hb (ding lebih tinggi)
for i, tt in enumerate(C['s3a']): tick(tt, 0.10); blip(tt + 0.75, pent(i, 72), pent(i, 72), 0.1, 0.28, 'sq', 0.25, 0.05)
for i, tt in enumerate(C['s3b']): blip(tt, 880, 600, 0.07, 0.2, 'sq', 0.25); ding(tt + 0.8, 1175 * 2 ** (i / 12 * 2), 0.32)
for i, tt in enumerate(C['s4g']):
    tick(tt, 0.10); fill = (i + 1) % 3 == 0
    if fill: ding(tt + 0.7, 1760, 0.4); noise(tt + 0.7, 0.12, 0.10, sweep=7000)
    else: blip(tt + 0.7, 740, 700, 0.07, 0.18, 'tri')
sweep(18.4, 4.2, 520, 90, 0.07, 'tri', 0.05)                             # cadangan menipis: nada turun pelan
slam(24.0, 0.4); blip(EV['q2'], 392, 196, 0.2, 0.4, 'sq', 0.25, 0.12); blip(EV['q2'] + 0.22, 330, 330, 0.12, 0.3, 'sq', 0.25)
for k, tt in enumerate((25.3, 26.6, 27.9, 29.4, 30.6)):                      # motif tanya-jawab pelan di bagian koreksi klaim
    for j, mm in enumerate((64, 67, 71 if k < 3 else 69)): blip(tt + j * 0.09, 440.0 * 2 ** ((mm - 69) / 12), None, 0.12, 0.16, 'sq', 0.25, 0.08)
ding(EV['blood'], 2093, 0.3); ding(EV['blood'] + 0.08, 2637, 0.25); sweep(EV['blood'] - 0.1, 0.18, 400, 1800, 0.1)
sweep(EV['lid'][0], EV['lid'][1] - EV['lid'][0], 120, 520, 0.14, 'saw', 0.15); pop(EV['lid'][1], 0.3)
sweep(EV['dolly'][0], EV['dolly'][1] - EV['dolly'][0], 200, 3200, 0.22, 'saw', 0.2); ding(35.25, 1568, 0.2)
for wv in EV['web']: tick(wv + 0.02, 0.3); blip(wv + 0.02, 1200, 1200, 0.05, 0.3, 'sq', 0.25)
for tt in (37.8, 39.85, 40.9): tick(tt, 0.22); blip(tt, 900, 700, 0.05, 0.25, 'tri')
for k, f in enumerate((523, 659, 784, 1047, 1319)): blip(EV['end'] + k * 0.09, f, f, 0.2, 0.3, 'sq', 0.25, 0.1)
ding(EV['end'] + 0.55, 2093, 0.3); pop(EV['addr'], 0.3)
# ------------------------------------------------------------------ musik chiptune
BPM = 120; B = 60 / BPM
CH = [(57, [0, 3, 7]), (53, [0, 4, 7]), (48, [0, 4, 7]), (55, [0, 4, 7])]           # Am F C G (root MIDI, interval)
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def inten(t):
    for a, b, v in ((0, 5, 0.5), (5, 9, 0.55), (9, 17, 0.7), (17, 24, 0.6), (24, 32, 0.4), (32, 35.4, 0.7), (35.4, 41.2, 0.9), (41.2, 99, 0.5)):
        if a <= t < b: return v
    return 0.5
bar = 0
while bar * 4 * B < T:
    t0 = bar * 4 * B; root, iv = CH[bar % 4]; v = inten(t0)
    for k in range(4):                                     # bass segitiga tiap ketukan (oktaf turun)
        if k in (0, 2) or v > 0.8:
            n = int(B * 0.9 * sr); put(mus, t0 + k * B, osc('tri', mf(root - 24 + (12 if k == 3 else 0)), n) * env(n, 0.004, 0.25), 0.6 * v)
    steps = 8 if v >= 0.6 else 4
    drain = 1.0 if not (17.5 <= t0 < 23.5) else max(0.0, 1 - (t0 - 17.5) / 6.0)
    for k in range(steps):
        tt = t0 + k * (4 * B / steps)
        if steps == 4 or True:
            if (17.5 <= t0 < 23.5) and (k / steps) > drain + 0.15: continue         # arpeggio menipis mengikuti cadangan
            m = root + 12 + iv[k % 3] + (12 if (k // 3) % 2 else 0); n = int(0.18 * sr)
            put(mus, tt, osc('sq', mf(m), n, 0.25) * env(n, 0.002, 0.1), 0.3 * v)
    if t0 >= 35.4:                                          # hi-hat dan kick pelan di bagian penutup
        for k in range(8):
            if k % 2: noise(0, 0.0, 0)  # placeholder tidak memengaruhi
            n = int(0.03 * sr); put(mus, t0 + k * B / 2, rng.standard_normal(n) * env(n, 0.001, 0.01), 0.10 * v * (1 if k % 2 else 0.5))
        for k in (0, 2):
            n = int(0.12 * sr); f = np.geomspace(140, 45, n); put(mus, t0 + k * B, osc('sin', f, n) * env(n, 0.001, 0.05), 0.55)
    bar += 1
mus *= np.clip(np.arange(N) / sr / 0.2, 0, 1) * np.clip((T - np.arange(N) / sr) / 0.6, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.05; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.55
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mu); wr('sfx.wav', fx); wr('premix.wav', bed)
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', os.path.join(HERE, 'premix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
li = float([l for l in m.splitlines() if l.strip().startswith('I:')][-1].split()[1]); gdb = -16.0 - li
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'premix.wav'), '-af', f'volume={gdb}dB,alimiter=limit=0.7:level=0', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok premix LUFS', li, 'gain dB', round(gdb, 2))
