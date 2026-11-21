#!/usr/bin/env python3
"""Audio outro master MEDCOEL: audio outro Google AI Studio (outro-baru.wav, apa adanya, hanya di-resample 24 -> 48 kHz; kecepatan/nada tidak diubah) mulai di A0 detik,
+ musik pelan bersih + efek halus (sintesis numpy/scipy sendiri, CC0), semuanya BARU dan mandiri (tidak ada sisa audio video edukasi). Musik/efek turun otomatis di bawah suara.
Pemakaian: python3 build_audio.py -> mix.wav (48 kHz stereo, panjang tepat sama dengan video: DUR detik)"""
import json, os, wave
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 16.2; A0 = 0.7; N = int(round(DUR * SR)); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(5)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
VOICE = np.zeros(N); v = signal.resample_poly(rd('outro-baru.wav'), 2, 1); VOICE[T(A0):T(A0) + len(v)] += v
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return signal.sosfilt(signal.butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, a=0.005, r=0.05, c=2.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** c; return e
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
MUS = np.zeros((2, N)); FX = np.zeros((2, N)); EV = []
def put(buf, x, t0, g=1.0, pan=0.0):
    i = T(t0)
    if i >= N or i + len(x) <= 0: return
    a = max(0, -i); x = x[a:]; i = max(0, i); x = x[:N - i]
    buf[0, i:i + len(x)] += x * g * (1 - max(0, pan)); buf[1, i:i + len(x)] += x * g * (1 + min(0, pan))
def S(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
CH = [([48, 55, 64], 36), ([43, 50, 59], 31), ([45, 52, 60], 33), ([41, 53, 57], 29)]       # C - G - Am - F, 100 BPM
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.06): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.18 * np.sin(2 * np.pi * 2 * mf(m + det) * t)
    return lp(x, 1800) * np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 1.2) * 0.07
def pluck(m, d=0.8):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8)) * np.exp(-t * 4.0) * env(n, 0.004, 0.05)
BEAT = 60 / 100; t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs = CH[bar % 4]; d = 4 * BEAT
    put(MUS, pad(ms, d + 0.8), t, 1.0)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.4 and (k % 2 == 0 or t > 2.0): put(MUS, pluck(ms[(k // 2) % 3] + 12 + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, np.sin(2 * np.pi * mf(bs) * np.arange(T(1.6)) / SR) * env(T(1.6), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
def tone(f, d=0.5, g=1.0): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08) * g
def chime(ms, d=0.9): return S(*[np.concatenate([np.zeros(T(0.07 * i)), tone(mf(m), d)]) for i, m in enumerate(ms)])
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
# perpindahan segmen (selaras stage/scene.js SEG): Atlas -> Live 4D 2,7 | -> materi 5,2 | -> latihan 6,9 | -> simulasi 8,4 | -> logo 10,15
fx('mulai', bloop(560), 0.12, 0.16)
for name, tt_ in (('ke-live-4d', 2.62), ('ke-materi', 5.12), ('ke-latihan', 6.82), ('ke-simulasi', 8.32)): fx(name, whoosh(0.45, True, 300, 2600) * 0.6, tt_, 0.14)
fx('ke-logo', whoosh(0.55, True, 250, 3200) * 0.6, 9.82, 0.14)
fx('logo-medcoel', chime([84, 88, 91, 96], 1.6), 10.2, 0.09)
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1)
gate = maximum_filter1d(gate, size=T(0.7)); gate = np.convolve(gate, np.ones(T(0.3)) / T(0.3), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 0.12) * np.minimum(1, (DUR - tt) / 1.2)      # masuk 0,12 dtk (tanpa klik) | keluar 1,2 dtk
for c in range(2): MUS[c] = lp(MUS[c], 6000)
mg = 0.46 * (1 - 0.85 * gate) * fade; fg = 0.6 * (1 - 0.6 * gate)
mix = np.vstack([VOICE, VOICE]) + MUS * mg[None, :] + FX * fg[None, :]
pk = float(np.max(np.abs(mix))); mix = mix / max(1.0, pk) * 0.98
pcm = (np.clip(mix, -1, 1).T * 32767).astype('<i2')
wf = wave.open(os.path.join(HERE, 'mix.wav'), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
json.dump({'durasi': DUR, 'suara_mulai': A0, 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1)
print('puncak mentah', round(pk, 3), 'durasi', len(pcm) / SR, 'efek', len(EV))
