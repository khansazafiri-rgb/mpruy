#!/usr/bin/env python3
"""Audio video asam urat: narasi (WAV pemesan, TIDAK diubah; hanya laju sampel ke 48 kHz) + musik hangat pelan + efek kecil yang mengikuti perpindahan adegan.
Musik dan efek DISINTESIS dari kode (numpy/scipy); tanpa sampel atau musik pihak ketiga.
  Judul musik: "MEDCOEL Sendi Hangat" (instrumental 84 BPM, pad hangat dan pluck lembut). Judul efek: "MEDCOEL Kristal dan Radang" (pip, tetes, kristal, denyut radang, lonceng).
  Pembuat: dibuat untuk MEDCOEL pada sesi pembuatan video ini. Lisensi: CC0 1.0 (domain publik), bebas dipakai komersial dan di Instagram tanpa atribusi.
Waktu efek dibaca dari bunyi.json (keluaran `node bunyi.mjs`, waktu kata narasi yang sama dengan gambar). Pemakaian: python3 audio.py narasi.wav campur.wav"""
import sys, os, json, wave
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__)); SR = 48000
J = json.load(open(os.path.join(HERE, 'bunyi.json'))); DUR = J['durasi']; EF = J['efek']
narasi_path, out_path = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(21); N = int(DUR * SR); t_all = np.arange(N) / SR

def ambil_wav(p):
    w = wave.open(p, 'rb'); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
    d = np.frombuffer(w.readframes(n), dtype={1: np.int8, 2: np.int16, 4: np.int32}[sw]).astype(np.float64) / float(2 ** (8 * sw - 1))
    if ch > 1: d = d.reshape(-1, ch).mean(axis=1)
    return d, sr
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def eg(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def taruh(buf, x, t0, g=1.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(x) <= 0: return
    a = max(0, -i); j = min(len(buf), i + len(x)); buf[max(i, 0):j] += x[a:a + (j - max(i, 0))] * g
def smooth(x, ms): k = max(1, int(ms / 1000 * SR)); return np.convolve(x, np.ones(k) / k, mode='same')
def naik(a, b): return np.clip((t_all - a) / (b - a), 0, 1)

nar, sr0 = ambil_wav(narasi_path); nar = resample_poly(nar, SR, sr0) if sr0 != SR else nar
narasi = np.zeros(N); narasi[:min(N, len(nar))] = nar[:N]
ada_nar = np.clip(smooth(np.abs(narasi), 120) / 0.02, 0, 1)

# ---------------- musik hangat: pad + pluck lembut, 84 BPM, Fmaj7 / Dm7 / Bbmaj7 / C6 ----------------
B = 60 / 84
def nada(m): return 440.0 * 2 ** ((m - 69) / 12)
CH = [[41, 53, 57, 60, 64], [38, 50, 57, 60, 65], [46, 53, 57, 62, 65], [48, 55, 60, 64, 69]]
musik = np.zeros(N)
for k in range(int(DUR / (4 * B)) + 2):
    t0 = k * 4 * B; ch = CH[k % 4]; n = int((4 * B + 1.8) * SR); t = np.arange(n) / SR; pad = np.zeros(n)
    for j, m in enumerate(ch):
        for dt in (-0.07, 0.0, 0.07): f = nada(m) * 2 ** (dt / 12); pad += (np.sin(2 * np.pi * f * t) + 0.22 * np.sin(4 * np.pi * f * t)) * (0.5 if j == 0 else 0.28)
    pad *= np.minimum(1, t / 0.8) * np.clip((4 * B + 1.8 - t) / 1.6, 0, 1)
    taruh(musik, lp(pad, 2200), t0, 0.14)
def pluck(m, g):
    n = int(1.0 * SR); t = np.arange(n) / SR; f = nada(m)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.35) + 0.3 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.1)) * np.minimum(1, t / 0.005) * g
POLA = [0, 2, 3, 4, 3, 2, 1, 3]
for k in range(int(DUR / (4 * B)) + 1):
    ch = CH[k % 4]
    for j in range(8):
        x = k * 4 * B + j * B / 2
        if x > DUR - 3.0 or (j % 2 == 1 and rng.random() < 0.5): continue
        taruh(musik, pluck(ch[POLA[j] % 5] + 24, 0.05 if j % 4 == 0 else 0.035), x)
for k in range(int(DUR / (4 * B)) + 1):
    n = int(1.8 * SR); t = np.arange(n) / SR; f = nada(CH[k % 4][0] - 12)
    taruh(musik, np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.06) * np.exp(-t / 0.9) * 0.10, k * 4 * B)
bentuk = 0.5 * naik(0.4, 3.0) + 0.5 * naik(3.2, 5.0)
bentuk = bentuk * (1 + 0.15 * naik(19.5, 21.5) * (1 - naik(25.0, 26.0)))
bentuk = bentuk * (1 - 0.35 * naik(33.5, 34.2) * (1 - naik(46.0, 46.8)))
bentuk = bentuk * (1 - naik(51.0, 51.7))
musik *= bentuk * (1 - 0.6 * smooth(ada_nar, 220))
n = int(3.0 * SR); t = np.arange(n) / SR; pc = np.zeros(n)
for m in (53, 57, 60, 64, 69, 72): f = nada(m); pc += np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)
taruh(musik, lp(pc * np.minimum(1, t / 0.25) * np.exp(-t / 1.8) * 0.045, 3000), 48.97)

# ---------------- efek ----------------
def pip(f=1568.0, d=0.07, a=0.5):
    n = int(0.3 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.05)) * eg(n, 0.003, d) * a
