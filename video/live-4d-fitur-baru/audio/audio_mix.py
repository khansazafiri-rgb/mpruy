"""Musik + efek bunyi video "NEW FEATURE: Live 4D Lab", disintesis 100% dari kode (numpy). Tidak memakai sampel, rekaman, atau musik pihak ketiga.
Judul: "MEDCOEL Feature Unlocked" (musik, instrumental 124 BPM, yang paling energik di antara empat video: beat tegas, bass bergerak, synth bersih, denyut halus) dan "MEDCOEL Unlock Pings" (efek). Penulis: dibuat untuk MEDCOEL pada sesi pembuatan video ini. Lisensi: CC0 1.0 (domain publik), bebas dipakai komersial/Instagram tanpa atribusi.
Pemakaian:  python3 video/live-4d-fitur-baru/audio/audio_mix.py   -> mix.wav (44,1 kHz mono), music.wav, sfx.wav. Waktu efek dibaca dari ../edl.json."""
import os, json, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sr = 44100
edl = json.load(open(os.path.join(HERE, '..', 'edl.json'))); T = edl['total']; N = int(T * sr); t = np.arange(N) / sr
BPM = edl['bpm']; B = 60 / BPM; BAR = B * 4; rng = np.random.default_rng(31)
mus = np.zeros(N); sfx = np.zeros(N); kick_env = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
CH = [['A', 'C', 'E', 'B'], ['F', 'A', 'C', 'E'], ['C', 'E', 'G', 'D'], ['G', 'B', 'D', 'E']]   # Am9 | Fmaj7 | Cmaj9 | G6
ROOT = ['A', 'F', 'C', 'G']
# ---- kick (denyut tegas) di tiap ketukan; juga menjadi kunci "sidechain" halus pada pad dan bass
def kick(g):
    n = int(0.30 * sr); tt = np.arange(n) / sr; fr = 50 * (1 + 2.4 * np.exp(-tt / 0.03)); s = np.sin(2 * np.pi * np.cumsum(fr) / sr) * env(n, 0.001, 0.12)
    c = np.random.default_rng(1).standard_normal(n); s += (c - lp(c, 6)) * np.exp(-tt / 0.004) * 0.25; return s * g
def clap(g):
    n = int(0.18 * sr); tt = np.arange(n) / sr; c = rng.standard_normal(n); s = np.zeros(n)
    for d in (0.0, 0.012, 0.024): j = int(d * sr); s[j:] += (c[:n - j] - lp(c[:n - j], 4)) * np.exp(-tt[:n - j] / 0.035) * 0.6
    return s * g
def hat(g, d=0.025):
    n = int(0.06 * sr); tt = np.arange(n) / sr; c = rng.standard_normal(n); return (c - lp(c, 3)) * np.exp(-tt / d) * g
nbeats = int(T / B) + 1
for k in range(nbeats):
    x = k * B; add(mus, x, kick(1.0 if k % 4 == 0 else 0.85))
    i = int(x * sr); kick_env[i:i + int(0.22 * sr)] = np.maximum(kick_env[i:i + int(0.22 * sr)], np.exp(-np.arange(min(int(0.22 * sr), N - i)) / (0.07 * sr)))
    if k % 2 == 1 and x > BAR: add(mus, x, clap(0.55))
    if x >= BAR:
        add(mus, x + B / 2, hat(0.16)); add(mus, x + B / 4, hat(0.05, 0.015)); add(mus, x + 3 * B / 4, hat(0.05, 0.015))
# ---- bass 8 nada bergerak (gigi gergaji disaring) mengikuti akor
def bass(f, d, g):
    n = int(d * sr); tt = np.arange(n) / sr; s = 2 * ((f * tt) % 1) - 1; s = lp(s, 14) * 0.7 + np.sin(2 * np.pi * f * tt) * 0.5
    return s * np.minimum(1, tt / 0.004) * np.exp(-tt / (d * 0.9)) * g
nb = int(np.ceil(T / BAR))
for b in range(nb):
    r = NOTE[ROOT[b % 4]] / 4
    for j in range(8):
        x = b * BAR + j * B / 2
        if x < BAR * 0.99 and j < 2: continue
        add(mus, x + 0.01, bass(r * (2 if j in (3, 7) else 1), B / 2 * 0.9, 0.5 if j % 2 == 0 else 0.34))
# ---- pad synth bersih (sidechain halus mengikuti kick = "denyut")
def pad(freqs, dur, g):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.005, 0.005): s += (2 * ((f * (1 + d) * tt) % 1) - 1) * 0.4 + np.sin(2 * np.pi * f * (1 + d) * tt) * 0.6
    return lp(s, 16) / len(freqs) * np.minimum(1, tt / 0.25) * np.clip((dur - tt) / 0.3, 0, 1) * g
padb = np.zeros(N)
for b in range(nb):
    ch = CH[b % 4]; add(padb, b * BAR, pad([NOTE[c] * (0.5 if i == 0 else 1) for i, c in enumerate(ch)], BAR + 0.3, 0.30))
