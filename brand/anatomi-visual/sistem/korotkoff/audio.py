#!/usr/bin/env python3
"""Audio video "Bunyi tensi dari mana?" (Korotkoff): narasi (WAV pemesan, TIDAK diubah: hanya diubah laju sampelnya ke 48 kHz) + musik medical-tech ringan + SFX ketukan.
Musik dan efek DISINTESIS dari kode (numpy/scipy); tanpa sampel, rekaman, atau musik pihak ketiga.
  Judul musik : "MEDCOEL Pembuluh Tenang" (instrumental 75 BPM, pad bersih + pluck kaca, tanpa alarm). Judul efek: "MEDCOEL Ketukan Korotkoff" (duk, pompa, pip label, lonceng penutup).
  Pembuat     : dibuat untuk MEDCOEL pada sesi pembuatan video ini. Lisensi: CC0 1.0 (domain publik), bebas dipakai komersial/Instagram tanpa atribusi.
Waktu ketukan dibaca dari ketukan.json (keluaran `node fisika.mjs`, sumber yang sama dengan animasi).
Pemakaian: python3 audio.py narasi.wav campur.wav"""
import sys, os, json, wave
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 45.96
narasi_path, out_path = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(11)
N = int(DUR * SR); t_all = np.arange(N) / SR
KET = json.load(open(os.path.join(HERE, 'ketukan.json')))['ketukan']

def ambil_wav(p):
    w = wave.open(p, 'rb'); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
    d = np.frombuffer(w.readframes(n), dtype={1: np.int8, 2: np.int16, 4: np.int32}[sw]).astype(np.float64) / float(2 ** (8 * sw - 1))
    if ch > 1: d = d.reshape(-1, ch).mean(axis=1)
    return d, sr
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def eg(n, a, d, p=1.0): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d * p)
def taruh(buf, x, t0, g=1.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(x) <= 0: return
    a = max(0, -i); j = min(len(buf), i + len(x)); buf[max(i, 0):j] += x[a:a + (j - max(i, 0))] * g
def smooth(x, ms):
    k = max(1, int(ms / 1000 * SR)); return np.convolve(x, np.ones(k) / k, mode='same')

# ---------------- narasi ----------------
nar, sr0 = ambil_wav(narasi_path)
nar = resample_poly(nar, SR, sr0) if sr0 != SR else nar
narasi = np.zeros(N); narasi[:min(N, len(nar))] = nar[:N]
ev_n = smooth(np.abs(narasi), 120); ada_nar = np.clip(ev_n / 0.02, 0, 1)      # 1 saat narator berbicara

# ---------------- musik: pad bersih + pluck kaca, 75 BPM, C maj9 / Am9 / Fmaj7 / G6 ----------------
B = 0.8
def nada(m): return 440.0 * 2 ** ((m - 69) / 12)
CH = [[48, 55, 59, 64, 71], [45, 52, 59, 64, 67], [41, 52, 57, 64, 69], [43, 50, 59, 64, 69]]
musik = np.zeros(N)
for k in range(int(np.ceil(DUR / (2 * B * 2))) + 1):       # satu akor = 2 bar = 6,4 dtk? gunakan 4 ketukan = 3,2 dtk
    t0 = k * 4 * B; ch = CH[k % 4]; n = int((4 * B + 1.6) * SR); t = np.arange(n) / SR; pad = np.zeros(n)
    for j, m in enumerate(ch):
        for dt in (-0.06, 0.0, 0.06):
            f = nada(m) * 2 ** (dt / 12); pad += (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)) * (0.5 if j == 0 else 0.3)
    pad *= np.minimum(1, t / 0.9) * np.clip((4 * B + 1.6 - t) / 1.4, 0, 1)
    taruh(musik, lp(pad, 2400), t0, 0.14)
def pluck(m, g):
    n = int(0.9 * SR); t = np.arange(n) / SR; f = nada(m)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.07) + 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.03)) * np.minimum(1, t / 0.004) * g
POLA = [0, 2, 4, 3, 1, 3, 2, 4]                           # indeks nada akor, pluck 8th, melodi kaca yang tenang
for k in range(int(DUR / (4 * B)) + 1):
    ch = CH[k % 4]
    for j in range(8):
        x = k * 4 * B + j * B / 2
        if x > DUR - 3.0 or j % 2 == 1 and rng.random() < 0.55: continue
        taruh(musik, pluck(ch[POLA[j]] + 24, 0.06 if j % 4 == 0 else 0.04), x)
# denyut bas lembut (bukan seperti ketukan): satu nada rendah tiap bar
for k in range(int(DUR / (4 * B)) + 1):
    n = int(1.4 * SR); t = np.arange(n) / SR; f = nada(CH[k % 4][0] - 12)
    taruh(musik, np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.05) * np.exp(-t / 0.7) * 0.10, k * 4 * B)
