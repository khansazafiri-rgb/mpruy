#!/usr/bin/env python3
"""Audio promo "Satu bab dulu": musik + SFX sintesis (numpy/scipy, CC0, dibuat dari nol) + audio pengguna `narator.wav` (9,28 dtk).
Narasi TIDAK diubah, dipercepat, atau dipotong: hanya di-resample 24 kHz -> 48 kHz (kelipatan 2) dan diletakkan tepat di 20,0 dtk, saat rekaman web muncul.
Cerita awal tanpa narator: musik, blip agenda, dan efek kecil mengikuti aksi di layar. Waktu mengikuti stage/timeline.mjs + scenes.js (konstanta disalin di sini).
Pemakaian: python3 audio_mix.py  -> mix.wav (48 kHz stereo) + events.json. Lalu loudnorm di ffmpeg (lihat README)."""
import json, os, wave
import numpy as np
from scipy import signal
SR = 48000; DUR = 40.0; N = int(DUR * SR); HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)
T = lambda s: int(round(s * SR))
def tarr(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.005, r=0.05, curve=2.0):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr) ** curve; return e
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, f0, f1, o=2): return signal.sosfilt(signal.butter(o, [f0, f1], 'band', fs=SR, output='sos'), x)
def sq(f, n, duty=0.5): t = np.arange(n) / SR; ph = (f * t) % 1; return np.where(ph < duty, 1.0, -1.0)
def tri(f, n): t = np.arange(n) / SR; return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
def sine(f, n): return np.sin(2 * np.pi * f * np.arange(n) / SR)
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
OUT = np.zeros((2, N)); 
def put(x, t0, g=1.0, pan=0.0):
    i = T(t0); 
    if i >= N or i + len(x) <= 0: return
    a = max(0, -i); x = x[a:]; i = max(0, i); x = x[:N - i]
    OUT[0, i:i + len(x)] += x * g * (1 - max(0, pan)); OUT[1, i:i + len(x)] += x * g * (1 + min(0, pan))
MUS = np.zeros((2, N))
def putm(x, t0, g=1.0, pan=0.0):
    i = T(t0)
    if i >= N or i + len(x) <= 0: return
    a = max(0, -i); x = x[a:]; i = max(0, i); x = x[:N - i]
    MUS[0, i:i + len(x)] += x * g * (1 - max(0, pan)); MUS[1, i:i + len(x)] += x * g * (1 + min(0, pan))
# ------------------------------------------------------------------ nada musik
def pluck(m, d, bright=1.0):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 7) + 0.12 * bright * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 12)
    return x * np.exp(-t * (3.2 + f / 500)) * env(n, 0.003, 0.03)
def chip(m, d, duty=0.25, lpf=3800):
    n = T(d); x = sq(mf(m), n, duty); return lp(x, lpf, 2) * env(n, 0.003, 0.03, 1.5)
def bass(m, d): n = T(d); return (tri(mf(m), n) * 0.9 + 0.3 * sine(mf(m), n)) * env(n, 0.004, 0.06)
def pad(ms, d, g=1.0):
    n = T(d); x = np.zeros(n); t = np.arange(n) / SR
    for m in ms:
        for det in (-0.07, 0.07): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.25 * np.sin(2 * np.pi * 2 * mf(m + det) * t)
    return lp(x, 2400) * np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.7) * g * 0.12
