"""Musik + efek bunyi Reel POV "Masih di lab", disintesis 100% dari kode (numpy). Tidak memakai sampel, rekaman, atau musik pihak ketiga.
Judul musik: "MEDCOEL Masih di Lab" (instrumental ringan 112 BPM, marimba dan bass pluck, kick lembut, shaker; jeda sesaat sebelum punchline).
Judul efek: "MEDCOEL Soft Pops" (pop gelembung saat teks muncul dan "ting" lembut saat punchline).
Penulis: dibuat untuk MEDCOEL pada sesi pembuatan video ini. Lisensi: CC0 1.0 (domain publik), bebas dipakai komersial/Instagram tanpa atribusi.
Pemakaian:  python3 video/live-4d-masih-di-lab/audio/audio_mix.py   -> mix.wav (44,1 kHz mono), music.wav, sfx.wav. Waktu efek dan jeda dibaca dari ../edl.json."""
import os, json, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sr = 44100
edl = json.load(open(os.path.join(HERE, '..', 'edl.json'))); T = edl['total']; N = int(T * sr); t = np.arange(N) / sr
B = 60 / edl['bpm']; BAR = 4 * B; rng = np.random.default_rng(7)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(round(t0 * sr))
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
CH = [['C', 'E', 'G', 'D'], ['A', 'C', 'E', 'G'], ['F', 'A', 'C', 'E'], ['G', 'B', 'D', 'F']]     # Cmaj9 | Am7 | Fmaj7 | G7
ROOT = ['C', 'A', 'F', 'G']
def kick(g):
    n = int(0.22 * sr); tt = np.arange(n) / sr; fr = 52 * (1 + 1.8 * np.exp(-tt / 0.025)); return np.sin(2 * np.pi * np.cumsum(fr) / sr) * env(n, 0.002, 0.09) * g
def shaker(g):
    n = int(0.05 * sr); c = rng.standard_normal(n); return (c - lp(c, 4)) * env(n, 0.004, 0.018) * g
def rim(g):
    n = int(0.06 * sr); tt = np.arange(n) / sr; return (np.sin(2 * np.pi * 1700 * tt) * 0.4 + (rng.standard_normal(n) - lp(rng.standard_normal(n), 3)) * 0.3) * env(n, 0.001, 0.015) * g
def marimba(f, g, d=0.22):
    n = int(0.6 * sr); tt = np.arange(n) / sr
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) + 0.35 * np.sin(2 * np.pi * 3.97 * f * tt) * np.exp(-tt / 0.04) + 0.12 * np.sin(2 * np.pi * 9.2 * f * tt) * np.exp(-tt / 0.015)
    return s * np.minimum(1, tt / 0.002) * g
def bass(f, g, d=0.28):
    n = int(0.5 * sr); tt = np.arange(n) / sr; s = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.08)
    return s * np.minimum(1, tt / 0.004) * np.exp(-tt / d) * g
def soft_pad(freqs, dur, g):
    n = int(dur * sr); tt = np.arange(n) / sr; s = sum(np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt) for f in freqs) / len(freqs)
    return s * np.minimum(1, tt / 0.08) * np.clip((dur - tt) / 0.25, 0, 1) * g
nb = int(np.ceil(T / BAR)) + 1
HOOK = [0, 2, 3, 2, 1, 2, 3, 1]        # pola marimba 8 nada per bar (indeks nada akor), riang dan melompat
for b in range(nb):
    ch = CH[b % 4]; r = NOTE[ROOT[b % 4]] / 2; x0 = b * BAR
    add(mus, x0, soft_pad([NOTE[c] for c in ch[:3]], BAR + 0.1, 0.10))
    for j in range(4):
        x = x0 + j * B
        if j in (0, 2): add(mus, x, kick(0.55 if j == 0 else 0.42))
        if j in (1, 3): add(mus, x, rim(0.16))
        add(mus, x, bass(r, 0.42 if j in (0, 2) else 0.30)); add(mus, x + B * 0.75, bass(r * 2, 0.16, 0.12))
    for j in range(8):
        x = x0 + j * B / 2; add(mus, x, shaker(0.07 if j % 2 else 0.045))
        if b == 0 and j < 2: continue
        oc = 2 if j % 4 != 3 else 4; add(mus, x, marimba(NOTE[ch[HOOK[j] % 4]] * oc, 0.14 if j % 2 == 0 else 0.10))
# ---- jeda komedi: musik lenyap tepat sebelum punchline, lalu kembali di ketukan jatuhnya potongan
j0, j1 = edl['jeda']; gate = np.ones(N)
fi = int(0.07 * sr); a, z = int(j0 * sr), int(j1 * sr); gate[a:z] = 0; gate[a - fi:a] = np.linspace(1, 0, fi)
mus *= gate
add(mus, j1, soft_pad([NOTE['C'], NOTE['E'], NOTE['G'], NOTE['D'] * 2], 1.2, 0.10))
mus *= np.clip((T - 0.02 - t) / 0.9, 0, 1)     # memudar di akhir
# ---- efek
def pop(g=1.0):
    n = int(0.12 * sr); tt = np.arange(n) / sr; f = 380 + 700 * (1 - np.exp(-tt / 0.02)); s = np.sin(2 * np.pi * np.cumsum(f) / sr)
    return s * env(n, 0.002, 0.03) * 0.8 * g
def ting(g=1.0):    # "ting" lembut: lonceng kecil dua nada (E6, B6) dengan gema pendek
    s = np.zeros(int(1.4 * sr))
    for i, (f, d, a) in enumerate(((1318.5, 0.55, 0.5), (1975.5, 0.45, 0.32), (3951.0, 0.12, 0.10))):
        n = int(1.2 * sr); tt = np.arange(n) / sr; w = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.07)) * env(n, 0.002, d) * a; s[:n] += w
    return s * g
def tick(g=1.0): return pop(0.6 * g)
KIND = {'pop': pop, 'ting': ting, 'tick': tick}
for tx, kind in edl['sfx']: add(sfx, tx, KIND[kind]())
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.10; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.30
mix = mu + fx; pk = np.abs(mix).max(); print('puncak', round(float(pk), 3)); mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.92 if pk > 0.9 else mix
for nm, a_ in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a_, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 2), 'dtk', edl['bpm'], 'BPM')
