"""Desain suara "Kenapa dingin bikin pengen pipis?": musik ringan dan jenaka (marimba, bas pluk, tik-tik gigi menggigil), efek hemat
(hembusan AC tipis, tetes air, langkah cepat). Murni sintesis numpy.
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

def hiss(dur, fc0, fc1):
    return whoosh(dur, fc0, fc1, 1)
def pluck(m, dur=0.35):
    f = midi(m); n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.1)) * np.exp(-t / 0.12) * np.minimum(t / 0.002, 1)
def drop(f=900, dur=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f * (1 + 1.2 * np.exp(-t / 0.03))) * t) * np.exp(-t / 0.05) * np.minimum(t / 0.002, 1)
BPM = 108; beat = 60 / BPM; bar = 4 * beat
CHORDS = {'C': [48, 52, 55, 59], 'G': [43, 50, 55, 59], 'Am': [45, 52, 57, 60], 'F': [41, 48, 53, 57], 'Dm': [50, 53, 57, 60], 'Em': [52, 55, 59, 62], 'Bb': [46, 50, 53, 58]}
# bagian: (awal, akhir, akor, kepadatan melodi, volume pad, bas pluk 0/1)
SECT = [(-0.6, 10.1, ['C', 'G', 'Am', 'F'], 0.62, 0.35, 1),            # kelas: jenaka
        (10.1, 13.9, ['Am', 'Dm', 'Em', 'F'], 0.25, 0.45, 0),          # pertanyaan: penasaran
        (13.9, 17.4, ['C', 'F', 'G', 'C'], 0.7, 0.4, 1),               # Kori mengajak masuk
        (17.4, 36.8, ['Am', 'F', 'C', 'G'], 0.30, 0.55, 0),            # menyelami tubuh
        (36.8, 54.2, ['C', 'Em', 'F', 'G'], 0.42, 0.5, 1),             # ginjal: ringan
        (54.2, 60.7, ['C', 'F', 'C', 'G'], 0.5, 0.4, 1),
        (61.6, 71.6, ['F', 'C', 'Dm', 'Bb'], 0.35, 0.45, 1),           # faktor lain
        (71.7, 78.1, ['Am', 'Dm', 'Am', 'Em'], 0.10, 0.6, 0),          # peringatan: tenang
        (78.2, 82.0, ['C', 'G', 'Am', 'F'], 0.8, 0.3, 1),              # lari ke toilet: cepat
        (82.0, END + 0.5, ['C', 'G', 'F', 'C'], 0.55, 0.65, 1)]        # penutup
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
    spd = 1.0 if s[0] < 78.2 or s[0] >= 82.0 else 1.25
    br = bar / spd; bt = beat / spd
    n = int(br * 1.2 * SR); t = np.arange(n) / SR; pad = np.zeros(n)
    for k, m in enumerate(ch):
        f = midi(m + 12); pad += np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.004 * t + k) + 0.15 * np.sin(2 * np.pi * f * 2 * t)
    add(music, pad * np.minimum(t / 0.5, 1) * np.minimum((br * 1.2 - t) / 0.8, 1) * 0.020 * s[4] * fade, a, 1.0)
    if s[5]:
        for b in range(4): add(music, pluck(ch[0] if b % 2 == 0 else ch[0] + 7, 0.3) * 0.18 * fade, a + b * bt, 1.0)
        for b in range(8): add(music, tick(5200) * 0.12 * fade, a + b * bt / 2, 1.0, pan=0.3)      # shaker
    for k in range(8):
        if rng.random() < s[3] * (1.0 if k % 2 == 0 else 0.7):
            m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 24
            add(music, marimba(m, 0.5) * 0.08 * fade, a + k * bt / 2, 1.0, pan=(-0.25 if k % 2 else 0.25))
    a += br; bi += 1

# ===== SFX hemat =====
# kelas: hembusan AC tipis, gigi gemeletuk (tik cepat), pandangan ke toilet
add(sfx, hiss(3.6, 900, 2600) * 0.5, 0.1, 0.05)
for g0 in [(0.4, 1.3), (1.9, 2.6), (6.0, 6.9)]:
    a0 = g0[0]
    while a0 < g0[1]: add(sfx, tick(2400), a0, 0.07); a0 += 0.065
add(sfx, chime([1318, 1760], 0.6, 0.25), 3.05, 0.06)
add(sfx, hiss(2.0, 700, 3000) * 0.6, 3.9, 0.07)                       # AC dekat
add(sfx, sine_sweep(0.4, 300, 1200, 0.2), 8.6, 0.05)                  # mencari toilet
add(sfx, chime([784, 988], 0.8, 0.3), 9.0, 0.05)
add(sfx, chime([392, 466], 1.0, 0.5), 10.4, 0.05)                    # pertanyaan
# Kori: lompat, boing, portal
add(sfx, sine_sweep(0.3, 220, 700, 0.12), 13.95, 0.12)
add(sfx, chime([988, 1318, 1760], 1.2, 0.4), 14.5, 0.06)
add(sfx, whoosh(0.9, 400, 3200, 2), 15.9, 0.12)
# di dalam tubuh
for a0 in [17.7, 23.1, 27.8, 31.8, 34.8, 36.9]: add(sfx, pop(), a0, 0.09)
add(sfx, whoosh(0.7, 500, 2200, 1), 23.4, 0.05)
for a0 in [31.5, 36.75]: add(sfx, whoosh(0.6, 300, 1800, 2), a0, 0.06)
a = 40.8
while a < 43.6: add(sfx, drop(1100 + 200 * rng.random()), a, 0.06); a += 0.33
a = 44.2
while a < 51.0: add(sfx, drop(700 + 100 * rng.random(), 0.2), a, 0.07); a += float(np.interp(a, [44.2, 51.0], [0.7, 0.18]))
add(sfx, chime([659, 988, 1318], 1.2, 0.5), 51.25, 0.07)             # label "diuresis akibat dingin"
add(sfx, whoosh(0.5, 400, 2400, 1), 54.2, 0.07)
add(sfx, sine_sweep(0.35, 500, 120, 0.15), 60.85, 0.06)               # "Tapi tunggu"
add(sfx, chime([784, 1175], 1.0, 0.4), 62.0, 0.05)
for a0 in [61.8, 65.55, 67.1, 67.95, 68.8]: add(sfx, pop(), a0, 0.09)
add(sfx, chime([440, 523], 1.2, 0.6), 72.0, 0.04)                     # peringatan: tenang
for a0 in [73.2, 74.85, 76.15]: add(sfx, pop(), a0, 0.08)
a = 78.4
while a < 81.2: add(sfx, tick(420) * 1.2, a, 0.16, pan=0.2 * (1 if int(a * 8) % 2 else -1)); a += 0.19      # langkah cepat
add(sfx, sine_sweep(0.5, 180, 130, 0.3), 80.9, 0.06)                  # pintu terbuka
add(sfx, chime([784, 988, 1175], 2.0, 0.9), 82.0, 0.08)
for a0 in [82.5, 83.2]: add(sfx, pop(), a0, 0.09)
add(sfx, chime([784, 988, 1175, 1568], 2.6, 1.0), 84.6, 0.08)
for name, buf in ((sys.argv[2], music), (sys.argv[3], sfx)):
    b = buf[: int(total * SR)]; b = b / max(1e-6, np.abs(b).max()) * 0.8
    w = wave.open(name, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.tanh(b) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