def kick(): n = T(0.22); t = np.arange(n) / SR; f = 45 + 95 * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
def snare(): n = T(0.16); return bp(rng.standard_normal(n), 1500, 7000) * np.exp(-np.arange(n) / SR * 26) * 0.7 + sine(190, n) * np.exp(-np.arange(n) / SR * 40) * 0.3
def hat(o=False): n = T(0.12 if o else 0.04); return hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR * (22 if o else 90)) * 0.5
CH = {'Am': (45, [57, 60, 64]), 'F': (41, [57, 60, 65]), 'C': (48, [60, 64, 67]), 'G': (43, [59, 62, 67]), 'Em': (40, [59, 64, 67]), 'Dm': (38, [57, 62, 65])}
# ---- A (0 - 16 dtk): 120 BPM, sibuk (Am - F - C - G, tiap bar 2 dtk); drum + arpeggio 16th + bass pulsa
def sectionA():
    prog = ['Am', 'F', 'C', 'G']
    for bar in range(8):
        ch = prog[bar % 4]; root, tones = CH[ch]; t0 = bar * 2.0
        busy = 1.0 + (0.5 if t0 >= 11 else 0)          # sejak 11 dtk (pulang, laptop) makin padat
        for b in range(4):
            tb = t0 + b * 0.5
            putm(kick(), tb, 0.55); putm(bass(root, 0.22), tb, 0.5); putm(bass(root + 12, 0.18), tb + 0.25, 0.28)
            if b in (1, 3): putm(snare(), tb, 0.35)
            putm(hat(False), tb + 0.25, 0.30)
            if t0 >= 11: putm(hat(False), tb + 0.125, 0.18); putm(hat(False), tb + 0.375, 0.18)
            for k in range(4):                          # 16th arp
                pat = [0, 1, 2, 1] if (k + b) % 2 == 0 else [2, 1, 0, 1]
                m = tones[pat[k]] + (12 if k == 3 else 0) + 12
                putm(chip(m, 0.11), tb + k * 0.125, 0.16 + 0.05 * (k == 0), pan=-0.2 if k % 2 else 0.2)
        if t0 >= 11: putm(pad([tones[0] + 12, tones[1] + 12, tones[2] + 12], 2.0), t0, 0.5)
# ---- B (16 - 20 dtk): melambat 120 -> 84 BPM, drum berhenti, jadi tertata (C - G - Am - F, pluck rata 8th)
def sectionB():
    prog = ['C', 'G', 'Am', 'F']; tt = 16.0; i = 0
    putm(kick(), 16.0, 0.6); putm(snare(), 16.0, 0.4)
    while tt < 20.0:
        prog_i = int((tt - 16.0) / 1.0) % 4; ch = prog[prog_i]; root, tones = CH[ch]
        frac = (tt - 16.0) / 4.0; dt = 0.25 + 0.14 * frac          # 8th note dari 0,25 dtk -> 0,39 dtk (≈120 -> 77 BPM)
        if i % 4 == 0: putm(bass(root, 0.5), tt, 0.5 * (1 - 0.3 * frac))
        putm(pluck(tones[[0, 1, 2, 1][i % 4]] + 12, 0.5), tt, 0.30 * (1 - 0.1 * frac), pan=-0.15 if i % 2 else 0.15)
        if i % 4 == 0: putm(pad([t + 12 for t in tones], 1.2), tt, 0.7)
        tt += dt; i += 1
# ---- C (20 - 32 dtk): tenang 84 BPM di bawah narasi (C - G - Am - F), pluck lembut + bas + pad
def sectionC():
    prog = ['C', 'G', 'Am', 'F']; beat = 60 / 84
    for bar in range(5):
        ch = prog[bar % 4]; root, tones = CH[ch]; t0 = 20.0 + bar * 4 * beat
        if t0 >= 32: break
        putm(pad([t + 12 for t in tones], 4 * beat + 0.4), t0, 0.9)
        putm(bass(root, 0.9), t0, 0.55); putm(bass(root, 0.7), t0 + 2 * beat, 0.4)
        for k in range(8):
            tk = t0 + k * beat / 2
            if tk < 32: putm(pluck(tones[[0, 1, 2, 1, 2, 1, 0, 1][k]] + (24 if k % 4 == 3 else 12), 0.7), tk, 0.22, pan=-0.2 if k % 2 else 0.2)
# ---- D (32 - 40 dtk): penutup cerah, berakhir mantap di C
def sectionD():
    prog = ['F', 'G', 'Am', 'F', 'G', 'C']; beat = 60 / 90
    for bar in range(6):
        ch = prog[bar]; root, tones = CH[ch]; t0 = 32.0 + bar * 1.36
        putm(pad([t + 12 for t in tones] + [tones[0] + 24], 1.9), t0, 1.0)
        putm(bass(root, 0.6), t0, 0.5); putm(bass(root, 0.4), t0 + 0.68, 0.35)
        for k in range(4):
            if t0 + k * 0.34 < 39.0: putm(pluck(tones[[0, 1, 2, 1][k]] + 24, 0.5), t0 + k * 0.34, 0.2, pan=-0.2 if k % 2 else 0.2)
    putm(pad([48, 60, 64, 67, 72], 3.0), 37.6, 1.2); putm(bass(36, 2.4), 37.6, 0.7)
    for k, m in enumerate([72, 76, 79, 84]): putm(pluck(m, 1.2, 1.2), 37.6 + k * 0.09, 0.25)
