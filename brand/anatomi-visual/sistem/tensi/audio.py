#!/usr/bin/env python3
"""Audio video tensi rendah: musik pelan (ritme lambat) + SFX (hanya perubahan posisi/aliran dan saat pandangan menggelap) + denyut jantung
yang mengikuti kurva yang sama dengan gambar (denyut.json) + narasi (dominan). Keluaran: wav 48 kHz stereo.
Pemakaian: python3 audio.py narasi.wav keluaran.wav"""
import sys, json, numpy as np, wave
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
DUR = 80.6
narasi_path, out_path = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(7)
N = int(DUR * SR)
t_all = np.arange(N) / SR

def ambil_wav(p):
    w = wave.open(p, 'rb'); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
    d = np.frombuffer(w.readframes(n), dtype={1: np.int8, 2: np.int16, 4: np.int32}[sw]).astype(np.float64)
    d /= float(2 ** (8 * sw - 1))
    if ch > 1: d = d.reshape(-1, ch).mean(axis=1)
    return d, sr

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env_ad(n, a, d, p=2.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d * p); return e
def taruh(buf, x, t0, g=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g

# ---------------- musik: pad A minor-ish + denyut bas pelan, 60 bpm ----------------
def nada(m): return 440.0 * 2 ** ((m - 69) / 12)
CH = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 66]]   # Am7, Fmaj7, Cmaj7(sus), G6
musik = np.zeros(N)
for k in range(int(np.ceil(DUR / 8))):
    t0 = k * 8.0; ch = CH[k % 4]; n = int(9.5 * SR); t = np.arange(n) / SR
    padv = np.zeros(n)
    for j, m in enumerate(ch):
        for dt in (-0.07, 0.0, 0.07):
            f = nada(m + (12 if j % 2 else 0)) * (1 + dt * 0.01) 
            padv += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * (0.6 if dt else 1.0)
    e = np.minimum(1, t / 2.2) * np.minimum(1, (9.5 - t) / 2.4)
    padv = lp(padv, 1400) * e * 0.05
    taruh(musik, padv, t0)
    # bas pelan pada tiap ketukan (60 bpm): nada akar, sangat pendek
    root = nada(ch[0] - 12)
    for b in range(8):
        tb = t0 + b
        nb = int(0.9 * SR); tt = np.arange(nb) / SR
        x = np.sin(2 * np.pi * root * tt) * env_ad(nb, 0.01, 0.35, 3.0)
        taruh(musik, x, tb, 0.12 if b % 4 == 0 else 0.07)
    # denting lonceng lembut tiap 2 ketukan (arpeggio jarang)
    for b, m in zip((1.5, 3.0, 5.5, 6.5), (ch[2] + 12, ch[3] + 12, ch[1] + 12, ch[2] + 24)):
        nb = int(2.2 * SR); tt = np.arange(nb) / SR
        x = (np.sin(2 * np.pi * nada(m) * tt) + 0.3 * np.sin(2 * np.pi * nada(m) * 2.01 * tt)) * env_ad(nb, 0.005, 0.9, 3.0)
        taruh(musik, x, t0 + b, 0.025)
musik = lp(musik, 5000)
musik *= np.minimum(1, t_all / 2.0) * np.minimum(1, (DUR - t_all) / 2.5)

