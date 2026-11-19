#!/usr/bin/env python3
"""Audio video "Kenapa angka termometer air raksa tidak langsung turun?". TIGA JALUR TERPISAH (stem stereo 48 kHz) lalu dicampur:
  1) suara  = narasi-edukasi.wav (Google AI Studio, 24 kHz mono, 72,28 dtk, TIDAK dipercepat/diubah nadanya; hanya di-resample 24->48 kHz) mulai detik 0,
              lalu medcoel-outro-master.wav (master suara outro baku MEDCOEL, SAMA PERSIS, hanya di-resample) mulai di cues.json["t_outro"] saat web asli sudah terlihat 1,2 dtk.
  2) musik  = stem-musik.wav: pad hangat + pluck lembut 72 BPM, disintesis dari kode (numpy/scipy), diturunkan di bawah suara.
  3) sfx    = stem-sfx.wav: tik halus mengikuti kenaikan kolom (setiap 0,1 derajat, waktu dihitung dari cues.json["colKeys"] = fungsi yang sama dengan stage), tok saat kolom terputus
              di penyempitan, klik penahan, beep termometer digital, bunyi kaca retak kecil/butir merkuri/uap TANPA efek dramatis, chime ringkasan.
Lisensi musik + SFX: CC0 1.0 (dibuat dari kode, tanpa sampel/musik pihak ketiga). Skalar tunggal (puncak) diterapkan ke seluruh campuran; hubungan level narasi-outro tidak diubah.
Pemakaian: python3 audio/audio_mix.py -> stem-suara/musik/sfx.wav, mix.wav, events.json (butuh numpy, scipy)."""
import json, os, wave
import numpy as np
from scipy import signal
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json'))); W = C['w']
DUR = C['dur']; EDU_END = C['edu_end']; MASTER_AT = C['t_outro']; N = int(DUR * SR); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(7)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
up2 = lambda x: signal.resample_poly(x, 2, 1)
nar = up2(rd('narasi-edukasi.wav')[:int(EDU_END * 24000)]); mas = up2(rd('medcoel-outro-master.wav'))
VOICE = np.zeros(N); VOICE[:len(nar)] += nar; VOICE[T(MASTER_AT):T(MASTER_AT) + len(mas)] += mas
def env(n, a=0.005, r=0.05, c=2.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** c; return e
lp = lambda x, f, o=2: signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
bp = lambda x, a, b, o=2: signal.sosfilt(signal.butter(o, [a, b], 'band', fs=SR, output='sos'), x)
sine = lambda f, n: np.sin(2 * np.pi * f * np.arange(n) / SR)
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
MUS = np.zeros((2, N)); FX = np.zeros((2, N)); EV = []
def put(buf, x, t0, g=1.0, pan=0.0):
    i = T(t0)
    if i >= N or i + len(x) <= 0: return
    a = max(0, -i); x = x[a:]; i = max(0, i); x = x[:N - i]
    buf[0, i:i + len(x)] += x * g * (1 - max(0, pan)); buf[1, i:i + len(x)] += x * g * (1 + min(0, pan))
S = lambda *xs: sum(np.pad(x, (0, max(len(y) for y in xs) - len(x))) for x in xs)
# ------------------------------------------------------------------ kolom: fungsi pchip yang SAMA dengan stage/lib.js
def pchip(keys):
    n = len(keys); h = [keys[i + 1][0] - keys[i][0] for i in range(n - 1)]; d = [(keys[i + 1][1] - keys[i][1]) / h[i] for i in range(n - 1)]; m = [0.0] * n
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0: m[i] = 0
        else: w1 = 2 * h[i] + h[i - 1]; w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    m[0] = d[0]; m[n - 1] = d[n - 2]
    def f(x):
        if x <= keys[0][0]: return keys[0][1]
        if x >= keys[-1][0]: return keys[-1][1]
        i = 0
        while x > keys[i + 1][0]: i += 1
        t = (x - keys[i][0]) / h[i]; t2 = t * t; t3 = t2 * t
        return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1]
    return f
colT = pchip(C['colKeys'])
def crossings(lo=34.55, hi=37.5, step=0.1):
    out = []; tt = np.arange(C['colKeys'][0][0], C['colKeys'][-1][0], 0.002); v = np.array([colT(x) for x in tt]); lvl = lo
    while lvl <= hi + 1e-9:
        i = np.argmax(v >= lvl); 
        if v[i] >= lvl and i > 0: out.append((round(float(tt[i]), 3), round(lvl, 2)))
        lvl += step
    return out
# ------------------------------------------------------------------ musik: pad hangat + pluck lembut, 72 BPM
CH = [([48, 55, 64], 36), ([45, 52, 60], 33), ([41, 53, 57], 29), ([43, 50, 59], 31)]
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.06): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.18 * np.sin(2 * np.pi * 2 * mf(m + det) * t)
    return lp(x, 1800) * np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2) * 0.07