mus += padb * (1 - 0.55 * kick_env)
# ---- arpeggio synth jernih 16 nada per bar (pluck + gema), pola naik; beri ruang pada bar pembuka
def pluck(f, g):
    n = int(0.32 * sr); tt = np.arange(n) / sr; s = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.05) + 0.12 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / 0.03)
    return s * env(n, 0.003, 0.09) * g
ORD = [0, 2, 1, 3, 2, 3, 1, 2, 0, 3, 1, 2, 3, 2, 1, 3]
for b in range(1, nb):
    ch = CH[b % 4]
    for j in range(16):
        x = b * BAR + j * B / 4
        if x > T - 1.9: break
        sg = pluck(NOTE[ch[ORD[j] % 4]] * (2 if j % 4 < 2 else 4), 0.07 if j % 4 == 0 else 0.05); add(mus, x, sg); add(mus, x + 0.75 * B, sg, 0.28)
# ---- riser sebelum penutup, lalu akor penutup
rb = edl['outro']['at']; n = int(B * 3.6 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); add(mus, rb - B * 3.6, lp(nz, 5) * (tt / (B * 3.6)) ** 2.2, 0.3)
add(mus, rb, pad([NOTE['A'] / 2, NOTE['E'], NOTE['A'], NOTE['C'] * 2], T - rb + 0.3, 0.45)); add(mus, rb, kick(1.2)); add(mus, rb, clap(0.9))
# ---- efek ----
def unlock(g=1.0):    # "ting" fitur terbuka: tiga nada naik cepat (E6-A6-C#7... jernih) + ting panjang + kilau
    s = np.zeros(int(1.3 * sr))
    for i, f in enumerate((1318.5, 1760.0, 2217.5, 2637.0)):
        n = int(0.20 * sr); tt = np.arange(n) / sr; ph = np.cumsum(f * np.ones(n)) / sr
        w = (np.sign(np.sin(2 * np.pi * ph)) * 0.22 + np.sin(2 * np.pi * ph) * 0.6) * env(n, 0.001, 0.07)
        s[int(i * 0.055 * sr):int(i * 0.055 * sr) + n] += lp(w, 2) * (0.7 + 0.12 * i)
    nt = int(1.0 * sr); tt = np.arange(nt) / sr; j0 = int(0.20 * sr)
    s[j0:j0 + nt] += (np.sin(2 * np.pi * 3520 * tt) * 0.5 + np.sin(2 * np.pi * 5274 * tt) * 0.18) * env(nt, 0.002, 0.22)
    sw = int(0.22 * sr); tt = np.arange(sw) / sr; f = 400 * (4.0 ** (tt / 0.22)); s[:sw] += np.sin(2 * np.pi * np.cumsum(f) / sr) * np.minimum(1, tt / 0.01) * np.clip(1 - tt / 0.22, 0, 1) * 0.18
    return s * 0.75 * g
def blip(g=1.0):
    n = int(0.09 * sr); tt = np.arange(n) / sr; f = np.where(tt < 0.04, 988, 1319); ph = np.cumsum(f) / sr; s = np.sign(np.sin(2 * np.pi * ph)) * 0.35 + np.sin(2 * np.pi * ph) * 0.5
    return lp(s, 3) * np.exp(-tt / 0.05) * np.minimum(1, tt / 0.002) * 0.55 * g
def sparkle(g=1.0):
    s = np.zeros(int(0.9 * sr))
    for i, f in enumerate((2093, 2637, 3136, 3951)):
        n = int(0.4 * sr); tt = np.arange(n) / sr; w = np.sin(2 * np.pi * f * tt) * env(n, 0.002, 0.09) * 0.35; s[int(i * 0.06 * sr):int(i * 0.06 * sr) + n] += w
    return s * g
def chime(g=1.0):
    s = np.zeros(int(1.6 * sr))
    for i, f in enumerate((880, 1109, 1319)):
        n = int(1.3 * sr); tt = np.arange(n) / sr; w = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.2)) * env(n, 0.003, 0.5) * 0.3; s[int(i * 0.09 * sr):int(i * 0.09 * sr) + n] += w
    return s * g
KIND = {'unlock': unlock, 'blip': blip, 'sparkle': sparkle, 'chime': chime}
duck = np.ones(N); last = -9
for tx, kind in edl['sfx']:
    assert tx - last > 0.24, 'efek bertumpuk di %.2f' % tx; last = tx
    add(sfx, tx, KIND[kind]())
    i = int(tx * sr); m = min(N, i + int((0.55 if kind == 'unlock' else 0.2) * sr)); duck[i:m] = np.minimum(duck[i:m], 0.55 if kind == 'unlock' else 0.8)
duck = lp(duck, int(0.03 * sr)); mus *= duck
mus *= np.clip((T - 0.1 - t) / 0.7, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.115; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.28
mix = mu + fx; pk = np.abs(mix).max(); print('puncak', round(float(pk), 3)); mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.92 if pk > 0.9 else mix
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 2), 'dtk', BPM, 'BPM')