# ---------------- SFX ----------------
sfx = np.zeros(N)
def noise(n): return rng.standard_normal(n)
def whoosh(t0, d, f0, f1, g, naik=True):
    n = int(d * SR); t = np.arange(n) / SR; x = noise(n)
    out = np.zeros(n); seg = 24
    for s in range(seg):
        a, b = s * n // seg, (s + 1) * n // seg
        fc = f0 * (f1 / f0) ** (s / (seg - 1))
        out[a:b] = bp(x, max(60, fc * 0.6), min(SR / 2 - 100, fc * 1.5))[a:b]
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    taruh(sfx, out * e, t0, g)
def tone_sweep(t0, d, f0, f1, g, harm=0.0):
    n = int(d * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + harm * np.sin(2 * ph); e = np.minimum(1, t / 0.04) * np.exp(-3 * t / d)
    taruh(sfx, x * e, t0, g)
def ketuk(t0, g, f=110):
    n = int(0.25 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t * (1 - 0.3 * t)) * np.exp(-t / 0.05) + 0.4 * lp(noise(n), 900) * np.exp(-t / 0.02)
    taruh(sfx, x, t0, g)
def denting(t0, f, g, d=1.4):
    n = int(d * 1.6 * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * env_ad(n, 0.003, d, 3.0)
    taruh(sfx, x, t0, g)

# 1) berdiri: hembus lembut + sedikit ketukan kursi
whoosh(0.05, 0.9, 400, 1800, 0.10); ketuk(0.1, 0.10, 90)
# 2) pandangan menggelap (2,5-3,9): nada turun rendah + denyut tertahan; lalu pulih (3,95-4,4)
tone_sweep(2.55, 1.35, 520, 70, 0.11, 0.3); whoosh(2.5, 1.3, 2400, 300, 0.07)
for tb in (3.0, 3.38, 3.78):
    ketuk(tb, 0.10, 62); ketuk(tb + 0.16, 0.06, 55)
whoosh(3.95, 0.5, 300, 2600, 0.09)
# 3) tangan memegang meja (4,5 dan 5,4)
ketuk(4.55, 0.08, 140); ketuk(5.45, 0.06, 150)
# 4) peralihan ke tampak tembus (6,8-8,2)
whoosh(6.7, 1.5, 500, 3800, 0.08); denting(7.35, 880, 0.04, 1.8); denting(7.6, 1318, 0.025, 2.0)
# 5) perubahan aliran: berkumpul (9-11,2), balik jantung (12,3-13,8), otak (16-17,5)
whoosh(9.0, 2.3, 700, 200, 0.07); whoosh(12.3, 1.5, 600, 180, 0.06); whoosh(16.0, 1.8, 900, 220, 0.06)
# 6) sensor + sinyal (22,6) dan kompensasi (24,9-29)
denting(22.9, 1568, 0.04, 1.2); denting(23.2, 1976, 0.025, 1.0)
whoosh(24.9, 1.6, 300, 1800, 0.06); whoosh(26.8, 2.4, 1600, 400, 0.05)
denting(29.1, 784, 0.04, 1.6)
# 7) respons terlambat (30,4-34)
tone_sweep(31.5, 2.0, 330, 110, 0.07, 0.4)
# 8) penyebab (34,9; 35,8; 36,8)
whoosh(34.9, 1.1, 800, 220, 0.05); denting(35.8, 659, 0.03, 0.9); whoosh(36.9, 1.2, 1200, 250, 0.05)
# 9) perempuan: rahim (40,5), hamil (43,5), haid (48,9), kartu (55,1)
denting(40.9, 523, 0.035, 1.8); denting(43.5, 659, 0.035, 1.8); whoosh(45.0, 1.6, 400, 1600, 0.05)
whoosh(48.9, 1.8, 900, 240, 0.05); denting(49.2, 440, 0.03, 1.6)
whoosh(55.0, 0.8, 300, 2200, 0.07); denting(57.4, 784, 0.025, 1.2); denting(59.5, 587, 0.03, 1.4)
# 10) kembali duduk (62,3-64) dan tensimeter: pompa 64,7-66,5, lepas 66,6-67,6
whoosh(62.3, 1.6, 2400, 400, 0.06)
nP = int(1.8 * SR); tP = np.arange(nP) / SR
pompa = lp(noise(nP), 1800) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * tP))) * 0.07 * np.minimum(1, tP / 0.1) * np.minimum(1, (1.8 - tP) / 0.1)
taruh(sfx, pompa, 64.7)
whoosh(66.6, 1.0, 5000, 1200, 0.05)
denting(66.1, 1046, 0.02, 0.5)
# 11) gejala dan penyebab, penanda peringatan, kartu penutup
denting(70.0, 392, 0.03, 1.4); denting(70.95, 659, 0.03, 1.0)
for ts, f in ((72.4, 698), (73.55, 698), (74.85, 698)): denting(ts, f, 0.04, 0.9)
denting(76.65, 880, 0.05, 1.8); denting(76.75, 1318, 0.03, 1.8)
denting(78.4, 523, 0.045, 2.2); denting(78.4, 784, 0.035, 2.2); denting(78.4, 1046, 0.03, 2.2)

# denyut jantung (lub-dub) mengikuti denyut.json selama tampak tembus
den = json.load(open(sys.path[0] + '/denyut.json'))
for tb in den:
    if 8.0 <= tb <= 62.2:
        w = min(1, (tb - 8.0) / 1.0, (62.2 - tb) / 1.0)
        ketuk(tb, 0.05 * w, 70); ketuk(tb + 0.22, 0.03 * w, 62)

def _rms(x): return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
# keseimbangan: narasi dominan (RMS sekitar -25 dBFS), musik sekitar -40 dBFS, SFX puncak sekitar -22 dBFS (denyut dan ketukan lebih pelan)
musik *= 10 ** ((-40 - _rms(musik)) / 20)
sfx *= 10 ** ((-22 - 20 * np.log10(np.abs(sfx).max() + 1e-9)) / 20)
print('rms musik', round(_rms(musik), 1), 'puncak sfx', round(20 * np.log10(np.abs(sfx).max()), 1))
# ---------------- narasi + ducking ----------------
d, sr = ambil_wav(narasi_path)
if sr != SR: d = resample_poly(d, SR, sr)
nar = np.zeros(N); nar[:min(N, len(d))] = d[:N]
# normalisasi narasi ke puncak -3 dBFS
nar *= 0.7 / max(1e-6, np.abs(nar).max())
win = int(0.12 * SR); env = np.sqrt(np.convolve(nar ** 2, np.ones(win) / win, mode='same'))
env = lp(env, 4)
env = np.clip(env / 0.06, 0, 1)
duck = 1 - 0.62 * env
mix = nar + musik * duck * 1.0 + sfx * (1 - 0.55 * env)
pk = np.abs(mix).max()
if pk > 0.98: mix *= 0.98 / pk
st = np.stack([mix, mix], axis=1)
pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
w = wave.open(out_path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('ok', out_path, len(mix) / SR, 'detik')
