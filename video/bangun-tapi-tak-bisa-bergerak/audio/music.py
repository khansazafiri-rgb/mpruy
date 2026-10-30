"""Desain suara "Bangun, tapi tak bisa bergerak": suasana tipis dan sunyi saat misteri (detak jam, napas, detak jantung yang naik),
berhenti mendadak saat pertanyaan, lalu musik tenang. Murni sintesis numpy. Pemakaian: python3 music.py data.json music.wav sfx.wav"""
import json, sys, wave, numpy as np
SR = 44100
data = json.load(open(sys.argv[1])); total = data['total']; LEAD = data['lead']
N = int((total + 1) * SR)
rng = np.random.default_rng(11)
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
def breath(dur, fc, gain=1.0):
    x = lp_noise(dur, fc, fc * 1.4); n = len(x); t = np.arange(n) / SR
    return x * np.sin(np.pi * t / dur) ** 2 * gain
# ===== AMBIEN KAMAR (sunyi: jarang, tipis) =====
tk = 0.0 - LEAD + 0.05
while tk < 24.2:
    gap = 1.0
    if 10.3 < tk < 11.75: gap = 0.0  # hening di "Tidak bisa"
    elif 15.6 < tk < 18.5: gap = 1.8
    if gap: add(sfx, tick(1800 if gap == 1.0 else 1250), tk, 0.10 if gap == 1.0 else 0.15, pan=-0.35)
    tk += 1.0 if gap in (0.0, 1.0) else gap
# napas tokoh (tenang di awal)
for i, a0 in enumerate(np.arange(-0.4, 7.6, 3.5)):
    add(sfx, breath(1.5, 900, 0.5), a0, 0.16); add(sfx, breath(1.9, 700, 0.5), a0 + 1.6, 0.14)
# detak jantung: mulai pelan, makin cepat dan kuat, berhenti mendadak di 24.3
a = 8.2
while a < 24.3:
    bpm = float(np.interp(a, [8.2, 16, 20, 24.3], [62, 74, 92, 108])); k = float(np.interp(a, [8.2, 14, 20, 24.3], [0.10, 0.2, 0.34, 0.5]))
    add(sfx, thump(70, 1.0), a, k); add(sfx, thump(58, 0.7), a + 0.19, k * 0.7)
    a += 60.0 / bpm
# gema rendah menekan (hanya frekuensi rendah), naik pelan lalu putus mendadak
nd = int(7.0 * SR); td = np.arange(nd) / SR
drone = (np.sin(2 * np.pi * 55 * td) + np.sin(2 * np.pi * 58.3 * td) + 0.3 * np.sin(2 * np.pi * 110 * td + 1)) * np.minimum(td / 6.0, 1) ** 2
add(music, drone, 17.3, 0.07)
# suara jauh dan derit (sangat jarang)
add(sfx, lp_noise(1.4, 380, 220) * np.sin(np.linspace(0, np.pi, int(1.4 * SR))) , 8.7, 0.07, pan=0.5)
add(sfx, lp_noise(1.6, 420, 260) * np.sin(np.linspace(0, np.pi, int(1.6 * SR))), 13.0, 0.06, pan=-0.4)
cr = sine_sweep(0.7, 150, 95, 0.25, 0.04) + 0.25 * lp_noise(0.7, 900)[: int(0.7 * SR)]
add(sfx, cr * 0.7, 19.5, 0.07, pan=-0.6)
# kedip (transisi ke pandangan tokoh) dan pembuka mata
add(sfx, breath(0.5, 1400, 1.0), 2.4, 0.12)
add(sfx, tick(900), 2.88, 0.10)
# ===== PERALIHAN: ke penjelasan =====
add(sfx, lp_noise(0.8, 300, 2800) * np.sin(np.linspace(0, np.pi, int(0.8 * SR))) ** 2, 26.2, 0.07)
add(sfx, chime([784, 1175], 1.6, 0.8), 26.85, 0.10)
# ===== MUSIK TENANG (setelah pertanyaan) =====
BPM = 66; beat = 60 / BPM; bar = 4 * beat
CH = {'F': [53, 57, 60, 64], 'Dm': [50, 53, 57, 60], 'Bb': [58, 62, 65, 69], 'C': [48, 52, 55, 59], 'Am': [57, 60, 64, 67], 'G': [55, 59, 62, 66]}
SECT = [(26.8, 57.4, ['F', 'Dm', 'Bb', 'C'], 0.18, 0.55), (57.4, 64.6, ['F', 'Am', 'Dm', 'C'], 0.30, 0.6), (64.6, 80.0, ['F', 'C', 'Dm', 'Bb'], 0.42, 0.7),
        (80.0, total - LEAD + 0.5, ['F', 'C', 'G', 'F'], 0.62, 0.8)]