sectionA(); sectionB(); sectionC(); sectionD()
# ------------------------------------------------------------------ narasi pengguna (tidak diubah; hanya resample 2x) di NAR0
w = wave.open(os.path.join(HERE, 'narator.wav')); raw = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768; assert w.getframerate() == 24000
nar = signal.resample_poly(raw, 2, 1); NAR0 = 20.0
nar_env = np.zeros(N); i0 = T(NAR0); nar_env[i0:i0 + len(nar)] = np.abs(nar)
nar_env = np.convolve(nar_env, np.ones(T(0.25)) / T(0.25), 'same'); gate = np.clip(nar_env / 0.05, 0, 1)
gate = np.convolve(gate, np.ones(T(0.15)) / T(0.15), 'same')
# musik: lowpass sedikit, turun di bawah narasi (ducking dari selubung narasi), fade in/out
for c in range(2): MUS[c] = lp(MUS[c], 9000)
tt = np.arange(N) / SR
duck = 1 - 0.8 * gate
# bagian C sudah lebih pelan; di bawah narasi juga ada ducking tambahan
mg = np.ones(N); mg[(tt >= 20) & (tt < 32)] = 0.34; rr = (tt >= 29.3) & (tt < 32); mg[rr] = 0.34 + 0.5 * (tt[rr] - 29.3) / 2.7
fade = np.minimum(1, tt / 0.05) * np.minimum(1, (DUR - tt) / 1.2)
MUS *= (duck * mg * fade)[None, :] * 0.9
# ------------------------------------------------------------------ SFX
def blip(f0, f1, d, duty=0.5, g=1.0):
    n = T(d); t = np.arange(n) / SR; f = f0 + (f1 - f0) * (t / d); x = np.where((np.cumsum(f) / SR) % 1 < duty, 1.0, -1.0); return lp(x, 5000) * env(n, 0.002, 0.05, 1.3) * g
def paper(d=0.07): n = T(d); return bp(rng.standard_normal(n), 1800, 6500) * np.exp(-np.arange(n) / SR * 45)
def thump(f=110, d=0.10): n = T(d); t = np.arange(n) / SR; return np.sin(2 * np.pi * np.cumsum(f * (0.6 + 0.4 * np.exp(-t * 30))) / SR) * np.exp(-t * 30)
def bell(f, d=0.8, g=1.0): n = T(d); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9)) * np.exp(-t * 5) * env(n, 0.002, 0.05) * g
def whoosh(d, up=True, lo=300, hi=5000):
    n = T(d); x = rng.standard_normal(n); t = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (t if up else 1 - t); out = np.zeros(n); blk = 480
    for i in range(0, n, blk):   # filtro dengan frekuensi tengah berubah per blok
        seg_ = x[i:i + blk]; f = float(fc[min(i, n - 1)])
        if len(seg_) > 20: out[i:i + blk] = bp(seg_, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * t) ** 1.5 * 0.9
def tick(g=1.0): n = T(0.03); t = np.arange(n) / SR; return (sine(1900, n) * 0.5 + bp(rng.standard_normal(n), 2500, 8000) * 0.5) * np.exp(-t * 160) * g
def sparkle(m0=84, k=4, step=0.06, g=1.0):
    out = np.zeros(T(step * k + 0.5)); sc = [0, 4, 7, 12, 16, 19]
    for i in range(k): x = bell(mf(m0 + sc[i % 6]), 0.4, 0.5); out[T(i * step):T(i * step) + len(x)] += x[:len(out) - T(i * step)]
    return out * g