# bentuk musik: masuk setelah dua "duk" pembuka, mengecil saat ketukan pertama dibekukan, mekar setelah bunyi hilang, penutup
bentuk = np.zeros(N)
def naik(a, b): return np.clip((t_all - a) / (b - a), 0, 1)
bentuk = 0.9 * naik(2.9, 5.0)
bentuk *= 1 - 0.55 * naik(23.4, 24.1) * (1 - naik(25.9, 26.8))
bentuk *= 1 + 0.18 * naik(31.8, 33.0) * (1 - naik(39.5, 40.5))
bentuk *= 1 - naik(45.0, 45.9)
musik = musik * bentuk
# penutup: akor C maj9 melebar bersama kartu
n = int(3.4 * SR); t = np.arange(n) / SR; pc = np.zeros(n)
for m in (48, 55, 64, 67, 71, 74):
    f = nada(m); pc += np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)
taruh(musik, lp(pc * np.minimum(1, t / 0.25) * np.exp(-t / 2.2) * 0.05, 3000) * (1 - naik(44.9, 45.9)[int(43.16 * SR):int(43.16 * SR) + n] if False else 1), 43.16)
# ducking di bawah narasi
duk_musik = 1 - 0.62 * smooth(ada_nar, 220)
musik *= duk_musik

# ---------------- efek ----------------
def duk(a):
    """Ketukan Korotkoff: dentum rendah lembut + resonansi diafragma stetoskop yang meredam cepat."""
    n = int(0.28 * SR); t = np.arange(n) / SR
    fr = 72 + 70 * np.exp(-t / 0.03); th = np.tanh(2.4 * np.sin(2 * np.pi * np.cumsum(fr) / SR)) * 0.62 * np.minimum(1, t / 0.003) * np.exp(-t / 0.075)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.045) * 0.45
    tik = bp(rng.standard_normal(n), 900, 2600) * np.exp(-t / 0.012) * 0.12
    return (th + body + tik) * a
def pompa():
    n = int(0.16 * SR); t = np.arange(n) / SR; x = bp(rng.standard_normal(n), 500, 3200) * np.minimum(1, t / 0.01) * np.exp(-t / 0.05)
    klik = np.zeros(n); klik[:int(0.004 * SR)] = np.hanning(int(0.004 * SR)) * 0.8
    return x * 0.5 + klik * 0.3
def pip(f=1568.0):
    n = int(0.28 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t / 0.05)) * eg(n, 0.003, 0.07) * 0.5
def lonceng():
    n = int(2.0 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f, a, d in ((1318.5, 0.5, 0.6), (1975.5, 0.3, 0.5), (2637.0, 0.2, 0.3)):
        x += (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.08)) * eg(n, 0.003, d) * a
    return x * 0.5
def swish(dur, f0, f1):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur; x = bp(rng.standard_normal(n), f0, f1, 2) * np.sin(np.pi * u) ** 2
    return x * 0.5
fx = np.zeros(N)
for e in KET:
    if e['jenis'] == 'hook': taruh(fx, duk(e['a']), e['t'], 0.55)
    elif e['jenis'] == 'korotkoff': taruh(fx, duk(e['a']), e['t'], 0.8)
    elif e['jenis'] == 'ringkas': taruh(fx, duk(e['a']), e['t'], 0.6)
# ketukan pertama: ekor bergema kecil agar terasa "momen" yang dibekukan
tt0 = [e['t'] for e in KET if e['jenis'] == 'korotkoff'][0]
n = int(1.9 * SR); t = np.arange(n) / SR; taruh(fx, lp(bp(rng.standard_normal(n), 180, 700) * np.exp(-t / 0.55) * np.minimum(1, t / 0.05) * 0.035, 900), tt0 + 0.02, 1.0)
for t0 in (7.30, 7.72, 8.14): taruh(fx, pompa(), t0, 0.9)
taruh(fx, swish(0.95, 700, 3800), 8.36, 0.07)                                    # kamera masuk ke lengan
for t0, f in ((4.742, 1568.0), (25.625, 1760.0), (32.703, 1396.9)): taruh(fx, pip(f), t0, 0.06)   # label pertanyaan, sistolik, diastolik
taruh(fx, lonceng(), 43.30, 0.05)                                                 # kartu penutup
taruh(fx, swish(0.8, 700, 3000), 39.72, 0.05)                                     # kembali ke Raka
# desis katup manset (sangat pelan; hanya saat dikempiskan)
tt = t_all; u = np.clip((tt - 14.3) / (31.9 - 14.3), 0, 1); h = bp(rng.standard_normal(N), 2200, 6500) * ((tt > 14.3) & (tt < 31.9)) * (0.35 + 0.4 * (1 - u)) * 0.006
fx += h * (1 - 0.8 * smooth(ada_nar, 220))

# ---------------- campur ----------------
mix = narasi * 1.0 + musik * 0.34 + fx * 0.9
pk = np.abs(mix).max(); print('puncak', round(float(pk), 3))
if pk > 0.97: mix = mix / pk * 0.97
st = np.stack([mix, mix], axis=1)
w = wave.open(out_path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x[np.abs(x) > 1e-5] ** 2)) + 1e-12)
print('RMS dBFS: narasi', round(rms_db(narasi), 1), 'musik', round(rms_db(musik * 0.34), 1), 'efek', round(rms_db(fx * 0.9), 1))
