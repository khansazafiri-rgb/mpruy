"""Musik latar hangat (sintesis) dan efek suara untuk "Dunia tanpa oralit". Hanya numpy: tidak ada sampel berhak cipta.
Pemakaian: python3 music.py DATA_JSON OUT_MUSIC_WAV OUT_SFX_WAV"""
import json, sys, numpy as np
SR = 44100
data = json.load(open(sys.argv[1])); total = data['total']
N = int((total + 1) * SR)
rng = np.random.default_rng(7)
def midi(n): return 440 * 2 ** ((n - 69) / 12)
def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-t / d)
def add(buf, x, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= len(buf) or i < 0: return
    x = x[: len(buf) - i]
    buf[i:i + len(x), 0] += x * gain * (1 - max(pan, 0)); buf[i:i + len(x), 1] += x * gain * (1 + min(pan, 0))
music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
# ---------- musik ----------
BPM = 84; beat = 60 / BPM; bar = 4 * beat
CH = {  # akor sebagai nomor MIDI
 'F': [53, 57, 60, 64], 'Em': [52, 55, 59, 62], 'Dm': [50, 53, 57, 60], 'C': [48, 52, 55, 59],
 'Bb': [58, 62, 65, 69], 'Gm': [55, 58, 62, 65], 'Am': [57, 60, 64, 67], 'G': [55, 59, 62, 66],
}
SECT = [  # (mulai, selesai, progresi, intensitas arpeggio, pad)
 (0, 4.25, ['F', 'Em'], 0.45, 0.5),
 (4.25, 13.5, ['F', 'Am', 'Dm', 'C'], 0.35, 0.6),
 (13.5, 26.5, ['Dm', 'Bb', 'Gm', 'Am'], 0.5, 0.65),
 (26.5, 35.9, ['Dm', 'Gm', 'Dm', 'Am'], 0.28, 0.55),
 (35.9, 43.0, ['Dm', 'Bb', 'Gm', 'Am'], 0.25, 0.55),
 (43.0, 45.1, ['Dm'], 0.0, 0.15),
 (45.1, 60.7, ['F', 'C', 'Dm', 'Bb'], 0.8, 0.7),
 (60.7, 78.0, ['F', 'Am', 'Dm', 'C'], 0.4, 0.6),
 (78.0, 86.0, ['F', 'C', 'Dm', 'Bb', 'F', 'C'], 0.65, 0.75),
 (86.0, total + 0.8, ['F'], 0.0, 0.5),
]
def sect_at(t):
    for s in SECT:
        if s[0] <= t < s[1]: return s
    return SECT[-1]
# pad per bar
tt = 0.0; bi = 0
while tt < total + 1:
    s = sect_at(tt); prog = s[2]
    ch = CH[prog[bi % len(prog)]]
    n = int(bar * 1.25 * SR); t = np.arange(n) / SR
    pad = np.zeros(n)
    for k, m in enumerate(ch):
        f = midi(m + 12)
        pad += np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.004 * t + k) + 0.25 * np.sin(2 * np.pi * f * 2 * t)
    e = np.minimum(t / 0.9, 1) * np.minimum((bar * 1.25 - t) / 1.0, 1)
    fade = np.clip((total + 0.5 - (tt)) / 1.5, 0, 1)
    add(music, pad * e * 0.020 * s[4] * fade, tt, 1.0)
    # bas
    for b in (0, 2):
        nb = int(beat * 2 * SR); tb = np.arange(nb) / SR
        add(music, np.sin(2 * np.pi * midi(ch[0] - 12) * tb) * np.exp(-tb / 0.9) * 0.10 * s[4] * fade, tt + b * beat, 1.0)
    tt += bar; bi = 0 if False else bi + 1
    if tt >= s[1]: bi = 0
# arpeggio pluck (delapan)
t = 0.0; step = beat / 2; k = 0
while t < total:
    s = sect_at(t); prog = s[2]
    barIdx = int((t - s[0]) / bar) % len(prog); ch = CH[prog[barIdx]]
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    if s[3] > 0 and rng.random() < s[3] + 0.15 * (k % 2 == 0):
        m = ch[pat[k % 8]] + 24
        n = int(1.2 * SR); tn = np.arange(n) / SR; f = midi(m)
        x = (np.sin(2 * np.pi * f * tn + 0.9 * np.sin(2 * np.pi * f * 2 * tn) * np.exp(-tn / 0.12)) * np.exp(-tn / 0.35))
        add(music, x * 0.055 * (0.7 + 0.3 * (k % 4 == 0)), t, 1.0, pan=(-0.25 if k % 2 else 0.25))
    t += step; k += 1
# lembut: sapuan "hat" sangat pelan di bagian cerah
for s in SECT:
    if s[3] >= 0.6:
        tt = s[0]
        while tt < min(s[1], total):
            n = int(0.05 * SR); x = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / 0.012)
            x = x - np.convolve(x, np.ones(6) / 6, mode='same')
            add(music, x * 0.012, tt + beat / 2, 1.0, pan=0.2)
            tt += beat
