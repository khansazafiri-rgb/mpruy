#!/usr/bin/env python3
"""Audio bagian EDUKASI video "Telinga penuh lalu pop". TIGA JALUR TERPISAH (stem stereo 48 kHz) lalu dicampur:
  1) suara  = narasi-edukasi.wav (Google AI Studio, 24 kHz mono, 33,48 dtk) mulai detik 0. Tempo dan nada TIDAK diubah; hanya resample 24 -> 48 kHz dan penguatan statis.
  2) musik  = stem-musik.wav: pad hangat + arpeggio pluck "medical tech" 100 BPM, disintesis dari kode (numpy/scipy), jauh di bawah suara dan ditekan saat bicara.
  3) sfx    = stem-sfx.wav: desis semprotan pendek (derau berfilter) tepat pada saat semprot di tiap adegan, klik tekan, label, pop reseptor, napas halus; tanpa alarm.
Bagian edukasi dinormalkan ke -14,4 LUFS terintegrasi (sama dengan master outro) SEBELUM ditempel; file gabungan tidak dinormalkan ulang (lihat encode.sh).
Lisensi musik + SFX: CC0 1.0 (dibuat dari kode, tanpa sampel/musik pihak ketiga), aman untuk promosi Instagram/TikTok.
Pemakaian: python3 audio/audio_mix.py -> stem-*.wav, mix.wav (52,2 dtk), events.json (butuh numpy, scipy, ffmpeg)."""
import json, os, re, subprocess, tempfile, wave
import numpy as np
from scipy import signal
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json'))); W = C['w']
DUR = C['edu_dur']; N = int(DUR * SR); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(11)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
up2 = lambda x: signal.resample_poly(x, 2, 1)
VOICE = np.zeros(N); v = up2(rd('narasi-edukasi.wav')); VOICE[:min(N, len(v))] += v[:N]
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
        if tk < DUR - 1.0 and (k % 2 == 0 or t > 10): put(MUS, pluck(arp[k % 3] + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, sine(mf(bs), T(1.7)) * env(T(1.7), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
def hiss(d=0.4, f0=2500, f1=9500): n = T(d); x = bp(rng.standard_normal(n), f0, f1, 2); return x * np.exp(-np.arange(n) / SR / (d * 0.32)) * env(n, 0.004, 0.08)
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def tone(f, d=0.5): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08)
def chime(ms, d=0.9):
    out = np.zeros(T(d + 0.8))
    for i, m in enumerate(ms): x = tone(mf(m), d); j = T(0.07 * i); out[j:j + len(x)] += x[:len(out) - j]
    return out
def click(): n = T(0.04); return bp(rng.standard_normal(n), 1500, 6500) * np.exp(-np.arange(n) / SR * 100) + sine(200, n) * np.exp(-np.arange(n) / SR * 70) * 0.6
def tik(f=2200): n = T(0.03); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120) * env(n, 0.001, 0.01)
def glide(f0, f1, d): n = T(d); fr = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.08, 0.4)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def breath(d): n = T(d); x = lp(rng.standard_normal(n), 900); return x * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
# --- efek: dengung kabin (teredam saat gendang terdorong), menelan, tuba terbuka, SATU pop lembut tepat saat tekanan seimbang, tanpa alarm
def hum(d, f=140, g=1.0):
    n = T(d); tt = np.arange(n) / SR; x = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.51 * tt)) * 0.5 + lp(rng.standard_normal(n), 600) * 0.5
    return x * env(n, 0.3, 0.8, 1.0) * g
def popsound():
    n = T(0.22); tt = np.arange(n) / SR; f = 260 + 700 * np.exp(-tt * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 22) * env(n, 0.002, 0.05)
def gulp(): n = T(0.16); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (320 - 120 * tt / 0.16) * tt) * np.exp(-tt * 18) * env(n, 0.004, 0.04)
def airin(d): n = T(d); x = bp(rng.standard_normal(n), 800, 3500, 2); return x * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
fx('dengung-kabin', hum(4.6, 150, 1.0), 0.0, 0.07)               # latar kabin pesawat (hook)
fx('dengung-teredam', hum(5.0, 120, 1.0), 13.0, 0.05)            # suara terdengar teredam saat gendang terdorong
fx('potong-telinga', whoosh(0.4, True, 300, 3000), 5.0, 0.10)
fx('tekanan-berubah', glide(300, 520, 1.0), W['tekanan1'] + 0.2, 0.06); fx('tekanan-luar', bloop(520), W['tekanan2'], 0.15)
fx('gendang-terdorong', bloop(340, 0.16), W['gendang3'] + 0.5, 0.15)
fx('potong-menelan', whoosh(0.3, False, 400, 3000), 18.45, 0.09); fx('menelan', gulp(), 19.2, 0.22); fx('menguap', whoosh(0.9, True, 200, 1500), 19.95, 0.07)
fx('potong-tuba', whoosh(0.35, True, 400, 3500), 20.6, 0.09); fx('tuba-terbuka', chime([76, 80], 0.8), W['terbuka'], 0.09)
fx('udara-masuk', airin(2.8), 23.1, 0.10)
fx('pop', popsound(), W['pop2'] + 0.02, 0.34)                    # SATU pop lembut tepat saat tekanan seimbang
fx('lega', chime([79, 84], 0.9), 27.15, 0.08)
fx('potong-pilek', whoosh(0.3, False, 400, 3000), 28.15, 0.08); fx('saluran-sempit', glide(420, 260, 1.0), W['tersumbat'], 0.06)
fx('potong-banding', whoosh(0.3, True, 400, 3500), 30.1, 0.09); fx('nyeri', bloop(380, 0.18), W['nyeri'], 0.12)
# --- campur: ducking musik/efek di bawah suara, lalu normalisasi bagian edukasi ke -14,4 LUFS (puncak <= -1,4 dBFS)
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1); gate = np.convolve(gate, np.ones(T(0.25)) / T(0.25), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 0.8) * np.minimum(1, (DUR - tt) / 0.8)
for c in range(2): MUS[c] = lp(MUS[c], 6500)
mg = 0.48 * (1 - 0.82 * gate) * fade; fg = 0.55 * (1 - 0.45 * gate)
V2 = np.vstack([VOICE, VOICE]); M2 = MUS * mg[None, :]; F2 = FX * fg[None, :]
mix = V2 + M2 + F2
def lufs(a):
    f = tempfile.mktemp(suffix='.wav'); w = wave.open(f, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1).T * 32767).astype('<i2').tobytes()); w.close()
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr; os.remove(f)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
L0 = lufs(np.clip(mix, -1, 1)); k = 10 ** ((-14.25 - L0) / 20); print('LUFS mentah', round(L0, 2), 'skalar', round(k, 3), 'puncak', round(float(np.max(np.abs(mix))) * k, 3))
def wr(name, a):
    pcm = (np.clip(a * k, -1, 1).T * 32767).astype('<i2'); wf = wave.open(os.path.join(HERE, name), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
wr('stem-suara.wav', V2); wr('stem-musik.wav', M2); wr('stem-sfx.wav', F2); wr('premix.wav', mix)
# limiter lembut agar puncak sampel <= -1,5 dBFS (ambang -1,4 dBTP aman), lalu pastikan LUFS tetap ~ -14,4
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', os.path.join(HERE, 'premix.wav'), '-af', 'alimiter=limit=0.82:attack=3:release=60:level=disabled', os.path.join(HERE, 'mix.wav')], check=True)
json.dump({'durasi_edu': DUR, 'skalar_normalisasi': round(k, 4), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1, ensure_ascii=False)
print('selesai', len(EV), 'efek')
