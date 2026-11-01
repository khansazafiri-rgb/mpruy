"""Desain suara "Kenapa kopi bikin kita nggak ngantuk?": penasaran di awal (pluk marimba ringan), eksploratif saat masuk tubuh (pad lembut + gelembung kecil),
hening sejenak saat pertanyaan "tidak butuh tidur?", lalu makin tenang saat membahas istirahat. Efek sangat hemat.
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
BPM = 100; beat = 60 / BPM; bar = 4 * beat
CHORDS = {'F': [53, 57, 60, 64], 'Dm': [50, 53, 57, 60], 'Bb': [58, 62, 65, 69], 'C': [48, 52, 55, 59], 'Am': [57, 60, 64, 67], 'G': [55, 59, 62, 66], 'Em': [52, 55, 59, 62]}
# bagian: (awal, akhir, akor, kepadatan nada, volume pad, kecepatan arpeggio)
SECT = [(-0.6, 7.0, ['C', 'F', 'G', 'C'], 0.55, 0.45, 100),
        (7.0, 26.2, ['Am', 'F', 'C', 'G'], 0.30, 0.55, 80),          # masuk otak: eksploratif
        (26.2, 35.4, ['F', 'G', 'Am', 'F'], 0.45, 0.55, 90),         # perjalanan kafein
        (35.4, 46.6, ['F', 'C', 'Dm', 'Bb'], 0.5, 0.6, 96),          # mekanisme: lebih cerah
        (46.6, 50.9, ['F', 'C', 'F', 'C'], 0.4, 0.55, 90),
        (50.9, 56.4, ['Dm'], 0.0, 0.0, 60),                          # berhenti sejenak (suasana berubah)
        (56.4, 62.4, ['Dm', 'Bb', 'F', 'C'], 0.18, 0.5, 70),
        (62.4, 74.6, ['F', 'C', 'Am', 'G'], 0.25, 0.45, 80),         # penelitian: ringan, rapi
        (74.6, 82.7, ['F', 'Am', 'Dm', 'C'], 0.08, 0.5, 60),         # istirahat: paling tenang
        (82.7, END + 0.5, ['F', 'C', 'G', 'F'], 0.5, 0.75, 84)]
def sect_at(a):
    for s in SECT:
        if s[0] <= a < s[1]: return s
    return None
a = -0.6; bi = 0
while a < END:
    s = sect_at(a)
    if s is None: a += bar; continue
    bt = 60.0 / s[5] * 1.0
    br = 4 * bt
    ch = CHORDS[s[2][bi % len(s[2])]]
    fade = float(np.clip((END - 0.2 - a) / 2.0, 0, 1)) * float(np.clip((a + 1.2) / 1.0, 0, 1))
    if s[4] > 0:
        n = int(br * 1.3 * SR); t = np.arange(n) / SR; pad = np.zeros(n)
        for k, m in enumerate(ch):
            f = midi(m + 12); pad += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t + k) + 0.18 * np.sin(2 * np.pi * f * 2 * t)
        add(music, pad * np.minimum(t / 0.9, 1) * np.minimum((br * 1.3 - t) / 1.0, 1) * 0.020 * s[4] * fade, a, 1.0)
        for b in (0, 2):
            nb = int(bt * 2 * SR); tb = np.arange(nb) / SR
            add(music, np.sin(2 * np.pi * midi(ch[0] - 12) * tb) * np.exp(-tb / 0.9) * 0.08 * s[4] * fade, a + b * bt, 1.0)
        for k in range(8):
            if rng.random() < s[3] * (1.0 if k % 2 == 0 else 0.7):
                m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 24
                add(music, marimba(m, 0.7) * 0.07 * fade, a + k * bt / 2, 1.0, pan=(-0.25 if k % 2 else 0.25))
    a += br; bi += 1
# gema rendah menahan selama jeda "tubuhmu sudah tidak butuh tidur?"
nd = int(6.0 * SR); td = np.arange(nd) / SR
add(music, (np.sin(2 * np.pi * 55 * td) + 0.6 * np.sin(2 * np.pi * 58.3 * td)) * np.minimum(td / 1.2, 1) * np.minimum((6.0 - td) / 1.2, 1), 50.8, 0.06)

# ===== SFX hemat =====
# pembuka: minum kopi, mata terbuka
for k in range(3): add(sfx, glug(), 1.55 + k * 0.28, 0.10)
add(sfx, chime([1318, 1760], 0.9, 0.35), 2.7, 0.07)
add(sfx, whoosh(0.9, 400, 2600, 2), 5.4, 0.08)                         # kamera masuk ke dalam tubuh
add(sfx, chime([784, 1175], 1.4, 0.6), 7.5, 0.05)
# adenosin menempel pada reseptor (bloop lembut) dan gauge naik
for a0 in [8.85, 10.6, 13.7, 17.9, 21.4]: add(sfx, bloop(480), a0, 0.10)
for a0 in [7.5, 12.12, 16.3, 20.95]: add(sfx, pop(), a0, 0.09)       # chip
# minum kopi lagi, masuk ke dalam kopi dan perjalanan
for k in range(2): add(sfx, glug(), 27.2 + k * 0.3, 0.09)
add(sfx, whoosh(0.8, 300, 2200, 2), 28.0, 0.08)
for a0, w in [(30.2, 0.8), (31.1, 0.8), (31.55, 0.5), (32.2, 0.7), (34.6, 0.9)]: add(sfx, whoosh(w, 300, 2400, 2), a0, 0.07)
for a0 in [28.3, 30.4, 31.8, 33.2]: add(sfx, pop(), a0, 0.10)
add(sfx, chime([659, 988], 1.2, 0.5), 33.3, 0.06)
# kafein menempel (klik), adenosin terpental (boing), sinyal berkurang
for a0 in [37.2, 37.7, 38.2]: add(sfx, tick(1500), a0, 0.12); add(sfx, bloop(700), a0, 0.06)
for a0 in [39.35, 40.05, 40.65]: add(sfx, sine_sweep(0.22, 380, 140, 0.08), a0, 0.10); add(sfx, thump(110, 1.0), a0, 0.07)
add(sfx, pop(), 38.65, 0.10)
add(sfx, chime([659, 784, 988], 1.6, 0.7), 46.65, 0.06)               # lebih terjaga
# perubahan suasana: pertanyaan
add(sfx, sine_sweep(0.8, 520, 180, 0.5), 50.9, 0.05)
add(sfx, tick(900), 52.5, 0.08); add(sfx, tick(900), 53.5, 0.08)
add(sfx, chime([392, 466], 1.2, 0.7), 54.7, 0.05)
add(sfx, pop(), 51.55, 0.10)
add(sfx, chime([784, 988], 1.4, 0.6), 56.55, 0.05)
add(sfx, pop(), 60.2, 0.10)
# penelitian: hitungan titik, pemisahan, kapsul, hasil
a = 62.5
while a < 65.0: add(sfx, tick(1900), a, 0.05); a += 0.07
for a0 in [65.5, 66.95, 68.25]: add(sfx, pop(), a0, 0.10)
add(sfx, chime([784, 1175], 1.0, 0.4), 68.3, 0.07)
add(sfx, tick(900), 70.35, 0.10); add(sfx, pop(), 70.02, 0.09)
# penutup kamar: lampu mati, laptop menutup
add(sfx, tick(500) * 1.3, 80.9, 0.20)
add(sfx, chime([523, 659, 784], 2.2, 1.0), 81.3, 0.05)
# kartu MEDCOEL
add(sfx, chime([784, 988, 1175], 2.2, 0.9), 82.7, 0.08)
for a0 in [84.85, 86.55]: add(sfx, pop(), a0, 0.07)
add(sfx, chime([1568, 2093], 1.0, 0.5), 86.7, 0.03)
add(sfx, chime([784, 988, 1175, 1568], 2.6, 1.0), 89.4, 0.07)
for name, buf in ((sys.argv[2], music), (sys.argv[3], sfx)):
    b = buf[: int(total * SR)]; b = b / max(1e-6, np.abs(b).max()) * 0.8
    w = wave.open(name, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.tanh(b) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
