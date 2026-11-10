"""Musik + efek bunyi video "Live 4D Lab: Normal atau ada perubahan?", disintesis 100% dari kode (numpy). Tidak memakai sampel, rekaman, atau musik pihak ketiga.
Judul: "MEDCOEL Live 4D Compare" (musik, instrumental 109 BPM) dan "MEDCOEL UI Swap Pings" (efek). Penulis: dibuat untuk MEDCOEL pada sesi pembuatan video ini. Lisensi: CC0 1.0 (domain publik), bebas dipakai komersial/Instagram tanpa atribusi.
Pemakaian:  python3 video/live-4d-bandingkan/audio/audio_mix.py   -> mix.wav (44,1 kHz mono), music.wav, sfx.wav. Waktu efek dibaca dari ../edl.json."""
import os, json, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sr = 44100
edl = json.load(open(os.path.join(HERE, '..', 'edl.json'))); T = edl['total']; N = int(T * sr); t = np.arange(N) / sr
BPM = edl['bpm']; B = 60 / BPM; BAR = B * 4; rng = np.random.default_rng(23)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
# ---- denyut elektronik rapi (bukan monitor medis): "thump" bass + klik tipis di tiap ketukan, tick halus di ketukan lemah
def thump(g):
    n = int(0.28 * sr); tt = np.arange(n) / sr; fr = 46 * (1 + 1.6 * np.exp(-tt / 0.035)); return np.sin(2 * np.pi * np.cumsum(fr) / sr) * env(n, 0.002, 0.10) * g
def tick(g):
    n = int(0.03 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 5)) * np.exp(-tt / 0.006) * g
for k in range(int(T / B) + 1):
    x = k * B; add(mus, x, thump(0.9 if k % 4 == 0 else 0.6)); add(mus, x + 0.012, tick(0.10))
    add(mus, x + B * 0.5, tick(0.05))
# ---- pad synth ringan agak misterius: Am9 | Fmaj7(#11) | Dm9 | E7sus4 (satu akor per bar), filter terbuka perlahan
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
CH = [['A', 'C', 'E', 'B'], ['F', 'A', 'C', 'B'], ['D', 'F', 'A', 'E'], ['E', 'A', 'B', 'D']]
def pad(freqs, dur, g, br):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.006, 0.0, 0.006): s += np.sin(2 * np.pi * f * (1 + d) * tt + rng.uniform(0, 6.28))
    s = lp(s, 26 - 3 * br)
    return s / len(freqs) * np.minimum(1, tt / 0.5) * np.clip((dur - tt) / 0.6, 0, 1) * g
nb = int(np.ceil(T / BAR))
for b in range(nb):
    ch = CH[b % 4]; fr = [NOTE[c] * (0.5 if i == 0 else 1) for i, c in enumerate(ch)]
    add(mus, b * BAR, pad(fr, BAR + 0.5, 0.20 + 0.03 * min(b, 4), min(b, 4)))
# ---- arpeggio synth jarang (pluck sinus + harmonik), dua nada per bar, memberi ruang untuk momen peralihan
def pluck(f, g):
    n = int(0.5 * sr); tt = np.arange(n) / sr; s = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.05)
    return s * env(n, 0.004, 0.15) * g
for b in range(1, nb):
    ch = CH[b % 4]
    for j, c in ((1, 2), (3, 3), (5, 1), (7, 2)):
        x = b * BAR + j * B / 2
        if x > T - 1.4: break
        sg = pluck(NOTE[ch[c]] * 4, 0.07); add(mus, x, sg); add(mus, x + 0.75 * B, sg, 0.3)
# ---- riser tipis sebelum penutup dan akor penutup
rb = edl['outro']['at']; n = int(0.9 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); add(mus, rb - 0.9, lp(nz, 6) * (tt / 0.9) ** 2.2, 0.25)
add(mus, rb, pad([NOTE['A'] / 2, NOTE['E'], NOTE['A'], NOTE['C'] * 2], T - rb + 0.3, 0.3, 4))
# ---- efek ----
def swap(g=1.0):      # bunyi khas pergantian skenario: tiga nada naik (G6-C7-E7) bergelombang persegi lembut, ekor berkilau
    s = np.zeros(int(0.7 * sr))
    for i, f in enumerate((1568, 2093, 2637)):
        n = int(0.16 * sr); tt = np.arange(n) / sr; ph = np.cumsum(f * np.ones(n)) / sr
        w = (np.sign(np.sin(2 * np.pi * ph)) * 0.25 + np.sin(2 * np.pi * ph) * 0.55) * env(n, 0.001, 0.05 + 0.02 * i) * (0.9 if i < 2 else 1.1)
        s[int(i * 0.045 * sr):int(i * 0.045 * sr) + n] += lp(w, 2)
    nt = int(0.5 * sr); tt = np.arange(nt) / sr; s[int(0.11 * sr):int(0.11 * sr) + nt] += np.sin(2 * np.pi * 3951 * tt) * env(nt, 0.002, 0.12) * 0.22
    return s * 0.6 * g
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
KIND = {'swap': swap, 'blip': blip, 'sparkle': sparkle, 'chime': chime}
duck = np.ones(N); last = -9
for tx, kind in edl['sfx']:
    assert tx - last > 0.24, 'efek bertumpuk di %.2f' % tx; last = tx
    add(sfx, tx, KIND[kind]())
    i = int(tx * sr); m = min(N, i + int(0.5 * sr)); lo = max(0, i - int((0.13 if kind == 'swap' else 0.02) * sr))
    duck[lo:m] = np.minimum(duck[lo:m], 0.5 if kind == 'swap' else 0.68)     # ruang sebelum dan sesudah momen perubahan skenario
duck = lp(duck, int(0.04 * sr)); mus *= duck
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.1 - t) / 0.9, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.13; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.30
mix = mu + fx; pk = np.abs(mix).max(); print('puncak', round(float(pk), 3)); mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 2), 'dtk', BPM, 'BPM')
