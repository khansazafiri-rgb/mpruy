#!/usr/bin/env python3
"""Audio bagian EDUKASI video "Cegukan: kenapa bunyinya hik". TIGA JALUR (stem stereo 48 kHz) lalu dicampur:
  1) suara  = sumber-asli.wav (Google AI Studio dari pemesan, 24 kHz mono, 38,79 dtk) dipotong di CUT = 28,20 dtk (jeda alami sesudah "penyebab yang jelas.";
     kalimat promosi lama dibuang karena sudah ada di master outro), fade-out 80 ms, di-resample 24 -> 48 kHz. Tempo dan nada TIDAK diubah. Mulai detik 0.
  2) musik  = pad hangat + pluck "medical tech" 100 BPM disintesis dari kode (numpy/scipy), jauh di bawah suara, ditekan saat bicara, keluar bersih sebelum EDU_DUR.
  3) sfx    = hanya aksen: SATU "hik" sintetis pendek pada cegukan pertama (1,45 dtk); tidak ada efek "hik" tambahan pada kata "hik" yang diucapkan narator
     (5,13 dan 19,74 dtk); whoosh kamera, tik label, tok lembut kontraksi diafragma, tik pita suara menutup, kilau urutan ikon.
Bagian edukasi dinormalkan ke -14,4 LUFS terintegrasi (sama dengan master outro) SEBELUM ditempel; file gabungan tidak dinormalkan ulang (lihat encode.sh).
Lisensi musik + efek: CC0 1.0 (dibuat dari kode, tanpa sampel/musik pihak ketiga), aman untuk promosi Instagram/TikTok.
Pemakaian: python3 audio/audio_mix.py -> stem-*.wav, premix.wav, mix.wav (30,0 dtk), events.json (butuh numpy, scipy, ffmpeg)."""
import json, os, re, subprocess, tempfile, wave
import numpy as np
from scipy import signal
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
DUR = C['edu_dur']; CUT = C['cut']; N = int(DUR * SR); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(23)
# ---- suara asli (decode lewat ffmpeg: header WAV Google AI Studio tidak baku untuk modul wave/scipy)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'sumber-asli.wav'), '-f', 'f32le', '-ac', '1', '-ar', '24000', '-'], capture_output=True, check=True).stdout
v24 = np.frombuffer(raw, dtype=np.float32).astype(np.float64)[:int(CUT * 24000)]
v24[-1920:] *= np.linspace(1, 0, 1920)            # fade-out 80 ms
v = signal.resample_poly(v24, 2, 1)
VOICE = np.zeros(N); VOICE[:min(N, len(v))] += v[:N]
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
# ---- musik: 100 BPM, pad + pluck + bas halus; masuk perlahan, keluar bersih
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.05, 0.05): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.15 * np.sin(2 * np.pi * 3 * mf(m + det) * t)
    return lp(x, 2200) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 1.0) * 0.07
