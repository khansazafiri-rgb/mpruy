#!/usr/bin/env python3
"""Audio video SpO2: narasi Google AI Studio (narasi-edukasi.wav, dipotong di jeda alami 83,9 dtk, tanpa ubah kecepatan/nada) +
master outro MEDCOEL (medcoel-outro-master.wav, SAMA PERSIS, hanya di-resample 24 -> 48 kHz) + musik pelan bersih + efek halus (sintesis numpy/scipy, CC0).
Ritme denyut halus mengikuti fase denyut yang sama dengan animasi (stage/physics.js). Tidak ada alarm rumah sakit.
Pemakaian: python3 build_audio.py -> mix.wav (48 kHz stereo) + events.json"""
import json, os, wave
import numpy as np
from scipy import signal
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__))
OFF = 0.3; EDU_END = 83.9; O0 = EDU_END + OFF + 0.45; MASTER_AT = O0 + 1.2; MASTER_LEN = 10.84; DUR = MASTER_AT + MASTER_LEN + 3.1
N = int(DUR * SR); T = lambda s: int(round(s * SR))
rng = np.random.default_rng(11)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
def up2(x): return signal.resample_poly(x, 2, 1)
nar = up2(rd('narasi-edukasi.wav')[:int(EDU_END * 24000)]); mas = up2(rd('medcoel-outro-master.wav'))
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
# ------------------------------------------------------------------ fase denyut (salinan stage/physics.js)
HR = 1.2; T0B = 25.62; SLOW = [(23.4, 26.5, 0.55)]
def phase(tn):
    ph = HR * (tn - T0B)
    for a, b, r in SLOW: ph += (r - HR) * (min(max(tn, a), b) - min(max(T0B, a), b))
    return ph
def beats(a, b):
    out = []; tn = a
    while tn < b:
        ph = phase(tn); nxt = np.ceil(ph - 1e-9)
        lo, hi = tn, tn + 3.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if phase(mid) >= nxt: hi = mid
            else: lo = mid
        if hi > b: break
        out.append(hi); tn = hi + 1e-3
    return out
# ------------------------------------------------------------------ musik: pad hangat + pluck lembut, tempo 72 BPM (= denyut contoh 72/menit)
CH = [([48, 55, 64], 36), ([45, 52, 60], 33), ([41, 53, 57], 29), ([43, 50, 59], 31)]     # C, Am, F, G (nada pad, bas)
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.06): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.18 * np.sin(2 * np.pi * 2 * mf(m + det) * t)
    return lp(x, 1800) * np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2) * 0.07