def pluck(m, d=0.9):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8)) * np.exp(-t * 3.6) * env(n, 0.004, 0.05)
BEAT = 60 / 72; t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs = CH[bar % 4]; d = 4 * BEAT; put(MUS, pad(ms, d + 0.8), t, 1.0)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.0 and (k % 2 == 0 or t > 6): put(MUS, pluck(ms[(k // 2) % 3] + 12 + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, sine(mf(bs), T(1.6)) * env(T(1.6), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
put(MUS, pad([48, 60, 64, 67], 4.0), DUR - 4.2, 1.2)
# ------------------------------------------------------------------ efek halus
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def tone(f, d=0.5, g=1.0): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08) * g
def chime(ms, d=0.9): return S(*[np.concatenate([np.zeros(T(0.07 * i)), tone(mf(m), d)]) for i, m in enumerate(ms)])
def click(): n = T(0.05); return S(bp(rng.standard_normal(n), 1500, 6500) * np.exp(-np.arange(n) / SR * 90), sine(220, n) * np.exp(-np.arange(n) / SR * 60) * 0.7)
def tick(f): n = T(0.035); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 140) * env(n, 0.001, 0.01)
def thud(f=150, d=0.18): n = T(d); fr = np.geomspace(f, f * 0.45, n); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-np.arange(n) / SR / 0.05)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def beep(f=2400, d=0.09): n = T(d); return sine(f, n) * env(n, 0.003, 0.02)
def glide(f0, f1, d): n = T(d); fr = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.05, 0.3)
def airy(d): n = T(d); return lp(rng.standard_normal(n), 2500) * env(n, 0.3, 0.5)
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
fx('tarik-termometer', whoosh(0.7, True, 250, 1800), 0.55, 0.10)
fx('chip-hook', bloop(520), 4.15, 0.22)
fx('masuk-penampang', whoosh(1.0, True, 200, 2600), 6.4, 0.13)
fx('label-airraksa', bloop(480), W['airRaksa'], 0.24); fx('logam-cair', bloop(300, 0.2), W['logam'], 0.26)
fx('label-wadah', bloop(520), W['wadah'], 0.24); fx('label-saluran', bloop(560), W['saluran'], 0.24)
fx('kontak-hangat', glide(220, 330, 1.2), 17.26, 0.10)
for tt_, lv in crossings(): fx('tik-kolom', tick(1500 + 140 * (lv - 34.5)), tt_, 0.17, 0.0)
fx('ghost', bloop(500), W['semakin'], 0.22); fx('baca-angka', chime([79, 83], 0.8), W['ujung'], 0.10)
fx('bagian-penting', bloop(420, 0.2), W['penting'], 0.26); fx('label-penyempitan', bloop(560), W['penyempitan'], 0.24); fx('label-wadah2', bloop(500), W['wadah2'], 0.22)
fx('dilepas', whoosh(0.6, False, 300, 1800), W['dilepas'], 0.10); fx('mulai-dingin', glide(330, 220, 0.9), W['dingin'], 0.08)
fx('kolom-terputus', S(thud(170), tick(2600) * 0.5), C['t_sep'], 0.34)
fx('menahan-klik', S(click(), tone(mf(76), 0.4) * 0.5), W['menahan'], 0.22)
fx('baca-tertinggi', chime([79, 84], 0.9), W['tertinggi'], 0.12)
fx('diatur-ulang', bloop(400, 0.2), W['diatur'], 0.24); fx('reset-geser', glide(520, 300, 1.4), 50.9, 0.07)
fx('digital', S(beep(2400), np.pad(beep(2400), (T(0.13), 0))), W['digital'] + 0.25, 0.10)
fx('kaca-retak', S(tick(3200), bp(rng.standard_normal(T(0.05)), 3000, 9000) * np.exp(-np.arange(T(0.05)) / SR * 70) * 0.5), W['pecah'], 0.16)
for i, dt in enumerate((0, 0.11, 0.2, 0.34, 0.45)): fx('butir-merkuri', tick(2200 + 220 * (i % 3)), W['tersebar'] + dt, 0.09, -0.3 + 0.15 * i)
fx('uap', airy(1.6), W['uapnya'], 0.06)
fx('beep-digital-raka', S(beep(2400), np.pad(beep(2400), (T(0.13), 0))), 62.2, 0.10); fx('bebas-merkuri', chime([79, 83, 88], 0.9), W['tanpa'], 0.10)
fx('memuai', chime([72], 0.8), W['pemuayan'], 0.12); fx('naik', chime([76], 0.8), W['saluran3'], 0.12); fx('tertahan', chime([79], 0.8), W['penyempitan2'], 0.12); fx('hasil', chime([72, 79, 84], 1.2), W['hasilnya'], 0.09)
fx('masuk-outro', whoosh(0.8, True, 200, 3000), C['t_web'] - 0.3, 0.14); fx('logo-medcoel', chime([84, 88, 91, 96], 1.4), C['t_web'] + 9.4, 0.08)
# ------------------------------------------------------------------ campur: ducking musik/efek di bawah suara
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1); gate = np.convolve(gate, np.ones(T(0.25)) / T(0.25), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 1.5) * np.minimum(1, (DUR - tt) / 1.5)
for c in range(2): MUS[c] = lp(MUS[c], 6000)
mg = 0.55 * (1 - 0.8 * gate) * fade; fg = 0.5 * (1 - 0.6 * gate)
V2 = np.vstack([VOICE, VOICE]); M2 = MUS * mg[None, :]; F2 = FX * fg[None, :]
mix = V2 + M2 + F2; pk = float(np.max(np.abs(mix))); print('puncak mentah', round(pk, 3), 'durasi', round(DUR, 2))
k = 0.90 / max(1.0, pk)
def wr(name, a):
    pcm = (np.clip(a * k, -1, 1).T * 32767).astype('<i2'); wf = wave.open(os.path.join(HERE, name), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
wr('stem-suara.wav', V2); wr('stem-musik.wav', M2); wr('stem-sfx.wav', F2); wr('mix.wav', mix)
json.dump({'narasi_dipotong_di': EDU_END, 'master_mulai': MASTER_AT, 'durasi': DUR, 'skalar_puncak': round(k, 4), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1, ensure_ascii=False)
print('selesai', len(EV), 'efek')