def S(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
EV = []
def sfx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(x, t0, g, pan)
# agenda: blip naik tiap pergantian + ketukan tabel
for i, (t0, hm) in enumerate([(3.0, '07.00'), (5.0, '10.00'), (7.0, '13.00'), (9.0, '18.00'), (11.0, '21.00')]):
    base = [76, 79, 81, 84, 72][i]
    sfx('blip-agenda', np.concatenate([blip(mf(base), mf(base), 0.07, 0.25), blip(mf(base + 7), mf(base + 12), 0.12, 0.25)]), t0, 0.32)
    sfx('mosaik', whoosh(0.28, True, 600, 6000) * 0.25, t0, 0.5)
# adegan 1: goresan pena 0 - 2,7 dtk
n = T(2.75); pen = bp(rng.standard_normal(n), 2500, 7500); ts = np.arange(n) / SR
stroke = (np.abs(np.sin(2 * np.pi * 7.5 * ts + 1.3 * np.sin(2 * np.pi * 1.3 * ts))) ** 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * ts) ** 2)
sfx('pena-menulis', pen * stroke * np.minimum(1, (2.75 - ts) / 0.1) * 0.35, 0.0, 0.8)
sfx('pena-titik', thump(900, 0.03) * 0.3, 2.78, 0.6)
# adegan 2: kuliah (goresan cepat + klik slide tiap 0,5 dtk)
n = T(1.9); ts = np.arange(n) / SR; sfx('pena-cepat', bp(rng.standard_normal(n), 2500, 7500) * (np.abs(np.sin(2 * np.pi * 11 * ts)) ** 0.7) * 0.28, 3.1, 0.7)
for k in range(4): sfx('slide-klik', tick(0.9) , 3.5 + k * 0.5, 0.35)
# adegan 3: skill lab (pompa bulb tiap 0,35 dtk, jarum berdetak)
for k in range(5): tt_ = 5.0 + k * 0.35 + 0.02; sfx('pompa', bp(rng.standard_normal(T(0.1)), 600, 3000) * np.exp(-np.arange(T(0.1)) / SR * 30) * 0.6, tt_, 0.5, 0.5); sfx('jarum', tick(0.5), tt_ + 0.1, 0.4, -0.5)
# adegan 4: kartu pertanyaan menempel
for tt_ in (7.35, 7.85, 8.35): sfx('kartu-tempel', S(paper(0.08) * 0.9, thump(140, 0.09) * 0.7), tt_, 0.55)
# adegan 5: getar ponsel + notifikasi grup
for tt_, f in ((9.35, 72), (9.85, 76), (10.35, 79)):
    nb = T(0.14); buzz = sine(170, nb) * (0.6 + 0.4 * sq(34, nb)) * env(nb, 0.005, 0.04); sfx('ponsel-getar', buzz * 0.5, tt_, 0.5, 0.6); sfx('notif-ping', bell(mf(f + 12), 0.5, 0.7), tt_ + 0.05, 0.4, 0.6)
