"""Musik chiptune + efek bunyi "Level Up" (40 dtk), disintesis 100% dari kode (numpy); tidak memakai sampel/musik pihak ketiga. Tidak ada suara narator.
Judul: "MEDCOEL 8-Bit Climb" (musik; A minor 150 BPM tegang dan tersendat tiap Kori membentur tembok -> hening -> C mayor 120 BPM cerah setelah MEDCOEL ditemukan, fanfare LEVEL UP di 28,8 dtk)
dan "MEDCOEL Pixel Pings" (efek).
Pembuat: dibuat untuk MEDCOEL pada sesi ini. Lisensi: CC0 1.0 (domain publik), boleh untuk promosi tanpa atribusi.
Pemakaian: python3 video/level-up/audio/audio_mix.py -> mix.wav, music.wav, sfx.wav (mono 44,1 kHz)"""
import os, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sr = 44100; T = 40.0; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(8)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
def sq(f, dur, duty=0.5, g=0.1, d=None, a=0.004):
    n = int(dur * sr); tt = np.arange(n) / sr; w = np.where((f * tt) % 1 < duty, 1.0, -1.0)
    e = np.minimum(1, tt / a) * (np.exp(-tt / d) if d else np.clip((dur - tt) / 0.02, 0, 1)); return lp(w, 2) * e * g
def tri(f, dur, g=0.2, d=None):
    n = int(dur * sr); tt = np.arange(n) / sr; w = 2 * np.abs(2 * ((f * tt) % 1) - 1) - 1
    e = np.minimum(1, tt / 0.004) * (np.exp(-tt / d) if d else np.clip((dur - tt) / 0.03, 0, 1)); return w * e * g
def nz(dur, g=0.1, d=0.04, hp=3):
    n = int(dur * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); return (x - lp(x, hp)) * np.exp(-tt / d) * g
def kick(g=0.35):
    n = int(0.16 * sr); tt = np.arange(n) / sr; f = 45 + 140 * np.exp(-tt / 0.025); return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / 0.07) * g
def sweep(f0, f1, dur, g=0.12, duty=0.5, d=None):
    n = int(dur * sr); tt = np.arange(n) / sr; f = f0 + (f1 - f0) * (tt / dur); ph = np.cumsum(f) / sr; w = np.where(ph % 1 < duty, 1.0, -1.0)
    e = np.minimum(1, tt / 0.004) * (np.exp(-tt / d) if d else np.clip((dur - tt) / 0.03, 0, 1)); return lp(w, 2) * e * g
N0 = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
def nf(name, octv=0): return N0[name] * (2 ** octv)
# ---- A (0 - 9): A minor 150 BPM, arpeggio pulse + bass; tersendat tiap benturan
B1 = 60 / 150; BARS = [('A', 'C', 'E'), ('A', 'C', 'E'), ('F', 'A', 'C'), ('G', 'B', 'D')]; root = ['A', 'A', 'F', 'G']
k = 0
while k * B1 / 2 < 9.0:
    x = k * B1 / 2; bar = int(x / (B1 * 4)) % 4; ch = BARS[bar]; step = k % 8
    add(mus, x, sq(nf(ch[[0, 1, 2, 1, 0, 1, 2, 1][step] % 3], 1 if step % 2 == 0 else 2), B1 / 2 * 0.9, 0.25, g=0.07, d=0.12))
    if k % 2 == 0: add(mus, x, tri(nf(root[bar], -2), B1 * 0.9, g=0.26))
    if k % 4 == 0 and x > 0.3: add(mus, x, kick(0.3))
    if k % 4 == 2 and x > 2.5: add(mus, x, nz(0.1, 0.1, 0.03))
    if x > 3.0 and k % 1 == 0: add(mus, x + B1 / 4, nz(0.03, 0.04, 0.01, 2))
    if x > 5.0 and k % 2 == 1: add(mus, x, sq(nf(ch[2], 2), 0.1, 0.125, g=0.04, d=0.05))
    k += 1