def pluck(m, d=0.5):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)) * np.exp(-t * 7) * env(n, 0.003, 0.05)
BEAT = 60 / 100; CH = [([50, 57, 65], 38, [69, 72, 76]), ([46, 53, 62], 34, [65, 69, 74]), ([48, 55, 64], 36, [67, 71, 76]), ([45, 52, 60], 33, [64, 67, 72])]
t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs, arp = CH[bar % 4]; d = 4 * BEAT; put(MUS, pad(ms, d + 0.6), t)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.2 and (k % 2 == 0 or t > 6): put(MUS, pluck(arp[k % 3] + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, sine(mf(bs), T(1.7)) * env(T(1.7), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
# ---- efek
def hik():
    n = T(0.26); t = np.arange(n) / SR
    h = bp(rng.standard_normal(n), 900, 5200, 2) * np.minimum(t / 0.05, 1) * (t < 0.10) * 0.5          # "h": desah singkat
    f0 = np.interp(t, [0, 0.12], [235, 195]); ph = 2 * np.pi * np.cumsum(f0) / SR; saw = signal.sawtooth(ph)
    vi = (bp(saw, 250, 460, 2) * 1.0 + bp(saw, 2100, 2900, 2) * 0.55) * np.exp(-np.maximum(t - 0.05, 0) * 22) * np.minimum(np.maximum(t - 0.04, 0) / 0.01, 1) * (t > 0.04)   # "i"
    k = np.zeros(n); j = T(0.115); m = T(0.03); k[j:j + m] = (bp(rng.standard_normal(m), 1500, 6000, 2) * np.exp(-np.arange(m) / SR * 260) + sine(160, m) * np.exp(-np.arange(m) / SR * 150) * 0.5)   # "k": penutupan glotis
    x = h + vi * 1.1 + k * 0.9; return x / np.max(np.abs(x)) * 0.55
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def tik(f=2200, d=0.03): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120) * env(n, 0.001, 0.01)
def pop(f=520, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def thump(d=0.28): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * 64 * (1 + 0.6 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) + lp(rng.standard_normal(n), 400) * np.exp(-tt * 40) * 0.5) * env(n, 0.002, 0.06)
def tone(f, d=0.5): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08)
def chime(ms, d=0.9):
    out = np.zeros(T(d + 0.8))
    for i, m in enumerate(ms): x = tone(mf(m), d); j = T(0.07 * i); out[j:j + len(x)] += x[:len(out) - j]
    return out
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
fx('hik-cegukan-pertama', hik(), 1.44, 0.9)                          # satu-satunya "hik" buatan (cegukan pertama, sebelum "Eh")
fx('dorong-kamera-ke-dada', whoosh(0.55, True, 300, 3000), 5.55, 0.10); fx('lensa-terbuka', chime([79, 83], 0.7), 5.85, 0.07)
fx('label-paru', tik(2300), 6.62, 0.16); fx('label-diafragma', tik(2600), 8.98, 0.16)
fx('judul-kontraksi', tik(2000), 11.5, 0.14); fx('kontraksi-diafragma', thump(), 12.38, 0.34)
fx('ikuti-jalur-udara', whoosh(1.1, True, 250, 3800), 14.0, 0.10)
fx('pita-suara-menutup', tik(1700, 0.04), 16.13, 0.18); fx('kontraksi-ulang-peta', thump(0.2), 19.48, 0.10)
fx('tarik-kembali', whoosh(0.6, False, 300, 3200), 20.35, 0.09)
for t0, g in ((21.07, 0.16), (21.98, 0.16)): fx('kartu-pemicu', pop(560), t0, g)
fx('bisa-memicu', pop(700), 23.28, 0.16); fx('tanda-tanya', pop(420, 0.14), 26.58, 0.10)
for i, (t0, m) in enumerate(((27.57, 79), (28.22, 83), (28.87, 86))): fx(f'ikon-{i + 1}', chime([m, m + 7], 0.8), t0, 0.12)
for t0 in (27.96, 28.6): fx('panah-urutan', tik(2800), t0, 0.12)
for i, t0 in enumerate((29.36, 29.59, 29.82)): fx(f'denyut-urutan-{i + 1}', tik(2000 + 400 * i, 0.04), t0, 0.12)
# ---- campur: ducking musik/efek di bawah suara; musik keluar bersih; normalisasi bagian edukasi ke -14,4 LUFS (puncak <= -1,4 dBFS)
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1); gate = np.convolve(gate, np.ones(T(0.25)) / T(0.25), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 0.6) * np.minimum(1, np.clip((DUR - 0.2 - tt) / 0.9, 0, 1))
for c in range(2): MUS[c] = lp(MUS[c], 6500)
mg = 0.50 * (1 - 0.82 * gate) * fade; fg = 0.55 * (1 - 0.45 * gate)
tail = np.clip((tt - CUT) / 0.5, 0, 1); mg = mg * (1 + 0.35 * tail)      # ekor ringkasan tanpa suara: musik sedikit naik
V2 = np.vstack([VOICE, VOICE]); M2 = MUS * mg[None, :]; F2 = FX * fg[None, :]
endfade = np.clip((DUR - tt) / 0.05, 0, 1); F2 = F2 * endfade[None, :]
mix = V2 + M2 + F2
def lufs(a):
    f = tempfile.mktemp(suffix='.wav'); w = wave.open(f, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1).T * 32767).astype('<i2').tobytes()); w.close()
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr; os.remove(f)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
L0 = lufs(np.clip(mix, -1, 1)); k = 10 ** ((-14.25 - L0) / 20); print('LUFS mentah', round(L0, 2), 'skalar', round(k, 3), 'puncak', round(float(np.max(np.abs(mix))) * k, 3))
def wr(name, a):
    pcm = (np.clip(a * k, -1, 1).T * 32767).astype('<i2'); wf = wave.open(os.path.join(HERE, name), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
wr('stem-suara.wav', V2); wr('stem-musik.wav', M2); wr('stem-sfx.wav', F2); wr('premix.wav', mix)
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', os.path.join(HERE, 'premix.wav'), '-af', 'alimiter=limit=0.82:attack=3:release=60:level=disabled', os.path.join(HERE, 'mix.wav')], check=True)
json.dump({'durasi_edu': DUR, 'potong_narasi': CUT, 'skalar_normalisasi': round(k, 4), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1, ensure_ascii=False)
print('selesai', len(EV), 'efek')
