#!/usr/bin/env python3
"""Audio video "Bagaimana EKG menghasilkan garis di layar?". TIGA JALUR TERPISAH (stem stereo 48 kHz) lalu dicampur:
  1) suara  = narasi-edukasi.wav (Google AI Studio, 24 kHz mono, 44,92 dtk) mulai detik 0, lalu narasi-outro.wav (audio outro BARU dari Google AI Studio, 10,36 dtk) mulai di cues.json["t_master"]
              (1,0 dtk setelah rekaman web terlihat). Tempo dan nada TIDAK diubah; hanya resample 24 -> 48 kHz dan penguatan statis agar level narasi edukasi dan outro sama (selisih LUFS terukur).
  2) musik  = stem-musik.wav: pad hangat + arpeggio pluck ringan bernuansa "medical tech" 96 BPM, disintesis dari kode (numpy/scipy), jauh di bawah suara.
  3) sfx    = stem-sfx.wav: tempel elektroda, bip monitor halus pada puncak R, tok nodus sinus, gelincir sinyal di berkas bilik, aksen P / QRS / T (dari waktu stage = cues + heart.js), degup kontraksi, klik pergantian fitur web.
              Bukan alarm rumah sakit; aksen pendek dan pelan.
Lisensi musik + SFX: CC0 1.0 (dibuat dari kode, tanpa sampel/musik pihak ketiga), aman untuk promosi Instagram/TikTok.
Pemakaian: python3 audio/audio_mix.py -> stem-*.wav, mix.wav, events.json (butuh numpy, scipy, ffmpeg)."""
import json, os, re, subprocess, tempfile, wave
import numpy as np
from scipy import signal
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json'))); W = C['w']
DUR = C['dur']; N = int(DUR * SR); T = lambda s: int(round(s * SR)); rng = np.random.default_rng(3)
def rd(name):
    w = wave.open(os.path.join(HERE, name)); assert w.getframerate() == 24000 and w.getnchannels() == 1
    return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32768
def lufs24(x):
    f = tempfile.mktemp(suffix='.wav'); w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr; os.remove(f)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
up2 = lambda x: signal.resample_poly(x, 2, 1)
edu24 = rd('narasi-edukasi.wav'); out24 = rd('narasi-outro.wav'); le, lo = lufs24(edu24), lufs24(out24); G_OUT = float(np.clip(le - lo, -6, 6))   # outro disamakan ke level narasi edukasi
print('LUFS edu', round(le, 2), 'outro', round(lo, 2), 'gain outro dB', round(G_OUT, 2))
VOICE = np.zeros(N); e2 = up2(edu24); o2_ = up2(out24) * 10 ** (G_OUT / 20); VOICE[:len(e2)] += e2; VOICE[T(C['t_master']):T(C['t_master']) + len(o2_)] += o2_
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
# ---------------------------------------------------------------- musik
def pad(ms, d):
    n = T(d); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-0.05, 0.05): x += np.sin(2 * np.pi * mf(m + det) * t) + 0.15 * np.sin(2 * np.pi * 3 * mf(m + det) * t)
    return lp(x, 2200) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 1.0) * 0.07
def pluck(m, d=0.5):
    n = T(d); t = np.arange(n) / SR; f = mf(m)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)) * np.exp(-t * 7) * env(n, 0.003, 0.05)
BEAT = 60 / 96; CH = [([50, 57, 65], 38, [69, 72, 76]), ([46, 53, 62], 34, [65, 69, 74]), ([48, 55, 64], 36, [67, 71, 76]), ([45, 52, 60], 33, [64, 67, 72])]
t = 0.0; bar = 0
while t < DUR - 0.5:
    ms, bs, arp = CH[bar % 4]; d = 4 * BEAT; put(MUS, pad(ms, d + 0.6), t)
    for k in range(8):
        tk = t + k * BEAT / 2
        if tk < DUR - 1.0 and (k % 2 == 0 or t > 14): put(MUS, pluck(arp[k % 3] + (12 if k % 4 == 3 else 0)), tk, 0.10 if k % 2 == 0 else 0.07, -0.25 if k % 2 else 0.25)
    if bar % 2 == 0: put(MUS, sine(mf(bs), T(1.8)) * env(T(1.8), 0.05, 0.6), t, 0.10)
    t += d; bar += 1
# ---------------------------------------------------------------- efek (aksen pendek, pelan)
def bloop(f=600, d=0.12): n = T(d); tt = np.arange(n) / SR; return np.sin(2 * np.pi * f * (1 + 0.5 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 26) * env(n, 0.002, 0.03)
def tone(f, d=0.5): n = T(d); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 6) * env(n, 0.004, 0.08)
def chime(ms, d=0.9): return sum(np.pad(np.concatenate([np.zeros(T(0.07 * i)), tone(mf(m), d)]), (0, T(0.7))) [:T(d + 0.7)] for i, m in enumerate(ms))
def click(): n = T(0.05); return bp(rng.standard_normal(n), 1500, 6500) * np.exp(-np.arange(n) / SR * 90) + sine(220, n) * np.exp(-np.arange(n) / SR * 60) * 0.7
def thud(f=90, d=0.22): n = T(d); fr = np.geomspace(f, f * 0.5, n); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-np.arange(n) / SR / 0.06)
def beep(f=880, d=0.07): n = T(d); return sine(f, n) * env(n, 0.003, 0.02)
def glide(f0, f1, d): n = T(d); fr = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.05, 0.3)
def whoosh(d, up=True, lo=250, hi=3500):
    n = T(d); x = rng.standard_normal(n); tt = np.linspace(0, 1, n); fc = lo * (hi / lo) ** (tt if up else 1 - tt); out = np.zeros(n)
    for i in range(0, n, 480):
        sg = x[i:i + 480]; f = float(fc[min(i, n - 1)])
        if len(sg) > 20: out[i:i + 480] = bp(sg, max(80, f * 0.6), min(SR / 2 - 100, f * 1.4), 1)
    return out * np.sin(np.pi * tt) ** 1.5
