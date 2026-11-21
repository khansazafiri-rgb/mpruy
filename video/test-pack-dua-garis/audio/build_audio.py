#!/usr/bin/env python3
"""Audio bagian edukasi video "Kenapa test pack bisa menunjukkan dua garis?": narasi Google AI Studio (narasi-edukasi.wav, apa adanya, hanya di-resample 24 -> 48 kHz; kecepatan/nada tidak diubah)
+ musik medical-tech pelan + aksen bunyi kecil (sintesis numpy/scipy sendiri, CC0; aksen gaya, bukan bunyi asli strip). Musik/aksen turun otomatis di bawah suara.
Pemakaian: python3 build_audio.py -> edu_mix.wav (48 kHz stereo, tepat sepanjang bagian edukasi) + events.json. Normalisasi -14 LUFS dilakukan di gabung.sh."""
import json, os, wave
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'stage', 'timeline.json'), encoding='utf-8'))
OFF = TL['OFF']; DUR = TL['EDU']; A = TL['A']; N = int(round(DUR * SR)); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(31)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
VOICE = np.zeros(N); v = signal.resample_poly(rd('narasi-edukasi.wav'), 2, 1); VOICE[T(OFF):T(OFF) + len(v)] += v[:N - T(OFF)]
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return signal.sosfilt(signal.butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, a=0.005, r=0.05, c=2.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** c; return e
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12); sine = lambda f, n: np.sin(2 * np.pi * f * np.arange(n) / SR)
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
# musik: pad hangat + pluck lembut, 96 BPM, Am - F - C - G (tenang, "medical tech")
CH = [([45, 52, 60], 33), ([41, 53, 57], 29), ([48, 55, 64], 36), ([43, 50, 59], 31)]
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.06): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.18 * np.sin(2 * np.pi * 2 * mf(m + det) * t)
    return lp(x, 1800) * np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2) * 0.07
def pluck(m, d=0.8):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8)) * np.exp(-t * 4.0) * env(n, 0.004, 0.05)
BEAT = 60 / 96; t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs = CH[bar % 4]; d = 4 * BEAT
    put(MUS, pad(ms, d + 0.8), t, 1.0)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.2 and (k % 2 == 0 or t > 6): put(MUS, pluck(ms[(k // 2) % 3] + 12 + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, np.sin(2 * np.pi * mf(bs) * np.arange(T(1.6)) / SR) * env(T(1.6), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
# aksen bunyi
def tone(f, d=0.5, g=1.0): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08) * g
def chime(ms, d=0.9): return S(*[np.concatenate([np.zeros(T(0.07 * i)), tone(mf(m), d)]) for i, m in enumerate(ms)])
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def snap(f=1500): n = T(0.09); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 55) + bp(rng.standard_normal(n), 2500, 7000) * np.exp(-tt * 90) * 0.5) * env(n, 0.001, 0.03)
def squish(): n = T(0.3); tt = np.arange(n) / SR; return (lp(rng.standard_normal(n), 900) * 0.6 + sine(170, n) * 0.5) * np.exp(-tt * 9) * env(n, 0.01, 0.1)
def ping(f=1760, d=0.5): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2.76 * f * tt)) * np.exp(-tt * 7) * env(n, 0.002, 0.08)
def soft_low(f=196, d=0.55): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 4.5) * env(n, 0.01, 0.15)   # nada rendah lembut (bukan alarm)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
tv = lambda tn: tn + OFF
fx('judul', bloop(520), 0.4, 0.16)
fx('mundur-ke-test-pack', whoosh(0.9, False, 400, 2800) * 0.6, tv(3.7), 0.14)
fx('ujung-kena-urine', squish(), tv(5.2), 0.26)
fx('masuk-penampang', whoosh(0.7, True, 300, 2600) * 0.6, tv(5.5), 0.14)
fx('masuk-mikro', whoosh(0.9, True, 250, 3200) * 0.6, tv(8.45), 0.14)
for i, tb in enumerate((17.3, 18.1, 18.8, 19.4, 20.0, 20.5, 20.9)): fx('hCG-menempel', snap(1700 - 60 * i), tv(tb), 0.20 if i < 3 else 0.11, -0.2 + 0.1 * i)
fx('area-T', ping(1568), tv(20.84), 0.18)
for i, tc in enumerate((21.85, 22.15, 22.45, 22.95, 23.4, 23.8, 24.2)): fx('tertangkap-T', snap(900 + 50 * i), tv(tc), 0.22 if i < 3 else 0.12, 0.1)
fx('keluar-mikro', whoosh(0.8, False, 400, 3000) * 0.6, tv(24.2), 0.13)
fx('garis-T-muncul', chime([81, 86], 0.9), tv(25.7), 0.16)
fx('area-C', ping(1976), tv(28.1), 0.18)
for i, tc in enumerate((29.35, 29.65, 29.95, 30.2)): fx('tertangkap-C', snap(1100 + 60 * i), tv(tc), 0.2, -0.1)
fx('masuk-mikro-C', whoosh(0.6, True, 300, 2600) * 0.6, tv(28.75), 0.12)
fx('garis-C-muncul', chime([84, 88], 0.9), tv(30.1), 0.16)
fx('tes-berjalan', chime([79, 84, 88], 0.9), tv(30.95), 0.14)
fx('tidak-valid', soft_low(185), tv(35.45), 0.2)
fx('hasil-C-T', chime([84, 88, 91], 1.0), tv(37.2), 0.15)
fx('hasil-C-saja', chime([79, 83], 0.9), tv(40.1), 0.13)
fx('terlalu-dini', bloop(480, 0.16), tv(45.6), 0.2)
fx('belum-cukup-tinggi', soft_low(220, 0.5), tv(48.3), 0.14)
fx('baca-petunjuk', whoosh(0.6, True, 300, 2400) * 0.6, tv(50.15), 0.12)
fx('akhir', chime([79, 84, 88], 1.2), tv(53.9), 0.10)
# campur: musik turun di bawah suara (ducking), aksen sedikit turun saat suara
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1)
gate = maximum_filter1d(gate, size=T(0.7)); gate = np.convolve(gate, np.ones(T(0.3)) / T(0.3), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 0.6) * np.minimum(1, (DUR - tt) / 0.9)
for c in range(2): MUS[c] = lp(MUS[c], 6000)
mg = 0.5 * (1 - 0.86 * gate) * fade; fg = 0.55 * (1 - 0.55 * gate)
mix = np.vstack([VOICE, VOICE]) + MUS * mg[None, :] + FX * fg[None, :]
pk = float(np.max(np.abs(mix))); mix = mix / max(1.0, pk) * 0.98
pcm = (np.clip(mix, -1, 1).T * 32767).astype('<i2')
wf = wave.open(os.path.join(HERE, 'edu_mix.wav'), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
json.dump({'durasi_edukasi': DUR, 'offset_narasi': OFF, 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1)
a, b = T(OFF), T(OFF + TL['NAR']); f = lambda X: float(np.sqrt(np.mean(X[a:b] ** 2)))
print('puncak mentah', round(pk, 3), 'durasi', len(pcm) / SR, '| rms suara', round(f(VOICE), 4), 'musik', round(f(MUS[0] * mg), 4), 'aksen', round(f(FX[0] * fg), 4), '| aksen:', len(EV))