def tetes(): n = int(0.22 * SR); t = np.arange(n) / SR; f = 900 + 1200 * np.exp(-t / 0.03); return np.sin(2 * np.pi * np.cumsum(f) / SR) * eg(n, 0.002, 0.05) * 0.5
def kristal(): f = [3100, 3700, 4400, 5200][rng.integers(0, 4)]; n = int(0.5 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 1.53 * f * t) * np.exp(-t / 0.06)) * eg(n, 0.001, 0.09) * 0.4
def sel(): n = int(0.16 * SR); t = np.arange(n) / SR; f = 340 - 120 * (t / 0.16); return np.sin(2 * np.pi * np.cumsum(f) / SR) * eg(n, 0.004, 0.05) * 0.5
def zing(): n = int(0.22 * SR); t = np.arange(n) / SR; f = 2200 + 1600 * (t / 0.22); return np.sin(2 * np.pi * np.cumsum(f) / SR) * eg(n, 0.002, 0.07) * 0.35
def pop_bengkak(): n = int(0.45 * SR); t = np.arange(n) / SR; f = 180 * (1 + 0.6 * np.exp(-t / 0.08)); return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * eg(n, 0.005, 0.12) * 0.4
def swell(f0, dur=1.2, a=0.3): n = int(dur * SR); t = np.arange(n) / SR; x = (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(2 * np.pi * 1.5 * f0 * t)) * np.sin(np.pi * t / dur) ** 2; return lp(x, 1800) * a
def whoosh(dur=0.9, f0=500, f1=4000, a=0.4): n = int(dur * SR); t = np.arange(n) / SR; u = t / dur; x = bp(rng.standard_normal(n), f0, f1, 2) * np.sin(np.pi * u) ** 2; return x * a
def naik_zoom(dur=2.95): n = int(dur * SR); t = np.arange(n) / SR; u = t / dur; x = bp(rng.standard_normal(n), 300, 5000, 2) * (u ** 2.2); return x * 0.35 * np.minimum(1, (dur - t) / 0.2)
def aliran(dur=1.6): n = int(dur * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 400, 2600, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * t)) * np.sin(np.pi * t / dur) ** 1.5; return x * 0.22
def naik_nada(dur=2.1, f0=220, f1=440, a=0.2): n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.2 * a
def lonceng():
    n = int(2.2 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f, a, d in ((1318.5, 0.5, 0.7), (1975.5, 0.3, 0.55), (2637.0, 0.2, 0.35)): x += (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.08)) * eg(n, 0.003, d) * a
    return x * 0.5
def bloom(): n = int(1.6 * SR); t = np.arange(n) / SR; x = np.zeros(n); [x.__iadd__((np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)) * eg(n, 0.02, 0.5) * 0.25) for f in (659, 880, 1109, 1319)]; return x
fx = np.zeros(N)
for e in EF:
    k, t0, g = e['k'], e['t'], e['g']
    if k == 'naik': taruh(fx, naik_zoom(), t0, 0.5 * g)
    elif k == 'bloom': taruh(fx, bloom(), t0, 0.35 * g)
    elif k == 'pip': taruh(fx, pip(), t0, 0.06 * g)
    elif k == 'tetes': taruh(fx, tetes(), t0, 0.06 * g)
    elif k == 'whoosh': taruh(fx, whoosh(), t0, 0.28 * g)
    elif k == 'aliran': taruh(fx, aliran(), t0, 1.0)
    elif k == 'naikPelan': taruh(fx, naik_nada(), t0, 0.5)
    elif k == 'naikPendek': taruh(fx, naik_nada(1.1, 330, 660, 0.18), t0, 0.5 * g)
    elif k == 'kristal': taruh(fx, kristal(), t0, 0.1 * g)
    elif k == 'sel': taruh(fx, sel(), t0, 0.1 * g)
    elif k == 'zing': taruh(fx, zing(), t0, 0.08 * g)
    elif k == 'bengkak': taruh(fx, pop_bengkak(), t0, 0.25 * g)
    elif k == 'hangatMerah': taruh(fx, swell(293.7, 1.3, 0.3), t0, 0.35 * g)
    elif k == 'hangat': taruh(fx, swell(440, 1.6, 0.25), t0, 0.35 * g)
    elif k == 'ping': taruh(fx, pip(1320, 0.12), t0, 0.05 * g)
    elif k == 'lonceng': taruh(fx, lonceng(), t0, 0.07 * g)
    elif k == 'denyut':   # denyut hangat pelan (peradangan muncul): 1,3 Hz, makin kuat sampai 24,4 dtk
        tt = t0
        while tt < 24.4:
            u = (tt - t0) / (24.4 - t0); n = int(0.5 * SR); t = np.arange(n) / SR; f = 62 + 40 * np.exp(-t / 0.05)
            taruh(fx, np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * eg(n, 0.004, 0.11) * 0.2 * (0.4 + 0.8 * u), tt, 1.0); tt += 0.77
mix = narasi + musik * 0.42 + fx * 0.9
pk = np.abs(mix).max(); print('puncak', round(float(pk), 3))
if pk > 0.97: mix = mix / pk * 0.97
st = np.stack([mix, mix], axis=1)
w = wave.open(out_path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x[np.abs(x) > 1e-5] ** 2)) + 1e-12)
print('RMS dBFS: narasi', round(rms_db(narasi), 1), 'musik', round(rms_db(musik * 0.42), 1), 'efek', round(rms_db(fx * 0.9), 1))