# ---------- efek suara ----------
def noise_sweep(dur, f0, f1, gain, shape=1.0):
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); y = 0.0
    fc = np.linspace(f0, f1, n)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    for i in range(n): y += a[i] * (x[i] - y); out[i] = y
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** shape
    return out * e * gain
def sine_sweep(dur, f0, f1, decay):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / decay)
def chime(freqs, dur=0.9, decay=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / (decay * (1 - 0.1 * i))) for i, f in enumerate(freqs)) / len(freqs)
def pop(): return sine_sweep(0.14, 420, 880, 0.05) * np.minimum(np.arange(int(0.14 * SR)) / (0.004 * SR), 1)
def drop(f=1300): return sine_sweep(0.22, f, f * 0.55, 0.07)
def whoosh(dur=0.5): return noise_sweep(dur, 300, 3200, 0.5, 1.6)
CHIPS = [0.45, 4.7, 15.25, 19.95, 29.65, 32.55, 38.65, 51.0, 55.9]
for c in CHIPS: add(sfx, pop(), c, 0.28)
for b in [4.25, 13.5, 26.5, 35.9, 60.7, 78.0]: add(sfx, whoosh(0.45), b - 0.22, 0.22)
add(sfx, chime([1318, 1760, 2093], 1.0, 0.4), 1.25, 0.12)            # kilau sachet (hook)
# S3: tetes air dan denting elektrolit saat keluar
for t0 in np.arange(19.0, 26.2, 0.52):
    add(sfx, drop(1100 + 400 * rng.random()), t0 + rng.random() * 0.2, 0.18, pan=rng.uniform(-0.3, 0.3))
for t0 in [23.3, 23.45, 23.6, 23.8]: add(sfx, drop(1500), t0, 0.2)
add(sfx, chime([1046, 1318], 0.7, 0.25), 20.1, 0.10); add(sfx, chime([1318, 1568], 0.7, 0.25), 21.3, 0.10)
# S4: kartu cek / silang
add(sfx, chime([1318, 1760], 0.7, 0.25), 29.65, 0.16); add(sfx, sine_sweep(0.35, 330, 220, 0.15), 32.55, 0.22)
add(sfx, sine_sweep(0.5, 520, 300, 0.2), 38.65, 0.14)
# rewind kaset 43.0-45.0
n = int(2.1 * SR); t = np.arange(n) / SR
w = np.sin(2 * np.pi * np.cumsum(260 + 700 * np.abs(np.sin(t * 7)) * (1 - t / 2.1)) / SR) * 0.25
w += noise_sweep(2.1, 1500, 5000, 0.5, 0.6)
add(sfx, w * np.minimum(t / 0.15, 1) * np.minimum((2.1 - t) / 0.25, 1), 43.0, 0.3)
# sachet jatuh dan kilau (45.15)
add(sfx, pop() * 1.0, 45.15, 0.4); add(sfx, chime([1568, 2093, 2637], 1.1, 0.45), 45.35, 0.2)
# robek, bubuk, sendok
add(sfx, noise_sweep(0.18, 4000, 7000, 0.6, 1), 48.7, 0.25)
add(sfx, noise_sweep(0.8, 2500, 6000, 0.5, 0.8), 49.15, 0.18)
for k in range(5): add(sfx, chime([3300, 4400], 0.2, 0.05), 50.0 + k * 0.16, 0.13)
# isi ulang tubuh (aliran masuk), tegukan
for t0 in np.arange(52.2, 57.8, 0.45): add(sfx, drop(1700 + 300 * rng.random()), t0 + rng.random() * 0.2, 0.12)
for t0 in [53.4, 56.4]: add(sfx, sine_sweep(0.18, 190, 110, 0.07), t0, 0.3)
add(sfx, chime([1318, 1760, 2093, 2637], 1.4, 0.6), 55.3, 0.14)
# kartu: tanda peringatan lembut tiap baris
for t0 in [63.9, 66.5, 67.85, 70.3, 72.85]: add(sfx, pop(), t0, 0.22)
# pelukan: kilau hangat; kartu akhir
add(sfx, chime([523, 659, 784, 1046], 1.8, 0.8), 78.3, 0.10)
add(sfx, chime([1568, 2093, 2637], 1.2, 0.5), 82.45, 0.14)
add(sfx, chime([784, 988, 1175, 1568], 2.2, 0.9), 84.6, 0.14)
def finish(x): 
    x = np.tanh(x * 1.0)
    return (x * 32767).astype(np.int16)
for name, buf in ((sys.argv[2], music), (sys.argv[3], sfx)):
    import wave
    b = buf[: int(total * SR)]
    b = b / max(1e-6, np.abs(b).max()) * 0.8
    w = wave.open(name, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(finish(b).tobytes()); w.close()
print('ok')
