#!/usr/bin/env python3
"""Audio video USG: narasi edukasi Google AI Studio (narasi-edukasi.wav, apa adanya, tanpa ubah kecepatan/nada) + audio outro BARU (outro-baru.wav, apa adanya, hanya di-resample 24 -> 48 kHz)
+ musik pelan bersih + efek halus (sintesis numpy/scipy sendiri, CC0). Musik/efek diturunkan otomatis di bawah suara. Tidak ada alarm rumah sakit; 'ping' hanya gaya.
Pemakaian: python3 build_audio.py  -> mix.wav (48 kHz stereo, belum loudnorm) + events.json"""
import json, os, wave
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'stage', 'timeline.json'), encoding='utf-8'))
OFF = TL['OFF']; EDU_END = TL['EDU_END']; O0 = TL['O0']; MASTER_AT = TL['MASTER_AT']; DUR = TL['DUR']; AN = TL['A']
N = int(DUR * SR); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(21)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
def up2(x): return signal.resample_poly(x, 2, 1)
nar = up2(rd('narasi-edukasi.wav')); mas = up2(rd('outro-baru.wav'))
VOICE = np.zeros(N); VOICE[T(OFF):T(OFF) + len(nar)] += nar; VOICE[T(MASTER_AT):T(MASTER_AT) + len(mas)] += mas
def env(n, a=0.005, r=0.05, c=2.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** c; return e
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return signal.sosfilt(signal.butter(o, [a, b], 'band', fs=SR, output='sos'), x)
sine = lambda f, n: np.sin(2 * np.pi * f * np.arange(n) / SR)
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
# ------------------------------------------------------------------ musik: pad hangat + pluck lembut, 100 BPM, C - G - Am - F (ringan, optimis)
CH = [([48, 55, 64], 36), ([43, 50, 59], 31), ([45, 52, 60], 33), ([41, 53, 57], 29)]
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.06): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.18 * np.sin(2 * np.pi * 2 * mf(m + det) * t)
    return lp(x, 1800) * np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2) * 0.07
def pluck(m, d=0.8):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8)) * np.exp(-t * 4.0) * env(n, 0.004, 0.05)
BEAT = 60 / 100; t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs = CH[bar % 4]; d = 4 * BEAT
    put(MUS, pad(ms, d + 0.8), t, 1.0)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.0 and (k % 2 == 0 or t > 8): put(MUS, pluck(ms[(k // 2) % 3] + 12 + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, np.sin(2 * np.pi * mf(bs) * np.arange(T(1.6)) / SR) * env(T(1.6), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
put(MUS, pad([48, 60, 64, 67], 4.0), DUR - 4.2, 1.2)
# ------------------------------------------------------------------ efek halus
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def tone(f, d=0.5, g=1.0): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08) * g
def chime(ms, d=0.9): return S(*[np.concatenate([np.zeros(T(0.07 * i)), tone(mf(m), d)]) for i, m in enumerate(ms)])
def ping(f=1500, d=0.22): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * np.cumsum(f * (0.7 + 0.5 * (1 - np.exp(-tt * 30)))) / SR) * np.exp(-tt * 16) * env(n, 0.002, 0.04)   # pulsa keluar: naik (gaya)
def tink(f=2300, d=0.35, g=1.0): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt)) * np.exp(-tt * 13) * env(n, 0.001, 0.05) * g   # gema kembali: tink pendek
def tick(): n = T(0.03); return (sine(2400, n) * 0.5 + bp(rng.standard_normal(n), 2500, 8000) * 0.5) * np.exp(-np.arange(n) / SR * 150)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def squish(): n = T(0.32); tt = np.arange(n) / SR; return (lp(rng.standard_normal(n), 900) * 0.6 + sine(160, n) * 0.5) * np.exp(-tt * 9) * env(n, 0.01, 0.1)
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
tv = lambda tn: tn + OFF
fx('probe-mulai-bergeser', S(whoosh(0.55, True, 300, 2200) * 0.6, tick()), tv(AN['probe'] - 0.05), 0.20)
fx('judul-hook', bloop(520), 0.35, 0.18)
fx('transisi-ke-ilustrasi', whoosh(0.9, False, 400, 3000) * 0.6, tv(7.1), 0.16)
fx('gel-menempel', squish(), tv(AN['gel'] + 0.15), 0.30)
fx('gelombang-lewat', chime([79, 86], 0.7), tv(AN['lewat']), 0.12)
fx('pulsa-keluar', ping(1400), tv(AN['mengirim']), 0.20)
fx('gema-kembali', tink(2300), tv(15.12 + 2 * 170 / 60), 0.26, 0.1)
for t_ in (23.25, 23.7, 24.15): fx('pulsa-lain', ping(1300 + 150 * (t_ - 23.25)), tv(t_), 0.14)
fx('pulsa-keluar-2', ping(1400), tv(24.9), 0.16)
fx('gema-dekat', tink(2500), tv(27.52), 0.24, -0.1)
fx('gema-dalam', tink(1500, 0.5, 0.8), tv(30.13), 0.22, 0.1)
t0s, t1s = 31.75, 35.35; k = 0
while t0s + k * 0.115 < t1s:
    tt_ = t0s + k * 0.115; fx('garis-pindai', tick() * (0.7 + 0.3 * (k % 2)), tv(tt_), 0.10 + 0.06 * (tt_ - t0s) / (t1s - t0s), -0.3 + 0.6 * (tt_ - t0s) / (t1s - t0s)); k += 1
fx('gambar-jadi', chime([84, 88, 91], 0.9), tv(35.5), 0.16)
fx('geser-miring', whoosh(1.6, True, 250, 2600) * 0.6, tv(AN['digeserLagi'] - 0.1), 0.16)
fx('gambar-berubah', chime([79, 83], 0.7), tv(AN['maka']), 0.14)
fx('kembali-ke-simulasi', whoosh(0.7, True, 300, 2500) * 0.6, tv(46.45), 0.16)
fx('masuk-outro', whoosh(0.8, True, 200, 3000), O0 - 0.3, 0.14)
fx('logo-medcoel', chime([84, 88, 91, 96], 1.4), O0 + 9.55, 0.09)
# ------------------------------------------------------------------ campur: musik turun di bawah suara (ducking dari selubung suara), efek lebih pelan saat suara
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1)
gate = maximum_filter1d(gate, size=T(0.7)); gate = np.convolve(gate, np.ones(T(0.3)) / T(0.3), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 1.0) * np.minimum(1, (DUR - tt) / 1.5)
for c in range(2): MUS[c] = lp(MUS[c], 6000)
mg = 0.55 * (1 - 0.88 * gate) * fade; fg = 0.6 * (1 - 0.6 * gate)
mix = np.vstack([VOICE, VOICE]) + MUS * mg[None, :] + FX * fg[None, :]
pk = float(np.max(np.abs(mix))); print('puncak mentah', round(pk, 3), 'durasi', round(DUR, 2))
mix = mix / max(1.0, pk) * 0.98
pcm = (np.clip(mix, -1, 1).T * 32767).astype('<i2')
wf = wave.open(os.path.join(HERE, 'mix.wav'), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
json.dump({'offset_narasi': OFF, 'outro_mulai': round(O0, 3), 'audio_outro_mulai': round(MASTER_AT, 3), 'durasi': round(DUR, 3), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1)
a, b = T(OFF), T(EDU_END); f = lambda X: float(np.sqrt(np.mean(X[a:b] ** 2)))
print('rms edukasi: suara', round(f(VOICE), 4), 'musik', round(f(MUS[0] * mg), 4), 'efek', round(f(FX[0] * fg), 4), '| efek:', len(EV))
