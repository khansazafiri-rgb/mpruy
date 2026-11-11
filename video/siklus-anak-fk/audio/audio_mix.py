"""Musik + efek bunyi "Siklus anak FK" (40 dtk), disintesis 100% dari kode (numpy); tidak memakai sampel/musik pihak ketiga. Tidak ada suara narator.
Judul: "MEDCOEL Loop to Light" (musik; 126 BPM repetitif saat loop -> berhenti sesaat -> 110 BPM cerah setelah MEDCOEL ditemukan) dan "MEDCOEL UI Pings" (efek).
Pembuat: dibuat untuk MEDCOEL pada sesi ini. Lisensi: CC0 1.0 (domain publik), boleh untuk promosi Instagram tanpa atribusi.
Pemakaian: python3 video/siklus-anak-fk/audio/audio_mix.py -> mix.wav, music.wav, sfx.wav"""
import os, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sr = 44100; T = 40.0; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(21)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
NOTE = {'A': 220.0, 'B': 246.94, 'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0}
def pluck(f, g=0.1, d=0.12):
    n = int(0.4 * sr); tt = np.arange(n) / sr; return (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.05)) * env(n, 0.003, d) * g
def kick(g=0.5):
    n = int(0.22 * sr); tt = np.arange(n) / sr; f = 50 + 120 * np.exp(-tt / 0.03); return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / 0.1) * g
def clap(g=0.2):
    n = int(0.14 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 4)) * np.exp(-tt / 0.03) * g
def hat(g=0.05, d=0.012):
    n = int(0.05 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 3)) * np.exp(-tt / d) * g
def bass(f, dur, g=0.3):
    n = int(dur * sr); tt = np.arange(n) / sr; return (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.005, dur * 0.7) * g
def pad(freqs, dur, g=0.2):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004): s += (2 * ((f * (1 + d) * tt) % 1) - 1) * 0.5 + np.sin(2 * np.pi * f * (1 + d) * tt) * 0.5
    return lp(s, 16) / len(freqs) * np.minimum(1, tt / 0.3) * np.clip((dur - tt) / 0.4, 0, 1) * g
# ---- A (0 - 8,4): loop repetitif 126 BPM, makin padat
B1 = 60 / 126; AM = [NOTE['A'] * 2, NOTE['C'] * 2, NOTE['E'] * 2, NOTE['C'] * 2, NOTE['A'] * 2, NOTE['C'] * 2, NOTE['E'] * 2, NOTE['G'] * 2]
k = 0
while k * B1 / 2 < 8.4:
    x = k * B1 / 2; j = k % 8
    add(mus, x, pluck(AM[j], 0.09))
    if k % 2 == 0: add(mus, x, kick(0.5 if x > 2.9 else 0.38))
    if x > 3.0 and k % 4 == 2: add(mus, x, clap(0.22))
    add(mus, x + B1 / 4, hat(0.05 + 0.02 * (x > 7.4)))
    if x > 7.4: add(mus, x + B1 / 8, hat(0.03)); add(mus, x + 3 * B1 / 8, hat(0.03))
    if x > 5.0 and k % 2 == 1: add(mus, x, pluck(AM[j] * 2, 0.05, 0.06))
    if k % 8 == 0: add(mus, x, bass(NOTE['A'] / 2, B1 * 3, 0.32))
    k += 1
# kaset melambat saat tumpukan menimpa (8,4 - 9,0)
mus[: int(9.0 * sr)] *= np.clip((9.0 - t[: int(9.0 * sr)]) / 0.55, 0, 1) ** 0.8 * (t[: int(9.0 * sr)] < 8.4) + (t[: int(9.0 * sr)] >= 8.4) * np.clip((9.0 - t[: int(9.0 * sr)]) / 0.6, 0, 1)
# ---- B (9,0 - 14,0): hening dengan drone rendah dan detak jam
add(mus, 9.0, pad([NOTE['A'] / 2, NOTE['E']], 5.4, 0.18))
def tick(g=0.05):
    n = int(0.04 * sr); tt = np.arange(n) / sr; return np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt / 0.008) * g
for i in range(10): add(mus, 9.4 + i * 0.5, tick(0.05 if i % 2 == 0 else 0.03))
# ---- C (14,0 - 40): cerah 110 BPM, C - G - Am - F
B2 = 60 / 110; BAR = B2 * 4; CH = [['C', 'E', 'G', 'D'], ['G', 'B', 'D', 'E'], ['A', 'C', 'E', 'G'], ['F', 'A', 'C', 'G']]; b = 0
while 14.0 + b * BAR < T - 0.1:
    x0 = 14.0 + b * BAR; ch = CH[b % 4]
    add(mus, x0, pad([NOTE[c] * (1 if i else 0.5) for i, c in enumerate(ch)], BAR + 0.3, 0.22 if x0 > 14.5 else 0.12))
    for j in range(8):
        x = x0 + j * B2 / 2
        if x > T - 0.5: break
        if x0 >= 14.0 + BAR * 0.5: add(mus, x, pluck(NOTE[ch[[0, 2, 1, 3, 2, 3, 1, 2][j] % 4]] * (2 if j % 2 == 0 else 4), 0.085))
        if x > 14.4 and j % 4 == 0: add(mus, x, kick(0.32))
        if x > 14.4 and j % 4 == 2: add(mus, x, clap(0.12))
        if x > 18.0 and j % 2 == 1: add(mus, x, hat(0.035))
    if b % 2 == 1 or True: add(mus, x0, bass(NOTE[ch[0]] / 2, B2 * 3, 0.3))
    b += 1
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.05 - t) / 1.0, 0, 1)
# ---- efek
def ting(g=1.0):
    n = int(0.5 * sr); tt = np.arange(n) / sr; return (np.sin(2 * np.pi * 1760 * tt) + 0.5 * np.sin(2 * np.pi * 2637 * tt) * np.exp(-tt / 0.12)) * env(n, 0.002, 0.13) * 0.5 * g
