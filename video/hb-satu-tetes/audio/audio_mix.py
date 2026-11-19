#!/usr/bin/env python3
"""Audio video "Bagaimana satu tetes darah bisa menghasilkan angka Hb?". TIGA JALUR TERPISAH (stem stereo 48 kHz) lalu dicampur:
  1) suara  = narasi-edukasi.wav (Google AI Studio, 24 kHz mono, 85,52 dtk, TIDAK dipercepat/diubah nadanya; hanya di-resample 24->48 kHz) mulai detik 0,
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
def lufs24(x):
    import tempfile; f = tempfile.mktemp(suffix='.wav'); w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
    import subprocess, re; m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr; os.remove(f)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
nar24 = rd('narasi-edukasi.wav')[:int(EDU_END * 24000)]; mas24 = rd('medcoel-outro-master.wav')
NAR_GAIN_DB = min(4.0, lufs24(mas24) - lufs24(nar24))   # narasi edukasi dinaikkan (gain statis) ke level master outro; tempo/nada tidak diubah, master outro tidak diubah
print('LUFS narasi', round(lufs24(nar24), 2), 'master', round(lufs24(mas24), 2), 'gain narasi dB', round(NAR_GAIN_DB, 2))
nar = up2(nar24) * 10 ** (NAR_GAIN_DB / 20); mas = up2(mas24)
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
def pop_(f=700): n = T(0.09); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.8 * np.exp(-tt * 60)) * tt) * np.exp(-tt * 30) * env(n, 0.002, 0.02)
beep_t = [0.209 + 0.838 * k for k in range(4)]                                     # denyut penjepit jari = fase animasi kartu SpO2 (sin(7,5 t))
for b_ in beep_t: fx('bip-denyut', beep(1000, 0.07), b_, 0.07)
fx('kartu-hb', pop_(420), W['hb'], 0.30); fx('rendah', glide(520, 300, 0.7), W['rendah'] - 0.1, 0.10); fx('kok-bisa', bloop(480, 0.18), W['kokbisa'], 0.26)
fx('masuk-pembuluh', whoosh(0.9, True, 200, 2400), 6.5, 0.12)
fx('persentase', bloop(520), W['persentase'], 0.24); fx('membawa-O2', chime([79, 83], 0.8), W['membawa'], 0.10)
fx('tes-hb', bloop(460), W['tesHb'], 0.24)
for i in range(16): fx('hitung-hb', tick(1300 + 40 * i), 13.6 + i * 0.09, 0.12)
fx('protein', bloop(500), W['protein'], 0.22); fx('sel-darah', bloop(430), W['sel'], 0.24)
for i in range(4): fx('o2-ke-jaringan', pop_(900 + 80 * i), 18.5 + i * 0.35, 0.10)
fx('lanset-klik', S(click(), tick(2800) * 0.6), 21.05, 0.30); fx('tetes-terbentuk', pop_(380), 23.0, 0.22); fx('kuvet-sentuh', tick(2200), 25.3, 0.22)
fx('kapiler-tarik', glide(300, 520, 3.8), 26.4, 0.06); fx('saluran-sempit', bloop(540), W['sempit'], 0.22); fx('gaya-kapiler', chime([76, 80], 0.8), W['kapiler'], 0.10)
fx('reagen', bloop(500), W['reagen'], 0.24)
for i in range(12): fx('sel-terbuka', pop_(560 + 30 * (i % 4)), 35.0 + i * 0.2 + 0.4, 0.10, -0.4 + 0.07 * i)
fx('hb-terlepas', chime([76, 79], 0.8), W['melepaskan'], 0.10); fx('reagen-2', bloop(420, 0.16), 38.8, 0.22); fx('bentuk-terukur', chime([72, 76], 0.9), W['bentuk'], 0.10)
fx('laci-geser', whoosh(0.7, False, 300, 1500), 43.6, 0.10); fx('laci-tutup', S(click(), thud(120)), 45.45, 0.28)
fx('cahaya-nyala', glide(300, 700, 1.4), W['cahaya2'], 0.06); fx('sensor-baca', bloop(540), W['sensor'], 0.22); fx('cahaya-diserap', tick(1800), W['diserap'], 0.2)
fx('dua-panjang-gelombang', S(chime([79], 0.7), np.pad(chime([84], 0.7), (T(0.15), 0))), W['duaPG'] - 0.6, 0.10); fx('koreksi', bloop(480), W['salah'], 0.22)
for i in range(14): fx('hitung-hasil', tick(1200 + 60 * i), 56.9 + i * 0.1, 0.10)
fx('hasil-hb', chime([79, 83, 88], 1.0), 58.4, 0.10)
for i, t_ in enumerate((61.4, 62.1, 62.8)): fx('kartu-pantau', pop_(520 + 60 * i), t_, 0.22)
for i in range(4): fx('tanda-tanya', pop_(380 + 40 * i), 65.9 + i * 0.25, 0.18)
fx('gelembung', bloop(380, 0.2), 69.4, 0.22); fx('kurang-tepat', glide(420, 300, 0.7), W['kurangTepat'], 0.10); fx('periksa-lanjut', chime([79, 84], 0.9), W['lanjutan'], 0.12)
fx('kartu-spo2', pop_(500), 78.3, 0.22); fx('kartu-hb-2', pop_(420), 80.0, 0.22); fx('proporsi', chime([76, 79], 0.8), W['proporsi'], 0.10); fx('kadar', chime([72, 76], 0.9), W['banyak'], 0.10); fx('akhir', chime([72, 79, 84], 1.2), W['tersedia'] + 0.2, 0.09)
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
