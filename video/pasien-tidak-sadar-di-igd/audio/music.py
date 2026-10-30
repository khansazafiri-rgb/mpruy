"""Desain suara "Pasien tidak sadar di IGD": pembuka tegang tapi tipis (detak jantung pendek, roda ranjang, ambien IGD, pintu),
bilik IGD dengan bip monitor lembut dan gema rendah, lalu musik yang makin tenang dan hangat setelah pertanyaan anak. Tanpa sirene.
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

# ===== PEMBUKA (0 - 9 dtk): pandangan pasien di ranjang yang didorong =====
# ambien IGD: dengung ruang yang sangat tipis, hanya frekuensi rendah-menengah
nr = int((9.5 + LEAD) * SR); room = lp_noise(9.5 + LEAD, 220, 320) * np.linspace(0.4, 1.0, nr)
add(sfx, room, -LEAD, 0.09)
# roda ranjang: dengung gelinding dan klik per putaran, makin cepat lalu berhenti di pintu
def travel(a): return float(np.interp(a, [1.1, 2.2, 7.2, 8.6], [0, 3.4, 3.6, 1.0]))
a = 1.4
while a < 8.9:
    sp = float(np.interp(a, [1.4, 2.4, 7.2, 8.9], [0.3, 1.0, 1.0, 0.3]))
    add(sfx, tick(480) * 0.8, a, 0.10 * sp, pan=-0.3); a += 0.62 - 0.22 * sp
nrm = int(7.6 * SR); roll = lp_noise(7.6, 140, 210) * np.sin(np.linspace(0, np.pi, nrm)) ** 0.7
add(sfx, roll, 1.3, 0.12)
for b in [1.9, 2.8, 4.1, 6.9, 7.8]: add(sfx, bump(), b, 0.16)
# detak jantung pendek, hanya di pembuka: mulai pelan, makin cepat, lalu lenyap saat pandangan gelap
a = 0.5
while a < 8.9:
    bpm = float(np.interp(a, [0.5, 4, 8.9], [66, 82, 98])); k = float(np.interp(a, [0.5, 3, 7.5, 8.9], [0.0, 0.22, 0.36, 0.0]))
    add(sfx, thump(66, 1.0), a, k); add(sfx, thump(56, 0.7), a + 0.2, k * 0.7); a += 60.0 / bpm
# kedip membuka mata, wajah muncul, pintu
add(sfx, whoosh(0.5, 900, 1800), 0.7, 0.06)
for a0 in [2.35, 3.05, 4.1]: add(sfx, whoosh(0.5, 500, 1400, 1), a0, 0.05, pan=-0.3)
add(sfx, whoosh(1.3, 300, 2600, 2), 7.2, 0.12)                    # pintu terbuka dan lampu koridor
add(sfx, whoosh(0.9, 2400, 200, 1), 8.1, 0.08)                     # pandangan gelap
add(sfx, tick(250) * 1.5, 8.95, 0.10)
# musik tegang tipis: gema rendah naik pelan dari awal, selaras monitor
nd = int(13.0 * SR); td = np.arange(nd) / SR
drone = (np.sin(2 * np.pi * 55 * td) + np.sin(2 * np.pi * 58.3 * td) + 0.3 * np.sin(2 * np.pi * 110 * td + 1)) * np.minimum(td / 5.0, 1) ** 2 * np.minimum((13.0 - td) / 1.5, 1)
add(music, drone, 0.5, 0.10)

# ===== BILIK IGD (9 - 22 dtk): bip monitor lembut, makin sigap saat "gawat" =====
a = 9.4; per = 0.9
while a < 21.8:
    per = float(np.interp(a, [9.4, 13.7, 14.4, 17.2, 18.6], [0.95, 0.95, 0.62, 0.62, 0.85]))
    g = float(np.interp(a, [9.4, 13.7, 14.4, 17.2], [0.06, 0.06, 0.10, 0.10]))
    add(sfx, beep(1040), a, g, pan=-0.35); a += per
for a0 in [9.35, 18.6]: add(sfx, whoosh(0.6, 400, 1500, 1), a0, 0.05)
nd = int(9.0 * SR); td = np.arange(nd) / SR
drone2 = (np.sin(2 * np.pi * 61.7 * td) + np.sin(2 * np.pi * 92.5 * td) * 0.5 + np.sin(2 * np.pi * 123.5 * td + 1) * 0.25) * np.minimum(td / 3.0, 1) * np.minimum((9.0 - td) / 1.6, 1)
add(music, drone2, 13.0, 0.10)
# pulsa ketegangan lembut saat "gawat" sampai "tindakan"
a = 13.75
while a < 17.3: add(music, thump(80, 1.0), a, 0.13); a += 0.62
add(sfx, tick(1400), 17.65, 0.10); add(sfx, tick(1400), 19.8, 0.10)
add(sfx, chime([392, 523], 1.0, 0.45), 18.67, 0.05)                  # "tidak sadar"
add(sfx, chime([330, 415], 1.2, 0.5), 19.82, 0.06)                   # telepon tak terjawab
# ===== PERALIHAN: geser ke meja perawat =====
add(sfx, whoosh(0.5, 500, 3000, 1), 21.9, 0.09)
add(sfx, chime([784, 1175], 1.6, 0.8), 22.15, 0.06)
add(sfx, chime([1318, 1760], 1.0, 0.4), 25.9, 0.08)                  # "Benar!"
add(sfx, whoosh(0.7, 400, 2600, 2), 26.5, 0.06)                      # kamera menjauh, kartu muncul

# ===== MUSIK: dari ketegangan ke hangat =====
BPM = 66; beat = 60 / BPM; bar = 4 * beat
CH = {'F': [53, 57, 60, 64], 'Dm': [50, 53, 57, 60], 'Bb': [58, 62, 65, 69], 'C': [48, 52, 55, 59], 'Am': [57, 60, 64, 67], 'G': [55, 59, 62, 66], 'Em': [52, 55, 59, 62]}
SECT = [(22.0, 43.9, ['Dm', 'Bb', 'F', 'C'], 0.14, 0.50),            # penjelasan umum, tenang
        (43.9, 60.2, ['Am', 'F', 'C', 'G'], 0.22, 0.55),             # hukum: fokus
        (60.2, 69.4, ['F', 'C', 'Dm', 'Bb'], 0.40, 0.75),            # setelah tindakan: hangat
        (69.47, 82.7, ['F', 'C', 'Dm', 'Bb'], 0.34, 0.70),
        (82.7, END + 0.5, ['F', 'C', 'G', 'F'], 0.62, 0.85)]          # penutup
def sect_at(a):
    for s in SECT:
        if s[0] <= a < s[1]: return s
    return None
a = 22.0; bi = 0
while a < END:
    s = sect_at(a)
    if s is None: a += bar; continue
    ch = CH[s[2][bi % len(s[2])]]
    n = int(bar * 1.3 * SR); t = np.arange(n) / SR; pad = np.zeros(n)
    for k, m in enumerate(ch):
        f = midi(m + 12); pad += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t + k) + 0.18 * np.sin(2 * np.pi * f * 2 * t)
    fade = float(np.clip((END - 0.2 - a) / 2.0, 0, 1)) * float(np.clip((a - 22.0) / 1.5 + 0.3, 0, 1))
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

# ===== bip monitor di latar (sangat pelan) saat meja perawat dan bilik =====
a = 22.4
while a < 43.9: add(sfx, beep(1040), a, 0.035, pan=-0.4); a += 0.95
a = 62.5
while a < 69.3: add(sfx, beep(900), a, 0.03, pan=-0.4); a += 1.0

# ===== SFX adegan =====
for a0 in [22.12, 29.45, 36.98, 41.05, 69.5, 82.7]: add(sfx, pop(), a0, 0.11)          # chip dan kartu
add(sfx, chime([659, 988], 1.4, 0.6), 31.82, 0.07)                                      # persetujuan tercentang
add(sfx, chime([392, 466], 1.4, 0.7), 33.74, 0.05)                                      # pasien tidak mampu menyetujui
add(sfx, chime([784, 1046], 1.6, 0.8), 39.6, 0.07)                                      # pengecualian
add(sfx, chime([659, 988, 1318], 1.8, 0.8), 43.94, 0.07)                                # dasar hukum
for a0 in [45.95, 47.44, 49.39]: add(sfx, pop(), a0, 0.12)                              # tiga syarat muncul
for a0 in [52.12, 52.2, 52.28]: add(sfx, chime([1175, 1568], 0.5, 0.2), a0, 0.05)       # ketiga syarat tercentang
add(sfx, thump(110, 1.0) * 1.2, 52.42, 0.24)  # stempel
add(sfx, chime([523, 784, 1046], 1.8, 0.8), 52.5, 0.08)
add(sfx, pop(), 57.65, 0.11)
# waktu berlalu: jam berdetak cepat lalu melambat
a = 60.4
while a < 62.2: add(sfx, tick(1700), a, 0.10); a += float(np.interp(a, [60.4, 62.2], [0.09, 0.25]))
add(sfx, whoosh(0.8, 300, 3000, 2), 60.0, 0.08)
add(sfx, chime([784, 988, 1175], 2.0, 0.9), 62.35, 0.08)                                # pasien sadar, lega
add(sfx, whoosh(0.6, 500, 2000, 1), 66.0, 0.05)
for k in range(5): add(sfx, tick(380) * 0.9, 66.3 + k * 0.28, 0.12, pan=0.5)             # langkah Ibu
add(sfx, chime([659, 988], 1.4, 0.6), 69.52, 0.07)                                       # persetujuan tetap penting
for a0, f in [(72.6, [784, 1175]), (77.0, [880, 1318]), (79.65, [988, 1480])]: add(sfx, chime(f, 1.0, 0.4), a0 + 0.9, 0.07)
# penutup MEDCOEL
add(sfx, chime([784, 988, 1175], 2.2, 0.9), 82.85, 0.08)
for a0 in [85.52, 88.09]: add(sfx, pop(), a0, 0.12)
add(sfx, chime([1568, 2093], 1.0, 0.5), 88.25, 0.05)
add(sfx, chime([784, 988, 1175, 1568], 2.6, 1.0), 90.6, 0.12)
for name, buf in ((sys.argv[2], music), (sys.argv[3], sfx)):
    b = buf[: int(total * SR)]; b = b / max(1e-6, np.abs(b).max()) * 0.8
    w = wave.open(name, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.tanh(b) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
