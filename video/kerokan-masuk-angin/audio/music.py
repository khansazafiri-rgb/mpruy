"""Desain suara "Kerokan bisa menyembuhkan masuk angin?": musik ringan dan hangat (marimba, bas pluk), efek hemat
(koin menggesek, kaget, transisi masuk ke kulit, ding saat merah, pop kartu). Murni sintesis numpy.
Murni sintesis numpy. Pemakaian: python3 music.py data.json music.wav sfx.wav"""
import json, sys, wave, numpy as np
SR = 44100
data = json.load(open(sys.argv[1])); total = data['total']; LEAD = data['lead']
N = int((total + 1) * SR)
rng = np.random.default_rng(23)
def midi(n): return 440 * 2 ** ((n - 69) / 12)
def add(buf, x, a, gain=1.0, pan=0.0):  # a = waktu audio narator; video = a + LEAD
    i = int((a + LEAD) * SR)
    if i >= len(buf) or i < 0: return
    x = x[: len(buf) - i]
    buf[i:i + len(x), 0] += x * gain * (1 - max(pan, 0)); buf[i:i + len(x), 1] += x * gain * (1 + min(pan, 0))
music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
def lp_noise(dur, fc0, fc1=None):
    n = int(dur * SR); x = rng.standard_normal(n); fc1 = fc1 or fc0
    fc = np.linspace(fc0, fc1, n); al = 1 - np.exp(-2 * np.pi * fc / SR); y = 0.0; out = np.zeros(n)
    for i in range(n): y += al[i] * (x[i] - y); out[i] = y
    return out
def sine_sweep(dur, f0, f1, decay, att=0.003):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay) * np.minimum(t / att, 1)
def chime(freqs, dur=1.0, decay=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / (decay * (1 - 0.08 * i))) for i, f in enumerate(freqs)) / len(freqs) * np.minimum(t / 0.004, 1)
def pop(): return sine_sweep(0.14, 420, 880, 0.05, 0.004)
def tick(f=1900):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + 0.5 * rng.standard_normal(n) * np.exp(-t / 0.003)) * 0.9
def thump(f=70, k=1.0):
    n = int(0.28 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f * (1 + 0.5 * np.exp(-t / 0.03))) * t) * np.exp(-t / 0.075)
    x += 0.5 * np.sin(2 * np.pi * 2.6 * f * t) * np.exp(-t / 0.035)  # harmonik agar terdengar di speaker ponsel
    return x * k
def beep(f=1040, dur=0.11):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.minimum(t / 0.004, 1) * np.minimum((dur - t) / 0.02, 1) * 0.9
def whoosh(dur, f0, f1, shape=2):
    x = lp_noise(dur, f0, f1); return x * np.sin(np.linspace(0, np.pi, len(x))) ** shape
def bump(): return thump(95, 1.0) + 0.5 * lp_noise(0.28, 700)[: int(0.28 * SR)] * np.exp(-np.arange(int(0.28 * SR)) / SR / 0.05)
END = total - LEAD


def bloop(f=520, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f * (1 + 0.8 * np.exp(-t / 0.05))) * t) * np.exp(-t / 0.07) * np.minimum(t / 0.004, 1)
def marimba(m, dur=0.5):
    f = midi(m); n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.16) * np.minimum(t / 0.003, 1)
def glug(dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (200 + 120 * np.sin(2 * np.pi * 7 * t)) * t) * np.exp(-t / 0.18) * np.minimum(t / 0.01, 1)

import os
def marimba(m, dur=0.5):
    f = midi(m); n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.16) * np.minimum(t / 0.003, 1)
def pluck(m, dur=0.35):
    f = midi(m); n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.1)) * np.exp(-t / 0.12) * np.minimum(t / 0.002, 1)
def boop(f=200, dur=0.28):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f * (1 - 0.35 * t / dur)) * t) * np.exp(-t / 0.12) * np.minimum(t / 0.004, 1)
BPM = 108; beat = 60 / BPM; bar = 4 * beat
CHORDS = {'C': [48, 52, 55, 59], 'G': [43, 50, 55, 59], 'Am': [45, 52, 57, 60], 'F': [41, 48, 53, 57], 'Dm': [50, 53, 57, 60], 'Em': [52, 55, 59, 62]}
SECT = [(-0.6, 4.9, ['C', 'F', 'C', 'G'], 0.45, 0.35, 1),         # kerokan dan cermin: ringan, jenaka
        (4.9, 8.1, ['F', 'C', 'G', 'C'], 0.25, 0.5, 0),           # hangat dan tenang
        (8.1, 25.8, ['Am', 'F', 'C', 'G'], 0.4, 0.45, 1),         # penasaran, masuk ke kulit
        (25.8, 44.5, ['C', 'G', 'Am', 'F'], 0.5, 0.45, 1),        # penjelasan
        (44.5, 64.7, ['F', 'G', 'C', 'Am'], 0.35, 0.45, 1),       # masuk angin dan keluhan
        (64.7, 70.0, ['C', 'G', 'F', 'C'], 0.5, 0.5, 1),          # kesimpulan
        (70.0, END + 0.5, ['C', 'G', 'F', 'C'], 0.55, 0.65, 1)]   # penutup
def sect_at(a):
    for s in SECT:
        if s[0] <= a < s[1]: return s
    return None
