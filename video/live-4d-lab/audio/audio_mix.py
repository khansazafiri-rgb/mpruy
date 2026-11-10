"""Musik + efek bunyi video "Live 4D Lab", disintesis 100% dari kode (numpy). Tidak memakai sampel, rekaman, atau musik pihak ketiga.
Judul: "MEDCOEL Live 4D Pulse" (musik) dan "MEDCOEL UI Pings" (efek). Penulis: dibuat untuk MEDCOEL dalam sesi ini. Lisensi: CC0 1.0 (domain publik), bebas dipakai komersial/Instagram tanpa atribusi.
Pemakaian:  python3 video/live-4d-lab/audio/audio_mix.py   -> mix.wav (44,1 kHz mono), music.wav, sfx.wav. Waktu efek dibaca dari ../edl.json."""
import os, json, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sr = 44100
edl = json.load(open(os.path.join(HERE, '..', 'edl.json'))); T = edl['total']; N = int(T * sr); t = np.arange(N) / sr
BPM = edl['bpm']; B = 60 / BPM; BAR = B * 4; rng = np.random.default_rng(11)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
# ---- denyut jantung halus (lub-dub) di bass: tiap ketukan
def lub(f, dur, g):
    n = int(dur * sr); tt = np.arange(n) / sr; fr = f * (1 + 0.9 * np.exp(-tt / 0.03)); return np.sin(2 * np.pi * np.cumsum(fr) / sr) * env(n, 0.003, 0.11) * g
for k in range(int(T / B) + 1):
    x = k * B; amp = 0.55 if k < 4 else 0.7
    add(mus, x, lub(52, 0.3, amp)); add(mus, x + 0.34 * B, lub(64, 0.22, amp * 0.55))
# ---- pad bersih sedikit futuristis: Am9 | Fmaj7 | Cmaj7(9) | G6 (satu akor per bar), cutoff naik seiring waktu
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
CH = [['A', 'C', 'E', 'B'], ['F', 'A', 'C', 'E'], ['C', 'E', 'G', 'D'], ['G', 'B', 'D', 'E']]
def pad(freqs, dur, g):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004): s += (2 * ((f * (1 + d) * tt) % 1) - 1) * 0.5 + np.sin(2 * np.pi * f * (1 + d) * tt) * 0.5
    s = lp(s, 18 - 0)  # lowpass lembut
    return s / len(freqs) * np.minimum(1, tt / 0.35) * np.clip((dur - tt) / 0.5, 0, 1) * g
nb = int(np.ceil(T / BAR))
for b in range(nb):
    ch = CH[b % 4]; fr = [NOTE[c] * (1 if c in 'ABCDEFG' else 1) * (0.5 if i == 0 else 1) for i, c in enumerate(ch)]
    add(mus, b * BAR, pad(fr, BAR + 0.4, 0.22 + 0.05 * min(b, 4)))
# ---- arpeggio synth bersih (pluck sinus + harmonik, dengan gema pendek), mulai bar ke-2
def pluck(f, g):
    n = int(0.45 * sr); tt = np.arange(n) / sr; s = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.05) + 0.12 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / 0.03)
    return s * env(n, 0.004, 0.13) * g
ORD = [0, 2, 1, 3, 2, 3, 1, 2]
for b in range(1, nb):
    ch = CH[b % 4]
    for j in range(8):
        x = b * BAR + j * B / 2
        if x > T - 1.2: break
        f = NOTE[ch[ORD[j] % 4]] * (2 if j % 2 == 0 else 4); sig = pluck(f, 0.085)
        add(mus, x, sig); add(mus, x + 0.75 * B, sig, 0.35)       # gema
# ---- hat tipis di ketukan lemah, mulai bar ke-3
def hat(g):
    n = int(0.05 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 3)) * np.exp(-tt / 0.012) * g
for k in range(8, int(T / B)):
    x = k * B + B / 2
    if x < T - 1.5: add(mus, x, hat(0.05))
# ---- riser sebelum outro dan akor penutup
rb = edl['outro']['at']; n = int(0.9 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); riser = lp(nz, 6) * (tt / 0.9) ** 2.2
add(mus, rb - 0.9, riser, 0.28)
add(mus, rb, pad([NOTE['A'] / 2, NOTE['E'], NOTE['A'], NOTE['C'] * 2], T - rb + 0.3, 0.3))
# ---- efek: "ting", "blip" (pixel-ish, pendek), "sparkle", "chime"
def ting(g=1.0):
    n = int(0.55 * sr); tt = np.arange(n) / sr; s = np.sin(2 * np.pi * 1760 * tt) + 0.5 * np.sin(2 * np.pi * 2637 * tt) * np.exp(-tt / 0.12) + 0.25 * np.sin(2 * np.pi * 3520 * tt) * np.exp(-tt / 0.06)
    return s * env(n, 0.002, 0.14) * 0.5 * g
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
KIND = {'ting': ting, 'blip': blip, 'sparkle': sparkle, 'chime': chime}
duck = np.ones(N)
last = -9
for tx, kind in edl['sfx']:
    assert tx - last > 0.24, 'efek bertumpuk di %.2f' % tx; last = tx
    sig = KIND[kind](); add(sfx, tx, sig)
    i = int(tx * sr); m = min(N, i + int(0.45 * sr)); duck[max(0, i - int(0.02 * sr)):m] = np.minimum(duck[max(0, i - int(0.02 * sr)):m], 0.62)
duck = lp(duck, int(0.05 * sr)); mus *= duck
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.1 - t) / 0.9, 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.13; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.30
mix = mu + fx; pk = np.abs(mix).max(); print('puncak', round(float(pk), 3)); mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 2), 'dtk', BPM, 'BPM')