def blip(f0=988, f1=1319, g=1.0):
    n = int(0.09 * sr); tt = np.arange(n) / sr; f = np.where(tt < 0.04, f0, f1); ph = np.cumsum(f) / sr; return lp(np.sign(np.sin(2 * np.pi * ph)) * 0.35 + np.sin(2 * np.pi * ph) * 0.5, 3) * np.exp(-tt / 0.05) * 0.55 * g
def thud(g=1.0, f=60):
    n = int(0.4 * sr); tt = np.arange(n) / sr; nz = lp(rng.standard_normal(n), 20); return (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.12) + nz * np.exp(-tt / 0.05) * 0.6) * 0.8 * g
def flip(g=1.0):
    n = int(0.25 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 5)) * np.exp(-tt / 0.07) * 0.4 * g + np.sin(2 * np.pi * (900 - 2200 * tt) * tt) * np.exp(-tt / 0.08) * 0.3 * g
def whoosh(dur=0.9, up=True, g=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    return (lp(nz, 24) * (1 - fr) + (nz - lp(nz, 5)) * fr * 0.7) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5 * 0.9 * g
def sparkle(g=1.0):
    s = np.zeros(int(0.9 * sr))
    for i, f in enumerate((2093, 2637, 3136, 3951)):
        n = int(0.4 * sr); tt = np.arange(n) / sr; s[int(i * 0.06 * sr):int(i * 0.06 * sr) + n] += np.sin(2 * np.pi * f * tt) * env(n, 0.002, 0.09) * 0.35
    return s * g
def chime(g=1.0):
    s = np.zeros(int(1.6 * sr))
    for i, f in enumerate((880, 1109, 1319)):
        n = int(1.3 * sr); tt = np.arange(n) / sr; s[int(i * 0.09 * sr):int(i * 0.09 * sr) + n] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.2)) * env(n, 0.003, 0.5) * 0.3
    return s * g
def uhoh(g=1.0):
    n = int(0.5 * sr); tt = np.arange(n) / sr; f = np.where(tt < 0.2, 440, 330); ph = np.cumsum(f) / sr; return np.sin(2 * np.pi * ph) * np.where((tt > 0.2) | (tt < 0.17), 1, 0) * np.exp(-tt / 0.25) * 0.35 * g
def glitch(dur=0.8, g=1.0):
    s = np.zeros(int(dur * sr))
    for i in range(9):
        x = i * dur / 9; n = int(0.05 * sr); tt = np.arange(n) / sr; f = rng.choice([523, 659, 784, 1047, 1319]); w = np.sign(np.sin(2 * np.pi * f * tt)) * 0.3 * np.exp(-tt / 0.03); s[int(x * sr):int(x * sr) + n] += w
    return s * g
E_ = [(0.55, 'blip', {}), (1.9, 'blip', {}), (3.0, 'flip', {}), (4.2, 'thud', {'g': 0.4, 'f': 90}), (4.8, 'flip', {}), (5.7, 'thud', {'g': 0.5, 'f': 80}), (6.2, 'flip', {}), (6.95, 'thud', {'g': 0.6, 'f': 70}), (7.4, 'flip', {}), (8.0, 'thud', {'g': 0.7, 'f': 65}),
      (8.45, 'thud', {'g': 1.2, 'f': 48}), (9.2, 'blip', {'f0': 330, 'f1': 262, 'g': 0.5}), (14.0, 'blip', {'f0': 523, 'f1': 784}), (14.6, 'ting', {}), (15.9, 'blip', {'f0': 1175, 'f1': 1568}), (16.0, 'whoosh', {'dur': 1.2, 'up': True, 'g': 0.7}), (17.25, 'glitch', {'dur': 0.8, 'g': 0.8}),
      (18.9, 'blip', {}), (20.05, 'blip', {}), (21.3, 'blip', {}), (22.95, 'blip', {}), (23.7, 'ting', {}), (24.7, 'blip', {}), (26.3, 'blip', {}), (26.95, 'blip', {}), (27.45, 'uhoh', {}), (28.5, 'sparkle', {}),
      (29.0, 'whoosh', {'dur': 0.5, 'up': True, 'g': 0.5}), (30.5, 'blip', {'f0': 784, 'f1': 1047}), (31.8, 'blip', {'f0': 784, 'f1': 1047}), (33.0, 'whoosh', {'dur': 0.7, 'up': False, 'g': 0.6}), (33.7, 'glitch', {'dur': 0.7, 'g': 0.7}), (35.4, 'ting', {}), (36.1, 'sparkle', {}), (37.7, 'chime', {})]
FN = {'ting': ting, 'blip': blip, 'thud': thud, 'flip': flip, 'whoosh': whoosh, 'sparkle': sparkle, 'chime': chime, 'uhoh': uhoh, 'glitch': glitch}
duck = np.ones(N)
for tx, kind, kw in E_:
    add(sfx, tx, FN[kind](**kw)); i = int(tx * sr); duck[i:min(N, i + int(0.3 * sr))] = np.minimum(duck[i:min(N, i + int(0.3 * sr))], 0.7)
mus *= lp(duck, int(0.04 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.14; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.30
mix = mu + fx; pk = np.abs(mix).max(); mix = mix / max(1, pk / 0.95); print('puncak', round(float(pk), 3))
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