def sect_at(a):
    for s in SECT:
        if s[0] <= a < s[1]: return s
    return None
a = 26.8; bi = 0
while a < total - LEAD:
    s = sect_at(a)
    if s is None: a += bar; continue
    ch = CH[s[2][bi % len(s[2])]]
    n = int(bar * 1.3 * SR); t = np.arange(n) / SR; pad = np.zeros(n)
    for k, m in enumerate(ch):
        f = midi(m + 12); pad += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t + k) + 0.18 * np.sin(2 * np.pi * f * 2 * t)
    fade = float(np.clip((total - LEAD - 0.2 - a) / 2.0, 0, 1))
    add(music, pad * np.minimum(t / 1.0, 1) * np.minimum((bar * 1.3 - t) / 1.1, 1) * 0.020 * s[4] * fade, a, 1.0)
    for b in (0, 2):
        nb = int(beat * 2 * SR); tb = np.arange(nb) / SR
        add(music, np.sin(2 * np.pi * midi(ch[0] - 12) * tb) * np.exp(-tb / 0.9) * 0.08 * s[4] * fade, a + b * beat, 1.0)
    for k in range(8):
        if rng.random() < s[3] * (1.0 if k % 2 == 0 else 0.7):
            m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 24; nn = int(1.2 * SR); tn = np.arange(nn) / SR; f = midi(m)
            x = np.sin(2 * np.pi * f * tn + 0.8 * np.sin(2 * np.pi * f * 2 * tn) * np.exp(-tn / 0.12)) * np.exp(-tn / 0.4)
            add(music, x * 0.05 * fade, a + k * beat / 2, 1.0, pan=(-0.25 if k % 2 else 0.25))
    a += bar; bi += 1
# ===== SFX adegan =====
for a0 in [27.0, 29.5, 32.4, 34.8, 38.9, 47.3, 51.0, 55.25]: add(sfx, pop(), a0, 0.12)
add(sfx, chime([392, 587], 1.2, 0.5), 32.0, 0.06)             # kunci otot
add(sfx, chime([1318, 1760], 1.0, 0.4), 32.32, 0.05)          # kesadaran muncul
add(sfx, chime([659, 988], 1.6, 0.7), 42.62, 0.06)             # istilah
# bangun kembali: jari bergerak, hembusan lega, lampu menyala
for a0 in [58.6, 59.9]: add(sfx, tick(1100), a0, 0.18); add(sfx, tick(1500), a0 + 0.07, 0.12)
add(sfx, breath(1.8, 900, 1.0), 64.3, 0.05)
add(sfx, tick(700) * 1.4, 64.72, 0.30); add(sfx, chime([784, 1046], 1.8, 0.8), 64.8, 0.07)
for a0, g in [(66.9, 0.12), (69.0, 0.12), (70.4, 0.12)]: add(sfx, pop(), a0, g)
add(sfx, chime([1318, 1760], 0.8, 0.3), 75.8, 0.05)               # penasaran
# penutup MEDCOEL
add(sfx, chime([784, 988, 1175], 2.2, 0.9), 79.95, 0.08)
for a0 in [80.35, 84.75, 88.07]: add(sfx, pop(), a0, 0.12)
add(sfx, chime([1568, 2093], 1.0, 0.5), 88.25, 0.05)
add(sfx, chime([784, 988, 1175, 1568], 2.6, 1.0), 90.8, 0.12)
for name, buf in ((sys.argv[2], music), (sys.argv[3], sfx)):
    b = buf[: int(total * SR)]; b = b / max(1e-6, np.abs(b).max()) * 0.8
    w = wave.open(name, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.tanh(b) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