# adegan 6: pulang
sfx('pintu', lp(sq(150, T(0.45), 0.5) * np.linspace(1.1, 0.6, T(0.45)) * (0.7 + 0.3 * sine(11, T(0.45))), 700) * env(T(0.45), 0.02, 0.2), 11.05, 0.3)
for k in range(5): sfx('langkah', S(thump(90, 0.09) * 0.9, paper(0.03) * 0.3), 11.15 + k * 0.294, 0.38 if k < 4 else 0.25)
# adegan 7: laptop dibuka + pengingat + catatan
sfx('laptop-buka', S(thump(220, 0.05) * 0.9, paper(0.05)), 12.5, 0.4); sfx('laptop-nyala', sparkle(79, 3, 0.1), 13.05, 0.35)
sfx('pengingat', S(bell(mf(88), 0.9, 1.0), bell(mf(95), 0.9, 0.6)), 13.3, 0.5)
for i in range(8): sfx('catatan-muncul', S(sine(520, T(0.05)) * np.exp(-np.arange(T(0.05)) / SR * 55) * 0.8, paper(0.06) * 0.6), 13.65 + i * 0.25, 0.35, -0.3 + 0.09 * i)
sfx('teks-pop', blip(mf(76), mf(83), 0.09, 0.25), 14.95, 0.25)
# adegan 8: Nilo + satu bab
sfx('nilo-masuk', S(sparkle(88, 5, 0.05), whoosh(0.5, False, 500, 4000) * 0.15), 16.15, 0.4)
sfx('satu-bab-pop', S(thump(160, 0.09) * 0.8, paper(0.06)), 16.9, 0.4); sfx('satu-bab-chime', S(bell(mf(84), 1.0, 0.8), bell(mf(91), 1.0, 0.5)), 17.0, 0.45)
sfx('catatan-menyingkir', whoosh(1.0, True, 200, 3000) * 0.35, 17.5, 0.5)
sfx('satu-bab-nyala', sparkle(91, 5, 0.07), 18.25, 0.4)
# transisi masuk web: riser + mosaik resolve
n = T(0.8); ts = np.arange(n) / SR; ris = (whoosh(0.8, True, 300, 7000) * 0.5 + sine(300 * (1 + 3 * (ts / 0.8) ** 2), n) * 0.12) * np.minimum(1, ts / 0.2)
sfx('masuk-layar', ris, 19.25, 0.55)
g = np.floor(bp(rng.standard_normal(T(0.25)), 1000, 9000) * 6) / 6 * np.exp(-np.arange(T(0.25)) / SR * 14); sfx('piksel-jadi-nyata', g * 0.35, 19.95, 0.5)
# ketukan UI di rekaman web asli: dari rekam/cues.json dipetakan lewat SEG
SEG = [[20.00, 23.00, 'pilih', 0, 66], [23.00, 23.35, 'pilih', 66, 78], [23.35, 24.90, 'materi', 6, 52], [24.90, 25.95, 'flashcard', 3, 52], [25.95, 27.30, 'latihan', 2, 42], [27.30, 28.60, 'latihan', 42, 92], [28.60, 30.60, 'latihan', 92, 150], [30.60, 32.00, 'latihan', 150, 190], [32.0, 40.0, 'beranda', 0, 229]]
cues = json.load(open(os.path.join(HERE, '..', 'rekam', 'cues.json'))); taps = []
for (a, b, clip, f0, f1) in SEG:
    for f in cues.get(clip, []):
        if f0 <= f < f1: taps.append(round(a + (f - f0) / (f1 - f0) * (b - a), 3))
for tt_ in sorted(set(taps)): sfx('ketuk-ui', tick(0.8), tt_ + 0.05, 0.38 if tt_ < 29.3 else 0.5, 0.0)
sfx('kila-muncul', sparkle(88, 4, 0.06), 29.1, 0.3)
sfx('mosaik-penutup', whoosh(0.3, True, 600, 6000) * 0.3, 32.0, 0.5)
sfx('teks-penutup-1', S(blip(mf(76), mf(88), 0.12, 0.25), bell(mf(84), 0.8, 0.5)), 32.45, 0.3)
sfx('teks-penutup-2', S(thump(120, 0.12), bell(mf(88), 1.2, 0.8), bell(mf(95), 1.2, 0.5)), 35.9, 0.45); sfx('kilau-akhir', sparkle(91, 6, 0.07, 0.8), 36.0, 0.35)
# ------------------------------------------------------------------ campur
nar_st = np.zeros((2, N)); nar_st[0, i0:i0 + len(nar)] = nar; nar_st[1, i0:i0 + len(nar)] = nar
sfx_gain = 1 - 0.6 * gate    # SFX diturunkan saat narasi bicara
mix = MUS * 0.48 + OUT * sfx_gain[None, :] * 0.9 + nar_st * 1.0
pk = np.max(np.abs(mix)); print('puncak mentah', round(float(pk), 3))
mix = mix / max(1.0, pk) * 0.98   # hanya pengecilan linear: narasi tidak terdistorsi
pcm = (np.clip(mix, -1, 1).T * 32767).astype('<i2')
wf = wave.open(os.path.join(HERE, 'mix.wav'), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
json.dump({'narator_mulai': NAR0, 'narator_durasi': round(len(raw) / 24000, 3), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1, ensure_ascii=False)
print('selesai', len(EV), 'efek')
if os.environ.get('DIAG'):
    a, b = T(20), T(29.3); f = lambda X: float(np.sqrt(np.mean(X[0, a:b] ** 2)))
    print('diag rms 20-29,3: musik', round(f(MUS * 0.48), 4), 'sfx', round(f(OUT * sfx_gain[None, :] * 0.9), 4), 'narasi', round(f(nar_st), 4))