def fx(name, x, t0, g=1.0, pan=0.0): EV.append({'t': round(t0, 3), 'sfx': name}); put(FX, x, t0, g, pan)
# tempel elektroda (sama dengan stage: pop 0,12 / 0,40 / 0,68)
for i, tt in enumerate((0.15, 0.43, 0.71)): fx('tempel-elektroda', click(), tt, 0.35, -0.2 + 0.2 * i)
# bip monitor halus pada puncak R (gelombang normal periode 0,86; R pada 0,272 dalam denyut)
def beats(t0, t1, off): return [off + k * 0.86 + 0.272 for k in range(-200, 200) if t0 <= off + k * 0.86 + 0.272 < t1]
for tt in beats(0.9, 4.6, 0.45): fx('bip-monitor', beep(880), tt, 0.10)
for tt in beats(39.6, 45.2, -100 % 0.86 if False else (-100.0)): fx('bip-monitor', beep(880), tt, 0.10)
fx('elektroda', bloop(520), W['elektroda'], 0.24); fx('tidak-menyetrum', glide(420, 260, 0.5), W['menyetrum'], 0.10); fx('tangkap', chime([79, 83], 0.7), W['perubahan'], 0.10)
fx('masuk-dada', whoosh(1.0, False, 2500, 300), 12.0, 0.10); fx('lihat-dalam', bloop(440, 0.2), W['lihat'], 0.22)
# jalur sinyal (waktu stage)
fx('nodus-sinus', thud(160, 0.16), 16.0, 0.25); fx('sinyal-ke-serambi', glide(400, 800, 1.7), 17.0, 0.07)
fx('gelombang-P', chime([84], 0.7), 19.9, 0.16); fx('nodus-AV', bloop(500, 0.16), 22.0, 0.22)
fx('berkas-bilik', glide(300, 1400, 1.4), 23.4, 0.08); fx('gelombang-QRS', S := (click() * 1.1), 25.2, 0.30)
fx('kontraksi-bilik', thud(95, 0.3), 26.4, 0.34); fx('gelombang-T', chime([76, 79], 0.9), 32.15, 0.14)
# pengulangan P -> QRS -> T (waktu stage dipetakan 18,4->34,0 pada 33,7->37,3)
rm = lambda s: 33.7 + (s - 18.4) / (34.3 - 18.4) * 3.6
fx('ulang-P', chime([84], 0.5), rm(19.9), 0.12); fx('ulang-QRS', click(), rm(25.2), 0.22); fx('ulang-kontraksi', thud(95, 0.2), rm(26.6), 0.22); fx('ulang-T', chime([76, 79], 0.6), rm(32.15), 0.12)
fx('jejak-listrik', bloop(480, 0.2), W['jejak'], 0.20); fx('laju', bloop(560, 0.14), W['laju'], 0.22); fx('irama', bloop(620, 0.14), W['irama'], 0.22)
# outro: whoosh masuk, klik pergantian fitur web, chime logo
O0 = C['t_web']; fx('masuk-outro', whoosh(0.8, True, 200, 3000), O0 - 0.3, 0.14)
for tt in (3.0, 5.35, 6.9, 8.3): fx('klik-fitur-web', click(), O0 + tt, 0.26)
fx('logo-medcoel', chime([84, 88, 91, 96], 1.4), O0 + 9.4, 0.08)
# ---------------------------------------------------------------- campur (ducking di bawah suara)
v_env = np.convolve(np.abs(VOICE), np.ones(T(0.3)) / T(0.3), 'same'); gate = np.clip(v_env / 0.03, 0, 1); gate = np.convolve(gate, np.ones(T(0.25)) / T(0.25), 'same')
tt = np.arange(N) / SR; fade = np.minimum(1, tt / 1.2) * np.minimum(1, (DUR - tt) / 1.5)
for c in range(2): MUS[c] = lp(MUS[c], 6500)
mg = 0.5 * (1 - 0.8 * gate) * fade; fg = 0.5 * (1 - 0.55 * gate)
V2 = np.vstack([VOICE, VOICE]); M2 = MUS * mg[None, :]; F2 = FX * fg[None, :]
mix = V2 + M2 + F2
def lufs_st(a):
    f = tempfile.mktemp(suffix='.wav'); w = wave.open(f, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1).T * 32767).astype('<i2').tobytes()); w.close()
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr; os.remove(f)
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1])
L0 = lufs_st(np.clip(mix, -1, 1)); k = 10 ** ((-15.5 - L0) / 20); pk = float(np.max(np.abs(mix))) * k
if pk > 0.90: k *= 0.90 / pk                      # batasi puncak -0,9 dBFS (skalar tunggal; hubungan level suara-outro tidak berubah)
print('LUFS mentah', round(L0, 2), 'skalar', round(k, 3))
def wr(name, a):
    pcm = (np.clip(a * k, -1, 1).T * 32767).astype('<i2'); wf = wave.open(os.path.join(HERE, name), 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes()); wf.close()
wr('stem-suara.wav', V2); wr('stem-musik.wav', M2); wr('stem-sfx.wav', F2); wr('mix.wav', mix)
json.dump({'durasi': DUR, 'gain_outro_dB': round(G_OUT, 2), 'skalar_puncak': round(k, 4), 'sfx': sorted(EV, key=lambda e: e['t'])}, open(os.path.join(HERE, 'events.json'), 'w'), indent=1, ensure_ascii=False)
print('selesai', len(EV), 'efek')
