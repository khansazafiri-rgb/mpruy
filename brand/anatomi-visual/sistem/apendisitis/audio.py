#!/usr/bin/env python3
"""Audio video apendisitis: musik pelan (ritme lambat) + SFX (hanya perubahan posisi/kamera/aliran, gelembung lendir, penanda kartu) + narasi (dominan). Keluaran: wav 48 kHz stereo.
Pemakaian: python3 audio.py narasi.wav keluaran.wav"""
import sys, json, numpy as np, wave
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
DUR = 75.2
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

# 1) gerak kamera laparoskop (0-1,3) dan instrumen masuk (2,4-4,7)
whoosh(0.05, 1.2, 300, 1400, 0.07); whoosh(2.4, 2.3, 500, 2200, 0.05)
for tk in (4.6, 4.75): ketuk(tk, 0.05, 1200)
# 2) pertanyaan (5,9) dan kamera mundur ke peta perut (7,1-8,5)
denting(5.9, 523, 0.04, 1.6); whoosh(7.1, 1.5, 3000, 350, 0.08); denting(7.9, 784, 0.03, 1.6)
# 3) penanda lokasi (8,3), sekum (10,4), radang (12,8-15)
denting(8.4, 659, 0.03, 1.2); denting(10.45, 587, 0.03, 1.2); tone_sweep(13.0, 2.4, 140, 190, 0.05, 0.4)
# 4) lensa pembesaran skematik (16,7-18)
whoosh(16.7, 1.4, 400, 3600, 0.09); denting(17.8, 880, 0.03, 1.6)
# 5) sumbatan: tersumbat (19,5), tinja (21,3-22,3), jaringan membengkak (23,1)
ketuk(19.5, 0.09, 70); ketuk(22.3, 0.10, 90); tone_sweep(23.1, 1.3, 220, 330, 0.04, 0.3)
# 6) lendir: gelembung kecil tak beraturan selama 26,1-31
for i in range(46):
    tb = 26.1 + i * 0.105 + rng.uniform(0, 0.08)
    f = rng.uniform(500, 1300); n = int(0.12 * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f + 900 * tt) * tt) * np.exp(-tt / 0.03)
    taruh(sfx, x, tb, 0.020 + 0.012 * min(1, i / 30))
# 7) tekanan naik (31,4-34), aliran terganggu (33,8), bakteri (35,4)
tone_sweep(31.4, 2.8, 110, 260, 0.06, 0.5); whoosh(33.8, 1.5, 900, 180, 0.05)
for i in range(30): ketuk(35.4 + i * 0.04 + rng.uniform(0, 0.03), 0.012, 2200)
# 8) keluar dari lensa (36,5-37,5) dan tubuh utuh (37,8)
whoosh(36.5, 1.2, 3000, 300, 0.08); denting(37.9, 392, 0.04, 1.8)
# 9) peradangan mencapai peritoneum (43,3) dan gejala (46, 46,7, 48,1, 49,3)
denting(43.4, 988, 0.03, 1.0); ketuk(43.3, 0.06, 80)
for ts, f in ((46.0, 659), (46.8, 587), (48.1, 698), (49.4, 784)): denting(ts, f, 0.03, 0.9)
# 10) pemeriksaan (52,9; 53,9; 54,9; 56,5) dan penanganan (58,1; 61,8)
for ts, f in ((52.95, 523), (53.95, 587), (54.95, 659), (56.55, 784), (58.1, 523), (60.6, 587), (61.85, 659)): denting(ts, f, 0.03, 1.0)
whoosh(52.4, 0.7, 400, 2400, 0.05); whoosh(57.95, 0.7, 400, 2400, 0.05)
# 11) pencegahan (64,4), tanda bahaya (68,3; 71,0), ajakan (71,7), kartu penutup (72,95)
denting(64.45, 440, 0.04, 1.6); whoosh(64.1, 0.7, 500, 2000, 0.04)
for ts in (68.3, 70.97): denting(ts, 698, 0.04, 0.9)
denting(71.75, 880, 0.05, 1.8); denting(71.85, 1318, 0.03, 1.8)
denting(72.95, 523, 0.045, 2.2); denting(72.95, 784, 0.035, 2.2); denting(72.95, 1046, 0.03, 2.2)

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