IM = [3.9, 5.6, 7.3]
mus *= np.clip(1 - sum(np.exp(-((t - ti) / 0.12) ** 2) * (t >= ti - 0.02) * (t <= ti + 0.5) * 1.0 for ti in IM), 0, 1)
mus[int(8.2 * sr):int(9.1 * sr)] *= np.linspace(1, 0, int(9.1 * sr) - int(8.2 * sr))
# ---- B (9 - 14): sunyi, drone rendah, denting pelan, detak jam
add(mus, 9.0, tri(nf('A', -3), 5.0, g=0.22)); add(mus, 9.0, tri(nf('E', -2), 5.0, g=0.12))
for i, (nm, o) in enumerate([('E', 1), ('C', 1), ('A', 0), ('C', 1), ('E', 1), ('G', 1)]): add(mus, 9.5 + i * 0.8, sq(nf(nm, o), 0.5, 0.125, g=0.045, d=0.25))
def tick(g=0.05): n = int(0.04 * sr); tt = np.arange(n) / sr; return np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt / 0.008) * g
for i in range(10): add(mus, 9.4 + i * 0.5, tick(0.05 if i % 2 == 0 else 0.03))
for i, f in enumerate([nf('E', 0), nf('G', 0), nf('C', 1), nf('E', 1)]): add(mus, 12.4 + i * 0.12, sq(f, 0.3, 0.25, g=0.06, d=0.2))
# ---- C (14 - 40): C mayor 120 BPM cerah (C - G - Am - F); fanfare LEVEL UP 28,8
B2 = 0.5; BAR = 2.0; CH = [('C', 'E', 'G'), ('G', 'B', 'D'), ('A', 'C', 'E'), ('F', 'A', 'C')]; RT = ['C', 'G', 'A', 'F']; LEAD = [[0, 2, 1, 2, 0, 2, 1, 2], [2, 1, 0, 1, 2, 1, 0, 1], [0, 1, 2, 1, 2, 1, 0, 2], [1, 0, 2, 0, 1, 2, 0, 1]]
b = 0
while 14.0 + b * BAR < T - 0.1:
    x0 = 14.0 + b * BAR; ch = CH[b % 4]; hi = x0 >= 28.8
    for j in range(8):
        x = x0 + j * B2 / 2
        if x > T - 0.5: break
        if x >= 14.4: add(mus, x, sq(nf(ch[LEAD[b % 4][j]], 1 if j % 2 == 0 else 2), B2 / 2 * 0.85, 0.5 if hi else 0.25, g=0.075 if hi else 0.06, d=0.14))
        if x >= 14.0 + BAR and j % 2 == 0: add(mus, x, sq(nf(ch[(j // 2 + 1) % 3], 0), B2 / 2 * 0.9, 0.125, g=0.035, d=0.1))
        add(mus, x, tri(nf(RT[b % 4], -2), B2 / 2 * 0.95, g=0.27))
        if x > 14.4 and j % 4 == 0: add(mus, x, kick(0.3))
        if x > 14.4 and j % 4 == 2: add(mus, x, nz(0.12, 0.11, 0.035))
        if x > 18.0 and j % 2 == 1: add(mus, x, nz(0.03, 0.045, 0.01, 2))
    b += 1
mus *= np.clip(t / 0.03, 0, 1) * np.clip((T - 0.05 - t) / 1.2, 0, 1)
# ---- efek
def blip(f0=988, f1=1319, g=1.0): return np.concatenate([sq(f0, 0.04, 0.5, 0.18, d=0.04), sq(f1, 0.08, 0.5, 0.18, d=0.05)]) * g
def ting(g=1.0): return np.concatenate([sq(1568, 0.06, 0.5, 0.18, d=0.05), sq(2093, 0.3, 0.5, 0.15, d=0.12)]) * g
def jump(g=1.0): return sweep(260, 760, 0.28, 0.2, 0.5, d=0.25) * g
def bonk_(g=1.0):
    n = int(0.45 * sr); y = np.zeros(n); sw = sweep(300, 70, 0.4, 0.3, 0.5, d=0.12); y[:len(sw)] += sw; y[:int(0.2 * sr)] += nz(0.2, 0.35, 0.03, 8); return y * g
def thud(g=1.0): n = int(0.3 * sr); y = np.zeros(n); s = sweep(110, 45, 0.28, 0.5, 0.5, d=0.1); y[:len(s)] = s; return (y + np.pad(nz(0.1, 0.3, 0.03, 10), (0, n - int(0.1 * sr)))) * g
def tok(f, g=1.0): return sq(f, 0.09, 0.25, 0.16, d=0.05) * g
def step_(g=1.0): return nz(0.05, 0.16, 0.015, 4) * g
def fall(g=1.0): return sweep(520, 140, 0.55, 0.14, 0.5) * g
def sigh(g=1.0): return np.concatenate([sq(392, 0.14, 0.5, 0.12, d=0.1), sq(330, 0.14, 0.5, 0.12, d=0.1), sq(262, 0.3, 0.5, 0.12, d=0.2)]) * g
def whoosh(dur=0.9, up=True, g=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    return (lp(x, 24) * (1 - fr) + (x - lp(x, 5)) * fr * 0.7) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5 * 0.9 * g
def glitch(dur=0.8, g=1.0):
    s = np.zeros(int(dur * sr))
    for i in range(10): x = i * dur / 10; w = sq(float(rng.choice([523, 659, 784, 1047, 1319, 1568])), 0.05, 0.5, 0.2, d=0.03); s[int(x * sr):int(x * sr) + len(w)] += w
    return s * g
def sparkle(g=1.0):
    s = np.zeros(int(0.9 * sr))
    for i, f in enumerate((2093, 2637, 3136, 3951)): w = sq(f, 0.25, 0.5, 0.1, d=0.08); s[int(i * 0.06 * sr):int(i * 0.06 * sr) + len(w)] += w
    return s * g
def fanfare(g=1.0):
    s = np.zeros(int(1.8 * sr))
    for i, f in enumerate((523, 659, 784, 1047, 1319, 1568)): w = sq(f, 0.18 if i < 5 else 1.0, 0.5, 0.17, d=None if i == 5 else 0.12); s[int(i * 0.085 * sr):int(i * 0.085 * sr) + len(w)] += w
    for f in (262, 392, 523): w = sq(f, 1.1, 0.25, 0.09, d=0.7); s[int(0.5 * sr):int(0.5 * sr) + len(w)] += w
    s[int(0.5 * sr):int(0.5 * sr) + int(0.6 * sr)] += nz(0.6, 0.12, 0.25, 4)
    return s * g
def chime(g=1.0):
    s = np.zeros(int(1.6 * sr))
    for i, f in enumerate((880, 1109, 1319, 1760)): w = sq(f, 0.9, 0.5, 0.1, d=0.35); s[int(i * 0.09 * sr):int(i * 0.09 * sr) + len(w)] += w
    return s * g
PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637]
E_ = [(0.0 + 0.2 * i, 'step', {'g': 0.5}) for i in range(1, 14)]
E_ += [(1.05 + 0.1 * i, 'tok', {'f': PENTA[i]}) for i in range(13)] + [(2.35, 'thud', {'g': 0.9})]
E_ += [(JT, 'jump', {}) for JT in (3.4, 5.1, 6.8)] + [(ti, 'bonk', {'g': 0.9}) for ti in IM] + [(8.0, 'fall', {'g': 0.8}), (9.2, 'sigh', {'g': 0.9})]
E_ += [(12.4, 'glitch', {'dur': 0.9, 'g': 0.6}), (13.7, 'ting', {}), (14.0, 'blip', {'f0': 523, 'f1': 784}), (14.6, 'ting', {}), (15.9, 'blip', {'f0': 1175, 'f1': 1568}), (16.0, 'whoosh', {'dur': 1.2, 'up': True, 'g': 0.7}), (17.25, 'glitch', {'dur': 0.8, 'g': 0.8})]
E_ += [(18.9, 'blip', {}), (20.05, 'blip', {}), (21.3, 'blip', {}), (22.95, 'blip', {}), (23.7, 'ting', {}), (24.7, 'blip', {}), (26.3, 'blip', {}), (26.95, 'blip', {}), (27.45, 'sigh', {'g': 0.5}), (28.5, 'sparkle', {}), (28.8, 'fanfare', {}),
       (29.0, 'whoosh', {'dur': 0.5, 'up': True, 'g': 0.4}), (30.5, 'blip', {'f0': 784, 'f1': 1047}), (31.8, 'blip', {'f0': 784, 'f1': 1047}), (33.0, 'whoosh', {'dur': 0.7, 'up': False, 'g': 0.6}), (33.7, 'glitch', {'dur': 0.7, 'g': 0.7})]
E_ += [(34.6 + 0.05 * i, 'tok', {'f': PENTA[i], 'g': 0.7}) for i in range(13)] + [(35.4, 'ting', {}), (36.3, 'jump', {'g': 0.8}), (36.95, 'ting', {}), (37.0, 'sparkle', {}), (37.7, 'chime', {})]
FN = {'ting': ting, 'blip': blip, 'jump': jump, 'bonk': bonk_, 'thud': thud, 'tok': tok, 'step': step_, 'fall': fall, 'sigh': sigh, 'whoosh': whoosh, 'glitch': glitch, 'sparkle': sparkle, 'fanfare': fanfare, 'chime': chime}
duck = np.ones(N)
for tx, kind, kw in E_:
    add(sfx, tx, FN[kind](**kw)); i = int(tx * sr); duck[i:min(N, i + int(0.25 * sr))] = np.minimum(duck[i:min(N, i + int(0.25 * sr))], 0.8)
i = int(28.8 * sr); duck[i:i + int(1.2 * sr)] = 0.55
mus *= lp(duck, int(0.04 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.14; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.34
mix = mu + fx; pk = np.abs(mix).max(); mix = mix / max(1, pk / 0.95); print('puncak', round(float(pk), 3))
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