def pluck(m, d=0.9):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8)) * np.exp(-t * 3.6) * env(n, 0.004, 0.05)
BEAT = 60 / 72
t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs = CH[bar % 4]; d = 4 * BEAT
    put(MUS, pad(ms, d + 0.8), t, 1.0, 0.0)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.0 and (k % 2 == 0 or t > 6): put(MUS, pluck(ms[(k // 2) % 3] + 12 + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, np.sin(2 * np.pi * mf(bs) * np.arange(T(1.6)) / SR) * env(T(1.6), 0.05, 0.6) , t, 0.10)
    t += d; bar += 1
# bagian akhir: resolusi lembut ke C
put(MUS, pad([48, 60, 64, 67], 4.0), DUR - 4.2, 1.2)
# ------------------------------------------------------------------ efek halus
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def tone(f, d=0.5, g=1.0): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08) * g
def chime(ms, d=0.9): return S(*[np.concatenate([np.zeros(T(0.07 * i)), tone(mf(m), d)]) for i, m in enumerate(ms)])
def click(): n = T(0.05); return S(bp(rng.standard_normal(n), 1500, 6500) * np.exp(-np.arange(n) / SR * 90), sine(220, n) * np.exp(-np.arange(n) / SR * 60) * 0.7)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def lub(): n = T(0.20); tt = np.arange(n) / SR; return np.sin(2 * np.pi * np.cumsum(62 + 60 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 16)
def dup(): n = T(0.16); tt = np.arange(n) / SR; return np.sin(2 * np.pi * np.cumsum(55 + 45 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 20) * 0.6
def rustle(d): n = T(d); tt = np.arange(n) / SR; return bp(rng.standard_normal(n), 1200, 7000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * tt))) * env(n, 0.05, 0.12)
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
tv = lambda tn: tn + OFF       # detik narasi -> detik video
fx('klik-penjepit', click(), 0.30, 0.55)
fx('lampu-merah', tone(mf(72), 0.45), tv(8.30), 0.30); fx('lampu-inframerah', S(tone(mf(79), 0.5), tone(mf(84), 0.5) * 0.6), tv(8.72), 0.30)
fx('sensor', bloop(700, 0.16), tv(10.42), 0.12)
fx('cahaya-melewati', whoosh(1.1, False, 300, 3000), tv(11.36), 0.10)
for tn_, nm in ((17.15, 'Hb-O2'), (18.95, 'Hb-tanpa-O2'), (20.3, 'serapan')): fx('label-' + nm, bloop(520 if nm != 'Hb-tanpa-O2' else 400), tv(tn_), 0.28)
# denyut halus (lub-dup) selaras fase denyut: dari 23,9 sampai 39,1 (nadi)
for b_ in beats(23.4, 39.2):
    g = 0.5 * (1 - 0.6 * max(0, (b_ - 37.6) / 2))
    fx('denyut', S(lub(), np.concatenate([np.zeros(T(0.2)), dup()])), tv(b_), 0.5 * g)
for tn_, nm in ((27.4, 'tinggi-denyut'), (29.1, 'kurva')): fx('label-' + nm, bloop(560), tv(tn_), 0.24)
fx('spo2-hasil', chime([79, 83, 88], 0.9), tv(29.7), 0.10)
fx('hb-bar', bloop(500), tv(31.6), 0.22)
fx('ring-spo2', chime([84, 88], 0.8), tv(34.92), 0.08); fx('ring-pr', chime([79, 86], 0.8), tv(36.52), 0.08)
fx('masuk-layar-hasil', whoosh(0.7, True, 200, 2500), tv(34.4), 0.12)
for tn_ in (39.58, 42.84, 44.72): fx('potong-kegunaan', bloop(480), tv(tn_), 0.26)
fx('bukan-diagnosis', S(lub(), bloop(300, 0.2)), tv(50.76), 0.5)
for tn_, f in ((53.12, 92), (53.86, 70), (54.80, 64), (56.18, 78), (56.80, 72)): fx('gangguan', bloop(mf(f) * 0.5 + 200, 0.14), tv(tn_), 0.26)
fx('co2-silang', bloop(260, 0.22), tv(60.32), 0.3)
fx('co-masuk', whoosh(1.4, True, 200, 1200), tv(62.0), 0.10); fx('co-hb', bloop(330, 0.2), tv(63.22), 0.3)
fx('tampak-meyakinkan', chime([84, 88], 0.8), tv(66.1), 0.10); fx('berbahaya', S(tone(mf(60), 0.7), tone(mf(56), 0.7) * 0.8), tv(67.02), 0.08)
fx('hangatkan', rustle(1.0), tv(70.64), 0.22); fx('cat-kuku', rustle(1.4), tv(72.1), 0.16)
fx('stabil', chime([84, 88, 91], 1.0), tv(76.2), 0.10)
fx('gejala', bloop(520), tv(77.04), 0.24); fx('pertolongan-1', bloop(300, 0.2), tv(79.3), 0.28); fx('menunggu-dicoret', whoosh(0.3, True, 800, 4000), tv(81.45), 0.14); fx('pertolongan-3', chime([79, 83, 88], 1.0), tv(82.65), 0.08)
fx('masuk-outro', whoosh(0.8, True, 200, 3000), O0 - 0.3, 0.14)
fx('logo-medcoel', chime([84, 88, 91, 96], 1.4), O0 + 9.4, 0.08)
# ------------------------------------------------------------------ campur: musik diturunkan di bawah suara (ducking dari selubung suara), efek lebih pelan saat suara
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1); gate = np.convolve(gate, np.ones(T(0.25)) / T(0.25), 'same')
tt = np.arange(N) / SR
fade = np.minimum(1, tt / 1.5) * np.minimum(1, (DUR - tt) / 1.5)
for c in range(2): MUS[c] = lp(MUS[c], 6000)
mg = 0.55 * (1 - 0.8 * gate) * fade; fg = 0.5 * (1 - 0.75 * gate)
mix = np.vstack([VOICE, VOICE]) + MUS * mg[None, :] + FX * fg[None, :]
pk = float(np.max(np.abs(mix))); print('puncak mentah', round(pk, 3), 'durasi', round(DUR, 2))
mix = mix / max(1.0, pk) * 0.98
pcm = (np.clip(mix, -1, 1).T * 32767).astype('<i2')
wf = wave.open(os.path.join(HERE, 'mix.wav'), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
json.dump({'offset_narasi': OFF, 'narasi_dipotong_di': EDU_END, 'outro_mulai': round(O0, 3), 'master_mulai': round(MASTER_AT, 3), 'durasi': round(DUR, 3), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1, ensure_ascii=False)
if os.environ.get('DIAG'):
    a, b = T(OFF), T(EDU_END); f = lambda X: float(np.sqrt(np.mean(X[a:b] ** 2)))
    print('rms 0-83,9: suara', round(f(VOICE), 4), 'musik', round(f(MUS[0] * mg), 4), 'efek', round(f(FX[0] * fg), 4))
print('selesai', len(EV), 'efek')