a = -0.6; bi = 0
while a < END:
    s = sect_at(a)
    if s is None: a += beat * 2; continue
    ch = CHORDS[s[2][bi % len(s[2])]]
    fade = float(np.clip((END - 0.2 - a) / 2.0, 0, 1)) * float(np.clip((a + 1.2) / 1.0, 0, 1))
    n = int(bar * 1.2 * SR); t = np.arange(n) / SR; pad = np.zeros(n)
    for k, m in enumerate(ch):
        f = midi(m + 12); pad += np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.004 * t + k) + 0.15 * np.sin(2 * np.pi * f * 2 * t)
    add(music, pad * np.minimum(t / 0.5, 1) * np.minimum((bar * 1.2 - t) / 0.8, 1) * 0.020 * s[4] * fade, a, 1.0)
    if s[5]:
        for b in range(4): add(music, pluck(ch[0] if b % 2 == 0 else ch[0] + 7, 0.3) * 0.18 * fade, a + b * beat, 1.0)
        for b in range(8): add(music, tick(5200) * 0.10 * fade, a + b * beat / 2, 1.0, pan=0.3)
    for k in range(8):
        if rng.random() < s[3] * (1.0 if k % 2 == 0 else 0.7):
            add(music, marimba(ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 24, 0.5) * 0.08 * fade, a + k * beat / 2, 1.0, pan=(-0.25 if k % 2 else 0.25))
    a += bar; bi += 1

# ===== SFX hemat =====
def scratch(dur=0.3):   # gesekan koin di kulit: desis halus
    x = lp_noise(dur, 2600, 1800); return x * np.sin(np.linspace(0, np.pi, len(x))) ** 1.5
for i in range(5): add(sfx, scratch(0.32), -0.25 + i * 0.5, 0.05, pan=0.2)       # lima goresan koin
add(sfx, tick(1700), -0.25, 0.07)
add(sfx, sine_sweep(0.35, 500, 1400, 0.12), 2.82, 0.12)                          # kaget melihat cermin
add(sfx, boop(260), 3.1, 0.07)
add(sfx, whoosh(0.35, 500, 2400, 1), 4.78, 0.07)                                  # potong ke sofa
add(sfx, chime([784, 988], 0.9, 0.35), 5.5, 0.04)                                 # hangat
add(sfx, pop(), 8.3, 0.09)                                                        # "ANGINNYA KELUAR?"
add(sfx, sine_sweep(0.5, 400, 800, 0.2), 8.45, 0.05)
add(sfx, sine_sweep(0.3, 300, 900, 0.1), 11.7, 0.10)                              # Kori dan kaca pembesar masuk
add(sfx, chime([784, 988, 1318], 1.2, 0.5), 12.1, 0.05)
add(sfx, whoosh(1.2, 400, 3200, 2), 13.0, 0.07)                                   # zoom masuk ke kulit
for i, a0 in enumerate([14.7, 16.25, 17.8]): add(sfx, tick(1500), a0, 0.07)      # koin mulai tiap jalur
add(sfx, bloop(480, 0.3), 17.45, 0.08); add(sfx, bloop(560, 0.3), 18.1, 0.07)   # pembuluh melebar
add(sfx, chime([659, 988], 1.0, 0.4), 19.85, 0.07)                               # kulit terlihat merah
add(sfx, boop(190), 23.5, 0.08)                                                  # bekas seperti memar
for i, a0 in enumerate([26.2, 26.8, 27.4]): add(sfx, pop(), a0, 0.07)            # tiga contoh merah
add(sfx, boop(240), 28.05, 0.09)                                                  # tanda tidak sama dengan
add(sfx, pop(), 28.65, 0.07)
add(sfx, whoosh(0.35, 500, 2400, 1), 30.65, 0.06)
add(sfx, chime([784, 1175], 0.9, 0.4), 31.1, 0.04)
for i, a0 in enumerate([34.75, 35.25, 35.75]): add(sfx, pop(), a0, 0.07)         # kartu perasaan beda-beda
add(sfx, pop(), 38.0, 0.07); add(sfx, boop(240), 39.95, 0.08); add(sfx, pop(), 40.65, 0.07)
add(sfx, pop(), 44.9, 0.08)
for a0 in [49.55, 50.85, 51.55]: add(sfx, pop(), a0, 0.08)                       # tiga keluhan
add(sfx, whoosh(0.4, 500, 2200, 1), 53.3, 0.06)
for a0 in [54.5, 54.85, 55.2]: add(sfx, pop(), a0, 0.06)                          # penyebab berbeda
for a0 in [57.6, 59.1, 60.1]: add(sfx, tick(1100), a0, 0.09)                       # peringatan menetap, berat, mengkhawatirkan
add(sfx, chime([659, 988, 1318], 1.4, 0.5), 62.4, 0.07)                           # periksakan diri
add(sfx, chime([784, 988, 1175], 1.6, 0.6), 65.7, 0.05)
add(sfx, chime([784, 988, 1175], 2.0, 0.9), 69.8, 0.08)                          # kartu akhir
for a0 in [72.0, 73.7]: add(sfx, pop(), a0, 0.10)
add(sfx, chime([784, 988, 1175, 1568], 2.6, 1.0), 75.5, 0.08)
for name, buf in ((sys.argv[2], music), (sys.argv[3], sfx)):
    b = buf[: int(total * SR)]; b = b / max(1e-6, np.abs(b).max()) * 0.8
    w = wave.open(name, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.tanh(b) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
